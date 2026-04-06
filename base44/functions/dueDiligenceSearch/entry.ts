import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Rate limiting cache (simple in-memory for demo)
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    const { company_name, registration_number } = await req.json();

    // Input validation
    if (!company_name && !registration_number) {
      return Response.json({ 
        success: false,
        error: 'Veuillez fournir le nom de l\'entreprise ou le numéro d\'enregistrement',
        code: 'MISSING_INPUT'
      }, { status: 400 });
    }

    // Validate input format
    if (company_name && (company_name.length < 2 || company_name.length > 200)) {
      return Response.json({
        success: false,
        error: 'Le nom de l\'entreprise doit contenir entre 2 et 200 caractères',
        code: 'INVALID_INPUT_LENGTH'
      }, { status: 400 });
    }

    // Rate limiting
    const rateLimitKey = user.email;
    const now = Date.now();
    const userRequests = rateLimitCache.get(rateLimitKey) || [];
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS) {
      return Response.json({
        success: false,
        error: 'Trop de requêtes. Veuillez réessayer dans une minute.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }
    
    recentRequests.push(now);
    rateLimitCache.set(rateLimitKey, recentRequests);

    // Normalize input for better matching
    const normalizedName = company_name ? normalizeCompanyName(company_name) : null;

    console.log(`[KYC] Starting search for: ${company_name || registration_number} by ${user.email}`);

    // Step 1: Search for company on ODPIC registry
    const searchQuery = normalizedName || registration_number;
    const searchUrl = `https://odpic.dj/publication-registre/?s=${encodeURIComponent(searchQuery)}`;
    
    try {
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        }
      });

      if (!searchResponse.ok) {
        console.error(`[KYC] Search failed with status: ${searchResponse.status}`);
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      const searchHtml = await searchResponse.text();

      // Step 2: Find the company detail page URL(s)
      const matchResults = findCompanyPageUrl(searchHtml, normalizedName || company_name, registration_number);

      if (!matchResults || matchResults.length === 0) {
        console.log(`[KYC] No results found for: ${searchQuery}`);
        
        await base44.asServiceRole.entities.AuditLog.create({
          action: 'KYC Search - No Results',
          entity_type: 'Company',
          user_email: user.email,
          details: {
            search_query: searchQuery,
            status: 'NOT_FOUND'
          }
        });

        return Response.json({
          success: false,
          message: 'Aucune entreprise trouvée avec ces critères',
          code: 'NO_MATCH',
          search_criteria: { company_name, registration_number }
        });
      }

      // Handle multiple matches
      if (matchResults.length > 1) {
        console.log(`[KYC] Multiple matches found: ${matchResults.length}`);
        
        return Response.json({
          success: false,
          message: 'Plusieurs entreprises correspondent à votre recherche',
          code: 'MULTIPLE_MATCHES',
          matches: matchResults.map(m => ({
            company_name: m.title,
            url: m.url,
            similarity_score: m.score
          })),
          suggestion: 'Veuillez affiner votre recherche ou utiliser le numéro d\'enregistrement'
        });
      }

      const companyPageUrl = matchResults[0].url;
      console.log(`[KYC] Found match: ${companyPageUrl}`);

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

      if (!companyData || !companyData.raison_sociale) {
        console.error(`[KYC] Failed to parse company data`);
        
        return Response.json({
          success: false,
          message: 'Impossible d\'extraire les données de l\'entreprise',
          code: 'PARSE_ERROR',
          search_criteria: { company_name, registration_number }
        });
      }

      // Validate data quality
      const dataQuality = assessDataQuality(companyData);
      
      // Enhanced structured output for KYC
      const kycOutput = {
        companyName: companyData.raison_sociale,
        registrationNumber: companyData.numero_enregistrement || null,
        legalForm: companyData.forme_juridique || null,
        incorporationDate: companyData.date_immatriculation || null,
        address: companyData.siege_social || null,
        directors: companyData.dirigeants ? 
          companyData.dirigeants.split(/[,;]/).map(d => ({
            name: d.trim(),
            role: 'Director'
          })) : [],
        capital: companyData.capital_social || null,
        industry: companyData.activite_principale || null,
        nif: companyData.nif || null,
        status: companyData.statut || 'Actif',
        sourceURL: companyPageUrl,
        dataQuality: dataQuality,
        verificationDate: new Date().toISOString()
      };

      // Log successful search for audit trail
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'KYC Search - Success',
        entity_type: 'Company',
        entity_id: kycOutput.registrationNumber || kycOutput.companyName,
        user_email: user.email,
        details: {
          search_query: searchQuery,
          company_found: kycOutput.companyName,
          registration_number: kycOutput.registrationNumber,
          data_quality: dataQuality.score,
          source_url: companyPageUrl
        }
      });

      console.log(`[KYC] Successfully retrieved data for: ${kycOutput.companyName}`);

      return Response.json({
        success: true,
        data: kycOutput,
        source: 'ODPIC Registry - Office Djiboutien de la Propriété Industrielle et Commerciale',
        timestamp: new Date().toISOString(),
        code: 'SUCCESS'
      });

    } catch (fetchError) {
      console.error('[KYC] Network error:', fetchError);
      
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'KYC Search - Network Error',
        entity_type: 'Company',
        user_email: user.email,
        details: {
          error: fetchError.message,
          search_query: searchQuery
        }
      });

      return Response.json({
        success: false,
        error: 'Impossible d\'accéder au registre ODPIC',
        code: 'NETWORK_ERROR',
        details: fetchError.message,
        fallback_message: 'Veuillez vérifier manuellement sur https://odpic.dj/publication-registre/'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('[KYC] Unexpected error:', error);
    
    return Response.json({ 
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});

/**
 * Normalize company name for better matching
 */
function normalizeCompanyName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+(sarl|sa|sas|eurl|company)$/i, '');
}

