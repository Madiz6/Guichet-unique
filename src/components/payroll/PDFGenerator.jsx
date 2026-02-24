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
  // Show loading state
  const loadingToast = toast.loading('Génération du bulletin en cours...');
  
  try {
    // Get primes and deductions for this employee in this cycle
    const absences = cycle?.employee_absences?.[employee.id] || 0;
    const otherDeductions = cycle?.employee_other_deductions?.[employee.id] || 0;
    const cyclePrimes = cycle.employee_cycle_primes?.[employee.id] || []; // New: Primes specific to this cycle
    const holidayStatus = cycle.employee_holiday_status?.[employee.id] || null; // New: Holiday status for the employee in this cycle
    
    // Apply absences
    const empWithAbsences = { ...employee, absences_amount: absences };
    
    // Calculate payroll with cycle primes and holiday status
    const calc = calculatePayroll(empWithAbsences, holidayStatus, cyclePrimes);
    const finalNet = calc.netSalary - otherDeductions;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bulletin de Paie - ${employee.prenom} ${employee.nom}</title>
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
          }
          h1 {
            text-align: center;
            color: #0066FF;
            font-size: 28px;
            margin: 30px 0 10px 0;
            font-weight: bold;
          }
          .period {
            text-align: center;
            color: #697586;
            font-size: 14px;
            margin-bottom: 30px;
          }
          .section {
            margin: 25px 0;
            background: #F7F9FC;
            padding: 20px;
            border-radius: 8px;
          }
          .section-title {
            font-weight: bold;
            font-size: 16px;
            color: #0A2540;
            margin-bottom: 15px;
            border-bottom: 2px solid #0066FF;
            padding-bottom: 8px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .info-item {
            font-size: 13px;
            color: #425466;
          }
          .info-item strong {
            color: #0A2540;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #0066FF;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #E8ECF2;
            font-size: 13px;
          }
          tr:hover {
            background: #F7F9FC;
          }
          .total-row {
            font-weight: bold;
            background: #F7F9FC;
            font-size: 14px;
          }
          .net-pay {
            background: #10B981;
            color: white;
            font-size: 16px;
            font-weight: bold;
          }
          .deduction-header {
            background: #EF4444;
          }
          .text-right {
            text-align: right;
          }
          .employer-info {
            font-size: 12px;
            color: #697586;
            font-style: italic;
            margin-top: 20px;
            padding: 15px;
            background: #FFF4E5;
            border-left: 4px solid #FA6400;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        ${getCompanyHeader(company)}
        
        <h1>BULLETIN DE PAIE</h1>
        <p class="period">Période: ${cycle?.periode || format(new Date(), 'MMMM yyyy', { locale: fr })}</p>
        
        <div class="section">
          <div class="section-title">Informations Employé</div>
          <div class="info-grid">
            <div class="info-item"><strong>Nom:</strong> ${employee.prenom} ${employee.nom}</div>
            <div class="info-item"><strong>Matricule CNSS:</strong> ${employee.matricule_cnss || 'N/A'}</div>
            <div class="info-item"><strong>Fonction:</strong> ${employee.fonction || 'N/A'}</div>
            <div class="info-item"><strong>Régime CNSS:</strong> ${employee.regime_cnss || 'N/A'}</div>
            <div class="info-item"><strong>Département:</strong> ${employee.departement || 'N/A'}</div>
            <div class="info-item"><strong>Date d'embauche:</strong> ${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd/MM/yyyy') : 'N/A'}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>ÉLÉMENTS DE RÉMUNÉRATION</th>
              <th class="text-right">MONTANT (DJF)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Salaire de Base</td><td class="text-right">${(employee.salaire_base || 0).toLocaleString()}</td></tr>
            <tr><td>Prime d'Ancienneté</td><td class="text-right">${(employee.prime_anciennete || 0).toLocaleString()}</td></tr>
            <tr><td>Prime de Rendement</td><td class="text-right">${(employee.prime_rendement || 0).toLocaleString()}</td></tr>
            <tr><td>Prime de Sujétion</td><td class="text-right">${(employee.prime_sujetion || 0).toLocaleString()}</td></tr>
            <tr><td>Prime de Logement</td><td class="text-right">${(employee.prime_logement || 0).toLocaleString()}</td></tr>
            <tr><td>Prime de Voiture</td><td class="text-right">${(employee.prime_voiture || 0).toLocaleString()}</td></tr>
            <tr><td>Autres Primes</td><td class="text-right">${(employee.autres_primes || 0).toLocaleString()}</td></tr>
            ${cyclePrimes.map(prime => `<tr><td>${prime.nom_prime}</td><td class="text-right">${prime.montant.toLocaleString()}</td></tr>`).join('')}
            ${absences > 0 ? `<tr><td>❌ Absences</td><td class="text-right" style="color: #EF4444;">-${absences.toLocaleString()}</td></tr>` : ''}
            <tr class="total-row"><td>SALAIRE BRUT</td><td class="text-right">${calc.grossSalary.toLocaleString()}</td></tr>
          </tbody>
        </table>
        
        <table>
          <thead>
            <tr>
              <th class="deduction-header">RETENUES</th>
              <th class="deduction-header text-right">MONTANT (DJF)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>CNSS Salariale – Retraite (4%)</td><td class="text-right">${calc.cnssEmployee.retraite.toLocaleString()}</td></tr>
            <tr><td>CNSS Salariale – Assurance Maladie (2%)</td><td class="text-right">${calc.cnssEmployee.amu.toLocaleString()}</td></tr>
            <tr><td style="font-weight:600;">Total CNSS Salariale (6%)</td><td class="text-right" style="font-weight:600;">${calc.cnssEmployee.total.toLocaleString()}</td></tr>
            <tr><td>ITS (Impôt sur les Traitements et Salaires)</td><td class="text-right">${calc.its.toLocaleString()}</td></tr>
            ${calc.aide > 0 ? `<tr><td>AIDE</td><td class="text-right">${calc.aide.toLocaleString()}</td></tr>` : ''}
            <tr><td>RetCim</td><td class="text-right">400</td></tr>
            ${otherDeductions > 0 ? `<tr><td>Autres Déductions</td><td class="text-right">${otherDeductions.toLocaleString()}</td></tr>` : ''}
            <tr class="total-row" style="background: #FFE5E5; color: #EF4444;">
              <td>TOTAL RETENUES</td>
              <td class="text-right">${(calc.cnssEmployee.total + calc.its + calc.aide + 400 + otherDeductions).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
        <table>
          <tbody>
            <tr class="net-pay">
              <td>NET À PAYER</td>
              <td class="text-right">${finalNet.toLocaleString()} DJF</td>
            </tr>
          </tbody>
        </table>
        
        <div class="employer-info">
          <p style="margin: 5px 0; font-weight: 600;">Charges Patronales (Part Patronale ${calc.regime === 'Zone Franche' ? '10.2%' : '15.7%'}):</p>
          <p style="margin: 3px 0 3px 15px;">• Retraite (4%): ${(calc.cnssEmployer.retraite || 0).toLocaleString()} DJF</p>
          ${calc.regime === 'Zone Franche'
            ? `<p style="margin: 3px 0 3px 15px;">• Accident de Travail & Soins (6.2%): ${(calc.cnssEmployer.accident_travail_soins || 0).toLocaleString()} DJF</p>`
            : `<p style="margin: 3px 0 3px 15px;">• Accident de Travail (1.2%): ${(calc.cnssEmployer.accident_travail || 0).toLocaleString()} DJF</p>
               <p style="margin: 3px 0 3px 15px;">• Prestations Familiales (5.5%): ${(calc.cnssEmployer.allocations_familiales || 0).toLocaleString()} DJF</p>
               <p style="margin: 3px 0 3px 15px;">• Assurance Maladie (5%): ${(calc.cnssEmployer.amu || 0).toLocaleString()} DJF</p>`
          }
          <p style="margin: 5px 0;"><strong>Total Charges Patronales:</strong> ${calc.cnssEmployer.total.toLocaleString()} DJF</p>
          <p style="margin: 5px 0;"><strong>Coût Total Employeur:</strong> ${calc.totalCost.toLocaleString()} DJF</p>
          <p style="margin: 5px 0;"><strong>Banque:</strong> ${employee.banque || 'N/A'} | <strong>Compte:</strong> ${employee.numero_compte || 'N/A'}</p>
        </div>
        
        ${getSignatureSection(signatory || {
          name: company.signatory_payslip_name || 'Directeur RH',
          position: company.signatory_payslip_position || 'Directeur des Ressources Humaines'
        })}
      </body>
      </html>
    `;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Convert HTML string to PDF using jsPDF's html method
    // This method implicitly uses html2canvas, which is typically bundled or expected to be available
    await doc.html(html, {
      callback: function (pdfDoc) {
        pdfDoc.save(`Bulletin_${employee.prenom}_${employee.nom}_${cycle.periode}.pdf`);
        // Dismiss loading and show success after PDF is generated and saved
        toast.dismiss(loadingToast);
        toast.success('Bulletin de paie généré avec succès !');
      },
      x: 10,
      y: 10,
      width: 190, // Set width to ensure content fits within A4 margins (210mm total - 10mm left - 10mm right)
      windowWidth: 800, // Important for html2canvas to render the HTML as if it were 800px wide
      html2canvas: {
        scale: 0.8 // Adjust scale to fit the 800px wide content into 190mm PDF width
      }
    });

  } catch (error) {
    toast.dismiss(loadingToast);
    toast.error('Erreur lors de la génération du PDF');
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

  // Two copies on one A4 page (as per official CNSS form)
  const oneCopy = () => `
    <div style="border: 1px solid #333; padding: 16px 20px; margin-bottom: 10px; font-size: 10pt; font-family: Arial, sans-serif;">
      <!-- HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 13pt; font-weight: bold; letter-spacing: 1px;">REPUBLIQUE DE DJIBOUTI</div>
          <div style="font-size: 9pt;">Unité - Egalité - Paix</div>
          <div style="margin-top: 6px; font-size: 9pt;">Ministère du Travail<br>chargé de la<br>Reforme de l'Administration</div>
        </div>
        <div style="text-align: center; flex: 1; font-size: 13pt; font-weight: bold; text-decoration: underline; display: flex; align-items: center; justify-content: center;">
          CERTIFICAT D'EMPLOI
        </div>
        <div style="text-align: center; flex: 1; direction: rtl; font-size: 9pt;">
          <div style="font-weight: bold;">جمهورية جيبوتي</div>
          <div>وحدة ـ مساواة ـ سلام</div>
          <div style="margin-top: 6px;">وزارة العمل والادماج<br>والتدريب المهني</div>
          <div style="font-weight: bold; margin-top: 4px;">لصندوق الوطني للضمان الاجتماعي</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0 16px; border-top: 1px solid #888; padding-top: 10px;">
        <!-- LEFT: Employeur -->
        <div>
          <div style="font-weight: bold; text-decoration: underline; font-size: 10.5pt; margin-bottom: 8px;">EMPLOYEUR</div>
          <div style="margin-bottom: 6px;">N° matricule : <strong>${company.numero_affiliation || '……………………'}</strong></div>
          <div style="margin-bottom: 6px;">Nom : <strong>${company.nom_entreprise || '…………………………………'}</strong></div>
          <div style="margin-bottom: 6px;">Adresse : <strong>${company.adresse || '…………………………………'}</strong></div>
          <div style="margin-bottom: 6px;">BP : <strong>${company.bp || '…………………………………'}</strong></div>
          <div style="margin-bottom: 6px;">Tél. : <strong>${company.telephone || '…………………………………'}</strong></div>
          <div style="margin-top: 16px; font-weight: bold;">Fait à Djibouti, le ${today}</div>
          <div style="margin-top: 12px; font-weight: bold; text-decoration: underline;">Signature et cachet de l'employeur</div>
          <div style="height: 50px; border-bottom: 1px solid #333; width: 160px; margin-top: 8px;"></div>
        </div>

        <!-- Divider -->
        <div style="background: #888;"></div>

        <!-- RIGHT: Salarié -->
        <div>
          <div style="font-weight: bold; text-decoration: underline; font-size: 10.5pt; margin-bottom: 8px;">SALARIE</div>
          <div style="margin-bottom: 6px;">Nom et prénom : <strong>${employee.prenom} ${employee.nom}</strong></div>
          <div style="margin-bottom: 6px;">Salaire brut mensuel : <strong>${(employee.salaire_base || 0).toLocaleString()} DJF</strong></div>
          <div style="margin-bottom: 6px; font-weight: 600;">Matricule de l'assuré social : <strong>${employee.matricule_cnss || '…………………………'}</strong></div>
          <div style="margin-bottom: 6px;">Date et lieu de naissance : <strong>${employee.date_naissance ? format(new Date(employee.date_naissance), 'dd/MM/yyyy') : '……………'} ${employee.ville || ''}</strong></div>
          <div style="margin-bottom: 6px;">Adresse : <strong>${employee.adresse || '……………………………………………'}</strong></div>
          <div style="margin-bottom: 6px;">N° C.N.I, passeport ou C.I.Etrangère : <strong>${employee.numero_identite || '………………………'}</strong></div>
          <div style="margin-bottom: 6px;">Emploi occupé : <strong>${employee.fonction || '…………………………………………'}</strong></div>
          <div style="margin-bottom: 6px;">Date d'embauche : <strong>${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd/MM/yyyy') : '………………………………'}</strong></div>
          <div style="margin-bottom: 6px;">Date fin de service : <strong>${employee.date_fin_contrat ? format(new Date(employee.date_fin_contrat), 'dd/MM/yyyy') : '…………………………………'}</strong></div>
        </div>
      </div>

      <div style="border-top: 1px solid #888; margin-top: 10px; padding-top: 8px; font-size: 9pt; font-style: italic; text-align: center;">
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
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          width: 210mm;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      ${oneCopy()}
      <div style="border-top: 3px dashed #555; margin: 8px 0; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">✂</span>
        <span style="font-size: 8pt; color: #666;">Couper ici — Copie à conserver par le salarié</span>
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