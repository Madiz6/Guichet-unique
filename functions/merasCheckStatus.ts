import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import jose from 'npm:jose@5.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'Transaction ID requis' }, { status: 400 });
    }

    const merchantId = Deno.env.get('MERAS_MERCHANT_ID');
    const privateKeyPEM = Deno.env.get('MERAS_PRIVATE_KEY');
    const apiUrl = Deno.env.get('MERAS_API_URL') || 'https://pay.merasconnect.com/api/v1/gateway';

    if (!merchantId || !privateKeyPEM) {
      return Response.json({ error: 'Configuration Meras manquante' }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Prepare JWT payload for signing
    const tokenPayload = {
      id: transaction_id,
      merId: merchantId,
      generated: timestamp
    };

    // Import private key and sign JWT
    const privateKey = await jose.importPKCS8(privateKeyPEM, 'ES256');
    const signedToken = await new jose.SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'ES256' })
      .sign(privateKey);

    // Prepare status check request
    const statusPayload = {
      id: transaction_id,
      merchantId,
      signedToken
    };

    // Call Meras API
    const response = await fetch(`${apiUrl}/fetch-transaction-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meras Status Check Error:', result);
      return Response.json({ 
        error: 'Erreur lors de la vérification du statut',
        details: result.reason || result.message
      }, { status: response.status });
    }

    return Response.json({
      success: true,
      status: result.status,
      message: result.message,
      paymentMethod: result.paymentMethod,
      phoneNumber: result.phoneNumber,
      merasTxnId: result.merasTxnId
    });

  } catch (error) {
    console.error('Error in merasCheckStatus:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
});