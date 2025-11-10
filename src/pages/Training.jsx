import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, GraduationCap, Award, Calendar, DollarSign, Upload, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Training() {
  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [formData, setFormData] = useState({ status: 'Planifiée', certificate_obtained: false });
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: trainings = [] } = useQuery({
    queryKey: ['trainings'],
    queryFn: () => base44.entities.Training.list('-created_date'),
  });
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Training.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
      setShowForm(false);
      setFormData({ status: 'Planifiée', certificate_obtained: false });
      toast.success('Formation créée avec succès');
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Training.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trainings']);
      setShowForm(false);
      setEditingTraining(null);
      toast.success('Formation mise à jour');
    },
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingTraining) {
      updateMutation.mutate({ id: editingTraining.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const handleCertificateUpload = async (e, trainingId) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingCertificate(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const training = trainings.find(t => t.id === trainingId);
      await updateMutation.mutateAsync({
        id: trainingId,
        data: { ...training, certificate_url: file_url, certificate_obtained: true }
      });
      
      toast.success('Certificat téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingCertificate(false);
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'Planifiée': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Complétée': 'bg-green-100 text-green-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const expiringCertificates = trainings.filter(t => {
    if (!t.expiry_date || t.status !== 'Complétée') return false;
    const daysUntilExpiry = differenceInDays(new Date(t.expiry_date), new Date());
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
              <h1 className="text-3xl font-bold text-[#0F172A]">Formations & Certifications</h1>
              <p className="text-[#64748B] mt-1">Suivi des formations et développement des compétences</p>
            </div>
          </div>
          
          <Button
            onClick={() => {
              setEditingTraining(null);
              setFormData({ status: 'Planifiée', certificate_obtained: false });
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Formation
          </Button>
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
                  <p className="text-sm text-[#64748B]">Total Formations</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{trainings.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">En Cours</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {trainings.filter(t => t.status === 'En cours').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Certificats</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {trainings.filter(t => t.certificate_obtained).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Investissement</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {trainings.reduce((acc, t) => acc + (t.cost || 0), 0).toLocaleString()} DJF
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Expiring Certificates Alert */}
        {expiringCertificates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-l-4 border-yellow-400 bg-yellow-50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">
                      {expiringCertificates.length} certificat(s) expire(nt) bientôt
                    </p>
                    <p className="text-sm text-yellow-700">
                      Planifiez les renouvellements nécessaires
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {/* Trainings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="text-lg font-bold text-[#0F172A]">Toutes les Formations</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="font-semibold">Employé</TableHead>
                    <TableHead className="font-semibold">Formation</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Dates</TableHead>
                    <TableHead className="font-semibold">Coût</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Certificat</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-[#64748B]">
                        Aucune formation
                      </TableCell>
                    </TableRow>
                  ) : (
                    trainings.map((training) => {
                      const employee = employees.find(e => e.id === training.employee_id);
                      return (
                        <TableRow key={training.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                                {employee?.prenom?.[0]}{employee?.nom?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0F172A]">
                                  {employee?.prenom} {employee?.nom}
                                </p>
                                <p className="text-sm text-[#64748B]">{employee?.fonction}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-[#0F172A]">{training.training_name}</p>
                            {training.provider && (
                              <p className="text-sm text-[#64748B]">{training.provider}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-[#374151]">{training.training_type}</TableCell>
                          <TableCell>
                            <p className="text-sm text-[#374151]">
                              {format(new Date(training.start_date), 'dd/MM/yyyy')}
                            </p>
                            {training.end_date && (
                              <p className="text-sm text-[#64748B]">
                                au {format(new Date(training.end_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-[#374151]">
                            {training.cost ? `${training.cost.toLocaleString()} DJF` : '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}>
                              {training.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {training.certificate_obtained ? (
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-green-600" />
                                {training.certificate_url ? (
                                  <a href={training.certificate_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </a>
                                ) : (
                                  <span className="text-xs text-green-600">Obtenu</span>
                                )}
                              </div>
                            ) : training.status === 'Complétée' ? (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleCertificateUpload(e, training.id)}
                                  disabled={uploadingCertificate}
                                />
                                <Button variant="outline" size="sm" asChild>
                                  <span>
                                    <Upload className="w-4 h-4 mr-1" />
                                    Upload
                                  </span>
                                </Button>
                              </label>
                            ) : (
                              <span className="text-xs text-[#64748B]">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTraining(training);
                                setFormData(training);
                                setShowForm(true);
                              }}
                            >
                              Modifier
                            </Button>
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
      
      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingTraining ? 'Modifier la Formation' : 'Nouvelle Formation'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Employé *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({...formData, employee_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
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
                <Label>Nom de la formation *</Label>
                <Input
                  value={formData.training_name || ''}
                  onChange={(e) => setFormData({...formData, training_name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.training_type}
                  onValueChange={(value) => setFormData({...formData, training_type: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certification">Certification</SelectItem>
                    <SelectItem value="Formation interne">Formation interne</SelectItem>
                    <SelectItem value="Formation externe">Formation externe</SelectItem>
                    <SelectItem value="Atelier">Atelier</SelectItem>
                    <SelectItem value="Séminaire">Séminaire</SelectItem>
                    <SelectItem value="E-learning">E-learning</SelectItem>
                    <SelectItem value="Conférence">Conférence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Organisme de formation</Label>
                <Input
                  value={formData.provider || ''}
                  onChange={(e) => setFormData({...formData, provider: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Date de début *</Label>
                <Input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Durée (heures)</Label>
                <Input
                  type="number"
                  value={formData.duration_hours || ''}
                  onChange={(e) => setFormData({...formData, duration_hours: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label>Coût (DJF)</Label>
                <Input
                  type="number"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({...formData, cost: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planifiée">Planifiée</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Complétée">Complétée</SelectItem>
                    <SelectItem value="Annulée">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.status === 'Complétée' && (
                <>
                  <div>
                    <Label>Date de complétion</Label>
                    <Input
                      type="date"
                      value={formData.completion_date || ''}
                      onChange={(e) => setFormData({...formData, completion_date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>Score/Note</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.score || ''}
                      onChange={(e) => setFormData({...formData, score: parseFloat(e.target.value)})}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.certificate_obtained || false}
                      onChange={(e) => setFormData({...formData, certificate_obtained: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label>Certificat obtenu</Label>
                  </div>
                  
                  {formData.certificate_obtained && (
                    <>
                      <div>
                        <Label>Numéro de certificat</Label>
                        <Input
                          value={formData.certificate_number || ''}
                          onChange={(e) => setFormData({...formData, certificate_number: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Date d'expiration</Label>
                        <Input
                          type="date"
                          value={formData.expiry_date || ''}
                          onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            
            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                {editingTraining ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}