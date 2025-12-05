import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function generateMailServiceContract(contract, company) {
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  const startDate = format(new Date(contract.contract_start_date), 'dd MMMM yyyy', { locale: fr });
  const endDate = format(new Date(contract.contract_end_date), 'dd MMMM yyyy', { locale: fr });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contrat de Domiciliation - ${contract.contract_number}</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px double #0A2540; padding-bottom: 20px; }
        .logo { max-width: 150px; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; color: #0A2540; margin: 20px 0; }
        .subtitle { font-size: 14px; color: #666; }
        .contract-number { font-size: 12px; color: #888; margin-top: 10px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 16px; font-weight: bold; color: #0A2540; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
        .parties { display: flex; justify-content: space-between; margin: 20px 0; }
        .party { width: 45%; }
        .party-title { font-weight: bold; margin-bottom: 10px; }
        .article { margin: 20px 0; }
        .article-title { font-weight: bold; }
        .signature-section { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature-box { width: 40%; text-align: center; }
        .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
        .highlight { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .amount { font-size: 18px; font-weight: bold; color: #0A2540; }
        .stamp { border: 2px solid #0A2540; padding: 10px; text-align: center; margin-top: 20px; }
        .stamp-text { font-size: 12px; font-weight: bold; color: #0A2540; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" alt="Logo" class="logo">
        <div class="title">CONTRAT DE DOMICILIATION COMMERCIALE</div>
        <div class="subtitle">Service de Gestion du Courrier avec Boîte Postale</div>
        <div class="contract-number">Contrat N° ${contract.contract_number}</div>
      </div>

      <div class="section">
        <p><strong>Entre les soussignés :</strong></p>
        
        <div class="parties">
          <div class="party">
            <div class="party-title">LE DOMICILIATAIRE :</div>
            <p>
              <strong>Meras PSP / Paie360</strong><br>
              Adresse : Djibouti, République de Djibouti<br>
              Téléphone : +253 77 XX XX XX<br>
              Email : contact@paie360.com<br>
              NIF : XXXXXXXXX
            </p>
          </div>
          <div class="party">
            <div class="party-title">LE DOMICILIÉ :</div>
            <p>
              <strong>${contract.company_name}</strong><br>
              Adresse actuelle : ${contract.company_address || 'N/A'}<br>
              Téléphone : ${contract.company_phone || 'N/A'}<br>
              Email : ${contract.company_email || 'N/A'}<br>
              NIF : ${contract.company_nif || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">PRÉAMBULE</div>
        <p>Le présent contrat est conclu dans le cadre des dispositions légales en vigueur en République de Djibouti relatives à la domiciliation commerciale des entreprises.</p>
      </div>

      <div class="section">
        <div class="article">
          <div class="article-title">ARTICLE 1 - OBJET DU CONTRAT</div>
          <p>Le Domiciliataire met à la disposition du Domicilié une adresse professionnelle avec boîte postale pour les besoins de son activité commerciale, ainsi que les services de réception, tri et stockage du courrier.</p>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 2 - ADRESSE DE DOMICILIATION</div>
          <p>L'adresse de domiciliation attribuée au Domicilié est :</p>
          <div class="highlight">
            <strong>${contract.company_name}</strong><br>
            B.P. ${contract.po_box_number || 'XXXX'}<br>
            Djibouti, République de Djibouti
          </div>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 3 - DURÉE DU CONTRAT</div>
          <p>Le présent contrat est conclu pour une durée de <strong>UN (1) AN</strong>, soit du <strong>${startDate}</strong> au <strong>${endDate}</strong>.</p>
          <p>Il pourra être renouvelé par tacite reconduction, sauf dénonciation par l'une des parties avec un préavis de trois (3) mois.</p>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 4 - PRESTATIONS INCLUSES</div>
          <ul>
            <li>Mise à disposition d'une adresse professionnelle avec P.O. Box</li>
            <li>Réception et stockage de tout courrier entrant (lettres, colis, paquets)</li>
            <li>Notification par email à : <strong>${contract.notification_email}</strong></li>
            <li>Conservation du courrier jusqu'à retrait</li>
            <li>Attestation de domiciliation sur demande</li>
          </ul>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 5 - RESPONSABLE DÉSIGNÉ</div>
          <p>Le responsable désigné pour la gestion du courrier est :</p>
          <div class="highlight">
            <strong>Nom :</strong> ${contract.responsible_name}<br>
            <strong>Téléphone :</strong> ${contract.responsible_phone || 'N/A'}<br>
            <strong>Email :</strong> ${contract.responsible_email}
          </div>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 6 - CONDITIONS FINANCIÈRES</div>
          <p>Le montant de la redevance annuelle est fixé à :</p>
          <div class="highlight">
            <span class="amount">${contract.amount.toLocaleString()} DJF</span> (Quatre-vingt-seize mille francs Djibouti)
            <p style="margin-top: 10px; font-size: 12px;">Payable d'avance à la signature du contrat.</p>
          </div>
          <p><strong>Paiement effectué le :</strong> ${contract.payment_date ? format(new Date(contract.payment_date), 'dd/MM/yyyy') : today}</p>
          <p><strong>Référence de transaction :</strong> ${contract.transaction_id || 'N/A'}</p>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 7 - OBLIGATIONS DU DOMICILIATAIRE</div>
          <ul>
            <li>Assurer la réception et la conservation du courrier</li>
            <li>Notifier le Domicilié de toute arrivée de courrier</li>
            <li>Délivrer les attestations de domiciliation nécessaires</li>
            <li>Respecter la confidentialité des correspondances</li>
          </ul>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 8 - OBLIGATIONS DU DOMICILIÉ</div>
          <ul>
            <li>Payer la redevance annuelle dans les délais</li>
            <li>Informer le Domiciliataire de tout changement de situation</li>
            <li>Retirer son courrier dans un délai raisonnable</li>
            <li>Utiliser l'adresse conformément aux lois en vigueur</li>
          </ul>
        </div>

        <div class="article">
          <div class="article-title">ARTICLE 9 - LOI APPLICABLE</div>
          <p>Le présent contrat est soumis au droit djiboutien. Tout litige sera soumis aux tribunaux compétents de Djibouti.</p>
        </div>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <p><strong>Le Domiciliataire</strong></p>
          <p>Meras PSP / Paie360</p>
          <div class="signature-line">Signature et cachet</div>
        </div>
        <div class="signature-box">
          <p><strong>Le Domicilié</strong></p>
          <p>${contract.company_name}</p>
          <div class="signature-line">Signature et cachet</div>
        </div>
      </div>

      <div class="stamp">
        <div class="stamp-text">CONTRAT PAYÉ ET VALIDÉ</div>
        <p style="font-size: 10px; margin: 5px 0;">Date : ${today}</p>
      </div>

      <div class="footer">
        <p>Ce document constitue un contrat légal entre les parties mentionnées ci-dessus.</p>
        <p>Meras PSP / Paie360 - Services de Domiciliation Commerciale - Djibouti</p>
        <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}