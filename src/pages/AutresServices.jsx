import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Mailbox, Headphones, Plane, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AutresServices() {
  const services = [
    {
      title: 'Mail Management',
      description: 'Service de gestion du courrier professionnel avec notification par email',
      icon: Mailbox,
      color: 'from-blue-500 to-blue-600',
      link: createPageUrl('MailManagement'),
      features: [
        'Réception et notification de courrier',
        'Scan et envoi par email',
        'Boîte postale dédiée',
        'Service mensuel: 96,000 DJF'
      ]
    },
    {
      title: 'Virtual Receptionist',
      description: 'Standard téléphonique virtuel avec numéro dédié et message personnalisé',
      icon: Headphones,
      color: 'from-purple-500 to-purple-600',
      link: createPageUrl('VirtualReceptionist'),
      features: [
        'Numéro de téléphone dédié (04)',
        'Message d\'accueil personnalisé',
        'Transfert d\'appels',
        'Service mensuel: 60,000 DJF'
      ]
    },
    {
      title: 'Tourist Visa',
      description: 'Demande de visa touristique pour Djibouti en ligne',
      icon: Plane,
      color: 'from-green-500 to-green-600',
      link: createPageUrl('TouristVisa'),
      features: [
        'Visa 30 jours: $90 USD',
        'Visa 90 jours: $150 USD',
        'Entrée simple ou multiple',
        'Traitement en ligne'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#0A2540] mb-2">Autres Services</h1>
          <p className="text-[#697586]">Services complémentaires pour votre entreprise</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-[#0A2540] mb-2">{service.title}</h2>
                  <p className="text-[#697586] text-sm mb-4">{service.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-[#697586]">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Link to={service.link}>
                    <Button className="w-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg">
                      Accéder au service
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-[#0A2540] mb-2">Besoin d'aide ?</h3>
              <p className="text-[#697586] mb-4">
                Notre équipe est disponible pour vous accompagner dans la mise en place de ces services
              </p>
              <div className="flex gap-4">
                <Button variant="outline">
                  Nous contacter
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}