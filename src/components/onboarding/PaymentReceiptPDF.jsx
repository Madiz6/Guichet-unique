import { jsPDF } from 'jspdf';

async function generateQRDataURL(text) {
  return new Promise((resolve) => {
    const size = 200;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Helper: draw a horizontal rule
function hr(doc, x, y, w, r = 200, g = 200, b = 200) {
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);
}

// Helper: labeled value row
function fieldRow(doc, x, y, label, value, labelW = 55) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(25, 25, 25);
  doc.text(String(value || '—'), x + labelW, y, { maxWidth: 80 });
}

export async function generatePaymentReceiptPDF(params) {
  const {
    amount, transactionId, envelopeId, companyName,
    formeJuridique, secteur, tierLabel, tierDelay,
    applicantName, applicantEmail,
    patenteAmount, odpicAmount, statusFeesAmount, tierSurcharge,
  } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const ML = 15; // margin left
  const MR = 15; // margin right
  const CW = W - ML - MR; // content width = 180

  const ORANGE  = [247, 148, 29];   // #F7941D
  const NAVY    = [13,  43,  13];   // #0d2b0d  (dark green-navy brand)
  const WHITE   = [255, 255, 255];
  const LIGHT   = [250, 250, 250];
  const BORDER  = [220, 220, 220];
  const TEXT    = [25,  25,  25];
  const MUTED   = [120, 120, 120];
  const GREEN   = [22,  101, 52];
  const GREEN_BG= [220, 252, 231];

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const receiptNumber = `ANPI-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // ═══════════════════════════════════════════════════════
  // 1. TOP ORANGE ACCENT STRIPE
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, W, 5, 'F');

  // ═══════════════════════════════════════════════════════
  // 2. DARK NAVY HEADER BAND (5 → 48)
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 5, W, 43, 'F');

  // Logo box (white rounded rect, left)
  doc.setFillColor(...WHITE);
  doc.roundedRect(ML, 11, 28, 28, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...NAVY);
  doc.text('GUICHET', ML + 14, 21, { align: 'center' });
  doc.text('UNIQUE', ML + 14, 26, { align: 'center' });
  doc.setFontSize(5);
  doc.text('ANPI DJIBOUTI', ML + 14, 31, { align: 'center' });
  // Small orange dot accent on logo
  doc.setFillColor(...ORANGE);
  doc.circle(ML + 14, 36, 1.5, 'F');

  // Center: Title block
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('REÇU DE PAIEMENT', W / 2, 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...ORANGE);
  doc.text('République de Djibouti  •  Guichet Unique de Création d\'Entreprise', W / 2, 31, { align: 'center' });

  doc.setTextColor(190, 210, 190);
  doc.setFontSize(7);
  doc.text('Agence Nationale de Promotion des Investissements (ANPI)', W / 2, 37, { align: 'center' });

  // Right: Receipt number box
  const rnX = W - MR - 42;
  doc.setFillColor(255, 255, 255, 0.1);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  doc.roundedRect(rnX, 11, 42, 18, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...ORANGE);
  doc.text('N° REÇU', rnX + 21, 17, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(receiptNumber, rnX + 21, 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(190, 210, 190);
  doc.text(`${date}`, rnX + 21, 27, { align: 'center' });

  // ═══════════════════════════════════════════════════════
  // 3. GREEN CONFIRMATION BANNER (48 → 62)
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(...GREEN_BG);
  doc.rect(0, 48, W, 14, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(0, 48, 4, 14, 'F'); // left accent bar
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text('✓  PAIEMENT CONFIRMÉ ET VALIDÉ — ' + date + ' à ' + time, W / 2, 57, { align: 'center' });

  let y = 70;

  // ═══════════════════════════════════════════════════════
  // 4. TWO-COLUMN INFO CARDS
  // ═══════════════════════════════════════════════════════
  const cardH = 62;
  const halfW = CW / 2 - 4;

  // --- Left card: Entreprise ---
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, halfW, cardH, 2, 2, 'FD');
  // Orange top bar on card
  doc.setFillColor(...ORANGE);
  doc.roundedRect(ML, y, halfW, 7, 2, 2, 'F');
  doc.rect(ML, y + 4, halfW, 3, 'F'); // square off bottom corners
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text('INFORMATIONS ENTREPRISE', ML + halfW / 2, y + 5, { align: 'center' });

  const cy1 = y + 13;
  fieldRow(doc, ML + 4, cy1,      'Raison sociale',   companyName, 38);
  fieldRow(doc, ML + 4, cy1 + 11, 'Forme juridique',  formeJuridique, 38);
  fieldRow(doc, ML + 4, cy1 + 22, 'Secteur activité', secteur, 38);
  fieldRow(doc, ML + 4, cy1 + 33, 'Ref. Envelope',    envelopeId ? envelopeId.substring(0, 18) + '…' : '—', 38);
  fieldRow(doc, ML + 4, cy1 + 44, 'Formule',          `${tierLabel}  (${tierDelay})`, 38);

  // --- Right card: Demandeur ---
  const rx = ML + halfW + 8;
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(rx, y, halfW, cardH, 2, 2, 'FD');
  doc.setFillColor(...NAVY);
  doc.roundedRect(rx, y, halfW, 7, 2, 2, 'F');
  doc.rect(rx, y + 4, halfW, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text('DEMANDEUR', rx + halfW / 2, y + 5, { align: 'center' });

  const cy2 = y + 13;
  fieldRow(doc, rx + 4, cy2,      'Nom complet',      applicantName, 36);
  fieldRow(doc, rx + 4, cy2 + 11, 'Email',            applicantEmail, 36);
  fieldRow(doc, rx + 4, cy2 + 22, 'Date paiement',    date, 36);
  fieldRow(doc, rx + 4, cy2 + 33, 'Heure',            time, 36);
  fieldRow(doc, rx + 4, cy2 + 44, 'Mode paiement',    'Meras Payment Gateway', 36);

  y += cardH + 10;

  // ═══════════════════════════════════════════════════════
  // 5. FEE BREAKDOWN TABLE
  // ═══════════════════════════════════════════════════════
  // Section header
  doc.setFillColor(...NAVY);
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F');
  doc.rect(ML, y + 4, CW, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('DÉTAIL DES FRAIS D\'ENREGISTREMENT', ML + 5, y + 5.5);
  doc.setTextColor(...ORANGE);
  doc.text('MONTANT (DJF)', W - MR - 4, y + 5.5, { align: 'right' });
  y += 8;

  const feeRows = [
    { no: '01', label: 'Droits de patente', sublabel: `Secteur : ${secteur || 'Activité générale'}`, amount: patenteAmount },
    { no: '02', label: 'Frais ODPIC', sublabel: 'Enregistrement au Registre du Commerce', amount: odpicAmount },
    { no: '03', label: 'Frais de statuts', sublabel: 'Rédaction et enregistrement des statuts', amount: statusFeesAmount },
  ];
  if (tierSurcharge > 0) {
    feeRows.push({ no: '04', label: `Frais de traitement — ${tierLabel}`, sublabel: `Délai : ${tierDelay}`, amount: tierSurcharge });
  }

  feeRows.forEach(({ no, label, sublabel, amount: amt }, i) => {
    const rh = 12;
    const ry = y + i * rh;
    // Alternating rows
    doc.setFillColor(i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(ML, ry, CW, rh, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(ML, ry, CW, rh, 'S');

    // Row number badge
    doc.setFillColor(...ORANGE);
    doc.roundedRect(ML + 3, ry + 2.5, 7, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...WHITE);
    doc.text(no, ML + 6.5, ry + 7.5, { align: 'center' });

    // Label + sub-label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.text(label, ML + 13, ry + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(sublabel, ML + 13, ry + 9.5);

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(Number(amt || 0).toLocaleString('fr-FR'), W - MR - 4, ry + 7.5, { align: 'right' });
  });

  y += feeRows.length * 12;

  // Sub-total row
  doc.setFillColor(240, 240, 240);
  doc.rect(ML, y, CW, 9, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Sous-total', ML + 5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  const subtotal = (patenteAmount || 0) + (odpicAmount || 0) + (statusFeesAmount || 0) + (tierSurcharge || 0);
  doc.text(Number(subtotal).toLocaleString('fr-FR'), W - MR - 4, y + 6, { align: 'right' });
  y += 9;

  // TOTAL row — full orange
  doc.setFillColor(...ORANGE);
  doc.rect(ML, y, CW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL PAYÉ', ML + 5, y + 9);
  doc.setFontSize(14);
  doc.text(`${Number(amount).toLocaleString('fr-FR')} DJF`, W - MR - 4, y + 9.5, { align: 'right' });
  y += 20;

  // ═══════════════════════════════════════════════════════
  // 6. TRANSACTION + QR ROW
  // ═══════════════════════════════════════════════════════
  const qrText = JSON.stringify({ receipt: receiptNumber, tx: transactionId || 'N/A', envelope: envelopeId, amount, date, company: companyName });
  const qrDataUrl = await generateQRDataURL(qrText);

  const txCardW = CW * 0.6;
  const qrCardW = CW - txCardW - 8;
  const rowH = 52;

  // Transaction card
  doc.setFillColor(240, 244, 255);
  doc.setDrawColor(199, 210, 254);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, txCardW, rowH, 2, 2, 'FD');
  doc.setFillColor(55, 48, 163);
  doc.roundedRect(ML, y, txCardW, 7, 2, 2, 'F');
  doc.rect(ML, y + 4, txCardW, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text('INFORMATIONS DE TRANSACTION', ML + txCardW / 2, y + 5, { align: 'center' });

  const txRows = [
    ['N° de reçu',         receiptNumber],
    ['Réf. transaction',   transactionId || 'Non disponible'],
    ['Statut paiement',    'PAYÉ ✓'],
    ['Processeur',         'Meras Payment Gateway'],
    ['Envelope ID',        envelopeId ? envelopeId.substring(0, 22) + '…' : '—'],
  ];

  txRows.forEach(([lbl, val], i) => {
    const fy = y + 12 + i * 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 140);
    doc.text(lbl, ML + 4, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const isStatus = lbl === 'Statut paiement';
    doc.setTextColor(isStatus ? GREEN[0] : 25, isStatus ? GREEN[1] : 25, isStatus ? GREEN[2] : 25);
    doc.text(String(val), ML + 4 + 36, fy, { maxWidth: txCardW - 45 });
  });

  // QR card
  const qrX = ML + txCardW + 8;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(qrX, y, qrCardW, rowH, 2, 2, 'FD');

  if (qrDataUrl) {
    const qrSize = 34;
    const qrPosX = qrX + (qrCardW - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrPosX, y + 5, qrSize, qrSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('VÉRIFICATION', qrX + qrCardW / 2, y + 43, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Scannez ce QR', qrX + qrCardW / 2, y + 47, { align: 'center' });
  }

  y += rowH + 10;

  // ═══════════════════════════════════════════════════════
  // 7. LEGAL NOTICE BOX
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, 18, 2, 2, 'FD');
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(ML, y, 4, 18, 2, 2, 'F');
  doc.rect(ML + 1, y, 3, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text('⚠  Avis important :', ML + 8, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Ce reçu constitue votre preuve officielle de paiement auprès du Guichet Unique ANPI Djibouti. Conservez-le précieusement.',
    ML + 8, y + 11, { maxWidth: CW - 12 }
  );
  doc.text(
    'Les frais versés ne sont pas remboursables. Votre dossier sera traité dans le délai indiqué après confirmation.',
    ML + 8, y + 16, { maxWidth: CW - 12 }
  );

  y += 24;

  // ═══════════════════════════════════════════════════════
  // 8. STAMP / VALIDATION AREA
  // ═══════════════════════════════════════════════════════
  const stampX = W - MR - 52;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1);
  doc.roundedRect(stampX, y - 4, 52, 24, 3, 3, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...ORANGE);
  doc.text('CACHET ANPI', stampX + 26, y + 2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('Document généré électroniquement', stampX + 26, y + 7, { align: 'center' });
  doc.text('Valide sans signature manuscrite', stampX + 26, y + 11, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.text('✓ VALIDÉ', stampX + 26, y + 16, { align: 'center' });

  // ═══════════════════════════════════════════════════════
  // 9. FOOTER
  // ═══════════════════════════════════════════════════════
  // Orange bottom stripe
  doc.setFillColor(...ORANGE);
  doc.rect(0, H - 4, W, 4, 'F');

  // Navy footer band
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 18, W, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(190, 210, 190);
  doc.text('ANPI Djibouti  —  Guichet Unique de Création d\'Entreprise  —  République de Djibouti', W / 2, H - 12, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(...ORANGE);
  doc.text('www.guichet-unique.dj  •  guichet@anpi.dj  •  Tél : +253 21 35 00 00', W / 2, H - 7, { align: 'center' });

  // Page number
  doc.setFontSize(6);
  doc.setTextColor(190, 210, 190);
  doc.text('Page 1/1', W - MR, H - 12, { align: 'right' });

  doc.save(`recu-paiement-${receiptNumber}.pdf`);
  return receiptNumber;
}