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
import { Plus, Upload, Download, Filter, TrendingUp, TrendingDown, DollarSign, FileText, X, Paperclip, Eye, Trash2, Edit2, Calendar as CalendarIcon, ArrowLeft, BookOpen, CheckCircle, Clock, Cpu, CheckSquare, Square } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TransactionWizard from '../components/transactions/TransactionWizard';
import BulkUpload from '../components/transactions/BulkUpload';
import TransactionDetailDrawer from '../components/transactions/TransactionDetailDrawer';
import TransactionReports from '../components/transactions/TransactionReports';
import AIAnomalyDetector from '../components/ai/AIAnomalyDetector';
import AdvancedFilters, { DEFAULT_FILTERS } from '../components/transactions/AdvancedFilters';
import BulkEditBar from '../components/transactions/BulkEditBar';

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedTransactionTab, setSelectedTransactionTab] = useState('payment');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState([]);

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
    onSuccess: (updatedRecord, variables) => {
      // Merge updated fields into selectedTransaction immediately so the drawer reflects changes at once
      setSelectedTransaction(prev => prev?.id === variables.id ? { ...prev, ...variables.data } : prev);
      setEditingTransaction(null);
      // Refetch the list so the table row and stats cards update
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

  // Apply advanced filters
  const filteredTransactions = transactions.filter(t => {
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'income' && t.type === 'Revenu') ||
      (activeTab === 'expense' && t.type === 'Dépense');

    const q = filters.searchQuery?.toLowerCase();
    const matchesSearch = !q ||
      t.description?.toLowerCase().includes(q) ||
      t.contact_name?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q);

    const matchesCategory = filters.category === 'all' || t.category === filters.category;
    const matchesDepartment = filters.department === 'all' || t.department === filters.department;
    const matchesPayment = filters.paymentMethod === 'all' || t.payment_method === filters.paymentMethod;
    const matchesSource = filters.source === 'all' || t.source === filters.source;
    const matchesBooking = filters.bookingStatus === 'all' ||
      (filters.bookingStatus === 'booked' && t.booking_status) ||
      (filters.bookingStatus === 'unbooked' && !t.booking_status);
    const matchesStatus = filters.status === 'all' || t.status === filters.status;

    let matchesDate = true;
    if (filters.dateFrom && t.date) matchesDate = matchesDate && new Date(t.date) >= new Date(filters.dateFrom);
    if (filters.dateTo && t.date) matchesDate = matchesDate && new Date(t.date) <= new Date(filters.dateTo);

    let matchesAmount = true;
    if (filters.amountMin !== '') matchesAmount = matchesAmount && (t.amount || 0) >= parseFloat(filters.amountMin);
    if (filters.amountMax !== '') matchesAmount = matchesAmount && (t.amount || 0) <= parseFloat(filters.amountMax);

    return matchesTab && matchesSearch && matchesCategory && matchesDepartment && matchesPayment && matchesSource && matchesBooking && matchesStatus && matchesDate && matchesAmount;
  });

  // Bulk edit handler
  const handleBulkEdit = (ids, action, value) => {
    const fieldMap = { status: 'status', category: 'category', department: 'department', payment_method: 'payment_method' };
    const field = fieldMap[action];
    if (!field) return;
    Promise.all(ids.map(id => updateMutation.mutateAsync({ id, data: { [field]: value } })))
      .then(() => { setSelectedIds([]); toast.success(`${ids.length} transaction(s) mise(s) à jour`); })
      .catch(() => toast.error('Erreur lors de la mise à jour'));
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === filteredTransactions.length ? [] : filteredTransactions.map(t => t.id));

  // Calculate totals
  const DEBT_OPERATION_TYPES = ['Dette fournisseur', 'Dette fournisseur réglée', 'Dette employé', 'Dette partenaire', 'Dette banque', 'Dette investisseur'];
  const openDebts = transactions.filter(t =>
    (t.is_dette || DEBT_OPERATION_TYPES.includes(t.operation_type)) &&
    t.booking_status === 'booked' &&
    !t.payment_registered &&
    !t.linked_settlement_id
  );

  const stats = {
    totalIncome: filteredTransactions.filter(t => t.type === 'Revenu').reduce((sum, t) => sum + (t.amount || 0), 0),
    totalExpenses: filteredTransactions.filter(t => t.type === 'Dépense').reduce((sum, t) => sum + (t.amount || 0), 0),
    booked: transactions.filter(t => t.booking_status === 'booked').length,
    toBook: transactions.filter(t => t.booking_status !== 'booked').length,
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
          <Link to={createPageUrl('FinancialForecasting')}>
            <Button variant="outline" className="border-purple-500 text-purple-700">
              <Cpu className="w-4 h-4 mr-2" />
              Prévisions IA
            </Button>
          </Link>
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

        {/* AI Anomaly Detector */}
        <AIAnomalyDetector transactions={transactions} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Comptabilisation</p>
                    <p className="text-lg font-bold text-[#0A2540]">
                      <span className="text-green-600">{stats.booked}</span>
                      <span className="text-gray-400 text-sm font-normal mx-1">/</span>
                      <span className="text-amber-600">{stats.toBook} à traiter</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Advanced Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-5">
            <AdvancedFilters filters={filters} setFilters={setFilters} categories={categories} departments={departments} />
          </CardContent>
        </Card>

        {/* Bulk Edit Bar */}
        {selectedIds.length > 0 && (
          <BulkEditBar
            selectedIds={selectedIds}
            onApply={handleBulkEdit}
            onClear={() => setSelectedIds([])}
            categories={categories}
            departments={departments}
          />
        )}

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
                      <th className="py-3 px-3">
                        <button onClick={toggleSelectAll} className="text-[#64748B] hover:text-[#0066FF]">
                          {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0
                            ? <CheckSquare className="w-4 h-4 text-[#0066FF]" />
                            : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Description</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Contact</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Montant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Catégorie</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Département</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Paiement</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Budget</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748B] uppercase">Comptabilisation</th>
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
                        <tr key={transaction.id} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] ${selectedIds.includes(transaction.id) ? 'bg-blue-50/40' : transaction.booking_status === 'booked' ? 'bg-green-50/40' : ''}`}>
                          <td className="py-4 px-3">
                            <button onClick={() => toggleSelect(transaction.id)} className="text-[#64748B] hover:text-[#0066FF]">
                              {selectedIds.includes(transaction.id)
                                ? <CheckSquare className="w-4 h-4 text-[#0066FF]" />
                                : <Square className="w-4 h-4" />}
                            </button>
                          </td>
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
                          <td className="py-4 px-4 text-sm">
                            {transaction.budget_id ? (
                              <Badge variant="outline" className="text-xs">
                                {budgets.find(b => b.id === transaction.budget_id)?.department_name || 'Budget lié'}
                              </Badge>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {transaction.booking_status ? (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-green-700 font-medium">Comptabilisé</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setSelectedTransaction(transaction); setSelectedTransactionTab('booking'); }}
                                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium"
                              >
                                <Clock className="w-4 h-4" />
                                À comptabiliser
                              </button>
                            )}
                          </td>
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
        initialTab={selectedTransactionTab}
        onClose={() => { setSelectedTransaction(null); setSelectedTransactionTab('payment'); }}
        onSave={(id, data) => updateMutation.mutate({ id, data })}
        onTransactionUpdated={(updatedRecord) => {
          setSelectedTransaction(updatedRecord);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }}
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