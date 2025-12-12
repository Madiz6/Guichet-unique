import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, TrendingUp, TrendingDown, DollarSign, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export default function RapportsFinanciers() {
  const [periodType, setPeriodType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date'),
  });

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const txnDate = new Date(t.date);
      
      if (periodType === 'month') {
        const [year, month] = selectedMonth.split('-');
        return txnDate.getFullYear() === parseInt(year) && 
               txnDate.getMonth() === parseInt(month) - 1;
      } else if (periodType === 'year') {
        return txnDate.getFullYear() === parseInt(selectedYear);
      }
      return true;
    });
  };

  const filteredTxns = getFilteredTransactions();

  // Compte de Résultat (Income Statement)
  const revenues = filteredTxns
    .filter(t => t.type === 'Revenu')
    .reduce((sum, t) => sum + (t.total_amount || t.amount), 0);

  const expensesByCategory = {};
  filteredTxns
    .filter(t => t.type === 'Dépense')
    .forEach(t => {
      const cat = t.category || 'Non catégorisé';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (t.total_amount || t.amount);
    });

  const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
  const netProfit = revenues - totalExpenses;

  // État des Flux de Trésorerie (Cash Flow Statement)
  const cashFlowByMonth = {};
  filteredTxns.forEach(t => {
    const monthKey = format(new Date(t.date), 'yyyy-MM');
    if (!cashFlowByMonth[monthKey]) {
      cashFlowByMonth[monthKey] = { inflow: 0, outflow: 0 };
    }
    if (t.type === 'Revenu') {
      cashFlowByMonth[monthKey].inflow += (t.total_amount || t.amount);
    } else {
      cashFlowByMonth[monthKey].outflow += (t.total_amount || t.amount);
    }
  });

  // Dépenses par département
  const expensesByDepartment = {};
  filteredTxns
    .filter(t => t.type === 'Dépense' && t.department)
    .forEach(t => {
      const dept = t.department;
      expensesByDepartment[dept] = (expensesByDepartment[dept] || 0) + (t.total_amount || t.amount);
    });

  const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);

  return (
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
            <h1 className="text-3xl font-bold text-[#0A2540]">Rapports Financiers</h1>
            <p className="text-[#697586] mt-1">Comptabilité conforme aux normes de Djibouti</p>
          </div>
          <Button variant="outline" className="border-[#0066FF] text-[#0066FF]">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
        </motion.div>

        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Par mois</SelectItem>
                  <SelectItem value="year">Par année</SelectItem>
                  <SelectItem value="all">Toutes périodes</SelectItem>
                </SelectContent>
              </Select>

              {periodType === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-[#D3DCE6] rounded-lg px-4 py-2"
                />
              )}

              {periodType === 'year' && (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Revenus Totaux</p>
                  <p className="text-2xl font-bold text-green-600">{revenues.toLocaleString()} DJF</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Dépenses Totales</p>
                  <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} DJF</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center`}>
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Résultat Net</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {netProfit.toLocaleString()} DJF
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="income" className="space-y-6">
          <TabsList className="bg-white border border-[#E8ECF2]">
            <TabsTrigger value="income">Compte de Résultat</TabsTrigger>
            <TabsTrigger value="cashflow">Flux de Trésorerie</TabsTrigger>
            <TabsTrigger value="expenses">Analyse des Dépenses</TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#0A2540] mb-6">Compte de Résultat</h3>
                
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-[#0A2540]">Produits d'Exploitation (Revenus)</p>
                      <p className="text-xl font-bold text-green-600">{revenues.toLocaleString()} DJF</p>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-semibold text-[#0A2540]">Charges d'Exploitation (Dépenses)</p>
                      <p className="text-xl font-bold text-red-600">{totalExpenses.toLocaleString()} DJF</p>
                    </div>
                    
                    <div className="border-t border-red-200 pt-3 space-y-2">
                      {Object.entries(expensesByCategory).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between text-sm">
                          <span className="text-[#697586]">{cat}</span>
                          <span className="font-medium text-[#0A2540]">{amount.toLocaleString()} DJF</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'} p-4 rounded-lg border-2 ${netProfit >= 0 ? 'border-blue-200' : 'border-orange-200'}`}>
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-[#0A2540]">Résultat Net (Bénéfice/Perte)</p>
                      <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} DJF
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflow">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#0A2540] mb-6">État des Flux de Trésorerie</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F9FC]">
                      <TableHead>Période</TableHead>
                      <TableHead className="text-right">Entrées</TableHead>
                      <TableHead className="text-right">Sorties</TableHead>
                      <TableHead className="text-right">Flux Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(cashFlowByMonth)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([month, data]) => {
                        const netFlow = data.inflow - data.outflow;
                        return (
                          <TableRow key={month}>
                            <TableCell className="font-medium">
                              {format(new Date(month + '-01'), 'MMMM yyyy')}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              +{data.inflow.toLocaleString()} DJF
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">
                              -{data.outflow.toLocaleString()} DJF
                            </TableCell>
                            <TableCell className={`text-right font-bold ${netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {netFlow >= 0 ? '+' : ''}{netFlow.toLocaleString()} DJF
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-[#0A2540] mb-6">Dépenses par Catégorie</h3>
                  
                  <div className="space-y-3">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amount]) => {
                        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                        return (
                          <div key={cat} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[#0A2540]">{cat}</span>
                              <span className="text-[#697586]">{percentage}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-red-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-right text-sm font-semibold text-[#0A2540]">
                              {amount.toLocaleString()} DJF
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-[#0A2540] mb-6">Dépenses par Département</h3>
                  
                  <div className="space-y-3">
                    {Object.entries(expensesByDepartment)
                      .sort(([, a], [, b]) => b - a)
                      .map(([dept, amount]) => {
                        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                        return (
                          <div key={dept} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[#0A2540]">{dept}</span>
                              <span className="text-[#697586]">{percentage}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-right text-sm font-semibold text-[#0A2540]">
                              {amount.toLocaleString()} DJF
                            </p>
                          </div>
                        );
                      })}
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