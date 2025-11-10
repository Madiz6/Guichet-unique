import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2, Upload, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Entreprise() {
  const [uploading, setUploading] = useState(false);
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
    structure_organisationnelle: ''
  });
  
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  const isAdmin = user?.role === 'admin';
  
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0];
  
  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);
  
  const createCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Entreprise créée avec succès!');
    },
    onError: (error) => {
      console.error('Error creating company:', error);
      toast.error('Erreur lors de la création');
    }
  });
  
  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Modifications enregistrées');
    },
    onError: (error) => {
      console.error('Error updating company:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  });
  
  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
      toast.success('Fichier téléchargé');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.nom_entreprise || !formData.nif || !formData.numero_affiliation) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (company?.id) {
      // Update existing company
      updateCompanyMutation.mutate({ id: company.id, data: formData });
    } else {
      // Create new company
      createCompanyMutation.mutate(formData);
    }
  };
  
  const licenseStatus = formData.date_expiration_licence 
    ? differenceInDays(new Date(formData.date_expiration_licence), new Date())
    : null;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8 flex items-center justify-center">
        <p className="text-[#64748B]">Chargement...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Profil d'Entreprise</h1>
            <p className="text-[#697586] mt-1">
              {company ? 'Modifier les informations de l\'entreprise' : 'Créer le profil de votre entreprise'}
            </p>
          </div>
        </motion.div>
        
        {/* License Expiration Warning */}
        {licenseStatus !== null && licenseStatus <= 30 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-l-4 border-l-[#FA6400] bg-[#FFF4E5]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#FA6400] mt-0.5" />
                  <div>
                    <p className="font-bold text-[#0A2540]">Licence expire bientôt</p>
                    <p className="text-sm text-[#697586] mt-1">
                      {licenseStatus < 0 ? 'Licence expirée' : `Expire dans ${licenseStatus} jours`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Profile Card */}
          <Card className="border-0 shadow-lg bg-white">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="text-xl font-bold text-[#0A2540] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                Informations Générales
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div className="md:col-span-2">
                  <Label className="text-[#425466] font-semibold">Logo de l'entreprise</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo_url')}
                      disabled={uploading}
                      className="border-[#D3DCE6]"
                    />
                    {formData.logo_url && (
                      <img 
                        src={formData.logo_url} 
                        alt="Logo" 
                        className="w-20 h-20 object-contain rounded-lg border-2 border-[#E5E7EB]" 
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#697586] mt-2">PNG, JPG jusqu'à 5MB</p>
                </div>
                
                {/* Company Name */}
                <div>
                  <Label className="text-[#425466] font-semibold">Nom de l'entreprise *</Label>
                  <Input
                    value={formData.nom_entreprise}
                    onChange={(e) => setFormData({ ...formData, nom_entreprise: e.target.value })}
                    required
                    className="border-[#D3DCE6] mt-2"
                    placeholder="Entrez le nom de l'entreprise"
                  />
                </div>
                
                {/* Company Type */}
                <div>
                  <Label className="text-[#425466] font-semibold">Type *</Label>
                  <Select
                    value={formData.type_entreprise}
                    onValueChange={(value) => setFormData({ ...formData, type_entreprise: value })}
                  >
                    <SelectTrigger className="border-[#D3DCE6] mt-2">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="EURL">EURL</SelectItem>
                      <SelectItem value="Association">Association</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* CNSS Number */}
                <div>
                  <Label className="text-[#425466] font-semibold">N° d'affiliation CNSS *</Label>
                  <Input
                    value={formData.numero_affiliation}
                    onChange={(e) => setFormData({ ...formData, numero_affiliation: e.target.value })}
                    required
                    className="border-[#D3DCE6] mt-2"
                    placeholder="Ex: 3456DF"
                  />
                </div>
                
                {/* NIF */}
                <div>
                  <Label className="text-[#425466] font-semibold">NIF *</Label>
                  <Input
                    value={formData.nif}
                    onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                    required
                    className="border-[#D3DCE6] mt-2"
                    placeholder="Numéro d'identification fiscale"
                  />
                </div>
                
                {/* Business Name */}
                <div>
                  <Label className="text-[#425466] font-semibold">Raison sociale</Label>
                  <Input
                    value={formData.raison_sociale}
                    onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                    placeholder="Raison sociale"
                  />
                </div>
                
                {/* Address */}
                <div className="md:col-span-2">
                  <Label className="text-[#425466] font-semibold">Adresse</Label>
                  <Input
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                    placeholder="Adresse complète"
                  />
                </div>
                
                {/* Activity */}
                <div>
                  <Label className="text-[#425466] font-semibold">Activité</Label>
                  <Input
                    value={formData.activite}
                    onChange={(e) => setFormData({ ...formData, activite: e.target.value })}
                    placeholder="Ex: Institutions Financières"
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                
                {/* Sub-Activity */}
                <div>
                  <Label className="text-[#425466] font-semibold">Sous-Activité</Label>
                  <Input
                    value={formData.sous_activite}
                    onChange={(e) => setFormData({ ...formData, sous_activite: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                
                {/* Number of Employees */}
                <div>
                  <Label className="text-[#425466] font-semibold">Nombre d'assurés</Label>
                  <Input
                    type="number"
                    value={formData.nombre_assures}
                    onChange={(e) => setFormData({ ...formData, nombre_assures: parseInt(e.target.value) || 0 })}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                
                {/* Affiliation Date */}
                <div>
                  <Label className="text-[#425466] font-semibold">Date d'affiliation</Label>
                  <Input
                    type="date"
                    value={formData.date_affiliation ? format(new Date(formData.date_affiliation), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData({ ...formData, date_affiliation: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                
                {/* Creation Date */}
                <div>
                  <Label className="text-[#425466] font-semibold">Date de création</Label>
                  <Input
                    type="date"
                    value={formData.date_creation ? format(new Date(formData.date_creation), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData({ ...formData, date_creation: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                
                {/* Email */}
                <div>
                  <Label className="text-[#425466] font-semibold">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                    placeholder="contact@entreprise.dj"
                  />
                </div>
                
                {/* Phone */}
                <div>
                  <Label className="text-[#425466] font-semibold">Téléphone</Label>
                  <Input
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                    placeholder="+253 XX XX XX XX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Compliance Documents Card */}
          <Card className="border-0 shadow-lg bg-white">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="text-xl font-bold text-[#0A2540]">Documents de conformité</h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business License */}
                <div>
                  <Label className="text-[#425466] font-semibold">Licence d'entreprise</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'licence_entreprise_url')}
                    disabled={uploading}
                    accept=".pdf"
                    className="border-[#D3DCE6] mt-2"
                  />
                  {formData.licence_entreprise_url && (
                    <a 
                      href={formData.licence_entreprise_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-[#0066FF] mt-2 inline-block hover:underline"
                    >
                      📄 Voir le document
                    </a>
                  )}
                </div>
                
                {/* License Expiry */}
                <div>
                  <Label className="text-[#425466] font-semibold">Date d'expiration licence</Label>
                  <Input
                    type="date"
                    value={formData.date_expiration_licence ? format(new Date(formData.date_expiration_licence), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData({ ...formData, date_expiration_licence: e.target.value })}
                    className="border-[#D3DCE6] mt-2"
                  />
                </div>
                
                {/* Commerce Register */}
                <div>
                  <Label className="text-[#425466] font-semibold">Registre de commerce</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'registre_commerce_url')}
                    disabled={uploading}
                    accept=".pdf"
                    className="border-[#D3DCE6] mt-2"
                  />
                  {formData.registre_commerce_url && (
                    <a 
                      href={formData.registre_commerce_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-[#0066FF] mt-2 inline-block hover:underline"
                    >
                      📄 Voir le document
                    </a>
                  )}
                </div>
                
                {/* CNSS Certificate */}
                <div>
                  <Label className="text-[#425466] font-semibold">Certificat d'affiliation CNSS</Label>
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'certificat_cnss_url')}
                    disabled={uploading}
                    accept=".pdf"
                    className="border-[#D3DCE6] mt-2"
                  />
                  {formData.certificat_cnss_url && (
                    <a 
                      href={formData.certificat_cnss_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-[#0066FF] mt-2 inline-block hover:underline"
                    >
                      📄 Voir le document
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Organizational Structure Card */}
          <Card className="border-0 shadow-lg bg-white">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="text-xl font-bold text-[#0A2540]">Structure organisationnelle</h3>
            </div>
            <CardContent className="p-6">
              <Textarea
                value={formData.structure_organisationnelle}
                onChange={(e) => setFormData({ ...formData, structure_organisationnelle: e.target.value })}
                placeholder="Décrivez la structure de votre entreprise..."
                rows={6}
                className="border-[#D3DCE6]"
              />
            </CardContent>
          </Card>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg text-white px-8 py-3 text-lg"
              disabled={createCompanyMutation.isLoading || updateCompanyMutation.isLoading || uploading}
            >
              <Save className="w-5 h-5 mr-2" />
              {company ? 'Enregistrer les modifications' : 'Créer l\'entreprise'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}