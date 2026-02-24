import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculatePayroll } from './DjiboutiCalculator';
import jsPDF from 'jspdf'; // Import jsPDF library
import toast from 'react-hot-toast'; // Import a toast notification library (assuming react-hot-toast)

const generateHTMLDocument = (htmlContent, filename) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les pop-ups pour générer le document');
    return;
  }
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Trigger print after a short delay to ensure rendering
  setTimeout(() => {
    printWindow.print();
  }, 300);
};

const getCompanyHeader = (company) => {
  return `
    <div style="display: flex; align-items: flex-start; padding: 20px; border-bottom: 2px solid #0066FF; margin-bottom: 30px;">
      ${company.logo_url ? `
        <img src="${company.logo_url}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; margin-right: 20px; border-radius: 8px;" />
      ` : ''}
      <div style="flex: 1;">
        <h2 style="margin: 0; font-size: 20px; color: #0A2540; font-weight: bold;">${company.nom_entreprise || 'Paie360'}</h2>
        <p style="margin: 5px 0; font-size: 12px; color: #425466;">${company.adresse || ''}</p>
        <p style="margin: 5px 0; font-size: 12px; color: #425466;">
          <strong>NIF:</strong> ${company.nif || 'N/A'} | 
          <strong>CNSS:</strong> ${company.numero_affiliation || 'N/A'}
        </p>
        <p style="margin: 5px 0; font-size: 12px; color: #425466;">
          <strong>Tél:</strong> ${company.telephone || 'N/A'} | 
          <strong>Email:</strong> ${company.email || 'N/A'}
        </p>
      </div>
    </div>
  `;
};

const getSignatureSection = (signatory) => {
  if (!signatory || !signatory.name) return '';
  
  return `
    <div style="margin-top: 60px; padding-top: 20px;">
      <p style="font-size: 12px; color: #425466; margin-bottom: 30px;">
        Fait à Djibouti, le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}
      </p>
      <div style="margin-top: 20px;">
        <p style="font-size: 13px; font-weight: bold; color: #0A2540; margin-bottom: 25px;">Le signataire:</p>
        <div style="border-bottom: 2px solid #0A2540; width: 200px; margin-bottom: 8px;"></div>
        <p style="font-size: 13px; color: #0A2540; margin: 5px 0; font-weight: 600;">${signatory.name}</p>
        <p style="font-size: 12px; color: #697586; margin: 5px 0;">${signatory.position}</p>
      </div>
    </div>
  `;
};

