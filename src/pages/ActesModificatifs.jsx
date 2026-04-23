import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FilePen, Plus, Search, Building2, ArrowLeft, CheckCircle2,
  XCircle, Upload, FileText, Loader2, Award, ChevronRight, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Acte Form ───────────────────────────────────────────────────────────────

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
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setFields(prev => ({ ...prev, [k]: v }));

  const handleUpload = async (file) => {
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDocs(prev => [...prev, { nom: file.name, url: file_url }]);
    setUploadingDoc(false);
  };

  const handleSubmit = async () => {
    if (!typeActe) { toast.error("Sélectionnez un type d'acte"); return; }
    setSaving(true);
    try {
      const recNumber = `MOD-${Date.now().toString().slice(-8)}`;
      await base44.entities.ModificationDossier.create({
        registration_dossier_id: dossier.id,
        company_name: dossier.company_name,
        envelope_id: dossier.envelope_id,
        applicant_email: dossier.applicant_email,
        entity_type: entityType,
        type_acte: typeActe,
        description_modification: description,
        donnees_modification: fields,
        documents: docs,
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
          {entityType === 'physique' ? 'Personne physique' : 'Personne morale'}
        </Badge>
        <span className="text-sm font-semibold text-[#1A1A1A]">{dossier.company_name}</span>
        {dossier.forme_juridique && <Badge className="bg-gray-100 text-gray-700">{dossier.forme_juridique}</Badge>}
      </div>

      {/* Type d'acte */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Type d'acte modificatif *</Label>
        <select
          value={typeActe}
          onChange={e => { setTypeActe(e.target.value); setFields({}); }}
          className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="">— Sélectionner un acte —</option>
          {actes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {typeActe && (
          <p className="text-xs text-[#6B6B6B] flex items-center gap-1">
            Redevance ODPIC :
            <strong className="text-[#1A2B6B]">{(REDEVANCES[typeActe] || 0).toLocaleString()} DJF</strong>
          </p>
        )}
      </div>

      {/* Dynamic fields */}
      {dynamicFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          {dynamicFields.map(f => (
            <div key={f.key} className={`space-y-1 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
              <Label className="text-xs font-medium">{f.label}</Label>
              {f.type === 'textarea' ? (
                <Textarea rows={2} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="text-sm bg-white" />
              ) : (
                <Input type={f.type} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="text-sm bg-white" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-sm">Description / Motif détaillé</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          placeholder="Détails supplémentaires sur la modification..." />
      </div>

      {/* Via représentant */}
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
                <option>Notaire</option>
                <option>Avocat</option>
                <option>Huissier de justice</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
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
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} disabled={uploadingDoc} />
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

// ─── Actes List for selected company ─────────────────────────────────────────

function CompanyActes({ dossier, user, onBack }) {
  const [showForm, setShowForm] = useState(false);

  const { data: actes = [], refetch } = useQuery({
    queryKey: ['actes-modificatifs', dossier.id],
    queryFn: () => base44.entities.ModificationDossier.filter({ registration_dossier_id: dossier.id }, '-created_date'),
  });

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
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'} >
                  {entityType === 'physique' ? 'Personne physique' : 'Personne morale'}
                </Badge>
                {dossier.forme_juridique && <Badge className="bg-gray-100 text-gray-700">{dossier.forme_juridique}</Badge>}
                <Badge className={dossier.statut === 'Validé' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {dossier.statut}
                </Badge>
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total actes', count: actes.length, color: 'bg-gray-50 border-gray-200' },
          { label: 'Approuvés', count: actes.filter(a => a.statut === 'Approuvé').length, color: 'bg-green-50 border-green-200' },
          { label: "En cours d'étude", count: actes.filter(a => a.statut === "En cours d'étude").length, color: 'bg-amber-50 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold text-[#1A1A1A]">{s.count}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New acte form or button */}
      {showForm ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <FilePen className="w-4 h-4 text-[#1A2B6B]" /> Nouvel acte modificatif
          </h3>
          <ActeForm
            dossier={dossier}
            user={user}
            onCreated={() => { setShowForm(false); refetch(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white h-11">
          <Plus className="w-4 h-4 mr-2" /> Inscrire un nouvel acte modificatif
        </Button>
      )}

      {/* Existing actes */}
      {actes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Historique des actes ({actes.length})</p>
          {actes.map(acte => (
            <div key={acte.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FilePen className="w-4 h-4 text-[#1A2B6B]" />
                  <span className="font-semibold text-sm text-[#1A1A1A]">{acte.type_acte}</span>
                  <Badge className={`${STATUS_STYLE[acte.statut] || 'bg-gray-100 text-gray-700'} text-[10px]`}>{acte.statut}</Badge>
                </div>
                <span className="text-[10px] font-mono text-[#9B9B9B]">{acte.recepisse_number}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 bg-[#F9F9F9] rounded-lg">
                  <p className="text-[#9B9B9B]">Redevance</p>
                  <p className="font-semibold">{(acte.montant_redevance || 0).toLocaleString()} DJF</p>
                </div>
                <div className="p-2 bg-[#F9F9F9] rounded-lg">
                  <p className="text-[#9B9B9B]">Soumis le</p>
                  <p className="font-semibold">{acte.date_soumission ? format(new Date(acte.date_soumission), 'dd/MM/yyyy') : '—'}</p>
                </div>
                <div className="p-2 bg-[#F9F9F9] rounded-lg">
                  <p className="text-[#9B9B9B]">Via représentant</p>
                  <p className="font-semibold">{acte.via_representant ? `${acte.representant_qualite}` : 'Non'}</p>
                </div>
                <div className="p-2 bg-[#F9F9F9] rounded-lg">
                  <p className="text-[#9B9B9B]">Agent ODPIC</p>
                  <p className="font-semibold truncate">{acte.admin_email || '—'}</p>
                </div>
              </div>

              {acte.description_modification && (
                <p className="text-xs text-[#6B6B6B] italic">{acte.description_modification}</p>
              )}

              {acte.donnees_modification && Object.keys(acte.donnees_modification).length > 0 && (
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

              {acte.statut === "En cours d'étude" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(acte)} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approuver & Publier récépissé
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(acte)} className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50">
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

              {acte.admin_comment && (
                <p className="text-xs text-red-600 italic">Motif rejet : {acte.admin_comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {actes.length === 0 && !showForm && (
        <div className="text-center py-12 text-[#9B9B9B]">
          <FilePen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun acte modificatif pour cette entreprise</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActesModificatifs() {
  const [search, setSearch] = useState('');
  const [selectedDossier, setSelectedDossier] = useState(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['registration-dossiers-all'],
    queryFn: () => base44.entities.RegistrationDossier.list('-created_date'),
  });

  const filtered = dossiers.filter(d => {
    const q = search.toLowerCase();
    return !q || d.company_name?.toLowerCase().includes(q) || d.applicant_email?.toLowerCase().includes(q) || d.envelope_id?.toLowerCase().includes(q);
  });

  if (selectedDossier) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Header */}
        <div className="bg-[#1A2B6B] text-white px-6 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={() => setSelectedDossier(null)} className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Retour à la liste
            </button>
            <div className="w-px h-5 bg-white/20" />
            <FilePen className="w-5 h-5" />
            <h1 className="font-bold">Actes Modificatifs — {selectedDossier.company_name}</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <CompanyActes dossier={selectedDossier} user={user} onBack={() => setSelectedDossier(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-[#1A2B6B] text-white px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <FilePen className="w-6 h-6" />
            <h1 className="font-bold text-xl">Actes Modificatifs & Radiations</h1>
          </div>
          <p className="text-blue-200 text-sm">Sélectionnez une entreprise pour inscrire ou gérer ses actes modificatifs au Registre de Commerce et des Sociétés</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une entreprise par nom, email ou envelope ID..."
            className="pl-9 h-11 bg-white"
          />
        </div>

        {/* Companies list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1A2B6B]" />
              <p className="text-sm text-[#9B9B9B]">Chargement des entreprises...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#9B9B9B]">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune entreprise trouvée</p>
            </div>
          ) : filtered.map(d => {
            const entityType = d.step_data?.identification?.entity_type || 'morale';
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDossier(d)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-4 hover:border-[#1A2B6B] hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 bg-[#1A2B6B]/10 rounded-xl flex items-center justify-center text-[#1A2B6B] font-bold text-sm shrink-0">
                  {d.company_name?.[0] || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1A1A1A]">{d.company_name}</span>
                    <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700 text-[10px]' : 'bg-purple-100 text-purple-700 text-[10px]'}>
                      {entityType === 'physique' ? 'Physique' : 'Morale'}
                    </Badge>
                    {d.forme_juridique && <Badge className="bg-gray-100 text-gray-700 text-[10px]">{d.forme_juridique}</Badge>}
                    <Badge className={d.statut === 'Validé' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                      {d.statut}
                    </Badge>
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