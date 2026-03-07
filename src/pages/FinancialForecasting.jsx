import React, { useState, useMemo, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Zap, RefreshCw } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

// ── helpers ──────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtS = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(Math.round(n || 0));
};

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

function movingAvg(data, w = 3) {
  return data.map((_, i) => {
    const sl = data.slice(Math.max(0, i - w + 1), i + 1);
    return sl.reduce((s, v) => s + v, 0) / sl.length;
  });
}

// ── custom tooltip ────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', fontSize: 12, minWidth: 160 }}>
      <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: '#cbd5e1' }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{fmtS(p.value)} FDJ</span>
        </div>
      ))}
    </div>
  );
};

// ── tab button ────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      background: active ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'transparent',
      color: active ? '#fff' : '#64748b', transition: 'all 0.2s',
    }}>{children}</button>
  );
}

// ── kpi card ──────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, change, positive, color, sub }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f172a,#1e293b)', border: `1px solid ${color}33`,
      borderRadius: 16, padding: '18px 22px', position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 70, height: 70, borderRadius: '0 0 0 70px', background: `${color}11` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{
        fontSize: 20, fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace',
        opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(8px)', transition: 'all 0.5s ease',
      }}>{value}</div>
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: positive ? '#10b981' : '#ef4444',
            background: positive ? '#10b98118' : '#ef444418', padding: '2px 8px', borderRadius: 20,
          }}>{positive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%</span>
          <span style={{ fontSize: 10, color: '#475569' }}>vs historique</span>
        </div>
      )}
      {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────
export default function FinancialForecasting() {
  const [activeTab, setActiveTab] = useState('overview');
  const [scenario, setScenario] = useState('base');
  const [horizon, setHorizon] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  // What-if inputs
  const [whatIf, setWhatIf] = useState({ clientDelay: 0, newHires: 0, newLoan: 0 });

  // Fetch full dataset — same limit as Comptabilite page (500) for accurate historicals
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date', 500),
  });
  // Also fetch ledger entries (authoritative PCG source, same as EtatsFinanciers)
  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['ledger-entries-forecast'],
    queryFn: () => meras.entities.LedgerEntry.list('-date', 2000),
  });
  // All debt statuses (same as EtatsFinanciers — includes Partiellement réglée)
  const { data: debts = [] } = useQuery({
    queryKey: ['debts-forecast'],
    queryFn: () => meras.entities.DebtCentralized.list('-created_date', 500),
  });

  // ── historical (12 months) ─────────────────────────────────────────────
  const historical = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const label = format(m, 'MMM yy', { locale: fr });
      const txs = transactions.filter(t => { if (!t.date) return false; const d = new Date(t.date); return d >= start && d <= end; });
      const income = txs.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = txs.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
      months.push({ label, income, expenses, net: income - expenses, actual: true });
    }
    return months;
  }, [transactions]);

  // ── regression-based forecast ──────────────────────────────────────────
  const forecast = useMemo(() => {
    const incomes = historical.map(d => d.income);
    const expenses = historical.map(d => d.expenses);
    const regI = linearRegression(incomes);
    const regE = linearRegression(expenses);
    const maI = movingAvg(incomes, 3);
    const maE = movingAvg(expenses, 3);
    const lastI = maI[maI.length - 1] || incomes.reduce((s, v) => s + v, 0) / (incomes.length || 1);
    const lastE = maE[maE.length - 1] || expenses.reduce((s, v) => s + v, 0) / (expenses.length || 1);

    // what-if adjustments
    const salaryDelta = whatIf.newHires * 150000;
    const loanDelta = whatIf.newLoan;
    const delayFactor = 1 - whatIf.clientDelay / 100;

    const result = [];
    for (let i = 1; i <= horizon; i++) {
      const m = addMonths(new Date(), i);
      const label = format(m, 'MMM yy', { locale: fr });
      const n = historical.length + i - 1;
      const baseI = Math.max(0, 0.6 * (regI.intercept + regI.slope * n) + 0.4 * lastI) * delayFactor;
      const baseE = Math.max(0, 0.6 * (regE.intercept + regE.slope * n) + 0.4 * lastE) + salaryDelta;
      const confidence = Math.max(50, 95 - i * 3.5);
      result.push({
        label,
        base: Math.round(baseI),
        optimiste: Math.round(baseI * 1.2),
        pessimiste: Math.round(baseI * 0.8),
        dep_base: Math.round(baseE),
        dep_opt: Math.round(baseE * 1.08),
        dep_pess: Math.round(baseE * 0.94),
        loan: loanDelta / horizon,
        confidence: Math.round(confidence),
        forecast: true,
      });
    }
    return result;
  }, [historical, horizon, whatIf]);

  const scenarioRevKey = { base: 'base', optimiste: 'optimiste', pessimiste: 'pessimiste' };
  const scenarioDepKey = { base: 'dep_base', optimiste: 'dep_opt', pessimiste: 'dep_pess' };
  const scenarioColor = { base: '#2563eb', optimiste: '#10b981', pessimiste: '#ef4444' };

  const totalRev = forecast.reduce((s, d) => s + d[scenarioRevKey[scenario]], 0);
  const totalDep = forecast.reduce((s, d) => s + d[scenarioDepKey[scenario]], 0);
  const totalNet = totalRev - totalDep;

  const avgHistI = historical.reduce((s, d) => s + d.income, 0) / (historical.length || 1);
  const avgHistE = historical.reduce((s, d) => s + d.expenses, 0) / (historical.length || 1);
  const avgFcI = forecast.reduce((s, d) => s + d.base, 0) / (forecast.length || 1);
  const avgFcE = forecast.reduce((s, d) => s + d.dep_base, 0) / (forecast.length || 1);
  const incomeTrend = avgHistI > 0 ? ((avgFcI - avgHistI) / avgHistI) * 100 : 0;
  const expenseTrend = avgHistE > 0 ? ((avgFcE - avgHistE) / avgHistE) * 100 : 0;

  // ── combined chart ─────────────────────────────────────────────────────
  const combined = useMemo(() => {
    const hist = historical.slice(-6).map(d => ({
      label: d.label, rev: d.income, dep: d.expenses, net: d.net, actual: true,
      fc_rev: null, fc_dep: null, fc_net: null,
    }));
    const fc = forecast.map(d => ({
      label: d.label, rev: null, dep: null, net: null, actual: false,
      fc_rev: d[scenarioRevKey[scenario]],
      fc_dep: d[scenarioDepKey[scenario]],
      fc_net: d[scenarioRevKey[scenario]] - d[scenarioDepKey[scenario]],
    }));
    return [...hist, ...fc];
  }, [historical, forecast, scenario]);

  // ── cashflow waterfall ─────────────────────────────────────────────────
  const cashflowItems = useMemo(() => {
    const totalDebt = debts.filter(d => d.status !== 'Réglée').reduce((s, d) => s + (d.amount_remaining || 0), 0);
    return [
      { name: 'Solde initial', value: historical[historical.length - 1]?.income || 0, type: 'total' },
      { name: 'Encaissements', value: totalRev, type: 'pos' },
      { name: 'Décaissements', value: -totalDep, type: 'neg' },
      { name: 'Dettes actives', value: -totalDebt, type: 'neg' },
      { name: 'Solde final estimé', value: totalNet, type: 'total' },
    ];
  }, [historical, totalRev, totalDep, totalNet, debts]);

  // ── risks ──────────────────────────────────────────────────────────────
  const risks = useMemo(() => {
    const r = [];
    if (incomeTrend < -5) r.push({ level: 'high', icon: '📉', title: 'Tendance baissière revenus', detail: `Baisse de ${Math.abs(incomeTrend).toFixed(1)}% prévue vs historique.`, action: 'Diversifier les sources de revenus' });
    if (expenseTrend > 15) r.push({ level: 'high', icon: '📈', title: 'Croissance charges anormale', detail: `Charges en hausse de ${expenseTrend.toFixed(1)}% vs historique.`, action: 'Auditer les postes de charge fixes vs variables' });
    const negMonths = forecast.filter(d => d.base - d.dep_base < 0).length;
    if (negMonths > 0) r.push({ level: 'high', icon: '⚡', title: `${negMonths} mois déficitaire(s)`, detail: 'Résultat net négatif prévu sur l\'horizon de projection.', action: 'Revoir la politique tarifaire et les charges fixes' });
    const activeDebts = debts.filter(d => d.status === 'Active' || d.status === 'Partiellement réglée');
    if (activeDebts.length > 3) r.push({ level: 'medium', icon: '🏦', title: 'Concentration de dettes', detail: `${activeDebts.length} dettes actives en cours — impact BFR.`, action: 'Planifier un calendrier de remboursement' });
    if (whatIf.clientDelay > 0) r.push({ level: 'medium', icon: '⏱️', title: `Délai client simulé: ${whatIf.clientDelay}%`, detail: `Impact négatif de ${whatIf.clientDelay}% sur les encaissements simulé.`, action: 'Resserrer les conditions de paiement' });
    if (r.length === 0) r.push({ level: 'low', icon: '✅', title: 'Situation financière saine', detail: 'Aucun signal d\'alarme détecté sur l\'horizon de projection.', action: 'Maintenir les bonnes pratiques actuelles' });
    return r;
  }, [forecast, incomeTrend, expenseTrend, debts, whatIf]);

  // ── radar health ───────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const marge = totalRev > 0 ? (totalNet / totalRev) * 100 : 0;
    return [
      { metric: 'Revenus', score: Math.min(100, Math.max(0, 50 + incomeTrend)) },
      { metric: 'Rentabilité', score: Math.min(100, Math.max(0, marge * 1.2)) },
      { metric: 'Liquidité', score: Math.min(100, totalNet > 0 ? 80 : 40) },
      { metric: 'Croissance', score: Math.min(100, Math.max(0, 60 + incomeTrend)) },
      { metric: 'Stabilité', score: Math.min(100, Math.max(0, 70 - Math.abs(expenseTrend))) },
      { metric: 'Maîtrise charges', score: Math.min(100, Math.max(0, 80 - expenseTrend)) },
    ];
  }, [totalRev, totalNet, incomeTrend, expenseTrend]);

  // ── AI analysis ────────────────────────────────────────────────────────
  const generateAI = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        avgMonthlyIncome: Math.round(avgHistI),
        avgMonthlyExpense: Math.round(avgHistE),
        incomeTrend: incomeTrend.toFixed(1),
        expenseTrend: expenseTrend.toFixed(1),
        forecastHorizon: horizon,
        totalForecastNet: Math.round(totalNet),
        activeDebts: debts.filter(d => d.status !== 'Réglée').length,
        scenario,
        whatIfParams: whatIf,
      };
      const res = await meras.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert-comptable et analyste financier senior basé à Djibouti. Analyse ces données financières prévisionnelles de manière détaillée et fournis une analyse complète en français.
