import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, ChevronDown, ChevronUp, BookOpen, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// NPCG Chart of Accounts
const GL_ACCOUNTS = {
  // Assets
  '101': 'Capital social',
  '164': 'Emprunts bancaires',
  '218': 'Autres immobilisations corporelles',
  '411': 'Clients',
  '421': 'Personnel - rémunérations dues',
  '431': 'Sécurité sociale (CNSS)',
  '441': 'État - TVA collectée',
  '445': 'État - TVA déductible',
  '512': 'Banques',
  '531': 'Caisse',
  // Revenues
  '701': 'Ventes de marchandises',
  '706': 'Prestations de services',
  '762': 'Produits financiers',
  // Expenses
  '601': 'Achats stockés - matières premières',
  '606': 'Achats non stockés',
  '611': 'Sous-traitance',
  '613': 'Locations',
  '615': 'Entretien et réparations',
  '616': 'Primes d\'assurances',
  '622': 'Honoraires',
  '623': 'Publicité',
  '625': 'Déplacements et missions',
  '626': 'Frais postaux et télécom',
  '627': 'Services bancaires',
  '635': 'Impôts et taxes',
  '641': 'Rémunérations du personnel',
  '645': 'Charges de sécurité sociale',
  '661': 'Charges financières - intérêts',
  // Liabilities
  '401': 'Fournisseurs',
  '421': 'Personnel',
  '431': 'CNSS',
  '444': 'État - impôts',
};

const BOOKING_TEMPLATES = {
  'Dépense_Office & Administrative': {
    label: 'Facture fournisseur',
    entries: (t) => [
      { compte: '606', label: 'Achats non stockés', debit: t.amount || 0, credit: 0 },
      { compte: '445', label: 'TVA déductible', debit: t.tax_amount || 0, credit: 0 },
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: t.total_amount || t.amount || 0 },
    ]
  },
  'Dépense_Professional Services': {
    label: 'Facture honoraires',
    entries: (t) => [
      { compte: '622', label: 'Honoraires', debit: t.amount || 0, credit: 0 },
      { compte: '445', label: 'TVA déductible', debit: t.tax_amount || 0, credit: 0 },
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: t.total_amount || t.amount || 0 },
    ]
  },
  'Dépense_Travel & Entertainment': {
    label: 'Note de frais',
    entries: (t) => [
      { compte: '625', label: 'Déplacements et missions', debit: t.amount || 0, credit: 0 },
      { compte: '445', label: 'TVA déductible', debit: t.tax_amount || 0, credit: 0 },
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: t.total_amount || t.amount || 0 },
    ]
  },
  'Dépense_Payroll & Benefits': {
    label: 'Bulletin de paie',
    entries: (t) => [
      { compte: '641', label: 'Rémunérations du personnel', debit: t.amount || 0, credit: 0 },
      { compte: '421', label: 'Personnel - rémunérations dues', debit: 0, credit: t.amount || 0 },
    ]
  },
  'Dépense_IT / Software / Tools': {
    label: 'Facture IT',
    entries: (t) => [
      { compte: '613', label: 'Locations / SaaS', debit: t.amount || 0, credit: 0 },
      { compte: '445', label: 'TVA déductible', debit: t.tax_amount || 0, credit: 0 },
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: t.total_amount || t.amount || 0 },
    ]
  },
  'Dépense_Bank Charges & Interest': {
    label: 'Frais bancaires',
    entries: (t) => [
      { compte: '627', label: 'Services bancaires', debit: t.amount || 0, credit: 0 },
      { compte: '512', label: 'Banques', debit: 0, credit: t.amount || 0 },
    ]
  },
  'Revenu_Product Sales / Services Revenue': {
    label: 'Facture client',
    entries: (t) => [
      { compte: '411', label: 'Clients', debit: t.total_amount || t.amount || 0, credit: 0 },
      { compte: '441', label: 'TVA collectée', debit: 0, credit: t.tax_amount || 0 },
      { compte: '706', label: 'Prestations de services', debit: 0, credit: t.amount || 0 },
    ]
  },
  'Revenu_Subscription Income / Recurring Revenue': {
    label: 'Abonnement client',
    entries: (t) => [
      { compte: '411', label: 'Clients', debit: t.total_amount || t.amount || 0, credit: 0 },
      { compte: '441', label: 'TVA collectée', debit: 0, credit: t.tax_amount || 0 },
      { compte: '706', label: 'Abonnements', debit: 0, credit: t.amount || 0 },
    ]
  },
};

const DEFAULT_TEMPLATE = {
  'Dépense': {
    label: 'Dépense standard',
    entries: (t) => [
      { compte: '606', label: 'Achats non stockés', debit: t.amount || 0, credit: 0 },
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: t.amount || 0 },
    ]
  },
  'Revenu': {
    label: 'Revenu standard',
    entries: (t) => [
      { compte: '411', label: 'Clients', debit: t.amount || 0, credit: 0 },
      { compte: '701', label: 'Ventes', debit: 0, credit: t.amount || 0 },
    ]
  }
};

