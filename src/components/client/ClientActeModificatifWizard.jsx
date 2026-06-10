import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Upload, FileText,
  Loader2, FilePen, Home, Briefcase, User, MapPin,
  Scale, Users, UserMinus, X, Award
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTES_PHYSIQUE = [
  'Changement siège social', 'Changement nom commercial', 'Extension objet social',
  'Changement objet social', 'Inscription location-gérance', 'Cession fonds de commerce', 'Radiation',
];

const ACTES_MORALE = [
  'Changement siège social', 'Changement représentant légal', 'Extension objet social',
  'Changement objet social', 'Changement forme juridique', 'Nomination administrateurs',
  'Approbation des comptes', 'Dissolution', 'Radiation',
];

const ACTE_FIELDS = {
  'Changement siège social': [
    { key: 'nouvelle_adresse', label: 'Nouvelle adresse du siège', type: 'text' },
    { key: 'date_effet', label: "Date d'effet", type: 'date' },
  ],
  'Changement nom commercial': [
    { key: 'ancien_nom', label: 'Ancien nom commercial', type: 'text' },
    { key: 'nouveau_nom', label: 'Nouveau nom commercial', type: 'text' },
  ],
  'Extension objet social': [
    { key: 'nouvelles_activites', label: 'Nouvelles activités à ajouter', type: 'textarea' },
  ],
  'Changement objet social': [
    { key: 'ancien_objet', label: 'Ancien objet social', type: 'textarea' },
    { key: 'nouvel_objet', label: 'Nouvel objet social', type: 'textarea' },
  ],
  'Inscription location-gérance': [
    { key: 'locataire_gerant_nom', label: 'Nom du locataire-gérant', type: 'text' },
    { key: 'loyer_mensuel', label: 'Loyer mensuel (DJF)', type: 'text' },
    { key: 'date_debut', label: 'Date de début', type: 'date' },
    { key: 'date_fin', label: 'Date de fin', type: 'date' },
  ],
  'Cession fonds de commerce': [
    { key: 'nom_acheteur', label: 'Nom du cessionnaire (acheteur)', type: 'text' },
    { key: 'prix_cession', label: 'Prix de cession (DJF)', type: 'text' },
    { key: 'date_cession', label: 'Date de cession', type: 'date' },
  ],
  'Changement représentant légal': [
    { key: 'ancien_representant', label: "Nom de l'ancien représentant", type: 'text' },
    { key: 'nouveau_representant', label: 'Nom du nouveau représentant', type: 'text' },
    { key: 'nouveau_representant_nni', label: 'NNI du nouveau représentant', type: 'text' },
    { key: 'qualite', label: 'Qualité (Gérant, PDG, DG...)', type: 'text' },
  ],
  'Changement forme juridique': [
    { key: 'ancienne_forme', label: 'Ancienne forme juridique', type: 'text' },
    { key: 'nouvelle_forme', label: 'Nouvelle forme juridique', type: 'text' },
    { key: 'nouveau_capital', label: 'Nouveau capital social (DJF)', type: 'text' },
  ],
  'Nomination administrateurs': [
    { key: 'administrateurs', label: 'Liste des administrateurs nommés (noms et fonctions)', type: 'textarea' },
    { key: 'date_nomination', label: 'Date de nomination', type: 'date' },
  ],
  'Approbation des comptes': [
    { key: 'exercice', label: 'Exercice comptable (ex: 2025)', type: 'text' },
    { key: 'date_assemblee', label: "Date de l'assemblée générale", type: 'date' },
    { key: 'resultat_net', label: 'Résultat net (DJF)', type: 'text' },
  ],
  'Dissolution': [
    { key: 'motif_dissolution', label: 'Motif de la dissolution', type: 'textarea' },
    { key: 'liquidateur_nom', label: 'Nom du liquidateur', type: 'text' },
    { key: 'date_dissolution', label: 'Date de dissolution', type: 'date' },
  ],
  'Radiation': [
    { key: 'motif_radiation', label: 'Motif de la radiation', type: 'textarea' },
    { key: 'date_radiation', label: 'Date de radiation', type: 'date' },
    { key: 'pv_cloture', label: 'Référence PV de clôture', type: 'text' },
  ],
};

