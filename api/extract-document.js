/**
 * POST /api/extract-document
 * Server-side ID/passport OCR using Claude vision.
 * Accepts signed Supabase URLs, downloads them server-side,
 * and returns extracted fields as strict JSON.
 * Personal data is never logged.
 */
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DEFAULT_SYSTEM = `You are an expert OCR system for Djiboutian identity documents (CNI and passport).
Extract ALL readable text and return ONLY a valid JSON object — no prose, no markdown fences.
Djiboutian CNI layout: front side has photo, surname, given name, date of birth, place of birth, NNI (Numéro National d'Identification), nationality, sex, document number, issue date, expiry date; back side has address, father name, mother name, profession, two MRZ lines.
Passport layout: biodata page contains all fields.
Rules: dates in YYYY-MM-DD format; empty string "" for any field not visible or not present; do NOT invent or guess values.`

// Supported image media types for Claude vision
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

async function fetchAsBase64(url) {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok) throw new Error(`Image fetch failed: ${r.status}`)
  const ct = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
  const mediaType = IMAGE_TYPES.has(ct) ? ct : 'image/jpeg'
  const buf = Buffer.from(await r.arrayBuffer())
  return { mediaType, data: buf.toString('base64') }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth — any authenticated user can extract their own document
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Non authentifié' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Non authentifié' })

  const { file_urls, json_schema, prompt } = req.body || {}
  if (!Array.isArray(file_urls) || file_urls.length === 0) {
    return res.status(400).json({ error: 'file_urls (array) required' })
  }

  // Filter to at most 2 images (recto + verso) and skip PDFs
  const imageUrls = file_urls
    .filter(u => typeof u === 'string' && u.startsWith('http'))
    .slice(0, 2)

  if (imageUrls.length === 0) {
    return res.status(400).json({ error: 'No valid image URLs provided' })
  }

  try {
    // Download images server-side — never expose them or log their content
    const images = await Promise.all(imageUrls.map(fetchAsBase64))

    // Build user message: images first, then instruction
    const fields = json_schema?.properties
      ? Object.keys(json_schema.properties).join(', ')
      : 'nom, prenom, NNI, date_naissance, lieu_naissance, nationalite, sexe, numero_identite, date_emission, date_expiration, adresse, profession, pere_nom, mere_nom, mrz_line1, mrz_line2'

    const userContent = [
      ...images.map(({ mediaType, data }) => ({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data },
      })),
      {
        type: 'text',
        text: `Extract these fields and return ONLY the JSON object (no markdown): ${fields}`,
      },
    ]

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: prompt || DEFAULT_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = message.content?.[0]?.text || '{}'
    // Strip markdown fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const match = jsonStr.match(/\{[\s\S]*\}/)
    const extracted = match ? JSON.parse(match[0]) : {}

    return res.status(200).json({ status: 'success', output: extracted })
  } catch (err) {
    // Log only the error type — never the document content or extracted personal data
    console.error('[extract-document] error type:', err?.constructor?.name, err?.message)
    return res.status(500).json({ error: 'Extraction failed', status: 'error' })
  }
}
