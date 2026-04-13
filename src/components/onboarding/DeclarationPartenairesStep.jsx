import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneInput from './PhoneInput.jsx';
import { Plus, Trash2, Users, Upload, CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

const EXTRACT_FIELDS = [
  { k: 'nom', label: 'Nom' },
  { k: 'prenom', label: 'Prénom' },
  { k: 'nni', label: 'NNI (N° National d\'Identification)' },
  { k: 'date_naissance', label: 'Date de naissance', type: 'date' },
  { k: 'lieu_naissance', label: 'Lieu de naissance' },
  { k: 'nationalite', label: 'Nationalité' },
  { k: 'sexe', label: 'Sexe' },
  { k: 'numero_identite', label: "N° d'identité" },
  { k: 'date_emission', label: "Date d'émission", type: 'date' },
  { k: 'date_expiration', label: "Date d'expiration", type: 'date' },
  { k: 'adresse', label: 'Adresse' },
  { k: 'profession', label: 'Profession' },
  { k: 'pere_nom', label: 'Nom du père' },
  { k: 'mere_nom', label: 'Nom de la mère' },
  { k: 'email', label: 'Email', type: 'email' },
  { k: 'telephone', label: 'Numéro de mobile', isPhone: true },
];

const emptyPhysique = () => ({
  type: 'physique', nom: '', prenom: '', nni: '', email: '', telephone: '',
  adresse: '', nationalite: '', date_naissance: '', lieu_naissance: '', sexe: '',
  numero_identite: '', date_emission: '', date_expiration: '', profession: '',
  pere_nom: '', mere_nom: '', mrz_line1: '', mrz_line2: '',
  part_percent: '', apport: '', doc_front: '', doc_back: ''
});

const emptyMorale = () => ({
  type: 'morale', raison_sociale: '', siege_social: '', rcs: '', email: '',
  part_percent: '', apport: '', registre_url: '', statuts_url: '', decision_url: '',
  rep_nom: '', rep_prenom: '', rep_nni: '', rep_email: '', rep_telephone: '',
  rep_adresse: '', rep_nationalite: '', rep_date_naissance: '', rep_lieu_naissance: '',
  rep_sexe: '', rep_numero_identite: '', rep_date_emission: '', rep_date_expiration: '',
  rep_profession: '', rep_pere_nom: '', rep_mere_nom: '',
  rep_doc_front: '', rep_doc_back: ''
});

function DocUpload({ label, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const handle = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    setDone(true);
    onUploaded(file_url);
    toast.success('Document téléchargé');
  };
  return (
    <div>
      <Label className="text-xs text-[#6B6B6B]">{label}</Label>
      <label className={`mt-1 flex items-center gap-2 cursor-pointer border rounded px-3 py-2 transition-all text-xs ${done ? 'border-green-200 bg-green-50 text-green-600' : 'border-dashed border-[#D1D5DB] hover:border-blue-400 text-[#9B9B9B]'}`}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Téléchargement...' : done ? 'Téléchargé ✓' : 'Cliquez pour télécharger'}
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handle(e.target.files[0])} />
      </label>
    </div>
  );
}