Données: ${JSON.stringify(payload)}
Sois très précis, cite des chiffres, et adapte les conseils au contexte djiboutien (FDJ, CNSS, secteur PME/fintech).`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
            risks: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            executive_summary: { type: 'string' },
            confidence_note: { type: 'string' },
          }
        }
      });
      setAiInsights(res);
      setActiveTab('ia');
    } catch (e) {
      toast.error('Erreur IA: ' + e.message);
    }
    setIsGenerating(false);
  };

  // ── monthly table ──────────────────────────────────────────────────────
  const monthlyTable = useMemo(() => {
    let cumRev = 0;
    return forecast.map(d => {
      const rev = d[scenarioRevKey[scenario]];
      const dep = d[scenarioDepKey[scenario]];
      const net = rev - dep;
      cumRev += rev;
      return { label: d.label, rev, dep, net, marge: rev > 0 ? (net / rev * 100).toFixed(1) : '0.0', cumRev, confidence: d.confidence };
    });
  }, [forecast, scenario]);

  const sc = scenarioColor[scenario];

  return (
    <div style={{ background: '#020817', minHeight: '100vh', fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif", color: '#f1f5f9' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderBottom: '1px solid #1e293b', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Link to={createPageUrl('Comptabilite')}>
          <button style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #334155', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Prévisions Financières <span style={{ background: 'linear-gradient(90deg,#2563eb,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IA 360°</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {transactions.length} transactions · Projection {horizon} mois · {format(new Date(), 'dd MMM yyyy', { locale: fr })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Scenario */}
          <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, border: '1px solid #1e293b' }}>
            {['pessimiste', 'base', 'optimiste'].map(s => (
              <button key={s} onClick={() => setScenario(s)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: scenario === s ? ({ pessimiste: '#ef444422', base: '#2563eb22', optimiste: '#10b98122' }[s]) : 'transparent',
                color: scenario === s ? ({ pessimiste: '#ef4444', base: '#60a5fa', optimiste: '#10b981' }[s]) : '#475569',
                transition: 'all 0.2s',
              }}>{{ pessimiste: '📉 Pessimiste', base: '📊 Base', optimiste: '📈 Optimiste' }[s]}</button>
            ))}
          </div>
          {/* Horizon */}
          <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, border: '1px solid #1e293b' }}>
            {[3, 6, 12].map(h => (
              <button key={h} onClick={() => setHorizon(h)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: horizon === h ? '#2563eb22' : 'transparent',
                color: horizon === h ? '#60a5fa' : '#475569', transition: 'all 0.2s',
              }}>{h}m</button>
            ))}
          </div>
          <button
            onClick={generateAI}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 700, opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? '⏳ Analyse...' : '🤖 Analyse IA'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
          <KpiCard icon="💰" label={`Revenus prévus (${horizon}m)`} value={`${fmt(totalRev)} FDJ`} change={incomeTrend} positive={incomeTrend >= 0} color="#2563eb" />
          <KpiCard icon="📤" label={`Dépenses prévues (${horizon}m)`} value={`${fmt(totalDep)} FDJ`} change={expenseTrend} positive={false} color="#ef4444" />
          <KpiCard icon="✅" label="Résultat net prévu" value={`${totalNet >= 0 ? '+' : ''}${fmt(totalNet)} FDJ`} change={incomeTrend - expenseTrend} positive={totalNet >= 0} color="#10b981" />
          <KpiCard icon="📅" label="Moy. mensuelle nette" value={`${fmt(totalNet / (horizon || 1))} FDJ`} positive={totalNet >= 0} color="#f59e0b"
            sub={`Marge nette: ${totalRev > 0 ? ((totalNet / totalRev) * 100).toFixed(1) : '0'}%`} />
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#0f172a', padding: 4, borderRadius: 10, border: '1px solid #1e293b', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '🗺️ Vue Globale' },
            { id: 'scenarios', label: '🎯 Scénarios' },
            { id: 'cashflow', label: '💵 Trésorerie' },
            { id: 'risques', label: '⚠️ Risques' },
            { id: 'whatif', label: '🔬 What-If' },
            { id: 'tableau', label: '📋 Tableau' },
            { id: 'ia', label: '🤖 Analyse IA' },
          ].map(t => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>{t.label}</TabBtn>)}
        </div>

        {/* ══ VUE GLOBALE ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
            {/* Main combined chart */}
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Historique (6m) + Prévisions ({horizon}m)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Revenus · Dépenses · Résultat net · Scénario: <span style={{ color: sc }}>{scenario}</span></div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={combined}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <ReferenceLine x={historical[historical.length - 1]?.label} stroke="#f59e0b" strokeDasharray="5 3" label={{ value: "Auj.", fill: '#f59e0b', fontSize: 9 }} />
                  <Area type="monotone" dataKey="rev" name="Revenus réels" stroke="#2563eb" fill="url(#gRev)" strokeWidth={2} dot={{ r: 2, fill: '#2563eb' }} connectNulls={false} />
                  <Area type="monotone" dataKey="fc_rev" name="Revenus prévus" stroke={sc} fill="url(#gRev)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2, fill: sc }} connectNulls={false} />
                  <Area type="monotone" dataKey="dep" name="Dépenses réelles" stroke="#ef4444" fill="url(#gDep)" strokeWidth={2} dot={{ r: 2, fill: '#ef4444' }} connectNulls={false} />
                  <Area type="monotone" dataKey="fc_dep" name="Dépenses prévues" stroke="#f97316" fill="url(#gDep)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2, fill: '#f97316' }} connectNulls={false} />
                  <Line type="monotone" dataKey="net" name="Net réel" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} connectNulls={false} />
                  <Line type="monotone" dataKey="fc_net" name="Net prévu" stroke="#34d399" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: '#34d399' }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Health radar */}
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Score de Santé 360°</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>6 dimensions financières</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8 }}>
                {radarData.map(d => (
                  <div key={d.metric} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{d.metric}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: d.score >= 75 ? '#10b981' : d.score >= 55 ? '#f59e0b' : '#ef4444' }}>{Math.round(d.score)}/100</span>
                    </div>
                    <div style={{ height: 5, background: '#1e293b', borderRadius: 99 }}>
                      <div style={{ width: `${Math.round(d.score)}%`, height: '100%', background: d.score >= 75 ? '#10b981' : d.score >= 55 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ SCÉNARIOS ══ */}
        {activeTab === 'scenarios' && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
              {[
                { key: 'pessimiste', label: 'Scénario Pessimiste', icon: '📉', color: '#ef4444', prob: '25%', rev: forecast.reduce((s, d) => s + d.pessimiste, 0), dep: forecast.reduce((s, d) => s + d.dep_pess, 0) },
                { key: 'base', label: 'Scénario de Base', icon: '📊', color: '#2563eb', prob: '55%', rev: forecast.reduce((s, d) => s + d.base, 0), dep: forecast.reduce((s, d) => s + d.dep_base, 0) },
                { key: 'optimiste', label: 'Scénario Optimiste', icon: '📈', color: '#10b981', prob: '20%', rev: forecast.reduce((s, d) => s + d.optimiste, 0), dep: forecast.reduce((s, d) => s + d.dep_opt, 0) },
              ].map(s => (
                <div key={s.key} onClick={() => setScenario(s.key)} style={{
                  background: scenario === s.key ? `${s.color}11` : '#0f172a', border: `2px solid ${scenario === s.key ? s.color : '#1e293b'}`,
                  borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.icon} {s.label}</div>
                    <span style={{ fontSize: 10, background: `${s.color}22`, color: s.color, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                      {s.prob}
                    </span>
                  </div>
                  {[
                    { label: 'Revenus', value: s.rev, c: '#10b981' },
                    { label: 'Dépenses', value: s.dep, c: '#ef4444' },
                    { label: 'Net', value: s.rev - s.dep, c: s.rev > s.dep ? '#10b981' : '#ef4444' },
                  ].map(m => (
                    <div key={m.label} style={{ background: '#020817', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                      <div style={{ fontSize: 9, color: '#64748b' }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: m.c }}>{fmtS(m.value)} FDJ</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Comparaison des 3 scénarios — Revenus</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={forecast} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="pessimiste" name="Pessimiste" fill="#ef444466" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="base" name="Base" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="optimiste" name="Optimiste" fill="#10b98166" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══ TRÉSORERIE ══ */}
        {activeTab === 'cashflow' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* Waterfall */}
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Flux de Trésorerie — Waterfall</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 18 }}>Entrées & Sorties sur {horizon} mois</div>
              {cashflowItems.map((d, i) => {
                const isTotal = d.type === 'total';
                const isPos = d.value >= 0;
                const color = isTotal ? '#f59e0b' : isPos ? '#10b981' : '#ef4444';
                const maxVal = Math.max(...cashflowItems.map(x => Math.abs(x.value))) || 1;
                const pct = (Math.abs(d.value) / maxVal) * 100;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 120, fontSize: 10, color: isTotal ? '#f59e0b' : '#94a3b8', fontWeight: isTotal ? 700 : 400, textAlign: 'right', flexShrink: 0 }}>{d.name}</div>
                    <div style={{ flex: 1, height: 26, background: '#1e293b', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: isPos || isTotal ? 0 : 'auto', right: isPos || isTotal ? 'auto' : 0, width: `${pct}%`, background: color, opacity: 0.85, borderRadius: 4, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ width: 100, fontSize: 11, fontWeight: 700, color, textAlign: 'right', fontFamily: 'monospace', flexShrink: 0 }}>
                      {d.value > 0 && !isTotal ? '+' : ''}{fmtS(d.value)} FDJ
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, padding: 14, background: totalNet > 0 ? '#10b98111' : '#ef444411', borderRadius: 12, border: `1px solid ${totalNet > 0 ? '#10b98133' : '#ef444433'}` }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Solde prévisionnel net ({horizon} mois)</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: totalNet > 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: 4 }}>
                  {totalNet >= 0 ? '+' : ''}{fmt(totalNet)} FDJ
                </div>
                <div style={{ fontSize: 11, color: totalNet > 0 ? '#10b981' : '#ef4444', marginTop: 3 }}>
                  {totalNet > 0 ? '✅ Trésorerie positive' : '⚠️ Attention: solde négatif'}
                </div>
              </div>
            </div>

            {/* Cumulative cash evolution */}
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Évolution Résultat Net Cumulé</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Projection {horizon} mois</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyTable.map((d, i) => ({ ...d, cumNet: monthlyTable.slice(0, i + 1).reduce((s, r) => s + r.net, 0) }))}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="cumNet" name="Net cumulé" stroke="#10b981" strokeWidth={2.5} fill="url(#netGrad)" dot={{ r: 4, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'BFR estimé', value: `${fmtS(totalDep * 0.15)} FDJ`, color: '#f59e0b', icon: '📊' },
                  { label: 'Dettes actives', value: `${debts.filter(d => d.status !== 'Réglée').length} en cours`, color: '#2563eb', icon: '🏦' },
                  { label: 'Marge nette', value: `${totalRev > 0 ? ((totalNet / totalRev) * 100).toFixed(1) : '0'}%`, color: '#10b981', icon: '💧' },
                  { label: 'Couverture charges', value: `${totalDep > 0 ? (totalNet / (totalDep / horizon)).toFixed(1) : '—'} mois`, color: '#a855f7', icon: '🛡️' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: '#020817', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{kpi.icon}</span>
                    <div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>{kpi.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ RISQUES ══ */}
        {activeTab === 'risques' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              {risks.map((r, i) => {
                const c = r.level === 'high' ? '#ef4444' : r.level === 'medium' ? '#f59e0b' : '#10b981';
                const bg = r.level === 'high' ? '#ef444411' : r.level === 'medium' ? '#f59e0b11' : '#10b98111';
                const lbl = r.level === 'high' ? 'Risque Élevé' : r.level === 'medium' ? 'Risque Modéré' : 'Situation Saine';
                return (
                  <div key={i} style={{ background: '#0f172a', border: `1px solid ${c}33`, borderRadius: 14, padding: 18, display: 'flex', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{r.title}</span>
                        <span style={{ fontSize: 9, background: bg, color: c, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{lbl}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{r.detail}</div>
                      <div style={{ padding: '7px 10px', background: '#020817', borderRadius: 7, fontSize: 11, color: '#60a5fa' }}>
                        💡 <strong>Action recommandée :</strong> {r.action}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Risk score */}
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Score de Risque Global</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Évaluation automatisée IA</div>
              {(() => {
                const highCount = risks.filter(r => r.level === 'high').length;
                const medCount = risks.filter(r => r.level === 'medium').length;
                const score = Math.min(100, highCount * 30 + medCount * 15);
                const scoreColor = score > 60 ? '#ef4444' : score > 30 ? '#f59e0b' : '#10b981';
                const scoreLabel = score > 60 ? 'Risque Élevé' : score > 30 ? 'Risque Modéré' : 'Risque Faible';
                return (
                  <>
                    <div style={{ position: 'relative', height: 12, background: 'linear-gradient(90deg,#10b981,#f59e0b,#ef4444)', borderRadius: 99, marginBottom: 8 }}>
                      <div style={{ position: 'absolute', top: -4, left: `${score}%`, transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#fff', border: `3px solid ${scoreColor}` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginBottom: 16 }}>
                      <span>0 — Faible</span><span>50 — Modéré</span><span>100 — Critique</span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: scoreColor, fontFamily: 'monospace' }}>{score}</div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 4 }}>{scoreLabel}</div>

                    <div style={{ marginTop: 20 }}>
                      {[
                        { label: 'Risques élevés', count: highCount, color: '#ef4444' },
                        { label: 'Risques modérés', count: medCount, color: '#f59e0b' },
                        { label: 'Alertes faibles', count: risks.filter(r => r.level === 'low').length, color: '#10b981' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: item.color, background: `${item.color}18`, padding: '2px 10px', borderRadius: 20 }}>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ══ WHAT-IF ══ */}
        {activeTab === 'whatif' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18 }}>
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #7c3aed33' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🔬 Simulateur What-If</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 20 }}>Ajustez les paramètres pour voir l'impact sur les prévisions</div>

              {[
                { key: 'clientDelay', label: '⏱️ Retard clients (%)', sub: '% de revenus encaissés en retard', min: 0, max: 50, step: 5 },
                { key: 'newHires', label: '👥 Nouvelles embauches', sub: 'Coût estimé: 150 000 FDJ/mois/personne', min: 0, max: 20, step: 1 },
                { key: 'newLoan', label: '🏦 Emprunt additionnel (FDJ)', sub: 'Capital frais injecté sur la période', min: 0, max: 5000000, step: 100000 },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{f.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace' }}>
                      {f.key === 'newLoan' ? fmtS(whatIf[f.key]) + ' FDJ' : whatIf[f.key]}{f.key === 'clientDelay' ? '%' : ''}
                    </span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={whatIf[f.key]}
                    onChange={e => setWhatIf(w => ({ ...w, [f.key]: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
                  <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{f.sub}</div>
                </div>
              ))}

              <button onClick={() => setWhatIf({ clientDelay: 0, newHires: 0, newLoan: 0 })}
                style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                ↺ Réinitialiser
              </button>
            </div>

            {/* Impact chart */}
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Impact sur le Résultat Net</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Projection avec les paramètres what-if appliqués</div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="base" name="Revenus base" fill="#2563eb66" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dep_base" name="Dépenses (avec what-if)" fill="#ef444466" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey={d => d.base - d.dep_base} name="Net what-if" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'Impact retard clients', value: `-${fmtS(totalRev * whatIf.clientDelay / 100)} FDJ`, color: '#ef4444' },
                  { label: 'Coût embauches', value: `-${fmtS(whatIf.newHires * 150000 * horizon)} FDJ`, color: '#f59e0b' },
                  { label: 'Capital injecté', value: `+${fmtS(whatIf.newLoan)} FDJ`, color: '#10b981' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#020817', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TABLEAU ══ */}
        {activeTab === 'tableau' && (
          <div style={{ background: '#0f172a', borderRadius: 16, padding: 22, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Tableau Prévisionnel Mensuel Détaillé</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 18 }}>Scénario: <span style={{ color: sc, fontWeight: 700 }}>{scenario}</span> · {horizon} mois · Confiance IA décroissante</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Mois', 'Revenus Prévus', 'Dépenses Prévues', 'Résultat Net', 'Marge Nette', 'Rev. Cumulés', 'Confiance IA'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 14px', background: '#1e293b', color: '#64748b', fontWeight: 600, textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap', borderRadius: i === 0 ? '8px 0 0 8px' : i === 6 ? '0 8px 8px 0' : '' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyTable.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#020817' : 'transparent' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#60a5fa' }}>{row.label}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt(row.rev)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(row.dep)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: row.net >= 0 ? '#f59e0b' : '#ef4444' }}>
                        {row.net >= 0 ? '+' : ''}{fmt(row.net)} FDJ
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{ background: parseFloat(row.marge) > 30 ? '#10b98122' : '#f59e0b22', color: parseFloat(row.marge) > 30 ? '#10b981' : '#f59e0b', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
                          {row.marge}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#a855f7', fontWeight: 700 }}>{fmt(row.cumRev)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <div style={{ width: 48, height: 5, background: '#1e293b', borderRadius: 99 }}>
                            <div style={{ width: `${row.confidence}%`, height: '100%', borderRadius: 99, background: row.confidence > 80 ? '#10b981' : row.confidence > 65 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{row.confidence}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#1e293b', fontWeight: 800 }}>
                    <td style={{ padding: '12px 14px', color: '#f1f5f9', borderRadius: '8px 0 0 8px' }}>TOTAL {horizon} MOIS</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#10b981' }}>{fmt(monthlyTable.reduce((s, r) => s + r.rev, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#ef4444' }}>{fmt(monthlyTable.reduce((s, r) => s + r.dep, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#f59e0b' }}>{fmt(monthlyTable.reduce((s, r) => s + r.net, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span style={{ background: '#10b98122', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
                        {totalRev > 0 ? ((totalNet / totalRev) * 100).toFixed(1) : '0'}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#a855f7' }}>{fmt(monthlyTable.reduce((s, r) => s + r.rev, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', borderRadius: '0 8px 8px 0' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ANALYSE IA ══ */}
        {activeTab === 'ia' && (
          <div>
            {!aiInsights ? (
              <div style={{ background: '#0f172a', borderRadius: 16, padding: 48, border: '1px solid #7c3aed33', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Analyse IA non générée</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  Cliquez sur "Analyse IA" en haut pour obtenir des recommandations personnalisées basées sur vos données réelles, scénarios et paramètres what-if.
                </div>
                <button onClick={generateAI} disabled={isGenerating} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff',
                  cursor: isGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                }}>
                  {isGenerating ? '⏳ Analyse en cours...' : '🤖 Lancer l\'analyse IA'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Executive summary */}
                <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#1e293b)', borderRadius: 16, padding: 22, border: '1px solid #7c3aed33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Analyse IA — Synthèse Exécutive</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Basé sur {transactions.length} transactions · Modèle régression + ML</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <button onClick={generateAI} disabled={isGenerating} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                        ↺ Régénérer
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.8 }}>{aiInsights.executive_summary || aiInsights.summary}</p>
                </div>

                {/* 3 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
                  {[
                    { key: 'recommendations', title: '🎯 Recommandations', color: '#2563eb', icon: '→' },
                    { key: 'risks', title: '⚠️ Risques identifiés', color: '#ef4444', icon: '⚠' },
                    { key: 'opportunities', title: '💡 Opportunités', color: '#10b981', icon: '✓' },
                  ].map(section => aiInsights[section.key]?.length > 0 && (
                    <div key={section.key} style={{ background: '#0f172a', borderRadius: 14, padding: 18, border: `1px solid ${section.color}22` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: section.color, marginBottom: 14 }}>{section.title}</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {aiInsights[section.key].map((item, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                            <span style={{ color: section.color, fontWeight: 800, flexShrink: 0 }}>{section.icon}</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {aiInsights.confidence_note && (
                  <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, border: '1px solid #1e293b', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                    ℹ️ {aiInsights.confidence_note}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}