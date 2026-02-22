import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, Download, Filter, TrendingUp, TrendingDown, DollarSign, FileText, X, Paperclip, Eye, Trash2, Edit2, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TransactionWizard from '../components/transactions/TransactionWizard';
import BulkUpload from '../components/transactions/BulkUpload';
import TransactionDetailDrawer from '../components/transactions/TransactionDetailDrawer';
import TransactionReports from '../components/transactions/TransactionReports';

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [filters, setFilters] = useState({
    period: 'all',
    category: 'all',
    department: 'all',
    paymentMethod: 'all',
    source: 'all',
    searchQuery: ''
  });

  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => meras.entities.Employee.list(),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
  });

  const { data: deptEntities = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => meras.entities.Department.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => meras.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setShowForm(false);
      toast.success('Transaction créée avec succès');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => meras.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setEditingTransaction(null);
      setSelectedTransaction(null);
      toast.success('Transaction mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => meras.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setSelectedTransaction(null);
      toast.success('Transaction supprimée');
    },
  });

  // Get unique values for filters
  const departments = [...new Set([
    ...employees.map(e => e.departement).filter(Boolean),
    ...deptEntities.map(d => d.name).filter(Boolean),
    ...transactions.map(t => t.department).filter(Boolean),
  ])];
  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

  // Apply filters
  const filteredTransactions = transactions.filter(transaction => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'income' && transaction.type === 'Revenu') ||
      (activeTab === 'expense' && transaction.type === 'Dépense');

    const matchesSearch = !filters.searchQuery || 
      transaction.description?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      transaction.contact_name?.toLowerCase().includes(filters.searchQuery.toLowerCase());

    const matchesCategory = filters.category === 'all' || transaction.category === filters.category;
    const matchesDepartment = filters.department === 'all' || transaction.department === filters.department;
    const matchesPayment = filters.paymentMethod === 'all' || transaction.payment_method === filters.paymentMethod;
    const matchesSource = filters.source === 'all' || transaction.source === filters.source;

    let matchesPeriod = true;
    if (filters.period !== 'all' && transaction.date) {
      const transactionDate = new Date(transaction.date);
      const today = new Date();
      
      if (filters.period === 'today') {
        matchesPeriod = format(transactionDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      } else if (filters.period === 'week') {
        matchesPeriod = transactionDate >= startOfWeek(today) && transactionDate <= endOfWeek(today);
      } else if (filters.period === 'month') {
        matchesPeriod = transactionDate >= startOfMonth(today) && transactionDate <= endOfMonth(today);
      } else if (filters.period === 'year') {
        matchesPeriod = transactionDate >= startOfYear(today) && transactionDate <= endOfYear(today);
      }
    }

    return matchesTab && matchesSearch && matchesCategory && matchesDepartment && matchesPayment && matchesPeriod && matchesSource;
  });

  // Calculate totals
  const stats = {
    totalIncome: filteredTransactions.filter(t => t.type === 'Revenu').reduce((sum, t) => sum + (t.amount || 0), 0),
    totalExpenses: filteredTransactions.filter(t => t.type === 'Dépense').reduce((sum, t) => sum + (t.amount || 0), 0),
  };
  stats.netProfit = stats.totalIncome - stats.totalExpenses;

  if (showReports) {
    return <TransactionReports onClose={() => setShowReports(false)} transactions={transactions} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto">
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
            <h1 className="text-3xl font-bold text-[#0A2540]">Gestion des Transactions</h1>
            <p className="text-[#697586] mt-1">Suivi complet des revenus et dépenses</p>
          </div>
          <Button onClick={() => setShowReports(true)} variant="outline" className="border-[#0066FF] text-[#0066FF]">
            <FileText className="w-4 h-4 mr-2" />
            Rapports
          </Button>
          <Button onClick={() => setShowBulkUpload(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Transaction
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Total Revenus</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalIncome.toLocaleString()} DJF</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Total Dépenses</p>
                    <p className="text-2xl font-bold text-red-600">{stats.totalExpenses.toLocaleString()} DJF</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stats.netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center`}>
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Profit Net</p>
                    <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {stats.netProfit.toLocaleString()} DJF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-[#0066FF]" />
              <h3 className="font-semibold text-[#0A2540]">Filtres</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Rechercher..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              />
              <Select value={filters.period} onValueChange={(value) => setFilters({...filters, period: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous départements</SelectItem>
                  {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.paymentMethod} onValueChange={(value) => setFilters({...filters, paymentMethod: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes méthodes</SelectItem>
                  <SelectItem value="Espèces">Espèces</SelectItem>
                  <SelectItem value="Chèque">Chèque</SelectItem>
                  <SelectItem value="Virement">Virement</SelectItem>
                  <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">Toutes ({transactions.length})</TabsTrigger>
                <TabsTrigger value="income">
                  Revenus ({transactions.filter(t => t.type === 'Revenu').length})
                </TabsTrigger>
                <TabsTrigger value="expense">
                  Dépenses ({transactions.filter(t => t.type === 'Dépense').length})
                </TabsTrigger>
              </TabsList>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8ECF2]">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Description</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Contact</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Montant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Catégorie</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Département</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Paiement</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-[#697586]">
                          Aucune transaction trouvée
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(transaction => (
                        <tr key={transaction.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                          <td className="py-4 px-4 text-sm text-[#475569]">
                            {transaction.date && format(new Date(transaction.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#0A2540]">{transaction.description}</span>
                              {transaction.attachments?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Paperclip className="w-3 h-3 mr-1" />
                                  {transaction.attachments.length}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-[#475569]">
                            {transaction.contact_name || '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`font-bold ${transaction.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'Revenu' ? '+' : '-'}{transaction.amount?.toLocaleString()} DJF
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={transaction.type === 'Revenu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {transaction.type}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-[#475569]">{transaction.category || '-'}</td>
                          <td className="py-4 px-4 text-sm text-[#475569]">{transaction.department || '-'}</td>
                          <td className="py-4 px-4 text-sm text-[#475569]">{transaction.payment_method || '-'}</td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedTransaction(transaction)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Wizard Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🧙‍♂️ Assistant de Création de Transaction</DialogTitle>
          </DialogHeader>
          <TransactionWizard
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import en Masse</DialogTitle>
          </DialogHeader>
          <BulkUpload onClose={() => setShowBulkUpload(false)} />
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onUpdate={(data) => updateMutation.mutate({ id: selectedTransaction.id, data })}
        onDelete={(id) => {
          if (confirm('Supprimer cette transaction?')) {
            deleteMutation.mutate(id);
          }
        }}
        departments={departments}
        categories={categories}
        budgets={budgets}
      />
    </div>
  );
}