// Djibouti Payroll Calculator
// Based on Arrêté N°69-1883/SG/CG/ du 31.12.1969 & modifications
// Source: Tableau "Les différents taux applicables" - CNSS Djibouti

/**
 * TAUX DE COTISATION PAR RÉGIME (source: tableau officiel CNSS)
 *
 * Régime Général     : Patronale 15.7% | Salariale 6% | Total 21.7%
 * Zone Franche       : Patronale 10.2% | Salariale 6% | Total 16.2%
 * Indépendant        : Patronale  7%   | Salariale 0% | Total  7%
 * Fonctionnaire      : Patronale 19%   | Salariale 8% | Total 27%
 * FNP                : Patronale 20%   | Salariale 9% | Total 29%
 * Député/Gouvernement: Patronale 24%   | Salariale 19%| Total 43%
 *
 * LATE PAYMENT PENALTIES (Art 137):
 *  - 10% surcharge if not paid by the 10th of the following month
 *  - Additional 3% per month thereafter
 *
 * DECLARATION PENALTY (Art 136):
 *  - 400 FDJ per employee per month of delay
 */

// ─── RÉGIME GÉNÉRAL ────────────────────────────────────────────────────────────
export const CNSS_RATES = {
  employee: {
    retraite: 0.04,   // 4%
    amu: 0.02,        // Assurance Maladie 2%
    total: 0.06       // 6%
  },
  employer: {
    retraite: 0.04,              // 4%
    accident_travail: 0.012,     // 1.2%
    allocations_familiales: 0.055, // 5.5%
    amu: 0.05,                   // 5%
    total: 0.157                 // 15.7%
  }
};

// ─── ZONE FRANCHE ──────────────────────────────────────────────────────────────
// Source: Tableau détaillé de retenue de Cotisation - Régime Zone franche (16.2%)
// Arrêté N°69-1883/SG/CG/ du 31.12.1969
//
// Formula (verified against official example table):
//   Part Salariale  (6%):   6%   × min(salaire, 400 000) + 4% × max(salaire - 400 000, 0)
//   Part Patronale (10.2%): 10.2% × min(salaire, 400 000) + 4% × max(salaire - 400 000, 0)
//
// Above the 400 000 FDJ cap only the Retraite portion (4%) applies to the excess.
// Ventilation patronale: AT & Soins 6.2% — no, official text: AT 1.2% + AMU 5% + Retraite 4% = 10.2%
//   (Prestations familiales: 0% — not applicable in Zone Franche)
export const CNSS_RATES_ZONE_FRANCHE = {
  employee: {
    retraite: 0.04,
    amu: 0.02,
    total: 0.06   // on capped base; excess only 4%
  },
  employer: {
    retraite: 0.04,              // 4%
    accident_travail: 0.012,     // 1.2%
    amu: 0.05,                   // 5%
    allocations_familiales: 0,   // NOT applicable in Zone Franche
    total: 0.102                 // 10.2% on capped base; excess only 4%
  }
};

// ─── RÉGIMES SPÉCIAUX ─────────────────────────────────────────────────────────
// Fonctionnaire: Sal 8% (Retraite 6% + AMU 2%) | Pat 19% (Retraite 14% + AMU 5%)
// Plafond retraite: 390 000 DJF (salaire indiciaire max)
// Cotisation = salaire_base × 27% (plafonné à 390 000)
export const CNSS_RATES_FONCTIONNAIRE = {
  employee: { retraite: 0.06, amu: 0.02, total: 0.08 },
  employer: { retraite: 0.14, amu: 0.05, allocations_familiales: 0, accident_travail: 0, total: 0.19 },
  cap: 390000
};

// FNP: Sal 9% (Retraite 7% + AMU 2%) | Pat 20% (Retraite 15% + AMU 5%)
// Plafond retraite: 390 000 DJF (salaire indiciaire max)
// Cotisation = salaire_base × 29% (plafonné à 390 000)
export const CNSS_RATES_FNP = {
  employee: { retraite: 0.07, amu: 0.02, total: 0.09 },
  employer: { retraite: 0.15, amu: 0.05, allocations_familiales: 0, accident_travail: 0, total: 0.20 },
  cap: 390000
};

// Gouvernement/Député: Sal 19% (Retraite 17% + AMU 2%) | Pat 24% (Retraite 19% + AMU 5%)
// Pas de plafond — cotisation sur salaire brut total × 43%
export const CNSS_RATES_GOUVERNEMENT = {
  employee: { retraite: 0.17, amu: 0.02, total: 0.19 },
  employer: { retraite: 0.19, amu: 0.05, allocations_familiales: 0, accident_travail: 0, total: 0.24 },
  cap: null // pas de plafond
};

