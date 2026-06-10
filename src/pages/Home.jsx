import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { meras } from "@/components/core/MerasClient";
import {
  ArrowRight, Phone, Mail, MapPin, Menu, X, Building2,
  Globe, FileText, Search, Users, Shield, User, GitBranch,
  DollarSign, Package, Timer, AlertCircle, BadgeCheck,
  ChevronDown, Facebook, Twitter, Linkedin, LogIn, Plus,
  CheckCircle, TrendingUp, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

/* ─── Data ─── */
const entityDocs = {
  morale: {
    label: "Personne Morale", subtitle: "Sociétés & entreprises", icon: Building2,
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "CNI, passeport, carte séjour original (associés/gérant)" },
      { num: "02", title: "Bail Commercial", desc: "Contrat de bail ou lettre d'engagement" },
      { num: "03", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
      { num: "04", title: "Statut Juridique", desc: "4 exemplaires des statuts rédigés (acte notarié ou sous seing privée)" },
      { num: "05", title: "Personne Morale Actionnaire", desc: "Extrait de registre de commerce de la personne morale actionnaire, le cas échéant" },
      { num: "06", title: "Statuts Actionnaire", desc: "Copie certifiée conforme des statuts de la société actionnaire, le cas échéant" },
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
    label: "Personne Physique", subtitle: "Entrepreneurs individuels", icon: User,
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "CNI, passeport, carte séjour original" },
      { num: "02", title: "Photos", desc: "3 photos d'identité" },
      { num: "03", title: "Bail Commercial", desc: "Contrat de bail ou lettre d'engagement" },
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
    label: "Succursale", subtitle: "Établissements secondaires", icon: GitBranch,
    pieces: [
      { num: "01", title: "Pièces d'identités", desc: "CNI, passeport, carte séjour original (associés/gérant)" },
      { num: "02", title: "Bail Commercial", desc: "Contrat de bail ou lettre d'engagement" },
      { num: "03", title: "Agrément", desc: "Agrément de l'activité, si nécessaire" },
      { num: "04", title: "Statuts traduits", desc: "Copie certifiée conforme des statuts de la société étrangère avec traduction authentifiée" },
      { num: "05", title: "Extrait Registre Commerce", desc: "Extrait de registre de la société étrangère avec traduction authentifiée" },
      { num: "06", title: "Décision de création", desc: "Décision de la société étrangère de créer une succursale à Djibouti" },
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

const services = [
  {
    icon: Building2,
    title: "Création d'entreprise",
    desc: "Constituez votre société en toute simplicité. Chaque étape est accompagnée par nos agents.",
    img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
  },
  {
    icon: Search,
    title: "Dénomination Sociale",
    desc: "Réservez votre nom commercial et vérifiez sa disponibilité avant de lancer votre activité.",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  },
  {
    icon: FileText,
    title: "Annonces Légales",
    desc: "Consultez en ligne la liste des entreprises créées au Guichet Unique et publiez vos annonces.",
    img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
  },
  {
    icon: Globe,
    title: "Immatriculation Fiscale",
    desc: "Obtenez votre NIF (Numéro d'Identification Fiscale) et effectuez toutes vos formalités fiscales.",
    img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
  },
  {
    icon: Users,
    title: "Affiliation CNSS",
    desc: "Procédez à l'affiliation sociale de votre entreprise et de vos employés auprès de la CNSS.",
    img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80",
  },
  {
    icon: Shield,
    title: "Registre de Commerce",
    desc: "Obtenez votre récépissé d'immatriculation au Registre du Commerce via l'ODPIC.",
    img: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&q=80",
  },
];

const chartData = [
  { v: 38 }, { v: 62 }, { v: 48 }, { v: 88 }, { v: 55 }, { v: 78 }, { v: 70 },
];

const partners = [
  { name: 'CNSS', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-CNSS-1-150x146.png' },
  { name: 'Djibouti Telecom', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/djibtel-1.png' },
  { name: 'EDD', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/edd-1.png' },
  { name: 'FDED', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/fded-1-150x150.png' },
  { name: 'IND', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/ind-1.png' },
  { name: 'MCPT', logo: 'https://guichet-unique.craftnovasolutions.com/wp-content/uploads/2024/05/LOGO-MCPT-1.png' },
  { name: 'Meras', logo: 'https://media.base44.com/images/public/69e7c103c0374f336a3dd2b6/bdb98f172_Gemini_Generated_Image_yj3n6yj3n6yj3n6y.png' },
];

/* ─── Arrow Button (Montix style) ─── */
function ArrowBtn({ onClick, children, dark = false, className = "" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group inline-flex items-center gap-3 px-6 py-3.5 rounded-full border font-semibold text-sm transition-all duration-300 cursor-pointer ${
        dark
          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white hover:bg-[#333]'
          : 'bg-white border-[#d4d4d4] text-[#1a1a1a] hover:border-[#1a1a1a]'
      } ${className}`}
    >
      {children}
      <span className="relative flex items-center w-5 h-5 overflow-hidden">
        <ArrowRight className={`w-4 h-4 absolute transition-all duration-300 ${hovered ? '-translate-x-0 opacity-100' : 'translate-x-0 opacity-100'}`} />
      </span>
    </button>
  );
}

/* ─── Main Component ─── */
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('morale');
  const [activeTab, setActiveTab] = useState('pieces');
  const [ctaDropOpen, setCtaDropOpen] = useState(false);
  const ctaRef = useRef(null);

  const handleGetStarted = () => meras.auth.redirectToLogin('/onboarding');
  const handleLogin = () => meras.auth.redirectToLogin('/onboarding');

  useEffect(() => {
    const fn = (e) => { if (ctaRef.current && !ctaRef.current.contains(e.target)) setCtaDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1a1a1a]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════
          NAVBAR  — white bar, full width
      ══════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#F5F5F2] border-b border-[#e8e8e0]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
              alt="Guichet Unique" className="w-9 h-9 object-contain" />
            <span className="font-bold text-[#1a1a1a] text-lg tracking-tight">Guichet Unique</span>
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#555]">
            <a href="#services" className="hover:text-[#1a1a1a] transition-colors">Services</a>
            <a href="#documentation" className="hover:text-[#1a1a1a] transition-colors">Tarifs</a>
            <a href="#telechargements" className="hover:text-[#1a1a1a] transition-colors">Documents</a>
            <a href="#mission" className="hover:text-[#1a1a1a] transition-colors">Mission</a>
            <a href="#contact" className="hover:text-[#1a1a1a] transition-colors">Contact</a>
            <a href="https://anpi.dj" target="_blank" rel="noopener noreferrer"
              className="hover:text-[#1a1a1a] transition-colors flex items-center gap-1">
              ANPI <Globe className="w-3 h-3" />
            </a>
          </nav>

          {/* Right CTA */}
          <div className="hidden md:block relative" ref={ctaRef}>
            <button
              onClick={() => setCtaDropOpen(v => !v)}
              className="inline-flex items-center gap-2.5 bg-[#F7941D] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#e07d0a] transition-colors cursor-pointer"
            >
              Espace Client
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${ctaDropOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <AnimatePresence>
              {ctaDropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-[#e5e5e5] shadow-xl z-50 overflow-hidden"
                >
                  <button onClick={() => { handleLogin(); setCtaDropOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-[#f5f5f5] transition-colors border-b border-[#f0f0f0] cursor-pointer">
                    <LogIn className="w-4 h-4 text-[#999]" />
                    <div className="text-left">
                      <p className="font-semibold text-[#1a1a1a]">Se connecter</p>
                      <p className="text-xs text-[#999]">Accéder à mon espace</p>
                    </div>
                  </button>
                  <button onClick={() => { handleGetStarted(); setCtaDropOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-orange-50 transition-colors cursor-pointer">
                    <Plus className="w-4 h-4 text-orange-500" />
                    <div className="text-left">
                      <p className="font-semibold text-orange-600">Créer votre société</p>
                      <p className="text-xs text-[#999]">Démarrer l'enregistrement</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-white/60 transition-colors cursor-pointer" aria-label="Menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-t border-[#e5e5e5] px-6 py-4 flex flex-col gap-2">
              {['Services', 'Tarifs', 'Documents', 'Mission', 'Contact'].map((l, i) => {
                const hrefs = ['#services', '#documentation', '#telechargements', '#mission', '#contact'];
                return <a key={l} href={hrefs[i]} onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-sm font-medium text-[#555] hover:text-[#1a1a1a] border-b border-[#f0f0f0] last:border-0">{l}</a>;
              })}
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={handleLogin} className="text-sm font-semibold py-3 px-5 border border-[#d4d4d4] rounded-full hover:bg-[#f5f5f5] cursor-pointer transition-colors">Se connecter</button>
                <button onClick={handleGetStarted} className="text-sm font-semibold py-3 px-5 bg-[#F7941D] text-white rounded-full hover:bg-[#e07d0a] cursor-pointer transition-colors">Créer votre société</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══════════════════════════════════════
          HERO — massive headline + 3-col row
      ══════════════════════════════════════ */}
      <section className="pt-16 pb-0 px-6 text-center overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#e0e0e0] text-[#555] px-4 py-1.5 rounded-full text-xs font-medium mb-10 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F7941D] animate-pulse"></span>
            Guichet Unique ANPI — Djibouti
          </div>

          {/* Headline — Montix style: ultra-bold, massive, slight gray on second word */}
          <h1 className="font-black text-[#1a1a1a] leading-[0.95] tracking-[-0.03em] mx-auto mb-6"
            style={{ fontSize: 'clamp(52px, 9vw, 110px)', maxWidth: '900px' }}>
            Créez Votre<br />
            <span style={{ color: '#aaa' }}>Entreprise</span><br />
            à Djibouti
          </h1>

          <p className="text-[#777] text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed font-normal">
            Le Guichet Unique réunit toutes les démarches administratives<br className="hidden md:block" />
            en un seul lieu — délai minimum de 72h.
          </p>

          {/* CTA button — Montix-style outlined rounded pill */}
          <div className="flex items-center justify-center gap-3 mb-20">
            <button onClick={handleGetStarted}
              onMouseEnter={e => e.currentTarget.style.background='#e07d0a'}
              onMouseLeave={e => e.currentTarget.style.background='#F7941D'}
              className="inline-flex items-center gap-3 px-7 py-4 rounded-full font-bold text-sm text-white cursor-pointer transition-colors"
              style={{ background: '#F7941D' }}>
              Créer votre société <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#procedures"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#d4d4d4] text-sm font-semibold text-[#555] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-all duration-300 bg-white">
              Guide de création
            </a>
          </div>
        </motion.div>

        {/* ── 3-column visual row (Montix style: photos + white card floating) ── */}
        <div className="max-w-[1100px] mx-auto grid grid-cols-3 gap-4 items-end">
          {/* Left photo — taller, slightly offset up */}
          <motion.div
            initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="col-span-1 rounded-3xl overflow-hidden bg-[#ddd]"
            style={{ aspectRatio: '4/5', marginBottom: '-40px' }}
          >
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80"
              alt="Entrepreneurs djiboutiens" className="w-full h-full object-cover" fetchpriority="high"
            />
          </motion.div>

          {/* Center — WHITE stats card */}
          <motion.div
            initial={{ opacity: 0, y: 64 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-[#e8e8e8] text-left"
            style={{ marginBottom: '-20px' }}
          >
            <p className="text-xs text-[#999] font-medium mb-1">Entreprises enregistrées</p>
            <p className="font-black text-[#1a1a1a] mb-4" style={{ fontSize: '38px', lineHeight: 1 }}>5 000+</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={14} barCategoryGap="28%" margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                  <Bar dataKey="v" radius={[5, 5, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 3 || i === 5 ? '#86efac' : '#1a1a1a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-[#999]">
              <span>Délai min : <strong className="text-red-400">72h ↓</strong></span>
              <span>Ce mois : <strong className="text-emerald-500">+48% ↑</strong></span>
            </div>
          </motion.div>

          {/* Right photo */}
          <motion.div
            initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="col-span-1 rounded-3xl overflow-hidden bg-[#ddd]"
            style={{ aspectRatio: '4/5', marginBottom: '-40px' }}
          >
            <img
              src="https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80"
              alt="Réunion ANPI Djibouti" className="w-full h-full object-cover" fetchpriority="high"
            />
          </motion.div>
        </div>

        {/* Green organic wave (Montix style) */}
        <div className="w-full overflow-hidden" style={{ marginTop: '-2px', lineHeight: 0 }}>
          <svg viewBox="0 0 1440 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 90 C240 160 480 20 720 90 C960 160 1200 20 1440 90 L1440 180 L0 180 Z" fill="#F7941D" opacity="0.12" />
            <path d="M0 120 C360 60 720 180 1080 120 C1260 90 1380 110 1440 100 L1440 180 L0 180 Z" fill="#F7941D" opacity="0.08" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PARTNERS STRIP
      ══════════════════════════════════════ */}
      <section className="py-16 px-6 bg-white border-b border-[#e8e8e0]">
        <p className="text-center text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-10">
          Partenaires institutionnels de confiance
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12">
          {partners.map((p) => (
            <img key={p.name} src={p.logo} alt={p.name}
              className="h-16 w-auto object-contain grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300" />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          ABOUT / STATS — Montix layout:
          left=big heading + link, right=3 stat blocks
      ══════════════════════════════════════ */}
      <section id="mission" className="py-28 px-6 bg-[#EFEFEF]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start mb-20">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-6">(Notre Mission)</p>
              <h2 className="font-black text-[#1a1a1a] leading-[1] tracking-[-0.03em] mb-8"
                style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
                Le Guichet Unique Accompagne Votre Réussite
              </h2>
              <button onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full border-2 border-[#F7941D] text-[#F7941D] font-semibold text-sm hover:bg-[#F7941D] hover:text-white transition-all duration-300 cursor-pointer">
              Voir nos services <ArrowRight className="w-4 h-4" />
            </button>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <p className="text-[#666] text-base leading-relaxed mb-5">
                Le Guichet Unique a pour mission de permettre aux opérateurs économiques nationaux et étrangers d'accomplir toutes les formalités administratives en un seul lieu, à un coût réduit, dans un délai minimum.
              </p>
              <p className="text-[#666] text-base leading-relaxed">
                Il réunit des représentants de tous les partenaires (ODPIC, DGI, CNSS…) sous un même toit, simplifiant radicalement la création d'entreprise à Djibouti.
              </p>
            </motion.div>
          </div>

          {/* Stats — Montix style: large number, label, sub, divider */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#F7941D]/20 rounded-3xl overflow-hidden">
            {[
              { value: "5 000+", label: "Entreprises créées", sub: "Depuis l'ouverture du guichet" },
              { value: "72h", label: "Délai minimum", sub: "Procédure standard officielle" },
              { value: "1 Lieu", label: "Guichet unique", sub: "Toutes démarches réunies" },
              { value: "4.9 ★", label: "Satisfaction clients", sub: "Évaluation des opérateurs" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-white px-8 py-10">
                <p className="font-black text-[#1a1a1a] mb-2 leading-none tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(28px, 3.5vw, 42px)' }}>{s.value}</p>
                <p className="text-sm font-semibold text-[#1a1a1a] mb-1">{s.label}</p>
                <p className="text-xs text-[#aaa] leading-snug">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SERVICES — Montix: tall portrait cards
          with photo top, icon top-left, text bottom
      ══════════════════════════════════════ */}
      <section id="services" className="py-28 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-5">(Nos Services)</p>
              <h2 className="font-black text-[#1a1a1a] leading-[1] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(36px, 5vw, 60px)', maxWidth: '560px' }}>
                Services Conçus pour Simplifier Votre Parcours
              </h2>
            </div>
            <button onClick={handleGetStarted}
              className="flex-shrink-0 inline-flex items-center gap-2 border-2 border-[#F7941D] text-[#F7941D] hover:bg-[#F7941D] hover:text-white font-semibold px-5 py-3 rounded-full transition-all duration-300 cursor-pointer text-sm">
              Voir tous les services <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cards grid — Montix style portrait cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.6 }}
                className="group bg-[#EFEFEF] rounded-3xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300">
                {/* Photo top */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <img src={s.img} alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  {/* Icon badge top-left */}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <s.icon className="w-5 h-5 text-[#1a1a1a]" />
                  </div>
                </div>
                {/* Text bottom */}
                <div className="p-6">
                  <h3 className="font-bold text-[#1a1a1a] text-base mb-2 leading-snug">{s.title}</h3>
                  <p className="text-[#777] text-sm leading-relaxed">{s.desc}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#1a1a1a] group-hover:gap-3 transition-all duration-300">
                    En savoir plus <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS — 4 steps
      ══════════════════════════════════════ */}
      <section id="procedures" className="py-28 px-6 bg-[#EFEFEF]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-5">(Guide étape par étape)</p>
            <h2 className="font-black text-[#1a1a1a] leading-[1] tracking-[-0.03em] mx-auto"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', maxWidth: '700px' }}>
              Créez votre entreprise en 4 étapes simples
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Réservation de nom", desc: "Vérifiez et réservez votre dénomination sociale sur ODPIC" },
              { n: "02", title: "Dépôt du dossier", desc: "Soumettez vos documents au Guichet Unique en ligne ou en présentiel" },
              { n: "03", title: "Traitement ANPI", desc: "Nos agents traitent votre demande en un délai minimum de 72h" },
              { n: "04", title: "Obtention des agréments", desc: "Recevez vos documents officiels : RC, NIF, certificat CNSS" },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-white rounded-3xl p-7 border border-[#e8e8e8]">
                <div className="w-11 h-11 bg-[#F7941D] text-white rounded-2xl flex items-center justify-center font-bold text-sm mb-6">{step.n}</div>
                <h3 className="font-bold text-[#1a1a1a] text-base mb-2">{step.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DOCUMENTATION & TARIFS
      ══════════════════════════════════════ */}
      <section id="documentation" className="py-28 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-5">(Documentation officielle)</p>
            <h2 className="font-black text-[#1a1a1a] leading-[1] tracking-[-0.03em] mx-auto mb-4"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
              Procédures & Tarifs
            </h2>
            <p className="text-[#888] max-w-lg mx-auto text-sm">Consultez les pièces requises, tarifs officiels et documents délivrés selon votre type d'entité.</p>
          </div>

          {/* Entity selector */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            {Object.entries(entityDocs).map(([key, ent]) => (
              <button key={key} onClick={() => { setSelectedEntity(key); setActiveTab('pieces'); }}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-full font-semibold text-sm transition-all border cursor-pointer ${
                  selectedEntity === key
                    ? 'bg-[#F7941D] text-white border-[#F7941D]'
                    : 'bg-white text-[#555] border-[#d4d4d4] hover:border-[#F7941D] hover:text-[#F7941D]'
                }`}>
                <ent.icon className="w-4 h-4" />
                {ent.label}
              </button>
            ))}
          </div>

          {/* Tab panel */}
          {(() => {
            const ent = entityDocs[selectedEntity];
            return (
              <motion.div key={selectedEntity} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }} className="bg-[#EFEFEF] rounded-3xl overflow-hidden border border-[#e0e0e0]">
                <div className="flex border-b border-[#e0e0e0] overflow-x-auto bg-white">
                  {[
                    { id: 'pieces', label: 'Pièces requises', icon: FileText },
                    { id: 'tarifs', label: 'Tarification', icon: DollarSign },
                    { id: 'delais', label: 'Délais', icon: Timer },
                    { id: 'documents', label: 'Documents délivrés', icon: Package },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                        activeTab === tab.id ? 'border-[#F7941D] text-[#F7941D]' : 'border-transparent text-[#aaa] hover:text-[#555]'
                      }`}>
                      <tab.icon className="w-4 h-4" />{tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-8">
                  {activeTab === 'pieces' && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {ent.pieces.map((p, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#e8e8e8]">
                          <div className="w-8 h-8 bg-[#F7941D] text-white rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0">{p.num}</div>
                          <div>
                            <p className="font-semibold text-[#1a1a1a] text-sm">{p.title}</p>
                            <p className="text-[#888] text-xs mt-1 leading-relaxed">{p.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'tarifs' && (
                    <div className="space-y-2">
                      {ent.tarifs.map((t, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-[#e8e8e8]">
                          <span className="text-[#555] text-sm font-medium">{t.label}</span>
                          <span className="font-bold text-sm bg-[#F7941D] text-white px-3 py-1 rounded-full">{t.amount}</span>
                        </motion.div>
                      ))}
                      <div className="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                          <strong>Exonération patente :</strong> Classes 5–8, dégressive sur 3 ans : 100% / 50% / 25%. Applicable aux gérants djiboutiens de moins de 31 ans (première activité) ou retraités/licenciés économiques.
                        </p>
                      </div>
                    </div>
                  )}
                  {activeTab === 'delais' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { label: "Standard", sub: "Procédure normale", value: "3 jours", light: true },
                        { label: "Express VIP", sub: "Création accélérée", value: "1 jour", light: false },
                      ].map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          className={`p-8 rounded-2xl border ${d.light ? 'bg-white border-[#e8e8e8]' : 'border-[#F7941D]'}`}
                          style={!d.light ? { background: 'linear-gradient(135deg, #F7941D, #e07d0a)' } : {}}>
                          <p className={`font-bold text-lg mb-1 ${d.light ? 'text-[#1a1a1a]' : 'text-white'}`}>{d.label}</p>
                          <p className={`text-xs mb-6 ${d.light ? 'text-[#aaa]' : 'text-[#888]'}`}>{d.sub}</p>
                          <p className={`font-black tracking-[-0.03em] leading-none ${d.light ? 'text-[#1a1a1a]' : 'text-white'}`}
                            style={{ fontSize: '56px' }}>{d.value}</p>
                          <p className={`text-sm mt-2 ${d.light ? 'text-[#888]' : 'text-[#aaa]'}`}>ouvrable(s)</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'documents' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ent.documents.map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                          className="p-5 bg-white rounded-2xl border border-[#e8e8e8] flex items-start gap-3">
                          <BadgeCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-[#1a1a1a] text-sm">{d.title}</p>
                            <span className="text-xs text-[#999] mt-0.5 bg-[#f5f5f5] px-2 py-0.5 rounded-full inline-block">{d.agency}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-8 py-5 bg-white border-t border-[#e8e8e8] flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <p className="text-sm text-[#888]">Prêt à créer votre <strong className="text-[#1a1a1a]">{ent.label}</strong> ?</p>
                  <div className="flex gap-3">
                    <a href="https://odpic.dj/publication-registre/" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm border border-[#d4d4d4] hover:border-[#1a1a1a] px-4 py-2 rounded-full transition-colors font-medium">
                      <Search className="w-3.5 h-3.5" /> Vérifier une dénomination
                    </a>
                    <button onClick={handleGetStarted}
                      className="flex items-center gap-1.5 text-sm bg-[#F7941D] hover:bg-[#e07d0a] text-white font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer">
                      Créer maintenant <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </section>

      {/* ══════════════════════════════════════
          DOWNLOADS
      ══════════════════════════════════════ */}
      <section id="telechargements" className="py-28 px-6 bg-[#EFEFEF]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-5">(Ressources officielles)</p>
            <h2 className="font-black text-[#1a1a1a] leading-[1] tracking-[-0.03em] mx-auto mb-4"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>Téléchargements</h2>
            <p className="text-[#888] max-w-md mx-auto text-sm">Modèles juridiques, formulaires administratifs et textes réglementaires.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: "Modèles de Statuts", sub: "Statuts juridiques types",
                items: [
                  { label: "Statut EURL", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Statut_EURL.doc" },
                  { label: "Statut SARL", url: "https://guichet-unique-djib.com/wp-content/uploads/2025/03/Statut_SARL.docx" },
                  { label: "Statut SAS", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/statut_SAS.doc" },
                  { label: "Statut SA", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/statut_SAS.doc" },
                  { label: "Statut SASU", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Statut_SASU.docx" },
                ]
              },
              {
                title: "Formulaires GUI", sub: "Documents administratifs",
                items: [
                  { label: "Formulaire Personne Physique", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/Formulaire-unique-personne-physique-24.pdf" },
                  { label: "Formulaire Personne Morale", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-personne-morale2024.pdf" },
                  { label: "Formulaire ANEFIP", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-pour-TRAVAILLEUR.pdf" },
                  { label: "Formulaire Titre de séjour", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-pour-ETRANGER.pdf" },
                  { label: "Formulaire DATUH", url: "https://guichet-unique-djib.com/wp-content/uploads/2024/08/formulaire-unique-DATUH.pdf" },
                ]
              },
              {
                title: "Textes Juridiques", sub: "Lois et réglementations",
                items: [
                  { label: "Loi N°179 — Création d'Entreprise", url: "https://www.djiboutinvest.com/attachments/article/349/LOI%20N%20179.pdf" },
                  { label: "Loi N°191", url: "https://www.djiboutinvest.com/attachments/article/349/LOI%20N%20191.pdf" },
                  { label: "Note de service ANPI.GU", url: "https://www.djiboutinvest.com/attachments/article/349/Note%20de%20service%20ANPI.GU.pdf" },
                  { label: "Loi n°001/AN/18 — Code de Commerce", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N001-Modification-Code-de-Commerce.pdf" },
                  { label: "Loi n°005/AN/18 — Code Général des Impôts", url: "https://guichet-unique-djib.com/wp-content/uploads/2018/04/Loi-N005-Modifiant-le-Code-G%D0%92n%D0%92ral-des-Impots.pdf" },
                ]
              },
            ].map((col, ci) => (
              <div key={ci} className="bg-white rounded-3xl p-6 border border-[#e8e8e8]">
                <h3 className="font-bold text-[#1a1a1a] text-base mb-1">{col.title}</h3>
                <p className="text-xs text-[#aaa] mb-5">{col.sub}</p>
                <div className="space-y-2">
                  {col.items.map((item, ii) => (
                    <a key={ii} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#EFEFEF] rounded-2xl hover:bg-[#e4e4e4] transition-colors group">
                      <span className="text-sm font-medium text-[#555] group-hover:text-[#1a1a1a] transition-colors leading-snug">{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#aaa] group-hover:text-[#1a1a1a] transition-colors flex-shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="https://guichet-unique-djib.com/telechargements/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#aaa] hover:text-[#1a1a1a] font-medium transition-colors">
              Voir tous les documents officiels <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA BAND — dark full-width
      ══════════════════════════════════════ */}
      <section className="py-28 px-6 text-white" style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #0d2b0d 100%)' }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-12 items-center justify-between">
          <div>
            <h2 className="font-black text-white leading-[1] tracking-[-0.03em] mb-5"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', maxWidth: '600px' }}>
              Prêt à créer votre entreprise à Djibouti ?
            </h2>
            <p className="text-[#888] text-base max-w-md leading-relaxed">
              La création d'entreprise est disponible en ligne via le Guichet Unique numérique. Plus besoin de vous déplacer.
            </p>
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0">
            <button onClick={handleGetStarted}
              className="inline-flex items-center justify-center gap-3 bg-[#F7941D] hover:bg-[#e07d0a] text-white font-bold px-8 py-4 rounded-full transition-colors cursor-pointer text-base">
              Créer votre société <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/procedures"
              className="inline-flex items-center justify-center gap-2 border border-[#333] hover:border-[#555] text-[#888] hover:text-white font-medium px-8 py-4 rounded-full transition-colors text-sm">
              Toutes les procédures <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONTACT
      ══════════════════════════════════════ */}
      <section id="contact" className="py-28 px-6 bg-[#EFEFEF]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#aaa] uppercase mb-5">(Contact)</p>
            <h2 className="font-black text-[#1a1a1a] leading-[1] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>Contactez-nous</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Phone, title: "Téléphone", info: "+253 21 33 34 00", sub: "Lundi – Vendredi, 8h–17h" },
              { icon: Mail, title: "Email", info: "contact@anpi.dj", sub: "Réponse sous 24h" },
              { icon: MapPin, title: "Adresse", info: "Boulevard de la République", sub: "Djibouti City, Djibouti" },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-10 border border-[#e8e8e8] text-center hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 bg-[#EFEFEF] rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <c.icon className="w-5 h-5 text-[#555]" />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-2">{c.title}</h3>
                <p className="font-semibold text-[#555] text-sm">{c.info}</p>
                <p className="text-[#aaa] text-xs mt-1">{c.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="text-white py-16 px-6" style={{ background: '#0d2b0d' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-5">
                <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
                  alt="Guichet Unique" className="w-9 h-9 object-contain" />
                <div>
                  <p className="font-bold text-white text-base leading-tight">Guichet Unique</p>
                  <p className="text-[#666] text-xs">ANPI — Djibouti</p>
                </div>
              </div>
              <p className="text-[#666] text-sm leading-relaxed mb-6">L'Agence Nationale pour la Promotion des Investissements facilite la création d'entreprises à Djibouti.</p>
              <div className="flex items-center gap-4">
                <Facebook className="w-4 h-4 text-[#555] hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-4 h-4 text-[#555] hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="w-4 h-4 text-[#555] hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 text-sm">
              <div>
                <h4 className="font-semibold text-white mb-4">Navigation</h4>
                <ul className="space-y-2.5 text-[#666]">
                  {[['Services', '#services'], ['Tarifs', '#documentation'], ['Documents', '#telechargements'], ['Mission', '#mission'], ['Annonces Légales', 'https://odpic.dj/publication-registre/']].map(([l, h]) => (
                    <li key={l}><a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Contact</h4>
                <ul className="space-y-2.5 text-[#666] text-xs">
                  <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +253 21 33 34 00</li>
                  <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> contact@anpi.dj</li>
                  <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Djibouti City</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Liens utiles</h4>
                <ul className="space-y-2.5 text-[#666]">
                  <li><a href="https://anpi.dj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">anpi.dj</a></li>
                  <li><a href="https://odpic.dj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">odpic.dj</a></li>
                  <li><Link to="/procedures" className="hover:text-white transition-colors">Procédures</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-[#2a2a2a] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[#555] text-xs">
            <p>© 2026 Guichet Unique — ANPI Djibouti. Tous droits réservés.</p>
            <p>Powered by <span className="text-[#888] font-semibold">Meras PSP</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}