import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { meras } from "@/components/core/MerasClient";
import {
  ArrowRight, Phone, Mail, MapPin, Menu, X, Building2, Clock,
  Globe, FileText, Search, Users, Shield, Target, ChevronRight,
  ChevronDown, Facebook, Twitter, Linkedin, User, GitBranch,
  DollarSign, Package, Timer, AlertCircle, BadgeCheck,
  LogIn, Plus, CheckCircle, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

const entityDocs = {
  morale: {
    label: "Personne Morale",
    subtitle: "Sociétés & entreprises",
    icon: Building2,
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "Carte Nationale d'Identité (CNI), passeport, carte séjour original (associés/gérant)" },
      { num: "02", title: "Bail Commercial", desc: "Contrat de bail pour enregistrement, le cas échéant signature d'une lettre d'engagement" },
      { num: "03", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
      { num: "04", title: "Statut Juridique", desc: "4 exemplaires des statuts rédigés (acte notarié ou acte sous seing privée)" },
      { num: "05", title: "Personne Morale Actionnaire", desc: "Extrait de registre de commerce des sociétés de la personne morale actionnaire, le cas échéant" },
      { num: "06", title: "Statuts Actionnaire", desc: "Copie certifiée conforme des statuts de la société de la personne morale actionnaire, le cas échéant" },
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
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "CNI, passeport, carte séjour original (associés/gérant)" },
      { num: "02", title: "Bail Commercial", desc: "Contrat de bail pour enregistrement, le cas échéant signature d'une lettre d'engagement" },
      { num: "03", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
      { num: "04", title: "Statuts traduits", desc: "Copie certifiée conforme des statuts de la société étrangère avec traduction (authentifiée)" },
      { num: "05", title: "Extrait Registre Commerce", desc: "Extrait de registre de commerce de la société étrangère avec traduction authentifiée" },
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

const chartData = [
  { value: 40 }, { value: 70 }, { value: 55 }, { value: 90 },
  { value: 60 }, { value: 85 }, { value: 75 },
];

const partners = [
  { name: 'CNSS', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-CNSS-1-150x146.png' },
  { name: 'Djibouti Telecom', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/djibtel-1.png' },
  { name: 'EDD', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/edd-1.png' },
  { name: 'FDED', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/fded-1-150x150.png' },
  { name: 'IND', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/ind-1.png' },
  { name: 'MCPT', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-MCPT-1.png' },
];

const services = [
  { icon: Building2, title: "Création d'entreprise", desc: "Constituez votre société en toute simplicité grâce au Guichet Unique. Chaque étape est soigneusement accompagnée." },
  { icon: Search, title: "Dénomination Sociale", desc: "Réservez votre nom commercial et vérifiez sa disponibilité avant de lancer votre activité." },
  { icon: FileText, title: "Annonces Légales", desc: "Consultez en ligne la liste des entreprises créées au Guichet Unique et publiez vos annonces légales." },
  { icon: Globe, title: "Immatriculation Fiscale", desc: "Obtenez votre NIF (Numéro d'Identification Fiscale) et effectuez toutes vos formalités fiscales en un lieu." },
  { icon: Users, title: "Affiliation CNSS", desc: "Procédez à l'affiliation sociale de votre entreprise et de vos employés auprès de la CNSS." },
  { icon: Shield, title: "Registre de Commerce", desc: "Obtenez votre récépissé d'immatriculation au Registre du Commerce via l'ODPIC en un seul dépôt." },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('morale');
  const [activeTab, setActiveTab] = useState('pieces');
  const [ctaDropOpen, setCtaDropOpen] = useState(false);
  const ctaRef = useRef(null);

  const handleGetStarted = () => meras.auth.redirectToLogin('/onboarding');
  const handleLogin = () => meras.auth.redirectToLogin('/onboarding');

  useEffect(() => {
    const handleClick = (e) => {
      if (ctaRef.current && !ctaRef.current.contains(e.target)) setCtaDropOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F2EF] text-gray-900">

      {/* ── Floating Pill Navbar ── */}
      <div className="sticky top-0 z-50 flex justify-center pt-4 pb-2 px-4">
        <nav className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-sm px-5 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png" alt="Guichet Unique" className="w-8 h-8 object-contain" />
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Guichet Unique</p>
              <p className="text-[10px] text-gray-400 leading-tight">ANPI — Djibouti</p>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#services" className="hover:text-gray-900 transition-colors">Services</a>
            <a href="#documentation" className="hover:text-gray-900 transition-colors">Tarifs</a>
            <a href="#telechargements" className="hover:text-gray-900 transition-colors">Documents</a>
            <a href="#mission" className="hover:text-gray-900 transition-colors">Mission</a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">Contact</a>
            <a href="https://anpi.dj" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors flex items-center gap-1">ANPI <Globe className="w-3 h-3" /></a>
          </div>

          {/* CTA Dropdown */}
          <div className="hidden md:block relative" ref={ctaRef}>
            <button
              onClick={() => setCtaDropOpen(v => !v)}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Espace Client <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${ctaDropOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {ctaDropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden"
                >
                  <button onClick={() => { handleLogin(); setCtaDropOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 cursor-pointer">
                    <LogIn className="w-4 h-4 text-gray-400" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">Se connecter</p>
                      <p className="text-xs text-gray-400">Accéder à mon espace</p>
                    </div>
                  </button>
                  <button onClick={() => { handleGetStarted(); setCtaDropOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-orange-50 transition-colors cursor-pointer">
                    <Plus className="w-4 h-4 text-orange-500" />
                    <div className="text-left">
                      <p className="font-semibold text-orange-600">Créer votre société</p>
                      <p className="text-xs text-gray-400">Démarrer l'enregistrement</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" aria-label="Menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-4 right-4 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 z-40 flex flex-col gap-1"
            >
              {[
                { label: 'Services', href: '#services' },
                { label: 'Tarifs', href: '#documentation' },
                { label: 'Documents', href: '#telechargements' },
                { label: 'Mission', href: '#mission' },
                { label: 'Contact', href: '#contact' },
              ].map(item => (
                <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 font-medium py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  {item.label}
                </a>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-2">
                <button onClick={handleLogin} className="w-full text-sm font-semibold py-2.5 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">Se connecter</button>
                <button onClick={handleGetStarted} className="w-full text-sm font-semibold py-2.5 px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors cursor-pointer">Créer votre société</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hero Section ── */}
      <section className="pt-16 pb-0 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs font-medium mb-8 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            Au service des opérateurs économiques djiboutiens
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 leading-[1.02] tracking-tight max-w-4xl mx-auto mb-6" style={{ textWrap: 'balance' }}>
            Créez Votre<br />
            <span className="text-gray-400">Entreprise</span><br />
            à Djibouti
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Le Guichet Unique réunit toutes les démarches administratives en un seul lieu — à coût réduit, dans un délai minimum de 72h.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            <button onClick={handleGetStarted}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-2xl transition-colors text-base cursor-pointer shadow-sm">
              Créer votre société
              <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#procedures"
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-8 py-4 rounded-2xl transition-colors text-base border border-gray-200 cursor-pointer">
              Guide de création
            </a>
          </div>
        </motion.div>

        {/* ── 3-Column Visual Row ── */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Left photo */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            className="md:translate-y-4 rounded-3xl overflow-hidden aspect-[4/5] bg-gray-200">
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80"
              alt="Entrepreneurs collaborant au bureau"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </motion.div>

          {/* Center stats card */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-left">
            <p className="text-xs text-gray-400 font-medium mb-1">Entreprises enregistrées</p>
            <p className="text-4xl font-bold text-gray-900 mb-4">5 000+</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={16} barCategoryGap="30%">
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={i === 3 || i === 5 ? '#6ee7b7' : '#1f2937'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-gray-400">Délai min : <strong className="text-red-500">72h</strong></span>
              <span className="text-gray-400">Guichet UN : <strong className="text-green-600">+48%</strong></span>
            </div>
          </motion.div>

          {/* Right photo */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
            className="md:translate-y-4 rounded-3xl overflow-hidden aspect-[4/5] bg-gray-200">
            <img
              src="https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80"
              alt="Réunion d'affaires à Djibouti"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Partners Scroll Strip ── */}
      <section className="py-16 px-6 bg-[#F2F2EF] border-t border-gray-200 mt-8 overflow-hidden">
        <p className="text-center text-xs font-semibold tracking-widest text-gray-400 uppercase mb-8">Partenaires institutionnels</p>
        <div className="flex gap-16 items-center justify-center flex-wrap">
          {partners.map((p) => (
            <img key={p.name} src={p.logo} alt={p.name} className="h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-50 hover:opacity-100 transition-all duration-300" />
          ))}
        </div>
      </section>

      {/* ── About / Stats Band ── */}
      <section id="mission" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start mb-20">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">(Notre Mission)</p>
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight" style={{ textWrap: 'balance' }}>
                Le Guichet Unique Accompagne Votre Croissance
              </h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="pt-2">
              <p className="text-gray-500 text-base leading-relaxed mb-6">
                Le Guichet Unique a pour mission de permettre aux opérateurs économiques nationaux et étrangers d'accomplir toutes les formalités administratives en un seul lieu, à un coût réduit, dans un délai minimum.
              </p>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                Il réunit des représentants de tous les partenaires (ODPIC, DGI, CNSS…) sous un même toit, simplifiant radicalement le parcours de création d'entreprise à Djibouti.
              </p>
              <button onClick={handleGetStarted}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors cursor-pointer text-sm">
                Commencer maintenant <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "5 000+", label: "Entreprises créées", sub: "Depuis l'ouverture du guichet" },
              { value: "72h", label: "Délai minimum", sub: "Procédure standard" },
              { value: "1 Lieu", label: "Guichet unique", sub: "Toutes démarches réunies" },
              { value: "4.9★", label: "Satisfaction", sub: "Évaluation opérateurs" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100">
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm font-semibold text-gray-700 mb-1">{stat.label}</p>
                <p className="text-xs text-gray-400 leading-snug">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">(Nos Services)</p>
              <h2 className="text-5xl font-bold text-gray-900 tracking-tight leading-tight" style={{ textWrap: 'balance' }}>
                Services Conçus pour<br />Simplifier Votre Parcours
              </h2>
            </div>
            <button onClick={handleGetStarted}
              className="flex-shrink-0 flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-5 py-3 rounded-xl transition-colors cursor-pointer text-sm">
              Démarrer <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.07 }}
                className="group bg-[#F2F2EF] hover:bg-gray-900 rounded-2xl p-6 transition-colors duration-300 cursor-pointer">
                <div className="w-10 h-10 bg-white group-hover:bg-white/10 rounded-xl flex items-center justify-center mb-5 transition-colors">
                  <service.icon className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-gray-900 group-hover:text-white text-base mb-2 transition-colors">{service.title}</h3>
                <p className="text-gray-500 group-hover:text-gray-300 text-sm leading-relaxed transition-colors">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="procedures" className="py-24 px-6 bg-[#F2F2EF]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">(Guide étape par étape)</p>
            <h2 className="text-5xl font-bold text-gray-900 tracking-tight" style={{ textWrap: 'balance' }}>
              Créez votre entreprise en 4 étapes simples
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { number: "01", title: "Réservation de nom", desc: "Vérifiez et réservez votre dénomination sociale sur ODPIC" },
              { number: "02", title: "Dépôt du dossier", desc: "Soumettez vos documents au Guichet Unique en ligne ou en présentiel" },
              { number: "03", title: "Traitement ANPI", desc: "Nos agents traitent votre demande en un délai minimum de 72h" },
              { number: "04", title: "Obtention des agréments", desc: "Recevez vos documents officiels : RC, NIF, certificat CNSS" },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-sm mb-5">{step.number}</div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Documentation & Tarifs ── */}
      <section id="documentation" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">(Documentation officielle)</p>
            <h2 className="text-5xl font-bold text-gray-900 tracking-tight mb-4">Procédures & Tarifs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Consultez les pièces requises, tarifs officiels et documents délivrés selon votre type d'entité.</p>
          </div>

          {/* Entity selector */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            {Object.entries(entityDocs).map(([key, ent]) => (
              <button key={key} onClick={() => { setSelectedEntity(key); setActiveTab('pieces'); }}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all border cursor-pointer ${
                  selectedEntity === key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-[#F2F2EF] text-gray-700 border-gray-200 hover:border-gray-400'
                }`}>
                <ent.icon className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-bold leading-tight">{ent.label}</p>
                  <p className={`text-xs font-normal ${selectedEntity === key ? 'text-gray-300' : 'text-gray-400'}`}>{ent.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Tab panel */}
          {(() => {
            const ent = entityDocs[selectedEntity];
            return (
              <motion.div key={selectedEntity} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className="bg-[#F2F2EF] rounded-3xl border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 overflow-x-auto bg-white rounded-t-3xl">
                  {[
                    { id: 'pieces', label: 'Pièces requises', icon: FileText },
                    { id: 'tarifs', label: 'Tarification', icon: DollarSign },
                    { id: 'delais', label: 'Délais', icon: Timer },
                    { id: 'documents', label: 'Documents délivrés', icon: Package },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                        activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
                      }`}>
                      <tab.icon className="w-4 h-4" />{tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-8">
                  {activeTab === 'pieces' && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {ent.pieces.map((p, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                          <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{p.num}</div>
                          <div><p className="font-semibold text-gray-900 text-sm">{p.title}</p><p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{p.desc}</p></div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'tarifs' && (
                    <div className="space-y-2">
                      {ent.tarifs.map((t, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                          <span className="text-gray-700 text-sm font-medium">{t.label}</span>
                          <span className="font-bold text-sm bg-gray-900 text-white px-3 py-1 rounded-full">{t.amount}</span>
                        </motion.div>
                      ))}
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed"><strong>Exonération patente :</strong> Classes 5–8, dégressive 3 ans : 100% / 50% / 25%. Applicable aux gérants djiboutiens &lt;31 ans (première activité).</p>
                      </div>
                    </div>
                  )}
                  {activeTab === 'delais' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { label: "Standard", sub: "Procédure normale", value: "3 jours", color: "bg-white" },
                        { label: "Express", sub: "Création VIP accélérée", value: "1 jour", color: "bg-gray-900 text-white" },
                      ].map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          className={`p-6 rounded-2xl border border-gray-100 ${d.color}`}>
                          <p className={`font-bold text-lg mb-1 ${i === 1 ? 'text-white' : 'text-gray-900'}`}>{d.label}</p>
                          <p className={`text-xs mb-4 ${i === 1 ? 'text-gray-300' : 'text-gray-400'}`}>{d.sub}</p>
                          <p className={`text-5xl font-bold ${i === 1 ? 'text-white' : 'text-gray-900'}`}>{d.value}</p>
                          <p className={`text-sm mt-1 ${i === 1 ? 'text-gray-300' : 'text-gray-500'}`}>ouvrable(s)</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'documents' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ent.documents.map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                          className="p-4 bg-white rounded-2xl border border-gray-100 flex items-start gap-3">
                          <BadgeCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{d.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 bg-gray-100 px-2 py-0.5 rounded-full inline-block">{d.agency}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-8 py-5 bg-white border-t border-gray-100 rounded-b-3xl flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <p className="text-sm text-gray-500">Prêt à créer votre <strong>{ent.label}</strong> ?</p>
                  <div className="flex gap-3">
                    <a href="https://odpic.dj/publication-registre/" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors font-medium">
                      <Search className="w-3.5 h-3.5" /> Vérifier une dénomination
                    </a>
                    <button onClick={handleGetStarted}
                      className="flex items-center gap-1.5 text-sm bg-gray-900 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer">
                      Créer maintenant <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </section>

      {/* ── Downloads ── */}
      <section id="telechargements" className="py-24 px-6 bg-[#F2F2EF]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">(Ressources officielles)</p>
            <h2 className="text-5xl font-bold text-gray-900 tracking-tight mb-4">Téléchargements</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Modèles juridiques, formulaires administratifs et textes réglementaires.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Statuts */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-1">Modèles de Statuts</h3>
              <p className="text-xs text-gray-400 mb-4">Statuts juridiques types</p>
              <div className="space-y-2">
                {[
                  { label: "Statut EURL", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Statut_EURL.doc" },
                  { label: "Statut SARL", url: "https://guichet-unique-djib.com/wp-content/uploads/2025/03/Statut_SARL.docx" },
                  { label: "Statut SAS", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/statut_SAS.doc" },
                  { label: "Statut SA", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/statut_SAS.doc" },
                  { label: "Statut SASU", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Statut_SASU.docx" },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-[#F2F2EF] rounded-xl hover:bg-gray-100 transition-colors group">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Formulaires */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-1">Formulaires GUI</h3>
              <p className="text-xs text-gray-400 mb-4">Documents administratifs</p>
              <div className="space-y-2">
                {[
                  { label: "Formulaire Personne Physique", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Formulaire-unique-personne-physique-24.pdf" },
                  { label: "Formulaire Personne Morale", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-personne-morale2024.pdf" },
                  { label: "Formulaire ANEFIP", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-pour-TRAVAILLEUR.pdf" },
                  { label: "Formulaire Titre de séjour", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-pour-ETRANGER.pdf" },
                  { label: "Formulaire DATUH", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-DATUH.pdf" },
                  { label: "Formulaire Domaines", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire_unique_de-_domaines.pdf" },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-[#F2F2EF] rounded-xl hover:bg-gray-100 transition-colors group">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Textes juridiques */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-1">Textes Juridiques</h3>
              <p className="text-xs text-gray-400 mb-4">Lois et réglementations</p>
              <div className="space-y-2">
                {[
                  { label: "Loi N°179 — Création d'Entreprise", url: "https://www.djiboutinvest.com/attachments/article/349/LOI%20N%20179.pdf" },
                  { label: "Loi N°191", url: "https://www.djiboutinvest.com/attachments/article/349/LOI%20N%20191.pdf" },
                  { label: "Note de service ANPI.GU", url: "https://www.djiboutinvest.com/attachments/article/349/Note%20de%20service%20ANPI.GU.pdf" },
                  { label: "Loi n°001/AN/18 — Code de Commerce", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N001-Modification-Code-de-Commerce.pdf" },
                  { label: "Loi n°003/AN/18 — Code Civil", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N003-Code-Civil.pdf" },
                  { label: "Loi n°005/AN/18 — Code Général des Impôts", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N005-Modifiant-le-Code-G%D0%92n%D0%92ral-des-Impots.pdf" },
                ].map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-[#F2F2EF] rounded-xl hover:bg-gray-100 transition-colors group">
                    <span className="text-sm font-medium text-gray-700 leading-snug">{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors flex-shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <a href="https://guichet-unique-djib.com/telechargements/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
              Voir tous les documents officiels <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section className="py-24 px-6 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-10 items-center justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4" style={{ textWrap: 'balance' }}>
              Prêt à créer votre entreprise<br />à Djibouti ?
            </h2>
            <p className="text-gray-300 text-base max-w-md">Plus besoin de vous déplacer. La création d'entreprise est désormais disponible en ligne via le Guichet Unique numérique.</p>
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0">
            <button onClick={handleGetStarted}
              className="flex items-center justify-center gap-2 bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer text-base">
              Créer votre société <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/procedures"
              className="flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white font-medium px-8 py-4 rounded-2xl transition-colors text-sm">
              Toutes les procédures <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-24 px-6 bg-[#F2F2EF]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">(Contact)</p>
            <h2 className="text-5xl font-bold text-gray-900 tracking-tight">Contactez-nous</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Phone, title: "Téléphone", info: "+253 21 33 34 00", sub: "Lundi – Vendredi, 8h–17h" },
              { icon: Mail, title: "Email", info: "contact@anpi.dj", sub: "Réponse sous 24h" },
              { icon: MapPin, title: "Adresse", info: "Boulevard de la République", sub: "Djibouti City, Djibouti" },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 border border-gray-100 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <c.icon className="w-5 h-5 text-gray-700" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                <p className="font-semibold text-gray-700 text-sm">{c.info}</p>
                <p className="text-gray-400 text-xs mt-1">{c.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png" alt="Guichet Unique" className="w-9 h-9 object-contain" />
                <div>
                  <p className="font-bold text-white text-base leading-tight">Guichet Unique</p>
                  <p className="text-gray-400 text-xs">ANPI — Djibouti</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">L'Agence Nationale pour la Promotion des Investissements facilite les démarches de création d'entreprises à Djibouti.</p>
              <div className="flex items-center gap-4 mt-5">
                <Facebook className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="font-semibold text-white mb-4">Navigation</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                  <li><a href="#documentation" className="hover:text-white transition-colors">Tarifs</a></li>
                  <li><a href="#telechargements" className="hover:text-white transition-colors">Documents</a></li>
                  <li><a href="#mission" className="hover:text-white transition-colors">Notre Mission</a></li>
                  <li><a href="https://odpic.dj/publication-registre/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Annonces Légales</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Contact</h4>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-500" /> +253 21 33 34 00</li>
                  <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-500" /> contact@anpi.dj</li>
                  <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-500" /> Djibouti City</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Liens utiles</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="https://anpi.dj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">anpi.dj</a></li>
                  <li><a href="https://odpic.dj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">odpic.dj</a></li>
                  <li><Link to="/procedures" className="hover:text-white transition-colors">Procédures</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-xs">
            <p>© 2026 Guichet Unique — ANPI Djibouti. Tous droits réservés.</p>
            <p>Powered by <span className="text-gray-300 font-semibold">Meras PSP</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}