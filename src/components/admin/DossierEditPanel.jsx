import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PenLine, Save, Building2, Briefcase, MapPin, User,
  ChevronRight, CheckCircle2, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';

const FORMES_JURIDIQUES = [
  'SARL', 'SA', 'SAS', 'EURL', 'SNC', 'Association',
  'Établissement public', 'Entreprise individuelle', 'Succursale'
];

const SECTIONS = [
  {
    id: 'identite',
    label: 'Identité de l\'entreprise',
    desc: 'Nom, forme juridique, capital',
    icon: Building2,
  },
  {
    id: 'activite',
    label: 'Activité',
    desc: 'Secteur, régime fiscal, description',
    icon: Briefcase,
  },
  {
    id: 'coordonnees',
    label: 'Coordonnées',
    desc: 'Adresse, email, téléphone',
    icon: MapPin,
  },
  {
    id: 'representant',
    label: 'Représentant légal',
    desc: 'Nom, prénom, identité',
    icon: User,
  },
  {
    id: 'note',
    label: 'Note administrative',
    desc: 'Message visible par le demandeur',
    icon: PenLine,
  },
];

function SectionMenu({ selected, onSelect, savedSections }) {
  return (
    <div className="w-56 shrink-0 border-r border-[#E5E7EB] bg-[#F9F9F9]">
      <div className="p-3 border-b border-[#E5E7EB]">
        <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Que modifier ?</p>
      </div>
      <div className="py-2">
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
              {isSaved && !isActive && (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              )}
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-[#1A2B6B] shrink-0" />
              )}
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

  const stepData = dossier.step_data || {};
  const activite = stepData.activite || {};
  const idData = stepData.identification?.data || {};

  const [form, setForm] = useState({
    // identite
    company_name: dossier.company_name || '',
    forme_juridique: dossier.forme_juridique || activite.forme_juridique || '',
    raison_sociale: activite.raison_sociale || '',
    capital_social: activite.capital_social || '',
    commercial_name1: activite.commercial_names?.[0] || '',
    commercial_name2: activite.commercial_names?.[1] || '',
    // activite
    secteur_principal: activite.secteur_principal || '',
    activite_description: activite.activite_description || '',
    regime_fiscal: activite.regime_fiscal || '',
    nb_employes_prevus: activite.nb_employes_prevus || '',
    // coordonnees
    adresse: idData.adresse || '',
    email: idData.email || '',
    telephone: idData.telephone || '',
    // representant
    rep_nom: idData.nom || '',
    rep_prenom: idData.prenom || '',
    rep_nni: idData.nni || '',
    rep_numero_identite: idData.numero_identite || '',
    rep_nationalite: idData.nationalite || '',
    rep_date_naissance: idData.date_naissance || '',
    rep_profession: idData.profession || '',
    // note
    admin_comment: dossier.admin_comment || '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedStepData = {
        ...stepData,
        activite: {
          ...activite,
          forme_juridique: form.forme_juridique,
          raison_sociale: form.raison_sociale,
          capital_social: form.capital_social,
          secteur_principal: form.secteur_principal,
          activite_description: form.activite_description,
          regime_fiscal: form.regime_fiscal,
          nb_employes_prevus: form.nb_employes_prevus,
          commercial_names: [form.commercial_name1, form.commercial_name2].filter(Boolean),
        },
        identification: {
          ...stepData.identification,
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
        forme_juridique: form.forme_juridique,
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
          <span className="text-xs text-[#9B9B9B]">Corrections administratives</span>
          {savedSections.length > 0 && (
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {savedSections.length} section{savedSections.length > 1 ? 's' : ''} modifiée{savedSections.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <span className="text-xs text-[#9B9B9B]">Cliquez sur une section pour modifier</span>
          )}
          <div className={`w-5 h-5 rounded flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
            <ChevronRight className="w-4 h-4 text-[#9B9B9B]" />
          </div>
        </div>
      </button>

      {open && (
        <div className="flex min-h-[400px]">
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

            {/* IDENTITÉ */}
            {selectedSection === 'identite' && (
              <div className="space-y-3">
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
              </div>
            )}

            {/* ACTIVITÉ */}
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
                  <Label className="text-xs">Description de l'activité</Label>
                  <Textarea value={form.activite_description} onChange={e => set('activite_description', e.target.value)} rows={4} className="text-sm" />
                </div>
              </div>
            )}

            {/* COORDONNÉES */}
            {selectedSection === 'coordonnees' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Adresse du siège social</Label>
                  <Input value={form.adresse} onChange={e => set('adresse', e.target.value)} className="text-sm" />
                </div>
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
              </div>
            )}

            {/* REPRÉSENTANT */}
            {selectedSection === 'representant' && (
              <div className="space-y-3">
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
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Profession</Label>
                    <Input value={form.rep_profession} onChange={e => set('rep_profession', e.target.value)} className="text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* NOTE ADMINISTRATIVE */}
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