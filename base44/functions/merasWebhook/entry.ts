import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse webhook payload
    const webhookData = await req.json();
    
    console.log('Meras Webhook received:', webhookData);

    const {
      txnId,
      refId,
      status,
      amount,
      reason,
      paymentVia,
      msisdn,
      message
    } = webhookData;

    if (!refId && !txnId) {
      return Response.json({ error: 'Transaction ID manquant' }, { status: 400 });
    }

    const transactionId = refId || txnId;

    // Search for the payment across different entities
    let paymentFound = false;

    // Check PayrollCycle
    const payrollCycles = await base44.asServiceRole.entities.PayrollCycle.filter({ 
      transaction_id: transactionId 
    });
    
    if (payrollCycles.length > 0) {
      const cycle = payrollCycles[0];
      await base44.asServiceRole.entities.PayrollCycle.update(cycle.id, {
        statut: status === 'COMPLETED' ? 'Payé' : status === 'FAILED' ? 'Brouillon' : cycle.statut,
        meras_transaction_id: txnId,
        meras_payment_method: paymentVia,
        meras_payment_status: status,
        meras_message: message
      });
      paymentFound = true;
    }

    // Check Declaration
    const declarations = await base44.asServiceRole.entities.Declaration.filter({ 
      transaction_id: transactionId 
    });
    
    if (declarations.length > 0) {
      const declaration = declarations[0];
      await base44.asServiceRole.entities.Declaration.update(declaration.id, {
        statut: status === 'COMPLETED' ? 'Payé' : status === 'FAILED' ? 'Non payé' : declaration.statut,
        date_paiement: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : declaration.date_paiement,
        meras_transaction_id: txnId,
        meras_payment_method: paymentVia
      });
      paymentFound = true;
    }

    // Check LeasePayment
    const leasePayments = await base44.asServiceRole.entities.LeasePayment.filter({ 
      transaction_id: transactionId 
    });
    
    if (leasePayments.length > 0) {
      const payment = leasePayments[0];
      await base44.asServiceRole.entities.LeasePayment.update(payment.id, {
        statut: status === 'COMPLETED' ? 'Payé' : status === 'FAILED' ? 'En attente' : payment.statut,
        date_paiement: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : payment.date_paiement,
        methode_paiement: paymentVia || payment.methode_paiement,
        transaction_id: txnId,
        notes: `${payment.notes || ''}\nMeras: ${message || status}`.trim()
      });
      paymentFound = true;
    }

    // Check Expense
    const expenses = await base44.asServiceRole.entities.Expense.filter({ 
      numero: transactionId 
    });
    
    if (expenses.length > 0) {
      const expense = expenses[0];
      await base44.asServiceRole.entities.Expense.update(expense.id, {
        statut: status === 'COMPLETED' ? 'Payé' : status === 'FAILED' ? 'En attente' : expense.statut,
        date_approbation: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : expense.date_approbation,
        methode_paiement: paymentVia || expense.methode_paiement
      });
      paymentFound = true;
    }

    if (!paymentFound) {
      console.warn('No matching payment found for transaction:', transactionId);
    }

    // Always return 200 to acknowledge receipt
    return Response.json({ 
      success: true,
      message: 'Webhook traité avec succès'
    });

  } catch (error) {
    console.error('Error in merasWebhook:', error);
    // Still return 200 to avoid retries
    return Response.json({ 
      success: false,
      error: error.message 
    });
  }
});