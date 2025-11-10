// Djibouti Payroll Calculator - Enhanced with Holiday Calculations

export const CNSS_RATES = {
  employee: {
    retraite: 0.04,
    amu: 0.02,
    total: 0.06
  },
  employer: {
    retraite: 0.04,
    opsat: 0.012,
    allocations_familiales: 0.055,
    amu: 0.05,
    total: 0.157
  }
};

export const RETRAITE_CAP = 400000;
export const RETCIM = 400;

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
  { min: 200000, max: 1999999, tax: 26150 }
];

export const calculateITS = (netImposable) => {
  for (const bracket of ITS_TABLE) {
    if (netImposable >= bracket.min && netImposable <= bracket.max) {
      return bracket.tax;
    }
  }
  
  if (netImposable >= 2000000) {
    const base = 595900;
    const extraSteps = Math.floor((netImposable - 2000000) / 5000);
    return base + (extraSteps * 1750);
  }
  
  return 0;
};

export const calculatePrimeAnciennetePercentage = (yearsOfService, monthsOfService = 0) => {
  const totalMonths = (yearsOfService * 12) + monthsOfService;
  const totalYears = totalMonths / 12;
  
  if (totalYears < 2) return 0.04;
  if (totalYears < 4.5) return 0.08;
  if (totalYears < 7.5) return 0.12;
  if (totalYears < 10.5) return 0.16;
  if (totalYears < 15) return 0.20;
  return 0.20;
};

export const calculatePrimeAnciennete = (baseSalary, yearsOfService, monthsOfService = 0) => {
  const percentage = calculatePrimeAnciennetePercentage(yearsOfService, monthsOfService);
  return Math.round(baseSalary * percentage);
};

export const calculateCNSSEmployee = (grossSalary, regimeName = 'Général') => {
  const retraiteBase = Math.min(grossSalary, RETRAITE_CAP);
  
  return {
    retraite: Math.round(retraiteBase * CNSS_RATES.employee.retraite),
    amu: Math.round(grossSalary * CNSS_RATES.employee.amu),
    total: Math.round(retraiteBase * CNSS_RATES.employee.retraite + grossSalary * CNSS_RATES.employee.amu)
  };
};

export const calculateCNSSEmployer = (grossSalary, regimeName = 'Général') => {
  const retraiteBase = Math.min(grossSalary, RETRAITE_CAP);
  
  return {
    retraite: Math.round(retraiteBase * CNSS_RATES.employer.retraite),
    opsat: Math.round(grossSalary * CNSS_RATES.employer.opsat),
    allocations_familiales: Math.round(grossSalary * CNSS_RATES.employer.allocations_familiales),
    amu: Math.round(grossSalary * CNSS_RATES.employer.amu),
    total: Math.round(
      retraiteBase * CNSS_RATES.employer.retraite +
      grossSalary * CNSS_RATES.employer.opsat +
      grossSalary * CNSS_RATES.employer.allocations_familiales +
      grossSalary * CNSS_RATES.employer.amu
    )
  };
};

/**
 * Calculate payroll with holiday-specific rules
 * @param {Object} employee - Employee data
 * @param {Object} holidayStatus - {type: string, month_number: number} for maternity leave tracking
 * @param {Array} cyclePrimes - [{nom, montant, add_after_deductions}] primes added during payroll cycle
 * @returns {Object} Payroll calculation result
 */
