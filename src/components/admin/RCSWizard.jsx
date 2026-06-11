import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, ChevronLeft, CheckCircle2, Circle, Upload, Loader2,
  FileText, Building2, Home, User, Briefcase, MapPin, Scale, Users,
  UserMinus, Shield, FileCheck, Award, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Wizard Step Definitions ──────────────────────────────────────────────────

const WIZARD_STEPS = [
  { id: 'identite',        num: 1,  label: 'Identité',          full: 'Identité de l\'entreprise',     icon: Building2 },
  { id: 'siege',           num: 2,  label: 'Siège social',       full: 'Siège social',                  icon: Home },
  { id: 'representant',    num: 3,  label: 'Représentant',       full: 'Représentant légal',             icon: User },
  { id: 'activite',        num: 4,  label: 'Activité',           full: 'Objet social / Activité',        icon: Briefcase },
  { id: 'coordonnees',     num: 5,  label: 'Coordonnées',        full: 'Coordonnées de la société',      icon: MapPin },
  { id: 'forme',           num: 6,  label: 'Forme juridique',    full: 'Forme juridique',                icon: Scale },
  { id: 'administrateurs', num: 7,  label: 'Administrateurs',    full: 'Administrateurs',                icon: Users },
  { id: 'partenaires',     num: 8,  label: 'Partenaires',        full: 'Partenaires / Actionnaires',     icon: Users },
  { id: 'employes',        num: 9,  label: 'Employés',           full: 'Employés',                       icon: Users },
  { id: 'dissolution',     num: 10, label: 'Dissolution',        full: 'Dissolution / Radiation',        icon: UserMinus },
  { id: 'attestation',     num: 11, label: 'Attestation',        full: 'Attestation & Signature',        icon: Shield },
  { id: 'documents',       num: 12, label: 'Documents',          full: 'Documents justificatifs',        icon: FileCheck },
];

const FORMES_JURIDIQUES = ['SARL', 'SA', 'SAS', 'EURL', 'SNC', 'Association', 'Établissement public', 'Entreprise individuelle', 'Succursale'];

const REDEVANCES = {
  'Changement siège social': 15000, 'Changement nom commercial': 15000,
  'Extension objet social': 20000, 'Changement objet social': 20000,
  'Changement représentant légal': 15000, 'Changement forme juridique': 30000,
  'Nomination administrateurs': 15000, 'Dissolution': 40000, 'Radiation': 25000,
};

// ─── File Upload ──────────────────────────────────────────────────────────────

