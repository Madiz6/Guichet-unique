import React, { useState, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, AlertCircle, CheckCircle, Lightbulb, DollarSign, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

const PURCHASE_TYPES = [
  { value: 'Biens', label: '📦 Biens / Matériel' },
  { value: 'Services', label: '🔧 Services / Sous-traitance' },
  { value: 'Équipement', label: '⚙️ Équipement / Machines' },
  { value: 'Consommables', label: '📄 Consommables / Fournitures' },
  { value: 'Infrastructure', label: '🏗️ Infrastructure / Travaux' }
];

const URGENCY_LEVELS = [
  { value: 'Normal', label: '📅 Normal (2-4 semaines)', color: 'bg-blue-100 text-blue-800' },
  { value: 'Urgent', label: '⚡ Urgent (1 semaine)', color: 'bg-orange-100 text-orange-800' },
  { value: 'Critique', label: '🔴 Critique (<48h)', color: 'bg-red-100 text-red-800' }
];

export default function SmartPurchaseRequestForm({ request, onSubmit, onCancel }) {
  const [step, setStep] = useState(1); // 1: Basics, 2: Budget, 3: Vendors, 4: Review
  const [formData, setFormData] = useState(request || {
    titre: '',
    description: '',
    type_achat: 'Biens',
    categorie: '',
    montant_total: '',
    devise: 'DJF',
    justification: '',
    date_besoin: '',
    urgence: 'Normal',
    budget_code: '',
    fournisseurs: [],
    pieces_jointes: [],
    notes_internes: ''
  });

  const [policy_violations, setPolicyViolations] = useState([]);
  const [suggested_approvers, setSuggestedApprovers] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => meras.entities.ExpenseCategory.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => meras.entities.User.list(),
  });

  // Derive unique departments from budgets that have a department_name
  const budgetDepartments = [...new Set(
    budgets.filter(b => b.department_name).map(b => b.department_name)
  )].sort();

  // Filter budgets by selected department
  const filteredBudgets = formData.departement
    ? budgets.filter(b => b.department_name === formData.departement)
    : budgets;

  // Smart policy validation
  useEffect(() => {
    const violations = [];
    
    // Policy 1: Amount > 100K requires 2 approvers + CFO
    if (formData.montant_total > 100000) {
      violations.push({
        type: 'warning',
        message: '🚨 Montant > 100K DJF: Approbation CFO + Manager département requise'
      });
    }

    // Policy 2: Urgent + large amount requires VP approval
    if (formData.urgence === 'Critique' && formData.montant_total > 50000) {
      violations.push({
        type: 'warning',
        message: '⚡ Achat critique > 50K: Approbation VP requise'
      });
    }

    // Policy 3: New vendor > 50K requires 3 quotes
    if (formData.montant_total > 50000) {
      violations.push({
        type: 'info',
        message: '📋 Recommandation: Collecter 3 devis minimum'
      });
    }

    // Policy 4: Infrastructure purchases need board approval
    if (formData.type_achat === 'Infrastructure') {
      violations.push({
        type: 'warning',
        message: '🏗️ Projets infrastructure: Approbation conseil requise'
      });
    }

    setPolicyViolations(violations);
    
    // Calculate required approvers
    const approvers = [];
    if (formData.montant_total > 50000) {
      approvers.push({ role: 'Manager', level: 1 });
      approvers.push({ role: 'CFO', level: 2 });
    } else if (formData.montant_total > 25000) {
      approvers.push({ role: 'Manager', level: 1 });
    }
    
    if (formData.urgence === 'Critique') {
      approvers.push({ role: 'VP Operations', level: 3 });
    }

    setSuggestedApprovers(approvers);
  }, [formData.montant_total, formData.urgence, formData.type_achat]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await meras.integrations.Core.UploadFile({ file });
        return { nom: file.name, url: file_url, type: file.type };
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        pieces_jointes: [...(prev.pieces_jointes || []), ...uploadedFiles]
      }));
      toast.success(`${uploadedFiles.length} fichier(s) ajouté(s)`);
    } catch {
      toast.error('Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      pieces_jointes: prev.pieces_jointes.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const errors = policy_violations.filter(v => v.type === 'error');
    if (errors.length > 0) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    onSubmit({
      ...formData,
      montant_total: parseFloat(formData.montant_total),
      employe_email: currentUser?.email,
      employe_nom: currentUser?.full_name,
      approuveurs_requis: suggested_approvers.map((a, i) => ({
        ...a,
        statut: 'En attente',
        niveau: i + 1
      }))
    });
  };

  const canProceed = () => {
    if (step === 1) return formData.titre && formData.type_achat && formData.montant_total;
    if (step === 2) return formData.departement && formData.budget_code && formData.date_besoin;
    if (step === 3) return true; // Vendors are optional at submission
    return true;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map(num => (
          <React.Fragment key={num}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {num}
            </div>
            {num < 4 && <div className={`flex-1 h-1 mx-2 ${step > num ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Quelle est votre besoin?
          </h2>
          
          <div>
            <Label>Type d'achat *</Label>
            <Select value={formData.type_achat} onValueChange={(v) => setFormData({...formData, type_achat: v})}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURCHASE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Titre de la demande *</Label>
            <Input
              value={formData.titre}
              onChange={(e) => setFormData({...formData, titre: e.target.value})}
              placeholder="Ex: Achat 5 ordinateurs portables Dell"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Description détaillée</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Spécifications, modèles, quantités..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Justification métier *</Label>
            <Textarea
              value={formData.justification}
              onChange={(e) => setFormData({...formData, justification: e.target.value})}
              placeholder="Pourquoi cette demande? Impact pour le département?"
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant estimé (DJF) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.montant_total}
                onChange={(e) => setFormData({...formData, montant_total: e.target.value})}
                placeholder="0.00"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Urgence *</Label>
              <Select value={formData.urgence} onValueChange={(v) => setFormData({...formData, urgence: v})}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Budget */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Allocation budgétaire
          </h2>

          {/* Step 1: Department selection */}
          <div>
            <Label>Département demandeur *</Label>
            <Select
              value={formData.departement}
              onValueChange={(v) => setFormData({ ...formData, departement: v, budget_code: '' })}
            >
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner votre département..." /></SelectTrigger>
              <SelectContent>
                {budgetDepartments.length > 0
                  ? budgetDepartments.map(dep => (
                      <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                    ))
                  : <SelectItem value="_none" disabled>Aucun département avec budget trouvé</SelectItem>
                }
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Budget — only shown after department selected */}
          {formData.departement && (
            <div>
              <Label>Code budgétaire *</Label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">
                Budgets disponibles pour <strong>{formData.departement}</strong>
              </p>
              <Select
                value={formData.budget_code}
                onValueChange={(v) => setFormData({ ...formData, budget_code: v })}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner un budget..." /></SelectTrigger>
                <SelectContent>
                  {filteredBudgets.length > 0
                    ? filteredBudgets.map(b => (
                        <SelectItem key={b.id} value={b.budget_code}>
                          <span className="flex flex-col">
                            <span>{b.budget_code} — {b.nom}</span>
                            <span className="text-xs text-gray-500">{(b.montant_disponible || 0).toLocaleString()} DJF disponible</span>
                          </span>
                        </SelectItem>
                      ))
                    : <SelectItem value="_none" disabled>Aucun budget trouvé pour ce département</SelectItem>
                  }
                </SelectContent>
              </Select>

              {/* Budget available vs request amount indicator */}
              {formData.budget_code && formData.montant_total && (() => {
                const selectedBudget = filteredBudgets.find(b => b.budget_code === formData.budget_code);
                const available = selectedBudget?.montant_disponible || 0;
                const amount = parseFloat(formData.montant_total);
                const isOver = amount > available;
                return (
                  <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 text-sm ${isOver ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {isOver
                      ? `⚠️ Montant demandé (${amount.toLocaleString()} DJF) dépasse le disponible (${available.toLocaleString()} DJF)`
                      : `✅ Budget suffisant — ${available.toLocaleString()} DJF disponible`
                    }
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <Label>Catégorie de dépense</Label>
            <Select value={formData.categorie} onValueChange={(v) => setFormData({...formData, categorie: v})}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date de besoin *</Label>
            <Input
              type="date"
              value={formData.date_besoin}
              onChange={(e) => setFormData({...formData, date_besoin: e.target.value})}
              className="mt-2"
            />
          </div>
        </div>
      )}

      {/* Step 3: Vendors */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Collectez les devis (optionnel)
          </h2>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 Vous pouvez collecter les devis après soumission. Le system vous guidera et notifiera Procurement.
            </p>
          </div>

          <div>
            <Label>Pièces jointes (devis, spécifications)</Label>
            <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer mt-2 hover:bg-gray-50">
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">Déposer vos fichiers</span>
              <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>

            {formData.pieces_jointes?.length > 0 && (
              <div className="space-y-2 mt-3">
                {formData.pieces_jointes.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <span className="text-sm">{f.nom}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeAttachment(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Vérifiez votre demande
          </h2>

          {/* Policy Violations */}
          {policy_violations.length > 0 && (
            <div className="space-y-2">
              {policy_violations.map((v, i) => (
                <div key={i} className={`p-3 rounded-lg border-2 flex items-start gap-2 ${
                  v.type === 'error' ? 'bg-red-50 border-red-300' :
                  v.type === 'warning' ? 'bg-orange-50 border-orange-300' :
                  'bg-blue-50 border-blue-300'
                }`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    v.type === 'error' ? 'text-red-600' :
                    v.type === 'warning' ? 'text-orange-600' :
                    'text-blue-600'
                  }`} />
                  <p className="text-sm">{v.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex justify-between"><span className="font-medium">Titre:</span> <span>{formData.titre}</span></div>
            <div className="flex justify-between"><span className="font-medium">Montant:</span> <span>{formData.montant_total?.toLocaleString()} DJF</span></div>
            <div className="flex justify-between"><span className="font-medium">Type:</span> <span>{formData.type_achat}</span></div>
            <div className="flex justify-between"><span className="font-medium">Date besoin:</span> <span>{formData.date_besoin}</span></div>
            <div className="flex justify-between"><span className="font-medium">Urgence:</span> <span>{formData.urgence}</span></div>
          </div>

          {/* Suggested Approvers */}
          {suggested_approvers.length > 0 && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">Chaîne d'approbation automatique:</p>
              <div className="space-y-1">
                {suggested_approvers.map((a, i) => (
                  <p key={i} className="text-sm text-purple-800">
                    Niveau {a.niveau}: <strong>{a.role}</strong>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
        >
          {step === 1 ? 'Annuler' : 'Retour'}
        </Button>
        
        {step < 4 ? (
          <Button 
            type="button"
            disabled={!canProceed()}
            onClick={() => setStep(step + 1)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continuer
          </Button>
        ) : (
          <Button 
            type="submit"
            className="bg-green-600 hover:bg-green-700"
          >
            Soumettre la demande
          </Button>
        )}
      </div>
    </form>
  );
}