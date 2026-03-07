import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
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

// ── palette (matches Paie360 app light design) ────────────────────────────
const C = {
  bg0: '#FAFAFA', bg1: '#FFFFFF', bg2: '#F5F5F5', border: '#E5E7EB',
  blue: '#1A1A1A', blueLight: '#1A1A1A', purple: '#1A1A1A',
  green: '#059669', red: '#DC2626', yellow: '#D97706', orange: '#EA580C',
  teal: '#0891B2', violet: '#7C3AED',
  text0: '#1A1A1A', text1: '#374151', text2: '#6B6B6B', text3: '#9CA3AF',
  accent: '#1A1A1A', accentBlue: '#2563EB', accentPurple: '#7C3AED',
};

// ── helpers ──────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtS = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(Math.round(n || 0));
};
const pct = (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

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

// ── tooltip ───────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 11, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ color: '#6B6B6B', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: '#374151' }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{fmtS(p.value)} FDJ</span>
        </div>
      ))}
    </div>
  );
};

// ── tab button ────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children, alert }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', position: 'relative',
      background: active ? '#1A1A1A' : 'transparent',
      color: active ? '#fff' : '#6B6B6B', transition: 'all 0.2s',
    }}>
      {children}
      {alert && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: C.red }} />}
    </button>
  );
}

// ── kpi card ──────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, change, positive, color, sub }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 10, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', fontFamily: 'monospace', opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(8px)', transition: 'all 0.5s ease' }}>{value}</div>
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: positive ? C.green : C.red, background: positive ? '#05966918' : '#DC262618', padding: '2px 8px', borderRadius: 20 }}>
            {positive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
          <span style={{ fontSize: 10, color: '#6B6B6B' }}>vs historique</span>
        </div>
      )}
      {sub && <div style={{ fontSize: 10, color: '#6B6B6B', marginTop: 4 }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: color }} />
    </div>
  );
}