export default function BookingWorkflow({ transaction, onSave }) {
  const isBooked = !!transaction.booking_status;
  const [step, setStep] = useState(isBooked ? 3 : 1);
  const [expanded, setExpanded] = useState({ 1: true, 2: false, 3: false, 4: false });
  const [bookingType, setBookingType] = useState(transaction.booking_type || '');
  const [journalEntries, setJournalEntries] = useState(transaction.journal_entries || null);
  const [paymentStep, setPaymentStep] = useState(transaction.payment_registered ? 'done' : 'pending');
  const [loading, setLoading] = useState(false);

  const templateKey = `${transaction.type}_${transaction.category}`;
  const template = BOOKING_TEMPLATES[templateKey] || DEFAULT_TEMPLATE[transaction.type];

  const toggleStep = (s) => setExpanded(prev => ({ ...prev, [s]: !prev[s] }));

  const handleSelectBookingType = (type) => {
    setBookingType(type);
    setStep(2);
    setExpanded({ 1: false, 2: true, 3: false, 4: false });
  };

  const handleGenerateEntries = async () => {
    setLoading(true);
    try {
      // Use AI to generate precise journal entries
      const result = await meras.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert comptable Djiboutien. Génère les écritures comptables NPCG pour cette transaction:

Type: ${transaction.type}
Description: ${transaction.description}
Contact: ${transaction.contact_name || 'N/A'}
Montant HT: ${transaction.amount} DJF
TVA: ${transaction.tax_amount || 0} DJF
Total TTC: ${transaction.total_amount || transaction.amount} DJF
Catégorie: ${transaction.category || 'Standard'}
Méthode paiement: ${transaction.payment_method || 'N/A'}

Retourne un objet JSON avec:
- label: titre de l'écriture (ex: "Facture fournisseur Telenor")
- entries: tableau d'objets avec { compte (numéro NPCG), label (nom du compte), debit (montant ou 0), credit (montant ou 0) }

Règles: 
- Toujours équilibrer débit = crédit
- TVA déductible = compte 445 (achats), TVA collectée = compte 441 (ventes)
- Fournisseurs = compte 401, Clients = compte 411
- Caisse = 531, Banque = 512`,
        response_json_schema: {
          type: "object",
          properties: {
            label: { type: "string" },
            entries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  compte: { type: "string" },
                  label: { type: "string" },
                  debit: { type: "number" },
                  credit: { type: "number" }
                }
              }
            }
          }
        }
      });
      
      if (result?.entries?.length) {
        setJournalEntries(result.entries);
        setStep(3);
        setExpanded({ 1: false, 2: false, 3: true, 4: false });
      } else {
        // Fallback to template
        const entries = template?.entries(transaction) || [];
        setJournalEntries(entries);
        setStep(3);
        setExpanded({ 1: false, 2: false, 3: true, 4: false });
      }
    } catch {
      const entries = template?.entries(transaction) || [];
      setJournalEntries(entries);
      setStep(3);
      setExpanded({ 1: false, 2: false, 3: true, 4: false });
    } finally {
      setLoading(false);
    }
  };

  const handleBookEntry = async () => {
    setLoading(true);
    try {
      await onUpdate({
        ...transaction,
        booking_status: 'booked',
        booking_type: bookingType,
        journal_entries: journalEntries,
        booked_at: new Date().toISOString(),
        document_validated: true,
      });
      setStep(4);
      setExpanded({ 1: false, 2: false, 3: false, 4: true });
      toast.success('✅ Écriture comptable enregistrée');
    } catch {
      toast.error('Erreur lors de la comptabilisation');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    setLoading(true);
    try {
      await onUpdate({
        ...transaction,
        payment_registered: true,
        status: 'Payé',
        booking_status: 'booked',
        journal_entries: journalEntries,
      });
      setPaymentStep('done');
      toast.success('✅ Paiement enregistré');
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await onUpdate({
      ...transaction,
      booking_status: null,
      booking_type: null,
      journal_entries: null,
      payment_registered: false,
    });
    setStep(1);
    setJournalEntries(null);
    setBookingType('');
    setPaymentStep('pending');
    setExpanded({ 1: true, 2: false, 3: false, 4: false });
    toast.success('Écriture annulée');
  };

  const totalDebit = journalEntries?.reduce((s, e) => s + (e.debit || 0), 0) || 0;
  const totalCredit = journalEntries?.reduce((s, e) => s + (e.credit || 0), 0) || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const StepHeader = ({ num, title, done, active }) => (
    <button
      onClick={() => toggleStep(num)}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
        active ? 'bg-blue-50 border border-blue-200' : done ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
        }`}>
          {done ? '✓' : num}
        </div>
        <span className={`text-sm font-semibold ${active ? 'text-blue-800' : done ? 'text-green-800' : 'text-gray-600'}`}>{title}</span>
      </div>
      {expanded[num] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-3">
      {isBooked && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800">✅ Parfait! Tout est comptabilisé.</span>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={handleReset} className="text-gray-500 h-7">
            <RotateCcw className="w-3 h-3 mr-1" /> Annuler
          </Button>
        </div>
      )}

      {/* Step 1: What to book */}
      <div className="space-y-2">
        <StepHeader num={1} title="Que voulez-vous comptabiliser?" done={step > 1} active={step === 1} />
        {expanded[1] && (
          <div className="pl-4 space-y-2">
            {[
              { key: 'Facture fournisseur', label: '📄 Facture fournisseur', show: transaction.type === 'Dépense' },
              { key: 'Note de frais', label: '🧾 Note de frais / Reçu', show: transaction.type === 'Dépense' },
              { key: 'Facture client', label: '💰 Facture client', show: transaction.type === 'Revenu' },
              { key: 'Paie', label: '👥 Bulletin de paie', show: transaction.type === 'Dépense' && transaction.category?.includes('Payroll') },
              { key: 'Banque', label: '🏦 Relevé bancaire', show: true },
              { key: 'Autre', label: '📋 Autre écriture', show: true },
            ].filter(o => o.show).map(opt => (
              <button
                key={opt.key}
                onClick={() => handleSelectBookingType(opt.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border ${
                  bookingType === opt.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 hover:border-blue-400 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Create document */}
      <div className="space-y-2">
        <StepHeader num={2} title={bookingType ? `Créer: ${bookingType}` : 'Créer le document'} done={step > 2} active={step === 2} />
        {expanded[2] && step >= 2 && (
          <div className="pl-4 space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Type:</span> <strong>{bookingType}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Contact:</span> <strong>{transaction.contact_name || '—'}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Montant HT:</span> <strong>{transaction.amount?.toLocaleString()} DJF</strong></div>
              {transaction.tax_amount > 0 && <div className="flex justify-between"><span className="text-gray-500">TVA:</span> <strong>{transaction.tax_amount?.toLocaleString()} DJF</strong></div>}
              <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-500">Total TTC:</span> <strong className="text-blue-700">{(transaction.total_amount || transaction.amount)?.toLocaleString()} DJF</strong></div>
            </div>
            <Button type="button" onClick={handleGenerateEntries} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Génération IA...</> : '🤖 Générer les écritures avec IA'}
            </Button>
          </div>
        )}
      </div>

      {/* Step 3: Book entry - Journal */}
      <div className="space-y-2">
        <StepHeader num={3} title="Passer l'écriture comptable" done={step > 3 || !!transaction.booking_status} active={step === 3} />
        {expanded[3] && journalEntries && (
          <div className="pl-4 space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 flex justify-between border-b">
                <span>N° {transaction.numero_facture || `A${Math.floor(Math.random()*900+100)}`} — {transaction.description?.slice(0, 30)}</span>
                <span>{transaction.date}</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-3 py-2 text-gray-500">Compte</th>
                    <th className="text-right px-3 py-2 text-gray-500">Débit</th>
                    <th className="text-right px-3 py-2 text-gray-500">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((entry, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-gray-800">
                        <span className="font-semibold">{entry.compte}</span>
                        <span className="text-gray-500 ml-2">— {entry.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : ''}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : ''}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-3 py-2 text-xs text-gray-600">Somme</td>
                    <td className="px-3 py-2 text-right text-xs">{totalDebit.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs">{totalCredit.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!isBalanced && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-700">
                <AlertCircle className="w-4 h-4" /> Écriture déséquilibrée — vérifier les montants
              </div>
            )}

            {isBalanced && (
              <div className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Écriture équilibrée
              </div>
            )}

            <Button type="button" onClick={handleBookEntry} disabled={loading || !isBalanced} className="w-full bg-green-600 hover:bg-green-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
              Comptabiliser l'écriture
            </Button>
          </div>
        )}
      </div>

      {/* Step 4: Register payment */}
      <div className="space-y-2">
        <StepHeader num={4} title="Enregistrer le paiement" done={paymentStep === 'done' || transaction.payment_registered} active={step === 4} />
        {expanded[4] && (
          <div className="pl-4 space-y-3">
            {paymentStep === 'done' || transaction.payment_registered ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Paiement enregistré — {transaction.payment_method}
              </div>
            ) : (
              <>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <strong>Solde restant à payer:</strong> {(transaction.total_amount || transaction.amount)?.toLocaleString()} DJF
                </div>
                <Button type="button" onClick={handleRegisterPayment} disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Enregistrer le paiement ({transaction.payment_method || 'Virement'})
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}