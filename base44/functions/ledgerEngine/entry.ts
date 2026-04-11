import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ===== TEMPLATE MAP =====
const TEMPLATES = {
  'Facture fournisseur à payer':    { journal: 'ACH',  debit: '6xxx', debit_label: 'Charges',            credit: '401',  credit_label: 'Fournisseurs',       creates_debt: true,  debt_type: 'Fournisseur' },
  'Facture fournisseur réglée':     { journal: 'ACH',  debit: '6xxx', debit_label: 'Charges',            credit: '512',  credit_label: 'Banque',             creates_debt: false },
  'Achat immédiat / reçu':          { journal: 'OD',   debit: '6xxx', debit_label: 'Charges',            credit: '53',   credit_label: 'Caisse / Banque',    creates_debt: false },
  'Salaires versés':                { journal: 'SAL',  debit: '641',  debit_label: 'Salaires',           credit: '43x',  credit_label: 'Charges sociales',   creates_debt: false },
  'Note de frais employé':          { journal: 'OD',   debit: '625',  debit_label: 'Frais divers',       credit: '455',  credit_label: 'Employé',            creates_debt: true,  debt_type: 'Employé' },
  'Remboursement emprunt bancaire': { journal: 'BNQ',  debit: '164',  debit_label: 'Emprunt bancaire',   credit: '512',  credit_label: 'Banque',             creates_debt: false },
  'Frais bancaires / prélèvements': { journal: 'BNQ',  debit: '627',  debit_label: 'Frais bancaires',    credit: '512',  credit_label: 'Banque',             creates_debt: false },
  'Déclaration CNSS/ITS':           { journal: 'CNSS', debit: '645',  debit_label: 'Charges sociales',   credit: '43x',  credit_label: 'Charges sociales',   creates_debt: true,  debt_type: 'Fiscal' },
  'Apport en capital':              { journal: 'BNQ',  debit: '512',  debit_label: 'Banque',             credit: '101',  credit_label: 'Capital',            creates_debt: false },
  'Facture client à encaisser':     { journal: 'VTE',  debit: '411',  debit_label: 'Clients',            credit: '7xx', credit_label: 'Ventes',             creates_debt: false },
  'Paiement client reçu':           { journal: 'VTE',  debit: '512',  debit_label: 'Banque',             credit: '411',  credit_label: 'Clients',            creates_debt: false },
  'Dette fournisseur':              { journal: 'ACH',  debit: '606',  debit_label: 'Achats',             credit: '401',  credit_label: 'Fournisseurs',       creates_debt: true,  debt_type: 'Fournisseur' },
  'Dette employé':                  { journal: 'OD',   debit: '455',  debit_label: 'Employé',            credit: '512',  credit_label: 'Banque',             creates_debt: true,  debt_type: 'Employé' },
  'Dette partenaire':               { journal: 'OD',   debit: '455',  debit_label: 'Partenaire',         credit: '101',  credit_label: 'Capital',            creates_debt: true,  debt_type: 'Partenaire' },
  'Dette banque / financement':     { journal: 'BNQ',  debit: '164',  debit_label: 'Emprunt bancaire',   credit: '512',  credit_label: 'Banque',             creates_debt: true,  debt_type: 'Banque' },
  'Dette investisseur':             { journal: 'BNQ',  debit: '512',  debit_label: 'Banque',             credit: '101',  credit_label: 'Capital',            creates_debt: true,  debt_type: 'Investisseur' },
};

