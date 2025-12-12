import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
  'Payroll & Benefits',
  'Office & Administrative',
  'Marketing & Advertising',
  'Travel & Entertainment',
  'IT / Software / Tools',
  'Professional Services',
  'Training & Development',
  'Procurement / Inventory',
  'Maintenance & Repairs',
  'Taxes & Regulatory Fees',
  'Insurance',
  'Miscellaneous Expenses'
];

export default function ExpenseRequestForm({ isOpen, onClose, budgets, departments, currentUser }) {
  const [formData, setFormData] = useState({
    department_id: '',
    amount_requested: '',
    description: '',
    category: '',
    contact_name: '',
    request_type: 'Planifiée',
    payment_method: 'Virement',
    notes: ''
  });
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [policyWarnings, setPolicyWarnings] = useState([]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const requestNumber = `REQ-${Date.now()}`;
      const budget = budgets.find(b => b.id === data.department_id);
      const dept = departments.find(d => d.id === data.department_id);
      
      const expenseData = {
        ...data,
        request_number: requestNumber,
        budget_id: budget?.id,
        department_name: dept?.name,
        requested_by: currentUser.email,
        requester_name: currentUser.full_name,
        date_requested: new Date().toISOString().split('T')[0],
        status: 'En attente',
        policy_violation: policyWarnings.length > 0,
        policy_violation_reason: policyWarnings.join(', ')
      };

      return await meras.entities.ExpenseRequest.create(expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-requests']);
      toast.success('Demande de dépense créée avec succès');
      onClose();
      setFormData({
        department_id: '',
        amount_requested: '',
        description: '',
        category: '',
        contact_name: '',
        request_type: 'Planifiée',
        payment_method: 'Virement',
        notes: ''
      });
      setPolicyWarnings([]);
    },
  });

  const checkBudgetCompliance = (deptId, amount) => {
    const budget = budgets.find(b => b.department_id === deptId);
    if (!budget) {
      setPolicyWarnings(['Aucun budget trouvé pour ce département']);
      setSelectedBudget(null);
      return;
    }

    setSelectedBudget(budget);
    const warnings = [];

    const available = budget.amount_available || (budget.amount_allocated - budget.amount_used - budget.amount_committed);
    
    if (parseFloat(amount) > available) {
      warnings.push(`Montant dépasse le budget disponible (${available.toLocaleString()} DJF)`);
    }

    if (budget.spending_limit_per_transaction && parseFloat(amount) > budget.spending_limit_per_transaction) {
      warnings.push(`Dépasse la limite par transaction (${budget.spending_limit_per_transaction.toLocaleString()} DJF)`);
    }

    if (budget.categories_allowed && formData.category && !budget.categories_allowed.includes(formData.category)) {
      warnings.push('Catégorie non autorisée pour ce budget');
    }

    setPolicyWarnings(warnings);
  };

  const handleDepartmentChange = (deptId) => {
    setFormData({ ...formData, department_id: deptId });
    if (formData.amount_requested) {
      checkBudgetCompliance(deptId, formData.amount_requested);
    }
  };

  const handleAmountChange = (amount) => {
    setFormData({ ...formData, amount_requested: amount });
    if (formData.department_id) {
      checkBudgetCompliance(formData.department_id, amount);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.department_id || !formData.amount_requested || !formData.description) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle Demande de Dépense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Département *</Label>
              <Select value={formData.department_id || undefined} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un département..." />
                </SelectTrigger>
                <SelectContent>
                  {departments?.length > 0 ? (
                    departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-dept" disabled>Aucun département disponible</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Montant (DJF) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount_requested}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
                className="mt-2"
              />
            </div>
          </div>

          {selectedBudget && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[#697586]">Budget Disponible</p>
                  <p className="text-lg font-bold text-green-600">
                    {(selectedBudget.amount_available || 0).toLocaleString()} DJF
                  </p>
                </div>
                <div>
                  <p className="text-[#697586]">Déjà Utilisé</p>
                  <p className="text-lg font-bold text-red-600">
                    {selectedBudget.amount_used.toLocaleString()} DJF
                  </p>
                </div>
                <div>
                  <p className="text-[#697586]">Déjà Engagé</p>
                  <p className="text-lg font-bold text-amber-600">
                    {selectedBudget.amount_committed.toLocaleString()} DJF
                  </p>
                </div>
              </div>
            </div>
          )}

          {policyWarnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 mb-2">Avertissements de Politique</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                    {policyWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600 mt-2">
                    Cette demande nécessitera une approbation spéciale
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fournisseur/Bénéficiaire</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type de Demande</Label>
              <Select value={formData.request_type} onValueChange={(value) => setFormData({ ...formData, request_type: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planifiée">Planifiée</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                  <SelectItem value="Récurrente">Récurrente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Méthode de Paiement</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
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
          </div>

          <div>
            <Label>Notes additionnelles</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? 'Création...' : 'Soumettre la Demande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}