const REDEVANCES = {
  'Changement siège social': 15000, 'Changement nom commercial': 15000,
  'Extension objet social': 20000, 'Changement objet social': 20000,
  'Inscription location-gérance': 25000, 'Cession fonds de commerce': 50000,
  'Changement représentant légal': 15000, 'Changement forme juridique': 30000,
  'Nomination administrateurs': 15000, 'Approbation des comptes': 10000,
  'Dissolution': 40000, 'Radiation': 25000,
};

const STEPS = [
  { id: 'identite',     label: 'Identité',        icon: FilePen },
  { id: 'siege',        label: 'Siège social',     icon: Home },
  { id: 'representant', label: 'Représentant',     icon: User },
  { id: 'activite',     label: 'Activité',         icon: Briefcase },
  { id: 'coordonnees',  label: 'Coordonnées',      icon: MapPin },
  { id: 'forme',        label: 'Forme juridique',  icon: Scale },
  { id: 'admins',       label: 'Administrateurs',  icon: Users },
  { id: 'cession',      label: 'Cession de parts', icon: Award },
  { id: 'partenaires',  label: 'Partenaires',      icon: Users },
  { id: 'employes',     label: 'Employés',         icon: Users },
  { id: 'dissolution',  label: 'Dissolution',      icon: UserMinus },
  { id: 'attestation',  label: 'Attestation',      icon: CheckCircle2 },
  { id: 'documents',    label: 'Documents',        icon: FileText },
];

// Map each step to its acte type(s)
const STEP_TO_ACTES = {
  identite:     ['Changement nom commercial'],
  siege:        ['Changement siège social'],
  representant: ['Changement représentant légal'],
  activite:     ['Extension objet social', 'Changement objet social'],
  coordonnees:  [],
  forme:        ['Changement forme juridique'],
  admins:       ['Nomination administrateurs', 'Approbation des comptes'],
  cession:      ['Cession fonds de commerce'],
  partenaires:  [],
  employes:     [],
  dissolution:  ['Dissolution', 'Radiation'],
  attestation:  [],
  documents:    [],
};

// ─── FileUpload helper ────────────────────────────────────────────────────────

