import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, ChevronUp, BookOpen, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Default journal entry templates per transaction type + category
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

const BOOKING_OPTIONS = {
  'Dépense': [
    { key: 'Facture fournisseur', label: '📄 Facture fournisseur' },
    { key: 'Note de frais', label: '🧾 Note de frais / Reçu' },
    { key: 'Paie', label: '👥 Bulletin de paie' },
    { key: 'Banque', label: '🏦 Relevé bancaire' },
    { key: 'Autre', label: '📋 Autre écriture' },
  ],
  'Revenu': [
    { key: 'Facture client', label: '💰 Facture client' },
    { key: 'Banque', label: '🏦 Relevé bancaire' },
    { key: 'Autre', label: '📋 Autre écriture' },
  ],
};

export default function BookingWorkflow({ transaction, onTransactionUpdated }) {
  const isBooked = !!transaction.booking_status;
  const isPaymentDone = !!transaction.payment_registered;

  const [step, setStep] = useState(isBooked ? 4 : 1);
  const [open, setOpen] = useState({ 1: !isBooked, 2: false, 3: false, 4: isBooked });
  const [bookingType, setBookingType] = useState(transaction.booking_type || '');
  const [entries, setEntries] = useState(transaction.journal_entries || null);
  const [loading, setLoading] = useState(false);

  const toggle = (n) => setOpen(prev => ({ ...prev, [n]: !prev[n] }));

  // Central save: writes to DB, then notifies parent with the full updated record
  const persist = async (fields) => {
    const updated = await meras.entities.Transaction.update(transaction.id, {
      ...transaction,
      ...fields,
    });
    onTransactionUpdated(updated);
    return updated;
  };

  // Step 1 → pick document type
  const handlePickType = (type) => {
    setBookingType(type);
    setStep(2);
    setOpen({ 1: false, 2: true, 3: false, 4: false });
  };

  // Step 2 → generate journal entries (template + AI polish)
  const handleGenerateEntries = async () => {
    setLoading(true);
    try {
      let generated = getEntries(transaction);

      try {
        const aiResult = await meras.integrations.Core.InvokeLLM({
          prompt: `Tu es expert-comptable à Djibouti (plan NPCG). Génère les écritures comptables pour:
Type: ${transaction.type}, Catégorie: ${transaction.category || 'N/A'}
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
      } catch (_) { /* fallback to template */ }

      setEntries(generated);
      setStep(3);
      setOpen({ 1: false, 2: false, 3: true, 4: false });
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → book the entry
  const handleBook = async () => {
    setLoading(true);
    try {
      await persist({
        booking_status: 'booked',
        booking_type: bookingType,
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

  // Step 4 → register payment
  const handleRegisterPayment = async () => {
    setLoading(true);
    try {
      await persist({
        payment_registered: true,
        status: 'Payé',
      });
      toast.success('✅ Paiement enregistré');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset booking
  const handleReset = async () => {
    setLoading(true);
    try {
      await persist({
        booking_status: null,
        booking_type: null,
        journal_entries: null,
        payment_registered: false,
        booked_at: null,
        status: null,
      });
      setStep(1);
      setBookingType('');
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
    <div className="space-y-3">
      {isBooked && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800">Transaction comptabilisée</span>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={handleReset} disabled={loading} className="text-gray-500 h-7 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Annuler
          </Button>
        </div>
      )}

      {/* STEP 1 */}
      <div className="space-y-2">
        <StepHeader num={1} title="Type de document" done={step > 1} active={step === 1} />
        {open[1] && (
          <div className="pl-3 space-y-2">
            {(BOOKING_OPTIONS[transaction.type] || BOOKING_OPTIONS['Dépense']).map(opt => (
              <button
                key={opt.key}
                onClick={() => handlePickType(opt.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition border ${
                  bookingType === opt.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-200 hover:border-blue-400 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* STEP 2 */}
      <div className="space-y-2">
        <StepHeader num={2} title={bookingType ? `Document: ${bookingType}` : 'Créer le document'} done={step > 2} active={step === 2} />
        {open[2] && step >= 2 && (
          <div className="pl-3 space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-gray-500">Type:</span><strong>{bookingType}</strong></div>
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

      {/* STEP 3 */}
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

      {/* STEP 4 */}
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <strong>Solde à régler:</strong> {(transaction.total_amount || transaction.amount)?.toLocaleString()} DJF
                  {transaction.payment_method && <> via <strong>{transaction.payment_method}</strong></>}
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