import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const SECTEURS = ['Commerce', 'Services', 'Industrie', 'Agriculture', 'Transport', 'BTP', 'Tourisme', 'Finance', 'Santé', 'Éducation', 'Autre'];
const FORMES = ['SARL', 'SA', 'SAS', 'EURL', 'Company', 'Association'];
const REGIMES = ['Régime général', 'Régime simplifié', 'Forfaitaire', 'Zone franche'];

export default function DeclarationActiviteStep({ value, onChange }) {
  const data = value || {};
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration d'activité</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Nature de l'activité et forme juridique</p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium">Raison sociale <span className="text-red-500">*</span></Label>
          <Input value={data.raison_sociale || ''} onChange={e => set('raison_sociale', e.target.value)} placeholder="Nom officiel de l'entreprise" className="mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Secteur principal <span className="text-red-500">*</span></Label>
            <select value={data.secteur_principal || ''} onChange={e => set('secteur_principal', e.target.value)} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent">
              <option value="">Sélectionner...</option>
              {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium">Forme juridique <span className="text-red-500">*</span></Label>
            <select value={data.forme_juridique || ''} onChange={e => set('forme_juridique', e.target.value)} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent">
              <option value="">Sélectionner...</option>
              {FORMES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Description de l'activité <span className="text-red-500">*</span></Label>
          <textarea value={data.activite_description || ''} onChange={e => set('activite_description', e.target.value)}
            rows={3} placeholder="Décrivez l'activité principale de votre entreprise..."
            className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm resize-none bg-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Capital social (DJF)</Label>
            <Input type="number" value={data.capital_social || ''} onChange={e => set('capital_social', e.target.value)} placeholder="0" className="mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium">Régime fiscal</Label>
            <select value={data.regime_fiscal || ''} onChange={e => set('regime_fiscal', e.target.value)} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent">
              <option value="">Sélectionner...</option>
              {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Activités secondaires</Label>
          <Input value={(data.activites_secondaires || []).join(', ')} onChange={e => set('activites_secondaires', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder="Séparées par des virgules" className="mt-1" />
        </div>

        <div>
          <Label className="text-sm font-medium">Nombre d'employés prévus</Label>
          <Input type="number" value={data.nombre_employes || ''} onChange={e => set('nombre_employes', e.target.value)} placeholder="0" className="mt-1" />
        </div>
      </div>
    </div>
  );
}