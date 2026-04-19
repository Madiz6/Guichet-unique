import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingSplash({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // enter | hold | exit

  useEffect(() => {
    // Hold for 2s then exit
    const holdTimer = setTimeout(() => setPhase('exit'), 2200);
    return () => clearTimeout(holdTimer);
  }, []);

  // When exit animation finishes, notify parent
  const handleAnimationComplete = () => {
    if (phase === 'exit') onComplete?.();
  };

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: '#0B3D2E' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'exit' ? 0 : 1 }}
          transition={{ duration: phase === 'exit' ? 0.6 : 0 }}
          onAnimationComplete={handleAnimationComplete}
        >
          {/* Logo image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-72 sm:w-96 px-8"
          >
            <img
              src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/a296da2dc_IMG_6025.jpg"
              alt="Ismaïl Omar Guelleh — En toute confiance 2026"
              className="w-full object-contain"
            />
          </motion.div>

          {/* Guichet UN branding below */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            className="mt-10 flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
                alt="Guichet UN"
                className="w-9 h-9 object-contain"
              />
              <span className="text-white text-xl font-semibold tracking-wide">Guichet UN</span>
            </div>
            <p className="text-white/50 text-xs tracking-widest uppercase">Enregistrement d'entreprise · ANPI Djibouti</p>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="absolute bottom-14 flex gap-2"
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-white/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}