import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, User, Briefcase } from 'lucide-react';

export default function SignatureDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  documentType,
  defaultName = '',
  defaultPosition = ''
}) {
  const [signatoryName, setSignatoryName] = useState(defaultName);
  const [signatoryPosition, setSignatoryPosition] = useState(defaultPosition);
  
  const documentTitles = {
    'payslip': 'Bulletin de paie',
    'work_attestation': 'Attestation de travail',
    'holiday_attestation': 'Attestation de congé'
  };
  
  const handleConfirm = () => {
    if (!signatoryName.trim() || !signatoryPosition.trim()) {
      return;
    }
    onConfirm({ name: signatoryName, position: signatoryPosition });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#0F172A]">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold">Signer le document</p>
              <p className="text-sm font-normal text-[#64748B] mt-0.5">
                {documentTitles[documentType]}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
            <p className="text-sm text-[#64748B] mb-2">
              ℹ️ Ces informations seront affichées en bas du document comme signature officielle.
            </p>
          </div>
          
          <div>
            <Label className="text-[#374151] font-semibold flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              Nom complet du signataire *
            </Label>
            <Input
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="Ex: Mohamed Ahmed Hassan"
              className="border-[#D1D5DB] focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          
          <div>
            <Label className="text-[#374151] font-semibold flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4" />
              Poste / Fonction *
            </Label>
            <Input
              value={signatoryPosition}
              onChange={(e) => setSignatoryPosition(e.target.value)}
              placeholder="Ex: Directeur des Ressources Humaines"
              className="border-[#D1D5DB] focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#D1D5DB]"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!signatoryName.trim() || !signatoryPosition.trim()}
            className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg"
          >
            <FileText className="w-4 h-4 mr-2" />
            Générer le document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}