import React, { useEffect, useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Loader2, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { generatePaymentReceiptPDF } from '@/components/onboarding/PaymentReceiptPDF.jsx';

export default function PaymentSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const txnId = urlParams.get('id');

    const loadData = async () => {
      // Try to verify payment status
      if (txnId) {
        try {
          const response = await meras.functions.invoke('merasCheckStatus', { transaction_id: txnId });
          if (response.data.success) {
            setPaymentDetails({
              status: response.data.status,
              message: response.data.message,
              method: response.data.paymentMethod,
              transactionId: txnId,
            });
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
        }
      }

      // Load user's latest dossier for receipt generation
      try {
        const user = await base44.auth.me().catch(() => null);
        if (user) {
          const dossiers = await base44.entities.RegistrationDossier.filter(
            { applicant_email: user.email }, '-created_date', 1
          );
          if (dossiers?.[0]) {
            const d = dossiers[0];
            // Mark payment as confirmed if coming from success page
            if (!d.payment_confirmed && txnId) {
              await base44.entities.RegistrationDossier.update(d.id, {
                payment_confirmed: true,
                statut: 'En attente',
              });
              d.payment_confirmed = true;
            }
            setDossier(d);
          }
        }
      } catch (e) {
        console.error('Error loading dossier:', e);
      }

      setVerifying(false);
    };

    setTimeout(loadData, 1500);
  }, []);

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const stepData = dossier?.step_data || {};
      const activite = stepData.activite || {};
      const paiement = stepData.paiement || {};
      const urlParams = new URLSearchParams(window.location.search);
      const txnId = urlParams.get('id');

      await generatePaymentReceiptPDF({
        amount: dossier?.payment_amount || paiement.totalAmount || 0,
        transactionId: paiement.transactionId || txnId || null,
        envelopeId: dossier?.envelope_id || '—',
        companyName: dossier?.company_name || '—',
        formeJuridique: dossier?.forme_juridique || activite.forme_juridique || '—',
        secteur: activite.secteur_principal || '—',
        tierLabel: paiement.tierLabel || 'Standard',
        tierDelay: paiement.tierDelay || '—',
        applicantName: user?.full_name || dossier?.applicant_name || '—',
        applicantEmail: user?.email || dossier?.applicant_email || '—',
        patenteAmount: paiement.patenteAmount || 0,
        odpicAmount: paiement.odpicAmount || 0,
        statusFeesAmount: paiement.statusFeesAmount || 0,
        tierSurcharge: paiement.tierSurcharge || 0,
      });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] flex items-center justify-center">
        <Card className="border-0 shadow-xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 text-[#6366F1] animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Vérification du paiement...</h3>
            <p className="text-[#64748B]">Veuillez patienter</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-2xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-[#0F172A] mb-3">Paiement Réussi!</h1>
            
            <p className="text-lg text-[#64748B] mb-6">
              Votre paiement a été traité avec succès
            </p>

            {paymentDetails && (
              <div className="p-4 bg-[#F7F9FC] rounded-lg mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Statut:</span>
                    <span className="font-semibold text-green-600">{paymentDetails.status}</span>
                  </div>
                  {paymentDetails.method && (
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Méthode:</span>
                      <span className="font-semibold text-[#0F172A]">{paymentDetails.method}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {dossier && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-left text-sm space-y-1">
                <p className="font-semibold text-green-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Dossier enregistré
                </p>
                <p className="text-green-700"><strong>Entreprise :</strong> {dossier.company_name}</p>
                <p className="text-green-700"><strong>Réf. :</strong> <span className="font-mono text-xs">{dossier.envelope_id}</span></p>
              </div>
            )}

            <Button
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt || !dossier}
              className="w-full mb-3 bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white py-6 text-base"
            >
              {downloadingReceipt
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Génération...</>
                : <><Download className="w-5 h-5 mr-2" /> Télécharger le Reçu PDF</>
              }
            </Button>

            <Link to={createPageUrl('Dashboard')}>
              <Button className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-lg py-6">
                Retour au Tableau de Bord
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}