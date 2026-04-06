import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as jose from 'npm:jose@5.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, reason, phoneNumber, paymentMethod, payment_id, entity_type } = await req.json();

    if (!amount || !reason || !phoneNumber) {
      return Response.json({ 
        error: 'Montant, raison et numéro de téléphone requis' 
      }, { status: 400 });
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

    // Prepare JWT payload
    const tokenPayload = {
      amount: Number(amount),
      paymentReason: reason,
      paymentMethod: paymentMethod || 'D-MONEY',
      phoneNumber,
      merchantId,
      generated: timestamp
    };

    // Sign JWT
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

    const baseUrl = req.headers.get('origin') || 'https://app.base44.com';

    // Prepare payment request
    const paymentPayload = {
      id: txnId,
      amount: Number(amount),
      reason,
      merchantId,
      signedToken,
      paymentMethod: paymentMethod || 'D-MONEY',
      phoneNumber,
      notifyUrl: `${baseUrl}/api/functions/merasWebhook`
    };

    // Call Meras API
    const response = await fetch(`${apiUrl}/direct-payment`, {
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
      console.error('Non-JSON response:', resultText);
      return Response.json({ 
        error: 'Réponse invalide de Meras'
      }, { status: 500 });
    }

    if (!response.ok) {
      console.error('Meras API Error:', result);
      return Response.json({ 
        error: result.reason || result.message || 'Erreur Meras',
        details: result
      }, { status: response.status });
    }

    // Store transaction in database
    if (payment_id && entity_type) {
      try {
        await base44.asServiceRole.entities[entity_type].update(payment_id, {
          transaction_id: txnId,
          statut: 'En cours'
        });
      } catch (dbError) {
        console.log('DB update error:', dbError.message);
      }
    }

    return Response.json({
      success: true,
      message: 'Demande de paiement envoyée. Confirmez sur votre téléphone.',
      transaction_id: txnId
    });

  } catch (error) {
    console.error('Error in merasDirectPayment:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
});