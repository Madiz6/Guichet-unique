import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Users, DollarSign, FileText, Calendar, ArrowRight, Briefcase, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { motion } from 'framer-motion';

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => base44.entities.PayrollCycle.list('-created_date', 12),
  });
  
  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => base44.entities.Declaration.list('-created_date'),
  });
  
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-created_date'),
  });
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0] || {};
  
  // Calculate executive metrics
  const activeEmployees = employees.filter(e => e.statut === 'Actif').length;
  const totalEmployees = employees.length;
  
  // Current month financials
  const latestCycle = cycles[0];
  let monthlyPayrollCost = 0;
  let monthlyCNSS = 0;
  let monthlyITS = 0;
  
  if (latestCycle) {
    employees.forEach(emp => {
      if (latestCycle.employee_ids?.includes(emp.id)) {
        const absences = latestCycle.employee_absences?.[emp.id] || 0;
        const empWithAbsences = { ...emp, absences_amount: absences };
        const calc = calculatePayroll(empWithAbsences);
        
        monthlyPayrollCost += calc.totalCost;
        monthlyCNSS += calc.cnssEmployee.total + calc.cnssEmployer.total;
        monthlyITS += calc.its;
      }
    });
  }
  
  // Compliance score calculation
  const pendingDeclarations = declarations.filter(d => d.statut === 'Non payé').length;
  const overdueDeclarations = declarations.filter(d => {
    if (d.statut !== 'Non payé') return false;
    return d.date_limite && new Date(d.date_limite) < new Date();
  }).length;
  
  const complianceScore = Math.max(0, 100 - (pendingDeclarations * 10) - (overdueDeclarations * 20));
  
  // Pending holidays
  const pendingHolidays = holidays.filter(h => h.statut === 'En attente').length;
  
  // Trend data for charts
  const last6Months = cycles.slice(0, 6).reverse().map(cycle => {
    let cycleCost = 0;
    let cycleCNSS = 0;
    let cycleITS = 0;
    let cycleNet = 0;
    
    employees.forEach(emp => {
      if (cycle.employee_ids?.includes(emp.id)) {
        const absences = cycle.employee_absences?.[emp.id] || 0;
        const otherDeductions = cycle.employee_other_deductions?.[emp.id] || 0;
        const empWithAbsences = { ...emp, absences_amount: absences };
        const calc = calculatePayroll(empWithAbsences);
        
        cycleCost += calc.totalCost;
        cycleCNSS += calc.cnssEmployee.total + calc.cnssEmployer.total;
        cycleITS += calc.its;
        cycleNet += (calc.netSalary - otherDeductions);
      }
    });
    
    return {
      month: cycle.periode?.substring(0, 3) || '',
      cost: Math.round(cycleCost / 1000),
      cnss: Math.round(cycleCNSS / 1000),
      its: Math.round(cycleITS / 1000),
      net: Math.round(cycleNet / 1000)
    };
  });
  
  // Department breakdown
  const departmentData = employees.reduce((acc, emp) => {
    const dept = emp.departement || 'Non assigné';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  
  const departmentChart = Object.entries(departmentData).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
  
  // Action items
  const actionItems = [
    {
      title: `${pendingHolidays} demandes de congés à approuver`,
      count: pendingHolidays,
      link: createPageUrl('Conges'),
      color: '#F59E0B'
    },
    {
      title: `${pendingDeclarations} déclarations à traiter`,
      count: pendingDeclarations,
      link: createPageUrl('Declarations'),
      color: '#EF4444'
    },
    {
      title: `${overdueDeclarations} déclarations en retard`,
      count: overdueDeclarations,
      link: createPageUrl('Declarations'),
      color: '#DC2626'
    }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" size="icon" className="border-[#D3DCE6]">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#0F172A]">
                  Bonjour, {company?.nom_entreprise || 'Admin'} ☕
                </h1>
                <p className="text-[#64748B] mt-1">Voici quelques points à traiter aujourd'hui</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#64748B]">{format(new Date(), 'EEEE', { locale: fr })}</p>
              <p className="text-lg font-semibold text-[#0F172A]">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
            </div>
          </div>
        </motion.div>
        
        {/* Action Items */}
        {actionItems.some(item => item.count > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            {actionItems.filter(item => item.count > 0).map((item, idx) => (
              <Link key={idx} to={item.link}>
                <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" style={{ borderLeft: `4px solid ${item.color}` }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
                      <p className="text-sm text-[#64748B] mt-1">{item.title}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#64748B]" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </motion.div>
        )}
        
        {/* Financial Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-semibold">
                  Mois en cours
                </span>
              </div>
              <p className="text-sm text-[#64748B] mb-1">Coût total paie</p>
              <p className="text-2xl font-bold text-[#0F172A]">{monthlyPayrollCost.toLocaleString()} DJF</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-[#10B981]">
                <TrendingUp className="w-3 h-3" />
                <span>+12% vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[#6366F1]/10 text-[#6366F1] font-semibold">
                  CNSS
                </span>
              </div>
              <p className="text-sm text-[#64748B] mb-1">Cotisations CNSS</p>
              <p className="text-2xl font-bold text-[#0F172A]">{monthlyCNSS.toLocaleString()} DJF</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-[#64748B]">
                <span>Salarié + Patronal</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] font-semibold">
                  ITS
                </span>
              </div>
              <p className="text-sm text-[#64748B] mb-1">Impôts (ITS)</p>
              <p className="text-2xl font-bold text-[#0F172A]">{monthlyITS.toLocaleString()} DJF</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-[#EF4444]">
                <TrendingDown className="w-3 h-3" />
                <span>-8% vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[#EC4899]/10 text-[#EC4899] font-semibold">
                  {activeEmployees}/{totalEmployees}
                </span>
              </div>
              <p className="text-sm text-[#64748B] mb-1">Employés actifs</p>
              <p className="text-2xl font-bold text-[#0F172A]">{activeEmployees}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-[#64748B]">
                <span>Sur {totalEmployees} total</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Compliance & Wallet Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Compliance Score */}
          <Card className="border-0 shadow-lg lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                {complianceScore >= 80 ? (
                  <CheckCircle className="w-10 h-10 text-[#10B981]" />
                ) : complianceScore >= 50 ? (
                  <AlertCircle className="w-10 h-10 text-[#F59E0B]" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-[#EF4444]" />
                )}
                <div>
                  <p className="text-sm text-[#64748B]">Score de conformité</p>
                  <p className="text-3xl font-bold text-[#0F172A]">{complianceScore}%</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Déclarations à jour</span>
                  <span className="font-semibold text-[#0F172A]">
                    {declarations.length - pendingDeclarations}/{declarations.length}
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#10B981] to-[#059669] h-2 rounded-full transition-all"
                    style={{ width: `${((declarations.length - pendingDeclarations) / declarations.length) * 100 || 0}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm mt-4">
                  <span className="text-[#64748B]">Congés traités</span>
                  <span className="font-semibold text-[#0F172A]">
                    {holidays.length - pendingHolidays}/{holidays.length}
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] h-2 rounded-full transition-all"
                    style={{ width: `${((holidays.length - pendingHolidays) / holidays.length) * 100 || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Financial Trend Chart */}
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Évolution des coûts</h3>
                  <p className="text-sm text-[#64748B]">6 derniers mois (en milliers DJF)</p>
                </div>
                <div className="flex gap-2">
                  {['3M', '6M', '12M'].map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedPeriod === period
                          ? 'bg-[#6366F1] text-white'
                          : 'text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={last6Months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cost" stroke="#6366F1" strokeWidth={2.5} name="Coût total" />
                  <Line type="monotone" dataKey="cnss" stroke="#10B981" strokeWidth={2.5} name="CNSS" />
                  <Line type="monotone" dataKey="its" stroke="#F59E0B" strokeWidth={2.5} name="ITS" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Department Distribution & Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Department Chart */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">Répartition par département</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {departmentChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {departmentChart.slice(0, 6).map((dept, idx) => (
                  <div key={dept.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0F172A] truncate">{dept.name}</p>
                      <p className="text-xs text-[#64748B]">{dept.value} employés</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Key Metrics */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">Indicateurs clés</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#6366F1]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#64748B]">Cycles de paie traités</p>
                        <p className="text-xl font-bold text-[#0F172A]">{cycles.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#64748B]">Déclarations soumises</p>
                        <p className="text-xl font-bold text-[#0F172A]">{declarations.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#64748B]">Jours de congés pris</p>
                        <p className="text-xl font-bold text-[#0F172A]">
                          {holidays.filter(h => h.statut === 'Approuvé').reduce((acc, h) => acc + (h.nombre_jours || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}