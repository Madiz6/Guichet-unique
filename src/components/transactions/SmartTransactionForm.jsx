import React, { useState, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, AlertCircle, CheckCircle, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AITransactionAutocomplete from '@/components/ai/AITransactionAutocomplete';

// NPCG Account Mapping
const NPCG_ACCOUNTS = {
  // Revenus (Classe 7)
  'Product Sales / Services Revenue': { compte: '701', label: 'Ventes de marchandises' },
  'Subscription Income / Recurring Revenue': { compte: '706', label: 'Prestations de services' },
  'Interest Income': { compte: '762', label: 'Produits financiers' },
  'Apport Capital': { compte: '101', label: 'Capital social' },
  'Prêt Bancaire': { compte: '164', label: 'Emprunts bancaires' },
  
  // Dépenses (Classe 6)
  'Payroll & Benefits': { compte: '641', label: 'Rémunérations du personnel' },
  'Office & Administrative': { compte: '606', label: 'Achats non stockés' },
  'Marketing & Advertising': { compte: '623', label: 'Publicité et relations publiques' },
  'Travel & Entertainment': { compte: '625', label: 'Déplacements, missions' },
  'IT / Software / Tools': { compte: '613', label: 'Locations' },
  'Professional Services': { compte: '622', label: 'Honoraires' },
  'Taxes & Regulatory Fees': { compte: '635', label: 'Impôts et taxes' },
  'Bank Charges & Interest': { compte: '661', label: 'Charges financières' },
  'Loan Repayment - Principal': { compte: '164', label: 'Remboursement emprunt' },
  'Loan Repayment - Interest': { compte: '661', label: 'Intérêts des emprunts' },
  'Maintenance & Repairs': { compte: '615', label: 'Entretien et réparations' },
  'Insurance': { compte: '616', label: 'Primes d\'assurances' },
};

const TRANSACTION_TEMPLATES = {
  'Apport Capital': {
    type: 'Revenu',
    category: 'Investment Income / Dividends',
    payment_method: 'Virement',
    compte_comptable: '101',
    document_required: false,
    description_template: 'Apport en capital - [Nom Associé]'
  },
  'Prêt Bancaire': {
    type: 'Revenu',
    category: 'Investment Income / Dividends',
    payment_method: 'Virement',
    compte_comptable: '164',
    document_required: true,
    description_template: 'Déblocage prêt bancaire - [Banque]'
  },
  'Remboursement Prêt': {
    type: 'Dépense',
    category: 'Loan Repayment - Principal',
    payment_method: 'Virement',
    compte_comptable: '164',
    document_required: true,
    description_template: 'Remboursement échéance prêt - [Banque]'
  },
  'Paie': {
    type: 'Dépense',
    category: 'Payroll & Benefits',
    payment_method: 'Virement',
    compte_comptable: '641',
    document_required: true,
    auto_generated: true
  }
};

export default function SmartTransactionForm({ transaction, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(transaction || {
    date: new Date().toISOString().split('T')[0],
    description: '',
    contact_name: '',
    amount: '',
    tax_rate: 0,
    tax_amount: 0,
    total_amount: '',
    type: 'Dépense',
    source: 'Manuel',
    category: '',
    department: '',
    payment_method: 'Espèces',
    status: 'En attente',
    notes: '',
    attachments: [],
    numero_facture: '',
    date_echeance: '',
    is_creance: false,
    is_dette: false,
    is_financing: false,
    document_required: true,
    accounting_period: new Date().toISOString().slice(0, 7).replace('-', '')
  });
  
  const [uploading, setUploading] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => meras.entities.Contact.list(),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => meras.entities.Loan.filter({ statut: 'En cours' }),
  });

  const { data: shareholders = [] } = useQuery({
    queryKey: ['shareholders'],
    queryFn: () => meras.entities.Shareholder.filter({ statut: 'Actif' }),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => meras.entities.BankAccount.list(),
  });

  // Smart validation
  useEffect(() => {
    const issues = [];
    
    if (formData.type === 'Dépense' && formData.amount > 50000 && !formData.numero_facture) {
      issues.push({ type: 'warning', message: 'Dépense >50K DJF: N° facture recommandé' });
    }
    
    if (formData.type === 'Dépense' && !formData.attachments?.length && formData.document_required) {
      issues.push({ type: 'error', message: 'Justificatif obligatoire pour conformité NPCG' });
    }
    
    if ((formData.is_creance || formData.is_dette) && !formData.date_echeance) {
      issues.push({ type: 'warning', message: 'Date échéance recommandée pour suivi trésorerie' });
    }
    
    if (formData.source === 'Prêt Bancaire' && !formData.loan_id) {
      issues.push({ type: 'error', message: 'Sélectionner le prêt concerné' });
    }
    
    if (formData.source === 'Apport Capital' && !formData.shareholder_id) {
      issues.push({ type: 'error', message: 'Sélectionner l\'associé concerné' });
    }

    if (!formData.bank_account_id && formData.payment_method === 'Virement') {
      issues.push({ type: 'info', message: 'Compte bancaire recommandé pour rapprochement' });
    }
    
    setValidationIssues(issues);
  }, [formData]);

  // Apply template on source change
  useEffect(() => {
    const template = TRANSACTION_TEMPLATES[formData.source];
    if (template && !transaction) {
      setFormData(prev => ({
        ...prev,
        ...template,
        description: template.description_template || prev.description
      }));
    }
  }, [formData.source]);

  // Auto-assign compte comptable
  useEffect(() => {
    if (formData.category && NPCG_ACCOUNTS[formData.category]) {
      setFormData(prev => ({
        ...prev,
        compte_comptable: NPCG_ACCOUNTS[formData.category].compte
      }));
    }
  }, [formData.category]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await meras.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url, type: file.type };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData({
        ...formData,
        attachments: [...(formData.attachments || []), ...uploadedFiles],
        document_validated: false
      });
      toast.success(`${uploadedFiles.length} document(s) ajouté(s)`);
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validationIssues.filter(i => i.type === 'error');
    if (errors.length > 0) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      tax_rate: parseFloat(formData.tax_rate) || 0,
      tax_amount: parseFloat(formData.tax_amount) || 0,
      total_amount: parseFloat(formData.total_amount) || parseFloat(formData.amount)
    });
  };

  const criticalIssues = validationIssues.filter(i => i.type === 'error').length;
  const canSubmit = criticalIssues === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Validation Status */}
      {validationIssues.length > 0 && (
        <div className="space-y-2">
          {validationIssues.map((issue, idx) => (
            <div key={idx} className={`p-3 rounded-lg border-2 flex items-start gap-3 ${
              issue.type === 'error' ? 'bg-red-50 border-red-300' :
              issue.type === 'warning' ? 'bg-amber-50 border-amber-300' :
              'bg-blue-50 border-blue-300'
            }`}>
              {issue.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              {issue.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
              {issue.type === 'info' && <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
              <p className="text-sm font-medium">{issue.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date *</Label>
          <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="mt-2" />
        </div>
        <div>
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Revenu">💰 Revenu / Encaissement</SelectItem>
              <SelectItem value="Dépense">💸 Dépense / Décaissement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Source/Financing */}
      <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
        <Label className="font-bold text-purple-900 mb-3 block flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Source de la Transaction *
        </Label>
        <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value, is_financing: ['Apport Capital', 'Prêt Bancaire', 'Remboursement Prêt'].includes(value)})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Manuel">📝 Transaction Standard</SelectItem>
            <SelectItem value="Apport Capital">💎 Apport en Capital</SelectItem>
            <SelectItem value="Prêt Bancaire">🏦 Prêt Bancaire (Déblocage)</SelectItem>
            <SelectItem value="Remboursement Prêt">💳 Remboursement Prêt</SelectItem>
            <SelectItem value="Compte Courant Associé">👤 Compte Courant Associé</SelectItem>
            <SelectItem value="Paie">👥 Paie (Auto)</SelectItem>
            <SelectItem value="Declaration CNSS">📋 Déclaration CNSS (Auto)</SelectItem>
          </SelectContent>
        </Select>

        {formData.source === 'Prêt Bancaire' || formData.source === 'Remboursement Prêt' ? (
          <div className="mt-3">
            <Label>Prêt concerné *</Label>
            <Select value={formData.loan_id} onValueChange={(v) => setFormData({...formData, loan_id: v})}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {loans.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.numero_pret} - {l.banque} ({l.montant_restant?.toLocaleString()} DJF)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {formData.source === 'Apport Capital' || formData.source === 'Compte Courant Associé' ? (
          <div className="mt-3">
            <Label>Associé *</Label>
            <Select value={formData.shareholder_id} onValueChange={(v) => setFormData({...formData, shareholder_id: v})}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {shareholders.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nom} ({s.pourcentage_participation}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div>
        <Label>Description *</Label>
        <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Détails de la transaction..." required className="mt-2" />
      </div>

      <div>
        <Label>Contact (Fournisseur/Client)</Label>
        <Select value={formData.contact_name} onValueChange={(v) => setFormData({...formData, contact_name: v})}>
          <SelectTrigger className="mt-2"><SelectValue placeholder="Optionnel..." /></SelectTrigger>
          <SelectContent>
            {contacts.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Montant HT (DJF) *</Label>
          <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value, total_amount: e.target.value})} required className="mt-2" />
        </div>
        <div>
          <Label>Catégorie</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {Object.keys(NPCG_ACCOUNTS).map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Compte NPCG</Label>
          <Input value={formData.compte_comptable || 'Auto'} readOnly className="mt-2 bg-gray-50 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Méthode de paiement</Label>
          <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Virement">Virement</SelectItem>
              <SelectItem value="Chèque">Chèque</SelectItem>
              <SelectItem value="Espèces">Espèces</SelectItem>
              <SelectItem value="Carte bancaire">Carte</SelectItem>
              <SelectItem value="Mobile Money">Mobile Money</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Compte bancaire</Label>
          <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({...formData, bank_account_id: v})}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Optionnel..." /></SelectTrigger>
            <SelectContent>
              {bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.nom_compte}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>N° Facture</Label>
          <Input value={formData.numero_facture} onChange={(e) => setFormData({...formData, numero_facture: e.target.value})} placeholder="INV-2024-001" className="mt-2" />
        </div>
        <div>
          <Label>Date échéance</Label>
          <Input type="date" value={formData.date_echeance} onChange={(e) => setFormData({...formData, date_echeance: e.target.value})} className="mt-2" />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={formData.is_dette} onChange={(e) => setFormData({...formData, is_dette: e.target.checked})} className="w-4 h-4" />
          <span className="text-sm">Dette fournisseur</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={formData.is_creance} onChange={(e) => setFormData({...formData, is_creance: e.target.checked})} className="w-4 h-4" />
          <span className="text-sm">Créance client</span>
        </label>
      </div>

      <div>
        <Label>Pièces jointes</Label>
        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-600 transition mt-2">
          <Upload className="w-5 h-5" />
          <span className="text-sm">{uploading ? 'Upload...' : 'Ajouter document'}</span>
          <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
        </label>
        {formData.attachments?.map((f, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded mt-2">
            <span className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />{f.name}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setFormData({...formData, attachments: formData.attachments.filter((_, idx) => idx !== i)})}><X className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={!canSubmit} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          {canSubmit ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
          {transaction ? 'Mettre à jour' : 'Créer transaction'}
        </Button>
      </div>
    </form>
  );
}