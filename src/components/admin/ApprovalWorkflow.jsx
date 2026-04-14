import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Upload, Loader2, Lock, ChevronRight, FileText, Eye, Image, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  {
    id: 'odpic',
    label: 'ODPIC',
    fullLabel: 'Office Djiboutien de la Propriété Industrielle et Commerciale',
    color: 'blue',
    description: 'Vérifier la disponibilité du nom commercial et délivrer le récépissé d\'immatriculation.',
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
    uploadDocs: [
      { key: 'cnss_affiliation_url', label: 'Certificat d\'affiliation CNSS' },
      { key: 'cnss_immatriculation_url', label: 'Immatriculation CNSS' },
    ],
  },
];

const COLOR = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     icon: 'text-blue-600',   btn: 'bg-blue-600 hover:bg-blue-700',   prevBg: 'bg-blue-50/60' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700', prevBg: 'bg-purple-50/60' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',   icon: 'text-green-600',  btn: 'bg-green-600 hover:bg-green-700',   prevBg: 'bg-green-50/60' },
};

// ── Renders a single document link/thumbnail ──────────────────────────────────
function DocLink({ url, label }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 bg-white border border-[#E5E7EB] rounded-lg hover:shadow-sm transition-all group">
      {isImage
        ? <Image className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        : <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
      <span className="text-xs text-[#1A1A1A] flex-1 truncate">{label}</span>
      <ExternalLink className="w-3 h-3 text-[#9B9B9B] group-hover:text-blue-500 shrink-0" />
    </a>
  );
}

// ── Extracts dossier docs relevant to each step ───────────────────────────────
function getDossierDocs(stepId, dossier) {
  const sd = dossier.step_data || {};
  const id = sd.identification || {};
  const docs = sd.documents?.docs || {};
  const partenaires = sd.partenaires?.partners || [];
  const employes = sd.employes?.employees || [];

  const items = [];

  if (stepId === 'odpic') {
    // ODPIC needs: formulaire GUI, statuts, ID du représentant
    if (docs.formulaire_gui_url || docs.formulaire_pdf_url)
      items.push({ url: docs.formulaire_gui_url || docs.formulaire_pdf_url, label: 'Formulaire GUI signé' });
    if (docs.statuts_signes_url || docs.statuts_pdf_url)
      items.push({ url: docs.statuts_signes_url || docs.statuts_pdf_url, label: 'Statuts signés' });
    if (id.document_front_url)
      items.push({ url: id.document_front_url, label: 'CIN Représentant — Recto' });
    if (id.document_back_url)
      items.push({ url: id.document_back_url, label: 'CIN Représentant — Verso' });
    if (id.selfie_url)
      items.push({ url: id.selfie_url, label: 'Photo biométrique' });
    // Partner IDs
    partenaires.forEach((p, i) => {
      if (p.doc_front) items.push({ url: p.doc_front, label: `Partenaire ${i + 1} — CIN Recto` });
      if (p.doc_back)  items.push({ url: p.doc_back,  label: `Partenaire ${i + 1} — CIN Verso` });
      if (p.registre_url) items.push({ url: p.registre_url, label: `Partenaire ${i + 1} — Registre commerce` });
    });
  }

  if (stepId === 'dgi') {
    // DGI needs: statuts, contrat bail, ID, formulaire
    if (docs.statuts_signes_url || docs.statuts_pdf_url)
      items.push({ url: docs.statuts_signes_url || docs.statuts_pdf_url, label: 'Statuts signés' });
    if (docs.formulaire_gui_url || docs.formulaire_pdf_url)
      items.push({ url: docs.formulaire_gui_url || docs.formulaire_pdf_url, label: 'Formulaire GUI' });
    if (id.document_front_url)
      items.push({ url: id.document_front_url, label: 'CIN Représentant — Recto' });
    if (id.document_back_url)
      items.push({ url: id.document_back_url, label: 'CIN Représentant — Verso' });
  }

  if (stepId === 'cnss') {
    // CNSS needs: statuts, liste employés docs, ID
    if (docs.statuts_signes_url || docs.statuts_pdf_url)
      items.push({ url: docs.statuts_signes_url || docs.statuts_pdf_url, label: 'Statuts signés' });
    if (id.document_front_url)
      items.push({ url: id.document_front_url, label: 'CIN Représentant — Recto' });
    employes.forEach((e, i) => {
      if (e.doc_front) items.push({ url: e.doc_front, label: `Employé ${i + 1} (${e.prenom} ${e.nom}) — CIN Recto` });
      if (e.doc_back)  items.push({ url: e.doc_back,  label: `Employé ${i + 1} (${e.prenom} ${e.nom}) — CIN Verso` });
    });
  }

  return items;
}

// ── PreviousStepDocs: shows already-uploaded institutional docs from prior steps ─
function PreviousStepDocs({ stepIndex, workflow }) {
  const prevSteps = STEPS.slice(0, stepIndex);
  const hasPrev = prevSteps.some(s => Object.keys(workflow[s.id]?.uploaded_docs || {}).length > 0);
  if (!hasPrev) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#6B6B6B]">Documents transmis par les étapes précédentes :</p>
      {prevSteps.map(s => {
        const prevDocs = Object.entries(workflow[s.id]?.uploaded_docs || {}).filter(([, url]) => url);
        if (!prevDocs.length) return null;
        const cols = COLOR[s.color];
        return (
          <div key={s.id} className={`${cols.bg} ${cols.border} border rounded-lg p-3`}>
            <p className={`text-xs font-bold mb-2 ${cols.icon}`}>{s.label} — Documents émis</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {prevDocs.map(([k, url]) => (
                <DocLink key={k} url={url}
                  label={k.replace(`${s.id}_`, '').replace(/_url$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
              ))}
            </div>
            {workflow[s.id]?.comment && (
              <p className="text-xs text-[#6B6B6B] mt-2 italic">Note {s.label} : {workflow[s.id].comment}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── StepPanel ─────────────────────────────────────────────────────────────────
function StepPanel({ step, stepIndex, wfState, isUnlocked, workflow, dossier, onApprove }) {
  const [uploading, setUploading] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState(wfState?.uploaded_docs || {});
  const [comment, setComment] = useState(wfState?.comment || '');
  const [saving, setSaving] = useState(false);
  const [showDossierDocs, setShowDossierDocs] = useState(true);

  const cols = COLOR[step.color];
  const isApproved = wfState?.approved;
  const allDocsUploaded = step.uploadDocs.every(d => uploadedDocs[d.key]);
  const dossierDocs = getDossierDocs(step.id, dossier);

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
    if (!allDocsUploaded) { toast.error('Téléversez tous les documents requis.'); return; }
    setSaving(true);
    await onApprove(step.id, { approved: true, uploaded_docs: uploadedDocs, comment, approved_at: new Date().toISOString() });
    setSaving(false);
  };

  // Locked state
  if (!isUnlocked && !isApproved) {
    return (
      <div className="border rounded-xl p-4 opacity-50">
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-[#9B9B9B]" />
          <span className="font-semibold text-sm text-[#6B6B6B]">{step.label} — {step.fullLabel}</span>
          <span className="text-xs text-[#9B9B9B] ml-auto">Étape précédente requise</span>
        </div>
      </div>
    );
  }

  // Approved (collapsed) state
  if (isApproved) {
    return (
      <div className={`${cols.bg} ${cols.border} border rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`w-5 h-5 ${cols.icon} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{step.label} — {step.fullLabel}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Validé {wfState.approved_at ? `le ${new Date(wfState.approved_at).toLocaleDateString('fr-FR')}` : ''}
              {wfState.comment ? ` · Note: ${wfState.comment}` : ''}
            </p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap justify-end">
            {Object.entries(wfState.uploaded_docs || {}).filter(([, url]) => url).map(([k, url]) => (
              <a key={k} href={url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${cols.badge} hover:opacity-80`}>
                <FileText className="w-3 h-3" />
                {k.replace(`${step.id}_`, '').replace(/_url$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active step
  return (
    <div className={`${cols.bg} ${cols.border} border-2 rounded-xl p-5 space-y-5`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full ${cols.badge} flex items-center justify-center font-bold text-sm shrink-0`}>
          {step.label[0]}
        </div>
        <div>
          <p className="font-bold text-sm text-[#1A1A1A]">{step.label} — {step.fullLabel}</p>
          <p className="text-xs text-[#6B6B6B] mt-0.5">{step.description}</p>
        </div>
      </div>

      {/* Documents from previous institutional steps */}
      <PreviousStepDocs stepIndex={stepIndex} workflow={workflow} />

      {/* Dossier documents for review */}
      {dossierDocs.length > 0 && (
        <div>
          <button
            onClick={() => setShowDossierDocs(p => !p)}
            className="flex items-center gap-2 text-xs font-semibold text-[#1A1A1A] mb-2 hover:opacity-70">
            <Eye className="w-3.5 h-3.5" />
            Documents du dossier à examiner ({dossierDocs.length})
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDossierDocs ? 'rotate-90' : ''}`} />
          </button>
          {showDossierDocs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white/70 rounded-lg border border-[#E5E7EB]">
              {dossierDocs.map((doc, i) => (
                <DocLink key={i} url={doc.url} label={doc.label} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload institutional docs */}
      <div>
        <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Documents à émettre et téléverser <span className="text-red-500">*</span></p>
        <div className="space-y-2">
          {step.uploadDocs.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs text-[#4B5563] mb-1 block">{label}</Label>
              {uploadedDocs[key] ? (
                <div className="flex items-center gap-2 p-2.5 bg-white border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <a href={uploadedDocs[key]} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-700 flex-1 truncate hover:underline">
                    Téléchargé — Voir le document ↗
                  </a>
                  <label className="text-xs text-blue-600 cursor-pointer hover:underline shrink-0">
                    Remplacer
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => e.target.files[0] && handleUpload(e.target.files[0], key)} />
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white/50">
                  {uploading[key]
                    ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                    : <Upload className="w-4 h-4 text-[#9B9B9B] shrink-0" />}
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

      {/* Comment */}
      <div>
        <Label className="text-xs text-[#6B6B6B] mb-1 block">Commentaire (optionnel)</Label>
        <Textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Notes de décision, conditions, numéros de référence..." rows={2} className="text-sm bg-white/80" />
      </div>

      {/* Validate button */}
      <Button onClick={handleApprove} disabled={!allDocsUploaded || saving}
        className={`w-full text-white text-sm ${cols.btn} disabled:opacity-50`}>
        {saving
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validation en cours...</>
          : <><CheckCircle2 className="w-4 h-4 mr-2" /> Valider et transmettre à l'étape suivante</>}
      </Button>
      {!allDocsUploaded && (
        <p className="text-xs text-[#9B9B9B] text-center">Téléversez tous les documents requis pour débloquer la validation.</p>
      )}
    </div>
  );
}

// ── Main ApprovalWorkflow ─────────────────────────────────────────────────────
export default function ApprovalWorkflow({ dossier, onSave, onWorkflowComplete }) {
  const workflow = dossier.approval_workflow || {};

  const handleApprove = async (stepId, stepData) => {
    const newWorkflow = { ...workflow, [stepId]: stepData };
    await onSave({ approval_workflow: newWorkflow });
    const allDone = STEPS.every(s => newWorkflow[s.id]?.approved);
    if (allDone) onWorkflowComplete?.(newWorkflow);
    toast.success(`Étape ${stepId.toUpperCase()} validée — documents transmis à l'étape suivante.`);
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => {
          const done = workflow[s.id]?.approved;
          const cols = COLOR[s.color];
          return (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${done ? cols.badge : 'bg-[#F5F5F5] text-[#9B9B9B]'}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
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
            stepIndex={i}
            wfState={workflow[step.id]}
            isUnlocked={prevApproved}
            workflow={workflow}
            dossier={dossier}
            onApprove={handleApprove}
          />
        );
      })}
    </div>
  );
}