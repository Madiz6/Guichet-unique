import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { calculatePayroll } from "../payroll/DjiboutiCalculator";
import { format } from 'date-fns';
import { User, Phone, Mail, Calendar, MapPin, Building2, Briefcase, CreditCard, DollarSign, FileText, TrendingDown, Info, AlertCircle } from 'lucide-react';
import { SimpleTooltip } from "@/components/ui/tooltip";

export default function EmployeeDetailsModal({ employee, company, onClose, currentCycle }) {
  // Use current cycle data if available, otherwise calculate base salary
  let calc, finalNet, absences = 0, otherDeductions = 0;
  let calcWithoutAbsences = null;
  
  if (currentCycle && currentCycle.employee_ids?.includes(employee.id)) {
    // Use the actual cycle data with deductions
    absences = currentCycle.employee_absences?.[employee.id] || 0;
    otherDeductions = currentCycle.employee_other_deductions?.[employee.id] || 0;
    
    const empWithAbsences = { ...employee, absences_amount: absences };
    calc = calculatePayroll(empWithAbsences);
    finalNet = calc.netSalary - otherDeductions;
    
    // Calculate without absences for comparison
    if (absences > 0) {
      calcWithoutAbsences = calculatePayroll(employee);
    }
  } else {
    // Calculate without deductions
    calc = calculatePayroll(employee);
    finalNet = calc.netSalary;
  }
  
  return (
    <Dialog open={!!employee} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {employee.photo_url ? (
              <img src={employee.photo_url} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-[#0066FF]/20" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-white font-bold text-2xl ring-4 ring-[#0066FF]/20">
                {employee.prenom?.[0]}{employee.nom?.[0]}
              </div>
            )}
            <div>
              <DialogTitle className="text-2xl text-[#0A2540]">{employee.prenom} {employee.nom}</DialogTitle>
              <p className="text-[#697586] mt-1">{employee.fonction} - {employee.departement}</p>
              {currentCycle && (
                <p className="text-xs text-[#0066FF] mt-1">Période: {currentCycle.periode}</p>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Personal Information */}
          <Card className="border border-[#E8ECF2]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-[#0066FF]" />
                <h3 className="font-semibold text-[#0A2540]">Informations Personnelles</h3>
              </div>
              <div className="space-y-3 text-sm">
                {employee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Email:</span>
                    <span className="text-[#0A2540] font-medium">{employee.email}</span>
                  </div>
                )}
                {employee.telephone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Téléphone:</span>
                    <span className="text-[#0A2540] font-medium">{employee.telephone}</span>
                  </div>
                )}
                {employee.date_naissance && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Date de naissance:</span>
                    <span className="text-[#0A2540] font-medium">{format(new Date(employee.date_naissance), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                {employee.sexe && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#697586]">Sexe:</span>
                    <span className="text-[#0A2540] font-medium">{employee.sexe}</span>
                  </div>
                )}
                {employee.nationalite && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Nationalité:</span>
                    <span className="text-[#0A2540] font-medium">{employee.nationalite}</span>
                  </div>
                )}
                {employee.ville && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Ville:</span>
                    <span className="text-[#0A2540] font-medium">{employee.ville}</span>
                  </div>
                )}
                {employee.situation_familiale && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#697586]">Situation familiale:</span>
                    <span className="text-[#0A2540] font-medium">{employee.situation_familiale}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[#697586]">Nombre d'enfants:</span>
                  <span className="text-[#0A2540] font-medium">{employee.nombre_enfants || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Professional Information */}
          <Card className="border border-[#E8ECF2]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-[#0066FF]" />
                <h3 className="font-semibold text-[#0A2540]">Informations Professionnelles</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#697586]" />
                  <span className="text-[#697586]">Département:</span>
                  <span className="text-[#0A2540] font-medium">{employee.departement || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#697586]" />
                  <span className="text-[#697586]">Fonction:</span>
                  <span className="text-[#0A2540] font-medium">{employee.fonction || '-'}</span>
                </div>
                {employee.date_embauche && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Date d'embauche:</span>
                    <span className="text-[#0A2540] font-medium">{format(new Date(employee.date_embauche), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                {employee.type_contrat && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Type de contrat:</span>
                    <Badge variant="outline">{employee.type_contrat}</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[#697586]">Régime CNSS:</span>
                  <Badge className="bg-[#0066FF]/10 text-[#0066FF]">{employee.regime_cnss || 'N/A'}</Badge>
                </div>
                {employee.matricule_cnss && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#697586]">Matricule CNSS:</span>
                    <span className="text-[#0A2540] font-medium">{employee.matricule_cnss}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[#697586]">Ancienneté:</span>
                  <span className="text-[#0A2540] font-medium">{employee.anciennete_annees || 0} an(s) {employee.anciennete_mois || 0} mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#697586]">Statut:</span>
                  <Badge className={
                    employee.statut === 'Actif' ? 'bg-[#E5F8F3] text-[#00C48C]' :
                    employee.statut === 'En congé' ? 'bg-[#FFF4E5] text-[#FA6400]' :
                    employee.statut === 'Suspendu' ? 'bg-[#FFE5E5] text-[#EF4444]' :
                    'bg-[#F5F5F5] text-[#8896A8]'
                  }>
                    {employee.statut}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Documents */}
          <Card className="border border-[#E8ECF2]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#0066FF]" />
                <h3 className="font-semibold text-[#0A2540]">Documents</h3>
              </div>
              <div className="space-y-3 text-sm">
                {employee.type_identite && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#697586]">Type d'identité:</span>
                    <span className="text-[#0A2540] font-medium">{employee.type_identite}</span>
                  </div>
                )}
                {employee.numero_identite && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#697586]">N° Identité:</span>
                    <span className="text-[#0A2540] font-medium">{employee.numero_identite}</span>
                  </div>
                )}
                {employee.document_identite_url && (
                  <a href={employee.document_identite_url} target="_blank" rel="noopener noreferrer" className="text-[#0066FF] hover:underline block">
                    📄 Document d'identité
                  </a>
                )}
                {employee.contrat_url && (
                  <a href={employee.contrat_url} target="_blank" rel="noopener noreferrer" className="text-[#0066FF] hover:underline block">
                    📄 Contrat de travail
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Enhanced Banking & Salary Information with Absence Breakdown */}
          <Card className="border border-[#E8ECF2]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#0066FF]" />
                <h3 className="font-semibold text-[#0A2540]">Informations Bancaires & Salaire</h3>
              </div>
              <div className="space-y-3 text-sm">
                {employee.banque && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#697586]" />
                    <span className="text-[#697586]">Banque:</span>
                    <span className="text-[#0A2540] font-medium">{employee.banque}</span>
                  </div>
                )}
                {employee.numero_compte && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#697586]">N° Compte:</span>
                    <span className="text-[#0A2540] font-medium">{employee.numero_compte}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-[#E8ECF2]">
                  {/* Absence Impact Alert */}
                  {absences > 0 && calcWithoutAbsences && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-red-900">Impact des Absences</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-red-700">Montant absences:</span>
                          <span className="font-bold text-red-900">-{absences.toLocaleString()} DJF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">CNSS économisée:</span>
                          <span className="font-semibold text-orange-600">-{(calcWithoutAbsences.cnssEmployee.total - calc.cnssEmployee.total).toLocaleString()} DJF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">ITS économisé:</span>
                          <span className="font-semibold text-amber-600">-{(calcWithoutAbsences.its - calc.its).toLocaleString()} DJF</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-red-300">
                          <span className="text-red-800 font-bold">Perte nette totale:</span>
                          <span className="font-bold text-red-900">-{(calcWithoutAbsences.netSalary - calc.netSalary).toLocaleString()} DJF</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Salary Breakdown */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#697586]">Salaire de Base:</span>
                    <span className="text-[#0A2540] font-medium">{calc.breakdown.salaire_base.toLocaleString()} DJF</span>
                  </div>
                  
                  {calc.breakdown.prime_anciennete > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#697586]">Prime Ancienneté:</span>
                      <span className="text-green-600 font-medium">+{calc.breakdown.prime_anciennete.toLocaleString()} DJF</span>
                    </div>
                  )}
                  
                  {absences > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <SimpleTooltip
                        content={
                          <div>
                            <p className="font-semibold mb-1">Absences déduites du BRUT</p>
                            <p className="text-xs">Cette déduction est appliquée AVANT le calcul de la CNSS et de l'ITS, ce qui réduit également ces cotisations.</p>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-1 cursor-help">
                          <span className="text-red-600">Absences:</span>
                          <Info className="w-3 h-3 text-red-600" />
                        </div>
                      </SimpleTooltip>
                      <span className="text-red-600 font-bold">-{absences.toLocaleString()} DJF</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mb-2 py-2 bg-blue-50 px-2 rounded">
                    <span className="text-[#0066FF] font-semibold">= Salaire Brut Ajusté:</span>
                    <span className="text-[#0066FF] font-bold text-lg">{calc.grossSalary.toLocaleString()} DJF</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <SimpleTooltip
                      content={`Calculé sur le brut ajusté: ${calc.grossSalary.toLocaleString()} × 4%`}
                    >
                      <div className="flex items-center gap-1 cursor-help">
                        <span className="text-[#697586]">CNSS Salariale (4%):</span>
                        <Info className="w-3 h-3 text-[#697586]" />
                      </div>
                    </SimpleTooltip>
                    <span className="text-[#FA6400] font-medium">-{calc.cnssEmployee.total.toLocaleString()} DJF</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <SimpleTooltip
                      content="Calculé sur le net imposable réduit par les absences"
                    >
                      <div className="flex items-center gap-1 cursor-help">
                        <span className="text-[#697586]">ITS:</span>
                        <Info className="w-3 h-3 text-[#697586]" />
                      </div>
                    </SimpleTooltip>
                    <span className="text-[#FA6400] font-medium">-{calc.its.toLocaleString()} DJF</span>
                  </div>
                  
                  {calc.aide > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#697586]">AIDE:</span>
                      <span className="text-[#FA6400] font-medium">-{calc.aide.toLocaleString()} DJF</span>
                    </div>
                  )}
                  
                  {otherDeductions > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#697586]">Autres déductions:</span>
                      <span className="text-amber-600 font-medium">-{otherDeductions.toLocaleString()} DJF</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#697586]">RetCim:</span>
                    <span className="text-[#FA6400] font-medium">-400 DJF</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t-2 border-[#0066FF]">
                    <span className="text-[#0A2540] font-bold">NET À PAYER:</span>
                    <span className="text-[#0066FF] font-bold text-2xl">{finalNet.toLocaleString()} DJF</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Info Box at Bottom */}
        {absences > 0 && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-blue-900 mb-2">📊 Comment sont calculées les absences?</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>✅ Les absences de <strong>{absences.toLocaleString()} DJF</strong> sont déduites du <strong>Salaire Brut</strong> en premier</p>
                  <p>✅ La CNSS (4%) est ensuite calculée sur le <strong>Brut Ajusté</strong> ({calc.grossSalary.toLocaleString()} DJF)</p>
                  <p>✅ L'ITS est calculé sur le <strong>Net Imposable</strong> déjà réduit</p>
                  <p className="pt-2 font-semibold text-blue-900">
                    💡 Résultat: L'employé économise aussi sur les cotisations grâce à la réduction du brut!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}