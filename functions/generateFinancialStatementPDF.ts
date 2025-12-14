import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import jsPDF from 'npm:jspdf@2.5.2';
import 'npm:jspdf-autotable@3.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { statement_id } = await req.json();

    const [statement, companies] = await Promise.all([
      base44.asServiceRole.entities.FinancialStatement.filter({ id: statement_id }),
      base44.asServiceRole.entities.Company.list()
    ]);

    if (!statement || statement.length === 0) {
      return Response.json({ error: 'Statement not found' }, { status: 404 });
    }

    const stmt = statement[0];
    const company = companies[0] || {};

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const formatAmount = (amount) => {
      if (!amount && amount !== 0) return '-';
      const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.abs(amount));
      return amount < 0 ? `- ${formatted}` : formatted;
    };

    const addFooter = (pageNum) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Les notes 1 à 11 sont une partie intégrante des états financiers`, 14, pageHeight - 10);
      doc.text(`Le gérant`, 14, pageHeight - 5);
      doc.text(`${pageNum}`, pageWidth - 20, pageHeight - 5);
    };

    let yPos = 20;

    // ========== PAGE 1: BILAN ACTIF ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(company.nom_entreprise || 'ENTREPRISE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(11);
    doc.text(`ETATS FINANCIERS DE L'EXERCICE CLOS LE ${new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(12);
    doc.text(`BILAN ACTIF AU ${new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase()}`, 14, yPos);
    yPos += 8;

    const actifData = [
      [{ content: 'IMMOBILISATIONS INCORPORELLES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.immobilisations_incorporelles?.total_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.total_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.total_net || 0)],
      ['FRAIS D\'ETABLISSEMENT', '', formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_etablissement_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_etablissement_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_etablissement_net || 0)],
      ['FRAIS DE RECHERCHE & DEVELOPPEMENT', '', formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_rnd_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_rnd_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.frais_rnd_net || 0)],
      ['LOGICIEL, CONCESSION ET DROITS SIMILAIRES', '', formatAmount(stmt.actif?.immobilisations_incorporelles?.logiciels_brut || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.logiciels_amort || 0), formatAmount(stmt.actif?.immobilisations_incorporelles?.logiciels_net || 0)],
      [{ content: 'IMMOBILISATIONS CORPORELLES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.immobilisations_corporelles?.total_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.total_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.total_net || 0)],
      ['AGENC. AMENAGT.', '', formatAmount(stmt.actif?.immobilisations_corporelles?.agencements_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.agencements_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.agencements_net || 0)],
      ['MAT DE BUREAU & INFORMATIQUE', '', formatAmount(stmt.actif?.immobilisations_corporelles?.materiel_info_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.materiel_info_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.materiel_info_net || 0)],
      ['MOBILIER', '', formatAmount(stmt.actif?.immobilisations_corporelles?.mobilier_brut || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.mobilier_amort || 0), formatAmount(stmt.actif?.immobilisations_corporelles?.mobilier_net || 0)],
      [{ content: 'IMMOBILISATIONS FINANCIERES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.immobilisations_financieres?.total || 0), '-', formatAmount(stmt.actif?.immobilisations_financieres?.total || 0)],
      ['DEPOTS ET CAUTIONNEMENT', '', formatAmount(stmt.actif?.immobilisations_financieres?.total || 0), '-', formatAmount(stmt.actif?.immobilisations_financieres?.total || 0)],
      [{ content: 'TOTAL I', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '3', { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_brut || 0) + (stmt.actif?.immobilisations_corporelles?.total_brut || 0) + (stmt.actif?.immobilisations_financieres?.total || 0)), styles: { fontStyle: 'bold' } }, { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_amort || 0) + (stmt.actif?.immobilisations_corporelles?.total_amort || 0)), styles: { fontStyle: 'bold' } }, { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_net || 0) + (stmt.actif?.immobilisations_corporelles?.total_net || 0) + (stmt.actif?.immobilisations_financieres?.total || 0)), styles: { fontStyle: 'bold' } }],
      [{ content: 'STOCK', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.stocks || 0), '', formatAmount(stmt.actif?.stocks || 0)],
      [{ content: 'CREANCES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.actif?.creances?.total || 0), '-', formatAmount(stmt.actif?.creances?.total || 0)],
      ['CLIENTS ET COMPTES RATTACHES', '4', formatAmount(stmt.actif?.creances?.clients || 0), '', formatAmount(stmt.actif?.creances?.clients || 0)],
      ['AUTRES CREANCES', '5', formatAmount(stmt.actif?.creances?.autres || 0), '', formatAmount(stmt.actif?.creances?.autres || 0)],
      [{ content: 'DISPONIBILITES', styles: { fontStyle: 'bold' } }, '6', formatAmount(stmt.actif?.disponibilites || 0), '', formatAmount(stmt.actif?.disponibilites || 0)],
      [{ content: 'TOTAL II', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount((stmt.actif?.stocks || 0) + (stmt.actif?.creances?.total || 0) + (stmt.actif?.disponibilites || 0)), styles: { fontStyle: 'bold' } }, '-', { content: formatAmount((stmt.actif?.stocks || 0) + (stmt.actif?.creances?.total || 0) + (stmt.actif?.disponibilites || 0)), styles: { fontStyle: 'bold' } }],
      [{ content: 'COMPTES DE REGULARISATION', styles: { fontStyle: 'bold' } }, '', '-', '', '-'],
      [{ content: 'TOTAL III', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', '-', '', '-'],
      [{ content: 'TOTAL GENERAL (1 à 3)', styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } }, '', { content: formatAmount(stmt.actif?.total_actif || 0), styles: { fontStyle: 'bold' } }, { content: formatAmount((stmt.actif?.immobilisations_incorporelles?.total_amort || 0) + (stmt.actif?.immobilisations_corporelles?.total_amort || 0)), styles: { fontStyle: 'bold' } }, { content: formatAmount(stmt.actif?.total_actif || 0), styles: { fontStyle: 'bold' } }]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['ACTIF', 'NOTES', 'BRUT', 'AMORTIS\nPROVISION', 'NET\n31/12/' + stmt.fiscal_year]],
      body: actifData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    addFooter(1);

    // ========== PAGE 2: BILAN PASSIF ==========
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.nom_entreprise || 'ENTREPRISE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(11);
    doc.text(`ETATS FINANCIERS DE L'EXERCICE CLOS LE ${new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(12);
    doc.text(`BILAN PASSIF AU ${new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase()}`, 14, yPos);
    yPos += 8;

    const passifData = [
      ['CAPITAL SOCIAL', '', formatAmount(stmt.passif?.capitaux_propres?.capital_social || 0)],
      ['RESERVE LEGALE', '', formatAmount(stmt.passif?.capitaux_propres?.reserve_legale || 0)],
      ['REPORT A NOUVEAU', '', formatAmount(stmt.passif?.capitaux_propres?.report_nouveau || 0)],
      ['RESULTAT DE L\'EXERCICE', '', formatAmount(stmt.passif?.capitaux_propres?.resultat_exercice || 0)],
      [{ content: 'CAPITAUX PROPRES TOTAL (I)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.passif?.capitaux_propres?.total || 0), styles: { fontStyle: 'bold' } }],
      [{ content: 'PROVISION POUR RISQUES', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.provisions?.total_provisions || 0)],
      [{ content: 'TOTAL (II)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.provisions?.total_provisions || 0), styles: { fontStyle: 'bold' } }],
      ['EMPRUNT AUPRES DES ETABLISSEMENTS DES CREDITS', '', formatAmount(stmt.passif?.dettes?.emprunts || 0)],
      ['DETTES FOURNISSEURS ET COMPTES RATTACHES', '7', formatAmount(stmt.passif?.dettes?.fournisseurs || 0)],
      ['DETTES FISCALES ET SOCIALES', '8', formatAmount(stmt.passif?.dettes?.dettes_fiscales_sociales || 0)],
      ['AUTRES DETTES', '9', formatAmount(stmt.passif?.dettes?.autres_dettes || 0)],
      [{ content: 'TOTAL (III)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.passif?.dettes?.total || 0), styles: { fontStyle: 'bold' } }],
      [{ content: 'COMPTE DE REGULARISATION', styles: { fontStyle: 'bold' } }, '', '-'],
      [{ content: 'TOTAL GENERAL (I + II + III)', styles: { fontStyle: 'bold', fillColor: [180, 180, 180] } }, '', { content: formatAmount(stmt.passif?.total_passif || 0), styles: { fontStyle: 'bold' } }]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['PASSIF', 'NOTES', 'NET\n31/12/' + stmt.fiscal_year]],
      body: passifData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 145 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' }
      }
    });

    addFooter(2);

    // ========== PAGE 3: COMPTE DE RESULTAT ==========
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.nom_entreprise || 'ENTREPRISE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(11);
    doc.text(`ETATS FINANCIERS DE L'EXERCICE CLOS LE ${new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(12);
    doc.text(`COMPTE DE RESULTAT AU ${new Date(stmt.period_end).toLocaleDateString('fr-FR').toUpperCase()}`, 14, yPos);
    yPos += 8;

    const resultatData = [
      ['PRESTATIONS DE SERVICES', '', formatAmount(stmt.compte_resultat?.produits_exploitation?.prestations_services || 0)],
      [{ content: 'TOTAL DES PRODUITS COURANTS', styles: { fontStyle: 'bold' } }, '', formatAmount(stmt.compte_resultat?.produits_exploitation?.total || 0)],
      [{ content: 'TOTAL DES PRODUITS D\'EXPLOITATION (I)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.compte_resultat?.produits_exploitation?.total || 0), styles: { fontStyle: 'bold' } }],
      ['ACHATS MATIERES CONSOMMABLES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.achats || 0)],
      ['AUTRES ACHATS ET CHARGES EXTERNES', '10', formatAmount(stmt.compte_resultat?.charges_exploitation?.charges_externes || 0)],
      ['SALAIRES ET TRAITEMENTS', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.salaires_traitements || 0)],
      ['CHARGES SOCIALES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.charges_sociales || 0)],
      ['IMPOTS ET TAXES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.impots_taxes || 0)],
      ['DOTATIONS AUX AMORTISSEMENTS ET PROV.', '3', formatAmount(stmt.compte_resultat?.charges_exploitation?.dotations_amortissements || 0)],
      ['AUTRES CHARGES', '', formatAmount(stmt.compte_resultat?.charges_exploitation?.autres_charges || 0)],
      [{ content: 'TOTAL DES CHARGES D\'EXPLOITATION (II)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.compte_resultat?.charges_exploitation?.total || 0), styles: { fontStyle: 'bold' } }],
      [{ content: 'RESULTAT D\'EXPLOITATION (I-II)', styles: { fontStyle: 'bold', fillColor: [240, 240, 200] } }, '', { content: formatAmount(stmt.compte_resultat?.resultat_exploitation || 0), styles: { fontStyle: 'bold' } }],
      ['AUTRES PRODUITS FINANCIERS', '', formatAmount(stmt.compte_resultat?.produits_financiers || 0)],
      [{ content: 'TOTAL DES PRODUITS FINANCIERS (III)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.compte_resultat?.produits_financiers || 0), styles: { fontStyle: 'bold' } }],
      ['AUTRES CHARGES FINANCIERES', '', formatAmount(stmt.compte_resultat?.charges_financieres || 0)],
      [{ content: 'TOTAL DES CHARGES FINANCIERS (IV)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.compte_resultat?.charges_financieres || 0), styles: { fontStyle: 'bold' } }],
      [{ content: 'RESULTAT FINANCIER (III - IV)', styles: { fontStyle: 'bold', fillColor: [240, 240, 200] } }, '', { content: formatAmount(stmt.compte_resultat?.resultat_financier || 0), styles: { fontStyle: 'bold' } }],
      [{ content: 'RESULTAT COURANT AVANT IMPOTS (I-II+III-IV)', styles: { fontStyle: 'bold', fillColor: [240, 240, 200] } }, '', { content: formatAmount(stmt.compte_resultat?.resultat_courant_avant_impots || 0), styles: { fontStyle: 'bold' } }],
      ['PRODUITS EXCEPTIONNELS', '', formatAmount(stmt.compte_resultat?.produits_exceptionnels || 0)],
      [{ content: 'TOTAL DES PRODUITS EXCEPTIONNELS (V)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.compte_resultat?.produits_exceptionnels || 0), styles: { fontStyle: 'bold' } }],
      ['CHARGES EXCEPTIONNELLES', '', formatAmount(stmt.compte_resultat?.charges_exceptionnelles || 0)],
      [{ content: 'TOTAL DES CHARGES EXCEPTIONNELLES (VI)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount(stmt.compte_resultat?.charges_exceptionnelles || 0), styles: { fontStyle: 'bold' } }],
      [{ content: 'RESULTAT EXCEPTIONNEL (V - VI)', styles: { fontStyle: 'bold', fillColor: [240, 240, 200] } }, '', { content: formatAmount(stmt.compte_resultat?.resultat_exceptionnel || 0), styles: { fontStyle: 'bold' } }],
      ['IMPOT SUR LES SOCIETES (IMF)', '', formatAmount(stmt.compte_resultat?.impot_societes || 0)],
      [{ content: 'TOTAL DES PRODUITS (I+III+V)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount((stmt.compte_resultat?.produits_exploitation?.total || 0) + (stmt.compte_resultat?.produits_financiers || 0) + (stmt.compte_resultat?.produits_exceptionnels || 0)), styles: { fontStyle: 'bold' } }],
      [{ content: 'TOTAL DES CHARGES (II+IV+VI+VII)', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }, '', { content: formatAmount((stmt.compte_resultat?.charges_exploitation?.total || 0) + (stmt.compte_resultat?.charges_financieres || 0) + (stmt.compte_resultat?.charges_exceptionnelles || 0) + (stmt.compte_resultat?.impot_societes || 0)), styles: { fontStyle: 'bold' } }],
      [{ content: 'RESULTAT NET', styles: { fontStyle: 'bold', fillColor: [180, 220, 180] } }, '', { content: formatAmount(stmt.compte_resultat?.resultat_net || 0), styles: { fontStyle: 'bold' } }]
    ];

    doc.autoTable({
      startY: yPos,
      head: [['', 'NOTES', 'NET\n31/12/' + stmt.fiscal_year]],
      body: resultatData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 145 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' }
      }
    });

    addFooter(3);

    // Generate PDF buffer
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Etats_Financiers_${stmt.fiscal_year}_${company.nom_entreprise?.replace(/[^a-z0-9]/gi, '_') || 'Entreprise'}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});