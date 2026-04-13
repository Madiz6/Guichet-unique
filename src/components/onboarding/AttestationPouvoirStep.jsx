import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, PenLine, Shield, AlertTriangle, Scale } from 'lucide-react';

export default function AttestationPouvoirStep({ value, onChange, stepData }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signed, setSigned] = useState(!!(value?.signed));
  const [accepted, setAccepted] = useState(value?.accepted || false);

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const repType = stepData?.identification?.rep_type || 'physique';
  const notaire = stepData?.identification?.notaire || {};
  const partners = stepData?.partenaires?.partners || [];

  const signerName = repType === 'notaire'
    ? (notaire.nom || '_______________')
    : (idData.prenom ? `${idData.prenom} ${idData.nom}`.trim() : '_______________');
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || '_______________';
  const formeJuridique = activite.forme_juridique || '___';
  const capital = activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} DJF` : '_______________';
  const today = new Date().toLocaleDateString('fr-FR');
  const docNumber = idData.numero_identite || notaire.rcs || '_______________';
  const nni = idData.nni || '_______________';

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
    onChange({ ...value, signed: false, signature_data: null });
  };

  const confirm = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange({ ...value, signed: true, accepted: true, signature_data: dataUrl, signed_at: new Date().toISOString(), signed_by: signerName });
    setSigned(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Attestation de pouvoir et d'habilitation</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Document juridiquement contraignant — à lire attentivement avant de signer</p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700">AVERTISSEMENT LÉGAL IMPORTANT</p>
          <p className="text-xs text-red-600 mt-1 leading-relaxed">
            Cette déclaration engage votre responsabilité pénale conformément aux articles 193 à 202 du Code Pénal de la République de Djibouti relatifs aux faux et usages de faux. Toute déclaration mensongère est passible d'une peine d'emprisonnement pouvant aller jusqu'à 3 ans et d'une amende de 3 000 000 DJF.
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-[#1A2B6B] rounded-xl overflow-hidden">
        <div className="bg-[#1A2B6B] text-white px-6 py-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          <span className="font-semibold text-sm">ATTESTATION DE POUVOIR ET D'HABILITATION — GUICHET UNIQUE ANPI DJIBOUTI</span>
        </div>

        <div className="p-6 font-serif text-sm leading-relaxed space-y-4 text-[#1A1A1A]">
          <div className="text-center space-y-1">
            <p className="font-bold text-base uppercase">ATTESTATION SUR L'HONNEUR DE POUVOIR ET D'HABILITATION À CONSTITUER UNE SOCIÉTÉ</p>
            <p className="text-xs text-[#6B6B6B]">République de Djibouti — Ministère du Commerce et du Tourisme — ANPI</p>
          </div>

          <p>Je soussigné(e), <strong>{signerName}</strong>, porteur(euse) du document d'identité n° <strong>{docNumber}</strong> — NNI : <strong>{nni}</strong>, agissant en qualité de représentant(e) légal(e) et fondateur(trice) de la société en cours de constitution dénommée <strong>{companyName}</strong>, sous la forme juridique <strong>{formeJuridique}</strong>, au capital social de <strong>{capital}</strong>,</p>

          <p className="font-semibold">DÉCLARE SOLENNELLEMENT ET SUR L'HONNEUR :</p>

          <ol className="list-decimal list-inside space-y-3 pl-2">
            <li><strong>Capacité juridique :</strong> Que je dispose pleinement de la capacité juridique pour représenter, engager et constituer la société susmentionnée, et que je ne fais l'objet d'aucune interdiction légale, judiciaire ou administrative d'exercer une activité commerciale sur le territoire de la République de Djibouti ou dans tout autre pays.</li>
            <li><strong>Pouvoir et mandat :</strong> Que je suis dûment autorisé(e) par l'ensemble des associés, actionnaires et partenaires désignés dans le présent dossier à agir en leur nom et pour leur compte dans toutes les démarches relatives à la constitution, l'immatriculation et l'enregistrement de ladite société auprès des autorités compétentes djiboutiennes.</li>
            <li><strong>Authenticité des informations :</strong> Que toutes les informations, documents, pièces justificatives et données fournis dans le cadre du présent dossier d'enregistrement sont exacts, complets, sincères et authentiques. Je certifie que les documents d'identité présentés sont originaux, en cours de validité, et qu'aucune pièce n'a été falsifiée, altérée ou contrefaite.</li>
            <li><strong>Légitimité des apports :</strong> Que les capitaux, apports en numéraire ou en nature déclarés dans le présent dossier proviennent de sources licites, légales et traçables, conformément à la loi n° 133/AN/11/6ème L relative à la lutte contre le blanchiment de capitaux et le financement du terrorisme en République de Djibouti.</li>
            <li><strong>Consentement des partenaires :</strong> Que chacun des associés et actionnaires mentionnés dans ce dossier a donné son consentement libre, éclairé et exprès pour figurer en tant qu'associé(e), a pris connaissance des statuts et des engagements qui en découlent, et m'a expressément mandaté(e) pour les représenter lors de cette procédure d'enregistrement.</li>
            <li><strong>Absence de conflit d'intérêts :</strong> Que ni moi-même, ni aucun des associés désignés, ne sommes fonctionnaires publics en activité exerçant des fonctions incompatibles avec les activités déclarées, conformément aux dispositions légales applicables en République de Djibouti.</li>
            <li><strong>Responsabilité pénale :</strong> Je reconnais expressément que la présente déclaration engage ma pleine responsabilité pénale et civile. En cas de fausse déclaration, de falsification de documents ou de manœuvres frauduleuses, je m'expose aux sanctions prévues par les articles 193 à 202 du Code Pénal djiboutien, incluant des peines d'emprisonnement et des amendes substantielles, ainsi qu'à la nullité de plein droit de tous les actes accomplis sur la base de ces fausses déclarations.</li>
          </ol>

          {partners.length > 0 && (
            <div className="border border-[#E5E7EB] rounded-lg p-3 bg-[#FAFAFA]">
              <p className="text-xs font-semibold text-[#1A1A1A] mb-2">Partenaires représentés par la présente attestation :</p>
              {partners.map((p, i) => (
                <p key={i} className="text-xs text-[#4B5563]">
                  {i + 1}. {p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : p.raison_sociale || `Partenaire ${i + 1}`} — {p.part_percent || '—'}% des parts
                </p>
              ))}
            </div>
          )}

          <p>Fait à Djibouti, le <strong>{today}</strong></p>
          <p className="text-xs text-[#6B6B6B] italic">Le représentant légal déclare avoir lu et compris l'intégralité du présent document avant d'y apposer sa signature électronique.</p>

          <div className="border-2 border-dashed border-[#1A2B6B] rounded-xl p-4 bg-[#F0F4FF]">
            <p className="text-xs font-semibold text-[#1A2B6B] mb-1">Signature du représentant légal — {signerName}</p>
            {signed && value?.signature_data ? (
              <div className="space-y-2">
                <img src={value.signature_data} alt="signature" className="h-16 object-contain" />
                <div className="flex items-center gap-1.5 text-green-600 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Signé électroniquement le {today}</div>
              </div>
            ) : (
              <p className="text-xs text-[#9B9B9B]">[Zone de signature — voir ci-dessous]</p>
            )}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer p-4 border border-[#E5E7EB] rounded-xl hover:bg-[#FAFAFA] transition-colors">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1A1A1A] shrink-0" />
        <span className="text-sm text-[#1A1A1A] leading-relaxed">
          <strong>Je déclare avoir lu, compris et accepté</strong> l'intégralité de la présente attestation. Je confirme agir en connaissance de cause et en pleine conscience des responsabilités pénales et civiles qui en découlent.
        </span>
      </label>

      {accepted && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="bg-[#1A2B6B] text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2"><PenLine className="w-4 h-4" /><span className="text-sm font-medium">Apposez votre signature électronique</span></div>
            {hasSignature && <button onClick={clear} className="flex items-center gap-1 text-xs text-blue-200 hover:text-white"><RotateCcw className="w-3 h-3" /> Effacer</button>}
          </div>
          <div className="relative">
            {!hasSignature && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <PenLine className="w-7 h-7 text-[#D1D5DB] mb-1" />
                <p className="text-xs text-[#C4C4C4]">Signez ici avec votre doigt ou souris</p>
              </div>
            )}
            <canvas ref={canvasRef} width={800} height={180}
              className="w-full cursor-crosshair touch-none bg-[#FAFAFA]" style={{ height: '160px' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
          </div>
          <div className="px-4 py-2 bg-[#F9F9F9] border-t border-[#F0F0F0] text-xs text-[#6B6B6B]">
            {today} — {signerName}
          </div>
        </div>
      )}

      {accepted && (
        <Button onClick={confirm} disabled={!hasSignature || signed}
          className={`w-full h-12 text-base font-medium ${signed ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1A2B6B] hover:bg-[#0f1e4d]'} text-white disabled:opacity-40`}>
          {signed
            ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Attestation signée et validée</>
            : <><Shield className="w-4 h-4 mr-2" /> Je certifie et signe l'attestation</>}
        </Button>
      )}
    </div>
  );
}