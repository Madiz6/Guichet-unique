import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import {
  Building2, FileText, Users, CreditCard, ArrowRight,
  CheckCircle, Shield, Globe, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import CompanyOnboardingWizard from '../components/onboarding/CompanyOnboardingWizard';
import OnboardingSplash from '../components/onboarding/OnboardingSplash';

const WIZARD_STEPS = [
  { number: "01", icon: Shield, title: "Identification", desc: "Représentant légal & type d'entité (physique ou morale)", color: "bg-blue-50 text-blue-700" },
  { number: "02", icon: FileText, title: "Dispositions Générales", desc: "Clauses et conditions générales de la société", color: "bg-purple-50 text-purple-700" },
  { number: "03", icon: Globe, title: "Activité & Forme Juridique", desc: "Secteur d'activité, forme juridique, capital social", color: "bg-green-50 text-green-700" },
  { number: "04", icon: Users, title: "Partenaires & Associés", desc: "Déclaration des actionnaires et structure de capital", color: "bg-orange-50 text-orange-700" },
  { number: "05", icon: Users, title: "Déclaration des Employés", desc: "Personnel initial de la société", color: "bg-teal-50 text-teal-700" },
  { number: "06", icon: Shield, title: "Attestation de Pouvoir", desc: "Habilitation et pouvoir du représentant légal", color: "bg-red-50 text-red-700" },
  { number: "07", icon: FileText, title: "Documents Justificatifs", desc: "Statuts, formulaire GUI et pièces d'identité", color: "bg-indigo-50 text-indigo-700" },
  { number: "08", icon: Shield, title: "Signature Électronique", desc: "Signature numérique et validation du dossier", color: "bg-pink-50 text-pink-700" },
  { number: "09", icon: CreditCard, title: "Paiement des Frais", desc: "Règlement des frais d'enregistrement officiels", color: "bg-amber-50 text-amber-700" },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState(null);
  const [showSplash, setShowSplash] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-onboarding'],
    queryFn: () => meras.entities.Company.list(),
  });

  useEffect(() => {
    if (!isLoading && companies.length > 0) {
      navigate('/Dashboard');
    }
  }, [isLoading, companies.length, navigate]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-800 rounded-full animate-spin" />
    </div>
  );

  if (showSplash) return (
    <OnboardingSplash onComplete={() => { setShowSplash(false); setChoice('create'); }} />
  );

  if (choice === 'create') return (
    <CompanyOnboardingWizard onBack={() => setChoice(null)} onSuccess={() => navigate('/Dashboard')} />
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
              alt="Guichet Unique"
              className="w-10 h-10 object-contain"
            />
            <div>
              <p className="font-bold text-white leading-tight">Guichet Unique</p>
              <p className="text-blue-300 text-xs">ANPI — Agence Nationale pour la Promotion des Investissements</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-white/30 text-white hover:bg-white/10 bg-transparent text-sm"
          >
            ← Retour à l'accueil
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white px-6 py-16">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <Building2 className="w-4 h-4" />
              Création d'entreprise officielle
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              Créez votre société<br />
              <span className="text-orange-400">à Djibouti</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
              Processus 100% digital, guidé étape par étape. Déposez votre dossier directement auprès de l'ANPI — Guichet Unique.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              {[
                { icon: Clock, label: "Délai minimum", value: "72h" },
                { icon: CheckCircle, label: "Étapes guidées", value: "9 étapes" },
                { icon: Shield, label: "100% sécurisé", value: "Officiel" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3">
                  <item.icon className="w-5 h-5 text-orange-400" />
                  <div className="text-left">
                    <p className="text-xs text-blue-300">{item.label}</p>
                    <p className="font-bold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setShowSplash(true)}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white text-xl px-12 py-7 h-auto font-bold rounded-xl shadow-2xl"
            >
              Commencer ma demande
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
            <p className="text-blue-300 text-sm mt-4">Votre progression est sauvegardée automatiquement</p>
          </motion.div>
        </div>
      </section>

      {/* Steps Overview */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Processus de création</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Les 9 étapes de votre dossier</h2>
            <p className="text-gray-500 mt-3 text-lg">Suivez chaque étape à votre rythme. Reprenez là où vous vous êtes arrêté.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {WIZARD_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 flex items-start gap-4"
              >
                <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                  {step.number}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              onClick={() => setShowSplash(true)}
              size="lg"
              className="bg-blue-900 hover:bg-blue-800 text-white px-12 py-6 h-auto text-lg font-bold rounded-xl"
            >
              Démarrer mon dossier maintenant
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* What you'll receive */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-orange-500 font-semibold text-sm tracking-widest uppercase mb-3">Documents obtenus</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Ce que vous recevrez</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, title: "Récépissé ODPIC", desc: "Registre de Commerce — immatriculation officielle", color: "bg-blue-100 text-blue-700" },
              { icon: Shield, title: "NIF", desc: "Numéro d'Identification Fiscale — DGI", color: "bg-green-100 text-green-700" },
              { icon: Users, title: "Affiliation CNSS", desc: "Immatriculation sociale pour votre entreprise", color: "bg-purple-100 text-purple-700" },
              { icon: Building2, title: "Licence d'entreprise", desc: "Autorisation officielle d'exercer votre activité", color: "bg-orange-100 text-orange-700" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-8 rounded-2xl border-2 border-gray-100 hover:border-blue-200 transition-colors"
              >
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Prêt à créer votre entreprise ?</h2>
          <p className="text-orange-100 text-lg mb-8">Rejoignez les milliers d'entrepreneurs qui ont fait confiance au Guichet Unique ANPI.</p>
          <Button
            onClick={() => setShowSplash(true)}
            size="lg"
            className="bg-white text-orange-600 hover:bg-gray-100 text-xl px-12 py-7 h-auto font-bold rounded-xl shadow-xl"
          >
            Commencer maintenant — C'est gratuit
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <p>© 2025 Guichet Unique — ANPI Djibouti • +253 21 33 34 00 • Boulevard de la République</p>
      </footer>
    </div>
  );
}