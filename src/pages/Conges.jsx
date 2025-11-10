
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Check, X, Download, Calendar, User, Clock, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, isWithinInterval, addYears, subYears, getMonth, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateHolidayAttestation } from "../components/payroll/PDFGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import PermissionGuard, { usePermission } from "../components/permissions/PermissionGuard";
import SignatureDialog from "../components/documents/SignatureDialog";
import { logAuditAction, AUDIT_ACTIONS } from "../components/security/AuditLogger";

export default function Conges() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date());
  const [editingHoliday, setEditingHoliday] = useState(null); // State to hold the holiday being edited
  const [signatureDialog, setSignatureDialog] = useState({ isOpen: false, documentType: null, holiday: null, employee: null });
  const [approvalModal, setApprovalModal] = useState({ isOpen: false, holiday: null, action: null }); // action: 'Approuvé' or 'Refusé'
  const [approvalComment, setApprovalComment] = useState('');

  const queryClient = useQueryClient();
  
  const canCreate = usePermission('holidays_create');
  const canApprove = usePermission('holidays_approve');
  const canDelete = usePermission('holidays_delete');
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0] || {};
  
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-created_date'),
  });
  
  const createHolidayMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: async (newHoliday) => {
      queryClient.invalidateQueries(['holidays']);
      
      const employee = employees.find(e => e.id === newHoliday.employee_id);
      
      // ✅ AUDIT LOG
      await logAuditAction(
        AUDIT_ACTIONS.HOLIDAY_CREATED,
        'Holiday',
        newHoliday.id,
        {
          employee_name: employee ? `${employee.prenom} ${employee.nom}` : 'Unknown',
          type_conge: newHoliday.type_conge,
          date_debut: newHoliday.date_debut,
          date_fin: newHoliday.date_fin,
          nombre_jours: newHoliday.nombre_jours
        },
        employee ? `${employee.prenom} ${employee.nom} - ${newHoliday.type_conge}` : newHoliday.type_conge
      );
      
      setShowForm(false);
      setFormData({
        type_conge: 'Congé payé',
        date_debut: '',
        date_fin: '',
        nombre_jours: 0,
        motif: '',
        statut: 'En attente'
      });
      toast.success('Demande de congé créée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création de la demande: ${error.message}`);
    }
  });
  
  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: async (updatedHoliday) => {
      queryClient.invalidateQueries(['holidays']);
      
      // Update employee status if holiday is approved and active
      if (updatedHoliday.statut === 'Approuvé') {
        const today = new Date();
        const startDate = new Date(updatedHoliday.date_debut);
        const endDate = new Date(updatedHoliday.date_fin);
        
        // Check if the approved holiday is current
        if (isWithinInterval(today, { start: startDate, end: endDate })) {
          const employee = employees.find(e => e.id === updatedHoliday.employee_id);
          if (employee && employee.statut !== 'En congé') { // Check to prevent unnecessary updates
            await base44.entities.Employee.update(employee.id, {
              statut: 'En congé'
            });
            queryClient.invalidateQueries(['employees']); // Invalidate employees query for status change
            toast.info(`${employee.prenom} ${employee.nom} est maintenant "En congé".`);
          }
        }
        
        // For maternity leave, set initial month number and payment status if not already set
        if (updatedHoliday.type_conge === 'Congé maternité' && !updatedHoliday.maternity_month_number) {
          await base44.entities.Holiday.update(updatedHoliday.id, {
            maternity_month_number: 1,
            maternity_payment_status: 'Entreprise (50%)'
          });
          queryClient.invalidateQueries(['holidays']); // Invalidate again to reflect maternity fields
        }
      }
      
      // ✅ AUDIT LOG
      const employee = employees.find(e => e.id === updatedHoliday.employee_id);
      let auditAction;
      if (updatedHoliday.statut === 'Approuvé') {
        auditAction = AUDIT_ACTIONS.HOLIDAY_APPROVED;
      } else if (updatedHoliday.statut === 'Refusé') {
        auditAction = AUDIT_ACTIONS.HOLIDAY_REJECTED;
      } else if (updatedHoliday.statut === 'Annulé') {
        auditAction = AUDIT_ACTIONS.HOLIDAY_CANCELLED;
      } else {
        auditAction = AUDIT_ACTIONS.HOLIDAY_UPDATED; // Default for general updates
      }
      
      await logAuditAction(
        auditAction,
        'Holiday',
        updatedHoliday.id,
        {
          employee_id: updatedHoliday.employee_id,
          type_conge: updatedHoliday.type_conge,
          dates: `${updatedHoliday.date_debut} - ${updatedHoliday.date_fin}`,
          statut: updatedHoliday.statut
        },
        `${employee?.prenom} ${employee?.nom} - ${updatedHoliday.type_conge}`
      );
      
      toast.success('Congé mis à jour avec succès !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, commentaire }) => {
      const holiday = holidays.find(h => h.id === id);
      if (!holiday) throw new Error("Holiday not found.");

      const currentUser = await base44.auth.me();
      
      const dataToUpdate = {
        statut: status,
        commentaire_admin: commentaire,
      };
      if (currentUser?.email) {
          dataToUpdate.approuve_par = currentUser.email;
      }

      // Update the holiday status in the database
      const updatedHoliday = await base44.entities.Holiday.update(id, dataToUpdate);
      return updatedHoliday; // Return the updated record for onSuccess
    },
    onSuccess: async (updatedHoliday, variables) => { // updatedHoliday is the result from mutationFn
      queryClient.invalidateQueries(['holidays']);
      
      const employee = employees.find(e => e.id === updatedHoliday.employee_id);
      
      // ✅ AUDIT LOG
      const auditAction = updatedHoliday.statut === 'Approuvé' 
        ? AUDIT_ACTIONS.HOLIDAY_APPROVED 
        : AUDIT_ACTIONS.HOLITAY_REJECTED;
      
      await logAuditAction(
        auditAction,
        'Holiday',
        updatedHoliday.id,
        {
          employee_name: employee ? `${employee.prenom} ${employee.nom}` : 'Unknown',
          type_conge: updatedHoliday.type_conge,
          statut: updatedHoliday.statut,
          commentaire: updatedHoliday.commentaire_admin
        },
        employee ? `${employee.prenom} ${employee.nom} - ${updatedHoliday.type_conge}` : updatedHoliday.type_conge
      );

      toast.success('Statut mis à jour avec succès.');
      setApprovalModal({ isOpen: false, holiday: null, action: null });
      setApprovalComment(''); // Clear comment after success

      // Send SMS notification if employee has a phone number
      if (employee?.telephone) {
        const statusText = updatedHoliday.statut === 'Approuvé' ? 'approuvée ✅' : 'refusée ❌';
        const smsMessage = `${company.nom_entreprise || 'Paie360'}: Bonjour ${employee.prenom}, votre demande de congé du ${format(new Date(updatedHoliday.date_debut), 'dd/MM')} au ${format(new Date(updatedHoliday.date_fin), 'dd/MM')} a été ${statusText}.${updatedHoliday.commentaire_admin ? ` Commentaire: ${updatedHoliday.commentaire_admin}` : ''}`;
        
        try {
          await base44.functions.invoke('sendSMS', {
            to: employee.telephone,
            message: smsMessage
          });
          
          toast.success('SMS envoyé à l\'employé');
        } catch (error) {
          console.error('Error sending SMS:', error);
          toast.error('Erreur lors de l\'envoi du SMS de notification.');
        }
      }
      
      // Send email notification (using the new template provided in the outline)
      if (employee?.email && company?.email) {
        const statusColor = updatedHoliday.statut === 'Approuvé' ? '#10B981' : '#EF4444';
        const statusIcon = updatedHoliday.statut === 'Approuvé' ? '✅' : '❌';
        
        try {
          await base44.functions.invoke('sendEmail', {
            to: employee.email,
            subject: `Demande de Congé ${updatedHoliday.statut}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                ${company.logo_url ? `
                  <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 120px;" />
                  </div>
                ` : ''}
                
                <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                  <h1 style="margin: 0; font-size: 24px;">${statusIcon} Demande de Congé ${updatedHoliday.statut}</h1>
                </div>
                
                <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                  <h2 style="margin-top: 0; color: #0F172A;">Bonjour ${employee.prenom},</h2>
                  <p style="color: #64748B;">
                    Votre demande de congé a été <strong>${updatedHoliday.statut === 'Approuvé' ? 'approuvée' : 'refusée'}</strong>.
                  </p>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #E5E7EB; margin-bottom: 25px;">
                  <h3 style="margin-top: 0; color: #0F172A;">Détails</h3>
                  <table style="width: 100%;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748B;">Type:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">${updatedHoliday.type_conge}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748B;">Du:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">${format(new Date(updatedHoliday.date_debut), 'dd MMMM yyyy', { locale: fr })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748B;">Au:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">${format(new Date(updatedHoliday.date_fin), 'dd MMMM yyyy', { locale: fr })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748B;">Durée:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">${updatedHoliday.nombre_jours} jour(s)</td>
                    </tr>
                  </table>
                </div>
                
                ${updatedHoliday.commentaire_admin ? `
                <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6; margin-bottom: 25px;">
                  <p style="margin: 0; color: #1E40AF;">
                    <strong>Commentaire:</strong> ${updatedHoliday.commentaire_admin}
                  </p>
                </div>
                ` : ''}
                
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
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          toast.error('Erreur lors de l\'envoi de l\'email de notification.');
        }
      }
    },
    onError: (error) => {
      console.error('Error in approveMutation:', error); // Added for better error visibility
      toast.error(`Erreur lors de la mise à jour du statut: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      toast.success('Demande de congé supprimée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression de la demande: ${error.message}`);
    }
  });
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, document_justificatif_url: file_url });
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      toast.error('Erreur lors du téléchargement du document');
    }
    setUploading(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date_debut || !formData.date_fin) {
      toast.error("Veuillez sélectionner les dates de début et de fin.");
      return;
    }
    const days = differenceInDays(new Date(formData.date_fin), new Date(formData.date_debut)) + 1;
    if (isNaN(days) || days <= 0) {
      toast.error("Les dates de début et de fin ne sont pas valides.");
      return;
    }

    const dataToSend = {
      ...formData,
      nombre_jours: days,
      date_demande: formData.date_demande || new Date().toISOString().split('T')[0] // Preserve original date_demande if editing
    };

    if (editingHoliday) {
      if (!canCreate) { // Assuming create permission also covers editing
        toast.error("Vous n'avez pas la permission de modifier une demande de congé.");
        return;
      }
      updateHolidayMutation.mutate( // Changed to updateHolidayMutation
        { id: editingHoliday.id, data: dataToSend },
        {
          onSuccess: () => {
            setShowForm(false);
            setFormData({});
            setEditingHoliday(null);
            // toast success message is handled by updateHolidayMutation.onSuccess
          },
        }
      );
    } else {
      if (!canCreate) {
        toast.error("Vous n'avez pas la permission de créer une demande de congé.");
        return;
      }
      createHolidayMutation.mutate(dataToSend);
    }
  };
  
  const handleApprove = (holiday) => {
    if (!canApprove) {
      toast.error("Vous n'avez pas la permission d'approuver les demandes de congé.");
      return;
    }
    setApprovalModal({ isOpen: true, holiday: holiday, action: 'Approuvé' });
  };
  
  const handleReject = (holiday) => {
    if (!canApprove) {
      toast.error("Vous n'avez pas la permission de refuser les demandes de congé.");
      return;
    }
    setApprovalModal({ isOpen: true, holiday: holiday, action: 'Refusé' });
  };

  const handleApprovalSubmit = () => {
      if (!approvalModal.isOpen || !approvalModal.holiday) return;
      approveMutation.mutate({
          id: approvalModal.holiday.id,
          status: approvalModal.action,
          commentaire: approvalComment
      });
  };

  const handleEdit = (holiday) => {
    if (!canCreate) { // Assuming create permission also covers editing
      toast.error("Vous n'avez pas la permission de modifier une demande de congé.");
      return;
    }
    setEditingHoliday(holiday);
    // Format dates for input type="date"
    setFormData({
      ...holiday,
      date_debut: format(new Date(holiday.date_debut), 'yyyy-MM-dd'),
      date_fin: format(new Date(holiday.date_fin), 'yyyy-MM-dd')
    });
    setShowForm(true);
  };

  const handleDelete = (holidayId) => {
    if (!canDelete) {
      toast.error("Vous n'avez pas la permission de supprimer une demande de congé.");
      return;
    }
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette demande de congé ?")) {
      deleteMutation.mutate(holidayId);
    }
  };
  
  const handleDownloadAttestation = (holiday) => {
    const employee = employees.find(e => e.id === holiday.employee_id);
    if (employee) {
      setSignatureDialog({
        isOpen: true,
        documentType: 'holiday_attestation',
        holiday: holiday,
        employee: employee
      });
    } else {
      toast.error("Employé introuvable pour générer l'attestation.");
    }
  };

  const handleConfirmSignature = (signatory) => {
    const { holiday, employee, documentType } = signatureDialog;
    if (documentType === 'holiday_attestation') {
      generateHolidayAttestation(holiday, employee, company, signatory);
    }
    setSignatureDialog({ isOpen: false, documentType: null, holiday: null, employee: null });
  };
  
  // Timeline calculation - 12 MONTHS VIEW
  const yearStart = startOfYear(currentYear);
  const yearEnd = endOfYear(currentYear);
  const monthsInYear = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  
  const getEmployeeHolidays = (employeeId) => {
    return holidays.filter(h => h.employee_id === employeeId);
  };
  
  const getHolidayPosition = (holiday) => {
    const start = new Date(holiday.date_debut);
    const end = new Date(holiday.date_fin);
    
    // Check if holiday falls within the current displayed year
    const currentYearNum = getYear(currentYear);
    const holidayStartYearNum = getYear(start);
    const holidayEndYearNum = getYear(end);

    let effectiveStart = start;
    let effectiveEnd = end;

    if (holidayEndYearNum < currentYearNum || holidayStartYearNum > currentYearNum) {
      return null; // Holiday is entirely outside the current year view
    }

    // Adjust start/end if holiday spans across years
    if (start < yearStart) effectiveStart = yearStart;
    if (end > yearEnd) effectiveEnd = yearEnd;

    const startMonth = getMonth(effectiveStart);
    const endMonth = getMonth(effectiveEnd);
    
    // Calculate position relative to the 12 months of the year
    const left = (startMonth / 12) * 100;
    const width = ((getMonth(effectiveEnd) - getMonth(effectiveStart) + 1) / 12) * 100;

    return { left, width };
  };
  
  const holidayColors = {
    'Congé payé': '#10B981', // green
    'Congé maladie': '#F59E0B', // amber
    'Congé maternité': '#EC4899', // pink
    'Congé paternité': '#3B82F6', // blue
    'Congé sans solde': '#6B7280', // gray
    'Congé exceptionnel': '#8B5CF6', // purple - Added new type
  };

  const holidayIcons = {
    'Congé payé': '🏖️',
    'Congé maladie': '🏥',
    'Congé maternité': '👶',
    'Congé paternité': '👨‍👶',
    'Congé sans solde': '💼',
    'Congé exceptionnel': '⚡',
  };
  
  const statusColors = {
    'En attente': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    'Approuvé': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    'Refusé': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    'Annulé': { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
  };

  // Helper to display maternity status
  const getMaternityDisplay = (holiday) => {
    if (holiday.type_conge !== 'Congé maternité') return null;
    
    const monthNum = holiday.maternity_month_number || 1;
    const status = monthNum <= 3 ? 'Entreprise paie 50%' : 'CNSS paie 100%';
    
    return (
      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
        <p className="font-semibold text-purple-800">
          🤰 Mois {monthNum}/6 - {status}
        </p>
      </div>
    );
  };
  
  return (
    <PermissionGuard permission="holidays_view">
      <div className="min-h-screen bg-gradient-to-br from-[#FAFBFC] to-[#F3F4F6] p-6 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" size="icon" className="border-[#E5E7EB]">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#111827]">Gestion des congés</h1>
                <p className="text-[#6B7280] mt-1">Vue annuelle des absences</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-[#E5E7EB]">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentYear(subYears(currentYear, 1))}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-[#111827] min-w-[100px] text-center">
                  {format(currentYear, 'yyyy')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentYear(addYears(currentYear, 1))}
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </div>
              {canCreate && (
                <Button
                  onClick={() => {
                    setEditingHoliday(null); // Clear editing state for new request
                    setFormData({});
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle demande
                </Button>
              )}
            </div>
          </motion.div>
          
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-4 gap-6 mb-8"
          >
            {['En attente', 'Approuvé', 'Refusé', 'Total'].map((status, idx) => {
              const count = status === 'Total' ? holidays.length : holidays.filter(h => h.statut === status).length;
              return (
                <Card key={status} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <p className="text-sm text-[#6B7280] mb-2">{status}</p>
                    <p className="text-3xl font-bold text-[#111827]">{count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
          
          {/* Timeline View - 12 MONTHS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden mb-8">
              <div className="bg-white">
                {/* Calendar Header */}
                <div className="flex border-b border-[#E5E7EB] bg-[#FAFBFC]">
                  <div className="w-64 px-6 py-4 border-r border-[#E5E7EB] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#6B7280]" />
                    <span className="font-semibold text-[#374151]">Employé</span>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex h-full">
                      {monthsInYear.map((month, idx) => (
                        <div
                          key={idx}
                          className="flex-1 min-w-[80px] px-2 py-2 text-center border-r border-[#E5E7EB]"
                        >
                          <div className="text-xs font-medium text-[#6B7280]">
                            {format(month, 'MMM', { locale: fr })}
                          </div>
                          <div className="text-sm font-semibold text-[#111827]">
                            {format(month, 'yyyy')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Employee Rows */}
                <div className="max-h-[600px] overflow-y-auto">
                  {employees.map((emp, empIdx) => {
                    const empHolidays = getEmployeeHolidays(emp.id);
                    const holidaysInCurrentYear = empHolidays.filter(h => getHolidayPosition(h) !== null);
                    
                    if (holidaysInCurrentYear.length === 0 && empHolidays.length === 0) return null; // Only show employees with holidays in ANY year

                    return (
                      <div
                        key={emp.id}
                        className={`flex border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                          empIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'
                        }`}
                      >
                        <div className="w-64 px-6 py-4 border-r border-[#E5E7EB]">
                          <div className="flex items-center gap-3">
                            {emp.photo_url ? (
                              <img src={emp.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                                {emp.prenom?.[0]}{emp.nom?.[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#111827] truncate">{emp.prenom} {emp.nom}</p>
                              <p className="text-xs text-[#6B7280] truncate">{emp.departement}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 relative py-4 overflow-x-auto">
                          <div className="h-12 relative" style={{ minWidth: `${monthsInYear.length * 80}px` }}>
                            {holidaysInCurrentYear.map((holiday) => {
                              const pos = getHolidayPosition(holiday);
                              if (!pos) return null;
                              
                              return (
                                <motion.div
                                  key={holiday.id}
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  className="absolute top-1 h-10 rounded-lg shadow-sm cursor-pointer group"
                                  style={{
                                    left: `${pos.left}%`,
                                    width: `${pos.width}%`,
                                    backgroundColor: holidayColors[holiday.type_conge] || '#6B7280',
                                    transformOrigin: 'left'
                                  }}
                                >
                                  <div className="h-full flex items-center justify-between px-3 text-white">
                                    <span className="text-xs font-semibold truncate">
                                      {holiday.type_conge} ({holiday.nombre_jours}j)
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {holiday.statut === 'En attente' && (
                                        <>
                                          {canApprove && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 hover:bg-white/20"
                                              onClick={(e) => { e.stopPropagation(); handleApprove(holiday); }}
                                              title="Approuver"
                                            >
                                              <Check className="w-3 h-3" />
                                            </Button>
                                          )}
                                          {canApprove && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 hover:bg-white/20"
                                              onClick={(e) => { e.stopPropagation(); handleReject(holiday); }}
                                              title="Refuser"
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          )}
                                          {canCreate && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 hover:bg-white/20"
                                              onClick={(e) => { e.stopPropagation(); handleEdit(holiday); }}
                                              title="Modifier"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                          )}
                                          {canDelete && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 hover:bg-white/20"
                                              onClick={(e) => { e.stopPropagation(); handleDelete(holiday.id); }}
                                              title="Supprimer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                      {holiday.statut === 'Approuvé' && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 hover:bg-white/20"
                                          onClick={(e) => { e.stopPropagation(); handleDownloadAttestation(holiday); }}
                                          title="Télécharger l'attestation"
                                        >
                                          <Download className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-[#111827] text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                      <p className="font-semibold">{holiday.type_conge}</p>
                                      <p className="text-[#9CA3AF]">
                                        {format(new Date(holiday.date_debut), 'dd MMM yyyy', { locale: fr })} - {format(new Date(holiday.date_fin), 'dd MMM yyyy', { locale: fr })}
                                      </p>
                                      <p className="text-[#9CA3AF]">Statut: {holiday.statut}</p>
                                      {holiday.type_conge === 'Congé maternité' && (
                                        <p className="text-purple-300">
                                          🤰 Mois {holiday.maternity_month_number || 1}/6 - {((holiday.maternity_month_number || 1) <= 3) ? 'Entreprise paie 50%' : 'CNSS paie 100%'}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Holiday Requests List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b border-[#E5E7EB]">
                <h3 className="text-xl font-bold text-[#111827]">Demandes de congés</h3>
                <p className="text-sm text-[#6B7280] mt-1">Liste complète des demandes avec actions d'approbation</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FAFBFC]">
                      <TableHead className="font-semibold text-[#374151]">Employé</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Type de congé</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Date début</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Date fin</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Nombre de jours</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Statut</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                          Aucune demande de congé
                        </TableCell>
                      </TableRow>
                    ) : (
                      holidays.map((holiday) => {
                        const employee = employees.find(e => e.id === holiday.employee_id);
                        const statusConfig = statusColors[holiday.statut] || statusColors['En attente'];
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                          <TableRow key={holiday.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {employee?.photo_url ? (
                                  <img src={employee.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-semibold">
                                    {employee?.prenom?.[0]}{employee?.nom?.[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-[#111827]">{employee?.prenom} {employee?.nom}</p>
                                  <p className="text-xs text-[#6B7280]">{employee?.departement}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: holidayColors[holiday.type_conge] + '20', color: holidayColors[holiday.type_conge] }}>
                                <span className="text-base">{holidayIcons[holiday.type_conge]}</span>
                                {holiday.type_conge}
                              </span>
                              {getMaternityDisplay(holiday)} {/* Added maternity display */}
                            </TableCell>
                            <TableCell className="text-[#374151]">
                              {format(new Date(holiday.date_debut), 'dd MMM yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell className="text-[#374151]">
                              {format(new Date(holiday.date_fin), 'dd MMM yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-[#111827]">{holiday.nombre_jours} jours</span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {holiday.statut}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {holiday.statut === 'En attente' && (
                                  <>
                                    {canApprove && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleApprove(holiday)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Approuver
                                      </Button>
                                    )}
                                    {canApprove && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReject(holiday)}
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Refuser
                                      </Button>
                                    )}
                                    {canCreate && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(holiday)}
                                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                      >
                                        <Edit className="w-4 h-4" />
                                        <span className="sr-only">Modifier</span>
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(holiday.id)}
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="sr-only">Supprimer</span>
                                      </Button>
                                    )}
                                  </>
                                )}
                                {holiday.statut === 'Approuvé' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadAttestation(holiday)}
                                    className="border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Attestation
                                  </Button>
                                )}
                              </div>
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
          
          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-center justify-center gap-6 flex-wrap"
          >
            {Object.entries(holidayColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xl">{holidayIcons[type]}</span>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm text-[#6B7280]">{type}</span>
              </div>
            ))}
          </motion.div>
        </div>
        
        {/* Form Dialog */}
        {canCreate && (
          <Dialog open={showForm} onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              setEditingHoliday(null); // Clear editing state when dialog closes
              setFormData({}); // Clear form data
            }
          }}>
            <DialogContent className="max-w-2xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#111827]">
                  {editingHoliday ? 'Modifier la demande de congé' : 'Nouvelle demande de congé'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-[#374151]">Employé *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({...formData, employee_id: value})}
                    required
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.prenom} {emp.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-[#374151]">Type de congé *</Label>
                  <Select
                    value={formData.type_conge}
                    onValueChange={(value) => setFormData({...formData, type_conge: value})}
                    required
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(holidayColors).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#374151]">Date de début *</Label>
                    <Input
                      type="date"
                      value={formData.date_debut || ''}
                      onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
                      required
                      className="border-[#D1D5DB] mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-[#374151]">Date de fin *</Label>
                    <Input
                      type="date"
                      value={formData.date_fin || ''}
                      onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                      required
                      className="border-[#D1D5DB] mt-2"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-[#374151]">Motif</Label>
                  <Textarea
                    value={formData.motif || ''}
                    onChange={(e) => setFormData({...formData, motif: e.target.value})}
                    placeholder="Raison de la demande..."
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151]">Document justificatif</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="border-[#D1D5DB] mt-2"
                  />
                  {formData.document_justificatif_url && (
                    <a href={formData.document_justificatif_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6366F1] mt-1 inline-block">
                      Document téléchargé
                    </a>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-[#D1D5DB]">
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                    {editingHoliday ? 'Mettre à jour la demande' : 'Créer la demande'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Approval/Rejection Comment Dialog */}
        <Dialog open={approvalModal.isOpen} onOpenChange={(open) => {
            setApprovalModal({ isOpen: open, holiday: null, action: null });
            setApprovalComment('');
        }}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl text-[#111827]">
                        {approvalModal.action === 'Approuvé' ? 'Approuver la demande de congé' : 'Refuser la demande de congé'}
                    </DialogTitle>
                    <DialogDescription className="text-[#6B7280]">
                        Voulez-vous ajouter un commentaire à cette décision ?
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea
                        placeholder="Ajouter un commentaire (optionnel)"
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        rows={4}
                        className="border-[#D1D5DB]"
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setApprovalModal({ isOpen: false, holiday: null, action: null });
                                setApprovalComment('');
                            }}
                            className="border-[#D1D5DB]"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleApprovalSubmit}
                            className={`
                                ${approvalModal.action === 'Approuvé' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                text-white
                            `}
                            disabled={approveMutation.isPending}
                        >
                            {approveMutation.isPending ? 'Traitement...' : (approvalModal.action === 'Approuvé' ? 'Confirmer l\'approbation' : 'Confirmer le refus')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <SignatureDialog
          isOpen={signatureDialog.isOpen}
          onClose={() => setSignatureDialog({ isOpen: false, documentType: null, holiday: null, employee: null })}
          onConfirm={handleConfirmSignature}
          documentType={signatureDialog.documentType}
          defaultName={company[`signatory_${signatureDialog.documentType}_name`] || ''}
          defaultPosition={company[`signatory_${signatureDialog.documentType}_position`] || ''}
        />
      </div>
    </PermissionGuard>
  );
}
