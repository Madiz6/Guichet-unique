import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell, X, Check, AlertCircle, Calendar, FileText, Users } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });
  
  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => base44.entities.Declaration.list(),
  });
  
  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => base44.entities.ComplianceItem.list(),
  });
  
  // Compute notifications as derived data (no useEffect/setState needed — avoids infinite re-render loop)
  const notifications = React.useMemo(() => {
    const alerts = [];
    const today = new Date();
    
    employees.forEach(emp => {
      if (emp.est_etranger && emp.date_expiration_visa) {
        const daysUntilExpiry = differenceInDays(new Date(emp.date_expiration_visa), today);
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
          alerts.push({
            id: `visa-${emp.id}`,
            type: 'warning',
            icon: AlertCircle,
            title: 'Visa expirant bientôt',
            message: `Le visa de ${emp.prenom} ${emp.nom} expire dans ${daysUntilExpiry} jours`,
            date: emp.date_expiration_visa,
            link: createPageUrl('Visas')
          });
        }
      }
      if (emp.est_etranger && emp.date_expiration_permis) {
        const daysUntilExpiry = differenceInDays(new Date(emp.date_expiration_permis), today);
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
          alerts.push({
            id: `permit-${emp.id}`,
            type: 'warning',
            icon: AlertCircle,
            title: 'Permis de travail expirant',
            message: `Le permis de ${emp.prenom} ${emp.nom} expire dans ${daysUntilExpiry} jours`,
            date: emp.date_expiration_permis,
            link: createPageUrl('Visas')
          });
        }
      }
    });
    
    const pendingHolidays = holidays.filter(h => h.statut === 'En attente');
    if (pendingHolidays.length > 0) {
      alerts.push({
        id: 'holidays-pending',
        type: 'info',
        icon: Calendar,
        title: 'Demandes de congés en attente',
        message: `${pendingHolidays.length} demande(s) à approuver`,
        link: createPageUrl('Conges')
      });
    }
    
    declarations.forEach(decl => {
      if (decl.statut === 'Non payé' && decl.date_limite) {
        const daysOverdue = differenceInDays(today, new Date(decl.date_limite));
        if (daysOverdue > 0) {
          alerts.push({
            id: `decl-${decl.id}`,
            type: 'error',
            icon: FileText,
            title: 'Déclaration en retard',
            message: `${decl.numero_cotisation} en retard de ${daysOverdue} jours`,
            date: decl.date_limite,
            link: createPageUrl('Declarations')
          });
        }
      }
    });
    
    compliance.forEach(item => {
      if (item.date_expiration) {
        const daysUntilExpiry = differenceInDays(new Date(item.date_expiration), today);
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= (item.rappel_jours || 30)) {
          alerts.push({
            id: `compliance-${item.id}`,
            type: 'warning',
            icon: AlertCircle,
            title: 'Document expirant',
            message: `${item.nom} expire dans ${daysUntilExpiry} jours`,
            date: item.date_expiration,
            link: createPageUrl('Compliance')
          });
        }
      }
    });
    
    return alerts.sort((a, b) => {
      const typeOrder = { error: 0, warning: 1, info: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }, [employees, holidays, declarations, compliance]);
  
  const unreadCount = notifications.length;
  
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl border border-[#E8ECF2] z-50 max-h-[600px] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-[#E8ECF2] flex items-center justify-between bg-gradient-to-r from-[#F7F9FC] to-white">
                <div>
                  <h3 className="font-bold text-[#0A2540]">Notifications</h3>
                  <p className="text-xs text-[#697586]">{unreadCount} alerte(s)</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Check className="w-12 h-12 text-[#00C48C] mx-auto mb-3" />
                    <p className="text-[#697586]">Aucune notification</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E8ECF2]">
                    {notifications.map(notif => {
                      const Icon = notif.icon;
                      const colors = {
                        error: 'text-[#EF4444] bg-[#FFE5E5]',
                        warning: 'text-[#FA6400] bg-[#FFF4E5]',
                        info: 'text-[#0066FF] bg-[#F0F7FF]'
                      };
                      
                      return (
                        <Link
                          key={notif.id}
                          to={notif.link}
                          onClick={() => setIsOpen(false)}
                          className="block p-4 hover:bg-[#F7F9FC] transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[notif.type]}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#0A2540] text-sm">{notif.title}</p>
                              <p className="text-xs text-[#697586] mt-1">{notif.message}</p>
                              {notif.date && (
                                <p className="text-xs text-[#697586] mt-1">
                                  {format(new Date(notif.date), 'dd/MM/yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}