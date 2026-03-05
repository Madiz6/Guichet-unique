import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Calendar, FileCheck, Clock, Shield, CheckCircle, Phone, Mail, Globe, Users, ArrowLeft, ArrowRight, Upload, Loader2, CreditCard, Download, Eye, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, addDays, differenceInMonths } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import MerasPaymentGateway from "@/components/payments/MerasPaymentGateway";
import { registerVisaServiceTransaction } from "@/components/transactions/autoTransactions";

const VISA_FEES = {
  '30 jours': { usd: 23, service: 5000 },
  '90 jours': { usd: 45, service: 8000 }
};

const NATIONALITIES = [
  "Afghan", "Algérien", "Allemand", "Américain", "Anglais", "Argentin", "Australien", "Autrichien",
  "Belge", "Brésilien", "Britannique", "Burkinabè", "Camerounais", "Canadien", "Chinois", "Colombien",
  "Congolais", "Égyptien", "Émirati", "Espagnol", "Éthiopien", "Français", "Gabonais", "Grec",
  "Guinéen", "Indien", "Indonésien", "Iranien", "Irakien", "Irlandais", "Italien", "Ivoirien",
  "Japonais", "Jordanien", "Kenyan", "Koweïtien", "Libanais", "Libyen", "Malaisien", "Malien",
  "Marocain", "Mauritanien", "Mexicain", "Néerlandais", "Nigérian", "Norvégien", "Omanais",
  "Pakistanais", "Polonais", "Portugais", "Qatari", "Roumain", "Russe", "Rwandais", "Saoudien",
  "Sénégalais", "Somalien", "Soudanais", "Sud-Africain", "Suédois", "Suisse", "Syrien", "Tanzanien",
  "Tchadien", "Thaïlandais", "Togolais", "Tunisien", "Turc", "Ukrainien", "Yéménite", "Autre"
];

