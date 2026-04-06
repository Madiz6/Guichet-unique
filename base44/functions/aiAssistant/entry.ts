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
=== BASE DE CONNAISSANCES COMPLÈTE CNSS - DJIBOUTI ===
Source: cnss.dj + Loi n°51/AN/19/8ème L (2019) + Arrêté N°69-1883/SG/CG/1969

## 1. AFFILIATION DES EMPLOYEURS
- L'affiliation à la CNSS est OBLIGATOIRE dans les 48 heures suivant l'ouverture de l'établissement.
- Pour les employeurs de gens de maison: 48 heures suivant l'engagement du salarié.
- Tout retard = défaut d'immatriculation, passible des peines de l'Art 122 al.2.
- Tout changement de raison sociale, d'adresse ou d'activité principale doit être déclaré à la CNSS.

## 2. MODALITÉS DE RÈGLEMENT DES COTISATIONS
- Délai d'exigibilité: les 10 PREMIERS JOURS du mois suivant les rémunérations payées.
- Base légale: Article 134 de l'arrêté n°69.1883/SG/CG/1969.
- L'employeur est DÉBITEUR de la cotisation TOTALE (part patronale + salariale).
- La cotisation est précomptée sur la rémunération lors de chaque paie.
- Chaque versement DOIT être accompagné d'un relevé nominatif des salariés + déclaration des salaires, daté et signé.
- La déclaration doit être adressée à la CNSS AVANT l'expiration du délai, même sans paiement (Art 135).

## 3. ASSIETTE DES COTISATIONS
- Base: l'ensemble des rémunérations directes ou indirectes (salaires, allocations de congés payés, indemnités, primes, gratifications, avantages en nature).
- Plancher: 15.850 FDJ pour employeurs de gens de maison / 20.000 FDJ pour employeurs professionnels.
- Plafond pour maternité: 400.000 FDJ/mois.

## 4. PÉNALITÉS DE RETARD
- Retard après le 10 du mois: MAJORATION DE 10%.
- Retard supplémentaire après 1 mois: MAJORATION DE 3% par mois.
- Absence de déclaration nominative: ASTREINTE DE 400 FDJ par salarié et par mois (Art 136).

## 5. RECOUVREMENT FORCÉ
- Recouvrement amiable → Mise en Demeure (15 jours pour payer) → Contrainte.
- La CNSS peut saisir: comptes bancaires, biens meubles et immeubles.

## 6. CONTRÔLE DES EMPLOYEURS
- Contrôle par agents assermentés ayant qualité pour dresser des procès-verbaux.
- L'employeur DOIT communiquer tous documents comptables aux contrôleurs.

## 7. CESSATION D'ACTIVITÉ
- Déclaration obligatoire à la CNSS dans les 8 JOURS suivant la fermeture.

## 8. MARCHÉS PUBLICS
- L'attestation CNSS (de non-redevabilité) est une PIÈCE OBLIGATOIRE pour tout appel d'offres public ou privé.

## 9. TAUX DE COTISATION

### RÉGIME GÉNÉRAL (Total: 21.7% du salaire brut)
| Catégorie               | Part Patronale | Part Salariale | Total |
|-------------------------|---------------|----------------|-------|
| Prestations familiales  | 5.5%          | 0%             | 5.5%  |
| Accident de travail & soins | 8.2% total: 6.2% patronal + 2% salarial | | 8.2% |
| Retraite                | 4%            | 4%             | 8%    |
| **TOTAL**               | **15.7%**     | **6%**         | **21.7%** |
Note: Pour les soins (AMU): 5% patronal + 2% salarial = 7%.

### RÉGIME ZONE FRANCHE (Total: 16.2%)
| Catégorie               | Part Patronale | Part Salariale | Total |
|-------------------------|---------------|----------------|-------|
| Prestations familiales  | 0%            | 0%             | 0%    |
| Accident travail & soins| 8.2% (même structure) | | 8.2% |
| Retraite                | 4%            | 4%             | 8%    |
| **TOTAL**               | **10.2%**     | **6%**         | **16.2%** |
⚠️ En Zone Franche: PAS de prestations familiales (allocations familiales, mariage, maternité NOT covered by employeur).

### RÉGIME FONCTIONNAIRE (Total: 27%)
| Retraite: 14% patronal + 6% salarial = 20% | AMU: 5% + 2% = 7% | TOTAL: 19% + 8% = 27% |

### RÉGIME FNP (Total: 29%)
| Retraite: 15% patronal + 7% salarial = 22% | AMU: 5% + 2% = 7% | TOTAL: 20% + 9% = 29% |

### RÉGIME INDÉPENDANT
- AMU uniquement: 7% forfaitaire.

## 10. CONGÉ MATERNITÉ (LOI N°51/AN/19/8ème L du 04/07/2019 - RÉFORME MAJEURE)
La réforme a ALLONGÉ le congé de maternité de 14 semaines à 26 semaines (184 jours).
Structure: 8 semaines AVANT accouchement + 18 semaines APRÈS accouchement.

### Qui y a droit?
Toutes les femmes salariées du secteur privé/para-public, régulièrement déclarées et cotisées à la CNSS.

