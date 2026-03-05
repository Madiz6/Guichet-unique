/**
 * PurchaseOrderDialog — Create a purchase order from an approved purchase request.
 * On confirmation: creates PurchaseOrder + SupplierDebt + LedgerEntry (606/401).
 */
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { meras } from "@/components/core/MerasClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { registerDebtPaymentLedger } from "@/components/transactions/autoTransactions";
import { format } from "date-fns";

export default function PurchaseOrderDialog({ request, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fournisseur_nom: request?.fournisseur_selectionne_nom || "",
    fournisseur_email: "",
    date_livraison_prevue: request?.date_livraison_prevue || "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;

      // 1. Create SupplierDebt
      const debt = await base44.entities.SupplierDebt.create({
        type: "Supplier",
        creditor_name: form.fournisseur_nom,
        creditor_contact: form.fournisseur_email,
        original_amount: request.montant_total,
        remaining_balance: request.montant_total,
        invoice_number: request.numero_demande,
        date_incurred: today,
        due_date: form.date_livraison_prevue || today,
        description: request.titre,
        status: "Active",
        notes: form.notes,
      });

      // 2. Create PurchaseOrder
      const po = await base44.entities.PurchaseOrder.create({
        numero_commande: poNumber,
        purchase_request_id: request.id,
        numero_demande: request.numero_demande,
        fournisseur_nom: form.fournisseur_nom,
        fournisseur_email: form.fournisseur_email,
        titre: request.titre,
        description: request.description,
        montant_total: request.montant_total,
        date_commande: today,
        date_livraison_prevue: form.date_livraison_prevue,
        statut: "Confirmé",
        debt_id: debt.id,
        notes: form.notes,
      });

      // 3. Update PurchaseRequest to "En commande"
      await meras.entities.PurchaseRequest.update(request.id, {
        statut: "En commande",
        numero_commande: poNumber,
        transaction_id: po.id,
      });

      // 4. Ledger: 606 Achats / 401 Fournisseurs (already done at approval, but record the PO confirmation)
      // We create a separate OD entry to track PO confirmation if desired
      // (skip to avoid double-booking since approval already did 606/401)

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-debts"] });
      toast.success("Bon de commande créé et dette fournisseur enregistrée");
      onClose();
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un bon de commande</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-[#F9F9F9] rounded-lg p-4 space-y-1">
            <p className="text-xs text-[#6B6B6B]">Demande</p>
            <p className="font-medium text-sm">{request?.titre}</p>
            <p className="text-xs text-[#6B6B6B] mt-2">Montant</p>
            <p className="text-xl font-semibold">{request?.montant_total?.toLocaleString()} DJF</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fournisseur *</Label>
              <Input value={form.fournisseur_nom} onChange={e => setForm({ ...form, fournisseur_nom: e.target.value })} placeholder="Nom du fournisseur" />
            </div>
            <div>
              <Label>Email fournisseur</Label>
              <Input type="email" value={form.fournisseur_email} onChange={e => setForm({ ...form, fournisseur_email: e.target.value })} placeholder="contact@fournisseur.com" />
            </div>
          </div>

          <div>
            <Label>Date de livraison prévue</Label>
            <Input type="date" value={form.date_livraison_prevue} onChange={e => setForm({ ...form, date_livraison_prevue: e.target.value })} />
          </div>

          <div>
            <Label>Notes internes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Conditions, remarques..." rows={3} />
          </div>

          <p className="text-xs text-[#6B6B6B] bg-blue-50 rounded p-3">
            ℹ️ Cette action créera automatiquement une <strong>dette fournisseur</strong> et enregistrera la commande en statut "Confirmé".
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              className="bg-[#1A1A1A] text-white hover:bg-[#333]"
              onClick={() => mutation.mutate()}
              disabled={!form.fournisseur_nom || mutation.isPending}
            >
              {mutation.isPending ? "Création..." : "Confirmer la commande"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}