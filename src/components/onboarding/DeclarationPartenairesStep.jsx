import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Users, Upload, CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

const emptyPhysique = () => ({ type: 'physique', nom: '', prenom: '', email: '', telephone: '', adresse: '', nationalite: '', date_naissance: '', part_percent: '', apport: '', doc_front: '', doc_back: '' });
const emptyMorale = () => ({ type: 'morale', raison_sociale: '', siege_social: '', rcs: '', email: '', part_percent: '', apport: '', registre_url: '', statuts_url: '', decision_url: '', rep_nom: '', rep_prenom: '', rep_telephone: '', rep_adresse: '', rep_email: '', rep_nationalite: '', rep_date_naissance: '', rep_doc_front: '', rep_doc_back: '' });

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
    const urls = [side === 'front' ? file_url : frontUrl, side === 'back' ? file_url : backUrl].filter(Boolean);
    if (urls.length === 0) return;
    setExtracting(true);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: 'Extract from identity document: nom, prenom, date_naissance (YYYY-MM-DD), nationalite, adresse, nni, numero_identite, email, telephone. Return JSON.',
        file_urls: urls,
        response_json_schema: { type: 'object', properties: { nom: { type: 'string' }, prenom: { type: 'string' }, date_naissance: { type: 'string' }, nationalite: { type: 'string' }, adresse: { type: 'string' }, nni: { type: 'string' }, numero_identite: { type: 'string' }, email: { type: 'string' }, telephone: { type: 'string' } } },
      });
      onExtracted(r);
      toast.success('Données extraites');
    } catch { toast.info('Remplissez manuellement'); }
    setExtracting(false);
  };

  const sides = [{ s: 'front', label: docType === 'passeport' ? 'Page principale' : 'Recto', url: frontUrl }];
  if (docType === 'cni') sides.push({ s: 'back', label: 'Verso (NNI)', url: backUrl });

  return (
    <div className="space-y-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5 text-blue-600" /><span className="text-xs font-medium text-[#1A1A1A]">Pièce d'identité (extraction auto)</span></div>
        <div className="flex gap-1.5">
          {[{ val: 'cni', label: 'CNI' }, { val: 'passeport', label: 'Passeport' }].map(({ val, label }) => (
            <button key={val} type="button" onClick={() => setDocType(val)}
              className={`text-xs px-2 py-0.5 rounded border transition-all ${docType === val ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sides.map(({ s, label, url }) => (
          <div key={s}>
            <p className="text-xs text-[#6B6B6B] mb-1">{label}</p>
            {url ? (
              <div className="flex items-center gap-1.5 border border-green-200 bg-green-50 rounded px-2 py-1.5 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" /> Téléchargé
                <label className="ml-auto text-blue-600 cursor-pointer hover:underline">Changer<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} /></label>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 cursor-pointer border border-dashed border-[#D1D5DB] rounded px-2 py-1.5 hover:border-blue-400 text-xs text-[#9B9B9B]">
                {uploading[s] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading[s] ? '...' : 'Télécharger'}
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} />
              </label>
            )}
          </div>
        ))}
      </div>
      {extracting && <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraction IA en cours...</div>}
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
                  <IdExtract frontUrl={p.doc_front} backUrl={p.doc_back}
                    onFront={url => set(i, 'doc_front', url)} onBack={url => set(i, 'doc_back', url)}
                    onExtracted={d => merge(i, { nom: d.nom || p.nom, prenom: d.prenom || p.prenom, nationalite: d.nationalite || p.nationalite, date_naissance: d.date_naissance || p.date_naissance, adresse: d.adresse || p.adresse, telephone: d.telephone || p.telephone, email: d.email || p.email })}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Nom</Label><Input value={p.nom} onChange={e => set(i, 'nom', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Prénom</Label><Input value={p.prenom} onChange={e => set(i, 'prenom', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Nationalité</Label><Input value={p.nationalite} onChange={e => set(i, 'nationalite', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Date de naissance</Label><Input type="date" value={p.date_naissance} onChange={e => set(i, 'date_naissance', e.target.value)} className="mt-1 text-sm" /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Adresse</Label><Input value={p.adresse} onChange={e => set(i, 'adresse', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Email</Label><Input type="email" value={p.email} onChange={e => set(i, 'email', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Numéro de mobile</Label><Input value={p.telephone} onChange={e => set(i, 'telephone', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Part (%)</Label><Input type="number" value={p.part_percent} onChange={e => set(i, 'part_percent', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Apport (DJF)</Label><Input type="number" value={p.apport} onChange={e => set(i, 'apport', e.target.value)} className="mt-1 text-sm" /></div>
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
                    <IdExtract frontUrl={p.rep_doc_front} backUrl={p.rep_doc_back}
                      onFront={url => set(i, 'rep_doc_front', url)} onBack={url => set(i, 'rep_doc_back', url)}
                      onExtracted={d => merge(i, { rep_nom: d.nom || p.rep_nom, rep_prenom: d.prenom || p.rep_prenom, rep_nationalite: d.nationalite || p.rep_nationalite, rep_date_naissance: d.date_naissance || p.rep_date_naissance, rep_adresse: d.adresse || p.rep_adresse, rep_telephone: d.telephone || p.rep_telephone, rep_email: d.email || p.rep_email })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div><Label className="text-xs">Nom</Label><Input value={p.rep_nom} onChange={e => set(i, 'rep_nom', e.target.value)} className="mt-1 text-sm" /></div>
                      <div><Label className="text-xs">Prénom</Label><Input value={p.rep_prenom} onChange={e => set(i, 'rep_prenom', e.target.value)} className="mt-1 text-sm" /></div>
                      <div><Label className="text-xs">Nationalité</Label><Input value={p.rep_nationalite} onChange={e => set(i, 'rep_nationalite', e.target.value)} className="mt-1 text-sm" /></div>
                      <div><Label className="text-xs">Date de naissance</Label><Input type="date" value={p.rep_date_naissance} onChange={e => set(i, 'rep_date_naissance', e.target.value)} className="mt-1 text-sm" /></div>
                      <div className="md:col-span-2"><Label className="text-xs">Adresse</Label><Input value={p.rep_adresse} onChange={e => set(i, 'rep_adresse', e.target.value)} className="mt-1 text-sm" /></div>
                      <div><Label className="text-xs">Email</Label><Input type="email" value={p.rep_email} onChange={e => set(i, 'rep_email', e.target.value)} className="mt-1 text-sm" /></div>
                      <div><Label className="text-xs">Numéro de mobile</Label><Input value={p.rep_telephone} onChange={e => set(i, 'rep_telephone', e.target.value)} className="mt-1 text-sm" /></div>
                    </div>
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