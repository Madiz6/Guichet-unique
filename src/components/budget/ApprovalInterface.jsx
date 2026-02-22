import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
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
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      const budget = budgets.find(b => b.id === request.budget_id);
      
      if (!budget) {
        throw new Error('Budget introuvable');
      }

      console.log('Approving request:', { requestId, request, budget, currentUser });
      
      // Update budget - add to committed
      const newCommitted = (budget.amount_committed || 0) + request.amount_requested;
      const newAvailable = budget.amount_allocated - budget.amount_used - newCommitted;

      await base44.entities.Budget.update(budget.id, {
        amount_committed: newCommitted,
        amount_available: newAvailable
      });

      // Update request status
      const updatedRequest = await base44.entities.ExpenseRequest.update(requestId, {
        status: 'Approuvée',
        approved_by: currentUser.email,
        approver_name: currentUser.full_name,
        date_approved: new Date().toISOString().split('T')[0]
      });

      console.log('Approval successful:', updatedRequest);
      return updatedRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-requests'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Demande approuvée et budget engagé');
      setViewingRequest(null);
    },
    onError: (error) => {
      toast.error(`Erreur d'approbation: ${error.message}`);
      console.error('Approval error:', error);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId }) => {
      return await base44.entities.ExpenseRequest.update(requestId, {
        status: 'Rejetée',
        approved_by: currentUser?.email,
        approver_name: currentUser?.full_name,
        rejection_reason: rejectReason,
        date_approved: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-requests'] });
      toast.success('Demande rejetée');
      setShowRejectDialog(null);
      setRejectReason('');
      setViewingRequest(null);
    },
    onError: (error) => {
      toast.error(`Erreur lors du rejet: ${error.message}`);
      console.error('Rejection error:', error);
    },
  });

  const executeExpenseMutation = useMutation({
    mutationFn: async ({ requestId, request, receiptUrl, actualAmount }) => {
      const budget = budgets.find(b => b.id === request.budget_id);
      
      // If it was committed, reduce committed and add to used
      let newCommitted = budget.amount_committed || 0;
      let newUsed = budget.amount_used || 0;

      if (request.status === 'Engagée' || request.status === 'Approuvée') {
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
      queryClient.invalidateQueries({ queryKey: ['expense-requests'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
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
      'Approuvée': 'bg-blue-100 text-blue-700',
      'Engagée': 'bg-blue-100 text-blue-700',
      'Exécutée': 'bg-green-100 text-green-700',
      'Rejetée': 'bg-red-100 text-red-700',
      'Annulée': 'bg-gray-100 text-gray-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>;
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
                          
                          {!isMyRequests && request.status === 'En attente' && currentUser && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveMutation.mutate({ requestId: request.id, request });
                                }}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowRejectDialog(request);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {isMyRequests && (request.status === 'Engagée' || request.status === 'Approuvée') && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadingReceipt(request);
                              }}
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
        <DialogContent className="max-w-2xl bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5]">
          {viewingRequest && (
            <div className="space-y-8 p-6">
              {/* Requester Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#E5E7EB]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-2xl font-bold">
                    {viewingRequest.requester_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#1A1A1A]">{viewingRequest.requester_name}</h3>
                    <p className="text-[#6B6B6B] font-normal">{viewingRequest.department_name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-[#1A1A1A]">{viewingRequest.description}</p>
                  </div>

                  {viewingRequest.contact_name && (
                    <div>
                      <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide mb-1">Fournisseur</p>
                      <p className="text-sm text-[#1A1A1A]">{viewingRequest.contact_name}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide mb-2">Requested payout amount</p>
                    <p className="text-4xl font-bold text-[#1A1A1A] mb-1">
                      {viewingRequest.amount_requested.toLocaleString()} DJF
                    </p>
                    <p className="text-xs text-[#6B6B6B]">
                      1 DJF = 0.35 CAD (1,758.48 CAD)
                    </p>
                  </div>

                  <div className="pt-2">
                    {getStatusBadge(viewingRequest.status)}
                  </div>

                  {viewingRequest.status === 'En attente' && !isMyRequests && currentUser && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => {
                          setShowRejectDialog(viewingRequest);
                          setViewingRequest(null);
                        }}
                        className="flex-1 bg-[#FF4D6A] hover:bg-[#E6445E] text-white font-medium rounded-xl h-12"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          approveMutation.mutate({ requestId: viewingRequest.id, request: viewingRequest });
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white font-medium rounded-xl h-12"
                      >
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              <div className="flex justify-center">
                <div className="w-px h-12 bg-gradient-to-b from-[#E5E7EB] via-[#E5E7EB] to-transparent"></div>
              </div>

              {/* Admin/Manager Card */}
              {viewingRequest.approved_by && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#E5E7EB]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white text-2xl font-bold">
                      {viewingRequest.approver_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#1A1A1A]">{viewingRequest.approver_name}</h3>
                      <p className="text-[#6B6B6B] font-normal">Admin</p>
                    </div>
                  </div>

                  {isMyRequests && (viewingRequest.status === 'Engagée' || viewingRequest.status === 'Approuvée') && (
                    <Button
                      onClick={() => setUploadingReceipt(viewingRequest)}
                      className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white font-medium rounded-xl h-12"
                    >
                      Reimburse expense
                    </Button>
                  )}
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Request Number</p>
                  <p className="font-mono font-medium text-[#1A1A1A]">{viewingRequest.request_number}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Category</p>
                  <p className="font-medium text-[#1A1A1A]">{viewingRequest.category}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Request Date</p>
                  <p className="font-medium text-[#1A1A1A]">
                    {viewingRequest.date_requested && format(new Date(viewingRequest.date_requested), 'dd/MM/yyyy')}
                  </p>
                </div>
                {viewingRequest.date_approved && (
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-1">Approval Date</p>
                    <p className="font-medium text-[#1A1A1A]">
                      {format(new Date(viewingRequest.date_approved), 'dd/MM/yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {viewingRequest.receipt_url && (
                <div>
                  <a
                    href={viewingRequest.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-4 bg-white border border-[#E5E7EB] rounded-xl hover:shadow-md transition-all"
                  >
                    <FileText className="w-5 h-5 text-[#1A1A1A]" />
                    <span className="text-[#1A1A1A] font-medium">View Receipt</span>
                  </a>
                </div>
              )}

              {viewingRequest.policy_violation && (
                <div className="p-4 bg-[#FFF9E5] border border-[#FFE8A1] rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#8B6914] mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#8B6914] mb-1">Policy Violation</p>
                      <p className="text-sm text-[#8B6914]">{viewingRequest.policy_violation_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {viewingRequest.rejection_reason && (
                <div className="p-4 bg-[#FFEBEE] border border-[#FFCDD2] rounded-xl">
                  <p className="font-semibold text-[#C62828] mb-1">Rejection Reason</p>
                  <p className="text-sm text-[#C62828]">{viewingRequest.rejection_reason}</p>
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
                disabled={!rejectReason || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejet en cours...' : 'Confirmer le Rejet'}
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
              disabled={executeExpenseMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {executeExpenseMutation.isPending ? 'Téléchargement...' : 'Télécharger le Reçu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}