export const generatePayslip = async (employee, company, cycle, signatory = null) => {
  const loadingToast = toast.loading('Génération du bulletin en cours...');

  try {
    const absences = cycle?.employee_absences?.[employee.id] || 0;
    const otherDeductions = cycle?.employee_other_deductions?.[employee.id] || 0;
    const cyclePrimes = cycle?.employee_cycle_primes?.[employee.id] || [];
    const holidayStatus = cycle?.employee_holiday_status?.[employee.id] || null;
    const absenceAfterDeductions = cycle?.employee_absence_timing?.[employee.id] || false;
    const otherDeductionFromGross = cycle?.employee_other_deduction_timing?.[employee.id] || false;

    let effectiveAbsencesForGross = 0;
    if (!absenceAfterDeductions) effectiveAbsencesForGross += absences;
    if (otherDeductionFromGross) effectiveAbsencesForGross += otherDeductions;

    const empForCalc = { ...employee, absences_amount: effectiveAbsencesForGross };
    const calc = calculatePayroll(empForCalc, holidayStatus, cyclePrimes);

    let netDeductions = 0;
    if (absenceAfterDeductions) netDeductions += absences;
    if (!otherDeductionFromGross) netDeductions += otherDeductions;
    const finalNet = Math.max(0, calc.netSalary - netDeductions);

    const totalRetenues = calc.cnssEmployee.total + calc.its + (calc.aide || 0) + (calc.retcim || 0) + netDeductions;
    const signatoryName = signatory?.name || company.signatory_payslip_name || 'Directeur RH';
    const signatoryPosition = signatory?.position || company.signatory_payslip_position || 'Directeur des Ressources Humaines';
    const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    const periode = cycle?.periode || format(new Date(), 'MMMM yyyy', { locale: fr });

    const retraiteRate = calc.regime === 'Fonctionnaire' ? '6%' : calc.regime === 'FNP' ? '7%' : calc.regime === 'Gouvernement' ? '17%' : '4%';

    const gainRows = [
      { label: 'Salaire de Base', amount: calc.breakdown.salaire_base },
      calc.breakdown.prime_anciennete > 0 ? { label: "Prime d'Ancienneté", amount: calc.breakdown.prime_anciennete } : null,
      calc.breakdown.prime_fonction > 0 ? { label: 'Prime de Fonction', amount: calc.breakdown.prime_fonction } : null,
      calc.breakdown.prime_logement > 0 ? { label: 'Prime de Logement', amount: calc.breakdown.prime_logement } : null,
      calc.breakdown.prime_transport > 0 ? { label: 'Prime de Transport', amount: calc.breakdown.prime_transport } : null,
      calc.breakdown.prime_sujetion > 0 ? { label: 'Prime de Sujétion', amount: calc.breakdown.prime_sujetion } : null,
      calc.breakdown.prime_rendement > 0 ? { label: 'Prime de Rendement', amount: calc.breakdown.prime_rendement } : null,
      calc.breakdown.autres_primes > 0 ? { label: 'Autres Primes', amount: calc.breakdown.autres_primes } : null,
      calc.breakdown.primes_personnalisees > 0 ? { label: 'Primes Personnalisées', amount: calc.breakdown.primes_personnalisees } : null,
      ...calc.primesBeforeDeductions.map(p => ({ label: p.nom, amount: p.montant })),
      absences > 0 && !absenceAfterDeductions ? { label: 'Absences', amount: -absences, neg: true } : null,
      otherDeductions > 0 && otherDeductionFromGross ? { label: 'Autres Déductions (brut)', amount: -otherDeductions, neg: true } : null,
    ].filter(Boolean);

    const rowHTML = (label, amount, opts = {}) => {
      const color = opts.neg ? '#DC2626' : opts.bold ? '#0A2540' : '#374151';
      const bg = opts.highlight ? (opts.highlightColor || '#f0f4ff') : (opts.alt ? '#F9FAFB' : '#FFFFFF');
      const fw = opts.bold ? '700' : '400';
      return `
        <tr style="background:${bg};">
          <td style="padding:7px 12px; font-size:11pt; color:${color}; font-weight:${fw}; border-bottom:1px solid #E5E7EB;">${label}</td>
          <td style="padding:7px 12px; font-size:11pt; color:${color}; font-weight:${fw}; text-align:right; border-bottom:1px solid #E5E7EB;">${opts.neg ? '-' : ''}${Math.abs(amount).toLocaleString('fr-FR')} DJF</td>
        </tr>`;
    };

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de Paie – ${employee.prenom} ${employee.nom}</title>
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #1a2740; background: #fff; }
    table { width: 100%; border-collapse: collapse; }
    .section-header { background: #0A2540; color: #fff; padding: 6px 12px; font-size: 10pt; font-weight: 700; letter-spacing: 0.5px; }
    .section-header.green { background: #15803D; }
    .section-header.red   { background: #B91C1C; }
    .section-header.orange { background: #C2410C; }
  </style>
</head>
<body>

  <!-- ═══════════ HEADER ═══════════ -->
  <table style="margin-bottom:14px; border-bottom: 3px solid #0066FF; padding-bottom:10px;">
    <tr>
      <td style="width:64px; vertical-align:middle;">
        ${company.logo_url
          ? `<img src="${company.logo_url}" style="width:56px;height:56px;object-fit:contain;border-radius:6px;" />`
          : `<div style="width:56px;height:56px;background:#e8f0fe;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:700;color:#0066FF;">${(company.nom_entreprise||'P').substring(0,2).toUpperCase()}</div>`
        }
      </td>
      <td style="padding-left:14px; vertical-align:middle;">
        <div style="font-size:16pt; font-weight:700; color:#0A2540;">${company.nom_entreprise || 'Paie360'}</div>
        <div style="font-size:9pt; color:#425466; margin-top:2px;">${company.adresse || ''}</div>
        <div style="font-size:9pt; color:#425466;">
          <strong>NIF:</strong> ${company.nif || 'N/A'} &nbsp;|&nbsp; <strong>CNSS:</strong> ${company.numero_affiliation || 'N/A'}
          &nbsp;|&nbsp; <strong>Tél:</strong> ${company.telephone || 'N/A'}
          ${company.email ? `&nbsp;|&nbsp; <strong>Email:</strong> ${company.email}` : ''}
        </div>
      </td>
      <td style="text-align:right; vertical-align:middle;">
        <div style="background:#0066FF; color:#fff; padding:8px 14px; border-radius:6px; display:inline-block;">
          <div style="font-size:13pt; font-weight:700; letter-spacing:1px;">BULLETIN DE PAIE</div>
          <div style="font-size:9.5pt; margin-top:3px;">Période : <strong>${periode}</strong></div>
        </div>
      </td>
    </tr>
  </table>

  <!-- ═══════════ EMPLOYEE INFO ═══════════ -->
  <table style="margin-bottom:12px; border:1px solid #E5E7EB; border-radius:6px; overflow:hidden;">
    <tr>
      <td colspan="4" class="section-header">INFORMATIONS EMPLOYÉ</td>
    </tr>
    <tr style="background:#F8FAFC;">
      <td style="padding:6px 12px; font-size:9.5pt; color:#6B7280; width:18%;">Nom complet</td>
      <td style="padding:6px 12px; font-size:10pt; font-weight:700; color:#0A2540; width:32%;">${employee.prenom} ${employee.nom}</td>
      <td style="padding:6px 12px; font-size:9.5pt; color:#6B7280; width:18%;">Matricule CNSS</td>
      <td style="padding:6px 12px; font-size:10pt; font-weight:600; color:#0A2540; width:32%;">${employee.matricule_cnss || 'N/A'}</td>
    </tr>
    <tr>
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Fonction</td>
      <td style="padding:5px 12px; font-size:10pt; color:#0A2540;">${employee.fonction || 'N/A'}</td>
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Régime CNSS</td>
      <td style="padding:5px 12px; font-size:10pt; color:#0A2540;">${employee.regime_cnss || 'Général'}</td>
    </tr>
    <tr style="background:#F8FAFC;">
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Département</td>
      <td style="padding:5px 12px; font-size:10pt; color:#0A2540;">${employee.departement || 'N/A'}</td>
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Date d'embauche</td>
      <td style="padding:5px 12px; font-size:10pt; color:#0A2540;">${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd/MM/yyyy') : 'N/A'}</td>
    </tr>
    ${employee.NIF || employee.nif ? `
    <tr>
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">NIF</td>
      <td style="padding:5px 12px; font-size:10pt; color:#0A2540;">${employee.NIF || employee.nif || 'N/A'}</td>
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;"></td><td></td>
    </tr>` : ''}
  </table>

  ${calc.holidayNote ? `
  <div style="background:#FEF3C7; border-left:4px solid #F59E0B; padding:8px 12px; margin-bottom:12px; font-size:9.5pt; color:#92400E;">
    ${calc.holidayNote}
  </div>` : ''}

  <!-- ═══════════ GAINS + RETENUES (side by side) ═══════════ -->
  <table style="margin-bottom:0; vertical-align:top;">
    <tr>

      <!-- LEFT: GAINS -->
      <td style="width:50%; vertical-align:top; padding-right:6px;">
        <table style="border:1px solid #E5E7EB; border-radius:6px; overflow:hidden;">
          <tr><td colspan="2" class="section-header green">ÉLÉMENTS DE RÉMUNÉRATION</td></tr>
          ${gainRows.map((r, i) => rowHTML(r.label, r.amount, { alt: i % 2 === 0, neg: r.neg })).join('')}
          ${rowHTML('SALAIRE BRUT', calc.grossSalary, { bold: true, highlight: true, highlightColor: '#DBEAFE' })}
          <tr style="background:#EFF6FF;">
            <td colspan="2" style="padding:5px 12px; font-size:9pt; color:#1E40AF; border-bottom:1px solid #E5E7EB;">
              Net Imposable (Brut – CNSS sal.) : <strong>${calc.netImposable.toLocaleString('fr-FR')} DJF</strong>
            </td>
          </tr>
        </table>
      </td>

      <!-- RIGHT: RETENUES -->
      <td style="width:50%; vertical-align:top; padding-left:6px;">
        <table style="border:1px solid #E5E7EB; border-radius:6px; overflow:hidden;">
          <tr><td colspan="2" class="section-header red">RETENUES</td></tr>
          ${rowHTML(`CNSS Salariale – Retraite (${retraiteRate})`, calc.cnssEmployee.retraite, { alt: true })}
          ${rowHTML('CNSS Salariale – Assurance Maladie (2%)', calc.cnssEmployee.amu)}
          ${rowHTML('Total CNSS Salariale', calc.cnssEmployee.total, { bold: true, alt: true })}
          ${rowHTML('ITS (Impôt sur les Traitements et Salaires)', calc.its)}
          ${calc.aide > 0 ? rowHTML('AIDE', calc.aide, { alt: true }) : ''}
          ${calc.retcim > 0 ? rowHTML('RetCim', calc.retcim) : ''}
          ${absences > 0 && absenceAfterDeductions ? rowHTML('Absences (après cotisations)', absences, { neg: true, alt: true }) : ''}
          ${otherDeductions > 0 && !otherDeductionFromGross ? rowHTML('Autres Déductions', otherDeductions, { neg: true }) : ''}
          ${calc.primesAfterDeductions.map((p, i) => rowHTML(`${p.nom} (après déduc.)`, p.montant, { alt: i % 2 === 0 })).join('')}
          ${rowHTML('TOTAL RETENUES', totalRetenues, { bold: true, highlight: true, highlightColor: '#FEE2E2' })}
        </table>
      </td>
    </tr>
  </table>

  <!-- ═══════════ NET À PAYER ═══════════ -->
  <table style="margin-top:10px; margin-bottom:10px;">
    <tr>
      <td style="background:#0A2540; color:#fff; padding:12px 16px; font-size:13pt; font-weight:700; border-radius:6px 0 0 6px; width:60%;">
        NET À PAYER
      </td>
      <td style="background:#0066FF; color:#fff; padding:12px 16px; font-size:14pt; font-weight:700; text-align:right; border-radius:0 6px 6px 0;">
        ${finalNet.toLocaleString('fr-FR')} DJF
      </td>
    </tr>
  </table>

  <!-- ═══════════ CHARGES PATRONALES + BANQUE ═══════════ -->
  <table style="margin-bottom:12px; border:1px solid #FED7AA; border-radius:6px; overflow:hidden;">
    <tr><td colspan="4" class="section-header orange">CHARGES PATRONALES – RÉGIME ${calc.regime.toUpperCase()}</td></tr>
    <tr style="background:#FFF7ED;">
      ${calc.cnssEmployer.retraite > 0 ? `<td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Retraite</td><td style="padding:5px 12px; font-size:9.5pt; color:#C2410C; font-weight:600;">${calc.cnssEmployer.retraite.toLocaleString('fr-FR')} DJF</td>` : '<td colspan="2"></td>'}
      ${calc.cnssEmployer.accident_travail > 0 ? `<td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Accident de Travail (1.2%)</td><td style="padding:5px 12px; font-size:9.5pt; color:#C2410C; font-weight:600;">${calc.cnssEmployer.accident_travail.toLocaleString('fr-FR')} DJF</td>` : '<td colspan="2"></td>'}
    </tr>
    <tr>
      ${calc.cnssEmployer.allocations_familiales > 0 ? `<td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Prestations Familiales (5.5%)</td><td style="padding:5px 12px; font-size:9.5pt; color:#C2410C; font-weight:600;">${calc.cnssEmployer.allocations_familiales.toLocaleString('fr-FR')} DJF</td>` : '<td colspan="2"></td>'}
      ${calc.cnssEmployer.amu > 0 ? `<td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Assurance Maladie</td><td style="padding:5px 12px; font-size:9.5pt; color:#C2410C; font-weight:600;">${calc.cnssEmployer.amu.toLocaleString('fr-FR')} DJF</td>` : '<td colspan="2"></td>'}
    </tr>
    <tr style="background:#FEF3C7;">
      <td style="padding:6px 12px; font-size:9.5pt; font-weight:700; color:#0A2540;">Total Charges Patronales</td>
      <td style="padding:6px 12px; font-size:9.5pt; font-weight:700; color:#C2410C;">${calc.cnssEmployer.total.toLocaleString('fr-FR')} DJF</td>
      <td style="padding:6px 12px; font-size:9.5pt; font-weight:700; color:#0A2540;">Coût Total Employeur</td>
      <td style="padding:6px 12px; font-size:9.5pt; font-weight:700; color:#C2410C;">${calc.totalCost.toLocaleString('fr-FR')} DJF</td>
    </tr>
    ${(employee.banque || employee.numero_compte) ? `
    <tr style="background:#F8FAFC;">
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">Banque</td>
      <td style="padding:5px 12px; font-size:9.5pt; color:#0A2540; font-weight:600;">${employee.banque || 'N/A'}</td>
      <td style="padding:5px 12px; font-size:9.5pt; color:#6B7280;">N° Compte</td>
      <td style="padding:5px 12px; font-size:9.5pt; color:#0A2540; font-weight:600;">${employee.numero_compte || 'N/A'}</td>
    </tr>` : ''}
  </table>

  <!-- ═══════════ SIGNATURE ═══════════ -->
  <table style="margin-top:16px;">
    <tr>
      <td style="width:55%; font-size:9.5pt; color:#425466; vertical-align:bottom;">
        Fait à Djibouti, le ${today}
      </td>
      <td style="width:45%; text-align:center; vertical-align:bottom;">
        <div style="border-bottom:1.5px solid #0A2540; width:180px; margin:0 auto 6px auto;"></div>
        <div style="font-size:10.5pt; font-weight:700; color:#0A2540;">${signatoryName}</div>
        <div style="font-size:9pt; color:#697586;">${signatoryPosition}</div>
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div style="margin-top:14px; border-top:1px solid #E5E7EB; padding-top:6px; text-align:center; font-size:8pt; color:#9CA3AF; font-style:italic;">
    Ce document est confidentiel — ${company.nom_entreprise || 'Paie360'} • Généré le ${format(new Date(), 'dd/MM/yyyy')}
  </div>

</body>
</html>`;

    toast.dismiss(loadingToast);
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Veuillez autoriser les pop-ups'); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 400);
    toast.success('Bulletin de paie généré avec succès !');

  } catch (error) {
    toast.dismiss(loadingToast);
    toast.error('Erreur lors de la génération du bulletin');
    console.error(error);
  }
};

export const generateWorkAttestation = (employee, company, signatory = null) => {
  const signatoryName = signatory?.name || company.signatory_work_attestation_name || '[NOM DU SIGNATAIRE]';
  const signatoryPosition = signatory?.position || company.signatory_work_attestation_position || '[FONCTION]';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Attestation de Travail - ${employee.prenom} ${employee.nom}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          width: 210mm;
          height: 297mm;
          padding: 14mm 18mm;
          color: #1a2740;
          font-size: 11pt;
          line-height: 1.5;
          position: relative;
          overflow: hidden;
        }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 10px;
          border-bottom: 2.5px solid #0066FF;
          margin-bottom: 18px;
        }
        .header img {
          width: 52px; height: 52px;
          object-fit: contain; border-radius: 6px;
        }
        .header-logo-placeholder {
          width: 52px; height: 52px;
          background: #e8f0fe; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 9pt; color: #0066FF; font-weight: 700; text-align: center;
        }
        .header-info h2 { font-size: 15pt; color: #0A2540; font-weight: 700; }
        .header-info p  { font-size: 8.5pt; color: #425466; margin-top: 2px; }

        /* ── Title ── */
        .doc-title {
          text-align: center;
          font-size: 19pt;
          font-weight: 700;
          color: #0066FF;
          text-decoration: underline;
          text-decoration-color: #0066FF;
          text-decoration-thickness: 2px;
          text-underline-offset: 5px;
          margin: 18px 0 20px;
          letter-spacing: 1px;
        }

        /* ── Body text ── */
        .intro p { margin-bottom: 6px; font-size: 11pt; color: #1a2740; }

        /* ── Employee card ── */
        .employee-card {
          border-left: 4px solid #0066FF;
          background: #f4f7fd;
          border-radius: 4px;
          padding: 10px 16px;
          margin: 14px 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px 20px;
        }
        .employee-card .field { font-size: 10.5pt; color: #1a2740; }
        .employee-card .field span { color: #0066FF; font-weight: 600; }

        /* ── Employment line ── */
        .employment-line { margin: 14px 0 8px; font-size: 11pt; }
        .mention {
          margin-top: 10px;
          font-style: italic;
          color: #425466;
          font-size: 10pt;
        }

        /* ── Signature block ── */
        .signature-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 24px;
        }
        .sig-date { font-size: 10pt; color: #425466; }
        .sig-block { text-align: right; }
        .sig-line {
          width: 160px;
          border-bottom: 1.5px solid #1a2740;
          margin-bottom: 6px;
          margin-left: auto;
        }
        .sig-name { font-size: 11pt; font-weight: 700; color: #0A2540; }
        .sig-pos  { font-size: 9.5pt; color: #697586; }

        /* ── Footer ── */
        .footer {
          position: absolute;
          bottom: 10mm;
          left: 18mm; right: 18mm;
          border-top: 1px solid #E8ECF2;
          padding-top: 6px;
          text-align: center;
          font-size: 8pt;
          color: #9aacbf;
          font-style: italic;
        }
      </style>
    </head>
    <body>

      <!-- HEADER -->
      <div class="header">
        ${company.logo_url
          ? `<img src="${company.logo_url}" alt="Logo" />`
          : `<div class="header-logo-placeholder">${(company.nom_entreprise || 'P').substring(0,2).toUpperCase()}</div>`}
        <div class="header-info">
          <h2>${company.nom_entreprise || 'Paie360'}</h2>
          <p>${company.adresse || ''}</p>
          <p><strong>NIF:</strong> ${company.nif || 'N/A'} &nbsp;|&nbsp; <strong>CNSS:</strong> ${company.numero_affiliation || 'N/A'}</p>
          <p><strong>Tél:</strong> ${company.telephone || 'N/A'} &nbsp;|&nbsp; <strong>Email:</strong> ${company.email || 'N/A'}</p>
        </div>
      </div>

      <!-- TITLE -->
      <div class="doc-title">ATTESTATION DE TRAVAIL</div>

      <!-- INTRO -->
      <div class="intro">
        <p>Je soussigné(e), <strong>${signatoryName}</strong>, <strong>${signatoryPosition}</strong>,</p>
        <p>de l'entreprise <strong>${company.nom_entreprise || 'Paie360'}</strong>,</p>
        <p style="margin-top:10px; font-weight:700;">Certifie par la présente que :</p>
      </div>

      <!-- EMPLOYEE CARD -->
      <div class="employee-card">
        <div class="field"><span>Nom complet :</span> ${employee.prenom} ${employee.nom}</div>
        <div class="field"><span>Matricule CNSS :</span> ${employee.matricule_cnss || 'N/A'}</div>
        <div class="field"><span>Fonction :</span> ${employee.fonction || 'N/A'}</div>
        <div class="field"><span>Type de contrat :</span> ${employee.type_contrat || 'N/A'}</div>
        <div class="field"><span>Département :</span> ${employee.departement || 'N/A'}</div>
        <div class="field"><span>Date d'embauche :</span> ${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}</div>
      </div>

      <!-- EMPLOYMENT STATEMENT -->
      <p class="employment-line">
        Est employé(e) au sein de notre entreprise depuis le
        <strong>${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}</strong>,
        en qualité de <strong>${employee.fonction || 'N/A'}</strong>.
      </p>
      <p class="mention">
        Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
      </p>

      <!-- SIGNATURE -->
      <div class="signature-section">
        <div class="sig-date">Fait à Djibouti, le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">${signatoryName}</div>
          <div class="sig-pos">${signatoryPosition}</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Ce document est officiel et ne nécessite pas de signature manuscrite. &nbsp;•&nbsp; ${company.nom_entreprise || 'Paie360'} &nbsp;•&nbsp; Généré le ${format(new Date(), 'dd/MM/yyyy')}
      </div>

    </body>
    </html>
  `;
  
  generateHTMLDocument(html, `Attestation_Travail_${employee.prenom}_${employee.nom}.pdf`);
};

export const generateCertificatEmploi = (employee, company) => {
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  const CNSS_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3e5141d4077e1d8eef84e/9f55d1615_Logo-75-x-21-pixels-couleur-3-1-1.png';

  const dot = ' : ………………………………………';
  const dot2 = ' : ………………………………….';

  const oneCopy = () => `
    <div style="font-family: Arial, sans-serif; font-size: 10pt; color: #000; padding: 10mm 12mm 6mm 12mm;">

      <!-- TOP HEADER: 3 columns -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px;">

        <!-- LEFT: CNSS logo -->
        <div style="flex: 0 0 auto; width: 120px;">
          <img src="${CNSS_LOGO}" alt="CNSS Logo" style="width: 120px; object-fit: contain;" />
        </div>

        <!-- CENTER: République -->
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <div style="font-weight: bold; font-size: 11pt; letter-spacing: 0.5px;">REPUBLIQUE DE DJIBOUTI</div>
          <div style="font-size: 9pt;">Unité - Egalité - Paix</div>
          <div style="border-bottom: 1px solid #000; width: 60px; margin: 3px auto;"></div>
          <div style="font-size: 9pt; margin-top: 4px;">Ministère du Travail<br>chargé de la<br>Reforme de l'Administration</div>
        </div>

        <!-- RIGHT: Arabic -->
        <div style="flex: 0 0 auto; width: 140px; text-align: right; direction: rtl; font-size: 9pt; line-height: 1.6;">
          <div style="font-weight: bold;">جمهورية جيبوتي</div>
          <div>وحدة ـ مساواة ـ سلام</div>
          <div style="border-bottom: 1px solid #000; width: 60px; margin: 3px 0 3px auto;"></div>
          <div style="margin-top: 4px;">وزارة العمل والادماج<br>والتدريب المهني</div>
          <div style="border-bottom: 1px solid #000; width: 60px; margin: 3px 0 3px auto;"></div>
          <div style="font-weight: bold;">لصندوق الوطني للضمان الاجتماعي</div>
        </div>
      </div>

      <!-- TITLE -->
      <div style="text-align: center; margin: 8px 0 10px 0;">
        <span style="font-size: 13pt; font-weight: bold; font-style: italic; text-decoration: underline;">CERTIFICAT D'EMPLOI</span>
      </div>

      <!-- BODY: Two columns EMPLOYEUR | SALARIE -->
      <div style="display: flex; gap: 0; border-top: none;">

        <!-- LEFT: EMPLOYEUR -->
        <div style="flex: 1; padding-right: 16px; border-right: 1px solid #000;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 8px;">EMPLOYEUR</div>
          <div style="margin-bottom: 5px;">N° matricule : <strong>${company.numero_affiliation || '……………………..'}</strong></div>
          <div style="margin-bottom: 5px;">Nom : <strong>${company.nom_entreprise || '……………………………….'}</strong></div>
          <div style="margin-bottom: 5px;">Adresse : <strong>${company.adresse || '…………………………….'}</strong></div>
          <div style="margin-bottom: 5px;">BP : <strong>${company.bp || '……………………………….'}</strong></div>
          <div style="margin-bottom: 5px;">Tél. : <strong>${company.telephone || '………………………………….'}</strong></div>
          <div style="margin-top: 14px; margin-bottom: 5px;"><strong>Fait à Djibouti, le</strong> ${today}</div>
          <div style="margin-top: 10px;"><span style="font-weight: bold; text-decoration: underline;">Signature et cachet de l'employeur</span></div>
          <div style="height: 55px;"></div>
        </div>

        <!-- RIGHT: SALARIE -->
        <div style="flex: 1; padding-left: 16px;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 8px;">SALARIE</div>
          <div style="margin-bottom: 5px;">Nom et prénom : <strong>${employee.prenom} ${employee.nom}</strong></div>
          <div style="margin-bottom: 5px;">Salaire brut mensuel : <strong>${(employee.salaire_base || 0).toLocaleString()} DJF</strong></div>
          <div style="margin-bottom: 5px;"><strong>Matricule de l'assuré social</strong> : <strong>${employee.matricule_cnss || '…………………………….'}</strong></div>
          <div style="margin-bottom: 5px;">Date et lieu de naissance : <strong>${employee.date_naissance ? format(new Date(employee.date_naissance), 'dd/MM/yyyy') : '……………'} ${employee.ville || ''}</strong></div>
          <div style="margin-bottom: 5px;">Adresse : <strong>${employee.adresse || '……………………………………..'}</strong></div>
          <div style="margin-bottom: 5px;">N° C.N.I, passeport ou C.I.Etrangère : <strong>${employee.numero_identite || '………………………'}</strong></div>
          <div style="margin-bottom: 5px;">Emploi occupé : <strong>${employee.fonction || '………………………………………..'}</strong></div>
          <div style="margin-bottom: 5px;">Date d'embauche : <strong>${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd/MM/yyyy') : '………………………………………'}</strong></div>
          <div style="margin-bottom: 5px;">Date fin de service : <strong>${employee.date_fin_contrat ? format(new Date(employee.date_fin_contrat), 'dd/MM/yyyy') : '………………………………………'}</strong></div>
        </div>
      </div>

      <!-- FOOTER NOTE -->
      <div style="margin-top: 14px; font-weight: bold; font-size: 9.5pt;">
        L'employeur atteste sous sa responsabilité la conformité des renseignements concernant le salarié (e)
      </div>
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificat d'Emploi - ${employee.prenom} ${employee.nom}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; width: 210mm; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      ${oneCopy()}
      <!-- Cut line -->
      <div style="display: flex; align-items: center; gap: 6px; padding: 0 12mm; border-top: 1px dashed #555; border-bottom: 1px dashed #555; margin: 2px 0;">
        <span style="font-size: 16px;">✂</span>
        <span style="font-size: 7pt; color: #555;">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</span>
      </div>
      ${oneCopy()}
    </body>
    </html>
  `;

  generateHTMLDocument(html, `Certificat_Emploi_${employee.prenom}_${employee.nom}.pdf`);
};

export const generateHolidayAttestation = (holiday, employee, company, signatory = null) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Attestation de Congé - ${employee.prenom} ${employee.nom}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          @page { margin: 1cm; }
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #0A2540;
          line-height: 1.8;
        }
        h1 {
          text-align: center;
          color: #0066FF;
          font-size: 28px;
          margin: 40px 0 20px 0;
          font-weight: bold;
          text-decoration: underline;
          text-decoration-color: #0066FF;
          text-decoration-thickness: 3px;
          text-underline-offset: 8px;
        }
        .content {
          margin: 40px 0;
          font-size: 14px;
          color: #425466;
        }
        .content p {
          margin: 15px 0;
        }
        .employee-info {
          background: #F7F9FC;
          padding: 20px;
          border-left: 4px solid #0066FF;
          margin: 25px 0;
          border-radius: 4px;
        }
        .employee-info p {
          margin: 8px 0;
          font-size: 14px;
          color: #0A2540;
        }
        .employee-info strong {
          color: #0066FF;
        }
        .holiday-info {
          background: #E5F8F3;
          padding: 20px;
          border-left: 4px solid #10B981;
          margin: 25px 0;
          border-radius: 4px;
        }
        .holiday-info p {
          margin: 8px 0;
          font-size: 14px;
          color: #0A2540;
        }
        .holiday-info strong {
          color: #10B981;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #697586;
          font-style: italic;
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #E8ECF2;
        }
      </style>
    </head>
    <body>
      ${getCompanyHeader(company)}
      
      <h1>ATTESTATION DE CONGÉ</h1>
      
      <div class="content">
        <p>Je soussigné(e), <strong>${signatory?.name || company.signatory_holiday_attestation_name || '[NOM DU SIGNATAIRE]'}</strong>,</p>
        <p><strong>${signatory?.position || company.signatory_holiday_attestation_position || '[FONCTION]'}</strong>,</p>
        <p>de l'entreprise <strong>${company.nom_entreprise || 'Paie360'}</strong>,</p>
        
        <p style="margin-top: 30px; font-weight: 600; color: #0A2540;">Certifie par la présente que:</p>
        
        <div class="employee-info">
          <p><strong>Nom:</strong> ${employee.prenom} ${employee.nom}</p>
          <p><strong>Fonction:</strong> ${employee.fonction || 'N/A'}</p>
          <p><strong>Département:</strong> ${employee.departement || 'N/A'}</p>
          <p><strong>Matricule CNSS:</strong> ${employee.matricule_cnss || 'N/A'}</p>
        </div>
        
        <p style="margin-top: 20px; font-weight: 600; color: #0A2540;">A bénéficié d'un congé:</p>
        
        <div class="holiday-info">
          <p><strong>Type de congé:</strong> ${holiday.type_conge}</p>
          <p><strong>Du:</strong> ${format(new Date(holiday.date_debut), 'dd MMMM yyyy', { locale: fr })} <strong>au:</strong> ${format(new Date(holiday.date_fin), 'dd MMMM yyyy', { locale: fr })}</p>
          <p><strong>Nombre de jours:</strong> ${holiday.nombre_jours} jour(s)</p>
          ${holiday.motif ? `<p><strong>Motif:</strong> ${holiday.motif}</p>` : ''}
        </div>
        
        <p style="margin-top: 30px; font-style: italic;">Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
      </div>
      
      ${getSignatureSection(signatory || {
        name: company.signatory_holiday_attestation_name || 'Directeur RH',
        position: company.signatory_holiday_attestation_position || 'Directeur des Ressources Humaines'
      })}
      
      <div class="footer">
        Ce document est officiel et ne nécessite pas de signature manuscrite.
      </div>
    </body>
    </html>
  `;
  
  generateHTMLDocument(html, `Attestation_Conge_${employee.prenom}_${employee.nom}.pdf`);
};