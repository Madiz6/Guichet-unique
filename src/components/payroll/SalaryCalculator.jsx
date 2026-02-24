/**
 * SalaryCalculator - Delegates to DjiboutiCalculator (canonical source)
 * Based on Arrêté N°69-1883/SG/CG/ du 31.12.1969
 *
 * Part Salariale  6%:   Retraite 4% + AMU 2%
 * Part Patronale 15.7%: Prestations familiales 5.5% + AMU 5% + AT 1.2% + Retraite 4%
 * Zone Franche   10.2%: AT & Soins 6.2% + Retraite 4% (pas de prestations familiales)
 */
export {
  calculatePayroll,
  calculateCNSSEmployee,
  calculateCNSSEmployer,
  calculateITS,
  CNSS_RATES,
  CNSS_RATES_ZONE_FRANCHE,
  RETRAITE_CAP,
} from './DjiboutiCalculator';

export default {};