import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PhoneInput from './PhoneInput.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Camera, Loader2, ScanLine, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import BiometricVerification from './BiometricVerification.jsx';

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
  { k: 'telephone', label: 'Téléphone' },
  { k: 'mrz_line1', label: 'MRZ Ligne 1' },
  { k: 'mrz_line2', label: 'MRZ Ligne 2' },
];

export default function IdentificationStep({ value, onChange, showBiometric }) {
  const [uploading, setUploading] = useState({ front: false, back: false });
  const [extracting, setExtracting] = useState(false);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  const data = value || {};
  const fields = data.data || {};
  const docType = data.doc_type || 'cni';
  const repType = data.rep_type || 'physique';
  const notaire = data.notaire || {};

  const setRepType = (val) => onChange({ ...data, rep_type: val });
  const updateNotaire = (k, v) => onChange({ ...data, notaire: { ...notaire, [k]: v } });
  const updateField = (k, v) => onChange({ ...data, data: { ...fields, [k]: v } });

  const handleDocTypeChange = (val) => {
    onChange({ ...data, doc_type: val, document_back_url: val === 'passeport' ? undefined : data.document_back_url });
  };

  const handleDocUpload = async (file, side) => {
    setUploading(p => ({ ...p, [side]: true }));
    let file_url;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
    } catch {
      setUploading(p => ({ ...p, [side]: false }));
      toast.error('Erreur de téléchargement — vérifiez votre connexion et réessayez');
      return;
    }
    setUploading(p => ({ ...p, [side]: false }));

    const newUrls = {
      document_front_url: side === 'front' ? file_url : data.document_front_url,
      document_back_url: side === 'back' ? file_url : data.document_back_url,
    };
    const frontUrl = newUrls.document_front_url;
    const backUrl = newUrls.document_back_url;
    onChange({ ...data, ...newUrls, document_url: frontUrl || backUrl });

    if (!frontUrl) return;

    setExtracting(true);
    try {
      const fileUrls = [frontUrl, ...(backUrl ? [backUrl] : [])];
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `You are given ${fileUrls.length === 2 ? 'the front AND back sides' : 'the front'} of an identity document. Extract ALL visible information from BOTH sides if provided. The back of the ID typically contains the NNI (Numéro National d'Identification), machine-readable zone (MRZ), address, and other details. Return JSON with: nom, prenom, date_naissance (YYYY-MM-DD format), lieu_naissance, nationalite, numero_identite, nni (Numéro National d'Identification - very important, found on back), date_emission (YYYY-MM-DD), date_expiration (YYYY-MM-DD), adresse, sexe, email, telephone, profession, pere_nom, mere_nom, mrz_line1, mrz_line2. Use empty string for any field not found.`,
        file_urls: fileUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            nom: { type: 'string' }, prenom: { type: 'string' },
            date_naissance: { type: 'string' }, lieu_naissance: { type: 'string' },
            nationalite: { type: 'string' }, numero_identite: { type: 'string' },
            nni: { type: 'string' }, date_emission: { type: 'string' }, date_expiration: { type: 'string' },
            adresse: { type: 'string' }, sexe: { type: 'string' }, email: { type: 'string' },
            telephone: { type: 'string' }, profession: { type: 'string' },
            pere_nom: { type: 'string' }, mere_nom: { type: 'string' },
            mrz_line1: { type: 'string' }, mrz_line2: { type: 'string' },
          },
        },
      });
      onChange({ ...data, ...newUrls, document_url: frontUrl, data: extracted });
      toast.success(`Données extraites depuis ${fileUrls.length === 2 ? 'recto + verso' : 'le recto'}`);
    } catch {
      onChange({ ...data, ...newUrls, document_url: frontUrl });
      toast.info('Document téléchargé — veuillez remplir les données manuellement');
    }
    setExtracting(false);
  };

  const startCamera = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    setStream(s);
    setCameraActive(true);
    setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
  };

  const takeSelfie = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      setSelfieUploading(true);
      stream?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...data, selfie_url: file_url, biometric: { liveness: true, quality: 'good' } });
      setSelfieUploading(false);
      toast.success('Photo prise avec succès');
    }, 'image/jpeg');
  };

  const sides = [{ side: 'front', label: docType === 'passeport' ? 'Page principale' : 'Recto (avant)', urlKey: 'document_front_url' }];
  if (docType === 'cni') sides.push({ side: 'back', label: 'Verso (arrière)', urlKey: 'document_back_url' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Identification du représentant légal</h2>
        <p className="text-sm text-[#6B6B6B]">Choisissez le type de représentant et fournissez les informations requises</p>
      </div>

      {/* Rep type selector */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <Label className="text-sm font-medium text-[#1A1A1A] mb-3 block">Type de représentant <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { val: 'physique', label: 'Représentant physique', desc: 'Personne physique — directeur, gérant', Icon: User },
            { val: 'notaire', label: 'Représentant moral (Notaire)', desc: 'Mandataire notarial ou juridique', Icon: Building2 },
          ].map(({ val, label, desc, Icon }) => (
            <button key={val} type="button" onClick={() => setRepType(val)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${repType === val ? 'border-[#1A1A1A] bg-[#F9F9F9]' : 'border-[#E5E7EB] hover:border-[#C4C4C4]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${repType === val ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F5F5] text-[#6B6B6B]'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm text-[#1A1A1A]">{label}</p>
                <p className="text-xs text-[#9B9B9B] mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PHYSIQUE */}
      {repType === 'physique' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h3 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-blue-600" /> Pièce d'identité
            </h3>
            <div className="flex gap-3 mb-4">
              {[{ val: 'cni', label: "Carte d'identité" }, { val: 'passeport', label: 'Passeport' }].map(({ val, label }) => (
                <button key={val} type="button" onClick={() => handleDocTypeChange(val)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${docType === val ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#6B6B6B] border-[#E5E7EB] hover:border-[#1A1A1A]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sides.map(({ side, label, urlKey }) => (
                <div key={side}>
                  <p className="text-xs font-medium text-[#6B6B6B] mb-2">{label}{side === 'front' && <span className="text-red-500 ml-1">*</span>}</p>
                  {data[urlKey] ? (
                    <div className="border border-green-300 bg-green-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Téléchargé</div>
                        <label className="cursor-pointer text-xs text-blue-600 hover:underline">Changer
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleDocUpload(e.target.files[0], side)} disabled={uploading[side] || extracting} />
                        </label>
                      </div>
                      <img src={data[urlKey]} alt={label} className="mt-2 w-full h-24 object-cover rounded border border-green-200" onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-all h-32">
                      {uploading[side] ? (
                        <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /><span className="text-xs text-[#6B6B6B]">Téléchargement...</span></div>
                      ) : (extracting && side === 'front') ? (
                        <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-purple-600" /><span className="text-xs text-[#6B6B6B]">Extraction IA...</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-5 h-5 text-[#9B9B9B]" />
                          <span className="text-xs text-[#9B9B9B] text-center">Cliquez pour télécharger<br />(JPG, PNG, PDF)</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && handleDocUpload(e.target.files[0], side)} disabled={uploading[side] || extracting} />
                    </label>
                  )}
                </div>
              ))}
            </div>

            {extracting && (
              <div className="mt-4 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-8 h-8 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-purple-200 animate-ping opacity-50" />
                    <div className="relative w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Analyse IA en cours…</p>
                    <p className="text-xs text-purple-500">Extraction depuis recto{data.document_back_url ? ' + verso' : ''}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {['Détection du document', 'Lecture des champs', 'Extraction du NNI et MRZ', 'Vérification des données'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-purple-300 overflow-hidden flex-1">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                          style={{ animation: `progressBar 2s ease-in-out ${i * 0.4}s infinite alternate`, width: '100%' }} />
                      </div>
                      <span className="text-xs text-purple-600 w-40 shrink-0">{s}</span>
                    </div>
                  ))}
                </div>
                <style>{`@keyframes progressBar{0%{transform:scaleX(0.1);transform-origin:left;opacity:0.4}100%{transform:scaleX(1);transform-origin:left;opacity:1}}`}</style>
              </div>
            )}
          </div>

          {data.document_url && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <h3 className="font-medium text-[#1A1A1A] mb-4">Informations extraites</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXTRACT_FIELDS.map(f => (
                  <div key={f.k}>
                    <Label className="text-xs text-[#6B6B6B]">{f.label}</Label>
                    {f.k === 'telephone' ? (
                      <PhoneInput value={fields[f.k] || ''} onChange={v => updateField(f.k, v)} />
                    ) : (
                      <Input type={f.type || 'text'} value={fields[f.k] || ''} onChange={e => updateField(f.k, e.target.value)} className="mt-1 text-sm" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showBiometric && data.document_url && (
            <BiometricVerification
              idPhotoUrl={data.document_front_url || data.document_url}
              onComplete={(result) => {
                onChange({
                  ...data,
                  selfie_url: result.selfie_url,
                  biometric: result.biometric,
                });
              }}
              onSkip={() => onChange({ ...data, biometric: { skipped: true } })}
            />
          )}
        </div>
      )}

      {/* NOTAIRE */}
      {repType === 'notaire' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Informations du Notaire / Mandataire
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#6B6B6B]">Nom du Notaire <span className="text-red-500">*</span></Label>
              <Input value={notaire.nom || ''} onChange={e => updateNotaire('nom', e.target.value)} className="mt-1 text-sm" placeholder="Nom complet" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">Nom commercial <span className="text-red-500">*</span></Label>
              <Input value={notaire.nom_commercial || ''} onChange={e => updateNotaire('nom_commercial', e.target.value)} className="mt-1 text-sm" placeholder="Cabinet / Étude" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">N° d'immatriculation (RCS) <span className="text-red-500">*</span></Label>
              <Input value={notaire.rcs || ''} onChange={e => updateNotaire('rcs', e.target.value)} className="mt-1 text-sm" placeholder="RCS-XXXXX" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">NIF de l'entreprise <span className="text-red-500">*</span></Label>
              <Input value={notaire.nif || ''} onChange={e => updateNotaire('nif', e.target.value)} className="mt-1 text-sm" placeholder="NIF XXXXXXXX" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-[#6B6B6B]">Adresse <span className="text-red-500">*</span></Label>
              <Input value={notaire.adresse || ''} onChange={e => updateNotaire('adresse', e.target.value)} className="mt-1 text-sm" placeholder="Adresse complète" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={notaire.email || ''} onChange={e => updateNotaire('email', e.target.value)} className="mt-1 text-sm" placeholder="contact@cabinet.dj" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B]">Numéro de mobile <span className="text-red-500">*</span></Label>
              <PhoneInput value={notaire.telephone || ''} onChange={v => updateNotaire('telephone', v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}