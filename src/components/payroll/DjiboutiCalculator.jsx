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
// Fonctionnaire: Patronale 19% (Retraite 14% + AMU 5%) | Salariale 8% (Retraite 6% + AMU 2%)
export const CNSS_RATES_FONCTIONNAIRE = {
  employee: { retraite: 0.06, amu: 0.02, total: 0.08 },
  employer: { retraite: 0.14, amu: 0.05, allocations_familiales: 0, accident_travail: 0, total: 0.19 }
};

// FNP: Patronale 20% (Retraite 15% + AMU 5%) | Salariale 9% (Retraite 7% + AMU 2%)
export const CNSS_RATES_FNP = {
  employee: { retraite: 0.07, amu: 0.02, total: 0.09 },
  employer: { retraite: 0.15, amu: 0.05, allocations_familiales: 0, accident_travail: 0, total: 0.20 }
};

// Gouvernement/Député: Patronale 24% (Retraite 19% + AMU 5%) | Salariale 19% (Retraite 17% + AMU 2%)
export const CNSS_RATES_GOUVERNEMENT = {
  employee: { retraite: 0.17, amu: 0.02, total: 0.19 },
  employer: { retraite: 0.19, amu: 0.05, allocations_familiales: 0, accident_travail: 0, total: 0.24 }
};

// Indépendant: Patronale 7% (AMU uniquement) | Salariale 0%
export const CNSS_RATES_INDEPENDANT = {
  employee: { retraite: 0, amu: 0, total: 0 },
  employer: { retraite: 0, amu: 0.07, allocations_familiales: 0, accident_travail: 0, total: 0.07 }
};

export const RETRAITE_CAP = 400000; // Plafond retraite
export const RETCIM = 400;          // Retenue complémentaire fixe

// ─── ITS TABLE (Barème progressif) ─────────────────────────────────────────────
export const ITS_TABLE = [
  { min: 0, max: 4999, tax: 0 },
  { min: 5000, max: 9999, tax: 100 },
  { min: 10000, max: 14999, tax: 200 },
  { min: 15000, max: 19999, tax: 300 },
  { min: 20000, max: 24999, tax: 400 },
  { min: 25000, max: 29999, tax: 500 },
  { min: 30000, max: 34999, tax: 1100 },
  { min: 35000, max: 39999, tax: 1700 },
  { min: 40000, max: 44999, tax: 2300 },
  { min: 45000, max: 49999, tax: 2900 },
  { min: 50000, max: 54999, tax: 3650 },
  { min: 55000, max: 59999, tax: 4400 },
  { min: 60000, max: 64999, tax: 5150 },
  { min: 65000, max: 69999, tax: 5900 },
  { min: 70000, max: 74999, tax: 6650 },
  { min: 75000, max: 79999, tax: 7400 },
  { min: 80000, max: 84999, tax: 8150 },
  { min: 85000, max: 89999, tax: 8900 },
  { min: 90000, max: 94999, tax: 9650 },
  { min: 95000, max: 99999, tax: 10400 },
  { min: 100000, max: 104999, tax: 11150 },
  { min: 105000, max: 109999, tax: 11900 },
  { min: 110000, max: 114999, tax: 12650 },
  { min: 115000, max: 119999, tax: 13400 },
  { min: 120000, max: 124999, tax: 14150 },
  { min: 125000, max: 129999, tax: 14900 },
  { min: 130000, max: 134999, tax: 15650 },
  { min: 135000, max: 139999, tax: 16400 },
  { min: 140000, max: 144999, tax: 17150 },
  { min: 145000, max: 149999, tax: 17900 },
  { min: 150000, max: 154999, tax: 18650 },
  { min: 155000, max: 159999, tax: 19400 },
  { min: 160000, max: 164999, tax: 20150 },
  { min: 165000, max: 169999, tax: 20900 },
  { min: 170000, max: 174999, tax: 21650 },
  { min: 175000, max: 179999, tax: 22400 },
  { min: 180000, max: 184999, tax: 23150 },
  { min: 185000, max: 189999, tax: 23900 },
  { min: 190000, max: 194999, tax: 24650 },
  { min: 195000, max: 199999, tax: 25400 },
  { min: 200000, max: Infinity, tax: 26150 }
];

export const calculateITS = (netImposable) => {
  if (netImposable <= 0) return 0;
  const bracket = ITS_TABLE.find(b => netImposable >= b.min && netImposable <= b.max);
  return bracket ? bracket.tax : 26150;
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
  const retraiteBase = Math.min(grossSalary, RETRAITE_CAP);
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
  const retraiteBase = Math.min(grossSalary, RETRAITE_CAP);

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