/**
 * Calculate similarity score between two strings (Levenshtein distance)
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : (maxLength - costs[s2.length]) / maxLength;
}

/**
 * Assess data quality of extracted information
 */
function assessDataQuality(data) {
  const fields = [
    'raison_sociale',
    'numero_enregistrement',
    'forme_juridique',
    'date_immatriculation',
    'siege_social',
    'capital_social',
    'activite_principale',
    'dirigeants',
    'nif'
  ];
  
  const filledFields = fields.filter(field => data[field] && data[field].toString().trim() !== '');
  const completeness = (filledFields.length / fields.length) * 100;
  
  let score = 'HIGH';
  if (completeness < 50) score = 'LOW';
  else if (completeness < 75) score = 'MEDIUM';
  
  return {
    score,
    completeness: Math.round(completeness),
    missingFields: fields.filter(field => !data[field] || data[field].toString().trim() === ''),
    warnings: []
  };
}

/**
 * Find company detail page URL(s) from search results with fuzzy matching
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

    // Fallback: extract all publication-registre links
    if (companies.length === 0) {
      const linkPattern = /<a[^>]*href="(https:\/\/odpic\.dj\/publication-registre\/[^"]+)"[^>]*>/gi;
      while ((match = linkPattern.exec(cleanHtml)) !== null) {
        const url = match[1];
        if (url && url !== 'https://odpic.dj/publication-registre/') {
          // Try to extract title from nearby text
          const titleMatch = cleanHtml.substring(match.index - 200, match.index).match(/>([^<]+)<\/[^>]+>$/);
          const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
          companies.push({ title, url });
        }
      }
    }

    if (companies.length === 0) {
      return null;
    }

    // Match by registration number (exact)
    if (searchNumber) {
      const exactMatch = companies.find(c => 
        c.title.includes(searchNumber) || c.url.includes(searchNumber)
      );
      if (exactMatch) return [{ ...exactMatch, score: 1.0 }];
    }

    // Match by company name with fuzzy matching
    if (searchName) {
      const normalizedSearch = normalizeCompanyName(searchName);
      
      // Calculate similarity scores
      const scoredCompanies = companies.map(c => ({
        ...c,
        score: calculateSimilarity(normalizeCompanyName(c.title), normalizedSearch)
      })).sort((a, b) => b.score - a.score);

      // Exact match
      const exactMatch = scoredCompanies.find(c => c.score === 1.0);
      if (exactMatch) return [exactMatch];

      // High confidence matches (>= 0.8)
      const highConfidenceMatches = scoredCompanies.filter(c => c.score >= 0.8);
      if (highConfidenceMatches.length === 1) return highConfidenceMatches;
      if (highConfidenceMatches.length > 1) return highConfidenceMatches.slice(0, 3);

      // Medium confidence matches (>= 0.6)
      const mediumConfidenceMatches = scoredCompanies.filter(c => c.score >= 0.6);
      if (mediumConfidenceMatches.length > 0) return mediumConfidenceMatches.slice(0, 5);
    }

    // Return first result if no good match found
    return [{ ...companies[0], score: 0.5 }];

  } catch (error) {
    console.error('[KYC] Error finding company URL:', error);
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

    // Strategy 2: Parse from text content blocks (ODPIC format)
    const allText = extractText(cleanHtml);
    
    // ODPIC-specific patterns (exact labels)
    const odpicPatterns = [
      // Exact matches for ODPIC labels
      { regex: /D[eé]nomination\s+sociale\s+([\s\S]+?)(?=Immatriculation|Date|$)/i, field: 'raison_sociale' },
      { regex: /Immatriculation\s+(\d+)/i, field: 'numero_enregistrement' },
      { regex: /Date\s+d['']?enregistrement\s+([\d\/\-\.]+)/i, field: 'date_immatriculation' },
      { regex: /Dirigeants?\s+([\s\S]+?)(?=Adresses|Capital|Date|$)/i, field: 'dirigeants' },
      { regex: /Adresses?\s+([\s\S]+?)(?=Capital|Date|Dirigeants|$)/i, field: 'siege_social' },
      { regex: /Capital\s+([\d\s]+(?:FDJ|DJF)?)/i, field: 'capital_social' },
      
      // Alternative patterns
      { regex: /Num[eé]ro\s*d['']?(?:immatriculation|enregistrement)\s*:?\s*([A-Z0-9\/\-\s]+)/i, field: 'numero_enregistrement' },
      { regex: /Forme\s*juridique\s*:?\s*([A-Z\s]+)/i, field: 'forme_juridique' },
      { regex: /Date\s*d['']?immatriculation\s*:?\s*([\d\/\-\.]+)/i, field: 'date_immatriculation' },
      { regex: /Si[eè]ge\s*social\s*:?\s*([^<\n]+)/i, field: 'siege_social' },
      { regex: /Capital\s*social\s*:?\s*([^<\n]+)/i, field: 'capital_social' },
      { regex: /Activit[eé]\s*principale\s*:?\s*([^<\n]+)/i, field: 'activite_principale' },
      { regex: /Objet\s*social\s*:?\s*([^<\n]+)/i, field: 'activite_principale' },
      { regex: /G[eé]rants?\s*:?\s*([^<\n]+)/i, field: 'dirigeants' },
      { regex: /NIF\s*:?\s*([A-Z0-9\/\-]+)/i, field: 'nif' }
    ];

    odpicPatterns.forEach(({ regex, field }) => {
      if (!companyData[field] || companyData[field] === '') {
        const match = allText.match(regex);
        if (match && match[1]) {
          let value = match[1].trim();
          // Clean up multi-line extractions
          value = value.replace(/\s{2,}/g, ' ').split(/(?:Immatriculation|Date|Dirigeants|Adresses|Capital|Forme|Activit[eé]|Objet|Si[eè]ge|NIF)/i)[0].trim();
          if (value && value.length > 0 && value.length < 500) {
            companyData[field] = value;
          }
        }
      }
    });

    // Parse from structured divs/paragraphs
    const contentMatch = cleanHtml.match(/<(?:p|div)[^>]*>(.*?)<\/(?:p|div)>/gi);
    if (contentMatch) {
      contentMatch.forEach(block => {
        const text = extractText(block);
        if (!text || text.length < 3) return;
        
        // Check for label-value pattern
        if (text.match(/^\s*[A-Za-zéèêàâ\s]+\s*$/)) {
          // This might be a label, look for value in next block
          return;
        }
        
        // Direct field extraction from standalone values
        const trimmed = text.trim();
        if (trimmed.match(/^\d{5}$/) && !companyData.numero_enregistrement) {
          companyData.numero_enregistrement = trimmed;
        } else if (trimmed.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && !companyData.date_immatriculation) {
          companyData.date_immatriculation = trimmed;
        } else if (trimmed.match(/^[\d\s]+(?:FDJ|DJF)$/i) && !companyData.capital_social) {
          companyData.capital_social = trimmed;
        }
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