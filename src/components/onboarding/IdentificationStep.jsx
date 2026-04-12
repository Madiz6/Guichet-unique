import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Camera, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

const EXTRACT_FIELDS = [
  { k: 'nom', label: 'Nom' },
  { k: 'prenom', label: 'Prénom' },
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

  const handleDocUpload = async (file, side) => {
    setUploading(p => ({ ...p, [side]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
        prompt: `You are given ${fileUrls.length === 2 ? 'the front and back' : 'the front'} of an identity document. Extract ALL visible information. Return JSON with: nom, prenom, date_naissance (YYYY-MM-DD format), lieu_naissance, nationalite, numero_identite, date_emission (YYYY-MM-DD), date_expiration (YYYY-MM-DD), adresse, sexe, email, telephone, profession, pere_nom, mere_nom. Use empty string for any field not found.`,
        file_urls: fileUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            nom: { type: 'string' }, prenom: { type: 'string' },
            date_naissance: { type: 'string' }, lieu_naissance: { type: 'string' },
            nationalite: { type: 'string' }, numero_identite: { type: 'string' },
            date_emission: { type: 'string' }, date_expiration: { type: 'string' },
            adresse: { type: 'string' }, sexe: { type: 'string' },
            email: { type: 'string' }, telephone: { type: 'string' },
            profession: { type: 'string' }, pere_nom: { type: 'string' }, mere_nom: { type: 'string' },
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
    setTimeout(() => {
      if (videoRef.current) videoRef.current.srcObject = s;
    }, 100);
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

  const updateField = (k, v) => onChange({ ...data, data: { ...fields, [k]: v } });

  const handleDocTypeChange = (val) => {
    onChange({
      ...data,
      doc_type: val,
      document_back_url: val === 'passeport' ? undefined : data.document_back_url,
    });
  };

  const sides = [
    {
      side: 'front',
      label: docType === 'passeport' ? 'Page principale' : 'Recto (avant)',
      urlKey: 'document_front_url',
    },
  ];
  if (docType === 'cni') {
    sides.push({ side: 'back', label: 'Verso (arrière)', urlKey: 'document_back_url' });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Identification du représentant légal</h2>
        <p className="text-sm text-[#6B6B6B]">Téléchargez votre pièce d'identité pour extraction automatique des données</p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h3 className="font-medium text-[#1A1A1A] mb-4 flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-blue-600" /> Pièce d'identité
        </h3>

        <div className="flex gap-3 mb-4">
          {[{ val: 'cni', label: "Carte d'identité" }, { val: 'passeport', label: 'Passeport' }].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => handleDocTypeChange(val)}
              className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                docType === val
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#6B6B6B] border-[#E5E7EB] hover:border-[#1A1A1A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sides.map(({ side, label, urlKey }) => (
            <div key={side}>
              <p className="text-xs font-medium text-[#6B6B6B] mb-2">
                {label}
                {side === 'front' && <span className="text-red-500 ml-1">*</span>}
              </p>
              {data[urlKey] ? (
                <div className="border border-green-300 bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Téléchargé
                    </div>
                    <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                      Changer
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => e.target.files[0] && handleDocUpload(e.target.files[0], side)}
                        disabled={uploading[side] || extracting}
                      />
                    </label>
                  </div>
                  <img
                    src={data[urlKey]}
                    alt={label}
                    className="mt-2 w-full h-24 object-cover rounded border border-green-200"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-all h-32">
                  {uploading[side] ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-xs text-[#6B6B6B]">Téléchargement...</span>
                    </div>
                  ) : (extracting && side === 'front') ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      <span className="text-xs text-[#6B6B6B]">Extraction IA...</span>
                    </div>
                  ) : (
                    <React.Fragment>
                      <Upload className="w-5 h-5 text-[#9B9B9B] mb-1" />
                      <span className="text-xs text-[#9B9B9B] text-center">Cliquez pour télécharger<br />(JPG, PNG, PDF)</span>
                    </React.Fragment>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => e.target.files[0] && handleDocUpload(e.target.files[0], side)}
                    disabled={uploading[side] || extracting}
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        {extracting && (
          <div className="mt-3 flex items-center gap-2 text-sm text-purple-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Extraction IA en cours depuis recto{data.document_back_url ? ' + verso' : ''}...
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
                <Input
                  type={f.type || 'text'}
                  value={fields[f.k] || ''}
                  onChange={e => updateField(f.k, e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showBiometric && data.document_url && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="font-medium text-[#1A1A1A] mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-600" /> Vérification biométrique
          </h3>
          {data.selfie_url ? (
            <div className="flex items-center gap-3">
              <img src={data.selfie_url} alt="selfie" className="w-16 h-16 rounded-full object-cover border-2 border-green-400" />
              <div className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Photo validée
              </div>
            </div>
          ) : cameraActive ? (
            <div className="space-y-3">
              <video ref={videoRef} autoPlay className="w-full max-w-sm rounded-xl mx-auto" />
              <div className="flex gap-2 justify-center">
                <Button onClick={takeSelfie} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Prendre la photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    stream?.getTracks().forEach(t => t.stop());
                    setCameraActive(false);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={startCamera} className="flex items-center gap-2">
              {selfieUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Activer la caméra
            </Button>
          )}
        </div>
      )}
    </div>
  );
}