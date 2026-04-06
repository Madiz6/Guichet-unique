import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { fiscal_year, period_start, period_end } = await req.json();

    if (!fiscal_year || !period_start || !period_end) {
      return Response.json({ 
        error: 'Paramètres requis: fiscal_year, period_start, period_end' 
      }, { status: 400 });
    }

    // Fetch all necessary data
    const [
      transactions,
      employees,
      cycles,
      declarations,
      assets,
      company
    ] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({
        date: { $gte: period_start, $lte: period_end }
      }),
      base44.asServiceRole.entities.Employee.list(),
      base44.asServiceRole.entities.PayrollCycle.filter({
        date_paiement: { $gte: period_start, $lte: period_end }
      }),
      base44.asServiceRole.entities.Declaration.filter({
        periode: { $gte: fiscal_year + '01', $lte: fiscal_year + '12' }
      }),
      base44.asServiceRole.entities.Asset.list(),
      base44.asServiceRole.entities.Company.list()
    ]);

    const companyData = company[0] || {};

    // ========== ACTIF - BILAN ==========
    
    // Immobilisations Incorporelles
    const immobIncorp = assets.filter(a => a.categorie === 'Incorporelle');
    const fraisEtab = immobIncorp.filter(a => a.type === "Frais d'établissement");
    const fraisRD = immobIncorp.filter(a => a.type === "Frais R&D");
    const logiciels = immobIncorp.filter(a => a.type === "Logiciels et concessions");

    const actif_immob_incorp = {
      frais_etablissement_brut: fraisEtab.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      frais_etablissement_amort: fraisEtab.reduce((sum, a) => sum + a.amortissement_cumule, 0),
      frais_recherche_dev_brut: fraisRD.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      frais_recherche_dev_amort: fraisRD.reduce((sum, a) => sum + a.amortissement_cumule, 0),
      logiciels_brut: logiciels.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      logiciels_amort: logiciels.reduce((sum, a) => sum + a.amortissement_cumule, 0)
    };

    actif_immob_incorp.total_brut = 
      actif_immob_incorp.frais_etablissement_brut + 
      actif_immob_incorp.frais_recherche_dev_brut + 
      actif_immob_incorp.logiciels_brut;

    actif_immob_incorp.total_amort = 
      actif_immob_incorp.frais_etablissement_amort + 
      actif_immob_incorp.frais_recherche_dev_amort + 
      actif_immob_incorp.logiciels_amort;

    actif_immob_incorp.total_net = actif_immob_incorp.total_brut - actif_immob_incorp.total_amort;

    // Immobilisations Corporelles
    const immobCorp = assets.filter(a => a.categorie === 'Corporelle');
    const agencements = immobCorp.filter(a => a.type === "Agencements");
    const materielBureau = immobCorp.filter(a => 
      a.type === "Matériel de bureau" || a.type === "Matériel informatique"
    );
    const mobilier = immobCorp.filter(a => a.type === "Mobilier");
    const transport = immobCorp.filter(a => a.type === "Matériel de transport");

    const actif_immob_corp = {
      agencements_brut: agencements.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      agencements_amort: agencements.reduce((sum, a) => sum + a.amortissement_cumule, 0),
      materiel_bureau_brut: materielBureau.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      materiel_bureau_amort: materielBureau.reduce((sum, a) => sum + a.amortissement_cumule, 0),
      mobilier_brut: mobilier.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      mobilier_amort: mobilier.reduce((sum, a) => sum + a.amortissement_cumule, 0),
      materiel_transport_brut: transport.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      materiel_transport_amort: transport.reduce((sum, a) => sum + a.amortissement_cumule, 0)
    };

    actif_immob_corp.total_brut = 
      actif_immob_corp.agencements_brut + 
      actif_immob_corp.materiel_bureau_brut + 
      actif_immob_corp.mobilier_brut +
      actif_immob_corp.materiel_transport_brut;

    actif_immob_corp.total_amort = 
      actif_immob_corp.agencements_amort + 
      actif_immob_corp.materiel_bureau_amort + 
      actif_immob_corp.mobilier_amort +
      actif_immob_corp.materiel_transport_amort;

    actif_immob_corp.total_net = actif_immob_corp.total_brut - actif_immob_corp.total_amort;

    // Immobilisations Financières
    const immobFinan = assets.filter(a => a.categorie === 'Financière');
    const actif_immob_finan = {
      depots_cautionnements: immobFinan.reduce((sum, a) => sum + a.valeur_acquisition, 0),
      total: immobFinan.reduce((sum, a) => sum + a.valeur_acquisition, 0)
    };

    // Créances
    const creancesClients = transactions.filter(t => 
      t.type === 'Revenu' && t.status === 'En attente'
    ).reduce((sum, t) => sum + t.amount, 0);

    const autresCreances = transactions.filter(t => 
      t.source === 'Autre' && t.status === 'En attente'
    ).reduce((sum, t) => sum + t.amount, 0);

    const actif_creances = {
      clients: creancesClients,
      autres_creances: autresCreances,
      total: creancesClients + autresCreances
    };

    // Disponibilités (from latest transactions)
    const disponibilites = transactions
      .filter(t => t.status === 'Payé')
      .reduce((sum, t) => {
        return t.type === 'Revenu' ? sum + t.amount : sum - t.amount;
      }, 0);

    const total_actif = 
      actif_immob_incorp.total_net + 
      actif_immob_corp.total_net + 
      actif_immob_finan.total + 
      actif_creances.total + 
      disponibilites;

    // ========== PASSIF - BILAN ==========

    // Capitaux Propres
    const capital_social = companyData.capital_social || 300000;
    
    // Calculate result from Compte de Résultat (below)
    // For now, placeholder
    const resultat_exercice = 0; // Will be calculated
    
    const passif_capitaux_propres = {
      capital_social,
      reserve_legale: 0,
      report_nouveau: 0,
      resultat_exercice,
      total: capital_social + resultat_exercice
    };

    // Dettes
    const dettesFournisseurs = transactions.filter(t => 
      t.type === 'Dépense' && t.status === 'En attente'
    ).reduce((sum, t) => sum + t.amount, 0);

    const dettesFiscales = declarations.reduce((sum, d) => {
      if (d.statut !== 'Payé') {
        return sum + (d.total_cnss || 0) + (d.total_its || 0);
      }
      return sum;
    }, 0);

    const autresDettes = 0; // Comptes courants associés, etc.

    const passif_dettes = {
      emprunts: 0,
      fournisseurs: dettesFournisseurs,
      dettes_fiscales_sociales: dettesFiscales,
      autres_dettes: autresDettes,
      total: dettesFournisseurs + dettesFiscales + autresDettes
    };

    const total_passif = passif_capitaux_propres.total + passif_dettes.total;

    // ========== COMPTE DE RÉSULTAT ==========

    // Produits d'Exploitation
    const prestations_services = transactions
      .filter(t => 
        t.type === 'Revenu' && 
        (t.compte_comptable === '706' || t.category?.includes('Services'))
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const ventes_marchandises = transactions
      .filter(t => t.type === 'Revenu' && t.compte_comptable === '701')
      .reduce((sum, t) => sum + t.amount, 0);

    const autres_produits_exploit = transactions
      .filter(t => 
        t.type === 'Revenu' && 
        !['706', '701', '762', '101', '164'].includes(t.compte_comptable)
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const total_produits_exploit = prestations_services + ventes_marchandises + autres_produits_exploit;

    // Charges d'Exploitation
    const achats_matieres = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '601')
      .reduce((sum, t) => sum + t.amount, 0);

    const achats_fournitures = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '606')
      .reduce((sum, t) => sum + t.amount, 0);

    const sous_traitance = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '611')
      .reduce((sum, t) => sum + t.amount, 0);

    const locations = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '613')
      .reduce((sum, t) => sum + t.amount, 0);

    const entretien_reparations = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '615')
      .reduce((sum, t) => sum + t.amount, 0);

    const assurances = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '616')
      .reduce((sum, t) => sum + t.amount, 0);

    const personnel_exterieur = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '617')
      .reduce((sum, t) => sum + t.amount, 0);

    const documentation = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '621')
      .reduce((sum, t) => sum + t.amount, 0);

    const honoraires = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '622')
      .reduce((sum, t) => sum + t.amount, 0);

    const publicite = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '623')
      .reduce((sum, t) => sum + t.amount, 0);

    const transports = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '624')
      .reduce((sum, t) => sum + t.amount, 0);

    const missions_receptions = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '625')
      .reduce((sum, t) => sum + t.amount, 0);

    const telecommunications = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '626')
      .reduce((sum, t) => sum + t.amount, 0);

    const services_bancaires = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '627')
      .reduce((sum, t) => sum + t.amount, 0);

    const divers_services = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '628')
      .reduce((sum, t) => sum + t.amount, 0);

    const autres_achats_charges = 
      achats_fournitures + sous_traitance + locations + entretien_reparations + 
      assurances + personnel_exterieur + documentation + honoraires + publicite + 
      transports + missions_receptions + telecommunications + services_bancaires + divers_services;

    // From payroll and transactions
    const salaires_traitements = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '641')
      .reduce((sum, t) => sum + t.amount, 0) || 
      cycles.reduce((sum, c) => sum + (c.salaire_net_total || 0), 0);

    const charges_sociales_cnss = transactions
      .filter(t => t.type === 'Dépense' && t.source === 'Declaration CNSS')
      .reduce((sum, t) => sum + t.amount, 0) ||
      declarations.reduce((sum, d) => sum + (d.total_cnss || 0), 0);

    const impots_taxes_its = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '635')
      .reduce((sum, t) => sum + t.amount, 0) ||
      declarations.reduce((sum, d) => sum + (d.total_its || 0), 0);

    const charges_sociales = charges_sociales_cnss;
    const impots_taxes = impots_taxes_its;

    // Dotations aux amortissements
    const dotations_amortissements = assets.reduce((sum, a) => {
      const yearStart = new Date(period_start);
      const yearEnd = new Date(period_end);
      const acquisitionDate = new Date(a.date_acquisition);
      
      if (acquisitionDate <= yearEnd) {
        const monthsInYear = Math.min(
          12,
          Math.ceil((yearEnd - Math.max(yearStart, acquisitionDate)) / (1000 * 60 * 60 * 24 * 30))
        );
        const annualAmort = (a.valeur_acquisition * a.taux_amortissement) / 100;
        const periodAmort = (annualAmort / 12) * monthsInYear;
        return sum + periodAmort;
      }
      return sum;
    }, 0);

    const autres_charges = transactions
      .filter(t => t.type === 'Dépense' && t.category === 'Autres charges')
      .reduce((sum, t) => sum + t.amount, 0);

    const total_charges_exploit = 
      achats_matieres +
      autres_achats_charges +
      salaires_traitements +
      charges_sociales +
      impots_taxes +
      dotations_amortissements +
      autres_charges;

    const resultat_exploitation = total_produits_exploit - total_charges_exploit;

    // Résultat Financier
    const produits_financiers = transactions
      .filter(t => t.type === 'Revenu' && t.compte_comptable === '762')
      .reduce((sum, t) => sum + t.amount, 0);

    const charges_financieres = transactions
      .filter(t => t.type === 'Dépense' && t.compte_comptable === '661')
      .reduce((sum, t) => sum + t.amount, 0);

    const resultat_financier = produits_financiers - charges_financieres;

    // Résultat Courant
    const resultat_courant = resultat_exploitation + resultat_financier;

    // Résultat Exceptionnel
    const produits_exceptionnels = 0;
    const charges_exceptionnelles = transactions
      .filter(t => t.category === 'Charges exceptionnelles')
      .reduce((sum, t) => sum + t.amount, 0);
    const resultat_exceptionnel = produits_exceptionnels - charges_exceptionnelles;

    // Impôt sur les sociétés (IMF)
    const impot_societes = 120000; // IMF minimum

    // Résultat Net
    const resultat_net = resultat_courant + resultat_exceptionnel - impot_societes;

    // Update resultat in capitaux propres
    passif_capitaux_propres.resultat_exercice = resultat_net;
    passif_capitaux_propres.total = capital_social + resultat_net;

    // Details Charges Externes (by NPCG code)
    const details_charges_externes = {
      achats_fournitures_606: achats_fournitures,
      sous_traitance_611: sous_traitance,
      location_613: locations,
      entretien_reparations_615: entretien_reparations,
      assurances_616: assurances,
      personnel_exterieur_617: personnel_exterieur,
      documentation_621: documentation,
      honoraires_622: honoraires,
      publicite_623: publicite,
      transports_624: transports,
      missions_receptions_625: missions_receptions,
      telecommunications_626: telecommunications,
      services_bancaires_627: services_bancaires,
      divers_628: divers_services
    };

    // ========== DÉTAILS PAR COMPTE NPCG ==========
    const details_par_compte_npcg = {};
    
    // Group transactions by compte_comptable
    transactions.forEach(t => {
      const compte = t.compte_comptable || 'NON_CLASSE';
      if (!details_par_compte_npcg[compte]) {
        details_par_compte_npcg[compte] = {
          code: compte,
          transactions: [],
          total: 0,
          count: 0
        };
      }
      details_par_compte_npcg[compte].transactions.push({
        id: t.id,
        date: t.date,
        description: t.description,
        contact_name: t.contact_name,
        amount: t.amount,
        category: t.category,
        numero_facture: t.numero_facture
      });
      details_par_compte_npcg[compte].total += t.amount || 0;
      details_par_compte_npcg[compte].count += 1;
    });

    // ========== DÉTAILS IMMOBILISATIONS ==========
    const details_immobilisations = assets.map(asset => {
      const acquisitionDate = new Date(asset.date_acquisition);
      const yearStart = new Date(period_start);
      const yearEnd = new Date(period_end);
      
      // Calculate depreciation for this year
      let amort_annee = 0;
      if (acquisitionDate <= yearEnd) {
        const monthsInYear = Math.min(
          12,
          Math.ceil((yearEnd - Math.max(yearStart, acquisitionDate)) / (1000 * 60 * 60 * 24 * 30))
        );
        const annualAmort = (asset.valeur_acquisition * asset.taux_amortissement) / 100;
        amort_annee = (annualAmort / 12) * monthsInYear;
      }

      return {
        nom: asset.nom,
        type: asset.type,
        categorie: asset.categorie,
        date_acquisition: asset.date_acquisition,
        valeur_brute: asset.valeur_acquisition,
        taux_amort: asset.taux_amortissement,
        duree_ans: asset.duree_utilisation_ans,
        amort_annee,
        amort_cumule: asset.amortissement_cumule,
        valeur_nette: asset.valeur_nette_comptable,
        reference: asset.reference,
        fournisseur: asset.fournisseur,
        statut: asset.statut
      };
    });

    // ========== DÉTAILS CRÉANCES ==========
    const details_creances = transactions
      .filter(t => t.is_creance && t.status === 'En attente')
      .map(t => {
        const factureDate = new Date(t.date);
        const today = new Date();
        const jours_retard = Math.floor((today - factureDate) / (1000 * 60 * 60 * 24));

        return {
          contact_name: t.contact_name,
          numero_facture: t.numero_facture,
          montant: t.amount,
          date_facture: t.date,
          date_echeance: t.date_echeance,
          jours_retard,
          categorie_risque: jours_retard > 90 ? 'Douteuse' : jours_retard > 60 ? 'Moyenne' : 'Normale'
        };
      });

    // ========== DÉTAILS DETTES ==========
    const details_dettes = transactions
      .filter(t => t.is_dette && t.status === 'En attente')
      .map(t => ({
        contact_name: t.contact_name,
        numero_facture: t.numero_facture,
        montant: t.amount,
        date_facture: t.date,
        date_echeance: t.date_echeance,
        compte_comptable: t.compte_comptable
      }));

    // ========== DÉTAILS EMPRUNTS ==========
    const [loansData] = await Promise.all([
      base44.asServiceRole.entities.Loan.filter({ statut: 'En cours' })
    ]);

    const details_emprunts = loansData.map(loan => ({
      banque: loan.banque,
      numero_pret: loan.numero_pret,
      type_pret: loan.type_pret,
      montant_initial: loan.montant_initial,
      montant_restant: loan.montant_restant,
      taux_interet: loan.taux_interet,
      date_debut: loan.date_debut,
      date_echeance: loan.date_echeance,
      mensualite: loan.mensualite
    }));

    // ========== PROVISIONS ==========
    const creances_douteuses = details_creances
      .filter(c => c.categorie_risque === 'Douteuse')
      .reduce((sum, c) => sum + c.montant * 0.5, 0); // 50% provision

    const provisions = {
      provisions_creances_douteuses: creances_douteuses,
      provisions_charges_a_payer: 0,
      provisions_impots: 0,
      total_provisions: creances_douteuses
    };

    // Ratios Financiers
    const actif_circulant = actif_creances.total + disponibilites;
    const dettes_court_terme = passif_dettes.fournisseurs + passif_dettes.dettes_fiscales_sociales;
    
    const ratios_financiers = {
      liquidite_generale: dettes_court_terme > 0 ? actif_circulant / dettes_court_terme : 0,
      autonomie_financiere: total_passif > 0 ? (passif_capitaux_propres.total / total_passif) * 100 : 0,
      endettement: passif_capitaux_propres.total !== 0 ? (passif_dettes.total / passif_capitaux_propres.total) * 100 : 0,
      rentabilite_nette: total_produits_exploit > 0 ? (resultat_net / total_produits_exploit) * 100 : 0
    };

    // ========== VALIDATION: ACTIF = PASSIF ==========
    const equilibre_bilan = Math.abs(total_actif - total_passif);
    if (equilibre_bilan > 1) { // Allow 1 DJF rounding difference
      console.warn('ATTENTION: Bilan non équilibré!', {
        total_actif,
        total_passif,
        difference: equilibre_bilan
      });
    }

    // ========== NOTES ADDITIONNELLES ==========
    const notes_annexes = {
      note_1_presentation: `L'entreprise ${companyData?.nom_entreprise || 'ENTREPRISE'} exerce son activité depuis ${companyData?.date_creation ? new Date(companyData.date_creation).toLocaleDateString('fr-FR') : 'N/A'}. Les états financiers sont établis conformément au NPCG (Nouveau Plan Comptable Général).`,
      note_2_principes: "Les états financiers sont établis selon les principes de prudence, continuité d'exploitation, permanence des méthodes, et coût historique. Les immobilisations sont amorties selon la méthode linéaire.",
      note_3_immobilisations: details_immobilisations,
      note_4_creances_clients: details_creances.filter(c => c.numero_facture),
      note_5_autres_creances: details_creances.filter(c => !c.numero_facture),
      note_6_disponibilites: bankAccounts.map(b => ({
        nom: b.nom_compte,
        banque: b.banque,
        solde: b.solde_actuel,
        devise: b.devise
      })),
      note_7_dettes_fournisseurs: details_dettes.filter(d => d.compte_comptable?.startsWith('401')),
      note_8_dettes_fiscales_sociales: {
        cnss: passif_dettes.cnss || 0,
        its: passif_dettes.its || 0,
        impots: passif_dettes.impots || 0,
        salaires_dus: passif_dettes.salaires_dus || 0,
        total: passif_dettes.dettes_fiscales_sociales
      },
      note_9_autres_dettes: {
        comptes_courants_associes: shareholders.map(s => ({
          nom: s.nom,
          montant: s.compte_courant_associe || 0
        })),
        emprunts: details_emprunts,
        total: passif_dettes.autres_dettes
      },
      note_10_charges_externes: {
        carburant_energie: 0,
        sous_traitance: 0,
        location: 0,
        entretien: 0,
        assurances: 0,
        honoraires: 0,
        publicite: 0,
        frais_postaux: 0,
        services_bancaires: 0,
        divers: 0
      }
    };

    // Populate note_10 from transactions
    transactions.forEach(t => {
      if (t.type === 'Dépense' && t.compte_comptable) {
        const code = t.compte_comptable;
        if (code === '606' || code.startsWith('606')) notes_annexes.note_10_charges_externes.carburant_energie += t.amount || 0;
        if (code === '611' || code.startsWith('611')) notes_annexes.note_10_charges_externes.sous_traitance += t.amount || 0;
        if (code === '613' || code.startsWith('613')) notes_annexes.note_10_charges_externes.location += t.amount || 0;
        if (code === '615' || code.startsWith('615')) notes_annexes.note_10_charges_externes.entretien += t.amount || 0;
        if (code === '616' || code.startsWith('616')) notes_annexes.note_10_charges_externes.assurances += t.amount || 0;
        if (code === '622' || code.startsWith('622')) notes_annexes.note_10_charges_externes.honoraires += t.amount || 0;
        if (code === '623' || code.startsWith('623')) notes_annexes.note_10_charges_externes.publicite += t.amount || 0;
        if (code === '626' || code.startsWith('626')) notes_annexes.note_10_charges_externes.frais_postaux += t.amount || 0;
        if (code === '627' || code.startsWith('627')) notes_annexes.note_10_charges_externes.services_bancaires += t.amount || 0;
        if (code === '628' || code.startsWith('628')) notes_annexes.note_10_charges_externes.divers += t.amount || 0;
      }
    });

    // Create Financial Statement with full details
    const financialStatement = await base44.asServiceRole.entities.FinancialStatement.create({
      fiscal_year,
      period_start,
      period_end,
      status: 'Validé',
      details_par_compte_npcg,
      details_immobilisations,
      details_creances,
      details_dettes,
      details_emprunts,
      provisions,
      notes_annexes,
      actif: {
        immobilisations_incorporelles: actif_immob_incorp,
        immobilisations_corporelles: actif_immob_corp,
        immobilisations_financieres: actif_immob_finan,
        stocks: 0,
        creances: actif_creances,
        disponibilites,
        total_actif
      },
      passif: {
        capitaux_propres: passif_capitaux_propres,
        provisions_risques: 0,
        dettes: passif_dettes,
        total_passif
      },
      compte_resultat: {
        produits_exploitation: {
          ventes_marchandises_701: ventes_marchandises,
          prestations_services_706: prestations_services,
          autres_produits: autres_produits_exploit,
          total: total_produits_exploit
        },
        charges_exploitation: {
          achats_matieres_601: achats_matieres,
          achats_fournitures_606: achats_fournitures,
          sous_traitance_611: sous_traitance,
          locations_613: locations,
          entretien_615: entretien_reparations,
          assurances_616: assurances,
          personnel_ext_617: personnel_exterieur,
          documentation_621: documentation,
          honoraires_622: honoraires,
          publicite_623: publicite,
          transports_624: transports,
          missions_625: missions_receptions,
          telecom_626: telecommunications,
          banque_627: services_bancaires,
          divers_628: divers_services,
          impots_taxes_635: impots_taxes,
          salaires_traitements_641: salaires_traitements,
          charges_sociales_cnss: charges_sociales,
          dotations_amortissements,
          autres_charges,
          total: total_charges_exploit
        },
        resultat_exploitation,
        produits_financiers,
        charges_financieres,
        resultat_financier,
        resultat_courant_avant_impots: resultat_courant,
        produits_exceptionnels,
        charges_exceptionnelles,
        resultat_exceptionnel,
        impot_societes,
        resultat_net
      },
      details_charges_externes,
      ratios_financiers,
      notes: `États financiers générés automatiquement pour l'exercice ${fiscal_year}`
    });

    return Response.json({
      success: true,
      financial_statement_id: financialStatement.id,
      summary: {
        total_actif,
        total_passif,
        resultat_net,
        ratios: ratios_financiers
      },
      message: 'États financiers générés avec succès'
    });

  } catch (error) {
    console.error('Error generating financial statement:', error);
    return Response.json({ 
      error: error.message,
      details: 'Erreur lors de la génération des états financiers'
    }, { status: 500 });
  }
});