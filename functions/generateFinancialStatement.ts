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
      .filter(t => t.type === 'Revenu' && t.source === 'Service')
      .reduce((sum, t) => sum + t.amount, 0);

    const autres_produits_exploit = transactions
      .filter(t => t.type === 'Revenu' && t.source !== 'Service')
      .reduce((sum, t) => sum + t.amount, 0);

    const total_produits_exploit = prestations_services + autres_produits_exploit;

    // Charges d'Exploitation
    const achats_matieres = transactions
      .filter(t => t.category === 'Achats matières')
      .reduce((sum, t) => sum + t.amount, 0);

    const autres_achats_charges = transactions
      .filter(t => 
        t.type === 'Dépense' && 
        ['Location', 'Fournitures', 'Services externes'].includes(t.category)
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // From payroll
    const salaires_traitements = cycles.reduce((sum, c) => sum + (c.salaire_net_total || 0), 0);
    const charges_sociales = declarations.reduce((sum, d) => sum + (d.total_cnss || 0), 0);
    const impots_taxes = declarations.reduce((sum, d) => sum + (d.total_its || 0), 0);

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
    const produits_financiers = 0;
    const charges_financieres = 0;
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

    // Details Charges Externes
    const details_charges_externes = {
      carburant_eau_energie: transactions
        .filter(t => t.category === 'Énergie')
        .reduce((sum, t) => sum + t.amount, 0),
      sous_traitance: transactions
        .filter(t => t.category === 'Sous-traitance')
        .reduce((sum, t) => sum + t.amount, 0),
      location: transactions
        .filter(t => t.category === 'Location')
        .reduce((sum, t) => sum + t.amount, 0),
      entretien_reparations: transactions
        .filter(t => t.category === 'Entretien')
        .reduce((sum, t) => sum + t.amount, 0),
      assurances: transactions
        .filter(t => t.category === 'Assurances')
        .reduce((sum, t) => sum + t.amount, 0),
      deplacements: transactions
        .filter(t => t.category === 'Déplacements')
        .reduce((sum, t) => sum + t.amount, 0),
      honoraires: transactions
        .filter(t => t.category === 'Honoraires')
        .reduce((sum, t) => sum + t.amount, 0),
      publicite: transactions
        .filter(t => t.category === 'Publicité')
        .reduce((sum, t) => sum + t.amount, 0),
      frais_postaux: transactions
        .filter(t => t.category === 'Télécommunications')
        .reduce((sum, t) => sum + t.amount, 0),
      services_bancaires: transactions
        .filter(t => t.category === 'Services bancaires')
        .reduce((sum, t) => sum + t.amount, 0),
      divers: transactions
        .filter(t => t.category === 'Divers')
        .reduce((sum, t) => sum + t.amount, 0)
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

    // Create Financial Statement
    const financialStatement = await base44.asServiceRole.entities.FinancialStatement.create({
      fiscal_year,
      period_start,
      period_end,
      status: 'Validé',
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
          prestations_services,
          autres_produits: autres_produits_exploit,
          total: total_produits_exploit
        },
        charges_exploitation: {
          achats_matieres,
          autres_achats_charges,
          salaires_traitements,
          charges_sociales,
          impots_taxes,
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