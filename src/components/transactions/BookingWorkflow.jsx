import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, ChevronUp, BookOpen, Loader2, AlertCircle, RotateCcw, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import DebtSettlementModal from './DebtSettlementModal';
import { ledgerEngine } from '@/functions/ledgerEngine';

// Full PCG operation list — each entry maps directly to bookingType + operationType
const PCG_OPERATIONS = [
  { module: 'Achats & Fournisseurs', label: 'Facture fournisseur à payer', description: 'Facture reçue, non réglée', journal: 'ACH', debit: '6xxx Charges', credit: '401 Fournisseur', bookingType: 'Facture fournisseur', operationType: 'Dépense non payée' },
  { module: 'Achats & Fournisseurs', label: 'Facture fournisseur réglée', description: 'Paiement immédiat au fournisseur', journal: 'ACH', debit: '6xxx Charges', credit: '512 Banque', bookingType: 'Facture fournisseur', operationType: 'Dépense payée' },
  { module: 'Achats & Fournisseurs', label: 'Achat immédiat / Reçu', description: 'Paiement sur place avec reçu', journal: 'OD', debit: '6xxx Charges', credit: '53 / 512', bookingType: 'Note de frais', operationType: 'Dépense payée' },
  { module: 'Personnel & Salaires', label: 'Salaires versés', description: 'Bulletin de paie du personnel', journal: 'SAL', debit: '641 Salaires', credit: '43x Charges sociales', bookingType: 'Paie', operationType: 'Dépense payée' },
  { module: 'Personnel & Salaires', label: 'Note de frais employé', description: 'Remboursement frais professionnel', journal: 'OD', debit: '625 Frais divers', credit: '455 Employé', bookingType: 'Note de frais', operationType: 'Note de frais / Avance' },
  { module: 'Banque & Financements', label: 'Remboursement emprunt bancaire', description: 'Paiement échéance prêt (capital + intérêts)', journal: 'BNQ', debit: '164 Emprunt', credit: '512 Banque', bookingType: 'Remboursement prêt', operationType: 'Remboursement prêt' },
  { module: 'Banque & Financements', label: 'Frais bancaires / Prélèvements', description: 'Frais de tenue de compte, commissions', journal: 'BNQ', debit: '627 Frais bancaires', credit: '512 Banque', bookingType: 'Banque', operationType: 'Dépense payée' },
  { module: 'Impôts & Cotisations', label: 'Déclaration CNSS / ITS', description: 'Cotisations sociales et fiscales', journal: 'CNSS', debit: '645 Charges sociales', credit: '43x Charges sociales', bookingType: 'Impôts & Taxes', operationType: 'Dépense payée' },
  { module: 'Divers', label: 'Autre dépense / OD', description: 'Transfert interne, ajustement, divers', journal: 'OD', debit: 'Selon opération', credit: 'Selon opération', bookingType: 'Autre', operationType: 'Autre / Divers' },
  { module: 'Partenaires & Investissements', label: 'Apport en capital', description: 'Investissement des associés / actionnaires', journal: 'BNQ', debit: '512 Banque', credit: '101 Capital', bookingType: 'Apport capital', operationType: 'Apport en capital' },
  { module: 'Clients & Ventes', label: 'Facture client à encaisser', description: 'Vente à crédit — règlement à venir', journal: 'VTE', debit: '411 Clients', credit: '7xxx Ventes', bookingType: 'Facture client', operationType: 'Revenu / Vente' },
  { module: 'Clients & Ventes', label: 'Paiement client reçu', description: 'Règlement client encaissé', journal: 'VTE', debit: '512 Banque', credit: '411 Clients', bookingType: 'Facture client', operationType: 'Paiement reçu client' },
  { module: 'Dettes centralisées', label: 'Dette fournisseur', description: 'Dette fournisseur non encore payée', journal: 'ACH', debit: '606 Achats', credit: '401 Fournisseur', bookingType: 'Dette fournisseur', operationType: 'Dette fournisseur' },
  { module: 'Dettes centralisées', label: 'Dette fournisseur réglée', description: 'Paiement d\'une facture fournisseur déjà payée', journal: 'ACH', debit: '606 Achats', credit: '512 Banque', bookingType: 'Dette fournisseur réglée', operationType: 'Dette fournisseur réglée' },
  { module: 'Dettes centralisées', label: 'Dette employé', description: 'Avance ou note de frais employé', journal: 'OD', debit: '455 Employé', credit: '512 Banque / 53 Espèces', bookingType: 'Dette employé', operationType: 'Dette employé' },
  { module: 'Dettes centralisées', label: 'Dette partenaire', description: 'Dette contractuelle ou investissement à rembourser', journal: 'BNQ / OD', debit: 'Selon type (164, 606…)', credit: '101 Capital / 512 Banque', bookingType: 'Dette partenaire', operationType: 'Dette partenaire' },
  { module: 'Dettes centralisées', label: 'Dette banque / financement', description: 'Prêt ou remboursement à une institution financière', journal: 'BNQ', debit: '164 Emprunt', credit: '512 Banque', bookingType: 'Dette banque', operationType: 'Dette banque' },
  { module: 'Dettes centralisées', label: 'Dette investisseur', description: 'Apport en capital ou remboursement partiel', journal: 'BNQ', debit: '512 Banque', credit: '101 Capital', bookingType: 'Dette investisseur', operationType: 'Dette investisseur' },
];

