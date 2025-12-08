import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, Edit, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import CompanyCreationWizard from "../components/company/CompanyCreationWizard";

export default function CompanySetup() {
  const [showCompanyWizard, setShowCompanyWizard] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list()
  });

  const company = companies[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0066FF] to-[#0052CC] rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0A2540]">Configuration Entreprise</h1>
              <p className="text-[#697586]">Créez et gérez votre entreprise</p>
            </div>
          </div>
        </motion.div>

        {company ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {company.logo_url && (
                      <img src={company.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-[#0A2540] mb-1">{company.nom_entreprise}</h2>
                      <p className="text-[#697586]">{company.type_entreprise}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Entreprise configurée</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-[#697586]">NIF</p>
                      <p className="font-semibold text-[#0A2540]">{company.nif}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#697586]">N° Affiliation CNSS</p>
                      <p className="font-semibold text-[#0A2540]">{company.numero_affiliation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#697586]">Activité</p>
                      <p className="font-semibold text-[#0A2540]">{company.activite || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-[#697586]">Email</p>
                      <p className="font-semibold text-[#0A2540]">{company.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#697586]">Téléphone</p>
                      <p className="font-semibold text-[#0A2540]">{company.telephone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#697586]">Adresse</p>
                      <p className="font-semibold text-[#0A2540]">{company.adresse || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#F7F9FC] rounded-lg p-4">
                      <p className="text-xs text-[#697586] mb-1">Documents</p>
                      <div className="flex gap-2">
                        {company.licence_entreprise_url && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Licence ✓</span>}
                        {company.registre_commerce_url && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">RC ✓</span>}
                        {company.certificat_cnss_url && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">CNSS ✓</span>}
                      </div>
                    </div>
                    <div className="bg-[#F7F9FC] rounded-lg p-4">
                      <p className="text-xs text-[#697586] mb-1">Date de création</p>
                      <p className="font-semibold text-[#0A2540]">{company.date_creation || '-'}</p>
                    </div>
                    <div className="bg-[#F7F9FC] rounded-lg p-4">
                      <p className="text-xs text-[#697586] mb-1">Nombre d'assurés</p>
                      <p className="font-semibold text-[#0A2540]">{company.nombre_assures || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-[#697586] mb-2">
                    Pour modifier les informations de l'entreprise, contactez votre administrateur système.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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