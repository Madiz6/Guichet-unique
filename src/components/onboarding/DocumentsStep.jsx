import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, X, Plus, FileText, Loader2, Eye, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const REQUIRED_DOCS = [
  { key: 'licence_entreprise_url', label: 'Licence d\'entreprise', required: true, hint: 'Licence commerciale délivrée par l\'APIJE' },
  { key: 'registre_commerce_url', label: 'Registre de commerce (ODPIC)', required: true, hint: 'Extrait K-bis ou équivalent' },
  { key: 'certificat_cnss_url', label: 'Certificat d\'affiliation CNSS', required: true, hint: 'Numéro d\'affiliation CNSS' },
  { key: 'nif_document_url', label: 'NIF — Numéro d\'Identification Fiscale', required: true, hint: 'Document DGI' },
  { key: 'patente_url', label: 'Patente (DGI)', required: false, hint: 'Taxe professionnelle annuelle' },
  { key: 'statut_societe_url', label: 'Statuts de la société', required: false, hint: 'Statuts signés et certifiés' },
  { key: 'contrat_bail_url', label: 'Contrat de bail / domiciliation', required: false, hint: 'Preuve de domiciliation' },
  { key: 'immatriculation_cnss_url', label: 'Immatriculation CNSS', required: false, hint: 'Pour les entreprises avec employés' },
];

function DocUploadCard({ doc, value, onUpload, onRemove, uploading }) {
  return (
    <div className={`border rounded-xl p-4 transition-all ${value ? 'border-green-300 bg-green-50/50' : doc.required ? 'border-orange-200 bg-orange-50/30' : 'border-[#E5E7EB] bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-[#1A1A1A] text-sm">{doc.label}</p>
            {doc.required && <Badge className="text-xs bg-orange-100 text-orange-700 border-0 px-2 py-0">Requis</Badge>}
          </div>
          <p className="text-xs text-[#9B9B9B] mt-0.5">{doc.hint}</p>
        </div>
        {value && (
          <button onClick={onRemove} className="p-1.5 hover:bg-red-100 rounded-lg text-[#9B9B9B] hover:text-red-600 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {value ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-sm text-green-700 flex-1 truncate">Document téléchargé</span>
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <Eye className="w-3 h-3" /> Voir
          </a>
        </div>
      ) : (
        <label className="flex items-center gap-3 border border-dashed border-[#E5E7EB] rounded-lg p-3 cursor-pointer hover:border-[#1A1A1A] transition-colors group">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#6B6B6B] shrink-0" />
          ) : (
            <Upload className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors shrink-0" />
          )}
          <span className="text-sm text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors">
            {uploading ? 'Téléchargement en cours…' : 'PDF, JPG ou PNG — Cliquez pour télécharger'}
          </span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => e.target.files[0] && onUpload(e.target.files[0])}
            disabled={uploading} />
        </label>
      )}
    </div>
  );
}

export default function DocumentsStep({ value = {}, onChange }) {
  const [docs, setDocs] = useState(value.docs || {});
  const [uploading, setUploading] = useState({});
  const [customDocs, setCustomDocs] = useState(value.custom_docs || []);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [customUploading, setCustomUploading] = useState({});

  const uploadDoc = async (key, file) => {
    setUploading(p => ({ ...p, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = { ...docs, [key]: file_url };
    setDocs(updated);
    setUploading(p => ({ ...p, [key]: false }));
    onChange({ docs: updated, custom_docs: customDocs });
    toast.success('Document téléchargé');
  };

  const removeDoc = (key) => {
    const updated = { ...docs };
    delete updated[key];
    setDocs(updated);
    onChange({ docs: updated, custom_docs: customDocs });
  };

  const uploadCustomDoc = async (index, file) => {
    setCustomUploading(p => ({ ...p, [index]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = customDocs.map((d, i) => i === index ? { ...d, file_url } : d);
    setCustomDocs(updated);
    setCustomUploading(p => ({ ...p, [index]: false }));
    onChange({ docs, custom_docs: updated });
    toast.success('Document téléchargé');
  };

  const addCustomDoc = () => {
    if (!newDocTitle.trim()) return;
    const updated = [...customDocs, { title: newDocTitle.trim(), file_url: null }];
    setCustomDocs(updated);
    onChange({ docs, custom_docs: updated });
    setNewDocTitle('');
  };

  const removeCustomDoc = (i) => {
    const updated = customDocs.filter((_, idx) => idx !== i);
    setCustomDocs(updated);
    onChange({ docs, custom_docs: updated });
  };

  const requiredCount = REQUIRED_DOCS.filter(d => d.required).length;
  const uploadedRequired = REQUIRED_DOCS.filter(d => d.required && docs[d.key]).length;
  const allRequiredDone = uploadedRequired === requiredCount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Téléchargements de documents</h3>
            <p className="text-white/70 text-sm">Téléchargez tous les documents requis pour continuer</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 bg-white/20 rounded-full h-1.5 mr-3">
            <div className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(uploadedRequired / requiredCount) * 100}%` }} />
          </div>
          <span className="text-white/80 text-xs shrink-0">{uploadedRequired}/{requiredCount} documents requis</span>
        </div>
      </div>

      {!allRequiredDone && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-amber-700 text-sm">
            {requiredCount - uploadedRequired} document(s) requis manquant(s). Téléchargez-les pour continuer.
          </p>
        </div>
      )}
      {allRequiredDone && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">Tous les documents requis ont été téléchargés !</p>
        </div>
      )}

      {/* Required & Optional docs */}
      <div>
        <h4 className="font-semibold text-[#1A1A1A] text-sm mb-3">Documents officiels</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REQUIRED_DOCS.map(doc => (
            <DocUploadCard
              key={doc.key}
              doc={doc}
              value={docs[doc.key]}
              uploading={uploading[doc.key]}
              onUpload={file => uploadDoc(doc.key, file)}
              onRemove={() => removeDoc(doc.key)}
            />
          ))}
        </div>
      </div>

      {/* Custom documents */}
      <div>
        <h4 className="font-semibold text-[#1A1A1A] text-sm mb-3">Documents supplémentaires</h4>
        <div className="space-y-2 mb-3">
          {customDocs.map((cd, i) => (
            <div key={i} className={`border rounded-xl p-4 ${cd.file_url ? 'border-green-300 bg-green-50/50' : 'border-[#E5E7EB]'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-[#1A1A1A] text-sm">{cd.title}</p>
                <button onClick={() => removeCustomDoc(i)} className="p-1.5 hover:bg-red-100 rounded-lg text-[#9B9B9B] hover:text-red-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {cd.file_url ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 flex-1">Document téléchargé</span>
                  <a href={cd.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Voir
                  </a>
                </div>
              ) : (
                <label className="flex items-center gap-3 border border-dashed border-[#E5E7EB] rounded-lg p-3 cursor-pointer hover:border-[#1A1A1A] transition-colors">
                  {customUploading[i] ? <Loader2 className="w-4 h-4 animate-spin text-[#6B6B6B]" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
                  <span className="text-sm text-[#9B9B9B]">{customUploading[i] ? 'Téléchargement…' : 'Cliquez pour télécharger'}</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => e.target.files[0] && uploadCustomDoc(i, e.target.files[0])}
                    disabled={customUploading[i]} />
                </label>
              )}
            </div>
          ))}
        </div>

        {/* Add custom doc */}
        <div className="flex gap-2">
          <Input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomDoc()}
            placeholder="Titre du document (ex: Certificat médical…)"
            className="flex-1 text-sm" />
          <Button onClick={addCustomDoc} size="sm" variant="outline" disabled={!newDocTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}