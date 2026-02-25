import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Smartphone, CheckCircle, XCircle, Loader2, Banknote, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function MerasPaymentGateway({ 
  isOpen, 
  onClose, 
  amount, 
  description, 
  paymentId,
  entityType,
  onSuccess 
}) {
  const [paymentMethod, setPaymentMethod] = useState('checkout');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [chequeRef, setChequeRef] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handleCheckoutPayment = async () => {
    setProcessing(true);
    try {
      const response = await meras.functions.invoke('merasInitiatePayment', {
        amount,
        reason: description,
        phoneNumber: phoneNumber || undefined,
        payment_id: paymentId,
        entity_type: entityType
      });

      if (response.data.success && response.data.payment_url) {
        // Redirect to Meras checkout page
        window.location.href = response.data.payment_url;
      } else if (response.data.success) {
        setPaymentStatus('success');
        toast.success('Paiement traité avec succès!');
        setTimeout(() => {
          if (onSuccess) onSuccess({ transaction_id: response.data.transaction_id });
          onClose();
        }, 2000);
      } else {
        toast.error(response.data.error || 'Erreur lors de l\'initialisation');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur de connexion au serveur de paiement');
      setProcessing(false);
    }
  };

  const handleDirectPayment = async () => {
    if (!phoneNumber) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    setProcessing(true);
    try {
      const response = await meras.functions.invoke('merasDirectPayment', {
        amount,
        reason: description,
        phoneNumber,
        paymentMethod: 'D-MONEY',
        payment_id: paymentId,
        entity_type: entityType
      });

      if (response.data.success) {
        setPaymentStatus('success');
        toast.success(response.data.message || 'Paiement réussi!');
        setTimeout(() => {
          if (onSuccess) onSuccess({ transaction_id: response.data.transaction_id });
          onClose();
        }, 2000);
      } else {
        toast.error(response.data.error || 'Erreur lors du paiement');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur de connexion au serveur de paiement');
      setProcessing(false);
    }
  };

  const handleOfflinePayment = () => {
    setProcessing(true);
    const transactionId = `${paymentMethod.toUpperCase()}-${Date.now()}`;
    const note = paymentMethod === 'cheque'
      ? `Chèque N° ${chequeRef}`
      : `Espèces${cashNote ? ' — ' + cashNote : ''}`;
    setTimeout(() => {
      setPaymentStatus('success');
      toast.success('Paiement enregistré!');
      setTimeout(() => {
        if (onSuccess) onSuccess({ transaction_id: transactionId, payment_method: paymentMethod === 'cheque' ? 'Chèque' : 'Espèces', note });
        onClose();
      }, 1500);
      setProcessing(false);
    }, 600);
  };

  const checkPaymentStatus = async (transactionId) => {
    try {
      const response = await meras.functions.invoke('merasCheckStatus', {
        transaction_id: transactionId
      });

      if (response.data.success) {
        if (response.data.status === 'COMPLETED') {
          setPaymentStatus('success');
          setProcessing(false);
          toast.success('Paiement réussi!');
          setTimeout(() => {
            if (onSuccess) onSuccess({ transaction_id: transactionId });
            onClose();
          }, 2000);
        } else if (response.data.status === 'FAILED' || response.data.status === 'CANCELLED') {
          setPaymentStatus('failed');
          setProcessing(false);
          toast.error('Paiement échoué');
        } else {
          // Still pending, check again
          setTimeout(() => checkPaymentStatus(transactionId), 5000);
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            Paiement Meras
          </DialogTitle>
        </DialogHeader>

        {paymentStatus === 'success' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Paiement Réussi!</h3>
            <p className="text-[#64748B]">Votre paiement a été traité avec succès</p>
          </div>
        ) : paymentStatus === 'failed' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Paiement Échoué</h3>
            <p className="text-[#64748B] mb-4">Le paiement n'a pas pu être complété</p>
            <Button onClick={() => { setPaymentStatus(null); setProcessing(false); }}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-[#E5E7EB]">
              <p className="text-sm text-[#64748B] mb-1">Montant à payer</p>
              <p className="text-3xl font-bold text-[#0F172A]">{amount.toLocaleString()} DJF</p>
              <p className="text-sm text-[#64748B] mt-2">{description}</p>
            </div>

            {/* Payment Method Selection */}
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">
                Choisissez votre méthode de paiement
              </Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 border-[#E5E7EB] rounded-lg cursor-pointer hover:border-[#6366F1] transition-all">
                    <RadioGroupItem value="checkout" />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A]">Page de Paiement Meras</p>
                        <p className="text-xs text-[#64748B]">Banque, D-Money, Waffi, Cartes</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-[#E5E7EB] rounded-lg cursor-pointer hover:border-[#6366F1] transition-all">
                    <RadioGroupItem value="direct" />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A]">Paiement Direct (USSD)</p>
                        <p className="text-xs text-[#64748B]">Confirmation sur votre téléphone</p>
                      </div>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Phone Number Input */}
            <div>
              <Label htmlFor="phone">Numéro de téléphone {paymentMethod === 'direct' && '*'}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+253XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-2"
                required={paymentMethod === 'direct'}
              />
              <p className="text-xs text-[#64748B] mt-1">
                {paymentMethod === 'checkout' 
                  ? 'Optionnel - sera pré-rempli sur la page de paiement' 
                  : 'Requis - vous recevrez une demande de confirmation'}
              </p>
            </div>

            {/* Payment Status */}
            {paymentStatus === 'pending' && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm font-semibold text-blue-900">En attente de confirmation...</p>
                <p className="text-xs text-blue-700 mt-1">Confirmez le paiement sur votre téléphone</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={processing}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (paymentMethod === 'checkout') handleCheckoutPayment();
                  else if (paymentMethod === 'direct') handleDirectPayment();
                  else handleOfflinePayment();
                }}
                disabled={processing || (paymentMethod === 'direct' && !phoneNumber) || (paymentMethod === 'cheque' && !chequeRef)}
                className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {paymentMethod === 'checkout' ? 'Continuer' :
                     paymentMethod === 'direct' ? 'Payer Maintenant' :
                     'Confirmer Paiement'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}