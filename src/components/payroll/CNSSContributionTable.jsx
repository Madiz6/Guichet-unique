import React, { useMemo } from 'react';
import { RETRAITE_CAP } from './DjiboutiCalculator';

/**
 * Tableau détaillé de retenue de Cotisation CNSS
 * Régime Zone Franche: Part Salariale 6% + Part Patronale 10.2% = 16.2% total
 * Plafond retraite: 400 000 DJF
 *
 * Part Salariale  (6%):  Retraite 4% + AMU 2%
 * Part Patronale (10.2%): Retraite 4% + AT & Soins 6.2%
 *
 * Paiement des cotisations par tranches:
 *   Tranche 1: masse salariale ≤ 400 000 DJF/emp → 8%  (4% sal + 4% pat)
 *   Tranche 2: masse salariale > 400 000 DJF/emp → 8.2% (2% sal AMU + 6.2% pat AT)
 */

const TRANCHE1_RATE = 0.08;   // 4% retraite sal + 4% retraite pat
const TRANCHE2_RATE = 0.082;  // 2% AMU sal + 6.2% AT pat

function calcRowZF(employee, index) {
  const brut = employee.salaire_base || 0;
  const plafond = Math.min(brut, RETRAITE_CAP);

  // Part salariale 6%: retraite 4% sur plafond + AMU 2% sur brut
  const retraiteSal = Math.round(plafond * 0.04);
  const amuSal = Math.round(brut * 0.02);
  const totalSal = retraiteSal + amuSal;

  // Part patronale 10.2%: retraite 4% sur plafond + AT&Soins 6.2% sur brut
  const retraitePat = Math.round(plafond * 0.04);
  const atPat = Math.round(brut * 0.062);
  const totalPat = retraitePat + atPat;

  return {
    index: index + 1,
    nom: `${employee.prenom || ''} ${employee.nom || ''}`.trim(),
    fonction: employee.fonction || '-',
    brut,
    plafond,
    totalSal,
    totalPat,
    total: totalSal + totalPat
  };
}

function calcTranches(rows) {
  // Tranche 1: sum of plafond amounts (retraite base for all employees)
  const masseTranche1 = rows.reduce((s, r) => s + r.plafond, 0);
  // Tranche 2: sum of (brut - plafond) i.e. amounts above cap
  const masseTranche2 = rows.reduce((s, r) => s + Math.max(0, r.brut - r.plafond), 0);

  const cotTranche1 = Math.round(masseTranche1 * TRANCHE1_RATE);
  const cotTranche2 = Math.round(masseTranche2 * TRANCHE2_RATE);

  return { masseTranche1, masseTranche2, cotTranche1, cotTranche2, total: cotTranche1 + cotTranche2 };
}