const MODULE_ICONS = {
  'Achats & Fournisseurs': '🛒',
  'Personnel & Salaires': '🧑‍💼',
  'Banque & Financements': '🏦',
  'Impôts & Cotisations': '🏛️',
  'Divers': '📋',
  'Partenaires & Investissements': '💼',
  'Clients & Ventes': '💰',
  'Dettes centralisées': '📌',
};

// Journal entry templates per type/category
const getEntries = (t) => {
  const amount = t.amount || 0;
  const tax = t.tax_amount || 0;
  const total = t.total_amount || amount;

  const templates = {
    'Dépense_Payroll & Benefits': [
      { compte: '641', label: 'Rémunérations du personnel', debit: amount, credit: 0 },
      { compte: '421', label: 'Personnel — rémunérations dues', debit: 0, credit: amount },
    ],
    'Dépense_Professional Services': [
      { compte: '622', label: 'Honoraires', debit: amount, credit: 0 },
      ...(tax > 0 ? [{ compte: '445', label: 'TVA déductible', debit: tax, credit: 0 }] : []),
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: total },
    ],
    'Dépense': [
      { compte: '606', label: 'Achats non stockés', debit: amount, credit: 0 },
      ...(tax > 0 ? [{ compte: '445', label: 'TVA déductible', debit: tax, credit: 0 }] : []),
      { compte: '401', label: 'Fournisseurs', debit: 0, credit: total },
    ],
    'Revenu': [
      { compte: '411', label: 'Clients', debit: total, credit: 0 },
      ...(tax > 0 ? [{ compte: '441', label: 'TVA collectée', debit: 0, credit: tax }] : []),
      { compte: '706', label: 'Prestations de services / Ventes', debit: 0, credit: amount },
    ],
  };

  return templates[`${t.type}_${t.category}`] || templates[t.type] || [];
};



