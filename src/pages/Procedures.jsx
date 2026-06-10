import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, FileText, Zap, HardHat, Info, Mail,
  ArrowRight, ChevronRight, Phone, ExternalLink, Briefcase
} from 'lucide-react';
import { meras } from '@/components/core/MerasClient';

const procedures = [
  {
    id: 'creation',
    icon: Building2,
    color: 'blue',
    title: "Création d'Entreprise",
    anchor: 'section1',
    summary: "Créez votre société via le Guichet Unique qui réunit l'ODPIC, la DGI et la CNSS en un seul lieu.",
    agencies: [
      { name: "ANPI / Guichet Unique", role: "Coordination et accompagnement global" },
      { name: "ODPIC", role: "Immatriculation au Registre du Commerce et des Sociétés" },
      { name: "DGI", role: "Immatriculation fiscale, enregistrement des actes, délivrance de la patente" },
      { name: "CNSS", role: "Immatriculation sociale de la société" },
    ],
    note: "Certaines activités nécessitent un agrément pour exercer.",
    noteLink: "https://guichet-unique-djib.com/telechargements/#section5",
    noteLinkLabel: "Voir la liste",
    link: "https://guichet-unique-djib.com/docs",
    linkLabel: "Voir les procédures détaillées",
  },
  {
    id: 'sejour',
    icon: Briefcase,
    color: 'teal',
    title: "Permis de Travail & Titre de Séjour",
    anchor: null,
    summary: "Service dédié aux promoteurs et travailleurs étrangers souhaitant exercer en République de Djibouti.",
    agencies: [
      { name: "Police Nationale (PN)", role: "Régularisation des travailleurs étrangers, délivrance de visas et titres de séjour" },
    ],
    details: "Les investisseurs étrangers peuvent créer leur propre entreprise à Djibouti. Ils auront besoin d'un titre de séjour pour exercer leur activité sur le territoire. Si la main d'œuvre locale n'existe pas, il peut être fait appel à des travailleurs étrangers.",
    link: "https://guichet-unique-djib.com/proced/sejour.html",
    linkLabel: "Voir les procédures",
  },
  {
    id: 'impots',
    icon: FileText,
    color: 'orange',
    title: "Paiement des Impôts & Taxes",
    anchor: 'section3',
    summary: "Découvrez les taxes et impôts auxquels vous êtes redevable lors de l'exercice d'une activité commerciale.",
    details: "Lorsque vous exercez une activité industrielle, commerciale ou une profession libérale, vous êtes redevable d'un certain nombre de taxes et d'impôts. À l'exception de la patente d'activité obtenue au Guichet Unique lors de la création, les autres droits, taxes et impôts sont payables à l'Hôtel des Impôts.",
    note: "Des exonérations sont possibles via le Code des Investissements.",
    link: "https://guichet-unique-djib.com/proced/impot-taxe.html",
    linkLabel: "Voir les procédures",
  },
  {
    id: 'raccordement',
    icon: Zap,
    color: 'yellow',
    title: "Raccordement",
    anchor: 'section4',
    summary: "Effectuez vos raccordements électricité, téléphonie, internet et eau au sein du Guichet Unique.",
    agencies: [
      { name: "EDD", role: "Raccordement et abonnement à l'électricité" },
      { name: "Djibouti Télécom", role: "Branchement téléphonie et internet" },
      { name: "ONEAD", role: "Raccordement et abonnement à l'eau" },
    ],
    link: "https://guichet-unique-djib.com/proced/raccordement.html",
    linkLabel: "Voir les procédures",
  },
  {
    id: 'terrain',
    icon: HardHat,
    color: 'green',
    title: "Obtention d'un Terrain",
    anchor: null,
    summary: "Procédures d'obtention et d'enregistrement foncier pour les investisseurs à Djibouti.",
    agencies: [
      { name: "Direction de l'Habitat et de l'Urbanisme", role: "Autorisations et permis de construire" },
      { name: "Direction des Domaines et de la Conservation Foncière", role: "Enregistrement et transfert de propriétés" },
    ],
    link: "https://guichet-unique-djib.com/proced/terrain.html",
    linkLabel: "Voir les procédures",
  },
  {
    id: 'permis',
    icon: HardHat,
    color: 'red',
    title: "Permis de Construire",
    anchor: 'section6',
    summary: "Procédure d'instruction et de délivrance du Permis de Construire Ordinaire en République de Djibouti.",
    details: "Cette procédure clarifie les règles d'urbanisme et contribue à la diffusion de la connaissance des normes de construction pour les citoyens et investisseurs.",
    link: "https://guichet-unique-djib.com/procedures/",
    linkLabel: "Plus d'informations",
  },
  {
    id: 'orientation',
    icon: Info,
    color: 'purple',
    title: "Orientation & Information",
    anchor: 'section7',
    summary: "Accédez aux organismes de financement et d'appui aux opérateurs économiques.",
    agencies: [
      { name: "FDED", role: "Financement de projets (agriculture, pêche, tourisme, industrie). Prêts de 3,5 à 50 M FDJ à moins de 6%" },
      { name: "CDD — Chambre de Commerce", role: "Informations commerciales et appuis aux opérateurs" },
    ],
    links: [
      { label: "Visiter le site du FDED", url: "https://fded.dj/" },
      { label: "Visiter le site de la CDD", url: "https://ccd.dj/" },
    ],
  },
  {
    id: 'postal',
    icon: Mail,
    color: 'gray',
    title: "Service Postal",
    anchor: 'section8',
    summary: "La Poste de Djibouti offre ses services d'adressage postal au sein du Guichet Unique pour la vie administrative de votre entreprise.",
    details: "Ce service est nécessaire pour la vie de l'entreprise dans le cadre de sa localisation géographique.",
    link: "https://guichet-unique-djib.com/procedures/",
    linkLabel: "Plus d'informations",
  },
];

