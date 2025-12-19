import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Send, CheckCircle, Clock, UserPlus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ESignatureWorkflow({ documentUrl, documentName, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '' }]);
  };

  const removeSigner = (index) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index, field, value) => {
    const updated = [...signers];
    updated[index][field] = value;
    setSigners(updated);
  };

  const handleSend = async () => {
    const validSigners = signers.filter(s => s.name && s.email);
    
    if (validSigners.length === 0) {
      toast.error('Ajoutez au moins un signataire');
      return;
    }

    setSending(true);

    try {
      const response = await meras.functions.invoke('createSignatureRequest', {
        document_url: documentUrl,
        document_name: documentName,
        signers: validSigners,
        message
      });

      if (response.data.success) {
        toast.success('Demande de signature envoyée');
        setIsOpen(false);
        if (onSuccess) onSuccess(response.data);
      } else {
        toast.error(response.data.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700">
        <Send className="w-4 h-4 mr-2" />
        Envoyer pour signature
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Demande de signature électronique
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Document:</strong> {documentName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message (optionnel)</label>
              <Textarea
                placeholder="Ajoutez un message pour les signataires..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">Signataires</label>
                <Button onClick={addSigner} size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <Card key={index} className="border-0 bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Nom complet"
                            value={signer.name}
                            onChange={(e) => updateSigner(index, 'name', e.target.value)}
                          />
                          <Input
                            type="email"
                            placeholder="Email"
                            value={signer.email}
                            onChange={(e) => updateSigner(index, 'email', e.target.value)}
                          />
                        </div>
                        {signers.length > 1 && (
                          <Button
                            onClick={() => removeSigner(index)}
                            size="icon"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">À propos de DocuSign</p>
                  <p>Les signataires recevront un email avec un lien sécurisé pour signer électroniquement le document.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}