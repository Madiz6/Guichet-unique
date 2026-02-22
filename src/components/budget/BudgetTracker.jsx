import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Calendar, Flame, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function BudgetTracker({ budgets, transactions, expenseRequests }) {
  const [drillBudget, setDrillBudget] = useState(null);

  const budgetStats = useMemo(() => {
    return budgets.map(budget => {
      // Calculate real-time usage from transactions
      const relevantTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        const startDate = new Date(budget.period_start);
        const endDate = new Date(budget.period_end);
        
        if (txDate < startDate || txDate > endDate) return false;
        
        if (budget.budget_type === 'Département') {
          return t.department === budget.department_name;
        } else if (budget.budget_type === 'Catégorie') {
          return t.category === budget.category;
        }
        return true; // Global budget
      });

      const actualSpent = relevantTransactions
        .filter(t => t.type === 'Dépense' && t.status === 'Payé')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const committed = expenseRequests
        .filter(r => {
          if (budget.budget_type === 'Département' && r.department_id !== budget.department_id) return false;
          if (budget.budget_type === 'Catégorie' && r.category !== budget.category) return false;
          return ['Approuvée', 'Engagée'].includes(r.status);
        })
        .reduce((sum, r) => sum + (r.amount_requested || 0), 0);

      const totalUsed = actualSpent + committed;
      const available = budget.amount_allocated - totalUsed;
      const usagePercentage = (totalUsed / budget.amount_allocated) * 100;

      // Burn rate / forecasting
      const startDate = new Date(budget.period_start);
      const endDate = new Date(budget.period_end);
      const today = new Date();
      const totalDays = differenceInDays(endDate, startDate) || 1;
      const daysElapsed = Math.max(differenceInDays(today, startDate), 1);
      const burnRate = actualSpent / daysElapsed; // per day
      const projectedSpend = burnRate * totalDays;
      const projectedOverrun = projectedSpend > budget.amount_allocated;

      const status = usagePercentage >= 100 ? 'Dépassé' 
        : usagePercentage >= budget.alert_threshold_percentage ? 'Alerte' 
        : 'Actif';

      return {
        ...budget,
        actualSpent,
        committed,
        totalUsed,
        available,
        usagePercentage,
        status,
        burnRate,
        projectedSpend,
        projectedOverrun,
        relevantTransactions
      };
    });
  }, [budgets, transactions, expenseRequests]);

  const getStatusBadge = (status, percentage) => {
    if (status === 'Dépassé') {
      return <Badge className="bg-red-100 text-red-800">🚨 Dépassé</Badge>;
    } else if (status === 'Alerte') {
      return <Badge className="bg-amber-100 text-amber-800">⚠️ Alerte</Badge>;
    } else if (percentage >= 50) {
      return <Badge className="bg-blue-100 text-blue-800">📊 En cours</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">✅ Sain</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Budget Total Alloué</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {budgetStats.reduce((sum, b) => sum + b.amount_allocated, 0).toLocaleString()} DJF
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Total Dépensé</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {budgetStats.reduce((sum, b) => sum + b.actualSpent, 0).toLocaleString()} DJF
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-gray-600">Budgets en Alerte</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {budgetStats.filter(b => ['Alerte', 'Dépassé'].includes(b.status)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {budgetStats.map(budget => (
          <Card key={budget.id} className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {budget.budget_type === 'Département' && '🏢'}
                    {budget.budget_type === 'Catégorie' && '📁'}
                    {budget.budget_type === 'Global' && '🌐'}
                    {budget.department_name || budget.category || 'Budget Global'}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {budget.fiscal_year} • {budget.period}
                  </p>
                </div>
                {getStatusBadge(budget.status, budget.usagePercentage)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Utilisation</span>
                  <span className="font-bold">{budget.usagePercentage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(budget.usagePercentage, 100)} 
                  className={`h-3 ${
                    budget.usagePercentage >= 100 ? 'bg-red-100' :
                    budget.usagePercentage >= budget.alert_threshold_percentage ? 'bg-amber-100' :
                    'bg-green-100'
                  }`}
                />
              </div>

              {/* Budget Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Budget Alloué</p>
                  <p className="font-bold text-gray-900">{budget.amount_allocated.toLocaleString()} DJF</p>
                </div>
                <div>
                  <p className="text-gray-600">Disponible</p>
                  <p className={`font-bold ${budget.available < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {budget.available.toLocaleString()} DJF
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Dépensé</p>
                  <p className="font-bold text-gray-900">{budget.actualSpent.toLocaleString()} DJF</p>
                </div>
                <div>
                  <p className="text-gray-600">Engagé</p>
                  <p className="font-bold text-gray-900">{budget.committed.toLocaleString()} DJF</p>
                </div>
              </div>

              {/* Period */}
              <div className="pt-3 border-t flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="w-4 h-4" />
                {format(new Date(budget.period_start), 'dd/MM/yyyy')} - {format(new Date(budget.period_end), 'dd/MM/yyyy')}
              </div>

              {/* Alert Info */}
              {budget.usagePercentage >= budget.alert_threshold_percentage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-amber-900">Seuil d'alerte atteint</p>
                      <p className="text-amber-700">
                        {budget.usagePercentage >= 100 
                          ? `Budget dépassé de ${(budget.usagePercentage - 100).toFixed(1)}%`
                          : `${(100 - budget.usagePercentage).toFixed(1)}% restant avant dépassement`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}