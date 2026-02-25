import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, FileText, Download, CreditCard, Eye, CheckCircle, AlertCircle, Calendar, AlertTriangle, Upload, Table2, ClipboardList } from 'lucide-react';
import CNSSContributionTable from "../components/payroll/CNSSContributionTable";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { calculatePayroll } from "../components/payroll/DjiboutiCalculator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PermissionGuard, { usePermission } from "../components/permissions/PermissionGuard";
import { logAuditAction, AUDIT_ACTIONS } from "../components/security/AuditLogger";
import { registerDeclarationTransaction, markDeclarationTransactionPaid } from "../components/transactions/autoTransactions";
import PaymentGateway from "../components/payments/PaymentGateway";

export default function Declarations() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [viewingDeclaration, setViewingDeclaration] = useState(null);
  const [formData, setFormData] = useState({
    regime: 'RG',
    statut: 'Non payé'
  });
  const [showContribTable, setShowContribTable] = useState(false);
  const [contribTableDecl, setContribTableDecl] = useState(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedDeclarationForPayment, setSelectedDeclarationForPayment] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingBordereau, setDownloadingBordereau] = useState(null);
  
  const queryClient = useQueryClient();
  
  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => base44.entities.Declaration.list('-created_date'),
  });
  
  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => base44.entities.PayrollCycle.list('-created_date'),
  });
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0] || {};
  
  const createDeclarationMutation = useMutation({
    mutationFn: (data) => base44.entities.Declaration.create(data),
    onSuccess: async (newDeclaration) => {
      queryClient.invalidateQueries(['declarations']);
      
      // ✅ AUDIT LOG
      await logAuditAction(
        AUDIT_ACTIONS.DECLARATION_CREATED,
        'Declaration',
        newDeclaration.id,
        {
          numero_cotisation: newDeclaration.numero_cotisation,
          periode: newDeclaration.periode,
          total: newDeclaration.total
        },
        `${newDeclaration.numero_cotisation} - ${newDeclaration.periode}`
      );
      
      // Auto-register the declaration as a pending expense transaction
      await registerDeclarationTransaction(newDeclaration);
      setShowForm(false);
      setSelectedCycle(null);
      toast.success('Déclaration créée avec succès');
    },
  });
  
  const updateDeclarationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Declaration.update(id, data),
    onSuccess: async (updatedDeclaration) => {
      // The specific DECLARATION_PAID audit log (with transaction_id) is now handled in handlePaymentSuccess
      queryClient.invalidateQueries(['declarations']);
      toast.success('Déclaration mise à jour');
    },
  });
  
  // Auto-send SMS reminders for upcoming declarations
  React.useEffect(() => {
    const checkUpcomingDeclarations = async () => {
      const today = new Date();
      
      for (const declaration of declarations) {
        if (declaration.statut !== 'Non payé') continue;
        
        const daysUntilDue = differenceInDays(new Date(declaration.date_limite), today);
        
        // Send reminder 3 days before due date
        if (daysUntilDue === 3 && !declaration.reminder_sent) {
          try {
            // Get admin users
            const users = await base44.entities.User.list();
            const adminUsers = users.filter(u => u.role === 'admin');
            
            for (const admin of adminUsers) {
              if (admin.phone) {
                const smsMessage = `⚠️ ${company.nom_entreprise || 'Paie360'}: Rappel - Déclaration CNSS ${declaration.periode} à payer avant le ${format(new Date(declaration.date_limite), 'dd/MM/yyyy')}. Montant: ${declaration.total?.toLocaleString()} DJF.`;
                
                await base44.functions.invoke('sendSMS', {
                  to: admin.phone,
                  message: smsMessage
                });
              }
            }
            
            // Mark reminder as sent
            await base44.entities.Declaration.update(declaration.id, {
              ...declaration,
              reminder_sent: true
            });
            queryClient.invalidateQueries(['declarations']);
            
          } catch (error) {
            console.error('Error sending declaration reminder:', error);
          }
        }
      }
    };
    
    if (declarations.length > 0) {
      checkUpcomingDeclarations();
    }
  }, [declarations, company, queryClient]);
  
  const handleCreateFromCycle = (cycle) => {
    setSelectedCycle(cycle);
    
    // Calculate totals
    let totalCNSS = 0;
    let totalITS = 0;
    let masseSalariale = 0;
    
    const employeesInCycle = employees.filter(e => cycle.employee_ids?.includes(e.id));
    
    employeesInCycle.forEach(emp => {
      const absences = cycle.employee_absences?.[emp.id] || 0;
      const empWithAbsences = { ...emp, absences_amount: absences };
      const calc = calculatePayroll(empWithAbsences);
      
      totalCNSS += calc.cnssEmployee.total + calc.cnssEmployer.total;
      totalITS += calc.its;
      masseSalariale += calc.grossSalary;
    });
    
    // Generate declaration number
    const periode = cycle.mois_annee || format(new Date(), 'yyyyMM');
    const numero = `${company.numero_affiliation || 'XXXX'}-${periode}-${Math.floor(Math.random() * 1000)}`;
    
    // FIXED: Date limite is always 10th of next month
    const [year, month] = periode.match(/(\d{4})(\d{2})/)?.slice(1) || [new Date().getFullYear(), new Date().getMonth() + 1];
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const dateLimite = new Date(nextYear, nextMonth - 1, 10); // Always 10th of next month
    
    setFormData({
      numero_cotisation: numero,
      regime: 'RG',
      periode: cycle.periode || format(new Date(), 'MMMM yyyy'),
      nombre_employes: employeesInCycle.length,
      masse_salariale: Math.round(masseSalariale),
      total_cnss: Math.round(totalCNSS),
      total_its: Math.round(totalITS),
      penalite: 0,
      astreintes: 0,
      total: Math.round(totalCNSS + totalITS),
      date_limite: format(dateLimite, 'yyyy-MM-dd'),
      statut: 'Non payé',
      employee_ids: cycle.employee_ids,
      payroll_cycle_id: cycle.id,
      reminder_sent: false
    });
    
    setShowForm(true);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    createDeclarationMutation.mutate(formData);
  };
  
  const handlePayment = (declaration) => {
    setSelectedDeclarationForPayment(declaration);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (selectedDeclarationForPayment) {
      // Mark declaration as Payée regardless of payment method
      await updateDeclarationMutation.mutateAsync({
        id: selectedDeclarationForPayment.id,
        data: {
          ...selectedDeclarationForPayment,
          statut: 'Payé',
          date_paiement: format(new Date(), 'yyyy-MM-dd'),
          transaction_id: paymentData.transaction_id || `MANUAL-${Date.now()}`
        }
      });

      // Auto-update the declaration transaction to Payé
      await markDeclarationTransactionPaid(selectedDeclarationForPayment, paymentData);
      
      // ✅ AUDIT LOG
      await logAuditAction(
        AUDIT_ACTIONS.DECLARATION_PAID,
        'Declaration',
        selectedDeclarationForPayment.id,
        {
          numero_cotisation: selectedDeclarationForPayment.numero_cotisation,
          periode: selectedDeclarationForPayment.periode,
          montant: selectedDeclarationForPayment.total,
          transaction_id: paymentData.transaction_id
        },
        `${selectedDeclarationForPayment.numero_cotisation} - ${selectedDeclarationForPayment.periode}`
      );
    }
    
    setShowPaymentGateway(false);
    setSelectedDeclarationForPayment(null);
    toast.success('Paiement effectué avec succès!');
  };

  const handleDownloadBordereau = async (decl) => {
    setDownloadingBordereau(decl.id);
    try {
      const response = await base44.functions.invoke('generateBordereauCNSS', {
        declaration_id: decl.id
      });
      const html = response.data;
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) setTimeout(() => win.print(), 600);
      toast.success('Bordereau CNSS ouvert — prêt à imprimer / télécharger');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la génération du bordereau');
    } finally {
      setDownloadingBordereau(null);
    }
  };

  const handleDownloadDeclarationPDF = async (decl) => {
    setDownloadingPDF(true);
    try {
      const response = await base44.functions.invoke('generateCNSSDeclarationPDF', {
        declaration_id: decl.id
      });
      const html = response.data;
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) setTimeout(() => win.print(), 600);
      toast.success('Déclaration ouverte — prête à imprimer / sauvegarder en PDF');
    } catch (error) {
      console.error('Declaration download error:', error);
      toast.error('Erreur lors de la génération de la déclaration');
    } finally {
      setDownloadingPDF(false);
    }
  };
  
  const cyclesWithoutDeclaration = cycles.filter(cycle => 
    !declarations.find(d => d.payroll_cycle_id === cycle.id)
  );
  
  const canCreate = usePermission('declarations_create');
  const canPay = usePermission('declarations_pay');
  
  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
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
                setSelectedCycle(null);
              }}
              className="border-[#D3DCE6]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2540]">Nouvelle Déclaration CNSS</h1>
              <p className="text-[#697586] mt-1">Créer une déclaration mensuelle</p>
            </div>
          </motion.div>
          
          <Card className="border border-[#E8ECF2]">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Numéro de Cotisation</Label>
                    <Input
                      value={formData.numero_cotisation}
                      onChange={(e) => setFormData({...formData, numero_cotisation: e.target.value})}
                      className="border-[#D3DCE6] mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Régime</Label>
                    <Select
                      value={formData.regime}
                      onValueChange={(value) => setFormData({...formData, regime: value})}
                    >
                      <SelectTrigger className="border-[#D3DCE6] mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RG">Régime Général</SelectItem>
                        <SelectItem value="Particulier">Particulier</SelectItem>
                        <SelectItem value="Zone Franche">Zone Franche</SelectItem>
                        <SelectItem value="Fonctionnaire">Fonctionnaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Période</Label>
                    <Input
                      value={formData.periode}
                      onChange={(e) => setFormData({...formData, periode: e.target.value})}
                      className="border-[#D3DCE6] mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Nombre d'Employés</Label>
                    <Input
                      type="number"
                      value={formData.nombre_employes}
                      onChange={(e) => setFormData({...formData, nombre_employes: parseInt(e.target.value)})}
                      className="border-[#D3DCE6] mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Masse Salariale (DJF)</Label>
                    <Input
                      type="number"
                      value={formData.masse_salariale}
                      onChange={(e) => setFormData({...formData, masse_salariale: parseFloat(e.target.value)})}
                      className="border-[#D3DCE6] mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Total CNSS (DJF)</Label>
                    <Input
                      type="number"
                      value={formData.total_cnss}
                      onChange={(e) => setFormData({...formData, total_cnss: parseFloat(e.target.value)})}
                      className="border-[#D3DCE6] mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Total ITS (DJF)</Label>
                    <Input
                      type="number"
                      value={formData.total_its}
                      onChange={(e) => setFormData({...formData, total_its: parseFloat(e.target.value)})}
                      className="border-[#D3DCE6] mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Pénalité (DJF)</Label>
                    <Input
                      type="number"
                      value={formData.penalite}
                      onChange={(e) => setFormData({...formData, penalite: parseFloat(e.target.value) || 0})}
                      className="border-[#D3DCE6] mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>Date Limite (Toujours le 10 du mois suivant)</Label>
                    <Input
                      type="date"
                      value={formData.date_limite}
                      className="border-[#D3DCE6] mt-2 bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-[#64748B] mt-1">📅 Date fixe: 10 du mois suivant</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-[#F7F9FC] to-white p-6 rounded-lg border border-[#E8ECF2]">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-[#0A2540]">Total à Payer:</span>
                    <span className="text-2xl font-bold text-[#0066FF]">
                      {(formData.total_cnss + formData.total_its + (formData.penalite || 0) + (formData.astreintes || 0)).toLocaleString()} DJF
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-[#E8ECF2]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedCycle(null);
                    }}
                    className="border-[#D3DCE6]"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
                    disabled={createDeclarationMutation.isLoading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {createDeclarationMutation.isLoading ? 'Création...' : 'Créer la Déclaration'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <PermissionGuard permission="declarations_view">
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
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
              <h1 className="text-3xl font-bold text-[#0A2540]">Déclarations CNSS</h1>
              <p className="text-[#697586] mt-1">Gérer les déclarations mensuelles</p>
            </div>
          </motion.div>
          
          {/* Cycles Without Declaration Alert */}
          {canCreate && cyclesWithoutDeclaration.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="border-l-4 border-l-[#FA6400] bg-[#FFF4E5]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FA6400] mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0A2540]">
                        {cyclesWithoutDeclaration.length} cycle(s) sans déclaration
                      </h3>
                      <p className="text-sm text-[#697586] mt-1 mb-3">
                        Les cycles suivants nécessitent une déclaration CNSS
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cyclesWithoutDeclaration.map(cycle => (
                          <Button
                            key={cycle.id}
                            size="sm"
                            onClick={() => handleCreateFromCycle(cycle)}
                            className="bg-white border border-[#D3DCE6] text-[#0A2540] hover:bg-[#F7F9FC]"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            {cycle.periode}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Declarations List */}
          <div className="space-y-4">
            {declarations.map(decl => (
              <motion.div
                key={decl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border border-[#E8ECF2] hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#0A2540] text-lg">{decl.numero_cotisation}</h3>
                          <p className="text-sm text-[#697586]">
                            {decl.periode} • {decl.regime} • {decl.nombre_employes} employés
                          </p>
                          <p className="text-xs text-[#697586] mt-1">
                            Date limite: {decl.date_limite ? format(new Date(decl.date_limite), 'dd/MM/yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#0066FF]">
                            {decl.total?.toLocaleString()} DJF
                          </p>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            decl.statut === 'Payé' ? 'bg-[#E5F8F3] text-[#00C48C]' :
                            decl.statut === 'En retard' ? 'bg-[#FFE5E5] text-[#EF4444]' :
                            'bg-[#FFF4E5] text-[#FA6400]'
                          }`}>
                            {decl.statut}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownloadDeclarationPDF(decl)}
                            disabled={downloadingPDF}
                            className="border-[#D3DCE6]"
                            title="Télécharger PDF"
                          >
                            {downloadingPDF ? (
                              <div className="w-4 h-4 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setViewingDeclaration(decl)}
                            className="border-[#D3DCE6]"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            title="Tableau de cotisations"
                            className="border-[#D3DCE6]"
                            onClick={() => {
                              const declEmployees = employees.filter(e => decl.employee_ids?.includes(e.id));
                              setContribTableDecl({ decl, employees: declEmployees });
                              setShowContribTable(true);
                            }}
                          >
                            <Table2 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            title="Bordereau CNSS (Relevé nominatif)"
                            className="border-[#D3DCE6]"
                            onClick={() => handleDownloadBordereau(decl)}
                            disabled={downloadingBordereau === decl.id}
                          >
                            {downloadingBordereau === decl.id
                              ? <div className="w-4 h-4 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
                              : <ClipboardList className="w-4 h-4" />
                            }
                          </Button>
                          
                          {canPay && decl.statut !== 'Payé' && (
                            <Button
                              onClick={() => handlePayment(decl)}
                              className="bg-gradient-to-r from-[#00C48C] to-[#00A876]"
                              disabled={updateDeclarationMutation.isLoading}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Payer
                            </Button>
                          )}
                          
                          {decl.statut === 'Payé' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#E5F8F3] rounded-lg">
                              <CheckCircle className="w-4 h-4 text-[#00C48C]" />
                              <span className="text-sm font-medium text-[#00C48C]">Payé</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            {declarations.length === 0 && (
              <Card className="border border-[#E8ECF2]">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-[#D3DCE6] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#0A2540] mb-2">Aucune déclaration</h3>
                  <p className="text-[#697586] mb-6">Créez votre première déclaration CNSS</p>
                  {canCreate && cyclesWithoutDeclaration.length > 0 && (
                    <Button
                      onClick={() => handleCreateFromCycle(cyclesWithoutDeclaration[0])}
                      className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer depuis {cyclesWithoutDeclaration[0].periode}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* CNSS Contribution Table Modal */}
          {showContribTable && contribTableDecl && (
            <Dialog open={showContribTable} onOpenChange={() => setShowContribTable(false)}>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Tableau de Cotisation — {contribTableDecl.decl.periode} ({contribTableDecl.decl.regime})
                  </DialogTitle>
                </DialogHeader>
                <CNSSContributionTable
                  employees={contribTableDecl.employees}
                  regime={contribTableDecl.decl.regime === 'Zone Franche' ? 'Zone Franche' : 'Régime Général'}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* View Declaration Details */}
          {viewingDeclaration && (
            <Dialog open={!!viewingDeclaration} onOpenChange={() => setViewingDeclaration(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Déclaration - {viewingDeclaration.numero_cotisation}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#697586]">Période</Label>
                      <p className="text-[#0A2540] font-semibold mt-1">{viewingDeclaration.periode}</p>
                    </div>
                    <div>
                      <Label className="text-[#697586]">Régime</Label>
                      <p className="text-[#0A2540] font-semibold mt-1">{viewingDeclaration.regime}</p>
                    </div>
                    <div>
                      <Label className="text-[#697586]">Nombre d'Employés</Label>
                      <p className="text-[#0A2540] font-semibold mt-1">{viewingDeclaration.nombre_employes}</p>
                    </div>
                    <div>
                      <Label className="text-[#697586]">Masse Salariale</Label>
                      <p className="text-[#0A2540] font-semibold mt-1">{viewingDeclaration.masse_salariale?.toLocaleString()} DJF</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#E8ECF2] pt-4">
                    <h3 className="font-semibold text-[#0A2540] mb-3">Détails des Cotisations</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-[#F7F9FC] rounded">
                        <span className="text-[#697586]">Total CNSS</span>
                        <span className="font-semibold text-[#0A2540]">{viewingDeclaration.total_cnss?.toLocaleString()} DJF</span>
                      </div>
                      <div className="flex justify-between p-3 bg-[#F7F9FC] rounded">
                        <span className="text-[#697586]">Total ITS</span>
                        <span className="font-semibold text-[#0A2540]">{viewingDeclaration.total_its?.toLocaleString()} DJF</span>
                      </div>
                      {viewingDeclaration.penalite > 0 && (
                        <div className="flex justify-between p-3 bg-[#FFE5E5] rounded">
                          <span className="text-[#EF4444]">Pénalité</span>
                          <span className="font-semibold text-[#EF4444]">{viewingDeclaration.penalite?.toLocaleString()} DJF</span>
                        </div>
                      )}
                      <div className="flex justify-between p-4 bg-gradient-to-r from-[#F7F9FC] to-white rounded-lg border-2 border-[#0066FF] mt-4">
                        <span className="text-lg font-bold text-[#0A2540]">Total à Payer</span>
                        <span className="text-xl font-bold text-[#0066FF]">{viewingDeclaration.total?.toLocaleString()} DJF</span>
                      </div>
                    </div>
                  </div>
                  
                  {viewingDeclaration.statut === 'Payé' && viewingDeclaration.date_paiement && (
                    <div className="bg-[#E5F8F3] p-4 rounded-lg flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#00C48C]" />
                      <div>
                        <p className="font-semibold text-[#00C48C]">Déclaration Payée</p>
                        <p className="text-sm text-[#697586]">
                          Date de paiement: {format(new Date(viewingDeclaration.date_paiement), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Payment Gateway */}
      {showPaymentGateway && selectedDeclarationForPayment && (
        <PaymentGateway
          isOpen={showPaymentGateway}
          onClose={() => {
            setShowPaymentGateway(false);
            setSelectedDeclarationForPayment(null);
          }}
          amount={selectedDeclarationForPayment.total}
          description={`Déclaration CNSS - ${selectedDeclarationForPayment.periode} (${selectedDeclarationForPayment.nombre_employes} employés)`}
          paymentType="declaration"
          entityId={selectedDeclarationForPayment.id}
          metadata={{
            numero_cotisation: selectedDeclarationForPayment.numero_cotisation,
            periode: selectedDeclarationForPayment.periode,
            regime: selectedDeclarationForPayment.regime
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </PermissionGuard>
  );
}