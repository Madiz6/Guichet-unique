import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Always 200 so MERAS doesn't retry
  try {
    const webhookData = req.body
    console.log('Meras Webhook received:', webhookData)

    const { txnId, refId, status } = webhookData

    if (!refId && !txnId) {
      return res.json({ success: false, error: 'Transaction ID manquant' })
    }

    const transactionId = refId || txnId

    if (status === 'COMPLETED') {
      // Find matching registration_dossier
      const { data: dossiers } = await supabase
        .from('registration_dossiers')
        .select('id')
        .eq('transaction_id', transactionId)
        .limit(1)

      if (dossiers?.length > 0) {
        await supabase
          .from('registration_dossiers')
          .update({
            payment_confirmed: true,
            meras_transaction_id: txnId,
            meras_payment_status: status,
          })
          .eq('id', dossiers[0].id)
      }

      // Also check modification_dossiers
      const { data: modDossiers } = await supabase
        .from('modification_dossiers')
        .select('id')
        .eq('transaction_id', transactionId)
        .limit(1)

      if (modDossiers?.length > 0) {
        await supabase
          .from('modification_dossiers')
          .update({
            payment_confirmed: true,
            meras_transaction_id: txnId,
            meras_payment_status: status,
          })
          .eq('id', modDossiers[0].id)
      }
    }

    return res.json({ success: true, message: 'Webhook traité avec succès' })
  } catch (error) {
    console.error('Error in meras-webhook:', error)
    return res.json({ success: false, error: error.message })
  }
}
