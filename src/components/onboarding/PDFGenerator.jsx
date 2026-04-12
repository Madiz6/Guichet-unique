import { jsPDF } from 'jspdf';

export function generateFormulairePDF(stepData, envelopeId) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  let y = 15;

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const notaire = stepData?.identification?.notaire || {};
  const repType = stepData?.identification?.rep_type || 'physique';
  const employes = stepData?.employes?.employees || [];
  const partenaires = stepData?.partenaires?.partners || [];
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || '';
  const signerName = repType === 'notaire' ? notaire.nom : (idData.prenom ? `${idData.prenom} ${idData.nom}` : '');
  const today = new Date().toLocaleDateString('fr-FR');

  // Header
  doc.setFillColor(26, 43, 107);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMULAIRE UNIQUE POUR LA CRÉATION D\'ENTREPRISE', pageW / 2, 9, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('EN RÉPUBLIQUE DE DJIBOUTI — Guichet Unique ANPI', pageW / 2, 15, { align: 'center' });
  doc.text(`Envelope ID: ${envelopeId}`, pageW / 2, 20, { align: 'center' });
  y = 28;

  // Admin box
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 244, 255);
  doc.rect(margin, y, pageW - margin * 2, 20, 'F');
  doc.setDrawColor(26, 43, 107);
  doc.rect(margin, y, pageW - margin * 2, 20);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Cadre réservé à l\'administration', margin + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dossier N°: ___________   Reçu le: ___________   N° Guichet Unique: ___________`, margin + 2, y + 10);
  doc.text(`N° RCS: ___________   NIF: ___________   N° CIN: ___________   N° CNSS: ___________`, margin + 2, y + 15);
  y += 26;

  const sectionHeader = (title) => {
    doc.setFillColor(26, 43, 107);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const field = (label, value, x, w, fY) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', x, fY);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '_______________', x + 2, fY + 4);
    doc.line(x, fY + 5, x + w, fY + 5);
  };

  // I. DISPOSITIONS GÉNÉRALES
  sectionHeader('I. DISPOSITIONS GÉNÉRALES');
  const isPersonneMorale = ['SARL', 'SA', 'SAS', 'EURL'].includes(activite.forme_juridique);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`☑ ${isPersonneMorale ? 'Personne Morale' : 'Personne Physique'}`, margin + 2, y);
  y += 6;
  field('Dénomination sociale', companyName, margin, 80, y);
  field('Forme juridique', activite.forme_juridique, margin + 85, 50, y);
  y += 10;
  field('Capital social', activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} FD` : '', margin, 50, y);
  field('Nombre de salariés', String(employes.length), margin + 55, 40, y);
  field('Nombre d\'associés', String(partenaires.length), margin + 100, 40, y);
  y += 10;
  field('Nom Commercial', activite.commercial_names?.[0] || companyName, margin, 80, y);
  field('Nationalité', idData.nationalite || '', margin + 85, 50, y);
  y += 10;
  field('Adresse du siège social', idData.adresse || '', margin, 120, y);
  y += 10;
  field('Tél.', idData.telephone || '', margin, 50, y);
  field('Mail', idData.email || '', margin + 55, 80, y);
  y += 12;

  // II. IDENTIFICATION DU REPRÉSENTANT
  sectionHeader('II. IDENTIFICATION DU REPRÉSENTANT DE LA PERSONNE MORALE');
  if (repType === 'notaire') {
    field('Nom et prénom', notaire.nom, margin, 80, y);
    field('N° CIN / RCS', notaire.rcs, margin + 85, 50, y);
    y += 10;
    field('Nationalité', '', margin, 50, y);
    field('Adresse', notaire.adresse, margin + 55, 90, y);
  } else {
    field('Nom et prénom', signerName, margin, 80, y);
    field('N° CIN', idData.numero_identite, margin + 85, 50, y);
    y += 10;
    field('Date de naissance', idData.date_naissance, margin, 50, y);
    field('Lieu de naissance', idData.lieu_naissance, margin + 55, 50, y);
    field('Nationalité', idData.nationalite, margin + 110, 45, y);
  }
  y += 14;

  // III. DÉCLARATION RELATIVE À L'ACTIVITÉ
  sectionHeader('III. DÉCLARATION RELATIVE À L\'ACTIVITÉ');
  field('Activité principale', activite.secteur_principal, margin, 80, y);
  field('Activité secondaire', (activite.activites_secondaires || []).join(', '), margin + 85, 80, y);
  y += 12;

  // IV. DÉCLARATION DES SALARIÉS
  if (employes.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    sectionHeader('IV. DÉCLARATION DES SALARIÉS');
    // Table header
    doc.setFillColor(220, 230, 255);
    doc.rect(margin, y, pageW - margin * 2, 6, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    const cols = [margin, margin + 40, margin + 65, margin + 95, margin + 120, margin + 145];
    ['Nom & Prénom', 'Matricule CNSS', 'Nom de la mère', 'Salaire brut', 'Emploi occupé', 'Date emb.'].forEach((h, ci) => {
      doc.text(h, cols[ci] + 1, y + 4);
    });
    y += 8;
    employes.forEach(emp => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const vals = [
        `${emp.prenom || ''} ${emp.nom || ''}`.trim(),
        emp.matricule_cnss || '',
        emp.nom_mere || '',
        emp.salaire_base ? `${Number(emp.salaire_base).toLocaleString()} FD` : '',
        emp.emploi_occupe || '',
        emp.date_embauche || '',
      ];
      vals.forEach((v, ci) => doc.text(v.substring(0, 15), cols[ci] + 1, y + 4));
      doc.line(margin, y + 6, pageW - margin, y + 6);
      y += 8;
      if (y > 265) { doc.addPage(); y = 15; }
    });
    y += 4;
  }

  // V. SIGNATURE
  if (y > 220) { doc.addPage(); y = 15; }
  sectionHeader('V. SIGNATURE');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature (Gérant/mandataire) :', margin, y + 5);
  doc.rect(pageW - margin - 60, y, 60, 25);
  if (stepData?.signature?.signature_data) {
    try {
      doc.addImage(stepData.signature.signature_data, 'PNG', pageW - margin - 58, y + 1, 56, 22);
    } catch {}
  }
  doc.text(`Fait à Djibouti, le ${today}`, margin, y + 20);
  y += 32;

  // Footer
  doc.setFillColor(26, 43, 107);
  doc.rect(0, 287, pageW, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('Tél. (253) 21 33 34 00  Boulevard de la République — Guichet Unique ANPI Djibouti', pageW / 2, 293, { align: 'center' });

  doc.save(`Formulaire_GUI_${companyName.replace(/\s+/g, '_')}_${envelopeId.substring(0, 8)}.pdf`);
}

