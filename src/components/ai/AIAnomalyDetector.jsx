import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Eye, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AIAnomalyDetector({ transactions = [] }) {
  const [anomalies, setAnomalies] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (transactions.length >= 5 && !ran) {
      setRan(true);
      base44.functions.invoke('aiAssistant', {
        action: 'detect_anomalies',
        data: { transactions }
      }).then(res => {
        if (res?.data?.anomalies?.length > 0) {
          setAnomalies(res.data.anomalies);
        }
      }).catch(() => {});
    }
  }, [transactions.length]);

  const visible = anomalies.filter(a => !dismissed.includes(a.transaction_id));

  if (visible.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-4"
    >
      <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            Aria a détecté {visible.length} anomalie{visible.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {visible.map((a, i) => (
              <motion.div
                key={a.transaction_id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-amber-100"
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={a.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} style={{ fontSize: '10px' }}>
                      {a.type === 'duplicate' ? 'Doublon possible' : 'Montant inhabituel'}
                    </Badge>
                    {a.date && <span className="text-xs text-gray-400">{format(new Date(a.date), 'dd/MM/yyyy')}</span>}
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5">{a.message}</p>
                </div>
                <button
                  onClick={() => setDismissed(prev => [...prev, a.transaction_id])}
                  className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}