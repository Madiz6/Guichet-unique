import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BudgetOverview({ budgets, departments, expenseRequests }) {
  const getBudgetHealth = (budget) => {
    const total = budget.amount_used + budget.amount_committed;
    const percentage = (total / budget.amount_allocated) * 100;
    
    if (percentage >= 100) return { color: 'bg-red-500', status: 'Dépassé', textColor: 'text-red-600' };
    if (percentage >= 80) return { color: 'bg-amber-500', status: 'Attention', textColor: 'text-amber-600' };
    return { color: 'bg-green-500', status: 'Sain', textColor: 'text-green-600' };
  };

  const BudgetCard = ({ budget }) => {
    const dept = departments.find(d => d.id === budget.department_id);
    const health = getBudgetHealth(budget);
    const usedPercentage = (budget.amount_used / budget.amount_allocated) * 100;
    const committedPercentage = (budget.amount_committed / budget.amount_allocated) * 100;
    const availablePercentage = ((budget.amount_available || 0) / budget.amount_allocated) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border border-[#E8ECF2] hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-[#0A2540] text-lg">{budget.department_name || dept?.name}</h3>
                <p className="text-sm text-[#697586]">{budget.period} • {budget.period_start} - {budget.period_end}</p>
              </div>
              <Badge className={`${health.textColor} bg-opacity-10`}>
                {health.status}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Budget Bar with Visual Segments */}
              <div className="relative">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#697586]">
                      {(usedPercentage + committedPercentage).toFixed(0)}% utilisé
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      health.status === 'Dépassé' ? 'bg-red-100 text-red-700' :
                      health.status === 'Attention' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {health.status === 'Dépassé' ? '120% - EXCEEDED ⚠' : 
                       health.status === 'Attention' ? '90% - ALMOST REACHED' : 
                       `${(usedPercentage + committedPercentage).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#0A2540]">
                      {budget.amount_allocated?.toLocaleString()} DJF
                    </p>
                  </div>
                </div>

                {/* Progress Bar with Patterns */}
                <div className="relative h-8 bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                  {/* Used - Solid Color */}
                  <div
                    className={`absolute h-full transition-all duration-500 ${
                      health.status === 'Dépassé' ? 'bg-purple-500' :
                      health.status === 'Attention' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                  />

                  {/* Committed - Striped Pattern */}
                  <div
                    className={`absolute h-full transition-all duration-500 ${
                      health.status === 'Dépassé' ? 'bg-purple-400' :
                      health.status === 'Attention' ? 'bg-blue-400' :
                      'bg-green-400'
                    }`}
                    style={{ 
                      left: `${Math.min(usedPercentage, 100)}%`,
                      width: `${Math.min(committedPercentage, 100 - usedPercentage)}%`,
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)'
                    }}
                  />
                </div>

                {/* Amount Labels on Bar */}
                <div className="flex justify-between items-center mt-2 px-1">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${
                        health.status === 'Dépassé' ? 'bg-purple-500' :
                        health.status === 'Attention' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="font-medium text-[#0A2540]">Used</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${
                        health.status === 'Dépassé' ? 'bg-purple-400' :
                        health.status === 'Attention' ? 'bg-blue-400' :
                        'bg-green-400'
                      }`} style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)'
                      }}></div>
                      <span className="font-medium text-[#0A2540]">Committed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-gray-200"></div>
                      <span className="font-medium text-[#697586]">Available</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-600 font-medium mb-1">Utilisé</p>
                  <p className="text-lg font-bold text-red-700">
                    {budget.amount_used?.toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600">{usedPercentage.toFixed(1)}%</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-amber-600 font-medium mb-1">Engagé</p>
                  <p className="text-lg font-bold text-amber-700">
                    {budget.amount_committed?.toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-600">{committedPercentage.toFixed(1)}%</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-1">Disponible</p>
                  <p className="text-lg font-bold text-green-700">
                    {(budget.amount_available || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">{availablePercentage.toFixed(1)}%</p>
                </div>
              </div>

              {budget.spending_limit_per_transaction && (
                <div className="pt-3 border-t border-[#E8ECF2] text-sm">
                  <p className="text-[#697586]">
                    Limite par transaction: <span className="font-semibold text-[#0A2540]">{budget.spending_limit_per_transaction.toLocaleString()} DJF</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-[#697586] mb-2">Total Alloué</p>
              <p className="text-3xl font-bold text-[#0A2540]">
                {budgets.reduce((sum, b) => sum + b.amount_allocated, 0).toLocaleString()} DJF
              </p>
            </div>
            <div>
              <p className="text-sm text-[#697586] mb-2">Total Utilisé + Engagé</p>
              <p className="text-3xl font-bold text-red-600">
                {budgets.reduce((sum, b) => sum + b.amount_used + b.amount_committed, 0).toLocaleString()} DJF
              </p>
            </div>
            <div>
              <p className="text-sm text-[#697586] mb-2">Total Disponible</p>
              <p className="text-3xl font-bold text-green-600">
                {budgets.reduce((sum, b) => sum + (b.amount_available || 0), 0).toLocaleString()} DJF
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(budget => (
          <BudgetCard key={budget.id} budget={budget} />
        ))}
      </div>

      {budgets.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#0A2540] mb-2">Aucun budget configuré</h3>
            <p className="text-[#697586]">Configurez vos budgets dans la section Configuration</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}