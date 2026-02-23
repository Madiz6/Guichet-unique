import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, TrendingDown, FileText, DollarSign, ArrowRight, Building2, Plus } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import CompanyCreationWizard from "../components/company/CompanyCreationWizard";
import AIInsightsBanner from "../components/ai/AIInsightsBanner";
import AICopilot from "../components/ai/AICopilot";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('12M');
  const [showCompanyWizard, setShowCompanyWizard] = useState(false);
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => meras.entities.Employee.list(),
  });
  
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list(),
  });
  
  const company = companies[0] || {};

  // Auto-open wizard for new users without company
  React.useEffect(() => {
    if (!loadingCompanies && companies.length === 0) {
      setShowCompanyWizard(true);
    }
  }, [loadingCompanies, companies.length]);
  
  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => meras.entities.PayrollCycle.list('-created_date', 12),
  });
  
  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => meras.entities.Declaration.list('-created_date', 10),
  });
  
  const activeEmployees = employees.filter(e => e.statut === 'Actif');
  const onHolidayEmployees = employees.filter(e => e.statut === 'En congé');
  
  // Calculate current month totals
  let totalCotisations = 0;
  let totalImpots = 0;
  let totalSalaryNet = 0;
  let totalCNSS = 0;
  
  if (cycles.length > 0) {
    const latestCycle = cycles[0];
    
    employees.forEach(emp => {
      if (latestCycle.employee_ids?.includes(emp.id)) {
        const absences = latestCycle.employee_absences?.[emp.id] || 0;
        const otherDeductions = latestCycle.employee_other_deductions?.[emp.id] || 0;
        const empWithAbsences = { ...emp, absences_amount: absences };
        const calc = calculatePayroll(empWithAbsences);
        
        totalCNSS += calc.cnssEmployee.total + calc.cnssEmployer.total;
        totalImpots += calc.its;
        totalSalaryNet += (calc.netSalary - otherDeductions);
      }
    });
    
    totalCotisations = totalCNSS;
  }
  
  // Prepare chart data for the last 12 months
  const chartData = cycles.slice(0, 12).reverse().map(cycle => {
    let cycleCNSS = 0;
    let cycleITS = 0;
    let cycleSalaryNet = 0;
    
    employees.forEach(emp => {
      if (cycle.employee_ids?.includes(emp.id)) {
        const absences = cycle.employee_absences?.[emp.id] || 0;
        const otherDeductions = cycle.employee_other_deductions?.[emp.id] || 0;
        const empWithAbsences = { ...emp, absences_amount: absences };
        const calc = calculatePayroll(empWithAbsences);
        
        cycleCNSS += calc.cnssEmployee.total + calc.cnssEmployer.total;
        cycleITS += calc.its;
        cycleSalaryNet += (calc.netSalary - otherDeductions);
      }
    });
    
    return {
      month: cycle.periode?.substring(0, 3) || '',
      'Net Salary': Math.round(cycleSalaryNet / 1000),
      'CNSS': Math.round(cycleCNSS / 1000),
      'ITS': Math.round(cycleITS / 1000)
    };
  });
  
  // Department distribution
  const departmentData = activeEmployees.reduce((acc, emp) => {
    const dept = emp.departement || 'Non assigné';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = Object.entries(departmentData).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
  
  const MetricCard = ({ title, value, trend, trendValue, icon: Icon, color, link }) => {
    const colorClasses = {
      purple: { bg: 'from-[#6366F1] to-[#8B5CF6]', text: 'text-[#6366F1]', light: 'bg-[#6366F1]/10' },
      blue: { bg: 'from-[#3B82F6] to-[#06B6D4]', text: 'text-[#3B82F6]', light: 'bg-[#3B82F6]/10' },
      pink: { bg: 'from-[#EC4899] to-[#F43F5E]', text: 'text-[#EC4899]', light: 'bg-[#EC4899]/10' },
      green: { bg: 'from-[#10B981] to-[#059669]', text: 'text-[#10B981]', light: 'bg-[#10B981]/10' }
    };
    
    const colors = colorClasses[color] || colorClasses.blue;
    const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
    
    return (
      <Link to={link}>
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
        >
          <Card className="border border-[#E5E7EB] swan-shadow hover:swan-shadow-lg transition-all duration-300 bg-white overflow-hidden h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                    <p className="text-sm font-normal text-[#6B6B6B]">{title}</p>
                  </div>
                  <h3 className="text-3xl font-semibold text-[#1A1A1A] mb-2 tracking-tight">{value}</h3>
                  {trendValue && (
                    <div className="flex items-center gap-1.5">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                        trend === 'up' ? 'bg-[#F5F5F5]' : 'bg-[#F5F5F5]'
                      }`}>
                        <TrendIcon className={`w-3.5 h-3.5 ${
                          trend === 'up' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'
                        }`} />
                        <span className="text-xs font-medium text-[#1A1A1A]">
                          {trendValue}
                        </span>
                      </div>
                      <span className="text-xs text-[#6B6B6B] font-normal">vs last month</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Link>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* AI Insights Banner */}
        <AIInsightsBanner
          transactions={[]}
          budgets={[]}
          employees={employees}
          expenseRequests={[]}
        />

        {/* No Company Alert */}
        {companies.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border border-[#E5E7EB] swan-shadow bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#1A1A1A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1A1A1A] tracking-tight">Aucune entreprise configurée</h3>
                      <p className="text-sm text-[#6B6B6B] mt-1 font-normal">
                        Créez votre entreprise pour commencer à utiliser la plateforme
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setShowCompanyWizard(true)} className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Créer mon entreprise
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-[#1A1A1A] mb-2 tracking-tight">
                Welcome back, {company?.nom_entreprise || 'Admin'}
              </h1>
              <p className="text-[#6B6B6B] flex items-center gap-2 font-normal">
                    <span>{company?.nom_entreprise || 'Paie360'}</span>
                    {company?.numero_affiliation && (
                      <>
                        <span>•</span>
                        <span>N° {company.numero_affiliation}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-[#1A1A1A] font-medium">Powered by Meras PSP</span>
                  </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#6B6B6B] font-normal">{format(new Date(), 'EEEE')}</p>
              <p className="text-lg font-medium text-[#1A1A1A]">{format(new Date(), 'dd MMMM yyyy')}</p>
            </div>
          </div>
        </motion.div>
        
        {/* Metric Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <MetricCard
            title="COTISATIONS CNSS (SAL.PAT)"
            value={`DJF ${totalCotisations.toLocaleString()}`}
            trend="up"
            trendValue="21.9%"
            icon={DollarSign}
            color="purple"
            link={createPageUrl('Declarations')}
          />
          
          <MetricCard
            title="Active Employees"
            value={activeEmployees.length.toLocaleString()}
            trend="up"
            trendValue="13%"
            icon={Users}
            color="blue"
            link={createPageUrl('Employes')}
          />
          
          <MetricCard
            title="Mes Déclarations"
            value={declarations.length.toLocaleString()}
            trend="up"
            trendValue="5.7%"
            icon={FileText}
            color="pink"
            link={createPageUrl('Declarations')}
          />
          
          <MetricCard
            title="IMPÔTS (ITS)"
            value={`DJF ${totalImpots.toLocaleString()}`}
            trend="down"
            trendValue="11%"
            icon={TrendingUp}
            color="green"
            link={createPageUrl('Paie')}
          />
        </motion.div>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Salary vs CNSS vs ITS</h3>
                    <p className="text-sm text-[#64748B]">Monthly trends (in thousands)</p>
                  </div>
                  <div className="flex gap-2">
                    {['6M', '12M', 'YTD'].map(range => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          timeRange === range
                            ? 'bg-[#6366F1] text-white shadow-sm'
                            : 'text-[#64748B] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#64748B', fontSize: 12 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 12 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Net Salary" 
                      stroke="#6366F1" 
                      strokeWidth={2.5}
                      dot={{ fill: '#6366F1', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="CNSS" 
                      stroke="#10B981" 
                      strokeWidth={2.5}
                      dot={{ fill: '#10B981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ITS" 
                      stroke="#EC4899" 
                      strokeWidth={2.5}
                      dot={{ fill: '#EC4899', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm h-full">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Employees Per Department</h3>
                  <p className="text-sm text-[#64748B]">Distribution overview</p>
                </div>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-bold text-[#0F172A]">{activeEmployees.length}</p>
                    <p className="text-sm text-[#64748B]">Total Employees</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {pieData.slice(0, 6).map((dept, idx) => (
                    <div key={dept.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#0F172A] truncate">{dept.name}</p>
                        <p className="text-xs text-[#64748B]">{dept.value} emp</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {/* Declarations Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Mes Déclarations</h3>
                  <p className="text-sm text-[#64748B]">Recent CNSS declarations</p>
                </div>
                <Link to={createPageUrl('Declarations')}>
                  <Button variant="ghost" className="text-[#6366F1] hover:bg-[#6366F1]/10">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Apple de cotisation
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Periode
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Date de declaration
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Date de paiements
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Regime
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Statut de Paiement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {declarations.slice(0, 5).map((decl) => (
                      <tr key={decl.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-[#6366F1]" />
                            </div>
                            <span className="font-mono text-sm font-medium text-[#0F172A]">
                              {decl.numero_cotisation}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-[#475569]">
                          {decl.periode}
                        </td>
                        <td className="py-4 px-4 text-sm text-[#475569]">
                          {decl.created_date ? format(new Date(decl.created_date), 'yyyy-MM-dd') : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-[#475569]">
                          {decl.date_paiement ? format(new Date(decl.date_paiement), 'yyyy-MM-dd') : '-'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#6366F1]/10 text-[#6366F1]">
                            {decl.regime}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">
                            Cloturé
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            decl.statut === 'Payé'
                              ? 'bg-[#10B981]/10 text-[#10B981]'
                              : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                          }`}>
                            {decl.statut === 'Payé' && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {decl.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>

        {/* Company Creation Wizard */}
        <CompanyCreationWizard
        isOpen={showCompanyWizard}
        onClose={() => setShowCompanyWizard(false)}
        onSuccess={() => setShowCompanyWizard(false)}
        />
        </div>
        );
        }