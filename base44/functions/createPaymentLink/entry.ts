import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_id, lease_id, send_reminder } = await req.json();
    
    if (!payment_id || !lease_id) {
      return Response.json({ error: 'Missing payment_id or lease_id' }, { status: 400 });
    }
    
    // Get payment and lease details
    const payment = await base44.asServiceRole.entities.LeasePayment.get(payment_id);
    const lease = await base44.asServiceRole.entities.Lease.get(lease_id);
    const asset = await base44.asServiceRole.entities.LeaseAsset.get(lease.asset_id);
    
    // Get company details for branding
    const companies = await base44.asServiceRole.entities.Company.list();
    const company = companies[0] || {};
    
    // Generate payment link
    const baseUrl = Deno.env.get('BASE_URL') || 'https://your-app.base44.com';
    const paymentLink = `${baseUrl}/pay/${payment_id}`;
    
    // Different email subject and content based on whether it's a reminder
    const emailSubject = send_reminder 
      ? `⚠️ RAPPEL: Paiement de loyer en attente - ${asset.nom}`
      : `🔗 Lien de paiement pour votre loyer - ${asset.nom}`;
    
    const emailBody = send_reminder ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${company.logo_url ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 150px;" />
          </div>
        ` : ''}
        
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 32px;">⚠️ RAPPEL IMPORTANT</h1>
          <p style="margin: 15px 0 0 0; font-size: 18px; font-weight: 600;">Votre paiement de loyer est en attente</p>
        </div>
        
        <p style="font-size: 16px; color: #0F172A;">Bonjour ${lease.locataire_nom},</p>
        
        <p style="color: #EF4444; font-weight: bold; font-size: 16px; background: #FEE2E2; padding: 15px; border-radius: 8px; border-left: 4px solid #EF4444;">
          ⏰ Nous n'avons pas encore reçu votre paiement pour la période en cours.
        </p>
        
        <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #0F172A;">📋 Détails du paiement</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Actif:</td>
              <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${asset.nom}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Période:</td>
              <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${payment.periode}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Montant:</td>
              <td style="padding: 10px 0; color: #EF4444; font-weight: bold; font-size: 18px; border-bottom: 1px solid #E5E7EB;">${payment.montant.toLocaleString()} DJF</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748B;">Date d'échéance:</td>
              <td style="padding: 10px 0; color: #EF4444; font-weight: 600;">${new Date(payment.date_echeance).toLocaleDateString('fr-FR')}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${paymentLink}" 
             style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 18px 40px; 
                    text-decoration: none; border-radius: 10px; display: inline-block; 
                    font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            💳 Effectuer le paiement maintenant
          </a>
        </div>
        
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 4px; margin: 25px 0;">
          <p style="margin: 0; color: #92400E; font-size: 14px;">
            <strong>⚡ Action requise:</strong> Merci de régulariser votre paiement dans les plus brefs délais pour éviter tout désagrément.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        
        <div style="text-align: center; color: #64748B; font-size: 12px;">
          <p style="margin: 5px 0;"><strong>${company.nom_entreprise || 'Paie360'}</strong></p>
          <p style="margin: 5px 0;">${company.adresse || ''}</p>
          <p style="margin: 5px 0;">${company.telephone || ''} | ${company.email || ''}</p>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${company.logo_url ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 150px;" />
          </div>
        ` : ''}
        
        <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">🔗 Lien de Paiement</h1>
          <p style="margin: 15px 0 0 0; font-size: 16px;">Payez votre loyer en toute sécurité</p>
        </div>
        
        <p style="font-size: 16px; color: #0F172A;">Bonjour ${lease.locataire_nom},</p>
        
        <p style="color: #64748B; line-height: 1.8;">
          Nous avons créé un lien de paiement sécurisé pour votre loyer. 
          Vous pouvez effectuer le paiement en quelques clics.
        </p>
        
        <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #0F172A;">📋 Détails du paiement</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Actif:</td>
              <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${asset.nom}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Période:</td>
              <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${payment.periode}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Montant:</td>
              <td style="padding: 10px 0; color: #6366F1; font-weight: bold; font-size: 18px; border-bottom: 1px solid #E5E7EB;">${payment.montant.toLocaleString()} DJF</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748B;">Date d'échéance:</td>
              <td style="padding: 10px 0; color: #0F172A; font-weight: 600;">${new Date(payment.date_echeance).toLocaleDateString('fr-FR')}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${paymentLink}" 
             style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 18px 40px; 
                    text-decoration: none; border-radius: 10px; display: inline-block; 
                    font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            💳 Payer maintenant
          </a>
        </div>
        
        <div style="background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; border-radius: 4px; margin: 25px 0;">
          <p style="margin: 0; color: #1E40AF; font-size: 14px;">
            <strong>🔒 Paiement sécurisé:</strong> Ce lien est unique et sécurisé. Vous pouvez l'utiliser à tout moment avant la date d'échéance.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        
        <div style="text-align: center; color: #64748B; font-size: 12px;">
          <p style="margin: 5px 0;"><strong>${company.nom_entreprise || 'Paie360'}</strong></p>
          <p style="margin: 5px 0;">${company.adresse || ''}</p>
          <p style="margin: 5px 0;">${company.telephone || ''} | ${company.email || ''}</p>
        </div>
      </div>
    `;
    
    // Update payment record first (before attempting email)
    await base44.asServiceRole.entities.LeasePayment.update(payment_id, {
      ...payment,
      lien_paiement: paymentLink,
      date_envoi_lien: new Date().toISOString(),
      rappel_envoye: send_reminder || false
    });
    
    // Try to send email (non-blocking)
    let emailSent = false;
    try {
      const emailResponse = await base44.asServiceRole.functions.invoke('sendEmail', {
        to: lease.locataire_email,
        subject: emailSubject,
        html: emailBody,
        from_name: company.nom_entreprise || 'Paie360',
        from_email: company.email || 'noreply@votre-entreprise.dj'
      });
      
      emailSent = true;
    } catch (emailError) {
      console.error('Email sending failed (continuing anyway):', emailError);
      // Continue - payment link is still saved
    }
    
    return Response.json({ 
      success: true, 
      payment_link: paymentLink,
      email_sent: emailSent,
      message: emailSent 
        ? (send_reminder ? 'Rappel envoyé avec succès' : 'Lien de paiement envoyé avec succès')
        : 'Lien de paiement créé (email non envoyé - vérifiez votre configuration email)'
    });
    
  } catch (error) {
    console.error('Error in createPaymentLink:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.toString()
    }, { status: 500 });
  }
});