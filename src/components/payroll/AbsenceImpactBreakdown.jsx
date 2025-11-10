import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingDown, Calculator, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AbsenceImpactBreakdown({ employee, withAbsences, withoutAbsences, absenceAmount }) {
  if (!absenceAmount || absenceAmount <= 0) return null;
  
  const cnssReduction = withoutAbsences.cnssEmployee.total - withAbsences.cnssEmployee.total;
  const itsReduction = withoutAbsences.its - withAbsences.its;
  const grossReduction = withoutAbsences.grossSalary - withAbsences.grossSalary;
  const netReduction = withoutAbsences.netSalary - withAbsences.netSalary;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4"
    >
      <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-red-900 text-lg mb-1">
                Impact des Absences: {absenceAmount.toLocaleString()} DJF
              </h4>
              <p className="text-sm text-red-700">
                Les absences réduisent le salaire brut, ce qui diminue automatiquement les cotisations et l'ITS
              </p>
            </div>
          </div>
          
          {/* Visual Flow */}
          <div className="space-y-3">
            {/* Step 1: Gross Reduction */}
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <span className="font-semibold text-gray-900">Réduction du Salaire Brut</span>
                </div>
                <span className="text-red-600 font-bold">-{absenceAmount.toLocaleString()} DJF</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                <div>
                  <span className="text-gray-600">Brut sans absences:</span>
                  <span className="ml-2 line-through text-gray-400">{withoutAbsences.grossSalary.toLocaleString()} DJF</span>
                </div>
                <div>
                  <span className="text-gray-600">Brut avec absences:</span>
                  <span className="ml-2 font-bold text-red-600">{withAbsences.grossSalary.toLocaleString()} DJF</span>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-red-400"></div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-red-400"></div>
              </div>
            </div>
            
            {/* Step 2: CNSS Impact */}
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <span className="font-semibold text-gray-900">Impact CNSS Salariale (4%)</span>
                </div>
                <span className="text-orange-600 font-bold">-{cnssReduction.toLocaleString()} DJF</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                <div>
                  <span className="text-gray-600">Avant:</span>
                  <span className="ml-2 line-through text-gray-400">{withoutAbsences.cnssEmployee.total.toLocaleString()} DJF</span>
                </div>
                <div>
                  <span className="text-gray-600">Après:</span>
                  <span className="ml-2 font-bold text-orange-600">{withAbsences.cnssEmployee.total.toLocaleString()} DJF</span>
                </div>
              </div>
              <p className="text-xs text-orange-700 mt-2 flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                Calculé sur le brut ajusté: {withAbsences.grossSalary.toLocaleString()} × 4%
              </p>
            </div>
            
            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-amber-400"></div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-amber-400"></div>
              </div>
            </div>
            
            {/* Step 3: ITS Impact */}
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <span className="font-semibold text-gray-900">Impact ITS</span>
                </div>
                <span className="text-amber-600 font-bold">-{itsReduction.toLocaleString()} DJF</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                <div>
                  <span className="text-gray-600">Avant:</span>
                  <span className="ml-2 line-through text-gray-400">{withoutAbsences.its.toLocaleString()} DJF</span>
                </div>
                <div>
                  <span className="text-gray-600">Après:</span>
                  <span className="ml-2 font-bold text-amber-600">{withAbsences.its.toLocaleString()} DJF</span>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                Calculé sur le net imposable réduit
              </p>
            </div>
            
            {/* Total Impact Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  <span className="font-bold text-lg">Réduction Totale du Net</span>
                </div>
                <span className="text-2xl font-bold">-{netReduction.toLocaleString()} DJF</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/20 rounded p-2 text-center">
                  <p className="opacity-90">Absence</p>
                  <p className="font-bold">{absenceAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 rounded p-2 text-center">
                  <p className="opacity-90">CNSS économisée</p>
                  <p className="font-bold">{cnssReduction.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 rounded p-2 text-center">
                  <p className="opacity-90">ITS économisé</p>
                  <p className="font-bold">{itsReduction.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info Box */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">💡 Pourquoi cette économie?</p>
              <p className="text-blue-800">
                Les absences réduisent le <strong>Salaire Brut</strong>, ce qui diminue automatiquement:
              </p>
              <ul className="list-disc ml-4 mt-1 text-blue-800">
                <li>Les cotisations CNSS (4% du brut)</li>
                <li>L'ITS (calculé sur le net imposable)</li>
                <li>Le montant net final à payer</li>
              </ul>
              <p className="mt-2 text-blue-800">
                ✅ <strong>L'employé perd {netReduction.toLocaleString()} DJF au total</strong> (absence + réduction des cotisations)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}