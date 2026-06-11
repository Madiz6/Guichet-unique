import { createClient } from '@supabase/supabase-js'
import * as jose from 'jose'

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

    const { transaction_id } = req.body
    if (!transaction_id) return res.status(400).json({ error: 'Transaction ID requis' })

    const merchantId = process.env.MERAS_MERCHANT_ID
    const privateKeyPEM = process.env.MERAS_PRIVATE_KEY
    // For check-status we use the base gateway URL (without initiate-payment path)
    const baseGateway = (process.env.MERAS_GATEWAY_URL || '')
      .replace(/\/initiate-payment$/, '')
      .replace(/\/fetch-transaction-status$/, '')

    if (!merchantId || !privateKeyPEM) {
      return res.status(500).json({ error: 'Configuration Meras manquante' })
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const tokenPayload = { id: transaction_id, merId: merchantId, generated: timestamp }

    const privateKey = await jose.importPKCS8(privateKeyPEM, 'ES256')
    const signedToken = await new jose.SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'ES256' })
      .sign(privateKey)

    const statusPayload = { id: transaction_id, merchantId, signedToken }

    const response = await fetch(`${baseGateway}/fetch-transaction-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Meras Status Check Error:', result)
      return res.status(response.status).json({
        error: 'Erreur lors de la vérification du statut',
        details: result.reason || result.message,
      })
    }

    return res.json({
      success: true,
      status: result.status,
      message: result.message,
      paymentMethod: result.paymentMethod,
      phoneNumber: result.phoneNumber,
      santimPayTxnId: result.santimPayTxnId, // NOT merasTxnId per spec
    })
  } catch (error) {
    console.error('Error in meras-check-status:', error)
    return res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}
