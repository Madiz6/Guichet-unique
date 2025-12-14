import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, Plus, FileText, Calendar, AlertTriangle, Bell, Download, MapPin, Mail, Phone, Users, Briefcase, DollarSign, ShieldCheck, ScrollText, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import CompanyCreationWizard from "../components/company/CompanyCreationWizard";
import DueDiligenceSearch from "../components/company/DueDiligenceSearch";

export default function CompanySetup() {
  const [showCompanyWizard, setShowCompanyWizard] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list()
  });

  const { data: complianceItems = [] } = useQuery({
    queryKey: ['compliance-items'],
    queryFn: () => meras.entities.ComplianceItem.list(),
  });

  const company = companies[0] || null;

  // Check for expiring documents
  const getDocumentAlerts = () => {
    const alerts = [];
    const today = new Date();

    // Check company licence expiry
    if (company?.date_expiration_licence) {
      const expiryDate = new Date(company.date_expiration_licence);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        alerts.push({
          type: 'warning',
          title: 'Licence d\'entreprise expire bientôt',
          message: `Expire dans ${daysUntilExpiry} jours`,
          date: company.date_expiration_licence
        });
      } else if (daysUntilExpiry < 0) {
        alerts.push({
          type: 'danger',
          title: 'Licence d\'entreprise expirée',
          message: `Expirée depuis ${Math.abs(daysUntilExpiry)} jours`,
          date: company.date_expiration_licence
        });
      }
    }

    // Check patente expiry
    if (company?.date_expiration_patente) {
      const expiryDate = new Date(company.date_expiration_patente);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        alerts.push({
          type: 'warning',
          title: 'Patente expire bientôt',
          message: `Expire dans ${daysUntilExpiry} jours`,
          date: company.date_expiration_patente
        });
      } else if (daysUntilExpiry < 0) {
        alerts.push({
          type: 'danger',
          title: 'Patente expirée',
          message: `Expirée depuis ${Math.abs(daysUntilExpiry)} jours`,
          date: company.date_expiration_patente
        });
      }
    }

    // Check compliance items
    complianceItems.forEach(item => {
      if (item.date_expiration) {
        const expiryDate = new Date(item.date_expiration);
        const daysUntilExpiry = differenceInDays(expiryDate, today);
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          alerts.push({
            type: 'warning',
            title: `${item.nom} expire bientôt`,
            message: `Expire dans ${daysUntilExpiry} jours`,
            date: item.date_expiration
          });
        } else if (daysUntilExpiry < 0) {
          alerts.push({
            type: 'danger',
            title: `${item.nom} expiré`,
            message: `Expiré depuis ${Math.abs(daysUntilExpiry)} jours`,
            date: item.date_expiration
          });
        }
      }
    });

    return alerts;
  };

  const alerts = company ? getDocumentAlerts() : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#0A2540]">Portail Entreprise</h1>
              <p className="text-[#697586]">Vue d'ensemble et gestion de votre entreprise</p>
            </div>
            {company && alerts.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                <Bell className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">{alerts.length} notification(s)</span>
              </div>
            )}
          </div>
        </motion.div>

        {company ? (
          <div className="space-y-6">
            {/* Alerts Section */}
            {alerts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border-0 shadow-lg ${alerts.some(a => a.type === 'danger') ? 'bg-gradient-to-r from-red-50 to-orange-50' : 'bg-gradient-to-r from-amber-50 to-yellow-50'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg ${alerts.some(a => a.type === 'danger') ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center`}>
                        <AlertTriangle className={`w-5 h-5 ${alerts.some(a => a.type === 'danger') ? 'text-red-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#0A2540]">Notifications de Renouvellement</h3>
                        <p className="text-sm text-[#697586]">{alerts.length} document(s) nécessite(nt) votre attention</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {alerts.map((alert, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${alert.type === 'danger' ? 'border-red-200' : 'border-amber-200'}`}>
                          <div className="flex items-center gap-3">
                            <Calendar className={`w-5 h-5 ${alert.type === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                            <div>
                              <p className="font-semibold text-[#0A2540]">{alert.title}</p>
                              <p className={`text-sm ${alert.type === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>{alert.message}</p>
                            </div>
                          </div>
                          <Badge className={alert.type === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {format(new Date(alert.date), 'dd/MM/yyyy')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Informations Générales */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0A2540] mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#0066FF]" />
                    Informations Générales
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Logo Section */}
                    <div className="lg:col-span-1">
                      <div className="text-center">
                        <p className="text-sm text-[#697586] mb-3">Logo de l'entreprise</p>
                        {company.logo_url ? (
                          <img src={company.logo_url} alt="Logo" className="w-32 h-32 object-contain mx-auto rounded-lg border-2 border-[#E8ECF2] bg-white p-2" />
                        ) : (
                          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-lg flex items-center justify-center">
                            <Building2 className="w-16 h-16 text-white" />
                          </div>
                        )}
                        <p className="text-xs text-[#697586] mt-2">PNG, JPG jusqu'à 5MB</p>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Nom de l'entreprise *</p>
                        <p className="font-semibold text-[#0A2540]">{company.nom_entreprise}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Type *</p>
                        <p className="font-semibold text-[#0A2540]">{company.type_entreprise}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">N° d'affiliation CNSS *</p>
                        <p className="font-semibold text-[#0A2540]">{company.numero_affiliation}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">NIF *</p>
                        <p className="font-semibold text-[#0A2540]">{company.nif}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">N° d'immatriculation au registre de commerce</p>
                        <p className="font-semibold text-[#0A2540]">{company.numero_registre_commerce || '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Raison sociale</p>
                        <p className="font-semibold text-[#0A2540]">{company.raison_sociale || company.nom_entreprise}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg md:col-span-2">
                        <p className="text-xs text-[#697586] mb-1">Adresse</p>
                        <p className="font-semibold text-[#0A2540]">{company.adresse || '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Activité</p>
                        <p className="font-semibold text-[#0A2540]">{company.activite || '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Sous-Activité</p>
                        <p className="font-semibold text-[#0A2540]">{company.sous_activite || '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Nombre d'assurés</p>
                        <p className="font-semibold text-[#0A2540]">{company.nombre_assures || 0}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Date d'affiliation</p>
                        <p className="font-semibold text-[#0A2540]">{company.date_affiliation ? format(new Date(company.date_affiliation), 'dd/MM/yyyy') : '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Date de création</p>
                        <p className="font-semibold text-[#0A2540]">{company.date_creation ? format(new Date(company.date_creation), 'dd/MM/yyyy') : '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Email</p>
                        <p className="font-semibold text-[#0A2540]">{company.email || '-'}</p>
                      </div>

                      <div className="p-3 bg-[#F7F9FC] rounded-lg">
                        <p className="text-xs text-[#697586] mb-1">Téléphone</p>
                        <p className="font-semibold text-[#0A2540]">{company.telephone || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>



            {/* ODPIC Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0A2540]">OFFICE DJIBOUTIEN DE LA</h3>
                      <p className="text-sm text-[#697586]">PROPRIÉTÉ INDUSTRIELLE & COMMERCIALE (ODPIC)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${company.recepisse_registre_commerce_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <p className="font-semibold text-[#0A2540]">Récépissé de Registre de Commerce</p>
                        </div>
                        {company.recepisse_registre_commerce_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.recepisse_registre_commerce_url ? (
                        <a href={company.recepisse_registre_commerce_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="w-full mt-2">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 mt-2">Non fourni</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* DGI Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0A2540]">Direction Générale des Impôts (DGI)</h3>
                      <p className="text-sm text-[#697586]">Documents fiscaux</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${company.patente_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-green-600" />
                          <p className="font-semibold text-[#0A2540]">Patente</p>
                        </div>
                        {company.patente_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.date_expiration_patente && (
                        <p className="text-xs text-[#697586] mb-2">Expire: {format(new Date(company.date_expiration_patente), 'dd/MM/yyyy')}</p>
                      )}
                      {company.patente_url ? (
                        <a href={company.patente_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100">Non fourni</Badge>
                      )}
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${company.contrat_bail_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ScrollText className="w-5 h-5 text-green-600" />
                          <p className="font-semibold text-[#0A2540]">Contrat de Bail</p>
                        </div>
                        {company.contrat_bail_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.contrat_bail_url ? (
                        <a href={company.contrat_bail_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 mt-2">Non fourni</Badge>
                      )}
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${company.statut_societe_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-green-600" />
                          <p className="font-semibold text-[#0A2540]">Statut de la Société</p>
                        </div>
                        {company.statut_societe_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.statut_societe_url ? (
                        <a href={company.statut_societe_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 mt-2">Non fourni</Badge>
                      )}
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${company.autres_documents_dgi_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-green-600" />
                          <p className="font-semibold text-[#0A2540]">Autres Documents</p>
                        </div>
                        {company.autres_documents_dgi_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.autres_documents_dgi_url ? (
                        <a href={company.autres_documents_dgi_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 mt-2">Non fourni</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* CNSS Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0A2540]">Caisse Nationale de Sécurité Sociale (CNSS)</h3>
                      <p className="text-sm text-[#697586]">Documents de sécurité sociale</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${company.immatriculation_cnss_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-600" />
                          <p className="font-semibold text-[#0A2540]">Immatriculation CNSS</p>
                        </div>
                        {company.immatriculation_cnss_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.immatriculation_cnss_url ? (
                        <a href={company.immatriculation_cnss_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="w-full mt-2">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 mt-2">Non fourni</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#0A2540] mb-3">Aucune Entreprise Configurée</h2>
                <p className="text-[#697586] mb-8 max-w-md mx-auto">
                  Créez votre entreprise pour commencer à utiliser toutes les fonctionnalités de la plateforme de gestion.
                </p>
                <Button onClick={() => setShowCompanyWizard(true)} className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg">
                  <Plus className="w-5 h-5 mr-2" /> Créer mon Entreprise
                </Button>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  {[
                    { title: 'Informations Légales', desc: 'NIF, CNSS, Raison sociale' },
                    { title: 'Coordonnées', desc: 'Adresse, Email, Téléphone' },
                    { title: 'Documents', desc: 'Licence, RC, Certificats' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[#F7F9FC] rounded-lg p-4">
                      <h3 className="font-semibold text-[#0A2540] mb-1">{item.title}</h3>
                      <p className="text-sm text-[#697586]">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <CompanyCreationWizard
        isOpen={showCompanyWizard}
        onClose={() => setShowCompanyWizard(false)}
        onSuccess={() => setShowCompanyWizard(false)}
      />
    </div>
  );
}