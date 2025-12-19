import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { envelope_id } = await req.json();

    if (!envelope_id) {
      return Response.json({ 
        error: 'envelope_id requis' 
      }, { status: 400 });
    }

    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');

    if (!integrationKey || !userId || !accountId) {
      return Response.json({ 
        error: 'Configuration DocuSign manquante' 
      }, { status: 500 });
    }

    // Get access token
    const token = await getAccessToken(integrationKey, userId, privateKey);

    // Get envelope status
    const statusResponse = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes/${envelope_id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error('Failed to get envelope status');
    }

    const envelopeData = await statusResponse.json();

    // Get recipients status
    const recipientsResponse = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes/${envelope_id}/recipients`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const recipientsData = await recipientsResponse.json();

    return Response.json({
      success: true,
      status: envelopeData.status,
      created_date: envelopeData.createdDateTime,
      completed_date: envelopeData.completedDateTime,
      signers: recipientsData.signers?.map(s => ({
        name: s.name,
        email: s.email,
        status: s.status,
        signed_date: s.signedDateTime
      })) || []
    });

  } catch (error) {
    console.error('Status check error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function getAccessToken(integrationKey, userId, privateKey) {
  // Simplified token retrieval
  const tokenResponse = await fetch('https://account-d.docusign.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
    })
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}