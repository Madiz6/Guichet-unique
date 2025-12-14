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

    // Fetch ODPIC registry page
    const searchUrl = 'https://odpic.dj/publication-registre/';
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Parse HTML to extract company information
      const companyData = parseCompanyData(html, company_name, registration_number);

      if (!companyData) {
        return Response.json({
          success: false,
          message: 'Aucune entreprise trouvée avec ces critères',
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
 * Parse company data from ODPIC HTML
 * This function extracts structured company information from the registry page
 */
function parseCompanyData(html, searchName, searchNumber) {
  try {
    // Remove all newlines and extra spaces for easier parsing
    const cleanHtml = html.replace(/\s+/g, ' ').trim();

    // Extract table rows containing company data
    const tableMatch = cleanHtml.match(/<table[^>]*>(.*?)<\/table>/i);
    if (!tableMatch) {
      console.log('No table found in HTML');
      return null;
    }

    const tableContent = tableMatch[1];
    const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gi);

    if (!rowMatches || rowMatches.length === 0) {
      console.log('No rows found in table');
      return null;
    }

    const companies = [];

    // Skip header row, start from index 1
    for (let i = 1; i < rowMatches.length; i++) {
      const row = rowMatches[i];
      const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gi);

      if (!cellMatches || cellMatches.length < 4) continue;

      const extractText = (cell) => {
        return cell
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
      };

      const companyInfo = {
        numero_enregistrement: extractText(cellMatches[0] || ''),
        raison_sociale: extractText(cellMatches[1] || ''),
        forme_juridique: extractText(cellMatches[2] || ''),
        date_immatriculation: extractText(cellMatches[3] || ''),
        siege_social: extractText(cellMatches[4] || ''),
        capital_social: extractText(cellMatches[5] || ''),
        activite_principale: extractText(cellMatches[6] || ''),
        dirigeants: extractText(cellMatches[7] || ''),
        nif: extractText(cellMatches[8] || ''),
        statut: extractText(cellMatches[9] || 'Actif')
      };

      // Only add if has minimum required data
      if (companyInfo.raison_sociale || companyInfo.numero_enregistrement) {
        companies.push(companyInfo);
      }
    }

    // Filter based on search criteria
    if (searchName) {
      const normalizedSearch = searchName.toLowerCase().trim();
      const match = companies.find(c => 
        c.raison_sociale.toLowerCase().includes(normalizedSearch)
      );
      if (match) return match;
    }

    if (searchNumber) {
      const match = companies.find(c => 
        c.numero_enregistrement.includes(searchNumber)
      );
      if (match) return match;
    }

    // If no specific match but companies found, return first one
    // (useful when scraping a specific company page)
    return companies.length > 0 ? companies[0] : null;

  } catch (parseError) {
    console.error('Parse error:', parseError);
    return null;
  }
}