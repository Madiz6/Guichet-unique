import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { names, dossier_id } = await req.json();

    if (!names || !Array.isArray(names) || names.length === 0) {
      return Response.json({ error: 'Missing names array' }, { status: 400 });
    }

    console.log(`[AML] Starting screening for ${names.length} subjects — dossier: ${dossier_id}`);

    const screeningResults = [];

    for (const subject of names) {
      const name = subject.name || subject;
      const role = subject.role || 'Unknown';

      console.log(`[AML] Screening: ${name}`);

      // Use LLM with internet context to check global sanctions databases
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an AML/KYC compliance officer performing automated screening. 
        
Perform a comprehensive compliance screening for the following individual or entity:
Name: "${name}"
Role: "${role}"

Check against the following databases and sources:
1. OFAC SDN List (US Treasury Office of Foreign Assets Control)
2. UN Security Council Consolidated Sanctions List
3. EU Consolidated Financial Sanctions List
4. UK HM Treasury Financial Sanctions
5. World-Check / Refinitiv (PEP & Sanctions)
6. Interpol Red Notices
7. FATF High-Risk Jurisdictions
8. Global PEP databases (Politically Exposed Persons)
9. Adverse media screening (last 3 years)
10. Fenergo-style regulatory risk assessment

Return a detailed JSON assessment. Be factual and conservative — if uncertain, flag as "REVIEW_REQUIRED". 
Base your assessment on publicly available sanctions lists and adverse media.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            overall_risk: { type: 'string', enum: ['CLEAR', 'REVIEW_REQUIRED', 'HIGH_RISK', 'MATCH_FOUND'] },
            risk_score: { type: 'number' },
            ofac_status: { type: 'string', enum: ['CLEAR', 'MATCH', 'POSSIBLE_MATCH', 'NOT_CHECKED'] },
            un_sanctions_status: { type: 'string', enum: ['CLEAR', 'MATCH', 'POSSIBLE_MATCH', 'NOT_CHECKED'] },
            eu_sanctions_status: { type: 'string', enum: ['CLEAR', 'MATCH', 'POSSIBLE_MATCH', 'NOT_CHECKED'] },
            uk_sanctions_status: { type: 'string', enum: ['CLEAR', 'MATCH', 'POSSIBLE_MATCH', 'NOT_CHECKED'] },
            pep_status: { type: 'string', enum: ['NOT_PEP', 'PEP', 'FORMER_PEP', 'PEP_ASSOCIATE', 'UNKNOWN'] },
            pep_details: { type: 'string' },
            adverse_media: { type: 'boolean' },
            adverse_media_summary: { type: 'string' },
            interpol_status: { type: 'string', enum: ['CLEAR', 'RED_NOTICE', 'NOT_CHECKED'] },
            fatf_jurisdiction_risk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            fenergo_risk_category: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] },
            watchlist_hits: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            recommended_action: { type: 'string' },
            screened_at: { type: 'string' }
          }
        }
      });

      screeningResults.push({
        ...result,
        name,
        role,
        screened_at: new Date().toISOString()
      });
    }

    // Compute aggregate risk
    const riskPriority = { 'MATCH_FOUND': 4, 'HIGH_RISK': 3, 'REVIEW_REQUIRED': 2, 'CLEAR': 1 };
    const maxRisk = screeningResults.reduce((max, r) => {
      return (riskPriority[r.overall_risk] || 0) > (riskPriority[max] || 0) ? r.overall_risk : max;
    }, 'CLEAR');

    const hasHighRisk = screeningResults.some(r => r.overall_risk === 'MATCH_FOUND' || r.overall_risk === 'HIGH_RISK');
    const hasPEP = screeningResults.some(r => r.pep_status === 'PEP' || r.pep_status === 'FORMER_PEP');
    const hasAdverseMedia = screeningResults.some(r => r.adverse_media);

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'AML_SCREENING_COMPLETED',
      entity_type: 'RegistrationDossier',
      entity_id: dossier_id || 'N/A',
      changes: {
        subjects_screened: names.length,
        aggregate_risk: maxRisk,
        has_pep: hasPEP,
        has_adverse_media: hasAdverseMedia,
        results: screeningResults.map(r => ({ name: r.name, risk: r.overall_risk, pep: r.pep_status }))
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[AML] Screening complete. Aggregate risk: ${maxRisk}`);

    return Response.json({
      success: true,
      dossier_id,
      aggregate_risk: maxRisk,
      has_pep: hasPEP,
      has_adverse_media: hasAdverseMedia,
      subjects_screened: screeningResults.length,
      results: screeningResults,
      screened_at: new Date().toISOString(),
      screened_by: user.email
    });

  } catch (error) {
    console.error('[AML] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});