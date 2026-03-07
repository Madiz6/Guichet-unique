import React, { useState, useEffect, useMemo } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileText, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ENHANCED_CATEGORIES } from '../financials/AccountingCategoryMaster';
import useBehavioralSuggestions from './useBehavioralSuggestions';
import SmartSuggestionBanner from './SmartSuggestionBanner';

export default function TransactionWizard({ transaction, onSubmit, onCancel, allTransactions = [] }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(transaction || {
    date: new Date().toISOString().split('T')[0],
    description: '',
    contact_name: '',
    amount: '',
    total_amount: '',
    type: 'Dépense',
    source: 'Manuel',
    category: '',
    payment_method: 'Virement',
    status: 'En attente',
    attachments: [],
    numero_facture: '',
    date_echeance: '',
    is_creance: false,
    is_dette: false,
    is_financing: false,
    accounting_period: new Date().toISOString().slice(0, 7).replace('-', '')
  });
  const [uploading, setUploading] = useState(false);
  const [dismissedFields, setDismissedFields] = useState([]);

  // ── Behavioral learning engine ──
  const { suggest } = useBehavioralSuggestions(allTransactions);

  const rawSuggestions = useMemo(() => suggest({
    contact_name: formData.contact_name,
    category: formData.category,
    source: formData.source,
    description: formData.description,
    type: formData.type,
  }), [formData.contact_name, formData.category, formData.source, formData.description, formData.type]);

  // Only show suggestions for fields not yet filled and not dismissed
  const activeSuggestions = useMemo(() => {
    const fieldMeta = {
      department:     'Département',
      category:       'Catégorie',
      payment_method: 'Paiement',
    };
    return Object.entries(rawSuggestions)
      .filter(([field, s]) =>
        s &&
        !formData[field] &&          // field is empty
        !dismissedFields.includes(field) &&
        s.confidence >= 0.25
      )
      .map(([field, s]) => ({ field, label: fieldMeta[field], ...s }));
  }, [rawSuggestions, formData, dismissedFields]);

  const handleAcceptSuggestion = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    toast.success(`${field === 'department' ? 'Département' : field} appliqué automatiquement ✓`);
  };

  const handleDismissSuggestion = (field) => {
    setDismissedFields(prev => [...prev, field]);
  };

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

  useEffect(() => {
    const allCategories = [...ENHANCED_CATEGORIES.REVENUS, ...ENHANCED_CATEGORIES.DEPENSES];
    const selectedCat = allCategories.find(c => c.value === formData.category);
    if (selectedCat?.npcg) {
      setFormData(prev => ({
        ...prev,
        compte_comptable: selectedCat.npcg
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
        attachments: [...(formData.attachments || []), ...uploadedFiles]
      });
      toast.success(`${uploadedFiles.length} document(s) ajouté(s)`);
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.type && formData.source;
    if (step === 2) return formData.description && formData.amount;
    if (step === 3) return true;
    if (step === 4) return formData.type === 'Revenu' || formData.attachments?.length > 0;
    return true;
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      total_amount: parseFloat(formData.total_amount) || parseFloat(formData.amount)
    });
  };

  const steps = [
    { number: 1, title: 'Type & Source', icon: '🎯' },
    { number: 2, title: 'Détails', icon: '📝' },
    { number: 3, title: 'Comptabilité', icon: '📊' },
    { number: 4, title: 'Documents', icon: '📎' }
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, idx) => (
          <React.Fragment key={s.number}>
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                step > s.number ? 'bg-green-500 text-white' :
                step === s.number ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > s.number ? <CheckCircle className="w-6 h-6" /> : s.icon}
              </div>
              <p className={`text-xs mt-2 font-medium ${step === s.number ? 'text-blue-600' : 'text-gray-500'}`}>
                {s.title}
              </p>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 transition-all ${step > s.number ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Type de transaction</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${formData.type === 'Revenu' ? 'border-2 border-green-500 bg-green-50' : 'border-2 border-gray-200'}`}
                  onClick={() => setFormData({...formData, type: 'Revenu'})}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">💰</div>
                    <h4 className="font-bold text-lg">Revenu</h4>
                    <p className="text-sm text-gray-600">Encaissement, vente, prêt</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${formData.type === 'Dépense' ? 'border-2 border-red-500 bg-red-50' : 'border-2 border-gray-200'}`}
                  onClick={() => setFormData({...formData, type: 'Dépense'})}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">💸</div>
                    <h4 className="font-bold text-lg">Dépense</h4>
                    <p className="text-sm text-gray-600">Décaissement, achat, paiement</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-lg font-bold mb-3 block">Source de la transaction</Label>
                <Select value={formData.source} onValueChange={(v) => {
                  const isFinancing = ['Apport Capital', 'Prêt Bancaire', 'Remboursement Prêt', 'Compte Courant Associé'].includes(v);
                  setFormData({...formData, source: v, is_financing: isFinancing});
                }}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manuel">📝 Transaction Standard</SelectItem>
                    <SelectItem value="Apport Capital">💎 Apport en Capital (101)</SelectItem>
                    <SelectItem value="Prêt Bancaire">🏦 Prêt Bancaire - Déblocage (164)</SelectItem>
                    <SelectItem value="Remboursement Prêt">💳 Remboursement Prêt (164)</SelectItem>
                    <SelectItem value="Compte Courant Associé">👤 Compte Courant Associé</SelectItem>
                    <SelectItem value="Paie">👥 Paie (Auto)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.source !== 'Manuel' && (
                  <p className="text-xs text-blue-600 mt-2">✨ Template appliqué automatiquement</p>
                )}
              </div>

              {(formData.source === 'Prêt Bancaire' || formData.source === 'Remboursement Prêt') && (
                <div>
                  <Label>Prêt concerné *</Label>
                  <Select value={formData.loan_id} onValueChange={(v) => setFormData({...formData, loan_id: v})}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {loans.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.numero_pret} - {l.banque}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(formData.source === 'Apport Capital' || formData.source === 'Compte Courant Associé') && (
                <div>
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
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Détails de la transaction</h3>

              {/* AI Smart Suggestions */}
              <SmartSuggestionBanner
                suggestions={activeSuggestions}
                onAccept={handleAcceptSuggestion}
                onDismiss={handleDismissSuggestion}
              />

              <div>
                <Label>Date *</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="mt-2" />
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="Ex: Achat fournitures de bureau, Paiement client ABC..." 
                  required 
                  className="mt-2 h-24"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant (DJF) *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value, total_amount: e.target.value})} 
                    required 
                    className="mt-2 text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Méthode de paiement</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Virement">Virement</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loan-specific fields */}
              {formData.source === 'Remboursement Prêt' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
                  <p className="text-sm font-semibold text-purple-800">🏦 Détails du remboursement</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Capital remboursé (DJF)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.loan_capital_amount || ''}
                        onChange={(e) => {
                          const capital = parseFloat(e.target.value) || 0;
                          const interest = parseFloat(formData.loan_interest_amount) || 0;
                          setFormData({...formData, loan_capital_amount: e.target.value, amount: capital + interest, total_amount: capital + interest});
                        }}
                        placeholder="Ex: 80000"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Intérêts (DJF)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.loan_interest_amount || ''}
                        onChange={(e) => {
                          const interest = parseFloat(e.target.value) || 0;
                          const capital = parseFloat(formData.loan_capital_amount) || 0;
                          setFormData({...formData, loan_interest_amount: e.target.value, amount: capital + interest, total_amount: capital + interest});
                        }}
                        placeholder="Ex: 5000"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  {(formData.loan_capital_amount || formData.loan_interest_amount) && (
                    <div className="flex justify-between text-sm p-2 bg-white rounded border border-purple-200">
                      <span className="text-purple-700">Total mensualité:</span>
                      <strong className="text-purple-900">{((parseFloat(formData.loan_capital_amount)||0) + (parseFloat(formData.loan_interest_amount)||0)).toLocaleString()} DJF</strong>
                    </div>
                  )}
                  <p className="text-xs text-purple-600">Le capital sera imputé sur 164-Emprunts, les intérêts sur 661-Charges d'intérêts</p>
                </div>
              )}

              {formData.source === 'Prêt Bancaire' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-1">🏦 Prêt bancaire reçu</p>
                  <p className="text-xs text-blue-600">Écriture: Débit 512-Banque / Crédit 164-Emprunts — le montant sera le déblocage total reçu</p>
                </div>
              )}

              {formData.source === 'Apport Capital' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">💼 Apport en capital</p>
                  <p className="text-xs text-emerald-600">Écriture: Débit 512-Banque / Crédit 101-Capital social</p>
                </div>
              )}

              {formData.source === 'Compte Courant Associé' && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                  <p className="text-sm font-semibold text-violet-800 mb-1">👤 Compte courant associé</p>
                  <p className="text-xs text-violet-600">Écriture: Débit 512-Banque / Crédit 455-Associés comptes courants</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Informations comptables
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie (Plan NPCG)</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent className="max-h-96">
                      {formData.type === 'Revenu' ? (
                        <>
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500">PRODUITS D'EXPLOITATION (706)</div>
                          {ENHANCED_CATEGORIES.REVENUS.filter(c => c.npcg === '706').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">PRODUITS FINANCIERS (762)</div>
                          {ENHANCED_CATEGORIES.REVENUS.filter(c => c.npcg === '762').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">FINANCEMENT</div>
                          {ENHANCED_CATEGORIES.REVENUS.filter(c => c.npcg === '101' || c.npcg === '164').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </>
                      ) : (
                        <>
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500">FOURNITURES (606)</div>
                          {ENHANCED_CATEGORIES.DEPENSES.filter(c => c.npcg === '606').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">SERVICES EXTÉRIEURS (611-628)</div>
                          {ENHANCED_CATEGORIES.DEPENSES.filter(c => ['611', '613', '615', '616', '617', '621', '622', '623', '626', '627'].includes(c.npcg)).map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">IMPÔTS (635)</div>
                          {ENHANCED_CATEGORIES.DEPENSES.filter(c => c.npcg === '635').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">PERSONNEL (641)</div>
                          {ENHANCED_CATEGORIES.DEPENSES.filter(c => c.npcg === '641').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-bold text-gray-500 mt-2">CHARGES FINANCIÈRES (661, 164)</div>
                          {ENHANCED_CATEGORIES.DEPENSES.filter(c => c.npcg === '661' || c.npcg === '164').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compte NPCG (Auto)</Label>
                  <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="font-mono font-bold text-purple-900">
                      {formData.compte_comptable || '---'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>N° Facture</Label>
                  <Input value={formData.numero_facture} onChange={(e) => setFormData({...formData, numero_facture: e.target.value})} placeholder="INV-2024-001" className="mt-2" />
                </div>
                <div>
                  <Label>Date d'échéance</Label>
                  <Input type="date" value={formData.date_echeance} onChange={(e) => setFormData({...formData, date_echeance: e.target.value})} className="mt-2" />
                </div>
              </div>

              <div>
                <Label>Compte bancaire</Label>
                <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({...formData, bank_account_id: v})}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Optionnel..." /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.nom_compte} - {b.devise}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_dette} onChange={(e) => setFormData({...formData, is_dette: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm font-medium">Dette fournisseur</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_creance} onChange={(e) => setFormData({...formData, is_creance: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm font-medium">Créance client</span>
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Documents justificatifs</h3>

              {formData.type === 'Dépense' && (!formData.attachments || formData.attachments.length === 0) && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 mb-1">Document requis</p>
                    <p className="text-sm text-amber-800">
                      Toute dépense doit avoir un justificatif (facture, reçu) pour conformité NPCG
                    </p>
                  </div>
                </div>
              )}

              <label className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-600 transition bg-blue-50">
                <Upload className="w-12 h-12 text-blue-600" />
                <div className="text-center">
                  <p className="font-bold text-blue-900">{uploading ? 'Upload en cours...' : 'Cliquer pour ajouter documents'}</p>
                  <p className="text-sm text-blue-700">Factures, reçus, contrats...</p>
                </div>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>

              {formData.attachments?.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-bold">Documents ajoutés ({formData.attachments.length})</Label>
                  {formData.attachments.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 border border-green-300 rounded-lg">
                      <span className="text-sm flex items-center gap-2 font-medium">
                        <FileText className="w-4 h-4 text-green-600" />
                        {f.name}
                      </span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setFormData({...formData, attachments: formData.attachments.filter((_, idx) => idx !== i)})}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button type="button" variant="outline" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          {step === 1 ? 'Annuler' : <><ChevronLeft className="w-4 h-4 mr-2" />Précédent</>}
        </Button>
        {step < 4 ? (
          <Button type="button" onClick={() => setStep(step + 1)} disabled={!canProceed()} className="bg-blue-600">
            Suivant<ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={!canProceed()} className="bg-gradient-to-r from-green-600 to-emerald-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Créer transaction
          </Button>
        )}
      </div>
    </div>
  );
}