function getAccountingPeriod(date) {
  const d = new Date(date);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, transaction_id, template_type, transaction, debt_id, payment_amount, payment_account } = body;

  // ===== ACTION: generateLedgerEntries =====
  if (action === 'generateLedgerEntries') {
    const tpl = TEMPLATES[template_type];
    if (!tpl) return Response.json({ error: `Template inconnu: ${template_type}` }, { status: 400 });

    const amount = Math.abs(transaction.amount || 0);
    const period = getAccountingPeriod(transaction.date);

    // Check TVA threshold: if revenue invoice crosses 10M cumulative, apply 10% TVA starting from this invoice
    let shouldApplyTVA = false;
    if (template_type === 'Facture client à encaisser' && transaction.tva_inclusion === 'INCLURE') {
      const allRevenue = await base44.asServiceRole.entities.Transaction.filter({ type: 'Revenu' }) || [];
      const cumulBefore = allRevenue
        .filter(t => t.id !== transaction_id && t.tva_inclusion === 'INCLURE')
        .reduce((s, t) => s + (t.amount || 0), 0);
      shouldApplyTVA = (cumulBefore + amount) >= 10_000_000;
    }

    const tvaAmount = shouldApplyTVA ? Math.round(amount * 0.1) : 0;
    const baseAmount = amount - tvaAmount;

    // For paid client invoices, create the revenue entry (Banque -> Ventes)
    const isPaidInvoice = template_type === 'Facture client à encaisser' && transaction.payment_status === 'Payé';
    const entry = await base44.asServiceRole.entities.LedgerEntry.create({
      transaction_id,
      date: transaction.date,
      journal: isPaidInvoice || shouldApplyTVA ? 'VTE' : tpl.journal,
      debit_account: isPaidInvoice || shouldApplyTVA ? '512' : tpl.debit,
      debit_account_label: isPaidInvoice || shouldApplyTVA ? 'Banque' : tpl.debit_label,
      credit_account: tpl.credit,
      credit_account_label: tpl.credit_label,
      amount: baseAmount || amount,
      description: transaction.description || template_type,
      category: transaction.category,
      department: transaction.department,
      contact_name: transaction.contact_name,
      status: isPaidInvoice || shouldApplyTVA ? 'Posted' : (tpl.creates_debt ? 'À comptabiliser' : 'Posted'),
      is_offset: false,
      accounting_period: period,
      reference: transaction.numero_facture || '',
      template_type,
    });

    // If TVA applies, create separate entry for tax liability
    if (shouldApplyTVA && tvaAmount > 0) {
      await base44.asServiceRole.entities.LedgerEntry.create({
        transaction_id,
        date: transaction.date,
        journal: 'VTE',
        debit_account: '512',
        debit_account_label: 'Banque',
        credit_account: '4457',
        credit_account_label: 'TVA à payer',
        amount: tvaAmount,
        description: `TVA 10% - ${transaction.description || template_type}`,
        category: transaction.category,
        department: transaction.department,
        contact_name: transaction.contact_name,
        status: 'Posted',
        is_offset: false,
        accounting_period: period,
        reference: transaction.numero_facture || '',
        template_type: 'TVA',
      });
    }

    // If creates a debt, create DebtCentralized record (only if none exists for this transaction)
    let debt = null;
    if (tpl.creates_debt && !isPaidInvoice && !shouldApplyTVA) {
      const existingDebts = await base44.asServiceRole.entities.DebtCentralized.filter({ transaction_id });
      if (existingDebts && existingDebts.length > 0) {
        debt = existingDebts[0];
      } else {
        debt = await base44.asServiceRole.entities.DebtCentralized.create({
          transaction_id,
          debt_type: tpl.debt_type,
          contact_name: transaction.contact_name || '',
          description: transaction.description || template_type,
          amount_due: amount,
          amount_paid: 0,
          amount_remaining: amount,
          status: 'Active',
          due_date: transaction.date_echeance || null,
          debit_account: tpl.debit,
          credit_account: tpl.credit,
          journal: tpl.journal,
          ledger_entry_id: entry.id,
          department: transaction.department || '',
        });
      }
    }

    // Update the transaction to mark it as booked
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      booking_status: 'Comptabilisé',
      booked_at: new Date().toISOString(),
      booking_type: template_type,
    });

    return Response.json({ success: true, ledger_entry: entry, debt, tva_applied: shouldApplyTVA, tva_amount: tvaAmount });
  }

  // ===== ACTION: markPayment =====
  if (action === 'markPayment') {
    const debt = await base44.asServiceRole.entities.DebtCentralized.filter({ transaction_id });
    if (!debt || debt.length === 0) return Response.json({ error: 'Dette introuvable' }, { status: 404 });
    const d = debt[0];

    const paid = Math.min(payment_amount || d.amount_remaining, d.amount_remaining);
    const newPaid = (d.amount_paid || 0) + paid;
    const newRemaining = d.amount_due - newPaid;
    const newStatus = newRemaining <= 0 ? 'Réglée' : 'Partiellement réglée';

    // Create offset (settlement) ledger entry — reverses the original
    const period = getAccountingPeriod(new Date().toISOString().split('T')[0]);
    const offsetEntry = await base44.asServiceRole.entities.LedgerEntry.create({
      transaction_id,
      date: new Date().toISOString().split('T')[0],
      journal: d.journal || 'OD',
      debit_account: d.credit_account,
      debit_account_label: 'Règlement',
      credit_account: payment_account || '512',
      credit_account_label: 'Banque',
      amount: paid,
      description: `Règlement — ${d.description}`,
      contact_name: d.contact_name,
      status: 'Posted',
      is_offset: true,
      offset_entry_id: d.ledger_entry_id,
      accounting_period: period,
      template_type: 'Règlement',
    });

    // Update debt
    await base44.asServiceRole.entities.DebtCentralized.update(d.id, {
      amount_paid: newPaid,
      amount_remaining: newRemaining,
      status: newStatus,
      payment_date: new Date().toISOString().split('T')[0],
      settlement_entry_id: offsetEntry.id,
    });

    // Mark transaction as paid
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      payment_registered: true,
      status: 'Payé',
    });

    return Response.json({ success: true, offset_entry: offsetEntry, debt_status: newStatus });
  }

  // ===== ACTION: getGrandLivre =====
  if (action === 'getGrandLivre') {
    const { period_start, period_end, journal, account } = body;
    let entries = await base44.asServiceRole.entities.LedgerEntry.list('-date', 500);

    if (period_start) entries = entries.filter(e => e.date >= period_start);
    if (period_end) entries = entries.filter(e => e.date <= period_end);
    if (journal) entries = entries.filter(e => e.journal === journal);
    if (account) entries = entries.filter(e => e.debit_account === account || e.credit_account === account);

    // Build trial balance
    const accounts = {};
    for (const e of entries) {
      if (!accounts[e.debit_account]) accounts[e.debit_account] = { account: e.debit_account, label: e.debit_account_label, debit: 0, credit: 0 };
      if (!accounts[e.credit_account]) accounts[e.credit_account] = { account: e.credit_account, label: e.credit_account_label, debit: 0, credit: 0 };
      accounts[e.debit_account].debit += e.amount;
      accounts[e.credit_account].credit += e.amount;
    }

    const trialBalance = Object.values(accounts).map(a => ({
      ...a,
      solde_debiteur: Math.max(0, a.debit - a.credit),
      solde_crediteur: Math.max(0, a.credit - a.debit),
    })).sort((a, b) => a.account.localeCompare(b.account));

    const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
    const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

    return Response.json({ entries, trial_balance: trialBalance, total_debit: totalDebit, total_credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 1 });
  }

  // ===== ACTION: backfillFromTransactions =====
  // Reads all booked transactions and creates missing LedgerEntry records
  if (action === 'backfillFromTransactions') {
    // Only admins can run backfill
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Get all booked transactions (any non-null booking_status)
    const allTransactions = await base44.asServiceRole.entities.Transaction.list('-date', 500);
    const booked = allTransactions.filter(t => t.booking_status && t.booking_status !== '');

    // Get existing ledger entries to avoid duplicates
    const existingEntries = await base44.asServiceRole.entities.LedgerEntry.list('-date', 1000);
    const existingTxIds = new Set(existingEntries.map(e => e.transaction_id));

    let created = 0;
    const errors = [];

    for (const tx of booked) {
      if (existingTxIds.has(tx.id)) continue; // already has ledger entry

      // Find the best matching template
      const templateKey = tx.booking_type || tx.operation_type || '';
      let tpl = TEMPLATES[templateKey];

      // Fuzzy match: try to find a template by partial name
      if (!tpl) {
        for (const [key, val] of Object.entries(TEMPLATES)) {
          if (templateKey.toLowerCase().includes(key.toLowerCase().split(' ')[0]) ||
              key.toLowerCase().includes(templateKey.toLowerCase().split(' ')[0])) {
            tpl = val;
            break;
          }
        }
      }

      // Final fallback based on transaction type
      if (!tpl) {
        if (tx.type === 'Revenu') {
          tpl = { journal: 'VTE', debit: '411', debit_label: 'Clients', credit: '706', credit_label: 'Ventes', creates_debt: false };
        } else {
          tpl = { journal: 'OD', debit: '606', debit_label: 'Charges', credit: '401', credit_label: 'Fournisseurs', creates_debt: false };
        }
      }

      const amount = Math.abs(tx.amount || 0);
      const period = getAccountingPeriod(tx.date || new Date().toISOString().split('T')[0]);

      try {
        const entry = await base44.asServiceRole.entities.LedgerEntry.create({
          transaction_id: tx.id,
          date: tx.date || new Date().toISOString().split('T')[0],
          journal: tpl.journal,
          debit_account: tpl.debit,
          debit_account_label: tpl.debit_label,
          credit_account: tpl.credit,
          credit_account_label: tpl.credit_label,
          amount,
          description: tx.description || templateKey,
          category: tx.category,
          department: tx.department,
          contact_name: tx.contact_name,
          status: 'Posted',
          is_offset: false,
          accounting_period: period,
          reference: tx.numero_facture || '',
          template_type: templateKey,
        });

        // Create debt if applicable, not yet settled, and no duplicate exists
        const existingDebt = tpl.creates_debt ? await base44.asServiceRole.entities.DebtCentralized.filter({ transaction_id: tx.id }) : [];
        if (tpl.creates_debt && !tx.payment_registered && (!existingDebt || existingDebt.length === 0)) {
          await base44.asServiceRole.entities.DebtCentralized.create({
            transaction_id: tx.id,
            debt_type: tpl.debt_type,
            contact_name: tx.contact_name || '',
            description: tx.description || templateKey,
            amount_due: amount,
            amount_paid: 0,
            amount_remaining: amount,
            status: 'Active',
            due_date: tx.date_echeance || null,
            debit_account: tpl.debit,
            credit_account: tpl.credit,
            journal: tpl.journal,
            ledger_entry_id: entry.id,
            department: tx.department || '',
          });
        }

        created++;
      } catch (err) {
        errors.push({ tx_id: tx.id, error: err.message });
      }
    }

    return Response.json({ success: true, created, skipped: booked.length - created - errors.length, errors });
  }

  return Response.json({ error: 'Action inconnue' }, { status: 400 });
});