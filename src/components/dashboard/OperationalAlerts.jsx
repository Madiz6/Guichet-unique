import React, { useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { meras } from "@/components/core/MerasClient";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle, Bell, ArrowRight, Users, FileText, ShoppingCart, Shield, Calendar } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

const PRIORITY = { critical: 0, warning: 1, info: 2 };

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

export default function OperationalAlerts() {
  const { data: employees = [] } = useQuery({ queryKey: ['employees-alerts'], queryFn: () => meras.entities.Employee.list() });
  const { data: declarations = [] } = useQuery({ queryKey: ['declarations-alerts'], queryFn: () => meras.entities.Declaration.list() });
  const { data: complianceItems = [] } = useQuery({ queryKey: ['compliance-alerts'], queryFn: () => meras.entities.ComplianceItem.list() });
  const { data: holidays = [] } = useQuery({ queryKey: ['holidays-alerts'], queryFn: () => meras.entities.Holiday.list() });
  const { data: purchaseRequests = [] } = useQuery({ queryKey: ['purchase-alerts'], queryFn: () => meras.entities.PurchaseRequest.list() });
  const { data: leases = [] } = useQuery({ queryKey: ['leases-alerts'], queryFn: () => meras.entities.Lease.list() });

  const alerts = useMemo(() => {
    const list = [];

    // --- Suspended employees ---
    employees.filter(e => e.statut === 'Suspendu').forEach(e => {
      list.push({
        id: `suspended-${e.id}`,
        priority: 'warning',
        icon: Users,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50',
        title: `Employé suspendu : ${e.prenom} ${e.nom}`,
        subtitle: e.raison_suspension ? `Raison: ${e.raison_suspension}` : 'Aucune raison indiquée',
        link: createPageUrl('Employes'),
        tag: 'RH',
        tagColor: 'bg-amber-100 text-amber-700',
      });
    });

    // --- Unpaid declarations ---
    declarations.filter(d => d.statut === 'Non payé' || d.statut === 'En retard').forEach(d => {
      const isLate = d.statut === 'En retard';
      const days = daysDiff(d.date_limite);
      list.push({
        id: `decl-${d.id}`,
        priority: isLate || (days !== null && days < 0) ? 'critical' : 'warning',
        icon: FileText,
        iconColor: isLate ? 'text-red-500' : 'text-amber-500',
        iconBg: isLate ? 'bg-red-50' : 'bg-amber-50',
        title: `Déclaration non payée : ${d.numero_cotisation}`,
        subtitle: d.date_limite ? `Échéance: ${d.date_limite}${days !== null ? (days < 0 ? ` (${Math.abs(days)}j de retard)` : ` (dans ${days}j)`) : ''}` : 'Période: ' + d.periode,
        link: createPageUrl('Declarations'),
        tag: 'CNSS',
        tagColor: isLate ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
      });
    });

    // --- Expiring compliance items ---
    complianceItems.filter(c => c.statut === 'Actif' && c.date_expiration).forEach(c => {
      const days = daysDiff(c.date_expiration);
      if (days === null) return;
      if (days <= 60) {
        list.push({
          id: `compliance-${c.id}`,
          priority: days <= 15 ? 'critical' : 'warning',
          icon: Shield,
          iconColor: days <= 15 ? 'text-red-500' : 'text-orange-500',
          iconBg: days <= 15 ? 'bg-red-50' : 'bg-orange-50',
          title: `${c.nom} expire bientôt`,
          subtitle: days < 0 ? `Expiré depuis ${Math.abs(days)} jours` : `Expire dans ${days} jours (${c.date_expiration})`,
          link: createPageUrl('CompanySetup'),
          tag: c.type,
          tagColor: days <= 15 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700',
        });
      }
    });

    // --- Pending holidays awaiting approval ---
    const pendingHolidays = holidays.filter(h => h.statut === 'En attente');
    if (pendingHolidays.length > 0) {
      list.push({
        id: 'pending-holidays',
        priority: 'info',
        icon: Calendar,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-50',
        title: `${pendingHolidays.length} demande(s) de congé en attente`,
        subtitle: 'Approbation requise',
        link: createPageUrl('Conges'),
        tag: 'Congés',
        tagColor: 'bg-blue-100 text-blue-700',
      });
    }

    // --- Pending purchase requests ---
    const pendingPR = purchaseRequests.filter(r => r.statut === 'Soumise' || r.statut === 'En approbation');
    if (pendingPR.length > 0) {
      list.push({
        id: 'pending-pr',
        priority: 'info',
        icon: ShoppingCart,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-50',
        title: `${pendingPR.length} demande(s) d'achat en attente`,
        subtitle: 'Approbation / traitement requis',
        link: createPageUrl('PurchaseRequests'),
        tag: 'Achats',
        tagColor: 'bg-purple-100 text-purple-700',
      });
    }

    // --- Leases expiring within 60 days ---
    leases.filter(l => l.statut === 'Actif' && l.date_fin).forEach(l => {
      const days = daysDiff(l.date_fin);
      if (days !== null && days <= 60 && days >= 0) {
        list.push({
          id: `lease-${l.id}`,
          priority: days <= 30 ? 'warning' : 'info',
          icon: Clock,
          iconColor: days <= 30 ? 'text-amber-500' : 'text-blue-500',
          iconBg: days <= 30 ? 'bg-amber-50' : 'bg-blue-50',
          title: `Bail expiring: ${l.locataire_nom}`,
          subtitle: `Expire dans ${days} jours (${l.date_fin})`,
          link: createPageUrl('Leasing'),
          tag: 'Location',
          tagColor: days <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700',
        });
      }
    });

    // Sort by priority
    return list.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);
  }, [employees, declarations, complianceItems, holidays, purchaseRequests, leases]);

  if (alerts.length === 0) {
    return (
      <Card className="border border-[#E5E7EB] bg-white">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-[#1A1A1A]">Tout est en ordre ✅</p>
            <p className="text-sm text-[#6B6B6B]">Aucune alerte opérationnelle en cours.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const critical = alerts.filter(a => a.priority === 'critical');
  const rest = alerts.filter(a => a.priority !== 'critical');

  return (
    <Card className="border border-[#E5E7EB] bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">Alertes Opérationnelles</h3>
            <p className="text-sm text-[#6B6B6B]">{alerts.length} action(s) requise(s)</p>
          </div>
          {critical.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3" /> {critical.length} critique(s)
            </span>
          )}
        </div>

        <div className="space-y-3">
          {alerts.slice(0, 8).map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={alert.link}>
                <div className={`flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
                  alert.priority === 'critical' 
                    ? 'border-red-100 bg-red-50/50 hover:border-red-200' 
                    : alert.priority === 'warning'
                    ? 'border-amber-100 bg-amber-50/30 hover:border-amber-200'
                    : 'border-[#F0F0F0] bg-[#FAFAFA] hover:border-[#E0E0E0]'
                }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${alert.iconBg}`}>
                    <alert.icon className={`w-4 h-4 ${alert.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{alert.title}</p>
                    <p className="text-xs text-[#6B6B6B] truncate">{alert.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.tagColor}`}>{alert.tag}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {alerts.length > 8 && (
            <p className="text-center text-xs text-[#6B6B6B] pt-1">+ {alerts.length - 8} autres alertes</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}