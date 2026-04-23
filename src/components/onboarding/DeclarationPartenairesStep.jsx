import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneInput from './PhoneInput.jsx';
import { Plus, Trash2, Users, Upload, CheckCircle2, Loader2, ScanLine, RefreshCw } from 'lucide-react';
import UBOSection from './UBOSection.jsx';
import ShareholderTree from './ShareholderTree.jsx';
import { toast } from 'sonner';

const EXTRACT_FIELDS = [
  { k: 'nom', label: 'Nom' },
  { k: 'prenom', label: 'Prénom' },
  { k: 'nni', label: 'NNI' },
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
];

const emptyUBO = () => ({
  ubo_manual: false, voting_rights_percent: '', indirect_control: '',
  controlling_entity_name: '', pep_status: null, sanctions_clear: false,
  ubo_declaration_signed: false,
});

const emptyPhysique = () => ({
  type: 'physique', nom: '', prenom: '', nni: '', email: '', telephone: '',
  adresse: '', nationalite: '', date_naissance: '', lieu_naissance: '', sexe: '',
  numero_identite: '', date_emission: '', date_expiration: '', profession: '',
  pere_nom: '', mere_nom: '', part_percent: '', apport: '',
  doc_front: '', doc_back: '',
  ...emptyUBO(),
});

const emptyMorale = () => ({
  type: 'morale', raison_sociale: '', siege_social: '', rcs: '', email: '',
  part_percent: '', apport: '', registre_url: '', statuts_url: '', decision_url: '',
  rep_nom: '', rep_prenom: '', rep_nni: '', rep_email: '', rep_telephone: '',
  rep_adresse: '', rep_nationalite: '', rep_date_naissance: '', rep_lieu_naissance: '',
  rep_sexe: '', rep_numero_identite: '', rep_date_emission: '', rep_date_expiration: '',
  rep_profession: '', rep_pere_nom: '', rep_mere_nom: '',
  rep_doc_front: '', rep_doc_back: '',
  ...emptyUBO(),
});

