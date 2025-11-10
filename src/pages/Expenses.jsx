import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Upload, TrendingUp, TrendingDown, DollarSign, Calendar, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function Expenses() {
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    methode_paiement: 'Virement',
    statut: 'En attente',
    recurrent: false
  });
  const [categoryData, setCategoryData] = useState({
    actif: true
  });
  
  const queryClient = useQueryClient();
  
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date'),
  });
  
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => base44.entities.ExpenseCategory.list(),
  });
  
  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowForm(false);
      setFormData({
        methode_paiement: 'Virement',
        statut: 'En attente',
        recurrent: false
      });
      toast.success('Dépense créée');
    },
  });
  
  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.ExpenseCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-categories']);
      setShowCategoryForm(false);
      setCategoryData({ actif: true });
      toast.success('Catégorie créée');
    },
  });
  
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Dépense mise à jour');
    },
  });
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, facture_url: file_url });
      toast.success('Fichier téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Generate expense number
    const numero = `EXP-${format(new Date(), 'yyyyMM')}-${Math.floor(Math.random() * 10000)}`;
    createExpenseMutation.mutate({ ...formData, numero });
  };
  
  const handleCategorySubmit = (e) => {
    e.preventDefault();
    createCategoryMutation.mutate(categoryData);
  };
  
  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const categoryMatch = filterCategory === 'all' || exp.category_id === filterCategory;
    const statusMatch = filterStatus === 'all' || exp.statut === filterStatus;
    return categoryMatch && statusMatch;
  });
  
  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.montant || 0), 0);
  const approvedExpenses = filteredExpenses.filter(e => e.statut === 'Approuvé');
  const pendingExpenses = filteredExpenses.filter(e => e.statut === 'En attente');
  
  // Prepare chart data
  const chartData = categories.map(cat => ({
    name: cat.nom,
    value: filteredExpenses
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + (e.montant || 0), 0),
    color: cat.couleur || '#6366F1'
  })).filter(d => d.value > 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0F172A]">Gestion des Dépenses</h1>
            <p className="text-[#64748B] mt-1">Suivi des dépenses par catégorie</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCategoryForm(true)}
            className="border-[#6366F1] text-[#6366F1]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Catégorie
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Dépense
          </Button>
        </motion.div>
        
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Total</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{totalExpenses.toLocaleString()} DJF</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Approuvées</p>
                  <p className="text-2xl font-bold text-[#10B981] mt-1">{approvedExpenses.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#10B981]" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">En attente</p>
                  <p className="text-2xl font-bold text-[#F59E0B] mt-1">{pendingExpenses.length}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Catégories</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{categories.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-[#6366F1]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Chart and Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="border-0 shadow-lg h-full">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#0F172A] mb-4">Répartition</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()} DJF`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-[#64748B] py-20">Aucune dépense</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="font-bold text-[#0F172A]">Filtres</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Statut</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="En attente">En attente</SelectItem>
                        <SelectItem value="Approuvé">Approuvé</SelectItem>
                        <SelectItem value="Payé">Payé</SelectItem>
                        <SelectItem value="Rejeté">Rejeté</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {/* Expenses Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="font-bold text-[#0F172A]">Toutes les Dépenses</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="font-semibold">Numéro</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Catégorie</TableHead>
                    <TableHead className="font-semibold">Montant</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#64748B]">
                        Aucune dépense trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const category = categories.find(c => c.id === exp.category_id);
                      return (
                        <TableRow key={exp.id} className="hover:bg-[#F7F9FC]">
                          <TableCell className="font-mono text-sm">{exp.numero}</TableCell>
                          <TableCell className="font-medium">{exp.description}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: `${category?.couleur}20`, color: category?.couleur }}>
                              {category?.icone} {category?.nom}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold">{exp.montant?.toLocaleString()} DJF</TableCell>
                          <TableCell>{exp.date_transaction ? format(new Date(exp.date_transaction), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              exp.statut === 'Payé' ? 'bg-green-100 text-green-800' :
                              exp.statut === 'Approuvé' ? 'bg-blue-100 text-blue-800' :
                              exp.statut === 'Rejeté' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {exp.statut}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={exp.statut}
                              onValueChange={(value) => {
                                updateExpenseMutation.mutate({
                                  id: exp.id,
                                  data: { ...exp, statut: value }
                                });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="En attente">En attente</SelectItem>
                                <SelectItem value="Approuvé">Approuvé</SelectItem>
                                <SelectItem value="Payé">Payé</SelectItem>
                                <SelectItem value="Rejeté">Rejeté</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
        
        {/* New Expense Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle Dépense</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Catégorie *</Label>
                  <Select
                    value={formData.category_id || ''}
                    onValueChange={(value) => setFormData({...formData, category_id: value})}
                    required
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icone} {cat.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-2"
                    required
                  />
                </div>
                
                <div>
                  <Label>Montant (DJF) *</Label>
                  <Input
                    type="number"
                    value={formData.montant || ''}
                    onChange={(e) => setFormData({...formData, montant: parseFloat(e.target.value)})}
                    className="mt-2"
                    required
                  />
                </div>
                
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date_transaction || ''}
                    onChange={(e) => setFormData({...formData, date_transaction: e.target.value})}
                    className="mt-2"
                    required
                  />
                </div>
                
                <div>
                  <Label>Fournisseur</Label>
                  <Input
                    value={formData.fournisseur || ''}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Méthode de paiement</Label>
                  <Select
                    value={formData.methode_paiement}
                    onValueChange={(value) => setFormData({...formData, methode_paiement: value})}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Virement">Virement</SelectItem>
                      <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label>Facture/Reçu</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* New Category Dialog */}
        <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle Catégorie</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={categoryData.nom || ''}
                  onChange={(e) => setCategoryData({...categoryData, nom: e.target.value})}
                  className="mt-2"
                  required
                />
              </div>
              
              <div>
                <Label>Code *</Label>
                <Input
                  value={categoryData.code || ''}
                  onChange={(e) => setCategoryData({...categoryData, code: e.target.value})}
                  className="mt-2"
                  placeholder="Ex: SAL, ADM"
                  required
                />
              </div>
              
              <div>
                <Label>Icône (Emoji)</Label>
                <Input
                  value={categoryData.icone || ''}
                  onChange={(e) => setCategoryData({...categoryData, icone: e.target.value})}
                  className="mt-2"
                  placeholder="Ex: 💼"
                />
              </div>
              
              <div>
                <Label>Couleur</Label>
                <Input
                  type="color"
                  value={categoryData.couleur || '#6366F1'}
                  onChange={(e) => setCategoryData({...categoryData, couleur: e.target.value})}
                  className="mt-2"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCategoryForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}