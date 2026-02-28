import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit2, Trash2, FileText, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import SmartPurchaseRequestForm from '@/components/procurement/SmartPurchaseRequestForm';
import ApprovalWorkflow from '@/components/procurement/ApprovalWorkflow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_COLORS = {
  'Brouillon': 'bg-gray-100 text-gray-800',
  'Soumise': 'bg-blue-100 text-blue-800',
  'En approbation': 'bg-yellow-100 text-yellow-800',
  'Approuvée': 'bg-green-100 text-green-800',
  'Rejetée': 'bg-red-100 text-red-800',
  'En commande': 'bg-purple-100 text-purple-800',
  'Livrée': 'bg-teal-100 text-teal-800'
};

export default function PurchaseRequests() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsView, setDetailsView] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: () => meras.entities.PurchaseRequest.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => meras.entities.PurchaseRequest.create({
      ...data,
      statut: 'Soumise',
      date_submission: new Date().toISOString(),
      numero_demande: `PR-${Date.now().toString().slice(-6)}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      setShowForm(false);
      toast.success('Demande créée et soumise pour approbation avec succès');
    },
    onError: () => toast.error('Erreur lors de la création de la demande')
  });

  const approveMutation = useMutation({
    mutationFn: async (data) => {
      const updated = { ...selectedRequest };
      updated.approuveurs_requis = updated.approuveurs_requis?.map(a => 
        a.email === data.email 
          ? { ...a, statut: 'Approuvé', commentaire: data.commentaire, date_approbation: data.date_approbation }
          : a
      );
      
      // Check if all approvers approved
      const allApproved = updated.approuveurs_requis?.every(a => a.statut === 'Approuvé');
      if (allApproved) {
        updated.statut = 'Approuvée';
      }
      
      return meras.entities.PurchaseRequest.update(selectedRequest.id, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      setDetailsView(false);
      setSelectedRequest(null);
      toast.success('Demande approuvée');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (data) => {
      const updated = { ...selectedRequest };
      updated.approuveurs_requis = updated.approuveurs_requis?.map(a => 
        a.email === data.email 
          ? { ...a, statut: 'Rejeté', commentaire: data.commentaire, date_approbation: data.date_approbation }
          : a
      );
      updated.statut = 'Rejetée';
      
      return meras.entities.PurchaseRequest.update(selectedRequest.id, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      setDetailsView(false);
      setSelectedRequest(null);
      toast.success('Demande rejetée');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => meras.entities.PurchaseRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast.success('Demande supprimée');
    }
  });

  // Filter and search
  const filtered = requests.filter(r => {
    const matchesSearch = r.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.numero_demande?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || r.statut === filterStatus;
    const isMine = r.employe_email === currentUser?.email;
    const isApprover = r.approuveurs_requis?.some(a => a.email === currentUser?.email);
    
    return matchesSearch && matchesStatus && (isMine || isApprover || currentUser?.role === 'admin');
  });

  // Statistics
  const stats = {
    total: requests.filter(r => r.employe_email === currentUser?.email).length,
    pending: requests.filter(r => r.employe_email === currentUser?.email && r.statut === 'En approbation').length,
    approved: requests.filter(r => r.employe_email === currentUser?.email && r.statut === 'Approuvée').length,
    rejected: requests.filter(r => r.employe_email === currentUser?.email && r.statut === 'Rejetée').length
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demandes d'achat</h1>
          <p className="text-gray-600 mt-1">Processus centralisé pour simplifier les achats</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedRequest(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvelle demande
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Demandes totales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Approuvées</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Rejetées</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher par titre ou numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Brouillon">Brouillon</SelectItem>
            <SelectItem value="Soumise">Soumise</SelectItem>
            <SelectItem value="En approbation">En approbation</SelectItem>
            <SelectItem value="Approuvée">Approuvée</SelectItem>
            <SelectItem value="Rejetée">Rejetée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(req => (
              <TableRow key={req.id}>
                <TableCell className="font-mono text-sm">{req.numero_demande}</TableCell>
                <TableCell className="font-medium">{req.titre}</TableCell>
                <TableCell>{req.montant_total?.toLocaleString()} DJF</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[req.statut]}>
                    {req.statut}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(req.created_date).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedRequest(req);
                      setDetailsView(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {req.statut === 'Brouillon' && req.employe_email === currentUser?.email && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedRequest(req);
                          setShowForm(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Supprimer cette demande?')) {
                            deleteMutation.mutate(req.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest ? 'Modifier la demande' : 'Nouvelle demande d\'achat'}
            </DialogTitle>
            <DialogDescription>
              Processus intelligent qui adapte les questions selon vos réponses
            </DialogDescription>
          </DialogHeader>
          <SmartPurchaseRequestForm
            request={selectedRequest}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => {
              setShowForm(false);
              setSelectedRequest(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsView} onOpenChange={setDetailsView}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.titre}</DialogTitle>
            <DialogDescription>{selectedRequest?.numero_demande}</DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Montant</p>
                  <p className="font-bold text-lg">{selectedRequest.montant_total?.toLocaleString()} DJF</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <Badge className={STATUS_COLORS[selectedRequest.statut]}>
                    {selectedRequest.statut}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium">{selectedRequest.type_achat}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Urgence</p>
                  <p className="font-medium">{selectedRequest.urgence}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Justification</p>
                <p className="text-sm">{selectedRequest.justification}</p>
              </div>

              <ApprovalWorkflow
                request={selectedRequest}
                approvers={selectedRequest.approuveurs_requis}
                currentUserEmail={currentUser?.email}
                onApprove={(data) => approveMutation.mutate(data)}
                onReject={(data) => rejectMutation.mutate(data)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}