// Indépendant: Sal 0% | Pat (versement propre) 7% sur brut
// Pas de plafond — mensuel ou trimestriel selon le choix de l'indépendant
export const CNSS_RATES_INDEPENDANT = {
  employee: { retraite: 0, amu: 0, total: 0 },
  employer: { retraite: 0, amu: 0.07, allocations_familiales: 0, accident_travail: 0, total: 0.07 },
  cap: null // pas de plafond
};

export const RETRAITE_CAP = 400000;     // Plafond retraite Régime Général & Zone Franche
export const RETRAITE_CAP_FONCTIONNAIRE = 390000; // Plafond retraite Fonctionnaire, FNP
export const RETCIM = 400;          // Retenue complémentaire fixe

// ─── ITS (Impôt sur les Traitements et Salaires) ───────────────────────────────
// Source: Barème progressif officiel Djibouti
// Each bracket rate applies ONLY to the portion of income within that bracket.
//
//  Tranche                          Taux
//  < 30 000 FD                       2%
//  30 001 – 50 000 FD               12%
//  50 001 – 150 000 FD              15%
//  150 001 – 300 000 FD             22%
//  300 001 – 600 000 FD             25%
//  600 001 – 1 000 000 FD           30%
//  1 000 001 – 2 000 000 FD         35%
//  > 2 000 000 FD                   45%

export const ITS_BRACKETS = [
  { min: 0,         max: 30000,    rate: 0.02 },
  { min: 30000,     max: 50000,    rate: 0.12 },
  { min: 50000,     max: 150000,   rate: 0.15 },
  { min: 150000,    max: 300000,   rate: 0.22 },
  { min: 300000,    max: 600000,   rate: 0.25 },
  { min: 600000,    max: 1000000,  rate: 0.30 },
  { min: 1000000,   max: 2000000,  rate: 0.35 },
  { min: 2000000,   max: Infinity, rate: 0.45 },
];

