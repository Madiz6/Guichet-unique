import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { format, addDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all transactions and existing declarations
    const transactions = await base44.asServiceRole.entities.Transaction.list('-date', 500);
    const declarations = await base44.asServiceRole.entities.TVADeclaration.list();
    
    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    
    // Check if declaration already exists for this month
    const existingDecl = declarations.find(d => d.mois_annee === currentMonth.replace('-', ''));
    if (existingDecl) {
      return Response.json({
        status: 'already_exists',
        message: `Déclaration pour ${currentMonth} déjà créée`,
        declaration_id: existingDecl.id
      });
    }
    
    // Filter revenue transactions for current month
    const revenueTransactions = transactions.filter(t => t.type === 'Revenu' && t.date?.startsWith(currentMonth));
    
    // Calculate TVA (only INCLURE transactions, auto-exclude specific sources/categories)
    const EXCLUDED_SOURCES = ['Apport Capital', 'Prêt Bancaire', 'Remboursement Prêt', 'Compte Courant Associé'];
    const EXCLUDED_CATEGORIES = ['Investissement', 'Capital', 'Prêt', 'Donation', 'Transfert interne'];
    
    const isAutoExcluded = (tx) => EXCLUDED_SOURCES.includes(tx.source) || EXCLUDED_CATEGORIES.includes(tx.category);
    
    const includedTx = revenueTransactions.filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t));
    const caT = includedTx.reduce((s, t) => s + (t.amount || 0), 0);
    const caNoT = revenueTransactions.filter(t => t.tva_inclusion !== 'INCLURE' || isAutoExcluded(t)).reduce((s, t) => s + (t.amount || 0), 0);
    const tva = Math.round(caT * 0.10);
    
    // Calculate deadline (15 days after end of month)
    const lastDay = new Date(currentYear, currentMonthNum, 0).getDate();
    const monthEnd = new Date(currentYear, currentMonthNum - 1, lastDay);
    const limitDate = format(addDays(monthEnd, 15), 'yyyy-MM-dd');
    
    const periodeLabel = format(new Date(currentYear, currentMonthNum - 1, 1), 'MMMM yyyy', { locale: {} });
    
    // Create the declaration
    const newDecl = await base44.asServiceRole.entities.TVADeclaration.create({
      numero_declaration: `TVA-${currentYear}-${String(currentMonthNum).padStart(2, '0')}`,
      periode: periodeLabel.charAt(0).toUpperCase() + periodeLabel.slice(1),
      mois_annee: currentMonth.replace('-', ''),
      ca_taxable: caT,
      ca_non_taxable: caNoT,
      ca_total: caT + caNoT,
      tva_calculee: tva,
      ajustements: 0,
      tva_finale: tva,
      statut: 'Non payé',
      date_limite: limitDate,
      transaction_ids: includedTx.map(t => t.id),
      nombre_transactions_incluses: includedTx.length,
      nombre_transactions_exclues: revenueTransactions.length - includedTx.length,
      notes: 'Générée automatiquement le 10 du mois'
    });
    
    return Response.json({
      status: 'success',
      message: `Déclaration TVA auto-générée pour ${periodeLabel}`,
      declaration: {
        id: newDecl.id,
        numero_declaration: newDecl.numero_declaration,
        periode: newDecl.periode,
        tva_finale: newDecl.tva_finale,
        date_limite: newDecl.date_limite,
        ca_taxable: newDecl.ca_taxable,
        ca_non_taxable: newDecl.ca_non_taxable
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});