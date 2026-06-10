import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  ChevronDown,
  Facebook,
  Twitter,
  Linkedin,
  User,
  GitBranch,
  DollarSign,
  Package,
  Timer,
  AlertCircle,
  BadgeCheck,
  LogIn,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

const entityDocs = {
  morale: {
    label: "Personne Morale",
    subtitle: "Sociétés & entreprises",
    icon: Building2,
    color: "blue",
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "Carte Nationale d'Identité (CNI), passeport, carte séjour original (associés/gérant)" },
      { num: "02", title: "Bail Commercial", desc: "Contrat de bail pour enregistrement, le cas échéant signature d'une lettre d'engagement" },
      { num: "03", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
      { num: "04", title: "Statut Juridique", desc: "4 exemplaires des statuts rédigés (acte notarié ou acte sous seing privée)" },
      { num: "05", title: "Personne Morale Actionnaire", desc: "Extrait de registre de commerce des sociétés de la personne morale actionnaire (étrangère ou djiboutienne), le cas échéant" },
      { num: "06", title: "Statuts Actionnaire", desc: "Copie certifiée conforme des statuts de la société de la personne morale actionnaire (étrangère ou djiboutienne), le cas échéant" },
    ],
    tarifs: [
      { label: "Immatriculation registre de commerce", amount: "18 000 DJF" },
      { label: "Certificat Négatif", amount: "5 000 DJF" },
      { label: "Bail (loyer < 100 000)", amount: "60 000 + timbre" },
      { label: "Bail (loyer 101 000–400 000)", amount: "150 000 + timbre" },
      { label: "Bail (loyer > 400 000)", amount: "210 000 + timbre" },
      { label: "Enregistrement des statuts", amount: "10 000 + timbre" },
      { label: "Patente", amount: "Selon l'activité" },
    ],
    documents: [
      { title: "Certificat Négatif", agency: "ODPIC" },
      { title: "Registre de commerce", agency: "ODPIC" },
      { title: "Patente d'activité", agency: "DGI" },
      { title: "Statuts enregistrés", agency: "DGI" },
      { title: "Bail commercial enregistré", agency: "DGI" },
      { title: "Notification d'immatriculation", agency: "DGI" },
      { title: "Boîte postale", agency: "Poste de Djibouti" },
    ],
  },
  physique: {
    label: "Personne Physique",
    subtitle: "Entrepreneurs individuels",
    icon: User,
    color: "green",
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "Carte Nationale d'Identité (CNI), passeport, carte séjour original" },
      { num: "02", title: "Photos", desc: "3 photos d'identité" },
      { num: "03", title: "Bail Commercial", desc: "Contrat de bail pour enregistrement, le cas échéant signature d'une lettre d'engagement" },
      { num: "04", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
    ],
    tarifs: [
      { label: "Immatriculation registre de commerce", amount: "18 000 DJF" },
      { label: "Certificat Négatif", amount: "5 000 DJF" },
      { label: "Bail (loyer < 100 000)", amount: "60 000 + timbre" },
      { label: "Bail (loyer 101 000–400 000)", amount: "150 000 + timbre" },
      { label: "Bail (loyer > 400 000)", amount: "210 000 + timbre" },
      { label: "Enregistrement des statuts", amount: "10 000 + timbre" },
      { label: "Patente", amount: "Selon l'activité" },
    ],
    documents: [
      { title: "Certificat Négatif", agency: "ODPIC" },
      { title: "Registre de commerce", agency: "ODPIC" },
      { title: "Patente d'activité", agency: "DGI" },
      { title: "Bail commercial enregistré", agency: "DGI" },
      { title: "Notification d'immatriculation", agency: "DGI" },
      { title: "Boîte postale", agency: "Poste de Djibouti" },
    ],
  },
  succursale: {
    label: "Succursale",
    subtitle: "Établissements secondaires",
    icon: GitBranch,
    color: "purple",
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "Carte Nationale d'Identité (CNI), passeport, carte séjour original (associés/gérant)" },
      { num: "02", title: "Bail Commercial", desc: "Contrat de bail pour enregistrement, le cas échéant signature d'une lettre d'engagement" },
      { num: "03", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
      { num: "04", title: "Statuts traduits", desc: "Copie certifiée conforme des statuts de la société étrangère avec traduction Français ou Arabe (authentifiée par notaire ou avocat)" },
      { num: "05", title: "Extrait Registre Commerce", desc: "Extrait de registre de commerce de la société étrangère avec traduction Français ou Arabe (authentifié)" },
      { num: "06", title: "Décision de création", desc: "Décision de la société étrangère de créer une succursale" },
    ],
    tarifs: [
      { label: "Immatriculation registre de commerce", amount: "18 000 DJF" },
      { label: "Certificat Négatif", amount: "5 000 DJF" },
      { label: "Bail (loyer < 100 000)", amount: "60 000 + timbre" },
      { label: "Bail (loyer 101 000–400 000)", amount: "150 000 + timbre" },
      { label: "Bail (loyer > 400 000)", amount: "210 000 + timbre" },
      { label: "Enregistrement des statuts", amount: "10 000 + timbre" },
      { label: "Patente", amount: "Selon l'activité" },
    ],
    documents: [
      { title: "Certificat Négatif", agency: "ODPIC" },
      { title: "Registre de commerce", agency: "ODPIC" },
      { title: "Patente d'activité", agency: "DGI" },
      { title: "Statuts enregistrés", agency: "DGI" },
      { title: "Bail commercial enregistré", agency: "DGI" },
      { title: "Notification d'immatriculation", agency: "DGI" },
      { title: "Boîte postale", agency: "Poste de Djibouti" },
    ],
  },
};

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('morale');
  const [activeTab, setActiveTab] = useState('pieces');
  const [ctaDropOpen, setCtaDropOpen] = useState(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ctaRef.current && !ctaRef.current.contains(e.target)) setCtaDropOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleGetStarted = () => {
    meras.auth.redirectToLogin('/onboarding');
  };

  const handleCreateCompany = () => {
    meras.auth.redirectToLogin('/onboarding');
  };

  const handleLogin = () => {
    meras.auth.redirectToLogin('/onboarding');
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

            <div className="hidden md:flex items-center gap-6 text-sm">
              <a href="#services" className="text-gray-600 hover:text-blue-700 font-medium transition-colors whitespace-nowrap">Services</a>
              <a href="#documentation" className="text-gray-600 hover:text-blue-700 font-medium transition-colors whitespace-nowrap">Tarifs</a>
              <a href="#telechargements" className="text-gray-600 hover:text-blue-700 font-medium transition-colors whitespace-nowrap">Documents</a>
              <a href="#mission" className="text-gray-600 hover:text-blue-700 font-medium transition-colors whitespace-nowrap">Mission</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-700 font-medium transition-colors whitespace-nowrap">Contact</a>
              <a href="https://anpi.dj" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 font-semibold transition-colors flex items-center gap-1 whitespace-nowrap">ANPI <Globe className="w-3 h-3" /></a>
            </div>

            {/* CTA Dropdown */}
            <div className="hidden md:block relative" ref={ctaRef}>
              <button
                onClick={() => setCtaDropOpen(v => !v)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
              >
                Espace Client
                <ChevronDown className={`w-4 h-4 transition-transform ${ctaDropOpen ? 'rotate-180' : ''}`} />
              </button>
              {ctaDropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                  <button onClick={() => { handleLogin(); setCtaDropOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <LogIn className="w-4 h-4 text-gray-400" />
                    <div className="text-left">
                      <p className="font-semibold">Se connecter</p>
                      <p className="text-xs text-gray-400">Accéder à mon espace</p>
                    </div>
                  </button>
                  <button onClick={() => { handleGetStarted(); setCtaDropOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors">
                    <Plus className="w-4 h-4 text-orange-500" />
                    <div className="text-left">
                      <p className="font-semibold text-orange-600">Créer votre société</p>
                      <p className="text-xs text-gray-400">Démarrer l'enregistrement</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-6 border-t border-gray-100">
              <div className="flex flex-col space-y-1 pt-4">
                {[
                  { label: 'Accueil', href: '#accueil' },
                  { label: 'Nos Services', href: '#services' },
                  { label: 'Tarifs & Docs', href: '#documentation' },
                  { label: 'Téléchargements', href: '#telechargements' },
                  { label: 'Notre Mission', href: '#mission' },
                  { label: 'Contact', href: '#contact' },
                ].map(item => (
                  <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="text-gray-700 font-medium py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">{item.label}</a>
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
              { icon: FileText, title: "Guide de Création", desc: "Consultez les étapes nécessaires à la création de votre société", link: "#procedures", color: "border-blue-200 hover:border-blue-400", internal: false },
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

      {/* Téléchargements */}
      <section id="telechargements" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Ressources officielles</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Téléchargements</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Trouvez ici tous les documents importants : modèles juridiques, formulaires administratifs et textes réglementaires.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Modèles de statuts */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-800 text-white rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Modèles de Statuts</h3>
                  <p className="text-xs text-gray-500">Statuts juridiques types</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Statut EURL", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Statut_EURL.doc" },
                  { label: "Statut SARL", url: "https://guichet-unique-djib.com/wp-content/uploads/2025/03/Statut_SARL.docx" },
                  { label: "Statut SAS", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/statut_SAS.doc" },
                  { label: "Statut SA", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/statut_SAS.doc" },
                  { label: "Statut SASU", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Statut_SASU.docx" },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-blue-100 transition-colors group border border-blue-100">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-blue-800">{item.label}</span>
                    <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-blue-700 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Formulaires GUI */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-green-50 border border-green-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-700 text-white rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Formulaires GUI</h3>
                  <p className="text-xs text-gray-500">Documents administratifs</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Formulaire Personne Physique", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Formulaire-unique-personne-physique-24.pdf" },
                  { label: "Formulaire Personne Morale", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-personne-morale2024.pdf" },
                  { label: "Formulaire ANEFIP", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-pour-TRAVAILLEUR.pdf" },
                  { label: "Formulaire Titre de séjour", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-pour-ETRANGER.pdf" },
                  { label: "Formulaire DATUH", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-DATUH.pdf" },
                  { label: "Formulaire Domaines", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire_unique_de-_domaines.pdf" },
                  { label: "Formulaire Djibouti Telecom", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Formulaire-Djibouti-Telecom-Internet.pdf" },
                  { label: "Formulaire EDD", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/FORMULAIRES-EDD.pdf" },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-green-100 transition-colors group border border-green-100">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-green-800">{item.label}</span>
                    <ArrowRight className="w-4 h-4 text-green-400 group-hover:text-green-700 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Textes Juridiques + Activités réglementées */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col gap-6">
              {/* Textes juridiques */}
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex-1">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-purple-700 text-white rounded-xl flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900">Textes Juridiques</h3>
                    <p className="text-xs text-gray-500">Lois et réglementations</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Loi N°179 — Création d'Entreprise", url: "https://www.djiboutinvest.com/attachments/article/349/LOI%20N%20179.pdf" },
                    { label: "Loi N°191", url: "https://www.djiboutinvest.com/attachments/article/349/LOI%20N%20191.pdf" },
                    { label: "Note de service ANPI.GU", url: "https://www.djiboutinvest.com/attachments/article/349/Note%20de%20service%20ANPI.GU.pdf" },
                    { label: "Loi n°001/AN/18 — Code de Commerce", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N001-Modification-Code-de-Commerce.pdf" },
                    { label: "Loi n°003/AN/18 — Code Civil", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N003-Code-Civil.pdf" },
                    { label: "Loi n°005/AN/18 — Code Général des Impôts", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N005-Modifiant-le-Code-G%D0%92n%D0%92ral-des-Impots.pdf" },
                  ].map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-purple-100 transition-colors group border border-purple-100">
                      <span className="text-sm font-medium text-gray-800 group-hover:text-purple-800 leading-snug">{item.label}</span>
                      <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-purple-700 flex-shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Activités réglementées */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center"><AlertCircle className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900">Activités Réglementées</h3>
                    <p className="text-xs text-gray-500">Agréments requis selon l'activité</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">Certaines activités nécessitent un agrément préalable auprès des autorités compétentes. Consultez la liste complète sur le site officiel.</p>
                <a href="https://guichet-unique-djib.com/telechargements/#section5" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  Voir les activités réglementées <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>

          <div className="mt-8 text-center">
            <a href="https://guichet-unique-djib.com/telechargements/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold text-sm transition-colors">
              Voir tous les documents officiels sur le site du Guichet Unique <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Documentation & Procédures */}
      <section id="documentation" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Documentation officielle</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Procédures & Tarifs</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Consultez les pièces requises, tarifs officiels et documents délivrés selon votre type d'entité.
            </p>
          </div>

          {/* Entity Type Selector */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            {Object.entries(entityDocs).map(([key, ent]) => (
              <button
                key={key}
                onClick={() => { setSelectedEntity(key); setActiveTab('pieces'); }}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base transition-all border-2 ${
                  selectedEntity === key
                    ? 'bg-blue-800 text-white border-blue-800 shadow-lg scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-700'
                }`}
              >
                <ent.icon className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-bold leading-tight">{ent.label}</p>
                  <p className={`text-xs font-normal ${selectedEntity === key ? 'text-blue-200' : 'text-gray-500'}`}>{ent.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Tabs */}
          {(() => {
            const ent = entityDocs[selectedEntity];
            return (
              <motion.div key={selectedEntity} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {[
                    { id: 'pieces', label: 'Pièces requises', icon: FileText },
                    { id: 'tarifs', label: 'Tarification', icon: DollarSign },
                    { id: 'delais', label: 'Délais', icon: Timer },
                    { id: 'documents', label: 'Documents délivrés', icon: Package },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                        activeTab === tab.id
                          ? 'border-blue-700 text-blue-700 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-8">
                  {activeTab === 'pieces' && (
                    <div>
                      <p className="text-gray-500 mb-6 text-sm">Documents obligatoires à fournir pour la création d'une <strong>{ent.label}</strong>.</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        {ent.pieces.map((p, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                            <div className="w-9 h-9 bg-blue-800 text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{p.num}</div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{p.title}</p>
                              <p className="text-gray-600 text-sm mt-0.5 leading-relaxed">{p.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'tarifs' && (
                    <div>
                      <p className="text-gray-500 mb-6 text-sm">Tarifs officiels en vigueur (en Francs Djiboutiens).</p>
                      <div className="space-y-3">
                        {ent.tarifs.map((t, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors">
                            <span className="text-gray-700 text-sm font-medium">{t.label}</span>
                            <span className="font-bold text-orange-600 text-sm bg-orange-100 px-3 py-1 rounded-full">{t.amount}</span>
                          </motion.div>
                        ))}
                      </div>
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-semibold mb-1">Exonération de patente</p>
                          <p>Les activités de la classe 5 à 8 bénéficient d'une exonération dégressive les 3 premières années : <strong>100%</strong> (an 1), <strong>50%</strong> (an 2), <strong>25%</strong> (an 3). Applicable aux gérants djiboutiens de moins de 31 ans (première activité) ou retraités/licenciés pour motif économique.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'delais' && (
                    <div>
                      <p className="text-gray-500 mb-6 text-sm">Délais officiels selon le Décret n° 146/2018/PR/MAPCl du 12 avril 2018.</p>
                      <div className="grid md:grid-cols-2 gap-6">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-800 text-white rounded-xl flex items-center justify-center font-bold">01</div>
                            <div>
                              <p className="font-bold text-gray-900">Standard</p>
                              <p className="text-xs text-gray-500">Procédure normale</p>
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-blue-800 mb-1">3 jours</p>
                          <p className="text-sm text-gray-600">ouvrables</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-orange-50 border border-orange-100 rounded-2xl">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-bold">02</div>
                            <div>
                              <p className="font-bold text-gray-900">Express</p>
                              <p className="text-xs text-gray-500">Création VIP accélérée</p>
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-orange-600 mb-1">1 jour</p>
                          <p className="text-sm text-gray-600">ouvrable</p>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div>
                      <p className="text-gray-500 mb-6 text-sm">Documents officiels que vous recevrez à l'issue de la procédure.</p>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ent.documents.map((d, i) => (
                          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                            <BadgeCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{d.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 bg-white px-2 py-0.5 rounded-full inline-block border border-gray-200">{d.agency}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <p className="text-sm text-gray-500">Prêt à créer votre <strong>{ent.label}</strong> ?</p>
                  <div className="flex gap-3">
                    <Button asChild variant="outline" size="sm" className="border-gray-300">
                      <a href="https://odpic.dj/publication-registre/" target="_blank" rel="noopener noreferrer">
                        <Search className="w-4 h-4 mr-2" /> Vérifier une dénomination
                      </a>
                    </Button>
                    <Button onClick={handleGetStarted} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                      Créer maintenant <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
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

      {/* Procedures CTA Banner */}
      <section className="py-16 px-6 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-orange-400 font-semibold text-sm tracking-widest uppercase mb-3">Guide complet</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">Toutes les procédures administratives en détail</h2>
              <p className="text-blue-200 leading-relaxed">Création d'entreprise, permis de travail, raccordement, permis de construire, paiement des impôts… Retrouvez le guide officiel de toutes les démarches pour investir à Djibouti.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Création d'entreprise", anchor: "creation" },
                { label: "Permis de travail & séjour", anchor: "sejour" },
                { label: "Paiement des impôts", anchor: "impots" },
                { label: "Raccordement", anchor: "raccordement" },
                { label: "Obtention d'un terrain", anchor: "terrain" },
                { label: "Permis de construire", anchor: "permis" },
              ].map((item, i) => (
                <Link key={i} to={`/procedures#${item.anchor}`} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors border border-white/10">
                  <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <Link to="/procedures">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-6 h-auto text-lg rounded-lg">
                Consulter toutes les procédures <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
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