import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertTriangle, CheckCircle, Info, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ICONS = {
  critical: { Icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  warning: { Icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  success: { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  info: { Icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

export default function AIInsightsBanner({ transactions = [], budgets = [], employees = [], expenseRequests = [] }) {
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('aiAssistant', {
        action: 'analyze_dashboard',
        data: { transactions, budgets, employees, expenseRequests }
      });
      if (res?.data?.insights) {
        setInsights(res.data.insights.sort((a, b) => a.priority - b.priority));
        setSummary(res.data.summary || '');
      }
    } catch {}
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    // Only load if there's meaningful data (backend functions required)
    // Silently skip if no data to avoid errors
  }, []);

  if (!loaded && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-indigo-900">Analyse IA — Aria</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-indigo-400 hover:text-indigo-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && !loaded && (
          <div className="flex items-center gap-2 text-sm text-indigo-600 py-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Analyse en cours...
          </div>
        )}

        {summary && (
          <p className="text-sm text-indigo-700 mb-3 italic">"{summary}"</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AnimatePresence>
            {insights.map((insight, i) => {
              const { Icon, color, bg } = ICONS[insight.type] || ICONS.info;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border ${bg}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{insight.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{insight.message}</p>
                    {insight.action && (
                      <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${color}`}>
                        <ChevronRight className="w-3 h-3" />
                        {insight.action}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}