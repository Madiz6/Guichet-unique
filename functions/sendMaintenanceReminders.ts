import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function can be called via cron job or manually
    // It checks all maintenance schedules and sends reminders
    
    const today = new Date();
    const schedules = await base44.asServiceRole.entities.MaintenanceSchedule.filter({ actif: true });
    const assets = await base44.asServiceRole.entities.LeaseAsset.list();
    const companies = await base44.asServiceRole.entities.Company.list();
    const company = companies[0] || {};
    
    let remindersSent = 0;
    
    for (const schedule of schedules) {
      if (!schedule.prochaine_date || !schedule.email_rappel) continue;
      
      const nextDate = new Date(schedule.prochaine_date);
      const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
      const rappelJours = schedule.rappel_jours_avant || 7;
      
      // Check if reminder should be sent
      if (daysUntil <= rappelJours && daysUntil > 0) {
        // Check if reminder was already sent recently
        const lastReminder = schedule.dernier_rappel_envoye ? new Date(schedule.dernier_rappel_envoye) : null;
        const daysSinceLastReminder = lastReminder ? Math.ceil((today - lastReminder) / (1000 * 60 * 60 * 24)) : 999;
        
        // Only send if no reminder was sent in the last 3 days
        if (daysSinceLastReminder >= 3) {
          const asset = assets.find(a => a.id === schedule.asset_id);
          
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${company.logo_url ? `
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 150px;" />
                </div>
              ` : ''}
              
              <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 28px;">🔧 Rappel de Maintenance</h1>
                <p style="margin: 15px 0 0 0; font-size: 16px;">Une maintenance est prévue prochainement</p>
              </div>
              
              <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #0F172A;">📋 Détails de la maintenance</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Actif:</td>
                    <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${asset?.nom || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Plan:</td>
                    <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${schedule.nom_plan}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Type:</td>
                    <td style="padding: 10px 0; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${schedule.type_maintenance}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Date prévue:</td>
                    <td style="padding: 10px 0; color: #F59E0B; font-weight: bold; font-size: 16px; border-bottom: 1px solid #E5E7EB;">${nextDate.toLocaleDateString('fr-FR')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748B; border-bottom: 1px solid #E5E7EB;">Dans:</td>
                    <td style="padding: 10px 0; color: #F59E0B; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${daysUntil} jour(s)</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748B;">Coût estimé:</td>
                    <td style="padding: 10px 0; color: #0F172A; font-weight: 600;">${schedule.cout_estime?.toLocaleString() || 0} DJF</td>
                  </tr>
                </table>
              </div>
              
              ${schedule.description ? `
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #E5E7EB; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #0F172A;">📝 Description:</h4>
                  <p style="color: #64748B; line-height: 1.6; margin: 0;">${schedule.description}</p>
                </div>
              ` : ''}
              
              ${schedule.fournisseur_prefere ? `
                <div style="background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                    <strong>👷 Fournisseur préféré:</strong> ${schedule.fournisseur_prefere}
                    ${schedule.contact_fournisseur ? ` (${schedule.contact_fournisseur})` : ''}
                  </p>
                </div>
              ` : ''}
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
              
              <div style="text-align: center; color: #64748B; font-size: 12px;">
                <p style="margin: 5px 0;"><strong>${company.nom_entreprise || 'Paie360'}</strong></p>
                <p style="margin: 5px 0;">${company.adresse || ''}</p>
                <p style="margin: 5px 0;">${company.telephone || ''} | ${company.email || ''}</p>
              </div>
            </div>
          `;
          
          try {
            await base44.asServiceRole.functions.invoke('sendEmail', {
              to: schedule.email_rappel,
              subject: `🔧 Rappel: Maintenance prévue dans ${daysUntil} jour(s) - ${schedule.nom_plan}`,
              html: emailBody,
              from_name: company.nom_entreprise || 'Paie360'
            });
            
            // Update last reminder date
            await base44.asServiceRole.entities.MaintenanceSchedule.update(schedule.id, {
              ...schedule,
              dernier_rappel_envoye: today.toISOString().split('T')[0]
            });
            
            remindersSent++;
          } catch (emailError) {
            console.error(`Failed to send reminder for schedule ${schedule.id}:`, emailError);
          }
        }
      }
    }
    
    return Response.json({ 
      success: true, 
      reminders_sent: remindersSent,
      message: `${remindersSent} rappel(s) de maintenance envoyé(s)`
    });
    
  } catch (error) {
    console.error('Error in sendMaintenanceReminders:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.toString()
    }, { status: 500 });
  }
});