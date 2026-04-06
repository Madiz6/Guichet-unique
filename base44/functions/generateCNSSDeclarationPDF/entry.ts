import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { declaration_id } = body;
    if (!declaration_id) return Response.json({ error: 'Missing declaration_id' }, { status: 400 });

    const [declarations, companies] = await Promise.all([
      base44.asServiceRole.entities.Declaration.filter({ id: declaration_id }),
      base44.asServiceRole.entities.Company.list(),
    ]);

    const declaration = declarations[0];
    if (!declaration) return Response.json({ error: 'Declaration not found' }, { status: 404 });

    const company = companies[0] || {};

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR') + ' - ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const fmt = (n) => n != null ? Math.round(n).toLocaleString('fr-FR') : '0';

    const periode = declaration.periode || declaration.mois_annee || 'N/A';
    const dateLimite = declaration.date_limite
      ? new Date(declaration.date_limite).toLocaleDateString('fr-FR')
      : '';
    const dateReglement = declaration.payment_date || declaration.created_date
      ? new Date(declaration.payment_date || declaration.created_date).toLocaleDateString('fr-FR')
      : 'N/A';

    const isPaid = declaration.statut === 'Payé';
    const resteAPayer = isPaid ? 0 : (declaration.total || 0);

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Déclaration CNSS - ${periode}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { font-size: 9pt; color: #1a1a2e; background: #fff; }

  /* ── Header ── */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 6px; border-bottom: 2px solid #0044cc; margin-bottom: 8px; }
  .header-logo img { height: 64px; }
  .header-center { text-align: center; flex: 1; padding: 0 20px; }
  .republic { font-size: 13pt; font-weight: bold; color: #0044cc; letter-spacing: 0.5px; }
  .republic-sub { font-size: 8pt; color: #444; margin-top: 2px; }
  .ministry { font-size: 8pt; color: #444; margin-top: 4px; line-height: 1.5; }
  .header-qr { text-align: center; width: 80px; }
  .qr-box { border: 2px solid #0044cc; width: 60px; height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; }
  .qr-box span { font-size: 7pt; font-weight: bold; color: #0044cc; }
  .qr-box small { font-size: 5.5pt; color: #666; margin-top: 2px; }

  /* ── Receipt bar ── */
  .receipt-bar { background: #0044cc; color: #fff; padding: 5px 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-radius: 2px; }
  .receipt-bar .left { font-size: 8.5pt; }
  .receipt-bar .right { font-size: 9pt; font-weight: bold; }

  /* ── Info grid ── */
  .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #bbb; margin-bottom: 10px; }
  .info-cell { padding: 5px 10px; border-bottom: 1px solid #e0e0e0; font-size: 9pt; display: flex; gap: 6px; }
  .info-cell:nth-child(odd) { border-right: 1px solid #e0e0e0; }
  .info-cell b { white-space: nowrap; color: #333; }
  .info-cell .val { color: #1a1a2e; }
  .info-cell .val.red { color: #cc2200; font-weight: bold; }
  .info-cell .val.green { color: #007700; font-weight: bold; }

  /* ── Table ── */
  .section-title { font-size: 9.5pt; font-weight: bold; color: #0044cc; border-bottom: 1px solid #0044cc; padding-bottom: 3px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
  thead tr { background: #e8eef8; }
  th { border: 1px solid #aab; padding: 5px 6px; text-align: center; font-size: 8pt; vertical-align: middle; color: #222; line-height: 1.4; }
  td { border: 1px solid #ccd; padding: 5px 6px; text-align: center; vertical-align: middle; }
  td.left { text-align: left; }
  td.right { text-align: right; }
  tr.total-row td { background: #e8eef8; font-weight: bold; }

  /* ── Financial summary ── */
  .recap-box { border: 1.5px solid #0044cc; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; background: #f4f7ff; }
  .recap-box .recap-title { font-size: 11pt; font-weight: bold; color: #0044cc; margin-bottom: 8px; }
  .recap-line { display: flex; justify-content: space-between; font-size: 9.5pt; padding: 3px 0; border-bottom: 1px solid #d8e2f8; }
  .recap-line:last-child { border-bottom: none; }
  .recap-line .label { color: #333; }
  .recap-line .amount { font-weight: bold; color: #1a1a2e; }
  .total-row-main { background: #0044cc; color: #fff; border-radius: 3px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
  .total-row-main .t-label { font-size: 11pt; font-weight: bold; }
  .total-row-main .t-amount { font-size: 14pt; font-weight: bold; }

  /* ── Signatures ── */
  .sig-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; }
  .sig-left { font-size: 9pt; }
  .sig-right { text-align: center; }
  .sig-box { border: 1px solid #bbb; width: 150px; height: 60px; display: flex; align-items: center; justify-content: center; margin-top: 4px; }
  .sig-box span { font-size: 7.5pt; font-style: italic; color: #999; }

  /* ── Footer ── */
  .footer { background: #0044cc; color: #fff; text-align: center; padding: 6px; font-size: 7.5pt; margin-top: 14px; border-radius: 2px; }

  /* ── Watermark ── */
  .watermark { position: fixed; top: 40%; left: 15%; font-size: 72pt; font-weight: bold; color: rgba(200, 0, 0, 0.08); transform: rotate(-35deg); z-index: 0; pointer-events: none; white-space: nowrap; }
</style>
</head>
<body>

${!isPaid ? '<div class="watermark">NON PAYÉ</div>' : ''}

<!-- HEADER -->
<div class="header">
  <div class="header-logo">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3e5141d4077e1d8eef84e/249ba593d_Logo-75-x-21-pixels-couleur-3-1-1.png" alt="CNSS Logo" />
  </div>
  <div class="header-center">
    <div class="republic">REPUBLIQUE DE DJIBOUTI</div>
    <div class="republic-sub">Unité - Egalité - Paix</div>
    <div class="ministry">Ministère du Travail chargé de la<br>Réforme de l'Administration</div>
  </div>
  <div class="header-qr">
    <div class="qr-box">
      <span>QR CODE</span>
      <small>Scan pour vérifier</small>
    </div>
  </div>
</div>

<!-- RECEIPT BAR -->
<div class="receipt-bar">
  <div class="left">
    <strong>N° de caisse : Recettes des Cotisations 6</strong><br>
    <span style="font-size:7.5pt; font-weight:normal;">Djibouti, le : ${dateStr}</span>
  </div>
  <div class="right">REÇU N° : ${declaration.numero_cotisation || (company.numero_affiliation || '') + '-' + (periode.replace(' ', '') || '')}</div>
</div>

<!-- INFO GRID -->
<div class="info-section">
  <div class="info-cell"><b>N° Employeur :</b> <span class="val">${company.numero_affiliation || 'N/A'}</span></div>
  <div class="info-cell"><b>Cotisation Total Due :</b> <span class="val red">${fmt(declaration.total)} DJF</span></div>

  <div class="info-cell"><b>Nom ou Raison sociale :</b> <span class="val">${company.nom_entreprise || 'N/A'}</span></div>
  <div class="info-cell"><b>Règlement :</b> <span class="val ${isPaid ? 'green' : 'red'}">${fmt(declaration.total)} DJF</span></div>

  <div class="info-cell"><b>Date de règlement :</b> <span class="val">${dateReglement}</span></div>
  <div class="info-cell"><b>Référence de paiement :</b> <span class="val">${declaration.transaction_id || declaration.numero_cotisation || 'N/A'}</span></div>

  <div class="info-cell"><b>Mode de paiement :</b> <span class="val">${isPaid ? 'Payé' : 'En attente'}</span></div>
  <div class="info-cell"><b>Compte de contrepartie :</b> <span class="val">5309000000</span></div>

  <div class="info-cell"><b>Type de compte :</b> <span class="val">Ledger</span></div>
  <div class="info-cell"><b>Reste à Payer :</b> <span class="val ${isPaid ? 'green' : 'red'}">${fmt(resteAPayer)} DJF</span></div>
</div>

<!-- DETAIL TABLE -->
<div class="section-title">Détail des cotisations</div>
<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Période</th>
      <th>CNSS</th>
      <th>ITS</th>
      <th>Nb<br>Salariés</th>
      <th>M. Salariale<br>de Base</th>
      <th>M. Salariale<br>Brut</th>
      <th>Echéance<br>N° Appel</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="left">Cotisation</td>
      <td>${periode}</td>
      <td class="right">${fmt(declaration.total_cnss)}</td>
      <td>—</td>
      <td>${declaration.nombre_employes || 0}</td>
      <td class="right">${fmt(declaration.masse_salariale)}</td>
      <td class="right">${fmt(declaration.masse_salariale)}</td>
      <td>${dateLimite}</td>
    </tr>
    <tr>
      <td class="left">ITS</td>
      <td>${periode}</td>
      <td>—</td>
      <td class="right">${fmt(declaration.total_its)}</td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
      <td>${dateLimite}</td>
    </tr>
    <tr class="total-row">
      <td class="left"><strong>Somme</strong></td>
      <td></td>
      <td class="right">${fmt(declaration.total_cnss)} DJF</td>
      <td class="right">${fmt(declaration.total_its)} DJF</td>
      <td></td>
      <td class="right">${fmt(declaration.masse_salariale)} DJF</td>
      <td class="right">${fmt(declaration.masse_salariale)} DJF</td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- FINANCIAL RECAP -->
<div class="recap-box">
  <div class="recap-title">RÉCAPITULATIF FINANCIER</div>
  <div class="recap-line">
    <span class="label">Total CNSS (Salarié + Patronal) :</span>
    <span class="amount">${fmt(declaration.total_cnss)} DJF</span>
  </div>
  <div class="recap-line">
    <span class="label">Total ITS (Impôt sur les Traitements et Salaires) :</span>
    <span class="amount">${fmt(declaration.total_its)} DJF</span>
  </div>
  ${(declaration.penalite > 0) ? `
  <div class="recap-line">
    <span class="label" style="color:#cc2200;">Pénalités / Majorations :</span>
    <span class="amount" style="color:#cc2200;">${fmt(declaration.penalite)} DJF</span>
  </div>` : ''}
  <div class="total-row-main">
    <span class="t-label">MONTANT TOTAL À PAYER :</span>
    <span class="t-amount">${fmt(declaration.total)} DJF</span>
  </div>
</div>

<!-- SIGNATURE -->
<div class="sig-section">
  <div class="sig-left">
    <strong>Caissier : ${company.signatory_payslip_name || company.nom_entreprise || 'Administrateur'}</strong>
  </div>
  <div class="sig-right">
    <strong>Visa du caissier</strong>
    <div class="sig-box"><span>Signature et cachet</span></div>
    <div style="font-size:7.5pt; margin-top:4px;">${company.signatory_payslip_name || ''}</div>
    <div style="font-size:7.5pt;">${company.signatory_payslip_position || ''}</div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  ${company.nom_entreprise || 'Paie360'} — Déclaration CNSS générée le ${dateStr}<br>
  Document officiel généré par Paie360 · Conforme aux normes CNSS Djibouti
</div>

</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename=Declaration_CNSS_${periode.replace(/\s+/g, '_')}_${declaration.numero_cotisation || ''}.html`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});