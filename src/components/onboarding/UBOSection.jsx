import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function UBOSection({ partner, index, setField }) {
  if (!partner) return null;
  const percent = parseFloat(partner.part_percent) || 0;
  const isAutoUBO = percent >= 25;
  const isUBO = isAutoUBO || partner.ubo_manual === true;
  const isPEP = partner.pep_status === true;

  const name = partner.type === 'physique'
    ? `${partner.prenom || ''} ${partner.nom || ''}`.trim()
    : partner.raison_sociale || '';

  return (
    <div className={`mt-4 rounded-xl border p-4 space-y-4 ${isPEP ? 'border-red-300 bg-red-50' : isUBO ? 'border-amber-300 bg-amber-50' : 'border-[#E5E7EB] bg-[#FAFAFA]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${isPEP ? 'text-red-500' : isUBO ? 'text-amber-500' : 'text-[#9B9B9B]'}`} />
          <span className="text-xs font-semibold text-[#1A1A1A]">Section KYC / Bénéficiaire Effectif (UBO)</span>
        </div>
        {isAutoUBO && (
          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> UBO auto-détecté ({percent}%)
          </span>
        )}
        {!isAutoUBO && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={partner.ubo_manual === true}
              onChange={e => setField(index, 'ubo_manual', e.target.checked)}
              className="w-3.5 h-3.5"
            />
            <span className="text-xs text-[#6B6B6B]">Déclarer comme UBO</span>
          </label>
        )}
      </div>

      {/* Auto UBO note */}
      {isAutoUBO && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-100 border border-amber-200 rounded-lg">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Cette personne détient <strong>{percent}%</strong> du capital — elle est automatiquement identifiée comme bénéficiaire effectif conformément aux exigences KYC/LBC-FT (seuil ≥ 25%).
          </p>
        </div>
      )}

      {isUBO && (
        <div className="space-y-4">
          {/* Ownership details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#6B6B6B]">% droits de vote</Label>
              <Input
                type="number"
                value={partner.voting_rights_percent || ''}
                onChange={e => setField(index, 'voting_rights_percent', e.target.value)}
                placeholder="0"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">Contrôle indirect ?</Label>
              <select
                value={partner.indirect_control || ''}
                onChange={e => setField(index, 'indirect_control', e.target.value)}
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent"
              >
                <option value="">Sélectionner...</option>
                <option value="non">Non</option>
                <option value="oui">Oui</option>
              </select>
            </div>
            {partner.indirect_control === 'oui' && (
              <div className="col-span-2">
                <Label className="text-xs text-[#6B6B6B]">Entité intermédiaire de contrôle</Label>
                <Input
                  value={partner.controlling_entity_name || ''}
                  onChange={e => setField(index, 'controlling_entity_name', e.target.value)}
                  placeholder="Nom de la société interposée..."
                  className="mt-1 text-sm"
                />
              </div>
            )}
          </div>

          {/* PEP Status */}
          <div className={`p-3 rounded-lg border ${isPEP ? 'bg-red-100 border-red-300' : 'bg-white border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A]">Personne Politiquement Exposée (PPE/PEP)</p>
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">Fonctionnaire, dirigeant public, ou membre de la famille d'un tel individu</p>
              </div>
              <div className="flex gap-2">
                {['non', 'oui'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setField(index, 'pep_status', v === 'oui')}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                      (v === 'oui' && partner.pep_status === true) ? 'bg-red-500 text-white border-red-500'
                      : (v === 'non' && partner.pep_status === false) ? 'bg-green-500 text-white border-green-500'
                      : 'border-[#E5E7EB] text-[#6B6B6B] bg-white'
                    }`}
                  >
                    {v === 'oui' ? 'Oui' : 'Non'}
                  </button>
                ))}
              </div>
            </div>
            {isPEP && (
              <div className="mt-2 p-2 bg-red-200 rounded text-xs text-red-800 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Diligence renforcée requise — ce partenaire fera l'objet d'une vérification approfondie par l'ANPI.</span>
              </div>
            )}
          </div>

          {/* Sanctions */}
          <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={partner.sanctions_clear === true}
                onChange={e => setField(index, 'sanctions_clear', e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5"
              />
              <span className="text-xs text-[#1A1A1A]">
                Je déclare que <strong>{name || 'cette personne'}</strong> n'est pas soumis(e) à des sanctions internationales (ONU, UE, OFAC) et ne figure sur aucune liste noire.
              </span>
            </label>
          </div>

          {/* UBO Declaration */}
          <div className={`p-3 rounded-lg border ${partner.ubo_declaration_signed ? 'bg-green-50 border-green-300' : 'bg-white border-[#E5E7EB]'}`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={partner.ubo_declaration_signed === true}
                onChange={e => setField(index, 'ubo_declaration_signed', e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5"
              />
              <span className="text-xs text-[#1A1A1A]">
                <strong>{name || 'Ce bénéficiaire effectif'}</strong> reconnaît être le bénéficiaire effectif réel de cette participation et certifie l'exactitude des informations déclarées conformément à la réglementation LBC-FT.
              </span>
            </label>
            {partner.ubo_declaration_signed && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Déclaration UBO signée
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}