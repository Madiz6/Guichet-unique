import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import { base44 } from '@/api/base44Client';
import { ledgerEngine } from '@/functions/ledgerEngine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, DollarSign, Filter, RefreshCw, CreditCard, Building2, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

const JOURNAL_COLORS = {
  ACH: 'bg-orange-100 text-orange-800',
  VTE: 'bg-green-100 text-green-800',
  BNQ: 'bg-blue-100 text-blue-800',
  SAL: 'bg-purple-100 text-purple-800',
  CNSS: 'bg-red-100 text-red-800',
  OD: 'bg-gray-100 text-gray-700',
};

const DEBT_TYPE_COLORS = {
  Fournisseur: 'bg-orange-100 text-orange-800',
  Employé: 'bg-purple-100 text-purple-800',
  Partenaire: 'bg-blue-100 text-blue-800',
  Banque: 'bg-slate-100 text-slate-800',
  Investisseur: 'bg-emerald-100 text-emerald-800',
  Fiscal: 'bg-red-100 text-red-800',
};

export default function GrandLivre() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('grand_livre');
  const [filterJournal, setFilterJournal] = useState('all');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterPeriodStart, setFilterPeriodStart] = useState('');
  const [filterPeriodEnd, setFilterPeriodEnd] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [backfilling, setBackfilling] = useState(false);

  const { data: ledgerEntries = [], isLoading: loadingEntries, refetch } = useQuery({
    queryKey: ['ledger-entries'],
    queryFn: () => meras.entities.LedgerEntry.list('-date', 500),
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['transactions-for-backfill'],
    queryFn: () => meras.entities.Transaction.list('-date', 500),
  });

  const bookedCount = allTransactions.filter(t => t.booking_status && t.booking_status !== '').length;
  const missingLedger = bookedCount - ledgerEntries.length;

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await ledgerEngine({ action: 'backfillFromTransactions' });
      const data = res.data;
      queryClient.invalidateQueries({ queryKey: ['ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success(`✅ Synchronisation terminée : ${data.created} écriture(s) importée(s)`);
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setBackfilling(false);
    }
  };

  const { data: debts = [], isLoading: loadingDebts } = useQuery({
    queryKey: ['debts'],
    queryFn: () => meras.entities.DebtCentralized.list('-created_date', 200),
  });

  const { data: journals = [] } = useQuery({
    queryKey: ['accounting-journals'],
    queryFn: () => meras.entities.AccountingJournal.list(),
  });

  const { data: coa = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => meras.entities.ChartOfAccounts.list(),
  });

  // Mark payment mutation
  const markPaymentMutation = useMutation({
    mutationFn: async ({ transaction_id, amount }) => {
      const res = await ledgerEngine({ action: 'markPayment', transaction_id, payment_amount: amount });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Paiement enregistré et écriture de règlement créée');
      setPaymentModal(null);
      setPaymentAmount('');
    },
    onError: (e) => toast.error('Erreur: ' + e.message),
  });

  // Filter entries
  const filtered = useMemo(() => {
    return ledgerEntries.filter(e => {
      if (filterJournal !== 'all' && e.journal !== filterJournal) return false;
      if (filterAccount && e.debit_account !== filterAccount && e.credit_account !== filterAccount) return false;
      if (filterPeriodStart && e.date < filterPeriodStart) return false;
      if (filterPeriodEnd && e.date > filterPeriodEnd) return false;
      return true;
    });
  }, [ledgerEntries, filterJournal, filterAccount, filterPeriodStart, filterPeriodEnd]);

  // Trial balance
  const trialBalance = useMemo(() => {
    const map = {};
    for (const e of filtered) {
      const coaDebit = coa.find(a => a.account_number === e.debit_account);
      const coaCredit = coa.find(a => a.account_number === e.credit_account);
      if (!map[e.debit_account]) map[e.debit_account] = { account: e.debit_account, label: coaDebit?.account_name || e.debit_account_label || '', debit: 0, credit: 0 };
      if (!map[e.credit_account]) map[e.credit_account] = { account: e.credit_account, label: coaCredit?.account_name || e.credit_account_label || '', debit: 0, credit: 0 };
      map[e.debit_account].debit += e.amount || 0;
      map[e.credit_account].credit += e.amount || 0;
    }
    return Object.values(map).map(a => ({
      ...a,
      solde_debiteur: Math.max(0, a.debit - a.credit),
      solde_crediteur: Math.max(0, a.credit - a.debit),
    })).sort((a, b) => a.account.localeCompare(b.account));
  }, [filtered, coa]);

  const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 1;

  const activeDebts = debts.filter(d => d.status === 'Active' || d.status === 'Partiellement réglée');
  const totalDebtRemaining = activeDebts.reduce((s, d) => s + (d.amount_remaining || d.amount_due || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Grand Livre & Dettes</h1>
            <p className="text-[#6B6B6B] mt-1 text-sm">Moteur comptable Stripe-style · NPCG Djibouti · Double entrée</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={balanced ? 'bg-green-100 text-green-800 text-sm px-3 py-1' : 'bg-red-100 text-red-800 text-sm px-3 py-1'}>
              {balanced ? <><CheckCircle className="w-3.5 h-3.5 mr-1 inline" />Bilan équilibré</> : <><AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />Déséquilibre détecté</>}
            </Badge>
            {missingLedger > 0 && (
              <Button size="sm" onClick={handleBackfill} disabled={backfilling} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Zap className="w-4 h-4 mr-1" />
                {backfilling ? 'Synchronisation...' : `Importer ${missingLedger} transaction(s) manquante(s)`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Écritures comptables', value: fmt(filtered.length), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Débit', value: fmt(totalDebit) + ' DJF', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Crédit', value: fmt(totalCredit) + ' DJF', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Dettes actives', value: fmt(totalDebtRemaining) + ' DJF', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((k, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <p className="text-xs text-[#6B6B6B]">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-[#6B6B6B]" />
              <Select value={filterJournal} onValueChange={setFilterJournal}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Journal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les journaux</SelectItem>
                  {journals.map(j => <SelectItem key={j.journal_code} value={j.journal_code}>{j.journal_code} — {j.journal_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="N° compte (ex: 641)" value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-44" />
              <Input type="date" value={filterPeriodStart} onChange={e => setFilterPeriodStart(e.target.value)} className="w-40" />
              <Input type="date" value={filterPeriodEnd} onChange={e => setFilterPeriodEnd(e.target.value)} className="w-40" />
              <Button variant="ghost" size="sm" onClick={() => { setFilterJournal('all'); setFilterAccount(''); setFilterPeriodStart(''); setFilterPeriodEnd(''); }}>
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-[#E5E7EB]">
            <TabsTrigger value="grand_livre">📒 Grand Livre</TabsTrigger>
            <TabsTrigger value="balance">⚖️ Balance des comptes</TabsTrigger>
            <TabsTrigger value="debts" className={activeDebts.length > 0 ? 'text-amber-600' : ''}>
              {activeDebts.length > 0 && <span className="mr-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] inline-flex items-center justify-center">{activeDebts.length}</span>}
              💰 Dettes centralisées
            </TabsTrigger>
            <TabsTrigger value="journals">📋 Journaux</TabsTrigger>
            <TabsTrigger value="coa">🗂️ Plan Comptable</TabsTrigger>
          </TabsList>

          {/* GRAND LIVRE */}
          <TabsContent value="grand_livre" className="mt-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1A1A1A] text-white">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Journal</th>
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-left py-3 px-4 font-semibold">Débit</th>
                      <th className="text-left py-3 px-4 font-semibold">Crédit</th>
                      <th className="text-right py-3 px-4 font-semibold">Montant</th>
                      <th className="text-center py-3 px-4 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-[#6B6B6B]">
                          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="font-medium">Aucune écriture comptable</p>
                          <p className="text-xs mt-1">Les écritures sont générées automatiquement lors de la comptabilisation des transactions.</p>
                        </td>
                      </tr>
                    ) : filtered.map((e, i) => (
                      <tr key={e.id || i} className={`hover:bg-[#FAFAFA] transition ${e.is_offset ? 'bg-green-50/30' : ''}`}>
                        <td className="py-3 px-4 text-[#6B6B6B] whitespace-nowrap">{e.date}</td>
                        <td className="py-3 px-4">
                          <Badge className={JOURNAL_COLORS[e.journal] || 'bg-gray-100 text-gray-700'}>
                            {e.journal}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#1A1A1A] truncate max-w-[250px]">{e.description}</p>
                          {e.contact_name && <p className="text-xs text-[#6B6B6B]">{e.contact_name}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-blue-50 text-blue-800 px-2 py-0.5 rounded">{e.debit_account}</span>
                          {e.debit_account_label && <span className="text-xs text-[#6B6B6B] ml-1">{e.debit_account_label}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-orange-50 text-orange-800 px-2 py-0.5 rounded">{e.credit_account}</span>
                          {e.credit_account_label && <span className="text-xs text-[#6B6B6B] ml-1">{e.credit_account_label}</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1A1A1A]">{fmt(e.amount)} DJF</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={
                            e.status === 'Posted' ? 'bg-green-100 text-green-800' :
                            e.status === 'À comptabiliser' ? 'bg-amber-100 text-amber-800' :
                            e.status === 'Lettré' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {e.status || 'Posted'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filtered.length > 0 && (
                    <tfoot className="bg-[#F5F5F5]">
                      <tr>
                        <td colSpan={5} className="py-3 px-4 font-bold text-[#1A1A1A]">TOTAL ({filtered.length} écritures)</td>
                        <td className="py-3 px-4 text-right font-bold text-[#1A1A1A]">{fmt(filtered.reduce((s, e) => s + (e.amount || 0), 0))} DJF</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TRIAL BALANCE */}
          <TabsContent value="balance" className="mt-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#F0F0F0] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#1A1A1A]">Balance des comptes (Totaux)</h3>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">Somme des mouvements débit/crédit par compte NPCG</p>
                </div>
                <Badge className={balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {balanced ? '✅ Équilibrée' : '⚠️ Déséquilibrée'}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Compte</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Intitulé</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Total Débit</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Total Crédit</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-blue-600 uppercase">Solde Débiteur</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-orange-600 uppercase">Solde Créditeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {trialBalance.map((r, i) => (
                      <tr key={i} className="hover:bg-[#FAFAFA]">
                        <td className="py-2.5 px-4 font-mono font-bold text-[#1A1A1A]">{r.account}</td>
                        <td className="py-2.5 px-4 text-[#6B6B6B]">{r.label}</td>
                        <td className="py-2.5 px-4 text-right text-blue-700 font-medium">{fmt(r.debit)}</td>
                        <td className="py-2.5 px-4 text-right text-orange-700 font-medium">{fmt(r.credit)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-blue-900">{r.solde_debiteur > 0 ? fmt(r.solde_debiteur) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-orange-900">{r.solde_crediteur > 0 ? fmt(r.solde_crediteur) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#1A1A1A] text-white">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 font-bold">TOTAUX</td>
                      <td className="py-3 px-4 text-right font-bold">{fmt(totalDebit)}</td>
                      <td className="py-3 px-4 text-right font-bold">{fmt(totalCredit)}</td>
                      <td className="py-3 px-4 text-right font-bold">{fmt(trialBalance.reduce((s, r) => s + r.solde_debiteur, 0))}</td>
                      <td className="py-3 px-4 text-right font-bold">{fmt(trialBalance.reduce((s, r) => s + r.solde_crediteur, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* DETTES CENTRALISÉES */}
          <TabsContent value="debts" className="mt-4">
            <div className="space-y-4">
              {/* Summary by type */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {['Fournisseur','Employé','Partenaire','Banque','Investisseur','Fiscal'].map(type => {
                  const typeDebts = activeDebts.filter(d => d.debt_type === type);
                  const total = typeDebts.reduce((s, d) => s + (d.amount_remaining || 0), 0);
                  return (
                    <Card key={type} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <Badge className={DEBT_TYPE_COLORS[type] + ' text-xs mb-2'}>{type}</Badge>
                        <p className="text-lg font-bold text-[#1A1A1A]">{fmt(total)}</p>
                        <p className="text-xs text-[#6B6B6B]">{typeDebts.length} dette(s)</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#F0F0F0]">
                  <h3 className="font-bold text-[#1A1A1A]">Toutes les dettes actives</h3>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {debts.length === 0 ? (
                    <div className="py-16 text-center text-[#6B6B6B]">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                      <p className="font-medium text-green-700">Aucune dette enregistrée</p>
                    </div>
                  ) : debts.map(d => {
                    const pct = d.amount_due > 0 ? Math.round((d.amount_paid || 0) / d.amount_due * 100) : 0;
                    return (
                      <div key={d.id} className="flex items-center justify-between p-4 hover:bg-[#FAFAFA] transition">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1">
                            <Badge className={DEBT_TYPE_COLORS[d.debt_type] || 'bg-gray-100 text-gray-700'}>
                              {d.debt_type}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1A1A1A] truncate">{d.description}</p>
                            <p className="text-xs text-[#6B6B6B]">{d.contact_name} {d.due_date ? `· Échéance: ${d.due_date}` : ''}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full max-w-[120px]">
                                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-500' : 'bg-red-400'}`}
                                  style={{ width: pct + '%' }} />
                              </div>
                              <span className="text-xs text-[#6B6B6B]">{pct}% réglé</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4 ml-4">
                          <div>
                            <p className="font-bold text-[#1A1A1A]">{fmt(d.amount_remaining || d.amount_due)} DJF</p>
                            <p className="text-xs text-[#6B6B6B]">sur {fmt(d.amount_due)} DJF</p>
                          </div>
                          <Badge className={
                            d.status === 'Réglée' ? 'bg-green-100 text-green-800' :
                            d.status === 'Partiellement réglée' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }>
                            {d.status}
                          </Badge>
                          {d.status !== 'Réglée' && (
                            <Button size="sm" className="bg-[#1A1A1A] text-white whitespace-nowrap"
                              onClick={() => { setPaymentModal(d); setPaymentAmount(String(d.amount_remaining || d.amount_due)); }}>
                              <CreditCard className="w-3.5 h-3.5 mr-1" /> Régler
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* JOURNALS */}
          <TabsContent value="journals" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {journals.map(j => {
                const jEntries = ledgerEntries.filter(e => e.journal === j.journal_code);
                const totalAmt = jEntries.reduce((s, e) => s + (e.amount || 0), 0);
                return (
                  <Card key={j.id} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={JOURNAL_COLORS[j.journal_code] || 'bg-gray-100 text-gray-700'} style={{ fontSize: '0.9rem', padding: '0.3rem 0.7rem' }}>
                          {j.journal_code}
                        </Badge>
                        <span className="text-xs text-[#6B6B6B]">{jEntries.length} écriture(s)</span>
                      </div>
                      <h4 className="font-bold text-[#1A1A1A] mb-1">{j.journal_name}</h4>
                      <p className="text-xs text-[#6B6B6B] mb-3">{j.description}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6B6B6B]">Volume total</span>
                        <span className="font-bold text-[#1A1A1A]">{fmt(totalAmt)} DJF</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#9CA3AF] mt-1">
                        <span>Débit par défaut: {j.default_debit}</span>
                        <span>Crédit: {j.default_credit}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* CHART OF ACCOUNTS */}
          <TabsContent value="coa" className="mt-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#F0F0F0]">
                <h3 className="font-bold text-[#1A1A1A]">Plan Comptable — NPCG Djibouti</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{coa.length} comptes · Classes 1 à 7</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">N° Compte</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Intitulé</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Classe</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Type</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Sens normal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {coa.map((a, i) => (
                      <tr key={i} className="hover:bg-[#FAFAFA]">
                        <td className="py-2.5 px-4 font-mono font-bold text-[#1A1A1A]">{a.account_number}</td>
                        <td className="py-2.5 px-4 text-[#1A1A1A]">{a.account_name}</td>
                        <td className="py-2.5 px-4">
                          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">
                            Classe {a.class}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge className={
                            a.type === 'Actif' ? 'bg-blue-100 text-blue-800' :
                            a.type === 'Passif' ? 'bg-purple-100 text-purple-800' :
                            a.type === 'Charge' ? 'bg-red-100 text-red-800' :
                            a.type === 'Produit' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {a.type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-xs font-semibold ${a.normal_balance === 'Débit' ? 'text-blue-700' : 'text-orange-700'}`}>
                            {a.normal_balance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Modal */}
        {paymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md border-0 shadow-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#1A1A1A] text-lg mb-1">Enregistrer un règlement</h3>
                <p className="text-sm text-[#6B6B6B] mb-4">{paymentModal.description}</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm p-3 bg-[#F9F9F9] rounded-lg">
                    <span>Montant total dû</span>
                    <span className="font-bold">{fmt(paymentModal.amount_due)} DJF</span>
                  </div>
                  <div className="flex justify-between text-sm p-3 bg-amber-50 rounded-lg">
                    <span>Restant à régler</span>
                    <span className="font-bold text-amber-700">{fmt(paymentModal.amount_remaining || paymentModal.amount_due)} DJF</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#6B6B6B] mb-1 block">Montant du règlement (DJF)</label>
                    <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <Button className="flex-1 bg-[#1A1A1A]"
                    disabled={markPaymentMutation.isPending}
                    onClick={() => markPaymentMutation.mutate({ transaction_id: paymentModal.transaction_id, amount: Number(paymentAmount) })}>
                    {markPaymentMutation.isPending ? 'Traitement...' : '✅ Confirmer le règlement'}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setPaymentModal(null)}>Annuler</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}