export function generateStatutsPDF(stepData, envelopeId) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  let y = 20;

  const activite = stepData?.activite || {};
  const idData = stepData?.identification?.data || {};
  const partenaires = stepData?.partenaires?.partners || [];
  const companyName = activite.commercial_names?.[0] || activite.raison_sociale || '[NOM DE LA SOCIÉTÉ]';
  const forme = activite.forme_juridique || 'SARL';
  const capital = activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} FD` : '[CAPITAL]';
  const signerName = idData.prenom ? `${idData.prenom} ${idData.nom}` : '[NOM]';
  const today = new Date().toLocaleDateString('fr-FR');
  const envelopeShort = envelopeId.substring(0, 8);

  const addText = (text, opts = {}) => {
    const fontSize = opts.size || 10;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, opts.center ? pageW / 2 : margin, y, opts.center ? { align: 'center' } : {});
      y += fontSize * 0.45;
    });
    y += opts.after || 3;
  };

  // Title
  addText(`S.T.A.T.U.T.S DE LA ${forme} « ${companyName} »`, { bold: true, size: 12, center: true, after: 6 });
  addText(`Envelope ID: ${envelopeId}`, { size: 7, center: true, after: 8 });

  addText(`ARTICLE 1 – FORME`, { bold: true, size: 10, after: 2 });
  addText(`Il est formé par les présentes entre les soussignés une ${forme === 'SAS' ? 'Société par Actions Simplifiée' : forme === 'EURL' ? 'Entreprise Unipersonnelle à Responsabilité Limitée' : 'Société'} qui sera régie par les présents statuts et par les lois en vigueur en République de DJIBOUTI.`, { size: 9, after: 5 });

  addText(`ARTICLE 2 – OBJET`, { bold: true, size: 10, after: 2 });
  addText(`La société a pour objet en tous pays et principalement en République de Djibouti : ${activite.activite_description || '[DESCRIPTION DE L\'ACTIVITÉ]'}`, { size: 9, after: 5 });

  addText(`ARTICLE 3 – DÉNOMINATION`, { bold: true, size: 10, after: 2 });
  addText(`La dénomination de la société est « ${companyName} » ${forme}. Dans tous les documents de la société cette dénomination doit être précédée ou immédiatement suivie des mots « ${forme} » et de l'énonciation du montant du capital social.`, { size: 9, after: 5 });

  addText(`ARTICLE 4 – DURÉE`, { bold: true, size: 10, after: 2 });
  addText(`La durée de la société est fixée à 99 ANS à compter du jour de son immatriculation au Registre du Commerce sauf prorogation anticipée ou dissolution.`, { size: 9, after: 5 });

  addText(`ARTICLE 5 – SIÈGE SOCIAL`, { bold: true, size: 10, after: 2 });
  addText(`Le siège social de la société est fixé à DJIBOUTI — ${idData.adresse || 'Boulevard de la République, Djibouti'}, République de Djibouti.`, { size: 9, after: 5 });

  addText(`ARTICLE 6 – APPORTS`, { bold: true, size: 10, after: 2 });
  if (partenaires.length > 0) {
    partenaires.forEach(p => {
      const name = p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : (p.raison_sociale || '');
      const apport = p.apport ? `${Number(p.apport).toLocaleString()} FD` : '[MONTANT]';
      addText(`${name || '[NOM]'} apporte à la Société la somme de : ${apport}`, { size: 9, after: 2 });
    });
  } else {
    addText(`${signerName} apporte à la Société la somme de : ${capital}`, { size: 9, after: 2 });
  }
  addText(`Soit un apport total de : ${capital}`, { size: 9, bold: true, after: 5 });

  addText(`ARTICLE 7 – CAPITAL`, { bold: true, size: 10, after: 2 });
  addText(`Le capital de la société est fixé à la somme de ${capital}.`, { size: 9, after: 5 });

  if (y > 240) { doc.addPage(); y = 20; }

  // Signature section
  addText(`DONT ACTE, rédigé sur [${doc.internal.pages.length}] PAGES`, { bold: true, size: 10, after: 4 });
  addText(`Fait le ${today} à Djibouti en [2] exemplaires`, { size: 9, after: 6 });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${forme === 'EURL' ? 'L\'associé unique' : 'Le(s) associé(s)'}`, margin, y);
  doc.text('Monsieur/Madame', margin, y + 6);
  if (stepData?.signature?.signature_data) {
    try {
      doc.addImage(stepData.signature.signature_data, 'PNG', margin, y + 10, 50, 20);
    } catch {}
  }

  doc.save(`Statuts_${forme}_${companyName.replace(/\s+/g, '_')}_${envelopeShort}.pdf`);
}