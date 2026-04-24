import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PenLine, Save, Building2, Briefcase, MapPin, User,
  ChevronRight, CheckCircle2, Loader2, X, Home, FileText,
  Scale, Users, UserMinus, Upload, RefreshCw, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

const FORMES_JURIDIQUES = [
  'SARL', 'SA', 'SAS', 'EURL', 'SNC', 'Association',
  'Établissement public', 'Entreprise individuelle', 'Succursale'
];

const SECTIONS = [
  { id: 'identite',       label: 'Identité de l\'entreprise',  desc: 'Nom, forme juridique, capital',         icon: Building2 },
  { id: 'siege',          label: 'Siège social',               desc: 'Adresse, changement de siège',          icon: Home },
  { id: 'activite',       label: 'Objet social / Activité',    desc: 'Secteur, description, régime fiscal',   icon: Briefcase },
  { id: 'representant',   label: 'Représentant légal',         desc: 'Identité, pièce d\'identité',           icon: User },
  { id: 'coordonnees',    label: 'Coordonnées',                desc: 'Email, téléphone',                      icon: MapPin },
  { id: 'forme',          label: 'Forme juridique',            desc: 'Changement de forme, capital',          icon: Scale },
  { id: 'administrateurs',label: 'Administrateurs',            desc: 'Nomination, liste des dirigeants',      icon: Users },
  { id: 'dissolution',    label: 'Dissolution / Radiation',    desc: 'Liquidation, radiation RCS',            icon: UserMinus },
  { id: 'note',           label: 'Note administrative',        desc: 'Message visible par le demandeur',      icon: MessageSquare },
];

function FileUpload({ label, url, onUploaded, uploading, setUploading }) {
  const handleFile = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUploaded(file_url);
      toast.success('Document téléchargé');
    } catch {
      toast.error('Erreur de téléchargement');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {url ? (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 flex-1 truncate hover:underline">
            Document téléchargé — Voir ↗
          </a>
          <label className="text-xs text-blue-600 cursor-pointer hover:underline shrink-0">
            Remplacer
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-2 p-3 border-2 border-dashed border-[#D1D5DB] rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white/50">
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            : <Upload className="w-4 h-4 text-[#9B9B9B] shrink-0" />}
          <span className="text-xs text-[#9B9B9B]">
            {uploading ? 'Téléchargement...' : 'Cliquez pour télécharger (PDF, JPG, PNG)'}
          </span>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
            disabled={uploading} />
        </label>
      )}
    </div>
  );
}

