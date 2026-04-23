import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FilePen, Plus, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Clock, Upload, FileText, Loader2, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Acts available per entity type
const ACTES_PHYSIQUE = [
  'Changement siège social',
  'Changement nom commercial',
  'Extension objet social',
  'Changement objet social',
  'Inscription location-gérance',
  'Cession fonds de commerce',
  'Radiation',
];

const ACTES_MORALE = [
  'Changement siège social',
  'Changement représentant légal',
  'Extension objet social',
  'Changement objet social',
  'Changement forme juridique',
  'Nomination administrateurs',
  'Approbation des comptes',
  'Dissolution',
  'Radiation',
];

// Dynamic fields per acte type
const ACTE_FIELDS = {
  'Changement siège social': [
    { key: 'nouvelle_adresse', label: 'Nouvelle adresse du siège', type: 'text' },
    { key: 'date_effet', label: 'Date d\'effet', type: 'date' },
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
    { key: 'ancien_representant', label: 'Nom de l\'ancien représentant', type: 'text' },
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
    { key: 'date_assemblee', label: 'Date de l\'assemblée générale', type: 'date' },
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
  'Changement siège social': 15000,
  'Changement nom commercial': 15000,
  'Extension objet social': 20000,
  'Changement objet social': 20000,
  'Inscription location-gérance': 25000,
  'Cession fonds de commerce': 50000,
  'Changement représentant légal': 15000,
  'Changement forme juridique': 30000,
  'Nomination administrateurs': 15000,
  'Approbation des comptes': 10000,
  'Dissolution': 40000,
  'Radiation': 25000,
};

const STATUS_STYLE = {
  "En cours d'étude": 'bg-amber-100 text-amber-700',
  'Approuvé': 'bg-green-100 text-green-700',
  'Rejeté': 'bg-red-100 text-red-700',
};

function ActeForm({ dossier, user, onCreated }) {
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
    if (!typeActe) { toast.error('Sélectionnez un type d\'acte'); return; }
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
      toast.success(`Acte modificatif enregistré — Récépissé ${recNumber}`);
      onCreated();
    } catch (e) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const dynamicFields = ACTE_FIELDS[typeActe] || [];

  return (
    <div className="space-y-4 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
      {/* Entity type badge */}
      <div className="flex items-center gap-2">
        <Badge className={entityType === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
          {entityType === 'physique' ? 'Personne physique' : 'Personne morale'}
        </Badge>
        <span className="text-xs text-[#6B6B6B]">{dossier.company_name}</span>
      </div>

      {/* Type d'acte */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Type d'acte modificatif *</Label>
        <select
          value={typeActe}
          onChange={e => { setTypeActe(e.target.value); setFields({}); }}
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">— Sélectionner un acte —</option>
          {actes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {typeActe && (
          <p className="text-xs text-[#6B6B6B]">
            Redevance ODPIC : <strong>{(REDEVANCES[typeActe] || 0).toLocaleString()} DJF</strong>
          </p>
        )}
      </div>

      {/* Dynamic fields per acte */}
      {dynamicFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dynamicFields.map(f => (
            <div key={f.key} className={`space-y-1 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
              <Label className="text-xs">{f.label}</Label>
              {f.type === 'textarea' ? (
                <Textarea rows={2} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="text-sm" />
              ) : (
                <Input type={f.type} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="text-sm" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-xs">Description / Motif détaillé</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="text-sm" placeholder="Détails supplémentaires sur la modification..." />
      </div>

      {/* Via représentant */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="via_rep" checked={viaRep} onChange={e => setViaRep(e.target.checked)} className="rounded" />
        <Label htmlFor="via_rep" className="text-xs cursor-pointer">Demande via auxiliaire de justice (notaire, avocat, huissier)</Label>
      </div>
      {viaRep && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nom du représentant</Label>
            <Input value={repNom} onChange={e => setRepNom(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Qualité</Label>
            <select value={repQualite} onChange={e => setRepQualite(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
              <option>Notaire</option>
              <option>Avocat</option>
              <option>Huissier de justice</option>
            </select>
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Documents justificatifs</Label>
        {docs.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            <FileText className="w-3.5 h-3.5" />
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{d.nom}</a>
          </div>
        ))}
        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl px-4 py-2.5 hover:border-blue-400 hover:bg-blue-50 transition-all">
          {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
          <span className="text-sm text-[#6B6B6B]">{uploadingDoc ? 'Téléchargement...' : 'Ajouter un document (acte, PV, décision...)'}</span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => e.target.files[0] && handleUpload(e.target.files[0])}
            disabled={uploadingDoc} />
        </label>
      </div>

      <Button onClick={handleSubmit} disabled={saving || !typeActe} className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white">
        {saving
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</>
          : <><Award className="w-4 h-4 mr-2" /> Inscrire l'acte modificatif au registre</>
        }
      </Button>
    </div>
  );
}

export default function ActesModificatifsPanel({ dossier, user }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: actes = [], refetch } = useQuery({
    queryKey: ['actes-modificatifs', dossier.id],
    queryFn: () => base44.entities.ModificationDossier.filter({ registration_dossier_id: dossier.id }, '-created_date'),
    enabled: open,
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

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center justify-between bg-[#F9F9F9] border-b border-[#E5E7EB] hover:bg-[#F0F0F0] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FilePen className="w-4 h-4 text-[#1A2B6B]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">Actes Modificatifs & Radiations</span>
          <span className="text-xs text-[#9B9B9B]">Registre de Commerce et des Sociétés</span>
          {actes.length > 0 && (
            <span className="text-[10px] bg-[#1A2B6B] text-white rounded-full px-2 py-0.5">{actes.length}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#6B6B6B]" /> : <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />}
      </button>

      {open && (
        <div className="p-5 space-y-4">
          {/* Existing actes */}
          {actes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Actes enregistrés ({actes.length})</p>
              {actes.map(acte => (
                <div key={acte.id} className="border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FilePen className="w-4 h-4 text-[#1A2B6B]" />
                      <span className="font-semibold text-sm text-[#1A1A1A]">{acte.type_acte}</span>
                      <Badge className={`${STATUS_STYLE[acte.statut] || 'bg-gray-100 text-gray-700'} text-[10px]`}>{acte.statut}</Badge>
                    </div>
                    <span className="text-[10px] font-mono text-[#9B9B9B]">{acte.recepisse_number}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                    <div className="p-1.5 bg-[#F9F9F9] rounded">
                      <p className="text-[#9B9B9B]">Redevance</p>
                      <p className="font-semibold">{(acte.montant_redevance || 0).toLocaleString()} DJF</p>
                    </div>
                    <div className="p-1.5 bg-[#F9F9F9] rounded">
                      <p className="text-[#9B9B9B]">Soumis le</p>
                      <p className="font-semibold">{acte.date_soumission ? format(new Date(acte.date_soumission), 'dd/MM/yyyy') : '—'}</p>
                    </div>
                    <div className="p-1.5 bg-[#F9F9F9] rounded">
                      <p className="text-[#9B9B9B]">Via représentant</p>
                      <p className="font-semibold">{acte.via_representant ? `${acte.representant_qualite} — ${acte.representant_nom}` : 'Non'}</p>
                    </div>
                    <div className="p-1.5 bg-[#F9F9F9] rounded">
                      <p className="text-[#9B9B9B]">Agent ODPIC</p>
                      <p className="font-semibold truncate">{acte.admin_email || '—'}</p>
                    </div>
                  </div>

                  {acte.description_modification && (
                    <p className="text-xs text-[#6B6B6B] italic">{acte.description_modification}</p>
                  )}

                  {/* Modification data summary */}
                  {acte.donnees_modification && Object.keys(acte.donnees_modification).length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(acte.donnees_modification).map(([k, v]) => v && (
                        <div key={k} className="p-1.5 bg-blue-50 rounded text-[10px]">
                          <p className="text-[#9B9B9B] capitalize">{k.replace(/_/g, ' ')}</p>
                          <p className="font-medium text-[#1A1A1A] break-words">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Documents */}
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

                  {/* Actions */}
                  {acte.statut === "En cours d'étude" && (
                    <div className="flex gap-2 pt-1">
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

          {/* New acte form */}
          {showForm ? (
            <>
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Nouvel acte modificatif</p>
              <ActeForm
                dossier={dossier}
                user={user}
                onCreated={() => { setShowForm(false); refetch(); }}
              />
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="text-xs">Annuler</Button>
            </>
          ) : (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Inscrire un nouvel acte modificatif
            </Button>
          )}
        </div>
      )}
    </div>
  );
}