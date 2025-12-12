import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, Plus, FileText, Calendar, AlertTriangle, Bell, Download, MapPin, Mail, Phone, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import CompanyCreationWizard from "../components/company/CompanyCreationWizard";

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

    // Check compliance items (patente, etc.)
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

            {/* Company Overview Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border-2 border-[#E8ECF2]" />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-lg flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-white" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-[#0A2540] mb-1">{company.nom_entreprise}</h2>
                        <p className="text-[#697586]">{company.type_entreprise}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Actif</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <FileText className="w-6 h-6 text-blue-600 mb-2" />
                      <p className="text-sm text-blue-900 font-semibold">NIF</p>
                      <p className="text-xs text-blue-700">{company.nif}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                      <Users className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="text-sm text-purple-900 font-semibold">CNSS</p>
                      <p className="text-xs text-purple-700">{company.numero_affiliation}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                      <Calendar className="w-6 h-6 text-green-600 mb-2" />
                      <p className="text-sm text-green-900 font-semibold">Création</p>
                      <p className="text-xs text-green-700">{company.date_creation ? format(new Date(company.date_creation), 'dd/MM/yyyy') : '-'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                      <Users className="w-6 h-6 text-orange-600 mb-2" />
                      <p className="text-sm text-orange-900 font-semibold">Assurés</p>
                      <p className="text-xs text-orange-700">{company.nombre_assures || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0A2540] mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#0066FF]" />
                    Coordonnées
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-[#F7F9FC] rounded-lg">
                      <Mail className="w-5 h-5 text-[#0066FF] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#697586] mb-1">Email</p>
                        <p className="font-semibold text-[#0A2540]">{company.email || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#F7F9FC] rounded-lg">
                      <Phone className="w-5 h-5 text-[#0066FF] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#697586] mb-1">Téléphone</p>
                        <p className="font-semibold text-[#0A2540]">{company.telephone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#F7F9FC] rounded-lg md:col-span-2">
                      <MapPin className="w-5 h-5 text-[#0066FF] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#697586] mb-1">Adresse</p>
                        <p className="font-semibold text-[#0A2540]">{company.adresse || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Business Information Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0A2540] mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#0066FF]" />
                    Informations d'Activité
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F7F9FC] rounded-lg">
                      <p className="text-sm text-[#697586] mb-1">Activité Principale</p>
                      <p className="font-semibold text-[#0A2540]">{company.activite || '-'}</p>
                    </div>
                    <div className="p-4 bg-[#F7F9FC] rounded-lg">
                      <p className="text-sm text-[#697586] mb-1">Sous-Activité</p>
                      <p className="font-semibold text-[#0A2540]">{company.sous_activite || '-'}</p>
                    </div>
                    <div className="p-4 bg-[#F7F9FC] rounded-lg">
                      <p className="text-sm text-[#697586] mb-1">Raison Sociale</p>
                      <p className="font-semibold text-[#0A2540]">{company.raison_sociale || company.nom_entreprise}</p>
                    </div>
                    <div className="p-4 bg-[#F7F9FC] rounded-lg">
                      <p className="text-sm text-[#697586] mb-1">Date d'Affiliation CNSS</p>
                      <p className="font-semibold text-[#0A2540]">{company.date_affiliation ? format(new Date(company.date_affiliation), 'dd/MM/yyyy') : '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Documents Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#0A2540] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#0066FF]" />
                    Documents de l'Entreprise
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${company.licence_entreprise_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-[#0A2540]">Licence d'Entreprise</p>
                        {company.licence_entreprise_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.date_expiration_licence && (
                        <p className="text-xs text-[#697586] mb-2">Expire: {format(new Date(company.date_expiration_licence), 'dd/MM/yyyy')}</p>
                      )}
                      {company.licence_entreprise_url ? (
                        <a href={company.licence_entreprise_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100">Non fourni</Badge>
                      )}
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${company.registre_commerce_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-[#0A2540]">Registre de Commerce</p>
                        {company.registre_commerce_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.registre_commerce_url ? (
                        <a href={company.registre_commerce_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Télécharger
                          </Button>
                        </a>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 mt-2">Non fourni</Badge>
                      )}
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${company.certificat_cnss_url ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-[#0A2540]">Certificat CNSS</p>
                        {company.certificat_cnss_url && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </div>
                      {company.certificat_cnss_url ? (
                        <a href={company.certificat_cnss_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
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