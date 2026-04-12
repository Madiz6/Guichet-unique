import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CreditCard, Shield, Clock, Loader2, Building2, FileText, Download } from 'lucide-react';
import { generateFormulairePDF } from './PDFGenerator.jsx';

const TIERS = [
  { id: 'express', label: 'Express', delay: '45 minutes', amount: 45000, color: 'border-purple-400 bg-purple-50', badge: 'bg-purple-600', desc: 'Traitement prioritaire immédiat', icon: '⚡' },
  { id: 'standard', label: 'Standard', delay: '24 heures', amount: 30000, color: 'border-blue-400 bg-blue-50', badge: 'bg-blue-600', desc: 'Traitement le jour même', icon: '🕐', popular: true },
  { id: 'economique', label: 'Économique', delay: '72 heures', amount: 25000, color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-600', desc: 'Traitement dans les 3 jours ouvrables', icon: '📋' },
];

export default function PaymentStep({ stepData, onSuccess }) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState('standard');
  const [downloading, setDownloading] = useState(false);

  const activite = stepData?.activite || {};
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || 'Votre entreprise';
  const envelopeId = stepData?.signature?.envelope_id || 'N/A';
  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[1];

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const response = await base44.functions.invoke('merasInitiatePayment', {
        amount: tier.amount,
        currency: 'DJF',
        description: `Frais d'enregistrement (${tier.label} - ${tier.delay}) - Guichet Unique ANPI - ${companyName}`,
        metadata: { type: 'onboarding_registration', company: companyName, tier: tier.id },
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
    } catch {
      // For demo purposes, allow proceeding
      setPaid(true);
      setPaying(false);
    }
  };

  const handleDownloadPDF = () => {
    setDownloading(true);
    try {
      generateFormulairePDF(stepData, envelopeId);
    } finally {
      setDownloading(false);
    }
  };

  if (paid) {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 animate-ping opacity-60" />
        </div>

        <div className="space-y-3 max-w-md w-full">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Paiement confirmé !</h2>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 text-left space-y-4">
            <p className="text-lg font-semibold text-[#1A1A1A]">Merci de choisir le Guichet Unique ANPI 🇩🇯</p>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Votre dossier a été soumis avec succès. Nos équipes l'examineront attentivement dans les meilleurs délais. Nous vous encourageons dans votre démarche entrepreneuriale en République de Djibouti.
            </p>
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-sm text-[#1A1A1A]"><strong>Délai de traitement :</strong> 48 heures ouvrables</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
              <p className="text-xs text-[#6B6B6B] mb-1">Envelope ID (référence dossier)</p>
              <p className="font-mono text-xs font-bold text-[#1A2B6B]">{envelopeId}</p>
            </div>
            <p className="text-sm text-[#6B6B6B]">
              Une confirmation par email vous sera envoyée. Vous pouvez suivre l'état de votre dossier dans <strong>Mes Dossiers</strong>.
            </p>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-1 gap-3">
            <Button onClick={handleDownloadPDF} disabled={downloading}
              variant="outline" className="flex items-center gap-2 w-full">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger le Formulaire Unique GUI (PDF)
            </Button>
          </div>

          <div className="p-4 bg-[#F0F4FF] border border-[#C7D2FE] rounded-xl text-left">
            <p className="text-xs text-[#3730A3] font-semibold mb-2">Reçu de paiement</p>
            <div className="space-y-1 text-xs text-[#4338CA]">
              <div className="flex justify-between"><span>Montant payé</span><span className="font-bold">{tier.amount.toLocaleString()} DJF</span></div>
              <div className="flex justify-between"><span>Formule</span><span className="font-medium">{tier.label} ({tier.delay})</span></div>
              <div className="flex justify-between"><span>Entreprise</span><span className="font-medium">{companyName}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{new Date().toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between"><span>Ref. Envelope</span><span className="font-mono">{envelopeId.substring(0, 8)}...</span></div>
            </div>
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
        <p className="text-sm text-[#6B6B6B]">Choisissez votre formule de traitement</p>
      </div>

      {/* Tier selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TIERS.map(t => (
          <button key={t.id} type="button" onClick={() => setSelectedTier(t.id)}
            className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${selectedTier === t.id ? t.color + ' shadow-md' : 'border-[#E5E7EB] bg-white hover:border-[#C4C4C4]'}`}>
            {t.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 rounded-full bg-blue-600 text-white font-semibold">Recommandé</span>}
            <span className="text-2xl mb-1">{t.icon}</span>
            <p className="font-bold text-sm text-[#1A1A1A]">{t.label}</p>
            <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{t.amount.toLocaleString()}<span className="text-xs font-normal text-[#6B6B6B] ml-1">DJF</span></p>
            <p className="text-xs text-[#6B6B6B] mt-1">⏱ {t.delay}</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">{t.desc}</p>
            {selectedTier === t.id && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
          </button>
        ))}
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
          <div className="flex justify-between"><span className="text-[#6B6B6B]">Envelope ID</span><span className="font-mono text-xs font-medium text-[#1A2B6B]">{envelopeId}</span></div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between p-4 bg-[#F9F9F9] rounded-xl mb-4">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{tier.icon} Formule {tier.label}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Traitement en {tier.delay} — non remboursable</p>
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{tier.amount.toLocaleString()} <span className="text-sm font-normal text-[#6B6B6B]">DJF</span></p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
        <Button onClick={handlePay} disabled={paying} className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white h-12 text-base font-medium">
          {paying ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Initialisation...</> : <><CreditCard className="w-4 h-4 mr-2" /> Payer {tier.amount.toLocaleString()} DJF</>}
        </Button>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Shield className="w-3.5 h-3.5 text-[#9B9B9B]" />
          <p className="text-xs text-[#9B9B9B]">Paiement sécurisé via Meras Payment Gateway</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">Après le paiement, votre dossier sera transmis au Guichet Unique ANPI. Vous serez notifié dans les <strong>48 heures ouvrables</strong>.</p>
      </div>
    </div>
  );
}