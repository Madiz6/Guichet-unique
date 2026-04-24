import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CreditCard, Shield, Clock, Building2, FileText, Download, Loader2 } from 'lucide-react';
import { generateFormulairePDF } from './PDFGenerator.jsx';
import { generatePaymentReceiptPDF } from './PaymentReceiptPDF.jsx';
import MerasPaymentGateway from '@/components/payments/MerasPaymentGateway.jsx';

// Service tier surcharges only (added on top of base fees)
const TIERS = [
  { id: 'express', label: 'Express', delay: '45 minutes', surcharge: 25000, color: 'border-purple-400 bg-purple-50', desc: 'Traitement prioritaire immédiat', icon: '⚡' },
  { id: 'standard', label: 'Standard', delay: '24 heures', surcharge: 15000, color: 'border-blue-400 bg-blue-50', desc: 'Traitement le jour même', icon: '🕐', popular: true },
  { id: 'economique', label: 'Économique', delay: '72 heures', surcharge: 0, color: 'border-gray-300 bg-gray-50', desc: 'Traitement dans les 3 jours ouvrables', icon: '📋' },
  { id: 'test', label: 'Test', delay: '—', surcharge: 0, fixedAmount: 15, color: 'border-amber-400 bg-amber-50', desc: 'Environnement de test uniquement', icon: '🧪' },
];

// Patente fee table by activity sector (DJF)
const PATENTE_TABLE = [
  { keywords: ['import', 'export', 'commerce international', 'négoce'], amount: 180000 },
  { keywords: ['banque', 'finance', 'assurance', 'microfinance', 'crédit'], amount: 250000 },
  { keywords: ['btp', 'construction', 'bâtiment', 'travaux', 'génie civil'], amount: 120000 },
  { keywords: ['hôtel', 'hôtellerie', 'hébergement', 'tourisme'], amount: 150000 },
  { keywords: ['restaurant', 'restauration', 'café', 'alimentation', 'traiteur'], amount: 80000 },
  { keywords: ['transport', 'logistique', 'fret', 'transit', 'messagerie'], amount: 100000 },
  { keywords: ['informatique', 'technologie', 'numérique', 'it', 'telecom', 'télécommunication'], amount: 90000 },
  { keywords: ['médical', 'santé', 'clinique', 'pharmacie', 'soins', 'médecine'], amount: 110000 },
  { keywords: ['éducation', 'formation', 'école', 'enseignement', 'université'], amount: 70000 },
  { keywords: ['énergie', 'pétrole', 'gaz', 'carburant', 'électricité'], amount: 200000 },
  { keywords: ['industrie', 'manufacture', 'production', 'usine', 'fabrication'], amount: 140000 },
  { keywords: ['agriculture', 'pêche', 'élevage', 'agro'], amount: 60000 },
  { keywords: ['immobilier', 'foncier', 'location', 'bail', 'gérance'], amount: 130000 },
  { keywords: ['conseil', 'consulting', 'audit', 'juridique', 'comptabilité', 'expertise'], amount: 85000 },
  { keywords: ['communication', 'publicité', 'media', 'presse', 'audiovisuel'], amount: 75000 },
  { keywords: ['sécurité', 'gardiennage', 'surveillance'], amount: 65000 },
  { keywords: ['nettoyage', 'entretien', 'maintenance', 'facility'], amount: 55000 },
];

const DEFAULT_PATENTE = 75000;

function getPatenteAmount(secteur, description) {
  const text = `${secteur || ''} ${description || ''}`.toLowerCase();
  for (const row of PATENTE_TABLE) {
    if (row.keywords.some(k => text.includes(k))) return row.amount;
  }
  return DEFAULT_PATENTE;
}

const ODPIC = 24000;
const STATUS_FEES = 18000;

