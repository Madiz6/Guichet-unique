import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, ArrowLeft, ArrowRight, Check, Download, Ban, Eye, Phone, RefreshCw, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PersonalInfoSection, DocumentsSection, ProfessionalInfoSection, RemunerationSection } from "../components/employees/EmployeeFormSections.jsx";
import SuspensionModal from "../components/employees/SuspensionModal";
import EmployeeDetailsModal from "../components/employees/EmployeeDetailsModal";
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { generateWorkAttestation, generateCertificatEmploi } from "../components/payroll/PDFGenerator";
import SignatureDialog from "../components/documents/SignatureDialog";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import PermissionGuard, { usePermission } from "../components/permissions/PermissionGuard";
// PermissionButton import is not used in this specific implementation, but was in the outline.
// import PermissionButton from "../components/permissions/PermissionButton"; 
import { logAuditAction, AUDIT_ACTIONS } from "../components/security/AuditLogger";

export default function Employes() {
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({});
  const [showSuspension, setShowSuspension] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [signatureDialog, setSignatureDialog] = useState({ isOpen: false, documentType: null, employee: null });
  const [downloadedCertificats, setDownloadedCertificats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('certificats_downloaded') || '{}'); } catch { return {}; }
  });

  const handleDownloadCertificatEmploi = (emp) => {
    generateCertificatEmploi(emp, company);
    const updated = { ...downloadedCertificats, [emp.id]: new Date().toISOString() };
    setDownloadedCertificats(updated);
    localStorage.setItem('certificats_downloaded', JSON.stringify(updated));
    toast.success(`Certificat d'emploi généré pour ${emp.prenom} ${emp.nom}`);
  };
  const queryClient = useQueryClient();
  
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => base44.entities.PayrollCycle.list('-created_date'), // Fetching all cycles, then taking the most recent one
  });
  
  const currentCycle = cycles.length > 0 ? cycles[0] : null; // Most recent cycle (assuming list returns in descending order by created_date)
  
  const company = companies[0] || {};
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: async (newEmployee) => { // Made async to await email sending
      queryClient.invalidateQueries(['employees']);
      toast.success('Employé créé avec succès !');
      
      // ✅ AUDIT LOG
      await logAuditAction(
        AUDIT_ACTIONS.EMPLOYEE_CREATED,
        'Employee',
        newEmployee.id,
        { employee_name: `${newEmployee.prenom} ${newEmployee.nom}`, department: newEmployee.departement },
        `${newEmployee.prenom} ${newEmployee.nom}`
      );
      
      setShowForm(false);
      setEditingEmployee(null);
      setFormData({});
      setCurrentStep(1);
      setValidationErrors({}); // Clear errors on success
      
      // Send welcome email if email is provided
      if (newEmployee.email && company?.email) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: newEmployee.email,
            subject: `Bienvenue chez ${company.nom_entreprise || 'Paie360'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                ${company.logo_url ? `
                  <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${company.logo_url}" alt="${company.nom_entreprise || 'Paie360'}" style="max-width: 120px;" />
                  </div>
                ` : ''}
                
                <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                  <h1 style="margin: 0; font-size: 28px;">🎉 Bienvenue!</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px;">Nous sommes ravis de vous accueillir dans notre équipe</p>
                </div>
                
                <div style="background: #F7F9FC; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                  <h2 style="margin-top: 0; color: #0F172A;">Bonjour ${newEmployee.prenom} ${newEmployee.nom},</h2>
                  <p style="color: #64748B;">Bienvenue chez ${company.nom_entreprise || 'Paie360'}! Nous sommes heureux de vous compter parmi nous.</p>
                </div>
                
                <div style="background: #F7F9FC; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <h3 style="margin-top: 0; color: #0F172A;">Vos informations</h3>
                  <p><strong>Poste:</strong> ${newEmployee.fonction || 'N/A'}</p>
                  <p><strong>Département:</strong> ${newEmployee.departement || 'N/A'}</p>
                  <p><strong>Date d'embauche:</strong> ${newEmployee.date_embauche ? new Date(newEmployee.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}</p>
                </div>
                
                <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6;">
                  <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                    <strong>Prochaines étapes:</strong> Vous recevrez vos bulletins de paie mensuels par email. Pour toute question, n'hésitez pas à contacter le service RH.
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
                
                <div style="text-align: center; color: #64748B; font-size: 12px;">
                  <p style="margin: 5px 0;"><strong>${company.nom_entreprise || 'Paie360'}</strong></p>
                  <p style="margin: 5px 0;">${company.adresse || ''}</p>
                  <p style="margin: 5px 0;">${company.telephone || ''} | ${company.email || ''}</p>
                </div>
              </div>
            `,
            from_name: company.nom_entreprise || 'Paie360',
            from_email: company.email || 'noreply@paie360.com'
          });
          toast.success('E-mail de bienvenue envoyé !');
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'e-mail de bienvenue:', emailError);
          // Don't fail the employee creation if email fails
          toast.warning('Employé créé, mais l\'e-mail de bienvenue n\'a pas pu être envoyé.');
        }
      } else if (newEmployee.email && !company?.email) {
        toast.warning('Employé créé, mais l\'e-mail de bienvenue n\'a pas pu être envoyé car l\'e-mail de l\'entreprise est manquant.');
      } else if (!newEmployee.email) {
        toast.info('Employé créé, mais aucun e-mail de bienvenue n\'a été envoyé car l\'e-mail de l\'employé est manquant.');
      }
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création de l'employé: ${error.message}`);
      console.error(error); // Log detailed error
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: async (updatedEmployee) => {
      queryClient.invalidateQueries(['employees']);
      
      // ✅ AUDIT LOG
      await logAuditAction(
        AUDIT_ACTIONS.EMPLOYEE_UPDATED,
        'Employee',
        updatedEmployee.id,
        { employee_name: `${updatedEmployee.prenom} ${updatedEmployee.nom}` },
        `${updatedEmployee.prenom} ${updatedEmployee.nom}`
      );
      
      setShowForm(false);
      setEditingEmployee(null);
      setFormData({});
      setCurrentStep(1);
      setValidationErrors({}); // Clear errors on success
      toast.success('Employé mis à jour avec succès !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour de l'employé: ${error.message}`);
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: async (_, deletedId) => {
      const deletedEmployee = employees.find(e => e.id === deletedId);
      
      // ✅ AUDIT LOG
      if (deletedEmployee) {
        await logAuditAction(
          AUDIT_ACTIONS.EMPLOYEE_DELETED,
          'Employee',
          deletedId,
          { employee_name: `${deletedEmployee.prenom} ${deletedEmployee.nom}` },
          `${deletedEmployee.prenom} ${deletedEmployee.nom}`
        );
      }
      
      queryClient.invalidateQueries(['employees']);
      toast.success('Employé supprimé avec succès !');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression de l'employé: ${error.message}`);
    }
  });

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1: // Personal Info
        if (!formData.prenom?.trim()) errors.prenom = 'Le prénom est requis';
        if (!formData.nom?.trim()) errors.nom = 'Le nom est requis';
        if (!formData.date_naissance) errors.date_naissance = 'La date de naissance est requise';
        if (formData.sexe === undefined || formData.sexe === null || formData.sexe === '') errors.sexe = 'Le sexe est requis';
        if (!formData.nationalite?.trim()) errors.nationalite = 'La nationalité est requise';
        if (!formData.ville?.trim()) errors.ville = 'La ville est requise';
        if (!formData.telephone?.trim()) errors.telephone = 'Le téléphone est requis';
        break;
        
      case 2: // Documents
        if (formData.type_identite === undefined || formData.type_identite === null || formData.type_identite === '') errors.type_identite = 'Le type d\'identité est requis';
        if (!formData.numero_identite?.trim()) errors.numero_identite = 'Le numéro d\'identité est requis';
        if (formData.type_contrat === undefined || formData.type_contrat === null || formData.type_contrat === '') errors.type_contrat = 'Le type de contrat est requis';
        break;
        
      case 3: // Professional Info
        if (!formData.fonction?.trim()) errors.fonction = 'La fonction est requise';
        if (!formData.departement?.trim()) errors.departement = 'Le département est requis';
        if (!formData.date_embauche) errors.date_embauche = 'La date d\'embauche est requise';
        if (formData.regime_cnss === undefined || formData.regime_cnss === null || formData.regime_cnss === '') errors.regime_cnss = 'Le régime CNSS est requis';
        if (!formData.banque?.trim()) errors.banque = 'La banque est requise';
        if (!formData.numero_compte?.trim()) errors.numero_compte = 'Le numéro de compte est requis';
        break;
        
      case 4: // Remuneration
        if (!formData.salaire_base || parseFloat(formData.salaire_base) <= 0) {
          errors.salaire_base = 'Le salaire de base est requis et doit être supérieur à 0';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        setValidationErrors({}); // Clear errors when moving to the next valid step
      }
    } else {
      toast.error('Veuillez remplir tous les champs requis à cette étape.');
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({}); // Clear errors when moving back
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all steps before submission
    let allValid = true;
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        allValid = false;
        setCurrentStep(step); // Go to the first step with errors
        toast.error(`Veuillez remplir tous les champs requis à l'étape ${step}`);
        break;
      }
    }
    
    if (!allValid) return;
    
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const reactivateMutation = useMutation({
    mutationFn: (emp) => base44.entities.Employee.update(emp.id, { statut: 'Actif' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      toast.success('Employé réactivé avec succès !');
    },
    onError: () => toast.error('Erreur lors de la réactivation')
  });

  const handleDownloadAttestation = (emp) => {
    setSignatureDialog({
      isOpen: true,
      documentType: 'work_attestation', // Document type for work attestation
      employee: emp
    });
  };

  const handleConfirmSignature = (signatory) => {
    const { employee, documentType } = signatureDialog;
    if (documentType === 'work_attestation') {
      generateWorkAttestation(employee, company, signatory);
      toast.success("Attestation de travail générée avec succès !");
    }
    setSignatureDialog({ isOpen: false, documentType: null, employee: null });
  };
  
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${emp.prenom} ${emp.nom}`.toLowerCase();
    const department = (emp.departement || '').toLowerCase();
    const phone = (emp.telephone || '').toLowerCase();
    
    return fullName.includes(searchLower) ||
           department.includes(searchLower) ||
           phone.includes(searchLower);
  });
  
  const steps = [
    { number: 1, title: 'Informations Personnelles', icon: '👤' },
    { number: 2, title: 'Documents', icon: '📄' },
    { number: 3, title: 'Informations Professionnelles', icon: '💼' },
    { number: 4, title: 'Rémunération', icon: '💰' }
  ];

  const canCreate = usePermission('employees_create');
  const canEdit = usePermission('employees_edit');
  const canDelete = usePermission('employees_delete');
  
  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowForm(false);
                setEditingEmployee(null);
                setFormData({});
                setCurrentStep(1);
                setValidationErrors({}); // Clear errors when closing form
              }}
              className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0A2540]">
                {editingEmployee ? "Modifier l'employé" : 'Nouvel employé'}
              </h1>
              <p className="text-[#697586] mt-1">Complétez les informations en 4 étapes simples</p>
            </div>
          </motion.div>
          
          {/* Beautiful Step Indicator */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="relative">
              {/* Progress Bar Background */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-[#E5E7EB] rounded-full" style={{ margin: '0 10%' }} />
              
              {/* Active Progress Bar */}
              <motion.div 
                className="absolute top-8 left-0 h-1 bg-gradient-to-r from-[#0066FF] to-[#00C48C] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep - 1) / 3) * 80 + 10}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
              
              {/* Steps */}
              <div className="relative flex justify-between">
                {steps.map((step, idx) => {
                  const isCompleted = currentStep > step.number;
                  const isCurrent = currentStep === step.number;
                  
                  return (
                    <motion.div
                      key={step.number}
                      className="flex flex-col items-center flex-1"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      {/* Step Circle */}
                      <motion.div
                        className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-300 shadow-lg ${
                          isCompleted
                            ? 'bg-gradient-to-br from-[#00C48C] to-[#00A876] text-white'
                            : isCurrent
                            ? 'bg-gradient-to-br from-[#0066FF] to-[#0052CC] text-white scale-110'
                            : 'bg-white text-[#9CA3AF] border-2 border-[#E5E7EB]'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            <Check className="w-8 h-8" />
                          </motion.div>
                        ) : (
                          <span>{step.icon}</span>
                        )}
                      </motion.div>
                      
                      {/* Step Label */}
                      <motion.div 
                        className="mt-3 text-center max-w-[140px]"
                        animate={{
                          scale: isCurrent ? 1.05 : 1,
                        }}
                      >
                        <p className={`text-sm font-semibold transition-colors ${
                          isCurrent ? 'text-[#0066FF]' : isCompleted ? 'text-[#00C48C]' : 'text-[#9CA3AF]'
                        }`}>
                          Étape {step.number}
                        </p>
                        <p className={`text-xs mt-1 ${
                          isCurrent ? 'text-[#425466] font-medium' : 'text-[#9CA3AF]'
                        }`}>
                          {step.title}
                        </p>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
          
          {/* Form Content with Animation */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && <PersonalInfoSection formData={formData} setFormData={setFormData} validationErrors={validationErrors} />}
                {currentStep === 2 && <DocumentsSection formData={formData} setFormData={setFormData} validationErrors={validationErrors} />}
                {currentStep === 3 && <ProfessionalInfoSection formData={formData} setFormData={setFormData} validationErrors={validationErrors} />}
                {currentStep === 4 && <RemunerationSection formData={formData} setFormData={setFormData} validationErrors={validationErrors} />}
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation Buttons */}
            <motion.div 
              className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all disabled:opacity-50 px-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
              
              <div className="flex gap-2">
                {steps.map((step) => (
                  <motion.div
                    key={step.number}
                    className={`h-2 rounded-full transition-all ${
                      step.number === currentStep
                        ? 'w-8 bg-[#0066FF]'
                        : step.number < currentStep
                        ? 'w-2 bg-[#00C48C]'
                        : 'w-2 bg-[#E5E7EB]'
                    }`}
                    layoutId={`step-indicator-${step.number}`}
                  />
                ))}
              </div>
              
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg transition-all px-6"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-[#00C48C] to-[#00A876] hover:shadow-lg transition-all px-8"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {createMutation.isLoading || updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              )}
            </motion.div>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <PermissionGuard permission="employees_view">
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon" className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#0A2540]">Gestion des employés</h1>
              <p className="text-[#697586] mt-1">Gérer les fiches des employés</p>
            </div>
            
            {canCreate && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => {
                    setFormData({
                      statut: 'Actif',
                      nombre_enfants: 0,
                      prime_anciennete: 0,
                      prime_rendement: 0,
                      prime_sujetion: 0,
                      prime_logement: 0,
                      prime_voiture: 0,
                      autres_primes: 0
                    });
                    setShowForm(true);
                    setValidationErrors({}); // Clear errors when starting new form
                  }}
                  className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel employé
                </Button>
              </motion.div>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border border-[#E8ECF2] mb-6 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#8896A8]" />
                  <Input
                    placeholder="Rechercher par nom, département ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0 focus-visible:ring-0"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border border-[#E8ECF2] shadow-lg">
              <div className="p-6 border-b border-[#E8ECF2] bg-gradient-to-r from-white to-[#F7F9FC]">
                <h3 className="text-lg font-bold text-[#0A2540]">
                  Tous les employés ({filteredEmployees.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F9FC] border-b border-[#E8ECF2]">
                      <TableHead className="text-[#425466] font-semibold">Employé</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Département</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Régime CNSS</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Téléphone</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Date embauche</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Statut</TableHead>
                      <TableHead className="text-[#425466] font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[#697586]">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[#697586]">
                          Aucun employé trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((emp) => {
                        return (
                          <motion.tr 
                            key={emp.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b border-[#E8ECF2] hover:bg-[#F7F9FC] transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {emp.photo_url ? (
                                  <img src={emp.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-white font-semibold">
                                    {emp.prenom?.[0]}{emp.nom?.[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-[#0A2540]">{emp.prenom} {emp.nom}</p>
                                  <p className="text-sm text-[#697586]">{emp.fonction}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-[#425466]">{emp.departement}</TableCell>
                            <TableCell className="text-[#425466]">{emp.regime_cnss}</TableCell>
                            <TableCell className="text-[#425466]">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-[#697586]" />
                                {emp.telephone || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-[#425466]">
                              {emp.date_embauche ? format(new Date(emp.date_embauche), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                emp.statut === 'Actif' ? 'bg-[#E5F8F3] text-[#00C48C]' :
                                emp.statut === 'En congé' ? 'bg-[#FFF4E5] text-[#FA6400]' :
                                emp.statut === 'Suspendu' ? 'bg-[#FFE5E5] text-[#EF4444]' :
                                'bg-[#F5F5F5] text-[#8896A8]'
                              }`}>
                                {emp.statut}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setViewingEmployee(emp)}
                                  title="Voir détails"
                                  className="text-[#697586] hover:text-[#0066FF] hover:bg-[#F7F9FC]"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadAttestation(emp)}
                                  title="Télécharger attestation de travail"
                                  className="text-[#697586] hover:text-[#0066FF] hover:bg-[#F7F9FC]"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadCertificatEmploi(emp)}
                                  title={downloadedCertificats[emp.id] ? `Certificat d'emploi CNSS (téléchargé le ${format(new Date(downloadedCertificats[emp.id]), 'dd/MM/yyyy')})` : "Télécharger certificat d'emploi CNSS"}
                                  className={downloadedCertificats[emp.id] ? "text-[#00C48C] hover:text-[#00A876] hover:bg-[#E5F8F3]" : "text-[#697586] hover:text-[#FA6400] hover:bg-[#FFF4E5]"}
                                >
                                  <FileCheck className="w-4 h-4" />
                                </Button>
                                {emp.statut === 'Suspendu' ? (
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => {
                                     if (confirm(`Réactiver ${emp.prenom} ${emp.nom} ?`)) {
                                       reactivateMutation.mutate(emp);
                                     }
                                   }}
                                   title="Réactiver l'employé"
                                   className="text-[#697586] hover:text-[#00C48C] hover:bg-[#E5F8F3]"
                                 >
                                   <RefreshCw className="w-4 h-4" />
                                 </Button>
                                ) : (
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => {
                                     setSelectedEmployee(emp);
                                     setShowSuspension(true);
                                   }}
                                   title="Suspendre"
                                   className="text-[#697586] hover:text-[#FA6400] hover:bg-[#FFF4E5]"
                                 >
                                   <Ban className="w-4 h-4" />
                                 </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingEmployee(emp);
                                      setFormData(emp);
                                      setShowForm(true);
                                      setValidationErrors({}); // Clear errors when starting edit
                                    }}
                                    className="text-[#697586] hover:text-[#0066FF] hover:bg-[#F7F9FC]"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm('Supprimer cet employé ?')) {
                                        deleteMutation.mutate(emp.id);
                                      }
                                    }}
                                    className="text-[#697586] hover:text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </motion.div>
        </div>
        
        {showSuspension && selectedEmployee && (
          <SuspensionModal
            employee={selectedEmployee}
            onClose={() => {
              setShowSuspension(false);
              setSelectedEmployee(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries(['employees']);
              setShowSuspension(false);
              setSelectedEmployee(null);
            }}
          />
        )}
        
        {viewingEmployee && (
          <EmployeeDetailsModal
            employee={viewingEmployee}
            company={company}
            currentCycle={currentCycle}
            onClose={() => setViewingEmployee(null)}
          />
        )}

        <SignatureDialog
          isOpen={signatureDialog.isOpen}
          onClose={() => setSignatureDialog({ isOpen: false, documentType: null, employee: null })}
          onConfirm={handleConfirmSignature}
          documentType={signatureDialog.documentType}
          defaultName={company[`signatory_${signatureDialog.documentType}_name`] || ''}
          defaultPosition={company[`signatory_${signatureDialog.documentType}_position`] || ''}
        />
      </div>
    </PermissionGuard>
  );
}