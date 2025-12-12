import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
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
  'Miscellaneous Expenses'
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
    attachments: []
  });
  const [uploading, setUploading] = useState(false);

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
      total_amount: parseFloat(formData.total_amount) || parseFloat(formData.amount)
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
        <Input
          value={formData.contact_name}
          onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
          placeholder={formData.type === 'Revenu' ? 'Ex: ABC Company' : 'Ex: XYZ Supplies'}
          className="mt-2"
        />
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
          <Label>Catégorie</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Sélectionner une catégorie..." />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div>
        <Label>Pièces jointes</Label>
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