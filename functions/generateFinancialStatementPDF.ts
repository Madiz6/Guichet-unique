import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import jsPDF from 'npm:jspdf@2.5.2';
import autoTable from 'npm:jspdf-autotable@3.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { statement_id } = await req.json();

    // Fetch statement and company
    const [statement, companies] = await Promise.all([
      base44.asServiceRole.entities.FinancialStatement.filter({ id: statement_id }),
      base44.asServiceRole.entities.Company.list()
    ]);

    if (!statement || statement.length === 0) {
      return Response.json({ error: 'Statement not found' }, { status: 404 });
    }

    const stmt = statement[0];
    const company = companies[0] || {};

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Helper function to add new page if needed
    const checkPageBreak = (neededSpace = 40) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company.nom_entreprise || 'ENTREPRISE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(12);
    doc.text(`ETATS FINANCIERS DE L'EXERCICE CLOS LE ${new Date(stmt.period_end).toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // ========== BILAN ACTIF ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN ACTIF AU ' + new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase(), 14, yPos);
    yPos += 8;

    const actifData = [
      // Immobilisations Incorporelles
      [
        { content: 'IMMOBILISATIONS INCORPORELLES', styles: { fontStyle: 'bold' } },
        '',
        formatAmount(stmt.actif?.immobilisations_incorporelles?.total_brut || 0),
        formatAmount(stmt.actif?.immobilisations_incorporelles?.total_amort || 0),
        formatAmount(stmt.actif?.immobilisations_incorporelles?.total_net || 0)
      ],
      ['FRAIS D\'ETABLISSEMENT', '', formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_etablissement_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_etablissement_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_etablissement_net || 0)],
      ['FRAIS DE RECHERCHE & DEVELOPPEMENT', '', formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_rnd_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_rnd_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_rnd_net || 0)],
      ['LOGICIEL, CONCESSION ET DROITS SIMILAIRES', '', formatAmount(stmt.actif?.immobilisations_incorporelles?.logiciels_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.logiciels_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.logiciels_net || 0)],
      // Immobilisations Corporelles
      [
        { content: 'IMMOBILISATIONS CORPORELLES', styles: { fontStyle: 'bold' } },
        '',
        formatAmount(stmt.actif?.immobilisations_corporelles?.total_brut || 0),
        formatAmount(stmt.actif?.immobilisations_corporelles?.total_amort || 0),
        formatAmount(stmt.actif?.immobilisations_corporelles?.total_net || 0)
      ],
      ['AGENC. AMENAGT.', '', formatAmount(stmt.actif?.immobilisations_corporelles?.agencements_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.agencements_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.agencements_net || 0)],
      ['MAT DE BUREAU & INFORMATIQUE', '', formatAmount(stmt.actif?.immobilisations_corporelles?.materiel_info_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.materiel_info_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.materiel_info_net || 0)],
      ['MOBILIER', '', formatAmount(stmt.actif?.immobilisations_corporelles?.mobilier_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.mobilier_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.mobilier_net || 0)],
      // Immobilisations Financières
      [
        { content: 'IMMOBILISATIONS FINANCIERES', styles: { fontStyle: 'bold' } },
        '',
        formatAmount(stmt.actif?.immobilisations_financieres?.total || 0),
        '-',
        formatAmount(stmt.actif?.immobilisations_financieres?.total || 0)
      ],
      ['DEPOTS ET CAUTIONNEMENT', '', formatAmount(stmt.actif?.immobilisations_financieres?.total || 0), '-', formatAmount(stmt.actif?.immobilisations_financieres?.total || 0)],
      // Total I
      [
        { content: 'TOTAL I', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_brut || 0) + (stmt.actif?.immobilisations_corporelles?.total_brut || 0) + (stmt.actif?.immobilisations_financieres?.total || 0)), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_amort || 0) + (stmt.actif?.immobilisations_corporelles?.total_amort || 0)), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_net || 0) + (stmt.actif?.immobilisations_corporelles?.total_net || 0) + (stmt.actif?.immobilisations_financieres?.total || 0)), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      // Actif circulant
      [{ content: 'STOCK', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.stocks || 0), '', formatAmount(stmt.actif?.stocks || 0)],
      [{ content: 'CREANCES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.creances?.total || 0), '-', formatAmount(stmt.actif?.creances?.total || 0)],
      ['CLIENTS ET COMPTES RATTACHES', '', formatAmount(stmt.actif?.creances?.clients || 0), '', formatAmount(stmt.actif?.creances?.clients || 0)],
      ['AUTRES CREANCES', '', formatAmount(stmt.actif?.creances?.autres || 0), '', formatAmount(stmt.actif?.creances?.autres || 0)],
      [{ content: 'DISPONIBILITES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.disponibilites || 0), '', formatAmount(stmt.actif?.disponibilites || 0)],
      // Total II
      [
        { content: 'TOTAL II', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount((stmt.actif?.stocks || 0) + (stmt.actif?.creances?.total || 0) + (stmt.actif?.disponibilites || 0)), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount((stmt.actif?.stocks || 0) + (stmt.actif?.creances?.total || 0) + (stmt.actif?.disponibilites || 0)), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      // Total Général
      [
        { content: 'TOTAL GENERAL (I + II)', styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } },
        '',
        { content: formatAmount(stmt.actif?.total_actif || 0), styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } },
        { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_amort || 0) + (stmt.actif?.immobilisations_corporelles?.total_amort || 0)), styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } },
        { content: formatAmount(stmt.actif?.total_actif || 0), styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } }
      ]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['ACTIF', 'NOTES', 'BRUT', 'AMORTIS/PROVISION', 'NET 31/12/' + stmt.fiscal_year]],
      body: actifData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 100, 100], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 10;
    checkPageBreak();

    // ========== BILAN PASSIF ==========
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN PASSIF AU ' + new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase(), 14, yPos);
    yPos += 8;

    const passifData = [
      ['CAPITAL SOCIAL', '', formatAmount(stmt.passif?.capitaux_propres?.capital_social || 0)],
      ['RESERVE LEGALE', '', formatAmount(stmt.passif?.capitaux_propres?.reserve_legale || 0)],
      ['REPORT A NOUVEAU', '', formatAmount(stmt.passif?.capitaux_propres?.report_nouveau || 0)],
      ['RESULTAT DE L\'EXERCICE', '', formatAmount(stmt.passif?.capitaux_propres?.resultat_exercice || 0)],
      [
        { content: 'CAPITAUX PROPRES TOTAL (I)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount(stmt.passif?.capitaux_propres?.total || 0), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      [{ content: 'PROVISION POUR RISQUES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.provisions?.total_provisions || 0)],
      [
        { content: 'TOTAL (II)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount(stmt.provisions?.total_provisions || 0), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      ['EMPRUNT AUPRES DES ETABLISSEMENTS DES CREDITS', '', formatAmount(stmt.passif?.dettes?.emprunts || 0)],
      ['DETTES FOURNISSEURS ET COMPTES RATTACHES', '', formatAmount(stmt.passif?.dettes?.fournisseurs || 0)],
      ['DETTES FISCALES ET SOCIALES', '', formatAmount(stmt.passif?.dettes?.dettes_fiscales_sociales || 0)],
      ['AUTRES DETTES', '', formatAmount(stmt.passif?.dettes?.autres_dettes || 0)],
      [
        { content: 'TOTAL (III)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount(stmt.passif?.dettes?.total || 0), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      [
        { content: 'TOTAL GENERAL (I + II + III)', styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } },
        '',
        { content: formatAmount(stmt.passif?.total_passif || 0), styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } }
      ]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['PASSIF', 'NOTES', 'NET 31/12/' + stmt.fiscal_year]],
      body: passifData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 100, 100], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' }
      }
    });

    // ========== COMPTE DE RESULTAT ==========
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPTE DE RESULTAT AU ' + new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase(), 14, yPos);
    yPos += 8;

    const resultatData = [
      ['PRESTATIONS DE SERVICES', '', formatAmount(stmt.compte_resultat?.produits_exploitation?.prestations_services || 0)],
      ['VENTES DE MARCHANDISES', '', formatAmount(stmt.compte_resultat?.produits_exploitation?.ventes || 0)],
      [
        { content: 'TOTAL DES PRODUITS D\'EXPLOITATION (I)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount(stmt.compte_resultat?.produits_exploitation?.total || 0), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      ['ACHATS MATIERES CONSOMMABLES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.achats || 0)],
      ['AUTRES ACHATS ET CHARGES EXTERNES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.charges_externes || 0)],
      ['SALAIRES ET TRAITEMENTS', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.salaires_traitements || 0)],
      ['CHARGES SOCIALES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.charges_sociales || 0)],
      ['IMPOTS ET TAXES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.impots_taxes || 0)],
      ['DOTATIONS AUX AMORTISSEMENTS ET PROV.', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.dotations_amortissements || 0)],
      ['AUTRES CHARGES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.autres_charges || 0)],
      [
        { content: 'TOTAL DES CHARGES D\'EXPLOITATION (II)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        '',
        { content: formatAmount(stmt.compte_resultat?.charges_exploitation?.total || 0), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }
      ],
      [
        { content: 'RESULTAT D\'EXPLOITATION (I-II)', styles: { fontStyle: 'bold', fillColor: [240, 240, 180] } },
        '',
        { content: formatAmount(stmt.compte_resultat?.resultat_exploitation || 0), styles: { fontStyle: 'bold', fillColor: [240, 240, 180] } }
      ],
      ['PRODUITS FINANCIERS', '', formatAmount(stmt.compte_resultat?.produits_financiers || 0)],
      ['CHARGES FINANCIERES', '', formatAmount(stmt.compte_resultat?.charges_financieres || 0)],
      [
        { content: 'RESULTAT FINANCIER', styles: { fontStyle: 'bold', fillColor: [240, 240, 180] } },
        '',
        { content: formatAmount(stmt.compte_resultat?.resultat_financier || 0), styles: { fontStyle: 'bold', fillColor: [240, 240, 180] } }
      ],
      [
        { content: 'RESULTAT COURANT AVANT IMPOTS', styles: { fontStyle: 'bold', fillColor: [220, 240, 180] } },
        '',
        { content: formatAmount(stmt.compte_resultat?.resultat_courant_avant_impots || 0), styles: { fontStyle: 'bold', fillColor: [220, 240, 180] } }
      ],
      ['IMPOT SUR LES SOCIETES (IMF)', '', formatAmount(stmt.compte_resultat?.impot_societes || 0)],
      [
        { content: 'RESULTAT NET', styles: { fontStyle: 'bold', fillColor: [180, 220, 180] } },
        '',
        { content: formatAmount(stmt.compte_resultat?.resultat_net || 0), styles: { fontStyle: 'bold', fillColor: [180, 220, 180] } }
      ]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['', 'NOTES', 'NET 31/12/' + stmt.fiscal_year]],
      body: resultatData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 100, 100], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' }
      }
    });

    // ========== NOTES AUX ETATS FINANCIERS ==========
    if (stmt.details_immobilisations && stmt.details_immobilisations.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTE - TABLEAU DES IMMOBILISATIONS', 14, yPos);
      yPos += 8;

      const immoData = stmt.details_immobilisations.map(immo => [
        immo.nom,
        immo.type,
        new Date(immo.date_acquisition).toLocaleDateString('fr-FR'),
        formatAmount(immo.valeur_brute),
        immo.taux_amort + '%',
        formatAmount(immo.amort_annee),
        formatAmount(immo.amort_cumule),
        formatAmount(immo.valeur_nette)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Désignation', 'Type', 'Date Acq.', 'Valeur Brute', 'Taux', 'Amort. ' + stmt.fiscal_year, 'Amort. Cumulé', 'VNC']],
        body: immoData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [100, 100, 100], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 20, halign: 'right' }
        }
      });
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Etats_Financiers_${stmt.fiscal_year}_${company.nom_entreprise || 'Entreprise'}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatAmount(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}