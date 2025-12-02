import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as jose from 'npm:jose@5.2.0';

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
      console.error('Missing config - merchantId:', !!merchantId, 'privateKey:', !!privateKeyPEM);
      return Response.json({ error: 'Configuration Meras manquante' }, { status: 500 });
    }

    // Generate unique transaction ID
    const txnId = `MERAS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Prepare JWT payload
    const tokenPayload = {
      amount: Number(amount),
      paymentReason: reason,
      merchantId,
      generated: timestamp
    };

    // Import private key and sign JWT
    let signedToken;
    try {
      const privateKey = await jose.importPKCS8(privateKeyPEM, 'ES256');
      signedToken = await new jose.SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'ES256' })
        .sign(privateKey);
    } catch (jwtError) {
      console.error('JWT signing error:', jwtError);
      return Response.json({ 
        error: 'Erreur de signature JWT',
        details: jwtError.message 
      }, { status: 500 });
    }

    // Get base URL for redirects
    const baseUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^\/]*$/, '') || 'https://app.base44.com';
    
    // Prepare payment request
    const paymentPayload = {
      id: txnId,
      amount: Number(amount),
      reason,
      merchantId,
      signedToken,
      successRedirectUrl: `${baseUrl}/PaymentSuccess?id=${txnId}&payment_id=${payment_id || ''}`,
      failureRedirectUrl: `${baseUrl}/PaymentFailure?id=${txnId}`,
      cancelRedirectUrl: `${baseUrl}/PaymentCancelled?id=${txnId}`,
      notifyUrl: `${baseUrl}/api/functions/merasWebhook`,
      phoneNumber: phoneNumber || ''
    };

    console.log('Calling Meras API:', apiUrl);

    // Call Meras API
    const response = await fetch(`${apiUrl}/initiate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    const resultText = await response.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      console.error('Non-JSON response from Meras:', resultText);
      return Response.json({ 
        error: 'Réponse invalide de Meras',
        details: resultText.substring(0, 200)
      }, { status: 500 });
    }

    if (!response.ok) {
      console.error('Meras API Error:', response.status, result);
      return Response.json({ 
        error: result.reason || result.message || 'Erreur Meras',
        details: result
      }, { status: response.status });
    }

    // Store transaction in database
    if (payment_id && entity_type) {
      try {
        await base44.asServiceRole.entities[entity_type].update(payment_id, {
          transaction_id: txnId
        });
      } catch (dbError) {
        console.log('DB update error:', dbError.message);
      }
    }

    return Response.json({
      success: true,
      payment_url: result.url || result.paymentUrl,
      transaction_id: txnId
    });

  } catch (error) {
    console.error('Error in merasInitiatePayment:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
});