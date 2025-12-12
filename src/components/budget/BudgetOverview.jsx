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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-[#697586]">Utilisé</p>
                  <p className="text-lg font-bold text-red-600">
                    {budget.amount_used?.toLocaleString()} DJF
                  </p>
                  <p className="text-xs text-[#697586]">{usedPercentage.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#697586]">Engagé</p>
                  <p className="text-lg font-bold text-amber-600">
                    {budget.amount_committed?.toLocaleString()} DJF
                  </p>
                  <p className="text-xs text-[#697586]">{committedPercentage.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#697586]">Disponible</p>
                  <p className="text-lg font-bold text-green-600">
                    {(budget.amount_available || 0).toLocaleString()} DJF
                  </p>
                  <p className="text-xs text-[#697586]">{availablePercentage.toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#697586]">Budget alloué</span>
                  <span className="font-semibold text-[#0A2540]">{budget.amount_allocated?.toLocaleString()} DJF</span>
                </div>
                
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${usedPercentage}%` }}
                    title={`Utilisé: ${usedPercentage.toFixed(1)}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${committedPercentage}%` }}
                    title={`Engagé: ${committedPercentage.toFixed(1)}%`}
                  />
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${availablePercentage}%` }}
                    title={`Disponible: ${availablePercentage.toFixed(1)}%`}
                  />
                </div>

                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-[#697586]">Utilisé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-[#697586]">Engagé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-[#697586]">Disponible</span>
                  </div>
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