function IdExtract({ frontUrl, backUrl, onFront, onBack, onExtracted }) {
  const [uploading, setUploading] = useState({ front: false, back: false });
  const [extracting, setExtracting] = useState(false);
  const [docType, setDocType] = useState('cni');

  const handle = async (file, side) => {
    setUploading(p => ({ ...p, [side]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(p => ({ ...p, [side]: false }));
    if (side === 'front') onFront(file_url); else onBack(file_url);

    const frontU = side === 'front' ? file_url : frontUrl;
    const backU = side === 'back' ? file_url : backUrl;
    const urls = [frontU, backU].filter(Boolean);
    if (urls.length === 0) return;

    setExtracting(true);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `You are given ${urls.length === 2 ? 'the front AND back sides' : 'the front'} of an identity document. Extract ALL visible information. The back typically contains NNI, MRZ, address. Return JSON with: nom, prenom, date_naissance (YYYY-MM-DD), lieu_naissance, nationalite, sexe, numero_identite, nni, date_emission (YYYY-MM-DD), date_expiration (YYYY-MM-DD), adresse, profession, pere_nom, mere_nom, email, telephone, mrz_line1, mrz_line2. Use empty string for missing fields.`,
        file_urls: urls,
        response_json_schema: {
          type: 'object',
          properties: {
            nom: { type: 'string' }, prenom: { type: 'string' },
            date_naissance: { type: 'string' }, lieu_naissance: { type: 'string' },
            nationalite: { type: 'string' }, sexe: { type: 'string' },
            numero_identite: { type: 'string' }, nni: { type: 'string' },
            date_emission: { type: 'string' }, date_expiration: { type: 'string' },
            adresse: { type: 'string' }, profession: { type: 'string' },
            pere_nom: { type: 'string' }, mere_nom: { type: 'string' },
            email: { type: 'string' }, telephone: { type: 'string' },
            mrz_line1: { type: 'string' }, mrz_line2: { type: 'string' },
          },
        },
      });
      onExtracted(r);
      toast.success(`Données extraites depuis ${urls.length === 2 ? 'recto + verso' : 'le recto'}`);
    } catch { toast.info('Remplissez manuellement'); }
    setExtracting(false);
  };

  const sides = [{ s: 'front', label: docType === 'passeport' ? 'Page principale' : 'Recto (avant)', url: frontUrl }];
  if (docType === 'cni') sides.push({ s: 'back', label: 'Verso (arrière)', url: backUrl });

  return (
    <div className="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-[#1A1A1A]">Pièce d'identité</span>
        </div>
        <div className="flex gap-1.5">
          {[{ val: 'cni', label: "Carte d'identité" }, { val: 'passeport', label: 'Passeport' }].map(({ val, label }) => (
            <button key={val} type="button" onClick={() => setDocType(val)}
              className={`text-xs px-2 py-0.5 rounded border transition-all ${docType === val ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sides.map(({ s, label, url }) => (
          <div key={s}>
            <p className="text-xs text-[#6B6B6B] mb-1">{label}{s === 'front' && <span className="text-red-500 ml-1">*</span>}</p>
            {url ? (
              <div className="border border-green-300 bg-green-50 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs text-green-600">
                  <div className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Téléchargé</div>
                  <label className="text-blue-600 cursor-pointer hover:underline">Changer
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} />
                  </label>
                </div>
                <img src={url} alt={label} className="mt-1.5 w-full h-16 object-cover rounded border border-green-200" onError={e => { e.target.style.display = 'none'; }} />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-all h-24">
                {uploading[s] ? (
                  <div className="flex flex-col items-center gap-1"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span className="text-xs text-[#6B6B6B]">Téléchargement...</span></div>
                ) : (
                  <><Upload className="w-4 h-4 text-[#9B9B9B] mb-1" /><span className="text-xs text-[#9B9B9B] text-center">Cliquez pour télécharger<br />(JPG, PNG, PDF)</span></>
                )}
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} />
              </label>
            )}
          </div>
        ))}
      </div>
      {extracting && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraction IA en cours...
        </div>
      )}
    </div>
  );
}

function PartnerPhysiqueFields({ p, i, set, merge, prefix = '' }) {
  const hasDoc = p[prefix + 'doc_front'] || p[prefix + 'doc_back'];
  const fieldKey = (k) => prefix ? `rep_${k}` : k;

  return (
    <div className="space-y-4">
      <IdExtract
        frontUrl={p[prefix + 'doc_front']}
        backUrl={p[prefix + 'doc_back']}
        onFront={url => set(i, prefix + 'doc_front', url)}
        onBack={url => set(i, prefix + 'doc_back', url)}
        onExtracted={d => {
          const updates = {};
          ['nom', 'prenom', 'nni', 'date_naissance', 'lieu_naissance', 'nationalite', 'sexe',
            'numero_identite', 'date_emission', 'date_expiration', 'adresse', 'profession',
            'pere_nom', 'mere_nom', 'email', 'telephone', 'mrz_line1', 'mrz_line2'].forEach(k => {
            if (d[k]) updates[fieldKey(k)] = d[k];
          });
          merge(i, updates);
        }}
      />

      {hasDoc && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Informations extraites</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXTRACT_FIELDS.map(f => (
              <div key={f.k}>
                <Label className="text-xs text-[#6B6B6B]">{f.label}</Label>
                {f.isPhone ? (
                  <PhoneInput value={p[fieldKey(f.k)] || ''} onChange={v => set(i, fieldKey(f.k), v)} />
                ) : (
                  <Input type={f.type || 'text'} value={p[fieldKey(f.k)] || ''} onChange={e => set(i, fieldKey(f.k), e.target.value)} className="mt-1 text-sm" />
                )}
              </div>
            ))}
            <div>
              <Label className="text-xs text-[#6B6B6B]">MRZ Ligne 1</Label>
              <Input value={p[fieldKey('mrz_line1')] || ''} onChange={e => set(i, fieldKey('mrz_line1'), e.target.value)} className="mt-1 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">MRZ Ligne 2</Label>
              <Input value={p[fieldKey('mrz_line2')] || ''} onChange={e => set(i, fieldKey('mrz_line2'), e.target.value)} className="mt-1 text-sm font-mono" />
            </div>
          </div>
        </div>
      )}

      {!hasDoc && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXTRACT_FIELDS.map(f => (
            <div key={f.k}>
              <Label className="text-xs">{f.label}</Label>
              {f.isPhone ? (
                <PhoneInput value={p[fieldKey(f.k)] || ''} onChange={v => set(i, fieldKey(f.k), v)} />
              ) : (
                <Input type={f.type || 'text'} value={p[fieldKey(f.k)] || ''} onChange={e => set(i, fieldKey(f.k), e.target.value)} className="mt-1 text-sm" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeclarationPartenairesStep({ value, onChange }) {
  const partners = value?.partners || [];
  const total = partners.reduce((s, p) => s + (parseFloat(p.part_percent) || 0), 0);
  const update = (next) => onChange({ partners: next });
  const add = (type) => update([...partners, type === 'physique' ? emptyPhysique() : emptyMorale()]);
  const remove = (i) => update(partners.filter((_, idx) => idx !== i));
  const set = (i, k, v) => update(partners.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const merge = (i, obj) => update(partners.map((p, idx) => idx === i ? { ...p, ...obj } : p));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration des partenaires</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Associés et actionnaires (optionnel)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => add('physique')} variant="outline" size="sm" className="text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Personne physique</Button>
          <Button onClick={() => add('morale')} variant="outline" size="sm" className="text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Personne morale</Button>
        </div>
      </div>

      {partners.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6B6B6B]">Répartition du capital</span>
            <span className={`font-semibold ${total > 100 ? 'text-red-500' : total === 100 ? 'text-green-600' : 'text-[#1A1A1A]'}`}>{total.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#F5F5F5] rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${total > 100 ? 'bg-red-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(total, 100)}%` }} />
          </div>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
          <Users className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#9B9B9B]">Aucun partenaire — cliquez sur Ajouter pour commencer</p>
        </div>
      ) : (
        <div className="space-y-5">
          {partners.map((p, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${p.type === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {p.type === 'physique' ? 'Personne physique' : 'Personne morale'}
                </span>
                <button onClick={() => remove(i)} className="text-[#9B9B9B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>

              {p.type === 'physique' ? (
                <div className="space-y-4">
                  <PartnerPhysiqueFields p={p} i={i} set={set} merge={merge} prefix="" />
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F0F0F0]">
                    <div>
                      <Label className="text-xs">Part (%) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={p.part_percent} onChange={e => set(i, 'part_percent', e.target.value)} className="mt-1 text-sm" placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Apport (DJF)</Label>
                      <Input type="number" value={p.apport} onChange={e => set(i, 'apport', e.target.value)} className="mt-1 text-sm" placeholder="0" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2"><Label className="text-xs">Raison sociale <span className="text-red-500">*</span></Label><Input value={p.raison_sociale} onChange={e => set(i, 'raison_sociale', e.target.value)} className="mt-1 text-sm" /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Siège social</Label><Input value={p.siege_social} onChange={e => set(i, 'siege_social', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">N° immatriculation (RCS)</Label><Input value={p.rcs} onChange={e => set(i, 'rcs', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Email</Label><Input type="email" value={p.email} onChange={e => set(i, 'email', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Part (%)</Label><Input type="number" value={p.part_percent} onChange={e => set(i, 'part_percent', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Apport (DJF)</Label><Input type="number" value={p.apport} onChange={e => set(i, 'apport', e.target.value)} className="mt-1 text-sm" /></div>
                  </div>
                  <div className="border-t border-[#F0F0F0] pt-3 space-y-2">
                    <p className="text-xs font-medium text-[#1A1A1A] mb-2">Documents de la société</p>
                    <DocUpload label="Copie du registre de commerce" onUploaded={url => set(i, 'registre_url', url)} />
                    <DocUpload label="Copie certifiée des statuts (avec traduction)" onUploaded={url => set(i, 'statuts_url', url)} />
                    <DocUpload label="Décision de créer une succursale à Djibouti" onUploaded={url => set(i, 'decision_url', url)} />
                  </div>
                  <div className="border-t border-[#F0F0F0] pt-3">
                    <p className="text-xs font-medium text-[#1A1A1A] mb-3">Représentant de la société actionnaire</p>
                    <PartnerPhysiqueFields p={p} i={i} set={set} merge={merge} prefix="rep_" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}