import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const REQUIRED_DOCS = [
  { key: 'licence_entreprise_url', label: "Licence d'entreprise", required: true },
  { key: 'registre_commerce_url', label: 'Registre de commerce', required: true },
  { key: 'certificat_cnss_url', label: "Certificat d'affiliation CNSS", required: true },
  { key: 'nif_document_url', label: 'NIF (document)', required: true },
];
const OPTIONAL_DOCS = [
  { key: 'patente_url', label: 'Patente (DGI)' },
  { key: 'statut_societe_url', label: 'Statut de la société' },
  { key: 'contrat_bail_url', label: 'Contrat de bail' },
  { key: 'immatriculation_cnss_url', label: 'Immatriculation CNSS' },
];

export default function DocumentsStep({ value, onChange }) {
  const docs = value?.docs || {};
  const customDocs = value?.custom_docs || [];
  const [uploading, setUploading] = useState({});
  const [newDocTitle, setNewDocTitle] = useState('');

  const handleUpload = async (key, file) => {
    setUploading(p => ({ ...p, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newDocs = { ...docs, [key]: file_url };
    onChange({ docs: newDocs, custom_docs: customDocs });
    setUploading(p => ({ ...p, [key]: false }));
    toast.success('Document téléchargé');
  };

  const addCustomDoc = () => {
    if (!newDocTitle.trim()) return;
    const key = `custom_${Date.now()}`;
    onChange({ docs, custom_docs: [...customDocs, { key, label: newDocTitle }] });
    setNewDocTitle('');
  };

  const DocRow = ({ docKey, label, required }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white">
      <div className="flex items-center gap-3">
        {docs[docKey] ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${required ? 'border-red-400' : 'border-[#D1D5DB]'}`} />}
        <span className="text-sm text-[#1A1A1A]">{label}{required && <span className="text-red-500 ml-1">*</span>}</span>
      </div>
      <label className="cursor-pointer">
        {uploading[docKey] ? <Loader2 className="w-4 h-4 animate-spin text-[#6B6B6B]" /> : (
          <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Upload className="w-3 h-3" />{docs[docKey] ? 'Changer' : 'Télécharger'}
          </span>
        )}
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => e.target.files[0] && handleUpload(docKey, e.target.files[0])}
          disabled={!!uploading[docKey]}
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Documents officiels</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Pièces justificatives requises pour l'enregistrement</p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">Documents obligatoires</p>
        <div className="space-y-2">
          {REQUIRED_DOCS.map(d => <DocRow key={d.key} docKey={d.key} label={d.label} required />)}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[#1A1A1A] mb-3">Documents optionnels</p>
        <div className="space-y-2">
          {OPTIONAL_DOCS.map(d => <DocRow key={d.key} docKey={d.key} label={d.label} />)}
          {customDocs.map(d => <DocRow key={d.key} docKey={d.key} label={d.label} />)}
        </div>
      </div>

      <div className="flex gap-2">
        <Input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="Titre du document personnalisé" className="text-sm" onKeyDown={e => e.key === 'Enter' && addCustomDoc()} />
        <Button onClick={addCustomDoc} variant="outline" className="shrink-0"><Plus className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}