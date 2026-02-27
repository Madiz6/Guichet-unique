import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, ChevronUp, BookOpen, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

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

// Combined scenario cards: each card sets BOTH bookingType and operationType at once
// Grouped by business context for entrepreneurs
const SCENARIOS = {
  'Dépense': [
    {
      group: '🛒 Achats & Fournisseurs',
      items: [
        {
          bookingType: 'Facture fournisseur',
          operationType: 'Dépense non payée',
          label: '📄 Facture fournisseur à payer',
          desc: "J'ai reçu une facture d'achat, je dois encore la régler (crédit ~1 mois)",
          color: 'amber',
        },
        {
          bookingType: 'Facture fournisseur',
          operationType: 'Dépense payée',
          label: '✅ Facture fournisseur déjà réglée',
          desc: "J'ai payé une facture fournisseur — achat de biens ou services",
          color: 'green',
        },
        {
          bookingType: 'Note de frais',
          operationType: 'Dépense payée',
          label: '🧾 Achat immédiat / Reçu (Kvitto)',
          desc: "Paiement direct sur place avec reçu — fournitures, repas, carburant...",
          color: 'green',
        },
      ],
    },
    {
      group: '🧑‍💼 Personnel & Salaires',
      items: [
        {
          bookingType: 'Paie',
          operationType: 'Dépense payée',
          label: '👥 Salaires versés (bulletin de paie)',
          desc: "Paiement des rémunérations et charges sociales du personnel",
          color: 'blue',
        },
        {
          bookingType: 'Note de frais',
          operationType: 'Note de frais / Avance',
          label: '🧑‍💼 Note de frais employé (Utlägg)',
          desc: "Un employé a avancé des frais professionnels à rembourser",
          color: 'blue',
        },
      ],
    },
    {
      group: '🏦 Banque & Financements',
      items: [
        {
          bookingType: 'Remboursement prêt',
          operationType: 'Remboursement prêt',
          label: '🏦 Remboursement d\'emprunt bancaire',
          desc: "Paiement d'une échéance de prêt (capital + intérêts)",
          color: 'purple',
        },
        {
          bookingType: 'Banque',
          operationType: 'Dépense payée',
          label: '💳 Frais bancaires / Prélèvement',
          desc: "Frais de tenue de compte, commissions, prélèvements automatiques",
          color: 'gray',
        },
        {
          bookingType: 'Impôts & Taxes',
          operationType: 'Dépense payée',
          label: '🏛️ Impôts, taxes & cotisations (CNSS/ITS)',
          desc: "Paiement de déclarations fiscales et cotisations sociales",
          color: 'red',
        },
      ],
    },
    {
      group: '📋 Divers',
      items: [
        {
          bookingType: 'Autre',
          operationType: 'Autre / Divers',
          label: '📋 Autre dépense / Écriture diverse',
          desc: "Transfert entre comptes, retrait, dépôt, ou tout ce qui ne correspond pas aux catégories ci-dessus",
          color: 'gray',
        },
      ],
    },
  ],
  'Revenu': [
    {
      group: '💰 Ventes & Clients',
      items: [
        {
          bookingType: 'Facture client',
          operationType: 'Revenu / Vente',
          label: '💰 Facture client (à encaisser)',
          desc: "J'ai émis une facture de vente ou prestation — règlement à venir",
          color: 'emerald',
        },
        {
          bookingType: 'Facture client',
          operationType: 'Paiement reçu client',
          label: '✅ Paiement reçu d\'un client',
          desc: "J'ai encaissé un règlement client — virement, chèque, espèces ou mobile money",
          color: 'green',
        },
        {
          bookingType: 'Rapport de vente',
          operationType: 'Revenu / Vente',
          label: '📊 Rapport de ventes (système externe)',
          desc: "Chiffre d'affaires importé depuis une caisse, e-commerce ou autre système",
          color: 'emerald',
        },
      ],
    },
    {
      group: '🏦 Financements & Apports',
      items: [
        {
          bookingType: 'Prêt bancaire',
          operationType: 'Financement reçu',
          label: '🏦 Emprunt / Prêt bancaire reçu',
          desc: "Encaissement d'un prêt bancaire ou ligne de crédit",
          color: 'blue',
        },
        {
          bookingType: 'Apport capital',
          operationType: 'Apport en capital',
          label: '💼 Apport en capital / Compte courant associé',
          desc: "Apport des associés ou actionnaires (capital, CCA)",
          color: 'purple',
        },
        {
          bookingType: 'Autre revenu',
          operationType: 'Autre revenu',
          label: '📥 Subvention / Indemnité / Remboursement reçu',
          desc: "Subvention publique, remboursement d'assurance, indemnité, avoir fournisseur",
          color: 'teal',
        },
      ],
    },
    {
      group: '📋 Divers',
      items: [
        {
          bookingType: 'Autre',
          operationType: 'Autre / Divers',
          label: '📋 Autre revenu / Écriture diverse',
          desc: "Virement interne, dépôt, ou tout encaissement non classifié",
          color: 'gray',
        },
      ],
    },
  ],
};

