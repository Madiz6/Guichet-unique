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
   DÉPENSES (Expense module)
──────────────────────────────────────────────────────────────*/

/**
 * Called when an Expense is created.
 * Registers it as a pending expense transaction.
 */
export async function registerExpenseTransaction(expense, categoryName = '') {
  await safeCreate({
    date: expense.date_transaction || format(new Date(), 'yyyy-MM-dd'),
    description: expense.description,
    contact_name: expense.fournisseur || '',
    amount: expense.montant || 0,
    total_amount: expense.montant || 0,
    type: 'Dépense',
    source: 'Autre',
    source_id: expense.id,
    category: categoryName || 'Dépense',
    payment_method: expense.methode_paiement || 'Virement',
    status: expense.statut === 'Payé' ? 'Payé' : 'En attente',
    notes: `Ref: ${expense.numero || '—'} — ${categoryName}`,
  });
}

/**
 * Called when an Expense status changes to Payé.
 */
export async function markExpenseTransactionPaid(expense) {
  try {
    const existing = await meras.entities.Transaction.filter({ source: 'Autre', source_id: expense.id });
    if (existing.length > 0) {
      await meras.entities.Transaction.update(existing[0].id, {
        status: 'Payé',
        payment_method: expense.methode_paiement || 'Virement',
      });
    }
  } catch (e) {
    console.warn('[autoTransactions] markExpenseTransactionPaid error:', e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   AUTRES SERVICES (Visa, Mail, Réceptionniste, etc.)
──────────────────────────────────────────────────────────────*/

/**
 * Called when a service contract/payment is created.
 * Use for: MailServiceContract, VirtualReceptionistContract, VisaApplication, etc.
 * @param {object} params - { date, description, contact_name, amount, service_type, source_id, payment_method }
 */
export async function registerServiceTransaction({ date, description, contact_name, amount, service_type, source_id, payment_method, status = 'En attente', is_revenue = false }) {
  await safeCreate({
    date: date || format(new Date(), 'yyyy-MM-dd'),
    description,
    contact_name: contact_name || '',
    amount: amount || 0,
    total_amount: amount || 0,
    type: is_revenue ? 'Revenu' : 'Dépense',
    source: 'Autre',
    source_id: source_id || '',
    category: service_type || 'Service',
    payment_method: payment_method || 'Virement',
    status,
    notes: `Service: ${service_type} — ${description}`,
  });
}

/* ─────────────────────────────────────────────────────────────
   PRÊTS & FINANCEMENT (Loan, Shareholder, Capital)
──────────────────────────────────────────────────────────────*/

/**
 * Called when a Loan is received (décaissement).
 * Registers it as a revenue/financing transaction.
 */
export async function registerLoanReceivedTransaction(loan) {
  await safeCreate({
    date: loan.date_debut || format(new Date(), 'yyyy-MM-dd'),
    description: `Prêt reçu — ${loan.banque || loan.preteur || 'Banque'}`,
    contact_name: loan.banque || loan.preteur || '',
    amount: loan.montant || 0,
    total_amount: loan.montant || 0,
    type: 'Revenu',
    source: 'Prêt Bancaire',
    source_id: loan.id,
    category: 'Financement',
    payment_method: 'Virement',
    status: 'Payé',
    is_financing: true,
    notes: `Prêt — taux: ${loan.taux_interet || 0}% — durée: ${loan.duree_mois || '?'} mois`,
  });
}

/**
 * Called when a Loan repayment (remboursement) is made.
 */
export async function registerLoanRepaymentTransaction(loan, repaymentAmount, repaymentDate) {
  await safeCreate({
    date: repaymentDate || format(new Date(), 'yyyy-MM-dd'),
    description: `Remboursement prêt — ${loan.banque || loan.preteur || 'Banque'}`,
    contact_name: loan.banque || loan.preteur || '',
    amount: repaymentAmount || 0,
    total_amount: repaymentAmount || 0,
    type: 'Dépense',
    source: 'Remboursement Prêt',
    source_id: loan.id,
    category: 'Remboursement',
    payment_method: 'Virement',
    status: 'Payé',
    is_financing: true,
    notes: `Remboursement — prêt: ${loan.id}`,
  });
}

/**
 * Called when a Shareholder makes a capital contribution.
 */
export async function registerShareholderContributionTransaction(shareholder, amount, date) {
  await safeCreate({
    date: date || format(new Date(), 'yyyy-MM-dd'),
    description: `Apport en capital — ${shareholder.nom || shareholder.prenom_nom || 'Associé'}`,
    contact_name: shareholder.nom || shareholder.prenom_nom || '',
    amount: amount || 0,
    total_amount: amount || 0,
    type: 'Revenu',
    source: 'Apport Capital',
    source_id: shareholder.id,
    category: 'Capital',
    payment_method: 'Virement',
    status: 'Payé',
    is_financing: true,
    shareholder_id: shareholder.id,
    notes: `Apport capital — associé: ${shareholder.nom || '—'}`,
  });
}

/* ─────────────────────────────────────────────────────────────
   LOCATION (Lease payments)
──────────────────────────────────────────────────────────────*/

/**
 * Called when a LeasePayment is marked as Payé.
 * Registers the rent income.
 */
export async function registerLeasePaymentTransaction(leasePayment, lease, asset) {
  try {
    // Check if a transaction already exists for this payment to avoid duplicates
    const existing = await meras.entities.Transaction.filter({
      source: "Location",
      source_id: leasePayment.id,
    });
    if (existing.length > 0) {
      await meras.entities.Transaction.update(existing[0].id, {
        status: "Payé",
        payment_method: leasePayment.methode_paiement || "Virement",
      });
      return existing[0];
    }
    const created = await meras.entities.Transaction.create({
      status: "Payé",
      auto_generated: true,
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
      notes: `Loyer — contrat: ${lease?.numero_contrat || "N/A"} — ${leasePayment.periode}`,
    });
    return created;
  } catch (e) {
    console.warn("[autoTransactions] registerLeasePaymentTransaction error:", e.message);
  }
}