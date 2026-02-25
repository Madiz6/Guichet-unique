import React, { useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Building2, Users, DollarSign, FileText, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, MapPin, Edit, Send, Download, Eye, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import PermissionGuard from "../components/permissions/PermissionGuard";
import MaintenanceTracker from "../components/maintenance/MaintenanceTracker";
import { registerLeasePaymentTransaction } from "../components/transactions/autoTransactions";

export default function Leasing() {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLease, setEditingLease] = useState(null);
  const [assetData, setAssetData] = useState({});
  const [leaseData, setLeaseData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewingAssetMaintenance, setViewingAssetMaintenance] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null); // { payment, lease, asset }
  const [paymentForm, setPaymentForm] = useState({ methode: '', numero_cheque: '', cheque_url: '', uploadingCheque: false });
  
  const queryClient = useQueryClient();
  
  const { data: assets = [] } = useQuery({
    queryKey: ['lease-assets'],
    queryFn: () => base44.entities.LeaseAsset.list(),
  });
  
  const { data: leases = [] } = useQuery({
    queryKey: ['leases'],
    queryFn: () => base44.entities.Lease.list('-date_debut'),
  });
  
  const { data: payments = [] } = useQuery({
    queryKey: ['lease-payments'],
    queryFn: () => base44.entities.LeasePayment.list('-date_echeance'),
  });
  
  const { data: invoices = [] } = useQuery({
    queryKey: ['lease-invoices'],
    queryFn: () => base44.entities.LeaseInvoice.list('-date_emission'),
  });
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  const isAdmin = user?.role === 'admin';
  
  // Mutations for assets
  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaseAsset.create({
      ...data,
      reference: `ASSET-${Date.now()}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['lease-assets']);
      setShowAssetForm(false);
      setAssetData({});
      toast.success('Actif ajouté');
    },
  });
  
  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaseAsset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lease-assets']);
      setShowAssetForm(false);
      setEditingAsset(null);
      setAssetData({});
      toast.success('Actif mis à jour');
    },
  });
  
  // Mutations for leases
  const createLeaseMutation = useMutation({
    mutationFn: (data) => base44.entities.Lease.create({
      ...data,
      numero_contrat: `LEASE-${Date.now()}`
    }),
    onSuccess: async (newLease) => {
      // Update asset status to occupied
      const asset = assets.find(a => a.id === newLease.asset_id);
      if (asset) {
        await base44.entities.LeaseAsset.update(asset.id, { ...asset, statut: 'Occupé' });
      }
      
      // Generate monthly payments for the lease
      const startDate = new Date(newLease.date_debut);
      const endDate = newLease.date_fin ? new Date(newLease.date_fin) : addMonths(startDate, 12); // Default to 1 year if no end date
      
      const paymentsToCreate = [];
      let currentPaymentDate = startOfMonth(startDate); // Start generation from the beginning of the start month

      while (currentPaymentDate <= endDate) {
        const dueDate = new Date(currentPaymentDate.getFullYear(), currentPaymentDate.getMonth(), 5); // Due on 5th of each month

        // Stop generating if the due date is past the lease end date
        if (dueDate > endDate) {
          break;
        }
        
        paymentsToCreate.push({
          lease_id: newLease.id,
          periode: format(currentPaymentDate, 'MMMM yyyy', { locale: fr }), // e.g., "Janvier 2024"
          mois_annee: format(currentPaymentDate, 'yyyyMM'), // e.g., "202401" for easier sorting/filtering
          montant: newLease.montant_mensuel,
          date_echeance: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
          statut: 'En attente'
        });
        
        currentPaymentDate = addMonths(currentPaymentDate, 1); // Move to the next month
      }
      
      // Create all payments
      if (paymentsToCreate.length > 0) {
        await base44.entities.LeasePayment.bulkCreate(paymentsToCreate);
      }
      
      queryClient.invalidateQueries(['leases']);
      queryClient.invalidateQueries(['lease-assets']);
      queryClient.invalidateQueries(['lease-payments']); // Invalidate payments as new lease means new potential payments
      setShowLeaseForm(false);
      setLeaseData({});
      toast.success('Contrat créé et paiements générés');
    },
  });
  
  const updateLeaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lease.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leases']);
      setShowLeaseForm(false);
      setEditingLease(null);
      setLeaseData({});
      toast.success('Contrat mis à jour');
    },
  });
  
  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (showAssetForm) {
        setAssetData({ ...assetData, [field]: file_url });
      } else if (showLeaseForm) {
        setLeaseData({ ...leaseData, [field]: file_url });
      }
      toast.success('Document téléchargé');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      let errorMessage = 'Erreur lors du téléchargement du document.';
      if (error && error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error && error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    }
    setUploading(false);
  };
  
  const handleAssetSubmit = (e) => {
    e.preventDefault();
    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, data: assetData });
    } else {
      createAssetMutation.mutate(assetData);
    }
  };
  
  const handleLeaseSubmit = (e) => {
    e.preventDefault();
    if (editingLease) {
      updateLeaseMutation.mutate({ id: editingLease.id, data: leaseData });
    } else {
      createLeaseMutation.mutate(leaseData);
    }
  };

  const handleSendPaymentLink = async (paymentId, leaseId, sendReminder) => {
    try {
      const { data } = await base44.functions.invoke('createPaymentLink', {
        payment_id: paymentId,
        lease_id: leaseId,
        send_reminder: sendReminder
      });
      
      if (data.email_sent) {
        toast.success(data.message);
      } else {
        toast.warning(data.message || 'Lien créé mais email non envoyé');
      }
      
      queryClient.invalidateQueries(['lease-payments']);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error?.response?.data?.error || 'Erreur lors de l\'envoi du lien');
    }
  };

  const sendPaymentReminderSMS = async (paymentId) => {
    try {
      await base44.functions.invoke('sendPaymentReminderSMS', { payment_id: paymentId });
      toast.success('Rappel SMS envoyé'); // Updated message
      queryClient.invalidateQueries(['lease-payments']);
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error(error?.response?.data?.error || 'Erreur lors de l\'envoi du SMS');
    }
  };
  
  // Calculate statistics
  const stats = {
    totalAssets: assets.length,
    occupied: assets.filter(a => a.statut === 'Occupé').length,
    available: assets.filter(a => a.statut === 'Disponible').length,
    activeLeases: leases.filter(l => l.statut === 'Actif').length,
    monthlyRevenue: leases.filter(l => l.statut === 'Actif').reduce((sum, l) => sum + (l.montant_mensuel || 0), 0),
    pendingPayments: payments.filter(p => p.statut === 'En attente').length,
    overduePayments: payments.filter(p => p.statut === 'En retard').length,
  };
  
  const occupancyRate = stats.totalAssets > 0 ? ((stats.occupied / stats.totalAssets) * 100).toFixed(1) : 0;
  
  // Asset type distribution
  const assetTypeData = assets.reduce((acc, asset) => {
    acc[asset.type_actif] = (acc[asset.type_actif] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = Object.entries(assetTypeData).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
  
  // Filter leases
  const filteredLeases = leases.filter(lease => {
    const statusMatch = filterStatus === 'all' || lease.statut === filterStatus;
    const typeMatch = filterType === 'all' || assets.find(a => a.id === lease.asset_id)?.type_actif === filterType;
    return statusMatch && typeMatch;
  });
  
  const statusIcons = {
    'Actif': { icon: CheckCircle, color: 'green' },
    'Expiré': { icon: XCircle, color: 'red' },
    'Résilié': { icon: XCircle, color: 'gray' },
    'En attente': { icon: Clock, color: 'orange' }
  };
  
  const assetStatusIcons = {
    'Disponible': { icon: CheckCircle, color: 'green' },
    'Occupé': { icon: Users, color: 'blue' },
    'En maintenance': { icon: AlertTriangle, color: 'orange' },
    'Indisponible': { icon: XCircle, color: 'red' }
  };
  
  return (
    <PermissionGuard permission="company_view">
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" size="icon" className="border-[#D3DCE6]">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#0F172A]">Gestion de Location</h1>
                <p className="text-[#64748B] mt-1">Bureaux, Espaces & Équipements</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowAssetForm(true); setEditingAsset(null); setAssetData({}); }}>
                <Building2 className="w-4 h-4 mr-2" />
                Nouvel Actif
              </Button>
              <Button onClick={() => { setShowLeaseForm(true); setEditingLease(null); setLeaseData({}); }} className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Contrat
              </Button>
            </div>
          </motion.div>
          
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#0F172A]">{occupancyRate}%</p>
                    <p className="text-xs text-[#64748B] mt-1">Taux d'occupation</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Occupé:</span>
                  <span className="font-semibold text-[#0F172A]">{stats.occupied}/{stats.totalAssets}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <Badge className="bg-green-100 text-green-600">Mensuel</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Revenus Locatifs</p>
                <p className="text-2xl font-bold text-green-600">{stats.monthlyRevenue.toLocaleString()} DJF</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <Badge className="bg-blue-100 text-blue-600">{stats.activeLeases}</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Contrats Actifs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.activeLeases}</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <Badge className="bg-orange-100 text-orange-600">{stats.pendingPayments + stats.overduePayments}</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Paiements en attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingPayments + stats.overduePayments}</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <Tabs defaultValue="assets" className="space-y-6">
            <TabsList className="bg-white border border-[#E5E7EB] p-1">
              <TabsTrigger value="assets">Actifs</TabsTrigger>
              <TabsTrigger value="leases">Contrats</TabsTrigger>
              <TabsTrigger value="payments">Paiements</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            </TabsList>
            
            {/* Assets Tab */}
            <TabsContent value="assets">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b border-[#E5E7EB]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#0F172A]">Liste des Actifs</h3>
                      <div className="flex gap-3">
                        <Select value={filterType} onValueChange={setFilterType}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les types</SelectItem>
                            <SelectItem value="Bureau privé">Bureau privé</SelectItem>
                            <SelectItem value="Espace coworking">Espace coworking</SelectItem>
                            <SelectItem value="Salle de réunion">Salle de réunion</SelectItem>
                            <SelectItem value="Véhicule">Véhicule</SelectItem>
                            <SelectItem value="Équipement">Équipement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {assets.filter(a => filterType === 'all' || a.type_actif === filterType).map((asset) => {
                      const statusConfig = assetStatusIcons[asset.statut] || assetStatusIcons['Disponible'];
                      const StatusIcon = statusConfig.icon;
                      const activeLeaseForAsset = leases.find(l => l.id === asset.lease_id && l.statut === 'Actif');
                      
                      return (
                        <motion.div
                          key={asset.id}
                          whileHover={{ y: -4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className="border-0 shadow-md hover:shadow-xl transition-all h-full">
                            <CardContent className="p-6">
                              {asset.photo_url && (
                                <img 
                                  src={asset.photo_url} 
                                  alt={asset.nom}
                                  className="w-full h-40 object-cover rounded-lg mb-4"
                                />
                              )}
                              
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-bold text-[#0F172A] text-lg">{asset.nom}</h4>
                                  <p className="text-sm text-[#64748B]">{asset.type_actif}</p>
                                </div>
                                <Badge className={`${
                                  statusConfig.color === 'green' ? 'bg-green-100 text-green-600' :
                                  statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                  statusConfig.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {asset.statut}
                                </Badge>
                              </div>
                              
                              {asset.localisation && (
                                <div className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
                                  <MapPin className="w-4 h-4" />
                                  {asset.localisation}
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                                {asset.surface_m2 && (
                                  <div className="bg-[#F8FAFC] p-2 rounded">
                                    <p className="text-[#64748B] text-xs">Surface</p>
                                    <p className="font-semibold text-[#0F172A]">{asset.surface_m2} m²</p>
                                  </div>
                                )}
                                {asset.capacite && (
                                  <div className="bg-[#F8FAFC] p-2 rounded">
                                    <p className="text-[#64748B] text-xs">Capacité</p>
                                    <p className="font-semibold text-[#0F172A]">{asset.capacite} pers.</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="border-t border-[#E5E7EB] pt-4 mb-4">
                                <p className="text-2xl font-bold text-[#6366F1]">{asset.tarif_mensuel.toLocaleString()} DJF</p>
                                <p className="text-xs text-[#64748B]">par mois</p>
                              </div>
                              
                              {activeLeaseForAsset && (
                                <div className="bg-[#6366F1]/10 rounded-lg p-3 mb-4">
                                  <p className="text-xs text-[#64748B] mb-1">Locataire actuel</p>
                                  <p className="font-semibold text-[#0F172A] text-sm">{activeLeaseForAsset.locataire_nom}</p>
                                  {activeLeaseForAsset.locataire_entreprise && (
                                    <p className="text-xs text-[#64748B]">{activeLeaseForAsset.locataire_entreprise}</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditingAsset(asset);
                                    setAssetData(asset);
                                    setShowAssetForm(true);
                                  }}
                                  className="flex-1 border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10"
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Modifier
                                </Button>
                                {asset.statut === 'Disponible' && (
                                  <Button 
                                    size="sm"
                                    onClick={() => {
                                      setLeaseData({ asset_id: asset.id, montant_mensuel: asset.tarif_mensuel });
                                      setShowLeaseForm(true);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
                                  >
                                    Louer
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            </TabsContent>
            
            {/* Leases Tab */}
            <TabsContent value="leases">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b border-[#E5E7EB]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#0F172A]">Contrats de Location</h3>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous statuts</SelectItem>
                          <SelectItem value="Actif">Actif</SelectItem>
                          <SelectItem value="Expiré">Expiré</SelectItem>
                          <SelectItem value="Résilié">Résilié</SelectItem>
                          <SelectItem value="En attente">En attente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#FAFBFC]">
                          <TableHead className="font-semibold text-[#374151]">N° Contrat</TableHead>
                          <TableHead className="font-semibold text-[#374151]">Actif</TableHead>
                          <TableHead className="font-semibold text-[#374151]">Locataire</TableHead>
                          <TableHead className="font-semibold text-[#374151]">Période</TableHead>
                          <TableHead className="font-semibold text-[#374151]">Montant Mensuel</TableHead>
                          <TableHead className="font-semibold text-[#374151]">Statut</TableHead>
                          <TableHead className="font-semibold text-[#374151]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeases.map((lease) => {
                          const asset = assets.find(a => a.id === lease.asset_id);
                          const statusConfig = statusIcons[lease.statut] || statusIcons['En attente'];
                          const StatusIcon = statusConfig.icon;
                          
                          return (
                            <TableRow key={lease.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                              <TableCell className="font-mono text-sm">{lease.numero_contrat}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-[#0F172A]">{asset?.nom || 'N/A'}</p>
                                  <p className="text-xs text-[#64748B]">{asset?.type_actif}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-[#0F172A]">{lease.locataire_nom}</p>
                                  {lease.locataire_entreprise && (
                                    <p className="text-xs text-[#64748B]">{lease.locataire_entreprise}</p>
                                  )}
                                  <p className="text-xs text-[#64748B]">{lease.locataire_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="text-[#0F172A]">{format(new Date(lease.date_debut), 'dd/MM/yyyy')}</p>
                                  {lease.date_fin && (
                                    <p className="text-[#64748B]">au {format(new Date(lease.date_fin), 'dd/MM/yyyy')}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-[#0F172A]">
                                {lease.montant_mensuel.toLocaleString()} DJF
                              </TableCell>
                              <TableCell>
                                <Badge className={`flex items-center gap-1 w-fit ${
                                  statusConfig.color === 'green' ? 'bg-green-100 text-green-600' :
                                  statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                  statusConfig.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {lease.statut}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingLease(lease);
                                      setLeaseData(lease);
                                      setShowLeaseForm(true);
                                    }}
                                    className="text-[#6366F1] hover:bg-[#6366F1]/10"
                                    title="Voir les détails"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingLease(lease);
                                      setLeaseData(lease);
                                      setShowLeaseForm(true);
                                    }}
                                    className="text-[#6366F1] hover:bg-[#6366F1]/10"
                                    title="Modifier"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  {lease.contrat_url && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      asChild
                                      className="text-[#64748B] hover:bg-[#F8FAFC]"
                                      title="Télécharger le contrat"
                                    >
                                      <a href={lease.contrat_url} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>
            
            {/* Payments Tab */}
            <TabsContent value="payments">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b border-[#E5E7EB]">
                    <h3 className="text-xl font-bold text-[#0F172A]">Suivi des Paiements</h3>
                    <p className="text-sm text-[#64748B] mt-1">Gérer les paiements mensuels et envoyer des rappels</p>
                  </div>
                  
                  <CardContent className="p-6">
                    {payments.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-[#64748B] mx-auto mb-4 opacity-50" />
                        <p className="text-[#64748B] text-lg">Aucun paiement en attente ou effectué</p>
                        <p className="text-sm text-[#94A3B8] mt-2">
                         Les paiements seront générés automatiquement après la création des contrats de location.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {payments.map((payment) => {
                          const lease = leases.find(l => l.id === payment.lease_id);
                          const asset = assets.find(a => a.id === lease?.asset_id);
                          const isOverdue = new Date(payment.date_echeance) < new Date() && payment.statut !== 'Payé';
                          
                          return (
                            <motion.div
                              key={payment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-lg border-2 ${
                                payment.statut === 'Payé' ? 'border-green-200 bg-green-50' :
                                isOverdue ? 'border-red-200 bg-red-50' :
                                'border-[#E5E7EB] bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                  {/* Status Icon */}
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    payment.statut === 'Payé' ? 'bg-green-500' :
                                    isOverdue ? 'bg-red-500' :
                                    'bg-orange-500'
                                  }`}>
                                    {payment.statut === 'Payé' ? (
                                      <CheckCircle className="w-6 h-6 text-white" />
                                    ) : isOverdue ? (
                                      <AlertTriangle className="w-6 h-6 text-white" />
                                    ) : (
                                      <Clock className="w-6 h-6 text-white" />
                                    )}
                                  </div>
                                  
                                  {/* Payment Details */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-[#0F172A]">{asset?.nom || 'N/A'}</h4>
                                      <Badge variant="outline">{payment.periode}</Badge>
                                    </div>
                                    <p className="text-sm text-[#64748B]">
                                      {lease?.locataire_nom} {lease?.locataire_entreprise && `(${lease.locataire_entreprise})`}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                      <span className="text-[#64748B]">
                                        Échéance: <span className={isOverdue && payment.statut !== 'Payé' ? 'text-red-600 font-semibold' : 'text-[#0F172A]'}>
                                          {format(new Date(payment.date_echeance), 'dd MMM yyyy', { locale: fr })}
                                        </span>
                                      </span>
                                      {payment.statut === 'Payé' && payment.date_paiement && (
                                        <span className="text-green-600">
                                          Payé le {format(new Date(payment.date_paiement), 'dd MMM yyyy', { locale: fr })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Amount */}
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-[#0F172A]">
                                      {payment.montant.toLocaleString()} DJF
                                    </p>
                                    {payment.methode_paiement && (
                                      <Badge variant="outline" className="mt-1">
                                        {payment.methode_paiement}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-2 ml-4">
                                  {payment.statut === 'Payé' ? (
                                    <>
                                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Payé
                                      </Badge>
                                      {payment.recu_html && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async () => {
                                            // Create a blob from HTML and download
                                            const blob = new Blob([payment.recu_html], { type: 'text/html' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `Recu-${payment.numero_recu}.html`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                          }}
                                          className="border-green-300 text-green-600 hover:bg-green-50"
                                        >
                                          <Download className="w-4 h-4 mr-1" />
                                          Reçu
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* Email Payment Link */}
                                      {!payment.lien_paiement && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleSendPaymentLink(payment.id, payment.lease_id, false)}
                                          className="border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10"
                                          title="Envoyer le lien de paiement par email"
                                        >
                                          <Mail className="w-4 h-4 mr-1" />
                                          Lien Email
                                        </Button>
                                      )}

                                      {/* Reminder Email - Only if link was already sent */}
                                      {payment.lien_paiement && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleSendPaymentLink(payment.id, payment.lease_id, true)}
                                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                                          title="Envoyer un rappel email urgent"
                                        >
                                          <Mail className="w-4 h-4 mr-1" />
                                          Rappel Email
                                        </Button>
                                      )}
                                      
                                      {/* SMS Reminder (No Payment Link) */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => sendPaymentReminderSMS(payment.id)}
                                        className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                                        title="Envoyer un rappel SMS"
                                      >
                                        <Send className="w-4 h-4 mr-1" />
                                        Rappel SMS
                                      </Button>
                                      
                                      {isAdmin && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const leaseTmp = leases.find(l => l.id === payment.lease_id);
                                            const assetTmp = assets.find(a => a.id === leaseTmp?.asset_id);
                                            setPaymentDialog({ payment, lease: leaseTmp, asset: assetTmp });
                                            setPaymentForm({ methode: '', numero_cheque: '', cheque_url: '', uploadingCheque: false });
                                          }}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                          title="Marquer comme payé manuellement"
                                        >
                                          <DollarSign className="w-4 h-4 mr-1" />
                                          Marquer payé
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {payment.lien_paiement && payment.date_envoi_lien && payment.statut !== 'Payé' && (
                                <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-sm">
                                  <span className="text-[#64748B]">
                                    Lien envoyé le {format(new Date(payment.date_envoi_lien), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                    {payment.rappel_envoye && <Badge variant="outline" className="ml-2">Rappel envoyé</Badge>}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      navigator.clipboard.writeText(payment.lien_paiement);
                                      toast.success('Lien copié');
                                    }}
                                    className="text-[#6366F1]"
                                  >
                                    Copier le lien
                                  </Button>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* NEW: Maintenance Tab */}
            <TabsContent value="maintenance">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {viewingAssetMaintenance ? (
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setViewingAssetMaintenance(null)}
                        className="border-[#D3DCE6]"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">
                          Maintenance - {viewingAssetMaintenance.nom}
                        </h2>
                        <p className="text-sm text-[#64748B]">{viewingAssetMaintenance.type_actif}</p>
                      </div>
                    </div>
                    <MaintenanceTracker asset={viewingAssetMaintenance} />
                  </div>
                ) : (
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB]">
                      <h3 className="text-xl font-bold text-[#0F172A]">Gestion de Maintenance</h3>
                      <p className="text-sm text-[#64748B] mt-1">Sélectionnez un actif pour gérer sa maintenance</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                      {assets.map((asset) => (
                        <Card 
                          key={asset.id} 
                          className="border border-[#E5E7EB] hover:shadow-lg transition-all cursor-pointer"
                          onClick={() => setViewingAssetMaintenance(asset)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-[#0F172A]">{asset.nom}</h4>
                              <Badge variant="outline">{asset.type_actif}</Badge>
                            </div>
                            <p className="text-sm text-[#64748B] mb-3">{asset.localisation || 'N/A'}</p>
                            <Button size="sm" className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                              Gérer la Maintenance
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </Card>
                )}
              </motion.div>
            </TabsContent>
            
            {/* Overview Tab */}
            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Occupancy Chart */}
                <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b border-[#E5E7EB]">
                    <h3 className="text-lg font-bold text-[#0F172A]">Répartition des Actifs</h3>
                    <p className="text-sm text-[#64748B] mt-1">Par type</p>
                  </div>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      {pieData.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#0F172A] truncate">{item.name}</p>
                            <p className="text-xs text-[#64748B]">{item.value} actifs</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Revenue Overview */}
                <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b border-[#E5E7EB]">
                    <h3 className="text-lg font-bold text-[#0F172A]">Aperçu Financier</h3>
                    <p className="text-sm text-[#64748B] mt-1">Performance locative</p>
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-[#64748B]">Revenus Mensuels</p>
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-green-600">{stats.monthlyRevenue.toLocaleString()} DJF</p>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-[#64748B]">Revenus Annuels Projetés</p>
                          <DollarSign className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{(stats.monthlyRevenue * 12).toLocaleString()} DJF</p>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-[#64748B]">Taux d'Occupation</p>
                          <Building2 className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-2xl font-bold text-purple-600">{occupancyRate}%</p>
                          <div className="flex-1">
                            <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${occupancyRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Asset Form Dialog */}
        <Dialog open={showAssetForm} onOpenChange={setShowAssetForm}>
          <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl text-[#0F172A] flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                {editingAsset ? 'Modifier l\'Actif' : 'Nouvel Actif'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAssetSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Nom de l'actif *</Label>
                  <Input
                    value={assetData.nom || ''}
                    onChange={(e) => setAssetData({...assetData, nom: e.target.value})}
                    required
                    placeholder="Ex: Bureau 101"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Type d'actif *</Label>
                  <Select
                    value={assetData.type_actif || ''}
                    onValueChange={(value) => setAssetData({...assetData, type_actif: value})}
                    required
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bureau privé">Bureau privé</SelectItem>
                      <SelectItem value="Espace coworking">Espace coworking</SelectItem>
                      <SelectItem value="Salle de réunion">Salle de réunion</SelectItem>
                      <SelectItem value="Véhicule">Véhicule</SelectItem>
                      <SelectItem value="Équipement">Équipement</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Statut *</Label>
                  <Select
                    value={assetData.statut || 'Disponible'}
                    onValueChange={(value) => setAssetData({...assetData, statut: value})}
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Occupé">Occupé</SelectItem>
                      <SelectItem value="En maintenance">En maintenance</SelectItem>
                      <SelectItem value="Indisponible">Indisponible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Localisation</Label>
                  <Input
                    value={assetData.localisation || ''}
                    onChange={(e) => setAssetData({...assetData, localisation: e.target.value})}
                    placeholder="Ex: 2ème étage, Bâtiment A"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Surface (m²)</Label>
                  <Input
                    type="number"
                    value={assetData.surface_m2 || ''}
                    onChange={(e) => setAssetData({...assetData, surface_m2: parseFloat(e.target.value)})}
                    placeholder="Ex: 25"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Capacité (personnes)</Label>
                  <Input
                    type="number"
                    value={assetData.capacite || ''}
                    onChange={(e) => setAssetData({...assetData, capacite: parseInt(e.target.value)})}
                    placeholder="Ex: 4"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Tarif mensuel (DJF) *</Label>
                  <Input
                    type="number"
                    value={assetData.tarif_mensuel || ''}
                    onChange={(e) => setAssetData({...assetData, tarif_mensuel: parseFloat(e.target.value)})}
                    required
                    placeholder="Ex: 150000"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Tarif journalier (DJF)</Label>
                  <Input
                    type="number"
                    value={assetData.tarif_journalier || ''}
                    onChange={(e) => setAssetData({...assetData, tarif_journalier: parseFloat(e.target.value)})}
                    placeholder="Ex: 7000"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Description</Label>
                  <Textarea
                    value={assetData.description || ''}
                    onChange={(e) => setAssetData({...assetData, description: e.target.value})}
                    placeholder="Description détaillée de l'actif..."
                    rows={3}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Photo</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'photo_url')}
                    disabled={uploading}
                    accept="image/*"
                    className="border-[#D1D5DB] mt-2"
                  />
                  {assetData.photo_url && (
                    <img src={assetData.photo_url} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
                  )}
                </div>
                
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Notes</Label>
                  <Textarea
                    value={assetData.notes || ''}
                    onChange={(e) => setAssetData({...assetData, notes: e.target.value})}
                    placeholder="Notes additionnelles..."
                    rows={2}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button type="button" variant="outline" onClick={() => { setShowAssetForm(false); setEditingAsset(null); setAssetData({}); }} className="border-[#D1D5DB]">
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]" disabled={createAssetMutation.isLoading || updateAssetMutation.isLoading}>
                  {editingAsset ? 'Mettre à jour' : 'Créer l\'Actif'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Lease Form Dialog */}
        <Dialog open={showLeaseForm} onOpenChange={setShowLeaseForm}>
          <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl text-[#0F172A] flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                {editingLease ? 'Modifier le Contrat' : 'Nouveau Contrat de Location'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleLeaseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Actif à louer *</Label>
                  <Select
                    value={leaseData.asset_id || ''}
                    onValueChange={(value) => {
                      const asset = assets.find(a => a.id === value);
                      setLeaseData({
                        ...leaseData, 
                        asset_id: value,
                        montant_mensuel: asset?.tarif_mensuel || 0
                      });
                    }}
                    required
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue placeholder="Sélectionner un actif" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.filter(a => a.statut === 'Disponible' || a.id === leaseData.asset_id).length === 0 ? (
                        <div className="p-2 text-sm text-[#64748B]">Aucun actif disponible</div>
                      ) : (
                        assets.filter(a => a.statut === 'Disponible' || a.id === leaseData.asset_id).map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.nom} - {asset.type_actif} ({asset.tarif_mensuel.toLocaleString()} DJF/mois)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Nom du locataire *</Label>
                  <Input
                    value={leaseData.locataire_nom || ''}
                    onChange={(e) => setLeaseData({...leaseData, locataire_nom: e.target.value})}
                    required
                    placeholder="Ex: Ahmed Hassan"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Entreprise</Label>
                  <Input
                    value={leaseData.locataire_entreprise || ''}
                    onChange={(e) => setLeaseData({...leaseData, locataire_entreprise: e.target.value})}
                    placeholder="Ex: Tech Solutions"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Email *</Label>
                  <Input
                    type="email"
                    value={leaseData.locataire_email || ''}
                    onChange={(e) => setLeaseData({...leaseData, locataire_email: e.target.value})}
                    required
                    placeholder="email@exemple.com"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Téléphone</Label>
                  <Input
                    value={leaseData.locataire_telephone || ''}
                    onChange={(e) => setLeaseData({...leaseData, locataire_telephone: e.target.value})}
                    placeholder="Ex: +253 77 12 34 56"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Date de début *</Label>
                  <Input
                    type="date"
                    value={leaseData.date_debut || ''}
                    onChange={(e) => setLeaseData({...leaseData, date_debut: e.target.value})}
                    required
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Date de fin</Label>
                  <Input
                    type="date"
                    value={leaseData.date_fin || ''}
                    onChange={(e) => setLeaseData({...leaseData, date_fin: e.target.value})}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Montant mensuel (DJF) *</Label>
                  <Input
                    type="number"
                    value={leaseData.montant_mensuel || ''}
                    onChange={(e) => setLeaseData({...leaseData, montant_mensuel: parseFloat(e.target.value)})}
                    required
                    placeholder="Ex: 150000"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Dépôt de garantie (DJF)</Label>
                  <Input
                    type="number"
                    value={leaseData.depot_garantie || ''}
                    onChange={(e) => setLeaseData({...leaseData, depot_garantie: parseFloat(e.target.value)})}
                    placeholder="Ex: 300000"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Fréquence de paiement</Label>
                  <Select
                    value={leaseData.frequence_paiement || 'Mensuel'}
                    onValueChange={(value) => setLeaseData({...leaseData, frequence_paiement: value})}
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mensuel">Mensuel</SelectItem>
                      <SelectItem value="Trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="Annuel">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold">Statut</Label>
                  <Select
                    value={leaseData.statut || 'Actif'}
                    onValueChange={(value) => setLeaseData({...leaseData, statut: value})}
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="En attente">En attente</SelectItem>
                      <SelectItem value="Expiré">Expiré</SelectItem>
                      <SelectItem value="Résilié">Résilié</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Contrat (PDF)</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'contrat_url')}
                    disabled={uploading}
                    accept=".pdf,.doc,.docx"
                    className="border-[#D1D5DB] mt-2"
                  />
                  {leaseData.contrat_url && (
                    <p className="text-sm text-green-600 mt-2">✓ Document téléchargé</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Conditions particulières</Label>
                  <Textarea
                    value={leaseData.conditions_particulieres || ''}
                    onChange={(e) => setLeaseData({...leaseData, conditions_particulieres: e.target.value})}
                    placeholder="Conditions spéciales du contrat..."
                    rows={3}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button type="button" variant="outline" onClick={() => { setShowLeaseForm(false); setEditingLease(null); setLeaseData({}); }} className="border-[#D1D5DB]">
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]" disabled={createLeaseMutation.isLoading || updateLeaseMutation.isLoading}>
                  {editingLease ? 'Mettre à jour' : 'Créer le Contrat'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}