import React, { useState, useMemo } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Zap, Loader2, RefreshCw, DollarSign, BarChart3, Target } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

// Simple linear regression
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };
  const sumX = data.reduce((s, _, i) => s + i, 0);
  const sumY = data.reduce((s, v) => s + v, 0);
  const sumXY = data.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = data.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Moving average
function movingAvg(data, window = 3) {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

export default function FinancialForecasting() {
  const [horizon, setHorizon] = useState('6');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date'),
  });

  const { data: statements = [] } = useQuery({
    queryKey: ['financial-statements'],
    queryFn: () => meras.entities.FinancialStatement.list('-created_date'),
  });

  // Build monthly historical data (last 12 months)
  const historicalData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const label = format(month, 'MMM yyyy', { locale: fr });

      const monthTx = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      const income = monthTx.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = monthTx.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
      months.push({ label, month: format(month, 'yyyy-MM'), income, expenses, net: income - expenses, cashflow: income - expenses });
    }
    return months;
  }, [transactions]);

  // Forecast using linear regression + trend
  const forecastData = useMemo(() => {
    const horizonN = parseInt(horizon);
    const incomes = historicalData.map(d => d.income);
    const expenses = historicalData.map(d => d.expenses);
    const regIncome = linearRegression(incomes);
    const regExpense = linearRegression(expenses);
    const avgIncome = incomes.reduce((s, v) => s + v, 0) / incomes.length;
    const avgExpense = expenses.reduce((s, v) => s + v, 0) / expenses.length;
    const maIncome = movingAvg(incomes, 3);
    const maExpense = movingAvg(expenses, 3);
    const lastMAIncome = maIncome[maIncome.length - 1] || avgIncome;
    const lastMAExpense = maExpense[maExpense.length - 1] || avgExpense;

    const result = [];
    for (let i = 1; i <= horizonN; i++) {
      const month = addMonths(new Date(), i);
      const label = format(month, 'MMM yyyy', { locale: fr });
      const n = historicalData.length + i - 1;
      // Weighted blend: 60% regression trend, 40% recent moving average
      const projIncome = Math.max(0, 0.6 * (regIncome.intercept + regIncome.slope * n) + 0.4 * lastMAIncome);
      const projExpense = Math.max(0, 0.6 * (regExpense.intercept + regExpense.slope * n) + 0.4 * lastMAExpense);
      const variance = 0.08; // 8% confidence band
      result.push({
        label,
        Revenus_Prévus: Math.round(projIncome),
        Dépenses_Prévues: Math.round(projExpense),
        Net_Prévu: Math.round(projIncome - projExpense),
        Revenus_Max: Math.round(projIncome * (1 + variance)),
        Revenus_Min: Math.round(projIncome * (1 - variance)),
        forecast: true,
      });
    }
    return result;
  }, [historicalData, horizon]);

  // Combined chart data: last 6 historical + forecast
  const combinedData = useMemo(() => {
    const hist = historicalData.slice(-6).map(d => ({
      label: d.label, Revenus: d.income, Dépenses: d.expenses, Net: d.net, historical: true
    }));
    return [...hist, ...forecastData];
  }, [historicalData, forecastData]);

  // KPI deltas
  const avgHistIncome = historicalData.reduce((s, d) => s + d.income, 0) / (historicalData.length || 1);
  const avgForecastIncome = forecastData.reduce((s, d) => s + d.Revenus_Prévus, 0) / (forecastData.length || 1);
  const incomeTrend = avgHistIncome > 0 ? ((avgForecastIncome - avgHistIncome) / avgHistIncome) * 100 : 0;

  const avgHistExpense = historicalData.reduce((s, d) => s + d.expenses, 0) / (historicalData.length || 1);
  const avgForecastExpense = forecastData.reduce((s, d) => s + d.Dépenses_Prévues, 0) / (forecastData.length || 1);
  const expenseTrend = avgHistExpense > 0 ? ((avgForecastExpense - avgHistExpense) / avgHistExpense) * 100 : 0;

  // Risk signals
  const risks = useMemo(() => {
    const r = [];
    if (incomeTrend < -5) r.push({ level: 'high', msg: `Tendance baissière des revenus de ${Math.abs(incomeTrend).toFixed(1)}% sur ${horizon} mois` });
    if (expenseTrend > 10) r.push({ level: 'medium', msg: `Croissance des charges de ${expenseTrend.toFixed(1)}% prévue` });
    const negativeMonths = forecastData.filter(d => d.Net_Prévu < 0).length;
    if (negativeMonths > 0) r.push({ level: 'high', msg: `${negativeMonths} mois de résultat négatif prévu sur l'horizon` });
    if (r.length === 0) r.push({ level: 'low', msg: 'Situation financière stable selon les projections' });
    return r;
  }, [forecastData, incomeTrend, expenseTrend, horizon]);

  const opportunities = useMemo(() => {
    const o = [];
    if (incomeTrend > 5) o.push(`📈 Croissance des revenus de +${incomeTrend.toFixed(1)}% prévue`);
    if (forecastData.every(d => d.Net_Prévu > 0)) o.push('✅ Résultat positif prévu sur tout l\'horizon');
    if (avgForecastIncome > avgHistIncome * 1.1) o.push('🚀 Accélération de la croissance des revenus détectée');
    if (o.length === 0) o.push('💡 Optimiser les charges pour améliorer la rentabilité');
    return o;
  }, [forecastData, incomeTrend, avgForecastIncome, avgHistIncome]);

  // AI Insights generation
  const generateAIInsights = async () => {
    setIsGenerating(true);
    try {
      const summary = {
        avgMonthlyIncome: Math.round(avgHistIncome),
        avgMonthlyExpense: Math.round(avgHistExpense),
        incomeTrend: incomeTrend.toFixed(1),
        expenseTrend: expenseTrend.toFixed(1),
        forecastHorizon: horizon,
        latestNet: historicalData[historicalData.length - 1]?.net || 0,
        totalTransactions: transactions.length,
      };
      const res = await meras.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert-comptable Djibouti. Analyse ces données financières et fournis 3-4 recommandations concrètes en français.
Données: ${JSON.stringify(summary)}
Format JSON requis: {"summary": "...", "recommendations": ["...", "..."], "risks": ["..."], "opportunities": ["..."]}`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
            risks: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setAiInsights(res);
    } catch (e) {
      toast.error('Erreur IA: ' + e.message);
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Transactions')}>
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Prévisions Financières IA</h1>
            <p className="text-[#697586] mt-1">Projections basées sur les données historiques et tendances</p>
          </div>
          <Select value={horizon} onValueChange={setHorizon}>
            <SelectTrigger className="w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 mois</SelectItem>
              <SelectItem value="6">6 mois</SelectItem>
              <SelectItem value="12">12 mois</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateAIInsights} disabled={isGenerating} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyse...</> : <><Zap className="w-4 h-4 mr-2" />Analyse IA</>}
          </Button>
        </div>

        {/* KPI forecast cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: `Revenus Prévus (${horizon}m)`,
              value: fmt(forecastData.reduce((s, d) => s + d.Revenus_Prévus, 0)) + ' DJF',
              trend: incomeTrend,
              Icon: TrendingUp,
              color: 'from-green-500 to-emerald-600',
            },
            {
              label: `Dépenses Prévues (${horizon}m)`,
              value: fmt(forecastData.reduce((s, d) => s + d.Dépenses_Prévues, 0)) + ' DJF',
              trend: -expenseTrend,
              Icon: TrendingDown,
              color: 'from-red-500 to-rose-600',
            },
            {
              label: `Résultat Net Prévu`,
              value: fmt(forecastData.reduce((s, d) => s + d.Net_Prévu, 0)) + ' DJF',
              trend: incomeTrend - expenseTrend,
              Icon: DollarSign,
              color: 'from-blue-500 to-indigo-600',
            },
            {
              label: 'Moy. Mensuelle Prévue',
              value: fmt(Math.round(forecastData.reduce((s, d) => s + d.Net_Prévu, 0) / (forecastData.length || 1))) + ' DJF',
              trend: incomeTrend,
              Icon: BarChart3,
              color: 'from-purple-500 to-violet-600',
            },
          ].map((k, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center`}>
                    <k.Icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge className={`text-xs ${k.trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {k.trend >= 0 ? '↑' : '↓'} {Math.abs(k.trend).toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-[#697586] mt-3">{k.label}</p>
                <p className="text-lg font-bold text-[#0A2540] mt-0.5">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main chart */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0A2540]">Historique + Prévisions sur {horizon} mois</h3>
              <div className="flex items-center gap-3 text-xs text-[#697586]">
                <span className="flex items-center gap-1"><span className="w-8 h-0.5 bg-[#10B981] inline-block" /> Historique</span>
                <span className="flex items-center gap-1"><span className="w-8 h-0.5 bg-[#10B981] border-dashed border-t border-[#10B981] inline-block opacity-50" /> Prévu</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={combinedData}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip formatter={(v, n) => [fmt(v) + ' DJF', n]} />
                <Legend />
                <ReferenceLine x={historicalData[historicalData.length - 1]?.label} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: 'Aujourd\'hui', fontSize: 10, fill: '#64748B' }} />
                <Area type="monotone" dataKey="Revenus" stroke="#10B981" fill="url(#gRev)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="Dépenses" stroke="#EF4444" fill="url(#gExp)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="Revenus_Prévus" stroke="#10B981" fill="url(#gRev)" strokeWidth={2} strokeDasharray="6 3" connectNulls />
                <Area type="monotone" dataKey="Dépenses_Prévues" stroke="#EF4444" fill="url(#gExp)" strokeWidth={2} strokeDasharray="6 3" connectNulls />
                <Line type="monotone" dataKey="Net" stroke="#6366F1" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="Net_Prévu" stroke="#6366F1" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabs: Risks / Opportunities / AI / Monthly forecast table */}
        <Tabs defaultValue="risks">
          <TabsList>
            <TabsTrigger value="risks">⚠️ Risques & Alertes</TabsTrigger>
            <TabsTrigger value="opportunities">💡 Opportunités</TabsTrigger>
            <TabsTrigger value="table">📋 Tableau Prévisionnel</TabsTrigger>
            <TabsTrigger value="ai">🤖 Analyse IA</TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="mt-4">
            <div className="space-y-3">
              {risks.map((r, i) => (
                <Card key={i} className={`border-0 shadow-sm ${r.level === 'high' ? 'bg-red-50' : r.level === 'medium' ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${r.level === 'high' ? 'text-red-500' : r.level === 'medium' ? 'text-amber-500' : 'text-green-500'}`} />
                    <div>
                      <Badge className={`mb-1 text-xs ${r.level === 'high' ? 'bg-red-100 text-red-700' : r.level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {r.level === 'high' ? 'Risque élevé' : r.level === 'medium' ? 'Risque modéré' : 'Situation saine'}
                      </Badge>
                      <p className="text-sm text-[#0A2540]">{r.msg}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="mt-4">
            <div className="space-y-3">
              {opportunities.map((o, i) => (
                <Card key={i} className="border-0 shadow-sm bg-blue-50">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Target className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-[#0A2540]">{o}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-[#0A2540] mb-4">Tableau Prévisionnel Mensuel</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F7F9FC]">
                        <th className="text-left py-3 px-4 text-xs text-[#64748B] font-semibold">Mois</th>
                        <th className="text-right py-3 px-4 text-xs text-green-600 font-semibold">Revenus Prévus</th>
                        <th className="text-right py-3 px-4 text-xs text-red-600 font-semibold">Dépenses Prévues</th>
                        <th className="text-right py-3 px-4 text-xs text-[#64748B] font-semibold">Résultat Net</th>
                        <th className="text-right py-3 px-4 text-xs text-[#64748B] font-semibold">Fourchette haute</th>
                        <th className="text-right py-3 px-4 text-xs text-[#64748B] font-semibold">Fourchette basse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((row, i) => (
                        <tr key={i} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] ${row.Net_Prévu < 0 ? 'bg-red-50/30' : ''}`}>
                          <td className="py-3 px-4 font-medium text-[#0A2540]">{row.label}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">{fmt(row.Revenus_Prévus)} DJF</td>
                          <td className="py-3 px-4 text-right text-red-600 font-semibold">{fmt(row.Dépenses_Prévues)} DJF</td>
                          <td className={`py-3 px-4 text-right font-bold ${row.Net_Prévu >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                            {row.Net_Prévu >= 0 ? '+' : ''}{fmt(row.Net_Prévu)} DJF
                          </td>
                          <td className="py-3 px-4 text-right text-[#697586] text-xs">{fmt(row.Revenus_Max)} DJF</td>
                          <td className="py-3 px-4 text-right text-[#697586] text-xs">{fmt(row.Revenus_Min)} DJF</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#0A2540]">
                        <td className="py-3 px-4 font-bold text-white text-sm">TOTAL PRÉVU</td>
                        <td className="py-3 px-4 text-right text-green-300 font-bold">
                          {fmt(forecastData.reduce((s, d) => s + d.Revenus_Prévus, 0))} DJF
                        </td>
                        <td className="py-3 px-4 text-right text-red-300 font-bold">
                          {fmt(forecastData.reduce((s, d) => s + d.Dépenses_Prévues, 0))} DJF
                        </td>
                        <td className="py-3 px-4 text-right text-white font-bold">
                          {fmt(forecastData.reduce((s, d) => s + d.Net_Prévu, 0))} DJF
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            {!aiInsights ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                  <p className="font-semibold text-[#0A2540] mb-1">Analyse IA non générée</p>
                  <p className="text-sm text-[#697586] mb-4">Cliquez sur "Analyse IA" pour obtenir des recommandations personnalisées basées sur vos données.</p>
                  <Button onClick={generateAIInsights} disabled={isGenerating} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />En cours...</> : <><Zap className="w-4 h-4 mr-2" />Lancer l'analyse</>}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-purple-500" />
                      <h3 className="font-semibold text-[#0A2540]">Synthèse IA</h3>
                    </div>
                    <p className="text-sm text-[#475569] leading-relaxed">{aiInsights.summary}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiInsights.recommendations?.length > 0 && (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-[#0A2540] mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" /> Recommandations
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.recommendations.map((r, i) => (
                            <li key={i} className="text-sm text-[#475569] flex items-start gap-2">
                              <span className="text-blue-400 font-bold mt-0.5">{i + 1}.</span> {r}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {aiInsights.risks?.length > 0 && (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-[#0A2540] mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" /> Risques Identifiés
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.risks.map((r, i) => (
                            <li key={i} className="text-sm text-[#475569] flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">⚠</span> {r}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {aiInsights.opportunities?.length > 0 && (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-[#0A2540] mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" /> Opportunités
                        </h4>
                        <ul className="space-y-2">
                          {aiInsights.opportunities.map((o, i) => (
                            <li key={i} className="text-sm text-[#475569] flex items-start gap-2">
                              <span className="text-green-400 mt-0.5">✓</span> {o}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={generateAIInsights} disabled={isGenerating}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Régénérer
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}