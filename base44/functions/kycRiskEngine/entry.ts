import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { company_id, company_name, nif, type_entreprise, activite, capital_social, date_creation, dossier_id } = await req.json();

    if (!company_name) {
      return Response.json({ error: 'company_name is required' }, { status: 400 });
    }

    console.log(`[KYC-ENGINE] Starting risk assessment for: ${company_name}`);

    // Fetch associated dossier data for deeper analysis if dossier_id provided
    let dossierData = null;
    if (dossier_id) {
      const dossiers = await base44.asServiceRole.entities.RegistrationDossier.filter({ id: dossier_id });
      dossierData = dossiers[0] || null;
    }

    const partners = dossierData?.step_data?.partenaires?.partners || [];
    const employees = dossierData?.step_data?.employes?.employees || [];
    const activiteData = dossierData?.step_data?.activite || {};

    // Build context for LLM risk engine
    const contextSummary = `
Company: ${company_name}
NIF: ${nif || 'N/A'}
Type: ${type_entreprise || activiteData.forme_juridique || 'N/A'}
Sector: ${activite || activiteData.secteur_principal || 'N/A'}
Capital: ${capital_social || activiteData.capital_social || 'N/A'} DJF
Incorporation date: ${date_creation || 'N/A'}
Number of partners: ${partners.length}
Number of initial employees: ${employees.length}
Partners with ≥25% ownership (UBOs): ${partners.filter(p => parseFloat(p.part_percent) >= 25).length}
PEP partners declared: ${partners.filter(p => p.pep_status === true).length}
Foreign partners: ${partners.filter(p => p.nationalite && p.nationalite.toLowerCase() !== 'djiboutienne' && p.nationalite.toLowerCase() !== 'djibouti').length}
    `.trim();

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a Fenergo-style KYC Risk Engine performing a real-time client risk assessment and continuous monitoring evaluation for a company registered in Djibouti, East Africa.

Company Profile:
${contextSummary}

Apply the following risk models simultaneously:
1. **Entity Risk Score** (0-100): Based on legal form, sector, capital, age, structure complexity
2. **Geographic Risk**: Djibouti context, international connections, FATF jurisdiction risk
3. **Ownership Structure Risk**: Complexity, UBO transparency, foreign ownership %, cross-border holdings
4. **PEP Exposure Risk**: Direct and indirect PEP links
5. **Activity/Sector Risk**: AML exposure of the business sector
6. **Data Quality Score**: Completeness and verifiability of submitted information
7. **Continuous Monitoring Flags**: Changes or red flags requiring immediate review
8. **Due Diligence Level Required**: Standard, Enhanced, or Simplified
9. **Fenergo Risk Category**: LOW / MEDIUM / HIGH / VERY_HIGH
10. **Next Review Recommended**: Based on risk level (months)

Also assess:
- Whether entity relationships and beneficial ownership are sufficiently transparent
- Whether the risk model warrants enhanced due diligence (EDD)
- Key materiality changes that should trigger a new KYC review
- Data provider validation recommendations

Respond with a structured JSON risk assessment.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_risk_score: { type: 'number' },
          risk_category: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] },
          due_diligence_level: { type: 'string', enum: ['SIMPLIFIED', 'STANDARD', 'ENHANCED'] },
          entity_risk_score: { type: 'number' },
          geographic_risk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          ownership_risk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          pep_exposure_risk: { type: 'string', enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'] },
          sector_risk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          data_quality_score: { type: 'number' },
          ubo_transparency: { type: 'string', enum: ['TRANSPARENT', 'PARTIALLY_TRANSPARENT', 'OPAQUE'] },
          continuous_monitoring_flags: { type: 'array', items: { type: 'string' } },
          materiality_triggers: { type: 'array', items: { type: 'string' } },
          recommended_actions: { type: 'array', items: { type: 'string' } },
          next_review_months: { type: 'number' },
          edd_required: { type: 'boolean' },
          risk_narrative: { type: 'string' },
          data_validation_recommendations: { type: 'array', items: { type: 'string' } },
          fenergo_compliance_status: { type: 'string', enum: ['COMPLIANT', 'REVIEW_REQUIRED', 'NON_COMPLIANT'] }
        }
      }
    });

    // Compute next review date
    const nextReviewDate = new Date();
    nextReviewDate.setMonth(nextReviewDate.getMonth() + (result.next_review_months || 12));

    const assessment = {
      ...result,
      company_id,
      company_name,
      assessed_at: new Date().toISOString(),
      assessed_by: user.email,
      next_review_date: nextReviewDate.toISOString().split('T')[0]
    };

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'KYC_RISK_ASSESSMENT',
      entity_type: 'Company',
      entity_id: company_id || company_name,
      entity_name: company_name,
      changes: {
        risk_category: assessment.risk_category,
        overall_risk_score: assessment.overall_risk_score,
        due_diligence_level: assessment.due_diligence_level,
        fenergo_compliance_status: assessment.fenergo_compliance_status,
        edd_required: assessment.edd_required
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[KYC-ENGINE] Assessment complete: ${assessment.risk_category} risk, score ${assessment.overall_risk_score}`);

    return Response.json({ success: true, assessment });

  } catch (error) {
    console.error('[KYC-ENGINE] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});