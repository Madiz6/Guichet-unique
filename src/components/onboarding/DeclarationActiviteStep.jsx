import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';
import SecteurSearchSelect from './SecteurSearchSelect.jsx';


const FORMES = ['SARL', 'SA', 'SAS', 'EURL', 'Company', 'Association'];
const REGIMES = ['Régime général', 'Régime simplifié', 'Forfaitaire', 'Zone franche'];

export default function DeclarationActiviteStep({ value, onChange }) {
  const data = value || {};
  const set = (k, v) => onChange({ ...data, [k]: v });
  const commercialNames = data.commercial_names || ['', '', ''];
  const setName = (i, v) => {
    const next = [...commercialNames];
    next[i] = v;
    set('commercial_names', next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration d'activité</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Nature de l'activité et forme juridique</p>
      </div>

      {/* 3 commercial names */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h3 className="font-medium text-[#1A1A1A] text-sm mb-1">Choix du nom commercial <span className="text-red-500">*</span></h3>
        <p className="text-xs text-[#6B6B6B] mb-4">Proposez 3 noms par ordre de préférence. Si le 1er est refusé, le 2ème sera examiné, puis le 3ème.</p>
        <div className="space-y-3">
          {[
            { index: 0, label: '1er choix (prioritaire)', cls: 'border-blue-200 bg-blue-50', badge: 'bg-blue-600' },
            { index: 1, label: '2ème choix (alternatif)', cls: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500' },
            { index: 2, label: '3ème choix (dernier recours)', cls: 'border-gray-200 bg-gray-50', badge: 'bg-gray-500' },
          ].map(({ index, label, cls, badge }) => (
            <div key={index} className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 ${cls}`}>
              <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${badge}`}>{index + 1}</span>
              <div className="flex-1">
                <Label className="text-xs text-[#6B6B6B] mb-1 block">{label}</Label>
                <Input value={commercialNames[index] || ''} onChange={e => setName(index, e.target.value)}
                  placeholder={`Nom commercial ${index + 1}`} className="bg-white text-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600">Le Guichet Unique vérifiera la disponibilité de chaque nom. En cas de refus du premier, votre dossier ne sera pas bloqué.</p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium">Raison sociale <span className="text-red-500">*</span></Label>
          <Input value={data.raison_sociale || ''} onChange={e => set('raison_sociale', e.target.value)} placeholder="Nom officiel de l'entreprise" className="mt-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Secteur principal <span className="text-red-500">*</span></Label>
            <div className="mt-1">
              <SecteurSearchSelect value={data.secteur_principal || ''} onChange={v => set('secteur_principal', v)} />
            </div>
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
            rows={3} placeholder="Décrivez l'activité principale..."
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
          <div className="mt-1 space-y-2">
            <SecteurSearchSelect
              value={''}
              onChange={v => {
                if (v && !(data.activites_secondaires || []).includes(v)) {
                  set('activites_secondaires', [...(data.activites_secondaires || []), v]);
                }
              }}
              placeholder="Ajouter une activité secondaire..."
            />
            {(data.activites_secondaires || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(data.activites_secondaires || []).map((a, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-[#F0F4FF] border border-[#C7D2FE] text-[#3730A3] text-xs px-3 py-1.5 rounded-full">
                    {a}
                    <button type="button" onClick={() => set('activites_secondaires', (data.activites_secondaires || []).filter((_, idx) => idx !== i))} className="hover:text-red-500 ml-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Nombre d'employés prévus</Label>
          <Input type="number" value={data.nombre_employes || ''} onChange={e => set('nombre_employes', e.target.value)} placeholder="0" className="mt-1" />
        </div>
      </div>
    </div>
  );
}