export const calculateITS = (netImposable) => {
  if (netImposable <= 0) return 0;
  let tax = 0;
  for (const bracket of ITS_BRACKETS) {
    if (netImposable <= bracket.min) break;
    const taxable = Math.min(netImposable, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return Math.round(tax);
};

// ─── PRIME D'ANCIENNETÉ ────────────────────────────────────────────────────────
export const calculatePrimeAnciennetePercentage = (yearsOfService, monthsOfService = 0) => {
  const totalYears = yearsOfService + (monthsOfService / 12);
  if (totalYears < 2)   return 0.04;  // 4%
  if (totalYears < 4.5) return 0.08;  // 8%
  if (totalYears < 7.5) return 0.12;  // 12%
  if (totalYears < 10.5) return 0.16; // 16%
  return 0.20;                         // 20% (max)
};

export const calculatePrimeAnciennete = (baseSalary, yearsOfService, monthsOfService = 0) => {
  const percentage = calculatePrimeAnciennetePercentage(yearsOfService, monthsOfService);
  return Math.round(baseSalary * percentage);
};

// ─── CNSS RATE SELECTOR ────────────────────────────────────────────────────────
const getRates = (regimeName) => {
  switch (regimeName) {
    case 'Zone Franche':  return { emp: CNSS_RATES_ZONE_FRANCHE.employee,   pat: CNSS_RATES_ZONE_FRANCHE.employer };
    case 'Fonctionnaire': return { emp: CNSS_RATES_FONCTIONNAIRE.employee,   pat: CNSS_RATES_FONCTIONNAIRE.employer };
    case 'FNP':           return { emp: CNSS_RATES_FNP.employee,             pat: CNSS_RATES_FNP.employer };
    case 'Gouvernement':  return { emp: CNSS_RATES_GOUVERNEMENT.employee,    pat: CNSS_RATES_GOUVERNEMENT.employer };
    case 'Indépendant':   return { emp: CNSS_RATES_INDEPENDANT.employee,     pat: CNSS_RATES_INDEPENDANT.employer };
    default:              return { emp: CNSS_RATES.employee,                  pat: CNSS_RATES.employer }; // Général
  }
};

// ─── CNSS EMPLOYEE (Part Salariale) ────────────────────────────────────────────
export const calculateCNSSEmployee = (grossSalary, regimeName = 'Général') => {
  if (regimeName === 'Zone Franche') {
    // Official formula (verified against CNSS table):
    // On tranche ≤ 400 000: full 6% (retraite 4% + AMU 2%)
    // On tranche > 400 000: only retraite 4% (no AMU on excess)
    const cappedBase = Math.min(grossSalary, RETRAITE_CAP);
    const excess = Math.max(0, grossSalary - RETRAITE_CAP);
    const retraite = Math.round(cappedBase * 0.04) + Math.round(excess * 0.04);
    const amu      = Math.round(cappedBase * 0.02); // AMU only on capped base
    return { retraite, amu, total: retraite + amu };
  }

  const { emp } = getRates(regimeName);
  // Fonctionnaire & FNP: plafond 390 000; Gouvernement & Indépendant: pas de plafond
  const regimeCap = (regimeName === 'Fonctionnaire' || regimeName === 'FNP')
    ? RETRAITE_CAP_FONCTIONNAIRE
    : RETRAITE_CAP;
  const retraiteBase = emp.retraite > 0 ? Math.min(grossSalary, regimeCap) : 0;
  const retraite = Math.round(retraiteBase * emp.retraite);
  const amu      = Math.round(grossSalary * emp.amu);
  return { retraite, amu, total: retraite + amu };
};

// ─── CNSS EMPLOYER (Part Patronale) ────────────────────────────────────────────
export const calculateCNSSEmployer = (grossSalary, regimeName = 'Général') => {
  if (regimeName === 'Zone Franche') {
    // On tranche ≤ 400 000: full 10.2% (retraite 4% + AT 1.2% + AMU 5%)
    // On tranche > 400 000: only retraite 4% (no AT/AMU on excess)
    const cappedBase = Math.min(grossSalary, RETRAITE_CAP);
    const excess = Math.max(0, grossSalary - RETRAITE_CAP);
    const retraite               = Math.round(cappedBase * 0.04) + Math.round(excess * 0.04);
    const accident_travail       = Math.round(cappedBase * 0.012); // AT only on capped base
    const amu                    = Math.round(cappedBase * 0.05);  // AMU only on capped base
    const allocations_familiales = 0;
    const total = retraite + accident_travail + amu + allocations_familiales;
    return { retraite, accident_travail, allocations_familiales, amu, total };
  }

  const { pat } = getRates(regimeName);
  // Fonctionnaire & FNP: plafond 390 000; Gouvernement & Indépendant: pas de plafond
  const regimeCap = (regimeName === 'Fonctionnaire' || regimeName === 'FNP')
    ? RETRAITE_CAP_FONCTIONNAIRE
    : RETRAITE_CAP;
  const retraiteBase = (pat.retraite > 0) ? Math.min(grossSalary, regimeCap) : 0;

  const retraite               = Math.round(retraiteBase * (pat.retraite || 0));
  const accident_travail       = Math.round(grossSalary  * (pat.accident_travail || 0));
  const allocations_familiales = Math.round(grossSalary  * (pat.allocations_familiales || 0));
  const amu                    = Math.round(grossSalary  * (pat.amu || 0));
  const total = retraite + accident_travail + allocations_familiales + amu;

  return { retraite, accident_travail, allocations_familiales, amu, total };
};

// ─── MAIN PAYROLL CALCULATION ───────────────────────────────────────────────────
/**
 * @param {Object} employee      - Employee record
 * @param {Object} holidayStatus - {type, month_number} or null
 * @param {Array}  cyclePrimes   - [{nom, montant, add_after_deductions}]
 */
export const calculatePayroll = (employee, holidayStatus = null, cyclePrimes = []) => {
  const baseSalary = employee.salaire_base || 0;

  // ── Prime d'ancienneté ──
  let primeAnciennete = employee.prime_anciennete || 0;
  if (employee.prime_anciennete_auto !== false && employee.anciennete_annees !== undefined) {
    primeAnciennete = calculatePrimeAnciennete(
      baseSalary,
      employee.anciennete_annees || 0,
      employee.anciennete_mois || 0
    );
  }

  // ── Base primes ──
  const primesPersonnalisees = employee.primes_personnalisees || [];
  const totalPrimesPersonnalisees = primesPersonnalisees.reduce((sum, p) => sum + (p.montant || 0), 0);

  const basePrimes =
    primeAnciennete +
    (employee.prime_fonction  || 0) +
    (employee.prime_logement  || 0) +
    (employee.prime_transport || 0) +
    (employee.prime_sujetion  || 0) +
    (employee.prime_rendement || 0) +
    (employee.autres_primes   || 0) +
    totalPrimesPersonnalisees;

  // ── Cycle primes split ──
  const primesBeforeDeductions = cyclePrimes.filter(p => !p.add_after_deductions);
  const primesAfterDeductions  = cyclePrimes.filter(p =>  p.add_after_deductions);
  const totalPrimesBeforeDeductions = primesBeforeDeductions.reduce((sum, p) => sum + (p.montant || 0), 0);
  const totalPrimesAfterDeductions  = primesAfterDeductions.reduce((sum, p)  => sum + (p.montant || 0), 0);

  // ── Initial gross ──
  let initialGross = baseSalary + basePrimes + totalPrimesBeforeDeductions;

  // ── Holiday rules ──
  let salaryPercentage = 1.0;
  let applyCNSS  = true;
  let applyITS   = true;
  let paidByCNSS = false;
  let holidayNote = null;

  if (holidayStatus) {
    switch (holidayStatus.type) {
      case 'Congé payé':
        holidayNote = '✅ Congé payé - Salaire normal (100%)';
        break;
      case 'Congé maladie':
        holidayNote = '🏥 Congé maladie - Salaire normal avec cotisations';
        break;
      case 'Congé paternité':
        holidayNote = '👨‍👶 Congé paternité - Salaire normal';
        break;
      case 'Congé sans solde':
        salaryPercentage = 0;
        applyCNSS = false;
        applyITS  = false;
        holidayNote = '⛔ Congé sans solde - Aucun salaire ni cotisation';
        break;
      case 'Congé maternité': {
        const monthNumber = holidayStatus.month_number || 1;
        if (monthNumber <= 3) {
          salaryPercentage = 0.5;
          holidayNote = `🤰 Congé maternité (Mois ${monthNumber}/6) - Entreprise paie 50%`;
        } else {
          salaryPercentage = 0;
          applyCNSS  = false;
          applyITS   = false;
          paidByCNSS = true;
          holidayNote = `🤰 Congé maternité (Mois ${monthNumber}/6) - Payé par CNSS (0% entreprise)`;
        }
        break;
      }
    }
  }

  // ── Apply holiday percentage & absences ──
  initialGross = Math.round(initialGross * salaryPercentage);
  const absences   = (salaryPercentage > 0) ? (employee.absences_amount || 0) : 0;
  const grossSalary = Math.max(0, initialGross - absences);

  const regimeName = employee.regime_cnss || 'Général';

  // ── CNSS contributions ──
  const cnssEmployee = applyCNSS
    ? calculateCNSSEmployee(grossSalary, regimeName)
    : { retraite: 0, amu: 0, total: 0 };

  const cnssEmployer = applyCNSS
    ? calculateCNSSEmployer(grossSalary, regimeName)
    : { retraite: 0, accident_travail: 0, allocations_familiales: 0, amu: 0, total: 0 };

  // ── Net imposable & ITS ──
  const netImposable = Math.max(0, grossSalary - cnssEmployee.total);
  const its   = applyITS ? calculateITS(netImposable) : 0;

  // ── Deductions ──
  const aide   = (grossSalary > 0) ? (employee.aide || 0) : 0;
  const retcim = (grossSalary > 0) ? RETCIM : 0;

  // ── Net salary ──
  const netBeforeCyclePrimes = grossSalary - cnssEmployee.total - its - aide - retcim;
  const netSalary = netBeforeCyclePrimes + totalPrimesAfterDeductions;

  return {
    grossSalary,
    cnssEmployee,
    cnssEmployer,
    netImposable,
    its,
    aide,
    absences,
    retcim,
    netSalary,
    totalCost: grossSalary + cnssEmployer.total,
    regime: regimeName,
    salaryPercentage,
    paidByCNSS,
    holidayNote,
    primesBeforeDeductions,
    primesAfterDeductions,
    totalPrimesBeforeDeductions,
    totalPrimesAfterDeductions,
    breakdown: {
      salaire_base:          Math.round(baseSalary           * salaryPercentage),
      prime_anciennete:      Math.round(primeAnciennete       * salaryPercentage),
      prime_fonction:        Math.round((employee.prime_fonction  || 0) * salaryPercentage),
      prime_logement:        Math.round((employee.prime_logement  || 0) * salaryPercentage),
      prime_transport:       Math.round((employee.prime_transport || 0) * salaryPercentage),
      prime_sujetion:        Math.round((employee.prime_sujetion  || 0) * salaryPercentage),
      prime_rendement:       Math.round((employee.prime_rendement || 0) * salaryPercentage),
      autres_primes:         Math.round((employee.autres_primes   || 0) * salaryPercentage),
      primes_personnalisees: Math.round(totalPrimesPersonnalisees * salaryPercentage)
    }
  };
};