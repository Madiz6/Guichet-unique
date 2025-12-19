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
    
    // Extract company cards with links and titles
    const cardPattern = /<h2[^>]*class="elementor-heading-title[^"]*"[^>]*>(.*?)<\/h2>[\s\S]*?<a[^>]*href="(https:\/\/odpic\.dj\/publication-registre\/[^"]+)"[^>]*>/gi;
    const companies = [];
    let match;
    
    while ((match = cardPattern.exec(cleanHtml)) !== null) {
      const title = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
      const url = match[2];
      if (url && url !== 'https://odpic.dj/publication-registre/') {
        companies.push({ title, url });
      }
    }

    // Match by company name
    if (searchName && companies.length > 0) {
      const normalizedSearch = searchName.toLowerCase().trim();
      const exactMatch = companies.find(c => c.title.toLowerCase() === normalizedSearch);
      if (exactMatch) return exactMatch.url;
      
      const partialMatch = companies.find(c => 
        c.title.toLowerCase().includes(normalizedSearch) || 
        normalizedSearch.includes(c.title.toLowerCase())
      );
      if (partialMatch) return partialMatch.url;
    }

    // Fallback: extract all publication-registre links
    const linkPattern = /<a[^>]*href="(https:\/\/odpic\.dj\/publication-registre\/[^"]+)"[^>]*>/gi;
    const links = [];
    while ((match = linkPattern.exec(cleanHtml)) !== null) {
      const url = match[1];
      if (url && url !== 'https://odpic.dj/publication-registre/' && !links.includes(url)) {
        links.push(url);
      }
    }

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
    const cleanHtml = html.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    
    const extractText = (text) => {
      if (!text) return '';
      return text
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&agrave;/g, 'à')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    // Extract company name from h1 or title
    let raison_sociale = '';
    const h1Match = cleanHtml.match(/<h1[^>]*class="[^"]*elementor-heading-title[^"]*"[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      raison_sociale = extractText(h1Match[1]);
    } else {
      const titleMatch = cleanHtml.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        raison_sociale = extractText(titleMatch[1]).replace(/\s*-\s*ODPIC\s*$/i, '');
      }
    }

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

    // Strategy 1: Parse structured table data
    const tableMatch = cleanHtml.match(/<table[^>]*class="[^"]*table[^"]*"[^>]*>(.*?)<\/table>/i);
    if (tableMatch) {
      const tableContent = tableMatch[1];
      const rowMatches = [...tableContent.matchAll(/<tr[^>]*>(.*?)<\/tr>/gi)];

      rowMatches.forEach(rowMatch => {
        const row = rowMatch[1];
        const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gi)];
        
        if (cells.length >= 2) {
          const label = extractText(cells[0][1]).toLowerCase();
          const value = extractText(cells[1][1]);

          if (!value || value === '-') return;

          if (label.match(/num[eé]ro|n°|immatriculation|enregistrement/)) {
            companyData.numero_enregistrement = value;
          } else if (label.match(/forme.*juridique|type.*soci[eé]t[eé]/)) {
            companyData.forme_juridique = value;
          } else if (label.match(/date.*immatriculation|date.*cr[eé]ation/)) {
            companyData.date_immatriculation = value;
          } else if (label.match(/si[eè]ge|adresse/)) {
            companyData.siege_social = value;
          } else if (label.match(/capital/)) {
            companyData.capital_social = value;
          } else if (label.match(/activit[eé]|objet.*social/)) {
            companyData.activite_principale = value;
          } else if (label.match(/dirigeant|g[eé]rant|repr[eé]sentant|administrateur/)) {
            companyData.dirigeants = value;
          } else if (label.match(/nif|identif.*fiscal/)) {
            companyData.nif = value;
          } else if (label.match(/statut/)) {
            companyData.statut = value;
          }
        }
      });
    }

    // Strategy 2: Parse from paragraphs and divs (key:value patterns)
    const contentMatch = cleanHtml.match(/<div[^>]*class="[^"]*elementor-widget-container[^"]*"[^>]*>(.*?)<\/div>/gi);
    if (contentMatch) {
      contentMatch.forEach(block => {
        const text = extractText(block);
        
        // Pattern: "Label: Value" or "Label : Value"
        const patterns = [
          { regex: /Num[eé]ro\s*d['']?(?:immatriculation|enregistrement)\s*:?\s*([A-Z0-9\/\-\s]+)/i, field: 'numero_enregistrement' },
          { regex: /Forme\s*juridique\s*:?\s*([A-Z\s]+)/i, field: 'forme_juridique' },
          { regex: /Date\s*d['']?immatriculation\s*:?\s*([\d\/\-\.]+)/i, field: 'date_immatriculation' },
          { regex: /Si[eè]ge\s*social\s*:?\s*([^\.]+)/i, field: 'siege_social' },
          { regex: /Capital\s*social\s*:?\s*([^\.]+)/i, field: 'capital_social' },
          { regex: /Activit[eé]\s*principale\s*:?\s*([^\.]+)/i, field: 'activite_principale' },
          { regex: /Objet\s*social\s*:?\s*([^\.]+)/i, field: 'activite_principale' },
          { regex: /Dirigeants?\s*:?\s*([^\.]+)/i, field: 'dirigeants' },
          { regex: /G[eé]rants?\s*:?\s*([^\.]+)/i, field: 'dirigeants' },
          { regex: /NIF\s*:?\s*([A-Z0-9\/\-]+)/i, field: 'nif' }
        ];

        patterns.forEach(({ regex, field }) => {
          if (!companyData[field] || companyData[field] === '') {
            const match = text.match(regex);
            if (match && match[1]) {
              companyData[field] = match[1].trim();
            }
          }
        });
      });
    }

    // Strategy 3: Parse from list items
    const listMatch = cleanHtml.match(/<li[^>]*>(.*?)<\/li>/gi);
    if (listMatch) {
      listMatch.forEach(item => {
        const text = extractText(item);
        if (text.includes(':')) {
          const [label, ...valueParts] = text.split(':');
          const value = valueParts.join(':').trim();
          const normalizedLabel = label.toLowerCase().trim();

          if (normalizedLabel.match(/num[eé]ro|immatriculation/) && !companyData.numero_enregistrement) {
            companyData.numero_enregistrement = value;
          } else if (normalizedLabel.match(/forme|juridique/) && !companyData.forme_juridique) {
            companyData.forme_juridique = value;
          } else if (normalizedLabel.match(/date/) && !companyData.date_immatriculation) {
            companyData.date_immatriculation = value;
          } else if (normalizedLabel.match(/si[eè]ge|adresse/) && !companyData.siege_social) {
            companyData.siege_social = value;
          } else if (normalizedLabel.match(/capital/) && !companyData.capital_social) {
            companyData.capital_social = value;
          } else if (normalizedLabel.match(/activit[eé]|objet/) && !companyData.activite_principale) {
            companyData.activite_principale = value;
          } else if (normalizedLabel.match(/dirigeant|g[eé]rant/) && !companyData.dirigeants) {
            companyData.dirigeants = value;
          } else if (normalizedLabel.match(/nif/) && !companyData.nif) {
            companyData.nif = value;
          }
        }
      });
    }

    // Clean up extracted data
    Object.keys(companyData).forEach(key => {
      if (typeof companyData[key] === 'string') {
        companyData[key] = companyData[key].replace(/\s{2,}/g, ' ').trim();
      }
    });

    // Validate we have at least company name
    return companyData.raison_sociale ? companyData : null;

  } catch (parseError) {
    console.error('Parse error:', parseError);
    return null;
  }
}