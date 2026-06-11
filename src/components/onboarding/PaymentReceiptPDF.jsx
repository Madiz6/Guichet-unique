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
  const size = 200;
  return loadImageAsBase64(
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png`
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
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const ML = 14;
  const MR = 14;
  const CW = W - ML - MR;

  // Colors matching reference
  const NAVY       = [10, 36, 99];     // deep navy
  const ORANGE     = [247, 148, 29];   // ANPI orange
  const GREEN_BG   = [220, 252, 231];
  const GREEN_TXT  = [14, 120, 55];
  const GREEN_BRD  = [74, 180, 110];
  const WHITE      = [255, 255, 255];
  const LIGHT_GRAY = [247, 248, 250];
  const BORDER     = [210, 215, 225];
  const TEXT       = [20, 20, 35];
  const MUTED      = [110, 115, 130];
  const TBL_HDR    = [40, 60, 140];    // table header blue (like reference)
  const RED_LABEL  = [180, 30, 30];    // for "En attente de confirmation" style italic

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateTimeStr = `${dateStr} ${timeStr}`;
  const receiptNumber = `GUI-${now.getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Logos
  const GUICHET_LOGO_URL = 'https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png';
  const PARTNER_LOGOS = [
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/ad45d10f1_odpic-logo.png',                       name: 'ODPIC' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/4d01ed747_Logo-75-x-21-pixels-couleur-3-1-1.png', name: 'CNSS' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/0be7f5c77_9391f0df4_green-2copy-1.jpg',           name: 'Min. Budget' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/cf2bbfeae_AS_Ali_Sabieh-Djibouti_Tlcom.png',      name: 'Djibouti Télécom' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/923b7fae1_Gemini_Generated_Image_yj3n6yj3n6yj3n6y.png', name: 'Meras' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/e29bdac39_edd.jpg',                               name: 'EDD' },
    { url: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/3996ad141_unnamed.png',                           name: 'ONEAD' },
  ];

  const [mainLogoData, ...partnerData] = await Promise.all([
    loadImageAsBase64(GUICHET_LOGO_URL),
    ...PARTNER_LOGOS.map(p => loadImageAsBase64(p.url)),
  ]);

  const qrText = `RECU:${receiptNumber}|ENV:${envelopeId}|MONTANT:${amount}DJF|SOCIETE:${companyName}|DATE:${dateStr}`;
  const qrDataUrl = await generateQRDataURL(qrText);

  // ══════════════════════════════════════════════════════════
  // HEADER — exactly like reference
  // ══════════════════════════════════════════════════════════

  // Left logo (ANPI/Guichet Unique)
  const logoSize = 22;
  const logoY = 8;
  if (mainLogoData) {
    doc.addImage(mainLogoData, 'PNG', ML, logoY, logoSize, logoSize);
  }
  // Left label under logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...NAVY);
  doc.text('Guichet Unique', ML + logoSize / 2, logoY + logoSize + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.text('ANPI Djibouti', ML + logoSize / 2, logoY + logoSize + 8, { align: 'center' });

  // Center block — title
  const centerX = W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text('RÉPUBLIQUE DE DJIBOUTI', centerX, logoY + 7, { align: 'center' });

  // Arabic subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('جمهورية جيبوتي  |  Ministère du Commerce', centerX, logoY + 13, { align: 'center' });

  // Thin divider under arabic
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(centerX - 50, logoY + 15.5, centerX + 50, logoY + 15.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text('Agence Nationale pour la Promotion des Investissements', centerX, logoY + 20, { align: 'center' });

  // Main receipt title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text('REÇU DE PAIEMENT', centerX, logoY + 28, { align: 'center' });

  // PAYÉ badge (green, centered, like reference)
  const badgeW = 32;
  const badgeH = 8;
  const badgeX = centerX - badgeW / 2;
  const badgeY = logoY + 31;
  doc.setFillColor(...GREEN_BG);
  doc.setDrawColor(...GREEN_BRD);
  doc.setLineWidth(0.5);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN_TXT);
  doc.text('✓ PAYÉ', centerX, badgeY + 5.5, { align: 'center' });

  // Right logo (same ANPI logo, mirrored position like reference uses Police logo)
  if (mainLogoData) {
    doc.addImage(mainLogoData, 'PNG', W - MR - logoSize, logoY, logoSize, logoSize);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...NAVY);
  doc.text('ANPI', W - MR - logoSize / 2, logoY + logoSize + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.text('Guichet Unique', W - MR - logoSize / 2, logoY + logoSize + 8, { align: 'center' });

  // Double horizontal rule under header (like reference)
  const sepY = logoY + logoSize + 13;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(ML, sepY, W - MR, sepY);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.line(ML, sepY + 1.2, W - MR, sepY + 1.2);

  let y = sepY + 7;

  // ══════════════════════════════════════════════════════════
  // REFERENCE INFO BAR (top-right like reference: "REÇU N°, ID Transaction, Djibouti le:")
  // ══════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Portail de Paiement en Ligne : guichet-unique-djib.com', ML, y);

  // Right-aligned receipt info
  const rightX = W - MR;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text(`REÇU N°: `, rightX - 70, y);
  doc.setTextColor(...NAVY);
  doc.text(receiptNumber, rightX - 70 + doc.getTextWidth('REÇU N°: '), y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  doc.text('ID Transaction MERAS: ', rightX - 70, y);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...RED_LABEL);
  doc.text(transactionId || 'En attente de confirmation', rightX - 70 + doc.getTextWidth('ID Transaction MERAS: '), y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Djibouti, le: ${dateTimeStr}`, rightX, y, { align: 'right' });

  y += 8;

  // ══════════════════════════════════════════════════════════
  // THIN SEPARATOR
  // ══════════════════════════════════════════════════════════
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  y += 7;

  // ══════════════════════════════════════════════════════════
  // CLIENT INFO GRID — 2 columns, label: bold value (like reference)
  // ══════════════════════════════════════════════════════════
  const col1 = ML;
  const col2 = W / 2 + 5;
  const labelW = 32;
  const lineH = 7;

  const infoRows = [
    [
      { label: 'Nom / Prénom :', value: applicantName || '—' },
      { label: 'Montant Payé :', value: `${Number(amount).toLocaleString('fr-FR')} DJF`, bold: true, navy: true },
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
    // Col 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT);
    doc.text(row[0].label, col1, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(row[0].navy ? NAVY[0] : TEXT[0], row[0].navy ? NAVY[1] : TEXT[1], row[0].navy ? NAVY[2] : TEXT[2]);
    doc.text(row[0].value, col1 + labelW, y, { maxWidth: W / 2 - labelW - 5 });

    // Col 2
    if (row[1]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(row[1].label, col2, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (row[1].navy) {
        doc.setTextColor(...NAVY);
      } else {
        doc.setTextColor(...TEXT);
      }
      doc.text(row[1].value, col2 + labelW, y, { maxWidth: W - MR - col2 - labelW });
    }

    y += lineH;
  });

  y += 5;

  // ══════════════════════════════════════════════════════════
  // FEE TABLE — exactly like reference
  // ══════════════════════════════════════════════════════════
  const THH = 8;
  // Header
  doc.setFillColor(...TBL_HDR);
  doc.rect(ML, y, CW, THH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);

  // Column positions
  const c1 = ML + 3;           // Désignation
  const c2 = ML + CW * 0.45;   // Référence (centered)
  const c3 = ML + CW * 0.76;   // Montant
  const c4 = W - MR - 3;       // Statut

  doc.text('Désignation', c1, y + 5.5);
  doc.text('Référence', c2, y + 5.5, { align: 'center' });
  doc.text('Montant (DJF)', c3, y + 5.5, { align: 'right' });
  doc.text('Statut', c4, y + 5.5, { align: 'right' });
  y += THH;

  const feeRows = [
    { label: `Droits de patente — ${secteur || 'Activité générale'}`, ref: receiptNumber, amount: patenteAmount },
    { label: 'Frais ODPIC — Registre du Commerce', ref: receiptNumber, amount: odpicAmount },
    { label: 'Frais de statuts — Rédaction & enregistrement', ref: receiptNumber, amount: statusFeesAmount },
  ];
  if (tierSurcharge > 0) {
    feeRows.push({ label: `Traitement ${tierLabel} — ${tierDelay}`, ref: receiptNumber, amount: tierSurcharge });
  }

  const rowH = 9;
  feeRows.forEach(({ label, ref, amount: amt }, i) => {
    const ry = y + i * rowH;
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 253);
    doc.rect(ML, ry, CW, rowH, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, ry + rowH, ML + CW, ry + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT);
    doc.text(label, c1, ry + 6, { maxWidth: CW * 0.42 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(ref, c2, ry + 6, { align: 'center', maxWidth: CW * 0.28 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.text(Number(amt || 0).toLocaleString('fr-FR'), c3, ry + 6, { align: 'right' });

    // PAYÉ badge in row
    const sbW = 18;
    const sbX = c4 - sbW;
    const sbY = ry + 1.5;
    doc.setFillColor(...GREEN_BG);
    doc.setDrawColor(...GREEN_BRD);
    doc.setLineWidth(0.3);
    doc.roundedRect(sbX, sbY, sbW, 6, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...GREEN_TXT);
    doc.text('✓ PAYÉ', sbX + sbW / 2, sbY + 4, { align: 'center' });
  });

  y += feeRows.length * rowH;

  // Total row
  doc.setFillColor(...TBL_HDR);
  doc.rect(ML, y, CW, rowH + 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('Total', c1, y + 7);
  doc.setFontSize(9);
  doc.text(`${Number(amount).toLocaleString('fr-FR')} DJF`, c3, y + 7, { align: 'right' });
  y += rowH + 2 + 12;

  // ══════════════════════════════════════════════════════════
  // QR CODE + legal text — like reference (QR bottom-right, text bottom-left)
  // ══════════════════════════════════════════════════════════
  const qrSize = 36;
  const qrX = W - MR - qrSize;
  const qrBlockY = y;

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrBlockY, qrSize, qrSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('Scan pour vérifier', qrX + qrSize / 2, qrBlockY + qrSize + 4, { align: 'center' });
    doc.text(receiptNumber, qrX + qrSize / 2, qrBlockY + qrSize + 8, { align: 'center' });
  }

  // Legal text left of QR
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text('Ce reçu fait foi de paiement auprès du Guichet Unique ANPI.', ML, y + 6);
  doc.text('Présentez ce document lors de vos démarches administratives.', ML, y + 12);

  y += qrSize + 14;

  // ══════════════════════════════════════════════════════════
  // GENERATED ELECTRONICALLY notice (like reference)
  // ══════════════════════════════════════════════════════════
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Document généré électroniquement  ·  Guichet Unique ANPI  ·  Djibouti ${now.getFullYear()}`,
    W / 2, y, { align: 'center' }
  );
  y += 7;

  // ══════════════════════════════════════════════════════════
  // PARTNER LOGOS ROW — "TRUSTED PARTNERS" (like reference)
  // ══════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('PARTENAIRES ET INSTITUTIONS FINANCIÈRES', W / 2, y, { align: 'center' });
  y += 4;

  const logoIconW = 22;
  const logoIconH = 12;
  const totalLogos = partnerData.length;
  const logoSpacing = CW / totalLogos;

  partnerData.forEach((imgData, i) => {
    const lx = ML + i * logoSpacing + (logoSpacing - logoIconW) / 2;
    const ly = y;
    if (imgData) {
      try {
        doc.addImage(imgData, 'PNG', lx, ly, logoIconW, logoIconH);
      } catch {
        // skip silently
      }
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(...MUTED);
    doc.text(PARTNER_LOGOS[i]?.name || '', lx + logoIconW / 2, ly + logoIconH + 3, { align: 'center' });
  });

  y += logoIconH + 8;

  // ══════════════════════════════════════════════════════════
  // ANTI-CORRUPTION FOOTER (like reference CNPCLC logo + text)
  // ══════════════════════════════════════════════════════════
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text(
    'Commission Nationale Indépendante pour la Prévention et la Lutte contre la Corruption',
    W / 2, y, { align: 'center' }
  );
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Ce reçu est un document officiel. Toute falsification est passible de poursuites judiciaires.",
    W / 2, y, { align: 'center' }
  );

  // Bottom orange bar
  doc.setFillColor(...ORANGE);
  doc.rect(0, H - 4, W, 4, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 7, W, 3, 'F');

  doc.save(`recu-paiement-${receiptNumber}.pdf`);
  return receiptNumber;
}