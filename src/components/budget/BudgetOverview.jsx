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
    const availablePercentage = ((budget.amount_available || 0) / budget.amount_allocated) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <Card 
          className="border border-[#E8ECF2] hover:shadow-lg transition-all bg-white cursor-pointer"
          onClick={() => setSelectedBudget(budget)}
        >
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

              {/* Progress Bar with Segmented Colors */}
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#0A2540]">
                    {(budget.amount_used + budget.amount_committed)?.toLocaleString()} DJF ({(usedPercentage + committedPercentage).toFixed(0)}%)
                  </span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden flex">
                  {/* Used - Green/Amber/Red */}
                  <div
                    className={`h-full transition-all duration-500 ${
                      health.status === 'Dépassé' ? 'bg-red-500' :
                      health.status === 'Attention' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${usedPercentage}%` }}
                  />
                  {/* Committed - Blue */}
                  <div
                    className="h-full transition-all duration-500 bg-blue-500"
                    style={{ width: `${committedPercentage}%` }}
                  />
                  {/* Available - Gray (implicit) */}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-[#697586]">Utilisé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[#697586]">Engagé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                    <span className="text-[#697586]">Disponible</span>
                  </div>
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

      {/* Budget Details Modal */}
      {selectedBudget && (
        <Dialog open={!!selectedBudget} onOpenChange={() => setSelectedBudget(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du Budget - {selectedBudget.department_name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Budget Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-green-600 font-medium mb-1">Utilisé</p>
                    <p className="text-2xl font-bold text-green-700">
                      {selectedBudget.amount_used?.toLocaleString()} DJF
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600 font-medium mb-1">Engagé</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {selectedBudget.amount_committed?.toLocaleString()} DJF
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 bg-gray-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 font-medium mb-1">Disponible</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {(selectedBudget.amount_available || 0)?.toLocaleString()} DJF
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Requests Table */}
              <div>
                <h3 className="font-semibold text-[#0A2540] mb-4">Toutes les Demandes de Dépenses</h3>
                <div className="border border-[#E8ECF2] rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F7F9FC]">
                        <TableHead>N° Demande</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Demandeur</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Approbateur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseRequests
                        .filter(req => req.budget_id === selectedBudget.id)
                        .map(request => (
                          <TableRow key={request.id} className="hover:bg-[#F7F9FC]">
                            <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-[#0A2540]">{request.description}</p>
                                {request.contact_name && (
                                  <p className="text-xs text-[#697586]">{request.contact_name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-[#0A2540]">{request.requester_name}</p>
                                <p className="text-xs text-[#697586]">{request.requested_by}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-[#0A2540]">
                              {request.amount_requested?.toLocaleString()} DJF
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{request.category}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-[#697586]">
                              {request.date_requested}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                request.status === 'Approuvée' ? 'bg-green-100 text-green-700' :
                                request.status === 'Rejetée' ? 'bg-red-100 text-red-700' :
                                request.status === 'Exécutée' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }>
                                {request.status === 'Approuvée' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                                {request.status === 'Rejetée' && <XCircle className="w-3 h-3 mr-1 inline" />}
                                {request.status === 'En attente' && <Clock className="w-3 h-3 mr-1 inline" />}
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {request.approver_name ? (
                                <div>
                                  <p className="font-medium text-[#0A2540]">{request.approver_name}</p>
                                  <p className="text-xs text-[#697586]">{request.approved_by}</p>
                                  {request.date_approved && (
                                    <p className="text-xs text-[#697586]">{request.date_approved}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#697586] text-sm">En attente</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      {expenseRequests.filter(req => req.budget_id === selectedBudget.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-[#697586]">
                            Aucune demande de dépense pour ce budget
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}