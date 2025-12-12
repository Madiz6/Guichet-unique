import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { meras } from "@/components/core/MerasClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TrendingUp,
  Phone,
  Mail,
  Play,
  Menu,
  X,
  Building2,
  Clock,
  Target,
  Award,
  Globe
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                alt="Paie360" 
                className="w-10 h-10"
              />
              <span className="text-2xl font-bold text-gray-900">Paie360</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#solutions" className="text-gray-700 hover:text-gray-900 font-medium">Solutions</a>
              <a href="#services" className="text-gray-700 hover:text-gray-900 font-medium">Services</a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 font-medium">Tarifs</a>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <Button onClick={handleLogin} variant="ghost" className="text-gray-700 font-medium">
                Se connecter
              </Button>
              <Button onClick={handleGetStarted} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6">
                Créer un compte
              </Button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-6 border-t">
              <div className="flex flex-col space-y-4 pt-6">
                <a href="#solutions" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
                <a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Tarifs</a>
                <div className="pt-4 border-t flex flex-col gap-2">
                  <Button onClick={handleLogin} variant="outline" className="w-full">Se connecter</Button>
                  <Button onClick={handleGetStarted} className="w-full bg-purple-600">Créer un compte</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-12 bg-gradient-to-br from-gray-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-6xl lg:text-8xl font-bold text-gray-900 mb-6 leading-[1.05]">
                GÉREZ VOTRE ENTREPRISE
              </h1>
              <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-12 leading-tight">
                Conçu pour vous accompagner
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Paie, CNSS, congés, budgets et bien plus, tout en un seul endroit
              </p>
              
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-10 py-7 h-auto rounded-full font-semibold"
              >
                Découvrir Paie360 maintenant
              </Button>
            </motion.div>

            {/* Right Side - Hero Image with Floating Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative h-[600px] hidden lg:block"
            >
              {/* Main circular image */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80" 
                  alt="Professional" 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating Card 1 - Top Left */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute top-0 left-0 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-4 shadow-2xl"
              >
                <p className="text-sm mb-1 opacity-90">Employés Actifs</p>
                <p className="text-3xl font-bold">152</p>
              </motion.div>

              {/* Floating Card 2 - Top Right */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="absolute top-20 right-0 bg-white rounded-2xl p-5 shadow-2xl border border-gray-100"
              >
                <p className="text-sm text-gray-600 mb-2">Paie de ce mois</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <p className="text-2xl font-bold text-gray-900">2.4M DJF</p>
                </div>
              </motion.div>

              {/* Floating Card 3 - Bottom Left */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="absolute bottom-32 left-0 bg-amber-400 text-gray-900 rounded-2xl p-4 shadow-2xl"
              >
                <p className="text-sm mb-1 opacity-80">Déclarations</p>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs opacity-70">À jour</p>
              </motion.div>

              {/* Floating Card 4 - Bottom */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl p-4 shadow-2xl border border-gray-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Votre entreprise</p>
                  <p className="font-bold text-gray-900">Meras PSP</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted Companies */}
      <section className="py-16 px-6 lg:px-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-10 tracking-wide">
            ILS NOUS FONT CONFIANCE
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8">
            {['Djibouti Telecom', 'Port de Djibouti', 'Ethiopian Airlines', 'Bank of Africa', 'Sheraton'].map((company) => (
              <div key={company} className="opacity-40 hover:opacity-100 transition-opacity">
                <p className="text-gray-900 font-bold text-lg">{company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Boxes Section */}
      <section className="py-24 px-6 lg:px-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Donnez à votre gestion des<br />super-pouvoirs secrets
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: "Créer un compte",
                subtitle: "En quelques minutes",
                color: "bg-blue-100",
                textColor: "text-blue-900"
              },
              {
                title: "Gérer",
                subtitle: "Employés, paie et congés",
                color: "bg-purple-100",
                textColor: "text-purple-900"
              },
              {
                title: "Analyser",
                subtitle: "Avec BI en temps réel",
                color: "bg-green-100",
                textColor: "text-green-900"
              }
            ].map((box, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className={`${box.color} ${box.textColor} rounded-3xl p-10 h-64 flex flex-col justify-end hover:scale-105 transition-transform cursor-pointer`}>
                  <h3 className="text-3xl font-bold mb-2">{box.title}</h3>
                  <p className="text-lg opacity-80">{box.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white px-10 py-7 h-auto text-lg rounded-full font-semibold"
            >
              Créer un compte
            </Button>
          </div>
        </div>
      </section>

      {/* Main Features with Images */}
      <section id="solutions" className="py-32 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-40">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Automatisez votre paie en un clic
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Notre moteur intelligent calcule salaires, CNSS, ITS et génère vos bulletins instantanément. Conformé au code du travail Djiboutien.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Calcul CNSS automatique (salarié + patronal)",
                  "ITS progressif selon le barème officiel",
                  "Génération de bulletins PDF professionnels",
                  "Envoi automatique par email et SMS"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg text-gray-700">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={handleGetStarted}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 h-auto rounded-full text-lg"
              >
                En savoir plus
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img 
                src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80" 
                alt="Paie Automatisée" 
                className="rounded-3xl shadow-2xl w-full"
              />
            </motion.div>
          </div>

          {/* Feature 2 - Reversed */}
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-40">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
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
              className="order-1 lg:order-2"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Pilotez avec des insights en temps réel
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Visualisez vos coûts RH, suivez vos budgets et prenez des décisions éclairées avec nos dashboards interactifs.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Tableaux de bord en temps réel",
                  "Alertes et prédictions intelligentes",
                  "Exports Excel et PDF illimités",
                  "Analyse par département et catégorie"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg text-gray-700">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={handleGetStarted}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 h-auto rounded-full text-lg"
              >
                Découvrir BI
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Sécurité et conformité garanties
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Vos données RH sont critiques. Nous utilisons les mêmes standards de sécurité que les banques internationales.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Cryptage SSL de bout en bout",
                  "Audit trail complet de toutes les actions",
                  "Contrôle d'accès par rôle (RBAC)",
                  "Backup quotidien automatique"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg text-gray-700">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={handleGetStarted}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 h-auto rounded-full text-lg"
              >
                En savoir plus sur la sécurité
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img 
                src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80" 
                alt="Sécurité" 
                className="rounded-3xl shadow-2xl w-full"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-32 px-6 lg:px-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Tous les outils dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600">
              Une suite complète pour gérer chaque aspect de votre entreprise
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Gestion des Employés",
                points: ["Dossiers centralisés", "Documents numériques", "Suivi des contrats"]
              },
              {
                icon: DollarSign,
                title: "Paie Automatisée",
                points: ["Calcul CNSS & ITS", "Bulletins PDF", "Envoi automatique"]
              },
              {
                icon: FileText,
                title: "Déclarations CNSS",
                points: ["Génération auto", "Paiement en ligne", "Rappels SMS"]
              },
              {
                icon: Calendar,
                title: "Gestion des Congés",
                points: ["Workflow digital", "Approbations", "Notifications"]
              },
              {
                icon: BarChart3,
                title: "Business Intelligence",
                points: ["Dashboards live", "Prédictions IA", "Exports illimités"]
              },
              {
                icon: Shield,
                title: "Sécurité",
                points: ["Cryptage SSL", "Audit trail", "RBAC"]
              },
              {
                icon: Building2,
                title: "Gestion Budgétaire",
                points: ["Budgets département", "Suivi dépenses", "Alertes"]
              },
              {
                icon: Target,
                title: "Conformité",
                points: ["Documents légaux", "Rappels auto", "Archivage"]
              },
              {
                icon: Globe,
                title: "Multi-services",
                points: ["Location bureaux", "Courrier", "Réceptionniste"]
              }
            ].map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 bg-white shadow-sm hover:shadow-xl transition-all h-full">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-5">
                      <service.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                    <ul className="space-y-2">
                      {service.points.map((point, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-600">
                          <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-7 h-auto text-lg rounded-full font-semibold"
            >
              Créer un compte maintenant
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-32 px-6 lg:px-12 bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 text-white">
            {[
              { number: "500+", label: "Entreprises" },
              { number: "15K+", label: "Employés gérés" },
              { number: "2.5M+", label: "Bulletins générés" },
              { number: "98%", label: "Satisfaction" }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <p className="text-6xl font-bold mb-3">{stat.number}</p>
                <p className="text-xl text-purple-100">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted Payment Partners */}
      <section className="py-32 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-gray-900 text-white px-6 py-2 rounded-full text-sm font-bold mb-8 tracking-wide">
              TRUSTED PARTNERS
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Secure Payment <span className="text-yellow-400">Options*</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pay securely with Djibouti's leading banks and payment platforms powered by Meras Gateway
            </p>
          </div>

          {/* Bank Logos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-6">
            {[
              { name: 'Meras PSP', logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png' },
              { name: 'CIC', text: 'CIC' },
              { name: 'East Africa Bank', text: 'EAST AFRICA BANK' },
              { name: 'SABA Bank', text: 'SABA AFRICAN BANK' },
              { name: 'World Finance', text: 'WF' }
            ].map((partner, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-2 border-gray-200 bg-white hover:shadow-xl transition-all">
                  <CardContent className="p-8 flex items-center justify-center h-32">
                    {partner.logo ? (
                      <img src={partner.logo} alt={partner.name} className="w-16 h-16 object-contain" />
                    ) : (
                      <p className="text-xl font-bold text-gray-700">{partner.text}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { name: 'SabaPay', text: 'SabaPay' },
              { name: 'D-Money', text: 'D-MONEY' },
              { name: 'Visa', text: 'VISA' },
              { name: 'Mastercard', text: 'Mastercard' }
            ].map((method, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-2 border-gray-200 bg-white hover:shadow-xl transition-all">
                  <CardContent className="p-8 flex items-center justify-center h-32">
                    <p className="text-2xl font-bold text-gray-700">{method.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center text-gray-600">
            <p>Powered by <span className="font-bold text-purple-600">Meras Payment Gateway</span> • Secure SSL Encrypted Transactions</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 lg:px-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600">
              Pas de frais cachés. Choisissez le plan qui correspond à votre entreprise.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "25,000",
                period: "DJF/mois",
                desc: "Pour petites entreprises",
                features: ["20 employés max", "Paie auto", "CNSS", "Congés", "Support email"]
              },
              {
                name: "Business",
                price: "50,000",
                period: "DJF/mois",
                desc: "Pour entreprises en croissance",
                popular: true,
                features: ["100 employés", "Tout Starter", "BI avancé", "Location", "Support prioritaire", "Formation"]
              },
              {
                name: "Enterprise",
                price: "Sur devis",
                period: "",
                desc: "Pour grandes entreprises",
                features: ["Illimité", "Tout Business", "Manager dédié", "SLA", "API", "Personnalisation"]
              }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`border-2 ${plan.popular ? 'border-purple-600 shadow-2xl' : 'border-gray-200'} bg-white relative overflow-hidden`}>
                  {plan.popular && (
                    <div className="bg-purple-600 text-white text-center py-2 text-sm font-semibold">
                      ⭐ Le plus populaire
                    </div>
                  )}
                  <CardContent className="p-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6">{plan.desc}</p>
                    <div className="mb-8">
                      <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                      {plan.period && <p className="text-gray-500 mt-1">{plan.period}</p>}
                    </div>
                    <Button 
                      onClick={handleGetStarted}
                      className={`w-full py-6 rounded-full font-semibold mb-8 ${
                        plan.popular 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      Choisir {plan.name}
                    </Button>
                    <ul className="space-y-3">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-gray-700">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span>{f}</span>
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

      {/* Final CTA */}
      <section className="py-32 px-6 lg:px-12 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Prêt à commencer?
            </h2>
            <p className="text-2xl text-gray-400 mb-12">
              Essai gratuit 30 jours. Sans carte bancaire.
            </p>
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-white hover:bg-gray-100 text-gray-900 px-12 py-8 h-auto text-xl font-bold rounded-full shadow-2xl"
            >
              Créer un compte gratuitement
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 px-6 lg:px-12 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                  alt="Logo" 
                  className="w-10 h-10"
                />
                <span className="text-2xl font-bold text-gray-900">Paie360</span>
              </div>
              <p className="text-gray-600 max-w-md">
                La solution RH complète pour les entreprises Djiboutiennes
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
              <ul className="space-y-3 text-gray-600 text-sm">
                <li>+253 77 XX XX XX</li>
                <li>contact@paie360.com</li>
                <li>Djibouti City</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 text-center text-gray-600">
            <p>© 2025 Paie360. Powered by <span className="text-purple-600 font-bold">Meras PSP</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}