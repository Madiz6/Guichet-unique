import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, Save, FileText, Trash2, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, eachMonthOfInterval, eachQuarterOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316', '#14B8A6', '#EF4444', '#84CC16'];

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

export default function TransactionReports({ onClose, transactions }) {
  const currentYear = new Date().getFullYear();

  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [aggregation, setAggregation] = useState('monthly');
  const [accountType, setAccountType] = useState('all');
  const [groupBy, setGroupBy] = useState('category');
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('report_templates') || '[]'); } catch { return []; }
  });
  const [templateName, setTemplateName] = useState('');

  // Filter transactions by date range + account type
  const filtered = useMemo(() => transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (accountType === 'pl' && t.is_financing) return false;
    if (accountType === 'bs' && !t.is_financing) return false;
    return true;
  }), [transactions, dateFrom, dateTo, accountType]);

  const totalIncome = filtered.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = filtered.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  // Time-series data based on aggregation
  const timeSeriesData = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);
    let intervals = [];
    try {
      if (aggregation === 'monthly') {
        intervals = eachMonthOfInterval({ start: from, end: to });
      } else if (aggregation === 'quarterly') {
        intervals = eachQuarterOfInterval({ start: from, end: to });
      } else {
        // yearly — group by year
        const years = new Set(filtered.map(t => new Date(t.date).getFullYear()));
        return [...years].sort().map(y => {
          const inc = filtered.filter(t => t.type === 'Revenu' && new Date(t.date).getFullYear() === y).reduce((s, t) => s + (t.amount || 0), 0);
          const exp = filtered.filter(t => t.type === 'Dépense' && new Date(t.date).getFullYear() === y).reduce((s, t) => s + (t.amount || 0), 0);
          return { label: String(y), Revenus: inc, Dépenses: exp, Net: inc - exp };
        });
      }
    } catch { return []; }

    return intervals.map(interval => {
      const label = aggregation === 'monthly'
        ? format(interval, 'MMM yyyy', { locale: fr })
        : `T${Math.ceil((interval.getMonth() + 1) / 3)} ${interval.getFullYear()}`;
      const end = aggregation === 'monthly' ? endOfMonth(interval) : new Date(interval.getFullYear(), interval.getMonth() + 3, 0);
      const inc = filtered.filter(t => {
        const d = new Date(t.date); return t.type === 'Revenu' && d >= interval && d <= end;
      }).reduce((s, t) => s + (t.amount || 0), 0);
      const exp = filtered.filter(t => {
        const d = new Date(t.date); return t.type === 'Dépense' && d >= interval && d <= end;
      }).reduce((s, t) => s + (t.amount || 0), 0);
      return { label, Revenus: inc, Dépenses: exp, Net: inc - exp };
    });
  }, [filtered, aggregation, dateFrom, dateTo]);

  // Grouping data
  const groupedData = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const key = groupBy === 'category' ? (t.category || 'Non catégorisé')
        : groupBy === 'department' ? (t.department || 'Sans département')
        : groupBy === 'source' ? (t.source || 'Autre')
        : (t.payment_method || 'Inconnu');
      if (!map[key]) map[key] = { income: 0, expenses: 0 };
      if (t.type === 'Revenu') map[key].income += t.amount || 0;
      else map[key].expenses += t.amount || 0;
    });
    return Object.entries(map).map(([name, d]) => ({ name, Revenus: d.income, Dépenses: d.expenses, Net: d.income - d.expenses }))
      .sort((a, b) => (b.Revenus + b.Dépenses) - (a.Revenus + a.Dépenses));
  }, [filtered, groupBy]);

  const expensePie = useMemo(() => groupedData.map(d => ({ name: d.name, value: d.Dépenses })).filter(d => d.value > 0), [groupedData]);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Date', 'Description', 'Contact', 'Montant', 'Type', 'Catégorie', 'Département', 'Source', 'Méthode', 'Statut', 'Comptabilisé'],
      ...filtered.map(t => [
        t.date, t.description, t.contact_name || '', t.amount, t.type,
        t.category || '', t.department || '', t.source || '', t.payment_method || '',
        t.status || '', t.booking_status ? 'Oui' : 'Non'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`))
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `rapport_${dateFrom}_${dateTo}.csv`; a.click();
    toast.success('Export CSV téléchargé');
  };

  // Save template
  const saveTemplate = () => {
    if (!templateName.trim()) { toast.error('Donnez un nom au modèle'); return; }
    const t = { name: templateName, dateFrom, dateTo, aggregation, accountType, groupBy, savedAt: new Date().toISOString() };
    const updated = [...templates, t];
    setTemplates(updated);
    localStorage.setItem('report_templates', JSON.stringify(updated));
    setTemplateName('');
    toast.success('Modèle sauvegardé');
  };

  const loadTemplate = (tpl) => {
    setDateFrom(tpl.dateFrom); setDateTo(tpl.dateTo);
    setAggregation(tpl.aggregation); setAccountType(tpl.accountType); setGroupBy(tpl.groupBy);
    toast.success(`Modèle "${tpl.name}" chargé`);
  };

  const deleteTemplate = (i) => {
    const updated = templates.filter((_, idx) => idx !== i);
    setTemplates(updated);
    localStorage.setItem('report_templates', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Rapports Financiers</h1>
            <p className="text-[#697586] mt-1">Rapports personnalisables avec export CSV</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="border-green-500 text-green-700">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </motion.div>

        {/* Config panel */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs text-[#697586]">Date début</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-[#697586]">Date fin</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-[#697586]">Agrégation temporelle</Label>
                <Select value={aggregation} onValueChange={setAggregation}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                    <SelectItem value="quarterly">Trimestrielle</SelectItem>
                    <SelectItem value="yearly">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#697586]">Type de comptes</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les comptes</SelectItem>
                    <SelectItem value="pl">Comptes P&L</SelectItem>
                    <SelectItem value="bs">Comptes Bilan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#697586]">Regrouper par</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Catégorie</SelectItem>
                    <SelectItem value="department">Département</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="payment">Méthode paiement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template save */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#E8ECF2]">
              <Input placeholder="Nom du modèle..." value={templateName} onChange={e => setTemplateName(e.target.value)} className="max-w-xs text-sm h-8" />
              <Button size="sm" variant="outline" onClick={saveTemplate} className="h-8">
                <Save className="w-3 h-3 mr-1" /> Sauvegarder modèle
              </Button>
              {templates.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {templates.map((tpl, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 text-xs" onClick={() => loadTemplate(tpl)}>
                        <FileText className="w-3 h-3 mr-1" />{tpl.name}
                      </Badge>
                      <button onClick={() => deleteTemplate(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenus', value: fmt(totalIncome) + ' DJF', color: 'text-green-600', bg: 'from-green-500 to-green-600', Icon: TrendingUp },
            { label: 'Total Dépenses', value: fmt(totalExpenses) + ' DJF', color: 'text-red-600', bg: 'from-red-500 to-red-600', Icon: TrendingDown },
            { label: 'Profit Net', value: fmt(netProfit) + ' DJF', color: netProfit >= 0 ? 'text-blue-600' : 'text-orange-600', bg: netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600', Icon: DollarSign },
            { label: 'Transactions', value: filtered.length, color: 'text-purple-600', bg: 'from-purple-500 to-purple-600', Icon: FileText },
          ].map((k, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center`}>
                    <k.Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#697586]">{k.label}</p>
                    <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="trend">
          <TabsList>
            <TabsTrigger value="trend">📈 Évolution temporelle</TabsTrigger>
            <TabsTrigger value="breakdown">📊 Répartition</TabsTrigger>
            <TabsTrigger value="distribution">🥧 Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-[#0A2540] mb-4">
                  Évolution {aggregation === 'monthly' ? 'Mensuelle' : aggregation === 'quarterly' ? 'Trimestrielle' : 'Annuelle'}
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                    <Tooltip formatter={v => fmt(v) + ' DJF'} />
                    <Legend />
                    <Area type="monotone" dataKey="Revenus" stroke="#10B981" fill="url(#colorRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Dépenses" stroke="#EF4444" fill="url(#colorExp)" strokeWidth={2} />
                    <Line type="monotone" dataKey="Net" stroke="#6366F1" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold text-[#0A2540] mb-4">
                  Revenus vs Dépenses par {groupBy === 'category' ? 'Catégorie' : groupBy === 'department' ? 'Département' : groupBy === 'source' ? 'Source' : 'Méthode'}
                </h3>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={groupedData.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => fmt(v)} />
                    <Tooltip formatter={v => fmt(v) + ' DJF'} />
                    <Legend />
                    <Bar dataKey="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-[#0A2540] mb-4">Distribution des Dépenses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={expensePie} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}>
                        {expensePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v) + ' DJF'} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Detailed table */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-[#0A2540] mb-4">Tableau détaillé</h3>
                  <div className="overflow-y-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E8ECF2]">
                          <th className="text-left py-2 text-xs text-[#64748B] font-semibold">Groupe</th>
                          <th className="text-right py-2 text-xs text-[#64748B] font-semibold">Revenus</th>
                          <th className="text-right py-2 text-xs text-[#64748B] font-semibold">Dépenses</th>
                          <th className="text-right py-2 text-xs text-[#64748B] font-semibold">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedData.map((row, i) => (
                          <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-[#0A2540] font-medium truncate max-w-[120px]">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right text-green-600 font-semibold">{fmt(row.Revenus)}</td>
                            <td className="py-2 text-right text-red-600 font-semibold">{fmt(row.Dépenses)}</td>
                            <td className={`py-2 text-right font-bold ${row.Net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{fmt(row.Net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}