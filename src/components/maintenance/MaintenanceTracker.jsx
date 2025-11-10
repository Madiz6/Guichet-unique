
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Wrench, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, FileText, Download, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AssetPerformanceReport from "./AssetPerformanceReport";

export default function MaintenanceTracker({ asset }) {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [recordData, setRecordData] = useState({});
  const [scheduleData, setScheduleData] = useState({});
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenance-records', asset.id],
    queryFn: () => base44.entities.MaintenanceRecord.filter({ asset_id: asset.id }, '-date_maintenance'),
  });

  const { data: maintenanceSchedules = [] } = useQuery({
    queryKey: ['maintenance-schedules', asset.id],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ asset_id: asset.id }),
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases'], // Assuming leases are not asset-specific or filtered elsewhere if needed
    queryFn: () => base44.entities.Lease.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['lease-payments'], // Assuming payments are not asset-specific or filtered elsewhere if needed
    queryFn: () => base44.entities.LeasePayment.list(),
  });

  const createRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRecord.create({
      ...data,
      asset_id: asset.id,
      cout_total: (data.cout_main_oeuvre || 0) + (data.cout_pieces || 0)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance-records', asset.id]);
      setShowRecordForm(false);
      setRecordData({});
      toast.success('Maintenance enregistrée');
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRecord.update(id, {
      ...data,
      cout_total: (data.cout_main_oeuvre || 0) + (data.cout_pieces || 0)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance-records', asset.id]);
      setShowRecordForm(false);
      setEditingRecord(null);
      setRecordData({});
      toast.success('Maintenance mise à jour');
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceSchedule.create({
      ...data,
      asset_id: asset.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance-schedules', asset.id]);
      setShowScheduleForm(false);
      setScheduleData({});
      toast.success('Plan de maintenance créé');
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance-schedules', asset.id]);
      setShowScheduleForm(false);
      setEditingSchedule(null);
      setScheduleData({});
      toast.success('Plan de maintenance mis à jour');
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance-records', asset.id]);
      toast.success('Maintenance supprimée');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance-schedules', asset.id]);
      toast.success('Plan supprimé');
    },
  });

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (showRecordForm) {
        setRecordData({ ...recordData, [field]: file_url });
      }
      toast.success('Document téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };

  const handleRecordSubmit = (e) => {
    e.preventDefault();
    if (editingRecord) {
      updateRecordMutation.mutate({ id: editingRecord.id, data: recordData });
    } else {
      createRecordMutation.mutate(recordData);
    }
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleData });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  // Calculate statistics
  const stats = {
    totalRecords: maintenanceRecords.length,
    totalCost: maintenanceRecords.reduce((sum, r) => sum + (r.cout_total || 0), 0),
    avgCost: maintenanceRecords.length > 0 ? maintenanceRecords.reduce((sum, r) => sum + (r.cout_total || 0), 0) / maintenanceRecords.length : 0,
    lastMaintenance: maintenanceRecords[0]?.date_maintenance || null,
    upcomingSchedules: maintenanceSchedules.filter(s => s.actif && s.prochaine_date).length,
    pendingMaintenance: maintenanceRecords.filter(r => r.statut === 'Planifié' || r.statut === 'En cours').length
  };

  // Chart data for cost over time
  const costOverTimeData = maintenanceRecords
    .slice(0, 12)
    .reverse()
    .map(record => ({
      date: format(new Date(record.date_maintenance), 'MMM yyyy', { locale: fr }),
      cout: record.cout_total || 0,
      type: record.type_maintenance
    }));

  // Maintenance type distribution
  const typeDistribution = maintenanceRecords.reduce((acc, record) => {
    acc[record.type_maintenance] = (acc[record.type_maintenance] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444'];

  const urgencyColors = {
    'Faible': 'bg-blue-100 text-blue-700',
    'Moyenne': 'bg-yellow-100 text-yellow-700',
    'Haute': 'bg-orange-100 text-orange-700',
    'Critique': 'bg-red-100 text-red-700'
  };

  const statusColors = {
    'Planifié': 'bg-blue-100 text-blue-700',
    'En cours': 'bg-orange-100 text-orange-700',
    'Terminé': 'bg-green-100 text-green-700',
    'Annulé': 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Total Maintenances</p>
                <p className="text-2xl font-bold text-[#0F172A]">{stats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Coût Total</p>
                <p className="text-2xl font-bold text-[#10B981]">{stats.totalCost.toLocaleString()} DJF</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Coût Moyen</p>
                <p className="text-2xl font-bold text-[#F59E0B]">{Math.round(stats.avgCost).toLocaleString()} DJF</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Plans Actifs</p>
                <p className="text-2xl font-bold text-[#EC4899]">{stats.upcomingSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="schedules">Planification</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0F172A]">Historique de Maintenance</h3>
              <Button onClick={() => { setShowRecordForm(true); setEditingRecord(null); setRecordData({}); }} className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Maintenance
              </Button>
            </div>

            <CardContent className="p-6">
              {maintenanceRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-16 h-16 text-[#64748B] mx-auto mb-4 opacity-50" />
                  <p className="text-[#64748B] text-lg">Aucun historique de maintenance</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FAFBFC]">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Urgence</TableHead>
                        <TableHead>Coût</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenanceRecords.map((record) => (
                        <TableRow key={record.id} className="hover:bg-[#FAFBFC]">
                          <TableCell className="font-medium">
                            {format(new Date(record.date_maintenance), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.type_maintenance}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                          <TableCell>
                            <Badge className={urgencyColors[record.urgence] || urgencyColors['Moyenne']}>
                              {record.urgence}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-[#0F172A]">
                            {record.cout_total?.toLocaleString()} DJF
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[record.statut] || statusColors['Planifié']}>
                              {record.statut}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingRecord(record);
                                  setRecordData(record);
                                  setShowRecordForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Supprimer cette maintenance?')) {
                                    deleteRecordMutation.mutate(record.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#0F172A]">Plans de Maintenance</h3>
              <Button onClick={() => { setShowScheduleForm(true); setEditingSchedule(null); setScheduleData({}); }} className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Plan
              </Button>
            </div>

            <CardContent className="p-6">
              {maintenanceSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-[#64748B] mx-auto mb-4 opacity-50" />
                  <p className="text-[#64748B] text-lg">Aucun plan de maintenance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceSchedules.map((schedule) => (
                    <Card key={schedule.id} className={`border-2 ${schedule.actif ? 'border-[#6366F1]' : 'border-gray-300'}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-bold text-[#0F172A]">{schedule.nom_plan}</h4>
                              <Badge variant={schedule.actif ? "default" : "secondary"}>
                                {schedule.actif ? 'Actif' : 'Inactif'}
                              </Badge>
                              <Badge variant="outline">{schedule.frequence}</Badge>
                            </div>

                            <p className="text-sm text-[#64748B] mb-3">{schedule.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-[#64748B]">Type:</p>
                                <p className="font-medium text-[#0F172A]">{schedule.type_maintenance}</p>
                              </div>
                              <div>
                                <p className="text-[#64748B]">Prochaine Date:</p>
                                <p className="font-medium text-[#0F172A]">
                                  {schedule.prochaine_date ? format(new Date(schedule.prochaine_date), 'dd/MM/yyyy') : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#64748B]">Coût Estimé:</p>
                                <p className="font-medium text-[#10B981]">{schedule.cout_estime?.toLocaleString() || 0} DJF</p>
                              </div>
                              <div>
                                <p className="text-[#64748B]">Fournisseur:</p>
                                <p className="font-medium text-[#0F172A]">{schedule.fournisseur_prefere || 'N/A'}</p>
                              </div>
                            </div>

                            {schedule.compteur_type && schedule.compteur_type !== 'N/A' && (
                              <div className="mt-4 p-3 bg-[#F7F9FC] rounded-lg">
                                <p className="text-sm text-[#64748B] mb-1">Compteur: {schedule.compteur_type}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-[#E5E7EB] rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] h-2 rounded-full"
                                      style={{ width: `${Math.min(((schedule.compteur_actuel || 0) / schedule.compteur_intervalle) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-[#0F172A]">
                                    {schedule.compteur_actuel || 0} / {schedule.compteur_intervalle}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingSchedule(schedule);
                                setScheduleData(schedule);
                                setShowScheduleForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                if (confirm('Supprimer ce plan?')) {
                                  deleteScheduleMutation.mutate(schedule.id);
                                }
                              }}
                              className="text-red-600 border-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <AssetPerformanceReport 
            asset={asset}
            maintenanceRecords={maintenanceRecords}
            leases={leases}
            payments={payments}
          />
        </TabsContent>
      </Tabs>

      {/* Maintenance Record Form Dialog */}
      <Dialog open={showRecordForm} onOpenChange={setShowRecordForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Modifier' : 'Nouvelle'} Maintenance</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de maintenance *</Label>
                <Select
                  value={recordData.type_maintenance || ''}
                  onValueChange={(value) => setRecordData({...recordData, type_maintenance: value})}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Réparation">Réparation</SelectItem>
                    <SelectItem value="Maintenance préventive">Maintenance préventive</SelectItem>
                    <SelectItem value="Inspection">Inspection</SelectItem>
                    <SelectItem value="Nettoyage">Nettoyage</SelectItem>
                    <SelectItem value="Mise à niveau">Mise à niveau</SelectItem>
                    <SelectItem value="Remplacement de pièce">Remplacement de pièce</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date de maintenance *</Label>
                <Input
                  type="date"
                  value={recordData.date_maintenance || ''}
                  onChange={(e) => setRecordData({...recordData, date_maintenance: e.target.value})}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Urgence</Label>
                <Select
                  value={recordData.urgence || 'Moyenne'}
                  onValueChange={(value) => setRecordData({...recordData, urgence: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Faible">Faible</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Haute">Haute</SelectItem>
                    <SelectItem value="Critique">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Statut</Label>
                <Select
                  value={recordData.statut || 'Planifié'}
                  onValueChange={(value) => setRecordData({...recordData, statut: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planifié">Planifié</SelectItem>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminé">Terminé</SelectItem>
                    <SelectItem value="Annulé">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Description *</Label>
                <Textarea
                  value={recordData.description || ''}
                  onChange={(e) => setRecordData({...recordData, description: e.target.value})}
                  required
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Coût Main d'Œuvre (DJF)</Label>
                <Input
                  type="number"
                  value={recordData.cout_main_oeuvre || ''}
                  onChange={(e) => setRecordData({...recordData, cout_main_oeuvre: parseFloat(e.target.value) || 0})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Coût Pièces (DJF)</Label>
                <Input
                  type="number"
                  value={recordData.cout_pieces || ''}
                  onChange={(e) => setRecordData({...recordData, cout_pieces: parseFloat(e.target.value) || 0})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Fournisseur/Technicien</Label>
                <Input
                  value={recordData.fournisseur || ''}
                  onChange={(e) => setRecordData({...recordData, fournisseur: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Contact</Label>
                <Input
                  value={recordData.contact_fournisseur || ''}
                  onChange={(e) => setRecordData({...recordData, contact_fournisseur: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div className="col-span-2">
                <Label>Facture</Label>
                <Input
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'facture_url')}
                  disabled={uploading}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowRecordForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                {editingRecord ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Schedule Form Dialog */}
      <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Modifier' : 'Nouveau'} Plan de Maintenance</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom du plan *</Label>
                <Input
                  value={scheduleData.nom_plan || ''}
                  onChange={(e) => setScheduleData({...scheduleData, nom_plan: e.target.value})}
                  required
                  placeholder="Ex: Révision Trimestrielle"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Type de maintenance *</Label>
                <Select
                  value={scheduleData.type_maintenance || ''}
                  onValueChange={(value) => setScheduleData({...scheduleData, type_maintenance: value})}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maintenance préventive">Maintenance préventive</SelectItem>
                    <SelectItem value="Inspection">Inspection</SelectItem>
                    <SelectItem value="Nettoyage">Nettoyage</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fréquence *</Label>
                <Select
                  value={scheduleData.frequence || ''}
                  onValueChange={(value) => setScheduleData({...scheduleData, frequence: value})}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="Mensuelle">Mensuelle</SelectItem>
                    <SelectItem value="Trimestrielle">Trimestrielle</SelectItem>
                    <SelectItem value="Semestrielle">Semestrielle</SelectItem>
                    <SelectItem value="Annuelle">Annuelle</SelectItem>
                    <SelectItem value="Basée sur compteur">Basée sur compteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleData.frequence === 'Basée sur compteur' && (
                <>
                  <div>
                    <Label>Type de compteur</Label>
                    <Select
                      value={scheduleData.compteur_type || ''}
                      onValueChange={(value) => setScheduleData({...scheduleData, compteur_type: value})}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kilomètres">Kilomètres</SelectItem>
                        <SelectItem value="Heures d'utilisation">Heures d'utilisation</SelectItem>
                        <SelectItem value="Nombre d'utilisations">Nombre d'utilisations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Intervalle du compteur</Label>
                    <Input
                      type="number"
                      value={scheduleData.compteur_intervalle || ''}
                      onChange={(e) => setScheduleData({...scheduleData, compteur_intervalle: parseInt(e.target.value)})}
                      placeholder="Ex: 5000"
                      className="mt-2"
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Prochaine date</Label>
                <Input
                  type="date"
                  value={scheduleData.prochaine_date || ''}
                  onChange={(e) => setScheduleData({...scheduleData, prochaine_date: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Coût estimé (DJF)</Label>
                <Input
                  type="number"
                  value={scheduleData.cout_estime || ''}
                  onChange={(e) => setScheduleData({...scheduleData, cout_estime: parseFloat(e.target.value)})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Fournisseur préféré</Label>
                <Input
                  value={scheduleData.fournisseur_prefere || ''}
                  onChange={(e) => setScheduleData({...scheduleData, fournisseur_prefere: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Email pour rappels</Label>
                <Input
                  type="email"
                  value={scheduleData.email_rappel || ''}
                  onChange={(e) => setScheduleData({...scheduleData, email_rappel: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={scheduleData.description || ''}
                  onChange={(e) => setScheduleData({...scheduleData, description: e.target.value})}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="actif"
                  checked={scheduleData.actif !== false}
                  onChange={(e) => setScheduleData({...scheduleData, actif: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="actif" className="cursor-pointer">Plan actif</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowScheduleForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                {editingSchedule ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
