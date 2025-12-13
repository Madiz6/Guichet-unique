import React, { useEffect, useMemo } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function BudgetAlerts({ budgets, transactions, expenseRequests }) {
  const queryClient = useQueryClient();

  const alerts = useMemo(() => {
    const alertList = [];

    budgets.forEach(budget => {
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
        return true;
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
      const usagePercentage = (totalUsed / budget.amount_allocated) * 100;

      if (usagePercentage >= budget.alert_threshold_percentage) {
        alertList.push({
          budget,
          usagePercentage,
          totalUsed,
          severity: usagePercentage >= 100 ? 'critical' : 'warning',
          message: usagePercentage >= 100 
            ? `Budget dépassé de ${(usagePercentage - 100).toFixed(1)}%`
            : `${usagePercentage.toFixed(1)}% du budget utilisé`
        });
      }
    });

    return alertList.sort((a, b) => b.usagePercentage - a.usagePercentage);
  }, [budgets, transactions, expenseRequests]);

  const sendAlertMutation = useMutation({
    mutationFn: async ({ budget, alert }) => {
      // Send email alerts
      if (budget.alert_emails && budget.alert_emails.length > 0) {
        const emailPromises = budget.alert_emails.map(email => 
          meras.integrations.Core.SendEmail({
            to: email,
            subject: `⚠️ Alerte Budget: ${budget.department_name || budget.category || 'Budget Global'}`,
            body: `
              <h2>Alerte Budgétaire - ${budget.fiscal_year}</h2>
              <p><strong>Budget:</strong> ${budget.department_name || budget.category || 'Budget Global'}</p>
              <p><strong>Période:</strong> ${budget.period}</p>
              <p><strong>Montant Alloué:</strong> ${budget.amount_allocated.toLocaleString()} DJF</p>
              <p><strong>Montant Utilisé:</strong> ${alert.totalUsed.toLocaleString()} DJF</p>
              <p><strong>Utilisation:</strong> ${alert.usagePercentage.toFixed(1)}%</p>
              <p><strong>Message:</strong> ${alert.message}</p>
              
              <p style="margin-top: 20px;">
                ${alert.severity === 'critical' 
                  ? '🚨 <strong style="color: red;">CRITIQUE: Le budget a été dépassé!</strong>'
                  : '⚠️ <strong style="color: orange;">ATTENTION: Le seuil d\'alerte a été atteint.</strong>'
                }
              </p>
              
              <p style="margin-top: 20px; color: #666;">
                Veuillez prendre les mesures nécessaires pour contrôler les dépenses.
              </p>
            `
          })
        );

        await Promise.all(emailPromises);
      }

      // Update last alert sent date
      await meras.entities.Budget.update(budget.id, {
        last_alert_sent: new Date().toISOString().split('T')[0],
        status: alert.severity === 'critical' ? 'Dépassé' : 'Alerte'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Alertes envoyées avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi des alertes: ' + error.message);
    }
  });

  const handleSendAlert = (budget, alert) => {
    sendAlertMutation.mutate({ budget, alert });
  };

  // Auto-check for new alerts every minute
  useEffect(() => {
    const interval = setInterval(() => {
      alerts.forEach(alert => {
        const budget = alert.budget;
        const lastSent = budget.last_alert_sent ? new Date(budget.last_alert_sent) : null;
        const now = new Date();
        
        // Send alert if not sent today
        if (!lastSent || lastSent.toDateString() !== now.toDateString()) {
          if (alert.severity === 'critical' || alert.usagePercentage >= budget.alert_threshold_percentage) {
            // Auto-send critical alerts
            if (budget.alert_emails && budget.alert_emails.length > 0) {
              console.log(`Auto-sending alert for budget ${budget.id}`);
              sendAlertMutation.mutate({ budget, alert });
            }
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [alerts, sendAlertMutation]);

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune Alerte</h3>
          <p className="text-gray-600">Tous les budgets sont dans les limites acceptables.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Système d'Alertes Actif</h3>
              <p className="text-sm text-gray-600">
                {alerts.length} alerte{alerts.length > 1 ? 's' : ''} budgétaire{alerts.length > 1 ? 's' : ''} détectée{alerts.length > 1 ? 's' : ''}
              </p>
            </div>
            <Badge className="bg-amber-500 text-white">
              {alerts.filter(a => a.severity === 'critical').length} critique{alerts.filter(a => a.severity === 'critical').length > 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {alerts.map((alert, idx) => (
          <Card 
            key={alert.budget.id} 
            className={`border-2 ${
              alert.severity === 'critical' 
                ? 'border-red-300 bg-red-50' 
                : 'border-amber-300 bg-amber-50'
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                  }`}>
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {alert.budget.department_name || alert.budget.category || 'Budget Global'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.budget.fiscal_year} • {alert.budget.period}
                    </p>
                  </div>
                </div>
                <Badge className={alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}>
                  {alert.severity === 'critical' ? '🚨 CRITIQUE' : '⚠️ ALERTE'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Budget Alloué</p>
                  <p className="font-bold text-gray-900">{alert.budget.amount_allocated.toLocaleString()} DJF</p>
                </div>
                <div>
                  <p className="text-gray-600">Utilisé</p>
                  <p className="font-bold text-red-600">{alert.totalUsed.toLocaleString()} DJF</p>
                </div>
                <div>
                  <p className="text-gray-600">Utilisation</p>
                  <p className="font-bold text-red-600">{alert.usagePercentage.toFixed(1)}%</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-100 border border-red-300' : 'bg-amber-100 border border-amber-300'
              }`}>
                <p className={`font-bold ${alert.severity === 'critical' ? 'text-red-900' : 'text-amber-900'}`}>
                  {alert.message}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-gray-600">
                  {alert.budget.last_alert_sent ? (
                    <span>Dernière alerte: {format(new Date(alert.budget.last_alert_sent), 'dd/MM/yyyy')}</span>
                  ) : (
                    <span>Aucune alerte envoyée</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendAlert(alert.budget, alert)}
                  disabled={sendAlertMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sendAlertMutation.isPending ? 'Envoi...' : 'Envoyer Alerte'}
                </Button>
              </div>

              {alert.budget.alert_emails && alert.budget.alert_emails.length > 0 && (
                <div className="text-xs text-gray-600">
                  Destinataires: {alert.budget.alert_emails.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}