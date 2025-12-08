import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileText, Users, CheckCircle, ArrowLeft, ArrowRight, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function CompanyCreationWizard({ isOpen, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState({});
  const [formData, setFormData] = useState({
    nom_entreprise: '',
    type_entreprise: 'SARL',
    numero_affiliation: '',
    nif: '',
    raison_sociale: '',
    adresse: '',
    activite: '',
    sous_activite: '',
    nombre_assures: 0,
    date_affiliation: '',
    date_creation: '',
    logo_url: '',
    email: '',
    telephone: '',
    licence_entreprise_url: '',
    date_expiration_licence: '',
    registre_commerce_url: '',
    certificat_cnss_url: '',
    signatory_payslip_name: '',
    signatory_payslip_position: '',
    signatory_work_attestation_name: '',
    signatory_work_attestation_position: '',
    signatory_holiday_attestation_name: '',
    signatory_holiday_attestation_position: ''
  });

  const queryClient = useQueryClient();

  const createCompanyMutation = useMutation({
    mutationFn: (data) => meras.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Entreprise créée avec succès!');
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la création de l\'entreprise');
    }
  });

  const handleFileUpload = async (file, field) => {
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const { file_url } = await meras.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success('Fichier téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.nom_entreprise || !formData.nif || !formData.numero_affiliation) {
          toast.error('Veuillez remplir les champs obligatoires');
          return false;
        }
        return true;
      case 2:
        if (!formData.adresse || !formData.email || !formData.telephone) {
          toast.error('Veuillez remplir les coordonnées');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleSubmit = () => {
    createCompanyMutation.mutate(formData);
  };

  const steps = [
    { num: 1, title: 'Informations Légales', icon: Building2 },
    { num: 2, title: 'Coordonnées', icon: FileText },
    { num: 3, title: 'Documents', icon: FileText },
    { num: 4, title: 'Signataires', icon: Users }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0A2540]">
            Créer une Nouvelle Entreprise
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep >= step.num ? 'bg-[#0066FF] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.num ? <CheckCircle className="w-5 h-5" /> : step.num}
                </div>
                <span className={`text-xs mt-2 text-center ${currentStep >= step.num ? 'text-[#0066FF] font-medium' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && <div className={`flex-1 h-1 mx-2 ${currentStep > step.num ? 'bg-[#0066FF]' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Legal Information */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom de l'entreprise *</Label>
                  <Input value={formData.nom_entreprise} onChange={(e) => setFormData({ ...formData, nom_entreprise: e.target.value })} placeholder="ABC Company" className="mt-2" />
                </div>
                <div>
                  <Label>Type d'entreprise *</Label>
                  <Select value={formData.type_entreprise} onValueChange={(v) => setFormData({ ...formData, type_entreprise: v })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Company">Company</SelectItem>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="EURL">EURL</SelectItem>
                      <SelectItem value="Association">Association</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>NIF *</Label>
                  <Input value={formData.nif} onChange={(e) => setFormData({ ...formData, nif: e.target.value })} placeholder="123456789" className="mt-2" />
                </div>
                <div>
                  <Label>N° d'affiliation CNSS *</Label>
                  <Input value={formData.numero_affiliation} onChange={(e) => setFormData({ ...formData, numero_affiliation: e.target.value })} placeholder="CNSS123456" className="mt-2" />
                </div>
                <div className="md:col-span-2">
                  <Label>Raison sociale</Label>
                  <Input value={formData.raison_sociale} onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })} placeholder="Raison sociale complète" className="mt-2" />
                </div>
                <div>
                  <Label>Activité principale</Label>
                  <Input value={formData.activite} onChange={(e) => setFormData({ ...formData, activite: e.target.value })} placeholder="Commerce, Services, etc." className="mt-2" />
                </div>
                <div>
                  <Label>Sous-activité</Label>
                  <Input value={formData.sous_activite} onChange={(e) => setFormData({ ...formData, sous_activite: e.target.value })} placeholder="Détails" className="mt-2" />
                </div>
                <div>
                  <Label>Date de création</Label>
                  <Input type="date" value={formData.date_creation} onChange={(e) => setFormData({ ...formData, date_creation: e.target.value })} className="mt-2" />
                </div>
                <div>
                  <Label>Date d'affiliation CNSS</Label>
                  <Input type="date" value={formData.date_affiliation} onChange={(e) => setFormData({ ...formData, date_affiliation: e.target.value })} className="mt-2" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Adresse complète *</Label>
                  <Input value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} placeholder="Rue, Quartier, Ville" className="mt-2" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contact@entreprise.dj" className="mt-2" />
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} placeholder="+253 XX XX XX XX" className="mt-2" />
                </div>
                <div>
                  <Label>Nombre d'assurés</Label>
                  <Input type="number" min="0" value={formData.nombre_assures} onChange={(e) => setFormData({ ...formData, nombre_assures: parseInt(e.target.value) || 0 })} className="mt-2" />
                </div>
                <div>
                  <Label>Logo de l'entreprise</Label>
                  <div className="mt-2">
                    {formData.logo_url ? (
                      <div className="flex items-center gap-3">
                        <img src={formData.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded border" />
                        <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, logo_url: '' })}>Changer</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo_url')} />
                        {uploading.logo_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">Télécharger</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">Téléchargez les documents officiels de votre entreprise</p>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Licence d'entreprise</Label>
                  <div className="mt-2 flex items-center gap-3">
                    {formData.licence_entreprise_url ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-600">Document téléchargé</span>
                        <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, licence_entreprise_url: '' })}>Changer</Button>
                      </>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'licence_entreprise_url')} />
                        {uploading.licence_entreprise_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">Télécharger</span>
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Date d'expiration de la licence</Label>
                  <Input type="date" value={formData.date_expiration_licence} onChange={(e) => setFormData({ ...formData, date_expiration_licence: e.target.value })} className="mt-2" />
                </div>

                <div>
                  <Label>Registre de commerce</Label>
                  <div className="mt-2 flex items-center gap-3">
                    {formData.registre_commerce_url ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-600">Document téléchargé</span>
                        <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, registre_commerce_url: '' })}>Changer</Button>
                      </>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'registre_commerce_url')} />
                        {uploading.registre_commerce_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">Télécharger</span>
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Certificat d'affiliation CNSS</Label>
                  <div className="mt-2 flex items-center gap-3">
                    {formData.certificat_cnss_url ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-600">Document téléchargé</span>
                        <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, certificat_cnss_url: '' })}>Changer</Button>
                      </>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'certificat_cnss_url')} />
                        {uploading.certificat_cnss_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">Télécharger</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Signatories */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <p className="text-sm text-gray-600">Définissez les signataires pour les différents documents officiels</p>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-[#0A2540] mb-3">Signataire - Bulletin de paie</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet</Label>
                    <Input value={formData.signatory_payslip_name} onChange={(e) => setFormData({ ...formData, signatory_payslip_name: e.target.value })} placeholder="Nom et Prénom" className="mt-2" />
                  </div>
                  <div>
                    <Label>Poste</Label>
                    <Input value={formData.signatory_payslip_position} onChange={(e) => setFormData({ ...formData, signatory_payslip_position: e.target.value })} placeholder="Directeur RH" className="mt-2" />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-[#0A2540] mb-3">Signataire - Attestation de travail</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet</Label>
                    <Input value={formData.signatory_work_attestation_name} onChange={(e) => setFormData({ ...formData, signatory_work_attestation_name: e.target.value })} placeholder="Nom et Prénom" className="mt-2" />
                  </div>
                  <div>
                    <Label>Poste</Label>
                    <Input value={formData.signatory_work_attestation_position} onChange={(e) => setFormData({ ...formData, signatory_work_attestation_position: e.target.value })} placeholder="Directeur Général" className="mt-2" />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-[#0A2540] mb-3">Signataire - Attestation de congé</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet</Label>
                    <Input value={formData.signatory_holiday_attestation_name} onChange={(e) => setFormData({ ...formData, signatory_holiday_attestation_name: e.target.value })} placeholder="Nom et Prénom" className="mt-2" />
                  </div>
                  <div>
                    <Label>Poste</Label>
                    <Input value={formData.signatory_holiday_attestation_position} onChange={(e) => setFormData({ ...formData, signatory_holiday_attestation_position: e.target.value })} placeholder="Responsable RH" className="mt-2" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-6 border-t">
          <Button variant="outline" onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))} disabled={currentStep === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Précédent
          </Button>
          
          {currentStep < 4 ? (
            <Button onClick={handleNext} className="bg-[#0066FF]">
              Suivant <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createCompanyMutation.isPending} className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
              {createCompanyMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Créer l'Entreprise</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}