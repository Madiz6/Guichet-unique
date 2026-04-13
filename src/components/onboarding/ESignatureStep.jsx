import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, RotateCcw, PenLine, FileText, Shield, Download, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { generateFormulairePDF, generateStatutsPDF } from './PDFGenerator.jsx';

const DOCS_TO_SIGN = [
  { key: 'statuts', label: 'Statuts de la société', desc: 'Document constitutif de la société' },
  { key: 'formulaire', label: 'Formulaire Unique GUI', desc: 'Formulaire officiel du Guichet Unique ANPI' },
  { key: 'attestation', label: 'Attestation de pouvoir', desc: 'Attestation signée à l\'étape précédente' },
];

export default function ESignatureStep({ value, onChange, stepData }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signed, setSigned] = useState(!!(value?.signed));
  const [signatureData, setSignatureData] = useState(value?.signature_data || null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [downloading, setDownloading] = useState('');

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const repType = stepData?.identification?.rep_type || 'physique';
  const notaire = stepData?.identification?.notaire || {};
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || 'Votre société';
  const signerName = repType === 'notaire'
    ? (notaire.nom || '___')
    : (idData.prenom ? `${idData.prenom} ${idData.nom}`.trim() : '___');
  const today = new Date().toLocaleDateString('fr-FR');
  const envelopeId = value?.envelope_id || stepData?.signature?.envelope_id || `ENV-${Date.now().toString(36).toUpperCase()}`;

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
    // If we have a saved signature, restore it
    if (signatureData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = signatureData;
    }
  }, []);

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

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSigned(false);
    setSignatureData(null);
    onChange({ signed: false, signature_data: null, envelope_id: envelopeId });
  };

  const confirmSignature = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSignatureData(dataUrl);
    setSigned(true);
    onChange({
      signed: true,
      signature_data: dataUrl,
      envelope_id: envelopeId,
      signed_at: new Date().toISOString(),
      signed_by: signerName,
      company_name: companyName,
    });
  };

  const handleDownload = (docKey) => {
    setDownloading(docKey);
    try {
      const enrichedStepData = { ...stepData, signature: { signature_data: signatureData, envelope_id: envelopeId } };
      if (docKey === 'statuts') generateStatutsPDF(enrichedStepData, envelopeId);
      else if (docKey === 'formulaire') generateFormulairePDF(enrichedStepData, envelopeId);
    } finally {
      setTimeout(() => setDownloading(''), 500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Signature électronique des documents</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Apposez votre signature électronique pour valider l'ensemble du dossier avant soumission
        </p>
      </div>

      {/* Legal notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Valeur juridique de la signature électronique</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Conformément à la loi djiboutienne sur la signature électronique, votre signature numérique apposée ci-dessous a la même valeur légale qu'une signature manuscrite. Elle sera intégrée à vos documents officiels.
          </p>
        </div>
      </div>

      {/* Documents to sign */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-[#1A1A1A]">Documents à signer</p>
        {DOCS_TO_SIGN.map(doc => {
          const isAttested = doc.key === 'attestation' && stepData?.attestation?.signed;
          const canDownload = (doc.key !== 'attestation') && signed;
          const isExpanded = expandedDoc === doc.key;
          return (
            <div key={doc.key} className={`border rounded-xl overflow-hidden ${signed || isAttested ? 'border-green-200' : 'border-[#E5E7EB]'}`}>
              <div className={`flex items-center gap-3 p-4 ${signed || isAttested ? 'bg-green-50' : 'bg-white'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${signed || isAttested ? 'bg-green-100' : 'bg-[#F5F5F5]'}`}>
                  {signed || isAttested
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : <FileText className="w-4 h-4 text-[#9B9B9B]" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">{doc.label}</p>
                  <p className="text-xs text-[#6B6B6B]">{doc.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canDownload && (
                    <button
                      onClick={() => handleDownload(doc.key)}
                      disabled={downloading === doc.key}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-1 rounded border border-blue-200 bg-white"
                    >
                      <Download className="w-3 h-3" />
                      {downloading === doc.key ? '...' : 'PDF'}
                    </button>
                  )}
                  {doc.key !== 'attestation' && (
                    <button
                      onClick={() => setExpandedDoc(isExpanded ? null : doc.key)}
                      className="text-[#9B9B9B] hover:text-[#1A1A1A]"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-[#FAFAFA] border-t border-[#F0F0F0]">
                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    {doc.key === 'statuts'
                      ? `Statuts de la ${activite.forme_juridique || 'société'} « ${companyName} » — Capital : ${activite.capital_social ? Number(activite.capital_social).toLocaleString() + ' DJF' : 'à définir'}`
                      : `Formulaire Unique GUI pour ${companyName} — Activité : ${activite.secteur_principal || '—'}`
                    }
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Signature area */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="bg-[#1A2B6B] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            <span className="text-sm font-medium">Signature électronique — {signerName}</span>
          </div>
          {hasSignature && !signed && (
            <button onClick={clearSignature} className="flex items-center gap-1 text-xs text-blue-200 hover:text-white">
              <RotateCcw className="w-3 h-3" /> Effacer
            </button>
          )}
          {signed && (
            <button onClick={clearSignature} className="flex items-center gap-1 text-xs text-yellow-300 hover:text-white">
              <RotateCcw className="w-3 h-3" /> Modifier
            </button>
          )}
        </div>

        <div className="relative">
          {!hasSignature && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <PenLine className="w-8 h-8 text-[#D1D5DB] mb-1" />
              <p className="text-xs text-[#C4C4C4]">Signez ici avec votre doigt ou votre souris</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={800}
            height={180}
            className="w-full cursor-crosshair touch-none bg-white"
            style={{ height: '160px', opacity: signed ? 0.85 : 1 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>

        <div className="px-4 py-2 bg-[#F9F9F9] border-t border-[#F0F0F0] flex items-center justify-between">
          <p className="text-xs text-[#6B6B6B]">Fait à Djibouti, le {today} — {signerName}</p>
          {signed && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Signature enregistrée
            </div>
          )}
        </div>
      </div>

      {/* Signature info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
        {[
          { label: 'Signataire', value: signerName },
          { label: 'Date', value: today },
          { label: 'Référence dossier', value: envelopeId.substring(0, 12) + '...' },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E7EB]">
            <p className="text-xs text-[#9B9B9B] mb-0.5">{label}</p>
            <p className="text-xs font-semibold text-[#1A1A1A] truncate">{value}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={confirmSignature}
        disabled={!hasSignature || signed}
        className={`w-full h-12 text-base font-medium ${signed ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1A2B6B] hover:bg-[#0f1e4d]'} text-white disabled:opacity-40`}
      >
        {signed
          ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Documents signés électroniquement ✓</>
          : <><PenLine className="w-4 h-4 mr-2" /> Confirmer et signer tous les documents</>
        }
      </Button>
    </div>
  );
}