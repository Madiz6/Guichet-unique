import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, FileText, PenLine, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const FORMULAIRE_MODELS = [
  { id: 'morale', label: 'Formulaire Unique — Personne Morale', desc: 'Pour les sociétés (SARL, SA, SAS, EURL, SASU)' },
  { id: 'physique', label: 'Formulaire Unique — Personne Physique', desc: 'Pour les entrepreneurs individuels' },
];

function buildFormulaireData(model, stepData) {
  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const notaire = stepData?.identification?.notaire || {};
  const repType = stepData?.identification?.rep_type || 'physique';
  const employes = stepData?.employes?.employees || [];
  const partenaires = stepData?.partenaires?.partners || [];
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || '[NOM DE LA SOCIÉTÉ]';
  const signerName = repType === 'notaire' ? notaire.nom : (idData.prenom ? `${idData.prenom} ${idData.nom}`.trim() : '[NOM]');
  const capital = activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} FD` : '[CAPITAL]';

  return { activite, idData, notaire, repType, employes, partenaires, companyName, signerName, capital };
}

function generateFormulairePDF(model, stepData, signatureData) {
  const d = buildFormulaireData(model, stepData);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 15;
  const today = new Date().toLocaleDateString('fr-FR');

  const field = (label, value, x, w, fy, lineH = 10) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ' :', x, fy);
    doc.setFont('helvetica', 'normal');
    const val = value || '';
    const lines = doc.splitTextToSize(val, w - 2);
    doc.text(lines[0] || '___________________', x, fy + 4);
    doc.line(x, fy + 5, x + w, fy + 5);
  };

  const sectionHeader = (title) => {
    if (y > 255) { doc.addPage(); y = 15; }
    doc.setFillColor(26, 43, 107);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 11;
  };

  // HEADER
  doc.setFillColor(26, 43, 107);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const title = model === 'morale'
    ? 'FORMULAIRE UNIQUE PERSONNE MORALE'
    : 'FORMULAIRE UNIQUE PERSONNE PHYSIQUE';
  doc.text(title, pageW / 2, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Guichet Unique de l\'Agence Nationale pour la Promotion des Investissements (ANPI)', pageW / 2, 17, { align: 'center' });
  doc.text('République de Djibouti', pageW / 2, 22, { align: 'center' });
  y = 30;

  // Cadre réservé admin
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 244, 255);
  doc.rect(margin, y, pageW - margin * 2, 22, 'F');
  doc.setDrawColor(26, 43, 107);
  doc.rect(margin, y, pageW - margin * 2, 22);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Cadre réservé à l\'administration', margin + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Dossier N° : _____________   Reçu le : _____________   N° Guichet Unique : _____________', margin + 2, y + 11);
  doc.text('N° RCS : _____________   NIF : _____________   N° CNSS : _____________   Cachet : ', margin + 2, y + 17);
  y += 28;
  doc.setDrawColor(0, 0, 0);

  // SECTION I
  sectionHeader(`I. IDENTIFICATION DE LA ${model === 'morale' ? 'PERSONNE MORALE' : 'PERSONNE PHYSIQUE'}`);

  if (model === 'morale') {
    field('Dénomination sociale', d.companyName, margin, 80, y);
    field('Forme juridique', d.activite.forme_juridique, margin + 85, 55, y);
    y += 12;
    field('Capital social', d.capital, margin, 50, y);
    field('Nombre d\'associés', String(d.partenaires.length || 1), margin + 55, 35, y);
    field('Nombre de salariés', String(d.employes.length), margin + 95, 35, y);
    y += 12;
    field('Nom commercial', d.activite.commercial_names?.[0] || d.companyName, margin, 80, y);
    field('Nationalité', d.idData.nationalite || '', margin + 85, 55, y);
    y += 12;
    field('Adresse du siège social', d.idData.adresse || '', margin, 130, y);
    y += 12;
    field('Téléphone', d.idData.telephone || '', margin, 50, y);
    field('Email', d.idData.email || '', margin + 55, 80, y);
    y += 14;
  } else {
    // Personne Physique — Section I
    field('Nom & prénom', `${d.idData.prenom || ''} ${d.idData.nom || ''}`.trim(), margin, 80, y);
    field('Sexe', d.idData.sexe || '', margin + 85, 30, y);
    field('Nombre de salariés', String(d.employes.length), margin + 120, 35, y);
    y += 12;
    field('N° CIN ou carte de séjour', d.idData.numero_identite || '', margin, 60, y);
    field('Nationalité', d.idData.nationalite || '', margin + 65, 60, y);
    y += 12;
    field('Date de naissance', d.idData.date_naissance || '', margin, 60, y);
    field('Lieu de naissance', d.idData.lieu_naissance || '', margin + 65, 90, y);
    y += 12;
    field('Nom Commercial / enseigne', d.activite.commercial_names?.[0] || d.companyName, margin, 80, y);
    field('Domicile personnel', d.idData.adresse || '', margin + 85, 70, y);
    y += 12;
    field('Adresse de l\'ETS / Siège social', d.idData.adresse || '', margin, 130, y);
    y += 12;
    field('Tél. fixe', d.idData.telephone || '', margin, 45, y);
    field('Tél. mobile', d.idData.telephone || '', margin + 50, 45, y);
    field('Mail', d.idData.email || '', margin + 100, 55, y);
    y += 14;
  }

  // SECTION II — MANDATAIRE (for physique) or REPRÉSENTANT LÉGAL (for morale)
  sectionHeader(model === 'physique' ? 'II. IDENTIFICATION DU MANDATAIRE' : 'II. IDENTIFICATION DU REPRÉSENTANT LÉGAL');
  if (d.repType === 'notaire') {
    field('Nom et Prénom / Dénomination sociale', d.notaire.nom, margin, 80, y);
    field('Mail', d.notaire.email || '', margin + 85, 60, y);
    y += 12;
    field('N° CIN / RCS', d.notaire.rcs || '', margin, 60, y);
    field('Fax', '', margin + 65, 40, y);
    y += 12;
    field('Adresse / Siège social', d.notaire.adresse || '', margin, 80, y);
    field('Tél.', d.notaire.telephone || '', margin + 85, 60, y);
  } else {
    field('Nom et Prénom / Dénomination sociale', `${d.idData.prenom || ''} ${d.idData.nom || ''}`.trim(), margin, 80, y);
    field('Mail', d.idData.email || '', margin + 85, 60, y);
    y += 12;
    field('N° CIN / RCS', d.idData.numero_identite || '', margin, 60, y);
    field('Fax', '', margin + 65, 40, y);
    y += 12;
    field('Adresse / Siège social', d.idData.adresse || '', margin, 80, y);
    field('Tél.', d.idData.telephone || '', margin + 85, 60, y);
  }
  y += 14;

  // SECTION III – ACTIVITÉ
  sectionHeader('III. DÉCLARATION RELATIVE À L\'ACTIVITÉ');
  field('Activité principale (Raison sociale)', d.activite.secteur_principal || '', margin, 85, y);
  field('Activité secondaire', (d.activite.activites_secondaires || []).join(', '), margin + 90, 65, y);
  y += 14;

  // SECTION IV – MANDATAIRE ET COMMISSAIRE AUX COMPTES
  if (model === 'morale') {
    if (y > 230) { doc.addPage(); y = 15; }
    sectionHeader('IV. IDENTIFICATION DU MANDATAIRE ET/OU COMMISSAIRE AUX COMPTES');
    // Table header
    doc.setFillColor(220, 230, 255);
    doc.rect(margin, y, pageW - margin * 2, 6, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    const mcols = [margin + 1, margin + 42, margin + 68, margin + 100, margin + 120, margin + 137];
    ['Nom & Prénom / Dénomination', 'N° CIN / RCS', 'Adresse / Siège social', 'Tél.', 'Fax', 'Email'].forEach((h, ci) => doc.text(h, mcols[ci], y + 4));
    y += 8;
    // Mandataire row
    const mandat = d.repType === 'notaire' ? d.notaire : null;
    const mandatVals = [
      mandat ? (mandat.nom || '') : (d.signerName || ''),
      mandat ? (mandat.rcs || '') : (d.idData.numero_identite || ''),
      mandat ? (mandat.adresse || '') : (d.idData.adresse || ''),
      mandat ? (mandat.telephone || '') : (d.idData.telephone || ''),
      '',
      mandat ? (mandat.email || '') : (d.idData.email || ''),
    ];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.text('Mandataire', margin + 1, y + 2);
    mandatVals.forEach((v, ci) => doc.text((v || '').substring(0, ci === 0 ? 20 : 14), mcols[ci], y + 6));
    doc.line(margin, y + 8, pageW - margin, y + 8);
    y += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.text('Commissaire aux comptes', margin + 1, y + 2);
    [margin + 42, margin + 68, margin + 100, margin + 120, margin + 137].forEach(x => doc.text('___________', x, y + 6));
    doc.line(margin, y + 8, pageW - margin, y + 8);
    y += 14;
  }

  // SECTION V – SALARIÉS
  if (d.employes.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    sectionHeader(`${model === 'morale' ? 'V' : 'IV'}. DÉCLARATION DES SALARIÉS`);
    doc.setFillColor(220, 230, 255);
    doc.rect(margin, y, pageW - margin * 2, 6, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    const cols = [margin, margin + 38, margin + 63, margin + 90, margin + 118, margin + 148];
    ['Nom & Prénom', 'Matricule CNSS', 'Nom mère', 'Salaire brut (FD)', 'Poste', 'Date emb.'].forEach((h, ci) => {
      doc.text(h, cols[ci] + 1, y + 4);
    });
    y += 8;
    d.employes.forEach(emp => {
      if (y > 265) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const vals = [
        `${emp.prenom || ''} ${emp.nom || ''}`.trim().substring(0, 16),
        (emp.matricule_cnss || '').substring(0, 12),
        (emp.nom_mere || '').substring(0, 12),
        emp.salaire_base ? `${Number(emp.salaire_base).toLocaleString()}` : '',
        (emp.fonction || emp.emploi_occupe || '').substring(0, 14),
        emp.date_embauche || '',
      ];
      vals.forEach((v, ci) => doc.text(v, cols[ci] + 1, y + 4));
      doc.line(margin, y + 6, pageW - margin, y + 6);
      y += 8;
    });
    y += 4;
  }

  // SIGNATURE
  if (y > 230) { doc.addPage(); y = 15; }
  sectionHeader(`${model === 'morale' ? 'VI' : 'V'}. DÉCLARATION ET SIGNATURE`);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Je soussigné(e) certifie l\'exactitude des renseignements portés sur le présent formulaire.', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Fait à Djibouti, le ${today}`, margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature du déclarant :', margin, y);
  y += 4;
  doc.rect(margin, y, 65, 25);
  if (signatureData) {
    try { doc.addImage(signatureData, 'PNG', margin + 1, y + 1, 63, 23); } catch {}
  } else {
    doc.setFontSize(7); doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Signature', margin + 22, y + 14);
    doc.setTextColor(0, 0, 0);
  }
  y += 32;

  // FOOTER
  doc.setFillColor(26, 43, 107);
  doc.rect(0, 287, pageW, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('Tél. (253) 21 33 34 00  |  Boulevard de la République — Guichet Unique ANPI Djibouti', pageW / 2, 293, { align: 'center' });

  return doc;
}

