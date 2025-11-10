import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_id } = await req.json();
    
    console.log('Processing SMS reminder for payment:', payment_id);
    
    // Get payment and lease details
    const payment = await base44.asServiceRole.entities.LeasePayment.get(payment_id);
    const lease = await base44.asServiceRole.entities.Lease.get(payment.lease_id);
    const asset = await base44.asServiceRole.entities.LeaseAsset.get(lease.asset_id);
    
    console.log('Lease details:', { 
      locataire: lease.locataire_nom, 
      telephone: lease.locataire_telephone 
    });
    
    // Format phone number (ensure it has +253 prefix for Djibouti)
    let phoneNumber = lease.locataire_telephone;
    
    if (!phoneNumber) {
      return Response.json({ 
        error: 'Numéro de téléphone manquant pour le locataire' 
      }, { status: 400 });
    }
    
    // Clean and format phone number
    phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    
    // If it doesn't start with +, add +253
    if (!phoneNumber.startsWith('+')) {
      // If it starts with 253, add +
      if (phoneNumber.startsWith('253')) {
        phoneNumber = '+' + phoneNumber;
      } else {
        // Otherwise add +253
        phoneNumber = '+253' + phoneNumber;
      }
    }
    
    console.log('Formatted phone number:', phoneNumber);
    
    // Create SMS reminder message (without payment link)
    const message = `Rappel paiement loyer ${asset.nom}
Période: ${payment.periode}
Montant: ${payment.montant.toLocaleString()} DJF
Échéance: ${new Date(payment.date_echeance).toLocaleDateString('fr-FR')}

Meras PSP, Department Financier
connect@meras.io
+25377429139
https://www.meras.io`;
    
    console.log('SMS message:', message, 'Length:', message.length);
    
    // Send SMS using your Twilio phone number
    const smsResponse = await base44.asServiceRole.functions.invoke('sendSMS', {
      to: phoneNumber,
      message: message
    });
    
    console.log('SMS function response:', smsResponse);
    
    // Update payment record to track SMS sent
    await base44.asServiceRole.entities.LeasePayment.update(payment_id, {
      ...payment,
      date_envoi_lien: new Date().toISOString()
    });
    
    return Response.json({ 
      success: true, 
      message: 'Rappel SMS envoyé avec succès',
      phone: phoneNumber
    });
    
  } catch (error) {
    console.error('Error sending payment reminder SMS:', error);
    
    // Extract more details from error
    let errorMessage = 'Unknown error';
    let errorDetails = error.toString();
    
    if (error?.response?.data) {
      errorMessage = error.response.data.error || error.response.data.message || errorMessage;
      errorDetails = JSON.stringify(error.response.data);
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return Response.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
});