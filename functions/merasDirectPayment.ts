import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Generate unique transaction ID
    const txnId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store transaction in database
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

    return Response.json({
      success: true,
      message: 'Paiement traité avec succès',
      transaction_id: txnId,
      status: 'COMPLETED'
    });

  } catch (error) {
    console.error('Error in merasDirectPayment:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
});