import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FileText, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function SignatureSettings() {
  const queryClient = useQueryClient();
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0] || {};
  
  const [formData, setFormData] = useState({
    signatory_payslip_name: '',
    signatory_payslip_position: '',
    signatory_work_attestation_name: '',
    signatory_work_attestation_position: '',
    signatory_holiday_attestation_name: '',
    signatory_holiday_attestation_position: ''
  });
  
  useEffect(() => {
    if (company) {
      setFormData({
        signatory_payslip_name: company.signatory_payslip_name || '',
        signatory_payslip_position: company.signatory_payslip_position || '',
        signatory_work_attestation_name: company.signatory_work_attestation_name || '',
        signatory_work_attestation_position: company.signatory_work_attestation_position || '',
        signatory_holiday_attestation_name: company.signatory_holiday_attestation_name || '',
        signatory_holiday_attestation_position: company.signatory_holiday_attestation_position || ''
      });
    }
  }, [company]);
  
  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.update(company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Signataires mis à jour');
    },
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };
  
  const documentTypes = [
    {
      title: 'Bulletin de paie',
      icon: '💰',
      nameField: 'signatory_payslip_name',
      positionField: 'signatory_payslip_position',
      color: 'from-[#10B981] to-[#059669]'
    },
    {
      title: 'Attestation de travail',
      icon: '📄',
      nameField: 'signatory_work_attestation_name',
      positionField: 'signatory_work_attestation_position',
      color: 'from-[#6366F1] to-[#8B5CF6]'
    },
    {
      title: 'Attestation de congé',
      icon: '🏖️',
      nameField: 'signatory_holiday_attestation_name',
      positionField: 'signatory_holiday_attestation_position',
      color: 'from-[#F59E0B] to-[#D97706]'
    }
  ];
  
  return (
    <Card className="border-0 shadow-lg">
      <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">Signataires des documents</h3>
            <p className="text-sm text-[#6B7280] mt-1">Configurer les signataires par défaut pour chaque type de document</p>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {documentTypes.map((doc, idx) => (
            <div key={idx} className="p-6 bg-gradient-to-r from-[#F8FAFC] to-white rounded-xl border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${doc.color} flex items-center justify-center text-2xl`}>
                  {doc.icon}
                </div>
                <h4 className="text-lg font-bold text-[#111827]">{doc.title}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#374151] font-semibold flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    Nom complet
                  </Label>
                  <Input
                    value={formData[doc.nameField]}
                    onChange={(e) => setFormData({...formData, [doc.nameField]: e.target.value})}
                    placeholder="Ex: Mohamed Ahmed Hassan"
                    className="border-[#D1D5DB] focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>
                
                <div>
                  <Label className="text-[#374151] font-semibold flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Poste / Fonction
                  </Label>
                  <Input
                    value={formData[doc.positionField]}
                    onChange={(e) => setFormData({...formData, [doc.positionField]: e.target.value})}
                    placeholder="Ex: Directeur des Ressources Humaines"
                    className="border-[#D1D5DB] focus:ring-2 focus:ring-[#6366F1]"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex justify-end pt-4 border-t border-[#E5E7EB]">
            <Button
              type="submit"
              disabled={updateMutation.isLoading}
              className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer les signataires'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}