import { jsPDF } from 'jspdf';

async function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 80;
      canvas.height = img.naturalHeight || 80;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function generateQRDataURL(text) {
  return loadImageAsBase64(
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}&format=png`
  );
}

export async function generatePaymentReceiptPDF(params) {
  const {
    amount, transactionId, envelopeId, companyName,
    formeJuridique, secteur, tierLabel, tierDelay,
    applicantName, applicantEmail,
    patenteAmount, odpicAmount, statusFeesAmount, tierSurcharge,
  } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 15;
  const MR = 15;
  const CW = W - ML - MR;

  // Color palette
  const NAVY        = [10, 36, 99];
  const ORANGE      = [247, 148, 29];
  const GREEN_BG    = [220, 252, 231];
  const GREEN_TXT   = [14, 120, 55];
  const GREEN_BRD   = [74, 180, 110];
  const WHITE       = [255, 255, 255];
  const BORDER      = [210, 215, 225];
  const TEXT        = [20, 20, 35];
  const MUTED       = [120, 125, 140];
  const TBL_HDR     = [28, 55, 130];
  const TBL_ALT     = [245, 247, 252];
  const RED_ITALIC  = [180, 30, 30];

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateTimeStr = `${dateStr} ${timeStr}`;
  const receiptNumber = `GUI-${now.getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const GUICHET_LOGO = 'https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png';
  const PARTNER_LOGOS = [
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/ad45d10f1_odpic-logo.png',                        name: 'ODPIC' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/4d01ed747_Logo-75-x-21-pixels-couleur-3-1-1.png',  name: 'CNSS' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/0be7f5c77_9391f0df4_green-2copy-1.jpg',            name: 'Min. Budget' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/cf2bbfeae_AS_Ali_Sabieh-Djibouti_Tlcom.png',       name: 'Djibouti Télécom' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/923b7fae1_Gemini_Generated_Image_yj3n6yj3n6yj3n6y.png', name: 'Meras' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/e29bdac39_edd.jpg',                                name: 'EDD' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/3996ad141_unnamed.png',                            name: 'ONEAD' },
  ];

  const [mainLogoData, ...partnerData] = await Promise.all([
    loadImageAsBase64(GUICHET_LOGO),
    ...PARTNER_LOGOS.map(p => loadImageAsBase64(p.url)),
  ]);

  const qrText = `RECU:${receiptNumber}|ENV:${envelopeId}|MONTANT:${amount}DJF|SOCIETE:${companyName}|DATE:${dateStr}`;
  const qrDataUrl = await generateQRDataURL(qrText);

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────
  const headerH = 46;
  // light gray header background
  doc.setFillColor(248, 249, 251);
  doc.rect(0, 0, W, headerH, 'F');

  // Left logo
  const logoSz = 20;
  const logoY = 7;
  if (mainLogoData) {
    doc.addImage(mainLogoData, 'PNG', ML, logoY, logoSz, logoSz);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...NAVY);
  doc.text('Guichet Unique', ML + logoSz / 2, logoY + logoSz + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.text('ANPI Djibouti', ML + logoSz / 2, logoY + logoSz + 7, { align: 'center' });



  // Center title block
  const cx = W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text('RÉPUBLIQUE DE DJIBOUTI', cx, 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Ministère du Commerce et de l\'Industrie', cx, 19, { align: 'center' });

  // thin rule
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(cx - 52, 21.5, cx + 52, 21.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('Agence Nationale pour la Promotion des Investissements', cx, 26, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('REÇU DE PAIEMENT', cx, 33, { align: 'center' });

  // PAYÉ badge — placed just below main title, inside header
  const bW = 30; const bH = 7;
  const bX = cx - bW / 2;
  const bY = 35.5;
  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...GREEN_BRD);
  doc.setLineWidth(0.4);
  doc.roundedRect(bX, bY, bW, bH, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GREEN_TXT);
  doc.text('✓  PAYÉ', cx, bY + 4.8, { align: 'center' });

  // Double rule closing header
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(0, headerH, W, headerH);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.35);
  doc.line(0, headerH + 1.1, W, headerH + 1.1);

  let y = headerH + 9;

  // ─────────────────────────────────────────────
  // REFERENCE INFO BAR
  // ─────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Portail de Paiement en Ligne : guichet-unique-djib.com', ML, y);

  const rX = W - MR;
  // Receipt number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  const rnLabel = 'REÇU N°: ';
  const rnLabelW = doc.getTextWidth(rnLabel);
  const rnStartX = rX - rnLabelW - doc.getTextWidth(receiptNumber);
  doc.text(rnLabel, rnStartX, y);
  doc.setTextColor(...NAVY);
  doc.text(receiptNumber, rnStartX + rnLabelW, y);

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  const txLabel = 'ID Transaction MERAS: ';
  const txLabelW = doc.getTextWidth(txLabel);
  const txVal = transactionId || 'En attente de confirmation';
  const txStartX = rX - txLabelW - doc.getTextWidth(txVal);
  doc.text(txLabel, txStartX, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...RED_ITALIC);
  doc.text(txVal, txStartX + txLabelW, y);

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Djibouti, le: ${dateTimeStr}`, rX, y, { align: 'right' });

  y += 8;

  // ─────────────────────────────────────────────
  // SEPARATOR
  // ─────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(ML, y, W - MR, y);
  y += 8;

  // ─────────────────────────────────────────────
  // CLIENT INFO — 2-column grid
  // ─────────────────────────────────────────────
  const col1X = ML;
  const col2X = W / 2 + 5;
  const lblW = 34;
  const rowH = 8;

  const infoRows = [
    [
      { label: 'Nom / Prénom :', value: applicantName || '—' },
      { label: 'Montant Payé :', value: `${Number(amount).toLocaleString('fr-FR')} DJF`, navy: true, bold: true },
    ],
    [
      { label: 'Forme juridique :', value: formeJuridique || '—' },
      { label: 'Référence :', value: receiptNumber },
    ],
    [
      { label: 'Société :', value: companyName || '—' },
      { label: 'ID Transaction :', value: transactionId || '—' },
    ],
    [
      { label: 'Date de paiement :', value: dateTimeStr },
      { label: 'Mode de paiement :', value: 'Paiement en ligne sécurisé' },
    ],
  ];

  infoRows.forEach((row) => {
    // col 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(row[0].label, col1X, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(row[0].navy ? NAVY[0] : TEXT[0], row[0].navy ? NAVY[1] : TEXT[1], row[0].navy ? NAVY[2] : TEXT[2]);
    doc.text(row[0].value, col1X + lblW, y, { maxWidth: W / 2 - lblW - 5 });

    // col 2
    if (row[1]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(row[1].label, col2X, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(row[1].navy ? NAVY[0] : TEXT[0], row[1].navy ? NAVY[1] : TEXT[1], row[1].navy ? NAVY[2] : TEXT[2]);
      doc.text(row[1].value, col2X + lblW, y, { maxWidth: W - MR - col2X - lblW });
    }
    y += rowH;
  });

  y += 7;

  // ─────────────────────────────────────────────
  // FEE TABLE
  // ─────────────────────────────────────────────
  const thH = 9;
  doc.setFillColor(...TBL_HDR);
  doc.rect(ML, y, CW, thH, 'F');

  // Column x positions
  const tc1 = ML + 3;
  const tc2 = ML + CW * 0.50;   // reference center
  const tc3 = ML + CW * 0.73;   // amount right-align
  const tc4 = ML + CW - 3;      // status right-align

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('Désignation', tc1, y + 6);
  doc.text('Référence', tc2, y + 6, { align: 'center' });
  doc.text('Montant (DJF)', tc3, y + 6, { align: 'right' });
  doc.text('Statut', tc4, y + 6, { align: 'right' });
  y += thH;

  const feeRows = [];
  if (Number(patenteAmount) > 0) {
    feeRows.push({ label: `Droits de patente — ${secteur || 'Activité générale'}`, amount: patenteAmount });
  }
  if (Number(odpicAmount) > 0) {
    feeRows.push({ label: 'Frais ODPIC — Registre du Commerce', amount: odpicAmount });
  }
  if (Number(statusFeesAmount) > 0) {
    feeRows.push({ label: 'Frais de statuts — Rédaction & enregistrement', amount: statusFeesAmount });
  }
  if (Number(tierSurcharge) > 0) {
    feeRows.push({ label: `Traitement ${tierLabel || 'Standard'} — ${tierDelay || '5-7 jours'}`, amount: tierSurcharge });
  }
  // Fallback: if all breakdown is 0 but total amount > 0, show total as single line
  if (feeRows.length === 0) {
    feeRows.push({ label: `Frais de création d'entreprise — ${companyName || ''}`, amount: amount });
  }

  const trH = 9;
  feeRows.forEach(({ label, amount: amt }, i) => {
    const ry = y + i * trH;
    doc.setFillColor(i % 2 === 1 ? TBL_ALT[0] : 255, i % 2 === 1 ? TBL_ALT[1] : 255, i % 2 === 1 ? TBL_ALT[2] : 255);
    doc.rect(ML, ry, CW, trH, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, ry + trH, ML + CW, ry + trH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT);
    doc.text(label, tc1, ry + 6, { maxWidth: CW * 0.44 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(receiptNumber, tc2, ry + 6, { align: 'center', maxWidth: CW * 0.22 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.text(Number(amt || 0).toLocaleString('fr-FR'), tc3, ry + 6, { align: 'right' });

    // PAYÉ pill
    const pW = 20; const pH = 6;
    const pX = tc4 - pW;
    const pY = ry + 1.5;
    doc.setFillColor(...GREEN_BG);
    doc.setDrawColor(...GREEN_BRD);
    doc.setLineWidth(0.3);
    doc.roundedRect(pX, pY, pW, pH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GREEN_TXT);
    doc.text('✓ PAYÉ', pX + pW / 2, pY + 4, { align: 'center' });
  });

  y += feeRows.length * trH;

  // Total row
  const totH = 10;
  doc.setFillColor(...TBL_HDR);
  doc.rect(ML, y, CW, totH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text('Total', tc1, y + 6.5);
  doc.setFontSize(9);
  doc.text(`${Number(amount).toLocaleString('fr-FR')} DJF`, tc3, y + 6.5, { align: 'right' });
  y += totH + 12;

  // ─────────────────────────────────────────────
  // QR + LEGAL TEXT
  // ─────────────────────────────────────────────
  const qrSz = 38;
  const qrX = W - MR - qrSz;
  const qrY = y;

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSz, qrSz);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('Scan pour vérifier', qrX + qrSz / 2, qrY + qrSz + 4, { align: 'center' });
    doc.text(receiptNumber, qrX + qrSz / 2, qrY + qrSz + 8, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text('Ce reçu fait foi de paiement auprès du Guichet Unique ANPI.', ML, y + 8);
  doc.text('Présentez ce document lors de vos démarches administratives.', ML, y + 15);

  y = qrY + qrSz + 14;

  // ─────────────────────────────────────────────
  // GENERATED ELECTRONICALLY
  // ─────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(ML, y, W - MR, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`Document généré électroniquement  ·  Guichet Unique ANPI  ·  Djibouti ${now.getFullYear()}`, W / 2, y, { align: 'center' });
  y += 7;

  // ─────────────────────────────────────────────
  // PARTNER LOGOS
  // ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('PARTENAIRES ET INSTITUTIONS FINANCIÈRES', W / 2, y, { align: 'center' });
  y += 5;

  // Cell dimensions for each logo slot
  const cellW = CW / PARTNER_LOGOS.length;
  const cellH = 14; // fixed cell height
  const maxLogoW = cellW - 4;
  const maxLogoH = cellH;

  partnerData.forEach((imgData, i) => {
    const cellX = ML + i * cellW;
    const cellCX = cellX + cellW / 2;

    if (imgData) {
      try {
        // Draw a white rounded background cell
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.roundedRect(cellX + 1, y, cellW - 2, cellH, 1.5, 1.5, 'FD');

        // Load image to get natural dimensions for aspect ratio
        const tmpImg = new Image();
        tmpImg.src = imgData;
        const nw = tmpImg.naturalWidth || 100;
        const nh = tmpImg.naturalHeight || 50;
        const ratio = nw / nh;

        // Fit within maxLogoW x maxLogoH keeping aspect ratio
        let dw = maxLogoW;
        let dh = dw / ratio;
        if (dh > maxLogoH) { dh = maxLogoH; dw = dh * ratio; }

        // Center inside cell
        const dx = cellCX - dw / 2;
        const dy = y + (cellH - dh) / 2;

        doc.addImage(imgData, 'PNG', dx, dy, dw, dh);
      } catch { /* skip */ }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...MUTED);
    doc.text(PARTNER_LOGOS[i]?.name || '', cellCX, y + cellH + 3.5, { align: 'center' });
  });

  y += cellH + 9;

  // ─────────────────────────────────────────────
  // ANTI-CORRUPTION FOOTER
  // ─────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(ML, y, W - MR, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text('Commission Nationale Indépendante pour la Prévention et la Lutte contre la Corruption', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("Ce reçu est un document officiel. Toute falsification est passible de poursuites judiciaires.", W / 2, y, { align: 'center' });

  // Bottom color bars
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 7, W, 4, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, H - 3, W, 3, 'F');

  doc.save(`recu-paiement-${receiptNumber}.pdf`);
  return receiptNumber;
}