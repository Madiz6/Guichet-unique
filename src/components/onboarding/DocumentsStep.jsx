import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const REQUIRED_DOCS = [
  { key: 'formulaire_gui_url', label: 'Formulaire unique GUI', desc: 'Formulaire officiel du Guichet Unique d\'Investissement' },
  { key: 'statuts_signes_url', label: 'Statuts de la société signés', desc: 'Statuts originaux signés par tous les associés' },
];

export default function DocumentsStep({ value, onChange }) {
  const docs = value?.docs || {};
  const [uploading, setUploading] = useState({});

  const handleUpload = async (key, file) => {
    setUploading(p => ({ ...p, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange({ docs: { ...docs, [key]: file_url } });
    setUploading(p => ({ ...p, [key]: false }));
    toast.success('Document téléchargé avec succès');
  };

  const allDone = REQUIRED_DOCS.every(d => docs[d.key]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Documents officiels</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Pièces justificatives requises pour l'enregistrement</p>
      </div>

      {allDone && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700">Tous les documents sont téléchargés</p>
            <p className="text-xs text-green-500 mt-0.5">Votre dossier documentaire est complet</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCS.map(doc => (
          <div key={doc.key} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${docs[doc.key] ? 'bg-green-100' : 'bg-[#F5F5F5]'}`}>
                {docs[doc.key] ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <FileText className="w-5 h-5 text-[#9B9B9B]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-medium text-sm text-[#1A1A1A]">{doc.label}</p>
                  <span className="text-xs text-red-500 font-medium">* Obligatoire</span>
                </div>
                <p className="text-xs text-[#6B6B6B]">{doc.desc}</p>
                {docs[doc.key] ? (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Téléchargé</span>
                    <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                      Remplacer <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleUpload(doc.key, e.target.files[0])} />
                    </label>
                  </div>
                ) : (
                  <label className="mt-3 flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all">
                    {uploading[doc.key] ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span className="text-sm text-blue-600">Téléchargement...</span></> : <><Upload className="w-4 h-4 text-[#9B9B9B]" /><span className="text-sm text-[#6B6B6B]">Cliquez pour télécharger (PDF, JPG, PNG)</span></>}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleUpload(doc.key, e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700"><strong>Note :</strong> Ces documents sont requis pour valider votre dossier au Guichet Unique. Formats acceptés : PDF, JPG, PNG.</p>
      </div>
    </div>
  );
}