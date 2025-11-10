import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileSpreadsheet, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function AdvancedReportExporter({ isOpen, onClose }) {
  const [reportType, setReportType] = useState('employees');
  const [exportFormat, setExportFormat] = useState('excel');
  const [dateRange, setDateRange] = useState('all');
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => base44.entities.PayrollCycle.list('-created_date'),
  });
  
  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations'],
    queryFn: () => base44.entities.Declaration.list('-created_date'),
  });
  
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-created_date'),
  });
  
  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données");
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };
  
  const exportToCSV = (data, filename) => {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => headers.map(h => row[h]));
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };
  
  const handleExport = () => {
    let data = [];
    let filename = '';
    
    switch (reportType) {
      case 'employees':
        data = employees.map(emp => ({
          'Prénom': emp.prenom,
          'Nom': emp.nom,
          'Email': emp.email,
          'Téléphone': emp.telephone,
          'Fonction': emp.fonction,
          'Département': emp.departement,
          'Date Embauche': emp.date_embauche ? format(new Date(emp.date_embauche), 'dd/MM/yyyy') : '',
          'Type Contrat': emp.type_contrat,
          'Salaire Base': emp.salaire_base,
          'Régime CNSS': emp.regime_cnss,
          'Statut': emp.statut
        }));
        filename = `employes-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
        
      case 'payroll':
        data = cycles.map(cycle => ({
          'Période': cycle.periode,
          'Date Paiement': cycle.date_paiement ? format(new Date(cycle.date_paiement), 'dd/MM/yyyy') : '',
          'Nombre Employés': cycle.nombre_employes,
          'Salaire Brut Total': cycle.salaire_brut_total,
          'Charges Salariales': cycle.charges_salariales_total,
          'Charges Patronales': cycle.charges_patronales_total,
          'Salaire Net Total': cycle.salaire_net_total,
          'Statut': cycle.statut
        }));
        filename = `paie-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
        
      case 'declarations':
        data = declarations.map(decl => ({
          'Numéro': decl.numero_cotisation,
          'Régime': decl.regime,
          'Période': decl.periode,
          'Nombre Employés': decl.nombre_employes,
          'Masse Salariale': decl.masse_salariale,
          'Total CNSS': decl.total_cnss,
          'Total ITS': decl.total_its,
          'Total': decl.total,
          'Date Limite': decl.date_limite ? format(new Date(decl.date_limite), 'dd/MM/yyyy') : '',
          'Statut': decl.statut
        }));
        filename = `declarations-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
        
      case 'holidays':
        data = holidays.map(holiday => {
          const emp = employees.find(e => e.id === holiday.employee_id);
          return {
            'Employé': emp ? `${emp.prenom} ${emp.nom}` : '-',
            'Type': holiday.type_conge,
            'Date Début': holiday.date_debut ? format(new Date(holiday.date_debut), 'dd/MM/yyyy') : '',
            'Date Fin': holiday.date_fin ? format(new Date(holiday.date_fin), 'dd/MM/yyyy') : '',
            'Nombre Jours': holiday.nombre_jours,
            'Statut': holiday.statut,
            'Motif': holiday.motif || ''
          };
        });
        filename = `conges-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
    }
    
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    
    if (exportFormat === 'excel') {
      exportToExcel(data, filename);
    } else {
      exportToCSV(data, filename);
    }
    
    toast.success(`Rapport exporté: ${filename}`);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-[#6366F1]" />
            Exporter un Rapport
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <Label className="text-[#374151] font-semibold mb-2 block">Type de Rapport</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employees">
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>Employés ({employees.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="payroll">
                  <div className="flex items-center gap-2">
                    <span>💰</span>
                    <span>Cycles de Paie ({cycles.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="declarations">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span>Déclarations ({declarations.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="holidays">
                  <div className="flex items-center gap-2">
                    <span>🏖️</span>
                    <span>Congés ({holidays.length})</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-[#374151] font-semibold mb-2 block">Format d'Export</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span>Excel (.xlsx)</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>CSV (.csv)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Card className="bg-gradient-to-r from-[#F7F9FC] to-white border border-[#E5E7EB]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#6366F1] mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0F172A] text-sm">Aperçu</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {reportType === 'employees' && `${employees.length} employés`}
                    {reportType === 'payroll' && `${cycles.length} cycles de paie`}
                    {reportType === 'declarations' && `${declarations.length} déclarations`}
                    {reportType === 'holidays' && `${holidays.length} demandes de congés`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleExport}
            className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}