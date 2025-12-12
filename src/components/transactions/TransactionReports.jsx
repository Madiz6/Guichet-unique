import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export default function TransactionReports({ onClose, transactions }) {
  const [period, setPeriod] = useState('month');
  const [groupBy, setGroupBy] = useState('category');

  // Filter by period
  const filteredTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const date = new Date(t.date);
    const now = new Date();
    
    if (period === 'month') {
      return date >= startOfMonth(now) && date <= endOfMonth(now);
    } else if (period === 'year') {
      return date >= startOfYear(now) && date <= endOfYear(now);
    }
    return true;
  });

  // Calculate totals
  const totalIncome = filteredTransactions.filter(t => t.type === 'Revenu').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'Dépense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  // Group by category or department
  const groupedData = {};
  filteredTransactions.forEach(t => {
    const key = groupBy === 'category' ? (t.category || 'Non catégorisé') : (t.department || 'Aucun département');
    if (!groupedData[key]) {
      groupedData[key] = { income: 0, expenses: 0 };
    }
    if (t.type === 'Revenu') {
      groupedData[key].income += t.amount || 0;
    } else {
      groupedData[key].expenses += t.amount || 0;
    }
  });

  const barChartData = Object.entries(groupedData).map(([name, data]) => ({
    name,
    Revenus: data.income,
    Dépenses: data.expenses,
    Profit: data.income - data.expenses
  }));

  const pieChartData = Object.entries(groupedData).map(([name, data]) => ({
    name,
    value: data.expenses
  }));

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316', '#14B8A6'];

  const handleExport = () => {
    const csv = [
      ['Date', 'Description', 'Montant', 'Type', 'Catégorie', 'Département', 'Méthode'].join(','),
      ...filteredTransactions.map(t => [
        t.date,
        t.description,
        t.amount,
        t.type,
        t.category || '',
        t.department || '',
        t.payment_method || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button variant="outline" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Rapports & Analyses</h1>
            <p className="text-[#697586] mt-1">Vue d'ensemble des transactions</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </motion.div>

        {/* Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Par catégorie</SelectItem>
                  <SelectItem value="department">Par département</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Total Revenus</p>
                  <p className="text-2xl font-bold text-green-600">{totalIncome.toLocaleString()} DJF</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Total Dépenses</p>
                  <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} DJF</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center`}>
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Profit Net</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {netProfit.toLocaleString()} DJF
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#0A2540] mb-4">
                Revenus vs Dépenses {groupBy === 'category' ? 'par Catégorie' : 'par Département'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Revenus" fill="#10B981" />
                  <Bar dataKey="Dépenses" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#0A2540] mb-4">
                Distribution des Dépenses
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}