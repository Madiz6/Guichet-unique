import React, { useState } from 'react';
import { meras } from '@/components/core/MerasClient';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const FIELDS = [
  { key: 'nom_entreprise', label: 'Nom de l\'entreprise', required: true },
  { key: 'nif', label: 'NIF (Numéro d\'Identification Fiscale)', required: true },
  { key: 'numero_affiliation', label: 'N° Affiliation CNSS', required: true },
  { key: 'raison_sociale', label: 'Raison sociale' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'activite', label: 'Activité principale' },
  { key: 'capital_social', label: 'Capital social (DJF)', type: 'number' },
  { key: 'date_creation', label: 'Date de création', type: 'date' },
];

const DOCS = [
  { key: 'licence_entreprise_url', label: 'Licence d\'entreprise' },
  { key: 'registre_commerce_url', label: 'Registre de commerce' },
  { key: 'certificat_cnss_url', label: 'Certificat d\'affiliation CNSS' },
  { key: 'patente_url', label: 'Patente (DGI)' },
  { key: 'statut_societe_url', label: 'Statut de la société' },
];

export default function ExistingCompanySetup({ onBack, onSuccess }) {
  const [form, setForm] = useState({});
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('info'); // 'info' | 'docs'

  const handleChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleUpload = async (key, file) => {
    setUploading(p => ({ ...p, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDocs(p => ({ ...p, [key]: file_url }));
    setUploading(p => ({ ...p, [key]: false }));
    toast.success('Document téléchargé');
  };

  const handleNext = () => {
    if (!form.nom_entreprise || !form.nif || !form.numero_affiliation) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setStep('docs');
  };

  const handleSubmit = async () => {
    setSaving(true);
    await meras.entities.Company.create({ ...form, ...docs });
    setSaving(false);
    toast.success('Entreprise configurée avec succès !');
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="font-semibold text-[#1A1A1A]">Configurer mon Entreprise</h1>
          <p className="text-xs text-[#6B6B6B]">Étape {step === 'info' ? '1' : '2'} / 2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-3">
        <div className="flex gap-4">
          {['Informations', 'Documents'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                (step === 'info' && i === 0) || (step === 'docs' && i === 1)
                  ? 'bg-[#1A1A1A] text-white'
                  : step === 'docs' && i === 0 ? 'bg-green-600 text-white' : 'bg-[#F5F5F5] text-[#9B9B9B]'
              }`}>
                {step === 'docs' && i === 0 ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${step === 'info' && i === 0 || step === 'docs' && i === 1 ? 'font-medium text-[#1A1A1A]' : 'text-[#9B9B9B]'}`}>{s}</span>
              {i < 1 && <div className="w-12 h-px bg-[#E5E7EB]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        {step === 'info' && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Informations de l'Entreprise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {FIELDS.map(f => (
                <div key={f.key} className={f.key === 'adresse' || f.key === 'activite' ? 'md:col-span-2' : ''}>
                  <Label className="text-sm font-medium text-[#1A1A1A]">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    type={f.type || 'text'}
                    value={form[f.key] || ''}
                    onChange={e => handleChange(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                    className="mt-1"
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNext} className="bg-[#1A1A1A] hover:bg-[#333] text-white px-8">
                Suivant →
              </Button>
            </div>
          </div>
        )}

        {step === 'docs' && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">Documents de l'Entreprise</h2>
            <p className="text-sm text-[#6B6B6B] mb-6">Téléchargez les documents officiels de votre entreprise. Vous pourrez en ajouter d'autres plus tard.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {DOCS.map(d => (
                <div key={d.key} className="border border-[#E5E7EB] rounded-xl p-4 bg-white">
                  <p className="text-sm font-medium text-[#1A1A1A] mb-3">{d.label}</p>
                  {docs[d.key] ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs">Téléchargé</span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-4 cursor-pointer hover:border-[#1A1A1A] hover:bg-[#FAFAFA] transition-all">
                      <Upload className="w-5 h-5 text-[#9B9B9B] mb-1" />
                      <span className="text-xs text-[#9B9B9B]">{uploading[d.key] ? 'Téléchargement...' : 'Cliquez pour télécharger'}</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => e.target.files[0] && handleUpload(d.key, e.target.files[0])}
                        disabled={uploading[d.key]}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('info')}>← Retour</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#1A1A1A] hover:bg-[#333] text-white px-8">
                {saving ? 'Enregistrement...' : 'Terminer la configuration'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}