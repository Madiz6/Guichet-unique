import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Eye, Upload, FileText, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ApprovalInterface({ requests, budgets, departments, currentUser, isMyRequests }) {
  const [viewingRequest, setViewingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [receiptAmount, setReceiptAmount] = useState('');

  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, request }) => {
      const budget = budgets.find(b => b.id === request.budget_id);
      
      // Update budget - add to committed
      const newCommitted = (budget.amount_committed || 0) + request.amount_requested;
      const newAvailable = budget.amount_allocated - budget.amount_used - newCommitted;

      await meras.entities.Budget.update(budget.id, {
        amount_committed: newCommitted,
        amount_available: newAvailable
      });

      // Update request status
      return await meras.entities.ExpenseRequest.update(requestId, {
        status: 'Engagée',
        approved_by: currentUser.email,
        approver_name: currentUser.full_name,
        date_approved: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-requests']);
      queryClient.invalidateQueries(['budgets']);
      toast.success('Demande approuvée et budget engagé');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId }) => {
      return await meras.entities.ExpenseRequest.update(requestId, {
        status: 'Rejetée',
        approved_by: currentUser.email,
        approver_name: currentUser.full_name,
        rejection_reason: rejectReason,
        date_approved: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-requests']);
      toast.success('Demande rejetée');
      setShowRejectDialog(null);
      setRejectReason('');
    },
  });

  const executeExpenseMutation = useMutation({
    mutationFn: async ({ requestId, request, receiptUrl, actualAmount }) => {
      const budget = budgets.find(b => b.id === request.budget_id);
      
      // If it was committed, reduce committed and add to used
      let newCommitted = budget.amount_committed || 0;
      let newUsed = budget.amount_used || 0;

      if (request.status === 'Engagée') {
        newCommitted -= request.amount_requested;
        newUsed += actualAmount;
      } else {
        newUsed += actualAmount;
      }

      const newAvailable = budget.amount_allocated - newUsed - newCommitted;

      await meras.entities.Budget.update(budget.id, {
        amount_used: newUsed,
        amount_committed: newCommitted,
        amount_available: newAvailable
      });

      // Update request to executed
      return await meras.entities.ExpenseRequest.update(requestId, {
        status: 'Exécutée',
        amount_executed: actualAmount,
        receipt_url: receiptUrl,
        date_executed: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-requests']);
      queryClient.invalidateQueries(['budgets']);
      toast.success('Dépense exécutée et budget mis à jour');
      setUploadingReceipt(null);
      setReceiptAmount('');
    },
  });

  const handleUploadReceipt = async (request) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { file_url } = await meras.integrations.Core.UploadFile({ file });
        const amount = parseFloat(receiptAmount) || request.amount_requested;
        
        executeExpenseMutation.mutate({
          requestId: request.id,
          request,
          receiptUrl: file_url,
          actualAmount: amount
        });
      } catch (error) {
        toast.error('Erreur lors du téléchargement');
      }
    };
    
    fileInput.click();
  };

  const getStatusBadge = (status) => {
    const styles = {
      'En attente': 'bg-amber-100 text-amber-700',
      'Engagée': 'bg-blue-100 text-blue-700',
      'Exécutée': 'bg-green-100 text-green-700',
      'Rejetée': 'bg-red-100 text-red-700',
      'Annulée': 'bg-gray-100 text-gray-700'
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="border border-[#E8ECF2] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F7F9FC]">
                  <TableHead>Numéro</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[#697586]">
                      Aucune demande
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-[#F7F9FC]">
                      <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#0A2540]">{request.requester_name}</p>
                          <p className="text-xs text-[#697586]">{request.requested_by}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.department_name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">{request.description}</TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-bold text-[#0A2540]">
                            {request.amount_requested.toLocaleString()} DJF
                          </p>
                          {request.amount_executed > 0 && (
                            <p className="text-xs text-green-600">
                              Exécuté: {request.amount_executed.toLocaleString()} DJF
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#697586]">
                        {request.date_requested && format(new Date(request.date_requested), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(request.status)}
                          {request.policy_violation && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Politique
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingRequest(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {!isMyRequests && request.status === 'En attente' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => approveMutation.mutate({ requestId: request.id, request })}
                                disabled={approveMutation.isLoading}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setShowRejectDialog(request)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {isMyRequests && request.status === 'Engagée' && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => setUploadingReceipt(request)}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Reçu
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Detail Dialog */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détails de la Demande</DialogTitle>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#697586]">Numéro de Demande</p>
                  <p className="font-mono font-semibold text-[#0A2540]">{viewingRequest.request_number}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Statut</p>
                  {getStatusBadge(viewingRequest.status)}
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Demandeur</p>
                  <p className="text-[#0A2540]">{viewingRequest.requester_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Département</p>
                  <p className="text-[#0A2540]">{viewingRequest.department_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Montant Demandé</p>
                  <p className="text-xl font-bold text-[#0A2540]">{viewingRequest.amount_requested.toLocaleString()} DJF</p>
                </div>
                {viewingRequest.amount_executed > 0 && (
                  <div>
                    <p className="text-sm text-[#697586]">Montant Exécuté</p>
                    <p className="text-xl font-bold text-green-600">{viewingRequest.amount_executed.toLocaleString()} DJF</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-[#697586]">Catégorie</p>
                  <p className="text-[#0A2540]">{viewingRequest.category}</p>
                </div>
                <div>
                  <p className="text-sm text-[#697586]">Type de Demande</p>
                  <Badge>{viewingRequest.request_type}</Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-[#697586] mb-2">Description</p>
                <p className="text-[#0A2540] bg-[#F7F9FC] p-3 rounded-lg">{viewingRequest.description}</p>
              </div>

              {viewingRequest.contact_name && (
                <div>
                  <p className="text-sm text-[#697586]">Fournisseur/Bénéficiaire</p>
                  <p className="text-[#0A2540]">{viewingRequest.contact_name}</p>
                </div>
              )}

              {viewingRequest.approved_by && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#697586]">Approuvé par</p>
                    <p className="text-[#0A2540]">{viewingRequest.approver_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#697586]">Date d'Approbation</p>
                    <p className="text-[#0A2540]">
                      {viewingRequest.date_approved && format(new Date(viewingRequest.date_approved), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {viewingRequest.receipt_url && (
                <div>
                  <p className="text-sm text-[#697586] mb-2">Reçu/Facture</p>
                  <a
                    href={viewingRequest.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-600 font-medium">Voir le document</span>
                  </a>
                </div>
              )}

              {viewingRequest.policy_violation && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 mb-1">Violation de Politique</p>
                      <p className="text-sm text-amber-700">{viewingRequest.policy_violation_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {viewingRequest.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-800 mb-1">Raison du Rejet</p>
                  <p className="text-sm text-red-700">{viewingRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => setShowRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la Demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison du rejet *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi cette demande est rejetée..."
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRejectDialog(null)}>
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => rejectMutation.mutate({ requestId: showRejectDialog.id })}
                disabled={!rejectReason || rejectMutation.isLoading}
              >
                Confirmer le Rejet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Receipt Dialog */}
      <Dialog open={!!uploadingReceipt} onOpenChange={() => setUploadingReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Télécharger le Reçu/Facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Montant Réel (DJF)</Label>
              <Input
                type="number"
                step="0.01"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                placeholder={uploadingReceipt?.amount_requested}
                className="mt-2"
              />
              <p className="text-xs text-[#697586] mt-1">
                Laissez vide pour utiliser le montant demandé: {uploadingReceipt?.amount_requested.toLocaleString()} DJF
              </p>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => handleUploadReceipt(uploadingReceipt)}
              disabled={executeExpenseMutation.isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {executeExpenseMutation.isLoading ? 'Téléchargement...' : 'Télécharger le Reçu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}