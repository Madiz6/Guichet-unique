import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, format } from 'date-fns';

export default function BudgetSettings({ budgets, departments }) {
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingDept, setEditingDept] = useState(null);

  const queryClient = useQueryClient();

  const createBudgetMutation = useMutation({
    mutationFn: (data) => {
      const available = data.amount_allocated - (data.amount_used || 0) - (data.amount_committed || 0);
      return meras.entities.Budget.create({ ...data, amount_available: available });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget créé');
      setShowBudgetForm(false);
      setEditingBudget(null);
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const available = data.amount_allocated - (data.amount_used || 0) - (data.amount_committed || 0);
      return meras.entities.Budget.update(id, { ...data, amount_available: available });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget mis à jour');
      setShowBudgetForm(false);
      setEditingBudget(null);
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id) => meras.entities.Budget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget supprimé');
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: (data) => meras.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      toast.success('Département créé');
      setShowDeptForm(false);
      setEditingDept(null);
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }) => meras.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      toast.success('Département mis à jour');
      setShowDeptForm(false);
      setEditingDept(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Departments Section */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#0A2540]">Départements</h3>
            <Button
              onClick={() => {
                setEditingDept(null);
                setShowDeptForm(true);
              }}
              className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Département
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => (
              <Card key={dept.id} className="border border-[#E8ECF2]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0A2540]">{dept.name}</p>
                        {dept.manager_name && (
                          <p className="text-xs text-[#697586]">Manager: {dept.manager_name}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingDept(dept);
                        setShowDeptForm(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budgets Section */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#0A2540]">Budgets</h3>
            <Button
              onClick={() => {
                setEditingBudget(null);
                setShowBudgetForm(true);
              }}
              className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Budget
            </Button>
          </div>

          <div className="space-y-4">
            {budgets.map(budget => {
              const dept = departments.find(d => d.id === budget.department_id);
              return (
                <Card key={budget.id} className="border border-[#E8ECF2]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-[#697586]">Département</p>
                          <p className="font-semibold text-[#0A2540]">{budget.department_name || dept?.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#697586]">Période</p>
                          <p className="font-semibold text-[#0A2540]">{budget.period}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#697586]">Alloué</p>
                          <p className="font-semibold text-[#0A2540]">{budget.amount_allocated.toLocaleString()} DJF</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#697586]">Disponible</p>
                          <p className="font-semibold text-green-600">{(budget.amount_available || 0).toLocaleString()} DJF</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingBudget(budget);
                            setShowBudgetForm(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Supprimer ce budget?')) {
                              deleteBudgetMutation.mutate(budget.id);
                            }
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Budget Form Dialog */}
      <BudgetFormDialog
        isOpen={showBudgetForm}
        onClose={() => {
          setShowBudgetForm(false);
          setEditingBudget(null);
        }}
        budget={editingBudget}
        departments={departments}
        onSubmit={(data) => {
          if (editingBudget) {
            updateBudgetMutation.mutate({ id: editingBudget.id, data });
          } else {
            createBudgetMutation.mutate(data);
          }
        }}
      />

      {/* Department Form Dialog */}
      <DepartmentFormDialog
        isOpen={showDeptForm}
        onClose={() => {
          setShowDeptForm(false);
          setEditingDept(null);
        }}
        department={editingDept}
        onSubmit={(data) => {
          if (editingDept) {
            updateDeptMutation.mutate({ id: editingDept.id, data });
          } else {
            createDeptMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function BudgetFormDialog({ isOpen, onClose, budget, departments, onSubmit }) {
  const [formData, setFormData] = useState(budget || {
    department_id: '',
    period: 'Mensuel',
    amount_allocated: '',
    amount_used: 0,
    amount_committed: 0,
    spending_limit_per_transaction: '',
    requires_approval_above: ''
  });

  React.useEffect(() => {
    if (budget) {
      setFormData(budget);
    }
  }, [budget]);

  React.useEffect(() => {
    if (formData.period && formData.department_id) {
      const now = new Date();
      let start, end;
      
      if (formData.period === 'Mensuel') {
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(endOfMonth(now), 'yyyy-MM-dd');
      } else if (formData.period === 'Trimestriel') {
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(endOfMonth(addMonths(now, 2)), 'yyyy-MM-dd');
      } else {
        start = format(startOfYear(now), 'yyyy-MM-dd');
        end = format(endOfYear(now), 'yyyy-MM-dd');
      }

      setFormData(prev => ({ ...prev, period_start: start, period_end: end }));
    }
  }, [formData.period, formData.department_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dept = departments.find(d => d.id === formData.department_id);
    onSubmit({ ...formData, department_name: dept?.name });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{budget ? 'Modifier le Budget' : 'Nouveau Budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Département *</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un département..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Période *</Label>
              <Select
                value={formData.period}
                onValueChange={(value) => setFormData({ ...formData, period: value })}
              >
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de Début</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Date de Fin</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label>Montant Alloué (DJF) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount_allocated}
              onChange={(e) => setFormData({ ...formData, amount_allocated: parseFloat(e.target.value) })}
              required
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Limite par Transaction (DJF)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.spending_limit_per_transaction}
                onChange={(e) => setFormData({ ...formData, spending_limit_per_transaction: parseFloat(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Approbation au-dessus de (DJF)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.requires_approval_above}
                onChange={(e) => setFormData({ ...formData, requires_approval_above: parseFloat(e.target.value) })}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
              {budget ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentFormDialog({ isOpen, onClose, department, onSubmit }) {
  const [formData, setFormData] = useState(department || {
    name: '',
    manager_id: '',
    manager_name: '',
    description: ''
  });

  React.useEffect(() => {
    if (department) {
      setFormData(department);
    }
  }, [department]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Modifier le Département' : 'Nouveau Département'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nom *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label>Email du Manager</Label>
            <Input
              type="email"
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Nom du Manager</Label>
            <Input
              value={formData.manager_name}
              onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
              {department ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}