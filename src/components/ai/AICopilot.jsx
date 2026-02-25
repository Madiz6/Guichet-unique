import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { meras } from '@/components/core/MerasClient';
import { useQuery } from '@tanstack/react-query';

export default function AICopilot({ currentPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Bonjour ! Je suis Aria, votre assistante IA. Comment puis-je vous aider ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => meras.auth.me(),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const categories = [
    {
      label: '💰 Paie & CNSS',
      prompts: [
        'Comment calculer les cotisations CNSS ?',
        'Quels sont les taux CNSS par régime ?',
        'Comment calculer l\'ITS ?',
        'Expliquer les pénalités de retard CNSS',
        'Délai de déclaration CNSS ?',
        'Qu\'est-ce que la prime d\'ancienneté ?',
        'Comment calculer le salaire net ?',
        'Qu\'est-ce que le RETCIM ?',
      ]
    },
    {
      label: '🤰 Congé Maternité',
      prompts: [
        'Durée du congé maternité à Djibouti ?',
        'Comment est indemnisé le congé maternité ?',
        'Quelle est la part payée par la CNSS vs employeur ?',
        'Quelles pièces fournir pour le congé maternité ?',
        'Protections légales pendant la grossesse ?',
        'Comment calculer l\'indemnité des 8 premières semaines ?',
        'Quand commence le congé maternité ?',
      ]
    },
    {
      label: '👨‍👩‍👧 Prestations Familiales',
      prompts: [
        'Montant des allocations familiales ?',
        'Conditions pour l\'allocation de mariage ?',
        'Qui a droit aux allocations familiales ?',
        'Comment immatriculer ses ayants droit ?',
        'Jusqu\'à quel âge les enfants sont couverts ?',
        'Quand sont payées les allocations ?',
      ]
    },
    {
      label: '🏥 Accident & Maladie',
      prompts: [
        'Comment déclarer un accident de travail ?',
        'Indemnités journalières accident de travail ?',
        'Qu\'est-ce qu\'une maladie professionnelle ?',
        'Délais de déclaration accident de travail ?',
        'Qu\'est-ce qu\'une rente d\'incapacité permanente ?',
        'Accident de trajet : est-ce couvert ?',
        'Que faire si l\'employeur ne déclare pas l\'accident ?',
      ]
    },
    {
      label: '🎓 Retraite',
      prompts: [
        'Conditions pour la retraite normale ?',
        'Comment calculer le montant de ma retraite ?',
        'Qu\'est-ce que la retraite anticipée ?',
        'Comment fonctionne la pension de réversion ?',
        'Quand faut-il déposer le dossier retraite ?',
        'Quels sont les taux d\'annuité de retraite ?',
        'Quel est le minimum de pension garanti ?',
      ]
    },
    {
      label: '⚕️ AMU / Assurance Maladie',
      prompts: [
        'Qu\'est-ce que l\'AMU à Djibouti ?',
        'Qui est couvert par l\'AMO ?',
        'Quels soins sont pris en charge gratuitement ?',
        'Comment obtenir la carte de sécurité sociale ?',
        'Qu\'est-ce que le PASS (programme d\'assistance) ?',
        'Qu\'est-ce que le tiers-payant CNSS ?',
      ]
    },
    {
      label: '🏢 Affiliation & Employeur',
      prompts: [
        'Comment s\'affilier à la CNSS ?',
        'Délai d\'affiliation obligatoire ?',
        'Comment immatriculer un nouveau salarié ?',
        'Que faire en cas de cessation d\'activité ?',
        'Comment obtenir l\'attestation CNSS pour appel d\'offres ?',
        'Quels documents fournir pour l\'affiliation ?',
      ]
    },
    {
      label: '⚖️ Contrôle & Pénalités',
      prompts: [
        'Quelles sont les pénalités de retard CNSS ?',
        'Comment se déroule un contrôle CNSS ?',
        'Qu\'est-ce qu\'une mise en demeure CNSS ?',
        'Qu\'est-ce qu\'une contrainte CNSS ?',
        'Quels sont mes droits lors d\'un contrôle ?',
      ]
    },
    {
      label: '👥 RH & Employés',
      prompts: [
        'Comment gérer les absences sur la paie ?',
        'Qu\'est-ce que la prime de sujétion ?',
        'Comment calculer la prime de transport ?',
        'Quelles primes sont soumises à la CNSS ?',
        'Comment suspendre un employé ?',
        'Différence CDI vs CDD à Djibouti ?',
      ]
    },
    {
      label: '📊 Finance & Budget',
      prompts: [
        'Résume ma situation financière',
        'Statut des budgets en cours',
        'Quelles transactions sont en attente ?',
        'Quelles tâches sont urgentes ?',
        'Comment analyser mes dépenses par catégorie ?',
        'Quels sont les ratios financiers importants ?',
      ]
    },
    {
      label: '📋 Déclarations CNSS',
      prompts: [
        'Comment faire une déclaration CNSS mensuelle ?',
        'Qu\'est-ce que le relevé nominatif des salaires ?',
        'Que faire si j\'ai oublié de déclarer ?',
        'Puis-je corriger une déclaration déjà soumise ?',
        'Comment lire le bordereau de cotisation CNSS ?',
      ]
    },
    {
      label: '🔎 Recherche & Diligence',
      prompts: [
        'Comment vérifier la conformité d\'une entreprise ?',
        'Quels documents légaux sont obligatoires ?',
        'Comment faire une due diligence entreprise ?',
        'Quels sont les risques de non-conformité CNSS ?',
      ]
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState(null);

  const send = async (text) => {
    if (!text.trim() || isLoading) return;
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await base44.functions.invoke('aiAssistant', {
        action: 'chat',
        data: {
          message: text,
          context: {
            role: user?.role,
            page: currentPage,
          }
        }
      });
      const reply = res?.data?.reply || 'Je ne peux pas répondre pour le moment.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Erreur de connexion. Réessayez.' }]);
    }
    setIsLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white ${isOpen ? 'hidden' : ''}`}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Aria</p>
                  <p className="text-xs text-white/70">Assistante IA Paie360</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts - category menu */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 space-y-2 border-t border-gray-100 pt-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Choisir un sujet</p>
                {/* Category pills - scrollable */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <button
                      key={cat.label}
                      onClick={() => setSelectedCategory(selectedCategory?.label === cat.label ? null : cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition font-medium whitespace-nowrap ${
                        selectedCategory?.label === cat.label
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {/* Sub-prompts for selected category */}
                {selectedCategory && (
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {selectedCategory.prompts.map(p => (
                      <button
                        key={p}
                        onClick={() => { setSelectedCategory(null); send(p); }}
                        className="text-xs text-left px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-lg hover:bg-indigo-100 transition"
                      >
                        → {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Posez votre question..."
                className="flex-1 text-sm border-gray-200 rounded-xl"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 rounded-xl flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}