import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Download, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { calculatePayroll } from "../components/payroll/SalaryCalculator";

export default function Payroll() {
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const queryClient = useQueryClient();
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ status: 'active' }),
  });
  
  const { data: payrollRecords = [] } = useQuery({
    queryKey: ['payroll-records', selectedMonth],
    queryFn: () => base44.entities.PayrollRecord.filter({ month: selectedMonth }),
  });
  
  const createPayrollMutation = useMutation({
    mutationFn: (records) => base44.entities.PayrollRecord.bulkCreate(records),
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll-records']);
      setProcessing(false);
    },
  });
  
  const processPayroll = async () => {
    setProcessing(true);
    
    const records = employees.map(emp => {
      const calc = calculatePayroll(emp);
      return {
        employee_id: emp.id,
        month: selectedMonth,
        gross_salary: calc.grossSalary,
        cnss_employee: calc.cnssEmployee,
        cnss_employer: calc.cnssEmployer,
        its_amount: calc.its,
        net_salary: calc.netSalary,
        payment_status: 'pending'
      };
    });
    
    createPayrollMutation.mutate(records);
  };
  
  const exportToCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Gross Salary', 'CNSS Employee', 'CNSS Employer', 'ITS', 'Net Salary'];
    
    const rows = employees.map(emp => {
      const calc = calculatePayroll(emp);
      return [
        emp.matricule,
        emp.full_name,
        calc.grossSalary,
        calc.cnssEmployee,
        calc.cnssEmployer,
        calc.its,
        calc.netSalary
      ];
    });
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
  };
  
  const totalNetSalary = employees.reduce((sum, emp) => {
    const calc = calculatePayroll(emp);
    return sum + calc.netSalary;
  }, 0);
  
  const totalCNSS = employees.reduce((sum, emp) => {
    const calc = calculatePayroll(emp);
    return sum + calc.cnssEmployee + calc.cnssEmployer;
  }, 0);
  
  const totalITS = employees.reduce((sum, emp) => {
    const calc = calculatePayroll(emp);
    return sum + calc.its;
  }, 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Payroll Processing</h1>
            <p className="text-slate-600">Review and process monthly payroll</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Total Net Payroll</p>
              <p className="text-2xl font-bold text-slate-900">{totalNetSalary.toLocaleString()} DJF</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Total CNSS</p>
              <p className="text-2xl font-bold text-blue-600">{totalCNSS.toLocaleString()} DJF</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Total ITS</p>
              <p className="text-2xl font-bold text-amber-600">{totalITS.toLocaleString()} DJF</p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle>Payroll for {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-3">
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  onClick={processPayroll} 
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {processing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Process Payroll
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>CNSS (Emp)</TableHead>
                    <TableHead>CNSS (Empr)</TableHead>
                    <TableHead>ITS</TableHead>
                    <TableHead>Net Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No active employees
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => {
                      const calc = calculatePayroll(emp);
                      return (
                        <TableRow key={emp.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{emp.full_name}</p>
                              <p className="text-sm text-slate-500">{emp.job_title}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{emp.matricule}</TableCell>
                          <TableCell className="text-sm">
                            {emp.employment_type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {calc.grossSalary.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {calc.cnssEmployee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {calc.cnssEmployer.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-amber-600">
                            {calc.its.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            {calc.netSalary.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}