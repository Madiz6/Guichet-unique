
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, AlertTriangle, Calendar, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PermissionGuard, { usePermission } from "../components/permissions/PermissionGuard";

export default function Visas() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  
  const canManage = usePermission('visas_manage');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ est_etranger: true }),
  });
  
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setShowForm(false);
      setFormData({});
    },
  });
  
  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
    } catch (error) {
      alert('Erreur lors du téléchargement');
    }
    setUploading(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    updateEmployeeMutation.mutate({
      id: formData.employee_id,
      data: formData
    });
  };
  
  const getExpirationStatus = (date) => {
    if (!date) return { status: 'unknown', days: null };
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { status: 'expired', days };
    if (days <= 30) return { status: 'urgent', days };
    if (days <= 90) return { status: 'warning', days };
    return { status: 'valid', days };
  };
  
  return (
    <PermissionGuard permission="visas_view">
      <div className="min-h-screen bg-[#F7F9FC] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon" className="border-[#D3DCE6]">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-[#0A2540]">Gestion Visas & Immigration</h1>
              <p className="text-[#697586]">Gérer les visas et permis de travail</p>
            </div>
            {canManage && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[#0066FF] hover:bg-[#0052CC]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Mettre à jour
              </Button>
            )}
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="border border-[#E8ECF2]">
              <CardContent className="p-6">
                <p className="text-sm text-[#697586] mb-1">Employés étrangers</p>
                <p className="text-3xl font-semibold text-[#0A2540]">{employees.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-[#FFE5E5]">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-[#697586]">Expirations urgentes</p>
                </div>
                <p className="text-3xl font-semibold text-red-600">
                  {employees.filter(emp => {
                    const visaStatus = getExpirationStatus(emp.date_expiration_visa);
                    const permisStatus = getExpirationStatus(emp.date_expiration_permis);
                    return visaStatus.status === 'urgent' || permisStatus.status === 'urgent' ||
                           visaStatus.status === 'expired' || permisStatus.status === 'expired';
                  }).length}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-[#E8ECF2]">
              <CardContent className="p-6">
                <p className="text-sm text-[#697586] mb-1">Documents valides</p>
                <p className="text-3xl font-semibold text-[#00C48C]">
                  {employees.filter(emp => {
                    const visaStatus = getExpirationStatus(emp.date_expiration_visa);
                    const permisStatus = getExpirationStatus(emp.date_expiration_permis);
                    return visaStatus.status === 'valid' && permisStatus.status === 'valid';
                  }).length}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="border border-[#E8ECF2]">
            <div className="p-6 border-b border-[#E8ECF2]">
              <h3 className="text-lg font-semibold text-[#0A2540]">Tous les employés étrangers</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="text-[#425466]">Employé</TableHead>
                    <TableHead className="text-[#425466]">Nationalité</TableHead>
                    <TableHead className="text-[#425466]">N° Visa</TableHead>
                    <TableHead className="text-[#425466]">Expiration Visa</TableHead>
                    <TableHead className="text-[#425466]">N° Permis</TableHead>
                    <TableHead className="text-[#425466]">Expiration Permis</TableHead>
                    <TableHead className="text-[#425466]">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#697586]">
                        Aucun employé étranger
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => {
                      const visaStatus = getExpirationStatus(emp.date_expiration_visa);
                      const permisStatus = getExpirationStatus(emp.date_expiration_permis);
                      const worstStatus = [visaStatus.status, permisStatus.status].includes('expired') ? 'expired' :
                                         [visaStatus.status, permisStatus.status].includes('urgent') ? 'urgent' :
                                         [visaStatus.status, permisStatus.status].includes('warning') ? 'warning' : 'valid';
                      
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium text-[#0A2540]">
                            {emp.prenom} {emp.nom}
                          </TableCell>
                          <TableCell>{emp.nationalite}</TableCell>
                          <TableCell className="font-mono text-sm">{emp.numero_visa || '-'}</TableCell>
                          <TableCell>
                            {emp.date_expiration_visa ? (
                              <div>
                                <p>{format(new Date(emp.date_expiration_visa), 'dd/MM/yyyy')}</p>
                                {visaStatus.days !== null && (
                                  <p className={`text-xs ${
                                    visaStatus.status === 'expired' ? 'text-red-600' :
                                    visaStatus.status === 'urgent' ? 'text-red-600' :
                                    visaStatus.status === 'warning' ? 'text-[#FA6400]' :
                                    'text-[#697586]'
                                  }`}>
                                    {visaStatus.days < 0 ? 'Expiré' : `${visaStatus.days} jours`}
                                  </p>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{emp.numero_permis_travail || '-'}</TableCell>
                          <TableCell>
                            {emp.date_expiration_permis ? (
                              <div>
                                <p>{format(new Date(emp.date_expiration_permis), 'dd/MM/yyyy')}</p>
                                {permisStatus.days !== null && (
                                  <p className={`text-xs ${
                                    permisStatus.status === 'expired' ? 'text-red-600' :
                                    permisStatus.status === 'urgent' ? 'text-red-600' :
                                    permisStatus.status === 'warning' ? 'text-[#FA6400]' :
                                    'text-[#697586]'
                                  }`}>
                                    {permisStatus.days < 0 ? 'Expiré' : `${permisStatus.days} jours`}
                                  </p>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              worstStatus === 'expired' ? 'bg-red-100 text-red-800' :
                              worstStatus === 'urgent' ? 'bg-red-100 text-red-800' :
                              worstStatus === 'warning' ? 'bg-[#FFF4E5] text-[#FA6400]' :
                              'bg-[#E5F8F3] text-[#00C48C]'
                            }`}>
                              {worstStatus === 'expired' ? 'Expiré' :
                               worstStatus === 'urgent' ? 'Urgent' :
                               worstStatus === 'warning' ? 'Attention' : 'Valide'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
        
        {canManage && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl bg-white border-[#E8ECF2]">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#0A2540]">Mettre à jour Visa/Permis</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-[#425466]">Employé *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => {
                      const emp = employees.find(e => e.id === value);
                      setFormData({
                        employee_id: value,
                        numero_visa: emp?.numero_visa || '',
                        date_expiration_visa: emp?.date_expiration_visa || '',
                        numero_permis_travail: emp?.numero_permis_travail || '',
                        date_expiration_permis: emp?.date_expiration_permis || ''
                      });
                    }}
                    required
                  >
                    <SelectTrigger className="border-[#D3DCE6]">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#425466]">Numéro de visa</Label>
                    <Input
                      value={formData.numero_visa || ''}
                      onChange={(e) => setFormData({...formData, numero_visa: e.target.value})}
                      className="border-[#D3DCE6]"
                    />
                  </div>
                  <div>
                    <Label className="text-[#425466]">Date d'expiration visa</Label>
                    <Input
                      type="date"
                      value={formData.date_expiration_visa || ''}
                      onChange={(e) => setFormData({...formData, date_expiration_visa: e.target.value})}
                      className="border-[#D3DCE6]"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-[#425466]">Document visa</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'document_visa_url')}
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="border-[#D3DCE6]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#425466]">Numéro permis de travail</Label>
                    <Input
                      value={formData.numero_permis_travail || ''}
                      onChange={(e) => setFormData({...formData, numero_permis_travail: e.target.value})}
                      className="border-[#D3DCE6]"
                    />
                  </div>
                  <div>
                    <Label className="text-[#425466]">Date d'expiration permis</Label>
                    <Input
                      type="date"
                      value={formData.date_expiration_permis || ''}
                      onChange={(e) => setFormData({...formData, date_expiration_permis: e.target.value})}
                      className="border-[#D3DCE6]"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-[#425466]">Document permis de travail</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'document_permis_url')}
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="border-[#D3DCE6]"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-[#D3DCE6]">
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#0066FF] hover:bg-[#0052CC]">
                    Mettre à jour
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  );
}