function SectionMenu({ selected, onSelect, savedSections }) {
  return (
    <div className="w-56 shrink-0 border-r border-[#E5E7EB] bg-[#F9F9F9]">
      <div className="p-3 border-b border-[#E5E7EB]">
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Que modifier ?</p>
      </div>
      <div className="py-2 overflow-y-auto max-h-[480px]">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = selected === s.id;
          const isSaved = savedSections.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-white group ${
                isActive ? 'bg-white border-r-2 border-[#1A2B6B]' : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isActive ? 'bg-[#1A2B6B] text-white' : 'bg-[#E5E7EB] text-[#6B6B6B] group-hover:bg-[#D1D5DB]'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#1A2B6B]' : 'text-[#1A1A1A]'}`}>{s.label}</p>
                <p className="text-[10px] text-[#9B9B9B] truncate">{s.desc}</p>
              </div>
              {isSaved && !isActive && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#1A2B6B] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DossierEditPanel({ dossier, onSave }) {
  const [open, setOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState('identite');
  const [saving, setSaving] = useState(false);
  const [savedSections, setSavedSections] = useState([]);
  const [uploading, setUploading] = useState({});

  const stepData = dossier.step_data || {};
  const activite = stepData.activite || {};
  const idData = stepData.identification?.data || {};
  const identification = stepData.identification || {};

  const [form, setForm] = useState({
    // identite
    company_name: dossier.company_name || '',
    forme_juridique: dossier.forme_juridique || activite.forme_juridique || '',
    raison_sociale: activite.raison_sociale || '',
    capital_social: activite.capital_social || '',
    commercial_name1: activite.commercial_names?.[0] || '',
    commercial_name2: activite.commercial_names?.[1] || '',
    // siege
    adresse: idData.adresse || '',
    date_effet_siege: '',
    // activite / objet
    secteur_principal: activite.secteur_principal || '',
    activite_description: activite.activite_description || '',
    regime_fiscal: activite.regime_fiscal || '',
    nb_employes_prevus: activite.nb_employes_prevus || '',
    nouvelles_activites: '',
    // representant
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
    // coordonnees
    email: idData.email || '',
    telephone: idData.telephone || '',
    // forme juridique
    ancienne_forme: dossier.forme_juridique || activite.forme_juridique || '',
    nouvelle_forme: '',
    nouveau_capital: '',
    // administrateurs
    administrateurs: '',
    date_nomination: '',
    // dissolution / radiation
    motif_dissolution: '',
    liquidateur_nom: '',
    date_dissolution: '',
    motif_radiation: '',
    date_radiation: '',
    pv_cloture: '',
    // note
    admin_comment: dossier.admin_comment || '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setUploadingKey = (key, val) => setUploading(prev => ({ ...prev, [key]: val }));

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
            ...(stepData.identification?.data || {}),
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

      const updated = await base44.entities.RegistrationDossier.update(dossier.id, {
        company_name: form.company_name,
        forme_juridique: form.nouvelle_forme || form.forme_juridique,
        admin_comment: form.admin_comment,
        step_data: updatedStepData,
        date_traitement: new Date().toISOString().split('T')[0],
      });

      toast.success('Section sauvegardée');
      setSavedSections(prev => [...new Set([...prev, selectedSection])]);
      onSave(updated);
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center justify-between bg-[#F9F9F9] border-b border-[#E5E7EB] hover:bg-[#F0F0F0] transition-colors"
      >
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-[#1A2B6B]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">Modifier le dossier</span>
          <span className="text-xs text-[#9B9B9B]">Corrections & actes administratifs</span>
          {savedSections.length > 0 && (
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {savedSections.length} section{savedSections.length > 1 ? 's' : ''} modifiée{savedSections.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
          <ChevronRight className="w-4 h-4 text-[#9B9B9B]" />
        </div>
      </button>

      {open && (
        <div className="flex" style={{ minHeight: 460 }}>
          {/* Left: section menu */}
          <SectionMenu
            selected={selectedSection}
            onSelect={setSelectedSection}
            savedSections={savedSections}
          />

          {/* Right: edit form */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {SECTIONS.find(s => s.id === selectedSection)?.label}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-[#9B9B9B] h-7 px-2">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* ── IDENTITÉ ── */}
            {selectedSection === 'identite' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom commercial</Label>
                  <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Raison sociale</Label>
                  <Input value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Forme juridique</Label>
                  <select value={form.forme_juridique} onChange={e => set('forme_juridique', e.target.value)}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
                    <option value="">— Sélectionner —</option>
                    {FORMES_JURIDIQUES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Capital social (DJF)</Label>
                  <Input type="number" value={form.capital_social} onChange={e => set('capital_social', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">1er choix de nom</Label>
                  <Input value={form.commercial_name1} onChange={e => set('commercial_name1', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">2ème choix de nom</Label>
                  <Input value={form.commercial_name2} onChange={e => set('commercial_name2', e.target.value)} className="text-sm" />
                </div>
              </div>
            )}

            {/* ── SIÈGE SOCIAL ── */}
            {selectedSection === 'siege' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nouvelle adresse du siège social</Label>
                  <Input value={form.adresse} onChange={e => set('adresse', e.target.value)} className="text-sm" placeholder="Adresse complète" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date d'effet du changement</Label>
                  <Input type="date" value={form.date_effet_siege} onChange={e => set('date_effet_siege', e.target.value)} className="text-sm" />
                </div>
              </div>
            )}

            {/* ── OBJET SOCIAL / ACTIVITÉ ── */}
            {selectedSection === 'activite' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Secteur principal</Label>
                    <Input value={form.secteur_principal} onChange={e => set('secteur_principal', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Régime fiscal</Label>
                    <Input value={form.regime_fiscal} onChange={e => set('regime_fiscal', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nb employés prévus</Label>
                    <Input type="number" value={form.nb_employes_prevus} onChange={e => set('nb_employes_prevus', e.target.value)} className="text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Objet social / Description de l'activité</Label>
                  <Textarea value={form.activite_description} onChange={e => set('activite_description', e.target.value)} rows={3} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Extension de l'objet social (nouvelles activités à ajouter)</Label>
                  <Textarea value={form.nouvelles_activites} onChange={e => set('nouvelles_activites', e.target.value)} rows={2} className="text-sm" placeholder="Listez les nouvelles activités..." />
                </div>
              </div>
            )}

            {/* ── REPRÉSENTANT LÉGAL ── */}
            {selectedSection === 'representant' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  Modification du représentant légal — tous les champs modifiés seront mis à jour dans le dossier.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom</Label>
                    <Input value={form.rep_nom} onChange={e => set('rep_nom', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prénom</Label>
                    <Input value={form.rep_prenom} onChange={e => set('rep_prenom', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">NNI</Label>
                    <Input value={form.rep_nni} onChange={e => set('rep_nni', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">N° Identité / Passeport</Label>
                    <Input value={form.rep_numero_identite} onChange={e => set('rep_numero_identite', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nationalité</Label>
                    <Input value={form.rep_nationalite} onChange={e => set('rep_nationalite', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date de naissance</Label>
                    <Input type="date" value={form.rep_date_naissance} onChange={e => set('rep_date_naissance', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Profession</Label>
                    <Input value={form.rep_profession} onChange={e => set('rep_profession', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qualité (Gérant, PDG, DG…)</Label>
                    <Input value={form.rep_qualite} onChange={e => set('rep_qualite', e.target.value)} className="text-sm" placeholder="Ex: Gérant" />
                  </div>
                </div>

                {/* ID Document uploads */}
                <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
                  <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Pièce d'identité du nouveau représentant
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FileUpload
                      label="CIN / Passeport — Recto *"
                      url={form.rep_doc_front}
                      onUploaded={url => set('rep_doc_front', url)}
                      uploading={uploading.rep_doc_front}
                      setUploading={val => setUploadingKey('rep_doc_front', val)}
                    />
                    <FileUpload
                      label="CIN — Verso (si applicable)"
                      url={form.rep_doc_back}
                      onUploaded={url => set('rep_doc_back', url)}
                      uploading={uploading.rep_doc_back}
                      setUploading={val => setUploadingKey('rep_doc_back', val)}
                    />
                  </div>
                  {form.rep_doc_front && (
                    <div className="grid grid-cols-2 gap-3">
                      {form.rep_doc_front && (
                        <a href={form.rep_doc_front} target="_blank" rel="noopener noreferrer"
                          className="block border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                          <img src={form.rep_doc_front} alt="Recto" className="w-full h-28 object-cover bg-gray-100"
                            onError={e => { e.target.style.display = 'none'; }} />
                          <div className="px-2 py-1.5 text-xs text-[#6B6B6B] border-t">Recto</div>
                        </a>
                      )}
                      {form.rep_doc_back && (
                        <a href={form.rep_doc_back} target="_blank" rel="noopener noreferrer"
                          className="block border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                          <img src={form.rep_doc_back} alt="Verso" className="w-full h-28 object-cover bg-gray-100"
                            onError={e => { e.target.style.display = 'none'; }} />
                          <div className="px-2 py-1.5 text-xs text-[#6B6B6B] border-t">Verso</div>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COORDONNÉES ── */}
            {selectedSection === 'coordonnees' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} className="text-sm" />
                </div>
              </div>
            )}

            {/* ── FORME JURIDIQUE ── */}
            {selectedSection === 'forme' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Ancienne forme juridique</Label>
                    <Input value={form.ancienne_forme} onChange={e => set('ancienne_forme', e.target.value)} className="text-sm" readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nouvelle forme juridique *</Label>
                    <select value={form.nouvelle_forme} onChange={e => set('nouvelle_forme', e.target.value)}
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white">
                      <option value="">— Sélectionner —</option>
                      {FORMES_JURIDIQUES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Nouveau capital social (DJF)</Label>
                    <Input type="number" value={form.nouveau_capital} onChange={e => set('nouveau_capital', e.target.value)} className="text-sm" placeholder="Montant en DJF" />
                  </div>
                </div>
              </div>
            )}

            {/* ── ADMINISTRATEURS ── */}
            {selectedSection === 'administrateurs' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Administrateurs nommés (noms & fonctions)</Label>
                  <Textarea value={form.administrateurs} onChange={e => set('administrateurs', e.target.value)} rows={5}
                    className="text-sm" placeholder="Ex:&#10;- M. Ahmed Ali — Président du CA&#10;- Mme. Fatima Hassan — Administratrice" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date de nomination</Label>
                  <Input type="date" value={form.date_nomination} onChange={e => set('date_nomination', e.target.value)} className="text-sm" />
                </div>
              </div>
            )}

            {/* ── DISSOLUTION / RADIATION ── */}
            {selectedSection === 'dissolution' && (
              <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-700 mb-0.5">⚠ Action irréversible</p>
                  <p className="text-xs text-red-600">La dissolution ou radiation met fin à l'existence juridique de l'entreprise au registre.</p>
                </div>

                <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#1A1A1A]">Dissolution</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Motif de la dissolution</Label>
                    <Textarea value={form.motif_dissolution} onChange={e => set('motif_dissolution', e.target.value)} rows={2} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom du liquidateur</Label>
                      <Input value={form.liquidateur_nom} onChange={e => set('liquidateur_nom', e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date de dissolution</Label>
                      <Input type="date" value={form.date_dissolution} onChange={e => set('date_dissolution', e.target.value)} className="text-sm" />
                    </div>
                  </div>
                </div>

                <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#1A1A1A]">Radiation</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Motif de la radiation</Label>
                    <Textarea value={form.motif_radiation} onChange={e => set('motif_radiation', e.target.value)} rows={2} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date de radiation</Label>
                      <Input type="date" value={form.date_radiation} onChange={e => set('date_radiation', e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Réf. PV de clôture</Label>
                      <Input value={form.pv_cloture} onChange={e => set('pv_cloture', e.target.value)} className="text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── NOTE ADMINISTRATIVE ── */}
            {selectedSection === 'note' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  Ce message sera visible par le demandeur dans son espace "Mes Dossiers".
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Message au demandeur</Label>
                  <Textarea
                    value={form.admin_comment}
                    onChange={e => set('admin_comment', e.target.value)}
                    placeholder="Ex: Nous avons corrigé votre raison sociale suite à votre demande du ..."
                    rows={6}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="pt-3 border-t border-[#F0F0F0] flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving} className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-sm">
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</>
                  : <><Save className="w-4 h-4 mr-2" /> Enregistrer cette section</>
                }
              </Button>
              {savedSections.includes(selectedSection) && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sauvegardé
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}