export default function FormulaireGenerator({ stepData, onComplete }) {
  const [selectedModel, setSelectedModel] = useState(null);
  const [step, setStep] = useState('choose');
  const [previewData, setPreviewData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [signature, setSignature] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || 'Société';

  const handleGenerate = async () => {
    if (!selectedModel) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 400));
    setPreviewData(buildFormulaireData(selectedModel, stepData));
    setGenerating(false);
    setStep('preview');
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1A2B6B';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setDrawing(true); setHasDrawn(true);
  };
  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };
  const stopDraw = (e) => { e.preventDefault(); setDrawing(false); };

  const clearCanvas = () => { initCanvas(); setHasDrawn(false); };

  const confirmSign = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSignature(dataUrl);
    const pdfDoc = generateFormulairePDF(selectedModel, stepData, dataUrl);
    const blob = pdfDoc.output('blob');
    const url = URL.createObjectURL(blob);
    onComplete({ formulaire_signed: true, formulaire_mode: 'online', model: selectedModel, formulaire_pdf_url: url, signature: dataUrl });
    setStep('done');
    toast.success('Formulaire signé avec succès !');
  };

  const downloadPDF = () => {
    generateFormulairePDF(selectedModel, stepData, signature).save(`Formulaire_${selectedModel}_${companyName.replace(/\s+/g, '_')}.pdf`);
  };

  if (step === 'done') {
    return (
      <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
        <p className="font-semibold text-green-700">Formulaire unique signé électroniquement ✓</p>
        <Button size="sm" variant="outline" onClick={downloadPDF} className="flex items-center gap-2 mx-auto">
          <Download className="w-4 h-4" /> Télécharger PDF
        </Button>
      </div>
    );
  }

  if (step === 'sign') {
    const signerName = previewData?.signerName || 'Représentant légal';
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-medium text-[#1A1A1A]">Signature du représentant légal : <strong>{signerName}</strong></p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="bg-[#1A2B6B] text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2"><PenLine className="w-4 h-4" /><span className="text-sm">Signez ici</span></div>
            {hasDrawn && <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-blue-200"><RotateCcw className="w-3 h-3" /> Effacer</button>}
          </div>
          <canvas ref={canvasRef} width={700} height={140}
            className="w-full cursor-crosshair touch-none bg-[#FAFAFA]" style={{ height: '140px' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('preview')} className="flex-1">← Retour</Button>
          <Button onClick={confirmSign} disabled={!hasDrawn} className="flex-1 bg-[#1A2B6B] text-white disabled:opacity-40">
            Confirmer et générer le formulaire
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-semibold text-sm">Formulaire pré-rempli avec vos données</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Modèle', selectedModel === 'morale' ? 'Personne Morale' : 'Personne Physique'],
              ['Société', previewData?.companyName],
              ['Représentant', previewData?.signerName],
              ['Capital', previewData?.capital],
              ['Employés', String(previewData?.employes?.length || 0)],
              ['Associés', String(previewData?.partenaires?.length || 0)],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#F9F9F9] rounded p-2">
                <p className="text-[#9B9B9B]">{k}</p>
                <p className="font-medium text-[#1A1A1A] truncate">{v || '—'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">← Changer modèle</Button>
          <Button onClick={() => { setStep('sign'); setTimeout(initCanvas, 100); }} className="flex-1 bg-[#1A2B6B] text-white">
            <PenLine className="w-4 h-4 mr-2" /> Signer électroniquement
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B6B6B]">Sélectionnez le modèle correspondant à votre situation :</p>
      <div className="space-y-2">
        {FORMULAIRE_MODELS.map(m => (
          <button key={m.id} type="button" onClick={() => setSelectedModel(m.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${selectedModel === m.id ? 'border-[#1A2B6B] bg-blue-50' : 'border-[#E5E7EB] hover:border-[#C4C4C4]'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedModel === m.id ? 'bg-[#1A2B6B] text-white' : 'bg-[#F5F5F5] text-[#6B6B6B]'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-[#1A1A1A]">{m.label}</p>
              <p className="text-xs text-[#9B9B9B]">{m.desc}</p>
            </div>
            {selectedModel === m.id && <CheckCircle2 className="w-4 h-4 text-[#1A2B6B]" />}
          </button>
        ))}
      </div>
      <Button onClick={handleGenerate} disabled={!selectedModel || generating}
        className="w-full bg-[#1A2B6B] text-white disabled:opacity-40">
        {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Génération...</> : <><FileText className="w-4 h-4 mr-2" /> Générer et pré-remplir le formulaire</>}
      </Button>
    </div>
  );
}