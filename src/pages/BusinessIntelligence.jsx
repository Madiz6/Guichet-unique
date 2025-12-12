import React, { useState, useMemo } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, FileText, Building2, Download, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { motion } from 'framer-motion';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#F97316'];

export default function BusinessIntelligence() {
  const [selectedPeriod, setSelectedPeriod] = useState('12M');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // Fetch all data
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => meras.entities.Employee.list(),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => meras.entities.PayrollCycle.list('-created_date', 24),
  });

  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => meras.entities.Declaration.list('-created_date'),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
  });

  const { data: expenseRequests = [] } = useQuery({
    queryKey: ['expense-requests'],
    queryFn: () => meras.entities.ExpenseRequest.list(),
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases'],
    queryFn: () => meras.entities.Lease.list(),
  });

  const { data: leasePayments = [] } = useQuery({
    queryKey: ['lease-payments'],
    queryFn: () => meras.entities.LeasePayment.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list(),
  });

  const company = companies[0] || {};

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const startDate = selectedPeriod === '12M' 
      ? subMonths(now, 12)
      : selectedPeriod === '6M' 
      ? subMonths(now, 6)
      : startOfYear(now);

    // Filter transactions by period
    const filteredTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate >= startDate && transDate <= now;
    });

    // Total revenue and expenses
    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'Revenu')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'Dépense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalRevenue - totalExpenses;

    // Payroll costs
    const payrollCosts = cycles
      .filter(c => new Date(c.date_paiement || c.created_date) >= startDate)
      .reduce((sum, cycle) => {
        let cycleCost = 0;
        employees.forEach(emp => {
          if (cycle.employee_ids?.includes(emp.id)) {
            const absences = cycle.employee_absences?.[emp.id] || 0;
            const empWithAbsences = { ...emp, absences_amount: absences };
            const calc = calculatePayroll(empWithAbsences);
            cycleCost += calc.totalCost;
          }
        });
        return sum + cycleCost;
      }, 0);

    // CNSS & ITS
    const cnssTotal = declarations
      .filter(d => d.periode && parseInt(d.periode.substring(0, 4)) >= startDate.getFullYear())
      .reduce((sum, d) => sum + (d.total_cnss || 0), 0);

    const itsTotal = declarations
      .filter(d => d.periode && parseInt(d.periode.substring(0, 4)) >= startDate.getFullYear())
      .reduce((sum, d) => sum + (d.total_its || 0), 0);

    // Budget utilization
    const budgetAllocated = budgets.reduce((sum, b) => sum + b.amount_allocated, 0);
    const budgetUsed = budgets.reduce((sum, b) => sum + b.amount_used, 0);
    const budgetUtilization = budgetAllocated > 0 ? (budgetUsed / budgetAllocated) * 100 : 0;

    // Lease revenue
    const leaseRevenue = leasePayments
      .filter(p => p.status === 'paid' && new Date(p.payment_date || p.created_date) >= startDate)
      .reduce((sum, p) => sum + p.amount_paid, 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      payrollCosts,
      cnssTotal,
      itsTotal,
      budgetAllocated,
      budgetUsed,
      budgetUtilization,
      leaseRevenue,
      activeEmployees: employees.filter(e => e.statut === 'Actif').length,
      totalEmployees: employees.length
    };
  }, [transactions, employees, cycles, declarations, budgets, leasePayments, selectedPeriod]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    const monthCount = selectedPeriod === '12M' ? 12 : 6;

    for (let i = monthCount - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const revenue = monthTransactions
        .filter(t => t.type === 'Revenu')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'Dépense')
        .reduce((sum, t) => sum + t.amount, 0);

      months.push({
        month: format(monthDate, 'MMM yyyy', { locale: fr }),
        revenue: Math.round(revenue / 1000),
        expenses: Math.round(expenses / 1000),
        profit: Math.round((revenue - expenses) / 1000)
      });
    }

    return months;
  }, [transactions, selectedPeriod]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const breakdown = {};
    transactions.forEach(t => {
      const source = t.source || 'Autre';
      if (!breakdown[source]) {
        breakdown[source] = { revenue: 0, expenses: 0 };
      }
      if (t.type === 'Revenu') {
        breakdown[source].revenue += t.amount;
      } else {
        breakdown[source].expenses += t.amount;
      }
    });

    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      expenses: data.expenses,
      total: data.revenue - data.expenses
    }));
  }, [transactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    transactions
      .filter(t => t.type === 'Dépense')
      .forEach(t => {
        const cat = t.category || 'Non catégorisé';
        breakdown[cat] = (breakdown[cat] || 0) + t.amount;
      });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Department breakdown
  const departmentBreakdown = useMemo(() => {
    const breakdown = {};
    transactions.forEach(t => {
      const dept = t.department || 'Non assigné';
      breakdown[dept] = (breakdown[dept] || 0) + t.amount;
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#0F172A]">
                  Business Intelligence 360°
                </h1>
                <p className="text-[#64748B] mt-1">Vue complète de toutes les activités financières</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6M">6 Mois</SelectItem>
                  <SelectItem value="12M">12 Mois</SelectItem>
                  <SelectItem value="YTD">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-green-700 mb-1 font-medium">Revenus Totaux</p>
              <p className="text-3xl font-bold text-green-900">{metrics.totalRevenue.toLocaleString()} DJF</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-red-700 mb-1 font-medium">Dépenses Totales</p>
              <p className="text-3xl font-bold text-red-900">{metrics.totalExpenses.toLocaleString()} DJF</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-blue-700 mb-1 font-medium">Profit Net</p>
              <p className="text-3xl font-bold text-blue-900">{metrics.netProfit.toLocaleString()} DJF</p>
              <div className="flex items-center gap-1 mt-2 text-xs">
                <span className={metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metrics.netProfit >= 0 ? '↑' : '↓'} {((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1)}% marge
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-purple-700 mb-1 font-medium">Coûts Salarial</p>
              <p className="text-3xl font-bold text-purple-900">{metrics.payrollCosts.toLocaleString()} DJF</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                <span>{metrics.activeEmployees} employés actifs</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white shadow-sm p-1">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="sources">Par Source</TabsTrigger>
            <TabsTrigger value="categories">Par Catégorie</TabsTrigger>
            <TabsTrigger value="departments">Par Département</TabsTrigger>
            <TabsTrigger value="payroll">Paie & Charges</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Revenue vs Expenses Trend */}
              <Card className="border-0 shadow-lg lg:col-span-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Évolution Revenus vs Dépenses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 11 }} label={{ value: 'Milliers DJF', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Revenus" />
                      <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Dépenses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Budget Utilization */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Utilisation Budget</h3>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-40 h-40">
                      <svg className="transform -rotate-90 w-40 h-40">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="#E5E7EB"
                          strokeWidth="12"
                          fill="transparent"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="#6366F1"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 70}`}
                          strokeDashoffset={`${2 * Math.PI * 70 * (1 - metrics.budgetUtilization / 100)}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold text-[#0F172A]">{metrics.budgetUtilization.toFixed(0)}%</p>
                        <p className="text-xs text-[#64748B]">Utilisé</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Alloué</span>
                      <span className="font-semibold">{metrics.budgetAllocated.toLocaleString()} DJF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Utilisé</span>
                      <span className="font-semibold text-[#6366F1]">{metrics.budgetUsed.toLocaleString()} DJF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Disponible</span>
                      <span className="font-semibold text-green-600">{(metrics.budgetAllocated - metrics.budgetUsed).toLocaleString()} DJF</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Secondary Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B]">CNSS (Total)</p>
                      <p className="text-xl font-bold text-[#0F172A]">{metrics.cnssTotal.toLocaleString()} DJF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B]">ITS (Total)</p>
                      <p className="text-xl font-bold text-[#0F172A]">{metrics.itsTotal.toLocaleString()} DJF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B]">Revenus Location</p>
                      <p className="text-xl font-bold text-[#0F172A]">{metrics.leaseRevenue.toLocaleString()} DJF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">Analyse par Source</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sourceBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10B981" name="Revenus" />
                    <Bar dataKey="expenses" fill="#EF4444" name="Dépenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Dépenses par Catégorie</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryBreakdown.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Top Catégories</h3>
                  <div className="space-y-4">
                    {categoryBreakdown.slice(0, 10).map((cat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-sm font-bold">{cat.value.toLocaleString()} DJF</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(cat.value / categoryBreakdown[0].value) * 100}%`,
                              backgroundColor: COLORS[idx % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">Dépenses par Département</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Évolution Masse Salariale</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="expenses" stroke="#6366F1" strokeWidth={3} name="Coûts" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0F172A] mb-4">Répartition des Charges</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Salaires Nets</span>
                        <span className="text-sm font-bold">{metrics.payrollCosts.toLocaleString()} DJF</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">CNSS (Sal. + Pat.)</span>
                        <span className="text-sm font-bold">{metrics.cnssTotal.toLocaleString()} DJF</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-3">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">ITS</span>
                        <span className="text-sm font-bold">{metrics.itsTotal.toLocaleString()} DJF</span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-3">
                        <div className="bg-amber-600 h-3 rounded-full" style={{ width: '15%' }} />
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="font-bold">Coût Total</span>
                        <span className="font-bold text-xl text-[#6366F1]">
                          {(metrics.payrollCosts + metrics.cnssTotal + metrics.itsTotal).toLocaleString()} DJF
                        </span>
                      </div>
                    </div>
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