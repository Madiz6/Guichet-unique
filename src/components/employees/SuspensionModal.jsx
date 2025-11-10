import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SuspensionModal({ employee, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    raison_suspension: '',
    date_suspension: new Date().toISOString().split('T')[0],
    date_reactivation: '',
    details_supplementaires: '',
    document_suspension_url: ''
  });
  const [uploading, setUploading] = useState(false);
  
  const suspendMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.update(employee.id, {
      ...data,
      statut: 'Suspendu'
    }),
    onSuccess: () => {
      toast.success('Employé suspendu');
      onSuccess();
    },
    onError: () => {
      toast.error('Erreur lors de la suspension');
    }
  });
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, document_suspension_url: file_url });
      toast.success('Document téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.raison_suspension) {
      toast.error('Veuillez sélectionner une raison');
      return;
    }
    
    suspendMutation.mutate(formData);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E8ECF2] p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#0A2540]">Demande de Suspension</h3>
            <p className="text-sm text-[#697586] mt-1">Procédure de licenciement ou suspension</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-[#F7F9FC] rounded-lg p-4 border border-[#E8ECF2]">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#0A2540] mb-1">Employé concerné</p>
                <p className="text-sm text-[#697586]">
                  {employee.prenom} {employee.nom} - {employee.fonction || 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-[#425466]">Raison de suspension *</Label>
            <Select
              value={formData.raison_suspension}
              onValueChange={(value) => setFormData({...formData, raison_suspension: value})}
              required
            >
              <SelectTrigger className="border-[#D3DCE6] mt-2">
                <SelectValue placeholder="Sélectionner une raison" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Faute grave">Faute grave</SelectItem>
                <SelectItem value="Absence injustifiée">Absence injustifiée</SelectItem>
                <SelectItem value="Non-respect du règlement">Non-respect du règlement</SelectItem>
                <SelectItem value="Performance insuffisante">Performance insuffisante</SelectItem>
                <SelectItem value="Comportement inapproprié">Comportement inapproprié</SelectItem>
                <SelectItem value="Enquête en cours">Enquête en cours</SelectItem>
                <SelectItem value="Restructuration">Restructuration</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#425466]">Date de suspension *</Label>
              <Input
                type="date"
                value={formData.date_suspension}
                onChange={(e) => setFormData({...formData, date_suspension: e.target.value})}
                required
                className="border-[#D3DCE6] mt-2"
              />
            </div>
            
            <div>
              <Label className="text-[#425466]">Date de réactivation</Label>
              <Input
                type="date"
                value={formData.date_reactivation}
                onChange={(e) => setFormData({...formData, date_reactivation: e.target.value})}
                className="border-[#D3DCE6] mt-2"
              />
              <p className="text-xs text-[#697586] mt-1">Laisser vide si indéterminée</p>
            </div>
          </div>
          
          <div>
            <Label className="text-[#425466]">Détails supplémentaires</Label>
            <Textarea
              value={formData.details_supplementaires}
              onChange={(e) => setFormData({...formData, details_supplementaires: e.target.value})}
              placeholder="Ajoutez des détails sur la suspension..."
              rows={4}
              className="border-[#D3DCE6] mt-2"
            />
          </div>
          
          <div>
            <Label className="text-[#425466]">Télécharger le document justificatif</Label>
            <div className="mt-2">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.doc,.docx"
                className="border-[#D3DCE6]"
              />
              {formData.document_suspension_url && (
                <a 
                  href={formData.document_suspension_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[#0066FF] mt-2 inline-block hover:underline"
                >
                  Document téléchargé
                </a>
              )}
            </div>
          </div>
          
          <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[#991B1B]">
                  En cliquant sur 'Envoyer', vous acceptez de suivre les règles légales et immédiates d'un licenciement. 
                  Tout manquement peut entraîner des sanctions.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8ECF2]">
            <Button type="button" variant="outline" onClick={onClose} className="border-[#D3DCE6]">
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-[#EF4444] hover:bg-[#DC2626]"
              disabled={suspendMutation.isLoading}
            >
              Envoyer la Demande
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}