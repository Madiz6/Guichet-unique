import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { to, subject, html } = req.body

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Champs requis manquants', details: 'Required: to, subject, html' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM || 'noreply@e-businessgov.com'

    const { data, error } = await resend.emails.send({ from, to, subject, html })

    if (error) {
      console.error('Resend error:', error)
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email', details: error.message })
    }

    return res.json({ success: true, message: 'Email envoyé avec succès', id: data?.id })
  } catch (error) {
    console.error('Error in send-email:', error)
    return res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}