const colorMap = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'bg-blue-800',    badge: 'bg-blue-100 text-blue-800',   hover: 'hover:border-blue-300' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-100',   icon: 'bg-teal-700',    badge: 'bg-teal-100 text-teal-800',   hover: 'hover:border-teal-300' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-800', hover: 'hover:border-orange-300' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', icon: 'bg-yellow-600',  badge: 'bg-yellow-100 text-yellow-800', hover: 'hover:border-yellow-300' },
  green:  { bg: 'bg-green-50',  border: 'border-green-100',  icon: 'bg-green-700',   badge: 'bg-green-100 text-green-800',  hover: 'hover:border-green-300' },
  red:    { bg: 'bg-red-50',    border: 'border-red-100',    icon: 'bg-red-700',     badge: 'bg-red-100 text-red-800',     hover: 'hover:border-red-300' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-700',  badge: 'bg-purple-100 text-purple-800', hover: 'hover:border-purple-300' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-100',   icon: 'bg-gray-700',    badge: 'bg-gray-100 text-gray-700',   hover: 'hover:border-gray-300' },
};

export default function Procedures() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-300 text-sm mb-6">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Procédures</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-orange-400 font-semibold text-sm tracking-widest uppercase mb-3">Guichet Unique ANPI</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Procédures Administratives</h1>
            <p className="text-xl text-blue-100 max-w-2xl leading-relaxed">
              Toutes les démarches administratives nécessaires à votre projet d'investissement à Djibouti, en un seul endroit.
            </p>
          </motion.div>

          <div className="mt-10 flex flex-wrap gap-3">
            {procedures.map((p) => (
              <a key={p.id} href={`#${p.id}`} className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors border border-white/20">
                {p.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Bar */}
      <div className="bg-orange-500 text-white py-3 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <span className="font-medium">Besoin d'aide ? Nos agents sont disponibles pour vous accompagner.</span>
          <span className="flex items-center gap-2 font-bold"><Phone className="w-4 h-4" /> +253 21 33 34 00</span>
        </div>
      </div>

      {/* Procedures List */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {procedures.map((proc, idx) => {
            const c = colorMap[proc.color];
            const isOpen = expanded === proc.id;
            return (
              <motion.div
                id={proc.id}
                key={proc.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`border-2 ${c.border} ${c.hover} transition-all overflow-hidden`}>
                  <CardContent className="p-0">
                    {/* Header */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : proc.id)}
                      className={`w-full flex items-start gap-5 p-6 text-left ${c.bg} hover:brightness-95 transition-all`}
                    >
                      <div className={`w-12 h-12 ${c.icon} text-white rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <proc.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h2 className="text-xl font-bold text-gray-900">{proc.title}</h2>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>Procédure officielle</span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{proc.summary}</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Expanded Content */}
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 border-t border-gray-100 space-y-5"
                      >
                        {proc.details && (
                          <p className="text-gray-700 leading-relaxed">{proc.details}</p>
                        )}

                        {proc.agencies && proc.agencies.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Organismes impliqués</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {proc.agencies.map((ag, i) => (
                                <div key={i} className={`p-4 ${c.bg} rounded-xl border ${c.border}`}>
                                  <p className="font-bold text-gray-900 text-sm">{ag.name}</p>
                                  <p className="text-gray-600 text-sm mt-0.5">{ag.role}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {proc.note && (
                          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                            <span>{proc.note} {proc.noteLink && <a href={proc.noteLink} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{proc.noteLinkLabel}</a>}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 pt-2">
                          {proc.link && (
                            <a href={proc.link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="bg-blue-800 hover:bg-blue-900 text-white gap-2">
                                {proc.linkLabel} <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {proc.links && proc.links.map((l, i) => (
                            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                              <Button key={i} size="sm" variant="outline" className="gap-2 border-gray-300">
                                {l.label} <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Prêt à lancer votre projet ?</h2>
          <p className="text-orange-100 text-lg mb-8">Le Guichet Unique vous accompagne de la création à l'immatriculation en un seul lieu.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={() => meras.auth.redirectToLogin('/onboarding')} size="lg" className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-10 py-6 h-auto text-lg rounded-lg">
              Créer mon entreprise <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-orange-600 font-semibold px-10 py-6 h-auto text-lg rounded-lg bg-transparent">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer mini */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <p>© 2026 Guichet Unique — ANPI Djibouti • Powered by <span className="text-orange-400 font-semibold">Meras PSP</span></p>
      </footer>
    </div>
  );
}