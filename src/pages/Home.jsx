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
  Sparkles,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleGetStarted = () => {
    // Redirect to base44 authentication with Dashboard as next page
    meras.auth.redirectToLogin(createPageUrl('Dashboard'));
  };

  const handleLogin = () => {
    // Redirect to base44 authentication with Dashboard as next page
    meras.auth.redirectToLogin(createPageUrl('Dashboard'));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                alt="Paie360 Logo" 
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Paie360
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#solutions" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Solutions
              </a>
              <a href="#features" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Fonctionnalités
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Tarifs
              </a>
              <a href="#contact" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                Contact
              </a>
            </div>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                onClick={handleLogin}
                variant="ghost" 
                className="text-gray-700 hover:text-indigo-600 font-medium"
              >
                Se connecter
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30"
              >
                Commencer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4">
                <a 
                  href="#solutions" 
                  className="text-gray-600 hover:text-indigo-600 font-medium px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Solutions
                </a>
                <a 
                  href="#features" 
                  className="text-gray-600 hover:text-indigo-600 font-medium px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Fonctionnalités
                </a>
                <a 
                  href="#pricing" 
                  className="text-gray-600 hover:text-indigo-600 font-medium px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Tarifs
                </a>
                <a 
                  href="#contact" 
                  className="text-gray-600 hover:text-indigo-600 font-medium px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <div className="flex flex-col gap-2 px-4 pt-4 border-t border-gray-200">
                  <Button 
                    onClick={() => {
                      handleLogin();
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Se connecter
                  </Button>
                  <Button 
                    onClick={() => {
                      handleGetStarted();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  >
                    Commencer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-600">Solution RH 100% Djiboutienne</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Gérez votre paie en
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> 5 minutes</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                La première plateforme de paie et RH conçue spécifiquement pour les entreprises Djiboutiennes. 
                Conforme CNSS, ITS et code du travail.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={handleGetStarted}
                  size="lg" 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30 text-lg px-8 py-6 h-auto"
                >
                  Essai gratuit - 30 jours
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-6 h-auto"
                  onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
                >
                  Planifier une démo
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Sans carte bancaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Support 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Données sécurisées</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80" 
                  alt="Dashboard Preview" 
                  className="rounded-2xl shadow-2xl border border-gray-200"
                />
                {/* Floating Stats */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">98%</p>
                      <p className="text-sm text-gray-600">Satisfaction</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-xl p-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white mb-1">2.5M+</p>
                    <p className="text-sm text-indigo-200">Bulletins traités</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-gray-400 mb-12 text-lg">Approuvé par les entreprises leaders à Djibouti</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
            {['Djibouti Telecom', 'Port de Djibouti', 'Ethiopian Airlines', 'Bank of Africa', 'Sheraton Djibouti'].map((company, idx) => (
              <div key={idx} className="text-center">
                <p className="text-lg font-semibold text-gray-400 hover:text-white transition-colors">
                  {company}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Une solution complète pour votre entreprise
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                De la paie aux déclarations, en passant par les congés et les évaluations, 
                tout ce dont vous avez besoin en un seul endroit.
              </p>
            </motion.div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Gestion des Employés",
                description: "Base de données centralisée avec tous les documents et informations nécessaires. Suivi des contrats, visas et formations.",
                color: "from-indigo-500 to-purple-500",
                benefits: ["Dossiers numériques", "Onboarding simplifié", "Documents centralisés"]
              },
              {
                icon: DollarSign,
                title: "Paie Automatisée",
                description: "Calcul conforme CNSS, ITS et génération automatique des bulletins de paie. Zéro erreur, gain de temps garanti.",
                color: "from-green-500 to-emerald-500",
                benefits: ["CNSS automatique", "ITS progressif", "Bulletins PDF"]
              },
              {
                icon: FileText,
                title: "Déclarations CNSS",
                description: "Génération et suivi des déclarations mensuelles avec rappels automatiques. Paiement en ligne sécurisé.",
                color: "from-blue-500 to-cyan-500",
                benefits: ["Rappels SMS", "Paiement en ligne", "Historique complet"]
              },
              {
                icon: Calendar,
                title: "Gestion des Congés",
                description: "Workflow complet de demande et approbation avec notifications SMS. Calcul automatique des soldes.",
                color: "from-purple-500 to-pink-500",
                benefits: ["Workflow digital", "Notifications SMS", "Soldes automatiques"]
              },
              {
                icon: BarChart3,
                title: "Rapports & Analyses",
                description: "Tableaux de bord interactifs et exports détaillés pour une meilleure visibilité sur vos coûts RH.",
                color: "from-orange-500 to-red-500",
                benefits: ["Dashboards live", "Exports Excel", "KPIs temps réel"]
              },
              {
                icon: Shield,
                title: "Sécurité Renforcée",
                description: "Audit trail, contrôle d'accès et conformité aux standards bancaires. Vos données sont protégées.",
                color: "from-red-500 to-pink-500",
                benefits: ["Audit trail", "RBAC", "Cryptage SSL"]
              }
            ].map((solution, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-2 border-gray-200 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 h-full group">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 bg-gradient-to-br ${solution.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <solution.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {solution.description}
                    </p>
                    <ul className="space-y-2">
                      {solution.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{benefit}</span>
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

      {/* Features Detail Section */}
      <section id="features" className="py-24 px-6 lg:px-8 bg-gradient-to-br from-indigo-50 to-white">
        <div className="max-w-7xl mx-auto">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-6">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-600">Automatisation Intelligente</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Gagnez 80% de votre temps sur la paie
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Notre moteur de calcul automatique prend en compte toutes les spécificités du code du travail Djiboutien. 
                Plus d'erreurs, plus de stress.
              </p>
              <ul className="space-y-4">
                {[
                  "Calcul automatique CNSS (employé + employeur)",
                  "ITS progressif selon barème Djiboutien",
                  "Primes, indemnités et déductions personnalisables",
                  "Génération des bulletins de paie en PDF",
                  "Envoi automatique par email et SMS"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-lg text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80" 
                alt="Payroll Automation" 
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" 
                alt="Analytics Dashboard" 
                className="rounded-2xl shadow-2xl"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-6">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-600">Vision 360°</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Pilotez votre masse salariale en temps réel
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Tableaux de bord interactifs, rapports détaillés et exports Excel pour 
                une analyse approfondie de vos coûts RH.
              </p>
              <ul className="space-y-4">
                {[
                  "Dashboard avec KPIs en temps réel",
                  "Évolution de la masse salariale",
                  "Répartition par département",
                  "Exports Excel et PDF illimités",
                  "Historique complet des cycles de paie"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-lg text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 lg:px-8 bg-gradient-to-r from-gray-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            {[
              { number: "500+", label: "Entreprises clientes", icon: Users },
              { number: "15K+", label: "Employés gérés", icon: Users },
              { number: "2.5M+", label: "Bulletins générés", icon: FileText },
              { number: "98%", label: "Satisfaction client", icon: Star }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <stat.icon className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
                <p className="text-5xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.number}
                </p>
                <p className="text-gray-400 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600">
              Choisissez le plan qui correspond à la taille de votre entreprise
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "25,000",
                period: "/mois",
                description: "Pour les petites entreprises",
                features: [
                  "Jusqu'à 20 employés",
                  "Paie automatisée",
                  "Déclarations CNSS",
                  "Gestion des congés",
                  "Support email",
                  "1 utilisateur admin"
                ],
                cta: "Commencer",
                popular: false
              },
              {
                name: "Business",
                price: "50,000",
                period: "/mois",
                description: "Pour les entreprises en croissance",
                features: [
                  "Jusqu'à 100 employés",
                  "Tout dans Starter",
                  "Rapports avancés",
                  "Gestion de location",
                  "Support prioritaire",
                  "5 utilisateurs admins",
                  "Formations incluses"
                ],
                cta: "Choisir Business",
                popular: true
              },
              {
                name: "Enterprise",
                price: "Sur devis",
                period: "",
                description: "Pour les grandes entreprises",
                features: [
                  "Employés illimités",
                  "Tout dans Business",
                  "Account manager dédié",
                  "SLA garanti",
                  "Formation sur site",
                  "Utilisateurs illimités",
                  "API & intégrations"
                ],
                cta: "Nous contacter",
                popular: false
              }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`relative border-2 ${plan.popular ? 'border-indigo-500 shadow-2xl scale-105' : 'border-gray-200'} hover:shadow-xl transition-all h-full`}>
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-semibold shadow-lg">
                      ⭐ Le plus populaire
                    </div>
                  )}
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                      {plan.period && <span className="text-gray-600 ml-2 text-lg">{plan.period}</span>}
                    </div>
                    <Button 
                      onClick={handleGetStarted}
                      className={`w-full mb-6 ${plan.popular ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
                    >
                      {plan.cta}
                    </Button>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">{feature}</span>
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
      <section className="py-24 px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à transformer votre gestion RH?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Rejoignez des centaines d'entreprises qui font confiance à Paie360
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-white text-indigo-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto shadow-2xl"
            >
              Essai gratuit - 30 jours
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-indigo-600 text-lg px-8 py-6 h-auto"
              onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
            >
              <Phone className="w-5 h-5 mr-2" />
              Nous appeler
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Contactez-nous
            </h2>
            <p className="text-xl text-gray-600">
              Notre équipe est là pour répondre à toutes vos questions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Téléphone</h3>
                <p className="text-gray-600">+253 77 XX XX XX</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600">contact@paie360.com</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Horaires</h3>
                <p className="text-gray-600">Lun-Ven 8h-18h</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardContent className="p-8">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-700 font-semibold">Nom complet *</Label>
                    <Input placeholder="John Doe" className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Email *</Label>
                    <Input type="email" placeholder="john@entreprise.dj" className="mt-2" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold">Entreprise</Label>
                  <Input placeholder="Nom de votre entreprise" className="mt-2" />
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold">Message *</Label>
                  <Textarea 
                    placeholder="Comment pouvons-nous vous aider?"
                    className="mt-2 min-h-[120px]"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-6 text-lg"
                >
                  Envoyer le message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                  alt="Paie360 Logo" 
                  className="w-10 h-10 object-contain"
                />
                <span className="text-2xl font-bold">Paie360</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                La solution RH complète pour les entreprises Djiboutiennes. Automatisez votre paie, 
                vos déclarations et votre gestion des employés.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-lg">Produit</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sécurité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Intégrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-lg">Entreprise</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Presse</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-lg">Support</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+253 77 XX XX XX</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>contact@paie360.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Lun-Ven 8h-18h</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>© 2025 Paie360. Tous droits réservés. Powered by <span className="text-indigo-400 font-semibold">Meras PSP</span></p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">Conditions</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}