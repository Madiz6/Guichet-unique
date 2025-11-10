import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle, CheckCircle, Clock, Send, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ContractRenewals() {
  const queryClient = useQueryClient();
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: renewals = [] } = useQuery({
    queryKey: ['contract-renewals'],
    queryFn: () => base44.entities.ContractRenewal.list('-created_date'),
  });
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0] || {};
  
  const createRenewalMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractRenewal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contract-renewals']);
      toast.success('Renouvellement créé');
    },
  });
  
  const updateRenewalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContractRenewal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contract-renewals']);
      toast.success('Renouvellement mis à jour');
    },
  });
  
  // Auto-create renewals for expiring contracts
  useEffect(() => {
    const checkExpiringContracts = async () => {
      const today = new Date();
      
      for (const emp of employees) {
        if (!emp.date_fin_contrat) continue;
        
        const existingRenewal = renewals.find(r => 
          r.employee_id === emp.id && 
          r.current_end_date === emp.date_fin_contrat &&
          r.renewal_status !== 'Renouvelé'
        );
        
        if (existingRenewal) continue;
        
        const daysUntilExpiry = differenceInDays(new Date(emp.date_fin_contrat), today);
        
        // Create renewal alert 60 days before expiry
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
          try {
            await createRenewalMutation.mutateAsync({
              employee_id: emp.id,
              current_contract_type: emp.type_contrat,
              current_end_date: emp.date_fin_contrat,
              renewal_status: 'À traiter',
              days_before_expiry: 60
            });
          } catch (error) {
            console.error('Error creating renewal:', error);
          }
        }
      }
    };
    
    if (employees.length > 0 && renewals.length >= 0) {
      checkExpiringContracts();
    }
  }, [employees, renewals]);
  
  const handleSendAlert = async (renewal) => {
    const employee = employees.find(e => e.id === renewal.employee_id);
    if (!employee) {
      toast.error('Employé non trouvé');
      return;
    }
    
    const daysRemaining = differenceInDays(new Date(renewal.current_end_date), new Date());
    
    try {
      // Send EMAIL
      if (employee.email) {
        await base44.functions.invoke('sendEmail', {
          to: employee.email,
          subject: `Renouvellement de Contrat - ${employee.prenom} ${employee.nom}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${company.logo_url ? `
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 120px;" />
                </div>
              ` : ''}
              
              <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 24px;">⏰ Renouvellement de Contrat</h1>
              </div>
              
              <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="margin-top: 0; color: #0F172A;">Bonjour ${employee.prenom},</h2>
                <p style="color: #64748B;">
                  Votre contrat de travail arrive à échéance le <strong>${format(new Date(renewal.current_end_date), 'dd MMMM yyyy')}</strong>.
                </p>
                <p style="color: #64748B;">
                  Il reste <strong style="color: #EF4444;">${daysRemaining} jours</strong> avant l'expiration.
                </p>
                <p style="color: #64748B;">
                  Nous souhaitons discuter du renouvellement de votre contrat. Veuillez contacter le service RH pour planifier un entretien.
                </p>
              </div>
              
              <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6; margin-bottom: 25px;">
                <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                  <strong>Informations actuelles:</strong><br>
                  Type de contrat: ${renewal.current_contract_type}<br>
                  Date de fin: ${format(new Date(renewal.current_end_date), 'dd/MM/yyyy')}
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
              
              <div style="text-align: center; color: #64748B; font-size: 12px;">
                <p style="margin: 5px 0;"><strong>${company.nom_entreprise || 'Paie360'}</strong></p>
                <p style="margin: 5px 0;">${company.email || ''}</p>
              </div>
            </div>
          `,
          from_name: company.nom_entreprise || 'Paie360',
          from_email: company.email || 'noreply@paie360.com'
        });
      }
      
      // Send SMS
      if (employee.telephone) {
        const smsMessage = `🔔 ${company.nom_entreprise || 'Paie360'}: Bonjour ${employee.prenom}, votre contrat arrive à échéance le ${format(new Date(renewal.current_end_date), 'dd/MM/yyyy')} (${daysRemaining}j restants). Contactez RH pour renouvellement.`;
        
        await base44.functions.invoke('sendSMS', {
          to: employee.telephone,
          message: smsMessage
        });
      }
      
      await updateRenewalMutation.mutateAsync({
        id: renewal.id,
        data: {
          ...renewal,
          alert_sent: true,
          alert_date: format(new Date(), 'yyyy-MM-dd')
        }
      });
      
      toast.success('Alerte envoyée par email et SMS');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'alerte');
      console.error(error);
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'À traiter': 'bg-yellow-100 text-yellow-800',
      'En cours': 'bg-blue-100 text-blue-800',
      'Approuvé': 'bg-green-100 text-green-800',
      'Rejeté': 'bg-red-100 text-red-800',
      'Renouvelé': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const urgentRenewals = renewals.filter(r => {
    if (r.renewal_status === 'Renouvelé' || r.renewal_status === 'Rejeté') return false;
    const daysUntilExpiry = differenceInDays(new Date(r.current_end_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A]">Renouvellements de Contrats</h1>
              <p className="text-[#64748B] mt-1">Suivi automatique avec alertes SMS & Email</p>
            </div>
          </div>
        </motion.div>
        
        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">À Traiter</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {renewals.filter(r => r.renewal_status === 'À traiter').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Urgent (30j)</p>
                  <p className="text-2xl font-bold text-[#EF4444] mt-1">{urgentRenewals.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Alertes Envoyées</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {renewals.filter(r => r.alert_sent).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Renouvelés</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {renewals.filter(r => r.renewal_status === 'Renouvelé').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Urgent Renewals Alert */}
        {urgentRenewals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-l-4 border-red-400 bg-red-50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">
                      {urgentRenewals.length} contrat(s) expire(nt) dans les 30 prochains jours
                    </p>
                    <p className="text-sm text-red-700">
                      Action urgente requise - Alertes SMS automatiques
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {/* Renewals Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="text-lg font-bold text-[#0F172A]">Tous les Renouvellements</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="font-semibold">Employé</TableHead>
                    <TableHead className="font-semibold">Contrat Actuel</TableHead>
                    <TableHead className="font-semibold">Date Fin</TableHead>
                    <TableHead className="font-semibold">Jours Restants</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Alerte</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#64748B]">
                        Aucun renouvellement en cours
                      </TableCell>
                    </TableRow>
                  ) : (
                    renewals.map((renewal) => {
                      const employee = employees.find(e => e.id === renewal.employee_id);
                      const daysRemaining = differenceInDays(new Date(renewal.current_end_date), new Date());
                      const isUrgent = daysRemaining >= 0 && daysRemaining <= 30;
                      
                      return (
                        <TableRow key={renewal.id} className={`border-b border-[#F3F4F6] hover:bg-[#FAFBFC] ${isUrgent ? 'bg-red-50' : ''}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                                {employee?.prenom?.[0]}{employee?.nom?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0F172A]">
                                  {employee?.prenom} {employee?.nom}
                                </p>
                                <p className="text-sm text-[#64748B]">{employee?.telephone || 'Pas de tél.'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#374151]">{renewal.current_contract_type}</TableCell>
                          <TableCell className="text-[#374151]">
                            {format(new Date(renewal.current_end_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${isUrgent ? 'text-red-600' : 'text-[#374151]'}`}>
                              {daysRemaining > 0 ? `${daysRemaining} jours` : 'Expiré'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(renewal.renewal_status)}`}>
                              {renewal.renewal_status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {renewal.alert_sent ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Envoyée
                                </div>
                                <span className="text-xs text-[#64748B]">
                                  {renewal.alert_date && format(new Date(renewal.alert_date), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendAlert(renewal)}
                                className="border-[#6366F1] text-[#6366F1]"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Envoyer
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={renewal.renewal_status}
                              onValueChange={(value) => {
                                updateRenewalMutation.mutate({
                                  id: renewal.id,
                                  data: { ...renewal, renewal_status: value }
                                });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="À traiter">À traiter</SelectItem>
                                <SelectItem value="En cours">En cours</SelectItem>
                                <SelectItem value="Approuvé">Approuvé</SelectItem>
                                <SelectItem value="Rejeté">Rejeté</SelectItem>
                                <SelectItem value="Renouvelé">Renouvelé</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}