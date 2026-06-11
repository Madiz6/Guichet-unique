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

    const { company_name, registration_number } = req.body
    if (!company_name && !registration_number) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir le nom de l\'entreprise ou le numéro d\'enregistrement',
        code: 'MISSING_INPUT',
      })
    }

    const searchQuery = company_name || registration_number
    console.log(`[DUE-DILIGENCE] Starting search for: ${searchQuery} by ${user.email}`)

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are a KYC/AML due diligence specialist. Research the company "${searchQuery}" ${registration_number ? `(registration number: ${registration_number})` : ''} in Djibouti.

Search the ODPIC registry (odpic.dj), public databases, news sources, and any available commercial registries.

Return a comprehensive due diligence report as a JSON object:
{
  "company_name": "",
  "registration_number": "",
  "legal_form": "",
  "incorporation_date": "",
  "address": "",
  "directors": [{"name": "", "role": ""}],
  "capital": "",
  "industry": "",
  "nif": "",
  "status": "Actif|Inactif|Inconnu",
  "source_url": "",
  "data_quality": {"score": "HIGH|MEDIUM|LOW", "completeness": 0, "missing_fields": [], "warnings": []},
  "adverse_findings": [],
  "risk_indicators": [],
  "verification_date": "${new Date().toISOString()}",
  "report_narrative": ""
}`,
      }],
    })

    let report = {}
    for (const block of message.content) {
      if (block.type === 'text') {
        try {
          const jsonMatch = block.text.match(/\{[\s\S]+\}/)
          if (jsonMatch) report = JSON.parse(jsonMatch[0])
        } catch { /* use empty */ }
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_email: user.email,
      action: 'DUE_DILIGENCE_SEARCH',
      entity_type: 'company',
      entity_id: registration_number || company_name,
      changes: { search_query: searchQuery, company_found: report.company_name || null },
    })

    return res.json({
      success: true,
      data: report,
      source: 'Anthropic web search — ODPIC Registry & public databases',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[DUE-DILIGENCE] Error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
