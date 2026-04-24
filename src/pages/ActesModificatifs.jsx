import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FilePen, Plus, Search, Building2, ArrowLeft, CheckCircle2,
  XCircle, Upload, FileText, Loader2, Award, ChevronRight, Clock,
  PenLine, History, Home, Briefcase, User, MapPin, Scale, Users,
  UserMinus, MessageSquare, Save, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────

const FORMES_JURIDIQUES = ['SARL', 'SA', 'SAS', 'EURL', 'SNC', 'Association', 'Établissement public', 'Entreprise individuelle', 'Succursale'];

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

const STATUS_STYLE = {
  "En cours d'étude": 'bg-amber-100 text-amber-700',
  'Approuvé': 'bg-green-100 text-green-700',
  'Rejeté': 'bg-red-100 text-red-700',
};

// ─── File Upload helper ───────────────────────────────────────────────────────

function FileUploadField({ label, url, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUploaded(file_url);
      toast.success('Document téléchargé');
    } catch { toast.error('Erreur de téléchargement'); }
    setUploading(false);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {url ? (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 flex-1 truncate hover:underline">Document téléchargé — Voir ↗</a>
          <label className="text-xs text-blue-600 cursor-pointer hover:underline shrink-0">
            Remplacer
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white/50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" /> : <Upload className="w-4 h-4 text-[#9B9B9B] shrink-0" />}
          <span className="text-xs text-[#9B9B9B]">{uploading ? 'Téléchargement...' : 'Cliquer pour télécharger (PDF, JPG, PNG)'}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

// ─── Acte Form (official RCS act) ────────────────────────────────────────────

function ActeForm({ dossier, user, onCreated, onCancel }) {
  const entityType = dossier.step_data?.identification?.entity_type || 'morale';
  const actes = entityType === 'physique' ? ACTES_PHYSIQUE : ACTES_MORALE;

  const [typeActe, setTypeActe] = useState('');
  const [fields, setFields] = useState({});
  const [description, setDescription] = useState('');
  const [viaRep, setViaRep] = useState(false);
  const [repNom, setRepNom] = useState('');
  const [repQualite, setRepQualite] = useState('Notaire');
  const [docs, setDocs] = useState([]);
  const [repDocFront, setRepDocFront] = useState('');
  const [repDocBack, setRepDocBack] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setFields(prev => ({ ...prev, [k]: v }));

  const handleUpload = async (file) => {
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDocs(prev => [...prev, { nom: file.name, url: file_url }]);
    setUploadingDoc(false);
  };

  // Apply approved act to the RegistrationDossier
  const applyActToDossier = async (typeActe, fields) => {
    const stepData = dossier.step_data || {};
    const activite = stepData.activite || {};
    const idData = stepData.identification?.data || {};
    let updates = {};
    let stepUpdates = {};

    if (typeActe === 'Changement siège social' && fields.nouvelle_adresse) {
      stepUpdates = { identification: { ...stepData.identification, data: { ...idData, adresse: fields.nouvelle_adresse } } };
    }
    if (typeActe === 'Changement nom commercial' && fields.nouveau_nom) {
      updates.company_name = fields.nouveau_nom;
      stepUpdates = { activite: { ...activite, raison_sociale: fields.nouveau_nom, commercial_names: [fields.nouveau_nom, ...(activite.commercial_names || []).slice(1)] } };
    }
    if (typeActe === 'Changement représentant légal') {
      const docs_to_add = [];
      if (repDocFront) docs_to_add.push({ nom: 'CIN Nouveau représentant — Recto', url: repDocFront });
      if (repDocBack) docs_to_add.push({ nom: 'CIN Nouveau représentant — Verso', url: repDocBack });
      stepUpdates = {
        identification: {
          ...stepData.identification,
          document_front_url: repDocFront || stepData.identification?.document_front_url,
          document_back_url: repDocBack || stepData.identification?.document_back_url,
          data: {
            ...idData,
            nom: fields.nouveau_representant?.split(' ').slice(-1)[0] || idData.nom,
            prenom: fields.nouveau_representant?.split(' ').slice(0, -1).join(' ') || idData.prenom,
            nni: fields.nouveau_representant_nni || idData.nni,
          }
        }
      };
    }
    if (typeActe === 'Changement forme juridique' && fields.nouvelle_forme) {
      updates.forme_juridique = fields.nouvelle_forme;
      stepUpdates = { activite: { ...activite, forme_juridique: fields.nouvelle_forme, capital_social: fields.nouveau_capital || activite.capital_social } };
    }
    if (typeActe === 'Changement objet social' && fields.nouvel_objet) {
      stepUpdates = { activite: { ...activite, activite_description: fields.nouvel_objet } };
    }
    if (typeActe === 'Extension objet social' && fields.nouvelles_activites) {
      stepUpdates = { activite: { ...activite, activite_description: (activite.activite_description || '') + '\n' + fields.nouvelles_activites } };
    }

    if (Object.keys(stepUpdates).length > 0 || Object.keys(updates).length > 0) {
      await base44.entities.RegistrationDossier.update(dossier.id, {
        ...updates,
        step_data: { ...stepData, ...stepUpdates },
        date_traitement: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleSubmit = async () => {
    if (!typeActe) { toast.error("Sélectionnez un type d'acte"); return; }
    setSaving(true);
    try {
      const recNumber = `MOD-${Date.now().toString().slice(-8)}`;
      const allDocs = [...docs];
      if (repDocFront) allDocs.push({ nom: 'CIN Nouveau représentant — Recto', url: repDocFront });
      if (repDocBack) allDocs.push({ nom: 'CIN Nouveau représentant — Verso', url: repDocBack });

      await base44.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: entityType,
        type_acte: typeActe,
        description_modification: description,
        donnees_modification: fields,
        documents: allDocs,
        via_representant: viaRep,
        representant_nom: viaRep ? repNom : '',
        representant_qualite: viaRep ? repQualite : '',
        statut: "En cours d'étude",
        admin_email: user?.email,
        recepisse_number: recNumber,
        montant_redevance: REDEVANCES[typeActe] || 0,
        date_soumission: new Date().toISOString().split('T')[0],
      });

      toast.success(`Acte enregistré — Récépissé ${recNumber}`);
      onCreated();
    } catch (e) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const dynamicFields = ACTE_FIELDS[typeActe] || [];
  const isRepChange = typeActe === 'Changement représentant légal';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
          {entityType === 'physique' ? 'Personne physique' : 'Personne morale'}
        </Badge>
        <span className="text-sm font-semibold text-[#1A1A1A]">{dossier.company_name}</span>
        {dossier.forme_juridique && <Badge className="bg-gray-100 text-gray-700">{dossier.forme_juridique}</Badge>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Type d'acte modificatif *</Label>
        <select value={typeActe} onChange={e => { setTypeActe(e.target.value); setFields({}); }}
          className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
          <option value="">— Sélectionner un acte —</option>
          {actes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {typeActe && (
          <p className="text-xs text-[#6B6B6B] flex items-center gap-1">
            Redevance ODPIC : <strong className="text-[#1A2B6B]">{(REDEVANCES[typeActe] || 0).toLocaleString()} DJF</strong>
          </p>
        )}
      </div>

      {dynamicFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          {dynamicFields.map(f => (
            <div key={f.key} className={`space-y-1 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
              <Label className="text-xs font-medium">{f.label}</Label>
              {f.type === 'textarea'
                ? <Textarea rows={2} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="text-sm bg-white" />
                : <Input type={f.type} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="text-sm bg-white" />
              }
            </div>
          ))}
        </div>
      )}

      {/* Extra: ID docs for representative change */}
      {isRepChange && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Pièce d'identité du nouveau représentant
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FileUploadField label="CIN / Passeport — Recto *" url={repDocFront} onUploaded={setRepDocFront} />
            <FileUploadField label="CIN — Verso (si applicable)" url={repDocBack} onUploaded={setRepDocBack} />
          </div>
          {(repDocFront || repDocBack) && (
            <div className="grid grid-cols-2 gap-3">
              {repDocFront && <a href={repDocFront} target="_blank" rel="noopener noreferrer" className="block border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md"><img src={repDocFront} alt="Recto" className="w-full h-24 object-cover bg-gray-100" onError={e => { e.target.style.display = 'none'; }} /><div className="px-2 py-1 text-xs text-[#6B6B6B] border-t">Recto</div></a>}
              {repDocBack && <a href={repDocBack} target="_blank" rel="noopener noreferrer" className="block border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md"><img src={repDocBack} alt="Verso" className="w-full h-24 object-cover bg-gray-100" onError={e => { e.target.style.display = 'none'; }} /><div className="px-2 py-1 text-xs text-[#6B6B6B] border-t">Verso</div></a>}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm">Description / Motif détaillé</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Détails supplémentaires sur la modification..." />
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

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Documents justificatifs</Label>
        {docs.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{d.nom}</a>
          </div>
        ))}
        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all">
          {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
          <span className="text-sm text-[#6B6B6B]">{uploadingDoc ? 'Téléchargement...' : 'Ajouter un document (acte, PV, décision, statuts...)'}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} disabled={uploadingDoc} />
        </label>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">Annuler</Button>
        <Button onClick={handleSubmit} disabled={saving || !typeActe} className="flex-1 bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white">
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</>
            : <><Award className="w-4 h-4 mr-2" /> Inscrire au registre</>
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Admin correction form (updates dossier + logs to ModificationDossier) ───

const EDIT_SECTIONS = [
  { id: 'identite',        label: 'Identité de l\'entreprise',   desc: 'Nom, forme juridique, capital',       icon: Building2 },
  { id: 'siege',           label: 'Siège social',                desc: 'Adresse, changement de siège',        icon: Home },
  { id: 'activite',        label: 'Objet social / Activité',     desc: 'Secteur, description, régime',        icon: Briefcase },
  { id: 'representant',    label: 'Représentant légal',          desc: 'Identité, pièce d\'identité',         icon: User },
  { id: 'coordonnees',     label: 'Coordonnées',                 desc: 'Email, téléphone',                    icon: MapPin },
  { id: 'forme',           label: 'Forme juridique',             desc: 'Changement de forme, capital',        icon: Scale },
  { id: 'administrateurs', label: 'Administrateurs',             desc: 'Nomination, liste des dirigeants',    icon: Users },
  { id: 'dissolution',     label: 'Dissolution / Radiation',     desc: 'Liquidation, radiation RCS',          icon: UserMinus },
  { id: 'note',            label: 'Note administrative',         desc: 'Message visible par le demandeur',    icon: MessageSquare },
];

function AdminCorrectionForm({ dossier, user, onSaved }) {
  const [selectedSection, setSelectedSection] = useState('identite');
  const [saving, setSaving] = useState(false);
  const [savedSections, setSavedSections] = useState([]);

  const stepData = dossier.step_data || {};
  const activite = stepData.activite || {};
  const idData = stepData.identification?.data || {};
  const identification = stepData.identification || {};

  const [form, setForm] = useState({
    company_name: dossier.company_name || '',
    forme_juridique: dossier.forme_juridique || activite.forme_juridique || '',
    raison_sociale: activite.raison_sociale || '',
    capital_social: activite.capital_social || '',
    commercial_name1: activite.commercial_names?.[0] || '',
    commercial_name2: activite.commercial_names?.[1] || '',
    adresse: idData.adresse || '',
    date_effet_siege: '',
    secteur_principal: activite.secteur_principal || '',
    activite_description: activite.activite_description || '',
    regime_fiscal: activite.regime_fiscal || '',
    nb_employes_prevus: activite.nb_employes_prevus || '',
    nouvelles_activites: '',
    rep_nom: idData.nom || '',
    rep_prenom: idData.prenom || '',
    rep_nni: idData.nni || '',
    rep_numero_identite: idData.numero_identite || '',
    rep_nationalite: idData.nationalite || '',
    rep_date_naissance: idData.date_naissance || '',
    rep_profession: idData.profession || '',
    rep_qualite: '',
    rep_doc_front: identification.document_front_url || '',
    rep_doc_back: identification.document_back_url || '',
    email: idData.email || '',
    telephone: idData.telephone || '',
    ancienne_forme: dossier.forme_juridique || activite.forme_juridique || '',
    nouvelle_forme: '',
    nouveau_capital: '',
    administrateurs: '',
    date_nomination: '',
    motif_dissolution: '',
    liquidateur_nom: '',
    date_dissolution: '',
    motif_radiation: '',
    date_radiation: '',
    pv_cloture: '',
    admin_comment: dossier.admin_comment || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const buildSectionSummary = () => {
    const s = selectedSection;
    if (s === 'identite') return `Correction identité: nom="${form.company_name}", forme="${form.forme_juridique}", capital="${form.capital_social}"`;
    if (s === 'siege') return `Changement siège: "${form.adresse}"${form.date_effet_siege ? ', effet le ' + form.date_effet_siege : ''}`;
    if (s === 'activite') return `Correction activité: secteur="${form.secteur_principal}", régime="${form.regime_fiscal}"`;
    if (s === 'representant') return `Nouveau représentant: ${form.rep_prenom} ${form.rep_nom}, NNI=${form.rep_nni}, qualité="${form.rep_qualite}"`;
    if (s === 'coordonnees') return `Coordonnées: email="${form.email}", tél="${form.telephone}"`;
    if (s === 'forme') return `Changement forme: ${form.ancienne_forme} → ${form.nouvelle_forme}, capital=${form.nouveau_capital}`;
    if (s === 'administrateurs') return `Nomination administrateurs: ${form.administrateurs?.substring(0, 80)}`;
    if (s === 'dissolution') return `Dissolution/Radiation: ${form.motif_dissolution || form.motif_radiation}`;
    if (s === 'note') return `Note admin: ${form.admin_comment?.substring(0, 80)}`;
    return `Correction section "${s}"`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedStepData = {
        ...stepData,
        activite: {
          ...activite,
          forme_juridique: form.nouvelle_forme || form.forme_juridique,
          raison_sociale: form.raison_sociale,
          capital_social: form.nouveau_capital || form.capital_social,
          secteur_principal: form.secteur_principal,
          activite_description: form.activite_description,
          regime_fiscal: form.regime_fiscal,
          nb_employes_prevus: form.nb_employes_prevus,
          commercial_names: [form.commercial_name1, form.commercial_name2].filter(Boolean),
        },
        identification: {
          ...stepData.identification,
          document_front_url: form.rep_doc_front || identification.document_front_url,
          document_back_url: form.rep_doc_back || identification.document_back_url,
          data: {
            ...idData,
            adresse: form.adresse,
            email: form.email,
            telephone: form.telephone,
            nom: form.rep_nom,
            prenom: form.rep_prenom,
            nni: form.rep_nni,
            numero_identite: form.rep_numero_identite,
            nationalite: form.rep_nationalite,
            date_naissance: form.rep_date_naissance,
            profession: form.rep_profession,
          }
        }
      };

      // 1. Update RegistrationDossier (reflected in AdminPortal)
      const recNumber = `CORR-${Date.now().toString().slice(-8)}`;
      await base44.entities.RegistrationDossier.update(dossier.id, {
        company_name: form.company_name,
        forme_juridique: form.nouvelle_forme || form.forme_juridique,
        admin_comment: form.admin_comment,
        step_data: updatedStepData,
        date_traitement: new Date().toISOString().split('T')[0],
      });

      // 2. Log to ModificationDossier for traceability
      const docs = [];
      if (form.rep_doc_front && selectedSection === 'representant') docs.push({ nom: 'CIN Représentant — Recto', url: form.rep_doc_front });
      if (form.rep_doc_back && selectedSection === 'representant') docs.push({ nom: 'CIN Représentant — Verso', url: form.rep_doc_back });

      await base44.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: dossier.step_data?.identification?.entity_type || 'morale',
        type_acte: `Correction admin — ${EDIT_SECTIONS.find(s => s.id === selectedSection)?.label}`,
        description_modification: buildSectionSummary(),
        donnees_modification: { section: selectedSection, ...form },
        documents: docs,
        statut: 'Approuvé',
        admin_email: user?.email,
        recepisse_number: recNumber,
        montant_redevance: 0,
        date_soumission: new Date().toISOString().split('T')[0],
        date_traitement: new Date().toISOString().split('T')[0],
      });

      toast.success('Correction sauvegardée et tracée');
      setSavedSections(prev => [...new Set([...prev, selectedSection])]);
      onSaved();
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex border border-[#E5E7EB] rounded-xl overflow-hidden bg-white" style={{ minHeight: 460 }}>
      {/* Left menu */}
      <div className="w-52 shrink-0 border-r border-[#E5E7EB] bg-[#F9F9F9]">
        <div className="p-3 border-b border-[#E5E7EB]">
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Que corriger ?</p>
        </div>
        <div className="py-2 overflow-y-auto max-h-[480px]">
          {EDIT_SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = selectedSection === s.id;
            const isSaved = savedSections.includes(s.id);
            return (
              <button key={s.id} onClick={() => setSelectedSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:bg-white group ${isActive ? 'bg-white border-r-2 border-[#1A2B6B]' : ''}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-[#1A2B6B] text-white' : 'bg-[#E5E7EB] text-[#6B6B6B] group-hover:bg-[#D1D5DB]'}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#1A2B6B]' : 'text-[#1A1A1A]'}`}>{s.label}</p>
                  <p className="text-[10px] text-[#9B9B9B] truncate">{s.desc}</p>
                </div>
                {isSaved && !isActive && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                {isActive && <ChevronRight className="w-3 h-3 text-[#1A2B6B] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        <p className="text-sm font-semibold text-[#1A1A1A]">{EDIT_SECTIONS.find(s => s.id === selectedSection)?.label}</p>

        {selectedSection === 'identite' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Nom commercial</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Raison sociale</Label><Input value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Forme juridique</Label>
              <select value={form.forme_juridique} onChange={e => set('forme_juridique', e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
                <option value="">— Sélectionner —</option>
                {FORMES_JURIDIQUES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Capital social (DJF)</Label><Input type="number" value={form.capital_social} onChange={e => set('capital_social', e.target.value)} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">1er choix de nom</Label><Input value={form.commercial_name1} onChange={e => set('commercial_name1', e.target.value)} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">2ème choix de nom</Label><Input value={form.commercial_name2} onChange={e => set('commercial_name2', e.target.value)} className="text-sm" /></div>
          </div>
        )}

        {selectedSection === 'siege' && (
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nouvelle adresse du siège social</Label><Input value={form.adresse} onChange={e => set('adresse', e.target.value)} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Date d'effet</Label><Input type="date" value={form.date_effet_siege} onChange={e => set('date_effet_siege', e.target.value)} className="text-sm" /></div>
          </div>
        )}

        {selectedSection === 'activite' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Secteur principal</Label><Input value={form.secteur_principal} onChange={e => set('secteur_principal', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Régime fiscal</Label><Input value={form.regime_fiscal} onChange={e => set('regime_fiscal', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Nb employés prévus</Label><Input type="number" value={form.nb_employes_prevus} onChange={e => set('nb_employes_prevus', e.target.value)} className="text-sm" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Objet social / Description de l'activité</Label><Textarea value={form.activite_description} onChange={e => set('activite_description', e.target.value)} rows={3} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Extension de l'objet (nouvelles activités)</Label><Textarea value={form.nouvelles_activites} onChange={e => set('nouvelles_activites', e.target.value)} rows={2} className="text-sm" /></div>
          </div>
        )}

        {selectedSection === 'representant' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={form.rep_nom} onChange={e => set('rep_nom', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Prénom</Label><Input value={form.rep_prenom} onChange={e => set('rep_prenom', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">NNI</Label><Input value={form.rep_nni} onChange={e => set('rep_nni', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">N° Identité / Passeport</Label><Input value={form.rep_numero_identite} onChange={e => set('rep_numero_identite', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Nationalité</Label><Input value={form.rep_nationalite} onChange={e => set('rep_nationalite', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Date de naissance</Label><Input type="date" value={form.rep_date_naissance} onChange={e => set('rep_date_naissance', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Profession</Label><Input value={form.rep_profession} onChange={e => set('rep_profession', e.target.value)} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Qualité (Gérant, PDG…)</Label><Input value={form.rep_qualite} onChange={e => set('rep_qualite', e.target.value)} className="text-sm" /></div>
            </div>
            <div className="border-t border-[#F0F0F0] pt-3 space-y-3">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Pièce d'identité du représentant</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FileUploadField label="CIN / Passeport — Recto *" url={form.rep_doc_front} onUploaded={url => set('rep_doc_front', url)} />
                <FileUploadField label="CIN — Verso" url={form.rep_doc_back} onUploaded={url => set('rep_doc_back', url)} />
              </div>
              {(form.rep_doc_front || form.rep_doc_back) && (
                <div className="grid grid-cols-2 gap-3">
                  {form.rep_doc_front && <a href={form.rep_doc_front} target="_blank" rel="noopener noreferrer" className="block border border-[#E5E7EB] rounded-xl overflow-hidden"><img src={form.rep_doc_front} alt="Recto" className="w-full h-24 object-cover bg-gray-100" onError={e => { e.target.style.display='none'; }} /><div className="px-2 py-1 text-xs text-[#6B6B6B] border-t">Recto</div></a>}
                  {form.rep_doc_back && <a href={form.rep_doc_back} target="_blank" rel="noopener noreferrer" className="block border border-[#E5E7EB] rounded-xl overflow-hidden"><img src={form.rep_doc_back} alt="Verso" className="w-full h-24 object-cover bg-gray-100" onError={e => { e.target.style.display='none'; }} /><div className="px-2 py-1 text-xs text-[#6B6B6B] border-t">Verso</div></a>}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedSection === 'coordonnees' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={form.telephone} onChange={e => set('telephone', e.target.value)} className="text-sm" /></div>
          </div>
        )}

        {selectedSection === 'forme' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Ancienne forme juridique</Label><Input value={form.ancienne_forme} readOnly className="text-sm bg-[#F5F5F5]" /></div>
            <div className="space-y-1"><Label className="text-xs">Nouvelle forme juridique *</Label>
              <select value={form.nouvelle_forme} onChange={e => set('nouvelle_forme', e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
                <option value="">— Sélectionner —</option>
                {FORMES_JURIDIQUES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2"><Label className="text-xs">Nouveau capital social (DJF)</Label><Input type="number" value={form.nouveau_capital} onChange={e => set('nouveau_capital', e.target.value)} className="text-sm" /></div>
          </div>
        )}

        {selectedSection === 'administrateurs' && (
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Administrateurs nommés (noms & fonctions)</Label><Textarea value={form.administrateurs} onChange={e => set('administrateurs', e.target.value)} rows={5} className="text-sm" placeholder="- M. Ahmed Ali — Président du CA&#10;- Mme. Fatima Hassan — Administratrice" /></div>
            <div className="space-y-1"><Label className="text-xs">Date de nomination</Label><Input type="date" value={form.date_nomination} onChange={e => set('date_nomination', e.target.value)} className="text-sm" /></div>
          </div>
        )}

        {selectedSection === 'dissolution' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">⚠ La dissolution ou radiation met fin à l'existence juridique de l'entreprise au registre.</div>
            <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold">Dissolution</p>
              <div className="space-y-1"><Label className="text-xs">Motif</Label><Textarea value={form.motif_dissolution} onChange={e => set('motif_dissolution', e.target.value)} rows={2} className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Liquidateur</Label><Input value={form.liquidateur_nom} onChange={e => set('liquidateur_nom', e.target.value)} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Date de dissolution</Label><Input type="date" value={form.date_dissolution} onChange={e => set('date_dissolution', e.target.value)} className="text-sm" /></div>
              </div>
            </div>
            <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold">Radiation</p>
              <div className="space-y-1"><Label className="text-xs">Motif</Label><Textarea value={form.motif_radiation} onChange={e => set('motif_radiation', e.target.value)} rows={2} className="text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Date de radiation</Label><Input type="date" value={form.date_radiation} onChange={e => set('date_radiation', e.target.value)} className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Réf. PV de clôture</Label><Input value={form.pv_cloture} onChange={e => set('pv_cloture', e.target.value)} className="text-sm" /></div>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'note' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">Ce message sera visible par le demandeur dans "Mes Dossiers".</div>
            <div className="space-y-1"><Label className="text-xs">Message au demandeur</Label><Textarea value={form.admin_comment} onChange={e => set('admin_comment', e.target.value)} rows={6} className="text-sm" /></div>
          </div>
        )}

        <div className="pt-3 border-t border-[#F0F0F0] flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-sm">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4 mr-2" /> Sauvegarder & tracer</>}
          </Button>
          {savedSections.includes(selectedSection) && (
            <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Sauvegardé</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Company detail: actes + corrections ─────────────────────────────────────

function CompanyActes({ dossier, user, onBack, onDossierUpdated }) {
  const [showActeForm, setShowActeForm] = useState(false);
  const [activeTab, setActiveTab] = useState('actes');

  const { data: allModifications = [], refetch } = useQuery({
    queryKey: ['all-modifications', dossier.id],
    queryFn: () => base44.entities.ModificationDossier.filter({ registration_dossier_id: dossier.id }, '-created_date'),
  });

  const officialActes = allModifications.filter(m => !m.type_acte?.startsWith('Correction admin'));
  const corrections = allModifications.filter(m => m.type_acte?.startsWith('Correction admin'));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ModificationDossier.update(id, data),
    onSuccess: () => { refetch(); toast.success('Statut mis à jour'); },
  });

  const handleApprove = (acte) => {
    updateMutation.mutate({
      id: acte.id,
      data: { statut: 'Approuvé', date_traitement: new Date().toISOString().split('T')[0], admin_email: user?.email }
    });
  };

  const handleReject = (acte) => {
    const comment = window.prompt('Motif du rejet :');
    if (comment === null) return;
    updateMutation.mutate({
      id: acte.id,
      data: { statut: 'Rejeté', admin_comment: comment, date_traitement: new Date().toISOString().split('T')[0], admin_email: user?.email }
    });
  };

  const entityType = dossier.step_data?.identification?.entity_type || 'morale';

  return (
    <div className="space-y-5">
      {/* Company header */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A2B6B] rounded-xl flex items-center justify-center text-white font-bold text-sm">
              {dossier.company_name?.[0] || 'C'}
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A]">{dossier.company_name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                  {entityType === 'physique' ? 'Personne physique' : 'Personne morale'}
                </Badge>
                {dossier.forme_juridique && <Badge className="bg-gray-100 text-gray-700">{dossier.forme_juridique}</Badge>}
                <Badge className={dossier.statut === 'Validé' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>{dossier.statut}</Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-[#9B9B9B]">
            <p>Envelope : <span className="font-mono">{dossier.envelope_id?.substring(0, 12)}...</span></p>
            {dossier.license_number && <p>Licence : <span className="font-semibold text-green-700">{dossier.license_number}</span></p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Actes officiels', count: officialActes.length, color: 'bg-[#1A2B6B]/5 border-[#1A2B6B]/20' },
          { label: 'Corrections admin', count: corrections.length, color: 'bg-purple-50 border-purple-200' },
          { label: 'Approuvés', count: allModifications.filter(a => a.statut === 'Approuvé').length, color: 'bg-green-50 border-green-200' },
          { label: "En cours d'étude", count: allModifications.filter(a => a.statut === "En cours d'étude").length, color: 'bg-amber-50 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold text-[#1A1A1A]">{s.count}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB]">
        {[
          { id: 'actes', label: 'Actes Modificatifs RCS', icon: FilePen },
          { id: 'corrections', label: 'Corrections Administratives', icon: PenLine },
          { id: 'historique', label: 'Historique Complet', icon: History },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === t.id ? 'border-[#1A2B6B] text-[#1A2B6B]' : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.id === 'actes' && officialActes.length > 0 && <span className="ml-1 bg-[#1A2B6B] text-white text-[10px] rounded-full px-1.5">{officialActes.length}</span>}
            {t.id === 'historique' && <span className="ml-1 bg-gray-200 text-gray-700 text-[10px] rounded-full px-1.5">{allModifications.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab: Actes officiels */}
      {activeTab === 'actes' && (
        <div className="space-y-4">
          {showActeForm ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <FilePen className="w-4 h-4 text-[#1A2B6B]" /> Nouvel acte modificatif
              </h3>
              <ActeForm dossier={dossier} user={user}
                onCreated={() => { setShowActeForm(false); refetch(); onDossierUpdated(); }}
                onCancel={() => setShowActeForm(false)} />
            </div>
          ) : (
            <Button onClick={() => setShowActeForm(true)} className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white h-11">
              <Plus className="w-4 h-4 mr-2" /> Inscrire un nouvel acte modificatif
            </Button>
          )}
          <ActesList actes={officialActes} onApprove={handleApprove} onReject={handleReject} emptyLabel="Aucun acte modificatif officiel" />
        </div>
      )}

      {/* Tab: Corrections admin */}
      {activeTab === 'corrections' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            Les corrections administratives mettent immédiatement à jour le dossier dans le <strong>Portail Admin ANPI</strong> et sont tracées ici avec horodatage.
          </div>
          <AdminCorrectionForm dossier={dossier} user={user} onSaved={() => { refetch(); onDossierUpdated(); }} />
          {corrections.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Corrections précédentes ({corrections.length})</p>
              <ActesList actes={corrections} onApprove={null} onReject={null} emptyLabel="" />
            </div>
          )}
        </div>
      )}

      {/* Tab: Historique complet */}
      {activeTab === 'historique' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Toutes les modifications — Chronologie ({allModifications.length})</p>
          {allModifications.length === 0
            ? <div className="text-center py-12 text-[#9B9B9B]"><History className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aucune modification enregistrée</p></div>
            : <ActesList actes={allModifications} onApprove={handleApprove} onReject={handleReject} emptyLabel="Aucune modification" showType />
          }
        </div>
      )}
    </div>
  );
}

// ─── Shared acte card list ────────────────────────────────────────────────────

function ActesList({ actes, onApprove, onReject, emptyLabel, showType = false }) {
  if (actes.length === 0) return emptyLabel ? (
    <div className="text-center py-12 text-[#9B9B9B]"><FilePen className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">{emptyLabel}</p></div>
  ) : null;

  return (
    <div className="space-y-3">
      {actes.map(acte => {
        const isCorrection = acte.type_acte?.startsWith('Correction admin');
        return (
          <div key={acte.id} className={`bg-white border rounded-xl p-4 space-y-3 ${isCorrection ? 'border-purple-200' : 'border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {isCorrection
                  ? <PenLine className="w-4 h-4 text-purple-500" />
                  : <FilePen className="w-4 h-4 text-[#1A2B6B]" />
                }
                <span className="font-semibold text-sm text-[#1A1A1A]">{acte.type_acte}</span>
                <Badge className={`${STATUS_STYLE[acte.statut] || 'bg-gray-100 text-gray-700'} text-[10px]`}>{acte.statut}</Badge>
                {isCorrection && <Badge className="bg-purple-100 text-purple-700 text-[10px]">Correction admin</Badge>}
              </div>
              <span className="text-[10px] font-mono text-[#9B9B9B]">{acte.recepisse_number}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Redevance</p><p className="font-semibold">{(acte.montant_redevance || 0).toLocaleString()} DJF</p></div>
              <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Soumis le</p><p className="font-semibold">{acte.date_soumission ? format(new Date(acte.date_soumission), 'dd/MM/yyyy') : '—'}</p></div>
              <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Traité le</p><p className="font-semibold">{acte.date_traitement ? format(new Date(acte.date_traitement), 'dd/MM/yyyy') : '—'}</p></div>
              <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Agent ODPIC</p><p className="font-semibold truncate">{acte.admin_email || '—'}</p></div>
            </div>

            {acte.description_modification && <p className="text-xs text-[#6B6B6B] italic">{acte.description_modification}</p>}

            {acte.donnees_modification && !isCorrection && Object.keys(acte.donnees_modification).length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(acte.donnees_modification).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="p-2 bg-blue-50 rounded-lg text-[10px]">
                    <p className="text-[#6B6B6B] capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="font-medium text-[#1A1A1A] break-words">{String(v)}</p>
                  </div>
                ))}
              </div>
            )}

            {acte.documents?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {acte.documents.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded hover:underline">
                    <FileText className="w-3 h-3" />{d.nom}
                  </a>
                ))}
              </div>
            )}

            {acte.statut === "En cours d'étude" && onApprove && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApprove(acte)} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approuver & Publier récépissé
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(acte)} className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="w-3 h-3 mr-1" /> Rejeter
                </Button>
              </div>
            )}
            {acte.statut === 'Approuvé' && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Inscrit au RCS — Récépissé publié le {acte.date_traitement ? format(new Date(acte.date_traitement), 'dd/MM/yyyy') : '—'}
              </div>
            )}
            {acte.admin_comment && <p className="text-xs text-red-600 italic">Motif rejet : {acte.admin_comment}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActesModificatifs() {
  const [search, setSearch] = useState('');
  const [selectedDossier, setSelectedDossier] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['registration-dossiers-all'],
    queryFn: () => base44.entities.RegistrationDossier.list('-created_date'),
  });

  const [freshDossier, setFreshDossier] = useState(null);

  // Refresh selected dossier when updates happen
  const handleDossierUpdated = async () => {
    if (!selectedDossier) return;
    const updated = await base44.entities.RegistrationDossier.filter({ id: selectedDossier.id }).then(r => r[0]);
    if (updated) {
      setFreshDossier(updated);
      setSelectedDossier(updated);
      queryClient.invalidateQueries(['registration-dossiers-all']);
    }
  };

  const filtered = dossiers.filter(d => {
    const q = search.toLowerCase();
    return !q || d.company_name?.toLowerCase().includes(q) || d.applicant_email?.toLowerCase().includes(q) || d.envelope_id?.toLowerCase().includes(q);
  });

  if (selectedDossier) {
    const activeDossier = freshDossier || selectedDossier;
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="bg-[#1A2B6B] text-white px-6 py-4 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <button onClick={() => { setSelectedDossier(null); setFreshDossier(null); }} className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Retour à la liste
            </button>
            <div className="w-px h-5 bg-white/20" />
            <FilePen className="w-5 h-5" />
            <h1 className="font-bold">{activeDossier.company_name}</h1>
            <Badge className="bg-white/20 text-white border-0 text-xs">{activeDossier.statut}</Badge>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          <CompanyActes dossier={activeDossier} user={user} onBack={() => { setSelectedDossier(null); setFreshDossier(null); }} onDossierUpdated={handleDossierUpdated} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-[#1A2B6B] text-white px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <FilePen className="w-6 h-6" />
            <h1 className="font-bold text-xl">Actes Modificatifs & Corrections</h1>
          </div>
          <p className="text-blue-200 text-sm">Sélectionnez une entreprise pour gérer ses actes RCS et corrections administratives — toutes les modifications sont tracées avec horodatage et documents.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une entreprise par nom, email ou envelope ID..."
            className="pl-9 h-11 bg-white" />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1A2B6B]" /><p className="text-sm text-[#9B9B9B]">Chargement...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#9B9B9B]"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Aucune entreprise trouvée</p></div>
          ) : filtered.map(d => {
            const entityType = d.step_data?.identification?.entity_type || 'morale';
            return (
              <button key={d.id} onClick={() => { setSelectedDossier(d); setFreshDossier(null); }}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-4 hover:border-[#1A2B6B] hover:shadow-md transition-all text-left">
                <div className="w-10 h-10 bg-[#1A2B6B]/10 rounded-xl flex items-center justify-center text-[#1A2B6B] font-bold text-sm shrink-0">
                  {d.company_name?.[0] || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1A1A1A]">{d.company_name}</span>
                    <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700 text-[10px]' : 'bg-purple-100 text-purple-700 text-[10px]'}>{entityType === 'physique' ? 'Physique' : 'Morale'}</Badge>
                    {d.forme_juridique && <Badge className="bg-gray-100 text-gray-700 text-[10px]">{d.forme_juridique}</Badge>}
                    <Badge className={d.statut === 'Validé' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{d.statut}</Badge>
                  </div>
                  <p className="text-xs text-[#9B9B9B] mt-0.5">{d.applicant_email} · {d.date_soumission ? format(new Date(d.date_soumission), 'dd/MM/yyyy') : '—'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#9B9B9B] shrink-0" />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center text-[#9B9B9B]">{filtered.length} entreprise{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}