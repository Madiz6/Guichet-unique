import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Calendar, Download, CreditCard, Trash2, Minus, Eye, Filter, FileText, Mail, X, Search, Users, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { generatePayslip } from "../components/payroll/PDFGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import PermissionGuard, { usePermission } from "../components/permissions/PermissionGuard";
import SignatureDialog from "../components/documents/SignatureDialog";
import PayslipEmailModal from "../components/payroll/PayslipEmailModal";
import PaymentGateway from "../components/payments/PaymentGateway";
import { logAuditAction, AUDIT_ACTIONS } from "../components/security/AuditLogger";
import { registerPayrollTransaction, markPayrollTransactionPaid } from "../components/transactions/autoTransactions";

export default function Paie() {
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeAbsences, setEmployeeAbsences] = useState({});
  const [employeeOtherDeductions, setEmployeeOtherDeductions] = useState({});
  const [employeeAbsenceTiming, setEmployeeAbsenceTiming] = useState({});
  const [employeeOtherDeductionTiming, setEmployeeOtherDeductionTiming] = useState({});
  const [employeeCyclePrimes, setEmployeeCyclePrimes] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Actif');
  const [selectedEmployeeDrawer, setSelectedEmployeeDrawer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [viewingCycle, setViewingCycle] = useState(null);
  const [showPayrollList, setShowPayrollList] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedCycleForPayment, setSelectedCycleForPayment] = useState(null);

  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  const [signatureDialog, setSignatureDialog] = useState({ isOpen: false, documentType: null, employee: null, cycle: null });
  const [emailModalData, setEmailModalData] = useState(null);

  const [selectedEmployeeForPrime, setSelectedEmployeeForPrime] = useState(null);
  const [primeType, setPrimeType] = useState('');
  const [customPrimeName, setCustomPrimeName] = useState('');
  const [primeMontant, setPrimeMontant] = useState('');
  const [addAfterDeductions, setAddAfterDeductions] = useState(false);

  const getInitialPaymentDate = () => {
    const nextMonth = addMonths(new Date(), 1);
    const day10OfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10);
    return format(day10OfNextMonth, 'yyyy-MM-dd');
  };

  const [cycleData, setCycleData] = useState({
    periode: format(new Date(), 'MMMM yyyy'),
    mois_annee: format(new Date(), 'yyyyMM'),
    date_debut: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_fin: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    date_paiement: getInitialPaymentDate()
  });

  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => meras.entities.Employee.list('-created_date'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => meras.entities.Holiday.list(),
  });

  const company = companies[0] || {};

  const getEmployeeHolidayStatus = (employeeId, cycleData) => {
    const cyclePeriod = cycleData.mois_annee;
    if (!cyclePeriod) return null;

    const cycleYear = parseInt(cyclePeriod.substring(0, 4), 10);
    const cycleMonth = parseInt(cyclePeriod.substring(4, 6), 10);

    const activeHoliday = holidays.find(h => {
      if (h.employee_id !== employeeId) return false;
      if (h.statut !== 'Approuvé' && h.statut !== 'En cours') return false;

      const startDate = new Date(h.date_debut);
      const endDate = new Date(h.date_fin);
      const cycleStart = new Date(cycleYear, cycleMonth - 1, 1);
      const cycleEnd = new Date(cycleYear, cycleMonth, 0, 23, 59, 59, 999);

      return (startDate <= cycleEnd && endDate >= cycleStart);
    });

    if (!activeHoliday) return null;

    if (activeHoliday.type_conge === 'Congé maternité') {
      const startDate = new Date(activeHoliday.date_debut);
      const monthDiff = (cycleYear - startDate.getFullYear()) * 12 + (cycleMonth - (startDate.getMonth() + 1));
      const monthNumber = monthDiff + 1;

      return {
        type: activeHoliday.type_conge,
        month_number: Math.max(1, monthNumber)
      };
    }

    return {
      type: activeHoliday.type_conge
    };
  };

  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => meras.entities.PayrollCycle.list('-created_date'),
  });

  const createCycleMutation = useMutation({
    mutationFn: (data) => meras.entities.PayrollCycle.create(data),
    onSuccess: async (newCycle) => {
      queryClient.invalidateQueries(['payroll-cycles']);

      await logAuditAction(
        AUDIT_ACTIONS.PAYROLL_CREATED,
        'PayrollCycle',
        newCycle.id,
        {
          periode: newCycle.periode,
          nombre_employes: newCycle.nombre_employes,
          salaire_net_total: newCycle.salaire_net_total
        },
        newCycle.periode
      );

      setShowForm(false);
      setSelectedEmployees([]);
      setEmployeeAbsences({});
      setEmployeeOtherDeductions({});
      setEmployeeAbsenceTiming({});
      setEmployeeOtherDeductionTiming({});
      setEmployeeCyclePrimes({});
      setSearchQuery('');
      setDepartmentFilter('all');
      setStatusFilter('Actif');
      setCurrentPage(1);

      toast.success('Cycle de paie créé avec succès');
    },
  });

  const deleteCycleMutation = useMutation({
    mutationFn: (id) => meras.entities.PayrollCycle.delete(id),
    onSuccess: async (_, deletedId) => {
      const deletedCycle = cycles.find(c => c.id === deletedId);

      if (deletedCycle) {
        await logAuditAction(
          AUDIT_ACTIONS.PAYROLL_DELETED,
          'PayrollCycle',
          deletedId,
          { periode: deletedCycle.periode },
          deletedCycle.periode
        );
      }

      queryClient.invalidateQueries(['payroll-cycles']);
      toast.success('Cycle supprimé');
    },
  });

  const handleRemovePrime = (empId, primeIndex) => {
    setEmployeeCyclePrimes(prev => ({
      ...prev,
      [empId]: prev[empId].filter((_, i) => i !== primeIndex)
    }));
    toast.info('Prime supprimée.');
  };

  const handleCreateCycle = () => {
    const employeesToProcess = selectedEmployees.length > 0
      ? employees.filter(e => selectedEmployees.includes(e.id))
      : [];

    if (employeesToProcess.length === 0) {
      toast.error('Aucun employé sélectionné pour ce cycle de paie.');
      return;
    }

    let totalGross = 0;
    let totalChargesSalariales = 0;
    let totalChargesPatronales = 0;
    let totalNet = 0;
    const employeeHolidayStatuses = {};

    employeesToProcess.forEach(emp => {
      const absences = employeeAbsences[emp.id] || 0;
      const otherDeductions = employeeOtherDeductions[emp.id] || 0;
      const cyclePrimes = employeeCyclePrimes[emp.id] || [];
      const absenceAfterDeductions = employeeAbsenceTiming[emp.id] || false;
      const otherDeductionFromGross = employeeOtherDeductionTiming[emp.id] || false;

      const holidayStatus = getEmployeeHolidayStatus(emp.id, cycleData);
      if (holidayStatus) {
        employeeHolidayStatuses[emp.id] = holidayStatus;
      }

      let effectiveAbsencesForGross = 0;
      if (!absenceAfterDeductions) {
        effectiveAbsencesForGross += absences;
      }
      if (otherDeductionFromGross) {
        effectiveAbsencesForGross += otherDeductions;
      }

      const empForCalc = { ...emp, absences_amount: effectiveAbsencesForGross };
      const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);

      let netDeductions = 0;
      if (absenceAfterDeductions) {
        netDeductions += absences;
      }
      if (!otherDeductionFromGross) {
        netDeductions += otherDeductions;
      }

      const finalNetForEmployee = calc.netSalary - netDeductions;

      totalGross += calc.grossSalary;
      totalChargesSalariales += calc.cnssEmployee.total + calc.its;
      totalChargesPatronales += calc.cnssEmployer.total;
      totalNet += finalNetForEmployee;
    });

    const cycleToCreate = {
      ...cycleData,
      nombre_employes: employeesToProcess.length,
      salaire_brut_total: Math.round(totalGross),
      charges_salariales_total: Math.round(totalChargesSalariales),
      charges_patronales_total: Math.round(totalChargesPatronales),
      salaire_net_total: Math.round(totalNet),
      statut: 'En cours',
      employee_ids: employeesToProcess.map(e => e.id),
      employee_absences: employeeAbsences,
      employee_other_deductions: employeeOtherDeductions,
      employee_absence_timing: employeeAbsenceTiming,
      employee_other_deduction_timing: employeeOtherDeductionTiming,
      employee_cycle_primes: employeeCyclePrimes,
      employee_holiday_status: employeeHolidayStatuses
    };

    createCycleMutation.mutate(cycleToCreate);
  };

  const handlePayment = (cycle) => {
    setSelectedCycleForPayment(cycle);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (selectedCycleForPayment) {
      await logAuditAction(
        AUDIT_ACTIONS.PAYROLL_PAID,
        'PayrollCycle',
        selectedCycleForPayment.id,
        {
          periode: selectedCycleForPayment.periode,
          montant: selectedCycleForPayment.salaire_net_total,
          transaction_id: paymentData.transaction_id
        },
        selectedCycleForPayment.periode
      );
    }

    queryClient.invalidateQueries(['payroll-cycles']);
    setShowPaymentGateway(false);
    setSelectedCycleForPayment(null);
    toast.success('Paiement effectué avec succès!');
  };

  const handleDownloadPayslip = async (emp, cycle) => {
    await logAuditAction(
      AUDIT_ACTIONS.PAYSLIP_GENERATED,
      'Employee',
      emp.id,
      {
        employee_name: `${emp.prenom} ${emp.nom}`,
        periode: cycle.periode
      },
      `${emp.prenom} ${emp.nom} - ${cycle.periode}`
    );

    setSignatureDialog({
      isOpen: true,
      documentType: 'payslip',
      employee: emp,
      cycle: cycle
    });
  };

  const handleConfirmSignature = (signatory) => {
    const { employee, cycle, documentType } = signatureDialog;
    if (documentType === 'payslip') {
      generatePayslip(employee, company, cycle, signatory);
      toast.success('Bulletin de paie généré avec succès!');
    }
    setSignatureDialog({ isOpen: false, documentType: null, employee: null, cycle: null });
  };

  const toggleEmployeeSelection = (empId) => {
    setSelectedEmployees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleAbsencesChange = (empId, value) => {
    setEmployeeAbsences(prev => ({
      ...prev,
      [empId]: parseFloat(value) || 0
    }));
  };

  const handleOtherDeductionsChange = (empId, value) => {
    setEmployeeOtherDeductions(prev => ({
      ...prev,
      [empId]: parseFloat(value) || 0
    }));
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchQuery ||
      `${emp.prenom} ${emp.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.fonction?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.matricule_cnss?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = departmentFilter === 'all' || emp.departement === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.statut === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const departments = [...new Set(employees.map(e => e.departement).filter(Boolean))];

  const selectedEmployeesDataForStats = employees.filter(e => selectedEmployees.includes(e.id));
  const stats = {
    total: selectedEmployeesDataForStats.length,
    totalBrut: selectedEmployeesDataForStats.reduce((sum, emp) => {
      const absences = employeeAbsences[emp.id] || 0;
      const otherDeductions = employeeOtherDeductions[emp.id] || 0;
      const cyclePrimes = employeeCyclePrimes[emp.id] || [];
      const absenceAfterDeductions = employeeAbsenceTiming[emp.id] || false;
      const otherDeductionFromGross = employeeOtherDeductionTiming[emp.id] || false;
      const holidayStatus = getEmployeeHolidayStatus(emp.id, cycleData);

      let effectiveAbsencesForGross = 0;
      if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
      if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;

      const empForCalc = { ...emp, absences_amount: effectiveAbsencesForGross };
      const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);
      return sum + calc.grossSalary;
    }, 0),
    totalNet: selectedEmployeesDataForStats.reduce((sum, emp) => {
      const absences = employeeAbsences[emp.id] || 0;
      const otherDeductions = employeeOtherDeductions[emp.id] || 0;
      const cyclePrimes = employeeCyclePrimes[emp.id] || [];
      const absenceAfterDeductions = employeeAbsenceTiming[emp.id] || false;
      const otherDeductionFromGross = employeeOtherDeductionTiming[emp.id] || false;
      const holidayStatus = getEmployeeHolidayStatus(emp.id, cycleData);

      let effectiveAbsencesForGross = 0;
      if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
      if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;

      const empForCalc = { ...emp, absences_amount: effectiveAbsencesForGross };
      const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);

      let netDeductions = 0;
      if (absenceAfterDeductions) netDeductions += absences;
      if (!otherDeductionFromGross) netDeductions += otherDeductions;

      return sum + (calc.netSalary - netDeductions);
    }, 0)
  };

  const allPayrollRecords = cycles.flatMap(cycle => {
    if (!cycle.employee_ids) return [];

    return cycle.employee_ids.map(empId => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) return null;

      const absences = cycle.employee_absences?.[emp.id] || 0;
      const otherDeductions = cycle.employee_other_deductions?.[emp.id] || 0;
      const cyclePrimes = cycle.employee_cycle_primes?.[emp.id] || [];
      const holidayStatus = cycle.employee_holiday_status?.[emp.id] || null;
      const absenceAfterDeductions = cycle.employee_absence_timing?.[emp.id] || false;
      const otherDeductionFromGross = cycle.employee_other_deduction_timing?.[emp.id] || false;

      let effectiveAbsencesForGross = 0;
      if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
      if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;

      const empForCalc = { ...emp, absences_amount: effectiveAbsencesForGross };
      const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);

      let netDeductions = 0;
      if (absenceAfterDeductions) netDeductions += absences;
      if (!otherDeductionFromGross) netDeductions += otherDeductions;

      const finalNet = calc.netSalary - netDeductions;

      return {
        cycleId: cycle.id,
        cyclePeriode: cycle.periode,
        cycleYear: cycle.mois_annee?.substring(0, 4) || '',
        cycleMonth: cycle.mois_annee?.substring(4, 6) || '',
        employee: emp,
        grossSalary: calc.grossSalary,
        cnssEmployee: calc.cnssEmployee.total,
        cnssEmployer: calc.cnssEmployer.total,
        its: calc.its,
        aide: calc.aide,
        absences,
        otherDeductions,
        netSalary: finalNet,
        cycle
      };
    }).filter(Boolean);
  });

  const filteredPayrollRecords = allPayrollRecords.filter(record => {
    const monthMatch = filterMonth === 'all' || record.cycleMonth === filterMonth;
    const yearMatch = filterYear === 'all' || record.cycleYear === filterYear;
    const deptMatch = filterDepartment === 'all' || record.employee.departement === filterDepartment;
    return monthMatch && yearMatch && deptMatch;
  });

  const availableYears = [...new Set(allPayrollRecords.map(r => r.cycleYear).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const availableMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const availableDepartments = [...new Set(employees.map(e => e.departement).filter(Boolean))].sort();

  const monthNames = {
    '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
    '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
    '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
  };

  const canCreate = usePermission('payroll_create');
  const canProcess = usePermission('payroll_process');
  const canDelete = usePermission('payroll_delete');

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-[1800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowForm(false);
                setSelectedEmployees([]);
                setEmployeeAbsences({});
                setEmployeeOtherDeductions({});
                setEmployeeAbsenceTiming({});
                setEmployeeOtherDeductionTiming({});
                setEmployeeCyclePrimes({});
                setSearchQuery('');
                setDepartmentFilter('all');
                setStatusFilter('Actif');
                setCurrentPage(1);
              }}
              className="border-[#D3DCE6]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-[#0A2540]">Nouveau Cycle de Paie</h1>
              <p className="text-[#697586] mt-1">{cycleData.periode}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Employés Sélectionnés</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Salaire Brut Total</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{stats.totalBrut.toLocaleString()} DJF</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Salaire Net Total</p>
                    <p className="text-2xl font-bold text-[#0066FF]">{stats.totalNet.toLocaleString()} DJF</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Date de Paiement</p>
                    <p className="text-lg font-bold text-[#0A2540]">{format(new Date(cycleData.date_paiement), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-[#E8ECF2] mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label>Période</Label>
                  <Input
                    value={cycleData.periode}
                    onChange={(e) => setCycleData({...cycleData, periode: e.target.value})}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                <div>
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={cycleData.date_debut}
                    onChange={(e) => setCycleData({...cycleData, date_debut: e.target.value})}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={cycleData.date_fin}
                    onChange={(e) => setCycleData({...cycleData, date_fin: e.target.value})}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                <div>
                  <Label>Date de paiement</Label>
                  <Input
                    type="date"
                    value={cycleData.date_paiement}
                    onChange={(e) => setCycleData({...cycleData, date_paiement: e.target.value})}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-[#F7F9FC] rounded-lg">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#697586]" />
                    <Input
                      placeholder="Rechercher par nom, fonction, matricule..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 border-[#D3DCE6]"
                    />
                  </div>
                </div>
                <Select value={departmentFilter} onValueChange={(value) => { setDepartmentFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[200px] border-[#D3DCE6]">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px] border-[#D3DCE6]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="Actif">Actif</SelectItem>
                    <SelectItem value="En congé">En congé</SelectItem>
                    <SelectItem value="Suspendu">Suspendu</SelectItem>
                    <SelectItem value="Inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEmployees(selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0 ? [] : filteredEmployees.map(e => e.id))}
                  className="border-[#0066FF] text-[#0066FF]"
                >
                  {selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0 ? 'Désélectionner tout' : 'Sélectionner tout'}
                </Button>
              </div>

              <div className="border border-[#E8ECF2] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F9FC]">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.length === paginatedEmployees.length && paginatedEmployees.length > 0}
                          onChange={() => {
                            if (selectedEmployees.length === paginatedEmployees.length) {
                              setSelectedEmployees([]);
                            } else {
                              setSelectedEmployees(paginatedEmployees.map(e => e.id));
                            }
                          }}
                          className="w-5 h-5 text-[#0066FF] rounded"
                        />
                      </TableHead>
                      <TableHead>Employé</TableHead>
                      <TableHead>Département</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Salaire Brut</TableHead>
                      <TableHead>Salaire Net</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployees.map(emp => {
                      const absences = employeeAbsences[emp.id] || 0;
                      const otherDeductions = employeeOtherDeductions[emp.id] || 0;
                      const cyclePrimes = employeeCyclePrimes[emp.id] || [];
                      const absenceAfterDeductions = employeeAbsenceTiming[emp.id] || false;
                      const otherDeductionFromGross = employeeOtherDeductionTiming[emp.id] || false;
                      const holidayStatus = getEmployeeHolidayStatus(emp.id, cycleData);

                      let effectiveAbsencesForGross = 0;
                      if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
                      if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;

                      const empForCalc = { ...emp, absences_amount: effectiveAbsencesForGross };
                      const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);

                      let netDeductions = 0;
                      if (absenceAfterDeductions) netDeductions += absences;
                      if (!otherDeductionFromGross) netDeductions += otherDeductions;

                      const finalNet = calc.netSalary - netDeductions;
                      const isSelected = selectedEmployees.includes(emp.id);
                      const hasModifications = absences > 0 || otherDeductions > 0 || cyclePrimes.length > 0;

                      return (
                        <TableRow
                          key={emp.id}
                          className={`hover:bg-[#F7F9FC] transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEmployeeSelection(emp.id)}
                              className="w-5 h-5 text-[#0066FF] rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {emp.photo_url ? (
                                <img src={emp.photo_url} alt={`${emp.prenom} ${emp.nom}`} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-white font-semibold text-sm">
                                  {emp.prenom?.[0]}{emp.nom?.[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-[#0A2540]">{emp.prenom} {emp.nom}</p>
                                <p className="text-xs text-[#697586]">{emp.fonction}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{emp.departement}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              emp.statut === 'Actif' ? 'bg-[#E5F8F3] text-[#00C48C]' :
                              emp.statut === 'En congé' ? 'bg-[#FFF4E5] text-[#FA6400]' :
                              'bg-[#F5F5F5] text-[#8896A8]'
                            }>
                              {emp.statut}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-[#0A2540]">{calc.grossSalary.toLocaleString()} DJF</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              {hasModifications && (
                                <p className="text-xs text-[#697586] line-through">{calculatePayroll(emp, null, []).netSalary.toLocaleString()} DJF</p>
                              )}
                              <p className="font-bold text-[#0066FF]">{finalNet.toLocaleString()} DJF</p>
                              {hasModifications && (
                                <div className="flex items-center gap-1 mt-1">
                                  {cyclePrimes.length > 0 && <Badge className="text-xs bg-green-100 text-green-700">+{cyclePrimes.length} prime(s)</Badge>}
                                  {absences > 0 && <Badge className="text-xs bg-red-100 text-red-700">Absences</Badge>}
                                  {otherDeductions > 0 && <Badge className="text-xs bg-amber-100 text-amber-700">Déductions</Badge>}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedEmployeeDrawer(emp)}
                                className="border-[#D3DCE6]"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Détails
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-[#697586]">
                  Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} sur {filteredEmployees.length} employés
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-[#D3DCE6]"
                  >
                    Précédent
                  </Button>
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className={currentPage === i + 1 ? "bg-[#0066FF] text-white" : "border-[#D3DCE6]"}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-[#D3DCE6]"
                  >
                    Suivant
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[#E8ECF2]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedEmployees([]);
                    setEmployeeAbsences({});
                    setEmployeeOtherDeductions({});
                    setEmployeeAbsenceTiming({});
                    setEmployeeOtherDeductionTiming({});
                    setEmployeeCyclePrimes({});
                    setSearchQuery('');
                    setDepartmentFilter('all');
                    setStatusFilter('Actif');
                    setCurrentPage(1);
                  }}
                  className="border-[#D3DCE6]"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateCycle}
                  className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg"
                  disabled={!canCreate || createCycleMutation.isLoading || selectedEmployees.length === 0}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {createCycleMutation.isLoading ? 'Création...' : `Créer le cycle (${selectedEmployees.length} employés)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <AnimatePresence>
          {selectedEmployeeDrawer && (() => {
            const empId = selectedEmployeeDrawer.id;
            const absences = employeeAbsences[empId] || 0;
            const otherDeductions = employeeOtherDeductions[empId] || 0;
            const cyclePrimes = employeeCyclePrimes[empId] || [];
            const absenceAfterDeductions = employeeAbsenceTiming[empId] || false;
            const otherDeductionFromGross = employeeOtherDeductionTiming[empId] || false;
            const holidayStatus = getEmployeeHolidayStatus(empId, cycleData);
            let effectiveAbsencesForGross = 0;
            if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
            if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;
            const empForCalc = { ...selectedEmployeeDrawer, absences_amount: effectiveAbsencesForGross };
            const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);
            let netDeductions = 0;
            if (absenceAfterDeductions) netDeductions += absences;
            if (!otherDeductionFromGross) netDeductions += otherDeductions;
            const finalNet = calc.netSalary - netDeductions;
            const closeDrawer = (showToast = false) => {
              setSelectedEmployeeDrawer(null);
              setSelectedEmployeeForPrime(null);
              setPrimeType(''); setCustomPrimeName(''); setPrimeMontant(''); setAddAfterDeductions(false);
              if (showToast) toast.success('Modifications enregistrées!');
            };
            return (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-[980px] bg-[#F7F9FC] shadow-2xl z-50 flex flex-col"
              >
                {/* ── HEADER ── */}
                <div className="bg-white border-b border-[#E8ECF2] px-6 py-4 flex items-center gap-4 flex-shrink-0">
                  {selectedEmployeeDrawer.photo_url ? (
                    <img src={selectedEmployeeDrawer.photo_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-[#E8ECF2]" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                      {selectedEmployeeDrawer.prenom?.[0]}{selectedEmployeeDrawer.nom?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-[#0A2540] truncate">{selectedEmployeeDrawer.prenom} {selectedEmployeeDrawer.nom}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-[#697586]">{selectedEmployeeDrawer.fonction}</span>
                      {selectedEmployeeDrawer.departement && <Badge variant="outline" className="text-xs">{selectedEmployeeDrawer.departement}</Badge>}
                      <Badge className="text-xs bg-blue-100 text-blue-700 border-0">{selectedEmployeeDrawer.regime_cnss || 'Général'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-[#697586]">Matricule CNSS</p>
                      <p className="text-sm font-semibold text-[#0A2540]">{selectedEmployeeDrawer.matricule_cnss || '—'}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => closeDrawer(false)}><X className="w-5 h-5" /></Button>
                  </div>
                </div>

                {/* ── BODY: 2 columns ── */}
                <div className="flex-1 overflow-hidden flex gap-0">

                  {/* LEFT — Salary breakdown (scrollable) */}
                  <div className="flex-1 overflow-y-auto p-5 border-r border-[#E8ECF2]">
                    <h3 className="text-sm font-bold text-[#0A2540] uppercase tracking-wide mb-4">Fiche de Salaire</h3>

                    {holidayStatus && calc.holidayNote && (
                      <div className={`mb-4 p-3 rounded-lg border text-sm font-medium ${
                        calc.paidByCNSS ? 'bg-purple-50 border-purple-200 text-purple-800'
                        : calc.salaryPercentage === 0 ? 'bg-red-50 border-red-200 text-red-800'
                        : calc.salaryPercentage < 1 ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}>
                        {calc.holidayNote}
                        {calc.paidByCNSS && <p className="text-xs mt-1 font-normal">💡 La CNSS prend en charge le salaire complet</p>}
                      </div>
                    )}

                    {/* GAINS */}
                    <div className="bg-white rounded-xl border border-[#E8ECF2] overflow-hidden mb-3">
                      <div className="bg-green-50 px-4 py-2 border-b border-green-100">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Gains</p>
                      </div>
                      <div className="divide-y divide-[#F0F2F5]">
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-[#697586]">Salaire de Base</span>
                          <span className="font-semibold text-[#0A2540]">{calc.breakdown.salaire_base.toLocaleString()} DJF</span>
                        </div>
                        {calc.breakdown.prime_anciennete > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Prime d'Ancienneté</span><span className="font-medium text-green-600">+{calc.breakdown.prime_anciennete.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.prime_fonction > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Prime de Fonction</span><span className="font-medium text-green-600">+{calc.breakdown.prime_fonction.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.prime_logement > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Prime de Logement</span><span className="font-medium text-green-600">+{calc.breakdown.prime_logement.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.prime_transport > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Prime de Transport</span><span className="font-medium text-green-600">+{calc.breakdown.prime_transport.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.prime_sujetion > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Prime de Sujétion</span><span className="font-medium text-green-600">+{calc.breakdown.prime_sujetion.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.prime_rendement > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Prime de Rendement</span><span className="font-medium text-green-600">+{calc.breakdown.prime_rendement.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.autres_primes > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Autres Primes</span><span className="font-medium text-green-600">+{calc.breakdown.autres_primes.toLocaleString()} DJF</span></div>}
                        {calc.breakdown.primes_personnalisees > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Primes Personnalisées</span><span className="font-medium text-green-600">+{calc.breakdown.primes_personnalisees.toLocaleString()} DJF</span></div>}
                        {calc.primesBeforeDeductions.map((p, i) => (
                          <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-[#697586]">{p.nom} <span className="text-xs text-green-500">(cycle)</span></span>
                            <span className="font-medium text-green-600">+{p.montant.toLocaleString()} DJF</span>
                          </div>
                        ))}
                        {absences > 0 && !absenceAfterDeductions && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Absences (du brut)</span><span className="font-medium text-red-500">-{absences.toLocaleString()} DJF</span></div>}
                        {otherDeductions > 0 && otherDeductionFromGross && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Autres déductions (du brut)</span><span className="font-medium text-amber-600">-{otherDeductions.toLocaleString()} DJF</span></div>}
                        <div className="flex justify-between px-4 py-3 bg-slate-50 font-semibold text-sm">
                          <span className="text-[#0A2540]">Salaire Brut Ajusté</span>
                          <span className="text-[#0A2540]">{calc.grossSalary.toLocaleString()} DJF</span>
                        </div>
                      </div>
                    </div>

                    {/* DÉDUCTIONS */}
                    <div className="bg-white rounded-xl border border-[#E8ECF2] overflow-hidden mb-3">
                      <div className="bg-red-50 px-4 py-2 border-b border-red-100">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Déductions</p>
                      </div>
                      <div className="divide-y divide-[#F0F2F5]">
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <div>
                            <span className="text-[#697586]">CNSS Salariale</span>
                            <span className="ml-1 text-xs text-[#aaa]">({selectedEmployeeDrawer.regime_cnss || 'Général'})</span>
                          </div>
                          <span className="font-medium text-red-500">-{calc.cnssEmployee.total.toLocaleString()} DJF</span>
                        </div>
                        {calc.cnssEmployee.retraite > 0 && <div className="flex justify-between px-6 py-1.5 text-xs bg-red-50/40"><span className="text-[#aaa]">↳ Retraite</span><span className="text-red-400">{calc.cnssEmployee.retraite.toLocaleString()} DJF</span></div>}
                        {calc.cnssEmployee.amu > 0 && <div className="flex justify-between px-6 py-1.5 text-xs bg-red-50/40"><span className="text-[#aaa]">↳ AMU</span><span className="text-red-400">{calc.cnssEmployee.amu.toLocaleString()} DJF</span></div>}
                        <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">ITS</span><span className="font-medium text-red-500">-{calc.its.toLocaleString()} DJF</span></div>
                        {calc.aide > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">AIDE</span><span className="font-medium text-red-500">-{calc.aide.toLocaleString()} DJF</span></div>}
                        {calc.retcim > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">RetCim</span><span className="font-medium text-red-500">-{calc.retcim.toLocaleString()} DJF</span></div>}
                        {absences > 0 && absenceAfterDeductions && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Absences (après cotisations)</span><span className="font-medium text-red-500">-{absences.toLocaleString()} DJF</span></div>}
                        {otherDeductions > 0 && !otherDeductionFromGross && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">Autres déductions</span><span className="font-medium text-amber-600">-{otherDeductions.toLocaleString()} DJF</span></div>}
                        {calc.primesAfterDeductions.map((p, i) => (
                          <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-[#697586]">{p.nom} <span className="text-xs text-green-500">(après déduc.)</span></span>
                            <span className="font-medium text-green-600">+{p.montant.toLocaleString()} DJF</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* NET */}
                    <div className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] rounded-xl p-4 flex justify-between items-center mb-3">
                      <span className="text-white font-bold text-base">NET À PAYER</span>
                      <span className="text-white font-bold text-2xl">{finalNet.toLocaleString()} DJF</span>
                    </div>

                    {/* CHARGE PATRONALE */}
                    <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
                      <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Charge Patronale</p>
                      </div>
                      <div className="divide-y divide-[#F0F2F5]">
                        <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-[#697586]">CNSS Patronale</span><span className="font-medium text-orange-600">{calc.cnssEmployer.total.toLocaleString()} DJF</span></div>
                        <div className="flex justify-between px-4 py-3 bg-orange-50 font-semibold text-sm"><span className="text-orange-800">Coût Total Employeur</span><span className="text-orange-800">{calc.totalCost.toLocaleString()} DJF</span></div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Adjustments (scrollable) */}
                  <div className="w-[360px] flex-shrink-0 overflow-y-auto p-5 bg-white">
                    <h3 className="text-sm font-bold text-[#0A2540] uppercase tracking-wide mb-4">Ajustements du Cycle</h3>

                    {/* ADD PRIME */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center"><Plus className="w-4 h-4 text-white" /></div>
                        <h4 className="font-semibold text-[#0A2540] text-sm">Ajouter une Prime</h4>
                      </div>
                      <div className="space-y-2.5">
                        <Select
                          value={selectedEmployeeForPrime === empId ? primeType : ''}
                          onValueChange={(v) => { setSelectedEmployeeForPrime(empId); setPrimeType(v); }}
                        >
                          <SelectTrigger className="bg-white border-green-200 text-sm"><SelectValue placeholder="Type de prime..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Prime des heures supplémentaires">Heures supplémentaires</SelectItem>
                            <SelectItem value="Prime de fonction">Prime de fonction</SelectItem>
                            <SelectItem value="Prime de logement">Prime de logement</SelectItem>
                            <SelectItem value="Prime de transport">Prime de transport</SelectItem>
                            <SelectItem value="Prime de sujétion">Prime de sujétion</SelectItem>
                            <SelectItem value="Prime de rendement">Prime de rendement</SelectItem>
                            <SelectItem value="Autres primes">Autres primes</SelectItem>
                            <SelectItem value="custom">Personnalisée...</SelectItem>
                          </SelectContent>
                        </Select>
                        {selectedEmployeeForPrime === empId && primeType === 'custom' && (
                          <Input value={customPrimeName} onChange={(e) => setCustomPrimeName(e.target.value)} placeholder="Nom de la prime" className="bg-white border-green-200 text-sm" />
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="number" min="0" placeholder="Montant (DJF)"
                            value={selectedEmployeeForPrime === empId ? primeMontant : ''}
                            onChange={(e) => { setSelectedEmployeeForPrime(empId); setPrimeMontant(e.target.value); }}
                            className="bg-white border-green-200 text-sm"
                          />
                        </div>
                        <label className="flex items-start gap-2 p-2 bg-white rounded-lg border border-green-200 cursor-pointer">
                          <input type="checkbox"
                            checked={selectedEmployeeForPrime === empId ? addAfterDeductions : false}
                            onChange={(e) => { setSelectedEmployeeForPrime(empId); setAddAfterDeductions(e.target.checked); }}
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                          />
                          <span className="text-xs text-amber-800">Ajouter après cotisations (n'affecte pas CNSS/ITS)</span>
                        </label>
                        <Button
                          onClick={() => {
                            if (!primeMontant || parseFloat(primeMontant) <= 0) { toast.error('Montant invalide.'); return; }
                            const primeName = primeType === 'custom' ? customPrimeName : primeType;
                            if (!primeName) { toast.error('Veuillez nommer la prime.'); return; }
                            setEmployeeCyclePrimes(prev => ({ ...prev, [empId]: [...(prev[empId] || []), { nom: primeName, montant: parseFloat(primeMontant), add_after_deductions: addAfterDeductions }] }));
                            setPrimeType(''); setCustomPrimeName(''); setPrimeMontant(''); setAddAfterDeductions(false); setSelectedEmployeeForPrime(null);
                            toast.success('Prime ajoutée!');
                          }}
                          disabled={!primeType || !primeMontant || parseFloat(primeMontant) <= 0 || (primeType === 'custom' && !customPrimeName)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Ajouter la Prime
                        </Button>
                      </div>
                    </div>

                    {/* ABSENCES */}
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center"><Minus className="w-4 h-4 text-white" /></div>
                        <h4 className="font-semibold text-[#0A2540] text-sm">Absences</h4>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Input type="number" min="0" placeholder="0" value={employeeAbsences[empId] || ''} onChange={(e) => handleAbsencesChange(empId, e.target.value)} className="bg-white border-red-200 text-sm" />
                        <span className="text-sm text-[#697586] self-center whitespace-nowrap">DJF</span>
                      </div>
                      <label className="flex items-start gap-2 p-2 bg-white rounded-lg border border-red-200 cursor-pointer">
                        <input type="checkbox" checked={employeeAbsenceTiming[empId] || false} onChange={(e) => setEmployeeAbsenceTiming(prev => ({ ...prev, [empId]: e.target.checked }))} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-red-800">Déduire après cotisations (n'affecte pas CNSS/ITS)</span>
                      </label>
                    </div>

                    {/* OTHER DEDUCTIONS */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center"><Minus className="w-4 h-4 text-white" /></div>
                        <h4 className="font-semibold text-[#0A2540] text-sm">Autres Déductions</h4>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Input type="number" min="0" placeholder="0" value={employeeOtherDeductions[empId] || ''} onChange={(e) => handleOtherDeductionsChange(empId, e.target.value)} className="bg-white border-amber-200 text-sm" />
                        <span className="text-sm text-[#697586] self-center whitespace-nowrap">DJF</span>
                      </div>
                      <label className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                        <input type="checkbox" checked={employeeOtherDeductionTiming[empId] || false} onChange={(e) => setEmployeeOtherDeductionTiming(prev => ({ ...prev, [empId]: e.target.checked }))} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-amber-800">Déduire du brut (affecte CNSS/ITS)</span>
                      </label>
                    </div>

                    {/* CURRENT CYCLE PRIMES LIST */}
                    {cyclePrimes.length > 0 && (
                      <div className="bg-white border border-[#E8ECF2] rounded-xl overflow-hidden">
                        <div className="bg-[#F7F9FC] px-4 py-2 border-b border-[#E8ECF2]">
                          <p className="text-xs font-bold text-[#697586] uppercase tracking-wide">Primes du Cycle ({cyclePrimes.length})</p>
                        </div>
                        <div className="divide-y divide-[#F0F2F5]">
                          {cyclePrimes.map((prime, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#0A2540] truncate">{prime.nom}</p>
                                <p className="text-xs text-[#697586]">{prime.add_after_deductions ? 'après déductions' : 'affecte le brut'}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-sm font-semibold text-green-600 whitespace-nowrap">+{prime.montant.toLocaleString()}</span>
                                <button type="button" onClick={() => handleRemovePrime(empId, idx)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="bg-white border-t border-[#E8ECF2] px-6 py-4 flex gap-3 flex-shrink-0">
                  <Button variant="outline" onClick={() => closeDrawer(false)} className="flex-1 border-[#D3DCE6]">
                    <X className="w-4 h-4 mr-2" /> Fermer
                  </Button>
                  <Button onClick={() => closeDrawer(true)} className="flex-1 bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Enregistrer
                  </Button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    );
  }

  if (showPayrollList) {
    return (
      <PermissionGuard permission="payroll_view">
        <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-6"
            >
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPayrollList(false)}
                className="border-[#D3DCE6]"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-[#0A2540]">Bulletins de Paie</h1>
                <p className="text-[#697586] mt-1">
                  {filteredPayrollRecords.length} bulletin(s) trouvé(s)
                </p>
              </div>
            </motion.div>

            <Card className="border border-[#E8ECF2] mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-[#0066FF]" />
                  <h3 className="font-semibold text-[#0A2540]">Filtres</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Année</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger className="border-[#D3DCE6] mt-2">
                        <SelectValue placeholder="Toutes les années" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les années</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Mois</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger className="border-[#D3DCE6] mt-2">
                        <SelectValue placeholder="Tous les mois" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les mois</SelectItem>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>{monthNames[month]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Département</Label>
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="border-[#D3DCE6] mt-2">
                        <SelectValue placeholder="Tous les départements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les départements</SelectItem>
                        {availableDepartments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#E8ECF2] shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F9FC] border-b border-[#E8ECF2]">
                      <TableHead className="text-[#425466] font-semibold">Employé</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Période</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Salaire Brut</TableHead>
                      <TableHead className="text-[#425466] font-semibold">CNSS Sal.</TableHead>
                      <TableHead className="text-[#425466] font-semibold">CNSS Pat.</TableHead>
                      <TableHead className="text-[#425466] font-semibold">ITS</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Absences</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Autres Déduc.</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Salaire Net</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayrollRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-[#697586]">
                          Aucun bulletin trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayrollRecords.map((record) => (
                        <TableRow key={`${record.cycleId}-${record.employee.id}`} className="border-b border-[#E8ECF2] hover:bg-[#F7F9FC]">
                          <TableCell className="font-medium text-[#0A2540]">
                            <div>
                              <p className="font-semibold">{record.employee.prenom} {record.employee.nom}</p>
                              <p className="text-xs text-[#697586]">{record.employee.departement}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#697586]">{record.cyclePeriode}</TableCell>
                          <TableCell className="font-semibold text-[#0A2540]">{record.grossSalary.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#00C48C]">{record.cnssEmployee.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#FA6400]">{record.cnssEmployer.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#FA6400]">{record.its.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-red-500">
                            {record.absences > 0 ? `-${record.absences.toLocaleString()} DJF` : '-'}
                          </TableCell>
                          <TableCell className="text-amber-600">
                            {record.otherDeductions > 0 ? `-${record.otherDeductions.toLocaleString()} DJF` : '-'}
                          </TableCell>
                          <TableCell className="font-bold text-[#0066FF]">{record.netSalary.toLocaleString()} DJF</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEmailModalData({ employee: record.employee, cycle: record.cycle })}
                                className="border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1] hover:text-white"
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Email
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadPayslip(record.employee, record.cycle)}
                                className="border-[#D3DCE6]"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="payroll_view">
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon" className="border-[#D3DCE6]">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#0A2540]">Cycles de Paie</h1>
              <p className="text-[#697586] mt-1">Gérer les cycles de paie mensuels</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPayrollList(true)}
              className="border-[#0066FF] text-[#0066FF] hover:bg-[#F0F7FF]"
            >
              <FileText className="w-4 h-4 mr-2" />
              Bulletins de Paie
            </Button>
            {canCreate && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Cycle
              </Button>
            )}
          </motion.div>

          <div className="space-y-4">
            {cycles.map((cycle) => (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border border-[#E8ECF2] hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#0A2540] text-lg">{cycle.periode}</h3>
                          <p className="text-sm text-[#697586]">
                            {cycle.nombre_employes} employés • Paiement: {cycle.date_paiement ? format(new Date(cycle.date_paiement), 'dd/MM/yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#0066FF]">
                            {cycle.salaire_net_total?.toLocaleString()} DJF
                          </p>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            cycle.statut === 'Payé' ? 'bg-[#E5F8F3] text-[#00C48C]' : 'bg-[#FFF4E5] text-[#FA6400]'
                          }`}>
                            {cycle.statut}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setViewingCycle(cycle)}
                            className="border-[#D3DCE6]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {canProcess && cycle.statut !== 'Payé' && (
                            <Button
                              onClick={() => handlePayment(cycle)}
                              className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:shadow-lg"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Payer
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (confirm('Supprimer ce cycle?')) {
                                  deleteCycleMutation.mutate(cycle.id);
                                }
                              }}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {cycles.length === 0 && (
              <Card className="border border-[#E8ECF2]">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-[#D3DCE6] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#0A2540] mb-2">Aucun cycle de paie</h3>
                  <p className="text-[#697586] mb-6">Commencez par créer votre premier cycle de paie</p>
                  {canCreate && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un cycle
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {viewingCycle && (
            <Dialog open={!!viewingCycle} onOpenChange={() => setViewingCycle(null)}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Détails du Cycle - {viewingCycle.periode}</DialogTitle>
                </DialogHeader>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>Salaire Brut</TableHead>
                      <TableHead>CNSS Sal.</TableHead>
                      <TableHead>CNSS Pat.</TableHead>
                      <TableHead>ITS</TableHead>
                      <TableHead>Absences</TableHead>
                      <TableHead>Autres Déduc.</TableHead>
                      <TableHead>Primes</TableHead>
                      <TableHead>Salaire Net</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.filter(e => viewingCycle.employee_ids?.includes(e.id)).map(emp => {
                      const absences = viewingCycle.employee_absences?.[emp.id] || 0;
                      const otherDeductions = viewingCycle.employee_other_deductions?.[emp.id] || 0;
                      const cyclePrimes = viewingCycle.employee_cycle_primes?.[emp.id] || [];
                      const holidayStatus = viewingCycle.employee_holiday_status?.[emp.id] || null;
                      const absenceAfterDeductions = viewingCycle.employee_absence_timing?.[emp.id] || false;
                      const otherDeductionFromGross = viewingCycle.employee_other_deduction_timing?.[emp.id] || false;

                      let effectiveAbsencesForGross = 0;
                      if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
                      if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;

                      const empForCalc = { ...emp, absences_amount: effectiveAbsencesForGross };
                      const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);

                      let netDeductions = 0;
                      if (absenceAfterDeductions) netDeductions += absences;
                      if (!otherDeductionFromGross) netDeductions += otherDeductions;

                      const finalNetForEmployee = calc.netSalary - netDeductions;
                      const totalPrimes = cyclePrimes.reduce((sum, prime) => sum + prime.montant, 0);

                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.prenom} {emp.nom}</TableCell>
                          <TableCell>{calc.grossSalary.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#00C48C]">{calc.cnssEmployee.total.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#FA6400]">{calc.cnssEmployer.total.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#FA6400]">{calc.its.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-red-500">
                            {absences > 0 ? `-${absences.toLocaleString()} DJF` : '-'}
                          </TableCell>
                          <TableCell className="text-amber-600">
                            {otherDeductions > 0 ? `-${otherDeductions.toLocaleString()} DJF` : '-'}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {totalPrimes > 0 ? `+${totalPrimes.toLocaleString()} DJF` : '-'}
                          </TableCell>
                          <TableCell className="font-bold text-[#0066FF]">{finalNetForEmployee.toLocaleString()} DJF</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEmailModalData({ employee: emp, cycle: viewingCycle })}
                                className="border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1] hover:text-white"
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Email
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadPayslip(emp, viewingCycle)}
                                className="border-[#D3DCE6]"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {showPaymentGateway && selectedCycleForPayment && (
        <PaymentGateway
          isOpen={showPaymentGateway}
          onClose={() => {
            setShowPaymentGateway(false);
            setSelectedCycleForPayment(null);
          }}
          amount={selectedCycleForPayment.salaire_net_total}
          description={`Paie - ${selectedCycleForPayment.periode} (${selectedCycleForPayment.nombre_employes} employés)`}
          paymentType="payroll"
          entityId={selectedCycleForPayment.id}
          metadata={{
            periode: selectedCycleForPayment.periode,
            nombre_employes: selectedCycleForPayment.nombre_employes
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <SignatureDialog
        isOpen={signatureDialog.isOpen}
        onClose={() => setSignatureDialog({ isOpen: false, documentType: null, employee: null, cycle: null })}
        onConfirm={handleConfirmSignature}
        documentType={signatureDialog.documentType}
        defaultName={company[`signatory_${signatureDialog.documentType}_name`] || ''}
        defaultPosition={company[`signatory_${signatureDialog.documentType}_position`] || ''}
      />

      {emailModalData && (
        <PayslipEmailModal
          isOpen={!!emailModalData}
          employee={emailModalData.employee}
          cycle={emailModalData.cycle}
          company={company}
          onClose={() => setEmailModalData(null)}
        />
      )}
    </PermissionGuard>
  );
}