function FileUploadField({ label, url, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUploaded(file_url);
    toast.success('Document téléchargé');
    setUploading(false);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {url ? (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 flex-1 truncate hover:underline">Document téléchargé ↗</a>
          <label className="text-xs text-blue-600 cursor-pointer hover:underline shrink-0">
            Remplacer
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white/50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
          <span className="text-xs text-[#9B9B9B]">{uploading ? 'Téléchargement...' : 'Cliquer pour télécharger (PDF, JPG, PNG)'}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

// ─── Step content components ──────────────────────────────────────────────────

function DynamicActeFields({ acteType, fields, onChange }) {
  const fieldDefs = ACTE_FIELDS[acteType] || [];
  if (fieldDefs.length === 0) return null;
  return (
    <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
      <p className="text-xs font-semibold text-blue-700">Détails — {acteType}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fieldDefs.map(f => (
          <div key={f.key} className={`space-y-1 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
            <Label className="text-xs font-medium">{f.label}</Label>
            {f.type === 'textarea'
              ? <Textarea rows={2} value={fields[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} className="text-sm bg-white" />
              : <Input type={f.type} value={fields[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} className="text-sm bg-white" />
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function ClientActeModificatifWizard({ dossier, user, onClose, onSubmitted }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedActes, setSelectedActes] = useState([]); // [{type, fields}]
  const [stepFields, setStepFields] = useState({}); // stepId -> {acteType -> {fields}}
  const [description, setDescription] = useState('');
  const [viaRep, setViaRep] = useState(false);
  const [repNom, setRepNom] = useState('');
  const [repQualite, setRepQualite] = useState('Notaire');
  const [docs, setDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [repDocFront, setRepDocFront] = useState('');
  const [repDocBack, setRepDocBack] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const entityType = dossier.step_data?.identification?.entity_type || 'morale';
  const availableActes = entityType === 'physique' ? ACTES_PHYSIQUE : ACTES_MORALE;

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;

  const setFieldForActe = (stepId, acteType, key, val) => {
    setStepFields(prev => ({
      ...prev,
      [stepId]: { ...(prev[stepId] || {}), [acteType]: { ...((prev[stepId] || {})[acteType] || {}), [key]: val } }
    }));
  };

  const handleUploadDoc = async (file) => {
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDocs(prev => [...prev, { nom: file.name, url: file_url }]);
    setUploadingDoc(false);
  };

  // Collect all actes that have been filled in across steps
  const buildActesList = () => {
    const result = [];
    Object.entries(stepFields).forEach(([stepId, acteMap]) => {
      Object.entries(acteMap).forEach(([acteType, fields]) => {
        if (availableActes.includes(acteType) && Object.values(fields).some(v => v)) {
          result.push({ type: acteType, fields });
        }
      });
    });
    return result;
  };

  const handleSubmit = async () => {
    const actesList = buildActesList();
    if (actesList.length === 0 && !description) {
      toast.error('Veuillez renseigner au moins une modification');
      return;
    }
    setSaving(true);
    const allDocs = [...docs];
    if (repDocFront) allDocs.push({ nom: 'CIN Nouveau représentant — Recto', url: repDocFront });
    if (repDocBack) allDocs.push({ nom: 'CIN Nouveau représentant — Verso', url: repDocBack });

    for (const acte of actesList) {
      const recNumber = `MOD-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*1000)}`;
      await base44.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: entityType,
        type_acte: acte.type,
        description_modification: description,
        donnees_modification: acte.fields,
        documents: allDocs,
        via_representant: viaRep,
        representant_nom: viaRep ? repNom : '',
        representant_qualite: viaRep ? repQualite : '',
        statut: "En cours d'étude",
        recepisse_number: recNumber,
        montant_redevance: REDEVANCES[acte.type] || 0,
        date_soumission: new Date().toISOString().split('T')[0],
      });
    }

    // If only description/docs with no specific acte
    if (actesList.length === 0) {
      const recNumber = `MOD-${Date.now().toString().slice(-8)}`;
      await base44.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: entityType,
        type_acte: 'Autre modification',
        description_modification: description,
        donnees_modification: {},
        documents: allDocs,
        via_representant: viaRep,
        representant_nom: viaRep ? repNom : '',
        representant_qualite: viaRep ? repQualite : '',
        statut: "En cours d'étude",
        recepisse_number: recNumber,
        montant_redevance: 0,
        date_soumission: new Date().toISOString().split('T')[0],
      });
    }

    toast.success('Demande de modification soumise avec succès !');
    setSaving(false);
    onSubmitted();
  };

  // Step content renderer
  const renderStepContent = () => {
    const s = step.id;
    const stepActes = STEP_TO_ACTES[s]?.filter(a => availableActes.includes(a)) || [];

    if (s === 'attestation') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <p className="font-semibold mb-1">Attestation sur l'honneur</p>
            <p>Je soussigné(e), <strong>{user?.full_name}</strong>, déclare que les informations fournies dans cette demande de modification sont exactes et sincères. Je m'engage à fournir tout document complémentaire requis par le Guichet Unique ANPI.</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl">
            <input type="checkbox" id="accept" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded" />
            <label htmlFor="accept" className="text-sm cursor-pointer text-[#1A1A1A]">
              J'accepte et certifie l'exactitude des informations fournies. Cette demande sera examinée par un agent du Guichet Unique ANPI.
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="via_rep" checked={viaRep} onChange={e => setViaRep(e.target.checked)} className="rounded w-4 h-4" />
              <Label htmlFor="via_rep" className="text-sm cursor-pointer">Demande déposée via auxiliaire de justice</Label>
            </div>
            {viaRep && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs">Nom du représentant</Label>
                  <Input value={repNom} onChange={e => setRepNom(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qualité</Label>
                  <select value={repQualite} onChange={e => setRepQualite(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white">
                    <option>Notaire</option><option>Avocat</option><option>Huissier de justice</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (s === 'documents') {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Description / Motif général de la modification</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Décrivez brièvement l'objet de votre demande de modification..." className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Documents justificatifs (PV, actes notariés, décisions...)</Label>
            {docs.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">{d.nom}</a>
                <button onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all">
              {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
              <span className="text-sm text-[#6B6B6B]">{uploadingDoc ? 'Téléchargement...' : 'Ajouter un document'}</span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => e.target.files[0] && handleUploadDoc(e.target.files[0])} disabled={uploadingDoc} />
            </label>
          </div>
          {/* Summary of what will be submitted */}
          {buildActesList().length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl space-y-1.5">
              <p className="text-xs font-semibold text-green-700">Modifications à soumettre ({buildActesList().length}) :</p>
              {buildActesList().map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-green-800">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{a.type} — {(REDEVANCES[a.type] || 0).toLocaleString()} DJF</span>
                </div>
              ))}
              <p className="text-xs font-bold text-green-800 pt-1 border-t border-green-200">
                Total redevances : {buildActesList().reduce((sum, a) => sum + (REDEVANCES[a.type] || 0), 0).toLocaleString()} DJF
              </p>
            </div>
          )}
        </div>
      );
    }

    if (stepActes.length === 0) {
      return (
        <div className="text-center py-8 text-[#9B9B9B]">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune modification disponible pour cette section.</p>
          <p className="text-xs mt-1">Passez à l'étape suivante ou utilisez la section Documents.</p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {stepActes.map(acteType => {
          const fields = stepFields[s]?.[acteType] || {};
          const setF = (k, v) => setFieldForActe(s, acteType, k, v);
          const isFilled = Object.values(fields).some(v => v);
          return (
            <div key={acteType} className={`border rounded-xl overflow-hidden transition-all ${isFilled ? 'border-blue-300' : 'border-[#E5E7EB]'}`}>
              <div className={`flex items-center justify-between px-4 py-3 ${isFilled ? 'bg-blue-50' : 'bg-[#F9F9F9]'}`}>
                <div className="flex items-center gap-2">
                  {isFilled && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  <span className="text-sm font-semibold text-[#1A1A1A]">{acteType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9B9B9B]">Redevance : {(REDEVANCES[acteType] || 0).toLocaleString()} DJF</span>
                </div>
              </div>
              <div className="p-4">
                <DynamicActeFields acteType={acteType} fields={fields} onChange={setF} />
                {/* Extra: CIN upload for représentant change */}
                {acteType === 'Changement représentant légal' && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-amber-700">Pièce d'identité du nouveau représentant</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FileUploadField label="CIN / Passeport — Recto *" url={repDocFront} onUploaded={setRepDocFront} />
                      <FileUploadField label="CIN — Verso (si applicable)" url={repDocBack} onUploaded={setRepDocBack} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-stretch md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-2xl md:rounded-2xl flex flex-col max-h-screen md:max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="bg-[#1A2B6B] text-white px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FilePen className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">Acte Modificatif RCS</p>
                <p className="text-xs text-blue-200">{dossier.company_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-200">{currentStep + 1}/{totalSteps}</span>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>

        {/* Step tabs (scrollable) */}
        <div className="flex overflow-x-auto bg-[#F9F9F9] border-b border-[#E5E7EB] shrink-0 scrollbar-hide">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isCurrent = i === currentStep;
            const stepActes = STEP_TO_ACTES[s.id]?.filter(a => availableActes.includes(a)) || [];
            const hasFill = stepActes.some(a => Object.values(stepFields[s.id]?.[a] || {}).some(v => v));
            return (
              <button key={s.id} onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all shrink-0 ${isCurrent ? 'border-[#1A2B6B] text-[#1A2B6B] bg-white' : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
                <Icon className="w-3 h-3" />
                {s.label}
                {hasFill && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-[#1A1A1A]">{step.label}</h3>
          </div>
          {renderStepContent()}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-[#E5E7EB] px-5 py-4 flex items-center justify-between gap-3 shrink-0 bg-white">
          <Button variant="outline" onClick={() => currentStep > 0 ? setCurrentStep(p => p - 1) : onClose()}
            className="flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Annuler' : 'Précédent'}
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button onClick={() => setCurrentStep(p => p + 1)}
              className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white flex items-center gap-2 text-sm">
              Suivant
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || !accepted}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm disabled:opacity-50">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Soumission...</>
                : <><CheckCircle2 className="w-4 h-4" /> Soumettre la demande</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}