import { jsPDF } from 'jspdf';

/**
 * Generates a simple QR code as a data URL using canvas.
 * Encodes the given text into a basic 2D matrix pattern.
 * We use a URL-based Google Charts API approach via an img element drawn to canvas.
 */
async function generateQRDataURL(text) {
  return new Promise((resolve) => {
    const size = 200;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generates and downloads a payment receipt PDF.
 * @param {object} params
 * @param {number} params.amount - Amount paid in DJF
 * @param {string} params.transactionId - Transaction reference
 * @param {string} params.envelopeId - Dossier envelope ID
 * @param {string} params.companyName - Company name
 * @param {string} params.formeJuridique - Legal form
 * @param {string} params.secteur - Business sector
 * @param {string} params.tierLabel - Tier label (Express, Standard, etc.)
 * @param {string} params.tierDelay - Processing delay
 * @param {string} params.applicantName - Applicant full name
 * @param {string} params.applicantEmail - Applicant email
 * @param {number} params.patenteAmount
 * @param {number} params.odpicAmount
 * @param {number} params.statusFeesAmount
 * @param {number} params.tierSurcharge
 */
export async function generatePaymentReceiptPDF(params) {
  const {
    amount,
    transactionId,
    envelopeId,
    companyName,
    formeJuridique,
    secteur,
    tierLabel,
    tierDelay,
    applicantName,
    applicantEmail,
    patenteAmount,
    odpicAmount,
    statusFeesAmount,
    tierSurcharge,
  } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const receiptNumber = `ANPI-${Date.now().toString(36).toUpperCase()}`;

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(26, 43, 107); // #1A2B6B
  doc.rect(0, 0, W, 40, 'F');

  // Logo placeholder (left)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 8, 24, 24, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(26, 43, 107);
  doc.setFont('helvetica', 'bold');
  doc.text('GUICHET', 22, 18, { align: 'center' });
  doc.text('UNIQUE', 22, 23, { align: 'center' });
  doc.text('ANPI', 22, 28, { align: 'center' });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REÇU DE PAIEMENT', W / 2, 18, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('République de Djibouti — Agence Nationale de Promotion des Investissements', W / 2, 26, { align: 'center' });
  doc.text('Guichet Unique de Création d\'Entreprise', W / 2, 32, { align: 'center' });

  // Receipt number badge (right)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${receiptNumber}`, W - 12, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`${date} à ${time}`, W - 12, 21, { align: 'right' });

  // ── Green confirmation banner ──────────────────────────────────────────
  doc.setFillColor(220, 252, 231); // green-100
  doc.rect(0, 40, W, 18, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('✓  PAIEMENT CONFIRMÉ ET VALIDÉ', W / 2, 52, { align: 'center' });

  let y = 68;

  // ── Two columns: Company info & Payment summary ───────────────────────
  const col1x = 12;
  const col2x = W / 2 + 5;
  const colW = W / 2 - 17;

  // Section: Informations de l'entreprise
  doc.setFillColor(249, 249, 249);
  doc.roundedRect(col1x, y, colW, 58, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col1x, y, colW, 58, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 43, 107);
  doc.text('INFORMATIONS DE L\'ENTREPRISE', col1x + 4, y + 7);
  doc.setDrawColor(26, 43, 107);
  doc.line(col1x + 4, y + 9, col1x + colW - 4, y + 9);

  const fields1 = [
    ['Nom / Raison sociale', companyName || '—'],
    ['Forme juridique', formeJuridique || '—'],
    ['Secteur d\'activité', secteur || '—'],
    ['Référence dossier', envelopeId ? envelopeId.substring(0, 20) + '...' : '—'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  fields1.forEach(([label, val], i) => {
    const fy = y + 15 + i * 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(label, col1x + 4, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 26);
    doc.text(String(val), col1x + 4, fy + 4.5, { maxWidth: colW - 8 });
  });

  // Section: Demandeur
  doc.setFillColor(249, 249, 249);
  doc.roundedRect(col2x, y, colW, 58, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col2x, y, colW, 58, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 43, 107);
  doc.text('DEMANDEUR', col2x + 4, y + 7);
  doc.setDrawColor(26, 43, 107);
  doc.line(col2x + 4, y + 9, col2x + colW - 4, y + 9);

  const fields2 = [
    ['Nom du demandeur', applicantName || '—'],
    ['Email', applicantEmail || '—'],
    ['Formule choisie', tierLabel || '—'],
    ['Délai de traitement', tierDelay || '—'],
  ];

  fields2.forEach(([label, val], i) => {
    const fy = y + 15 + i * 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(label, col2x + 4, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 26);
    doc.text(String(val), col2x + 4, fy + 4.5, { maxWidth: colW - 8 });
  });

  y += 65;

  // ── Fee breakdown table ───────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 43, 107);
  doc.text('DÉTAIL DES FRAIS', col1x, y + 5);
  doc.setDrawColor(26, 43, 107);
  doc.line(col1x, y + 7, W - 12, y + 7);
  y += 10;

  // Table header
  doc.setFillColor(26, 43, 107);
  doc.rect(col1x, y, W - 24, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Désignation', col1x + 4, y + 5.5);
  doc.text('Montant (DJF)', W - 14, y + 5.5, { align: 'right' });
  y += 8;

  const feeRows = [
    ['1. Droits de patente', patenteAmount],
    ['2. Frais ODPIC (Registre du Commerce)', odpicAmount],
    ['3. Frais de statuts', statusFeesAmount],
  ];
  if (tierSurcharge > 0) {
    feeRows.push([`4. Frais de traitement ${tierLabel}`, tierSurcharge]);
  }

  feeRows.forEach(([label, amt], i) => {
    const rowY = y + i * 9;
    doc.setFillColor(i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 249 : 255);
    doc.rect(col1x, rowY, W - 24, 9, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(col1x, rowY, W - 24, 9, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 55, 55);
    doc.text(label, col1x + 4, rowY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(Number(amt || 0).toLocaleString('fr-FR'), W - 14, rowY + 6, { align: 'right' });
  });

  y += feeRows.length * 9 + 2;

  // Total row
  doc.setFillColor(26, 43, 107);
  doc.rect(col1x, y, W - 24, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL PAYÉ', col1x + 4, y + 8);
  doc.setFontSize(12);
  doc.text(`${Number(amount).toLocaleString('fr-FR')} DJF`, W - 14, y + 8, { align: 'right' });
  y += 18;

  // ── Transaction info + QR ─────────────────────────────────────────────
  const qrText = JSON.stringify({
    receipt: receiptNumber,
    transaction: transactionId || 'N/A',
    envelope: envelopeId,
    amount,
    date,
    company: companyName,
  });

  const qrDataUrl = await generateQRDataURL(qrText);

  // Transaction box (left)
  doc.setFillColor(240, 244, 255);
  doc.roundedRect(col1x, y, colW, 50, 2, 2, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(col1x, y, colW, 50, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 48, 163);
  doc.text('INFORMATIONS DE TRANSACTION', col1x + 4, y + 8);
  doc.setDrawColor(199, 210, 254);
  doc.line(col1x + 4, y + 10, col1x + colW - 4, y + 10);

  const txFields = [
    ['N° de reçu', receiptNumber],
    ['Réf. transaction', transactionId || 'N/A'],
    ['Date & heure', `${date} — ${time}`],
    ['Statut', 'PAYÉ ✓'],
    ['Mode de paiement', 'Meras Payment Gateway'],
  ];

  txFields.forEach(([label, val], i) => {
    const fy = y + 14 + i * 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text(label, col1x + 4, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(i === 3 ? 22 : 26, i === 3 ? 101 : 26, i === 3 ? 52 : 26);
    doc.text(String(val), col1x + 4, fy + 4, { maxWidth: colW - 8 });
  });

  // QR code (right)
  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(col2x, y, colW, 50, 2, 2, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(col2x, y, colW, 50, 2, 2, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('QR CODE DE VÉRIFICATION', col2x + colW / 2, y + 7, { align: 'center' });

    const qrSize = 36;
    const qrX = col2x + (colW - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, y + 10, qrSize, qrSize);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Scannez pour vérifier ce reçu', col2x + colW / 2, y + 47, { align: 'center' });
  }

  y += 58;

  // ── Legal notice ─────────────────────────────────────────────────────
  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(col1x, y, W - 24, 18, 2, 2, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(col1x, y, W - 24, 18, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 53, 15); // amber-900
  doc.text('⚠  Important :', col1x + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Ce reçu est votre preuve de paiement officielle. Conservez-le précieusement. Votre dossier sera traité dans les délais indiqués.',
    col1x + 4, y + 11,
    { maxWidth: W - 28 }
  );

  y += 24;

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setFillColor(26, 43, 107);
  doc.rect(0, y, W, 20, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  doc.text('ANPI Djibouti — Guichet Unique de Création d\'Entreprise', W / 2, y + 7, { align: 'center' });
  doc.text('Ce document est généré électroniquement et ne nécessite pas de signature manuscrite.', W / 2, y + 13, { align: 'center' });

  doc.save(`recu-paiement-${receiptNumber}.pdf`);
  return receiptNumber;
}