import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentData = await req.json();
    const { 
      amount, 
      description, 
      payment_type, 
      entity_id, 
      payment_method, 
      metadata,
      payment_details 
    } = paymentData;
    
    console.log('Processing payment:', {
      amount,
      payment_type,
      payment_method,
      entity_id
    });
    
    // Simulate payment gateway processing (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Generate receipt number
    const receiptNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Payment success logic based on payment type
    try {
      if (payment_type === 'payroll') {
        // Update payroll cycle status
        const cycle = await base44.asServiceRole.entities.PayrollCycle.get(entity_id);
        await base44.asServiceRole.entities.PayrollCycle.update(entity_id, {
          ...cycle,
          statut: 'Payé',
          date_paiement: new Date().toISOString(),
          transaction_id: transactionId,
          payment_method: payment_method
        });
        
      } else if (payment_type === 'declaration') {
        // Update declaration status
        const declaration = await base44.asServiceRole.entities.Declaration.get(entity_id);
        await base44.asServiceRole.entities.Declaration.update(entity_id, {
          ...declaration,
          statut: 'Payé',
          date_paiement: new Date().toISOString().split('T')[0],
          transaction_id: transactionId,
          payment_method: payment_method
        });
        
      } else if (payment_type === 'lease') {
        // Update lease payment status
        const payment = await base44.asServiceRole.entities.LeasePayment.get(entity_id);
        
        // Generate receipt HTML
        const lease = await base44.asServiceRole.entities.Lease.get(payment.lease_id);
        const asset = await base44.asServiceRole.entities.LeaseAsset.get(lease.asset_id);
        
        // Get company details for receipt
        const companies = await base44.asServiceRole.entities.Company.list();
        const company = companies[0] || {};
        
        const receiptHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #6366F1; padding: 30px;">
            <div style="display: flex; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #E5E7EB; margin-bottom: 30px;">
              ${company.logo_url ? `
                <img src="${company.logo_url}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; margin-right: 20px; border-radius: 8px;" />
              ` : ''}
              <div style="flex: 1;">
                <h2 style="margin: 0; font-size: 18px; color: #0F172A; font-weight: bold;">${company.nom_entreprise || 'Paie360'}</h2>
                <p style="margin: 5px 0; font-size: 12px; color: #64748B;">${company.adresse || ''}</p>
                <p style="margin: 5px 0; font-size: 12px; color: #64748B;">
                  <strong>NIF:</strong> ${company.nif || 'N/A'} | 
                  <strong>CNSS:</strong> ${company.numero_affiliation || 'N/A'}
                </p>
                <p style="margin: 5px 0; font-size: 12px; color: #64748B;">
                  <strong>Tél:</strong> ${company.telephone || 'N/A'} | 
                  <strong>Email:</strong> ${company.email || 'N/A'}
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366F1; margin: 0;">REÇU DE PAIEMENT</h1>
              <p style="color: #64748B; margin: 5px 0;">N° ${receiptNumber}</p>
              <p style="color: #64748B; margin: 5px 0;">Transaction: ${transactionId}</p>
            </div>
            
            <div style="background: #F7F9FC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #0F172A;">Détails du Paiement</h3>
              <p><strong>Actif:</strong> ${asset?.nom || 'N/A'}</p>
              <p><strong>Locataire:</strong> ${lease.locataire_nom}</p>
              <p><strong>Période:</strong> ${payment.periode}</p>
              <p><strong>Date de paiement:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              <p><strong>Méthode:</strong> ${
                payment_method === 'card' ? 'Carte bancaire' :
                payment_method === 'mobile_money' ? 'Mobile Money' :
                payment_method === 'bank_transfer' ? 'Virement bancaire' :
                payment_method
              }</p>
            </div>
            
            <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px; text-align: center;">
              <h2 style="margin: 0; font-size: 32px;">${amount.toLocaleString()} DJF</h2>
              <p style="margin: 10px 0 0 0;">Montant payé</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="color: #10B981; font-size: 18px; font-weight: bold;">✓ PAIEMENT CONFIRMÉ</p>
              <p style="color: #64748B; font-size: 14px;">Merci pour votre paiement</p>
            </div>
          </div>
        `;
        
        await base44.asServiceRole.entities.LeasePayment.update(entity_id, {
          ...payment,
          statut: 'Payé',
          date_paiement: new Date().toISOString().split('T')[0],
          methode_paiement: payment_method === 'card' ? 'Carte bancaire' :
                            payment_method === 'mobile_money' ? 'Mobile Money' :
                            payment_method === 'bank_transfer' ? 'Virement bancaire' : payment_method,
          transaction_id: transactionId,
          numero_recu: receiptNumber,
          recu_html: receiptHTML
        });
        
        // Send receipt via email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: lease.locataire_email,
            from_name: company.nom_entreprise || 'Paie360',
            subject: `Reçu de paiement - ${payment.periode}`,
            body: receiptHTML
          });
        } catch (emailError) {
          console.error('Error sending receipt email:', emailError);
          // Don't fail the payment if email fails
        }
        
      } else if (payment_type === 'expense') {
        // Update expense status
        const expense = await base44.asServiceRole.entities.Expense.get(entity_id);
        await base44.asServiceRole.entities.Expense.update(entity_id, {
          ...expense,
          statut: 'Payé',
          date_paiement: new Date().toISOString().split('T')[0],
          methode_paiement: payment_method === 'card' ? 'Carte bancaire' :
                            payment_method === 'mobile_money' ? 'Mobile Money' :
                            payment_method === 'bank_transfer' ? 'Virement bancaire' : payment_method,
          transaction_id: transactionId
        });
      }
    } catch (updateError) {
      console.error('Error updating entity:', updateError);
      return Response.json({ 
        success: false,
        error: 'Failed to update payment status',
        details: updateError.message
      }, { status: 500 });
    }
    
    // Get company details for generic receipt
    let company = {};
    try {
      const companies = await base44.asServiceRole.entities.Company.list();
      company = companies[0] || {};
    } catch (e) {
      console.log('Could not fetch company details');
    }
    
    // Generate generic receipt HTML
    const receiptHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #6366F1; padding: 30px;">
        <div style="display: flex; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #E5E7EB; margin-bottom: 30px;">
          ${company.logo_url ? `
            <img src="${company.logo_url}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; margin-right: 20px; border-radius: 8px;" />
          ` : ''}
          <div style="flex: 1;">
            <h2 style="margin: 0; font-size: 18px; color: #0F172A; font-weight: bold;">${company.nom_entreprise || 'Paie360'}</h2>
            <p style="margin: 5px 0; font-size: 12px; color: #64748B;">${company.adresse || ''}</p>
            <p style="margin: 5px 0; font-size: 12px; color: #64748B;">
              <strong>NIF:</strong> ${company.nif || 'N/A'} | 
              <strong>CNSS:</strong> ${company.numero_affiliation || 'N/A'}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366F1; margin: 0;">REÇU DE PAIEMENT</h1>
          <p style="color: #64748B; margin: 5px 0;">N° ${receiptNumber}</p>
          <p style="color: #64748B; margin: 5px 0;">Transaction: ${transactionId}</p>
        </div>
        
        <div style="background: #F7F9FC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0F172A;">Détails du Paiement</h3>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Date de paiement:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <p><strong>Méthode:</strong> ${
            payment_method === 'card' ? 'Carte bancaire' :
            payment_method === 'mobile_money' ? 'Mobile Money' :
            payment_method === 'bank_transfer' ? 'Virement bancaire' :
            payment_method
          }</p>
          <p><strong>Payé par:</strong> ${user.full_name} (${user.email})</p>
        </div>
        
        <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; font-size: 32px;">${amount.toLocaleString()} DJF</h2>
          <p style="margin: 10px 0 0 0;">Montant payé</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
          <p style="color: #10B981; font-size: 18px; font-weight: bold;">✓ PAIEMENT CONFIRMÉ</p>
          <p style="color: #64748B; font-size: 14px;">Merci pour votre paiement</p>
        </div>
      </div>
    `;
    
    return Response.json({ 
      success: true,
      transaction_id: transactionId,
      receipt_number: receiptNumber,
      receipt_html: receiptHTML,
      message: 'Paiement traité avec succès'
    });
    
  } catch (error) {
    console.error('Error processing payment:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Payment processing failed',
      details: error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
});