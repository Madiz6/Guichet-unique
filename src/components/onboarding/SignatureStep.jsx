import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, PenLine } from 'lucide-react';

export default function SignatureStep({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signed, setSigned] = useState(!!(value?.signature_data));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
    onChange({ ...value, signature_data: dataUrl });
    setSigned(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">Signature numérique</h2>
        <p className="text-sm text-[#6B6B6B]">Apposez votre signature dans le cadre ci-dessous pour valider votre dossier</p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-[#1A1A1A] text-sm">Zone de signature</span>
          </div>
          {(hasSignature || signed) && (
            <button onClick={clear} className="flex items-center gap-1 text-xs text-[#9B9B9B] hover:text-red-500 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Effacer
            </button>
          )}
        </div>

        <div className={`relative rounded-xl border-2 transition-all overflow-hidden ${signed ? 'border-green-400 bg-green-50' : 'border-dashed border-[#D1D5DB] bg-[#FAFAFA]'}`}>
          {!hasSignature && !signed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <PenLine className="w-8 h-8 text-[#D1D5DB] mb-2" />
              <p className="text-sm text-[#C4C4C4]">Signez ici avec votre doigt ou souris</p>
            </div>
          )}
          <canvas
            ref={canvasRef} width={800} height={200}
            className="w-full cursor-crosshair touch-none" style={{ height: '180px' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
        </div>

        {signed ? (
          <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">Signature enregistrée</p>
              <p className="text-xs text-green-500 mt-0.5">Votre signature a été apposée avec succès</p>
            </div>
          </div>
        ) : (
          <Button onClick={confirm} disabled={!hasSignature} className="mt-4 w-full bg-[#1A1A1A] hover:bg-[#333] text-white disabled:opacity-40">
            Confirmer la signature
          </Button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700">
          <strong>Note légale :</strong> En apposant votre signature, vous certifiez que toutes les informations fournies sont exactes et complètes. Cette signature a valeur d'engagement légal.
        </p>
      </div>
    </div>
  );
}