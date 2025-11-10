import React from 'react';

const CNSS_TRANCHES = [
  { min: 0, max: 30000, rate: 0.02 },
  { min: 30000, max: 50000, rate: 0.12 },
  { min: 50000, max: 100000, rate: 0.18 },
  { min: 100000, max: 200000, rate: 0.22 },
  { min: 200000, max: 500000, rate: 0.28 },
  { min: 500000, max: 1000000, rate: 0.35 },
  { min: 1000000, max: 2000000, rate: 0.40 },
  { min: 2000000, max: Infinity, rate: 0.45 }
];

const ITS_BRACKETS = [
  { min: 0, max: 30000, rate: 0, fixed: 0 },
  { min: 30000, max: 50000, rate: 0.05, fixed: 0 },
  { min: 50000, max: 100000, rate: 0.10, fixed: 1000 },
  { min: 100000, max: 200000, rate: 0.15, fixed: 6000 },
  { min: 200000, max: 500000, rate: 0.20, fixed: 21000 },
  { min: 500000, max: 1000000, rate: 0.25, fixed: 81000 },
  { min: 1000000, max: 2000000, rate: 0.30, fixed: 206000 },
  { min: 2000000, max: Infinity, rate: 0.35, fixed: 506000 }
];

export const calculateCNSS = (grossSalary, regimeCNSS = 'Général') => {
  let totalCNSS = 0;
  const multiplier = regimeCNSS === 'Zone Franche' ? 0.5 : 1;
  
  for (const tranche of CNSS_TRANCHES) {
    if (grossSalary > tranche.min) {
      const applicableAmount = Math.min(grossSalary, tranche.max) - tranche.min;
      totalCNSS += applicableAmount * tranche.rate * multiplier;
    }
  }
  
  return Math.round(totalCNSS);
};

export const calculateITS = (taxableSalary) => {
  let its = 0;
  
  for (const bracket of ITS_BRACKETS) {
    if (taxableSalary > bracket.min) {
      const applicableAmount = Math.min(taxableSalary, bracket.max) - bracket.min;
      its = bracket.fixed + (applicableAmount * bracket.rate);
    }
  }
  
  return Math.round(its);
};

export const calculateGrossSalary = (employee) => {
  return (
    (employee.salaire_base || 0) +
    (employee.prime_anciennete || 0) +
    (employee.prime_rendement || 0) +
    (employee.prime_sujetion || 0) +
    (employee.prime_logement || 0) +
    (employee.prime_voiture || 0) +
    (employee.autres_primes || 0)
  );
};

export const calculatePayroll = (employee) => {
  const grossSalary = calculateGrossSalary(employee);
  const cnssEmployee = calculateCNSS(grossSalary, employee.regime_cnss);
  const cnssEmployer = Math.round(cnssEmployee * 0.8);
  const taxableSalary = grossSalary - cnssEmployee;
  const its = calculateITS(taxableSalary);
  const netSalary = grossSalary - cnssEmployee - its;
  
  return {
    grossSalary,
    cnssEmployee,
    cnssEmployer,
    its,
    netSalary,
    totalCost: grossSalary + cnssEmployer
  };
};

export default {
  calculateCNSS,
  calculateITS,
  calculateGrossSalary,
  calculatePayroll
};