### Suivi de grossesse (obligatoire):
- 1ère visite prénatale: fin du 3ème mois
- 2ème visite: au 6ème mois
- 3ème visite: au 7ème mois (déclenchement du congé)
- SEULS les gynécologues CNSS peuvent établir le certificat de grossesse pour le dossier.

### Indemnisation - 3 parties:

**1ère PARTIE (8 semaines = 56 jours) - AVANT accouchement:**
- Formule: (56 jours × Salaire Mensuel Brut déclaré) ÷ 60
- Payée 50% par CNSS + 50% par l'employeur
- Plafond salaire brut: 400.000 FDJ/mois
- Pièces: certificat de grossesse CNSS + certificat d'arrêt de travail

**2ème PARTIE (6 semaines = 42 jours) - APRÈS accouchement:**
- Formule: (42 jours × Salaire Mensuel Brut déclaré) ÷ 60
- Payée 50% CNSS + 50% employeur
- Plafond: 400.000 FDJ/mois
- Pièces supplémentaires: fiche de sortie maternité ou acte de naissance

**3ème PARTIE (12 semaines - RÉFORME 2019):**
- INTÉGRALEMENT payée par la CNSS (0% employeur)
- Salaire de référence: salaire NET perçu le mois précédant l'arrêt (+ avances sur salaire)
- Pas de plafond de 400.000 FDJ pour cette partie
- Versement mensuel (la salariée doit fournir un RIB) ou en une seule fois après reprise.

### Protection légale:
- La salariée enceinte NE PEUT PAS être licenciée pendant le congé maternité.
- L'employeur doit délivrer un certificat d'arrêt de travail pour la CNSS.
- L'employeur doit informer dès la dernière visite prénatale au 7ème mois.

### Pièces à fournir (dossier complet):
1. Copie carte de sécurité sociale
2. Certificat médical de grossesse (gynécologue CNSS uniquement)
3. Attestation d'arrêt de travail
4. Attestation de reprise du travail
5. Copies des 3 derniers bulletins de paie avant arrêt
6. Fiche de sortie maternité
7. Acte(s) de naissance

### Pour les fonctionnaires:
- Rémunération maintenue intégralement par l'administration pendant tout le congé.

## 11. ALLOCATIONS FAMILIALES
- Montant: 1.400 FDJ par mois par enfant (max 6 enfants).
- Calcul trimestriel: 1.400 × 3 mois × 6 enfants = 25.200 FDJ/trimestre max.
- Payé par trimestre aux guichets CNSS.
- Bénéficiaires: père de famille, femme salariée chef de famille, divorcée, veuve, mère célibataire.
- Enfants admis: légitimes, naturels, adoptifs résidant en République de Djibouti.
- Pour enfants 15-18 ans: contrat d'apprentissage requis.
- Pour enfants 15-21 ans: certificat de scolarité requis.

## 12. ALLOCATION DE MARIAGE
- Bénéficiaires: travailleur salarié marié relevant de la Convention Collective.
- Conditions: salaire mensuel ≤ 50.000 FDJ + épouse non salariée/fonctionnaire/militaire.
- Montant: 2.500 FDJ/mois (pour UN SEUL mariage).
- Paiement trimestriel: 2.500 × 3 = 7.500 FDJ/trimestre.
- Payé en Février, Mai, Août, Novembre de chaque année.

## 13. ACCIDENT DE TRAVAIL ET MALADIES PROFESSIONNELLES
### Définition accident de travail:
- Événement soudain avec lésion corporelle, survenu par le fait ou à l'occasion du travail.
- Inclut les accidents de trajet (domicile ↔ travail).
- La CNSS statue dans les 30 jours (prolongeable de 2 mois).

### Déclaration:
- Salarié informe l'employeur dans les 24 heures.
- Employeur déclare à la CNSS dans les 48 heures.
- À défaut, le salarié peut déclarer lui-même avant fin de la 2ème année suivant l'accident.

### Indemnités journalières accident de travail:
- Jours 1-29: 50% du salaire journalier.
- À partir du 30ème jour: 75% du salaire journalier.
- Prise en charge santé: 100% (soins médicaux, chirurgie, rééducation, prothèses).

### Rente d'incapacité permanente:
- Si taux d'incapacité ≥ 11%: rente calculée sur taux d'incapacité × salaire annuel antérieur.
- Si incapacité totale nécessitant assistance: rente majorée de 40%.
- Faute inexcusable de l'employeur: rente majorée.

### Maladies professionnelles:
- Déclaration dans les 2 ans à partir du certificat médical.
- Comité de reconnaissance des maladies professionnelles si besoin.

## 14. PENSION DE RETRAITE NORMALE (Loi n°154/AN/02/4ème L)
### Conditions:
- Être immatriculé à la CNSS
- Âge minimum: 60 ans révolus
- Durée minimale de cotisation selon année de naissance:
  | Né en 1946 ou avant | 1947 | 1948 | 1949 | 1950 | 1951+ |
  |---------------------|------|------|------|------|-------|
  | 15 ans              | 17 ans| 19 ans| 21 ans| 23 ans| 25 ans|

