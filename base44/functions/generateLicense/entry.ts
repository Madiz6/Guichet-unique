import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

function generateLicenseNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `ANPI-DJ-${year}-${rand}`;
}

function generateNIF() {
  const rand = Math.floor(Math.random() * 90000000) + 10000000;
  return `DJ${rand}`;
}

function generateRegistreNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `RC-DJ-${year}/${rand}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { dossier_id } = await req.json();
    if (!dossier_id) {
      return Response.json({ error: 'dossier_id requis' }, { status: 400 });
    }

    const dossiers = await base44.asServiceRole.entities.RegistrationDossier.filter({ id: dossier_id });
    const dossier = dossiers[0];
    if (!dossier) {
      return Response.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    const licenseNumber = generateLicenseNumber();
    const nif = generateNIF();
    const numeroRegistre = generateRegistreNumber();
    const issuedDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stepData = dossier.step_data || {};
    const activite = stepData.activite || {};
    const idData = stepData.identification?.data || {};
    const companyName = activite.commercial_names?.[0] || activite.raison_sociale || dossier.company_name;
    const formeJuridique = activite.forme_juridique || dossier.forme_juridique || '';
    const secteur = activite.secteur_principal || '';
    const capital = activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} DJF` : '—';
    const repName = idData.prenom ? `${idData.prenom} ${idData.nom}` : dossier.applicant_name;

    // Generate PDF in base64
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;

    // Background border
    doc.setDrawColor(26, 43, 107);
    doc.setLineWidth(3);
    doc.rect(10, 10, W - 20, H - 20);
    doc.setLineWidth(1);
    doc.rect(13, 13, W - 26, H - 26);

    // Header band
    doc.setFillColor(26, 43, 107);
    doc.rect(10, 10, W - 20, 35, 'F');

    // Republic header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('REPUBLIQUE DE DJIBOUTI', W / 2, 22, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Unité — Égalité — Paix', W / 2, 28, { align: 'center' });
    doc.text('Ministère du Commerce, de l\'Industrie et du Tourisme', W / 2, 33, { align: 'center' });
    doc.text('Agence Nationale pour la Promotion des Investissements (ANPI)', W / 2, 38, { align: 'center' });

    // Title
    doc.setTextColor(26, 43, 107);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LICENCE D\'EXERCICE D\'ACTIVITÉ COMMERCIALE', W / 2, 60, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Guichet Unique — Enregistrement d\'Entreprise', W / 2, 68, { align: 'center' });

    // Divider
    doc.setDrawColor(26, 43, 107);
    doc.setLineWidth(0.8);
    doc.line(20, 73, W - 20, 73);

    // License number badge
    doc.setFillColor(240, 244, 255);
    doc.setDrawColor(26, 43, 107);
    doc.setLineWidth(0.5);
    doc.roundedRect(55, 77, W - 110, 14, 3, 3, 'FD');
    doc.setTextColor(26, 43, 107);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${licenseNumber}`, W / 2, 86, { align: 'center' });

    // Body fields
    const fields = [
      ['Dénomination sociale', companyName],
      ['Forme juridique', formeJuridique],
      ['Secteur d\'activité', secteur],
      ['Capital social', capital],
      ['Représentant légal', repName],
      ['Numéro NIF', nif],
      ['N° Registre de Commerce', numeroRegistre],
      ['Date d\'émission', new Date(issuedDate).toLocaleDateString('fr-FR')],
      ['Date d\'expiration', new Date(expiryDate).toLocaleDateString('fr-FR')],
    ];

    let y = 102;
    doc.setFontSize(9);
    fields.forEach(([label, val], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(249, 249, 249);
        doc.rect(20, y - 5, W - 40, 12, 'F');
      }
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(label + ' :', 24, y + 2);
      doc.setTextColor(26, 26, 26);
      doc.setFont('helvetica', 'bold');
      doc.text(String(val || '—'), 90, y + 2);
      y += 13;
    });

    y += 5;

    // Certification text
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, y, W - 20, y);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const certText = `La présente licence certifie que la société susmentionnée est dûment enregistrée et autorisée à exercer ses activités commerciales sur le territoire de la République de Djibouti, conformément aux lois et règlements en vigueur, et notamment le Code de Commerce et les textes pris pour son application.`;
    const lines = doc.splitTextToSize(certText, W - 40);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 8;

    // Obligations
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 43, 107);
    doc.text('OBLIGATIONS DU TITULAIRE :', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const obligations = [
      '• Exercer exclusivement les activités mentionnées sur la présente licence',
      '• Renouveler la licence avant sa date d\'expiration',
      '• Respecter toutes les obligations fiscales, sociales et commerciales',
      '• Informer l\'ANPI de tout changement relatif aux informations déclarées',
    ];
    obligations.forEach(o => { doc.text(o, 24, y); y += 5; });

    y += 5;

    // Signatures
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, y, W - 20, y);
    y += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('Pour la Direction Générale de l\'ANPI', 40, y, { align: 'center' });
    doc.text('Le Titulaire', W - 40, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Signature et cachet', 40, y, { align: 'center' });
    doc.text('Signature', W - 40, y, { align: 'center' });
    y += 25;
    doc.setDrawColor(150, 150, 150);
    doc.line(20, y, 80, y);
    doc.line(W - 80, y, W - 20, y);

    // Footer
    doc.setFillColor(26, 43, 107);
    doc.rect(10, H - 25, W - 20, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ANPI Djibouti — Guichet Unique d'Investissement`, W / 2, H - 19, { align: 'center' });
    doc.text(`Ref. Dossier: ${dossier.envelope_id} | Vérifiez l'authenticité sur anpi.dj`, W / 2, H - 14, { align: 'center' });

    const pdfBase64 = doc.output('datauristring');
    const base64Data = pdfBase64.split(',')[1];
    const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, `licence-${licenseNumber}.pdf`);

    const uploadRes = await fetch('https://api.base44.com/api/apps/68f0ad9dc27bcf0743295786/integrations/uploadfile', {
      method: 'POST',
      headers: { 'Authorization': req.headers.get('Authorization') || '' },
      body: formData,
    });

    let licensePdfUrl = null;
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      licensePdfUrl = uploadData.file_url;
    }

    // Update dossier
    await base44.asServiceRole.entities.RegistrationDossier.update(dossier_id, {
      license_number: licenseNumber,
      nif,
      numero_registre: numeroRegistre,
      license_issued_date: issuedDate,
      license_expiry_date: expiryDate,
      license_pdf_url: licensePdfUrl,
      statut: 'Validé',
      admin_email: user.email,
      date_traitement: issuedDate,
    });

    return Response.json({
      success: true,
      license_number: licenseNumber,
      nif,
      numero_registre: numeroRegistre,
      license_issued_date: issuedDate,
      license_expiry_date: expiryDate,
      license_pdf_url: licensePdfUrl,
      pdf_base64: pdfBase64,
    });

  } catch (error) {
    console.error('generateLicense error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});