import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, FileText, PenLine, RotateCcw, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const STATUT_MODELS = [
  { id: 'SARL', label: 'Statuts SARL', desc: 'Société à Responsabilité Limitée' },
  { id: 'EURL', label: 'Statuts EURL', desc: 'Entreprise Unipersonnelle à Responsabilité Limitée' },
  { id: 'SAS', label: 'Statuts SAS', desc: 'Société par Actions Simplifiée' },
  { id: 'SA', label: 'Statuts SA', desc: 'Société Anonyme' },
  { id: 'SASU', label: 'Statuts SASU', desc: 'Société par Actions Simplifiée Unipersonnelle' },
];

function getFormeLabel(forme) {
  const map = {
    SARL: 'Société à Responsabilité Limitée',
    EURL: 'Entreprise Unipersonnelle à Responsabilité Limitée',
    SAS: 'Société par Actions Simplifiée',
    SA: 'Société Anonyme',
    SASU: 'Société par Actions Simplifiée Unipersonnelle',
  };
  return map[forme] || forme;
}

function buildStatutsContent(forme, stepData) {
  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const partenaires = stepData?.partenaires?.partners || [];
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || '[NOM DE LA SOCIÉTÉ]';
  const capital = activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} FD` : '[CAPITAL]';
  const signerName = idData.prenom ? `${idData.prenom} ${idData.nom}`.trim() : '[NOM DU REPRÉSENTANT]';
  const adresse = idData.adresse || '[ADRESSE DU SIÈGE]';
  const today = new Date().toLocaleDateString('fr-FR');
  const formeLabel = getFormeLabel(forme);
  const isUnipersonnelle = ['EURL', 'SASU'].includes(forme);
  const nbParts = activite.capital_social ? Math.floor(Number(activite.capital_social) / 10000) : 100;

  const associesList = partenaires.length > 0
    ? partenaires.map((p, i) => {
        const name = p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : (p.raison_sociale || `[ASSOCIÉ ${i + 1}]`);
        const nni = p.nni || p.numero_identite || '[NNI]';
        const adresseP = p.adresse || '[ADRESSE]';
        const apport = p.apport ? `${Number(p.apport).toLocaleString()} FD` : '[APPORT]';
        const parts = p.part_percent ? Math.floor(nbParts * parseFloat(p.part_percent) / 100) : '[PARTS]';
        return { name, nni, adresse: adresseP, apport, parts, type: p.type, nationalite: p.nationalite || '[NATIONALITÉ]' };
      })
    : [{ name: signerName, nni: idData.nni || idData.numero_identite || '[NNI]', adresse, apport: capital, parts: nbParts, type: 'physique', nationalite: idData.nationalite || 'Djiboutienne' }];

  return {
    companyName, forme, formeLabel, capital, signerName, adresse, today,
    activite, idData, partenaires, associesList, nbParts,
    isUnipersonnelle,
    activiteDesc: activite.activite_description || '[DESCRIPTION DE L\'ACTIVITÉ]',
    secteur: activite.secteur_principal || '[SECTEUR]',
  };
}

function generateStatutsDocument(forme, stepData, signatures) {
  const d = buildStatutsContent(forme, stepData);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  let y = 20;

  const addText = (text, opts = {}) => {
    const fontSize = opts.size || 10;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', opts.bold ? 'bold' : (opts.italic ? 'italic' : 'normal'));
    doc.setTextColor(opts.color || 0, 0, 0);
    const maxW = opts.maxW || (pageW - margin * 2);
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach(line => {
      if (y > 272) { doc.addPage(); y = 20; }
      doc.text(line, opts.center ? pageW / 2 : margin, y, opts.center ? { align: 'center' } : {});
      y += fontSize * 0.42;
    });
    y += opts.after !== undefined ? opts.after : 3;
  };

  const sectionTitle = (title) => {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFillColor(26, 43, 107);
    doc.rect(margin, y - 1, pageW - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  // Title page header
  doc.setFillColor(26, 43, 107);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUTS DE LA ${d.forme}`, pageW / 2, 11, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`« ${d.companyName} »`, pageW / 2, 19, { align: 'center' });
  y = 32;

  doc.setTextColor(0, 0, 0);
  addText(`République de Djibouti — ${d.formeLabel}`, { size: 8, center: true, italic: true, after: 6 });

  // ENTRE LES SOUSSIGNÉS
  sectionTitle('ENTRE LES SOUSSIGNÉS :');
  d.associesList.forEach((a, i) => {
    addText(`${i + 1}. ${a.name}, NNI/ID : ${a.nni}, Nationalité : ${a.nationalite}`, { size: 9, after: 1 });
    addText(`   Adresse : ${a.adresse}`, { size: 9, after: 3 });
  });
  addText(`Il a été convenu et arrêté ce qui suit :`, { size: 9, italic: true, after: 5 });

  // ARTICLE 1
  sectionTitle('ARTICLE 1 – FORME');
  addText(`Il est constitué entre les associés propriétaires des parts sociales ci-après créées, et ceux qui pourraient l'être ultérieurement, une ${d.formeLabel} (${d.forme}) régie par les présents statuts, ainsi que par les dispositions légales en vigueur en République de Djibouti et notamment la loi n° 165/AN/08/5ème L portant Code de Commerce.`, { size: 9, after: 5 });

  // ARTICLE 2
  sectionTitle('ARTICLE 2 – OBJET SOCIAL');
  addText(`La société a pour objet, en tous pays et principalement en République de Djibouti :`, { size: 9, after: 2 });
  addText(`${d.activiteDesc}`, { size: 9, after: 2 });
  addText(`Secteur : ${d.secteur}`, { size: 9, after: 2 });
  addText(`Et plus généralement, toutes opérations commerciales, industrielles, financières, civiles, mobilières ou immobilières pouvant se rattacher directement ou indirectement aux objets ci-dessus ou susceptibles d'en faciliter l'extension ou le développement.`, { size: 9, after: 5 });

  // ARTICLE 3
  sectionTitle('ARTICLE 3 – DÉNOMINATION SOCIALE');
  addText(`La société est dénommée : « ${d.companyName} » ${d.forme}`, { size: 9, after: 2 });
  addText(`Dans tous les actes, factures, annonces, publications et documents émanant de la société, la dénomination sociale doit toujours être précédée ou suivie immédiatement des mots « ${d.forme} » et de l'énonciation du capital social.`, { size: 9, after: 5 });

  // ARTICLE 4
  sectionTitle('ARTICLE 4 – SIÈGE SOCIAL');
  addText(`Le siège social est fixé à : ${d.adresse}, République de Djibouti.`, { size: 9, after: 2 });
  addText(`Il pourra être transféré en tout autre endroit de la République de Djibouti sur simple décision de la gérance.`, { size: 9, after: 5 });

  // ARTICLE 5
  sectionTitle('ARTICLE 5 – DURÉE');
  addText(`La durée de la société est fixée à QUATRE-VINGT-DIX-NEUF (99) ANS à compter de la date de son immatriculation au Registre du Commerce et des Sociétés, sauf dissolution anticipée ou prorogation.`, { size: 9, after: 5 });

  // ARTICLE 6
  sectionTitle('ARTICLE 6 – APPORTS ET CAPITAL SOCIAL');
  addText(`Le capital social est fixé à la somme de ${d.capital}, divisé en ${d.nbParts} parts sociales de 10 000 FD chacune, entièrement libérées et souscrites comme suit :`, { size: 9, after: 3 });
  d.associesList.forEach(a => {
    addText(`• ${a.name} : ${a.parts} parts sociales pour un apport de ${a.apport}`, { size: 9, after: 2 });
  });
  addText(`TOTAL : ${d.capital} représentant ${d.nbParts} parts sociales`, { size: 9, bold: true, after: 5 });

  // ARTICLE 7
  sectionTitle('ARTICLE 7 – PARTS SOCIALES');
  addText(`Les parts sociales sont nominatives. Elles ne peuvent être cédées à des tiers étrangers à la société qu'avec le consentement ${d.isUnipersonnelle ? "de l'associé unique" : "de la majorité des associés représentant au moins les trois quarts des parts sociales"}.`, { size: 9, after: 5 });

  // ARTICLE 8
  sectionTitle('ARTICLE 8 – GÉRANCE');
  if (['SARL', 'EURL'].includes(d.forme)) {
    addText(`La société est gérée et administrée par un ou plusieurs gérants, personnes physiques, associés ou non, nommés par ${d.isUnipersonnelle ? "l'associé unique" : "les associés"} à la majorité en nombre et en capital.`, { size: 9, after: 2 });
    addText(`Le premier gérant est Monsieur/Madame ${d.signerName}, désigné par les présents statuts pour une durée illimitée.`, { size: 9, after: 5 });
  } else if (['SAS', 'SASU'].includes(d.forme)) {
    addText(`La société est présidée par ${d.signerName}, Président de la SAS, nommé par les présents statuts pour une durée illimitée, et révocable à tout moment par décision collective des associés.`, { size: 9, after: 5 });
  } else {
    addText(`La société est administrée par un Conseil d'Administration composé de trois (3) membres au moins et de dix-huit (18) membres au plus, nommés par l'Assemblée Générale Ordinaire.`, { size: 9, after: 5 });
  }

  // ARTICLE 9
  sectionTitle('ARTICLE 9 – DÉCISIONS COLLECTIVES');
  if (d.isUnipersonnelle) {
    addText(`L'associé unique exerce les pouvoirs normalement dévolus aux assemblées. Les décisions sont portées sur un registre.`, { size: 9, after: 5 });
  } else {
    addText(`Les décisions collectives sont prises en assemblée générale ou par consultation écrite. Les décisions ordinaires sont prises à la majorité des parts sociales. Les décisions extraordinaires (modification des statuts) requièrent au moins les 3/4 des parts.`, { size: 9, after: 5 });
  }

  // ARTICLE 10
  sectionTitle('ARTICLE 10 – EXERCICE SOCIAL');
  addText(`L'exercice social commence le 1er janvier et se termine le 31 décembre de chaque année. Le premier exercice commence à la date d'immatriculation de la société et se termine le 31 décembre de la même année.`, { size: 9, after: 5 });

  // ARTICLE 11
  sectionTitle('ARTICLE 11 – RÉSULTATS ET DISTRIBUTION');
  addText(`Les produits nets de l'exercice, déduction faite des frais généraux et autres charges de la société, y compris tous amortissements et provisions, constituent les bénéfices nets.`, { size: 9, after: 2 });
  addText(`Sur ces bénéfices, il est prélevé 5% au minimum pour constituer la réserve légale jusqu'à ce que celle-ci atteigne 10% du capital social. Le solde est distribué aux associés proportionnellement à leurs parts.`, { size: 9, after: 5 });

  // ARTICLE 12
  sectionTitle('ARTICLE 12 – DISSOLUTION ET LIQUIDATION');
  addText(`La société prend fin à l'expiration du terme fixé ou par décision anticipée des associés statuant dans les conditions requises pour la modification des statuts. La liquidation est effectuée par le gérant ou tout liquidateur désigné par les associés.`, { size: 9, after: 5 });

  // ARTICLE 13
  sectionTitle('ARTICLE 13 – LITIGES ET ATTRIBUTION DE COMPÉTENCE');
  addText(`Pour l'exécution des présentes, les parties font élection de domicile en leurs demeures respectives indiquées ci-dessus. Tout litige relatif à la société sera de la compétence exclusive des Tribunaux de Djibouti.`, { size: 9, after: 5 });

  // SIGNATURES
  if (y > 230) { doc.addPage(); y = 20; }
  sectionTitle('SIGNATURES DES ASSOCIÉS');
  addText(`Fait à Djibouti, le ${d.today}`, { size: 9, after: 6 });

  d.associesList.forEach((a, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${a.name}`, margin, y);
    y += 5;
    // Signature box
    doc.rect(margin, y, 60, 22);
    if (signatures && signatures[i]) {
      try { doc.addImage(signatures[i], 'PNG', margin + 1, y + 1, 58, 20); } catch {}
    } else {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Signature', margin + 22, y + 12);
      doc.setTextColor(0, 0, 0);
    }
    y += 28;
  });

  return doc;
}

export default function StatutsGenerator({ stepData, onComplete }) {
  const [selectedModel, setSelectedModel] = useState(null);
  const [step, setStep] = useState('choose'); // choose | preview | sign | done
  const [previewContent, setPreviewContent] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [signatures, setSignatures] = useState({});
  const [currentSigner, setCurrentSigner] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const partenaires = stepData?.partenaires?.partners || [];
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || 'Société';

  const signers = partenaires.length > 0
    ? partenaires.map((p, i) => p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : (p.raison_sociale || `Partenaire ${i + 1}`))
    : [idData.prenom ? `${idData.prenom} ${idData.nom}`.trim() : 'Représentant légal'];

  const handleGenerate = async () => {
    if (!selectedModel) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 500));
    const content = buildStatutsContent(selectedModel, stepData);
    setPreviewContent(content);
    setGenerating(false);
    setStep('preview');
  };

  const startSign = () => {
    setCurrentSigner(0);
    setHasDrawn(false);
    setStep('sign');
    setTimeout(() => initCanvas(), 100);
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

  const clearCanvas = () => {
    initCanvas(); setHasDrawn(false);
  };

  const confirmSignature = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const newSigs = { ...signatures, [currentSigner]: dataUrl };
    setSignatures(newSigs);

    if (currentSigner < signers.length - 1) {
      setCurrentSigner(currentSigner + 1);
      setHasDrawn(false);
      setTimeout(() => initCanvas(), 100);
    } else {
      // All signed — generate final PDF
      const doc = generateStatutsDocument(selectedModel, stepData, newSigs);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      onComplete({ statuts_signed: true, statuts_mode: 'online', model: selectedModel, statuts_pdf_url: url, signatures: newSigs });
      setStep('done');
      toast.success('Statuts signés avec succès !');
    }
  };

  const downloadPDF = () => {
    generateStatutsDocument(selectedModel, stepData, signatures).save(`Statuts_${selectedModel}_${companyName.replace(/\s+/g, '_')}.pdf`);
  };

  if (step === 'done') {
    return (
      <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
        <p className="font-semibold text-green-700">Statuts {selectedModel} signés électroniquement ✓</p>
        <p className="text-xs text-green-600">Toutes les signatures ont été recueillies. Document prêt.</p>
        <Button size="sm" variant="outline" onClick={downloadPDF} className="flex items-center gap-2 mx-auto">
          <Download className="w-4 h-4" /> Télécharger PDF
        </Button>
      </div>
    );
  }

  if (step === 'sign') {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">Signature {currentSigner + 1} / {signers.length} : <strong>{signers[currentSigner]}</strong></p>
            <p className="text-xs text-[#6B6B6B]">Statuts {selectedModel} — {companyName}</p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="bg-[#1A2B6B] text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2"><PenLine className="w-4 h-4" /><span className="text-sm">Signez ici</span></div>
            {hasDrawn && <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-blue-200"><RotateCcw className="w-3 h-3" /> Effacer</button>}
          </div>
          {!hasDrawn && (
            <div className="absolute pointer-events-none flex items-center justify-center w-full" style={{ marginTop: '40px', height: '120px' }}>
              <p className="text-xs text-[#C4C4C4]">Signez avec votre doigt ou souris</p>
            </div>
          )}
          <canvas ref={canvasRef} width={700} height={140}
            className="w-full cursor-crosshair touch-none bg-[#FAFAFA]" style={{ height: '140px' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
        </div>

        <Button onClick={confirmSignature} disabled={!hasDrawn}
          className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white disabled:opacity-40">
          {currentSigner < signers.length - 1 ? `Confirmer — Signataire suivant →` : 'Confirmer et Finaliser les statuts'}
        </Button>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-semibold text-sm">Statuts {selectedModel} pré-remplis avec vos données</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Société', previewContent?.companyName],
              ['Forme juridique', previewContent?.forme],
              ['Capital social', previewContent?.capital],
              ['Siège social', previewContent?.adresse],
              ['Activité', previewContent?.secteur],
              ['Associés', String(previewContent?.associesList?.length || 0)],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#F9F9F9] rounded p-2">
                <p className="text-[#9B9B9B]">{k}</p>
                <p className="font-medium text-[#1A1A1A] truncate">{v || '—'}</p>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[#F0F0F0]">
            <p className="text-xs text-[#6B6B6B] mb-1">Signataires requis ({signers.length}) :</p>
            {signers.map((s, i) => <p key={i} className="text-xs font-medium text-[#1A1A1A]">• {s}</p>)}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">← Changer modèle</Button>
          <Button onClick={startSign} className="flex-1 bg-[#1A2B6B] text-white">
            <PenLine className="w-4 h-4 mr-2" /> Signer électroniquement
          </Button>
        </div>
      </div>
    );
  }

  // Choose model
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B6B6B]">Sélectionnez le modèle de statuts correspondant à votre forme juridique :</p>
      <div className="grid grid-cols-1 gap-2">
        {STATUT_MODELS.map(m => (
          <button key={m.id} type="button" onClick={() => setSelectedModel(m.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedModel === m.id ? 'border-[#1A2B6B] bg-blue-50' : 'border-[#E5E7EB] hover:border-[#C4C4C4]'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${selectedModel === m.id ? 'bg-[#1A2B6B] text-white' : 'bg-[#F5F5F5] text-[#6B6B6B]'}`}>{m.id}</div>
            <div>
              <p className="font-medium text-sm text-[#1A1A1A]">{m.label}</p>
              <p className="text-xs text-[#9B9B9B]">{m.desc}</p>
            </div>
            {selectedModel === m.id && <CheckCircle2 className="w-4 h-4 text-[#1A2B6B] ml-auto" />}
          </button>
        ))}
      </div>
      <Button onClick={handleGenerate} disabled={!selectedModel || generating}
        className="w-full bg-[#1A2B6B] text-white disabled:opacity-40">
        {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Génération...</> : <><FileText className="w-4 h-4 mr-2" /> Générer et pré-remplir les statuts</>}
      </Button>
    </div>
  );
}