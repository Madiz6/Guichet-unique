import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Shield, AlertTriangle, CheckCircle2, Info, Plus, Trash2,
  User, Upload, Loader2, ScanLine, RefreshCw, Building2, Eye
} from 'lucide-react';
import { toast } from 'sonner';

// ─── FATF-compliant UBO look-through for Personne Morale ───────────────────
// Per GAFI Recommendation 24 + EU 5th AMLD:
// - Must identify all natural persons owning/controlling ≥25% of the corporate partner
// - Must collect their ID documents
// - Must assess PEP status and sanctions exposure
// - Must trace indirect control chains (layered ownership)

const emptyUBO = () => ({
  nom: '', prenom: '', date_naissance: '', lieu_naissance: '',
  nationalite: '', numero_identite: '', nni: '',
  part_percent: '', voting_rights_percent: '',
  est_dirigeant: false, // CEO/DG even if <25%
  controle_indirect: false,
  entite_intermediaire: '',
  doc_front: '', doc_back: '',
  pep_status: null,
  sanctions_clear: false,
  declaration_signed: false,
});

// Mini ID scan + manual form for each UBO natural person
function UBOPersonForm({ ubo, onChange, onRemove, index }) {
  const [uploading, setUploading] = useState({ front: false, back: false });
  const [extracting, setExtracting] = useState(false);
  const [docType, setDocType] = useState('cni');
  const extractedRef = useRef(false);

  const set = (k, v) => onChange({ ...ubo, [k]: v });
  const isPEP = ubo.pep_status === true;
  const percent = parseFloat(ubo.part_percent) || 0;
  const isAutoUBO = percent >= 25 || ubo.est_dirigeant;

  const doExtract = async (frontU, backU) => {
    if (extractedRef.current || !frontU) return;
    extractedRef.current = true;
    setExtracting(true);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract identity document fields. Return JSON: nom, prenom, date_naissance (YYYY-MM-DD), lieu_naissance, nationalite, numero_identite, nni, adresse, profession. Empty string for missing.`,
        file_urls: [frontU, backU].filter(Boolean),
        response_json_schema: {
          type: 'object',
          properties: {
            nom: { type: 'string' }, prenom: { type: 'string' },
            date_naissance: { type: 'string' }, lieu_naissance: { type: 'string' },
            nationalite: { type: 'string' }, numero_identite: { type: 'string' },
            nni: { type: 'string' },
          },
        },
      });
      onChange({ ...ubo, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v)) });
      toast.success('Données extraites');
    } catch {
      extractedRef.current = false;
    }
    setExtracting(false);
  };

  const handleFile = async (file, side) => {
    setUploading(p => ({ ...p, [side]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = { ...ubo, [side === 'front' ? 'doc_front' : 'doc_back']: file_url };
      onChange(updated);
      if (side === 'front') {
        extractedRef.current = false;
        await doExtract(file_url, ubo.doc_back);
      }
    } catch {
      toast.error('Erreur de téléchargement');
    }
    setUploading(p => ({ ...p, [side]: false }));
  };

  return (
    <div className={`rounded-xl border-2 p-4 space-y-4 ${isPEP ? 'border-red-300 bg-red-50' : isAutoUBO ? 'border-amber-200 bg-amber-50' : 'border-[#E5E7EB] bg-[#FAFAFA]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className={`w-4 h-4 ${isPEP ? 'text-red-500' : isAutoUBO ? 'text-amber-600' : 'text-[#6B6B6B]'}`} />
          <span className="text-xs font-bold text-[#1A1A1A]">
            UBO #{index + 1} — {ubo.prenom || ubo.nom ? `${ubo.prenom} ${ubo.nom}`.trim() : 'Bénéficiaire effectif'}
          </span>
          {isAutoUBO && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">UBO ≥25%</span>}
          {isPEP && <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> PEP</span>}
        </div>
        <button type="button" onClick={onRemove} className="text-[#9B9B9B] hover:text-red-500 p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Ownership info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">% Capital détenu *</Label>
          <Input type="number" value={ubo.part_percent || ''} onChange={e => set('part_percent', e.target.value)} placeholder="0" className="mt-1 text-sm" />
        </div>
        <div>
          <Label className="text-xs">% Droits de vote</Label>
          <Input type="number" value={ubo.voting_rights_percent || ''} onChange={e => set('voting_rights_percent', e.target.value)} placeholder="0" className="mt-1 text-sm" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={ubo.est_dirigeant} onChange={e => set('est_dirigeant', e.target.checked)} className="w-3.5 h-3.5" />
            <span className="text-xs text-[#6B6B6B]">Dirigeant / PDG / DG</span>
          </label>
        </div>
      </div>

      {/* Contrôle indirect */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={ubo.controle_indirect} onChange={e => set('controle_indirect', e.target.checked)} className="w-3.5 h-3.5" />
          <span className="text-xs text-[#6B6B6B]">Contrôle via entité intermédiaire (holding, trust, fiducie...)</span>
        </label>
        {ubo.controle_indirect && (
          <Input value={ubo.entite_intermediaire || ''} onChange={e => set('entite_intermediaire', e.target.value)} placeholder="Nom de l'entité intermédiaire" className="text-sm ml-5" />
        )}
      </div>

      {/* ID Document */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-[#1A1A1A]">Pièce d'identité (obligatoire)</span>
            {extracting && <span className="text-xs text-purple-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Extraction IA...</span>}
          </div>
          <div className="flex gap-1">
            {[{ val: 'cni', label: 'CNI' }, { val: 'passeport', label: 'Passeport' }].map(({ val, label }) => (
              <button key={val} type="button" onClick={() => setDocType(val)}
                className={`text-xs px-2 py-0.5 rounded border transition-all ${docType === val ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { side: 'front', label: docType === 'passeport' ? 'Page principale *' : 'Recto *', url: ubo.doc_front },
            ...(docType === 'cni' ? [{ side: 'back', label: 'Verso', url: ubo.doc_back }] : []),
          ].map(({ side, label, url }) => (
            <div key={side}>
              <p className="text-xs text-[#6B6B6B] mb-1">{label}</p>
              {url ? (
                <div className="border border-green-300 bg-green-50 rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs text-green-600 mb-1">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>
                    <label className="text-blue-600 cursor-pointer hover:underline text-xs">
                      Changer<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handleFile(e.target.files[0], side)} />
                    </label>
                  </div>
                  <img src={url} alt={label} className="w-full h-14 object-cover rounded" onError={e => { e.target.style.display = 'none'; }} />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-2 cursor-pointer hover:border-blue-400 transition-all h-20 bg-white">
                  {uploading[side]
                    ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600 mb-1" /><span className="text-xs text-[#6B6B6B]">Envoi...</span></>
                    : <><Upload className="w-4 h-4 text-[#9B9B9B] mb-1" /><span className="text-xs text-[#9B9B9B] text-center">Télécharger<br />(JPG/PNG/PDF)</span></>}
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handleFile(e.target.files[0], side)} />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Identity fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { k: 'nom', label: 'Nom *' },
          { k: 'prenom', label: 'Prénom *' },
          { k: 'date_naissance', label: 'Date de naissance', type: 'date' },
          { k: 'lieu_naissance', label: 'Lieu de naissance' },
          { k: 'nationalite', label: 'Nationalité *' },
          { k: 'numero_identite', label: "N° Identité *" },
          { k: 'nni', label: 'NNI (si applicable)' },
        ].map(f => (
          <div key={f.k}>
            <Label className="text-xs text-[#6B6B6B]">{f.label}</Label>
            <Input type={f.type || 'text'} value={ubo[f.k] || ''} onChange={e => set(f.k, e.target.value)} className="mt-1 text-sm" />
          </div>
        ))}
      </div>

      {/* PEP Status */}
      <div className={`p-3 rounded-lg border ${isPEP ? 'bg-red-100 border-red-300' : 'bg-white border-[#E5E7EB]'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#1A1A1A]">Personne Politiquement Exposée (PPE/PEP)</p>
            <p className="text-[10px] text-[#6B6B6B] mt-0.5">Fonctionnaire, dirigeant public, ou proche d'un tel individu</p>
          </div>
          <div className="flex gap-2">
            {[{ v: 'oui', label: 'Oui' }, { v: 'non', label: 'Non' }].map(({ v, label }) => (
              <button key={v} type="button" onClick={() => set('pep_status', v === 'oui')}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                  v === 'oui' && ubo.pep_status === true ? 'bg-red-500 text-white border-red-500'
                  : v === 'non' && ubo.pep_status === false ? 'bg-green-500 text-white border-green-500'
                  : 'border-[#E5E7EB] text-[#6B6B6B] bg-white'
                }`}>{label}</button>
            ))}
          </div>
        </div>
        {isPEP && (
          <div className="mt-2 p-2 bg-red-200 rounded text-xs text-red-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Diligence renforcée requise — cet UBO fera l'objet d'une vérification approfondie par l'ANPI.
          </div>
        )}
      </div>

      {/* Sanctions + Declaration */}
      <div className="space-y-2">
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={ubo.sanctions_clear === true} onChange={e => set('sanctions_clear', e.target.checked)} className="mt-0.5 w-3.5 h-3.5" />
            <span className="text-xs text-[#1A1A1A]">
              Je déclare que <strong>{ubo.prenom || ubo.nom ? `${ubo.prenom} ${ubo.nom}`.trim() : 'cet individu'}</strong> ne figure sur aucune liste de sanctions internationales (ONU, UE, OFAC) ni liste noire.
            </span>
          </label>
        </div>
        <div className={`p-3 rounded-lg border ${ubo.declaration_signed ? 'bg-green-50 border-green-300' : 'bg-white border-[#E5E7EB]'}`}>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={ubo.declaration_signed === true} onChange={e => set('declaration_signed', e.target.checked)} className="mt-0.5 w-3.5 h-3.5" />
            <span className="text-xs text-[#1A1A1A]">
              Je certifie que <strong>{ubo.prenom || ubo.nom ? `${ubo.prenom} ${ubo.nom}`.trim() : 'cet individu'}</strong> est bien un bénéficiaire effectif réel de <strong>{ubo.part_percent || '?'}%</strong> du capital de cette société, et que ces informations sont exactes conformément à la réglementation LBC-FT.
            </span>
          </label>
          {ubo.declaration_signed && (
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" /> Déclaration UBO signée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main exported section for Personne Morale UBO look-through ──────────────
export default function MoraleUBOSection({ partner, index, setField }) {
  if (!partner) return null;

  const ubos = partner.ubos_personnes_physiques || [];
  const percent = parseFloat(partner.part_percent) || 0;

  const setUBOs = (newUBOs) => setField(index, 'ubos_personnes_physiques', newUBOs);
  const addUBO = () => setUBOs([...ubos, emptyUBO()]);
  const removeUBO = (ui) => setUBOs(ubos.filter((_, idx) => idx !== ui));
  const updateUBO = (ui, updated) => setUBOs(ubos.map((u, idx) => idx === ui ? updated : u));

  const hasRedFlags = ubos.some(u => u.pep_status === true);
  const allSigned = ubos.length > 0 && ubos.every(u => u.declaration_signed && u.sanctions_clear);

  return (
    <div className={`mt-4 rounded-xl border-2 p-4 space-y-4 ${hasRedFlags ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${hasRedFlags ? 'text-red-500' : 'text-amber-600'}`} />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Identification des Bénéficiaires Effectifs (UBO Look-through)
          </span>
          {allSigned && <span className="text-[9px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Complet</span>}
        </div>
        {hasRedFlags && (
          <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> PEP détecté — diligence renforcée
          </span>
        )}
      </div>

      {/* FATF explanation */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Obligation réglementaire GAFI / LBC-FT (Recommandation 24)</p>
          <p>
            La société <strong>{partner.raison_sociale || 'actionnaire'}</strong> détient <strong>{percent}%</strong> du capital.
            Vous devez identifier toutes les personnes physiques qui, en dernier ressort, possèdent ou contrôlent ≥25% de cette société actionnaire,
            ou qui en sont les dirigeants effectifs.
          </p>
          <p className="text-[10px] text-blue-600">Collecte requise : pièce d'identité + PEP + sanctions + déclaration UBO pour chaque bénéficiaire effectif.</p>
        </div>
      </div>

      {/* UBO List */}
      {ubos.length === 0 ? (
        <div className="border-2 border-dashed border-amber-300 rounded-xl p-6 text-center bg-white/60">
          <Eye className="w-6 h-6 mx-auto mb-2 text-amber-500" />
          <p className="text-sm font-medium text-[#1A1A1A]">Aucun bénéficiaire effectif déclaré</p>
          <p className="text-xs text-[#6B6B6B] mt-1">Ajoutez toutes les personnes physiques détenant ≥25% ou exerçant le contrôle de <strong>{partner.raison_sociale || 'cette société'}</strong></p>
        </div>
      ) : (
        <div className="space-y-4">
          {ubos.map((ubo, ui) => (
            <UBOPersonForm
              key={ui}
              ubo={ubo}
              index={ui}
              onChange={(updated) => updateUBO(ui, updated)}
              onRemove={() => removeUBO(ui)}
            />
          ))}
        </div>
      )}

      <Button type="button" onClick={addUBO} variant="outline" size="sm"
        className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 text-xs">
        <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un bénéficiaire effectif (UBO)
      </Button>

      {/* Summary */}
      {ubos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="p-2 bg-white rounded-lg border border-[#E5E7EB] text-center">
            <p className="font-bold text-[#1A1A1A] text-sm">{ubos.length}</p>
            <p className="text-[#6B6B6B]">UBO déclaré{ubos.length > 1 ? 's' : ''}</p>
          </div>
          <div className="p-2 bg-white rounded-lg border border-[#E5E7EB] text-center">
            <p className={`font-bold text-sm ${ubos.filter(u => u.pep_status === true).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {ubos.filter(u => u.pep_status === true).length}
            </p>
            <p className="text-[#6B6B6B]">PEP identifié{ubos.filter(u => u.pep_status === true).length > 1 ? 's' : ''}</p>
          </div>
          <div className="p-2 bg-white rounded-lg border border-[#E5E7EB] text-center">
            <p className={`font-bold text-sm ${allSigned ? 'text-green-600' : 'text-amber-600'}`}>
              {ubos.filter(u => u.declaration_signed).length}/{ubos.length}
            </p>
            <p className="text-[#6B6B6B]">Déclarations signées</p>
          </div>
        </div>
      )}
    </div>
  );
}