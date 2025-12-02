import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function PaymentSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const txnId = urlParams.get('id');
    const paymentId = urlParams.get('payment_id');

    if (txnId) {
      // Verify payment status
      setTimeout(async () => {
        try {
          const response = await base44.functions.invoke('merasCheckStatus', {
            transaction_id: txnId
          });

          if (response.data.success) {
            setPaymentDetails({
              status: response.data.status,
              message: response.data.message,
              method: response.data.paymentMethod
            });
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
        }
        setVerifying(false);
      }, 2000);
    } else {
      setVerifying(false);
    }
  }, []);

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
              Votre paiement de <span className="font-bold text-green-600">{amount?.toLocaleString()} DJF</span> a été traité avec succès
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