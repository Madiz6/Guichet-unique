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
  Menu,
  X,
  Building2,
  Mailbox,
  Headphones,
  Plane
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" 
                alt="Paie360 Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">Paie360</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Services</a>
              <a href="#process" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Processus</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Tarifs</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Contact</a>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <Button onClick={handleLogin} variant="ghost" className="text-gray-700">
                Se connecter
              </Button>
              <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white">
                Commencer
              </Button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-4">
                <a href="#services" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Services</a>
                <a href="#process" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Processus</a>
                <a href="#pricing" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Tarifs</a>
                <a href="#contact" className="px-4 py-2" onClick={() => setMobileMenuOpen(false)}>Contact</a>
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
      <section className="pt-24 pb-32 px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                Gestion RH intelligente pour
                <span className="block text-blue-600">entreprises Djiboutiennes</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Automatisez votre paie, vos déclarations CNSS et votre gestion des employés.
                Conforme au code du travail Djiboutien.
              </p>
              
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-12 py-7 h-auto font-semibold rounded-full"
              >
                Commencer gratuitement
              </Button>
              
              <p className="text-sm text-gray-500 mt-6">
                Essai gratuit 30 jours • Sans carte bancaire • Support inclus
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Logos */}
      <section className="py-12 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 mb-8">Ils nous font confiance</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {['Djibouti Telecom', 'Port de Djibouti', 'Ethiopian Airlines', 'Bank of Africa', 'Sheraton'].map((company) => (
              <div key={company} className="flex items-center justify-center">
                <p className="text-gray-400 font-semibold text-sm">{company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-24 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nos Services</h2>
            <p className="text-lg text-gray-600">Tout ce dont votre entreprise a besoin</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: "Gestion des Employés", desc: "Dossiers centralisés, onboarding et suivi complet", features: ["Base de données", "Documents", "Contrats"] },
              { icon: DollarSign, title: "Paie Automatisée", desc: "Calcul CNSS, ITS et bulletins automatiques", features: ["CNSS auto", "ITS conforme", "Bulletins PDF"] },
              { icon: FileText, title: "Déclarations CNSS", desc: "Génération et paiement en ligne", features: ["Rappels SMS", "Paiement en ligne", "Historique"] },
              { icon: Calendar, title: "Gestion des Congés", desc: "Demandes et approbations digitales", features: ["Workflow", "Notifications", "Soldes auto"] },
              { icon: BarChart3, title: "Business Intelligence", desc: "Tableaux de bord et rapports détaillés", features: ["Dashboards", "Exports", "KPIs live"] },
              { icon: Shield, title: "Sécurité", desc: "Protection et conformité maximales", features: ["Cryptage SSL", "Audit trail", "RBAC"] },
              { icon: Building2, title: "Location", desc: "Gestion bureaux et espaces", features: ["Actifs", "Facturation", "Paiements"] },
              { icon: Mailbox, title: "Service Courrier", desc: "Boîte postale et gestion du courrier", features: ["Adresse", "Notification", "24/7"] },
              { icon: Headphones, title: "Réceptionniste", desc: "Numéro 04 avec équipe dédiée", features: ["Numéro local", "24/7", "Accueil"] }
            ].map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border border-gray-200 bg-white hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                      <service.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{service.desc}</p>
                    <div className="space-y-1">
                      {service.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Processus Simple</h2>
            <p className="text-lg text-gray-600">Démarrez en 3 étapes</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Inscription", desc: "Créez votre compte en 2 minutes", icon: Users },
              { num: "02", title: "Configuration", desc: "Ajoutez vos employés et paramètres", icon: Building2 },
              { num: "03", title: "Lancement", desc: "Générez votre première paie", icon: CheckCircle }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border border-gray-200 bg-white hover:shadow-xl transition-all">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-600 font-bold text-sm rounded-full mb-4">
                      {step.num}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                icon: Zap,
                title: "Automatisation Complète",
                desc: "Gagnez 80% de votre temps avec notre moteur de calcul intelligent",
                list: ["Calcul CNSS automatique", "ITS progressif conforme", "Primes personnalisables", "Bulletins PDF instantanés"]
              },
              {
                icon: TrendingUp,
                title: "Pilotage Temps Réel",
                desc: "Visualisez et analysez vos coûts RH en direct",
                list: ["Dashboards interactifs", "Évolution salariale", "Répartition départements", "Exports illimités"]
              },
              {
                icon: Shield,
                title: "Sécurité Bancaire",
                desc: "Protection maximale de vos données sensibles",
                list: ["Cryptage SSL", "Audit complet", "Contrôle d'accès", "Backup quotidien"]
              },
              {
                icon: CheckCircle,
                title: "Support Expert",
                desc: "Notre équipe locale vous accompagne 24/7",
                list: ["Support téléphone", "Formation incluse", "Documentation", "Mises à jour"]
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Card className="border border-gray-200 bg-white h-full">
                  <CardContent className="p-8">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                      <feature.icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 mb-6">{feature.desc}</p>
                    <ul className="space-y-2">
                      {feature.list.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{item}</span>
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

      {/* Stats */}
      <section className="py-20 px-6 lg:px-8 bg-blue-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: "500+", label: "Entreprises" },
              { number: "15K+", label: "Employés" },
              { number: "2.5M+", label: "Bulletins" },
              { number: "98%", label: "Satisfaction" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center text-white">
                <p className="text-5xl font-bold mb-2">{stat.number}</p>
                <p className="text-blue-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Tarifs Transparents</h2>
            <p className="text-lg text-gray-600">Choisissez le plan adapté à votre entreprise</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter", price: "25,000", period: "/mois", popular: false,
                features: ["20 employés max", "Paie auto", "CNSS", "Congés", "Support email"]
              },
              {
                name: "Business", price: "50,000", period: "/mois", popular: true,
                features: ["100 employés", "Tout Starter", "BI avancé", "Location", "Support prioritaire", "Formation"]
              },
              {
                name: "Enterprise", price: "Sur devis", period: "", popular: false,
                features: ["Illimité", "Tout Business", "Manager dédié", "SLA", "API", "Sur site"]
              }
            ].map((plan, idx) => (
              <Card key={idx} className={`border ${plan.popular ? 'border-blue-500 shadow-xl ring-2 ring-blue-500' : 'border-gray-200'} bg-white`}>
                {plan.popular && (
                  <div className="bg-blue-600 text-white text-center py-2 text-sm font-semibold">
                    ⭐ Plus populaire
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 ml-1">{plan.period}</span>}
                  </div>
                  <Button 
                    onClick={handleGetStarted}
                    className={`w-full mb-6 ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
                  >
                    Choisir {plan.name}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 lg:px-8 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à simplifier votre gestion RH?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Essai gratuit 30 jours. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={handleGetStarted} size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-6 h-auto text-lg font-bold">
              Commencer gratuitement
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-6 h-auto text-lg" onClick={() => document.getElementById('contact').scrollIntoView()}>
              Parler à un expert
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Contactez-nous</h2>
              <p className="text-lg text-gray-600 mb-10">
                Notre équipe est disponible pour répondre à vos questions
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Téléphone</h3>
                    <p className="text-gray-600">+253 77 XX XX XX</p>
                    <p className="text-sm text-gray-500">Lun-Ven 8h-18h</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Email</h3>
                    <p className="text-gray-600">contact@paie360.com</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border border-gray-200 bg-white shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Envoyez un message</h3>
                <form className="space-y-5">
                  <div>
                    <Label className="text-gray-700">Nom complet *</Label>
                    <Input placeholder="John Doe" className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Email *</Label>
                    <Input type="email" placeholder="john@entreprise.dj" className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Entreprise</Label>
                    <Input placeholder="Votre entreprise" className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Message *</Label>
                    <Textarea placeholder="Comment pouvons-nous vous aider?" className="mt-2 h-32" />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 font-bold">
                    Envoyer
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" alt="Logo" className="w-8 h-8" />
                <span className="text-xl font-bold">Paie360</span>
              </div>
              <p className="text-gray-400 text-sm">
                Solution RH complète pour entreprises Djiboutiennes
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-3">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#services" className="hover:text-white">Services</a></li>
                <li><a href="#pricing" className="hover:text-white">Tarifs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>+253 77 XX XX XX</li>
                <li>contact@paie360.com</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-400">
            <p>© 2025 Paie360. Powered by <span className="text-blue-400 font-semibold">Meras PSP</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}