import React, { useState, useMemo, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, FileText, Building2, Download, Filter, AlertTriangle, Bell, Target, Zap, Brain, Activity, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Sankey, Treemap } from 'recharts';
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#F97316'];

export default function BusinessIntelligence() {
  const [selectedPeriod, setSelectedPeriod] = useState('12M');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // Fetch all data
  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date'),
    refetchInterval: 5000,
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => meras.entities.Employee.list(),
    refetchInterval: 5000,
  });

  const { data: cycles = [], refetch: refetchCycles } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => meras.entities.PayrollCycle.list('-created_date', 24),
    refetchInterval: 5000,
  });

  const { data: declarations = [], refetch: refetchDeclarations } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => meras.entities.Declaration.list('-created_date'),
    refetchInterval: 5000,
  });

  const { data: budgets = [], refetch: refetchBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
    refetchInterval: 5000,
  });

  const { data: expenseRequests = [], refetch: refetchExpenseRequests } = useQuery({
    queryKey: ['expense-requests'],
    queryFn: () => meras.entities.ExpenseRequest.list(),
    refetchInterval: 5000,
  });

  const { data: leases = [], refetch: refetchLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: () => meras.entities.Lease.list(),
    refetchInterval: 5000,
  });

  const { data: leasePayments = [], refetch: refetchLeasePayments } = useQuery({
    queryKey: ['lease-payments'],
    queryFn: () => meras.entities.LeasePayment.list(),
    refetchInterval: 5000,
  });

  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list(),
    refetchInterval: 5000,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => meras.entities.Holiday.list('-created_date'),
    refetchInterval: 5000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => meras.entities.Contact.list(),
    refetchInterval: 5000,
  });

  const company = companies[0] || {};
  const [alerts, setAlerts] = useState([]);

  // Anomaly Detection Engine
  const anomalies = useMemo(() => {
    const detected = [];
    
    // Check for suspicious transactions (unusual amounts)
    const avgTransactionAmount = transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
      : 0;
    
    transactions.forEach(t => {
      if (t.amount > avgTransactionAmount * 5) {
        detected.push({
          type: 'suspicious_transaction',
          severity: 'high',
          message: `Transaction anormale: ${t.amount.toLocaleString()} DJF (${t.description})`,
          date: t.date,
          module: 'Transactions'
        });
      }
    });

    // Check for duplicate vendor payments
    const vendorPayments = {};
    transactions.forEach(t => {
      if (t.contact_name && t.type === 'Dépense') {
        const key = `${t.contact_name}-${t.amount}-${t.date}`;
        vendorPayments[key] = (vendorPayments[key] || 0) + 1;
      }
    });
    Object.entries(vendorPayments).forEach(([key, count]) => {
      if (count > 1) {
        detected.push({
          type: 'duplicate_payment',
          severity: 'medium',
          message: `Paiement potentiellement dupliqué détecté`,
          module: 'Transactions'
        });
      }
    });

    // Check for high absenteeism
    const totalEmployees = employees.length;
    const onLeave = employees.filter(e => e.statut === 'En congé').length;
    const absenteeismRate = totalEmployees > 0 ? (onLeave / totalEmployees) * 100 : 0;
    
    if (absenteeismRate > 15) {
      detected.push({
        type: 'high_absenteeism',
        severity: 'medium',
        message: `Taux d'absentéisme élevé: ${absenteeismRate.toFixed(1)}%`,
        module: 'Employés'
      });
    }

    // Check for missing receipts
    const missingReceipts = transactions.filter(t => 
      t.type === 'Dépense' && 
      t.status === 'Payé' && 
      (!t.attachments || t.attachments.length === 0)
    );
    
    if (missingReceipts.length > 0) {
      detected.push({
        type: 'missing_receipts',
        severity: 'medium',
        message: `${missingReceipts.length} reçus manquants`,
        module: 'Transactions'
      });
    }

    // Check for budget overruns
    budgets.forEach(b => {
      const usagePercent = b.amount_allocated > 0 
        ? ((b.amount_used + b.amount_committed) / b.amount_allocated) * 100 
        : 0;
      
      if (usagePercent >= 90) {
        detected.push({
          type: 'budget_critical',
          severity: 'high',
          message: `Budget ${b.department_name} à ${usagePercent.toFixed(0)}%`,
          module: 'Budget'
        });
      }
    });

    return detected;
  }, [transactions, employees, budgets]);

  // Predictive Analytics
  const predictions = useMemo(() => {
    const now = new Date();
    
    // Predict next month payroll based on last 3 months average
    const last3MonthsCycles = cycles.slice(0, 3);
    const avgPayroll = last3MonthsCycles.length > 0
      ? last3MonthsCycles.reduce((sum, c) => sum + (c.salaire_net_total || 0), 0) / last3MonthsCycles.length
      : 0;

    // Predict budget burn rate
    const totalAllocated = budgets.reduce((sum, b) => sum + b.amount_allocated, 0);
    const totalUsed = budgets.reduce((sum, b) => sum + b.amount_used + b.amount_committed, 0);
    const burnRate = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
    
    // Days until budget exhaustion
    const dailyBurn = totalUsed / 30; // Approximate
    const remainingBudget = totalAllocated - totalUsed;
    const daysRemaining = dailyBurn > 0 ? Math.floor(remainingBudget / dailyBurn) : 999;

    // Revenue forecast (based on last 3 months)
    const last3MonthsRevenue = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'Revenu' && differenceInDays(now, tDate) <= 90;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const avgMonthlyRevenue = last3MonthsRevenue / 3;
    const projectedNextMonthRevenue = avgMonthlyRevenue * 1.05; // 5% growth assumption

    return {
      nextMonthPayroll: avgPayroll,
      budgetBurnRate: burnRate,
      daysUntilBudgetExhaustion: daysRemaining,
      projectedRevenue: projectedNextMonthRevenue,
      cashflowForecast90Days: avgMonthlyRevenue * 3 - avgPayroll * 3
    };
  }, [cycles, budgets, transactions]);

  // Strategic Recommendations Engine
  const recommendations = useMemo(() => {
    const recs = [];

    // Budget recommendations
    budgets.forEach(b => {
      const available = b.amount_allocated - b.amount_used - b.amount_committed;
      const usagePercent = (b.amount_used + b.amount_committed) / b.amount_allocated * 100;

      if (usagePercent > 90) {
        recs.push({
          priority: 'high',
          action: 'Geler les dépenses',
          target: b.department_name,
          reason: `Budget à ${usagePercent.toFixed(0)}%`,
          module: 'Budget'
        });
      }

      if (available < 0) {
        recs.push({
          priority: 'critical',
          action: 'Réallocation budgétaire urgente',
          target: b.department_name,
          reason: `Dépassement de ${Math.abs(available).toLocaleString()} DJF`,
          module: 'Budget'
        });
      }
    });

    // Payroll recommendations
    if (predictions.nextMonthPayroll > 0) {
      const payrollGrowth = cycles.length > 1 
        ? ((cycles[0]?.salaire_net_total || 0) - (cycles[1]?.salaire_net_total || 0)) / (cycles[1]?.salaire_net_total || 1) * 100
        : 0;

      if (payrollGrowth > 10) {
        recs.push({
          priority: 'medium',
          action: 'Réviser la masse salariale',
          target: 'RH',
          reason: `Croissance de ${payrollGrowth.toFixed(1)}% détectée`,
          module: 'Paie'
        });
      }
    }

    // Vendor recommendations
    const vendorSpend = {};
    transactions.filter(t => t.type === 'Dépense' && t.contact_name).forEach(t => {
      vendorSpend[t.contact_name] = (vendorSpend[t.contact_name] || 0) + t.amount;
    });

    const topVendors = Object.entries(vendorSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topVendors.length > 0 && topVendors[0][1] > 0) {
      const totalSpend = Object.values(vendorSpend).reduce((sum, amt) => sum + amt, 0);
      const topVendorPercent = (topVendors[0][1] / totalSpend) * 100;

      if (topVendorPercent > 40) {
        recs.push({
          priority: 'medium',
          action: 'Diversifier les fournisseurs',
          target: topVendors[0][0],
          reason: `${topVendorPercent.toFixed(0)}% des dépenses concentrées`,
          module: 'Fournisseurs'
        });
      }
    }

    // Leave coverage recommendations
    const upcomingLeaves = holidays.filter(h => {
      const startDate = new Date(h.date_debut);
      return h.statut === 'Approuvé' && differenceInDays(startDate, new Date()) <= 30 && differenceInDays(startDate, new Date()) >= 0;
    });

    if (upcomingLeaves.length > employees.length * 0.2) {
      recs.push({
        priority: 'medium',
        action: 'Prévoir couverture RH',
        target: 'Tous départements',
        reason: `${upcomingLeaves.length} congés planifiés (30 jours)`,
        module: 'Congés'
      });
    }

    return recs;
  }, [budgets, predictions, transactions, holidays, employees, cycles]);

  // Generate alerts based on thresholds
  useEffect(() => {
    const newAlerts = [];

    // Budget alerts
    budgets.forEach(b => {
      const usagePercent = (b.amount_used + b.amount_committed) / b.amount_allocated * 100;
      
      if (usagePercent >= 100) {
        newAlerts.push({
          level: 'critical',
          message: `Budget ${b.department_name} dépassé à ${usagePercent.toFixed(0)}%`,
          timestamp: new Date().toISOString()
        });
      } else if (usagePercent >= 90) {
        newAlerts.push({
          level: 'warning',
          message: `Budget ${b.department_name} à ${usagePercent.toFixed(0)}%`,
          timestamp: new Date().toISOString()
        });
      } else if (usagePercent >= 70) {
        newAlerts.push({
          level: 'info',
          message: `Budget ${b.department_name} à ${usagePercent.toFixed(0)}%`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Declaration alerts
    declarations.forEach(d => {
      if (d.statut !== 'Payé') {
        const dueDate = new Date(d.date_limite);
        const daysUntilDue = differenceInDays(dueDate, new Date());
        
        if (daysUntilDue < 0) {
          newAlerts.push({
            level: 'critical',
            message: `Déclaration ${d.numero_cotisation} en retard`,
            timestamp: new Date().toISOString()
          });
        } else if (daysUntilDue <= 7) {
          newAlerts.push({
            level: 'warning',
            message: `Déclaration ${d.numero_cotisation} due dans ${daysUntilDue} jours`,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Payroll shock alert
    if (cycles.length >= 2) {
      const currentPayroll = cycles[0]?.salaire_net_total || 0;
      const previousPayroll = cycles[1]?.salaire_net_total || 0;
      const payrollChange = previousPayroll > 0 ? ((currentPayroll - previousPayroll) / previousPayroll) * 100 : 0;

      if (Math.abs(payrollChange) > 20) {
        newAlerts.push({
          level: 'warning',
          message: `Variation masse salariale: ${payrollChange > 0 ? '+' : ''}${payrollChange.toFixed(1)}%`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Rental utilization alert
    if (leases.length > 0) {
      const activeLeases = leases.filter(l => l.status === 'active');
      const utilizationRate = (activeLeases.length / leases.length) * 100;

      if (utilizationRate < 50) {
        newAlerts.push({
          level: 'info',
          message: `Taux d'occupation location: ${utilizationRate.toFixed(0)}%`,
          timestamp: new Date().toISOString()
        });
      }
    }

    setAlerts(newAlerts);

    // Show toast for critical alerts
    newAlerts.filter(a => a.level === 'critical').forEach(alert => {
      toast.error(alert.message, { duration: 10000 });
    });
  }, [budgets, declarations, cycles, leases]);

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

    // Compliance score
    const totalDeclarations = declarations.length;
    const paidDeclarations = declarations.filter(d => d.statut === 'Payé').length;
    const complianceScore = totalDeclarations > 0 ? (paidDeclarations / totalDeclarations) * 100 : 100;

    // Cashflow
    const cashflow = totalRevenue - totalExpenses;

    // Burn rate (monthly)
    const monthlyExpenses = totalExpenses / 12;
    const burnRate = totalRevenue > 0 ? (monthlyExpenses / totalRevenue) * 100 : 0;

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
      totalEmployees: employees.length,
      complianceScore,
      cashflow,
      burnRate,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1A1F3A] to-[#0A0E27] p-6 md:p-8">
      <div className="max-w-[1900px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" size="icon" className="border-[#2D3748] bg-[#1A202C] hover:bg-[#2D3748]">
                  <ArrowLeft className="w-4 h-4 text-white" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-8 h-8 text-[#00D9FF]" />
                  <h1 className="text-4xl font-bold text-white">
                    BI Command Center 360°
                  </h1>
                </div>
                <p className="text-[#94A3B8] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FFD700]" />
                  Intelligence stratégique en temps réel • Powered by Meras PSP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-[#00D9FF] text-[#0A0E27] px-4 py-2 text-sm font-semibold">
                <Activity className="w-4 h-4 mr-2" />
                LIVE
              </Badge>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40 bg-[#1A202C] border-[#2D3748] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A202C] border-[#2D3748]">
                  <SelectItem value="6M">6 Mois</SelectItem>
                  <SelectItem value="12M">12 Mois</SelectItem>
                  <SelectItem value="YTD">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-gradient-to-r from-[#00D9FF] to-[#0099CC] hover:from-[#00C4E6] hover:to-[#0088BB]">
                <Download className="w-4 h-4 mr-2" />
                Exporter Rapport
              </Button>
            </div>
          </div>

          {/* Critical Alerts Banner */}
          <AnimatePresence>
            {alerts.filter(a => a.level === 'critical').length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 rounded-xl p-4 mb-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-white font-semibold mb-1">Alertes Critiques Détectées</p>
                    <div className="flex flex-wrap gap-2">
                      {alerts.filter(a => a.level === 'critical').slice(0, 3).map((alert, idx) => (
                        <Badge key={idx} className="bg-red-500/30 text-red-200 border-red-400/50">
                          {alert.message}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-400 text-red-400 hover:bg-red-400/10">
                    Voir tout ({alerts.filter(a => a.level === 'critical').length})
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Enhanced KPI Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6"
        >
          <Card className="border-0 bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">+{metrics.profitMargin.toFixed(1)}%</Badge>
              </div>
              <p className="text-xs text-emerald-100 mb-1 font-medium uppercase tracking-wide">Revenus</p>
              <p className="text-2xl font-bold text-white mb-1">{(metrics.totalRevenue / 1000000).toFixed(2)}M</p>
              <p className="text-xs text-emerald-100">DJF</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-rose-500/90 to-rose-600/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">{metrics.burnRate.toFixed(0)}%</Badge>
              </div>
              <p className="text-xs text-rose-100 mb-1 font-medium uppercase tracking-wide">Dépenses</p>
              <p className="text-2xl font-bold text-white mb-1">{(metrics.totalExpenses / 1000000).toFixed(2)}M</p>
              <p className="text-xs text-rose-100">DJF</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <Badge className={`${metrics.netProfit >= 0 ? 'bg-emerald-400/30' : 'bg-rose-400/30'} text-white border-0`}>
                  {metrics.netProfit >= 0 ? '↑' : '↓'}
                </Badge>
              </div>
              <p className="text-xs text-blue-100 mb-1 font-medium uppercase tracking-wide">Profit Net</p>
              <p className="text-2xl font-bold text-white mb-1">{(metrics.netProfit / 1000000).toFixed(2)}M</p>
              <p className="text-xs text-blue-100">Marge: {metrics.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/90 to-purple-600/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">{metrics.activeEmployees}</Badge>
              </div>
              <p className="text-xs text-purple-100 mb-1 font-medium uppercase tracking-wide">Masse Salariale</p>
              <p className="text-2xl font-bold text-white mb-1">{(metrics.payrollCosts / 1000000).toFixed(2)}M</p>
              <p className="text-xs text-purple-100">+ CNSS + ITS</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-500/90 to-amber-600/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">{metrics.complianceScore.toFixed(0)}%</Badge>
              </div>
              <p className="text-xs text-amber-100 mb-1 font-medium uppercase tracking-wide">Conformité</p>
              <p className="text-2xl font-bold text-white mb-1">{metrics.complianceScore.toFixed(0)}/100</p>
              <p className="text-xs text-amber-100">Score</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-cyan-500/90 to-cyan-600/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">{metrics.budgetUtilization.toFixed(0)}%</Badge>
              </div>
              <p className="text-xs text-cyan-100 mb-1 font-medium uppercase tracking-wide">Budget</p>
              <p className="text-2xl font-bold text-white mb-1">{metrics.budgetUtilization.toFixed(0)}%</p>
              <p className="text-xs text-cyan-100">Utilisé</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#1A202C] border border-[#2D3748] p-1 shadow-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00D9FF] data-[state=active]:to-[#0099CC] data-[state=active]:text-[#0A0E27] text-white">
              <Brain className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="predictions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00D9FF] data-[state=active]:to-[#0099CC] data-[state=active]:text-[#0A0E27] text-white">
              <Zap className="w-4 h-4 mr-2" />
              Prédictions
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00D9FF] data-[state=active]:to-[#0099CC] data-[state=active]:text-[#0A0E27] text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Anomalies ({anomalies.length})
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00D9FF] data-[state=active]:to-[#0099CC] data-[state=active]:text-[#0A0E27] text-white">
              <Target className="w-4 h-4 mr-2" />
              Recommandations ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="360" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00D9FF] data-[state=active]:to-[#0099CC] data-[state=active]:text-[#0A0E27] text-white">
              360° Views
            </TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#0099CC] flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#0A0E27]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Prédictions Financières</h3>
                      <p className="text-sm text-[#94A3B8]">Basées sur l'historique 90 jours</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-[#2D3748] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#94A3B8]">Masse Salariale (Mois Prochain)</span>
                        <Badge className="bg-emerald-500/20 text-emerald-400">Prévision</Badge>
                      </div>
                      <p className="text-2xl font-bold text-white">{predictions.nextMonthPayroll.toLocaleString()} DJF</p>
                    </div>

                    <div className="p-4 bg-[#2D3748] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#94A3B8]">Revenus Projetés (30j)</span>
                        <Badge className="bg-blue-500/20 text-blue-400">+5% growth</Badge>
                      </div>
                      <p className="text-2xl font-bold text-white">{predictions.projectedRevenue.toLocaleString()} DJF</p>
                    </div>

                    <div className="p-4 bg-[#2D3748] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#94A3B8]">Cashflow Prévisionnel (90j)</span>
                        <Badge className={`${predictions.cashflowForecast90Days >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {predictions.cashflowForecast90Days >= 0 ? 'Positif' : 'Négatif'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-white">{predictions.cashflowForecast90Days.toLocaleString()} DJF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Alertes Budgétaires</h3>
                      <p className="text-sm text-[#94A3B8]">Indicateurs de risque</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-[#2D3748] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#94A3B8]">Taux de Combustion Budget</span>
                        <Badge className={`${predictions.budgetBurnRate > 90 ? 'bg-rose-500/20 text-rose-400' : predictions.budgetBurnRate > 70 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {predictions.budgetBurnRate > 90 ? 'Critique' : predictions.budgetBurnRate > 70 ? 'Attention' : 'Sain'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-white">{predictions.budgetBurnRate.toFixed(1)}%</p>
                      <div className="mt-2 w-full bg-[#1A202C] rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${predictions.budgetBurnRate > 90 ? 'bg-rose-500' : predictions.budgetBurnRate > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(predictions.budgetBurnRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-[#2D3748] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#94A3B8]">Jours jusqu'à épuisement</span>
                        <Badge className={`${predictions.daysUntilBudgetExhaustion < 30 ? 'bg-rose-500/20 text-rose-400' : predictions.daysUntilBudgetExhaustion < 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {predictions.daysUntilBudgetExhaustion < 999 ? `${predictions.daysUntilBudgetExhaustion} jours` : '> 1 an'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {predictions.daysUntilBudgetExhaustion < 999 ? predictions.daysUntilBudgetExhaustion : '∞'} jours
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-amber-400 text-sm font-semibold mb-2">⚠️ Action Requise</p>
                      <p className="text-white text-xs">
                        {predictions.budgetBurnRate > 90 
                          ? "Révision budgétaire urgente recommandée" 
                          : predictions.budgetBurnRate > 70 
                          ? "Surveillance rapprochée recommandée"
                          : "Budget sous contrôle"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-6">
            <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Détection d'Anomalies</h3>
                    <p className="text-sm text-[#94A3B8]">{anomalies.length} anomalies détectées</p>
                  </div>
                </div>

                {anomalies.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">Aucune anomalie détectée</p>
                    <p className="text-[#94A3B8] text-sm">Tous les indicateurs sont normaux</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anomalies.map((anomaly, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 rounded-lg border-l-4 ${
                          anomaly.severity === 'high' 
                            ? 'bg-rose-500/10 border-rose-500' 
                            : anomaly.severity === 'medium'
                            ? 'bg-amber-500/10 border-amber-500'
                            : 'bg-blue-500/10 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${
                                anomaly.severity === 'high' 
                                  ? 'bg-rose-500/20 text-rose-400' 
                                  : anomaly.severity === 'medium'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {anomaly.severity === 'high' ? 'CRITIQUE' : anomaly.severity === 'medium' ? 'ATTENTION' : 'INFO'}
                              </Badge>
                              <Badge className="bg-[#2D3748] text-[#94A3B8] border-0">{anomaly.module}</Badge>
                            </div>
                            <p className="text-white font-medium mb-1">{anomaly.message}</p>
                            {anomaly.date && (
                              <p className="text-xs text-[#94A3B8]">Date: {format(new Date(anomaly.date), 'dd MMM yyyy', { locale: fr })}</p>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="border-[#2D3748] text-white hover:bg-[#2D3748]">
                            Investiguer
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#0099CC] flex items-center justify-center">
                    <Target className="w-6 h-6 text-[#0A0E27]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Recommandations Stratégiques</h3>
                    <p className="text-sm text-[#94A3B8]">{recommendations.length} actions recommandées</p>
                  </div>
                </div>

                {recommendations.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">Aucune action requise</p>
                    <p className="text-[#94A3B8] text-sm">Tous les indicateurs sont optimaux</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-5 rounded-lg border-l-4 ${
                          rec.priority === 'critical' 
                            ? 'bg-rose-500/10 border-rose-500' 
                            : rec.priority === 'high'
                            ? 'bg-amber-500/10 border-amber-500'
                            : 'bg-blue-500/10 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={`${
                                rec.priority === 'critical' 
                                  ? 'bg-rose-500 text-white' 
                                  : rec.priority === 'high'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-blue-500 text-white'
                              } uppercase text-xs font-bold px-3 py-1`}>
                                {rec.priority}
                              </Badge>
                              <Badge className="bg-[#2D3748] text-[#94A3B8] border-0">{rec.module}</Badge>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2">{rec.action}</h4>
                            <p className="text-[#94A3B8] mb-2">
                              <span className="font-semibold text-white">Cible:</span> {rec.target}
                            </p>
                            <p className="text-sm text-[#94A3B8]">
                              <span className="font-semibold text-white">Raison:</span> {rec.reason}
                            </p>
                          </div>
                          <Button className="bg-gradient-to-r from-[#00D9FF] to-[#0099CC] hover:from-[#00C4E6] hover:to-[#0088BB]">
                            Appliquer
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 360 Views Tab */}
          <TabsContent value="360" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Vue Département 360°</h3>
                  <div className="space-y-3">
                    {departmentBreakdown.slice(0, 5).map((dept, idx) => (
                      <div key={idx} className="p-3 bg-[#2D3748] rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">{dept.name}</span>
                          <span className="text-[#00D9FF] font-bold">{dept.value.toLocaleString()} DJF</span>
                        </div>
                        <div className="w-full bg-[#1A202C] rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-[#00D9FF] to-[#0099CC]"
                            style={{ width: `${(dept.value / departmentBreakdown[0].value) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Vue Fournisseurs 360°</h3>
                  <div className="space-y-3">
                    {contacts.slice(0, 5).map((contact, idx) => (
                      <div key={idx} className="p-3 bg-[#2D3748] rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{contact.name}</p>
                            <p className="text-xs text-[#94A3B8]">{contact.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#00D9FF] font-bold">{(contact.total_amount || 0).toLocaleString()} DJF</p>
                            <p className="text-xs text-[#94A3B8]">{contact.total_transactions || 0} transactions</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Revenue vs Expenses Trend */}
              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl lg:col-span-2">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Évolution Revenus vs Dépenses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                      <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} label={{ value: 'Milliers DJF', angle: -90, position: 'insideLeft', fill: '#94A3B8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #2D3748', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ color: '#94A3B8' }} />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Revenus" />
                      <Area type="monotone" dataKey="expenses" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Dépenses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Budget Utilization */}
              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Utilisation Budget</h3>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-40 h-40">
                      <svg className="transform -rotate-90 w-40 h-40">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="#2D3748"
                          strokeWidth="12"
                          fill="transparent"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="#00D9FF"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 70}`}
                          strokeDashoffset={`${2 * Math.PI * 70 * (1 - metrics.budgetUtilization / 100)}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold text-white">{metrics.budgetUtilization.toFixed(0)}%</p>
                        <p className="text-xs text-[#94A3B8]">Utilisé</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94A3B8]">Alloué</span>
                      <span className="font-semibold text-white">{metrics.budgetAllocated.toLocaleString()} DJF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94A3B8]">Utilisé</span>
                      <span className="font-semibold text-[#00D9FF]">{metrics.budgetUsed.toLocaleString()} DJF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94A3B8]">Disponible</span>
                      <span className="font-semibold text-emerald-400">{(metrics.budgetAllocated - metrics.budgetUsed).toLocaleString()} DJF</span>
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
              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-[#94A3B8]">CNSS (Total)</p>
                      <p className="text-xl font-bold text-white">{metrics.cnssTotal.toLocaleString()} DJF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-[#94A3B8]">ITS (Total)</p>
                      <p className="text-xl font-bold text-white">{metrics.itsTotal.toLocaleString()} DJF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-[#1A202C]/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-[#94A3B8]">Revenus Location</p>
                      <p className="text-xl font-bold text-white">{metrics.leaseRevenue.toLocaleString()} DJF</p>
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