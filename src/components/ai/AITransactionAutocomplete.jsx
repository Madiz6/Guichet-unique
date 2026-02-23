import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function AITransactionAutocomplete({ value, recentTransactions = [], onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      setShow(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('aiAssistant', {
          action: 'autocomplete_transaction',
          data: { description: value, recentTransactions: recentTransactions.slice(0, 30) }
        });
        if (res?.data?.suggestions?.length > 0) {
          setSuggestions(res.data.suggestions);
          setShow(true);
        } else {
          setSuggestions([]);
          setShow(false);
        }
      } catch {}
      setLoading(false);
    }, 600);
  }, [value]);

  if (!value || value.length < 3) return null;

  return (
    <AnimatePresence>
      {(loading || show) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-100 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span className="text-xs text-indigo-600 font-medium">Suggestions IA basées sur l'historique</span>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400 ml-auto" />}
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(s); setShow(false); setSuggestions([]); }}
              className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition border-b border-gray-50 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.contact_name && <span className="text-xs text-gray-500">{s.contact_name}</span>}
                    {s.category && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded">{s.category}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  {s.amount > 0 && (
                    <p className={`text-sm font-bold ${s.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                      {s.amount?.toLocaleString()} DJF
                    </p>
                  )}
                  <p className="text-xs text-indigo-500 flex items-center gap-0.5 justify-end">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {Math.round((s.confidence || 0) * 100)}%
                  </p>
                </div>
              </div>
              {s.reason && <p className="text-xs text-gray-400 mt-0.5">📎 {s.reason}</p>}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}