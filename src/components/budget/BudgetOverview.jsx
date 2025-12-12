import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BudgetOverview({ budgets, departments, expenseRequests }) {
  const [selectedBudget, setSelectedBudget] = useState(null);
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
    const totalUsedPercentage = usedPercentage + committedPercentage;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <Card className="border border-[#E8ECF2] hover:shadow-lg transition-all bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0066FF]/10 to-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>

              {/* Department Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#0A2540] text-base truncate">
                  {budget.department_name || dept?.name}
                </h3>
                <p className="text-xs text-[#697586]">{budget.period} • {budget.period_start?.split('-')[0]}</p>
              </div>

              {/* Progress Bar with Amount */}
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#0A2540]">
                    {budget.amount_used?.toLocaleString()} DJF ({totalUsedPercentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute h-full transition-all duration-500 rounded-full ${
                      health.status === 'Dépassé' ? 'bg-red-500' :
                      health.status === 'Attention' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(totalUsedPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Total Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-[#0A2540]">
                  {budget.amount_allocated?.toLocaleString()} DJF
                </p>
              </div>
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

      <div className="space-y-4">
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