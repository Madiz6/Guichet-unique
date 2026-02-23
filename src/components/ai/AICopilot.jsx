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

  const quickPrompts = [
    'Résume ma situation financière',
    'Quelles tâches sont urgentes ?',
    'Comment calculer la CNSS ?',
    'Statut des budgets',
  ];

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

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {quickPrompts.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition"
                  >
                    {p}
                  </button>
                ))}
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