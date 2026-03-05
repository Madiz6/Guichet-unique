/**
 * Ledger Engine — Auto-generates double-entry bookkeeping entries.
 * Follows French PCG adapted for Djibouti.
 *
 * NOTE: The canonical PCG rules and journal mappings live in autoTransactions.
 * This hook is used directly in the Comptabilite page for manual/UI-driven entries.
 */

import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export const PCG_RULES = {
  payroll:          [{ account_code: "641", account_name: "Rémunérations du personnel", side: "debit" }, { account_code: "421", account_name: "Personnel — Rémunérations dues", side: "credit" }],
  payroll_payment:  [{ account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  cnss_employer:    [{ account_code: "645", account_name: "Charges de sécurité sociale (CNSS employeur)", side: "debit" }, { account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "credit" }],
  cnss_employee:    [{ account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" }, { account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "credit" }],
  its:              [{ account_code: "421", account_name: "Personnel — Rémunérations dues", side: "debit" }, { account_code: "447", account_name: "Autres impôts et taxes (ITS)", side: "credit" }],
  cnss_payment:     [{ account_code: "431", account_name: "Sécurité sociale (CNSS)", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  its_payment:      [{ account_code: "447", account_name: "Autres impôts et taxes (ITS)", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  purchase_invoice: [{ account_code: "606", account_name: "Achats non stockés de matières et fournitures", side: "debit" }, { account_code: "401", account_name: "Fournisseurs", side: "credit" }],
  debt_payment:     [{ account_code: "401", account_name: "Fournisseurs", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  loan_repayment:   [{ account_code: "164", account_name: "Emprunts auprès des établissements de crédit", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  lease_revenue:    [{ account_code: "411", account_name: "Clients", side: "debit" }, { account_code: "706", account_name: "Prestations de services", side: "credit" }],
  lease_payment:    [{ account_code: "512", account_name: "Banques", side: "debit" }, { account_code: "411", account_name: "Clients", side: "credit" }],
  expense:          [{ account_code: "606", account_name: "Achats non stockés de matières et fournitures", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
  bank_import:      [{ account_code: "606", account_name: "Achats non stockés", side: "debit" }, { account_code: "512", account_name: "Banques", side: "credit" }],
};

export const JOURNAL_MAP = {
  payroll: "SAL", payroll_payment: "SAL",
  cnss_employer: "CNSS", cnss_employee: "CNSS", its: "CNSS",
  cnss_payment: "CNSS", its_payment: "CNSS",
  purchase_invoice: "ACH", debt_payment: "ACH",
  loan_repayment: "BNQ",
  lease_revenue: "VTE", lease_payment: "BNQ",
  expense: "OD", bank_import: "BNQ",
};

/**
 * Generate and save ledger entries for a given transaction object.
 * Compatible with the Comptabilite page (passes a full transaction object).
 *
 * @param {object} transaction - the source transaction object (must have id, amount/montant, date/date_transaction)
 * @param {string} transactionType - key from PCG_RULES
 * @param {string} sourceModule - module name (payroll, purchase, cnss, lease, manual, etc.)
 */
export async function generateLedgerEntries(transaction, transactionType, sourceModule) {
  const rules = PCG_RULES[transactionType];
  if (!rules) {
    console.warn(`[LedgerEngine] No PCG rules found for type: ${transactionType}`);
    return;
  }

  const journalType = JOURNAL_MAP[transactionType] || "OD";
  const amount = transaction.montant || transaction.amount || transaction.payment_amount || 0;
  const date = transaction.date_transaction || transaction.payment_date || transaction.date || format(new Date(), "yyyy-MM-dd");
  const libelle = transaction.description || transaction.libelle || `${transactionType} — ${transaction.id}`;
  const period = date.slice(0, 7).replace("-", "");
  const fiscalYear = date.slice(0, 4);

  for (const rule of rules) {
    try {
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
        fiscal_year: fiscalYear,
      });
    } catch (e) {
      console.warn("[LedgerEngine] Failed to create entry:", e.message);
    }
  }
}

export default { generateLedgerEntries, PCG_RULES, JOURNAL_MAP };