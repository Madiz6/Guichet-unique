import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { ENHANCED_CATEGORIES } from '../financials/AccountingCategoryMaster';

export default function BudgetPlanningForm({ isOpen, onClose, departments, editBudget = null }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState(editBudget || {
    fiscal_year: (currentYear + 1).toString(),
    budget_type: 'Département',
    department_id: '',
    department_name: '',
    category: '',
    period: 'Annuel',
    period_start: `${currentYear + 1}-01-01`,
    period_end: `${currentYear + 1}-12-31`,
    amount_allocated: '',
    alert_threshold_percentage: 80,
    alert_emails: [],
    categories_allowed: [],
    spending_limit_per_transaction: '',
    requires_approval_above: 0,
    status: 'Actif',
    notes: ''
  });

  const [emailInput, setEmailInput] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => editBudget 
      ? meras.entities.Budget.update(editBudget.id, data)
      : meras.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(editBudget ? 'Budget mis à jour' : 'Budget créé avec succès');
      onClose();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.budget_type === 'Département' && !formData.department_id) {
      toast.error('Veuillez sélectionner un département');
      return;
    }
    
    if (formData.budget_type === 'Catégorie' && !formData.category) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }

    const submitData = {
      ...formData,
      amount_allocated: parseFloat(formData.amount_allocated),
      spending_limit_per_transaction: formData.spending_limit_per_transaction ? parseFloat(formData.spending_limit_per_transaction) : null,
      requires_approval_above: parseFloat(formData.requires_approval_above || 0),
      alert_threshold_percentage: parseFloat(formData.alert_threshold_percentage),
      amount_available: parseFloat(formData.amount_allocated)
    };

    if (formData.budget_type === 'Département') {
      const dept = departments.find(d => d.id === formData.department_id);
      submitData.department_name = dept?.name || '';
    }

    createMutation.mutate(submitData);
  };

  const addEmail = () => {
    if (emailInput && emailInput.includes('@')) {
      setFormData({
        ...formData,
        alert_emails: [...(formData.alert_emails || []), emailInput]
      });
      setEmailInput('');
    }
  };

  const removeEmail = (email) => {
    setFormData({
      ...formData,
      alert_emails: formData.alert_emails.filter(e => e !== email)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editBudget ? 'Modifier le Budget' : 'Créer un Nouveau Budget'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fiscal Year & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Année Fiscale *</Label>
              <Input
                type="text"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({...formData, fiscal_year: e.target.value})}
                placeholder="2025"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Type de Budget *</Label>
              <Select 
                value={formData.budget_type} 
                onValueChange={(v) => setFormData({...formData, budget_type: v, department_id: '', category: ''})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Département">Par Département</SelectItem>
                  <SelectItem value="Catégorie">Par Catégorie Comptable</SelectItem>
                  <SelectItem value="Global">Budget Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department or Category Selection */}
          {formData.budget_type === 'Département' && (
            <div>
              <Label>Département *</Label>
              <Select 
                value={formData.department_id} 
                onValueChange={(v) => setFormData({...formData, department_id: v})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un département" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.budget_type === 'Catégorie' && (
            <div>
              <Label>Catégorie Comptable *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({...formData, category: v})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <div className="px-2 py-1.5 text-xs font-bold text-gray-500">DÉPENSES</div>
                  {ENHANCED_CATEGORIES.DEPENSES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">REVENUS</div>
                  {ENHANCED_CATEGORIES.REVENUS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Période *</Label>
              <Select value={formData.period} onValueChange={(v) => setFormData({...formData, period: v})}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensuel">Mensuel</SelectItem>
                  <SelectItem value="Trimestriel">Trimestriel</SelectItem>
                  <SelectItem value="Annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Début *</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Date Fin *</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                className="mt-2"
                required
              />
            </div>
          </div>

          {/* Budget Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant Alloué (DJF) *</Label>
              <Input
                type="number"
                value={formData.amount_allocated}
                onChange={(e) => setFormData({...formData, amount_allocated: e.target.value})}
                placeholder="1000000"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Limite par Transaction (DJF)</Label>
              <Input
                type="number"
                value={formData.spending_limit_per_transaction}
                onChange={(e) => setFormData({...formData, spending_limit_per_transaction: e.target.value})}
                placeholder="100000"
                className="mt-2"
              />
            </div>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Seuil d'Alerte (%)</Label>
              <Input
                type="number"
                value={formData.alert_threshold_percentage}
                onChange={(e) => setFormData({...formData, alert_threshold_percentage: e.target.value})}
                placeholder="80"
                className="mt-2"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Alerte envoyée à ce % du budget</p>
            </div>

            <div>
              <Label>Approbation Requise Au-Dessus (DJF)</Label>
              <Input
                type="number"
                value={formData.requires_approval_above}
                onChange={(e) => setFormData({...formData, requires_approval_above: e.target.value})}
                placeholder="50000"
                className="mt-2"
              />
            </div>
          </div>

          {/* Alert Emails */}
          <div>
            <Label>Emails pour Alertes Budgétaires</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email@example.com"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              />
              <Button type="button" onClick={addEmail} variant="outline">Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.alert_emails || []).map((email, idx) => (
                <div key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {email}
                  <button type="button" onClick={() => removeEmail(email)} className="hover:text-red-600">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Notes additionnelles sur ce budget..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMutation.isPending ? 'Enregistrement...' : (editBudget ? 'Mettre à Jour' : 'Créer le Budget')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}