function DocUpload({ label, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const handle = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDone(true);
      onUploaded(file_url);
      toast.success('Document téléchargé');
    } catch {
      toast.error('Erreur de téléchargement — vérifiez votre connexion');
    }
    setUploading(false);
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

// Extracts data once — deduplicates calls using a ref flag
function IdScanSection({ frontUrl, backUrl, onFront, onBack, onExtracted }) {
  const [uploading, setUploading] = useState({ front: false, back: false });
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [docType, setDocType] = useState('cni');
  const extractedRef = useRef(false);

  const doExtract = async (frontU, backU) => {
    if (extractedRef.current) return; // prevent duplicate extraction
    const urls = [frontU, backU].filter(Boolean);
    if (!frontU) return;
    extractedRef.current = true;
    setExtracting(true);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract identity document fields. Return JSON: nom, prenom, date_naissance (YYYY-MM-DD), lieu_naissance, nationalite, sexe, numero_identite, nni, date_emission (YYYY-MM-DD), date_expiration (YYYY-MM-DD), adresse, profession, pere_nom, mere_nom, email, telephone. Empty string for missing.`,
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
          },
        },
      });
      onExtracted(r);
      setExtracted(true);
      toast.success('Données extraites automatiquement');
    } catch {
      extractedRef.current = false;
      toast.info('Téléchargé — remplissez manuellement');
    }
    setExtracting(false);
  };

  const reExtract = async () => {
    if (!frontUrl) return;
    extractedRef.current = false;
    await doExtract(frontUrl, backUrl);
  };

  const handle = async (file, side) => {
    setUploading(p => ({ ...p, [side]: true }));
    let file_url;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
    } catch {
      setUploading(p => ({ ...p, [side]: false }));
      toast.error('Erreur de téléchargement — vérifiez votre connexion');
      return;
    }
    setUploading(p => ({ ...p, [side]: false }));
    if (side === 'front') {
      onFront(file_url);
      // Extract immediately with front; back can come later
      extractedRef.current = false;
      await doExtract(file_url, backUrl);
    } else {
      onBack(file_url);
      // If front already extracted, offer re-extract with both via button (don't auto-call again)
      setExtracted(false);
    }
  };

  const sides = [
    { s: 'front', label: docType === 'passeport' ? 'Page principale *' : 'Recto *', url: frontUrl },
    ...(docType === 'cni' ? [{ s: 'back', label: 'Verso (NNI)', url: backUrl }] : []),
  ];

  return (
    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-[#1A1A1A]">Pièce d'identité</span>
          {extracting && <span className="text-xs text-purple-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Extraction IA...</span>}
        </div>
        <div className="flex items-center gap-2">
          {extracted && backUrl && (
            <button type="button" onClick={reExtract} disabled={extracting}
              className="text-xs text-blue-600 flex items-center gap-1 hover:underline disabled:opacity-50">
              <RefreshCw className="w-3 h-3" /> Réextraire recto+verso
            </button>
          )}
          <div className="flex gap-1.5">
            {[{ val: 'cni', label: 'CNI' }, { val: 'passeport', label: 'Passeport' }].map(({ val, label }) => (
              <button key={val} type="button" onClick={() => setDocType(val)}
                className={`text-xs px-2 py-0.5 rounded border transition-all ${docType === val ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sides.map(({ s, label, url }) => (
          <div key={s}>
            <p className="text-xs text-[#6B6B6B] mb-1">{label}</p>
            {url ? (
              <div className="border border-green-300 bg-green-50 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs text-green-600 mb-1">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>
                  <label className="text-blue-600 cursor-pointer hover:underline">
                    Changer<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} />
                  </label>
                </div>
                <img src={url} alt={label} className="w-full h-16 object-cover rounded" onError={e => { e.target.style.display = 'none'; }} />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-3 cursor-pointer hover:border-blue-400 transition-all h-24">
                {uploading[s]
                  ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600 mb-1" /><span className="text-xs text-[#6B6B6B]">Envoi...</span></>
                  : <><Upload className="w-4 h-4 text-[#9B9B9B] mb-1" /><span className="text-xs text-[#9B9B9B] text-center">Cliquez pour télécharger<br />(JPG, PNG, PDF)</span></>
                }
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeclarationPartenairesStep({ value, onChange }) {
  const partners = value?.partners || [];
  const total = partners.reduce((s, p) => s + (parseFloat(p.part_percent) || 0), 0);

  const update = (next) => onChange({ partners: next });
  const add = (type) => update([...partners, type === 'physique' ? emptyPhysique() : emptyMorale()]);
  const remove = (i) => update(partners.filter((_, idx) => idx !== i));
  const setField = (i, k, v) => update(partners.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const mergeFields = (i, obj) => update(partners.map((p, idx) => idx === i ? { ...p, ...obj } : p));

  const renderPersonFields = (p, i, keyPrefix) => {
    const fk = (k) => keyPrefix ? `${keyPrefix}${k}` : k;
    return (
      <div className="space-y-4">
        <IdScanSection
          frontUrl={p[fk('doc_front')]}
          backUrl={p[fk('doc_back')]}
          onFront={url => setField(i, fk('doc_front'), url)}
          onBack={url => setField(i, fk('doc_back'), url)}
          onExtracted={d => {
            const updates = {};
            [...EXTRACT_FIELDS, { k: 'telephone' }].forEach(f => {
              if (d[f.k]) updates[fk(f.k)] = d[f.k];
            });
            mergeFields(i, updates);
          }}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXTRACT_FIELDS.map(f => (
            <div key={f.k}>
              <Label className="text-xs text-[#6B6B6B]">{f.label}</Label>
              <Input type={f.type || 'text'} value={p[fk(f.k)] || ''} onChange={e => setField(i, fk(f.k), e.target.value)} className="mt-1 text-sm" />
            </div>
          ))}
          <div>
            <Label className="text-xs text-[#6B6B6B]">Numéro de mobile</Label>
            <PhoneInput value={p[fk('telephone')] || ''} onChange={v => setField(i, fk('telephone'), v)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration des partenaires</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Associés et actionnaires (optionnel)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => add('physique')} variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Personne physique
          </Button>
          <Button onClick={() => add('morale')} variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Personne morale
          </Button>
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
                <button onClick={() => remove(i)} className="text-[#9B9B9B] hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {p.type === 'physique' ? (
                <div className="space-y-4">
                  {renderPersonFields(p, i, '')}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F0F0F0]">
                    <div>
                      <Label className="text-xs">Part (%) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={p.part_percent || ''} onChange={e => setField(i, 'part_percent', e.target.value)} className="mt-1 text-sm" placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Apport (DJF)</Label>
                      <Input type="number" value={p.apport || ''} onChange={e => setField(i, 'apport', e.target.value)} className="mt-1 text-sm" placeholder="0" />
                    </div>
                  </div>
                  <UBOSection partner={p} index={i} setField={setField} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Raison sociale <span className="text-red-500">*</span></Label>
                      <Input value={p.raison_sociale || ''} onChange={e => setField(i, 'raison_sociale', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Siège social</Label>
                      <Input value={p.siege_social || ''} onChange={e => setField(i, 'siege_social', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">N° immatriculation (RCS)</Label>
                      <Input value={p.rcs || ''} onChange={e => setField(i, 'rcs', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={p.email || ''} onChange={e => setField(i, 'email', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Part (%)</Label>
                      <Input type="number" value={p.part_percent || ''} onChange={e => setField(i, 'part_percent', e.target.value)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Apport (DJF)</Label>
                      <Input type="number" value={p.apport || ''} onChange={e => setField(i, 'apport', e.target.value)} className="mt-1 text-sm" />
                    </div>
                  </div>
                  <div className="border-t border-[#F0F0F0] pt-3 space-y-2">
                    <p className="text-xs font-medium text-[#1A1A1A] mb-2">Documents de la société</p>
                    <DocUpload label="Copie du registre de commerce" onUploaded={url => setField(i, 'registre_url', url)} />
                    <DocUpload label="Copie certifiée des statuts (avec traduction)" onUploaded={url => setField(i, 'statuts_url', url)} />
                    <DocUpload label="Décision de créer une succursale à Djibouti" onUploaded={url => setField(i, 'decision_url', url)} />
                  </div>
                  <div className="border-t border-[#F0F0F0] pt-3">
                    <p className="text-sm font-medium text-[#1A1A1A] mb-3">Représentant de la société actionnaire</p>
                    {renderPersonFields(p, i, 'rep_')}
                  </div>
                  <UBOSection partner={p} index={i} setField={setField} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shareholder Tree — shown when 2+ partners or any UBO */}
      {partners.length >= 1 && (
        <ShareholderTree partners={partners} companyName="Société en cours de création" />
      )}
    </div>
  );
}