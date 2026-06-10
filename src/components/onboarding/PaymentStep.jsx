import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CreditCard, Shield, Clock, Building2, FileText, Download, Loader2 } from 'lucide-react';
import { generateFormulairePDF } from './PDFGenerator.jsx';
import { generatePaymentReceiptPDF } from './PaymentReceiptPDF.jsx';
import MerasPaymentGateway from '@/components/payments/MerasPaymentGateway.jsx';

// Service tier surcharges only (added on top of base fees)
const TIERS = [
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

  const patenteAmount = tier.fixedAmount !== undefined ? tier.fixedAmount : getPatenteAmount(activite.secteur_principal, activite.activite_description);
  const odpicAmount = tier.fixedAmount !== undefined ? 0 : ODPIC;
  const statusFeesAmount = tier.fixedAmount !== undefined ? 0 : STATUS_FEES;
  const tierSurcharge = tier.fixedAmount !== undefined ? 0 : tier.surcharge;
  const totalAmount = tier.fixedAmount !== undefined ? tier.fixedAmount : patenteAmount + ODPIC + STATUS_FEES + tier.surcharge;

  const handlePaymentSuccess = async (paymentResult) => {
    setShowGateway(false);
    const txId = paymentResult?.transaction_id || null;
    setTransactionId(txId);
    setPaid(true);

    // Build payment metadata to persist on the dossier
    const paymentMeta = {
      transactionId: txId,
      tierLabel: tier.label,
      tierDelay: tier.delay,
      totalAmount,
      patenteAmount: tier.fixedAmount !== undefined ? tier.fixedAmount : patenteAmount,
      odpicAmount: tier.fixedAmount !== undefined ? 0 : ODPIC,
      statusFeesAmount: tier.fixedAmount !== undefined ? 0 : STATUS_FEES,
      tierSurcharge: tier.fixedAmount !== undefined ? 0 : tier.surcharge,
      paidAt: new Date().toISOString(),
    };

    // Persist payment details to the dossier record so admin can see them
    try {
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me().catch(() => null);
      if (user) {
        const dossiers = await base44.entities.RegistrationDossier.filter({ applicant_email: user.email }, '-created_date', 1);
        if (dossiers?.[0]?.id) {
          await base44.entities.RegistrationDossier.update(dossiers[0].id, {
            payment_confirmed: true,
            payment_amount: totalAmount,
            step_data: { ...stepData, paiement: paymentMeta },
            statut: 'En attente',
          });
        }
      }
    } catch (e) { console.error('Payment persist error:', e); }

    // Auto-generate receipt PDF
    try {
      const { base44 } = await import('@/api/base44Client');
      const user = await base44.auth.me().catch(() => null);
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
        patenteAmount: paymentMeta.patenteAmount,
        odpicAmount: paymentMeta.odpicAmount,
        statusFeesAmount: paymentMeta.statusFeesAmount,
        tierSurcharge: paymentMeta.tierSurcharge,
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
        patenteAmount,
        odpicAmount,
        statusFeesAmount,
        tierSurcharge,
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
      <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center max-w-lg mx-auto">
        {/* Success icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-400 animate-ping opacity-70" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Paiement confirmé !</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Merci de faire confiance au Guichet Unique ANPI 🇩🇯</p>
        </div>

        {/* Receipt card */}
        <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm text-left">
          {/* Card header */}
          <div className="bg-[#0d2b0d] px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#90c090] font-medium uppercase tracking-wider">Reçu de Paiement Officiel</p>
              <p className="text-white font-bold text-sm mt-0.5">ANPI — Guichet Unique</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#90c090]">Statut</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> PAYÉ
              </span>
            </div>
          </div>

          {/* Orange accent strip */}
          <div className="h-1 bg-[#F7941D]" />

          {/* Details */}
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wide">Entreprise</p>
                <p className="text-sm font-semibold text-[#1A1A1A] truncate">{companyName}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wide">Formule</p>
                <p className="text-sm font-semibold text-[#1A1A1A]">{tier.label} — {tier.delay}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wide">Date</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wide">Mode de paiement</p>
                <p className="text-sm font-medium text-[#1A1A1A]">Meras Gateway</p>
              </div>
            </div>

            <div className="border-t border-dashed border-[#E5E7EB] pt-3">
              <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wide mb-1">Ref. Dossier (Envelope ID)</p>
              <p className="font-mono text-xs font-bold text-[#0d2b0d] bg-[#f0f7f0] px-2 py-1 rounded break-all">{envelopeId}</p>
            </div>

            {/* Fee breakdown */}
            <div className="bg-[#FAFAFA] border border-[#F0F0F0] rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-2">Détail des frais</p>
              <div className="flex justify-between text-xs"><span className="text-[#6B6B6B]">Droits de patente</span><span className="font-medium">{patenteAmount.toLocaleString()} DJF</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#6B6B6B]">Frais ODPIC</span><span className="font-medium">{odpicAmount.toLocaleString()} DJF</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#6B6B6B]">Frais de statuts</span><span className="font-medium">{statusFeesAmount.toLocaleString()} DJF</span></div>
              {tierSurcharge > 0 && (
                <div className="flex justify-between text-xs"><span className="text-[#6B6B6B]">Traitement {tier.label}</span><span className="font-medium">+{tierSurcharge.toLocaleString()} DJF</span></div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                <span className="text-sm font-bold text-[#1A1A1A]">Total payé</span>
                <span className="text-lg font-bold text-[#F7941D]">{totalAmount.toLocaleString()} <span className="text-xs font-normal text-[#6B6B6B]">DJF</span></span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700"><strong>Délai de traitement :</strong> {tier.delay} — vous serez notifié par email.</p>
            </div>
          </div>
        </div>

        {/* Download buttons */}
        <div className="w-full grid grid-cols-1 gap-3">
          <Button onClick={handleDownloadReceipt} disabled={downloadingReceipt}
            className="flex items-center gap-2 w-full bg-[#F7941D] hover:bg-[#e07f0a] text-white font-semibold h-11">
            {downloadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger le Reçu Officiel (PDF)
          </Button>
          <Button onClick={handleDownloadPDF} disabled={downloading}
            variant="outline" className="flex items-center gap-2 w-full h-11 border-[#0d2b0d] text-[#0d2b0d] hover:bg-[#f0f7f0]">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger le Formulaire Unique GUI
          </Button>
        </div>

        <Button onClick={onSuccess} className="w-full bg-[#0d2b0d] hover:bg-[#1a3d1a] text-white px-8 py-3 text-base font-semibold h-12">
          Accéder à Mon Espace Entreprise →
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TIERS.map(t => {
          const basePatente = getPatenteAmount(activite.secteur_principal, activite.activite_description);
          const tierTotal = t.fixedAmount !== undefined ? t.fixedAmount : basePatente + ODPIC + STATUS_FEES + t.surcharge;
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
                  <div className="flex justify-between"><span>1. Patente</span><span className="font-medium text-[#1A1A1A]">{basePatente.toLocaleString()} DJF</span></div>
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