export const calculatePayroll = (employee, holidayStatus = null, cyclePrimes = []) => {
  const baseSalary = employee.salaire_base || 0;
  
  // Calculate ancienneté
  let primeAnciennete = employee.prime_anciennete || 0;
  if (employee.prime_anciennete_auto !== false && employee.anciennete_annees !== undefined) {
    primeAnciennete = calculatePrimeAnciennete(
      baseSalary, 
      employee.anciennete_annees || 0,
      employee.anciennete_mois || 0
    );
  }
  
  // Calculate base primes
  const primesPersonnalisees = employee.primes_personnalisees || [];
  const totalPrimesPersonnalisees = primesPersonnalisees.reduce((sum, p) => sum + (p.montant || 0), 0);
  
  const basePrimes = (
    primeAnciennete +
    (employee.prime_fonction || 0) +
    (employee.prime_logement || 0) +
    (employee.prime_transport || 0) +
    (employee.prime_sujetion || 0) +
    (employee.prime_rendement || 0) +
    (employee.autres_primes || 0) +
    totalPrimesPersonnalisees
  );
  
  // Filter cycle primes that are BEFORE deductions
  const primesBeforeDeductions = cyclePrimes.filter(p => !p.add_after_deductions);
  const totalPrimesBeforeDeductions = primesBeforeDeductions.reduce((sum, p) => sum + (p.montant || 0), 0);
  
  // Calculate initial gross with base primes and cycle primes (before deductions)
  let initialGross = baseSalary + basePrimes + totalPrimesBeforeDeductions;
  
  // Handle holiday-specific salary adjustments
  let salaryPercentage = 1.0; // 100% by default
  let applyCNSS = true;
  let applyITS = true;
  let paidByCNSS = false;
  let holidayNote = null;
  
  if (holidayStatus) {
    switch (holidayStatus.type) {
      case 'Congé payé':
        // Normal calculation (100%)
        salaryPercentage = 1.0;
        applyCNSS = true;
        applyITS = true;
        holidayNote = '✅ Congé payé - Salaire normal (100%)';
        break;
      
      case 'Congé maladie':
        // Normal calculation with CNSS and ITS
        salaryPercentage = 1.0;
        applyCNSS = true;
        applyITS = true;
        holidayNote = '🏥 Congé maladie - Salaire normal avec cotisations';
        break;
      
      case 'Congé paternité':
        // Normal calculation
        salaryPercentage = 1.0;
        applyCNSS = true;
        applyITS = true;
        holidayNote = '👨‍👶 Congé paternité - Salaire normal';
        break;
        
      case 'Congé sans solde':
        // No salary, no CNSS, no ITS
        salaryPercentage = 0;
        applyCNSS = false;
        applyITS = false;
        holidayNote = '⛔ Congé sans solde - Aucun salaire ni cotisation';
        break;
        
      case 'Congé maternité':
        const monthNumber = holidayStatus.month_number || 1;
        if (monthNumber <= 3) {
          // First 3 months: company pays 50%
          salaryPercentage = 0.5;
          applyCNSS = true;
          applyITS = true;
          holidayNote = `🤰 Congé maternité (Mois ${monthNumber}/6) - Entreprise paie 50%`;
        } else {
          // Months 4-6: CNSS pays (company pays nothing)
          salaryPercentage = 0;
          applyCNSS = false;
          applyITS = false;
          paidByCNSS = true;
          holidayNote = `🤰 Congé maternité (Mois ${monthNumber}/6) - Payé par CNSS (0% entreprise)`;
        }
        break;
    }
  }
  
  // Apply holiday percentage
  initialGross = Math.round(initialGross * salaryPercentage);
  
  // Apply absences to gross (only if not on unpaid leave)
  const absences = (salaryPercentage > 0) ? (employee.absences_amount || 0) : 0;
  const grossSalary = initialGross - absences;
  
  const regimeName = employee.regime_cnss || 'Général';
  
  // Calculate CNSS if applicable
  const cnssEmployee = applyCNSS ? calculateCNSSEmployee(grossSalary, regimeName) : { retraite: 0, amu: 0, total: 0 };
  const cnssEmployer = applyCNSS ? calculateCNSSEmployer(grossSalary, regimeName) : { retraite: 0, opsat: 0, allocations_familiales: 0, amu: 0, total: 0 };
  
  // Calculate Net Imposable
  const netImposable = grossSalary - cnssEmployee.total;
  
  // Calculate ITS if applicable
  const its = applyITS ? calculateITS(netImposable) : 0;
  
  // Apply AIDE and RetCim (only if salary > 0)
  const aide = (grossSalary > 0) ? (employee.aide || 0) : 0;
  const retcim = (grossSalary > 0) ? RETCIM : 0;
  
  // Calculate net BEFORE primes added after deductions
  let netBeforeCyclePrimes = grossSalary - cnssEmployee.total - its - aide - retcim;
  
  // Filter cycle primes that are AFTER deductions
  const primesAfterDeductions = cyclePrimes.filter(p => p.add_after_deductions);
  const totalPrimesAfterDeductions = primesAfterDeductions.reduce((sum, p) => sum + (p.montant || 0), 0);
  
  // Final net salary = net before cycle primes + primes after deductions
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
      salaire_base: Math.round(baseSalary * salaryPercentage),
      prime_anciennete: Math.round(primeAnciennete * salaryPercentage),
      prime_fonction: Math.round((employee.prime_fonction || 0) * salaryPercentage),
      prime_logement: Math.round((employee.prime_logement || 0) * salaryPercentage),
      prime_transport: Math.round((employee.prime_transport || 0) * salaryPercentage),
      prime_sujetion: Math.round((employee.prime_sujetion || 0) * salaryPercentage),
      prime_rendement: Math.round((employee.prime_rendement || 0) * salaryPercentage),
      autres_primes: Math.round((employee.autres_primes || 0) * salaryPercentage),
      primes_personnalisees: Math.round(totalPrimesPersonnalisees * salaryPercentage)
    }
  };
};