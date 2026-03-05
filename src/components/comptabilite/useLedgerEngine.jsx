/**
 * Ledger Engine — Auto-generates double-entry bookkeeping entries
 * based on transaction type and source module.
 * Follows French PCG adapted for Djibouti.
 */

import { base44 } from "@/api/base44Client";

// PCG Account mappings per transaction type
const PCG_RULES = {
  // Payroll: Débit 641 Rémunérations / Crédit 421 Personnel dû
  payroll: [
    { account_code: "641", account_name: "Rémunérations du personnel", side: "debit" },
    { account_code: "421", account_name: "Personnel — Rémunérations dues", side: "credit" }
  ],
  // Payroll payment: Débit 421 / Crédit 512 Banque
  payroll_payment: [
    { account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" },
    { account_code: "512", account_name: "Banques", side: "credit" }
  ],
  // CNSS employer: Débit 645 / Crédit 431
  cnss_employer: [
    { account_code: "645", account_name: "Charges de sécurité sociale (CNSS employeur)", side: "debit" },
    { account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "credit" }
  ],
  // CNSS employee: Débit 421 / Crédit 431
  cnss_employee: [
    { account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" },
    { account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "credit" }
  ],
  // ITS: Débit 421 / Crédit 447
  its: [
    { account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" },
    { account_code: "447", account_name: "Autres impôts et taxes (ITS)", side: "credit" }
  ],
  // Purchase request (accrual): Débit 606 / Crédit 401 Fournisseurs
  purchase_request: [
    { account_code: "606", account_name: "Achats non stockés de matières et fournitures", side: "debit" },
    { account_code: "401", account_name: "Fournisseurs", side: "credit" }
  ],
  // Supplier debt payment: Débit 401 / Crédit 512
  debt_payment: [
    { account_code: "401", account_name: "Fournisseurs", side: "debit" },
    { account_code: "512", account_name: "Banques", side: "credit" }
  ],
  // Loan repayment: Débit 164 Emprunts / Crédit 512
  loan_repayment: [
    { account_code: "164", account_name: "Emprunts auprès des établissements de crédit", side: "debit" },
    { account_code: "512", account_name: "Banques", side: "credit" }
  ],
  // Lease revenue: Débit 411 Clients / Crédit 706 Prestations
  lease_revenue: [
    { account_code: "411", account_name: "Clients", side: "debit" },
    { account_code: "706", account_name: "Prestations de services", side: "credit" }
  ],
  // Lease payment received: Débit 512 / Crédit 411
  lease_payment: [
    { account_code: "512", account_name: "Banques", side: "debit" },
    { account_code: "411", account_name: "Clients", side: "credit" }
  ],
  // General expense: Débit 606 / Crédit 512
  expense: [
    { account_code: "606", account_name: "Achats non stockés de matières et fournitures", side: "debit" },
    { account_code: "512", account_name: "Banques", side: "credit" }
  ],
  // Bank import (default): Débit 606 / Crédit 512 or reverse
  bank_import: [
    { account_code: "606", account_name: "Achats non stockés", side: "debit" },
    { account_code: "512", account_name: "Banques", side: "credit" }
  ]
};

const JOURNAL_MAP = {
  payroll: "SAL",
  payroll_payment: "SAL",
  cnss_employer: "CNSS",
  cnss_employee: "CNSS",
  its: "CNSS",
  purchase_request: "ACH",
  debt_payment: "ACH",
  loan_repayment: "BNQ",
  lease_revenue: "VTE",
  lease_payment: "BNQ",
  expense: "OD",
  bank_import: "BNQ"
};

/**
 * Generate and save ledger entries for a given transaction.
 * @param {object} transaction - the transaction object
 * @param {string} transactionType - key from PCG_RULES
 * @param {string} sourceModule - module name
 */
export async function generateLedgerEntries(transaction, transactionType, sourceModule) {
  const rules = PCG_RULES[transactionType];
  if (!rules) {
    console.warn(`No PCG rules found for type: ${transactionType}`);
    return;
  }

  const journalType = JOURNAL_MAP[transactionType] || "OD";
  const amount = transaction.montant || transaction.amount || transaction.payment_amount || 0;
  const date = transaction.date_transaction || transaction.payment_date || transaction.date || new Date().toISOString().split("T")[0];
  const libelle = transaction.description || transaction.libelle || `${transactionType} — ${transaction.id}`;
  const period = date.slice(0, 7).replace("-", "");
  const fiscalYear = date.slice(0, 4);

  for (const rule of rules) {
    await base44.entities.LedgerEntry.create({
      transaction_id: transaction.id,
      entry_date: date,
      journal_type: journalType,
      account_code: rule.account_code,
      account_name: rule.account_name,
      debit: rule.side === "debit" ? amount : 0,
      credit: rule.side === "credit" ? amount : 0,
      libelle,
      piece_ref: transaction.reference_number || transaction.numero || transaction.invoice_number || "",
      entry_type: "system",
      source_module: sourceModule,
      is_reversed: false,
      period,
      fiscal_year: fiscalYear
    });
  }
}

export { PCG_RULES, JOURNAL_MAP };