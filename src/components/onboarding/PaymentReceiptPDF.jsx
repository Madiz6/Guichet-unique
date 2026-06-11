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

// Convert a number to French words (simplified, DJF context)
function numberToFrench(n) {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  if (n === 0) return 'zéro';

  function below100(num) {
    if (num < 20) return units[num];
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7) return 'soixante-' + units[10 + u];
    if (t === 9) return 'quatre-vingt-' + units[u];
    return tens[t] + (u > 0 ? (t === 8 ? '-' : '-') + units[u] : (t === 8 ? 's' : ''));
  }

  function below1000(num) {
    if (num < 100) return below100(num);
    const h = Math.floor(num / 100);
    const r = num % 100;
    return (h === 1 ? 'cent' : units[h] + ' cent') + (r > 0 ? ' ' + below100(r) : (h > 1 ? 's' : ''));
  }

  let result = '';
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    result += below1000(m) + ' million' + (m > 1 ? 's' : '') + ' ';
    n %= 1000000;
  }
  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    result += (k === 1 ? 'mille' : below1000(k) + ' mille') + ' ';
    n %= 1000;
  }
  if (n > 0) result += below1000(n);
  return result.trim();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  const ML = 15;
  const MR = 15;
  const CW = W - ML - MR; // 180

  // ── Brand Colors ─────────────────────────────────────────
  const BLUE_DARK  = [30,  45, 120];   // deep navy blue (like the reference header)
  const BLUE_MED   = [55,  80, 180];   // medium blue (table header)
  const ORANGE     = [247, 148, 29];   // #F7941D ANPI orange
  const WHITE      = [255, 255, 255];
  const LIGHT_GRAY = [248, 248, 248];
  const BORDER     = [210, 215, 230];
  const TEXT       = [20,  20,  40];
  const MUTED      = [120, 125, 145];
  const GREEN_OK   = [16,  122, 60];

  const date        = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const receiptNumber = `GUI-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}${Date.now().toString(36).toUpperCase().slice(-4)}`;

  // ── Preload images in parallel ────────────────────────────
  const GUICHET_LOGO_URL = 'https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png';

  // Partner logo URLs — uploaded directly
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

  const qrText = `RECU:${receiptNumber}|ENV:${envelopeId}|MONTANT:${amount}DJF|SOCIETE:${companyName}|DATE:${date}`;
  const qrDataUrl = await generateQRDataURL(qrText);

  // ════════════════════════════════════════════════════════
  // HEADER — République de Djibouti style
  // ════════════════════════════════════════════════════════

  // Top thin orange rule
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, W, 2, 'F');

  // White header area (logo + title block)
  // Left: Guichet Unique logo
  const logoSize = 26;
  const logoY = 6;
  if (mainLogoData) {
    doc.addImage(mainLogoData, 'PNG', ML, logoY, logoSize, logoSize);
  } else {
    // Fallback: draw a circle with "GU"
    doc.setFillColor(...ORANGE);
    doc.circle(ML + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text('GU', ML + logoSize / 2, logoY + logoSize / 2 + 3, { align: 'center' });
  }

  // Right of logo: institution text block (like the reference)
  const txtX = ML + logoSize + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLUE_DARK);
  doc.text('République de Djibouti', txtX, logoY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('Agence Nationale pour la Promotion des Investissements (ANPI)', txtX, logoY + 12);
  doc.text('Guichet Unique de Création d\'Entreprise', txtX, logoY + 17);

  // Big bold title (like "FACTURE DES TIMBRES")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BLUE_DARK);
  doc.text('REÇU DE PAIEMENT', txtX, logoY + 24);

  // Horizontal separator under header
  const sepY = logoY + logoSize + 5;
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.8);
  doc.line(ML, sepY, W - MR, sepY);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.line(ML, sepY + 0.9, W - MR, sepY + 0.9);

  let y = sepY + 8;

  // ════════════════════════════════════════════════════════
  // RECEIPT NUMBER — centred, prominent (like the reference)
  // ════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('N° REÇU', W / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BLUE_DARK);
  doc.text(receiptNumber, W / 2, y, { align: 'center' });
  y += 7;

  // ════════════════════════════════════════════════════════
  // INFO BLOCK — light bordered box (Date, Société, Mode, Statut)
  // ════════════════════════════════════════════════════════
  const infoBoxH = 28;
  doc.setFillColor(...LIGHT_GRAY);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, infoBoxH, 2, 2, 'FD');

  const col1X = ML + 5;
  const col2X = ML + CW / 2 + 5;
  const infoY = y + 7;

  // Column 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('DATE', col1X, infoY - 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(date, col1X, infoY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('SOCIÉTÉ', col1X, infoY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(companyName || '—', col1X, infoY + 14, { maxWidth: CW / 2 - 8 });

  // Divider in middle
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(ML + CW / 2, y + 4, ML + CW / 2, y + infoBoxH - 4);

  // Column 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('MODE DE PAIEMENT', col2X, infoY - 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text('Meras Payment Gateway', col2X, infoY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('DEMANDEUR', col2X, infoY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(applicantName || '—', col2X, infoY + 14, { maxWidth: CW / 2 - 8 });

  // Status badge (top-right of box)
  const badgeX = W - MR - 32;
  const badgeY = y + 3;
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(134, 239, 172);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, badgeY, 30, 7, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GREEN_OK);
  doc.text('✓  PAYÉ', badgeX + 15, badgeY + 4.8, { align: 'center' });

  y += infoBoxH + 8;

  // ════════════════════════════════════════════════════════
  // FEE TABLE — matches reference layout
  // ════════════════════════════════════════════════════════

  // Table header row (dark blue like reference)
  const cols = { label: 0, desc: 0.4, qty: 0.7, pu: 0.82, total: 1 };
  const colW = CW;
  const THH = 8;

  doc.setFillColor(...BLUE_MED);
  doc.rect(ML, y, CW, THH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text('TYPE DE FRAIS', ML + 4, y + 5.5);
  doc.text('DESCRIPTION', ML + CW * 0.42, y + 5.5);
  doc.text('MONTANT (DJF)', W - MR - 4, y + 5.5, { align: 'right' });
  y += THH;

  const feeRows = [
    { label: 'Droits de patente', desc: `Secteur : ${secteur || 'Activité générale'}`, amount: patenteAmount },
    { label: 'Frais ODPIC', desc: 'Enregistrement Registre du Commerce', amount: odpicAmount },
    { label: 'Frais de statuts', desc: 'Rédaction & enregistrement des statuts', amount: statusFeesAmount },
  ];
  if (tierSurcharge > 0) {
    feeRows.push({ label: `Traitement ${tierLabel}`, desc: `Délai : ${tierDelay}`, amount: tierSurcharge });
  }

  feeRows.forEach(({ label, desc, amount: amt }, i) => {
    const rh = 11;
    const ry = y + i * rh;
    doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(ML, ry, CW, rh, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(ML, ry + rh, ML + CW, ry + rh);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    doc.text(label, ML + 4, ry + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(desc, ML + CW * 0.42, ry + 7, { maxWidth: CW * 0.38 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(Number(amt || 0).toLocaleString('fr-FR'), W - MR - 4, ry + 7, { align: 'right' });
  });

  y += feeRows.length * 11;

  // Total row (dark blue, large amount — matches reference "MONTANT TOTAL")
  const totalRowH = 16;
  doc.setFillColor(...BLUE_MED);
  doc.rect(ML, y, CW, totalRowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text('NOMBRE DE FRAIS', ML + 5, y + 5.5);
  doc.setFontSize(9);
  doc.text(`${feeRows.length} poste${feeRows.length > 1 ? 's' : ''}`, ML + 5, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 220, 150);
  doc.text('MONTANT TOTAL', W - MR - 4, y + 5.5, { align: 'right' });
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text(`${Number(amount).toLocaleString('fr-FR')} DJF`, W - MR - 4, y + 12.5, { align: 'right' });
  y += totalRowH + 6;

  // ════════════════════════════════════════════════════════
  // "Arrêté la présente somme" line  (exact reference style)
  // ════════════════════════════════════════════════════════
  const amountWords = capitalize(numberToFrench(Math.round(amount)));
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, 10, 1, 1, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const arresteText = `Arrêté la présente somme à : `;
  doc.text(arresteText, ML + 4, y + 6.5);
  const arresteW = doc.getTextWidth(arresteText);
  doc.setFont('helvetica', 'bold');
  doc.text(`${amountWords} francs de Djibouti`, ML + 4 + arresteW, y + 6.5, { maxWidth: CW - arresteW - 8 });
  y += 16;

  // ════════════════════════════════════════════════════════
  // SIGNATURE + QR SIDE BY SIDE  (matches reference layout)
  // ════════════════════════════════════════════════════════
  const sigW = CW * 0.45;
  const qrW  = CW * 0.35;
  const sigH = 38;

  // Signature area (right-aligned like reference)
  const sigX = W - MR - sigW;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(sigX, y, sigW, sigH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text('Signature & Cachet ANPI', sigX + sigW / 2, y + 7, { align: 'center' });
  doc.text('Guichet Unique', sigX + sigW / 2, y + 12, { align: 'center' });

  // Circle stamp (like reference DGI stamp)
  const stampCX = sigX + sigW / 2;
  const stampCY = y + 26;
  const stampR  = 10;
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.8);
  doc.circle(stampCX, stampCY, stampR, 'S');
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.4);
  doc.circle(stampCX, stampCY, stampR - 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(...BLUE_DARK);
  doc.text('GUICHET UNIQUE', stampCX, stampCY - 3, { align: 'center' });
  doc.text('ANPI DJIBOUTI', stampCX, stampCY, { align: 'center' });
  doc.setFontSize(4);
  doc.text('République de Djibouti', stampCX, stampCY + 3.5, { align: 'center' });
  // Orange star in center of stamp
  doc.setFillColor(...ORANGE);
  doc.circle(stampCX, stampCY + 7, 1.2, 'F');

  // QR code (left of signature)
  if (qrDataUrl) {
    const qrSize = 28;
    const qrX = ML;
    doc.addImage(qrDataUrl, 'PNG', qrX, y + 5, qrSize, qrSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('Scanner pour vérifier', qrX + qrSize / 2, y + 35, { align: 'center' });
    doc.text('l\'authenticité du reçu', qrX + qrSize / 2, y + 39, { align: 'center' });
  }

  // Transaction ref (middle area)
  const txMidX = ML + 35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('Réf. Transaction', txMidX, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text(transactionId || 'N/A', txMidX, y + 15, { maxWidth: sigX - txMidX - 5 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('Envelope ID', txMidX, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  doc.text(envelopeId ? envelopeId.substring(0, 24) + '…' : '—', txMidX, y + 27, { maxWidth: sigX - txMidX - 5 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('Formule', txMidX, y + 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text(`${tierLabel} — ${tierDelay}`, txMidX, y + 39, { maxWidth: sigX - txMidX - 5 });

  y += sigH + 10;

  // ════════════════════════════════════════════════════════
  // PARTNER LOGOS ROW  (small icons across the page)
  // ════════════════════════════════════════════════════════
  const partnerSectionY = y;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(ML, partnerSectionY, W - MR, partnerSectionY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('NOS PARTENAIRES', W / 2, partnerSectionY + 5, { align: 'center' });

  const logoIconH = 12;
  const logoIconW = 20;
  const totalLogos = partnerData.length;
  const logoSpacing = CW / totalLogos;

  partnerData.forEach((imgData, i) => {
    const lx = ML + i * logoSpacing + (logoSpacing - logoIconW) / 2;
    const ly = partnerSectionY + 7;
    if (imgData) {
      try {
        doc.addImage(imgData, 'PNG', lx, ly, logoIconW, logoIconH);
      } catch {
        doc.setFillColor(...BORDER);
        doc.circle(lx + logoIconW / 2, ly + logoIconH / 2, 4, 'F');
      }
    } else {
      doc.setFillColor(...BORDER);
      doc.circle(lx + logoIconW / 2, ly + logoIconH / 2, 4, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(...MUTED);
    doc.text(PARTNER_LOGOS[i]?.name || '', lx + logoIconW / 2, ly + logoIconH + 3.5, { align: 'center' });
  });

  // ════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════
  // Top blue rule
  doc.setDrawColor(...BLUE_DARK);
  doc.setLineWidth(0.6);
  doc.line(ML, H - 22, W - MR, H - 22);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.3);
  doc.line(ML, H - 21.3, W - MR, H - 21.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Ministère délégué chargé du Commerce  —  Agence Nationale pour la Promotion des Investissements (ANPI)',
    W / 2, H - 16, { align: 'center' }
  );
  doc.setFontSize(6.5);
  doc.text(
    'Boulevard de la République, Djibouti  |  Tél : +253 21 33 34 00  |  www.guichet-unique-djib.com',
    W / 2, H - 11, { align: 'center' }
  );
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('République de Djibouti', W / 2, H - 6, { align: 'center' });

  // Bottom orange stripe
  doc.setFillColor(...ORANGE);
  doc.rect(0, H - 3, W, 3, 'F');

  doc.save(`recu-paiement-${receiptNumber}.pdf`);
  return receiptNumber;
}