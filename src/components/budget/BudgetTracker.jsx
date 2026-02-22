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
      const today = new Date();
      const startDate = budget.period_start ? new Date(budget.period_start) : today;
      const endDate = budget.period_end ? new Date(budget.period_end) : today;
      const totalDays = Math.max(differenceInDays(endDate, startDate), 1);
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
        {budgetStats.map(budget => {
          const usedPct = Math.min((budget.actualSpent / budget.amount_allocated) * 100, 100);
          const committedPct = Math.min((budget.committed / budget.amount_allocated) * 100, 100 - usedPct);
          const barColor = budget.usagePercentage >= 100 ? 'bg-red-500' : budget.usagePercentage >= (budget.alert_threshold_percentage || 80) ? 'bg-amber-500' : 'bg-green-500';
          return (
            <Card key={budget.id} className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-all" onClick={() => setDrillBudget(budget)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {budget.budget_type === 'Département' && '🏢'}
                      {budget.budget_type === 'Catégorie' && '📁'}
                      {budget.budget_type === 'Global' && '🌐'}
                      {budget.department_name || budget.category || 'Budget Global'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{budget.fiscal_year} • {budget.period}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(budget.status, budget.usagePercentage)}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Segmented progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Utilisation totale</span>
                    <span className="font-bold">{budget.usagePercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${usedPct}%` }} />
                    <div className="h-full transition-all duration-500 bg-blue-400" style={{ width: `${committedPct}%` }} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Dépensé</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>Engagé</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block"></span>Disponible</span>
                  </div>
                </div>

                {/* Budget Breakdown */}
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Alloué</p>
                    <p className="font-bold text-gray-900">{budget.amount_allocated.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Dépensé</p>
                    <p className="font-bold text-gray-900">{budget.actualSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Engagé</p>
                    <p className="font-bold text-blue-700">{budget.committed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Disponible</p>
                    <p className={`font-bold ${budget.available < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {budget.available.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Burn rate */}
                <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${budget.projectedOverrun ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <Flame className={`w-4 h-4 flex-shrink-0 ${budget.projectedOverrun ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={budget.projectedOverrun ? 'text-red-700' : 'text-gray-600'}>
                    Taux de consommation: <strong>{Math.round(budget.burnRate).toLocaleString()} DJF/jour</strong>
                    {budget.projectedOverrun && ` — Projection: ${Math.round(budget.projectedSpend).toLocaleString()} DJF (⚠️ dépasse l'alloué)`}
                  </span>
                </div>

                {/* Period */}
                <div className="pt-2 border-t flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {budget.period_start ? format(new Date(budget.period_start), 'dd/MM/yyyy') : '—'} — {budget.period_end ? format(new Date(budget.period_end), 'dd/MM/yyyy') : '—'}
                </div>

                {budget.usagePercentage >= (budget.alert_threshold_percentage || 80) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        {budget.usagePercentage >= 100
                          ? `Budget dépassé de ${(budget.usagePercentage - 100).toFixed(1)}%`
                          : `${(100 - budget.usagePercentage).toFixed(1)}% restant avant dépassement`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Drill-down modal */}
      {drillBudget && (
        <Dialog open={!!drillBudget} onOpenChange={() => setDrillBudget(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {drillBudget.department_name || drillBudget.category || 'Budget Global'} — Détail des transactions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Alloué', value: drillBudget.amount_allocated, color: 'text-gray-900' },
                  { label: 'Dépensé', value: drillBudget.actualSpent, color: 'text-red-600' },
                  { label: 'Engagé', value: drillBudget.committed, color: 'text-blue-600' },
                  { label: 'Disponible', value: drillBudget.available, color: drillBudget.available < 0 ? 'text-red-600' : 'text-green-600' },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="border shadow-sm">
                    <CardContent className="p-3">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-lg font-bold ${color}`}>{value?.toLocaleString()} DJF</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <h4 className="font-semibold text-[#0A2540] mb-3">Transactions liées</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F9FC]">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillBudget.relevantTransactions?.filter(t => t.type === 'Dépense').map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{tx.date && format(new Date(tx.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm font-medium">{tx.description}</TableCell>
                        <TableCell className="text-sm">{tx.category || '-'}</TableCell>
                        <TableCell className="text-sm">{tx.payment_method || '-'}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{tx.amount?.toLocaleString()} DJF</TableCell>
                        <TableCell>
                          <Badge className={tx.status === 'Payé' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                            {tx.status || 'En attente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!drillBudget.relevantTransactions || drillBudget.relevantTransactions.filter(t => t.type === 'Dépense').length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-400">Aucune transaction liée</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}