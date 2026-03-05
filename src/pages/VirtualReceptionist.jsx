import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Headphones, Phone, Clock, Users, MessageSquare, CheckCircle, Mail, Globe, ArrowLeft, FileText, CreditCard, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, addYears } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import MerasPaymentGateway from "@/components/payments/MerasPaymentGateway";
import { generateReceptionistContract } from "@/components/services/ReceptionistContractGenerator";
import { registerReceptionistServiceTransaction } from "@/components/transactions/autoTransactions";

const SERVICE_AMOUNT = 60000;

export default function VirtualReceptionist() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pendingContract, setPendingContract] = useState(null);
  const [formData, setFormData] = useState({
    responsible_name: '',
    responsible_phone: '',
    responsible_email: '',
    welcome_message: '',
    forward_phone: ''
  });

  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const companies = await meras.entities.Company.list();
      return companies[0] || {};
    }
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['receptionist-contracts'],
    queryFn: () => meras.entities.VirtualReceptionistContract.list('-created_date')
  });

  const createContractMutation = useMutation({
    mutationFn: (data) => meras.entities.VirtualReceptionistContract.create(data),
    onSuccess: (newContract) => {
      queryClient.invalidateQueries(['receptionist-contracts']);
      setPendingContract(newContract);
      setShowPaymentGateway(true);
    }
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }) => meras.entities.VirtualReceptionistContract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['receptionist-contracts']);
    }
  });

  const generateContractNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VR-${date}-${random}`;
  };

  const generatePhoneNumber = () => {
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `04 ${random.toString().slice(0, 2)} ${random.toString().slice(2, 4)} ${Math.floor(Math.random() * 90) + 10}`;
  };

  const handleSubmitRequest = () => {
    if (!formData.responsible_name || !formData.responsible_email || !formData.welcome_message) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const startDate = new Date();
    const endDate = addYears(startDate, 1);

    const contractData = {
      company_name: company?.nom_entreprise || '',
      company_address: company?.adresse || '',
      company_nif: company?.nif || '',
      company_phone: company?.telephone || '',
      company_email: company?.email || '',
      responsible_name: formData.responsible_name,
      responsible_phone: formData.responsible_phone,
      responsible_email: formData.responsible_email,
      welcome_message: formData.welcome_message,
      forward_phone: formData.forward_phone,
      assigned_phone_number: generatePhoneNumber(),
      contract_start_date: format(startDate, 'yyyy-MM-dd'),
      contract_end_date: format(endDate, 'yyyy-MM-dd'),
      amount: SERVICE_AMOUNT,
      contract_number: generateContractNumber(),
      status: 'En attente de paiement',
      payment_status: 'En attente'
    };

    createContractMutation.mutate(contractData);
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (pendingContract) {
      await updateContractMutation.mutateAsync({
        id: pendingContract.id,
        data: {
          payment_status: 'Payé',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_id: paymentData.transaction_id,
          status: 'Actif'
        }
      });

      const updatedContract = {
        ...pendingContract,
        payment_status: 'Payé',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_id: paymentData.transaction_id,
        status: 'Actif'
      };

      await registerReceptionistServiceTransaction(updatedContract);
      generateReceptionistContract(updatedContract, company);
      toast.success('Paiement réussi! Votre contrat de réceptionniste virtuel a été généré.');
      
      setShowPaymentGateway(false);
      setShowRequestForm(false);
      setPendingContract(null);
      setFormData({ responsible_name: '', responsible_phone: '', responsible_email: '', welcome_message: '', forward_phone: '' });
    }
  };

  const handleDownloadContract = (contract) => {
    if (contract.payment_status !== 'Payé') {
      toast.error('Le contrat doit être payé avant de pouvoir le télécharger');
      return;
    }
    generateReceptionistContract(contract, company);
  };

  if (showRequestForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Button variant="outline" onClick={() => setShowRequestForm(false)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <h1 className="text-3xl font-bold text-[#0A2540]">Demande de Réceptionniste Virtuel</h1>
            <p className="text-[#697586] mt-2">Contrat annuel - {SERVICE_AMOUNT.toLocaleString()} DJF</p>
          </motion.div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                <h3 className="font-semibold text-pink-800 mb-2">Informations de l'entreprise (depuis les paramètres)</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-pink-600">Entreprise:</span>
                    <p className="font-medium">{company?.nom_entreprise || 'Non configuré'}</p>
                  </div>
                  <div>
                    <span className="text-pink-600">NIF:</span>
                    <p className="font-medium">{company?.nif || 'Non configuré'}</p>
                  </div>
                  <div>
                    <span className="text-pink-600">Adresse:</span>
                    <p className="font-medium">{company?.adresse || 'Non configuré'}</p>
                  </div>
                  <div>
                    <span className="text-pink-600">Téléphone:</span>
                    <p className="font-medium">{company?.telephone || 'Non configuré'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-[#0A2540] mb-4">Informations du Responsable</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nom complet *</Label>
                      <Input
                        value={formData.responsible_name}
                        onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                        placeholder="Nom du responsable"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input
                        value={formData.responsible_phone}
                        onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                        placeholder="+253 XX XX XX XX"
                        className="mt-2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Email du responsable *</Label>
                      <Input
                        type="email"
                        value={formData.responsible_email}
                        onChange={(e) => setFormData({ ...formData, responsible_email: e.target.value })}
                        placeholder="responsable@entreprise.com"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-[#0A2540] mb-4">Configuration du Service</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Message d'accueil personnalisé *</Label>
                      <Textarea
                        value={formData.welcome_message}
                        onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                        placeholder="Ex: Bonjour et bienvenue chez [Nom de l'entreprise]. Comment puis-je vous aider?"
                        className="mt-2"
                        rows={3}
                      />
                      <p className="text-xs text-[#697586] mt-1">Ce message sera utilisé pour accueillir vos appelants</p>
                    </div>
                    <div>
                      <Label>Numéro pour transfert d'appels</Label>
                      <Input
                        value={formData.forward_phone}
                        onChange={(e) => setFormData({ ...formData, forward_phone: e.target.value })}
                        placeholder="+253 XX XX XX XX"
                        className="mt-2"
                      />
                      <p className="text-xs text-[#697586] mt-1">Les appels importants seront transférés vers ce numéro</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-lg border border-pink-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-[#0A2540]">Contrat Annuel</span>
                    <span className="text-2xl font-bold text-pink-600">{SERVICE_AMOUNT.toLocaleString()} DJF</span>
                  </div>
                  <ul className="space-y-2 text-sm text-[#697586]">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Numéro de téléphone local (04) dédié</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Réception des appels 24/7</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Accueil personnalisé</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Transfert d'appels et prise de messages</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Service multilingue</li>
                  </ul>
                </div>

                <Button
                  onClick={handleSubmitRequest}
                  disabled={createContractMutation.isPending}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                >
                  {createContractMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement...</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" /> Procéder au Paiement</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {showPaymentGateway && pendingContract && (
          <MerasPaymentGateway
            isOpen={showPaymentGateway}
            onClose={() => {
              setShowPaymentGateway(false);
              setPendingContract(null);
            }}
            amount={SERVICE_AMOUNT}
            description={`Contrat Réceptionniste Virtuel - ${pendingContract.contract_number}`}
            paymentId={pendingContract.id}
            entityType="VirtualReceptionistContract"
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
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#0A2540]">Virtual Receptionist</h1>
                <p className="text-[#697586]">Tous vos appels clients répondus 24/7</p>
              </div>
            </div>
            <Button onClick={() => setShowRequestForm(true)} className="bg-gradient-to-r from-pink-500 to-rose-500">
              <FileText className="w-4 h-4 mr-2" /> Demander le Service
            </Button>
          </div>
        </motion.div>

        {/* Hero Card */}
        <Card className="border-0 shadow-xl mb-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Ne Manquez Plus Aucun Appel</h2>
                <p className="text-pink-100 mb-6 leading-relaxed">
                  Assurez-vous que tous les appels de vos clients sont répondus. Obtenez un numéro local 04 
                  et une équipe qui gérera vos appels 24/7.
                </p>
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 px-4 py-2 rounded-lg">
                    <span className="text-2xl font-bold">{SERVICE_AMOUNT.toLocaleString()}</span>
                    <span className="text-sm ml-1">DJF/an</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center">
                  <Headphones className="w-24 h-24 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Phone, title: "Numéro Local 04", description: "Obtenez un numéro de téléphone local professionnel." },
            { icon: Clock, title: "Disponibilité 24/7", description: "Notre équipe est disponible 24 heures sur 24." },
            { icon: MessageSquare, title: "Accueil Personnalisé", description: "Message de bienvenue personnalisé à votre image." },
            { icon: Users, title: "Équipe Dédiée", description: "Une équipe professionnelle pour représenter votre entreprise." },
            { icon: Globe, title: "Multilingue", description: "Service en français, anglais et arabe." },
            { icon: CheckCircle, title: "Transfert d'Appels", description: "Transfert vers votre mobile ou prise de messages." }
          ].map((feature, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="border border-[#E8ECF2] hover:shadow-lg transition-all h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-pink-600" />
                  </div>
                  <h3 className="font-bold text-[#0A2540] mb-2">{feature.title}</h3>
                  <p className="text-[#697586] text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Contracts List */}
        {contracts.length > 0 && (
          <Card className="border border-[#E8ECF2] shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#0A2540] mb-4">Mes Contrats</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Contrat</TableHead>
                    <TableHead>N° Téléphone</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono">{contract.contract_number}</TableCell>
                      <TableCell className="font-semibold text-pink-600">{contract.assigned_phone_number}</TableCell>
                      <TableCell>
                        {contract.contract_start_date && format(new Date(contract.contract_start_date), 'dd/MM/yyyy')} - 
                        {contract.contract_end_date && format(new Date(contract.contract_end_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{contract.amount?.toLocaleString()} DJF</TableCell>
                      <TableCell>
                        <Badge className={
                          contract.status === 'Actif' ? 'bg-green-100 text-green-700' :
                          contract.status === 'En attente de paiement' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadContract(contract)}
                          disabled={contract.payment_status !== 'Payé'}
                        >
                          <Download className="w-4 h-4 mr-1" /> Contrat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}