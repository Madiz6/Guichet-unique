import React from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shows a non-intrusive pill for each AI suggestion.
 * props:
 *   suggestions: { field, label, value, confidence, signal }[]
 *   onAccept(field, value): called when user clicks ✓
 *   onDismiss(field): called when user clicks ✗
 */
export default function SmartSuggestionBanner({ suggestions = [], onAccept, onDismiss }) {
  if (!suggestions.length) return null;

  const confColor = (c) => {
    if (c >= 0.8) return 'bg-green-50 border-green-300 text-green-800';
    if (c >= 0.5) return 'bg-blue-50 border-blue-300 text-blue-800';
    return 'bg-amber-50 border-amber-300 text-amber-800';
  };

  const confLabel = (c) => {
    if (c >= 0.8) return 'Très probable';
    if (c >= 0.5) return 'Probable';
    return 'Possible';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-4 p-3 rounded-xl border border-purple-200 bg-purple-50"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
            Suggestions IA basées sur votre historique
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map(({ field, label, value, confidence, signal }) => (
            <div
              key={field}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${confColor(confidence)}`}
            >
              <span>{label}: <strong>{value}</strong></span>
              <span className="opacity-60">· {confLabel(confidence)}</span>
              <span className="opacity-50 text-[10px]">({signal})</span>
              <button
                onClick={() => onAccept(field, value)}
                title="Accepter"
                className="ml-1 hover:scale-110 transition-transform text-green-600"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDismiss(field)}
                title="Ignorer"
                className="hover:scale-110 transition-transform text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}