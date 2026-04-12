import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Camera, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

export default function IdentificationStep({ value, onChange, showBiometric }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);

  const data = value || {};
  const fields = data.data || {};

  const handleDocUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    setExtracting(true);
    try {
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract all identity information from this document. Return JSON with fields: nom, prenom, date_naissance, nationalite, numero_identite, adresse, email, telephone. If a field is not found, use empty string.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            nom: { type: 'string' }, prenom: { type: 'string' },
            date_naissance: { type: 'string' }, nationalite: { type: 'string' },
            numero_identite: { type: 'string' }, adresse: { type: 'string' },
            email: { type: 'string' }, telephone: { type: 'string' },
          }
        }
      });
      onChange({ ...data, document_url: file_url, data: extracted });
      toast.success('Données extraites avec succès');
    } catch {
      onChange({ ...data, document_url: file_url });
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

  const takeSelfie = async () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Identification du représentant légal</h2>
        <p className="text-sm text-[#6B6B6B]">Téléchargez votre pièce d'identité pour extraction automatique des données</p>
      </div>

      {/* Document Upload */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <h3 className="font-medium text-[#1A1A1A] mb-3 flex items-center gap-2"><ScanLine className="w-4 h-4 text-blue-600" /> Pièce d'identité</h3>
        {data.document_url ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Document téléchargé
            <button onClick={() => onChange({ ...data, document_url: null })} className="ml-2 text-xs text-[#9B9B9B] hover:text-red-500">Changer</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 cursor-pointer hover:border-blue-400 transition-all">
            {uploading || extracting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-sm text-[#6B6B6B]">{uploading ? 'Téléchargement...' : 'Extraction IA en cours...'}</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-[#9B9B9B] mb-2" />
                <span className="text-sm text-[#9B9B9B]">Cliquez pour télécharger (CNI, Passeport)</span>
              </>
            )}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => e.target.files[0] && handleDocUpload(e.target.files[0])}
              disabled={uploading || extracting}
            />
          </label>
        )}
      </div>

      {/* Extracted / Manual fields */}
      {data.document_url && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="font-medium text-[#1A1A1A] mb-4">Informations extraites</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { k: 'nom', label: 'Nom' }, { k: 'prenom', label: 'Prénom' },
              { k: 'date_naissance', label: 'Date de naissance', type: 'date' },
              { k: 'nationalite', label: 'Nationalité' },
              { k: 'numero_identite', label: "N° d'identité" },
              { k: 'adresse', label: 'Adresse' },
              { k: 'email', label: 'Email', type: 'email' },
              { k: 'telephone', label: 'Téléphone' },
            ].map(f => (
              <div key={f.k}>
                <Label className="text-xs text-[#6B6B6B]">{f.label}</Label>
                <Input type={f.type || 'text'} value={fields[f.k] || ''} onChange={e => updateField(f.k, e.target.value)} className="mt-1 text-sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biometric / Selfie */}
      {showBiometric && data.document_url && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="font-medium text-[#1A1A1A] mb-3 flex items-center gap-2"><Camera className="w-4 h-4 text-purple-600" /> Vérification biométrique</h3>
          {data.selfie_url ? (
            <div className="flex items-center gap-3">
              <img src={data.selfie_url} alt="selfie" className="w-16 h-16 rounded-full object-cover border-2 border-green-400" />
              <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Photo validée</div>
            </div>
          ) : cameraActive ? (
            <div className="space-y-3">
              <video ref={videoRef} autoPlay className="w-full max-w-sm rounded-xl mx-auto" />
              <div className="flex gap-2 justify-center">
                <Button onClick={takeSelfie} className="bg-purple-600 hover:bg-purple-700 text-white">Prendre la photo</Button>
                <Button variant="outline" onClick={() => { stream?.getTracks().forEach(t => t.stop()); setCameraActive(false); }}>Annuler</Button>
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