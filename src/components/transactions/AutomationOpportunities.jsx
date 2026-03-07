import React, { useState } from 'react';
import { Sparkles, Zap, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Shows transactions the AI can auto-assign (department / category)
 * with high confidence. User can accept individually or bulk-apply.
 *
 * props:
 *   opportunities: [{ transaction, suggestion: { value, confidence, signal } }]
 *   onApply(transactionId, field, value): called to save
 */
export default function AutomationOpportunities({ opportunities = [], onApply }) {
  const [expanded, setExpanded] = useState(false);
  const [applied, setApplied] = useState(new Set());

  const pending = opportunities.filter(o => !applied.has(o.transaction.id));
  if (!pending.length) return null;

  const handleApply = (op) => {
    onApply(op.transaction.id, 'department', op.suggestion.value);
    setApplied(prev => new Set([...prev, op.transaction.id]));
  };

  const handleApplyAll = () => {
    pending.forEach(op => {
      onApply(op.transaction.id, 'department', op.suggestion.value);
    });
    setApplied(new Set(opportunities.map(o => o.transaction.id)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-100/50 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-violet-800">
            {pending.length} transaction{pending.length > 1 ? 's' : ''} peuvent être complétée{pending.length > 1 ? 's' : ''} automatiquement
          </span>
          <Badge className="bg-violet-100 text-violet-700 text-[10px]">
            IA
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 1 && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleApplyAll(); }}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7 px-3"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Tout appliquer
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-violet-600" /> : <ChevronDown className="w-4 h-4 text-violet-600" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2 border-t border-violet-200">
              {pending.slice(0, 8).map(op => (
                <div
                  key={op.transaction.id}
                  className="flex items-center justify-between py-2 border-b border-violet-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{op.transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {op.transaction.date} · {op.transaction.amount?.toLocaleString()} DJF
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-violet-700">→ {op.suggestion.value}</p>
                      <p className="text-[10px] text-gray-400">
                        {Math.round(op.suggestion.confidence * 100)}% · {op.suggestion.signal}
                      </p>
                    </div>
                    <button
                      onClick={() => handleApply(op)}
                      className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition"
                      title="Appliquer"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                </div>
              ))}
              {pending.length > 8 && (
                <p className="text-xs text-violet-500 text-center pt-1">
                  + {pending.length - 8} autres disponibles
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}