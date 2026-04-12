import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, X, ChevronDown, ChevronUp, Info } from 'lucide-react';

const SECTEURS = [
  'Commerce de détail', 'Commerce de gros', 'Import / Export', 'Transport et logistique',
  'BTP / Construction', 'Industrie manufacturière', 'Agriculture / Pêche',
  'Tourisme / Hôtellerie', 'Restauration', 'Services financiers',
  'Technologies / Numérique', 'Santé / Pharmacie', 'Éducation / Formation',
  'Conseil / Consulting', 'Média / Communication', 'Énergie / Mines',
  'Immobilier', 'Sécurité privée', 'Autre'
];

const FORMES_JURIDIQUES = ['SARL', 'SA', 'SAS', 'SNC', 'Entreprise Individuelle', 'EURL', 'Association', 'GIE'];
const REGIMES_FISCAUX = ['Réel normal', 'Réel simplifié', 'Forfait', 'Micro-entreprise', 'Exonéré'];

export default function DeclarationActiviteStep({ value = {}, onChange }) {
  const [form, setForm] = useState({
    secteur_principal: '', autre_secteur: '', activite_description: '',
    forme_juridique: '', regime_fiscal: '', capital_social: '',
    nombre_employes_prevu: '', chiffre_affaires_prevu: '',
    activites_secondaires: [],
    ...value
  });
  const [newActivite, setNewActivite] = useState('');
  const [showSecteurs, setShowSecteurs] = useState(false);

  const update = (k, v) => {
    const updated = { ...form, [k]: v };
    setForm(updated);
    onChange(updated);
  };

  const addActivite = () => {
    if (!newActivite.trim()) return;
    const updated = { ...form, activites_secondaires: [...(form.activites_secondaires || []), newActivite.trim()] };
    setForm(updated);
    onChange(updated);
    setNewActivite('');
  };

  const removeActivite = (i) => {
    const list = form.activites_secondaires.filter((_, idx) => idx !== i);
    const updated = { ...form, activites_secondaires: list };
    setForm(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Déclaration relative à l'activité</h3>
            <p className="text-white/70 text-sm">Nature, forme juridique et données économiques</p>
          </div>
        </div>
      </div>

      {/* Secteur principal */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-[#1A1A1A] text-sm">Secteur d'activité principal <span className="text-red-500">*</span></h4>
        <div className="flex flex-wrap gap-2">
          {SECTEURS.map(s => (
            <button
              key={s}
              onClick={() => update('secteur_principal', s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                form.secteur_principal === s
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'border-[#E5E7EB] text-[#6B6B6B] hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
              }`}
            >{s}</button>
          ))}
        </div>
        {form.secteur_principal === 'Autre' && (
          <Input value={form.autre_secteur || ''} onChange={e => update('autre_secteur', e.target.value)}
            placeholder="Précisez votre secteur" className="mt-2" />
        )}
      </div>

      {/* Description activité */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
        <h4 className="font-semibold text-[#1A1A1A] text-sm">Description de l'activité <span className="text-red-500">*</span></h4>
        <textarea
          value={form.activite_description || ''}
          onChange={e => update('activite_description', e.target.value)}
          className="w-full border border-[#E5E7EB] rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
          rows={3}
          placeholder="Décrivez précisément l'activité de l'entreprise…"
        />
        <p className="text-xs text-[#9B9B9B]">{(form.activite_description || '').length}/500 caractères</p>
      </div>

      {/* Activités secondaires */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
        <h4 className="font-semibold text-[#1A1A1A] text-sm">Activités secondaires</h4>
        <div className="flex gap-2">
          <Input value={newActivite} onChange={e => setNewActivite(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addActivite()}
            placeholder="Ajouter une activité secondaire" className="flex-1 text-sm" />
          <Button onClick={addActivite} size="sm" variant="outline" className="shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {(form.activites_secondaires || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.activites_secondaires.map((a, i) => (
              <Badge key={i} className="bg-[#F5F5F5] text-[#1A1A1A] border-0 pr-1 flex items-center gap-1">
                {a}
                <button onClick={() => removeActivite(i)} className="ml-1 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Forme juridique & régime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-[#1A1A1A] text-sm">Forme juridique <span className="text-red-500">*</span></h4>
          <div className="space-y-1.5">
            {FORMES_JURIDIQUES.map(f => (
              <button key={f} onClick={() => update('forme_juridique', f)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  form.forme_juridique === f ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F5F5F5] text-[#1A1A1A]'
                }`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-[#1A1A1A] text-sm">Régime fiscal</h4>
          <div className="space-y-1.5">
            {REGIMES_FISCAUX.map(r => (
              <button key={r} onClick={() => update('regime_fiscal', r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  form.regime_fiscal === r ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F5F5F5] text-[#1A1A1A]'
                }`}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Economic data */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h4 className="font-semibold text-[#1A1A1A] text-sm mb-4">Données économiques</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-[#6B6B6B] mb-1">Capital social (DJF)</Label>
            <Input type="number" value={form.capital_social || ''} onChange={e => update('capital_social', e.target.value)}
              placeholder="0" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-[#6B6B6B] mb-1">Employés prévus</Label>
            <Input type="number" value={form.nombre_employes_prevu || ''} onChange={e => update('nombre_employes_prevu', e.target.value)}
              placeholder="0" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-[#6B6B6B] mb-1">CA prévisionnel (DJF)</Label>
            <Input type="number" value={form.chiffre_affaires_prevu || ''} onChange={e => update('chiffre_affaires_prevu', e.target.value)}
              placeholder="0" className="h-9 text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}