import React from 'react';
import { Loader2 } from 'lucide-react';

const STEPS = [
  'Détection du document',
  'Lecture des champs',
  'Extraction du NNI et MRZ',
  'Vérification des données',
];

/**
 * Shared animated extraction loader shown during AI ID/passport data extraction.
 * @param {string} subtitle - optional subtitle line (e.g. "Extraction depuis recto + verso")
 */
export default function ExtractionLoader({ subtitle }) {
  return (
    <div className="mt-4 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 rounded-full bg-purple-200 animate-ping opacity-50" />
          <div className="relative w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-purple-800">Analyse IA en cours…</p>
          {subtitle && <p className="text-xs text-purple-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 rounded-full bg-purple-300 overflow-hidden flex-1">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                style={{
                  animation: `extrBar 2s ease-in-out ${i * 0.4}s infinite alternate`,
                  width: '100%',
                }}
              />
            </div>
            <span className="text-xs text-purple-600 w-44 shrink-0">{s}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes extrBar{0%{transform:scaleX(0.1);transform-origin:left;opacity:0.4}100%{transform:scaleX(1);transform-origin:left;opacity:1}}`}</style>
    </div>
  );
}