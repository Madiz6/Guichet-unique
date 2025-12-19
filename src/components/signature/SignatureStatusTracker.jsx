import React, { useState, useEffect } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Mail, User } from 'lucide-react';
import { format } from 'date-fns';

export default function SignatureStatusTracker({ envelopeId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [envelopeId]);

  const checkStatus = async () => {
    try {
      const response = await meras.functions.invoke('checkSignatureStatus', {
        envelope_id: envelopeId
      });

      if (response.data.success) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'sent': { icon: Mail, color: 'bg-blue-100 text-blue-800', label: 'Envoyé' },
      'delivered': { icon: Mail, color: 'bg-purple-100 text-purple-800', label: 'Délivré' },
      'completed': { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Complété' },
      'declined': { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Refusé' },
      'voided': { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: 'Annulé' }
    };

    const config = badges[status] || badges.sent;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSignerStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'declined') return <XCircle className="w-5 h-5 text-red-600" />;
    return <Clock className="w-5 h-5 text-amber-600" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-600 mt-2">Vérification du statut...</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Statut de signature</span>
          {getStatusBadge(status.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Date d'envoi</p>
            <p className="font-medium">
              {status.created_date ? format(new Date(status.created_date), 'dd/MM/yyyy HH:mm') : '-'}
            </p>
          </div>
          {status.completed_date && (
            <div>
              <p className="text-gray-600">Date de complétion</p>
              <p className="font-medium">
                {format(new Date(status.completed_date), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>

        {status.signers && status.signers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Signataires</p>
            <div className="space-y-2">
              {status.signers.map((signer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSignerStatusIcon(signer.status)}
                    <div>
                      <p className="font-medium text-sm">{signer.name}</p>
                      <p className="text-xs text-gray-600">{signer.email}</p>
                    </div>
                  </div>
                  {signer.signed_date && (
                    <p className="text-xs text-gray-600">
                      Signé le {format(new Date(signer.signed_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}