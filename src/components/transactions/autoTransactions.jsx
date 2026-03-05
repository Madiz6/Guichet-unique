/**
 * Utility helpers to automatically register transactions when financial
 * operations occur in other modules (Paie, Declarations, Leasing, etc.)
 */
import { meras } from "@/components/core/MerasClient";
import { format } from "date-fns";

/**
 * Creates a Transaction record. Silently swallows errors so it never
 * breaks the caller's main flow.
 */
async function safeCreate(data) {
  try {
    await meras.entities.Transaction.create({
      status: "En attente",
      auto_generated: true,
      ...data,
    });
  } catch (e) {
    console.warn("[autoTransactions] Failed to auto-create transaction:", e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   PAIE
──────────────────────────────────────────────────────────────*/

/**
 * Called when a PayrollCycle is created.
 * Registers the total net salary as a pending expense.
 */
export async function registerPayrollTransaction(cycle) {
  const date = cycle.date_paiement || format(new Date(), "yyyy-MM-dd");
  await safeCreate({
    date,
    description: `Salaires — ${cycle.periode}`,
    contact_name: `${cycle.nombre_employes} employé(s)`,
    amount: cycle.salaire_net_total || 0,
    total_amount: cycle.salaire_net_total || 0,
    type: "Dépense",
    source: "Paie",
    source_id: cycle.id,
    category: "Salaires",
    accounting_period: cycle.mois_annee,
    notes: `Cycle de paie — ${cycle.periode} — ${cycle.nombre_employes} employés`,
  });
}

/**
 * Called when a PayrollCycle is marked as Payé.
 * Updates the matching pending transaction to Payé.
 */
export async function markPayrollTransactionPaid(cycle, paymentData = {}) {
  try {
    const existing = await meras.entities.Transaction.filter({
      source: "Paie",
      source_id: cycle.id,
    });
    if (existing.length > 0) {
      await meras.entities.Transaction.update(existing[0].id, {
        status: "Payé",
        payment_method: paymentData.payment_method || "Virement",
        notes: `Paiement effectué — transaction Meras: ${paymentData.transaction_id || "N/A"}`,
      });
    } else {
      // No existing transaction — create a paid one directly
      const date = cycle.date_paiement || format(new Date(), "yyyy-MM-dd");
      await safeCreate({
        date,
        description: `Salaires — ${cycle.periode}`,
        contact_name: `${cycle.nombre_employes} employé(s)`,
        amount: cycle.salaire_net_total || 0,
        total_amount: cycle.salaire_net_total || 0,
        type: "Dépense",
        source: "Paie",
        source_id: cycle.id,
        category: "Salaires",
        accounting_period: cycle.mois_annee,
        status: "Payé",
        payment_method: paymentData.payment_method || "Virement",
        notes: `Paiement effectué — transaction Meras: ${paymentData.transaction_id || "N/A"}`,
      });
    }
  } catch (e) {
    console.warn("[autoTransactions] markPayrollTransactionPaid error:", e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   DECLARATIONS CNSS / ITS
──────────────────────────────────────────────────────────────*/

/**
 * Called when a Declaration is created.
 * Registers CNSS + ITS as a pending expense.
 */
export async function registerDeclarationTransaction(declaration) {
  const date = declaration.date_limite || format(new Date(), "yyyy-MM-dd");
  await safeCreate({
    date,
    description: `Déclaration CNSS/ITS — ${declaration.periode}`,
    contact_name: "CNSS",
    amount: declaration.total || 0,
    total_amount: declaration.total || 0,
    type: "Dépense",
    source: "Declaration CNSS",
    source_id: declaration.id,
    category: "Charges sociales",
    accounting_period: declaration.periode?.replace(/\s/g, ""),
    notes: `N° cotisation: ${declaration.numero_cotisation} — Régime: ${declaration.regime}`,
  });
}

/**
 * Called when a Declaration is marked as Payée.
 */
export async function markDeclarationTransactionPaid(declaration, paymentData = {}) {
  try {
    const existing = await meras.entities.Transaction.filter({
      source: "Declaration CNSS",
      source_id: declaration.id,
    });
    if (existing.length > 0) {
      await meras.entities.Transaction.update(existing[0].id, {
        status: "Payé",
        payment_method: paymentData.payment_method || "Virement",
        notes: `Payé le ${format(new Date(), "dd/MM/yyyy")} — transaction: ${paymentData.transaction_id || "N/A"}`,
      });
    } else {
      const date = declaration.date_paiement || format(new Date(), "yyyy-MM-dd");
      await safeCreate({
        date,
        description: `Déclaration CNSS/ITS — ${declaration.periode}`,
        contact_name: "CNSS",
        amount: declaration.total || 0,
        total_amount: declaration.total || 0,
        type: "Dépense",
        source: "Declaration CNSS",
        source_id: declaration.id,
        category: "Charges sociales",
        status: "Payé",
        payment_method: paymentData.payment_method || "Virement",
        notes: `N° cotisation: ${declaration.numero_cotisation} — Payé le ${format(new Date(), "dd/MM/yyyy")}`,
      });
    }
  } catch (e) {
    console.warn("[autoTransactions] markDeclarationTransactionPaid error:", e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   LOCATION (Lease payments)
──────────────────────────────────────────────────────────────*/

/**
 * Called when a LeasePayment is marked as Payé.
 * Registers the rent income.
 */
export async function registerLeasePaymentTransaction(leasePayment, lease, asset) {
  await safeCreate({
    date: leasePayment.date_paiement || format(new Date(), "yyyy-MM-dd"),
    description: `Loyer — ${asset?.nom || "Actif"} — ${leasePayment.periode}`,
    contact_name: lease?.locataire_nom || "",
    amount: leasePayment.montant || 0,
    total_amount: leasePayment.montant || 0,
    type: "Revenu",
    source: "Location",
    source_id: leasePayment.id,
    category: "Revenus locatifs",
    payment_method: leasePayment.methode_paiement || "Virement",
    status: "Payé",
    notes: `Loyer — contrat: ${lease?.numero_contrat || "N/A"} — ${leasePayment.periode}`,
  });
}