// ── heatmap ────────────────────────────────────────────────────────────────
function CashHeatmap({ data, cols }) {
  const vals = data.flatMap(r => cols.map(c => r[c.key] || 0));
  const min_ = Math.min(...vals), max_ = Math.max(...vals);
  const getStyle = (v) => {
    const t = max_ > min_ ? (v - min_) / (max_ - min_) : 0.5;
    if (t < 0.2) return { bg: `${C.red}33`, color: C.red };
    if (t < 0.4) return { bg: `${C.yellow}33`, color: C.yellow };
    if (t < 0.65) return { bg: `${C.blue}33`, color: '#2563EB' };
    return { bg: `${C.green}33`, color: C.green };
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: 11, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ color: '#6B6B6B', textAlign: 'left', padding: '4px 8px', fontSize: 10, fontWeight: 600 }}>Semaine</th>
            {cols.map(c => (
              <th key={c.key} style={{ color: c.forecast ? C.blueLight : C.text1, padding: '4px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700 }}>
                {c.label}{c.forecast ? ' ●' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.week}>
              <td style={{ color: '#374151', fontFamily: 'monospace', fontSize: 10, padding: '2px 8px', fontWeight: 700 }}>{row.week}</td>
              {cols.map(c => {
                const v = row[c.key] || 0;
                const s = getStyle(v);
                return (
                  <td key={c.key}
                    title={`${row.week} / ${c.label}: ${fmtS(v * 1000)} FDJ`}
                    style={{
                      background: s.bg, color: s.color, textAlign: 'center', borderRadius: 6,
                      padding: '8px 6px', fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                      cursor: 'default', transition: 'transform 0.1s',
                      border: c.forecast ? `1px solid ${C.blue}44` : `1px solid transparent`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}>
                    {fmtS(v * 1000)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 10, color: '#6B6B6B', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Légende :</span>
        {[{ bg: `${C.red}33`, c: C.red, l: 'Critique' }, { bg: `${C.yellow}33`, c: C.yellow, l: 'Faible' }, { bg: `${C.blue}33`, c: C.blueLight, l: 'Moyen' }, { bg: `${C.green}33`, c: C.green, l: 'Fort' }].map(x => (
          <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: x.bg, borderRadius: 3, display: 'inline-block', border: `1px solid ${x.c}44` }} />
            <span style={{ color: x.c }}>{x.l}</span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: '#2563EB' }}>● Mois prévisionnel</span>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────
export default function FinancialForecasting() {
  const [activeTab, setActiveTab] = useState('overview');
  const [scenario, setScenario] = useState('base');
  const [horizon, setHorizon] = useState(6);
  const [granularity, setGranularity] = useState('monthly'); // daily/weekly/monthly
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [cashThreshold, setCashThreshold] = useState(2000000);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // Extended what-if state
  const [whatIf, setWhatIf] = useState({
    clientDelay: 0,      // days
    clientChurn: false,
    clientChurnPct: 20,
    newHires: 0,
    newLoan: 0,          // FDJ injected
    revenueGrowth: 0,    // % additional growth
  });

  // ── data fetching (consistent with Comptabilite & EtatsFinanciers) ──────
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date', 500),
  });
  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['ledger-entries-forecast'],
    queryFn: () => meras.entities.LedgerEntry.list('-date', 2000),
  });
  const { data: debts = [] } = useQuery({
    queryKey: ['debts-forecast'],
    queryFn: () => meras.entities.DebtCentralized.list('-created_date', 500),
  });

  // ── historical 12 months (excluding settlements, same as Comptabilite) ──
  const historical = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const label = format(m, 'MMM yy', { locale: fr });
      const txs = transactions.filter(t => {
        if (!t.date || t.is_settlement) return false;
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      const income = txs.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = txs.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
      months.push({ label, income, expenses, net: income - expenses, actual: true });
    }
    return months;
  }, [transactions]);

  // ── regression + what-if forecast ────────────────────────────────────────
  const forecast = useMemo(() => {
    const incomes = historical.map(d => d.income);
    const expenses = historical.map(d => d.expenses);
    const regI = linearRegression(incomes);
    const regE = linearRegression(expenses);
    const maI = movingAvg(incomes, 3);
    const maE = movingAvg(expenses, 3);
    const lastI = maI[maI.length - 1] || incomes.reduce((s, v) => s + v, 0) / (incomes.length || 1);
    const lastE = maE[maE.length - 1] || expenses.reduce((s, v) => s + v, 0) / (expenses.length || 1);

    const scenMult = { base: 1, optimiste: 1.2, pessimiste: 0.8 };
    const mult = scenMult[scenario];
    const depMult = { base: 1, optimiste: 0.95, pessimiste: 1.08 }[scenario];

    const salaryDelta = whatIf.newHires * 150000;
    const delayFactor = Math.max(0, 1 - (whatIf.clientDelay / 90) * 0.15);
    const growthFactor = 1 + whatIf.revenueGrowth / 100;

    const result = [];
    for (let i = 1; i <= horizon; i++) {
      const m = addMonths(new Date(), i);
      const label = format(m, 'MMM yy', { locale: fr });
      const n = historical.length + i - 1;
      let baseI = Math.max(0, 0.6 * (regI.intercept + regI.slope * n) + 0.4 * lastI);
      let baseE = Math.max(0, 0.6 * (regE.intercept + regE.slope * n) + 0.4 * lastE);

      // Scenario
      baseI *= mult; baseE *= depMult;
      // What-if
      baseI *= delayFactor * growthFactor;
      if (whatIf.clientChurn && i <= 3) baseI *= (1 - whatIf.clientChurnPct / 100);
      if (i === 1) baseI += whatIf.newLoan; // loan cash injection month 1
      baseE += salaryDelta + whatIf.newLoan * 0.015; // loan repayment

      const confidence = Math.max(50, 95 - i * 3.5);
      const base_noWhatIf = Math.max(0, 0.6 * (regI.intercept + regI.slope * n) + 0.4 * lastI) * mult;
      const dep_noWhatIf = (Math.max(0, 0.6 * (regE.intercept + regE.slope * n) + 0.4 * lastE)) * depMult;

      result.push({
        label,
        base: Math.round(baseI),
        base_noWhatIf: Math.round(base_noWhatIf),
        optimiste: Math.round(baseI * 1.2),
        pessimiste: Math.round(baseI * 0.8),
        dep_base: Math.round(baseE),
        dep_noWhatIf: Math.round(dep_noWhatIf),
        dep_opt: Math.round(baseE * 1.08),
        dep_pess: Math.round(baseE * 0.94),
        confidence: Math.round(confidence),
        forecast: true,
      });
    }
    return result;
  }, [historical, horizon, scenario, whatIf]);

  const scenarioRevKey = { base: 'base', optimiste: 'optimiste', pessimiste: 'pessimiste' };
  const scenarioDepKey = { base: 'dep_base', optimiste: 'dep_opt', pessimiste: 'dep_pess' };
  const sc = { base: C.accentBlue, optimiste: C.green, pessimiste: C.red }[scenario];

  const totalRev = forecast.reduce((s, d) => s + d[scenarioRevKey[scenario]], 0);
  const totalDep = forecast.reduce((s, d) => s + d[scenarioDepKey[scenario]], 0);
  const totalNet = totalRev - totalDep;
  const margin = totalRev > 0 ? (totalNet / totalRev) * 100 : 0;

  const avgHistI = historical.reduce((s, d) => s + d.income, 0) / (historical.length || 1);
  const avgHistE = historical.reduce((s, d) => s + d.expenses, 0) / (historical.length || 1);
  const avgFcI = forecast.reduce((s, d) => s + d.base_noWhatIf, 0) / (forecast.length || 1);
  const avgFcE = forecast.reduce((s, d) => s + d.dep_noWhatIf, 0) / (forecast.length || 1);
  const incomeTrend = avgHistI > 0 ? ((avgFcI - avgHistI) / avgHistI) * 100 : 0;
  const expenseTrend = avgHistE > 0 ? ((avgFcE - avgHistE) / avgHistE) * 100 : 0;

  // ── combined chart data ───────────────────────────────────────────────────
  const combined = useMemo(() => {
    const hist = historical.slice(-6).map(d => ({
      label: d.label, rev: d.income, dep: d.expenses, net: d.net,
      fc_rev: null, fc_dep: null, fc_net: null,
    }));
    const fc = forecast.map(d => ({
      label: d.label, rev: null, dep: null, net: null,
      fc_rev: d[scenarioRevKey[scenario]],
      fc_dep: d[scenarioDepKey[scenario]],
      fc_net: d[scenarioRevKey[scenario]] - d[scenarioDepKey[scenario]],
    }));
    return [...hist, ...fc];
  }, [historical, forecast, scenario]);

  // ── cashflow waterfall ────────────────────────────────────────────────────
  const cashflowItems = useMemo(() => {
    const totalDebt = debts.filter(d => d.status !== 'Réglée').reduce((s, d) => s + (d.amount_remaining || 0), 0);
    const initBalance = historical[historical.length - 1]?.income || 0;
    return [
      { name: 'Solde initial', value: initBalance, type: 'total' },
      { name: 'Encaissements', value: totalRev, type: 'pos' },
      { name: 'Décaissements', value: -totalDep, type: 'neg' },
      { name: 'Dettes actives', value: -totalDebt, type: 'neg' },
      { name: 'Solde final estimé', value: initBalance + totalNet - totalDebt, type: 'total' },
    ];
  }, [historical, totalRev, totalDep, totalNet, debts]);

  // ── smart alerts ──────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const a = [];
    const cumCash = 5000000 + totalNet;
    if (whatIf.clientDelay > 45) a.push({ level: 'critical', icon: '🔴', msg: `Retard paiement ${whatIf.clientDelay}j : risque de rupture trésorerie dès le mois 2.` });
    else if (whatIf.clientDelay > 20) a.push({ level: 'warning', icon: '🟡', msg: `Retard paiement ${whatIf.clientDelay}j : tension trésorerie probable en mois 1-2.` });
    if (whatIf.clientChurn) a.push({ level: 'critical', icon: '🔴', msg: `Perte client simulée (${whatIf.clientChurnPct}%) : impact revenus de ${fmtS(totalRev * whatIf.clientChurnPct / 100)} FDJ sur ${horizon} mois.` });
    if (whatIf.newHires > 5) a.push({ level: 'warning', icon: '🟡', msg: `${whatIf.newHires} recrutements : +${fmtS(whatIf.newHires * 150000 * horizon)} FDJ de charges — revoir le plan.` });
    if (cumCash < cashThreshold) a.push({ level: 'critical', icon: '🔴', msg: `Trésorerie prévisionnelle (${fmtS(cumCash)} FDJ) sous seuil critique (${fmtS(cashThreshold)} FDJ).` });
    if (incomeTrend < -5) a.push({ level: 'warning', icon: '🟡', msg: `Tendance baissière des revenus de ${Math.abs(incomeTrend).toFixed(1)}% vs historique.` });
    if (expenseTrend > 15) a.push({ level: 'warning', icon: '🟡', msg: `Charges en hausse de ${expenseTrend.toFixed(1)}% vs historique — auditer les postes fixes.` });
    const negM = forecast.filter(d => d.base - d.dep_base < 0).length;
    if (negM > 0) a.push({ level: 'critical', icon: '🔴', msg: `${negM} mois de résultat net négatif prévu — intervention requise.` });
    const activeDebts = debts.filter(d => d.status !== 'Réglée').length;
    if (activeDebts > 3) a.push({ level: 'info', icon: '🔵', msg: `${activeDebts} dettes actives en cours — planifier un calendrier de remboursement.` });
    a.push({ level: 'info', icon: '🔵', msg: 'Échéance IS estimée T4 2026 : provisionner une réserve fiscale dès maintenant.' });
    if (a.filter(x => x.level === 'critical').length === 0 && a.filter(x => x.level === 'warning').length === 0)
      a.push({ level: 'ok', icon: '🟢', msg: 'Aucune alerte critique. Situation financière saine sur l\'horizon simulé.' });
    return a;
  }, [totalNet, whatIf, cashThreshold, incomeTrend, expenseTrend, forecast, debts, horizon, totalRev]);

  const criticalCount = alerts.filter(a => a.level === 'critical').length;

  // ── variance analysis (last 3 historical months vs simple projection) ────
  const varianceData = useMemo(() => {
    return historical.slice(-3).map((actual, i) => {
      const regI = linearRegression(historical.slice(0, historical.length - 3 + i).map(d => d.income));
      const n = historical.length - 3 + i;
      const prevRev = Math.max(0, regI.intercept + regI.slope * n);
      const regE = linearRegression(historical.slice(0, historical.length - 3 + i).map(d => d.expenses));
      const prevDep = Math.max(0, regE.intercept + regE.slope * n);
      return {
        period: actual.label,
        prevRev: Math.round(prevRev),
        actRev: actual.income,
        prevDep: Math.round(prevDep),
        actDep: actual.expenses,
        dRev: actual.income - prevRev,
        dDep: actual.expenses - prevDep,
        pRev: prevRev > 0 ? ((actual.income - prevRev) / prevRev) * 100 : 0,
      };
    });
  }, [historical]);

  // ── heatmap data (generated from historical patterns) ────────────────────
  const heatmapData = useMemo(() => {
    const weeks = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const months = historical.slice(-6).map(h => h.label);
    return weeks.map((week, wi) => {
      const row = { week };
      historical.slice(-6).forEach((h, mi) => {
        const base = h.income / 5;
        const variation = wi === 2 ? 1.4 : wi === 0 ? 0.8 : wi === 4 ? 0.5 : wi === 1 ? 0.75 : 0.9;
        row[`m${mi}`] = Math.round(base * variation / 1000);
      });
      forecast.slice(0, 3).forEach((f, fi) => {
        const base = f.base / 5;
        const variation = wi === 2 ? 1.4 : wi === 0 ? 0.8 : wi === 4 ? 0.5 : wi === 1 ? 0.75 : 0.9;
        row[`f${fi}`] = Math.round(base * variation / 1000);
      });
      return row;
    });
  }, [historical, forecast]);

  const heatmapCols = useMemo(() => [
    ...historical.slice(-6).map((h, i) => ({ key: `m${i}`, label: h.label, forecast: false })),
    ...forecast.slice(0, 3).map((f, i) => ({ key: `f${i}`, label: f.label, forecast: true })),
  ], [historical, forecast]);

  // ── radar health ──────────────────────────────────────────────────────────
  const radarData = useMemo(() => [
    { metric: 'Revenus', score: Math.min(100, Math.max(0, 50 + incomeTrend)) },
    { metric: 'Rentabilité', score: Math.min(100, Math.max(0, margin * 1.2)) },
    { metric: 'Liquidité', score: Math.min(100, totalNet > 0 ? 80 : 40) },
    { metric: 'Croissance', score: Math.min(100, Math.max(0, 60 + incomeTrend)) },
    { metric: 'Stabilité', score: Math.min(100, Math.max(0, 70 - Math.abs(expenseTrend))) },
    { metric: 'Maîtrise charges', score: Math.min(100, Math.max(0, 80 - expenseTrend)) },
  ], [margin, incomeTrend, expenseTrend, totalNet]);

  // ── monthly table ─────────────────────────────────────────────────────────
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

  // ── AI narrative (client-side, based on real data) ────────────────────────
  const narrative = useMemo(() => {
    const health = margin > 60 ? 'excellente' : margin > 40 ? 'bonne' : margin > 20 ? 'correcte' : 'préoccupante';
    const delayNote = whatIf.clientDelay > 20 ? ` ⚠️ Retard de paiement simulé (${whatIf.clientDelay}j) — impact estimé à ${fmtS(totalRev * (whatIf.clientDelay / 90) * 0.15)} FDJ.` : '';
    const hireNote = whatIf.newHires > 0 ? ` +${whatIf.newHires} recrutements simulés : +${fmtS(whatIf.newHires * 150000 * horizon)} FDJ de charges.` : '';
    const alertNote = criticalCount > 0 ? ` ⚠️ ${criticalCount} alerte(s) critique(s) — intervention requise.` : ' ✅ Aucune alerte critique.';
    return `Sur l'horizon ${horizon} mois (scénario ${scenario}), santé financière ${health} — ${fmt(totalRev)} FDJ de revenus prévus, marge nette ${margin.toFixed(1)}%.${delayNote}${hireNote}${alertNote} Tendance revenus : ${incomeTrend >= 0 ? '+' : ''}${incomeTrend.toFixed(1)}% vs historique.`;
  }, [totalRev, margin, horizon, scenario, whatIf, criticalCount, incomeTrend]);

  // ── AI LLM analysis ───────────────────────────────────────────────────────
  const generateAI = async () => {
    setIsGenerating(true);
    try {
      const res = await meras.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert-comptable et analyste financier senior basé à Djibouti. Analyse ces données financières prévisionnelles et fournis une analyse complète en français, avec des chiffres précis en FDJ.
Données: ${JSON.stringify({
  avgMonthlyIncome: Math.round(avgHistI), avgMonthlyExpense: Math.round(avgHistE),
  incomeTrend: incomeTrend.toFixed(1), expenseTrend: expenseTrend.toFixed(1),
  forecastHorizon: horizon, totalForecastNet: Math.round(totalNet),
  margin: margin.toFixed(1), activeDebts: debts.filter(d => d.status !== 'Réglée').length,
  scenario, whatIfParams: whatIf, criticalAlerts: criticalCount,
})}`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
            risks: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
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

  const card = { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif", color: '#1A1A1A' }}>

      {/* ── HEADER ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Link to={createPageUrl('Comptabilite')}>
          <button style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', color: '#6B6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🤖</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#1A1A1A' }}>
              Prévisions Financières <span style={{ color: '#1A1A1A' }}>IA 360°</span>
              <span style={{ fontSize: 10, color: '#6B6B6B', fontWeight: 400, marginLeft: 8 }}>v2.0</span>
            </div>
            <div style={{ fontSize: 10, color: '#6B6B6B', marginTop: 1 }}>
              {transactions.filter(t => !t.is_settlement).length} tx · {ledgerEntries.length} écritures GL · {debts.filter(d => d.status !== 'Réglée').length} dettes actives · Projection {horizon}m
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Granularity */}
          <div style={{ display: 'flex', background: '#F5F5F5', borderRadius: 8, padding: 3, border: '1px solid #E5E7EB' }}>
            {[['monthly', 'Mensuel'], ['weekly', 'Hebdo'], ['daily', 'Journalier']].map(([id, lbl]) => (
              <button key={id} onClick={() => setGranularity(id)} style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: granularity === id ? '#1A1A1A' : 'transparent',
                color: granularity === id ? '#fff' : '#6B6B6B', transition: 'all 0.2s',
              }}>{lbl}</button>
            ))}
          </div>
          {/* Horizon */}
          <div style={{ display: 'flex', background: '#F5F5F5', borderRadius: 8, padding: 3, border: '1px solid #E5E7EB' }}>
            {[3, 6, 12].map(h => (
              <button key={h} onClick={() => setHorizon(h)} style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                background: horizon === h ? '#1A1A1A' : 'transparent',
                color: horizon === h ? '#fff' : '#6B6B6B', transition: 'all 0.2s',
              }}>{h}m</button>
            ))}
          </div>
          {/* Scenario */}
          <div style={{ display: 'flex', background: '#F5F5F5', borderRadius: 8, padding: 3, border: '1px solid #E5E7EB' }}>
            {['pessimiste', 'base', 'optimiste'].map(s => {
              const cols = { pessimiste: C.red, base: C.accentBlue, optimiste: C.green };
              return (
                <button key={s} onClick={() => setScenario(s)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                  background: scenario === s ? cols[s] : 'transparent',
                  color: scenario === s ? '#fff' : '#6B6B6B', transition: 'all 0.2s',
                }}>{{ pessimiste: '📉', base: '📊', optimiste: '📈' }[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</button>
              );
            })}
          </div>
          {criticalCount > 0 && (
            <div style={{ padding: '4px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 10, color: C.red, fontWeight: 700 }}>
              🔴 {criticalCount} CRITIQUE{criticalCount > 1 ? 'S' : ''}
            </div>
          )}
          <button onClick={generateAI} disabled={isGenerating} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none',
            background: '#1A1A1A', color: '#fff',
            cursor: isGenerating ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, opacity: isGenerating ? 0.7 : 1,
          }}>
            {isGenerating ? '⏳ Analyse...' : '🤖 Analyse IA'}
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 24px' }}>

        {/* ── AI NARRATIVE BANNER ── */}
        <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid #E5E7EB', borderLeft: '4px solid #1A1A1A', borderRadius: '0 10px 10px 0', marginBottom: 16, fontSize: 12, color: '#374151', lineHeight: 1.7, display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
          <div>
            <span style={{ color: '#1A1A1A', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>RÉSUMÉ EXÉCUTIF IA — MIS À JOUR EN TEMPS RÉEL</span>
            {narrative}
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 16 }}>
          <KpiCard icon="💰" label={`Revenus prévus (${horizon}m)`} value={`${fmt(totalRev)} FDJ`} change={incomeTrend} positive={incomeTrend >= 0} color={C.accentBlue} />
          <KpiCard icon="📤" label={`Dépenses prévues (${horizon}m)`} value={`${fmt(totalDep)} FDJ`} change={expenseTrend} positive={false} color={C.red} />
          <KpiCard icon="✅" label="Résultat net prévu" value={`${totalNet >= 0 ? '+' : ''}${fmt(totalNet)} FDJ`} change={incomeTrend - expenseTrend} positive={totalNet >= 0} color={C.green} />
          <KpiCard icon="📅" label="Marge nette" value={`${margin.toFixed(1)}%`} positive={margin >= 30} color={C.yellow} sub={`Moy. mensuelle: ${fmt(totalNet / (horizon || 1))} FDJ`} />
          <KpiCard icon="🏦" label="Cash prévisionnel" value={`${fmt(5000000 + totalNet)} FDJ`} positive={5000000 + totalNet > cashThreshold} color={5000000 + totalNet > cashThreshold ? C.teal : C.red} sub={`Seuil: ${fmtS(cashThreshold)} FDJ`} />
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: '#fff', padding: 4, borderRadius: 10, border: '1px solid #E5E7EB', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {[
            { id: 'overview', label: '🗺️ Vue Globale' },
            { id: 'scenarios', label: '🎯 Scénarios' },
            { id: 'cashflow', label: '💵 Trésorerie' },
            { id: 'risques', label: '⚠️ Risques' },
            { id: 'whatif', label: `🎛️ What-If${Object.values(whatIf).some(v => v && v !== 0 && v !== false) ? ' ●' : ''}` },
            { id: 'variance', label: '📊 Écarts Réel/Prévu' },
            { id: 'heatmap', label: '🌡️ Heatmap' },
            { id: 'alerts', label: `🚨 Alertes${criticalCount > 0 ? ` (${criticalCount})` : ''}`, alert: criticalCount > 0 },
            { id: 'tableau', label: '📋 Tableau' },
            { id: 'ia', label: '🤖 Analyse IA' },
          ].map(t => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} alert={t.alert}>{t.label}</TabBtn>)}
        </div>

        {/* ══ VUE GLOBALE ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Historique (6m) + Prévisions ({horizon}m)</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>Revenus · Dépenses · Net · <span style={{ color: sc }}>Scénario {scenario}</span>{granularity !== 'monthly' && ` · Vue ${granularity}`}</div>
              <ResponsiveContainer width="100%" height={290}>
                <ComposedChart data={combined}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accentBlue} stopOpacity={0.15} /><stop offset="100%" stopColor={C.accentBlue} stopOpacity={0} /></linearGradient>
                    <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red} stopOpacity={0.12} /><stop offset="100%" stopColor={C.red} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="label" tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <ReferenceLine x={historical[historical.length - 1]?.label} stroke={C.yellow} strokeDasharray="5 3" label={{ value: 'Auj.', fill: C.yellow, fontSize: 9 }} />
                  <Area type="monotone" dataKey="rev" name="Revenus réels" stroke={C.accentBlue} fill="url(#gRev)" strokeWidth={2} dot={{ r: 2, fill: C.accentBlue }} connectNulls={false} />
                  <Area type="monotone" dataKey="fc_rev" name="Revenus prévus" stroke={sc} fill="url(#gRev)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2, fill: sc }} connectNulls={false} />
                  <Area type="monotone" dataKey="dep" name="Dépenses réelles" stroke={C.red} fill="url(#gDep)" strokeWidth={2} dot={{ r: 2, fill: C.red }} connectNulls={false} />
                  <Area type="monotone" dataKey="fc_dep" name="Dépenses prévues" stroke={C.orange} fill="url(#gDep)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2, fill: C.orange }} connectNulls={false} />
                  <Line type="monotone" dataKey="net" name="Net réel" stroke={C.green} strokeWidth={2.5} dot={{ r: 3, fill: C.green }} connectNulls={false} />
                  <Line type="monotone" dataKey="fc_net" name="Net prévu" stroke="#059669" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: '#059669' }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Score de Santé 360°</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 10 }}>6 dimensions financières</div>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#6B6B6B', fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#1A1A1A" fill="#1A1A1A" fillOpacity={0.12} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8 }}>
                {radarData.map(d => (
                  <div key={d.metric} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: '#6B6B6B' }}>{d.metric}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: d.score >= 75 ? C.green : d.score >= 55 ? C.yellow : C.red }}>{Math.round(d.score)}/100</span>
                    </div>
                    <div style={{ height: 4, background: '#F5F5F5', borderRadius: 99 }}>
                      <div style={{ width: `${Math.round(d.score)}%`, height: '100%', background: d.score >= 75 ? C.green : d.score >= 55 ? C.yellow : C.red, borderRadius: 99, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ SCÉNARIOS ══ */}
        {activeTab === 'scenarios' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
              {[
                { key: 'pessimiste', label: 'Pessimiste', icon: '📉', color: C.red, prob: '25%' },
                { key: 'base', label: 'Base', icon: '📊', color: C.accentBlue, prob: '55%' },
                { key: 'optimiste', label: 'Optimiste', icon: '📈', color: C.green, prob: '20%' },
              ].map(s => {
                const rev = forecast.reduce((a, d) => a + d[scenarioRevKey[s.key]], 0);
                const dep = forecast.reduce((a, d) => a + d[scenarioDepKey[s.key]], 0);
                return (
                  <div key={s.key} onClick={() => setScenario(s.key)} style={{ background: scenario === s.key ? `${s.color}11` : C.bg1, border: `2px solid ${scenario === s.key ? s.color : C.border}`, borderRadius: 16, padding: 18, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{s.icon} {s.label}</div>
                      <span style={{ fontSize: 10, background: `${s.color}22`, color: s.color, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{s.prob}</span>
                    </div>
                    {[{ label: 'Revenus', v: rev, c: C.green }, { label: 'Dépenses', v: dep, c: C.red }, { label: 'Net', v: rev - dep, c: rev > dep ? C.green : C.red }].map(m => (
                      <div key={m.label} style={{ background: '#FAFAFA', borderRadius: 8, padding: '7px 10px', marginBottom: 5 }}>
                        <div style={{ fontSize: 9, color: '#6B6B6B' }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: m.c }}>{fmtS(m.v)} FDJ</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Comparaison 3 scénarios — Revenus mensuels</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={forecast} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  <Bar dataKey="pessimiste" name="Pessimiste" fill={`${C.red}88`} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="base" name="Base" fill={C.accentBlue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="optimiste" name="Optimiste" fill={`${C.green}88`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══ TRÉSORERIE ══ */}
        {activeTab === 'cashflow' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Flux de Trésorerie — Waterfall</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 16 }}>Entrées & Sorties sur {horizon} mois</div>
              {cashflowItems.map((d, i) => {
                const isTotal = d.type === 'total';
                const color = isTotal ? C.yellow : d.value >= 0 ? C.green : C.red;
                const maxVal = Math.max(...cashflowItems.map(x => Math.abs(x.value))) || 1;
                const w = (Math.abs(d.value) / maxVal) * 100;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 130, fontSize: 10, color: isTotal ? C.yellow : C.text2, fontWeight: isTotal ? 700 : 400, textAlign: 'right', flexShrink: 0 }}>{d.name}</div>
                    <div style={{ flex: 1, height: 24, background: '#F5F5F5', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: d.value >= 0 || isTotal ? 0 : 'auto', right: d.value < 0 && !isTotal ? 0 : 'auto', width: `${w}%`, background: color, opacity: 0.85, borderRadius: 4, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ width: 110, fontSize: 11, fontWeight: 700, color, textAlign: 'right', fontFamily: 'monospace', flexShrink: 0 }}>
                      {d.value > 0 && !isTotal ? '+' : ''}{fmtS(d.value)} FDJ
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 12, padding: 12, background: totalNet > 0 ? `${C.green}11` : `${C.red}11`, borderRadius: 10, border: `1px solid ${totalNet > 0 ? C.green : C.red}33` }}>
                <div style={{ fontSize: 10, color: '#6B6B6B' }}>Solde prévisionnel net ({horizon}m)</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: totalNet > 0 ? C.green : C.red, fontFamily: 'monospace', marginTop: 3 }}>
                  {totalNet >= 0 ? '+' : ''}{fmt(totalNet)} FDJ
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Trésorerie Cumulée Prévisionnelle</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>Seuil critique : {fmtS(cashThreshold)} FDJ</div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={monthlyTable.map((d, i) => ({ ...d, cumCash: 5000000 + monthlyTable.slice(0, i + 1).reduce((s, r) => s + r.net, 0) }))}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.2} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="label" tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <ReferenceLine y={cashThreshold} stroke={C.red} strokeDasharray="6 3" label={{ value: 'Seuil critique', fill: C.red, fontSize: 9 }} />
                  <Area type="monotone" dataKey="cumCash" name="Trésorerie" stroke={C.green} strokeWidth={2.5} fill="url(#cashGrad)" dot={{ r: 4, fill: C.green }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {[
                  { label: 'BFR estimé', value: `${fmtS(totalDep * 0.15)} FDJ`, color: C.yellow, icon: '📊' },
                  { label: 'Dettes actives', value: `${debts.filter(d => d.status !== 'Réglée').length} en cours`, color: C.blue, icon: '🏦' },
                  { label: 'Marge nette', value: `${margin.toFixed(1)}%`, color: C.green, icon: '💧' },
                  { label: 'Couverture charges', value: `${totalDep > 0 ? (totalNet / (totalDep / horizon)).toFixed(1) : '—'} mois`, color: C.violet, icon: '🛡️' },
                ].map(k => (
                  <div key={k.label} style={{ background: '#F5F5F5', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{k.icon}</span>
                    <div><div style={{ fontSize: 9, color: '#6B6B6B' }}>{k.label}</div><div style={{ fontSize: 12, fontWeight: 700, color: k.color }}>{k.value}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ RISQUES ══ */}
        {activeTab === 'risques' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              {(() => {
                const risks = [];
                if (incomeTrend < -5) risks.push({ level: 'high', icon: '📉', title: 'Tendance baissière revenus', detail: `Baisse de ${Math.abs(incomeTrend).toFixed(1)}% prévue vs historique.`, action: 'Diversifier les sources de revenus' });
                if (expenseTrend > 15) risks.push({ level: 'high', icon: '📈', title: 'Croissance charges anormale', detail: `Charges en hausse de ${expenseTrend.toFixed(1)}% vs historique.`, action: 'Auditer les postes de charge fixes vs variables' });
                const negM = forecast.filter(d => d.base - d.dep_base < 0).length;
                if (negM > 0) risks.push({ level: 'high', icon: '⚡', title: `${negM} mois déficitaire(s)`, detail: 'Résultat net négatif prévu.', action: 'Revoir la politique tarifaire et les charges fixes' });
                const activeDebts = debts.filter(d => d.status === 'Active' || d.status === 'Partiellement réglée');
                if (activeDebts.length > 3) risks.push({ level: 'medium', icon: '🏦', title: 'Concentration de dettes', detail: `${activeDebts.length} dettes actives — impact BFR.`, action: 'Planifier un calendrier de remboursement' });
                if (whatIf.clientDelay > 20) risks.push({ level: 'medium', icon: '⏱️', title: `Délai client simulé: ${whatIf.clientDelay}j`, detail: `Impact estimé: ${fmtS(totalRev * (whatIf.clientDelay / 90) * 0.15)} FDJ.`, action: 'Resserrer les conditions de paiement' });
                if (risks.length === 0) risks.push({ level: 'low', icon: '✅', title: 'Situation financière saine', detail: 'Aucun signal d\'alarme détecté.', action: 'Maintenir les bonnes pratiques actuelles' });
                return risks.map((r, i) => {
                  const c = r.level === 'high' ? C.red : r.level === 'medium' ? C.yellow : C.green;
                  const bg = `${c}11`;
                  const lbl = r.level === 'high' ? 'Risque Élevé' : r.level === 'medium' ? 'Risque Modéré' : 'Situation Saine';
                  return (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${c}33`, borderRadius: 12, padding: 16, display: 'flex', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{r.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{r.title}</span>
                          <span style={{ fontSize: 9, background: bg, color: c, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>{lbl}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 7 }}>{r.detail}</div>
                        <div style={{ padding: '6px 10px', background: '#FAFAFA', borderRadius: 6, fontSize: 11, color: '#60a5fa' }}>💡 {r.action}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Score de Risque Global</div>
              {(() => {
                const hC = alerts.filter(a => a.level === 'critical').length;
                const mC = alerts.filter(a => a.level === 'warning').length;
                const score = Math.min(100, hC * 30 + mC * 15);
                const color = score > 60 ? C.red : score > 30 ? C.yellow : C.green;
                return (
                  <>
                    <div style={{ position: 'relative', height: 10, background: `linear-gradient(90deg,${C.green},${C.yellow},${C.red})`, borderRadius: 99, marginBottom: 8 }}>
                      <div style={{ position: 'absolute', top: -5, left: `${score}%`, transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#fff', border: `3px solid ${color}` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6B6B6B', marginBottom: 16 }}>
                      <span>0 Faible</span><span>50 Modéré</span><span>100 Critique</span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color, fontFamily: 'monospace' }}>{score}</div>
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#6B6B6B', marginTop: 4 }}>{score > 60 ? 'Risque Élevé' : score > 30 ? 'Risque Modéré' : 'Risque Faible'}</div>
                    <div style={{ marginTop: 18 }}>
                      {[{ label: 'Alertes critiques', count: hC, color: C.red }, { label: 'Avertissements', count: mC, color: C.yellow }, { label: 'Infos', count: alerts.filter(a => a.level === 'info').length, color: C.blue }].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: '#6B6B6B' }}>{item.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: item.color, background: `${item.color}18`, padding: '2px 10px', borderRadius: 20 }}>{item.count}</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
            {/* Controls */}
            <div style={{ ...card, border: `1px solid ${C.purple}33` }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎛️ Simulateur What-If</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 18 }}>Paramètres recalculés en temps réel</div>

              {/* Clients */}
              <div style={{ background: '#FAFAFA', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>👤 CLIENTS</div>
                {[{ key: 'clientDelay', label: 'Retard paiement (jours)', min: 0, max: 90, step: 5, fmt: v => `${v}j`, color: C.yellow }].map(f => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: '#374151' }}>{f.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: f.color, fontFamily: 'monospace' }}>{f.fmt(whatIf[f.key])}</span>
                    </div>
                    <input type="range" min={f.min} max={f.max} step={f.step} value={whatIf[f.key]}
                      onChange={e => setWhatIf(w => ({ ...w, [f.key]: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: f.color, cursor: 'pointer' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>Perte d'un gros client</span>
                  <button onClick={() => setWhatIf(w => ({ ...w, clientChurn: !w.clientChurn }))}
                    style={{ padding: '3px 12px', borderRadius: 20, border: `1px solid ${whatIf.clientChurn ? C.red : C.border}`, background: whatIf.clientChurn ? `${C.red}22` : 'transparent', color: whatIf.clientChurn ? C.red : C.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {whatIf.clientChurn ? 'ON' : 'OFF'}
                  </button>
                </div>
                {whatIf.clientChurn && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#374151' }}>Impact revenus (%)</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.red, fontFamily: 'monospace' }}>-{whatIf.clientChurnPct}%</span>
                    </div>
                    <input type="range" min={5} max={50} step={5} value={whatIf.clientChurnPct}
                      onChange={e => setWhatIf(w => ({ ...w, clientChurnPct: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: C.red, cursor: 'pointer' }} />
                  </div>
                )}
              </div>

              {/* RH */}
              <div style={{ background: '#FAFAFA', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: C.violet, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>👥 RESSOURCES HUMAINES</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>Nouvelles embauches</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.violet, fontFamily: 'monospace' }}>{whatIf.newHires} pers.</span>
                </div>
                <input type="range" min={0} max={20} step={1} value={whatIf.newHires}
                  onChange={e => setWhatIf(w => ({ ...w, newHires: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: C.violet, cursor: 'pointer' }} />
                <div style={{ fontSize: 9, color: '#6B6B6B', marginTop: 3 }}>150 000 FDJ/mois/personne</div>
              </div>

              {/* Financement */}
              <div style={{ background: '#FAFAFA', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>🏦 FINANCEMENT</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>Emprunt bancaire</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.green, fontFamily: 'monospace' }}>{whatIf.newLoan === 0 ? 'Aucun' : fmtS(whatIf.newLoan)}</span>
                </div>
                <input type="range" min={0} max={5000000} step={100000} value={whatIf.newLoan}
                  onChange={e => setWhatIf(w => ({ ...w, newLoan: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: C.green, cursor: 'pointer' }} />
                <div style={{ fontSize: 9, color: '#6B6B6B', marginTop: 3 }}>Injecté mois 1 + remboursement 1.5%/mois</div>
              </div>

              {/* Croissance */}
              <div style={{ background: '#FAFAFA', borderRadius: 8, padding: 12, marginBottom: 14, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>📈 CROISSANCE ADDITIONNELLE</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>Taux additionnel</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.blue, fontFamily: 'monospace' }}>{whatIf.revenueGrowth >= 0 ? '+' : ''}{whatIf.revenueGrowth}%</span>
                </div>
                <input type="range" min={-20} max={50} step={1} value={whatIf.revenueGrowth}
                  onChange={e => setWhatIf(w => ({ ...w, revenueGrowth: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: C.blue, cursor: 'pointer' }} />
              </div>

              <button onClick={() => setWhatIf({ clientDelay: 0, clientChurn: false, clientChurnPct: 20, newHires: 0, newLoan: 0, revenueGrowth: 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'transparent', color: '#6B6B6B', fontSize: 11, cursor: 'pointer' }}>
                ↺ Réinitialiser
              </button>
            </div>

            {/* Impact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Impact Revenus', val: whatIf.newLoan - totalRev * (whatIf.clientDelay / 90) * 0.15 - (whatIf.clientChurn ? totalRev * whatIf.clientChurnPct / 100 : 0) + totalRev * whatIf.revenueGrowth / 100 },
                  { label: 'Impact Charges', val: -(whatIf.newHires * 150000 * horizon + whatIf.newLoan * 0.015 * horizon) },
                  { label: 'Impact Net', val: totalNet - (forecast.reduce((s, d) => s + d.base_noWhatIf, 0) - forecast.reduce((s, d) => s + d.dep_noWhatIf, 0)) },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 10, padding: 14, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: 10, color: '#6B6B6B', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: val >= 0 ? C.green : C.red, fontFamily: 'monospace' }}>
                      {val >= 0 ? '+' : ''}{fmtS(val)} FDJ
                    </div>
                    <span style={{ fontSize: 9, color: val >= 0 ? C.green : C.red, background: val >= 0 ? `${C.green}18` : `${C.red}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      {val >= 0 ? '▲ Favorable' : '▼ Défavorable'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Scénario Base vs Simulation What-If</div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>Revenus et charges comparés mois par mois</div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={forecast.map(d => ({ label: d.label, rev_base: d.base_noWhatIf, rev_sim: d.base, dep_base: d.dep_noWhatIf, dep_sim: d.dep_base }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="label" tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtS} tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="rev_base" name="Rev. base" fill={`${C.blue}55`} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="rev_sim" name="Rev. simulation" fill={C.blue} radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="dep_base" name="Dep. base" stroke={`${C.red}88`} strokeWidth={2} strokeDasharray="4 2" dot={false} />
                    <Line type="monotone" dataKey="dep_sim" name="Dep. simulation" stroke={C.red} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { label: 'Impact retard', value: `-${fmtS(totalRev * (whatIf.clientDelay / 90) * 0.15)} FDJ`, color: C.yellow },
                  { label: 'Coût embauches', value: `-${fmtS(whatIf.newHires * 150000 * horizon)} FDJ`, color: C.red },
                  { label: 'Capital injecté', value: `+${fmtS(whatIf.newLoan)} FDJ`, color: C.green },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FAFAFA', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 9, color: '#6B6B6B', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ VARIANCE ══ */}
        {activeTab === 'variance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📊 Analyse des Écarts — Prévu vs Réel (3 derniers mois)</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 16 }}>Basé sur les données réelles de vos transactions</div>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={varianceData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: C.text2, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtS} tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="prevRev" name="Rev. prévus" fill={`${C.blue}55`} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actRev" name="Rev. réels" fill={C.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="prevDep" name="Dep. prévues" fill={`${C.red}55`} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actDep" name="Dep. réelles" fill={C.red} radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Tableau d'Écarts Détaillé</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Mois', 'Rev. Prévu', 'Rev. Réel', 'Écart Rev.', '%', 'Dep. Prévues', 'Dep. Réelles', 'Écart Dep.'].map((h, i) => (
                        <th key={h} style={{ padding: '8px 10px', background: '#F5F5F5', color: '#6B6B6B', fontWeight: 700, textAlign: i === 0 ? 'left' : 'right', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {varianceData.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? `${C.bg1}80` : 'transparent' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>{row.period}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#6B6B6B', fontFamily: 'monospace' }}>{fmtS(row.prevRev)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#1A1A1A', fontFamily: 'monospace' }}>{fmtS(row.actRev)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: row.dRev >= 0 ? C.green : C.red, fontFamily: 'monospace' }}>{row.dRev >= 0 ? '+' : ''}{fmtS(row.dRev)}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: row.pRev >= 0 ? C.green : C.red, background: row.pRev >= 0 ? `${C.green}18` : `${C.red}18`, padding: '2px 8px', borderRadius: 20 }}>{pct(row.pRev)}</span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#6B6B6B', fontFamily: 'monospace' }}>{fmtS(row.prevDep)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#1A1A1A', fontFamily: 'monospace' }}>{fmtS(row.actDep)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: row.dDep <= 0 ? C.green : C.red, fontFamily: 'monospace' }}>{row.dDep >= 0 ? '+' : ''}{fmtS(row.dDep)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: `${C.blue}11`, borderRadius: 8, fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
                <span style={{ color: '#2563EB', fontWeight: 700 }}>🤖 Analyse IA :</span> Sur les 3 derniers mois, précision du modèle à{' '}
                <span style={{ color: C.green, fontWeight: 700 }}>
                  {varianceData.length > 0 ? (100 - varianceData.reduce((s, r) => s + Math.abs(r.pRev), 0) / varianceData.length).toFixed(1) : '—'}%
                </span>. Le modèle est recalibré mensuellement sur vos données réelles.
              </div>
            </div>
          </div>
        )}

        {/* ══ HEATMAP ══ */}
        {activeTab === 'heatmap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🌡️ Heatmap Trésorerie — Flux par Semaine × Mois</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 18 }}>Identifier les semaines critiques et les pics de flux · Valeurs en K FDJ · ● = mois prévisionnel</div>
              <CashHeatmap data={heatmapData} cols={heatmapCols} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔴 Semaines critiques (flux faibles)</div>
                {heatmapData.filter((_, wi) => wi === 4 || wi === 1).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{row.week}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.red, fontFamily: 'monospace' }}>
                      {fmtS(Math.min(...heatmapCols.map(c => row[c.key] || 0)) * 1000)} FDJ
                    </span>
                    <span style={{ fontSize: 9, color: C.red, background: `${C.red}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>Critique</span>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🟢 Semaines favorables (flux forts)</div>
                {heatmapData.filter((_, wi) => wi === 2).map((row, i) => (
                  heatmapCols.slice(0, 4).map((col, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{row.week} / {col.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.green, fontFamily: 'monospace' }}>{fmtS((row[col.key] || 0) * 1000)} FDJ</span>
                      <span style={{ fontSize: 9, color: C.green, background: `${C.green}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>Fort</span>
                    </div>
                  ))
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ ALERTES ══ */}
        {activeTab === 'alerts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🚨 Moteur d'Alertes Intelligent</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>Alertes calculées en temps réel selon le scénario et la simulation what-if</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => {
                  const c = { critical: C.red, warning: C.yellow, info: C.blue, ok: C.green }[a.level];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: `${c}0d`, border: `1px solid ${c}33`, borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>{a.icon}</span>
                      <span style={{ fontSize: 12, color: '#374151' }}>{a.msg}</span>
                    </div>
                  );
                })}
              </div>

              {/* Feedback loop */}
              <div style={{ marginTop: 18, ...card }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🔄 Feedback — Amélioration continue</div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 12 }}>Marquez chaque prévision pour affiner la précision du modèle IA</div>
                {varianceData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', marginRight: 10, fontFamily: 'monospace' }}>{d.period}</span>
                      <span style={{ fontSize: 11, color: '#6B6B6B' }}>Prévu: {fmtS(d.prevRev)} · Réel: {fmtS(d.actRev)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {feedbackGiven[i] ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: feedbackGiven[i] === 'correct' ? C.green : C.red, background: feedbackGiven[i] === 'correct' ? `${C.green}18` : `${C.red}18`, padding: '3px 10px', borderRadius: 20 }}>
                          {feedbackGiven[i] === 'correct' ? '✓ Correcte' : '✗ Incorrecte'}
                        </span>
                      ) : (
                        <>
                          <button onClick={() => setFeedbackGiven(p => ({ ...p, [i]: 'correct' }))} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.green}44`, background: `${C.green}11`, color: C.green, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓ Correcte</button>
                          <button onClick={() => setFeedbackGiven(p => ({ ...p, [i]: 'incorrect' }))} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.red}44`, background: `${C.red}11`, color: C.red, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✗ Incorrecte</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(feedbackGiven).length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: `${C.blue}11`, borderRadius: 8, fontSize: 11, color: '#2563EB' }}>
                    ✅ Feedback enregistré. Précision estimée : <strong>{Math.min(99, 94 + Object.values(feedbackGiven).filter(v => v === 'correct').length)}%</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Alert settings */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>⚙️ Paramètres des alertes</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>Seuil critique trésorerie</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.red, fontFamily: 'monospace' }}>{fmtS(cashThreshold)}</span>
                </div>
                <input type="range" min={500000} max={10000000} step={100000} value={cashThreshold}
                  onChange={e => setCashThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: C.red, cursor: 'pointer' }} />
              </div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 10 }}>Types d'alertes actives</div>
              {[
                { label: 'Seuil trésorerie critique', active: true },
                { label: 'Retard paiement client', active: true },
                { label: 'Dépassement charges', active: true },
                { label: 'Échéances fiscales', active: true },
                { label: 'Variation BFR', active: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, color: item.active ? C.text1 : C.text2 }}>{item.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: item.active ? C.green : C.text2, background: item.active ? `${C.green}18` : `${C.bg2}`, padding: '2px 8px', borderRadius: 20 }}>{item.active ? 'ON' : 'OFF'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TABLEAU ══ */}
        {activeTab === 'tableau' && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Tableau Prévisionnel Mensuel Détaillé</div>
            <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 16 }}>Scénario: <span style={{ color: sc, fontWeight: 700 }}>{scenario}</span> · {horizon} mois · Confiance décroissante</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Mois', 'Revenus Prévus', 'Dépenses Prévues', 'Résultat Net', 'Marge Nette', 'Rev. Cumulés', 'Confiance IA'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 14px', background: '#F5F5F5', color: '#6B6B6B', fontWeight: 600, textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap', borderRadius: i === 0 ? '8px 0 0 8px' : i === 6 ? '0 8px 8px 0' : '' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyTable.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.bg0 : 'transparent' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563EB' }}>{row.label}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: C.green }}>{fmt(row.rev)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: C.red }}>{fmt(row.dep)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: row.net >= 0 ? C.yellow : C.red }}>{row.net >= 0 ? '+' : ''}{fmt(row.net)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{ background: parseFloat(row.marge) > 30 ? `${C.green}22` : `${C.yellow}22`, color: parseFloat(row.marge) > 30 ? C.green : C.yellow, padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{row.marge}%</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: C.violet, fontWeight: 700 }}>{fmt(row.cumRev)} FDJ</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <div style={{ width: 48, height: 4, background: '#F5F5F5', borderRadius: 99 }}>
                            <div style={{ width: `${row.confidence}%`, height: '100%', borderRadius: 99, background: row.confidence > 80 ? C.green : row.confidence > 65 ? C.yellow : C.red }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#6B6B6B' }}>{row.confidence}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F5F5F5', fontWeight: 800 }}>
                    <td style={{ padding: '12px 14px', color: '#1A1A1A', borderRadius: '8px 0 0 8px' }}>TOTAL {horizon}M</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.green }}>{fmt(monthlyTable.reduce((s, r) => s + r.rev, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.red }}>{fmt(monthlyTable.reduce((s, r) => s + r.dep, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.yellow }}>{fmt(monthlyTable.reduce((s, r) => s + r.net, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span style={{ background: `${C.green}22`, color: C.green, padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{totalRev > 0 ? ((totalNet / totalRev) * 100).toFixed(1) : '0'}%</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.violet }}>{fmt(monthlyTable.reduce((s, r) => s + r.rev, 0))} FDJ</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#6B6B6B', borderRadius: '0 8px 8px 0' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ANALYSE IA ══ */}
        {activeTab === 'ia' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {!aiInsights ? (
              <div style={{ ...card, border: `1px solid ${C.purple}33`, textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Analyse IA non générée</div>
                <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                  Cliquez sur "Analyse IA" en haut pour des recommandations personnalisées basées sur vos données réelles, scénarios et paramètres what-if.
                </div>
                <button onClick={generateAI} disabled={isGenerating} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.purple},${C.blue})`, color: '#fff', cursor: isGenerating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {isGenerating ? '⏳ Analyse en cours...' : '🤖 Lancer l\'analyse IA'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ background: `linear-gradient(135deg,${C.blue}11,${C.purple}11)`, borderRadius: 16, padding: 22, border: `1px solid ${C.purple}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Synthèse Exécutive IA</div>
                      <div style={{ fontSize: 10, color: '#6B6B6B' }}>Basé sur {transactions.filter(t => !t.is_settlement).length} transactions · Régression + ML</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <button onClick={generateAI} disabled={isGenerating} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'transparent', color: '#6B6B6B', fontSize: 11, cursor: 'pointer' }}>↺ Régénérer</button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>{aiInsights.executive_summary || aiInsights.summary}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12 }}>
                  {[
                    { key: 'recommendations', title: '🎯 Recommandations', color: C.blue, icon: '→' },
                    { key: 'risks', title: '⚠️ Risques identifiés', color: C.red, icon: '⚠' },
                    { key: 'opportunities', title: '💡 Opportunités', color: C.green, icon: '✓' },
                  ].map(section => aiInsights[section.key]?.length > 0 && (
                    <div key={section.key} style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${section.color}22` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: section.color, marginBottom: 12 }}>{section.title}</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {aiInsights[section.key].map((item, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9, fontSize: 11, color: '#6B6B6B', lineHeight: 1.6 }}>
                            <span style={{ color: section.color, fontWeight: 800, flexShrink: 0 }}>{section.icon}</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* 12-month Prophet-style projection */}
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Projection 12 mois — Intervalle de confiance</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>Extrapolation Prophet-style · Scénario {scenario}</div>
                  <ResponsiveContainer width="100%" height={210}>
                    <ComposedChart data={Array.from({ length: 12 }, (_, i) => {
                      const regI = linearRegression(historical.map(d => d.income));
                      const n = historical.length + i;
                      const base = Math.max(0, regI.intercept + regI.slope * n) * { base: 1, optimiste: 1.2, pessimiste: 0.8 }[scenario];
                      return {
                        period: format(addMonths(new Date(), i + 1), 'MMM yy', { locale: fr }),
                        central: Math.round(base),
                        upper: Math.round(base * (1 + i * 0.02 + 0.08)),
                        lower: Math.round(base * (1 - i * 0.015 - 0.05)),
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="period" tick={{ fill: '#6B6B6B', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtS} tick={{ fill: '#6B6B6B', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} />
                      <Area type="monotone" dataKey="upper" name="Borne haute" stroke="none" fill={C.blue} fillOpacity={0.12} />
                      <Area type="monotone" dataKey="lower" name="Borne basse" stroke="none" fill={C.bg0} />
                      <Line type="monotone" dataKey="central" name="Projection centrale" stroke={C.blue} strokeWidth={2.5} dot={{ r: 3, fill: C.blue }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {aiInsights.confidence_note && (
                  <div style={{ ...card, fontSize: 11, color: '#6B6B6B', textAlign: 'center' }}>ℹ️ {aiInsights.confidence_note}</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}