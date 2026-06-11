import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Smartphone, Building2, Loader2, CheckCircle, XCircle, Banknote, FileText } from 'lucide-react';
import { apiClient } from "@/api/apiClient";
import { toast } from 'sonner';
import MerasPaymentGateway from './MerasPaymentGateway';

export default function PaymentGateway({ 
  isOpen, 
  onClose, 
  amount, 
  description, 
  onSuccess,
  paymentType, // 'payroll', 'declaration', 'lease', 'expense'
  entityId,
  metadata = {}
}) {
  const [gatewayType, setGatewayType] = useState(null); // null = show selector
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [chequeRef, setChequeRef] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [offlineProcessing, setOfflineProcessing] = useState(false);
  const [offlineSuccess, setOfflineSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', null
  
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });
  
  const [mobileMoneyDetails, setMobileMoneyDetails] = useState({
    phoneNumber: '+253',
    provider: 'CAC PAY'
  });
  
  const [bankTransferDetails, setBankTransferDetails] = useState({
    accountNumber: '',
    bankName: ''
  });
  
  const handlePayment = async () => {
    setProcessing(true);
    setPaymentStatus(null);
    
    try {
      // Prepare payment data
      const paymentData = {
        amount,
        description,
        payment_type: paymentType,
        entity_id: entityId,
        payment_method: paymentMethod,
        metadata,
        payment_details: paymentMethod === 'card' ? cardDetails :
                        paymentMethod === 'mobile_money' ? mobileMoneyDetails :
                        bankTransferDetails
      };
      
      // Process payment through backend
      const response = await apiClient.functions.invoke('processPayment', paymentData);
      
      if (response.data.success) {
        setPaymentStatus('success');
        toast.success('Paiement réussi!');
        
        // Wait 2 seconds then call success callback
        setTimeout(() => {
          onSuccess(response.data);
          onClose();
        }, 2000);
      } else {
        setPaymentStatus('failed');
        toast.error('Échec du paiement');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };
  
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };
  
  const handleOfflineConfirm = () => {
    if (gatewayType === 'cheque' && !chequeRef.trim()) {
      toast.error('Veuillez entrer le numéro de chèque');
      return;
    }
    setOfflineProcessing(true);
    const transactionId = `${gatewayType.toUpperCase()}-${Date.now()}`;
    const note = gatewayType === 'cheque'
      ? `Chèque N° ${chequeRef}`
      : `Espèces${cashNote ? ' — ' + cashNote : ''}`;
    setTimeout(() => {
      setOfflineProcessing(false);
      setOfflineSuccess(true);
      toast.success('Paiement enregistré!');
      setTimeout(() => {
        onSuccess({ transaction_id: transactionId, payment_method: gatewayType === 'cheque' ? 'Chèque' : 'Espèces', note });
        onClose();
      }, 1500);
    }, 600);
  };

  // Gateway selector — shown first if no method chosen
  if (!gatewayType) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">💳 Choisir le mode de paiement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#64748B] mb-1">Montant : <strong className="text-[#0F172A]">{amount?.toLocaleString()} DJF</strong></p>
          <p className="text-xs text-[#64748B] mb-4">{description}</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setGatewayType('meras')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#6366F1] bg-white hover:bg-[#6366F1]/5 transition text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">Meras (En ligne)</p>
                <p className="text-xs text-[#64748B]">Carte, Mobile Money, Virement — paiement sécurisé en ligne</p>
              </div>
            </button>
            <button
              onClick={() => setGatewayType('cheque')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-amber-400 bg-white hover:bg-amber-50 transition text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">Chèque</p>
                <p className="text-xs text-[#64748B]">Paiement par chèque — confirmation manuelle avec numéro de chèque</p>
              </div>
            </button>
            <button
              onClick={() => setGatewayType('cash')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-400 bg-white hover:bg-slate-50 transition text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#64748B] to-[#475569] flex items-center justify-center flex-shrink-0">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">Espèces</p>
                <p className="text-xs text-[#64748B]">Paiement en espèces — confirmation manuelle sans appel API</p>
              </div>
            </button>
          </div>
          <div className="pt-2 border-t border-[#E5E7EB] mt-2">
            <Button variant="outline" onClick={onClose} className="w-full">Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Cheque or Cash — fully separate manual confirmation flow
  if (gatewayType === 'cheque' || gatewayType === 'cash') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button onClick={() => setGatewayType(null)} className="text-[#64748B] hover:text-[#0F172A] mr-1">←</button>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gatewayType === 'cheque' ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706]' : 'bg-gradient-to-br from-[#64748B] to-[#475569]'}`}>
                {gatewayType === 'cheque' ? <FileText className="w-5 h-5 text-white" /> : <Banknote className="w-5 h-5 text-white" />}
              </div>
              Paiement par {gatewayType === 'cheque' ? 'Chèque' : 'Espèces'}
            </DialogTitle>
          </DialogHeader>

          {offlineSuccess ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Paiement Enregistré!</h3>
              <p className="text-[#64748B]">Le paiement a été confirmé manuellement</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <p className="text-sm text-[#64748B] mb-1">Montant à payer</p>
                <p className="text-3xl font-bold text-[#0F172A]">{amount.toLocaleString()} DJF</p>
                <p className="text-sm text-[#64748B] mt-2">{description}</p>
              </div>

              {gatewayType === 'cheque' ? (
                <div>
                  <Label htmlFor="chequeRef">Numéro de chèque *</Label>
                  <Input
                    id="chequeRef"
                    placeholder="Ex: 000123456"
                    value={chequeRef}
                    onChange={(e) => setChequeRef(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Indiquez le numéro figurant sur le chèque</p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="cashNote">Note (optionnel)</Label>
                  <Input
                    id="cashNote"
                    placeholder="Ex: Remis en caisse le 25/02/2026"
                    value={cashNote}
                    onChange={(e) => setCashNote(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Confirmez que vous avez reçu les espèces</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800">
                ⚠️ Ce paiement est enregistré manuellement. Aucune transaction en ligne ne sera effectuée.
              </div>

              <div className="flex gap-3 pt-2 border-t border-[#E5E7EB]">
                <Button variant="outline" onClick={onClose} disabled={offlineProcessing} className="flex-1">
                  Annuler
                </Button>
                <Button
                  onClick={handleOfflineConfirm}
                  disabled={offlineProcessing || (gatewayType === 'cheque' && !chequeRef.trim())}
                  className={`flex-1 ${gatewayType === 'cheque' ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]' : 'bg-gradient-to-r from-[#64748B] to-[#475569]'}`}
                >
                  {offlineProcessing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement...</>
                  ) : (
                    <>
                      {gatewayType === 'cheque' ? <FileText className="w-4 h-4 mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
                      Confirmer le Paiement
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

  // Use Meras if selected
  if (gatewayType === 'meras') {
    return (
      <MerasPaymentGateway
        isOpen={isOpen}
        onClose={onClose}
        amount={amount}
        description={description}
        paymentId={entityId}
        entityType={paymentType}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-[#F7F9FC]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0F172A]">
            💳 Paiement Sécurisé
          </DialogTitle>
        </DialogHeader>

        
        {paymentStatus === 'success' ? (
          <div className="py-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">Paiement Réussi!</h3>
            <p className="text-[#64748B]">Votre paiement a été traité avec succès</p>
            <p className="text-3xl font-bold text-[#0F172A] mt-4">{amount.toLocaleString()} DJF</p>
          </div>
        ) : paymentStatus === 'failed' ? (
          <div className="py-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-red-600 mb-2">Paiement Échoué</h3>
            <p className="text-[#64748B] mb-6">Une erreur s'est produite lors du traitement</p>
            <Button onClick={() => setPaymentStatus(null)} variant="outline">
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            {/* Payment Summary */}
            <Card className="border-2 border-[#6366F1] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-[#64748B]">Montant à payer</p>
                    <p className="text-3xl font-bold text-[#0F172A] mt-1">{amount.toLocaleString()} DJF</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#64748B]">Description</p>
                    <p className="text-sm font-semibold text-[#0F172A] mt-1">{description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Method Selection */}
            <div className="space-y-4 mt-6">
              <Label className="text-lg font-semibold">Méthode de Paiement</Label>
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card Payment */}
                  <label 
                    className={`cursor-pointer ${paymentMethod === 'card' ? 'ring-2 ring-[#6366F1]' : ''}`}
                  >
                    <Card className="hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="card" id="card" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CreditCard className="w-5 h-5 text-[#6366F1]" />
                              <span className="font-semibold">Carte</span>
                            </div>
                            <p className="text-xs text-[#64748B]">Visa, Mastercard</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>
                  
                  {/* Mobile Money */}
                  <label 
                    className={`cursor-pointer ${paymentMethod === 'mobile_money' ? 'ring-2 ring-[#6366F1]' : ''}`}
                  >
                    <Card className="hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="mobile_money" id="mobile_money" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Smartphone className="w-5 h-5 text-[#10B981]" />
                              <span className="font-semibold">Mobile Money</span>
                            </div>
                            <p className="text-xs text-[#64748B]">CAC PAY, WAAFI, D-Money</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>
                  
                  {/* Bank Transfer */}
                  <label 
                    className={`cursor-pointer ${paymentMethod === 'bank_transfer' ? 'ring-2 ring-[#6366F1]' : ''}`}
                  >
                    <Card className="hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="w-5 h-5 text-[#F59E0B]" />
                              <span className="font-semibold">Virement</span>
                            </div>
                            <p className="text-xs text-[#64748B]">Virement bancaire</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Payment Details Form */}
            <div className="mt-6 space-y-4">
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <Label>Numéro de carte *</Label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={cardDetails.cardNumber}
                      onChange={(e) => setCardDetails({
                        ...cardDetails,
                        cardNumber: formatCardNumber(e.target.value)
                      })}
                      maxLength={19}
                      className="mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Nom sur la carte *</Label>
                    <Input
                      placeholder="JOHN DOE"
                      value={cardDetails.cardName}
                      onChange={(e) => setCardDetails({
                        ...cardDetails,
                        cardName: e.target.value.toUpperCase()
                      })}
                      className="mt-2"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date d'expiration *</Label>
                      <Input
                        placeholder="MM/YY"
                        value={cardDetails.expiryDate}
                        onChange={(e) => setCardDetails({
                          ...cardDetails,
                          expiryDate: formatExpiryDate(e.target.value)
                        })}
                        maxLength={5}
                        className="mt-2"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>CVV *</Label>
                      <Input
                        type="password"
                        placeholder="123"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({
                          ...cardDetails,
                          cvv: e.target.value.replace(/\D/g, '')
                        })}
                        maxLength={4}
                        className="mt-2"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {paymentMethod === 'mobile_money' && (
                <div className="space-y-4">
                  <div>
                    <Label>Opérateur Mobile *</Label>
                    <select
                      value={mobileMoneyDetails.provider}
                      onChange={(e) => setMobileMoneyDetails({
                        ...mobileMoneyDetails,
                        provider: e.target.value
                      })}
                      className="w-full mt-2 p-2 border rounded-lg"
                      required
                    >
                      <option value="CAC PAY">CAC PAY</option>
                      <option value="WAAFI">WAAFI</option>
                      <option value="D-MONEY">D-Money (Telecom)</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Numéro de téléphone *</Label>
                    <Input
                      placeholder="+253 77 XX XX XX"
                      value={mobileMoneyDetails.phoneNumber}
                      onChange={(e) => setMobileMoneyDetails({
                        ...mobileMoneyDetails,
                        phoneNumber: e.target.value
                      })}
                      className="mt-2"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-1">
                      Vous recevrez une demande de confirmation sur votre téléphone
                    </p>
                  </div>
                </div>
              )}
              
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-4">
                  <div>
                    <Label>Banque *</Label>
                    <select
                      value={bankTransferDetails.bankName}
                      onChange={(e) => setBankTransferDetails({
                        ...bankTransferDetails,
                        bankName: e.target.value
                      })}
                      className="w-full mt-2 p-2 border rounded-lg"
                      required
                    >
                      <option value="">Sélectionner une banque</option>
                      <option value="BCIMR">BCIMR (Banque pour le Commerce et l'Industrie - Mer Rouge)</option>
                      <option value="CAC International Bank">CAC International Bank</option>
                      <option value="EXIM Bank">EXIM Bank</option>
                      <option value="Salaam African Bank">Salaam African Bank</option>
                      <option value="Saba African Bank">Saba African Bank</option>
                      <option value="Bank of Africa">Bank of Africa</option>
                      <option value="East Africa Bank">East Africa Bank</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Numéro de compte *</Label>
                    <Input
                      placeholder="Entrez votre numéro de compte"
                      value={bankTransferDetails.accountNumber}
                      onChange={(e) => setBankTransferDetails({
                        ...bankTransferDetails,
                        accountNumber: e.target.value
                      })}
                      className="mt-2"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Security Badge */}
            <div className="mt-6 p-4 bg-[#F7F9FC] rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>🔒 Paiement 100% sécurisé et crypté</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={processing}
              >
                Annuler
              </Button>
              <Button
                onClick={handlePayment}
                disabled={processing}
                className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg min-w-[150px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer {amount.toLocaleString()} DJF
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}