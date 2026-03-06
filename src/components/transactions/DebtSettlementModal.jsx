import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Map debt operation types to their settlement journal entries (closing the open account)
const SETTLEMENT_ENTRIES = {
  'Dette fournisseur': { debit: '401', debitLabel: 'Fournisseurs', credit: '512', creditLabel: 'Banque' },
  'Dette employé':     { debit: '455', debitLabel: 'Employé', credit: '512', creditLabel: 'Banque / Espèces' },
  'Dette partenaire':  { debit: '101', debitLabel: 'Capital / Partenaire', credit: '512', creditLabel: 'Banque' },
  'Dette banque':      { debit: '164', debitLabel: 'Emprunt', credit: '512', creditLabel: 'Banque' },
  'Dette investisseur':{ debit: '512', debitLabel: 'Banque', credit: '101', creditLabel: 'Capital' },
};

export default function DebtSettlementModal({ debt, open, onClose, onSettled }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Virement',
    notes: '',
  });

  const amount = debt?.total_amount || debt?.amount || 0;
  const entryTemplate = SETTLEMENT_ENTRIES[debt?.operation_type] || { debit: '401', debitLabel: 'Fournisseurs', credit: '512', creditLabel: 'Banque' };

  const handleSettle = async () => {
    setLoading(true);
    try {
      const settlementEntries = [
        { compte: entryTemplate.debit, label: entryTemplate.debitLabel, debit: amount, credit: 0 },
        { compte: entryTemplate.credit, label: entryTemplate.creditLabel, debit: 0, credit: amount },
      ];

      // 1. Create the settlement transaction
      const settlement = await meras.entities.Transaction.create({
        date: form.date,
        description: `Règlement dette — ${debt.description}`,
        contact_name: debt.contact_name,
        amount: amount,
        total_amount: amount,
        type: 'Dépense',
        source: 'Manuel',
        category: debt.category,
        department: debt.department,
        payment_method: form.payment_method,
        status: 'Payé',
        notes: form.notes || `Règlement de la dette enregistrée le ${debt.date}`,
        is_settlement: true,
        linked_debt_id: debt.id,
        booking_status: 'booked',
        booking_type: 'Règlement dette',
        operation_type: 'Dépense payée',
        journal_entries: settlementEntries,
        booked_at: new Date().toISOString(),
        payment_registered: true,
      });

      // 2. Update original debt transaction as settled
      await meras.entities.Transaction.update(debt.id, {
        payment_registered: true,
        status: 'Payé',
        linked_settlement_id: settlement.id,
      });

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('✅ Dette réglée — écritures comptables générées');
      onSettled(settlement);
      onClose();
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💳 Régler la dette</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debt summary */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-amber-600">Créancier:</span><strong>{debt.contact_name || '—'}</strong></div>
            <div className="flex justify-between"><span className="text-amber-600">Description:</span><strong className="text-right max-w-[60%] truncate">{debt.description}</strong></div>
            <div className="flex justify-between border-t border-amber-200 pt-1 mt-1"><span className="text-amber-700 font-semibold">Montant à régler:</span><strong className="text-amber-700 text-base">{amount.toLocaleString()} DJF</strong></div>
          </div>

          {/* Settlement form */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Date de paiement</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Méthode de paiement</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Virement', 'Chèque', 'Espèces', 'Carte bancaire', 'Mobile Money'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Notes (optionnel)</Label>
              <Input placeholder="Référence virement, numéro chèque..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Auto-generated journal entries preview */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Écriture générée automatiquement</p>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-green-700">D: {entryTemplate.debit} — {entryTemplate.debitLabel}</span>
                <span className="font-bold">{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">C: {entryTemplate.credit} — {entryTemplate.creditLabel}</span>
                <span className="font-bold">{amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Annuler</Button>
            <Button onClick={handleSettle} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirmer le règlement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}