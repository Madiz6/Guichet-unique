import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_name, registration_number } = await req.json();

    if (!company_name && !registration_number) {
      return Response.json({ 
        error: 'Veuillez fournir le nom de l\'entreprise ou le numéro d\'enregistrement' 
      }, { status: 400 });
    }

    // Step 1: Search for company on ODPIC registry
    const searchUrl = `https://odpic.dj/publication-registre/?s=${encodeURIComponent(company_name || registration_number)}`;
    
    try {
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        }
      });

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      const searchHtml = await searchResponse.text();

      // Step 2: Find the company detail page URL
      const companyPageUrl = findCompanyPageUrl(searchHtml, company_name, registration_number);

      if (!companyPageUrl) {
        return Response.json({
          success: false,
          message: 'Aucune entreprise trouvée avec ces critères',
          search_criteria: { company_name, registration_number }
        });
      }

      // Step 3: Fetch the detailed company page
      const detailResponse = await fetch(companyPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        }
      });

      if (!detailResponse.ok) {
        throw new Error(`HTTP error! status: ${detailResponse.status}`);
      }

      const detailHtml = await detailResponse.text();

      // Step 4: Parse the detailed company information
      const companyData = parseCompanyDetailPage(detailHtml);

      if (!companyData) {
        return Response.json({
          success: false,
          message: 'Impossible d\'extraire les données de l\'entreprise',
          search_criteria: { company_name, registration_number }
        });
      }

      // Log the search for audit trail
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'Due Diligence Search',
        entity_type: 'Company',
        entity_id: companyData.registration_number || 'unknown',
        user_email: user.email,
        details: {
          search_query: company_name || registration_number,
          result_found: true
        }
      });

      return Response.json({
        success: true,
        data: companyData,
        source: 'ODPIC Registry',
        timestamp: new Date().toISOString()
      });

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      return Response.json({
        success: false,
        error: 'Impossible d\'accéder au registre ODPIC',
        details: fetchError.message,
        fallback_message: 'Veuillez vérifier manuellement sur https://odpic.dj/publication-registre/'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Due diligence error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Find company detail page URL from search results
 */
function findCompanyPageUrl(html, searchName, searchNumber) {
  try {
    const cleanHtml = html.replace(/\s+/g, ' ').trim();
    
    // Extract all company links from search results
    const linkPattern = /<a[^>]*href="(https:\/\/odpic\.dj\/publication-registre\/[^"]+)"[^>]*>/gi;
    const links = [];
    let match;
    
    while ((match = linkPattern.exec(cleanHtml)) !== null) {
      const url = match[1];
      if (url && url !== 'https://odpic.dj/publication-registre/') {
        links.push(url);
      }
    }

    // If searching by name, try to match the URL slug
    if (searchName && links.length > 0) {
      const normalizedSearch = searchName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const matchedLink = links.find(link => {
        const slug = link.toLowerCase();
        return slug.includes(normalizedSearch) || normalizedSearch.includes(slug.split('/').pop().replace(/-/g, ''));
      });
      
      if (matchedLink) return matchedLink;
    }

    // Return first link if found
    return links.length > 0 ? links[0] : null;

  } catch (error) {
    console.error('Error finding company URL:', error);
    return null;
  }
}

/**
 * Parse company detail page to extract all information
 */
function parseCompanyDetailPage(html) {
  try {
    const cleanHtml = html.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    const extractText = (text) => {
      return text
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .trim();
    };

    // Extract company name from title
    const titleMatch = cleanHtml.match(/<h1[^>]*class="elementor-heading-title[^"]*"[^>]*>(.*?)<\/h1>/i) ||
                      cleanHtml.match(/<title>(.*?)<\/title>/i);
    const raison_sociale = titleMatch ? extractText(titleMatch[1]).replace(' - ODPIC', '') : '';

    // Extract data from table rows
    const tableMatch = cleanHtml.match(/<table[^>]*>(.*?)<\/table>/i);
    let companyData = {
      raison_sociale,
      numero_enregistrement: '',
      forme_juridique: '',
      date_immatriculation: '',
      siege_social: '',
      capital_social: '',
      activite_principale: '',
      dirigeants: '',
      nif: '',
      statut: 'Actif'
    };

    if (tableMatch) {
      const tableContent = tableMatch[1];
      const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gi);

      if (rowMatches) {
        rowMatches.forEach(row => {
          const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gi);
          if (cellMatches && cellMatches.length >= 2) {
            const label = extractText(cellMatches[0]).toLowerCase();
            const value = extractText(cellMatches[1]);

            if (label.includes('numéro') || label.includes('enregistrement') || label.includes('immatriculation')) {
              companyData.numero_enregistrement = value;
            } else if (label.includes('forme') || label.includes('juridique')) {
              companyData.forme_juridique = value;
            } else if (label.includes('date')) {
              companyData.date_immatriculation = value;
            } else if (label.includes('siège') || label.includes('siege') || label.includes('adresse')) {
              companyData.siege_social = value;
            } else if (label.includes('capital')) {
              companyData.capital_social = value;
            } else if (label.includes('activité') || label.includes('activite') || label.includes('objet')) {
              companyData.activite_principale = value;
            } else if (label.includes('dirigeant') || label.includes('gérant') || label.includes('gerant') || label.includes('représentant')) {
              companyData.dirigeants = value;
            } else if (label.includes('nif') || label.includes('fiscal')) {
              companyData.nif = value;
            } else if (label.includes('statut')) {
              companyData.statut = value;
            }
          }
        });
      }
    }

    // Alternative: Extract from paragraphs if table parsing failed
    if (!companyData.numero_enregistrement) {
      const nifMatch = cleanHtml.match(/NIF[:\s]*([A-Z0-9\-\/]+)/i);
      if (nifMatch) companyData.nif = extractText(nifMatch[1]);

      const numeroMatch = cleanHtml.match(/N°?\s*(?:d')?(?:enregistrement|immatriculation)[:\s]*([A-Z0-9\-\/]+)/i);
      if (numeroMatch) companyData.numero_enregistrement = extractText(numeroMatch[1]);

      const formeMatch = cleanHtml.match(/Forme\s*juridique[:\s]*([^<]+)/i);
      if (formeMatch) companyData.forme_juridique = extractText(formeMatch[1]);

      const dateMatch = cleanHtml.match(/Date\s*(?:d')?immatriculation[:\s]*([0-9\/\-\.]+)/i);
      if (dateMatch) companyData.date_immatriculation = extractText(dateMatch[1]);

      const capitalMatch = cleanHtml.match(/Capital\s*social[:\s]*([^<]+)/i);
      if (capitalMatch) companyData.capital_social = extractText(capitalMatch[1]);

      const activiteMatch = cleanHtml.match(/Activité\s*principale[:\s]*([^<]+)/i);
      if (activiteMatch) companyData.activite_principale = extractText(activiteMatch[1]);
    }

    // Return data if at least company name exists
    return companyData.raison_sociale ? companyData : null;

  } catch (parseError) {
    console.error('Parse error:', parseError);
    return null;
  }
}