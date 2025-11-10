import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { declaration_id } = body;
    
    if (!declaration_id) {
      return Response.json({ error: 'Missing declaration_id' }, { status: 400 });
    }

    // Fetch declaration
    const declarations = await base44.asServiceRole.entities.Declaration.filter({ id: declaration_id });
    const declaration = declarations[0];
    
    if (!declaration) {
      return Response.json({ error: 'Declaration not found' }, { status: 404 });
    }

    // Fetch company
    const companies = await base44.asServiceRole.entities.Company.list();
    const company = companies[0] || {};

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = 210;
    const pageHeight = 297;
    
    // ===== HEADER SECTION =====
    // Background header
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // CNSS Logo (Blue Circle)
    doc.setFillColor(0, 102, 255);
    doc.circle(30, 25, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('CNSS', 30, 27, { align: 'center' });
    
    // Company Logo (if available)
    if (company.logo_url) {
      try {
        const logoResponse = await fetch(company.logo_url);
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await blobToBase64(logoBlob);
        doc.addImage(logoBase64, 'PNG', 50, 12, 25, 25);
      } catch (e) {
        console.error('Logo load error:', e);
      }
    }
    
    // QR Code Placeholder (Enhanced)
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(1);
    doc.rect(85, 10, 30, 30);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('QR CODE', 100, 27, { align: 'center' });
    doc.setFontSize(6);
    doc.text('Scan pour vérifier', 100, 31, { align: 'center' });
    
    // Official Government Header
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RÉPUBLIQUE DE DJIBOUTI', 150, 15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Unité-Égalité-Paix', 150, 21);
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(120, 23, 200, 23);
    doc.setFontSize(9);
    doc.text('Ministère du Travail', 150, 28);
    doc.text('chargé de la', 150, 33);
    doc.text('Réforme de l\'administration', 150, 38);
    
    // Receipt Info Bar
    doc.setFillColor(0, 102, 255);
    doc.rect(0, 50, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('N° de caisse: Recettes des Cotisations 6', 15, 57);
    doc.text(`REÇU N°: ${declaration.numero_cotisation}`, 120, 57);
    
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(`Djibouti, le: ${dateStr}`, 15, 60.5);
    
    // ===== COMPANY & PAYMENT INFO SECTION =====
    let y = 72;
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    // Left Column
    doc.setFont(undefined, 'bold');
    doc.text('N° Employeur:', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text(company.numero_affiliation || 'N/A', 55, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Cotisation Total Due:', 115, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(`${declaration.total?.toLocaleString() || 0} DJF`, 165, y);
    
    y += 7;
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'bold');
    doc.text('Nom ou Raison sociale:', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text(company.nom_entreprise || 'N/A', 55, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Règlement:', 115, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(34, 197, 94);
    doc.text(`${declaration.total?.toLocaleString() || 0} DJF`, 165, y);
    
    y += 7;
    doc.setTextColor(15, 23, 42);
    const createdDate = declaration.created_date ? new Date(declaration.created_date).toLocaleDateString('fr-FR') : 'N/A';
    doc.setFont(undefined, 'bold');
    doc.text('Date de règlement:', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text(createdDate, 55, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Référence de paiement:', 115, y);
    doc.setFont(undefined, 'normal');
    doc.text(declaration.transaction_id || declaration.numero_cotisation, 165, y);
    
    y += 7;
    doc.setFont(undefined, 'bold');
    doc.text('Mode de paiement:', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text(declaration.statut === 'Payé' ? 'Payé' : 'En attente', 55, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Compte de contrepartie:', 115, y);
    doc.setFont(undefined, 'normal');
    doc.text(company.numero_compte || '5309000000', 165, y);
    
    y += 7;
    doc.setFont(undefined, 'bold');
    doc.text('Type de compte:', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text('Ledger', 55, y);
    
    const resteAPayer = declaration.statut === 'Payé' ? '0.00' : (declaration.total?.toLocaleString() || '0');
    doc.setFont(undefined, 'bold');
    doc.text('Reste à Payer:', 115, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(resteAPayer === '0.00' ? 34 : 220, resteAPayer === '0.00' ? 197 : 38, resteAPayer === '0.00' ? 94 : 38);
    doc.text(`${resteAPayer} DJF`, 165, y);
    
    // ===== TABLE SECTION =====
    y += 15;
    doc.setTextColor(15, 23, 42);
    
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 10, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(15, y, 180, 10);
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Type', 20, y + 6);
    doc.text('Période', 45, y + 6);
    doc.text('CNSS', 70, y + 6);
    doc.text('ITS', 90, y + 6);
    doc.text('Nb', 105, y + 6);
    doc.text('M.Salariale', 118, y + 6);
    doc.text('M.Salariale', 145, y + 6);
    doc.text('Échéance', 170, y + 6);
    doc.setFontSize(7);
    doc.text('Salariés', 105, y + 8.5);
    doc.text('de Base', 118, y + 8.5);
    doc.text('Brut', 145, y + 8.5);
    doc.text('N° Appel', 170, y + 8.5);
    
    // Table Content
    y += 10;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    
    const periode = declaration.mois_annee || declaration.periode || 'N/A';
    const dateLimite = declaration.date_limite ? new Date(declaration.date_limite).toLocaleDateString('fr-FR') : '';
    
    // CNSS Row
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, 180, 8);
    doc.text('Cotisation', 20, y + 5);
    doc.text(periode, 45, y + 5);
    doc.text(`${declaration.total_cnss?.toLocaleString() || 0}`, 70, y + 5);
    doc.text('-', 90, y + 5);
    doc.text(`${declaration.nombre_employes || 0}`, 107, y + 5);
    doc.text(`${declaration.masse_salariale?.toLocaleString() || 0}`, 118, y + 5);
    doc.text(`${declaration.masse_salariale?.toLocaleString() || 0}`, 145, y + 5);
    doc.text(dateLimite, 170, y + 5);
    
    // ITS Row
    y += 8;
    doc.rect(15, y, 180, 8);
    doc.text('ITS', 20, y + 5);
    doc.text(periode, 45, y + 5);
    doc.text('-', 70, y + 5);
    doc.text(`${declaration.total_its?.toLocaleString() || 0}`, 90, y + 5);
    doc.text('-', 107, y + 5);
    doc.text('-', 118, y + 5);
    doc.text('-', 145, y + 5);
    doc.text(dateLimite, 170, y + 5);
    
    // Totals Row
    y += 8;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 8, 'F');
    doc.rect(15, y, 180, 8);
    doc.setFont(undefined, 'bold');
    doc.text('Somme', 20, y + 5);
    doc.text(`${declaration.total_cnss?.toLocaleString() || 0} DJF`, 70, y + 5);
    doc.text(`${declaration.total_its?.toLocaleString() || 0} DJF`, 90, y + 5);
    doc.text(`${declaration.masse_salariale?.toLocaleString() || 0} DJF`, 118, y + 5);
    doc.text(`${declaration.masse_salariale?.toLocaleString() || 0} DJF`, 145, y + 5);
    
    // ===== FINANCIAL SUMMARY SECTION =====
    y += 18;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(2);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, y, 180, 30, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('RÉCAPITULATIF FINANCIER', 20, y + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');
    doc.text('Total CNSS (Salarié + Patronal):', 20, y + 16);
    doc.setFont(undefined, 'bold');
    doc.text(`${declaration.total_cnss?.toLocaleString() || 0} DJF`, 175, y + 16, { align: 'right' });
    
    doc.setFont(undefined, 'normal');
    doc.text('Total ITS (Impôt sur les Traitements et Salaires):', 20, y + 22);
    doc.setFont(undefined, 'bold');
    doc.text(`${declaration.total_its?.toLocaleString() || 0} DJF`, 175, y + 22, { align: 'right' });
    
    // Grand Total
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(15, y + 25, 180, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('MONTANT TOTAL À PAYER:', 20, y + 32);
    doc.setFontSize(16);
    doc.text(`${declaration.total?.toLocaleString() || 0} DJF`, 175, y + 32, { align: 'right' });
    
    // ===== SIGNATURE SECTION =====
    y += 45;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Caissier: ${company.signatory_payslip_name || company.nom_entreprise || 'Administrateur'}`, 15, y);
    doc.text('Visa du caissier', 140, y);
    
    // Signature Box
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(140, y + 5, 50, 30);
    doc.setFontSize(7);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Signature et cachet', 165, y + 22, { align: 'center' });
    
    // ===== FOOTER =====
    y = pageHeight - 20;
    doc.setFillColor(0, 102, 255);
    doc.rect(0, y, pageWidth, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const footerText = `${company.nom_entreprise || 'Paie360'} - Déclaration CNSS générée le ${dateStr}`;
    doc.text(footerText, pageWidth / 2, y + 8, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text('Document officiel généré par Paie360 - Conforme aux normes CNSS Djibouti', pageWidth / 2, y + 12, { align: 'center' });
    
    // Watermark if not paid
    if (declaration.statut !== 'Payé') {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(60);
      doc.setFont(undefined, 'bold');
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.text('NON PAYÉ', pageWidth / 2, pageHeight / 2, { 
        align: 'center',
        angle: 45 
      });
      doc.restoreGraphicsState();
    }

    // Get PDF as ArrayBuffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    
    return new Response(pdfArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Declaration_CNSS_${declaration.periode}_${declaration.numero_cotisation}.pdf`
      }
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    }, { status: 500 });
  }
});

// Helper function to convert blob to base64
async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:image/png;base64,' + btoa(binary);
}