### Calcul pension normale:
- Base: moyenne des salaires bruts plafonnés des 10 DERNIÈRES ANNÉES
- Formule: Moyenne mensuelle × Nombre d'années × Taux d'annuité
- Taux d'annuité:
  - 2% pour années cotisées jusqu'au 31/12/2001
  - 1.8% pour années cotisées du 01/01/2002 au 31/12/2006
  - 1.5% pour années cotisées à partir du 01/01/2007
- Pension varie entre 30% et 81% du salaire déclaré.
- Paiement: par trimestre (1er janvier, 1er avril, 1er juillet, 1er octobre).
- Demande à déposer 3 mois AVANT les 60 ans.

### Exemple de calcul:
- Cumul 10 derniers salaires bruts: 34.849.749 FDJ → Moyenne: 290.414 FDJ/mois
- 24 ans cotisés avant 2002: 290.414 × 24 × 2% = 139.398 FDJ
- 5 ans cotisés 2002-2006: 290.414 × 5 × 1.8% = 26.137 FDJ
- Total pension mensuelle: ~165.535 FDJ

## 15. PENSION DE RETRAITE ANTICIPÉE
- Âge minimum: 50 ans avec inaptitude médicale prouvée.
- Pourcentage de la pension normale selon âge:
  | Âge départ | Années requises | % pension normale |
  |------------|-----------------|-------------------|
  | 50 ans     | 20 ans          | 50%               |
  | 51 ans     | 21 ans          | 60%               |
  | 52 ans     | 22 ans          | 70%               |
  | 53 ans     | 23 ans          | 80%               |
  | 54 ans     | 24 ans          | 90%               |
  | 55 ans     | 25 ans          | 100%              |
- Minimum: 30% de la pension normale (Art 69).
- Minimum absolu: 14.167 FDJ/mois.
- Nécessite rapport médical du médecin-conseil CNSS + Commission d'Inaptitude.

## 16. PENSION DE RÉVERSION (décès du pensionné)
- Conjoint(e): 50% de la pension du défunt (mariage doit précéder la retraite ET être contracté 5 ans avant le décès).
- Orphelins: 30% partagés en parts égales (max 10% par enfant).
- La pension de réversion s'éteint en cas de remariage du conjoint survivant.
- Exemple: Pension défunt = 44.598 FDJ → Veuve(s): 22.299 FDJ; Enfants: 13.379 FDJ.

## 17. AMU - ASSURANCE MALADIE UNIVERSELLE
- Lancée officiellement le 21 décembre 2014, gérée par la CNSS.
- Couvre TOUTE la population vivant sur le territoire djiboutien.
- Personnes en extrême précarité: soins gratuits via le Programme d'Assistance Sociale de Santé (PASS).
- AMO (Assurance Maladie Obligatoire): pour fonctionnaires, conventionnés, salariés privé/public, indépendants, retraités, étudiants Université de Djibouti.

### Ayants droit AMO:
- Conjoint(e) de l'assuré
- Enfants mineurs à charge jusqu'à 21 ans
- Enfants handicapés
- Bénéficiaires de pension de survivant (pension < 50.000 FDJ/mois)

### Prestations AMO (3 niveaux):
1. Paquet universel gratuit: vaccinations, consultations enfants < 5 ans, santé reproductive, tuberculose, paludisme, VIH.
2. Paquet de base 1 (100%): consultations généraliste, bilan standard, radiologie, médicaments essentiels, accouchement et césarienne.
3. Paquet de base 2: consultations spécialisées, médicaments génériques, analyses médicales complètes.
4. Soins hospitaliers: hospitalisations avec et sans chirurgie.

### Principes AMU:
- Solidarité entre assurés
- Tiers-payant (pas d'avance de frais)
- Mutualisation des risques
- Contribution selon les moyens, soins selon les besoins

## 18. IMMATRICULATION DES SALARIÉS ET AYANTS DROIT
- L'employeur DOIT immatriculer chaque travailleur (certificat d'emploi CNSS requis).
- Numéro CNSS: 13 chiffres, conservé à vie.
- Ayants droit: épouses + enfants (légitimes, adoptifs, naturels).
- Pièces pour ayants droit: CIN, actes de mariage/naissance, photos, certificat de scolarité pour enfants > 15 ans.
- La carte CNSS donne accès aux soins dans les 2 Centres de Soins CNSS + prestations familiales.

## 19. ITS (IMPÔT SUR LES TRAITEMENTS ET SALAIRES)
- Barème progressif par tranches sur le revenu net imposable.
- Revenu net imposable = Salaire brut - Cotisations salariales CNSS.
- RETCIM: 400 FDJ fixe/mois (charge salarié).
- Calculé et retenu à la source par l'employeur.

## 20. PRIMES D'ANCIENNETÉ (Décret 1969 - Convention Collective)
- 0-2 ans: 4% du salaire de base
- 2-4.5 ans: 8%
- 4.5-7.5 ans: 12%
- 7.5-10.5 ans: 16%
- > 10.5 ans: 20% (plafond)

=== FIN BASE DE CONNAISSANCES CNSS DJIBOUTI ===
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