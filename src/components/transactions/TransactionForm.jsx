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

  const checkForDuplicates = (amount, description) => {
    const similar = pastTransactions.filter(t => {
      const sameAmount = parseFloat(t.amount) === parseFloat(amount);
      const descWords = (description || '').toLowerCase().split(' ').filter(w => w.length > 3);
      const descMatch = descWords.some(w => t.description?.toLowerCase().includes(w));
      const recentDate = new Date(t.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sameAmount && descMatch && recentDate;
    });
    return similar.length > 0 ? similar[0] : null;
  };

  const scanReceiptWithAI = async (fileUrl) => {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await meras.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert comptable. Analyse ce justificatif et extrait les données.
Retourne un JSON avec: description, contact_name, amount (HT), tax_rate (%), tax_amount, total_amount, numero_facture, date (YYYY-MM-DD), type ("Revenu" ou "Dépense"), category (parmi: Payroll & Benefits, Office & Administrative, Marketing & Advertising, Travel & Entertainment, IT / Software / Tools, Professional Services, Maintenance & Repairs, Taxes & Regulatory Fees, Insurance, Bank Charges & Interest, Product Sales / Services Revenue), gl_account (compte NPCG ex: 641), confidence (0-100).
Utilise null si absent.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            contact_name: { type: "string" },
            amount: { type: "number" },
            tax_rate: { type: "number" },
            tax_amount: { type: "number" },
            total_amount: { type: "number" },
            numero_facture: { type: "string" },
            date: { type: "string" },
            type: { type: "string" },
            category: { type: "string" },
            gl_account: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });
      if (result && result.amount) {
        setScanResult(result);
        const dup = checkForDuplicates(result.amount, result.description);
        if (dup) setDuplicateAlert(dup);
        toast.success(`✅ Scan IA — Confiance: ${result.confidence || '—'}%`);
      } else {
        toast.error('Document illisible');
      }
    } catch {
      toast.error('Erreur scan IA');
    } finally {
      setScanning(false);
    }
  };

  const applyScanResult = () => {
    if (!scanResult) return;
    const { taxAmount, totalAmount } = calculateTax(scanResult.amount || formData.amount, scanResult.tax_rate ?? formData.tax_rate);
    setFormData(prev => ({
      ...prev,
      description: scanResult.description || prev.description,
      contact_name: scanResult.contact_name || prev.contact_name,
      amount: scanResult.amount || prev.amount,
      tax_rate: scanResult.tax_rate ?? prev.tax_rate,
      tax_amount: scanResult.tax_amount ?? taxAmount.toFixed(2),
      total_amount: scanResult.total_amount || totalAmount.toFixed(2),
      numero_facture: scanResult.numero_facture || prev.numero_facture,
      date: scanResult.date || prev.date,
      type: scanResult.type || prev.type,
      category: scanResult.category || prev.category,
    }));
    if (scanResult.category) setSuggestedCategory(scanResult.category);
    setScanResult(null);
    toast.success('Données appliquées');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await meras.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url, type: file.type };
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles]
      }));
      const firstScannable = uploadedFiles.find(f => f.type?.startsWith('image/') || f.type === 'application/pdf');
      if (firstScannable) {
        toast.info('🤖 Scan IA en cours...');
        await scanReceiptWithAI(firstScannable.url);
      } else {
        toast.success(`${uploadedFiles.length} fichier(s) ajouté(s)`);
      }
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

      {/* Duplicate Alert */}
      {duplicateAlert && (
        <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg flex items-start gap-2">
          <Copy className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">⚠️ Doublon potentiel détecté</p>
            <p className="text-xs text-orange-700 mt-0.5">Transaction similaire: <strong>{duplicateAlert.description}</strong> — {parseFloat(duplicateAlert.amount)?.toLocaleString()} DJF</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicateAlert(null)} className="h-6 w-6 p-0 text-orange-600"><X className="w-3 h-3" /></Button>
        </div>
      )}

      <div>
        <Label>Pièces jointes & Scan IA</Label>
        <div className="mt-2 space-y-2">
          <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition ${
            scanning ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
          }`}>
            {scanning ? (
              <>
                <div className="flex items-center gap-2 text-purple-700">
                  <ScanLine className="w-6 h-6 animate-pulse" />
                  <span className="text-sm font-semibold">Scan IA en cours...</span>
                </div>
                <p className="text-xs text-purple-500">Extraction des données avec précision 99%</p>
              </>
            ) : uploading ? (
              <span className="text-sm text-gray-500">Téléchargement...</span>
            ) : (
              <>
                <div className="flex items-center gap-2 text-gray-600">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-semibold">Déposer facture / reçu</span>
                </div>
                <p className="text-xs text-gray-400">L'IA extrait automatiquement: montant, TVA, fournisseur, compte GL</p>
                <div className="flex gap-2 mt-1 flex-wrap justify-center">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" /> Précision 99%</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Auto-catégorisation</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Copy className="w-3 h-3" /> Détection doublons</span>
                </div>
              </>
            )}
            <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" disabled={uploading || scanning} />
          </label>

          {/* AI Scan Result Panel */}
          {scanResult && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-bold text-purple-900">Données extraites par l'IA</span>
                  {scanResult.confidence && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{scanResult.confidence}% confiance</span>
                  )}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setScanResult(null)} className="h-6 w-6 p-0 text-gray-400"><X className="w-3 h-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 mb-3">
                {scanResult.description && <div><span className="text-gray-400">Description:</span> <strong>{scanResult.description}</strong></div>}
                {scanResult.contact_name && <div><span className="text-gray-400">Fournisseur:</span> <strong>{scanResult.contact_name}</strong></div>}
                {scanResult.amount && <div><span className="text-gray-400">Montant HT:</span> <strong>{parseFloat(scanResult.amount)?.toLocaleString()} DJF</strong></div>}
                {scanResult.tax_rate > 0 && <div><span className="text-gray-400">TVA:</span> <strong>{scanResult.tax_rate}%</strong></div>}
                {scanResult.total_amount && <div><span className="text-gray-400">TTC:</span> <strong>{parseFloat(scanResult.total_amount)?.toLocaleString()} DJF</strong></div>}
                {scanResult.numero_facture && <div><span className="text-gray-400">N° Facture:</span> <strong>{scanResult.numero_facture}</strong></div>}
                {scanResult.category && <div><span className="text-gray-400">Catégorie:</span> <strong>{scanResult.category}</strong></div>}
                {scanResult.gl_account && <div><span className="text-gray-400">Compte NPCG:</span> <strong>{scanResult.gl_account}</strong></div>}
              </div>
              <Button type="button" onClick={applyScanResult} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm h-8">
                <Check className="w-4 h-4 mr-2" />
                Appliquer toutes les données
              </Button>
            </div>
          )}

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
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeAttachment(index)}>
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