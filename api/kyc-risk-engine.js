import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { company_id, company_name, nif, type_entreprise, activite, capital_social, date_creation, dossier_id } = req.body
    if (!company_name) return res.status(400).json({ error: 'company_name is required' })

    console.log(`[KYC-ENGINE] Starting risk assessment for: ${company_name}`)

    let dossierData = null
    if (dossier_id) {
      const { data } = await supabase
        .from('registration_dossiers').select('*').eq('id', dossier_id).single()
      dossierData = data
    }

    const partners = dossierData?.step_data?.partenaires?.partners || []
    const employees = dossierData?.step_data?.employes?.employees || []
    const activiteData = dossierData?.step_data?.activite || {}

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
    `.trim()

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are a Fenergo-style KYC Risk Engine performing a real-time client risk assessment for a company registered in Djibouti, East Africa.

Company Profile:
${contextSummary}

Apply risk models: entity risk score, geographic risk, ownership structure risk, PEP exposure risk, activity/sector risk, data quality score, continuous monitoring flags, due diligence level required, Fenergo risk category, next review recommendation.

Respond with a JSON object only, no markdown:
{
  "overall_risk_score": 0-100,
  "risk_category": "LOW|MEDIUM|HIGH|VERY_HIGH",
  "due_diligence_level": "SIMPLIFIED|STANDARD|ENHANCED",
  "entity_risk_score": 0-100,
  "geographic_risk": "LOW|MEDIUM|HIGH",
  "ownership_risk": "LOW|MEDIUM|HIGH",
  "pep_exposure_risk": "NONE|LOW|MEDIUM|HIGH",
  "sector_risk": "LOW|MEDIUM|HIGH",
  "data_quality_score": 0-100,
  "ubo_transparency": "TRANSPARENT|PARTIALLY_TRANSPARENT|OPAQUE",
  "continuous_monitoring_flags": [],
  "materiality_triggers": [],
  "recommended_actions": [],
  "next_review_months": 12,
  "edd_required": false,
  "risk_narrative": "",
  "data_validation_recommendations": [],
  "fenergo_compliance_status": "COMPLIANT|REVIEW_REQUIRED|NON_COMPLIANT"
}`,
      }],
    })

    let result = {}
    for (const block of message.content) {
      if (block.type === 'text') {
        try {
          const jsonMatch = block.text.match(/\{[\s\S]+\}/)
          if (jsonMatch) result = JSON.parse(jsonMatch[0])
        } catch { /* use empty result */ }
      }
    }

    const nextReviewDate = new Date()
    nextReviewDate.setMonth(nextReviewDate.getMonth() + (result.next_review_months || 12))

    const assessment = {
      ...result,
      company_id,
      company_name,
      assessed_at: new Date().toISOString(),
      assessed_by: user.email,
      next_review_date: nextReviewDate.toISOString().split('T')[0],
    }

    // Persist to kyc_risk_assessments
    await supabase.from('kyc_risk_assessments').insert({
      company_id: company_id || null,
      company_name,
      dossier_id: dossier_id || null,
      assessed_by: user.email,
      assessment,
      assessed_at: new Date().toISOString(),
    })

    // Audit log
    await supabase.from('audit_logs').insert({
      user_email: user.email,
      action: 'KYC_RISK_ASSESSMENT',
      entity_type: 'company',
      entity_id: company_id || company_name,
      changes: {
        risk_category: assessment.risk_category,
        overall_risk_score: assessment.overall_risk_score,
        due_diligence_level: assessment.due_diligence_level,
        fenergo_compliance_status: assessment.fenergo_compliance_status,
        edd_required: assessment.edd_required,
      },
    })

    console.log(`[KYC-ENGINE] Assessment complete: ${assessment.risk_category} risk, score ${assessment.overall_risk_score}`)

    return res.json({ success: true, assessment })
  } catch (error) {
    console.error('[KYC-ENGINE] Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
