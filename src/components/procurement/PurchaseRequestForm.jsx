import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

export default function PurchaseRequestForm({ request, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    titre: request?.titre || '',
    description: request?.description || '',
    justification: request?.justification || '',
    type_achat: request?.type_achat || 'Biens',
    montant_total: request?.montant_total || '',
    urgence: request?.urgence || 'Normal',
    date_besoin: request?.date_besoin || '',
    departement: request?.departement || '',
    budget_id: request?.budget_id || '',
    budget_code: request?.budget_code || '',
    categorie: request?.categorie || '',
    notes_internes: request?.notes_internes || '',
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => meras.entities.ExpenseCategory.list(),
  });

  // Get unique departments from active budgets
  const departments = [...new Set(
    budgets.filter(b => b.status === 'Actif' && b.department_name).map(b => b.department_name)
  )].sort();

  // Filter budgets for selected department
  const deptBudgets = form.departement
    ? budgets.filter(b => b.department_name === form.departement && b.status === 'Actif')
    : [];

  const selectedBudget = deptBudgets.find(b => b.id === form.budget_id);
  const available = selectedBudget?.amount_available ?? selectedBudget?.amount_allocated ?? 0;
  const isOverBudget = form.montant_total && parseFloat(form.montant_total) > available;

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleDepartementChange = (e) => {
    setForm(prev => ({ ...prev, departement: e.target.value, budget_id: '', budget_code: '' }));
  };

  const handleBudgetChange = (e) => {
    const budget = deptBudgets.find(b => b.id === e.target.value);
    setForm(prev => ({
      ...prev,
      budget_id: e.target.value,
      budget_code: budget?.budget_code || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titre || !form.montant_total || !form.departement || !form.date_besoin) {
      toast.error('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }
    onSubmit({ ...form, montant_total: parseFloat(form.montant_total) });
  };

  const fieldClass = "mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Titre */}
      <div>
        <Label>Titre de la demande *</Label>
        <Input
          className="mt-1"
          placeholder="Ex: Achat 5 ordinateurs portables"
          value={form.titre}
          onChange={(e) => set('titre', e.target.value)}
          required
        />
      </div>

      {/* Type d'achat + Urgence */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type d'achat *</Label>
          <select className={fieldClass} value={form.type_achat} onChange={(e) => set('type_achat', e.target.value)}>
            <option value="Biens">📦 Biens / Matériel</option>
            <option value="Services">🔧 Services / Sous-traitance</option>
            <option value="Équipement">⚙️ Équipement / Machines</option>
            <option value="Consommables">📄 Consommables / Fournitures</option>
            <option value="Infrastructure">🏗️ Infrastructure / Travaux</option>
          </select>
        </div>
        <div>
          <Label>Urgence *</Label>
          <select className={fieldClass} value={form.urgence} onChange={(e) => set('urgence', e.target.value)}>
            <option value="Normal">📅 Normal (2-4 semaines)</option>
            <option value="Urgent">⚡ Urgent (1 semaine)</option>
            <option value="Critique">🔴 Critique (&lt;48h)</option>
          </select>
        </div>
      </div>

      {/* Montant + Date besoin */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Montant estimé (DJF) *</Label>
          <Input
            className="mt-1"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={form.montant_total}
            onChange={(e) => set('montant_total', e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Date de besoin *</Label>
          <Input
            className="mt-1"
            type="date"
            value={form.date_besoin}
            onChange={(e) => set('date_besoin', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Département */}
      <div>
        <Label>Département *</Label>
        <select className={fieldClass} value={form.departement} onChange={handleDepartementChange}>
          <option value="">— Sélectionner un département —</option>
          {departments.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      </div>

      {/* Budget — only shown after dept selected */}
      {form.departement && (
        <div>
          <Label>Code budgétaire</Label>
          {deptBudgets.length === 0 ? (
            <p className="mt-1 text-sm text-red-600">Aucun budget actif trouvé pour ce département.</p>
          ) : (
            <>
              <select className={fieldClass} value={form.budget_id} onChange={handleBudgetChange}>
                <option value="">— Sélectionner un budget —</option>
                {deptBudgets.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.budget_code} — {b.nom || b.category || b.department_name} ({(b.amount_available ?? b.amount_allocated ?? 0).toLocaleString()} DJF dispo)
                  </option>
                ))}
              </select>
              {form.budget_id && form.montant_total && (
                <p className={`mt-1 text-xs font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                  {isOverBudget
                    ? `⚠️ Montant demandé dépasse le disponible (${available.toLocaleString()} DJF)`
                    : `✅ Budget suffisant — ${available.toLocaleString()} DJF disponible`}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Catégorie */}
      <div>
        <Label>Catégorie de dépense</Label>
        <select className={fieldClass} value={form.categorie} onChange={(e) => set('categorie', e.target.value)}>
          <option value="">— Sélectionner une catégorie —</option>
          {categories.map(c => (
            <option key={c.id} value={c.nom}>{c.nom}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea
          className="mt-1"
          placeholder="Spécifications, modèles, quantités..."
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      {/* Justification */}
      <div>
        <Label>Justification métier</Label>
        <Textarea
          className="mt-1"
          placeholder="Pourquoi cette demande? Impact pour le département?"
          rows={3}
          value={form.justification}
          onChange={(e) => set('justification', e.target.value)}
        />
      </div>

      {/* Notes internes */}
      <div>
        <Label>Notes internes (optionnel)</Label>
        <Textarea
          className="mt-1"
          placeholder="Informations pour le service procurement..."
          rows={2}
          value={form.notes_internes}
          onChange={(e) => set('notes_internes', e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          Soumettre la demande
        </Button>
      </div>
    </form>
  );
}