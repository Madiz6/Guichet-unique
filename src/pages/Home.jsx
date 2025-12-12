import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { meras } from "@/components/core/MerasClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  DollarSign, 
  FileText, 
  Calendar, 
  BarChart3, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
  Phone,
  Mail,
  Clock,
  Play,
  Menu,
  X,
  Building2,
  Mailbox,
  Headphones
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleGetStarted = () => {
    meras.auth.redirectToLogin(createPageUrl('Dashboard'));
  };

  const handleLogin = () => {
    meras.auth.redirectToLogin(createPageUrl('Dashboard'));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                alt="Paie360 Logo" 
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold text-gray-900">Paie360</span>
            </div>
            
            <div className="hidden md:flex items-center gap-12">
              <a href="#solutions" className="text-gray-700 hover:text-gray-900 font-medium text-sm">Solutions</a>
              <a href="#services" className="text-gray-700 hover:text-gray-900 font-medium text-sm">Services</a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 font-medium text-sm">Tarifs</a>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <Button onClick={handleLogin} variant="ghost" className="text-gray-700 font-medium">
                Se connecter
              </Button>
              <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                Commencer
              </Button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-6 border-t">
              <div className="flex flex-col space-y-4 pt-4">
                <a href="#solutions" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
                <a href="#services" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Services</a>
                <a href="#pricing" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Tarifs</a>
                <div className="px-4 pt-4 border-t flex flex-col gap-2">
                  <Button onClick={handleLogin} variant="outline" className="w-full">Se connecter</Button>
                  <Button onClick={handleGetStarted} className="w-full bg-blue-600">Commencer</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-8 leading-[1.1] tracking-tight">
                Gestion intelligente avec paie plus rapide
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
                Augmentez l'efficacité, réduisez les erreurs et offrez une expérience RH vraiment satisfaisante avec nos solutions de paie automatisées.
              </p>
              
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-7 h-auto font-semibold rounded-full shadow-lg"
              >
                Commencer
              </Button>
            </motion.div>
          </div>

          {/* Video/Image Section */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative max-w-6xl mx-auto"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-100 aspect-video">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80" 
                alt="Paie360 Dashboard" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-blue-600 ml-1" fill="currentColor" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted Companies */}
      <section className="py-16 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-12 font-medium tracking-wide">
            Rejoignez les entreprises leaders qui utilisent déjà Paie360
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-12 gap-y-8 items-center justify-items-center">
            {[
              'Djibouti Telecom',
              'Port de Djibouti', 
              'Ethiopian Airlines',
              'Bank of Africa',
              'Sheraton Djibouti'
            ].map((company, idx) => (
              <div key={idx} className="w-full flex items-center justify-center">
                <p className="text-gray-400 font-bold text-base md:text-lg whitespace-nowrap">
                  {company}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Feature Section */}
      <section id="solutions" className="py-32 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                La paie automatisée qui fait gagner du temps
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Notre système intelligent calcule automatiquement les salaires, CNSS, ITS et génère vos bulletins de paie en quelques secondes. Conforme au code du travail Djiboutien.
              </p>
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 h-auto text-lg rounded-full"
              >
                Découvrir la solution
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <img 
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80" 
                alt="Paie Automatisée" 
                className="rounded-3xl shadow-2xl w-full"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Second Feature */}
      <section className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" 
                alt="Business Intelligence" 
                className="rounded-3xl shadow-2xl w-full"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Des insights pour mieux piloter
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Visualisez vos coûts RH en temps réel avec nos tableaux de bord interactifs. Prenez des décisions éclairées basées sur des données précises.
              </p>
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 h-auto text-lg rounded-full"
              >
                Voir les fonctionnalités
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-32 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Une suite complète d'outils pour gérer votre entreprise efficacement
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Gestion des Employés",
                desc: "Centralisez tous les dossiers, contrats et documents de vos employés en un seul endroit sécurisé."
              },
              {
                icon: DollarSign,
                title: "Paie Automatisée",
                desc: "Calculez et générez vos bulletins de paie conformes CNSS et ITS en quelques clics."
              },
              {
                icon: FileText,
                title: "Déclarations CNSS",
                desc: "Générez et payez vos déclarations mensuelles directement depuis la plateforme."
              },
              {
                icon: Calendar,
                title: "Gestion des Congés",
                desc: "Workflow complet de demande et approbation avec notifications automatiques."
              },
              {
                icon: BarChart3,
                title: "Business Intelligence",
                desc: "Tableaux de bord en temps réel pour suivre vos KPIs et coûts RH."
              },
              {
                icon: Shield,
                title: "Sécurité & Conformité",
                desc: "Protection maximale de vos données avec audit trail complet."
              }
            ].map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="border-0 bg-white shadow-sm hover:shadow-xl transition-shadow h-full p-8">
                  <CardContent className="p-0">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                      <service.icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {service.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 lg:px-8 bg-blue-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 text-center text-white">
            {[
              { number: "500+", label: "Entreprises clientes" },
              { number: "15K+", label: "Employés gérés" },
              { number: "2.5M+", label: "Bulletins générés" },
              { number: "98%", label: "Satisfaction client" }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <p className="text-6xl font-bold mb-3">{stat.number}</p>
                <p className="text-xl text-blue-100">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Tarifs transparents
            </h2>
            <p className="text-xl text-gray-600">
              Choisissez le plan adapté à votre entreprise
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "25,000 DJF",
                period: "/mois",
                features: [
                  "Jusqu'à 20 employés",
                  "Paie automatisée",
                  "Déclarations CNSS",
                  "Gestion des congés",
                  "Support email"
                ]
              },
              {
                name: "Business",
                price: "50,000 DJF",
                period: "/mois",
                popular: true,
                features: [
                  "Jusqu'à 100 employés",
                  "Tout dans Starter",
                  "Rapports avancés",
                  "Support prioritaire",
                  "Formation incluse"
                ]
              },
              {
                name: "Enterprise",
                price: "Sur devis",
                period: "",
                features: [
                  "Employés illimités",
                  "Tout dans Business",
                  "Manager dédié",
                  "SLA garanti",
                  "API & intégrations"
                ]
              }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`border ${plan.popular ? 'border-blue-600 shadow-2xl scale-105' : 'border-gray-200 shadow-sm'} bg-white relative`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                        Plus populaire
                      </div>
                    </div>
                  )}
                  <CardContent className="p-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-8">
                      <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                      {plan.period && <span className="text-gray-500 ml-2">{plan.period}</span>}
                    </div>
                    <Button 
                      onClick={handleGetStarted}
                      className={`w-full mb-8 py-6 rounded-full text-base font-semibold ${
                        plan.popular 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      Choisir {plan.name}
                    </Button>
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-gray-700">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 lg:px-8 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
              Prêt à transformer votre gestion RH?
            </h2>
            <p className="text-xl text-gray-400 mb-12">
              Essai gratuit 30 jours • Sans carte bancaire • Support inclus
            </p>
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-white hover:bg-gray-100 text-gray-900 px-10 py-7 h-auto text-lg font-bold rounded-full"
            >
              Commencer gratuitement
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                  alt="Paie360 Logo" 
                  className="w-10 h-10"
                />
                <span className="text-2xl font-bold text-gray-900">Paie360</span>
              </div>
              <p className="text-gray-600 mb-6 max-w-md">
                Solution RH complète pour les entreprises Djiboutiennes. 
                Automatisez votre paie et vos déclarations en toute simplicité.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Produit</h4>
              <ul className="space-y-3 text-gray-600">
                <li><a href="#solutions" className="hover:text-gray-900">Solutions</a></li>
                <li><a href="#services" className="hover:text-gray-900">Services</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Tarifs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+253 77 XX XX XX</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>contact@paie360.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-600">
            <p>© 2025 Paie360. Powered by <span className="text-blue-600 font-semibold">Meras PSP</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}