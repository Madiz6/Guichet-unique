import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { declaration_id } = body;
    if (!declaration_id) return Response.json({ error: 'Missing declaration_id' }, { status: 400 });

    // Fetch all needed data in parallel
    const [declarations, companies, allEmployees, allCycles] = await Promise.all([
      base44.asServiceRole.entities.Declaration.filter({ id: declaration_id }),
      base44.asServiceRole.entities.Company.list(),
      base44.asServiceRole.entities.Employee.list(),
      base44.asServiceRole.entities.PayrollCycle.list(),
    ]);

    const declaration = declarations[0];
    if (!declaration) return Response.json({ error: 'Declaration not found' }, { status: 404 });

    const company = companies[0] || {};

    // Find related payroll cycle for per-employee data
    const cycle = allCycles.find(c => c.id === declaration.payroll_cycle_id) || {};

    // Filter employees in this declaration
    const employees = (declaration.employee_ids || [])
      .map(id => allEmployees.find(e => e.id === id))
      .filter(Boolean);

    // ─── INLINE PAYROLL CALCULATION (mirrors DjiboutiCalculator) ───────────────
    const RETRAITE_CAP = 400000;

    const getRates = (regime) => {
      if (regime === 'Zone Franche') return { empRetraite: 0.04, empAmu: 0.02, patRetraite: 0.04, patAt: 0.012, patFam: 0, patAmu: 0.05 };
      if (regime === 'Fonctionnaire') return { empRetraite: 0.06, empAmu: 0.02, patRetraite: 0.14, patAt: 0, patFam: 0, patAmu: 0.05 };
      if (regime === 'FNP')           return { empRetraite: 0.07, empAmu: 0.02, patRetraite: 0.15, patAt: 0, patFam: 0, patAmu: 0.05 };
      if (regime === 'Gouvernement')  return { empRetraite: 0.17, empAmu: 0.02, patRetraite: 0.19, patAt: 0, patFam: 0, patAmu: 0.05 };
      if (regime === 'Indépendant')   return { empRetraite: 0, empAmu: 0, patRetraite: 0, patAt: 0, patFam: 0, patAmu: 0.07 };
      // Général (default)
      return { empRetraite: 0.04, empAmu: 0.02, patRetraite: 0.04, patAt: 0.012, patFam: 0.055, patAmu: 0.05 };
    };

    const ITS_TABLE = [
      [0,4999,0],[5000,9999,100],[10000,14999,200],[15000,19999,300],[20000,24999,400],
      [25000,29999,500],[30000,34999,1100],[35000,39999,1700],[40000,44999,2300],
      [45000,49999,2900],[50000,54999,3650],[55000,59999,4400],[60000,64999,5150],
      [65000,69999,5900],[70000,74999,6650],[75000,79999,7400],[80000,84999,8150],
      [85000,89999,8900],[90000,94999,9650],[95000,99999,10400],[100000,104999,11150],
      [105000,109999,11900],[110000,114999,12650],[115000,119999,13400],[120000,124999,14150],
      [125000,129999,14900],[130000,134999,15650],[135000,139999,16400],[140000,144999,17150],
      [145000,149999,17900],[150000,154999,18650],[155000,159999,19400],[160000,164999,20150],
      [165000,169999,20900],[170000,174999,21650],[175000,179999,22400],[180000,184999,23150],
      [185000,189999,23900],[190000,194999,24650],[195000,199999,25400],[200000,Infinity,26150]
    ];
    const calcITS = (n) => { const b = ITS_TABLE.find(([mn,mx]) => n >= mn && n <= mx); return b ? b[2] : 26150; };
    const calcAnciennete = (base, yrs, mos = 0) => {
      const t = yrs + mos / 12;
      const pct = t < 2 ? 0.04 : t < 4.5 ? 0.08 : t < 7.5 ? 0.12 : t < 10.5 ? 0.16 : 0.20;
      return Math.round(base * pct);
    };

    const calcEmployee = (emp) => {
      const absences = cycle.employee_absences?.[emp.id] || 0;
      const base = emp.salaire_base || 0;
      const anc = emp.prime_anciennete_auto !== false
        ? calcAnciennete(base, emp.anciennete_annees || 0, emp.anciennete_mois || 0)
        : (emp.prime_anciennete || 0);
      const primes = anc + (emp.prime_fonction||0) + (emp.prime_logement||0) +
        (emp.prime_transport||0) + (emp.prime_sujetion||0) + (emp.prime_rendement||0) +
        (emp.autres_primes||0) + (emp.primes_personnalisees||[]).reduce((s,p)=>s+(p.montant||0),0);
      const gross = Math.max(0, base + primes - absences);
      const regime = emp.regime_cnss || 'Général';
      const r = getRates(regime);
      const retBase = Math.min(gross, RETRAITE_CAP);
      const cnssEmp = Math.round(retBase * r.empRetraite) + Math.round(gross * r.empAmu);
      const cnssPat = Math.round(retBase * r.patRetraite) + Math.round(gross * r.patAt) +
                      Math.round(gross * r.patFam) + Math.round(gross * r.patAmu);
      const netImp = Math.max(0, gross - cnssEmp);
      const its = calcITS(netImp);
      return { gross, cnssEmp, cnssPat, its, regime };
    };

    // Build rows
    const rows = employees.map(emp => {
      const c = calcEmployee(emp);
      return {
        nom: `${emp.nom || ''} ${emp.prenom || ''}`.trim(),
        matricule_cnss: emp.matricule_cnss || '',
        fonction: emp.fonction || '',
        date_embauche: emp.date_embauche || '',
        date_naissance: emp.date_naissance || '',
        nationalite: emp.nationalite || '',
        regime: c.regime,
        salaire_base: emp.salaire_base || 0,
        gross: c.gross,
        cnssEmp: c.cnssEmp,
        cnssPat: c.cnssPat,
        totalCnss: c.cnssEmp + c.cnssPat,
        its: c.its,
      };
    });

    const totalGross    = rows.reduce((s, r) => s + r.gross, 0);
    const totalCnssEmp  = rows.reduce((s, r) => s + r.cnssEmp, 0);
    const totalCnssPat  = rows.reduce((s, r) => s + r.cnssPat, 0);
    const totalCnss     = rows.reduce((s, r) => s + r.totalCnss, 0);
    const totalITS      = rows.reduce((s, r) => s + r.its, 0);

    // ─── BUILD HTML ───────────────────────────────────────────────────────────────
    const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
    const fmtDate = (d) => {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
    };

    // Parse période for display  e.g. "janvier 2025"
    const periode = declaration.periode || '';
    const [periodeMonth, periodeYear] = periode.split(' ');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bordereau CNSS - ${periode}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { font-size: 8pt; color: #000; background: #fff; }

  /* ── Header 3-col ── */
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
  .header-left img { height: 48px; }
  .header-center { text-align: center; flex: 1; padding: 0 10px; }
  .header-center .republic { font-size: 10pt; font-weight: bold; letter-spacing: 0.5px; }
  .header-center .sub { font-size: 7.5pt; }
  .header-center .ministry { font-size: 7.5pt; margin-top: 3px; }
  .header-right { text-align: right; direction: rtl; font-size: 7.5pt; line-height: 1.7; width: 130px; }

  .doc-title { text-align: center; font-size: 11pt; font-weight: bold; text-decoration: underline; margin: 6px 0 4px; letter-spacing: 0.5px; }

  /* ── Company info block ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 16px; margin-bottom: 4px; font-size: 7.5pt; border: 1px solid #888; padding: 4px 6px; }
  .info-row { display: flex; gap: 4px; }
  .info-label { font-weight: bold; white-space: nowrap; }

  /* ── Période + lieu ── */
  .periode-row { display: flex; justify-content: space-between; font-size: 7.5pt; margin-bottom: 4px; }
  .periode-row span { display: flex; gap: 4px; align-items: center; }
  .dotline { border-bottom: 1px solid #000; min-width: 60px; display: inline-block; }

  /* ── Main table ── */
  table { width: 100%; border-collapse: collapse; font-size: 7pt; }
  th { background: #d0d0d0; border: 1px solid #555; padding: 2px 3px; text-align: center; font-size: 6.5pt; vertical-align: middle; line-height: 1.3; }
  td { border: 1px solid #888; padding: 2px 3px; text-align: center; vertical-align: middle; }
  td.left { text-align: left; }
  td.num { text-align: right; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .total-row td { background: #e0e0e0; font-weight: bold; }
  .no-col { width: 22px; }

  /* ── Footer attestation ── */
  .attestation { font-size: 7.5pt; margin-top: 6px; font-style: italic; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 8px; font-size: 7.5pt; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #000; width: 120px; margin: 20px auto 2px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3e5141d4077e1d8eef84e/9f55d1615_Logo-75-x-21-pixels-couleur-3-1-1.png" alt="CNSS" />
  </div>
  <div class="header-center">
    <div class="republic">REPUBLIQUE DE DJIBOUTI</div>
    <div class="sub">Unité - Egalité - Paix</div>
    <div style="border-bottom:1px solid #000;width:80px;margin:2px auto;"></div>
    <div class="ministry">Ministère du Travail chargé de la<br>Réforme de l'Administration</div>
  </div>
  <div class="header-right">
    <div style="font-weight:bold;">جمهورية جيبوتي</div>
    <div>وحدة ـ مساواة ـ سلام</div>
    <div style="border-bottom:1px solid #000;width:60px;margin:2px 0 2px auto;"></div>
    <div>وزارة العمل والادماج<br>والتدريب المهني</div>
    <div style="border-bottom:1px solid #000;width:60px;margin:2px 0 2px auto;"></div>
    <div style="font-weight:bold;">لصندوق الوطني للضمان الاجتماعي</div>
  </div>
</div>

<div class="doc-title">RELEVÉ NOMINATIF DES SALAIRES ET DÉCLARATION DES SALAIRES PERÇUS</div>

<!-- COMPANY INFO -->
<div class="info-grid">
  <div class="info-row"><span class="info-label">Désignation de l'entreprise :</span> <span>${company.nom_entreprise || ''}</span></div>
  <div class="info-row"><span class="info-label">NIF :</span> <span>${company.nif || ''}</span></div>
  <div class="info-row"><span class="info-label">N° CNSS :</span> <span>${company.numero_affiliation || ''}</span></div>
  <div class="info-row"><span class="info-label">Nom ou raison sociale :</span> <span>${company.raison_sociale || company.nom_entreprise || ''}</span></div>
  <div class="info-row"><span class="info-label">Adresse :</span> <span>${company.adresse || ''}</span></div>
  <div class="info-row"><span class="info-label">BP :</span> <span>${company.bp || ''} &nbsp;&nbsp; <strong>Tél :</strong> ${company.telephone || ''}</span></div>
  <div class="info-row"><span class="info-label">Nom du gérant :</span> <span>${company.signatory_payslip_name || ''}</span></div>
  <div class="info-row"><span class="info-label">Email :</span> <span>${company.email || ''}</span></div>
  <div class="info-row"><span class="info-label">Activité :</span> <span>${company.activite || ''}</span></div>
</div>

<!-- PÉRIODE -->
<div class="periode-row">
  <span>PÉRIODE DE VERSEMENT : du <span class="dotline">&nbsp;01&nbsp;</span> au <span class="dotline">&nbsp;${new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate()}&nbsp;</span> &nbsp;<strong>${periode.toUpperCase()}</strong></span>
  <span>Djibouti, le <span class="dotline">&nbsp;${fmtDate(new Date().toISOString().split('T')[0])}&nbsp;</span></span>
</div>

<!-- MAIN TABLE -->
<table>
  <thead>
    <tr>
      <th class="no-col">N°</th>
      <th style="width:130px;">NOM et PRÉNOM<br>du salarié</th>
      <th style="width:70px;">Matricule<br>CNSS</th>
      <th style="width:55px;">Date<br>embauche</th>
      <th style="width:55px;">Date de<br>naissance</th>
      <th style="width:55px;">Nationalité</th>
      <th style="width:60px;">Emploi<br>occupé</th>
      <th style="width:55px;">Régime<br>CNSS</th>
      <th style="width:65px;">Salaire<br>de base</th>
      <th style="width:65px;">Salaire brut<br>mensuel</th>
      <th style="width:60px;">Part<br>Salariale<br>CNSS</th>
      <th style="width:60px;">Part<br>Patronale<br>CNSS</th>
      <th style="width:65px;">Total<br>CNSS</th>
      <th style="width:60px;">ITS</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="left">${r.nom}</td>
      <td>${r.matricule_cnss}</td>
      <td>${fmtDate(r.date_embauche)}</td>
      <td>${fmtDate(r.date_naissance)}</td>
      <td>${r.nationalite}</td>
      <td class="left">${r.fonction}</td>
      <td>${r.regime}</td>
      <td class="num">${fmt(r.salaire_base)}</td>
      <td class="num">${fmt(r.gross)}</td>
      <td class="num">${fmt(r.cnssEmp)}</td>
      <td class="num">${fmt(r.cnssPat)}</td>
      <td class="num">${fmt(r.totalCnss)}</td>
      <td class="num">${fmt(r.its)}</td>
    </tr>`).join('')}
    <!-- Empty rows to fill up to at least 10 visible rows -->
    ${Array.from({length: Math.max(0, 8 - rows.length)}).map(() => `
    <tr>
      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`).join('')}
    <!-- TOTALS -->
    <tr class="total-row">
      <td colspan="8" style="text-align:right; padding-right:6px;">TOTAUX (${rows.length} salarié${rows.length > 1 ? 's' : ''})</td>
      <td class="num">${fmt(rows.reduce((s,r)=>s+r.salaire_base,0))}</td>
      <td class="num">${fmt(totalGross)}</td>
      <td class="num">${fmt(totalCnssEmp)}</td>
      <td class="num">${fmt(totalCnssPat)}</td>
      <td class="num">${fmt(totalCnss)}</td>
      <td class="num">${fmt(totalITS)}</td>
    </tr>
  </tbody>
</table>

<!-- ATTESTATION -->
<div class="attestation">
  L'employeur atteste sous sa responsabilité l'exactitude des renseignements portés sur le présent relevé.
</div>

<!-- RÉCAP + SIGNATURE -->
<div class="sig-row">
  <div>
    <table style="font-size:7.5pt; border-collapse:collapse; width:260px;">
      <tr><td style="border:1px solid #888; padding:2px 6px; font-weight:bold;">Masse salariale brute</td>
          <td style="border:1px solid #888; padding:2px 6px; text-align:right;">${fmt(totalGross)} DJF</td></tr>
      <tr><td style="border:1px solid #888; padding:2px 6px;">Part salariale CNSS (total)</td>
          <td style="border:1px solid #888; padding:2px 6px; text-align:right;">${fmt(totalCnssEmp)} DJF</td></tr>
      <tr><td style="border:1px solid #888; padding:2px 6px;">Part patronale CNSS (total)</td>
          <td style="border:1px solid #888; padding:2px 6px; text-align:right;">${fmt(totalCnssPat)} DJF</td></tr>
      <tr><td style="border:1px solid #888; padding:2px 6px; font-weight:bold;">Total CNSS</td>
          <td style="border:1px solid #888; padding:2px 6px; text-align:right; font-weight:bold;">${fmt(totalCnss)} DJF</td></tr>
      <tr><td style="border:1px solid #888; padding:2px 6px;">Total ITS</td>
          <td style="border:1px solid #888; padding:2px 6px; text-align:right;">${fmt(totalITS)} DJF</td></tr>
      <tr style="background:#d0d0d0;"><td style="border:1px solid #555; padding:2px 6px; font-weight:bold;">TOTAL À VERSER</td>
          <td style="border:1px solid #555; padding:2px 6px; text-align:right; font-weight:bold;">${fmt(totalCnss + totalITS)} DJF</td></tr>
      ${declaration.penalite > 0 ? `<tr><td style="border:1px solid #888; padding:2px 6px; color:#c00;">Pénalités / Majorations</td>
          <td style="border:1px solid #888; padding:2px 6px; text-align:right; color:#c00;">${fmt(declaration.penalite)} DJF</td></tr>` : ''}
    </table>
  </div>
  <div class="sig-block">
    <div style="font-size:7.5pt;">Signature et cachet de l'employeur</div>
    <div class="sig-line"></div>
    <div style="font-size:7pt;">${company.signatory_payslip_name || ''}</div>
    <div style="font-size:7pt;">${company.signatory_payslip_position || ''}</div>
  </div>
</div>

</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename=Bordereau_CNSS_${periode.replace(/\s+/g,'_')}.html`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});