function FileUploadField({ label, url, onUploaded, required = false }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
      onUploaded(file_url);
      toast.success('Document téléchargé');
    } catch { toast.error('Erreur de téléchargement'); }
    setUploading(false);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {url ? (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 flex-1 truncate hover:underline">Téléchargé — Voir ↗</a>
          <label className="text-xs text-blue-600 cursor-pointer hover:underline shrink-0">
            Remplacer<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" /> : <Upload className="w-4 h-4 text-[#9B9B9B] shrink-0" />}
          <span className="text-xs text-[#9B9B9B]">{uploading ? 'Téléchargement...' : 'Cliquer pour télécharger (PDF, JPG, PNG)'}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ currentStep, changedSteps, onGoTo }) {
  return (
    <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {WIZARD_STEPS.map((step, idx) => {
          const isCurrent = currentStep === idx;
          const isChanged = changedSteps.includes(step.id);
          const isPast = idx < currentStep;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onGoTo(idx)}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all min-w-[60px] group ${isCurrent ? 'bg-[#1A2B6B]/10' : 'hover:bg-[#F5F5F5]'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                  isChanged
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                    ? 'bg-[#1A2B6B] border-[#1A2B6B] text-white'
                    : isPast
                    ? 'bg-[#F0F0F0] border-[#D1D5DB] text-[#9B9B9B]'
                    : 'bg-white border-[#D1D5DB] text-[#9B9B9B]'
                }`}>
                  {isChanged && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <span className={`text-[9px] font-medium text-center leading-tight ${isCurrent ? 'text-[#1A2B6B]' : isChanged ? 'text-green-700' : 'text-[#9B9B9B]'}`}>
                  {step.label}
                </span>
              </button>
              {idx < WIZARD_STEPS.length - 1 && (
                <div className={`w-3 h-px shrink-0 ${idx < currentStep ? 'bg-[#D1D5DB]' : 'bg-[#E5E7EB]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Individual Step Forms ────────────────────────────────────────────────────

function StepIdentite({ data, onChange, dossier }) {
  const sd = dossier.step_data?.activite || {};
  return (
    <div className="space-y-4">
      <InfoBanner text="Modifiez uniquement les champs qui changent. Les champs pré-remplis reflètent les données actuelles du dossier." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom commercial actuel" value={dossier.company_name} readOnly />
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nouveau nom commercial</Label>
          <Input value={data.company_name || ''} onChange={e => onChange('company_name', e.target.value)} className="text-sm" placeholder={dossier.company_name} />
        </div>
        <Field label="Raison sociale actuelle" value={sd.raison_sociale} readOnly />
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nouvelle raison sociale</Label>
          <Input value={data.raison_sociale || ''} onChange={e => onChange('raison_sociale', e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Capital social actuel (DJF)</Label>
          <Input value={sd.capital_social || ''} readOnly className="text-sm bg-[#F5F5F5]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nouveau capital social (DJF)</Label>
          <Input type="number" value={data.capital_social || ''} onChange={e => onChange('capital_social', e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">1er choix de nom commercial</Label>
          <Input value={data.commercial_name1 || sd.commercial_names?.[0] || ''} onChange={e => onChange('commercial_name1', e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">2ème choix de nom commercial</Label>
          <Input value={data.commercial_name2 || sd.commercial_names?.[1] || ''} onChange={e => onChange('commercial_name2', e.target.value)} className="text-sm" />
        </div>
      </div>
    </div>
  );
}

function StepSiege({ data, onChange, dossier }) {
  const adresseCourante = dossier.step_data?.identification?.data?.adresse || '—';
  return (
    <div className="space-y-4">
      <InfoBanner text="Indiquez uniquement si l'adresse du siège social change." />
      <Field label="Adresse actuelle du siège" value={adresseCourante} readOnly />
      <div className="space-y-1">
        <Label className="text-xs font-medium">Nouvelle adresse du siège social</Label>
        <Input value={data.nouvelle_adresse || ''} onChange={e => onChange('nouvelle_adresse', e.target.value)} className="text-sm" placeholder="Nouvelle adresse complète..." />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Date d'effet du changement</Label>
        <Input type="date" value={data.date_effet || ''} onChange={e => onChange('date_effet', e.target.value)} className="text-sm" />
      </div>
    </div>
  );
}

function StepRepresentant({ data, onChange, dossier }) {
  const idData = dossier.step_data?.identification?.data || {};
  const identification = dossier.step_data?.identification || {};
  return (
    <div className="space-y-4">
      <InfoBanner text="Si le représentant légal change, renseignez toutes ses informations et téléversez sa pièce d'identité." />
      <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E7EB]">
        <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Représentant actuel</p>
        <p className="text-sm font-medium">{idData.prenom} {idData.nom} — {idData.nni || '—'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs font-medium">Nom du nouveau représentant</Label><Input value={data.rep_nom || ''} onChange={e => onChange('rep_nom', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Prénom</Label><Input value={data.rep_prenom || ''} onChange={e => onChange('rep_prenom', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">NNI</Label><Input value={data.rep_nni || ''} onChange={e => onChange('rep_nni', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">N° Identité / Passeport</Label><Input value={data.rep_numero_identite || ''} onChange={e => onChange('rep_numero_identite', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Nationalité</Label><Input value={data.rep_nationalite || ''} onChange={e => onChange('rep_nationalite', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Date de naissance</Label><Input type="date" value={data.rep_date_naissance || ''} onChange={e => onChange('rep_date_naissance', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Profession</Label><Input value={data.rep_profession || ''} onChange={e => onChange('rep_profession', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Qualité (Gérant, PDG, DG…)</Label><Input value={data.rep_qualite || ''} onChange={e => onChange('rep_qualite', e.target.value)} className="text-sm" /></div>
      </div>
      <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Pièce d'identité du nouveau représentant</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FileUploadField label="CIN / Passeport — Recto" required url={data.rep_doc_front || ''} onUploaded={url => onChange('rep_doc_front', url)} />
          <FileUploadField label="CIN — Verso (si applicable)" url={data.rep_doc_back || ''} onUploaded={url => onChange('rep_doc_back', url)} />
        </div>
        {(data.rep_doc_front || data.rep_doc_back) && (
          <div className="grid grid-cols-2 gap-3">
            {data.rep_doc_front && <a href={data.rep_doc_front} target="_blank" rel="noopener noreferrer" className="block border border-[#E5E7EB] rounded-xl overflow-hidden"><img src={data.rep_doc_front} alt="Recto" className="w-full h-28 object-cover bg-gray-100" onError={e => { e.target.style.display = 'none'; }} /><div className="px-2 py-1.5 text-xs text-[#6B6B6B] border-t">Recto</div></a>}
            {data.rep_doc_back && <a href={data.rep_doc_back} target="_blank" rel="noopener noreferrer" className="block border border-[#E5E7EB] rounded-xl overflow-hidden"><img src={data.rep_doc_back} alt="Verso" className="w-full h-28 object-cover bg-gray-100" onError={e => { e.target.style.display = 'none'; }} /><div className="px-2 py-1.5 text-xs text-[#6B6B6B] border-t">Verso</div></a>}
          </div>
        )}
      </div>
    </div>
  );
}

function StepActivite({ data, onChange, dossier }) {
  const sd = dossier.step_data?.activite || {};
  const existingActivites = sd.activites_secondaires || [];
  const [newActivite, setNewActivite] = useState('');
  const activitesData = data.activites_secondaires || existingActivites;

  const addActivite = () => {
    if (!newActivite.trim()) return;
    onChange('activites_secondaires', [...activitesData, newActivite.trim()]);
    setNewActivite('');
  };
  const removeActivite = (idx) => onChange('activites_secondaires', activitesData.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <InfoBanner text="Modifiez la description de l'objet social, ajoutez ou retirez des activités." />
      <div className="space-y-1">
        <Label className="text-xs font-medium">Secteur principal</Label>
        <Input value={data.secteur_principal || sd.secteur_principal || ''} onChange={e => onChange('secteur_principal', e.target.value)} className="text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Objet social / Description de l'activité</Label>
        <Textarea value={data.activite_description || sd.activite_description || ''} onChange={e => onChange('activite_description', e.target.value)} rows={4} className="text-sm" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Activités secondaires</Label>
        <div className="space-y-2">
          {activitesData.map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="flex-1 text-sm text-[#1A1A1A]">{a}</span>
              <button onClick={() => removeActivite(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newActivite} onChange={e => setNewActivite(e.target.value)} onKeyDown={e => e.key === 'Enter' && addActivite()} className="text-sm flex-1" placeholder="Ajouter une activité secondaire..." />
          <Button variant="outline" size="sm" onClick={addActivite} className="shrink-0"><Plus className="w-3.5 h-3.5 mr-1" /> Ajouter</Button>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Régime fiscal</Label>
        <Input value={data.regime_fiscal || sd.regime_fiscal || ''} onChange={e => onChange('regime_fiscal', e.target.value)} className="text-sm" />
      </div>
    </div>
  );
}

function StepCoordonnes({ data, onChange, dossier }) {
  const idData = dossier.step_data?.identification?.data || {};
  return (
    <div className="space-y-4">
      <InfoBanner text="Coordonnées de contact de la société." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1"><Label className="text-xs font-medium">Email actuel</Label><Input value={idData.email || ''} readOnly className="text-sm bg-[#F5F5F5]" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Nouvel email</Label><Input type="email" value={data.email || ''} onChange={e => onChange('email', e.target.value)} className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Téléphone actuel</Label><Input value={idData.telephone || ''} readOnly className="text-sm bg-[#F5F5F5]" /></div>
        <div className="space-y-1"><Label className="text-xs font-medium">Nouveau téléphone</Label><Input value={data.telephone || ''} onChange={e => onChange('telephone', e.target.value)} className="text-sm" /></div>
      </div>
    </div>
  );
}

function StepForme({ data, onChange, dossier }) {
  const currentForme = dossier.forme_juridique || dossier.step_data?.activite?.forme_juridique || '—';
  return (
    <div className="space-y-4">
      <InfoBanner text="Changement de forme juridique — nécessite PV d'AG et statuts mis à jour." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Forme juridique actuelle" value={currentForme} readOnly />
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nouvelle forme juridique</Label>
          <select value={data.nouvelle_forme || ''} onChange={e => onChange('nouvelle_forme', e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
            <option value="">— Sélectionner —</option>
            {FORMES_JURIDIQUES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nouveau capital social (DJF)</Label>
          <Input type="number" value={data.nouveau_capital || ''} onChange={e => onChange('nouveau_capital', e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Date d'effet</Label>
          <Input type="date" value={data.date_effet_forme || ''} onChange={e => onChange('date_effet_forme', e.target.value)} className="text-sm" />
        </div>
      </div>
    </div>
  );
}

function StepAdministrateurs({ data, onChange, dossier }) {
  return (
    <div className="space-y-4">
      <InfoBanner text="Nommez les nouveaux administrateurs ou mettez à jour la liste." />
      <div className="space-y-1">
        <Label className="text-xs font-medium">Administrateurs nommés (noms & fonctions)</Label>
        <Textarea value={data.administrateurs || ''} onChange={e => onChange('administrateurs', e.target.value)} rows={6} className="text-sm" placeholder="- M. Ahmed Ali — Président du Conseil d'Administration&#10;- Mme. Fatima Hassan — Administratrice&#10;- M. Omar Dini — Administrateur indépendant" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Date de nomination</Label>
        <Input type="date" value={data.date_nomination || ''} onChange={e => onChange('date_nomination', e.target.value)} className="text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Référence PV d'AG (délibération)</Label>
        <Input value={data.ref_pv || ''} onChange={e => onChange('ref_pv', e.target.value)} className="text-sm" placeholder="Ex: PV-AG-2026-001" />
      </div>
    </div>
  );
}

function StepPartenaires({ data, onChange, dossier }) {
  const existingPartners = dossier.step_data?.partenaires?.partners || [];
  const partners = data.partenaires || existingPartners.map(p => ({ ...p }));

  const setPartner = (i, k, v) => {
    const updated = partners.map((p, idx) => idx === i ? { ...p, [k]: v } : p);
    onChange('partenaires', updated);
  };

  return (
    <div className="space-y-4">
      <InfoBanner text={`${existingPartners.length} partenaire(s) enregistré(s). Modifiez les parts ou informations si nécessaire.`} />
      {partners.length === 0
        ? <p className="text-sm text-[#9B9B9B] text-center py-8">Aucun partenaire déclaré dans ce dossier.</p>
        : partners.map((p, i) => (
          <div key={i} className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={p.type === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                {p.type === 'physique' ? 'Personne physique' : 'Personne morale'}
              </Badge>
              <span className="font-semibold text-sm">
                {p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : p.raison_sociale}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Part actuelle (%)</Label><Input value={p.part_percent || ''} readOnly className="text-sm bg-[#F5F5F5]" /></div>
              <div className="space-y-1"><Label className="text-xs">Nouvelle part (%)</Label><Input type="number" value={data[`partner_${i}_part`] || ''} onChange={e => setPartner(i, 'part_percent', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Apport (DJF)</Label><Input type="number" value={data[`partner_${i}_apport`] || p.apport || ''} onChange={e => setPartner(i, 'apport', e.target.value)} className="text-sm" /></div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function StepEmployes({ data, onChange, dossier }) {
  const existingEmployees = dossier.step_data?.employes?.employees || [];
  const employees = data.employes || existingEmployees.map(e => ({ ...e }));

  const setEmployee = (i, k, v) => {
    const updated = employees.map((e, idx) => idx === i ? { ...e, [k]: v } : e);
    onChange('employes', updated);
  };

  return (
    <div className="space-y-4">
      <InfoBanner text={`${existingEmployees.length} employé(s) déclaré(s). Modifiez ou ajoutez des informations.`} />
      {employees.length === 0
        ? <p className="text-sm text-[#9B9B9B] text-center py-8">Aucun employé déclaré dans ce dossier.</p>
        : employees.map((e, i) => (
          <div key={i} className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <p className="font-semibold text-sm">{e.prenom} {e.nom} — <span className="text-[#6B6B6B] font-normal">{e.emploi_occupe || '—'}</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Emploi occupé</Label><Input value={data[`emp_${i}_emploi`] || e.emploi_occupe || ''} onChange={ev => setEmployee(i, 'emploi_occupe', ev.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Salaire brut (DJF)</Label><Input type="number" value={data[`emp_${i}_salaire`] || e.salaire_base || ''} onChange={ev => setEmployee(i, 'salaire_base', ev.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Matricule CNSS</Label><Input value={data[`emp_${i}_cnss`] || e.matricule_cnss || ''} onChange={ev => setEmployee(i, 'matricule_cnss', ev.target.value)} className="text-sm" /></div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function StepDissolution({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <p className="text-xs text-red-700">La dissolution ou radiation met fin à l'existence juridique de l'entreprise au registre. Action irréversible.</p>
      </div>
      <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Dissolution</p>
        <div className="space-y-1"><Label className="text-xs">Motif de la dissolution</Label><Textarea value={data.motif_dissolution || ''} onChange={e => onChange('motif_dissolution', e.target.value)} rows={3} className="text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">Nom du liquidateur</Label><Input value={data.liquidateur_nom || ''} onChange={e => onChange('liquidateur_nom', e.target.value)} className="text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Date de dissolution</Label><Input type="date" value={data.date_dissolution || ''} onChange={e => onChange('date_dissolution', e.target.value)} className="text-sm" /></div>
        </div>
      </div>
      <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Radiation</p>
        <div className="space-y-1"><Label className="text-xs">Motif de la radiation</Label><Textarea value={data.motif_radiation || ''} onChange={e => onChange('motif_radiation', e.target.value)} rows={3} className="text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">Date de radiation</Label><Input type="date" value={data.date_radiation || ''} onChange={e => onChange('date_radiation', e.target.value)} className="text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Réf. PV de clôture</Label><Input value={data.pv_cloture || ''} onChange={e => onChange('pv_cloture', e.target.value)} className="text-sm" /></div>
        </div>
      </div>
    </div>
  );
}

function StepAttestation({ data, onChange, user }) {
  return (
    <div className="space-y-4">
      <InfoBanner text="L'agent confirme que les modifications déclarées sont exactes et conformes aux pièces justificatives fournies." />
      <div className="border border-[#E5E7EB] rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <input type="checkbox" id="att1" checked={!!data.att_exactitude} onChange={e => onChange('att_exactitude', e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" />
          <Label htmlFor="att1" className="text-sm cursor-pointer">J'atteste que toutes les informations déclarées sont exactes et conformes aux documents justificatifs fournis.</Label>
        </div>
        <div className="flex items-start gap-3">
          <input type="checkbox" id="att2" checked={!!data.att_autorise} onChange={e => onChange('att_autorise', e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" />
          <Label htmlFor="att2" className="text-sm cursor-pointer">Je certifie être habilité à effectuer ces modifications au nom de l'autorité compétente (ODPIC/ANPI).</Label>
        </div>
        <div className="flex items-start gap-3">
          <input type="checkbox" id="att3" checked={!!data.att_documents} onChange={e => onChange('att_documents', e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" />
          <Label htmlFor="att3" className="text-sm cursor-pointer">Les documents justificatifs originaux ont été vérifiés et sont conformes.</Label>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Agent ODPIC</Label>
        <Input value={user?.full_name || user?.email || ''} readOnly className="text-sm bg-[#F5F5F5]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Date d'attestation</Label>
        <Input type="date" value={data.date_attestation || new Date().toISOString().split('T')[0]} onChange={e => onChange('date_attestation', e.target.value)} className="text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Observations de l'agent (optionnel)</Label>
        <Textarea value={data.observations || ''} onChange={e => onChange('observations', e.target.value)} rows={3} className="text-sm" placeholder="Remarques, conditions, numéros de référence..." />
      </div>
    </div>
  );
}

function StepDocuments({ data, onChange }) {
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const docs = data.justificatifs || [];

  const REQUIRED_DOCS = [
    { key: 'pv_ag', label: 'PV d\'Assemblée Générale / Décision', required: true },
    { key: 'statuts_mis_a_jour', label: 'Statuts mis à jour (si applicable)', required: false },
    { key: 'formulaire_gui', label: 'Formulaire Guichet Unique signé', required: true },
    { key: 'autres', label: 'Autres documents justificatifs', required: false },
  ];

  const namedDocs = data.named_docs || {};

  const handleNamedUpload = async (file, key) => {
    setUploadingIdx(key);
    try {
      const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
      onChange('named_docs', { ...namedDocs, [key]: file_url });
      toast.success('Document téléchargé');
    } catch { toast.error('Erreur de téléchargement'); }
    setUploadingIdx(null);
  };

  const handleExtraUpload = async (file) => {
    setUploadingIdx('extra');
    try {
      const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
      onChange('justificatifs', [...docs, { nom: file.name, url: file_url }]);
      toast.success('Document ajouté');
    } catch { toast.error('Erreur de téléchargement'); }
    setUploadingIdx(null);
  };

  return (
    <div className="space-y-4">
      <InfoBanner text="Téléversez tous les documents liés aux modifications apportées. Ces documents seront archivés avec l'acte modificatif." />

      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Documents requis</p>
        {REQUIRED_DOCS.map(doc => (
          <div key={doc.key} className="space-y-1">
            <Label className="text-xs font-medium">{doc.label}{doc.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
            {namedDocs[doc.key] ? (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <a href={namedDocs[doc.key]} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 flex-1 truncate hover:underline">Téléchargé — Voir ↗</a>
                <label className="text-xs text-blue-600 cursor-pointer hover:underline shrink-0">
                  Remplacer<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleNamedUpload(e.target.files[0], doc.key)} />
                </label>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white">
                {uploadingIdx === doc.key ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" /> : <Upload className="w-4 h-4 text-[#9B9B9B] shrink-0" />}
                <span className="text-xs text-[#9B9B9B]">{uploadingIdx === doc.key ? 'Téléchargement...' : 'Cliquer pour télécharger (PDF, JPG, PNG)'}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleNamedUpload(e.target.files[0], doc.key)} disabled={uploadingIdx === doc.key} />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Documents supplémentaires</p>
        {docs.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">{d.nom}</a>
            <button onClick={() => onChange('justificatifs', docs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all">
          {uploadingIdx === 'extra' ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
          <span className="text-sm text-[#6B6B6B]">Ajouter un document supplémentaire</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleExtraUpload(e.target.files[0])} disabled={uploadingIdx === 'extra'} />
        </label>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value, readOnly = false }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-[#6B6B6B]">{label}</Label>
      <div className="px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-md text-sm text-[#6B6B6B]">{value || '—'}</div>
    </div>
  );
}

function InfoBanner({ text }) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">{text}</div>
  );
}

// ─── Build summary of all changes made ───────────────────────────────────────

function buildChangesSummary(stepData) {
  const changes = [];
  if (stepData.company_name) changes.push(`Nom: ${stepData.company_name}`);
  if (stepData.nouvelle_adresse) changes.push(`Siège: ${stepData.nouvelle_adresse}`);
  if (stepData.rep_nom || stepData.rep_prenom) changes.push(`Représentant: ${stepData.rep_prenom || ''} ${stepData.rep_nom || ''}`);
  if (stepData.activite_description) changes.push(`Objet social modifié`);
  if (stepData.nouvelle_forme) changes.push(`Forme juridique: → ${stepData.nouvelle_forme}`);
  if (stepData.administrateurs) changes.push(`Administrateurs mis à jour`);
  if (stepData.motif_dissolution) changes.push(`Dissolution: ${stepData.motif_dissolution}`);
  if (stepData.motif_radiation) changes.push(`Radiation: ${stepData.motif_radiation}`);
  return changes.join(' | ') || 'Acte modificatif RCS';
}

// ─── Apply approved changes to RegistrationDossier ───────────────────────────

async function applyChangesToDossier(dossier, stepData) {
  const sd = dossier.step_data || {};
  const activite = sd.activite || {};
  const idData = sd.identification?.data || {};
  const identification = sd.identification || {};

  const updates = {};
  const newActivite = { ...activite };
  const newIdData = { ...idData };
  const newIdentification = { ...identification };

  if (stepData.company_name) updates.company_name = stepData.company_name;
  if (stepData.nouvelle_forme) { updates.forme_juridique = stepData.nouvelle_forme; newActivite.forme_juridique = stepData.nouvelle_forme; }
  if (stepData.raison_sociale) newActivite.raison_sociale = stepData.raison_sociale;
  if (stepData.capital_social) newActivite.capital_social = stepData.capital_social;
  if (stepData.nouveau_capital) newActivite.capital_social = stepData.nouveau_capital;
  if (stepData.commercial_name1 || stepData.commercial_name2) {
    newActivite.commercial_names = [stepData.commercial_name1, stepData.commercial_name2].filter(Boolean);
  }
  if (stepData.secteur_principal) newActivite.secteur_principal = stepData.secteur_principal;
  if (stepData.activite_description) newActivite.activite_description = stepData.activite_description;
  if (stepData.activites_secondaires) newActivite.activites_secondaires = stepData.activites_secondaires;
  if (stepData.regime_fiscal) newActivite.regime_fiscal = stepData.regime_fiscal;
  if (stepData.nouvelle_adresse) newIdData.adresse = stepData.nouvelle_adresse;
  if (stepData.email) newIdData.email = stepData.email;
  if (stepData.telephone) newIdData.telephone = stepData.telephone;
  if (stepData.rep_nom) newIdData.nom = stepData.rep_nom;
  if (stepData.rep_prenom) newIdData.prenom = stepData.rep_prenom;
  if (stepData.rep_nni) newIdData.nni = stepData.rep_nni;
  if (stepData.rep_numero_identite) newIdData.numero_identite = stepData.rep_numero_identite;
  if (stepData.rep_nationalite) newIdData.nationalite = stepData.rep_nationalite;
  if (stepData.rep_date_naissance) newIdData.date_naissance = stepData.rep_date_naissance;
  if (stepData.rep_profession) newIdData.profession = stepData.rep_profession;
  if (stepData.rep_doc_front) newIdentification.document_front_url = stepData.rep_doc_front;
  if (stepData.rep_doc_back) newIdentification.document_back_url = stepData.rep_doc_back;

  // Collect all documents
  const allDocs = [];
  if (stepData.named_docs) Object.entries(stepData.named_docs).forEach(([k, url]) => url && allDocs.push({ nom: k.replace(/_/g, ' '), url }));
  if (stepData.justificatifs) allDocs.push(...stepData.justificatifs);

  const updatedStepData = {
    ...sd,
    activite: newActivite,
    identification: { ...newIdentification, data: newIdData },
    ...(stepData.partenaires ? { partenaires: { ...sd.partenaires, partners: stepData.partenaires } } : {}),
    ...(stepData.employes ? { employes: { ...sd.employes, employees: stepData.employes } } : {}),
  };

  await apiClient.entities.RegistrationDossier.update(dossier.id, {
    ...updates,
    step_data: updatedStepData,
    date_traitement: new Date().toISOString().split('T')[0],
  });

  return allDocs;
}

// ─── Main RCS Wizard ──────────────────────────────────────────────────────────

export default function RCSWizard({ dossier, user, onFinished, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [changedSteps, setChangedSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [viaRep, setViaRep] = useState(false);
  const [repNom, setRepNom] = useState('');
  const [repQualite, setRepQualite] = useState('Notaire');

  const setData = (key, value) => {
    setStepData(prev => ({ ...prev, [key]: value }));
    const stepId = WIZARD_STEPS[currentStep].id;
    if (!changedSteps.includes(stepId)) {
      setChangedSteps(prev => [...prev, stepId]);
    }
  };

  const goTo = (idx) => setCurrentStep(idx);
  const goNext = () => setCurrentStep(i => Math.min(i + 1, WIZARD_STEPS.length - 1));
  const goPrev = () => setCurrentStep(i => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    if (!stepData.att_exactitude || !stepData.att_autorise || !stepData.att_documents) {
      toast.error('Veuillez cocher les 3 cases de l\'attestation (étape 11) avant de soumettre.');
      setCurrentStep(10);
      return;
    }

    setSaving(true);
    try {
      const summary = buildChangesSummary(stepData);
      const recNumber = `RCS-${Date.now().toString().slice(-8)}`;

      // Determine total redevance from changed steps
      const redevance = changedSteps.reduce((sum, sid) => {
        if (sid === 'identite' && stepData.company_name) return sum + REDEVANCES['Changement nom commercial'];
        if (sid === 'siege' && stepData.nouvelle_adresse) return sum + REDEVANCES['Changement siège social'];
        if (sid === 'representant' && stepData.rep_nom) return sum + REDEVANCES['Changement représentant légal'];
        if (sid === 'forme' && stepData.nouvelle_forme) return sum + REDEVANCES['Changement forme juridique'];
        if (sid === 'administrateurs' && stepData.administrateurs) return sum + REDEVANCES['Nomination administrateurs'];
        if (sid === 'dissolution' && (stepData.motif_dissolution || stepData.motif_radiation)) return sum + REDEVANCES['Dissolution'];
        return sum;
      }, 0);

      // Collect all docs
      const allDocs = [];
      if (stepData.named_docs) Object.entries(stepData.named_docs).forEach(([k, url]) => url && allDocs.push({ nom: k.replace(/_/g, ' '), url }));
      if (stepData.justificatifs) allDocs.push(...stepData.justificatifs);
      if (stepData.rep_doc_front) allDocs.push({ nom: 'CIN Représentant — Recto', url: stepData.rep_doc_front });
      if (stepData.rep_doc_back) allDocs.push({ nom: 'CIN Représentant — Verso', url: stepData.rep_doc_back });

      const typeActe = changedSteps.length === 1
        ? { identite: 'Changement nom commercial', siege: 'Changement siège social', representant: 'Changement représentant légal', activite: 'Changement objet social', forme: 'Changement forme juridique', administrateurs: 'Nomination administrateurs', dissolution: 'Dissolution' }[changedSteps[0]] || 'Acte modificatif RCS'
        : `Acte modificatif RCS (${changedSteps.length} sections)`;

      // 1. Create ModificationDossier record
      await apiClient.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: dossier.step_data?.identification?.entity_type || 'morale',
        type_acte: typeActe,
        description_modification: summary,
        donnees_modification: { ...stepData, sections_modifiees: changedSteps },
        documents: allDocs,
        via_representant: viaRep,
        representant_nom: viaRep ? repNom : '',
        representant_qualite: viaRep ? repQualite : '',
        statut: "En cours d'étude",
        admin_email: user?.email,
        recepisse_number: recNumber,
        montant_redevance: redevance,
        date_soumission: new Date().toISOString().split('T')[0],
      });

      // 2. Immediately apply changes to RegistrationDossier
      await applyChangesToDossier(dossier, stepData);

      toast.success(`Acte inscrit au RCS — Récépissé ${recNumber}. Dossier mis à jour.`);
      onFinished();
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setSaving(false);
  };

  const step = WIZARD_STEPS[currentStep];
  const entityType = dossier.step_data?.identification?.entity_type || 'morale';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Step progress */}
      <StepProgress currentStep={currentStep} changedSteps={changedSteps} onGoTo={goTo} />

      {/* Current step header */}
      <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F9F9F9] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1A2B6B] text-white flex items-center justify-center text-sm font-bold">{step.num}</div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">{step.full}</h3>
            <p className="text-xs text-[#9B9B9B]">Étape {step.num} sur {WIZARD_STEPS.length} — modifiez uniquement ce qui change</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {changedSteps.includes(step.id) && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Modifié
            </span>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6 min-h-[400px] overflow-y-auto">
        {step.id === 'identite'        && <StepIdentite data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'siege'           && <StepSiege data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'representant'    && <StepRepresentant data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'activite'        && <StepActivite data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'coordonnees'     && <StepCoordonnes data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'forme'           && <StepForme data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'administrateurs' && <StepAdministrateurs data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'partenaires'     && <StepPartenaires data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'employes'        && <StepEmployes data={stepData} onChange={setData} dossier={dossier} />}
        {step.id === 'dissolution'     && <StepDissolution data={stepData} onChange={setData} />}
        {step.id === 'attestation'     && <StepAttestation data={stepData} onChange={setData} user={user} />}
        {step.id === 'documents'       && <StepDocuments data={stepData} onChange={setData} />}
      </div>

      {/* Via représentant (shown on last step before submit) */}
      {currentStep === WIZARD_STEPS.length - 1 && (
        <div className="px-6 pb-4 border-t border-[#F0F0F0] pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="via_rep" checked={viaRep} onChange={e => setViaRep(e.target.checked)} className="rounded w-4 h-4" />
            <Label htmlFor="via_rep" className="text-sm cursor-pointer">Demande déposée via auxiliaire de justice (notaire, avocat, huissier)</Label>
          </div>
          {viaRep && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={repNom} onChange={e => setRepNom(e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Qualité</Label>
                <select value={repQualite} onChange={e => setRepQualite(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
                  <option>Notaire</option><option>Avocat</option><option>Huissier de justice</option>
                </select>
              </div>
            </div>
          )}

          {/* Summary of changes */}
          {changedSteps.length > 0 && (
            <div className="p-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl">
              <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Résumé des modifications</p>
              <div className="flex flex-wrap gap-1.5">
                {changedSteps.map(sid => {
                  const s = WIZARD_STEPS.find(w => w.id === sid);
                  return <span key={sid} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s?.label}</span>;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between bg-[#F9F9F9]">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="text-sm">Annuler</Button>
          <Button variant="outline" onClick={goPrev} disabled={currentStep === 0} className="text-sm">
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9B9B9B]">{changedSteps.length} section(s) modifiée(s)</span>
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={goNext} className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-sm">
              Suivant <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || changedSteps.length === 0} className="bg-green-600 hover:bg-green-700 text-white text-sm">
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inscription en cours...</>
                : <><Award className="w-4 h-4 mr-2" /> Inscrire au registre RCS</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}