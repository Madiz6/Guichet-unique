import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserSquare2, Upload, CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

const emptyEmployee = () => ({
  type_employe: 'Employé', prenom: '', nom: '', nom_mere: '',
  matricule_cnss: '', email: '', telephone: '', type_contrat: 'CDI',
  salaire_base: '', emploi_occupe: '', date_embauche: '',
  doc_front: '', doc_back: '', nationalite: '', date_naissance: '', nni: '', numero_identite: '',
});

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
        prompt: 'Extract from identity document (CIN/Passport): nom, prenom, date_naissance (YYYY-MM-DD), nationalite, adresse, nni, numero_identite, email, telephone, lieu_naissance, sexe, mere_nom. Return JSON.',
        file_urls: urls,
        response_json_schema: {
          type: 'object',
          properties: {
            nom: { type: 'string' }, prenom: { type: 'string' },
            date_naissance: { type: 'string' }, nationalite: { type: 'string' },
            adresse: { type: 'string' }, nni: { type: 'string' },
            numero_identite: { type: 'string' }, email: { type: 'string' },
            telephone: { type: 'string' }, lieu_naissance: { type: 'string' },
            sexe: { type: 'string' }, mere_nom: { type: 'string' },
          },
        },
      });
      onExtracted(r);
      toast.success('Données extraites automatiquement');
    } catch { toast.info('Remplissez manuellement'); }
    setExtracting(false);
  };

  const sides = [{ s: 'front', label: docType === 'passeport' ? 'Page principale' : 'Recto', url: frontUrl }];
  if (docType === 'cni') sides.push({ s: 'back', label: 'Verso (NNI)', url: backUrl });

  return (
    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ScanLine className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-[#1A1A1A]">Pièce d'identité / Passeport (extraction auto)</span>
        </div>
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
                <label className="ml-auto text-blue-600 cursor-pointer hover:underline">
                  Changer<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => e.target.files[0] && handle(e.target.files[0], s)} />
                </label>
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
      {extracting && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraction IA en cours...
        </div>
      )}
    </div>
  );
}

export default function DeclarationEmployesStep({ value, onChange }) {
  const employees = value?.employees || [];
  const update = (next) => onChange({ employees: next });
  const add = () => update([...employees, emptyEmployee()]);
  const remove = (i) => update(employees.filter((_, idx) => idx !== i));
  const set = (i, k, v) => update(employees.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const merge = (i, obj) => update(employees.map((e, idx) => idx === i ? { ...e, ...obj } : e));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration des employés</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Personnel initial (optionnel) — {employees.length} employé(s)</p>
        </div>
        <Button onClick={add} variant="outline" className="flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
          <UserSquare2 className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#9B9B9B]">Aucun employé déclaré pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map((e, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-[#1A1A1A]">{e.prenom || e.nom ? `${e.prenom} ${e.nom}`.trim() : `Employé ${i + 1}`}</p>
                  {e.type_employe && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.type_employe === 'Gérant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{e.type_employe}</span>
                  )}
                </div>
                <button onClick={() => remove(i)} className="text-[#9B9B9B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Type d'employé <span className="text-red-500">*</span></Label>
                  <select value={e.type_employe} onChange={e2 => set(i, 'type_employe', e2.target.value)} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent">
                    <option value="Employé">Employé</option>
                    <option value="Gérant">Gérant</option>
                  </select>
                </div>

                <IdExtract
                  frontUrl={e.doc_front} backUrl={e.doc_back}
                  onFront={url => set(i, 'doc_front', url)}
                  onBack={url => set(i, 'doc_back', url)}
                  onExtracted={d => merge(i, {
                    nom: d.nom || e.nom,
                    prenom: d.prenom || e.prenom,
                    nationalite: d.nationalite || e.nationalite,
                    date_naissance: d.date_naissance || e.date_naissance,
                    nni: d.nni || e.nni,
                    numero_identite: d.numero_identite || e.numero_identite,
                    telephone: d.telephone || e.telephone,
                    email: d.email || e.email,
                    nom_mere: d.mere_nom || e.nom_mere,
                  })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label className="text-xs">Prénom</Label><Input value={e.prenom} onChange={e2 => set(i, 'prenom', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Nom</Label><Input value={e.nom} onChange={e2 => set(i, 'nom', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Nom de la mère</Label><Input value={e.nom_mere} onChange={e2 => set(i, 'nom_mere', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Matricule assuré social (si immatriculé)</Label><Input value={e.matricule_cnss} onChange={e2 => set(i, 'matricule_cnss', e2.target.value)} className="mt-1 text-sm" placeholder="Laisser vide si non immatriculé" /></div>
                  <div><Label className="text-xs">NNI</Label><Input value={e.nni} onChange={e2 => set(i, 'nni', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Nationalité</Label><Input value={e.nationalite} onChange={e2 => set(i, 'nationalite', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Date de naissance</Label><Input type="date" value={e.date_naissance} onChange={e2 => set(i, 'date_naissance', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Email</Label><Input type="email" value={e.email} onChange={e2 => set(i, 'email', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Téléphone</Label><Input value={e.telephone} onChange={e2 => set(i, 'telephone', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div>
                    <Label className="text-xs">Type de contrat</Label>
                    <select value={e.type_contrat} onChange={e2 => set(i, 'type_contrat', e2.target.value)} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent">
                      {['CDI', 'CDD', 'Temps Plein', 'Temps Partiel'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><Label className="text-xs">Salaire de base (DJF)</Label><Input type="number" value={e.salaire_base} onChange={e2 => set(i, 'salaire_base', e2.target.value)} className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs">Emploi occupé</Label><Input value={e.emploi_occupe} onChange={e2 => set(i, 'emploi_occupe', e2.target.value)} className="mt-1 text-sm" placeholder="Titre du poste" /></div>
                  <div><Label className="text-xs">Date d'embauche</Label><Input type="date" value={e.date_embauche} onChange={e2 => set(i, 'date_embauche', e2.target.value)} className="mt-1 text-sm" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}