const COLOR_IDLE = {
  green:   'border-green-200 bg-white hover:bg-green-50 hover:border-green-400 text-gray-700',
  amber:   'border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-400 text-gray-700',
  blue:    'border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-400 text-gray-700',
  emerald: 'border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-400 text-gray-700',
  purple:  'border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-400 text-gray-700',
  red:     'border-red-200 bg-white hover:bg-red-50 hover:border-red-400 text-gray-700',
  teal:    'border-teal-200 bg-white hover:bg-teal-50 hover:border-teal-400 text-gray-700',
  gray:    'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700',
};
const COLOR_ACTIVE = {
  green:   'border-green-600 bg-green-600 text-white',
  amber:   'border-amber-500 bg-amber-500 text-white',
  blue:    'border-blue-600 bg-blue-600 text-white',
  emerald: 'border-emerald-600 bg-emerald-600 text-white',
  purple:  'border-purple-700 bg-purple-700 text-white',
  red:     'border-red-600 bg-red-600 text-white',
  teal:    'border-teal-600 bg-teal-600 text-white',
  gray:    'border-gray-600 bg-gray-600 text-white',
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

  // derived: which scenario is currently selected
  const scenarios = SCENARIOS[transaction.type] || SCENARIOS['Dépense'];
  const selectedScenario = scenarios.flatMap(g => g.items).find(
    s => s.bookingType === bookingType && s.operationType === operationType
  );

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
      let generated = getEntries(transaction);
      try {
        const aiResult = await meras.integrations.Core.InvokeLLM({
          prompt: `Tu es expert-comptable à Djibouti (plan NPCG). Génère les écritures comptables pour:
Type: ${transaction.type}, Catégorie: ${transaction.category || 'N/A'}
Nature de l'opération: ${operationType}
Type de document: ${bookingType}
Description: ${transaction.description}
Montant HT: ${transaction.amount} DJF, TVA: ${transaction.tax_amount || 0} DJF, Total TTC: ${transaction.total_amount || transaction.amount} DJF
Méthode paiement: ${transaction.payment_method || 'N/A'}
Retourne UNIQUEMENT du JSON valide: {"entries":[{"compte":"XXX","label":"...","debit":0,"credit":0}]}
IMPORTANT: total débit DOIT égaler total crédit.`,
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

      setEntries(generated);
      setStep(3);
      setOpen({ 1: false, 2: false, 3: true, 4: false });
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      await persist({
        booking_status: 'booked',
        booking_type: bookingType,
        operation_type: operationType,
        journal_entries: entries,
        booked_at: new Date().toISOString(),
      });
      setStep(4);
      setOpen({ 1: false, 2: false, 3: false, 4: true });
      toast.success('✅ Écriture comptable enregistrée');
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
      toast.success('✅ Paiement enregistré');
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

  const relevantOpTypes = OPERATION_TYPES.filter(op => op.forTypes.includes(transaction.type));
  const docTypes = DOCUMENT_TYPES[transaction.type] || DOCUMENT_TYPES['Dépense'];

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
    <div className="space-y-3">
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

      {/* STEP 1 — Type de document + Nature de l'opération */}
      <div className="space-y-2">
        <StepHeader num={1} title="Type de document & nature de l'opération" done={step > 1} active={step === 1} />
        {open[1] && (
          <div className="pl-3 space-y-4">

            {/* Document type */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">📎 Type de document</p>
              <div className="space-y-1.5">
                {docTypes.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setBookingType(opt.key)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition border ${
                      bookingType === opt.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-200 hover:border-blue-400 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className={`text-xs mt-0.5 ${bookingType === opt.key ? 'text-blue-100' : 'text-gray-400'}`}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Operation type */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">🔖 Nature de l'opération</p>
              <div className="space-y-1.5">
                {relevantOpTypes.map(op => {
                  const selected = operationType === op.key;
                  return (
                    <button
                      key={op.key}
                      onClick={() => setOperationType(op.key)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition border-2 ${
                        selected ? colorMapSelected[op.color] : colorMap[op.color]
                      }`}
                    >
                      <div className="font-medium">{op.label}</div>
                      <div className={`text-xs mt-0.5 ${selected ? 'opacity-80' : 'opacity-70'}`}>{op.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

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
    </div>
  );
}