export default function TouristVisa() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pendingApplication, setPendingApplication] = useState(null);
  const [uploading, setUploading] = useState({});
  
  const [formData, setFormData] = useState({
    visa_type: '30 jours',
    entry_type: 'Entrée simple',
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    place_of_birth: '',
    nationality: '',
    email: '',
    phone: '',
    passport_number: '',
    passport_issue_date: '',
    passport_expiry_date: '',
    passport_issue_place: '',
    passport_photo_url: '',
    passport_scan_url: '',
    arrival_date: '',
    departure_date: '',
    flight_number: '',
    accommodation_type: 'Hôtel',
    accommodation_name: '',
    accommodation_address: '',
    host_contact: '',
    invitation_letter_url: '',
    purpose_of_visit: 'Tourisme',
    purpose_details: '',
    profession: '',
    employer_name: '',
    employer_address: ''
  });

  const queryClient = useQueryClient();

  const { data: applications = [] } = useQuery({
    queryKey: ['visa-applications'],
    queryFn: () => meras.entities.VisaApplication.list('-created_date')
  });

  const createApplicationMutation = useMutation({
    mutationFn: (data) => meras.entities.VisaApplication.create(data),
    onSuccess: (newApp) => {
      queryClient.invalidateQueries(['visa-applications']);
      setPendingApplication(newApp);
      setShowPaymentGateway(true);
    }
  });

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, data }) => meras.entities.VisaApplication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['visa-applications']);
    }
  });

  const generateApplicationNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `EVD-${date}-${random}`;
  };

  const handleFileUpload = async (file, field) => {
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const { file_url } = await meras.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success('Fichier téléchargé avec succès');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.visa_type || !formData.first_name || !formData.last_name || !formData.gender || !formData.date_of_birth || !formData.nationality || !formData.email) {
          toast.error('Veuillez remplir tous les champs obligatoires');
          return false;
        }
        return true;
      case 2:
        if (!formData.passport_number || !formData.passport_expiry_date) {
          toast.error('Veuillez remplir les informations du passeport');
          return false;
        }
        const expiryDate = new Date(formData.passport_expiry_date);
        const monthsValid = differenceInMonths(expiryDate, new Date());
        if (monthsValid < 6) {
          toast.error('Le passeport doit être valide au moins 6 mois');
          return false;
        }
        if (!formData.passport_photo_url || !formData.passport_scan_url) {
          toast.error('Veuillez télécharger la photo et le scan du passeport');
          return false;
        }
        return true;
      case 3:
        if (!formData.arrival_date || !formData.accommodation_name || !formData.accommodation_address) {
          toast.error('Veuillez remplir les informations de voyage');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleSubmitApplication = () => {
    if (!validateStep(3)) return;

    const visaFee = VISA_FEES[formData.visa_type];
    const totalServiceFee = visaFee.service;

    const applicationData = {
      ...formData,
      application_number: generateApplicationNumber(),
      visa_fee: visaFee.usd,
      service_fee: totalServiceFee,
      total_amount: totalServiceFee,
      status: 'Brouillon',
      payment_status: 'En attente'
    };

    createApplicationMutation.mutate(applicationData);
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (pendingApplication) {
      await updateApplicationMutation.mutateAsync({
        id: pendingApplication.id,
        data: {
          payment_status: 'Payé',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_id: paymentData.transaction_id,
          status: 'Soumis'
        }
      });

      toast.success('Paiement réussi! Votre demande de visa a été soumise.');
      
      setShowPaymentGateway(false);
      setShowApplicationForm(false);
      setPendingApplication(null);
      setCurrentStep(1);
      setFormData({
        visa_type: '30 jours', entry_type: 'Entrée simple', first_name: '', last_name: '',
        gender: '', date_of_birth: '', place_of_birth: '', nationality: '', email: '', phone: '',
        passport_number: '', passport_issue_date: '', passport_expiry_date: '', passport_issue_place: '',
        passport_photo_url: '', passport_scan_url: '', arrival_date: '', departure_date: '', flight_number: '',
        accommodation_type: 'Hôtel', accommodation_name: '', accommodation_address: '', host_contact: '',
        invitation_letter_url: '', purpose_of_visit: 'Tourisme', purpose_details: '', profession: '',
        employer_name: '', employer_address: ''
      });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Brouillon': 'bg-gray-100 text-gray-700',
      'Soumis': 'bg-blue-100 text-blue-700',
      'En traitement': 'bg-amber-100 text-amber-700',
      'Approuvé': 'bg-green-100 text-green-700',
      'Refusé': 'bg-red-100 text-red-700',
      'Annulé': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (showApplicationForm) {
    const visaFee = VISA_FEES[formData.visa_type];

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Button variant="outline" onClick={() => { setShowApplicationForm(false); setCurrentStep(1); }} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <h1 className="text-3xl font-bold text-[#0A2540]">Demande de Visa Électronique</h1>
            <p className="text-[#697586] mt-2">République de Djibouti - evisa.gouv.dj</p>
          </motion.div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[
              { num: 1, title: 'Informations Personnelles' },
              { num: 2, title: 'Passeport & Documents' },
              { num: 3, title: 'Voyage & Hébergement' },
              { num: 4, title: 'Récapitulatif' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentStep >= step.num ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.num ? <CheckCircle className="w-5 h-5" /> : step.num}
                  </div>
                  <span className={`text-xs mt-2 text-center ${currentStep >= step.num ? 'text-sky-600 font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
                {idx < 3 && <div className={`flex-1 h-1 mx-2 ${currentStep > step.num ? 'bg-sky-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="text-xl font-bold text-[#0A2540] mb-6">Informations Personnelles</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label>Type de Visa *</Label>
                        <Select value={formData.visa_type} onValueChange={(v) => setFormData({ ...formData, visa_type: v })}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30 jours">Visa 30 jours - {VISA_FEES['30 jours'].usd} USD</SelectItem>
                            <SelectItem value="90 jours">Visa 90 jours - {VISA_FEES['90 jours'].usd} USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Type d'Entrée *</Label>
                        <Select value={formData.entry_type} onValueChange={(v) => setFormData({ ...formData, entry_type: v })}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Entrée simple">Entrée simple</SelectItem>
                            <SelectItem value="Entrée multiple">Entrée multiple</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Prénom *</Label>
                        <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="Prénom" className="mt-2" />
                      </div>
                      <div>
                        <Label>Nom de famille *</Label>
                        <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Nom" className="mt-2" />
                      </div>
                      <div>
                        <Label>Sexe *</Label>
                        <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                          <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Homme">Homme</SelectItem>
                            <SelectItem value="Femme">Femme</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date de naissance *</Label>
                        <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="mt-2" />
                      </div>
                      <div>
                        <Label>Lieu de naissance</Label>
                        <Input value={formData.place_of_birth} onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })} placeholder="Ville, Pays" className="mt-2" />
                      </div>
                      <div>
                        <Label>Nationalité *</Label>
                        <Select value={formData.nationality} onValueChange={(v) => setFormData({ ...formData, nationality: v })}>
                          <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent>
                            {NATIONALITIES.map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemple.com" className="mt-2" />
                      </div>
                      <div>
                        <Label>Téléphone</Label>
                        <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+XXX XXXXXXXX" className="mt-2" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Passport & Documents */}
                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="text-xl font-bold text-[#0A2540] mb-6">Passeport & Documents</h2>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-amber-800">
                        <strong>Important:</strong> Le passeport doit être valide au moins 6 mois après la date d'arrivée prévue.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label>Numéro de Passeport *</Label>
                        <Input value={formData.passport_number} onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })} placeholder="XXXXXXXXX" className="mt-2" />
                      </div>
                      <div>
                        <Label>Lieu d'émission</Label>
                        <Input value={formData.passport_issue_place} onChange={(e) => setFormData({ ...formData, passport_issue_place: e.target.value })} placeholder="Ville, Pays" className="mt-2" />
                      </div>
                      <div>
                        <Label>Date d'émission</Label>
                        <Input type="date" value={formData.passport_issue_date} onChange={(e) => setFormData({ ...formData, passport_issue_date: e.target.value })} className="mt-2" />
                      </div>
                      <div>
                        <Label>Date d'expiration *</Label>
                        <Input type="date" value={formData.passport_expiry_date} onChange={(e) => setFormData({ ...formData, passport_expiry_date: e.target.value })} className="mt-2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Photo d'identité *</Label>
                        <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          {formData.passport_photo_url ? (
                            <div className="flex flex-col items-center">
                              <img src={formData.passport_photo_url} alt="Photo" className="w-32 h-40 object-cover rounded mb-2" />
                              <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, passport_photo_url: '' })}>
                                Changer
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'passport_photo_url')} />
                              {uploading.passport_photo_url ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-500" /> : <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />}
                              <p className="text-sm text-gray-500">Photo fond blanc (35x45mm)</p>
                            </label>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Scan du Passeport *</Label>
                        <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          {formData.passport_scan_url ? (
                            <div className="flex flex-col items-center">
                              <FileCheck className="w-12 h-12 text-green-500 mb-2" />
                              <p className="text-sm text-green-600 mb-2">Document téléchargé</p>
                              <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, passport_scan_url: '' })}>
                                Changer
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'passport_scan_url')} />
                              {uploading.passport_scan_url ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-500" /> : <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />}
                              <p className="text-sm text-gray-500">Page d'identité du passeport</p>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Travel & Accommodation */}
                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="text-xl font-bold text-[#0A2540] mb-6">Voyage & Hébergement</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label>Date d'arrivée prévue *</Label>
                        <Input type="date" value={formData.arrival_date} onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })} className="mt-2" min={format(addDays(new Date(), 3), 'yyyy-MM-dd')} />
                      </div>
                      <div>
                        <Label>Date de départ prévue</Label>
                        <Input type="date" value={formData.departure_date} onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })} className="mt-2" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Numéro de vol / Réservation</Label>
                        <Input value={formData.flight_number} onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })} placeholder="Ex: ET123 ou référence de réservation" className="mt-2" />
                      </div>
                    </div>

                    <div className="border-t pt-6 mb-6">
                      <h3 className="font-semibold text-[#0A2540] mb-4">Hébergement à Djibouti</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Type d'hébergement *</Label>
                          <Select value={formData.accommodation_type} onValueChange={(v) => setFormData({ ...formData, accommodation_type: v })}>
                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hôtel">Hôtel</SelectItem>
                              <SelectItem value="Chez un hôte">Chez un hôte</SelectItem>
                              <SelectItem value="Autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Nom de l'hôtel / Hôte *</Label>
                          <Input value={formData.accommodation_name} onChange={(e) => setFormData({ ...formData, accommodation_name: e.target.value })} placeholder="Nom" className="mt-2" />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Adresse d'hébergement *</Label>
                          <Input value={formData.accommodation_address} onChange={(e) => setFormData({ ...formData, accommodation_address: e.target.value })} placeholder="Adresse complète" className="mt-2" />
                        </div>
                        {formData.accommodation_type === 'Chez un hôte' && (
                          <>
                            <div>
                              <Label>Contact de l'hôte</Label>
                              <Input value={formData.host_contact} onChange={(e) => setFormData({ ...formData, host_contact: e.target.value })} placeholder="Téléphone ou email" className="mt-2" />
                            </div>
                            <div>
                              <Label>Lettre d'invitation</Label>
                              <div className="mt-2">
                                {formData.invitation_letter_url ? (
                                  <div className="flex items-center gap-2">
                                    <FileCheck className="w-5 h-5 text-green-500" />
                                    <span className="text-sm text-green-600">Téléchargé</span>
                                    <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, invitation_letter_url: '' })}>
                                      Changer
                                    </Button>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'invitation_letter_url')} />
                                    {uploading.invitation_letter_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    <span className="text-sm">Télécharger</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-[#0A2540] mb-4">Motif du voyage</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Motif principal *</Label>
                          <Select value={formData.purpose_of_visit} onValueChange={(v) => setFormData({ ...formData, purpose_of_visit: v })}>
                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Tourisme">Tourisme</SelectItem>
                              <SelectItem value="Affaires">Affaires</SelectItem>
                              <SelectItem value="Visite familiale">Visite familiale</SelectItem>
                              <SelectItem value="Transit">Transit</SelectItem>
                              <SelectItem value="Autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Profession</Label>
                          <Input value={formData.profession} onChange={(e) => setFormData({ ...formData, profession: e.target.value })} placeholder="Votre profession" className="mt-2" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="text-xl font-bold text-[#0A2540] mb-6">Récapitulatif de la Demande</h2>
                    
                    <div className="space-y-6">
                      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                        <h3 className="font-semibold text-sky-800 mb-3">Type de Visa</h3>
                        <p className="text-sky-900">{formData.visa_type} - {formData.entry_type}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-[#0A2540] mb-3">Informations Personnelles</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Nom:</span> {formData.first_name} {formData.last_name}</p>
                            <p><span className="text-gray-500">Nationalité:</span> {formData.nationality}</p>
                            <p><span className="text-gray-500">Date de naissance:</span> {formData.date_of_birth}</p>
                            <p><span className="text-gray-500">Email:</span> {formData.email}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-[#0A2540] mb-3">Passeport</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Numéro:</span> {formData.passport_number}</p>
                            <p><span className="text-gray-500">Expiration:</span> {formData.passport_expiry_date}</p>
                            <p><span className="text-gray-500">Photo:</span> {formData.passport_photo_url ? '✓ Téléchargée' : '✗ Manquante'}</p>
                            <p><span className="text-gray-500">Scan:</span> {formData.passport_scan_url ? '✓ Téléchargé' : '✗ Manquant'}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-[#0A2540] mb-3">Voyage</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Arrivée:</span> {formData.arrival_date}</p>
                            <p><span className="text-gray-500">Départ:</span> {formData.departure_date || 'Non spécifié'}</p>
                            <p><span className="text-gray-500">Motif:</span> {formData.purpose_of_visit}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-[#0A2540] mb-3">Hébergement</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Type:</span> {formData.accommodation_type}</p>
                            <p><span className="text-gray-500">Nom:</span> {formData.accommodation_name}</p>
                            <p><span className="text-gray-500">Adresse:</span> {formData.accommodation_address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-6 border border-sky-200">
                        <h3 className="font-semibold text-[#0A2540] mb-4">Frais à Payer</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Frais de visa ({formData.visa_type})</span>
                            <span>{visaFee.usd} USD</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Frais de service</span>
                            <span>{visaFee.service.toLocaleString()} DJF</span>
                          </div>
                          <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                            <span>Total (Frais de service)</span>
                            <span className="text-sky-600">{visaFee.service.toLocaleString()} DJF</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          * Les frais de visa ({visaFee.usd} USD) seront payés directement sur le site officiel evisa.gouv.dj lors de la finalisation de votre demande.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))} disabled={currentStep === 1}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Précédent
                </Button>
                
                {currentStep < 4 ? (
                  <Button onClick={handleNextStep} className="bg-sky-500 hover:bg-sky-600">
                    Suivant <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmitApplication} disabled={createApplicationMutation.isPending} className="bg-gradient-to-r from-sky-500 to-blue-500">
                    {createApplicationMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-2" /> Payer et Soumettre</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {showPaymentGateway && pendingApplication && (
          <MerasPaymentGateway
            isOpen={showPaymentGateway}
            onClose={() => { setShowPaymentGateway(false); setPendingApplication(null); }}
            amount={pendingApplication.service_fee}
            description={`Visa ${pendingApplication.visa_type} - ${pendingApplication.application_number}`}
            paymentId={pendingApplication.id}
            entityType="VisaApplication"
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Plane className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#0A2540]">Tourist Visa - Djibouti</h1>
                <p className="text-[#697586]">Demande de visa électronique simplifiée</p>
              </div>
            </div>
            <Button onClick={() => setShowApplicationForm(true)} className="bg-gradient-to-r from-sky-500 to-blue-500">
              <FileText className="w-4 h-4 mr-2" /> Nouvelle Demande
            </Button>
          </div>
        </motion.div>

        {/* Hero Card */}
        <Card className="border-0 shadow-xl mb-8 bg-gradient-to-r from-sky-500 to-blue-500 text-white overflow-hidden">
          <CardContent className="p-8 relative">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Visa Électronique Simplifié</h2>
                <p className="text-sky-100 mb-6 leading-relaxed">
                  Demandez votre visa touristique pour Djibouti en quelques étapes simples.
                  Notre équipe vous accompagne dans tout le processus.
                </p>
                <div className="flex gap-4">
                  <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                    <span className="text-xl font-bold">30j</span>
                    <p className="text-xs">dès 23 USD</p>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                    <span className="text-xl font-bold">90j</span>
                    <p className="text-xs">dès 45 USD</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center">
                  <Plane className="w-24 h-24 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { num: 1, icon: Users, title: "Inscription", description: "Créez votre demande et remplissez vos informations personnelles." },
            { num: 2, icon: FileCheck, title: "Documents", description: "Téléchargez votre passeport et photo d'identité." },
            { num: 3, icon: CheckCircle, title: "Paiement & Validation", description: "Payez les frais et recevez votre e-Visa." }
          ].map((step, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="border border-[#E8ECF2] hover:shadow-lg transition-all h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
                      {step.num}
                    </div>
                    <step.icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="font-bold text-[#0A2540] mb-2">{step.title}</h3>
                  <p className="text-[#697586] text-sm">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Applications List */}
        {applications.length > 0 && (
          <Card className="border border-[#E8ECF2] shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#0A2540] mb-4">Mes Demandes de Visa</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Demande</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date d'arrivée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono">{app.application_number}</TableCell>
                      <TableCell>{app.first_name} {app.last_name}</TableCell>
                      <TableCell>{app.visa_type}</TableCell>
                      <TableCell>{app.arrival_date && format(new Date(app.arrival_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(app.status)}>{app.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={app.status !== 'Approuvé'}>
                            <Download className="w-4 h-4 mr-1" /> e-Visa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-0 shadow-lg bg-[#0A2540] text-white mt-8">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Documents Requis</h3>
            <div className="grid md:grid-cols-4 gap-4 text-left">
              {[
                "Passeport valide 6+ mois",
                "Photo d'identité fond blanc",
                "Réservation de vol",
                "Adresse d'hébergement"
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0" />
                  <span className="text-sm">{doc}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-400 mt-6 text-sm">
              Site officiel: <a href="https://www.evisa.gouv.dj" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">evisa.gouv.dj</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}