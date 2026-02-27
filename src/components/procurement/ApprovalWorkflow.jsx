import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, AlertCircle } from 'lucide-react';

export default function ApprovalWorkflow({ request, approvers, onApprove, onReject, currentUserEmail }) {
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const myApproverRole = approvers?.find(a => a.email === currentUserEmail);
  const canApprove = myApproverRole && myApproverRole.statut === 'En attente';

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove({
        email: currentUserEmail,
        commentaire: comment,
        date_approbation: new Date().toISOString().split('T')[0]
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment) {
      alert('Veuillez indiquer la raison du rejet');
      return;
    }
    setSubmitting(true);
    try {
      await onReject({
        email: currentUserEmail,
        commentaire: comment,
        date_approbation: new Date().toISOString().split('T')[0]
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Approuvé') return 'bg-green-100 text-green-800';
    if (status === 'Rejeté') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = (status) => {
    if (status === 'Approuvé') return <Check className="w-4 h-4" />;
    if (status === 'Rejeté') return <X className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-bold text-gray-900 mb-4">Chaîne d'approbation</h3>
        
        <div className="space-y-3">
          {approvers?.map((approver, index) => (
            <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(approver.statut)}`}>
                  {getStatusIcon(approver.statut)}
                </div>
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-gray-900">{approver.nom || approver.email}</p>
                <p className="text-xs text-gray-500">{approver.role} (Niveau {approver.niveau})</p>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(approver.statut)}>
                    {approver.statut}
                  </Badge>
                  {approver.date_approbation && (
                    <span className="text-xs text-gray-500">{approver.date_approbation}</span>
                  )}
                </div>
                
                {approver.commentaire && (
                  <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                    {approver.commentaire}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Form for Current User */}
      {canApprove && (
        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
          <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Votre approbation est requise
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Commentaire (optionnel)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Votre approbation / raison du rejet..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Approuver
              </Button>
              <Button
                onClick={handleReject}
                disabled={submitting}
                variant="destructive"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}