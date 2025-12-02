import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import jose from 'npm:jose@5.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, reason, phoneNumber, payment_id, entity_type } = await req.json();

    if (!amount || !reason) {
      return Response.json({ error: 'Montant et raison requis' }, { status: 400 });
    }

    const merchantId = Deno.env.get('MERAS_MERCHANT_ID');
    const privateKeyPEM = Deno.env.get('MERAS_PRIVATE_KEY');
    const apiUrl = Deno.env.get('MERAS_API_URL') || 'https://pay.merasconnect.com/api/v1/gateway';

    if (!merchantId || !privateKeyPEM) {
      return Response.json({ error: 'Configuration Meras manquante' }, { status: 500 });
    }

    // Generate unique transaction ID
    const txnId = `MERAS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Prepare JWT payload for signing
    const tokenPayload = {
      amount,
      paymentReason: reason,
      merchantId,
      generated: timestamp
    };

    // Import private key and sign JWT
    const privateKey = await jose.importPKCS8(privateKeyPEM, 'ES256');
    const signedToken = await new jose.SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'ES256' })
      .sign(privateKey);

    // Get base URL for redirects
    const baseUrl = req.headers.get('origin') || 'https://yourapp.base44.com';
    const webhookUrl = `${baseUrl}/api/functions/merasWebhook`;

    // Prepare payment request
    const paymentPayload = {
      id: txnId,
      amount,
      reason,
      merchantId,
      signedToken,
      successRedirectUrl: `${baseUrl}/payment-success?id=${txnId}&payment_id=${payment_id || ''}`,
      failureRedirectUrl: `${baseUrl}/payment-failure?id=${txnId}`,
      cancelRedirectUrl: `${baseUrl}/payment-cancelled?id=${txnId}`,
      notifyUrl: webhookUrl,
      phoneNumber: phoneNumber || ''
    };

    // Call Meras API
    const response = await fetch(`${apiUrl}/initiate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meras API Error:', result);
      return Response.json({ 
        error: 'Erreur lors de l\'initialisation du paiement',
        details: result.reason || result.message
      }, { status: response.status });
    }

    // Store transaction in database for tracking
    if (payment_id && entity_type) {
      await base44.asServiceRole.entities[entity_type].update(payment_id, {
        transaction_id: txnId,
        meras_payment_url: result.url
      });
    }

    return Response.json({
      success: true,
      payment_url: result.url,
      transaction_id: txnId
    });

  } catch (error) {
    console.error('Error in merasInitiatePayment:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
});