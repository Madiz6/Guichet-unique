import React, { useState, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Image as ImageIcon, Sparkles, Check, AlertCircle, ScanLine, Copy, Zap, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'Sales / Business Development',
  'Marketing / Communications',
  'Operations / Production',
  'Finance / Accounting',
  'Human Resources (HR)',
  'IT / Technology',
  'Customer Service / Support',
  'Legal / Compliance',
  'Research & Development (R&D)',
  'Procurement / Supply Chain',
  'Administration / Office Management',
  'Executive / Management'
];

const INCOME_CATEGORIES = [
  'Product Sales / Services Revenue',
  'Subscription Income / Recurring Revenue',
  'Interest Income',
  'Investment Income / Dividends',
  'Grants / Sponsorships',
  'Refunds / Returns from Suppliers',
  'Other Miscellaneous Income'
];

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
  'Depreciation & Amortization',
  'Bank Charges & Interest',
  'Loan Repayment - Principal',
  'Loan Repayment - Interest',
  'Miscellaneous Expenses'
];

const FINANCING_SOURCES = [
  { value: 'Apport Capital', label: 'Apport en Capital (Associé)', type: 'Revenu', needsShareholder: true },
  { value: 'Prêt Bancaire', label: 'Prêt Bancaire (Déblocage)', type: 'Revenu', needsLoan: true },
  { value: 'Remboursement Prêt', label: 'Remboursement de Prêt', type: 'Dépense', needsLoan: true },
  { value: 'Compte Courant Associé', label: 'Compte Courant Associé (Apport/Retrait)', type: 'both', needsShareholder: true }
];

