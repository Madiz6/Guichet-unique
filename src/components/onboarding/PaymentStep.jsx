import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CreditCard, Shield, Clock, Loader2, Building2, FileText } from 'lucide-react';

const REGISTRATION_FEE = 5000;

export default function PaymentStep({ stepData, onSuccess }) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  const activite = stepData?.activite || {};
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || 'Votre entreprise';

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const response = await base44.functions.invoke('merasInitiatePayment', {
        amount: REGISTRATION_FEE,
        currency: 'DJF',
        description: `Frais d'enregistrement - Guichet Unique ANPI - ${companyName}`,
        metadata: { type: 'onboarding_registration', company: companyName },
      });
      if (response?.data?.payment_url) {
        const popup = window.open(response.data.payment_url, '_blank', 'width=600,height=700');
        const timer = setInterval(() => {
          if (!popup || popup.closed) { clearInterval(timer); setPaid(true); setPaying(false); }
        }, 1000);
      } else {
        setPaid(true);
        setPaying(false);
      }
    } catch (e) {
      setError('Erreur lors de l\'initialisation du paiement. Veuillez réessayer.');
      setPaying(false);
    }
  };

  if (paid) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 animate-ping opacity-60" />
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Paiement confirmé !</h2>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 text-left space-y-3">
            <p className="text-lg font-semibold text-[#1A1A1A]">Merci de choisir le Guichet Unique ANPI 🇩🇯</p>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Votre dossier est en cours de traitement. Nos équipes examineront attentivement toutes les pièces soumises avec le plus grand soin.
            </p>
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-sm text-[#1A1A1A]"><strong>Délai de traitement :</strong> 48 heures ouvrables</p>
            </div>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">
              Une confirmation par email vous sera envoyée dès que votre dossier sera validé par nos équipes. Bienvenue dans la communauté entrepreneuriale de Djibouti !
            </p>
          </div>
        </div>
        <Button onClick={onSuccess} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base">
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Paiement des frais d'enregistrement</h2>
        <p className="text-sm text-[#6B6B6B]">Réglez les frais pour finaliser votre dossier au Guichet Unique</p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h3 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" /> Récapitulatif du dossier
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#6B6B6B]">Entreprise</span><span className="font-medium text-[#1A1A1A]">{companyName}</span></div>
          <div className="flex justify-between"><span className="text-[#6B6B6B]">Forme juridique</span><span className="font-medium text-[#1A1A1A]">{activite.forme_juridique || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[#6B6B6B]">Secteur</span><span className="font-medium text-[#1A1A1A]">{activite.secteur_principal || '—'}</span></div>
          <div className="flex justify-between"><span className="text-[#6B6B6B]">Capital social</span><span className="font-medium text-[#1A1A1A]">{activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} DJF` : '—'}</span></div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h3 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" /> Frais d'enregistrement
        </h3>
        <div className="flex items-center justify-between p-4 bg-[#F9F9F9] rounded-xl mb-4">
          <div>
            <p className="text-sm text-[#6B6B6B]">Frais de dossier — Guichet Unique ANPI</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">Paiement unique, non remboursable</p>
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{REGISTRATION_FEE.toLocaleString()} <span className="text-sm font-normal text-[#6B6B6B]">DJF</span></p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
        <Button onClick={handlePay} disabled={paying} className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white h-12 text-base font-medium">
          {paying ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Initialisation...</> : <><CreditCard className="w-4 h-4 mr-2" /> Payer {REGISTRATION_FEE.toLocaleString()} DJF</>}
        </Button>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Shield className="w-3.5 h-3.5 text-[#9B9B9B]" />
          <p className="text-xs text-[#9B9B9B]">Paiement sécurisé via Meras Payment Gateway</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Après le paiement, votre dossier sera transmis automatiquement aux services compétents du Guichet Unique ANPI. Vous serez notifié dans les <strong>48 heures ouvrables</strong>.
        </p>
      </div>
    </div>
  );
}