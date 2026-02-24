import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, data } = body;

    if (action === 'analyze_dashboard') {
      const { transactions = [], budgets = [], employees = [], expenseRequests = [] } = data;

      const totalRevenue = transactions.filter(t => t.type === 'Revenu').reduce((s, t) => s + (t.amount || 0), 0);
      const totalExpenses = transactions.filter(t => t.type === 'Dépense').reduce((s, t) => s + (t.amount || 0), 0);
      const pendingPayments = transactions.filter(t => t.status === 'En attente').length;
      const overdraftBudgets = budgets.filter(b => (b.amount_used || 0) > b.amount_allocated).length;
      const alertBudgets = budgets.filter(b => b.status === 'Alerte').length;
      const pendingRequests = expenseRequests.filter(r => r.status === 'En attente').length;

      const prompt = `
Tu es un assistant financier expert pour une entreprise djiboutienne (Paie360 / Meras PSP).

Voici les données financières actuelles:
- Transactions totales: ${transactions.length}
- Revenus totaux: ${totalRevenue.toLocaleString()} DJF
- Dépenses totales: ${totalExpenses.toLocaleString()} DJF
- Résultat net: ${(totalRevenue - totalExpenses).toLocaleString()} DJF
- Transactions en attente: ${pendingPayments}
- Budgets dépassés: ${overdraftBudgets}
- Budgets en alerte: ${alertBudgets}
- Demandes de dépenses en attente: ${pendingRequests}
- Employés actifs: ${employees.length}

Génère exactement 4 insights actionnables et prioritaires en français, format JSON:
{
  "insights": [
    {
      "type": "warning|success|info|critical",
      "title": "Titre court (max 8 mots)",
      "message": "Explication claire et actionnable (max 20 mots)",
      "action": "Action recommandée (max 6 mots)",
      "priority": 1-4
    }
  ],
  "summary": "Résumé global de la santé financière en 1 phrase"
}`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  message: { type: 'string' },
                  action: { type: 'string' },
                  priority: { type: 'number' }
                }
              }
            },
            summary: { type: 'string' }
          }
        }
      });

      return Response.json(result);
    }

    if (action === 'autocomplete_transaction') {
      const { description, recentTransactions = [], contacts = [] } = data;

      if (!description || description.length < 3) {
        return Response.json({ suggestions: [] });
      }

      // Find pattern matches from history
      const similar = recentTransactions
        .filter(t => t.description?.toLowerCase().includes(description.toLowerCase()) ||
                     t.contact_name?.toLowerCase().includes(description.toLowerCase()))
        .slice(0, 5);

      if (similar.length === 0) {
        return Response.json({ suggestions: [] });
      }

      const prompt = `
Tu es un assistant de saisie comptable pour une entreprise à Djibouti.

L'utilisateur tape: "${description}"

Transactions similaires dans l'historique:
${similar.map(t => `- ${t.description} | ${t.contact_name || ''} | ${t.amount} DJF | ${t.category || ''} | ${t.type} | ${t.payment_method || ''}`).join('\n')}

Génère jusqu'à 3 suggestions d'autocomplétion basées sur l'historique, format JSON:
{
  "suggestions": [
    {
      "description": "Description complète",
      "contact_name": "Nom contact",
      "amount": 0,
      "type": "Revenu ou Dépense",
      "category": "Catégorie",
      "payment_method": "Méthode",
      "confidence": 0.0-1.0,
      "reason": "Basé sur... (max 5 mots)"
    }
  ]
}`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  contact_name: { type: 'string' },
                  amount: { type: 'number' },
                  type: { type: 'string' },
                  category: { type: 'string' },
                  payment_method: { type: 'string' },
                  confidence: { type: 'number' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return Response.json(result);
    }

    if (action === 'detect_anomalies') {
      const { transactions = [] } = data;

      if (transactions.length < 5) {
        return Response.json({ anomalies: [] });
      }

      // Calculate stats
      const amounts = transactions.map(t => t.amount || 0);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.map(a => Math.pow(a - avg, 2)).reduce((a, b) => a + b) / amounts.length);

      const outliers = transactions
        .filter(t => Math.abs((t.amount || 0) - avg) > 2.5 * stdDev)
        .slice(0, 5);

      const duplicates = [];
      const seen = {};
      for (const t of transactions) {
        const key = `${t.amount}-${t.contact_name}-${t.date?.substring(0, 7)}`;
        if (seen[key]) {
          duplicates.push(t);
        }
        seen[key] = true;
      }

      const anomalies = [];

      outliers.forEach(t => {
        anomalies.push({
          type: 'outlier',
          severity: 'warning',
          transaction_id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          message: `Montant inhabituel: ${t.amount?.toLocaleString()} DJF (moy: ${Math.round(avg).toLocaleString()} DJF)`
        });
      });

      duplicates.slice(0, 3).forEach(t => {
        anomalies.push({
          type: 'duplicate',
          severity: 'critical',
          transaction_id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          message: `Transaction potentiellement en double: ${t.description}`
        });
      });

      return Response.json({ anomalies });
    }

    if (action === 'chat') {
      const { message, context = {} } = data;

      const cnssKnowledgeBase = `
=== BASE DE CONNAISSANCES CNSS - DJIBOUTI ===

## AFFILIATION DES EMPLOYEURS
- L'affiliation à la CNSS est OBLIGATOIRE dans les 48h suivant l'ouverture de l'établissement.
- Pour les employeurs de gens de maison: 48h suivant l'engagement du salarié.
- Tout retard constitue un défaut d'immatriculation, passible des peines de l'Art 122 alinéa 2.
- Base légale: Loi n°188/AN/85/1ère L du 31 décembre 1985 + Art 10 al 2.

## VERSEMENT DES COTISATIONS
- Délai d'exigibilité: les 10 PREMIERS JOURS du mois suivant les rémunérations payées.
- Base légale: Article 134 de l'arrêté n°69.1883/SG/CG/1969 + Art 3 de l'arrêté n°89.1264/PR/MT du 04/11/1989.
- Chaque versement DOIT être accompagné d'un relevé nominatif des salariés + déclaration des salaires, daté et signé par l'employeur.
- La déclaration doit être adressée à la CNSS AVANT l'expiration du délai, même en l'absence de paiement (Art 135).
- Pénalité de retard: 10% si non payé avant le 10 du mois suivant (Art 137) + 3% par mois supplémentaire.
- Pénalité de déclaration: 400 FDJ par employé par mois de retard si pas de déclaration nominative (Art 136).

## IMMATRICULATION DES SALARIÉS
- Lors de l'affiliation, l'employeur DOIT immatriculer chaque travailleur et remplir un certificat d'emploi.
- Si le salarié n'est pas immatriculé, il doit faire une demande d'immatriculation à la CNSS.
- La CNSS établit une fiche anthropométrique + une carte d'immatriculation à 13 chiffres.
- Ce numéro est conservé à vie pour identifier le travailleur.
- La carte CNSS donne accès à: soins médicaux, allocations familiales.

## AYANTS DROIT
- L'immatriculation des ayants droit se fait à la demande du travailleur (après sa propre immatriculation).
- Ayants droit admis: épouses + enfants à charge (légitimes, adoptifs ou naturels).
- Droits ouverts: soins médicaux gratuits pour le travailleur et sa famille dans les Centres de Soins CNSS.
- Prestations familiales: allocation familiale, allocation de mariage, allocation de maternité.

## TAUX DE COTISATION CNSS
### Régime Général
- Part Salariale (6%): Retraite 4% + AMU 2%
- Part Patronale (15.7%): Retraite 4% + AT 1.2% + Prestations familiales 5.5% + AMU 5%
- Plafond retraite: 400 000 DJF

### Zone Franche
- Part Salariale (6%): Retraite 4% + AMU 2%
- Part Patronale (10.2%): Retraite 4% + AT & Soins 6.2%
- Pas de prestations familiales en Zone Franche
- Plafond retraite: 400 000 DJF

## ITS (IMPÔT SUR LES TRAITEMENTS ET SALAIRES)
- Barème progressif par tranches (0 à 200 000+ DJF)
- Calculé sur le net imposable (brut - cotisations salariales CNSS)
- RETCIM: 400 DJF fixe

## PRIMES D'ANCIENNETÉ (Décret 1969)
- < 2 ans: 4% | 2-4.5 ans: 8% | 4.5-7.5 ans: 12% | 7.5-10.5 ans: 16% | > 10.5 ans: 20%

## CONGÉ MATERNITÉ
- Mois 1-3: Entreprise paie 50% du salaire
- Mois 4-6: Payé par la CNSS (0% entreprise)

=== FIN BASE DE CONNAISSANCES ===
`;

      const prompt = `
Tu es Aria, l'assistante IA de Paie360 (système de gestion RH/financier pour entreprises djiboutiennes).
Tu réponds en français, de façon concise, professionnelle et utile.

${cnssKnowledgeBase}

RÈGLES IMPORTANTES:
- Pour les calculs complexes (paie, CNSS, ITS), rappelle que le système Paie360 les gère automatiquement et invite à utiliser le module concerné.
- Tu PEUX expliquer les règles réglementaires, délais, obligations légales et les bases de calcul à titre informatif.
- Tu ne dois PAS faire les calculs à la place du système pour des cas réels d'employés spécifiques.
- Si une question concerne un calcul pour un employé précis, dirige vers le module Paie ou Déclarations.

Contexte de l'utilisateur:
- Rôle: ${context.role || 'utilisateur'}
- Page actuelle: ${context.page || 'Dashboard'}
- ${context.stats ? `Données: ${JSON.stringify(context.stats)}` : ''}

Question/demande: ${message}

Réponds en 1-4 phrases maximum, precise et actionnable.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      return Response.json({ reply: result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});