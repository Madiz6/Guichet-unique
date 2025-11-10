import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, FileText, Calendar, Download, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculatePayroll } from "../payroll/DjiboutiCalculator";
import { motion } from 'framer-motion';

export default function EmployeePortal() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => base44.entities.PayrollCycle.list('-created_date', 12),
  });
  
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-created_date'),
  });
  
  // Find employee by email
  const employee = employees.find(e => e.email === user?.email);
  
  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-[#D3DCE6] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0A2540] mb-2">Profil non trouvé</h2>
            <p className="text-[#697586]">
              Aucun profil employé n'est associé à votre compte. Contactez les RH.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get employee's payslips
  const myPayslips = cycles.filter(cycle => cycle.employee_ids?.includes(employee.id));
  
  // Get employee's holidays
  const myHolidays = holidays.filter(h => h.employee_id === employee.id);
  
  // Calculate current salary
  const latestCycle = myPayslips[0];
  let currentSalary = null;
  if (latestCycle) {
    const absences = latestCycle.employee_absences?.[employee.id] || 0;
    const otherDeductions = latestCycle.employee_other_deductions?.[employee.id] || 0;
    const empWithAbsences = { ...employee, absences_amount: absences };
    const calc = calculatePayroll(empWithAbsences);
    currentSalary = calc.netSalary - otherDeductions;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#0A2540]">Bienvenue, {employee.prenom}! 👋</h1>
          <p className="text-[#697586] mt-1">Consultez vos informations personnelles et bulletins de paie</p>
        </motion.div>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Dernier Salaire Net</p>
                    <p className="text-2xl font-bold text-[#0A2540]">
                      {currentSalary ? `${currentSalary.toLocaleString()} DJF` : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Congés Disponibles</p>
                    <p className="text-2xl font-bold text-[#0A2540]">
                      {30 - myHolidays.filter(h => h.statut === 'Approuvé').reduce((sum, h) => sum + (h.nombre_jours || 0), 0)} jours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Ancienneté</p>
                    <p className="text-2xl font-bold text-[#0A2540]">
                      {employee.anciennete_annees || 0} ans
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {/* Personal Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-[#0A2540] mb-6">Informations Personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[#697586]">Fonction</p>
                  <p className="font-semibold text-[#0A2540] mt-1">{employee.fonction}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Département</p>
                  <p className="font-semibold text-[#0A2540] mt-1">{employee.departement}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Date d'embauche</p>
                  <p className="font-semibold text-[#0A2540] mt-1">
                    {employee.date_embauche ? format(new Date(employee.date_embauche), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Email</p>
                  <p className="font-semibold text-[#0A2540] mt-1">{employee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Téléphone</p>
                  <p className="font-semibold text-[#0A2540] mt-1">{employee.telephone}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Banque</p>
                  <p className="font-semibold text-[#0A2540] mt-1">{employee.banque}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Payslips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-[#0A2540] mb-6">Mes Bulletins de Paie</h2>
              <div className="space-y-3">
                {myPayslips.length === 0 ? (
                  <p className="text-center text-[#697586] py-8">Aucun bulletin de paie disponible</p>
                ) : (
                  myPayslips.map(cycle => {
                    const absences = cycle.employee_absences?.[employee.id] || 0;
                    const otherDeductions = cycle.employee_other_deductions?.[employee.id] || 0;
                    const empWithAbsences = { ...employee, absences_amount: absences };
                    const calc = calculatePayroll(empWithAbsences);
                    const netSalary = calc.netSalary - otherDeductions;
                    
                    return (
                      <div key={cycle.id} className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#0066FF]/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#0066FF]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#0A2540]">{cycle.periode}</p>
                            <p className="text-sm text-[#697586]">Net: {netSalary.toLocaleString()} DJF</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-[#D3DCE6]">
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" className="border-[#D3DCE6]">
                            <Mail className="w-4 h-4 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}