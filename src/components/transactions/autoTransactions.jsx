/**
 * Utility helpers to automatically register transactions when financial
 * operations occur in other modules (Paie, Declarations, Leasing, etc.)
 * Also hooks into the Ledger Engine for automatic double-entry bookkeeping.
 */
import { meras } from "@/components/core/MerasClient";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// ─── Ledger Engine ────────────────────────────────────────────────────────────
const PCG_RULES = {
  payroll:          [{ account_code: "641", account_name: "Rémunérations du personnel", side: "debit" }, { account_code: "421", account_name: "Personnel — Rémunérations dues", side: "credit" }],
  payroll_payment:  [{ account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  cnss_employer:    [{ account_code: "645", account_name: "Charges de sécurité sociale (CNSS employeur)", side: "debit" }, { account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "credit" }],
  cnss_payment:     [{ account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  its_payment:      [{ account_code: "447", account_name: "Autres impôts et taxes (ITS)", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  purchase_invoice: [{ account_code: "606", account_name: "Achats non stockés de matières et fournitures", side: "debit" }, { account_code: "401", account_name: "Fournisseurs", side: "credit" }],
  debt_payment:     [{ account_code: "401", account_name: "Fournisseurs", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  lease_revenue:    [{ account_code: "411", account_name: "Clients", side: "debit" }, { account_code: "706", account_name: "Prestations de services", side: "credit" }],
  lease_payment:    [{ account_code: "512", account_name: "Banques", side: "debit" }, { account_code: "411", account_name: "Clients", side: "credit" }],
};

const JOURNAL_MAP = {
  payroll: "SAL", payroll_payment: "SAL",
  cnss_employer: "CNSS", cnss_payment: "CNSS", its_payment: "CNSS",
  purchase_invoice: "ACH", debt_payment: "ACH",
  lease_revenue: "VTE", lease_payment: "BNQ",
};

async function generateLedgerEntries(transactionId, amount, date, libelle, type, sourceModule, pieceRef = "") {
  const rules = PCG_RULES[type];
  if (!rules || !amount || amount <= 0) return;
  const journalType = JOURNAL_MAP[type] || "OD";
  const period = date?.slice(0, 7)?.replace("-", "") || format(new Date(), "yyyyMM");
  const fiscalYear = date?.slice(0, 4) || new Date().getFullYear().toString();
  for (const rule of rules) {
    try {
      await base44.entities.LedgerEntry.create({
        transaction_id: transactionId,
        entry_date: date,
        journal_type: journalType,
        account_code: rule.account_code,
        account_name: rule.account_name,
        debit: rule.side === "debit" ? amount : 0,
        credit: rule.side === "credit" ? amount : 0,
        libelle,
        piece_ref: pieceRef,
        entry_type: "system",
        source_module: sourceModule,
        is_reversed: false,
        period,
        fiscal_year: fiscalYear,
      });
    } catch (e) {
      console.warn("[Ledger] Failed to create entry:", e.message);
    }
  }
}

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
  // ── Ledger: 641 Rémunérations / 421 Personnel dû
  await generateLedgerEntries(cycle.id, cycle.salaire_brut_total || cycle.salaire_net_total || 0, date, `Salaires — ${cycle.periode}`, "payroll", "payroll");
  // ── Ledger: 645 CNSS patronale / 431 CNSS
  if (cycle.charges_patronales_total > 0) {
    await generateLedgerEntries(`${cycle.id}-cnss-pat`, cycle.charges_patronales_total, date, `CNSS patronale — ${cycle.periode}`, "cnss_employer", "payroll");
  }
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
    // ── Ledger: 421 Personnel dû / 512 Banque (paiement effectif)
    const payDate = cycle.date_paiement || format(new Date(), "yyyy-MM-dd");
    await generateLedgerEntries(`${cycle.id}-pay`, cycle.salaire_net_total || 0, payDate, `Paiement salaires — ${cycle.periode}`, "payroll_payment", "payroll");
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