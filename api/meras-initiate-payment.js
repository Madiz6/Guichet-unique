import { createClient } from '@supabase/supabase-js'
import * as jose from 'jose'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Auth check
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { amount, reason, phoneNumber, payment_id, entity_type } = req.body

    if (!amount || !reason) {
      return res.status(400).json({ error: 'Montant et raison requis' })
    }

    const merchantId = process.env.MERAS_MERCHANT_ID
    const privateKeyPEM = process.env.MERAS_PRIVATE_KEY
    const gatewayUrl = process.env.MERAS_GATEWAY_URL

    if (!merchantId || !privateKeyPEM || !gatewayUrl) {
      console.error('Missing MERAS config')
      return res.status(500).json({ error: 'Configuration Meras manquante' })
    }

    const txnId = `MERAS-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    const timestamp = Math.floor(Date.now() / 1000)

    const tokenPayload = {
      amount: Number(amount),
      paymentReason: reason,
      merchantId,
      generated: timestamp,
    }

    let signedToken
    try {
      const privateKey = await jose.importPKCS8(privateKeyPEM, 'ES256')
      signedToken = await new jose.SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'ES256' })
        .sign(privateKey)
    } catch (jwtError) {
      console.error('JWT signing error:', jwtError)
      return res.status(500).json({ error: 'Erreur de signature JWT', details: jwtError.message })
    }

    const baseUrl = req.headers.origin || 'https://guichet-unique.vercel.app'

    const paymentPayload = {
      id: txnId,
      amount: Number(amount),
      reason,
      merchantId,
      signedToken,
      successRedirectUrl: `${baseUrl}/PaymentSuccess?id=${txnId}&payment_id=${payment_id || ''}`,
      failureRedirectUrl: `${baseUrl}/PaymentFailure?id=${txnId}`,
      cancelRedirectUrl: `${baseUrl}/PaymentCancelled?id=${txnId}`,
      notifyUrl: `${baseUrl}/api/meras-webhook`,
      phoneNumber: phoneNumber || '',
    }

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentPayload),
    })

    const resultText = await response.text()
    let result
    try {
      result = JSON.parse(resultText)
    } catch {
      console.error('Non-JSON response from Meras:', resultText)
      return res.status(500).json({ error: 'Réponse invalide de Meras', details: resultText.substring(0, 200) })
    }

    if (!response.ok) {
      console.error('Meras API Error:', response.status, result)
      return res.status(response.status).json({
        error: result.reason || result.message || 'Erreur Meras',
        details: result,
      })
    }

    // Store transaction ID on the dossier
    if (payment_id && entity_type) {
      const tableMap = {
        RegistrationDossier: 'registration_dossiers',
        ModificationDossier: 'modification_dossiers',
      }
      const table = tableMap[entity_type] || entity_type
      await supabase.from(table).update({ transaction_id: txnId }).eq('id', payment_id)
    }

    return res.json({
      success: true,
      payment_url: result.url || result.paymentUrl,
      transaction_id: txnId,
    })
  } catch (error) {
    console.error('Error in meras-initiate-payment:', error)
    return res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}
