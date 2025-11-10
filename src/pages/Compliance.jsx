
import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Plus, AlertTriangle, FileText, Upload, Calendar, Bell, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PermissionGuard from "../components/permissions/PermissionGuard";

export default function Compliance() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['compliance-items'],
    queryFn: () => base44.entities.ComplianceItem.list('-date_expiration'),
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => base44.entities.Company.list().then(res => res[0]), // Assuming there's only one company or we take the first one
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['compliance-items']);
      setShowForm(false);
      setFormData({});
      toast.success('Document ajouté avec succès');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['compliance-items']);
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      toast.success('Document mis à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplianceItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['compliance-items']);
      toast.success('Document supprimé');
    },
  });

  // Check for expiring items and send reminders
  useEffect(() => {
    const checkExpirations = async () => {
      if (!company?.email || items.length === 0) return;

      const today = new Date();

      for (const item of items) {
        if (!item.date_expiration) continue;

        const expirationDate = new Date(item.date_expiration);
        // Ensure expirationDate is a valid date object before proceeding
        if (isNaN(expirationDate.getTime())) {
          console.warn(`Invalid date_expiration for item ${item.id}: ${item.date_expiration}`);
          continue;
        }

        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const reminderDays = item.rappel_jours || 30; // Default to 30 days if not set

        // Send reminder if within reminder period and days are positive (not expired yet)
        if (daysUntilExpiration <= reminderDays && daysUntilExpiration > 0) {
          const lastNotif = item.derniere_notification ? new Date(item.derniere_notification) : null;
          // Calculate days since last notification. If no lastNotif, make it a large number to ensure reminder is sent.
          const daysSinceLastNotif = lastNotif && !isNaN(lastNotif.getTime()) ? Math.ceil((today.getTime() - lastNotif.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;

          // Send reminder once per week (7 days) or if no notification has been sent yet
          if (daysSinceLastNotif >= 7) {
            try {
              const recipientEmail = company.email;
              const senderName = company.nom_entreprise || 'Paie360';
              const senderEmail = 'noreply@paie360.com'; // A generic no-reply email

              if (!recipientEmail) {
                console.warn('Company email not found for sending compliance reminders. Skipping email for item:', item.nom);
                continue;
              }

              await base44.functions.invoke('sendEmail', {
                to: recipientEmail,
                subject: `⚠️ Expiration proche: ${item.nom}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #F59E0B; color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                      <h1 style="margin: 0; font-size: 28px;">⚠️ Rappel d'Expiration</h1>
                    </div>

                    <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; margin-bottom: 25px;">
                      <h2 style="margin-top: 0; color: #92400E;">${item.nom}</h2>
                      <p style="color: #92400E;"><strong>Expire dans ${daysUntilExpiration} jour${daysUntilExpiration > 1 ? 's' : ''}</strong></p>
                      <p style="color: #92400E;">Date d'expiration: ${expirationDate.toLocaleDateString('fr-FR')}</p>
                    </div>

                    <div style="background: #F7F9FC; padding: 20px; border-radius: 8px;">
                      <p><strong>Type:</strong> ${item.type}</p>
                      <p><strong>Référence:</strong> ${item.numero_reference || 'N/A'}</p>
                      ${item.fournisseur ? `<p><strong>Fournisseur:</strong> ${item.fournisseur}</p>` : ''}
                      ${item.cout_renouvellement ? `<p><strong>Coût renouvellement:</strong> ${item.cout_renouvellement.toLocaleString()} DJF</p>` : ''}
                      ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
                    </div>

                    <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; margin-top: 25px;">
                      <p style="margin: 0; color: #1E40AF; font-size: 14px;">
                        <strong>Action requise:</strong> Veuillez renouveler ce document avant son expiration.
                      </p>
                    </div>
                  </div>
                `,
                from_name: senderName,
                from_email: senderEmail
              });

              // Update last notification date
              await base44.entities.ComplianceItem.update(item.id, {
                derniere_notification: today.toISOString()
              });
              queryClient.invalidateQueries(['compliance-items']); // Invalidate to reflect the updated item
              toast.success(`Rappel envoyé pour "${item.nom}"`);
            } catch (error) {
              console.error('Error sending expiration reminder:', error);
              toast.error(`Erreur lors de l'envoi du rappel pour "${item.nom}"`);
            }
          }
        }
      }
    };

    // Only run if items and company data are loaded
    if (items.length > 0 && company) {
      checkExpirations();
    }
  }, [items, company, queryClient]);


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, document_url: file_url });
      toast.success('Document téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    // Convert date strings to 'YYYY-MM-DD' for date input compatibility
    const formattedItem = {
      ...item,
      date_emission: item.date_emission ? format(new Date(item.date_emission), 'yyyy-MM-dd') : '',
      date_expiration: item.date_expiration ? format(new Date(item.date_expiration), 'yyyy-MM-dd') : '',
    };
    setFormData(formattedItem);
    setShowForm(true);
  };

  const getExpirationStatus = (date) => {
    if (!date) return { status: 'unknown', days: null, color: 'gray' };
    const days = differenceInDays(new Date(date), new Date());

    if (days < 0) return { status: 'expired', days, color: 'red', icon: XCircle };
    if (days <= 30) return { status: 'urgent', days, color: 'red', icon: AlertTriangle };
    if (days <= 90) return { status: 'warning', days, color: 'orange', icon: Clock };
    return { status: 'valid', days, color: 'green', icon: CheckCircle };
  };

  const typeIcons = {
    'Patente': '📜',
    'Bail commercial': '🏢',
    'Licence professionnelle': '🎓',
    'Assurance': '🛡️',
    'Contrat service': '📝',
    'Certification': '⭐',
    'Autre': '📋'
  };

  const stats = {
    total: items.length,
    expired: items.filter(i => getExpirationStatus(i.date_expiration).status === 'expired').length,
    urgent: items.filter(i => getExpirationStatus(i.date_expiration).status === 'urgent').length,
    upcoming: items.filter(i => getExpirationStatus(i.date_expiration).status === 'warning').length
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
                <h1 className="text-3xl font-bold text-[#0F172A]">Conformité & Renouvellements</h1>
                <p className="text-[#64748B] mt-1">Gérer les licences, permis et documents à renouveler</p>
              </div>
            </div>
            <Button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({}); }} className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-[#6366F1]" />
                  <Badge className="bg-[#6366F1]/10 text-[#6366F1]">{stats.total}</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Documents totaux</p>
                <p className="text-2xl font-bold text-[#0F172A]">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <Badge className="bg-red-100 text-red-600">{stats.expired}</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Expirés</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <Badge className="bg-orange-100 text-orange-600">{stats.urgent}</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">Urgent (&lt; 30j)</p>
                <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg border-l-4 border-l-yellow-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <Badge className="bg-yellow-100 text-yellow-700">{stats.upcoming}</Badge>
                </div>
                <p className="text-sm text-[#64748B] mb-1">À venir (&lt; 90j)</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.upcoming}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Items Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b border-[#E5E7EB]">
                <h3 className="text-xl font-bold text-[#0F172A]">Documents de conformité</h3>
                <p className="text-sm text-[#64748B] mt-1">Licences, permis et contrats à renouveler</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FAFBFC]">
                      <TableHead className="font-semibold text-[#374151]">Document</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Type</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Fournisseur</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Date expiration</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Coût renouvellement</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Statut</TableHead>
                      <TableHead className="font-semibold text-[#374151]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[#64748B]">
                          Aucun document enregistré
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const expStatus = getExpirationStatus(item.date_expiration);
                        const StatusIcon = expStatus.icon;

                        return (
                          <TableRow key={item.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">{typeIcons[item.type]}</div>
                                <div>
                                  <p className="font-medium text-[#0F172A]">{item.nom}</p>
                                  <p className="text-xs text-[#64748B]">{item.numero_reference || 'N/A'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-[#374151]">{item.type}</TableCell>
                            <TableCell className="text-[#374151]">{item.fournisseur || '-'}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-[#374151]">{item.date_expiration ? format(new Date(item.date_expiration), 'dd MMM yyyy', { locale: fr }) : '-'}</p>
                                {expStatus.days !== null && (
                                  <p className={`text-xs ${
                                    expStatus.color === 'red' ? 'text-red-600' :
                                    expStatus.color === 'orange' ? 'text-orange-600' :
                                    expStatus.color === 'green' ? 'text-green-600' : 'text-gray-600'
                                  }`}>
                                    {expStatus.days < 0 ? `Expiré depuis ${Math.abs(expStatus.days)} jours` : `Dans ${expStatus.days} jours`}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-[#0F172A]">
                              {item.cout_renouvellement ? `${item.cout_renouvellement.toLocaleString()} DJF` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`flex items-center gap-1 w-fit ${
                                expStatus.color === 'red' ? 'bg-red-100 text-red-600' :
                                expStatus.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                expStatus.color === 'green' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                {expStatus.status === 'expired' ? 'Expiré' :
                                 expStatus.status === 'urgent' ? 'Urgent' :
                                 expStatus.status === 'warning' ? 'À venir' : 'Actif'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(item)} className="border-[#6366F1] text-[#6366F1]">
                                  Modifier
                                </Button>
                                {item.document_url && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={item.document_url} target="_blank" rel="noopener noreferrer">
                                      <FileText className="w-4 h-4" />
                                    </a>
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
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl text-[#0F172A] flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                {editingItem ? 'Modifier le document' : 'Ajouter un document'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Nom du document *</Label>
                  <Input
                    value={formData.nom || ''}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                    placeholder="Ex: Patente commerciale 2025"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Type *</Label>
                  <Select
                    value={formData.type || ''}
                    onValueChange={(value) => setFormData({...formData, type: value})}
                    required
                  >
                    <SelectTrigger className="border-[#D1D5DB] mt-2">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeIcons).map(([type, icon]) => (
                        <SelectItem key={type} value={type}>
                          {icon} {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Numéro de référence</Label>
                  <Input
                    value={formData.numero_reference || ''}
                    onChange={(e) => setFormData({...formData, numero_reference: e.target.value})}
                    placeholder="Ex: PAT-2025-001"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Date d'émission</Label>
                  <Input
                    type="date"
                    value={formData.date_emission || ''}
                    onChange={(e) => setFormData({...formData, date_emission: e.target.value})}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Date d'expiration *</Label>
                  <Input
                    type="date"
                    value={formData.date_expiration || ''}
                    onChange={(e) => setFormData({...formData, date_expiration: e.target.value})}
                    required
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Coût de renouvellement (DJF)</Label>
                  <Input
                    type="number"
                    value={formData.cout_renouvellement || ''}
                    onChange={(e) => setFormData({...formData, cout_renouvellement: parseFloat(e.target.value) || 0})}
                    placeholder="Ex: 50000"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Fournisseur/Autorité</Label>
                  <Input
                    value={formData.fournisseur || ''}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                    placeholder="Ex: Ministère du Commerce"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[#374151] font-semibold">Jours avant rappel</Label>
                  <Input
                    type="number"
                    value={formData.rappel_jours || 30} // Default to 30 days
                    onChange={(e) => setFormData({...formData, rappel_jours: parseInt(e.target.value) || 0})}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Contact fournisseur</Label>
                  <Input
                    value={formData.contact_fournisseur || ''}
                    onChange={(e) => setFormData({...formData, contact_fournisseur: e.target.value})}
                    placeholder="Téléphone ou email"
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Document</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="border-[#D1D5DB] mt-2"
                  />
                  {formData.document_url && (
                    <p className="text-sm text-green-600 mt-2">✓ Document téléchargé</p>
                  )}
                </div>

                <div className="col-span-2">
                  <Label className="text-[#374151] font-semibold">Notes</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notes additionnelles..."
                    rows={3}
                    className="border-[#D1D5DB] mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-[#D1D5DB]">
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]" disabled={createMutation.isLoading || updateMutation.isLoading || uploading}>
                  {editingItem ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