export default function BookingWorkflow({ transaction, onTransactionUpdated }) {
  const isBooked = !!transaction.booking_status;
  const isPaymentDone = !!transaction.payment_registered;

  const [step, setStep] = useState(isBooked ? 4 : 1);
  const [open, setOpen] = useState({ 1: !isBooked, 2: false, 3: false, 4: isBooked });
  const [bookingType, setBookingType] = useState(transaction.booking_type || '');
  const [operationType, setOperationType] = useState(transaction.operation_type || '');
  const [entries, setEntries] = useState(transaction.journal_entries || null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);

  const isDebt = transaction.is_dette || [
    'Dette fournisseur', 'Dette fournisseur réglée', 'Dette employé',
    'Dette partenaire', 'Dette banque', 'Dette investisseur'
  ].includes(transaction.operation_type);
  const isSettled = !!transaction.linked_settlement_id || (isDebt && transaction.payment_registered);

  // Derive selected operation from PCG_OPERATIONS
  const selectedOp = PCG_OPERATIONS.find(
    op => op.bookingType === bookingType && op.operationType === operationType
  );

  const grouped = PCG_OPERATIONS.reduce((acc, op) => {
    if (!acc[op.module]) acc[op.module] = [];
    acc[op.module].push(op);
    return acc;
  }, {});

  const queryClient = useQueryClient();

  const toggle = (n) => setOpen(prev => ({ ...prev, [n]: !prev[n] }));

  const persist = async (fields) => {
    const updated = await meras.entities.Transaction.update(transaction.id, fields);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-dashboard'] });
    onTransactionUpdated({ ...transaction, ...fields, ...updated });
    return updated;
  };

  // Step 1: pick document type + operation type, then advance
  const canAdvanceStep1 = bookingType && operationType;

  const handleStep1Next = () => {
    if (!canAdvanceStep1) return;
    setStep(2);
    setOpen({ 1: false, 2: true, 3: false, 4: false });
  };

  const handleGenerateEntries = async () => {
    setLoading(true);
    try {
      const amount = transaction.amount || 0;
      const tax = transaction.tax_amount || 0;
      const total = transaction.total_amount || amount;

      // Always call AI — it handles ALL scenario types robustly
      let generated = [];
      try {
        const aiResult = await meras.integrations.Core.InvokeLLM({
          prompt: `Tu es expert-comptable à Djibouti (plan comptable NPCG). Génère les écritures du journal comptable pour cette transaction.

Type: ${transaction.type}
Catégorie: ${transaction.category || 'N/A'}
Nature de l'opération: ${operationType}
Type de document: ${bookingType}
Description: ${transaction.description}
Contact: ${transaction.contact_name || 'N/A'}
Montant HT: ${amount} DJF
TVA: ${tax} DJF
Total TTC: ${total} DJF
Méthode paiement: ${transaction.payment_method || 'N/A'}
Montant intérêts: ${transaction.loan_interest_amount || 0} DJF

RÈGLES IMPORTANTES:
- Utilise les numéros de compte NPCG (ex: 601, 401, 411, 512, 641, 706, 164, 661, 101, 455...)
- La somme des débits DOIT EXACTEMENT égaler la somme des crédits
- Génère au minimum 2 lignes d'écriture
- Si TVA > 0, inclure un compte TVA séparé
- Pour un PRÊT REÇU (emprunt bancaire): Débit 512-Banque / Crédit 164-Emprunts
- Pour un REMBOURSEMENT DE PRÊT: si intérêts > 0, séparer capital (164) et intérêts (661), Crédit 512-Banque
- Pour APPORT EN CAPITAL: Débit 512-Banque / Crédit 101-Capital
- Pour COMPTE COURANT ASSOCIÉ: Débit 512-Banque / Crédit 455-Associés comptes courants

Retourne UNIQUEMENT du JSON valide sans commentaire.`,
          response_json_schema: {
            type: "object",
            properties: {
              entries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    compte: { type: "string" },
                    label: { type: "string" },
                    debit: { type: "number" },
                    credit: { type: "number" },
                  }
                }
              }
            }
          }
        });
        if (aiResult?.entries?.length >= 2) generated = aiResult.entries;
      } catch (_) {}

      // Fallback: if AI failed or returned nothing, build a safe generic entry
      if (generated.length < 2) {
        const isRevenu = transaction.type === 'Revenu';
        generated = isRevenu
          ? [
              { compte: '512', label: 'Banque / Caisse', debit: total, credit: 0 },
              ...(tax > 0 ? [{ compte: '441', label: 'TVA collectée', debit: 0, credit: tax }] : []),
              { compte: '706', label: 'Produits des services / Ventes', debit: 0, credit: amount },
            ]
          : [
              { compte: '606', label: 'Achats / Charges', debit: amount, credit: 0 },
              ...(tax > 0 ? [{ compte: '445', label: 'TVA déductible', debit: tax, credit: 0 }] : []),
              { compte: '512', label: 'Banque / Caisse', debit: 0, credit: total },
            ];
      }

      // Fix any minor rounding so debit always equals credit
      const sumD = generated.reduce((s, e) => s + (e.debit || 0), 0);
      const sumC = generated.reduce((s, e) => s + (e.credit || 0), 0);
      if (Math.abs(sumD - sumC) > 0.01) {
        // Adjust the largest credit entry to balance
        const idx = generated.reduce((best, e, i) => e.credit > generated[best].credit ? i : best, 0);
        generated[idx] = { ...generated[idx], credit: generated[idx].credit + (sumD - sumC) };
      }

      setEntries(generated);
      setStep(3);
      setOpen({ 1: false, 2: false, 3: true, 4: false });
    } finally {
      setLoading(false);
    }
  };

  const DEBT_TYPES = ['Dette fournisseur', 'Dette fournisseur réglée', 'Dette employé', 'Dette partenaire', 'Dette banque', 'Dette investisseur'];

  const handleBook = async () => {
    setLoading(true);
    try {
      // 1. Persist to Transaction (existing logic)
      await persist({
        booking_status: 'booked',
        booking_type: bookingType,
        operation_type: operationType,
        journal_entries: entries,
        booked_at: new Date().toISOString(),
        is_dette: DEBT_TYPES.includes(operationType),
      });

      // 2. Wire into real LedgerEntry engine
      const selectedPcgOp = PCG_OPERATIONS.find(op => op.bookingType === bookingType && op.operationType === operationType);
      const ledgerResult = await ledgerEngine({
        action: 'generateLedgerEntries',
        transaction_id: transaction.id,
        template_type: selectedPcgOp?.label || bookingType,
        transaction: {
          date: transaction.date,
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          department: transaction.department,
          contact_name: transaction.contact_name,
          date_echeance: transaction.date_echeance,
          numero_facture: transaction.numero_facture,
        },
      });
      if (ledgerResult?.data?.error) {
        toast.error('Grand Livre: ' + ledgerResult.data.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['ledger-entries'] });
        queryClient.invalidateQueries({ queryKey: ['debts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions-for-backfill'] });
      }

      setStep(4);
      setOpen({ 1: false, 2: false, 3: false, 4: true });
      toast.success('✅ Écriture comptable enregistrée dans le Grand Livre');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    setLoading(true);
    try {
      await persist({ payment_registered: true, status: 'Payé' });
      // Also mark payment in LedgerEngine (creates offset entry)
      try {
        await ledgerEngine({ action: 'markPayment', transaction_id: transaction.id, payment_amount: transaction.total_amount || transaction.amount });
        queryClient.invalidateQueries({ queryKey: ['ledger-entries'] });
        queryClient.invalidateQueries({ queryKey: ['debts'] });
      } catch (_) {}
      toast.success('✅ Paiement enregistré — écriture de règlement créée');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await persist({
        booking_status: null,
        booking_type: null,
        operation_type: null,
        journal_entries: null,
        payment_registered: false,
        booked_at: null,
        status: null,
      });
      setStep(1);
      setBookingType('');
      setOperationType('');
      setEntries(null);
      setOpen({ 1: true, 2: false, 3: false, 4: false });
      toast.success('Écriture annulée');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = entries?.reduce((s, e) => s + (e.debit || 0), 0) || 0;
  const totalCredit = entries?.reduce((s, e) => s + (e.credit || 0), 0) || 0;
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const StepHeader = ({ num, title, done, active }) => (
    <button
      onClick={() => toggle(num)}
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
        active ? 'bg-blue-50 border-blue-200' : done ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
        }`}>
          {done ? '✓' : num}
        </span>
        <span className={`text-sm font-semibold ${active ? 'text-blue-800' : done ? 'text-green-800' : 'text-gray-500'}`}>
          {title}
        </span>
      </div>
      {open[num] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  return (
    <>
      {isBooked && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <span className="text-sm font-semibold text-green-800">Transaction comptabilisée</span>
              {transaction.operation_type && (
                <p className="text-xs text-green-600 mt-0.5">{transaction.operation_type} · {transaction.booking_type}</p>
              )}
            </div>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={handleReset} disabled={loading} className="text-gray-500 h-7 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Annuler
          </Button>
        </div>
      )}

      {/* Debt settlement banner — shown when booked as a debt and not yet settled */}
      {isBooked && isDebt && !isSettled && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Dette ouverte — En attente de règlement</p>
              <p className="text-xs text-amber-600">{transaction.contact_name || '—'} · {(transaction.total_amount || transaction.amount)?.toLocaleString()} DJF</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowSettlement(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="sm"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Régler cette dette
          </Button>
        </div>
      )}

      {/* Settled badge */}
      {isBooked && isDebt && isSettled && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-800 font-semibold">Dette réglée — écriture de clôture enregistrée</p>
        </div>
      )}

      {/* STEP 1 — Choisir l'opération */}
      <div className="space-y-2">
        <StepHeader num={1} title={selectedOp ? selectedOp.label : 'Que souhaitez-vous enregistrer ?'} done={step > 1} active={step === 1} />
        {open[1] && (
          <div className="pl-2 space-y-3">
            {/* Dropdown selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-sm transition ${
                  selectedOp ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <span className={selectedOp ? 'font-medium' : ''}>
                  {selectedOp ? selectedOp.label : '— Sélectionner une opération —'}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                  {Object.entries(grouped).map(([module, ops]) => (
                    <div key={module}>
                      <div className="px-3 py-1.5 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wide sticky top-0">
                        {MODULE_ICONS[module] || '📋'} {module}
                      </div>
                      {ops.map(op => (
                        <button
                          key={op.label}
                          type="button"
                          onClick={() => {
                            setBookingType(op.bookingType);
                            setOperationType(op.operationType);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-blue-50 transition ${
                            selectedOp?.label === op.label ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{op.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{op.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">{op.journal}</span>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-1 text-[10px]">
                            <span className="text-green-700 font-mono">D: {op.debit}</span>
                            <span className="text-red-600 font-mono">C: {op.credit}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview of selected operation */}
            {selectedOp && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between"><span className="text-indigo-500">Module</span><strong className="text-indigo-800">{selectedOp.module}</strong></div>
                <div className="flex justify-between"><span className="text-indigo-500">Journal</span><strong className="text-indigo-800 font-mono">{selectedOp.journal}</strong></div>
                <div className="flex justify-between"><span className="text-indigo-500">PCG Débit</span><strong className="text-green-700 font-mono">{selectedOp.debit}</strong></div>
                <div className="flex justify-between"><span className="text-indigo-500">PCG Crédit</span><strong className="text-red-600 font-mono">{selectedOp.credit}</strong></div>
              </div>
            )}

            <Button
              type="button"
              onClick={handleStep1Next}
              disabled={!canAdvanceStep1}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
            >
              Continuer →
            </Button>
          </div>
        )}
      </div>

      {/* STEP 2 — Créer le document */}
      <div className="space-y-2">
        <StepHeader num={2} title={bookingType ? `Document: ${bookingType}` : 'Créer le document'} done={step > 2} active={step === 2} />
        {open[2] && step >= 2 && (
          <div className="pl-3 space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-gray-500">Type de document:</span><strong>{bookingType}</strong></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Nature:</span><strong>{operationType}</strong></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Contact:</span><strong>{transaction.contact_name || '—'}</strong></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Montant HT:</span><strong>{transaction.amount?.toLocaleString()} DJF</strong></div>
              {(transaction.tax_amount > 0) && <div className="flex justify-between text-xs"><span className="text-gray-500">TVA:</span><strong>{transaction.tax_amount?.toLocaleString()} DJF</strong></div>}
              <div className="flex justify-between text-xs border-t pt-1.5"><span className="text-gray-500 font-medium">Total TTC:</span><strong className="text-blue-700">{(transaction.total_amount || transaction.amount)?.toLocaleString()} DJF</strong></div>
            </div>
            <Button type="button" onClick={handleGenerateEntries} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</> : '🤖 Générer les écritures avec IA'}
            </Button>
          </div>
        )}
      </div>

      {/* STEP 3 — Écriture comptable */}
      <div className="space-y-2">
        <StepHeader num={3} title="Écriture comptable" done={step > 3 || isBooked} active={step === 3} />
        {open[3] && entries && (
          <div className="pl-3 space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
              <div className="bg-gray-50 px-3 py-2 flex justify-between border-b text-gray-600 font-semibold">
                <span>{transaction.description?.slice(0, 45)}</span>
                <span>{transaction.date}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500">
                    <th className="text-left px-3 py-2">Compte</th>
                    <th className="text-right px-3 py-2">Débit</th>
                    <th className="text-right px-3 py-2">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono">
                        <span className="font-semibold text-gray-800">{e.compte}</span>
                        <span className="text-gray-500 ml-1.5">— {e.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">{e.debit > 0 ? e.debit.toLocaleString() : ''}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">{e.credit > 0 ? e.credit.toLocaleString() : ''}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-3 py-2 text-gray-600">Total</td>
                    <td className="px-3 py-2 text-right">{totalDebit.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{totalCredit.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {balanced ? (
              <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Écriture équilibrée</p>
            ) : (
              <p className="text-xs text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Écriture déséquilibrée — débit ≠ crédit</p>
            )}

            <Button
              type="button"
              onClick={handleBook}
              disabled={loading || !balanced}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
              Comptabiliser l'écriture
            </Button>
          </div>
        )}
      </div>

      {/* STEP 4 — Enregistrer le paiement */}
      <div className="space-y-2">
        <StepHeader num={4} title="Enregistrer le paiement" done={isPaymentDone} active={step === 4 && !isPaymentDone} />
        {open[4] && (
          <div className="pl-3 space-y-3">
            {isPaymentDone ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Paiement enregistré — {transaction.payment_method || 'N/A'}
              </div>
            ) : (
              <>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5 text-amber-800">
                  <div className="flex justify-between">
                    <span>Solde à régler:</span>
                    <strong>{(transaction.total_amount || transaction.amount)?.toLocaleString()} DJF{transaction.payment_method ? ` via ${transaction.payment_method}` : ''}</strong>
                  </div>
                  {operationType && (
                    <div className="flex justify-between">
                      <span>Nature:</span>
                      <strong>{operationType}</strong>
                    </div>
                  )}
                  {bookingType && (
                    <div className="flex justify-between">
                      <span>Document:</span>
                      <strong>{bookingType}</strong>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleRegisterPayment}
                  disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer le paiement
                </Button>
              </>
            )}
          </div>
        )}
      </div>

    {/* Debt Settlement Modal */}
    <DebtSettlementModal
      debt={transaction}
      open={showSettlement}
      onClose={() => setShowSettlement(false)}
      onSettled={(settlement) => {
        onTransactionUpdated({ ...transaction, payment_registered: true, status: 'Payé', linked_settlement_id: settlement.id });
      }}
    />
    </>
  );
}