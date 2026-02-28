import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, TrendingUp, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import BudgetOverview from '@/components/budget/BudgetOverview';
import ApprovalInterface from '@/components/budget/ApprovalInterface';
import BudgetSettings from '@/components/budget/BudgetSettings';
import BudgetPlanningForm from '@/components/budget/BudgetPlanningForm';
import BudgetTracker from '@/components/budget/BudgetTracker';
import BudgetAlerts from '@/components/budget/BudgetAlerts';

export default function BudgetManagement() {
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('planning');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list('-created_date'),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: expenseRequests = [] } = useQuery({
    queryKey: ['expense-requests'],
    queryFn: () => base44.entities.ExpenseRequest.list('-created_date'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const isAdmin = user?.role === 'admin';

  const StatCard = ({ icon: Icon, label, value, color, badge }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[#697586]">{label}</p>
              <p className="text-2xl font-bold text-[#0A2540]">{value}</p>
            </div>
          </div>
          {badge && badge}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <Toaster position="top-right" />
      <div className="max-w-[1800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Gestion Budgétaire</h1>
            <p className="text-[#697586] mt-1">Suivi des budgets, dépenses et approbations</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('PurchaseRequests')}>
              <Button variant="outline" className="border-blue-600 text-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Demande
              </Button>
            </Link>
            {isAdmin && (
              <Button
                onClick={() => {
                  setEditBudget(null);
                  setShowBudgetForm(true);
                }}
                className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer Budget
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={TrendingUp}
            label="Budget Total Alloué"
            value={`${budgets.reduce((sum, b) => sum + b.amount_allocated, 0).toLocaleString()} DJF`}
            color="from-[#6366F1] to-[#8B5CF6]"
          />
          <StatCard
            icon={CheckCircle}
            label="Mes Demandes"
            value={myRequests.length}
            color="from-[#10B981] to-[#059669]"
            badge={
              myRequests.filter(r => r.status === 'Approuvée').length > 0 && (
                <Badge className="bg-green-100 text-green-700">
                  {myRequests.filter(r => r.status === 'Approuvée').length} approuvées
                </Badge>
              )
            }
          />
          {(isManager || isAdmin) && (
            <StatCard
              icon={Clock}
              label="En attente d'approbation"
              value={pendingApprovals.length}
              color="from-[#F59E0B] to-[#D97706]"
              badge={
                pendingApprovals.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 animate-pulse">
                    Action requise
                  </Badge>
                )
              }
            />
          )}
          <StatCard
            icon={AlertCircle}
            label="Budgets Dépassés"
            value={budgets.filter(b => b.amount_used + b.amount_committed > b.amount_allocated).length}
            color="from-[#EF4444] to-[#DC2626]"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-[#E8ECF2]">
            <TabsTrigger value="planning">📋 Planification</TabsTrigger>
            <TabsTrigger value="tracking">📊 Suivi Temps Réel</TabsTrigger>
            <TabsTrigger value="alerts">🔔 Alertes</TabsTrigger>

            {isAdmin && <TabsTrigger value="settings">Configuration</TabsTrigger>}
          </TabsList>

          <TabsContent value="planning">
            <BudgetOverview budgets={budgets} departments={departments} expenseRequests={expenseRequests} />
          </TabsContent>

          <TabsContent value="tracking">
            <BudgetTracker budgets={budgets} transactions={transactions} expenseRequests={expenseRequests} />
          </TabsContent>

          <TabsContent value="alerts">
            <BudgetAlerts budgets={budgets} transactions={transactions} expenseRequests={expenseRequests} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings">
              <BudgetSettings budgets={budgets} departments={departments} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <BudgetPlanningForm
        isOpen={showBudgetForm}
        onClose={() => {
          setShowBudgetForm(false);
          setEditBudget(null);
        }}
        departments={departments}
        editBudget={editBudget}
      />
    </div>
  );
}