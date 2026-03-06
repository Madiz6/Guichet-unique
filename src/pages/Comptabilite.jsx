import React, { useState, useMemo } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle,
  BookOpen, ArrowUpRight, ArrowDownRight, Banknote, BarChart3,
  Clock, FileText, RefreshCw, Target, Activity, ChevronRight, Layers
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import EtatFinancierAnnuel from '@/components/comptabilite/EtatFinancierAnnuel';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

const MONTH_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'];

export default function Comptabilite() {
  const [period, setPeriod] = useState('3m');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date', 500),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => meras.entities.Loan.filter({ statut: 'En cours' }),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => meras.entities.BankAccount.list(),
  });

  // ---------- Period filter ----------
  const monthsBack = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const periodStart = subMonths(new Date(), monthsBack);

  const filtered = useMemo(() =>
    transactions.filter(t => {
      try { return parseISO(t.date) >= periodStart; } catch { return false; }
    }),
    [transactions, period]
  );

  // ---------- Core KPIs ----------
  const totalRevenu   = filtered.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
  const totalDepense  = filtered.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
  const resultatNet   = totalRevenu - totalDepense;
  const unpaidExpenses = filtered.filter(t => t.type === 'Dépense' && t.status === 'En attente').reduce((s, t) => s + (t.amount || 0), 0);
  const unbookedCount = filtered.filter(t => !t.booking_status).length;
  const totalBankBalance = bankAccounts.reduce((s, b) => s + (b.solde_actuel || 0), 0);
  const totalLoanBalance = loans.reduce((s, l) => s + (l.solde_restant || 0), 0);

  // ---------- Monthly trend (last 6 months always) ----------
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const inMonth = transactions.filter(t => {
        try { const dt = parseISO(t.date); return isWithinInterval(dt, { start, end }); } catch { return false; }
      });
      const rev = inMonth.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
      const dep = inMonth.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
      return {
        mois: format(d, 'MMM', { locale: fr }),
        Revenus: rev,
        Dépenses: dep,
        Résultat: rev - dep,
      };
    });
  }, [transactions]);

  // ---------- Expense breakdown by category ----------
  const categoryData = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type === 'Dépense' && t.category).forEach(t => {
      map[t.category] = (map[t.category] || 0) + (t.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filtered]);

  // ---------- Cash flow cumulative ----------
  const cashFlowData = useMemo(() => {
    let running = totalBankBalance - totalRevenu + totalDepense; // approximate start
    return monthlyData.map(m => {
      running += m.Résultat;
      return { mois: m.mois, Trésorerie: Math.round(running) };
    });
  }, [monthlyData, totalBankBalance]);

  // ---------- Unbooked transactions ----------
  const unbookedList = filtered.filter(t => !t.booking_status).slice(0, 10);

  // ---------- Budget vs réel ----------
  const budgetComparison = useMemo(() => {
    return budgets.slice(0, 6).map(b => {
      const spent = filtered.filter(t => t.type === 'Dépense' && t.department === b.departement).reduce((s, t) => s + (t.amount || 0), 0);
      const allocated = b.montant_total || 0;
      return { name: b.departement || b.nom || 'N/A', Budget: allocated, Réalisé: spent, pct: allocated > 0 ? Math.round(spent / allocated * 100) : 0 };
    });
  }, [budgets, filtered]);

  const kpis = [
    { label: 'Chiffre d\'Affaires', value: fmt(totalRevenu) + ' DJF', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', trend: '+' },
    { label: 'Total Charges', value: fmt(totalDepense) + ' DJF', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Résultat Net', value: fmt(resultatNet) + ' DJF', icon: resultatNet >= 0 ? ArrowUpRight : ArrowDownRight, color: resultatNet >= 0 ? 'text-blue-600' : 'text-red-600', bg: resultatNet >= 0 ? 'bg-blue-50' : 'bg-red-50' },
    { label: 'Trésorerie (Banque)', value: fmt(totalBankBalance) + ' DJF', icon: Banknote, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Dettes fournisseurs', value: fmt(unpaidExpenses) + ' DJF', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Encours Prêts', value: fmt(totalLoanBalance) + ' DJF', icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Comptabilité & Finance</h1>
            <p className="text-[#6B6B6B] mt-1">Vue 360° de la santé financière de votre entreprise</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
              {['1m','3m','6m','12m'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium transition ${period === p ? 'bg-[#1A1A1A] text-white' : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'}`}>
                  {p}
                </button>
              ))}
            </div>
            <Link to={createPageUrl('Transactions')}>
              <Button className="bg-[#1A1A1A] text-white" size="sm">
                <BookOpen className="w-4 h-4 mr-2" /> Transactions
              </Button>
            </Link>
          </div>
        </div>

        {/* Alert banner — unbooked transactions */}
        {unbookedCount > 0 && (
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-300 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">{unbookedCount} transaction(s) non comptabilisée(s)</p>
                <p className="text-sm text-amber-700">Ces transactions n'ont pas encore d'écriture comptable. Comptabilisez-les pour un bilan exact.</p>
              </div>
            </div>
            <Link to={createPageUrl('Transactions')}>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Comptabiliser <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <p className="text-xs text-[#6B6B6B] mb-1">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expenses */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-1">Revenus vs Charges</h3>
              <p className="text-xs text-[#6B6B6B] mb-4">6 derniers mois</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v / 1000) + 'K'} />
                  <Tooltip formatter={(v) => fmt(v) + ' DJF'} />
                  <Legend />
                  <Bar dataKey="Revenus" fill="#10B981" radius={[4,4,0,0]} />
                  <Bar dataKey="Dépenses" fill="#EF4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Net result trend */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-1">Résultat Net Mensuel</h3>
              <p className="text-xs text-[#6B6B6B] mb-4">Bénéfice ou perte par mois</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v / 1000) + 'K'} />
                  <Tooltip formatter={(v) => fmt(v) + ' DJF'} />
                  <Area type="monotone" dataKey="Résultat" stroke="#3B82F6" fill="url(#netGrad)" strokeWidth={2} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: P&L | Cash Flow | Budget | Non Comptabilisé */}
        <Tabs defaultValue="pl">
          <TabsList className="bg-white border border-[#E5E7EB]">
            <TabsTrigger value="pl">📊 Compte de Résultat</TabsTrigger>
            <TabsTrigger value="cashflow">💧 Trésorerie</TabsTrigger>
            <TabsTrigger value="budget">🎯 Budget vs Réel</TabsTrigger>
            <TabsTrigger value="unbooked" className={unbookedCount > 0 ? 'text-amber-600' : ''}>
              {unbookedCount > 0 && <span className="mr-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] inline-flex items-center justify-center">{unbookedCount}</span>}
              📋 À Comptabiliser
            </TabsTrigger>
            <TabsTrigger value="etats">📑 États Financiers</TabsTrigger>
          </TabsList>

          {/* P&L */}
          <TabsContent value="pl" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#1A1A1A] mb-4 text-lg">Compte de Résultat — {period}</h3>
                <div className="space-y-0 divide-y divide-[#F5F5F5]">
                  {/* Produits */}
                  <div className="py-3 flex justify-between items-center">
                    <span className="font-semibold text-green-700">Produits d'exploitation (Revenus)</span>
                    <span className="font-bold text-green-700">{fmt(totalRevenu)} DJF</span>
                  </div>
                  {/* Charges detail */}
                  {categoryData.length > 0 && categoryData.map((c, i) => (
                    <div key={i} className="py-2 flex justify-between items-center pl-4 text-sm">
                      <span className="text-[#6B6B6B]">{c.name}</span>
                      <span className="font-medium text-[#1A1A1A]">{fmt(c.value)} DJF</span>
                    </div>
                  ))}
                  <div className="py-3 flex justify-between items-center">
                    <span className="font-semibold text-red-600">Total Charges</span>
                    <span className="font-bold text-red-600">({fmt(totalDepense)} DJF)</span>
                  </div>
                  {/* Result */}
                  <div className={`py-4 flex justify-between items-center rounded-lg px-4 mt-2 ${resultatNet >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className="font-bold text-lg text-[#1A1A1A]">Résultat Net</span>
                    <span className={`font-bold text-2xl ${resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resultatNet >= 0 ? '+' : ''}{fmt(resultatNet)} DJF</span>
                  </div>
                  <div className="py-3 flex justify-between items-center text-sm">
                    <span className="text-[#6B6B6B]">Marge nette</span>
                    <span className={`font-semibold ${resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalRevenu > 0 ? (resultatNet / totalRevenu * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* Category pie */}
                {categoryData.length > 0 && (
                  <div className="mt-6">
                    <p className="font-semibold text-[#1A1A1A] mb-3 text-sm">Répartition des charges</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, pct }) => `${name}`}>
                          {categoryData.map((_, i) => <Cell key={i} fill={MONTH_COLORS[i % MONTH_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v) + ' DJF'} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow */}
          <TabsContent value="cashflow" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#1A1A1A] mb-1 text-lg">Trésorerie Cumulée</h3>
                <p className="text-xs text-[#6B6B6B] mb-4">Évolution du solde bancaire estimé sur 6 mois</p>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v / 1000) + 'K'} />
                    <Tooltip formatter={(v) => fmt(v) + ' DJF'} />
                    <Area type="monotone" dataKey="Trésorerie" stroke="#8B5CF6" fill="url(#cashGrad)" strokeWidth={2} dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Bank accounts summary */}
                {bankAccounts.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="font-semibold text-sm text-[#1A1A1A] mb-2">Comptes bancaires</p>
                    {bankAccounts.map(b => (
                      <div key={b.id} className="flex justify-between items-center p-3 bg-[#F9F9F9] rounded-lg text-sm">
                        <span className="text-[#6B6B6B]">{b.nom_compte} ({b.banque})</span>
                        <span className="font-bold text-[#1A1A1A]">{fmt(b.solde_actuel)} {b.devise || 'DJF'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loans */}
                {loans.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="font-semibold text-sm text-[#1A1A1A] mb-2">Prêts en cours</p>
                    {loans.map(l => (
                      <div key={l.id} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg text-sm">
                        <span className="text-[#6B6B6B]">{l.banque} — {l.numero_pret}</span>
                        <span className="font-bold text-purple-700">{fmt(l.solde_restant)} DJF restants</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget vs Réel */}
          <TabsContent value="budget" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#1A1A1A] mb-1 text-lg">Budget vs Réalisé</h3>
                <p className="text-xs text-[#6B6B6B] mb-4">Comparaison budget alloué / dépenses réelles par département</p>
                {budgetComparison.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={budgetComparison} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v / 1000) + 'K'} />
                        <Tooltip formatter={v => fmt(v) + ' DJF'} />
                        <Legend />
                        <Bar dataKey="Budget" fill="#CBD5E1" radius={[4,4,0,0]} />
                        <Bar dataKey="Réalisé" radius={[4,4,0,0]}
                          fill="#3B82F6"
                          label={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-3">
                      {budgetComparison.map((b, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-[#1A1A1A]">{b.name}</span>
                            <span className={`font-semibold ${b.pct > 100 ? 'text-red-600' : b.pct > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                              {b.pct}% utilisé
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${b.pct > 100 ? 'bg-red-500' : b.pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: Math.min(b.pct, 100) + '%' }} />
                          </div>
                          <div className="flex justify-between text-xs text-[#6B6B6B] mt-0.5">
                            <span>{fmt(b.Réalisé)} DJF dépensés</span>
                            <span>Budget: {fmt(b.Budget)} DJF</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-[#6B6B6B]">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucun budget configuré</p>
                    <Link to={createPageUrl('BudgetManagement')}>
                      <Button className="mt-4" size="sm">Créer des budgets</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unbooked */}
          <TabsContent value="unbooked" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] text-lg">Transactions à comptabiliser</h3>
                    <p className="text-xs text-[#6B6B6B]">Ces transactions n'ont pas encore d'écriture comptable (journal NPCG)</p>
                  </div>
                  <Link to={createPageUrl('Transactions')}>
                    <Button size="sm" className="bg-[#1A1A1A]">
                      <BookOpen className="w-4 h-4 mr-2" /> Ouvrir Transactions
                    </Button>
                  </Link>
                </div>
                {unbookedList.length === 0 ? (
                  <div className="text-center py-12 text-[#6B6B6B]">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="font-semibold text-green-700">Toutes les transactions sont comptabilisées ✅</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unbookedList.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#F0F0F0] bg-white hover:bg-[#FAFAFA] transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${t.type === 'Revenu' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-[#1A1A1A]">{t.description?.slice(0, 50)}</p>
                            <p className="text-xs text-[#6B6B6B]">{t.date} · {t.source}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${t.type === 'Revenu' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.type === 'Revenu' ? '+' : '-'}{fmt(t.amount)} DJF
                          </p>
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">Non comptabilisé</Badge>
                        </div>
                      </div>
                    ))}
                    {unbookedCount > 10 && (
                      <p className="text-center text-sm text-[#6B6B6B] pt-2">… et {unbookedCount - 10} autres. <Link to={createPageUrl('Transactions')} className="underline text-blue-600">Voir tout</Link></p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* États Financiers Annuels */}
          <TabsContent value="etats" className="mt-4">
            <EtatFinancierAnnuel
              transactions={transactions}
              loans={loans}
              bankAccounts={bankAccounts}
            />
          </TabsContent>
        </Tabs>

        {/* Quick actions footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Gérer les Transactions', icon: DollarSign, to: 'Transactions', color: 'bg-blue-600 text-white' },
            { label: 'Grand Livre & Dettes', icon: BookOpen, to: 'GrandLivre', color: 'bg-emerald-600 text-white' },
            { label: 'Gestion Budgétaire', icon: BarChart3, to: 'BudgetManagement', color: 'bg-purple-600 text-white' },
          ].map((a, i) => (
            <Link key={i} to={createPageUrl(a.to)}>
              <div className={`${a.color} rounded-xl p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition`}>
                <div className="flex items-center gap-3">
                  <a.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{a.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}