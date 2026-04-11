import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle, CheckCircle2, TrendingUp, FileText, DollarSign,
  Calendar, Download, CreditCard, Plus, Eye, RefreshCw, Brain,
  AlertCircle, XCircle, ChevronRight, Info, BarChart3, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TVA_RATE = 0.10;
const TVA_THRESHOLD = 10_000_000;

const EXCLUDED_SOURCES = ['Apport Capital', 'Prêt Bancaire', 'Remboursement Prêt', 'Compte Courant Associé'];
const EXCLUDED_CATEGORIES = ['Investissement', 'Capital', 'Prêt', 'Donation', 'Transfert interne'];

function isAutoExcluded(tx) {
  return EXCLUDED_SOURCES.includes(tx.source) || EXCLUDED_CATEGORIES.includes(tx.category);
}

function printPDF(htmlContent) {
  const win = window.open('', '_blank');
  win.document.write(htmlContent);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

function generateDeclarationPDF(decl, transactions, company) {
  const incluses = transactions.filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t));
  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Déclaration TVA ${decl.periode}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; font-size: 13px; }
      .header { text-align: center; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { font-size: 22px; margin: 0; } .header p { color: #666; margin: 4px 0; }
      .section { margin-bottom: 24px; }
      .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; color: #0066FF; }
      .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
      .kpi { background: #f7f9fc; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; text-align: center; }
      .kpi .value { font-size: 20px; font-weight: bold; color: #0066FF; }
      .kpi .label { font-size: 11px; color: #666; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #1a1a1a; color: white; padding: 8px; text-align: left; }
      td { border-bottom: 1px solid #f0f0f0; padding: 7px 8px; }
      tr:nth-child(even) td { background: #fafafa; }
      .total-row td { font-weight: bold; background: #f0f7ff !important; border-top: 2px solid #0066FF; }
      .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; display: flex; justify-content: space-between; }
      .badge-inclus { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
      .badge-exclu { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
    </style></head><body>
    <div class="header">
      <h1>DÉCLARATION TVA MENSUELLE</h1>
      <p>République de Djibouti — Direction Générale des Impôts</p>
      <p>Entreprise : <strong>${company?.nom_entreprise || 'N/A'}</strong> | NIF : <strong>${company?.nif || 'N/A'}</strong></p>
      <p>Période : <strong>${decl.periode}</strong> | Réf : <strong>${decl.numero_declaration}</strong></p>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="value">${(decl.ca_taxable || 0).toLocaleString()} DJF</div><div class="label">CA Taxable (INCLURE)</div></div>
      <div class="kpi"><div class="value">${(decl.ca_non_taxable || 0).toLocaleString()} DJF</div><div class="label">CA Non Taxable</div></div>
      <div class="kpi"><div class="value">${(decl.tva_finale || 0).toLocaleString()} DJF</div><div class="label">TVA Due (10%)</div></div>
    </div>
    <div class="section">
      <div class="section-title">Détail des Transactions Incluses (TVA 10%)</div>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Client</th><th>Montant HT</th><th>TVA 10%</th><th>Montant TTC</th></tr></thead>
        <tbody>
          ${incluses.map(t => `<tr>
            <td>${t.date || '-'}</td>
            <td>${t.description || '-'}</td>
            <td>${t.contact_name || '-'}</td>
            <td>${(t.amount || 0).toLocaleString()} DJF</td>
            <td>${Math.round((t.amount || 0) * TVA_RATE).toLocaleString()} DJF</td>
            <td>${Math.round((t.amount || 0) * 1.1).toLocaleString()} DJF</td>
          </tr>`).join('')}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>${(decl.ca_taxable || 0).toLocaleString()} DJF</td>
            <td>${(decl.tva_calculee || 0).toLocaleString()} DJF</td>
            <td>${Math.round((decl.ca_taxable || 0) * 1.1).toLocaleString()} DJF</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="footer">
      <div><p><strong>Statut :</strong> ${decl.statut}</p><p><strong>Date limite :</strong> ${decl.date_limite || 'N/A'}</p></div>
      <div style="text-align:right"><p><strong>Généré le :</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p><p>Signature système : Paie360</p></div>
    </div>
    </body></html>`;
  printPDF(html);
}

export default function GestionTVA() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDeclarationDialog, setShowDeclarationDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedDecl, setSelectedDecl] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [declPeriode, setDeclPeriode] = useState(format(new Date(), 'yyyy-MM'));
  const [filterMonth, setFilterMonth] = useState('all');

  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date', 500),
  });

  const { data: declarations = [] } = useQuery({
    queryKey: ['tva-declarations'],
    queryFn: () => meras.entities.TVADeclaration.list('-created_date'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list(),
  });

  const company = companies[0] || {};

  // Only revenue transactions
  const revenueTransactions = useMemo(() =>
    transactions.filter(t => t.type === 'Revenu'), [transactions]);

  // Cumulative CA (all revenue)
  const totalCA = useMemo(() =>
    revenueTransactions.reduce((s, t) => s + (t.amount || 0), 0), [revenueTransactions]);

  // TVA active based on INCLURE-classified transactions only
  const tvaActive = useMemo(() => {
    const inclTotal = revenueTransactions
      .filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t))
      .reduce((s, t) => s + (t.amount || 0), 0);
    return inclTotal >= TVA_THRESHOLD;
  }, [revenueTransactions]);

  // Find threshold crossing date (based on INCLURE transactions)
  const thresholdDate = useMemo(() => {
    let cumul = 0;
    const sorted = [...revenueTransactions]
      .filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const t of sorted) {
      cumul += t.amount || 0;
      if (cumul >= TVA_THRESHOLD) return t.date;
    }
    return null;
  }, [revenueTransactions]);

  // TVA-included transactions
  const includedTx = useMemo(() =>
    revenueTransactions.filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t)),
    [revenueTransactions]);

  const excludedTx = useMemo(() =>
    revenueTransactions.filter(t => t.tva_inclusion !== 'INCLURE' || isAutoExcluded(t)),
    [revenueTransactions]);

  const totalTaxable = useMemo(() =>
    includedTx.reduce((s, t) => s + (t.amount || 0), 0), [includedTx]);

  const totalTVA = Math.round(totalTaxable * TVA_RATE);

  // Alerts
  const alerts = useMemo(() => {
    const list = [];
    if (!tvaActive && totalTaxable > TVA_THRESHOLD * 0.8) {
      list.push({ type: 'warning', msg: `CA classifié proche du seuil TVA (${(totalTaxable / 1_000_000).toFixed(1)}M / 10M DJF)`, icon: AlertTriangle });
    }
    if (tvaActive) {
      list.push({ type: 'info', msg: `TVA activée depuis le ${thresholdDate ? format(new Date(thresholdDate), 'dd/MM/yyyy') : 'N/A'}`, icon: Info });
    }
    const noInclusion = revenueTransactions.filter(t => !t.tva_inclusion && !isAutoExcluded(t));
    if (noInclusion.length > 0) {
      list.push({ type: 'error', msg: `${noInclusion.length} transaction(s) sans classification TVA`, icon: XCircle });
    }
    const noFacture = includedTx.filter(t => !t.attachments?.length && !t.numero_facture);
    if (noFacture.length > 0) {
      list.push({ type: 'error', msg: `${noFacture.length} transaction(s) taxables sans facture associée`, icon: AlertCircle });
    }
    return list;
  }, [revenueTransactions, includedTx, tvaActive, thresholdDate]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const byMonth = {};
    revenueTransactions.forEach(t => {
      if (!t.date) return;
      const m = t.date.substring(0, 7);
      if (!byMonth[m]) byMonth[m] = { month: m, taxable: 0, nonTaxable: 0, tva: 0 };
      if (t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t)) {
        byMonth[m].taxable += t.amount || 0;
        byMonth[m].tva += Math.round((t.amount || 0) * TVA_RATE);
      } else {
        byMonth[m].nonTaxable += t.amount || 0;
      }
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [revenueTransactions]);

  // Update TVA inclusion on a transaction
  const updateInclusion = async (txId, value) => {
    await meras.entities.Transaction.update(txId, { tva_inclusion: value });
    queryClient.invalidateQueries(['transactions']);
    toast.success('Classification TVA mise à jour');
  };

  // Create declaration
  const createDeclMutation = useMutation({
    mutationFn: async () => {
      const year = declPeriode.substring(0, 4);
      const month = declPeriode.substring(5, 7);
      const monthStart = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const monthEnd = `${year}-${month}-${lastDay}`;

      const monthTx = revenueTransactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
      const inclTx = monthTx.filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t));
      const caT = inclTx.reduce((s, t) => s + (t.amount || 0), 0);
      const caNoT = monthTx.filter(t => t.tva_inclusion !== 'INCLURE' || isAutoExcluded(t)).reduce((s, t) => s + (t.amount || 0), 0);
      const tva = Math.round(caT * TVA_RATE);
      const periodeLabel = format(new Date(`${year}-${month}-01`), 'MMMM yyyy', { locale: fr });
      const limitDate = format(addDays(new Date(`${year}-${month}-${lastDay}`), 15), 'yyyy-MM-dd');

      return meras.entities.TVADeclaration.create({
        numero_declaration: `TVA-${year}-${month}`,
        periode: periodeLabel.charAt(0).toUpperCase() + periodeLabel.slice(1),
        mois_annee: `${year}${month}`,
        ca_taxable: caT,
        ca_non_taxable: caNoT,
        ca_total: caT + caNoT,
        tva_calculee: tva,
        ajustements: 0,
        tva_finale: tva,
        statut: 'Non payé',
        date_limite: limitDate,
        transaction_ids: inclTx.map(t => t.id),
        nombre_transactions_incluses: inclTx.length,
        nombre_transactions_exclues: monthTx.length - inclTx.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tva-declarations']);
      setShowDeclarationDialog(false);
      toast.success('Déclaration TVA générée avec succès');
    },
  });

  // Mark as paid
  const payDeclMutation = useMutation({
    mutationFn: (decl) => meras.entities.TVADeclaration.update(decl.id, {
      statut: 'Payé',
      date_paiement: format(new Date(), 'yyyy-MM-dd'),
      payment_reference: `PAY-TVA-${Date.now()}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tva-declarations']);
      setShowPaymentDialog(false);
      toast.success('Paiement TVA enregistré');
    },
  });

  // AI suggestions
  const handleAISuggest = async () => {
    setAiLoading(true);
    try {
      const sample = revenueTransactions.slice(0, 20).map(t => ({
        desc: t.description, amount: t.amount, source: t.source, cat: t.category, inclusion: t.tva_inclusion
      }));
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert fiscal Djibouti. Analyse ces transactions de revenus et pour chacune, suggère si elle doit être INCLURE ou EXCLURE de la TVA (taux 10%). Donne aussi 3 recommandations fiscales. Transactions: ${JSON.stringify(sample)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'object', properties: { desc: { type: 'string' }, suggestion: { type: 'string' }, raison: { type: 'string' } } } },
            recommandations: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setAiSuggestions(result);
    } catch {
      toast.error('Erreur IA');
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'revenus', label: 'Revenus TVA', icon: TrendingUp },
    { id: 'declarations', label: 'Déclarations', icon: FileText },
    { id: 'alertes', label: `Alertes ${alerts.length > 0 ? `(${alerts.length})` : ''}`, icon: AlertTriangle },
  ];

  const filteredRevTx = useMemo(() => {
    if (filterMonth === 'all') return revenueTransactions;
    return revenueTransactions.filter(t => t.date?.startsWith(filterMonth));
  }, [revenueTransactions, filterMonth]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(revenueTransactions.map(t => t.date?.substring(0, 7)).filter(Boolean))].sort().reverse();
    return months;
  }, [revenueTransactions]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#7C3AED] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">TVA & Déclarations Fiscales</h1>
            </div>
            <p className="text-sm text-[#6B6B6B] ml-13">Moteur fiscal intelligent — République de Djibouti (TVA 10%)</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={tvaActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}>
              {tvaActive ? '✅ TVA Active' : '⏳ Sous seuil TVA'}
            </Badge>
            <Button onClick={() => setShowDeclarationDialog(true)} className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
              <Plus className="w-4 h-4 mr-2" /> Générer Déclaration
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E5E7EB] px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#0066FF] text-[#0066FF]'
                  : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Seuil TVA banner */}
            <Card className={`border ${tvaActive ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tvaActive ? 'bg-green-600' : 'bg-yellow-500'}`}>
                    {tvaActive ? <CheckCircle2 className="w-6 h-6 text-white" /> : <AlertTriangle className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-base ${tvaActive ? 'text-green-800' : 'text-yellow-800'}`}>
                      {tvaActive ? 'TVA activée — Seuil dépassé' : 'Seuil TVA non atteint'}
                    </h3>
                    <p className={`text-sm ${tvaActive ? 'text-green-700' : 'text-yellow-700'}`}>
                      CA classifié INCLURE : <strong>{totalTaxable.toLocaleString()} DJF</strong> / seuil : <strong>10 000 000 DJF</strong>
                      {tvaActive && thresholdDate && ` — Activée depuis le ${format(new Date(thresholdDate), 'dd/MM/yyyy')}`}
                    </p>
                    <p className={`text-xs mt-1 ${tvaActive ? 'text-green-600' : 'text-yellow-600'}`}>
                      CA total revenus : {totalCA.toLocaleString()} DJF — classifiez les transactions pour activer la TVA
                    </p>
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#6B6B6B]">Progression</span>
                    <span className="font-medium">{Math.min(100, Math.round(totalTaxable / TVA_THRESHOLD * 100))}%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 border">
                    <div className={`h-2 rounded-full ${tvaActive ? 'bg-green-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(100, totalTaxable / TVA_THRESHOLD * 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'CA Taxable', value: `${(totalTaxable / 1000).toFixed(0)}K DJF`, sub: `${includedTx.length} transactions`, color: 'blue' },
                { label: 'TVA Due Totale', value: `${(totalTVA / 1000).toFixed(0)}K DJF`, sub: '10% du CA taxable', color: 'purple' },
                { label: 'Déclarations Payées', value: declarations.filter(d => d.statut === 'Payé').length, sub: `sur ${declarations.length} total`, color: 'green' },
                { label: 'Alertes Actives', value: alerts.length, sub: 'à traiter', color: alerts.length > 0 ? 'red' : 'gray' },
              ].map((kpi, i) => (
                <Card key={i} className="border border-[#E5E7EB] bg-white">
                  <CardContent className="p-5">
                    <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-2">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${
                      kpi.color === 'blue' ? 'text-[#0066FF]' :
                      kpi.color === 'purple' ? 'text-[#7C3AED]' :
                      kpi.color === 'green' ? 'text-green-600' :
                      kpi.color === 'red' ? 'text-red-600' : 'text-[#1A1A1A]'
                    }`}>{kpi.value}</p>
                    <p className="text-xs text-[#9B9B9B] mt-1">{kpi.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border border-[#E5E7EB] bg-white">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#1A1A1A] mb-4">CA Taxable vs Non Taxable (6 derniers mois)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v) => `${v.toLocaleString()} DJF`} />
                      <Bar dataKey="taxable" name="CA Taxable" fill="#0066FF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="nonTaxable" name="CA Non Taxable" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tva" name="TVA (10%)" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border border-[#E5E7EB] bg-white">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#1A1A1A] mb-4">Répartition des Revenus</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={[
                        { name: 'Taxable', value: totalTaxable },
                        { name: 'Non taxable', value: totalCA - totalTaxable }
                      ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                        <Cell fill="#0066FF" />
                        <Cell fill="#E5E7EB" />
                      </Pie>
                      <Tooltip formatter={v => `${v.toLocaleString()} DJF`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-sm bg-[#0066FF]" /><span>Taxable : {totalTaxable.toLocaleString()} DJF</span></div>
                    <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-sm bg-[#E5E7EB]" /><span>Non taxable : {(totalCA - totalTaxable).toLocaleString()} DJF</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Panel */}
            <Card className="border border-[#E5E7EB] bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#7C3AED]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Intelligence Fiscale IA</h3>
                  </div>
                  <Button onClick={handleAISuggest} disabled={aiLoading} variant="outline" className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white">
                    {aiLoading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyse...</> : <><Brain className="w-4 h-4 mr-2" />Analyser avec IA</>}
                  </Button>
                </div>
                {aiSuggestions ? (
                  <div className="space-y-4">
                    {aiSuggestions.recommandations?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A] mb-2">Recommandations fiscales :</p>
                        <div className="space-y-2">
                          {aiSuggestions.recommandations.map((r, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 bg-[#F0F7FF] rounded-lg">
                              <ChevronRight className="w-4 h-4 text-[#0066FF] mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-[#1A1A1A]">{r}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiSuggestions.suggestions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A] mb-2">Suggestions par transaction :</p>
                        <div className="space-y-1">
                          {aiSuggestions.suggestions.slice(0, 5).map((s, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                              <Badge className={s.suggestion === 'INCLURE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{s.suggestion}</Badge>
                              <p className="text-xs text-[#1A1A1A] flex-1 truncate">{s.desc}</p>
                              <p className="text-xs text-[#6B6B6B]">{s.raison}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#9B9B9B]">Cliquez sur "Analyser avec IA" pour obtenir des suggestions de classification TVA et des recommandations fiscales.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── REVENUS TVA TAB ── */}
        {activeTab === 'revenus' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Revenus — Classification TVA</h2>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tous les mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {availableMonths.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="border border-[#E5E7EB] bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Client</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Montant HT</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Inclusion TVA</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">TVA 10%</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Montant TTC</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">Conformité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRevTx.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-[#9B9B9B]">Aucune transaction de revenu</td></tr>
                    ) : filteredRevTx.map(tx => {
                      const autoExcl = isAutoExcluded(tx);
                      const inclusion = autoExcl ? 'EXCLURE' : (tx.tva_inclusion || '—');
                      const tvaAmt = inclusion === 'INCLURE' ? Math.round((tx.amount || 0) * TVA_RATE) : 0;
                      const ttc = (tx.amount || 0) + tvaAmt;
                      const hasFacture = tx.attachments?.length > 0 || tx.numero_facture;
                      const conforme = inclusion === 'EXCLURE' || (inclusion === 'INCLURE' && hasFacture);

                      return (
                        <tr key={tx.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA]">
                          <td className="px-4 py-3 text-[#6B6B6B]">{tx.date || '—'}</td>
                          <td className="px-4 py-3 font-medium text-[#1A1A1A] max-w-[200px] truncate">{tx.description}</td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{tx.contact_name || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{(tx.amount || 0).toLocaleString()} DJF</td>
                          <td className="px-4 py-3 text-center">
                            {autoExcl ? (
                              <Badge className="bg-gray-100 text-gray-600 border-0">Auto-exclu</Badge>
                            ) : (
                              <Select value={tx.tva_inclusion || ''} onValueChange={(v) => updateInclusion(tx.id, v)}>
                                <SelectTrigger className={`w-32 text-xs h-7 ${tx.tva_inclusion === 'INCLURE' ? 'border-green-300' : tx.tva_inclusion === 'EXCLURE' ? 'border-yellow-300' : 'border-red-300'}`}>
                                  <SelectValue placeholder="Classer..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INCLURE">✅ INCLURE</SelectItem>
                                  <SelectItem value="EXCLURE">⚠️ EXCLURE</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-[#7C3AED] font-medium">
                            {tvaAmt > 0 ? `${tvaAmt.toLocaleString()} DJF` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#0066FF]">
                            {ttc.toLocaleString()} DJF
                          </td>
                          <td className="px-4 py-3 text-center">
                            {inclusion === '—' ? (
                              <Badge className="bg-red-100 text-red-700 border-0">⚠ Non classifié</Badge>
                            ) : conforme ? (
                              <Badge className="bg-green-100 text-green-700 border-0">✅ Conforme</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-0">❌ Sans facture</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── DECLARATIONS TAB ── */}
        {activeTab === 'declarations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Déclarations TVA Mensuelles</h2>
              <Button onClick={() => setShowDeclarationDialog(true)} className="bg-[#0066FF] hover:bg-[#0052CC] text-white">
                <Plus className="w-4 h-4 mr-2" /> Nouvelle Déclaration
              </Button>
            </div>

            {declarations.length === 0 ? (
              <Card className="border border-[#E5E7EB] bg-white">
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[#6B6B6B]">Aucune déclaration TVA. Générez votre première déclaration.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {declarations.map(decl => (
                  <Card key={decl.id} className="border border-[#E5E7EB] bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#7C3AED] flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-[#1A1A1A]">{decl.periode}</h3>
                              <Badge variant="outline" className="text-xs">{decl.numero_declaration}</Badge>
                            </div>
                            <p className="text-sm text-[#6B6B6B]">
                              CA Taxable : {(decl.ca_taxable || 0).toLocaleString()} DJF •
                              TVA : <span className="text-[#7C3AED] font-medium">{(decl.tva_finale || 0).toLocaleString()} DJF</span> •
                              Limite : {decl.date_limite || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            decl.statut === 'Payé' ? 'bg-green-100 text-green-700 border-0' :
                            decl.statut === 'En attente' ? 'bg-yellow-100 text-yellow-700 border-0' :
                            'bg-red-100 text-red-700 border-0'
                          }>{decl.statut}</Badge>
                          <Button variant="outline" size="sm" onClick={() => generateDeclarationPDF(decl, transactions, company)}>
                            <Download className="w-4 h-4 mr-1" /> PDF
                          </Button>
                          {decl.statut !== 'Payé' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setSelectedDecl(decl); setShowPaymentDialog(true); }}>
                              <CreditCard className="w-4 h-4 mr-1" /> Payer
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ALERTES TAB ── */}
        {activeTab === 'alertes' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Alertes & Conformité Fiscale</h2>
            {alerts.length === 0 ? (
              <Card className="border border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-green-800 font-medium">Aucune alerte — Tout est conforme</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <Card key={i} className={`border ${
                    alert.type === 'error' ? 'border-red-200 bg-red-50' :
                    alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <alert.icon className={`w-5 h-5 flex-shrink-0 ${
                        alert.type === 'error' ? 'text-red-600' :
                        alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <p className={`text-sm font-medium ${
                        alert.type === 'error' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                      }`}>{alert.msg}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Non-classified transactions */}
            {revenueTransactions.filter(t => !t.tva_inclusion && !isAutoExcluded(t)).length > 0 && (
              <Card className="border border-[#E5E7EB] bg-white">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#1A1A1A] mb-3">Transactions sans classification TVA</h3>
                  <div className="space-y-2">
                    {revenueTransactions.filter(t => !t.tva_inclusion && !isAutoExcluded(t)).slice(0, 10).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg border border-[#E5E7EB]">
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{tx.description}</p>
                          <p className="text-xs text-[#6B6B6B]">{tx.date} • {(tx.amount || 0).toLocaleString()} DJF</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7" onClick={() => updateInclusion(tx.id, 'INCLURE')}>INCLURE</Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateInclusion(tx.id, 'EXCLURE')}>EXCLURE</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Dialog — Générer Déclaration */}
      <Dialog open={showDeclarationDialog} onOpenChange={setShowDeclarationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Générer une Déclaration TVA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Période (AAAA-MM)</Label>
              <Input
                type="month"
                value={declPeriode}
                onChange={e => setDeclPeriode(e.target.value)}
                className="mt-2"
              />
            </div>
            {declPeriode && (() => {
              const year = declPeriode.substring(0, 4);
              const month = declPeriode.substring(5, 7);
              const monthStart = `${year}-${month}-01`;
              const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
              const monthEnd = `${year}-${month}-${lastDay}`;
              const monthTx = revenueTransactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
              const inclTx = monthTx.filter(t => t.tva_inclusion === 'INCLURE' && !isAutoExcluded(t));
              const caT = inclTx.reduce((s, t) => s + (t.amount || 0), 0);
              return (
                <div className="bg-[#F0F7FF] rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Transactions du mois</span><span className="font-medium">{monthTx.length}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">Transactions INCLURE</span><span className="font-medium text-green-600">{inclTx.length}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6B6B]">CA Taxable</span><span className="font-semibold text-[#0066FF]">{caT.toLocaleString()} DJF</span></div>
                  <div className="flex justify-between border-t border-[#D1D5DB] pt-2"><span className="font-semibold">TVA Due (10%)</span><span className="font-bold text-[#7C3AED]">{Math.round(caT * TVA_RATE).toLocaleString()} DJF</span></div>
                </div>
              );
            })()}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowDeclarationDialog(false)}>Annuler</Button>
              <Button onClick={() => createDeclMutation.mutate()} disabled={createDeclMutation.isLoading} className="bg-[#0066FF] text-white">
                {createDeclMutation.isLoading ? 'Génération...' : 'Générer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Paiement */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payer la TVA — {selectedDecl?.periode}</DialogTitle>
          </DialogHeader>
          {selectedDecl && (
            <div className="space-y-4 py-2">
              <div className="bg-[#F0F7FF] rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#6B6B6B]">Référence</span><span className="font-mono">{selectedDecl.numero_declaration}</span></div>
                <div className="flex justify-between"><span className="text-[#6B6B6B]">CA Taxable</span><span>{(selectedDecl.ca_taxable || 0).toLocaleString()} DJF</span></div>
                <div className="flex justify-between border-t border-[#D1D5DB] pt-2"><span className="font-semibold">TVA À PAYER</span><span className="font-bold text-[#7C3AED] text-lg">{(selectedDecl.tva_finale || 0).toLocaleString()} DJF</span></div>
                <div className="flex justify-between"><span className="text-[#6B6B6B]">Date limite</span><span className="text-red-600 font-medium">{selectedDecl.date_limite}</span></div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Annuler</Button>
                <Button onClick={() => payDeclMutation.mutate(selectedDecl)} disabled={payDeclMutation.isLoading} className="bg-green-600 hover:bg-green-700 text-white">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {payDeclMutation.isLoading ? 'Traitement...' : 'Confirmer Paiement'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}