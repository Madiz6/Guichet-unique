import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mailbox, Package, Bell, MapPin, Clock, CheckCircle, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MailManagement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Mailbox className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0A2540]">Mail Management Services</h1>
              <p className="text-[#697586]">Votre adresse professionnelle avec boîte postale</p>
            </div>
          </div>
        </motion.div>

        {/* Hero Card */}
        <Card className="border-0 shadow-xl mb-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Adresse de Bureau Premium</h2>
                <p className="text-amber-100 mb-6 leading-relaxed">
                  Notre service de gestion du courrier vous permet d'utiliser notre adresse de bureau premium 
                  avec boîte postale comme adresse de correspondance professionnelle. Assurez-vous qu'il y a 
                  toujours quelqu'un pour recevoir tout courrier entrant pour votre entreprise.
                </p>
                <Button className="bg-white text-amber-600 hover:bg-amber-50">
                  <Phone className="w-4 h-4 mr-2" />
                  Nous Contacter
                </Button>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center">
                  <Mailbox className="w-24 h-24 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            {
              icon: MapPin,
              title: "Adresse Prestigieuse",
              description: "Utilisez notre adresse de bureau premium avec P.O. Box comme adresse officielle de votre entreprise."
            },
            {
              icon: Package,
              title: "Réception Complète",
              description: "Notre équipe reçoit, trie et stocke toutes vos lettres, colis et paquets entrants."
            },
            {
              icon: Bell,
              title: "Notification Instantanée",
              description: "Vous serez immédiatement notifié de l'arrivée de votre courrier pour un retrait à votre convenance."
            },
            {
              icon: Clock,
              title: "Disponibilité 24/7",
              description: "Service de réception disponible à tout moment pour ne manquer aucun courrier important."
            },
            {
              icon: CheckCircle,
              title: "Stockage Sécurisé",
              description: "Vos courriers sont stockés en toute sécurité jusqu'à ce que vous veniez les récupérer."
            },
            {
              icon: Mail,
              title: "Tri Professionnel",
              description: "Courrier trié et organisé professionnellement pour une gestion efficace."
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
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-amber-600" />
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
            <h3 className="text-2xl font-bold mb-4">Intéressé par nos services?</h3>
            <p className="text-gray-300 mb-6">Contactez-nous pour en savoir plus sur nos forfaits de gestion du courrier.</p>
            <div className="flex justify-center gap-4">
              <Button className="bg-amber-500 hover:bg-amber-600">
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