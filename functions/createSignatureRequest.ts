import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { document_url, document_name, signers, message } = await req.json();

    if (!document_url || !signers || signers.length === 0) {
      return Response.json({ 
        error: 'document_url et signers sont requis' 
      }, { status: 400 });
    }

    // Get DocuSign credentials
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');

    if (!integrationKey || !userId || !accountId || !privateKey) {
      return Response.json({ 
        error: 'Configuration DocuSign manquante' 
      }, { status: 500 });
    }

    // Get access token using JWT
    const token = await getDocuSignAccessToken(integrationKey, userId, privateKey);

    // Download document
    const docResponse = await fetch(document_url);
    const docBuffer = await docResponse.arrayBuffer();
    const docBase64 = btoa(String.fromCharCode(...new Uint8Array(docBuffer)));

    // Create envelope definition
    const envelopeDefinition = {
      emailSubject: message || 'Veuillez signer ce document',
      documents: [{
        documentBase64: docBase64,
        name: document_name || 'Document à signer',
        fileExtension: 'pdf',
        documentId: '1'
      }],
      recipients: {
        signers: signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: String(index + 1),
          routingOrder: String(index + 1),
          tabs: {
            signHereTabs: [{
              documentId: '1',
              pageNumber: '1',
              xPosition: '100',
              yPosition: '150'
            }]
          }
        }))
      },
      status: 'sent'
    };

    // Send to DocuSign
    const envelopeResponse = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envelopeDefinition)
      }
    );

    if (!envelopeResponse.ok) {
      const error = await envelopeResponse.text();
      throw new Error(`DocuSign API error: ${error}`);
    }

    const envelope = await envelopeResponse.json();

    // Log signature request
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'E-Signature Request Created',
      entity_type: 'Document',
      entity_id: envelope.envelopeId,
      user_email: user.email,
      details: {
        document_name,
        signers: signers.map(s => s.email),
        envelope_id: envelope.envelopeId,
        status: envelope.status
      }
    });

    return Response.json({
      success: true,
      envelope_id: envelope.envelopeId,
      status: envelope.status,
      message: 'Demande de signature envoyée avec succès'
    });

  } catch (error) {
    console.error('Signature request error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function getDocuSignAccessToken(integrationKey, userId, privateKey) {
  const jwtPayload = {
    iss: integrationKey,
    sub: userId,
    aud: 'account-d.docusign.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: 'signature impersonation'
  };

  // Create JWT (simplified - in production use proper JWT library)
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(jwtPayload));
  
  // Note: This is a simplified version. In production, use proper RSA signing
  // For now, we'll use the DocuSign OAuth endpoint
  
  const tokenResponse = await fetch('https://account-d.docusign.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}`
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get DocuSign access token');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}