export default function CNSSContributionTable({ employees = [], regime = 'Zone Franche' }) {
  const rows = useMemo(() => employees.map((e, i) => calcRowZF(e, i)), [employees]);
  const totals = useMemo(() => ({
    brut: rows.reduce((s, r) => s + r.brut, 0),
    plafond: rows.reduce((s, r) => s + r.plafond, 0),
    totalSal: rows.reduce((s, r) => s + r.totalSal, 0),
    totalPat: rows.reduce((s, r) => s + r.totalPat, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
  }), [rows]);
  const tranches = useMemo(() => calcTranches(rows), [rows]);

  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

  return (
    <div className="space-y-6 font-sans text-[13px]">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-base font-bold text-[#0A2540] uppercase tracking-wide">
          Tableau détaillé de retenue de Cotisation
        </h2>
        <p className="text-[#0066FF] font-semibold text-sm mt-1">
          Régime {regime} — Taux total : {regime === 'Zone Franche' ? '16,2%' : '21,7%'}
          &nbsp;(Part Salariale 6% + Part Patronale {regime === 'Zone Franche' ? '10,2%' : '15,7%'})
        </p>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-[#E8ECF2]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0A2540] text-white">
              <th className="px-3 py-2 text-center w-10">N°</th>
              <th className="px-3 py-2">Nom et Prénom</th>
              <th className="px-3 py-2">Fonction</th>
              <th className="px-3 py-2 text-right">Salaire Brut</th>
              <th className="px-3 py-2 text-right">
                Plafond<br />
                <span className="text-[10px] font-normal text-blue-200">400 000 DJF</span>
              </th>
              <th className="px-3 py-2 text-right bg-blue-800">
                Part Salariale<br />
                <span className="text-[10px] font-normal">(6%)</span>
              </th>
              <th className="px-3 py-2 text-right bg-blue-900">
                Part Patronale<br />
                <span className="text-[10px] font-normal">({regime === 'Zone Franche' ? '10,2%' : '15,7%'})</span>
              </th>
              <th className="px-3 py-2 text-right bg-[#0066FF]">
                Total<br />
                <span className="text-[10px] font-normal">({regime === 'Zone Franche' ? '16,2%' : '21,7%'})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F9FC]'}
              >
                <td className="px-3 py-2 text-center text-[#697586]">{row.index}</td>
                <td className="px-3 py-2 font-medium text-[#0A2540]">{row.nom}</td>
                <td className="px-3 py-2 text-[#697586]">{row.fonction}</td>
                <td className="px-3 py-2 text-right font-mono text-[#0A2540]">{fmt(row.brut)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#697586]">{fmt(row.plafond)}</td>
                <td className="px-3 py-2 text-right font-mono text-blue-700 bg-blue-50">{fmt(row.totalSal)}</td>
                <td className="px-3 py-2 text-right font-mono text-blue-900 bg-blue-100">{fmt(row.totalPat)}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-[#0066FF] bg-blue-50">{fmt(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#0A2540] text-white font-bold">
              <td colSpan={3} className="px-3 py-2">TOTAL</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(totals.brut)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(totals.plafond)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(totals.totalSal)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(totals.totalPat)}</td>
              <td className="px-3 py-2 text-right font-mono text-[#60D4B0]">{fmt(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Rate Breakdown Legend */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-bold text-blue-800 mb-1">Part Salariale (6%)</p>
          <p className="text-xs text-blue-700">• Retraite : 4% sur salaire plafonné à 400 000</p>
          <p className="text-xs text-blue-700">• AMU : 2% sur salaire brut total</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs font-bold text-indigo-800 mb-1">Part Patronale ({regime === 'Zone Franche' ? '10,2%' : '15,7%'})</p>
          {regime === 'Zone Franche' ? (
            <>
              <p className="text-xs text-indigo-700">• Retraite : 4% sur salaire plafonné à 400 000</p>
              <p className="text-xs text-indigo-700">• AT & Soins : 6,2% sur salaire brut total</p>
            </>
          ) : (
            <>
              <p className="text-xs text-indigo-700">• Retraite : 4% sur salaire plafonné à 400 000</p>
              <p className="text-xs text-indigo-700">• AT : 1,2% | Fam. : 5,5% | AMU : 5% sur brut</p>
            </>
          )}
        </div>
      </div>

      {/* Paiement des cotisations - Tranches */}
      <div className="border border-[#E8ECF2] rounded-lg overflow-hidden">
        <div className="bg-[#0A2540] text-white px-4 py-2">
          <h3 className="font-bold text-sm">Paiement des Cotisations — Calcul par Tranches</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border border-[#E8ECF2]">
            <div>
              <p className="font-semibold text-[#0A2540] text-sm">Tranche 1 — Salaires ≤ 400 000 DJF</p>
              <p className="text-xs text-[#697586] mt-0.5">
                Masse salariale plafonée × 8%&nbsp;
                <span className="text-[#0066FF]">(Retraite 4% sal + 4% pat)</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#697586]">{fmt(tranches.masseTranche1)} × 8%</p>
              <p className="font-bold text-[#0A2540] text-base">{fmt(tranches.cotTranche1)} DJF</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg border border-[#E8ECF2]">
            <div>
              <p className="font-semibold text-[#0A2540] text-sm">Tranche 2 — Salaires &gt; 400 000 DJF</p>
              <p className="text-xs text-[#697586] mt-0.5">
                Masse salariale au-delà du plafond × 8,2%&nbsp;
                <span className="text-[#0066FF]">(AMU 2% sal + AT 6,2% pat)</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#697586]">{fmt(tranches.masseTranche2)} × 8,2%</p>
              <p className="font-bold text-[#0A2540] text-base">{fmt(tranches.cotTranche2)} DJF</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0066FF] to-[#0052CC] rounded-lg text-white">
            <div>
              <p className="font-bold text-base">Cotisation Totale</p>
              <p className="text-xs text-blue-200 mt-0.5">Tranche 1 + Tranche 2</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">{fmt(tranches.cotTranche1)} + {fmt(tranches.cotTranche2)}</p>
              <p className="font-bold text-2xl">{fmt(tranches.total)} DJF</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}