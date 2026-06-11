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
    if (!profile || (profile.role !== 'admin' && profile.role !== 'agent')) {
      return res.status(403).json({ error: 'Admin/agent access required' })
    }

    const { names, dossier_id } = req.body
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'Missing names array' })
    }

    console.log(`[AML] Starting screening for ${names.length} subjects — dossier: ${dossier_id}`)

    const screeningResults = []

    for (const subject of names) {
      const name = subject.name || subject
      const role = subject.role || 'Unknown'
      console.log(`[AML] Screening: ${name}`)

      const message = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `You are an AML/KYC compliance officer performing automated screening.

Perform a comprehensive compliance screening for the following individual or entity:
Name: "${name}"
Role: "${role}"

Check against: OFAC SDN, UN sanctions, EU sanctions, UK HM Treasury, World-Check/PEP, Interpol Red Notices, FATF high-risk jurisdictions, adverse media (last 3 years).

Respond with a JSON object only, no markdown:
{
  "name": "${name}",
  "overall_risk": "CLEAR|REVIEW_REQUIRED|HIGH_RISK|MATCH_FOUND",
  "risk_score": 0-100,
  "ofac_status": "CLEAR|MATCH|POSSIBLE_MATCH|NOT_CHECKED",
  "un_sanctions_status": "CLEAR|MATCH|POSSIBLE_MATCH|NOT_CHECKED",
  "eu_sanctions_status": "CLEAR|MATCH|POSSIBLE_MATCH|NOT_CHECKED",
  "uk_sanctions_status": "CLEAR|MATCH|POSSIBLE_MATCH|NOT_CHECKED",
  "pep_status": "NOT_PEP|PEP|FORMER_PEP|PEP_ASSOCIATE|UNKNOWN",
  "pep_details": "",
  "adverse_media": false,
  "adverse_media_summary": "",
  "interpol_status": "CLEAR|RED_NOTICE|NOT_CHECKED",
  "fatf_jurisdiction_risk": "LOW|MEDIUM|HIGH",
  "fenergo_risk_category": "LOW|MEDIUM|HIGH|VERY_HIGH",
  "watchlist_hits": [],
  "notes": "",
  "recommended_action": "",
  "screened_at": "${new Date().toISOString()}"
}`
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

      screeningResults.push({ ...result, name, role, screened_at: new Date().toISOString() })
    }

    const riskPriority = { MATCH_FOUND: 4, HIGH_RISK: 3, REVIEW_REQUIRED: 2, CLEAR: 1 }
    const maxRisk = screeningResults.reduce((max, r) => {
      return (riskPriority[r.overall_risk] || 0) > (riskPriority[max] || 0) ? r.overall_risk : max
    }, 'CLEAR')

    const hasPEP = screeningResults.some(r => r.pep_status === 'PEP' || r.pep_status === 'FORMER_PEP')
    const hasAdverseMedia = screeningResults.some(r => r.adverse_media)

    // Persist to aml_screening_sessions
    await supabase.from('aml_screening_sessions').insert({
      dossier_id: dossier_id || null,
      screened_by: user.email,
      aggregate_risk: maxRisk,
      has_pep: hasPEP,
      has_adverse_media: hasAdverseMedia,
      subjects_screened: names.length,
      results: screeningResults,
      screened_at: new Date().toISOString(),
    })

    // Audit log
    await supabase.from('audit_logs').insert({
      user_email: user.email,
      action: 'AML_SCREENING_COMPLETED',
      entity_type: 'registration_dossier',
      entity_id: dossier_id || null,
      changes: {
        subjects_screened: names.length,
        aggregate_risk: maxRisk,
        has_pep: hasPEP,
        has_adverse_media: hasAdverseMedia,
        results: screeningResults.map(r => ({ name: r.name, risk: r.overall_risk, pep: r.pep_status })),
      },
    })

    console.log(`[AML] Screening complete. Aggregate risk: ${maxRisk}`)

    return res.json({
      success: true,
      dossier_id,
      aggregate_risk: maxRisk,
      has_pep: hasPEP,
      has_adverse_media: hasAdverseMedia,
      subjects_screened: screeningResults.length,
      results: screeningResults,
      screened_at: new Date().toISOString(),
      screened_by: user.email,
    })
  } catch (error) {
    console.error('[AML] Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
