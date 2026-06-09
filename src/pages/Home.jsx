import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Building2,
  Clock,
  Globe,
  FileText,
  Search,
  Users,
  Shield,
  Target,
  ChevronRight,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    meras.auth.redirectToLogin('/onboarding');
  };

  const handleCreateCompany = () => {
    meras.auth.redirectToLogin('/onboarding');
  };

  const handleLogin = () => {
    meras.auth.redirectToLogin('/Dashboard');
  };

  const partners = [
    { name: 'CNSS', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-CNSS-1-150x146.png' },
    { name: 'Djibouti Telecom', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/djibtel-1.png' },
    { name: 'EDD', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/edd-1.png' },
    { name: 'FDED', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/fded-1-150x150.png' },
    { name: 'IND', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/ind-1.png' },
    { name: 'MCPT', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-MCPT-1.png' },
    { name: 'MHUE', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-MHUE-1-150x150.png' },
  ];

  const services = [
    {
      icon: Building2,
      title: "Création d'entreprise",
      desc: "Constituez votre société en toute simplicité grâce au Guichet Unique. Chaque étape est soigneusement accompagnée.",
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100"
    },
    {
      icon: Search,
      title: "Dénomination Sociale",
      desc: "Réservez votre nom commercial et vérifiez sa disponibilité avant de lancer votre activité.",
      color: "bg-green-50",
      iconColor: "text-green-600",
      iconBg: "bg-green-100"
    },
    {
      icon: FileText,
      title: "Annonces Légales",
      desc: "Consultez en ligne la liste des entreprises créées au Guichet Unique et publiez vos annonces légales.",
      color: "bg-orange-50",
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100"
    },
    {
      icon: Globe,
      title: "Immatriculation Fiscale",
      desc: "Obtenez votre NIF (Numéro d'Identification Fiscale) et effectuez toutes vos formalités fiscales en un lieu.",
      color: "bg-purple-50",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100"
    },
    {
      icon: Users,
      title: "Affiliation CNSS",
      desc: "Procédez à l'affiliation sociale de votre entreprise et de vos employés auprès de la CNSS.",
      color: "bg-red-50",
      iconColor: "text-red-600",
      iconBg: "bg-red-100"
    },
    {
      icon: Shield,
      title: "Registre de Commerce",
      desc: "Obtenez votre récépissé d'immatriculation au Registre du Commerce via l'ODPIC en un seul dépôt.",
      color: "bg-teal-50",
      iconColor: "text-teal-600",
      iconBg: "bg-teal-100"
    }
  ];

  const steps = [
    { number: "01", title: "Réservation de nom", desc: "Vérifiez et réservez votre dénomination sociale" },
    { number: "02", title: "Dépôt du dossier", desc: "Soumettez vos documents au Guichet Unique" },
    { number: "03", title: "Traitement ANPI", desc: "Nos agents traitent votre demande rapidement" },
    { number: "04", title: "Obtention des agréments", desc: "Recevez vos documents officiels (RC, NIF, CNSS)" },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-sm py-2 px-6 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Fixe : +253 21 33 34 00</span>
            <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Boulevard de la République, Djibouti</span>
          </div>
          <div className="flex items-center gap-4">
            <Facebook className="w-4 h-4 cursor-pointer hover:text-blue-400 transition-colors" />
            <Twitter className="w-4 h-4 cursor-pointer hover:text-sky-400 transition-colors" />
            <Linkedin className="w-4 h-4 cursor-pointer hover:text-blue-300 transition-colors" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img
                src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
                alt="Guichet Unique"
                className="w-12 h-12 object-contain"
              />
              <div>
                <p className="font-bold text-gray-900 text-lg leading-tight">Guichet Unique</p>
                <p className="text-xs text-gray-500">ANPI — Agence Nationale pour la Promotion des Investissements</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#accueil" className="text-gray-700 hover:text-blue-700 font-medium transition-colors">Accueil</a>
              <a href="#services" className="text-gray-700 hover:text-blue-700 font-medium transition-colors">Nos Services</a>
              <a href="#procedures" className="text-gray-700 hover:text-blue-700 font-medium transition-colors">Procédures</a>
              <a href="#mission" className="text-gray-700 hover:text-blue-700 font-medium transition-colors">Notre Mission</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-700 font-medium transition-colors">Contact</a>
              <a href="https://anpi.dj" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 font-semibold transition-colors">ANPI</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button onClick={handleLogin} variant="outline" className="border-gray-300 text-gray-700 font-medium">
                Se connecter
              </Button>
              <Button onClick={handleGetStarted} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6">
                Créer votre société
              </Button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-6 border-t border-gray-100">
              <div className="flex flex-col space-y-3 pt-4">
                {['Accueil', 'Nos Services', 'Procédures', 'Notre Mission', 'Contact'].map(item => (
                  <a key={item} href={`#${item.toLowerCase().replace(/ /g, '')}`} onClick={() => setMobileMenuOpen(false)} className="text-gray-700 font-medium py-1">{item}</a>
                ))}
                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <Button onClick={handleLogin} variant="outline" className="w-full">Se connecter</Button>
                  <Button onClick={handleGetStarted} className="w-full bg-orange-500 hover:bg-orange-600">Créer votre société</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="accueil" className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-8">
                <Globe className="w-4 h-4" />
                Au service des opérateurs économiques
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
                Création<br />
                <span className="text-orange-400">d'Entreprise</span><br />
                à Djibouti
              </h1>
              <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-xl">
                Créez votre société en toute simplicité et efficacité grâce au Guichet Unique, où chaque étape est soigneusement accompagnée.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={handleGetStarted} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-10 py-6 h-auto font-bold rounded-lg shadow-xl">
                  Créer votre société
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button onClick={() => document.getElementById('procedures')?.scrollIntoView({behavior:'smooth'})} size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900 text-lg px-10 py-6 h-auto font-semibold rounded-lg bg-transparent">
                  Guide de création
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { icon: Clock, label: "Délai minimum", value: "72h", color: "bg-white/10" },
                { icon: MapPin, label: "Un seul lieu", value: "Guichet UN", color: "bg-orange-500/90" },
                { icon: Building2, label: "Entreprises créées", value: "5,000+", color: "bg-white/10" },
                { icon: CheckCircle, label: "Coût réduit", value: "Simplifié", color: "bg-white/10" },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className={`${card.color} backdrop-blur-sm rounded-2xl p-6 text-white`}>
                  <card.icon className="w-8 h-8 mb-3 opacity-90" />
                  <p className="text-2xl font-bold mb-1">{card.value}</p>
                  <p className="text-sm opacity-80">{card.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 px-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: FileText, title: "Guide de Création", desc: "Consultez les étapes nécessaires à la création de votre société", link: "#procedures", color: "border-blue-200 hover:border-blue-400" },
              { icon: Search, title: "Dénomination Sociale", desc: "Réservez votre nom commercial et vérifiez sa disponibilité", link: "#", color: "border-green-200 hover:border-green-400" },
              { icon: Globe, title: "Annonces Légales", desc: "Consultez en ligne la liste des entreprises créées au Guichet Unique", link: "https://odpic.dj/publication-registre/", color: "border-orange-200 hover:border-orange-400" },
            ].map((item, i) => (
              <motion.a key={i} href={item.link} target={item.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={`flex items-start gap-4 p-6 border-2 ${item.color} rounded-xl transition-all cursor-pointer group`}>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                  <item.icon className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-auto flex-shrink-0 mt-1" />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Procédure</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Services de Création des Entreprises</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pour créer une entreprise à Djibouti, plusieurs étapes administratives sont nécessaires. Grâce aux différents services gouvernementaux dédiés, le processus est simplifié.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }}>
                <Card className="border-0 bg-white shadow-sm hover:shadow-xl transition-all h-full group">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 ${service.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <service.icon className={`w-7 h-7 ${service.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{service.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button onClick={handleGetStarted} size="lg" className="bg-blue-800 hover:bg-blue-900 text-white px-10 py-6 h-auto text-lg font-semibold rounded-lg">
              Créer votre société maintenant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Steps / Procedures */}
      <section id="procedures" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Guide étape par étape</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Créez votre entreprise<br />en 4 étapes simples
              </h2>
              <p className="text-xl text-gray-600 mb-10">
                Le Guichet Unique réunit des représentants de tous les partenaires sous un même toit. L'ensemble des démarches administratives est effectué en un seul lieu, à coût réduit et dans un délai minimum.
              </p>
              <Button onClick={handleGetStarted} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 h-auto text-lg font-semibold rounded-lg">
                Commencer maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              {steps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-start gap-5 p-6 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                  <div className="w-14 h-14 bg-blue-800 text-white rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:bg-orange-500 transition-colors">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-24 px-6 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 font-semibold text-sm tracking-widest uppercase mb-3">Notre Mission</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Le Guichet Unique</h2>
            <p className="text-blue-200 text-xl max-w-2xl mx-auto">Au service des opérateurs économiques nationaux et étrangers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: "Pourquoi le G.U ?",
                desc: "Dans un contexte économique favorable au développement, les institutions publiques ont décidé de moderniser l'administration pour simplifier les procédures et renforcer la confiance des investisseurs, positionnant l'économie djiboutienne sur la voie d'une croissance durable.",
                icon: Globe
              },
              {
                title: "Mission du G.U",
                desc: "Le Guichet Unique a pour mission de permettre aux opérateurs économiques nationaux et étrangers d'accomplir les formalités et déclarations auxquelles ils sont tenus en un même lieu, à un coût réduit, dans un délai minimum.",
                icon: Target,
                points: ["Un même lieu", "À un coût réduit", "Un délai minimum"]
              },
              {
                title: "C'est quoi le G.U ?",
                desc: "Il s'agit d'un instrument de facilitation des formalités relatives à la création d'entreprises, à l'immatriculation fiscale et sociale ainsi qu'aux services usuels. Il réunit des représentants de tous les partenaires sous un même toit.",
                icon: Building2
              }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <item.icon className="w-10 h-10 text-orange-400 mb-5" />
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-blue-200 leading-relaxed mb-4">{item.desc}</p>
                {item.points && (
                  <ul className="space-y-2">
                    {item.points.map((p, pi) => (
                      <li key={pi} className="flex items-center gap-2 text-orange-300 font-semibold">
                        <CheckCircle className="w-4 h-4" /> {p}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>

          {/* Director's Message */}
          <div className="bg-white/10 rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center">
            <img
              src="https://guichet-unique-djib.com/wp-content/uploads/2024/05/Taieri-1.png"
              alt="Directeur Général ANPI"
              className="w-32 h-32 rounded-full object-cover border-4 border-orange-400 flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <p className="text-lg text-blue-100 italic leading-relaxed mb-4">
                "Le climat des affaires s'est nettement amélioré l'année dernière, avec une hausse notable du nombre de sociétés agréées aux régimes A et B. Cette tendance positive témoigne d'un environnement propice à l'investissement et à l'entrepreneuriat, positionnant ainsi notre économie sur la voie d'une croissance durable."
              </p>
              <p className="font-bold text-white">Mr. Mahdi Darar Obsieh</p>
              <p className="text-orange-400 font-medium">Directeur Général de l'ANPI</p>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Platform CTA */}
      <section className="py-24 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Guichet Unique<br />
                <span className="text-white/90">Startups · Plateformes Digitales · Technologie</span>
              </h2>
              <p className="text-xl text-orange-100 mb-8">
                Plus besoin de vous déplacer. La création d'entreprise est désormais disponible en ligne.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={handleGetStarted} size="lg" className="bg-white text-orange-600 hover:bg-gray-100 font-bold text-lg px-10 py-6 h-auto rounded-lg">
                  Créer en ligne maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
              {[
                { title: "Création en ligne", desc: "Créez votre entreprise en ligne depuis chez vous, sans vous déplacer." },
                { title: "Annonces légales", desc: "Vérifiez la déclaration de votre entreprise en ligne, bientôt disponible." },
                { title: "Dénomination sociale", desc: "Vérifiez la disponibilité de votre nom commercial et réservez-le." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 bg-white/15 rounded-xl p-5">
                  <CheckCircle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white mb-1">{item.title}</p>
                    <p className="text-orange-100 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase mb-2">Nos Partenaires</p>
            <h2 className="text-3xl font-bold text-gray-900">Institutions partenaires</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {partners.map((partner) => (
              <motion.div key={partner.name} whileHover={{ scale: 1.1 }} className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                <img src={partner.logo} alt={partner.name} className="h-16 w-auto object-contain" />
              </motion.div>
            ))}
          </div>

          <div className="mt-16 text-center bg-blue-50 rounded-2xl p-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Vous voulez explorer les opportunités d'investissements ?</h3>
            <p className="text-gray-600 mb-6">Visitez le site de l'ANPI pour découvrir toutes les opportunités disponibles à Djibouti.</p>
            <Button asChild size="lg" className="bg-blue-800 hover:bg-blue-900 text-white px-10 py-6 h-auto font-semibold rounded-lg">
              <a href="https://anpi.dj" target="_blank" rel="noopener noreferrer">
                Visiter l'ANPI
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Contact</p>
            <h2 className="text-4xl font-bold text-gray-900">Contactez-nous</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Phone, title: "Téléphone", info: "+253 21 33 34 00", sub: "Lundi – Vendredi, 8h–17h" },
              { icon: Mail, title: "Email", info: "contact@anpi.dj", sub: "Réponse sous 24h" },
              { icon: MapPin, title: "Adresse", info: "Boulevard de la République", sub: "Djibouti City, Djibouti" },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="border-0 shadow-sm bg-white text-center hover:shadow-lg transition-all">
                  <CardContent className="p-10">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <c.icon className="w-7 h-7 text-blue-700" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{c.title}</h3>
                    <p className="font-semibold text-blue-800">{c.info}</p>
                    <p className="text-gray-500 text-sm mt-1">{c.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png" alt="Guichet Unique" className="w-12 h-12 object-contain" />
                <div>
                  <p className="font-bold text-white text-xl leading-tight">Guichet Unique</p>
                  <p className="text-gray-400 text-xs">ANPI — Djibouti</p>
                </div>
              </div>
              <p className="text-gray-400 max-w-sm leading-relaxed">
                L'Agence Nationale pour la Promotion des Investissements abrite le Guichet Unique, facilitant les démarches administratives pour la création d'entreprises à Djibouti.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-5">Navigation</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#accueil" className="hover:text-white transition-colors">Accueil</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Nos Services</a></li>
                <li><a href="#procedures" className="hover:text-white transition-colors">Procédures</a></li>
                <li><a href="#mission" className="hover:text-white transition-colors">Notre Mission</a></li>
                <li><a href="https://odpic.dj/publication-registre/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Annonces Légales</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-5">Contact</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-400" /> +253 21 33 34 00</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-orange-400" /> contact@anpi.dj</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-400" /> Boulevard de la République, Djibouti</li>
              </ul>
              <div className="flex items-center gap-4 mt-6">
                <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
            <p>© 2025 Guichet Unique — ANPI Djibouti. Tous droits réservés.</p>
            <p>Powered by <span className="text-orange-400 font-semibold">Meras PSP</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}