export default function PaymentStep({ stepData, onSuccess }) {
  const [showGateway, setShowGateway] = useState(false);
  const [paid, setPaid] = useState(false);
  const [selectedTier, setSelectedTier] = useState('standard');
  const [downloading, setDownloading] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const activite = stepData?.activite || {};
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || 'Votre entreprise';
  const envelopeId = stepData?.esignature?.envelope_id || 'N/A';
  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[1];

  const patenteAmount = getPatenteAmount(activite.secteur_principal, activite.activite_description);
  const totalAmount = tier.fixedAmount !== undefined ? tier.fixedAmount : patenteAmount + ODPIC + STATUS_FEES + tier.surcharge;

  const handlePaymentSuccess = async (paymentResult) => {
    setShowGateway(false);
    const txId = paymentResult?.transaction_id || null;
    setTransactionId(txId);
    setPaid(true);
    // Auto-generate receipt PDF
    try {
      const user = await import('@/api/base44Client').then(m => m.base44.auth.me()).catch(() => null);
      await generatePaymentReceiptPDF({
        amount: totalAmount,
        transactionId: txId,
        envelopeId,
        companyName,
        formeJuridique: activite.forme_juridique || '—',
        secteur: activite.secteur_principal || '—',
        tierLabel: tier.label,
        tierDelay: tier.delay,
        applicantName: user?.full_name || '—',
        applicantEmail: user?.email || '—',
        patenteAmount: tier.fixedAmount !== undefined ? tier.fixedAmount : patenteAmount,
        odpicAmount: tier.fixedAmount !== undefined ? 0 : ODPIC,
        statusFeesAmount: tier.fixedAmount !== undefined ? 0 : STATUS_FEES,
        tierSurcharge: tier.fixedAmount !== undefined ? 0 : tier.surcharge,
      });
    } catch { /* receipt download failure is non-blocking */ }
  };

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      const user = await import('@/api/base44Client').then(m => m.base44.auth.me()).catch(() => null);
      await generatePaymentReceiptPDF({
        amount: totalAmount,
        transactionId,
        envelopeId,
        companyName,
        formeJuridique: activite.forme_juridique || '—',
        secteur: activite.secteur_principal || '—',
        tierLabel: tier.label,
        tierDelay: tier.delay,
        applicantName: user?.full_name || '—',
        applicantEmail: user?.email || '—',
        patenteAmount: tier.fixedAmount !== undefined ? tier.fixedAmount : patenteAmount,
        odpicAmount: tier.fixedAmount !== undefined ? 0 : ODPIC,
        statusFeesAmount: tier.fixedAmount !== undefined ? 0 : STATUS_FEES,
        tierSurcharge: tier.fixedAmount !== undefined ? 0 : tier.surcharge,
      });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleDownloadPDF = () => {
    setDownloading(true);
    try {
      const enriched = { ...stepData, signature: stepData.esignature };
      generateFormulairePDF(enriched, envelopeId);
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
            <Button onClick={handleDownloadReceipt} disabled={downloadingReceipt}
              className="flex items-center gap-2 w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white">
              {downloadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger le Reçu de Paiement (PDF)
            </Button>
            <Button onClick={handleDownloadPDF} disabled={downloading}
              variant="outline" className="flex items-center gap-2 w-full">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger le Formulaire Unique GUI (PDF)
            </Button>
          </div>

          <div className="p-4 bg-[#F0F4FF] border border-[#C7D2FE] rounded-xl text-left">
            <p className="text-xs text-[#3730A3] font-semibold mb-2">Reçu de paiement</p>
            <div className="space-y-1 text-xs text-[#4338CA]">
              <div className="flex justify-between"><span>Montant payé</span><span className="font-bold">{totalAmount.toLocaleString()} DJF</span></div>
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
        {TIERS.map(t => {
          const tierTotal = t.fixedAmount !== undefined ? t.fixedAmount : patenteAmount + ODPIC + STATUS_FEES + t.surcharge;
          return (
            <button key={t.id} type="button" onClick={() => setSelectedTier(t.id)}
              className={`relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all ${selectedTier === t.id ? t.color + ' shadow-md' : 'border-[#E5E7EB] bg-white hover:border-[#C4C4C4]'}`}>
              {t.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 rounded-full bg-blue-600 text-white font-semibold">Recommandé</span>}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{t.icon}</span>
                <p className="font-bold text-sm text-[#1A1A1A]">{t.label}</p>
                {selectedTier === t.id && <div className="ml-auto w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
              </div>
              {t.fixedAmount !== undefined ? (
                <div className="w-full mb-3">
                  <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-2 py-1">{t.desc}</p>
                </div>
              ) : (
                <div className="w-full space-y-1 text-xs text-[#6B6B6B] mb-3">
                  <div className="flex justify-between"><span>1. Patente</span><span className="font-medium text-[#1A1A1A]">{patenteAmount.toLocaleString()} DJF</span></div>
                  <div className="flex justify-between"><span>2. ODPIC</span><span className="font-medium text-[#1A1A1A]">{ODPIC.toLocaleString()} DJF</span></div>
                  <div className="flex justify-between"><span>3. Statuts</span><span className="font-medium text-[#1A1A1A]">{STATUS_FEES.toLocaleString()} DJF</span></div>
                  <div className="flex justify-between border-t border-dashed border-[#E5E7EB] pt-1">
                    <span>{t.label} {t.surcharge > 0 ? `(+${t.surcharge.toLocaleString()})` : '(inclus)'}</span>
                    <span className="font-medium text-[#1A1A1A]">{t.surcharge > 0 ? `${t.surcharge.toLocaleString()} DJF` : '0 DJF'}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-[#6B6B6B] mb-1">{t.delay !== '—' ? `⏱ ${t.delay}` : t.desc}</p>
              <div className="w-full flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Total à payer</span>
                <span className="text-lg font-bold text-[#1A1A1A]">{tierTotal.toLocaleString()} <span className="text-xs font-normal">DJF</span></span>
              </div>
            </button>
          );
        })}
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
        <div className="p-4 bg-[#F9F9F9] rounded-xl mb-4 space-y-2">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-2">{tier.icon} Formule {tier.label} — Récapitulatif</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-[#6B6B6B]"><span>1. Patente ({activite.secteur_principal || 'Activité générale'})</span><span className="font-medium text-[#1A1A1A]">{patenteAmount.toLocaleString()} DJF</span></div>
            <div className="flex justify-between text-[#6B6B6B]"><span>2. ODPIC</span><span className="font-medium text-[#1A1A1A]">{ODPIC.toLocaleString()} DJF</span></div>
            <div className="flex justify-between text-[#6B6B6B]"><span>3. Statuts</span><span className="font-medium text-[#1A1A1A]">{STATUS_FEES.toLocaleString()} DJF</span></div>
            {tier.surcharge > 0 && (
              <div className="flex justify-between text-[#6B6B6B]"><span>Frais de traitement {tier.label}</span><span className="font-medium text-[#1A1A1A]">+{tier.surcharge.toLocaleString()} DJF</span></div>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
            <span className="text-sm font-bold text-[#1A1A1A]">Total à payer</span>
            <span className="text-2xl font-bold text-[#1A1A1A]">{totalAmount.toLocaleString()} <span className="text-sm font-normal text-[#6B6B6B]">DJF</span></span>
          </div>
          <p className="text-xs text-[#9B9B9B]">Traitement en {tier.delay} — non remboursable</p>
        </div>
        <Button onClick={() => setShowGateway(true)} className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white h-12 text-base font-medium">
          <CreditCard className="w-4 h-4 mr-2" /> Payer {totalAmount.toLocaleString()} DJF
        </Button>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Shield className="w-3.5 h-3.5 text-[#9B9B9B]" />
          <p className="text-xs text-[#9B9B9B]">Paiement sécurisé via Meras Payment Gateway</p>
        </div>
        </div>

        <MerasPaymentGateway
        isOpen={showGateway}
        onClose={() => setShowGateway(false)}
        amount={totalAmount}
        description={`Frais d'enregistrement (${tier.label} - ${tier.delay}) - ANPI - ${companyName}`}
        onSuccess={handlePaymentSuccess}
        />

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">Après le paiement, votre dossier sera transmis au Guichet Unique ANPI. Vous serez notifié dans les <strong>48 heures ouvrables</strong>.</p>
      </div>
    </div>
  );
}