import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { calculatePayroll } from "./DjiboutiCalculator";

export default function PayslipEmailModal({ isOpen, employee, cycle, company, onClose }) {
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  
  const handleSendNotifications = async () => {
    setSending(true);
    
    try {
      const absences = cycle.employee_absences?.[employee.id] || 0;
      const otherDeductions = cycle.employee_other_deductions?.[employee.id] || 0;
      const empWithAbsences = { ...employee, absences_amount: absences };
      const calc = calculatePayroll(empWithAbsences);
      const finalNet = calc.netSalary - otherDeductions;
      
      // Send EMAIL
      if (employee.email) {
        await base44.functions.invoke('sendEmail', {
          to: employee.email,
          subject: `Bulletin de Paie - ${cycle.periode}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${company.logo_url ? `
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 120px;" />
                </div>
              ` : ''}
              
              <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 24px;">💰 Bulletin de Paie</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${cycle.periode}</p>
              </div>
              
              <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="margin-top: 0; color: #0F172A;">Bonjour ${employee.prenom},</h2>
                <p style="color: #64748B;">
                  Votre bulletin de paie pour la période de <strong>${cycle.periode}</strong> est prêt.
                </p>
                ${customMessage ? `<p style="color: #64748B; margin-top: 15px;">${customMessage}</p>` : ''}
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #E5E7EB; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: #0F172A; font-size: 18px;">Résumé de Paie</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 10px 0; color: #64748B;">Salaire Brut:</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0F172A;">${calc.grossSalary.toLocaleString()} DJF</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 10px 0; color: #64748B;">CNSS Salariale:</td>
                    <td style="padding: 10px 0; text-align: right; color: #EF4444;">-${calc.cnssEmployee.total.toLocaleString()} DJF</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 10px 0; color: #64748B;">ITS:</td>
                    <td style="padding: 10px 0; text-align: right; color: #EF4444;">-${calc.its.toLocaleString()} DJF</td>
                  </tr>
                  ${absences > 0 ? `
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 10px 0; color: #64748B;">Absences:</td>
                    <td style="padding: 10px 0; text-align: right; color: #EF4444;">-${absences.toLocaleString()} DJF</td>
                  </tr>
                  ` : ''}
                  ${otherDeductions > 0 ? `
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 10px 0; color: #64748B;">Autres Déductions:</td>
                    <td style="padding: 10px 0; text-align: right; color: #EF4444;">-${otherDeductions.toLocaleString()} DJF</td>
                  </tr>
                  ` : ''}
                  <tr style="background: #F0F7FF;">
                    <td style="padding: 15px 0; color: #0F172A; font-weight: bold; font-size: 16px;">Net à Payer:</td>
                    <td style="padding: 15px 0; text-align: right; font-weight: bold; color: #6366F1; font-size: 18px;">${finalNet.toLocaleString()} DJF</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6; margin-bottom: 25px;">
                <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                  💡 <strong>Date de paiement:</strong> ${cycle.date_paiement ? format(new Date(cycle.date_paiement), 'dd MMMM yyyy') : 'À confirmer'}
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #64748B; font-size: 14px;">
                  Pour télécharger la version PDF complète, connectez-vous à votre portail employé.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
              
              <div style="text-align: center; color: #64748B; font-size: 12px;">
                <p style="margin: 5px 0;"><strong>${company.nom_entreprise || 'Paie360'}</strong></p>
                <p style="margin: 5px 0;">${company.adresse || ''}</p>
                <p style="margin: 5px 0;">${company.telephone || ''} | ${company.email || ''}</p>
              </div>
            </div>
          `,
          from_name: company.nom_entreprise || 'Paie360',
          from_email: company.email || 'noreply@paie360.com'
        });
        
        setEmailSent(true);
      }
      
      // Send SMS
      if (employee.telephone) {
        const smsMessage = `💰 ${company.nom_entreprise || 'Paie360'}: Bonjour ${employee.prenom}, votre bulletin de paie ${cycle.periode} est prêt. Net à payer: ${finalNet.toLocaleString()} DJF. Date de paiement: ${cycle.date_paiement ? format(new Date(cycle.date_paiement), 'dd/MM') : 'à confirmer'}.`;
        
        await base44.functions.invoke('sendSMS', {
          to: employee.telephone,
          message: smsMessage
        });
        
        setSmsSent(true);
      }
      
      toast.success('Notifications envoyées avec succès!');
      
      setTimeout(() => {
        onClose();
        setEmailSent(false);
        setSmsSent(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Erreur lors de l\'envoi des notifications');
    }
    
    setSending(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0F172A]">
            <Mail className="w-5 h-5 text-[#6366F1]" />
            Envoyer Bulletin de Paie
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="p-4 bg-gradient-to-r from-[#F0F7FF] to-white rounded-lg border border-[#DBEAFE]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                {employee?.prenom?.[0]}{employee?.nom?.[0]}
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">{employee?.prenom} {employee?.nom}</p>
                <p className="text-sm text-[#64748B]">{employee?.fonction}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#64748B]" />
                <span className="text-[#64748B]">{employee?.email || 'Pas d\'email'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#64748B]" />
                <span className="text-[#64748B]">{employee?.telephone || 'Pas de téléphone'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-[#374151] font-semibold">Message personnalisé (optionnel)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ajoutez un message personnalisé..."
              rows={3}
              className="mt-2 border-[#D1D5DB]"
            />
          </div>
          
          <div className="p-4 bg-[#F7F9FC] rounded-lg border border-[#E5E7EB]">
            <p className="text-sm text-[#64748B] mb-2">📧 <strong>Email:</strong> Bulletin détaillé avec résumé</p>
            <p className="text-sm text-[#64748B]">📱 <strong>SMS:</strong> Notification courte avec montant</p>
          </div>
          
          {(emailSent || smsSent) && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              {emailSent && (
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Email envoyé ✅</span>
                </div>
              )}
              {smsSent && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">SMS envoyé ✅</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="border-[#D1D5DB]"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSendNotifications}
            disabled={sending || (!employee?.email && !employee?.telephone)}
            className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}