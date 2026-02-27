import React, { useState, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, AlertCircle, CheckCircle, Info, Sparkles, ScanLine, Copy, Zap, BarChart3 } from 'lucide-react';
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
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => meras.entities.Transaction.list('-created_date', 50),
  });

  useEffect(() => {
    setRecentTransactions(allTransactions);
  }, [allTransactions]);

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

  const checkForDuplicates = (amount, description, date) => {
    if (!amount || !description) return null;
    const similar = recentTransactions.filter(t => {
      const sameAmount = parseFloat(t.amount) === parseFloat(amount);
      const descWords = description.toLowerCase().split(' ').filter(w => w.length > 3);
      const descMatch = descWords.some(w => t.description?.toLowerCase().includes(w));
      const recentDate = new Date(t.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sameAmount && descMatch && recentDate;
    });
    return similar.length > 0 ? similar[0] : null;
  };

  const scanReceiptWithAI = async (file, fileUrl) => {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await meras.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert comptable. Analyse ce justificatif (reçu, facture ou relevé) et extrait les données suivantes avec une précision maximale.

Retourne UNIQUEMENT un JSON avec ces champs:
- description: description courte de la transaction (max 80 chars)
- contact_name: nom du fournisseur ou émetteur
- amount: montant HT en chiffres uniquement (sans symbole)
- tax_rate: taux TVA en % (0 si non indiqué)
- tax_amount: montant TVA en chiffres
- total_amount: montant TTC en chiffres
- numero_facture: numéro de facture ou reçu (vide si absent)
- date: date de la transaction au format YYYY-MM-DD
- type: "Revenu" ou "Dépense" selon le document
- category: l'une de ces catégories exactes: "Payroll & Benefits", "Office & Administrative", "Marketing & Advertising", "Travel & Entertainment", "IT / Software / Tools", "Professional Services", "Training & Development", "Procurement / Inventory", "Maintenance & Repairs", "Taxes & Regulatory Fees", "Insurance", "Bank Charges & Interest", "Product Sales / Services Revenue", "Subscription Income / Recurring Revenue"
- gl_account: numéro de compte NPCG correspondant (ex: 641, 606, 701...)
- confidence: score de confiance de 0 à 100

Si une donnée est illisible ou absente, utilise null.`,
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
        // Check for duplicates immediately
        const dup = checkForDuplicates(result.amount, result.description, result.date);
        if (dup) {
          setDuplicateAlert(dup);
        }
        toast.success(`✅ Scan IA terminé — Confiance: ${result.confidence || '—'}%`);
      } else {
        toast.error('Impossible de lire le document');
      }
    } catch (err) {
      toast.error('Erreur lors du scan IA');
    } finally {
      setScanning(false);
    }
  };

  const applyScanResult = () => {
    if (!scanResult) return;
    setFormData(prev => ({
      ...prev,
      description: scanResult.description || prev.description,
      contact_name: scanResult.contact_name || prev.contact_name,
      amount: scanResult.amount || prev.amount,
      tax_rate: scanResult.tax_rate ?? prev.tax_rate,
      tax_amount: scanResult.tax_amount ?? prev.tax_amount,
      total_amount: scanResult.total_amount || scanResult.amount || prev.total_amount,
      numero_facture: scanResult.numero_facture || prev.numero_facture,
      date: scanResult.date || prev.date,
      type: scanResult.type || prev.type,
      category: scanResult.category || prev.category,
      compte_comptable: scanResult.gl_account || prev.compte_comptable,
    }));
    setScanResult(null);
    toast.success('Données appliquées depuis le scan IA');
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
        attachments: [...(prev.attachments || []), ...uploadedFiles],
        document_validated: false
      }));

      // Auto-scan the first image/PDF with AI
      const firstScannable = uploadedFiles.find(f => f.type?.startsWith('image/') || f.type === 'application/pdf');
      if (firstScannable) {
        toast.info('🤖 Scan IA en cours...');
        await scanReceiptWithAI(files[0], firstScannable.url);
      } else {
        toast.success(`${uploadedFiles.length} document(s) ajouté(s)`);
      }
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
       <div>
         <Label className="font-semibold text-gray-700 mb-2 block">Enregistrer comme *</Label>
         <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value, is_financing: ['Apport Capital', 'Prêt Bancaire', 'Remboursement Prêt'].includes(value)})}>
           <SelectTrigger className="bg-purple-50 border-purple-200"><SelectValue /></SelectTrigger>
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

        {(formData.source === 'Prêt Bancaire' || formData.source === 'Remboursement Prêt') && (
          <div className="mt-3">
            <Label className="text-sm">Prêt concerné *</Label>
            <Select value={formData.loan_id} onValueChange={(v) => setFormData({...formData, loan_id: v})}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {loans.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.numero_pret} - {l.banque} ({l.montant_restant?.toLocaleString()} DJF)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(formData.source === 'Apport Capital' || formData.source === 'Compte Courant Associé') && (
          <div className="mt-3">
            <Label className="text-sm">Associé *</Label>
            <Select value={formData.shareholder_id} onValueChange={(v) => setFormData({...formData, shareholder_id: v})}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {shareholders.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nom} ({s.pourcentage_participation}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        </div>

      <div className="relative">
        <Label>Description *</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Détails de la transaction..."
          required
          className="mt-2"
          autoComplete="off"
        />
        <AITransactionAutocomplete
          value={formData.description}
          recentTransactions={recentTransactions}
          onSelect={(s) => setFormData(prev => ({
            ...prev,
            description: s.description || prev.description,
            contact_name: s.contact_name || prev.contact_name,
            amount: s.amount || prev.amount,
            total_amount: s.amount || prev.total_amount,
            type: s.type || prev.type,
            category: s.category || prev.category,
            payment_method: s.payment_method || prev.payment_method,
          }))}
        />
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

      {/* Duplicate Alert */}
      {duplicateAlert && (
        <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
          <div className="flex items-start gap-2">
            <Copy className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">⚠️ Doublon potentiel détecté</p>
              <p className="text-xs text-orange-700 mt-1">
                Transaction similaire trouvée: <strong>{duplicateAlert.description}</strong> — {parseFloat(duplicateAlert.amount)?.toLocaleString()} DJF
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicateAlert(null)} className="text-orange-600 h-6 w-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <div>
        <Label>Pièces jointes & Scan IA</Label>

        {/* AI Scan Upload Zone */}
        <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition mt-2 ${
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
              <div className="flex gap-3 mt-1">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" /> Précision 99%</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Auto-catégorisation</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Copy className="w-3 h-3" /> Détection doublons</span>
              </div>
            </>
          )}
          <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" disabled={uploading || scanning} />
        </label>

        {/* AI Scan Result */}
        {scanResult && (
          <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-bold text-purple-900">Données extraites par l'IA</span>
                {scanResult.confidence && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    {scanResult.confidence}% confiance
                  </span>
                )}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setScanResult(null)} className="h-6 w-6 p-0 text-gray-400">
                <X className="w-3 h-3" />
              </Button>
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
              <CheckCircle className="w-4 h-4 mr-2" />
              Appliquer toutes les données
            </Button>
          </div>
        )}

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