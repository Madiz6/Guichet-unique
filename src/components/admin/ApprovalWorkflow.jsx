import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Upload, Loader2, Lock, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  {
    id: 'odpic',
    label: 'ODPIC',
    fullLabel: 'Office Djiboutien de la Propriété Industrielle et Commerciale',
    color: 'blue',
    description: 'Vérifier la disponibilité du nom commercial et délivrer le récépissé d\'immatriculation.',
    reviewDocs: ['Formulaire GUI', 'Statuts signés', 'Pièce identité représentant'],
    uploadDocs: [
      { key: 'odpic_recepisse_url', label: 'Récépissé d\'immatriculation ODPIC' },
      { key: 'odpic_certificat_url', label: 'Certificat de disponibilité du nom' },
    ],
  },
  {
    id: 'dgi',
    label: 'DGI',
    fullLabel: 'Direction Générale des Impôts',
    color: 'purple',
    description: 'Attribuer le NIF et délivrer la patente fiscale.',
    reviewDocs: ['Récépissé ODPIC', 'Statuts', 'Contrat de bail'],
    uploadDocs: [
      { key: 'dgi_nif_url', label: 'Attestation NIF' },
      { key: 'dgi_patente_url', label: 'Patente fiscale' },
    ],
  },
  {
    id: 'cnss',
    label: 'CNSS',
    fullLabel: 'Caisse Nationale de Sécurité Sociale',
    color: 'green',
    description: 'Enregistrer l\'entreprise et délivrer le certificat d\'affiliation CNSS.',
    reviewDocs: ['NIF DGI', 'Liste des employés', 'Statuts'],
    uploadDocs: [
      { key: 'cnss_affiliation_url', label: 'Certificat d\'affiliation CNSS' },
      { key: 'cnss_immatriculation_url', label: 'Immatriculation CNSS' },
    ],
  },
];

const COLOR = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: 'text-green-600', btn: 'bg-green-600 hover:bg-green-700' },
};

function StepPanel({ step, wfState, isUnlocked, onApprove }) {
  const [uploading, setUploading] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState(wfState?.uploaded_docs || {});
  const [comment, setComment] = useState(wfState?.comment || '');
  const [saving, setSaving] = useState(false);

  const cols = COLOR[step.color];
  const isApproved = wfState?.approved;
  const allDocsUploaded = step.uploadDocs.every(d => uploadedDocs[d.key]);

  const handleUpload = async (file, key) => {
    setUploading(p => ({ ...p, [key]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedDocs(p => ({ ...p, [key]: file_url }));
      toast.success('Document téléchargé');
    } catch {
      toast.error('Erreur de téléchargement');
    }
    setUploading(p => ({ ...p, [key]: false }));
  };

  const handleApprove = async () => {
    if (!allDocsUploaded) {
      toast.error('Veuillez télécharger tous les documents requis avant de valider.');
      return;
    }
    setSaving(true);
    await onApprove(step.id, { approved: true, uploaded_docs: uploadedDocs, comment, approved_at: new Date().toISOString() });
    setSaving(false);
  };

  if (!isUnlocked && !isApproved) {
    return (
      <div className={`border rounded-xl p-4 opacity-50`}>
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-[#9B9B9B]" />
          <span className="font-semibold text-sm text-[#6B6B6B]">{step.label} — {step.fullLabel}</span>
          <span className="text-xs text-[#9B9B9B] ml-auto">Étape précédente requise</span>
        </div>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className={`${cols.bg} ${cols.border} border rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`w-5 h-5 ${cols.icon}`} />
          <div>
            <p className="font-semibold text-sm">{step.label} — {step.fullLabel}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Validé {wfState.approved_at ? `le ${new Date(wfState.approved_at).toLocaleDateString('fr-FR')}` : ''}</p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            {Object.entries(wfState.uploaded_docs || {}).filter(([, url]) => url).map(([k, url]) => (
              <a key={k} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <FileText className="w-3 h-3" />
                {k.replace(`${step.id}_`, '').replace(/_url$/, '').replace(/_/g, ' ')}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${cols.bg} ${cols.border} border rounded-xl p-5 space-y-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full ${cols.badge} flex items-center justify-center font-bold text-sm shrink-0`}>
          {step.label[0]}
        </div>
        <div>
          <p className="font-semibold text-sm text-[#1A1A1A]">{step.label} — {step.fullLabel}</p>
          <p className="text-xs text-[#6B6B6B] mt-0.5">{step.description}</p>
        </div>
      </div>

      {/* Documents to review */}
      <div>
        <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Documents du dossier à examiner :</p>
        <div className="flex flex-wrap gap-1.5">
          {step.reviewDocs.map(d => (
            <span key={d} className="text-xs px-2 py-1 bg-white border border-[#E5E7EB] rounded-lg text-[#4B5563]">{d}</span>
          ))}
        </div>
      </div>

      {/* Upload institutional docs */}
      <div>
        <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Documents à émettre et téléverser :</p>
        <div className="space-y-2">
          {step.uploadDocs.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs text-[#4B5563] mb-1 block">{label} <span className="text-red-500">*</span></Label>
              {uploadedDocs[key] ? (
                <div className="flex items-center gap-2 p-2 bg-white border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 flex-1 truncate">Téléchargé ✓</span>
                  <label className="text-xs text-blue-600 cursor-pointer hover:underline">
                    Remplacer
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => e.target.files[0] && handleUpload(e.target.files[0], key)} />
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all">
                  {uploading[key]
                    ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
                  <span className="text-xs text-[#9B9B9B]">
                    {uploading[key] ? 'Téléchargement...' : 'Cliquez pour télécharger (PDF, JPG, PNG)'}
                  </span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => e.target.files[0] && handleUpload(e.target.files[0], key)}
                    disabled={uploading[key]} />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-[#6B6B6B] mb-1 block">Commentaire (optionnel)</Label>
        <Textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Notes sur cette étape..." rows={2} className="text-sm" />
      </div>

      <Button onClick={handleApprove} disabled={!allDocsUploaded || saving}
        className={`w-full text-white text-sm ${cols.btn} disabled:opacity-50`}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validation...</>
          : <><CheckCircle2 className="w-4 h-4 mr-2" /> Valider l'étape {step.label}</>}
      </Button>
      {!allDocsUploaded && (
        <p className="text-xs text-[#9B9B9B] text-center">Téléversez tous les documents requis pour valider.</p>
      )}
    </div>
  );
}

export default function ApprovalWorkflow({ dossier, onSave, onWorkflowComplete }) {
  const workflow = dossier.approval_workflow || {};

  const handleApprove = async (stepId, stepData) => {
    const newWorkflow = { ...workflow, [stepId]: stepData };
    const updates = { approval_workflow: newWorkflow };
    await onSave(updates);

    const allDone = STEPS.every(s => newWorkflow[s.id]?.approved);
    if (allDone) onWorkflowComplete?.(newWorkflow);
    toast.success(`Étape ${stepId.toUpperCase()} validée !`);
  };

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => {
          const done = workflow[s.id]?.approved;
          const cols = COLOR[s.color];
          return (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${done ? `${cols.badge}` : 'bg-[#F5F5F5] text-[#9B9B9B]'}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center">{i + 1}</span>}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-[#D1D5DB] shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>

      {STEPS.map((step, i) => {
        const prevApproved = i === 0 || workflow[STEPS[i - 1].id]?.approved;
        return (
          <StepPanel
            key={step.id}
            step={step}
            wfState={workflow[step.id]}
            isUnlocked={prevApproved}
            onApprove={handleApprove}
          />
        );
      })}
    </div>
  );
}