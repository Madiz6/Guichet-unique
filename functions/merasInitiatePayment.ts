import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Generate unique transaction ID
    const txnId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store transaction in database for tracking
    if (payment_id && entity_type) {
      try {
        await base44.asServiceRole.entities[entity_type].update(payment_id, {
          transaction_id: txnId,
          statut: 'En cours'
        });
      } catch (dbError) {
        console.log('Could not update entity:', dbError.message);
      }
    }

    // Return success - payment will be marked as complete
    // In production, this would redirect to Meras payment page
    return Response.json({
      success: true,
      payment_url: null, // No external URL for now
      transaction_id: txnId,
      message: 'Paiement initié avec succès'
    });

  } catch (error) {
    console.error('Error in merasInitiatePayment:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
});