export default function TransactionForm({ transaction, onSubmit, onCancel, departments }) {
  const [formData, setFormData] = useState(transaction || {
    date: new Date().toISOString().split('T')[0],
    description: '',
    contact_name: '',
    amount: '',
    tax_rate: '',
    tax_amount: '',
    total_amount: '',
    type: 'Dépense',
    category: '',
    department: '',
    payment_method: 'Espèces',
    notes: '',
    attachments: [],
    numero_facture: '',
    date_echeance: '',
    is_creance: false,
    is_dette: false,
    status: 'En attente',
    accounting_period: new Date().toISOString().slice(0, 7).replace('-', '')
  });
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => meras.entities.Contact.list(),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => meras.entities.Loan.list(),
  });

  const { data: shareholders = [] } = useQuery({
    queryKey: ['shareholders'],
    queryFn: () => meras.entities.Shareholder.filter({ statut: 'Actif' }),
  });

  const { data: pastTransactions = [] } = useQuery({
    queryKey: ['transactions-for-ai'],
    queryFn: () => meras.entities.Transaction.list('-created_date', 50),
  });

  const availableCategories = formData.type === 'Revenu' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await meras.integrations.Core.UploadFile({ file });
        return {
          name: file.name,
          url: file_url,
          type: file.type
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData({
        ...formData,
        attachments: [...(formData.attachments || []), ...uploadedFiles]
      });
      toast.success(`${uploadedFiles.length} fichier(s) téléchargé(s)`);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const calculateTax = (amount, taxRate) => {
    const amt = parseFloat(amount) || 0;
    const rate = parseFloat(taxRate) || 0;
    const taxAmount = (amt * rate) / 100;
    const totalAmount = amt + taxAmount;
    return { taxAmount, totalAmount };
  };

  const handleAmountChange = (value) => {
    const { taxAmount, totalAmount } = calculateTax(value, formData.tax_rate);
    setFormData({
      ...formData,
      amount: value,
      tax_amount: taxAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2)
    });
  };

  const handleTaxRateChange = (value) => {
    const { taxAmount, totalAmount } = calculateTax(formData.amount, value);
    setFormData({
      ...formData,
      tax_rate: value,
      tax_amount: taxAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2)
    });
  };

  const suggestCategory = async () => {
    if (!formData.description) {
      toast.error('Veuillez entrer une description d\'abord');
      return;
    }

    setLoadingSuggestion(true);
    try {
      const recentSimilar = pastTransactions
        .filter(t => t.type === formData.type && t.category)
        .slice(0, 10)
        .map(t => `Description: ${t.description}, Catégorie: ${t.category}`)
        .join('\n');

      const prompt = `En tant qu'expert comptable à Djibouti, suggérez la catégorie la plus appropriée pour cette transaction:

Type: ${formData.type}
Description: ${formData.description}
Contact: ${formData.contact_name || 'Non spécifié'}

Catégories disponibles pour ${formData.type}:
${availableCategories.join(', ')}

Exemples de transactions précédentes:
${recentSimilar || 'Aucune transaction précédente'}

Répondez UNIQUEMENT avec le nom exact de la catégorie, rien d'autre.`;

      const response = await meras.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const suggested = response.trim();
      if (availableCategories.includes(suggested)) {
        setSuggestedCategory(suggested);
        toast.success('Catégorie suggérée!');
      } else {
        toast.error('Impossible de suggérer une catégorie');
      }
    } catch (error) {
      toast.error('Erreur lors de la suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  useEffect(() => {
    if (formData.description && formData.description.length > 10 && !formData.category && !transaction) {
      const timer = setTimeout(() => {
        suggestCategory();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.description, formData.type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      tax_rate: parseFloat(formData.tax_rate) || 0,
      tax_amount: parseFloat(formData.tax_amount) || 0,
      total_amount: parseFloat(formData.total_amount) || parseFloat(formData.amount),
      auto_categorized: !!suggestedCategory && formData.category === suggestedCategory
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date *</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
            className="mt-2"
          />
        </div>
        <div>
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Revenu">Revenu</SelectItem>
              <SelectItem value="Dépense">Dépense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description *</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Ex: Paiement client, Achat fournitures..."
          required
          className="mt-2"
        />
      </div>

      <div>
        <Label>{formData.type === 'Revenu' ? 'Nom du Client' : 'Nom du Fournisseur'}</Label>
        <Select 
          value={formData.contact_name} 
          onValueChange={(value) => setFormData({...formData, contact_name: value})}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Sélectionner un contact..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Aucun contact</SelectItem>
            {contacts
              .filter(c => formData.type === 'Revenu' 
                ? (c.type === 'Client' || c.type === 'Les deux')
                : (c.type === 'Fournisseur' || c.type === 'Les deux'))
              .map(contact => (
                <SelectItem key={contact.id} value={contact.name}>
                  {contact.name} {contact.company && `(${contact.company})`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Montant HT (DJF) *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            required
            className="mt-2"
          />
        </div>
        <div>
          <Label>Taux de TVA (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.tax_rate}
            onChange={(e) => handleTaxRateChange(e.target.value)}
            placeholder="0"
            className="mt-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Montant TVA (DJF)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.tax_amount}
            readOnly
            className="mt-2 bg-gray-50"
          />
        </div>
        <div>
          <Label>Montant Total TTC (DJF)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.total_amount}
            readOnly
            className="mt-2 bg-gray-50 font-semibold"
          />
        </div>
      </div>

      <div>
        <Label>Méthode de paiement</Label>
        <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Catégorie</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={suggestCategory}
              disabled={loadingSuggestion || !formData.description}
              className="h-7 text-xs text-purple-600"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {loadingSuggestion ? 'Suggestion...' : 'Suggérer avec IA'}
            </Button>
          </div>
          <Select 
            value={formData.category} 
            onValueChange={(value) => {
              setFormData({...formData, category: value});
              setSuggestedCategory(null);
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sélectionner une catégorie..." />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestedCategory && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-800">Suggestion: {suggestedCategory}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFormData({...formData, category: suggestedCategory});
                  toast.success('Catégorie appliquée');
                }}
                className="h-7 text-purple-600"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <div>
          <Label>Département</Label>
          <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sélectionner un département..." />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Notes additionnelles..."
          className="mt-2"
          rows={3}
        />
      </div>

      {/* Financing Transactions Section */}
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <Label className="text-purple-900 font-bold mb-3 block">💰 Transaction de Financement (Optionnel)</Label>
        <div className="grid grid-cols-1 gap-4">
          <Select 
            value={formData.source || 'Manuel'} 
            onValueChange={(value) => {
              const isFinancing = FINANCING_SOURCES.some(f => f.value === value);
              setFormData({
                ...formData, 
                source: value,
                is_financing: isFinancing
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de transaction..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manuel">Transaction Standard</SelectItem>
              {FINANCING_SOURCES.map(source => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Shareholder Selection */}
          {(formData.source === 'Apport Capital' || formData.source === 'Compte Courant Associé') && (
            <div>
              <Label>Associé *</Label>
              <Select 
                value={formData.shareholder_id} 
                onValueChange={(value) => setFormData({...formData, shareholder_id: value})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un associé..." />
                </SelectTrigger>
                <SelectContent>
                  {shareholders.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom} ({s.pourcentage_participation}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Loan Selection */}
          {(formData.source === 'Prêt Bancaire' || formData.source === 'Remboursement Prêt') && (
            <div>
              <Label>Prêt *</Label>
              <Select 
                value={formData.loan_id} 
                onValueChange={(value) => setFormData({...formData, loan_id: value})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un prêt..." />
                </SelectTrigger>
                <SelectContent>
                  {loans.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.numero_pret} - {l.banque} ({l.montant_restant?.toLocaleString()} DJF restant)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Accounting Details */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <Label>N° Facture {formData.type === 'Dépense' && !formData.is_financing && <span className="text-red-500">*</span>}</Label>
          <Input
            value={formData.numero_facture}
            onChange={(e) => setFormData({...formData, numero_facture: e.target.value})}
            placeholder="INV-2024-001"
            className="mt-2"
          />
        </div>
        <div>
          <Label>Date d'échéance</Label>
          <Input
            type="date"
            value={formData.date_echeance}
            onChange={(e) => setFormData({...formData, date_echeance: e.target.value})}
            className="mt-2"
          />
        </div>
      </div>

      {/* Dette/Créance Checkboxes */}
      <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_dette}
            onChange={(e) => setFormData({...formData, is_dette: e.target.checked, status: e.target.checked ? 'En attente' : formData.status})}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Dette fournisseur (Note 7)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_creance}
            onChange={(e) => setFormData({...formData, is_creance: e.target.checked, status: e.target.checked ? 'En attente' : formData.status})}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Créance client (Note 4)</span>
        </label>
      </div>

      <div>
        <Label>Pièces jointes</Label>
        {formData.type === 'Dépense' && (!formData.attachments || formData.attachments.length === 0) && (
          <div className="mb-2 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Requis:</strong> Facture ou reçu obligatoire pour toute dépense (conformité NPCG)
            </p>
          </div>
        )}
        <div className="mt-2 space-y-2">
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#D3DCE6] rounded-lg cursor-pointer hover:border-[#0066FF] transition-colors">
            <Upload className="w-5 h-5 text-[#697586]" />
            <span className="text-sm text-[#697586]">
              {uploading ? 'Téléchargement...' : 'Cliquer pour télécharger'}
            </span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {formData.attachments?.length > 0 && (
            <div className="space-y-2">
              {formData.attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                  <div className="flex items-center gap-2">
                    {file.type?.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-600" />
                    )}
                    <span className="text-sm text-[#0A2540]">{file.name}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
          {transaction ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}