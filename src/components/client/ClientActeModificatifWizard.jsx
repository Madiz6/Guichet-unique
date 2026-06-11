import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Upload, FileText,
  Loader2, FilePen, X
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Redevances ───────────────────────────────────────────────────────────────
const REDEVANCES = {
  'Changement nom commercial': 15000,
  'Changement siège social': 15000,
  'Extension objet social': 20000,
  'Changement objet social': 20000,
  'Changement représentant légal': 15000,
  'Changement forme juridique': 30000,
  'Nomination administrateurs': 15000,
  'Approbation des comptes': 10000,
  'Cession fonds de commerce': 50000,
  'Inscription location-gérance': 25000,
  'Dissolution': 40000,
  'Radiation': 25000,
};

// ─── FileUpload ───────────────────────────────────────────────────────────────
function FileUploadField({ label, url, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (file) => {
    setUploading(true);
    const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
    onUploaded(file_url);
    toast.success('Document téléchargé');
    setUploading(false);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs text-[#6B6B6B]">{label}</Label>
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
        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
          <span className="text-xs text-[#9B9B9B]">{uploading ? 'Téléchargement...' : 'Cliquer pour télécharger (PDF, JPG, PNG)'}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

// ─── Field pair (current | new) ───────────────────────────────────────────────
function FieldPair({ currentLabel, currentValue, newLabel, newValue, onChange, type = 'text', required = false }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-[#6B6B6B]">{currentLabel}</Label>
        <Input value={currentValue || ''} readOnly className="bg-[#F5F5F5] text-sm text-[#6B6B6B] cursor-default" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-[#1A1A1A]">{newLabel}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        {type === 'textarea'
          ? <Textarea value={newValue || ''} onChange={e => onChange(e.target.value)} rows={2} className="text-sm" />
          : <Input type={type} value={newValue || ''} onChange={e => onChange(e.target.value)} className="text-sm" placeholder={newLabel + '...'} />
        }
      </div>
    </div>
  );
}

// ─── STEPS ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'identite',     label: 'Identité' },
  { id: 'siege',        label: 'Siège social' },
  { id: 'representant', label: 'Représentant' },
  { id: 'activite',     label: 'Activité' },
  { id: 'coordonnees',  label: 'Coordonnées' },
  { id: 'forme',        label: 'Forme juridique' },
  { id: 'admins',       label: 'Administrateurs' },
  { id: 'cession',      label: 'Cession' },
  { id: 'dissolution',  label: 'Dissolution' },
  { id: 'attestation',  label: 'Attestation' },
  { id: 'documents',    label: 'Documents' },
];

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function ClientActeModificatifWizard({ dossier, user, onClose, onSubmitted }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({});
  const [docs, setDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepData = dossier.step_data || {};
  const activite = stepData.activite || {};
  const idData = stepData.identification?.data || {};
  const identification = stepData.identification || {};
  const entityType = identification.entity_type || 'morale';

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleUploadDoc = async (file) => {
    setUploadingDoc(true);
    const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
    setDocs(prev => [...prev, { nom: file.name, url: file_url }]);
    setUploadingDoc(false);
  };

  // Build list of actes to submit based on filled fields
  const buildActes = () => {
    const result = [];
    const add = (type, fields) => {
      if (Object.values(fields).some(v => v)) result.push({ type, fields });
    };

    // Identité
    if (form.nouveau_nom || form.nouvelle_raison_sociale || form.nouveau_capital || form.commercial_name1 || form.commercial_name2) {
      add('Changement nom commercial', {
        ancien_nom: dossier.company_name,
        nouveau_nom: form.nouveau_nom || '',
        ancienne_raison_sociale: activite.raison_sociale || '',
        nouvelle_raison_sociale: form.nouvelle_raison_sociale || '',
        capital_actuel: activite.capital_social || '',
        nouveau_capital: form.nouveau_capital || '',
        commercial_name1: form.commercial_name1 || '',
        commercial_name2: form.commercial_name2 || '',
      });
    }
    // Siège
    if (form.nouvelle_adresse) {
      add('Changement siège social', {
        ancienne_adresse: idData.adresse || '',
        nouvelle_adresse: form.nouvelle_adresse,
        date_effet: form.date_effet_siege || '',
      });
    }
    // Représentant
    if (form.rep_nouveau_nom || form.rep_prenom || form.rep_nni) {
      add('Changement représentant légal', {
        ancien_representant: `${idData.prenom || ''} ${idData.nom || ''}`.trim() || '',
        nouveau_representant: `${form.rep_prenom || ''} ${form.rep_nouveau_nom || ''}`.trim(),
        nouveau_representant_nni: form.rep_nni || '',
        numero_identite: form.rep_numero_identite || '',
        nationalite: form.rep_nationalite || '',
        date_naissance: form.rep_date_naissance || '',
        profession: form.rep_profession || '',
        qualite: form.rep_qualite || '',
      });
    }
    // Activité
    if (form.nouvelles_activites || form.nouvel_objet) {
      add(form.nouvel_objet ? 'Changement objet social' : 'Extension objet social', {
        ancien_objet: activite.activite_description || '',
        nouvel_objet: form.nouvel_objet || '',
        nouvelles_activites: form.nouvelles_activites || '',
        nouveau_secteur: form.nouveau_secteur || '',
      });
    }
    // Forme juridique
    if (form.nouvelle_forme) {
      add('Changement forme juridique', {
        ancienne_forme: dossier.forme_juridique || activite.forme_juridique || '',
        nouvelle_forme: form.nouvelle_forme,
        nouveau_capital_forme: form.nouveau_capital_forme || '',
      });
    }
    // Administrateurs
    if (form.administrateurs) {
      add('Nomination administrateurs', {
        administrateurs: form.administrateurs,
        date_nomination: form.date_nomination || '',
      });
    }
    // Cession
    if (form.nom_acheteur) {
      add('Cession fonds de commerce', {
        nom_acheteur: form.nom_acheteur,
        prix_cession: form.prix_cession || '',
        date_cession: form.date_cession || '',
      });
    }
    // Dissolution
    if (form.motif_dissolution || form.motif_radiation) {
      const type = form.motif_radiation ? 'Radiation' : 'Dissolution';
      add(type, {
        motif: form.motif_dissolution || form.motif_radiation || '',
        liquidateur_nom: form.liquidateur_nom || '',
        date_dissolution: form.date_dissolution || '',
        date_radiation: form.date_radiation || '',
        pv_cloture: form.pv_cloture || '',
      });
    }
    return result;
  };

  const handleSubmit = async () => {
    const actes = buildActes();
    setSaving(true);
    const allDocs = [...docs];
    if (form.rep_doc_front) allDocs.push({ nom: 'CIN Représentant — Recto', url: form.rep_doc_front });
    if (form.rep_doc_back) allDocs.push({ nom: 'CIN Représentant — Verso', url: form.rep_doc_back });

    const toSubmit = actes.length > 0 ? actes : [{ type: 'Autre modification', fields: {} }];
    for (const acte of toSubmit) {
      const rec = `MOD-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*1000)}`;
      await apiClient.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: entityType,
        type_acte: acte.type,
        description_modification: form.description || '',
        donnees_modification: acte.fields,
        documents: allDocs,
        via_representant: form.via_rep || false,
        representant_nom: form.via_rep ? form.rep_nom_auxiliaire : '',
        representant_qualite: form.via_rep ? form.rep_qualite_auxiliaire : '',
        statut: "En cours d'étude",
        recepisse_number: rec,
        montant_redevance: REDEVANCES[acte.type] || 0,
        date_soumission: new Date().toISOString().split('T')[0],
      });
    }
    toast.success('Demande de modification soumise !');
    setSaving(false);
    onSubmitted();
  };

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;

  const renderStep = () => {
    switch (step.id) {

      case 'identite':
        return (
          <div className="space-y-5">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Modifiez uniquement les champs qui changent. Les champs pré-remplis reflètent les données actuelles du dossier.
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-0.5">Changement de dénomination sociale</p>
                <p className="text-xs text-blue-600">Remplissez les deux champs ci-dessous pour un acte rectificatif de dénomination.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-[#6B6B6B]">Au lieu de (ancien nom)</Label>
                  <Input value={dossier.company_name || ''} readOnly className="bg-white/70 text-sm font-medium text-[#6B6B6B] cursor-default" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#1A1A1A]">Il faut lire (nouveau nom) <span className="text-red-500">*</span></Label>
                  <Input value={form.nouveau_nom || ''} onChange={e => set('nouveau_nom', e.target.value)} placeholder="Nouveau nom commercial..." className="text-sm bg-white" />
                </div>
              </div>
            </div>

            <FieldPair
              currentLabel="Nom commercial actuel"
              currentValue={dossier.company_name}
              newLabel="Nouveau nom commercial (ci-dessus)"
              newValue={form.nouveau_nom}
              onChange={v => set('nouveau_nom', v)}
            />
            <FieldPair
              currentLabel="Raison sociale actuelle"
              currentValue={activite.raison_sociale}
              newLabel="Nouvelle raison sociale"
              newValue={form.nouvelle_raison_sociale}
              onChange={v => set('nouvelle_raison_sociale', v)}
            />
            <FieldPair
              currentLabel="Capital social actuel (DJF)"
              currentValue={activite.capital_social}
              newLabel="Nouveau capital social (DJF)"
              newValue={form.nouveau_capital}
              onChange={v => set('nouveau_capital', v)}
              type="number"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[#6B6B6B]">1er choix de nom commercial</Label>
                <Input value={form.commercial_name1 || ''} onChange={e => set('commercial_name1', e.target.value)} className="text-sm" placeholder="1er choix..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#6B6B6B]">2ème choix de nom commercial</Label>
                <Input value={form.commercial_name2 || ''} onChange={e => set('commercial_name2', e.target.value)} className="text-sm" placeholder="2ème choix..." />
              </div>
            </div>
          </div>
        );

      case 'siege':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Indiquez uniquement si l'adresse du siège social change.
            </div>
            <FieldPair
              currentLabel="Adresse actuelle du siège"
              currentValue={idData.adresse}
              newLabel="Nouvelle adresse du siège social"
              newValue={form.nouvelle_adresse}
              onChange={v => set('nouvelle_adresse', v)}
            />
            <div className="space-y-1">
              <Label className="text-xs text-[#6B6B6B]">Date d'effet du changement</Label>
              <Input type="date" value={form.date_effet_siege || ''} onChange={e => set('date_effet_siege', e.target.value)} className="text-sm max-w-xs" />
            </div>
          </div>
        );

      case 'representant':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Si le représentant légal change, renseignez toutes ses informations et téléversez sa pièce d'identité.
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#6B6B6B]">Représentant actuel</Label>
              <div className="px-3 py-2.5 bg-[#F5F5F5] rounded-lg text-sm text-[#6B6B6B] border border-[#E5E7EB]">
                {idData.prenom || idData.nom
                  ? `${idData.prenom || ''} ${idData.nom || ''}`.trim() + (idData.nni ? ` — ${idData.nni}` : '')
                  : '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Nom du nouveau représentant</Label>
                <Input value={form.rep_nouveau_nom || ''} onChange={e => set('rep_nouveau_nom', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Prénom</Label>
                <Input value={form.rep_prenom || ''} onChange={e => set('rep_prenom', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">NNI</Label>
                <Input value={form.rep_nni || ''} onChange={e => set('rep_nni', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">N° Identité / Passeport</Label>
                <Input value={form.rep_numero_identite || ''} onChange={e => set('rep_numero_identite', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Nationalité</Label>
                <Input value={form.rep_nationalite || ''} onChange={e => set('rep_nationalite', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Date de naissance</Label>
                <Input type="date" value={form.rep_date_naissance || ''} onChange={e => set('rep_date_naissance', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Profession</Label>
                <Input value={form.rep_profession || ''} onChange={e => set('rep_profession', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Qualité (Gérant, PDG, DG…)</Label>
                <Input value={form.rep_qualite || ''} onChange={e => set('rep_qualite', e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Pièce d'identité du nouveau représentant</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FileUploadField label="CIN / Passeport — Recto *" url={form.rep_doc_front} onUploaded={url => set('rep_doc_front', url)} />
                <FileUploadField label="CIN — Verso (si applicable)" url={form.rep_doc_back} onUploaded={url => set('rep_doc_back', url)} />
              </div>
            </div>
          </div>
        );

      case 'activite':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Modifiez uniquement les champs de l'activité qui changent. Les données actuelles sont pré-remplies.
            </div>
            <div className="p-4 border border-[#E5E7EB] rounded-xl space-y-4">
              <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">Déclaration d'activité</p>
              <FieldPair
                currentLabel="Secteur principal actuel"
                currentValue={activite.secteur_principal}
                newLabel="Nouveau secteur principal"
                newValue={form.nouveau_secteur}
                onChange={v => set('nouveau_secteur', v)}
              />
              <div className="space-y-1">
                <Label className="text-xs text-[#6B6B6B]">Description de l'activité actuelle</Label>
                <Textarea value={activite.activite_description || ''} readOnly rows={2} className="bg-[#F5F5F5] text-sm text-[#6B6B6B] cursor-default" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Nouvel objet social / Changement d'activité</Label>
                <Textarea value={form.nouvel_objet || ''} onChange={e => set('nouvel_objet', e.target.value)} rows={2} className="text-sm" placeholder="Laissez vide si inchangé..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#1A1A1A]">Extension de l'objet (nouvelles activités à ajouter)</Label>
                <Textarea value={form.nouvelles_activites || ''} onChange={e => set('nouvelles_activites', e.target.value)} rows={2} className="text-sm" placeholder="Décrivez les nouvelles sous-activités..." />
              </div>
            </div>
          </div>
        );

      case 'coordonnees':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Indiquez uniquement les coordonnées qui changent.
            </div>
            <FieldPair
              currentLabel="Email actuel"
              currentValue={idData.email}
              newLabel="Nouvel email"
              newValue={form.nouvel_email}
              onChange={v => set('nouvel_email', v)}
              type="email"
            />
            <FieldPair
              currentLabel="Téléphone actuel"
              currentValue={idData.telephone}
              newLabel="Nouveau téléphone"
              newValue={form.nouveau_telephone}
              onChange={v => set('nouveau_telephone', v)}
            />
          </div>
        );

      case 'forme':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Indiquez la nouvelle forme juridique et le nouveau capital si applicable.
            </div>
            <FieldPair
              currentLabel="Forme juridique actuelle"
              currentValue={dossier.forme_juridique || activite.forme_juridique}
              newLabel="Nouvelle forme juridique *"
              newValue={form.nouvelle_forme}
              onChange={v => set('nouvelle_forme', v)}
            />
            <FieldPair
              currentLabel="Capital social actuel (DJF)"
              currentValue={activite.capital_social}
              newLabel="Nouveau capital social (DJF)"
              newValue={form.nouveau_capital_forme}
              onChange={v => set('nouveau_capital_forme', v)}
              type="number"
            />
          </div>
        );

      case 'admins':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Renseignez les nouvelles nominations ou l'approbation des comptes.
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#1A1A1A]">Administrateurs nommés (noms et fonctions)</Label>
              <Textarea value={form.administrateurs || ''} onChange={e => set('administrateurs', e.target.value)} rows={4}
                placeholder="- M. Ahmed Ali — Président du CA&#10;- Mme. Fatima Hassan — Administratrice" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#6B6B6B]">Date de nomination</Label>
              <Input type="date" value={form.date_nomination || ''} onChange={e => set('date_nomination', e.target.value)} className="text-sm max-w-xs" />
            </div>
            <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
              <p className="text-xs font-semibold text-[#6B6B6B]">Approbation des comptes (si applicable)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Exercice comptable</Label>
                  <Input value={form.exercice || ''} onChange={e => set('exercice', e.target.value)} placeholder="ex: 2025" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date de l'assemblée générale</Label>
                  <Input type="date" value={form.date_assemblee || ''} onChange={e => set('date_assemblee', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Résultat net (DJF)</Label>
                  <Input type="number" value={form.resultat_net || ''} onChange={e => set('resultat_net', e.target.value)} className="text-sm" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'cession':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Renseignez les informations relatives à la cession de fonds de commerce ou à l'inscription en location-gérance.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Nom du cessionnaire (acheteur)</Label>
                <Input value={form.nom_acheteur || ''} onChange={e => set('nom_acheteur', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prix de cession (DJF)</Label>
                <Input type="number" value={form.prix_cession || ''} onChange={e => set('prix_cession', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date de cession</Label>
                <Input type="date" value={form.date_cession || ''} onChange={e => set('date_cession', e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>
        );

      case 'dissolution':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              ⚠ La dissolution ou radiation met fin à l'existence juridique de l'entreprise au registre.
            </div>
            <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold">Dissolution</p>
              <div className="space-y-1"><Label className="text-xs">Motif de dissolution</Label>
                <Textarea value={form.motif_dissolution || ''} onChange={e => set('motif_dissolution', e.target.value)} rows={2} className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nom du liquidateur</Label>
                  <Input value={form.liquidateur_nom || ''} onChange={e => set('liquidateur_nom', e.target.value)} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Date de dissolution</Label>
                  <Input type="date" value={form.date_dissolution || ''} onChange={e => set('date_dissolution', e.target.value)} className="text-sm" /></div>
              </div>
            </div>
            <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold">Radiation</p>
              <div className="space-y-1"><Label className="text-xs">Motif de radiation</Label>
                <Textarea value={form.motif_radiation || ''} onChange={e => set('motif_radiation', e.target.value)} rows={2} className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Date de radiation</Label>
                  <Input type="date" value={form.date_radiation || ''} onChange={e => set('date_radiation', e.target.value)} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Réf. PV de clôture</Label>
                  <Input value={form.pv_cloture || ''} onChange={e => set('pv_cloture', e.target.value)} className="text-sm" /></div>
              </div>
            </div>
          </div>
        );

      case 'attestation':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="font-semibold mb-1">Attestation sur l'honneur</p>
              <p>Je soussigné(e), <strong>{user?.full_name}</strong>, déclare que les informations fournies dans cette demande de modification sont exactes et sincères.</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl">
              <input type="checkbox" id="accept" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded" />
              <label htmlFor="accept" className="text-sm cursor-pointer text-[#1A1A1A]">
                J'accepte et certifie l'exactitude des informations fournies. Cette demande sera examinée par un agent du Guichet Unique ANPI.
              </label>
            </div>
            <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="via_rep" checked={form.via_rep || false} onChange={e => set('via_rep', e.target.checked)} className="rounded w-4 h-4" />
                <Label htmlFor="via_rep" className="text-sm cursor-pointer">Demande déposée via auxiliaire de justice</Label>
              </div>
              {form.via_rep && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-1"><Label className="text-xs">Nom du représentant</Label>
                    <Input value={form.rep_nom_auxiliaire || ''} onChange={e => set('rep_nom_auxiliaire', e.target.value)} className="text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs">Qualité</Label>
                    <select value={form.rep_qualite_auxiliaire || 'Notaire'} onChange={e => set('rep_qualite_auxiliaire', e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white">
                      <option>Notaire</option><option>Avocat</option><option>Huissier de justice</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Description / Motif général</Label>
              <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3}
                placeholder="Décrivez brièvement l'objet de votre demande..." className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Documents justificatifs</Label>
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">{d.nom}</a>
                  <button onClick={() => setDocs(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all">
                {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
                <span className="text-sm text-[#6B6B6B]">{uploadingDoc ? 'Téléchargement...' : 'Ajouter un document (PV, acte notarié, décision...)'}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => e.target.files[0] && handleUploadDoc(e.target.files[0])} disabled={uploadingDoc} />
              </label>
            </div>
            {buildActes().length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-green-700">Récapitulatif des modifications ({buildActes().length}) :</p>
                {buildActes().map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-green-800">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{a.type}</span>
                    <span className="font-medium">{(REDEVANCES[a.type] || 0).toLocaleString()} DJF</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-green-200 flex justify-between text-xs font-bold text-green-800">
                  <span>Total redevances</span>
                  <span>{buildActes().reduce((s, a) => s + (REDEVANCES[a.type] || 0), 0).toLocaleString()} DJF</span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-stretch md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-2xl md:rounded-2xl flex flex-col max-h-screen md:max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-[#1A2B6B] text-white px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FilePen className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Acte Modificatif RCS</p>
                <p className="text-xs text-blue-200">{dossier.company_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition-colors border border-white/20 rounded-lg px-3 py-1.5">
                Annuler
              </button>
            </div>
          </div>
        </div>

        {/* Step tabs */}
        <div className="flex overflow-x-auto bg-white border-b border-[#E5E7EB] shrink-0">
          {STEPS.map((s, i) => {
            const isCurrent = i === currentStep;
            const isPast = i < currentStep;
            return (
              <button key={s.id} onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all shrink-0 ${isCurrent ? 'border-[#1A2B6B] text-[#1A2B6B] bg-blue-50/50' : isPast ? 'border-transparent text-[#9B9B9B]' : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
                {isPast && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] px-5 py-4 flex items-center justify-between gap-3 shrink-0 bg-white">
          <Button variant="outline" onClick={() => currentStep > 0 ? setCurrentStep(p => p - 1) : onClose()}
            className="flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Précédent
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
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Soumission...</> : <><CheckCircle2 className="w-4 h-4" />Soumettre</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}