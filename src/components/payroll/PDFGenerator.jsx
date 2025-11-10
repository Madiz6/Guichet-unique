
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
            <tr><td>CNSS Salariale (4%)</td><td class="text-right">${calc.cnssEmployee.total.toLocaleString()}</td></tr>
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
          <p style="margin: 5px 0;"><strong>Charges Patronales (CNSS Employeur):</strong> ${calc.cnssEmployer.total.toLocaleString()} DJF</p>
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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Attestation de Travail - ${employee.prenom} ${employee.nom}</title>
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
      
      <h1>ATTESTATION DE TRAVAIL</h1>
      
      <div class="content">
        <p>Je soussigné(e), <strong>${signatory?.name || company.signatory_work_attestation_name || '[NOM DU SIGNATAIRE]'}</strong>,</p>
        <p><strong>${signatory?.position || company.signatory_work_attestation_position || '[FONCTION]'}</strong>,</p>
        <p>de l'entreprise <strong>${company.nom_entreprise || 'Paie360'}</strong>,</p>
        
        <p style="margin-top: 30px; font-weight: 600; color: #0A2540;">Certifie par la présente que:</p>
        
        <div class="employee-info">
          <p><strong>Nom:</strong> ${employee.prenom} ${employee.nom}</p>
          <p><strong>Fonction:</strong> ${employee.fonction || 'N/A'}</p>
          <p><strong>Département:</strong> ${employee.departement || 'N/A'}</p>
          <p><strong>Matricule CNSS:</strong> ${employee.matricule_cnss || 'N/A'}</p>
        </div>
        
        <p>Est employé(e) dans notre entreprise depuis le <strong>${employee.date_embauche ? format(new Date(employee.date_embauche), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}</strong>.</p>
        
        <p style="margin-top: 30px; font-style: italic;">Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
      </div>
      
      ${getSignatureSection(signatory || {
        name: company.signatory_work_attestation_name || 'Directeur RH',
        position: company.signatory_work_attestation_position || 'Directeur des Ressources Humaines'
      })}
      
      <div class="footer">
        Ce document est officiel et ne nécessite pas de signature manuscrite.
      </div>
    </body>
    </html>
  `;
  
  generateHTMLDocument(html, `Attestation_Travail_${employee.prenom}_${employee.nom}.pdf`);
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
