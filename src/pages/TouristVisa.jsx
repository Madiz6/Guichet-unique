import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Calendar, FileCheck, Clock, Shield, CheckCircle, Phone, Mail, Globe, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TouristVisa() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0A2540]">Tourist Visa</h1>
              <p className="text-[#697586]">Demande de visa simplifiée pour Djibouti</p>
            </div>
          </div>
        </motion.div>

        {/* Hero Card */}
        <Card className="border-0 shadow-xl mb-8 bg-gradient-to-r from-sky-500 to-blue-500 text-white">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Visa Touristique Simplifié</h2>
                <p className="text-sky-100 mb-6 leading-relaxed">
                  Notre processus de demande de visa a été perfectionné au fil du temps pour garantir 
                  une expérience fluide et sans tracas. Demander un visa touristique pour Djibouti 
                  n'a jamais été aussi simple. Notre équipe s'occupe de tout le processus pour vous.
                </p>
                <Button className="bg-white text-sky-600 hover:bg-sky-50">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Commencer Ma Demande
                </Button>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center">
                  <Plane className="w-24 h-24 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visa Types */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-sky-200 hover:border-sky-500 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-sky-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0A2540]">Visa 30 Jours</h3>
                  <p className="text-[#697586]">Court séjour</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm text-[#697586]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Entrée simple ou multiple
                </li>
                <li className="flex items-center gap-2 text-sm text-[#697586]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Traitement rapide
                </li>
                <li className="flex items-center gap-2 text-sm text-[#697586]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Idéal pour tourisme/affaires
                </li>
              </ul>
              <Button className="w-full bg-sky-500 hover:bg-sky-600">
                Demander Visa 30 Jours
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 hover:border-blue-500 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0A2540]">Visa 90 Jours</h3>
                  <p className="text-[#697586]">Séjour prolongé</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm text-[#697586]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Entrée simple ou multiple
                </li>
                <li className="flex items-center gap-2 text-sm text-[#697586]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Séjour longue durée
                </li>
                <li className="flex items-center gap-2 text-sm text-[#697586]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Flexibilité maximale
                </li>
              </ul>
              <Button className="w-full bg-blue-500 hover:bg-blue-600">
                Demander Visa 90 Jours
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            {
              icon: Clock,
              title: "Processus Rapide",
              description: "Notre processus éprouvé garantit une demande de visa rapide et efficace."
            },
            {
              icon: Shield,
              title: "Sans Tracas",
              description: "Nous nous occupons de toutes les formalités administratives pour vous."
            },
            {
              icon: Users,
              title: "Équipe Expérimentée",
              description: "Notre équipe possède des années d'expérience en matière de visas."
            },
            {
              icon: Globe,
              title: "Toutes Nationalités",
              description: "Nous assistons les demandeurs de toutes nationalités."
            },
            {
              icon: FileCheck,
              title: "Documents Simplifiés",
              description: "Liste claire des documents requis avec assistance complète."
            },
            {
              icon: CheckCircle,
              title: "Suivi en Temps Réel",
              description: "Suivez l'état de votre demande à tout moment."
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
                  <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-sky-600" />
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
            <h3 className="text-2xl font-bold mb-4">Besoin d'assistance pour votre visa?</h3>
            <p className="text-gray-300 mb-6">Notre équipe est prête à vous aider dans votre demande de visa.</p>
            <div className="flex justify-center gap-4">
              <Button className="bg-sky-500 hover:bg-sky-600">
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