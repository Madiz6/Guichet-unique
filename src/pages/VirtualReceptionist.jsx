import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, Phone, Clock, Users, MessageSquare, CheckCircle, Mail, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VirtualReceptionist() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Headphones className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0A2540]">Virtual Receptionist</h1>
              <p className="text-[#697586]">Tous vos appels clients répondus 24/7</p>
            </div>
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
                  et une équipe qui gérera vos appels 24/7. Nos services de réceptionniste virtuel garantissent 
                  que vos clients sont accueillis avec un message de bienvenue personnalisé à chaque appel.
                </p>
                <Button className="bg-white text-pink-600 hover:bg-pink-50">
                  <Phone className="w-4 h-4 mr-2" />
                  Obtenir Mon Numéro
                </Button>
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
            {
              icon: Phone,
              title: "Numéro Local 04",
              description: "Obtenez un numéro de téléphone local professionnel pour votre entreprise à Djibouti."
            },
            {
              icon: Clock,
              title: "Disponibilité 24/7",
              description: "Notre équipe est disponible 24 heures sur 24, 7 jours sur 7 pour répondre à vos appels."
            },
            {
              icon: MessageSquare,
              title: "Accueil Personnalisé",
              description: "Vos clients sont accueillis avec un message de bienvenue personnalisé à votre image."
            },
            {
              icon: Users,
              title: "Équipe Dédiée",
              description: "Une équipe professionnelle formée pour représenter votre entreprise de manière exemplaire."
            },
            {
              icon: Globe,
              title: "Multilingue",
              description: "Service disponible en français, anglais et arabe pour tous vos clients."
            },
            {
              icon: CheckCircle,
              title: "Transfert d'Appels",
              description: "Possibilité de transférer les appels vers votre mobile ou prendre des messages."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
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

        {/* Contact CTA */}
        <Card className="border-0 shadow-lg bg-[#0A2540] text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Prêt à professionnaliser vos appels?</h3>
            <p className="text-gray-300 mb-6">Contactez-nous pour configurer votre réceptionniste virtuel.</p>
            <div className="flex justify-center gap-4">
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Phone className="w-4 h-4 mr-2" />
                +253 77 XX XX XX
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                <Mail className="w-4 h-4 mr-2" />
                contact@paie360.com
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}