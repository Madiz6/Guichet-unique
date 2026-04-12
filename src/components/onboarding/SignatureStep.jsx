import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, PenLine, User, Calendar, FileText, Shield } from 'lucide-react';

export default function SignatureStep({ value, onChange, stepData }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signed, setSigned] = useState(!!(value?.signature_data));
  const [activeTab, setActiveTab] = useState('document');

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || '_______________';
  const signerName = idData.prenom ? `${idData.prenom} ${idData.nom}` : '_______________';
  const today = new Date().toLocaleDateString('fr-FR');
  const envelopeId = value?.envelope_id || generateEnvelopeId();

  function generateEnvelopeId() {
    const hex = () => Math.random().toString(16).substring(2, 10).toUpperCase();
    return `${hex()}-${hex().substring(0,4)}-${hex().substring(0,4)}-${hex().substring(0,4)}-${hex()}${hex().substring(0,4)}`;
  }

  useEffect(() => {
    if (!value?.envelope_id) {
      onChange({ ...value, envelope_id: envelopeId });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1A2B6B';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [activeTab]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasSignature(true);
    setSigned(false);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = (e) => { e.preventDefault(); setDrawing(false); };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSigned(false);
    onChange({ ...value, signature_data: null });
  };

  const confirm = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange({ ...value, signature_data: dataUrl, signed_at: new Date().toISOString(), signed_by: signerName });
    setSigned(true);
    setActiveTab('done');
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1A2B6B] text-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#1A2B6B]" />
          </div>
          <div>
            <p className="font-bold text-sm">Guichet Unique ANPI — Djibouti</p>
            <p className="text-xs text-blue-200">Enveloppe de signature électronique</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-200">Envelope ID</p>
          <p className="font-mono text-xs text-yellow-300 font-bold">{value?.envelope_id || envelopeId}</p>
        </div>
      </div>

      <div className="flex border-b border-[#E5E7EB]">
        {[
          { id: 'document', label: 'Document', icon: FileText },
          { id: 'sign', label: 'Signer', icon: PenLine },
          { id: 'done', label: 'Confirmé', icon: CheckCircle2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === id ? 'border-[#1A2B6B] text-[#1A2B6B]' : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === 'done' && signed && <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />}
          </button>
        ))}
      </div>

      {activeTab === 'document' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          {/* DocuSign-style document header */}
          <div className="bg-[#F0F4FF] border-b border-[#D0D9F0] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1A2B6B]" />
              <span className="text-sm font-medium text-[#1A2B6B]">Déclaration de création d'entreprise</span>
            </div>
            <span className="text-xs text-[#6B6B6B]">Page 1 / 1</span>
          </div>

          {/* Document content */}
          <div className="p-6 space-y-4 font-serif text-sm">
            <div className="text-center border-b-2 border-[#1A2B6B] pb-4 mb-4">
              <p className="font-bold text-base text-[#1A2B6B]">FORMULAIRE UNIQUE POUR LA CRÉATION D'ENTREPRISE</p>
              <p className="text-xs text-[#6B6B6B] mt-1">EN RÉPUBLIQUE DE DJIBOUTI — Guichet Unique ANPI</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Dénomination sociale :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{companyName}</span></div>
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Forme juridique :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{activite.forme_juridique || '___'}</span></div>
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Capital social :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} FD` : '___'}</span></div>
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Secteur :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{activite.secteur_principal || '___'}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Représentant :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{signerName}</span></div>
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Nationalité :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{idData.nationalite || '___'}</span></div>
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">Date de naissance :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{idData.date_naissance || '___'}</span></div>
                <div className="flex gap-2"><span className="text-[#6B6B6B] w-32 shrink-0">N° CIN :</span><span className="font-semibold border-b border-dotted border-[#999] flex-1">{idData.numero_identite || '___'}</span></div>
              </div>
            </div>

            {/* Signature zone indicator */}
            <div className="mt-8 border-2 border-dashed border-[#1A2B6B] rounded-xl p-4 bg-[#F0F4FF]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1A2B6B] flex items-center justify-center text-white">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-[#1A2B6B]">Zone de signature — {signerName}</p>
                    <p className="text-xs text-[#6B6B6B]">Gérant / Représentant légal</p>
                  </div>
                </div>
                {signed ? (
                  <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium"><CheckCircle2 className="w-4 h-4" /> Signé le {today}</div>
                ) : (
                  <Button size="sm" onClick={() => setActiveTab('sign')} className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-xs">
                    <PenLine className="w-3.5 h-3.5 mr-1" /> Cliquez pour signer
                  </Button>
                )}
              </div>
              {signed && value?.signature_data && (
                <img src={value.signature_data} alt="signature" className="mt-3 h-16 object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sign' && (
        <div className="space-y-4">
          <div className="bg-[#FFF8E1] border border-[#FFD54F] rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#F9A825] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#5D4037]">Action requise : Signature électronique</p>
              <p className="text-xs text-[#795548] mt-0.5">En signant, vous certifiez que toutes les informations sont exactes et complètes. Cette signature a valeur légale.</p>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="bg-[#1A2B6B] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                <span className="text-sm font-medium">Signez dans le cadre ci-dessous</span>
              </div>
              {hasSignature && (
                <button onClick={clear} className="flex items-center gap-1 text-xs text-blue-200 hover:text-white">
                  <RotateCcw className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>
            <div className="relative">
              {!hasSignature && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                  <PenLine className="w-8 h-8 text-[#D1D5DB] mb-2" />
                  <p className="text-sm text-[#C4C4C4]">Signez ici avec votre doigt ou souris</p>
                </div>
              )}
              <canvas ref={canvasRef} width={800} height={200}
                className="w-full cursor-crosshair touch-none bg-[#FAFAFA]" style={{ height: '180px' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
            </div>
            <div className="px-4 py-2 bg-[#F9F9F9] border-t border-[#F0F0F0] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{today}</span>
                <span>•</span>
                <User className="w-3.5 h-3.5" />
                <span>{signerName}</span>
              </div>
            </div>
          </div>

          <Button onClick={confirm} disabled={!hasSignature}
            className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white h-12 text-base disabled:opacity-40">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmer et apposer la signature
          </Button>
        </div>
      )}

      {activeTab === 'done' && (
        <div className="space-y-4">
          {signed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-green-700 text-lg">Document signé avec succès</p>
                <p className="text-sm text-green-600 mt-1">Signé par <strong>{signerName}</strong> le {today}</p>
              </div>
              <div className="bg-white border border-green-200 rounded-lg p-3 text-left">
                <p className="text-xs text-[#6B6B6B] mb-1">Envelope ID</p>
                <p className="font-mono text-xs font-bold text-[#1A2B6B]">{value?.envelope_id}</p>
              </div>
              {value?.signature_data && (
                <div className="bg-white border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-[#6B6B6B] mb-2">Votre signature</p>
                  <img src={value.signature_data} alt="signature" className="h-16 object-contain mx-auto" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <PenLine className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm text-[#9B9B9B]">Vous n'avez pas encore signé. Allez dans l'onglet "Signer".</p>
              <Button onClick={() => setActiveTab('sign')} variant="outline" className="mt-4">Signer maintenant</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}