import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CLAUSES = [
  { id: 'lba', title: 'Lutte contre le blanchiment (LBA)', desc: "Je déclare que les fonds utilisés pour la création de cette entreprise sont d'origine licite et je m'engage à respecter les dispositions de la loi sur la lutte contre le blanchiment d'argent." },
  { id: 'fiscal', title: 'Obligations fiscales', desc: "Je m'engage à respecter toutes les obligations fiscales en vigueur à Djibouti, notamment le paiement de la TVA, de l'impôt sur les sociétés et autres taxes applicables." },
  { id: 'data', title: 'Protection des données personnelles', desc: "Je consens au traitement de mes données personnelles conformément à la politique de confidentialité et aux lois en vigueur sur la protection des données." },
  { id: 'cnss', title: 'Obligations CNSS', desc: "Je m'engage à affilier mes employés à la Caisse Nationale de Sécurité Sociale (CNSS) et à effectuer les déclarations et cotisations dans les délais légaux." },
  { id: 'anpi', title: 'Conformité ANPI', desc: "Je reconnais avoir pris connaissance des statuts et règlements de l'Agence Nationale de Promotion des Investissements et m'engage à respecter ses directives." },
  { id: 'veracite', title: 'Véracité des informations', desc: "Je certifie que toutes les informations fournies dans ce dossier sont exactes, complètes et véridiques. Toute fausse déclaration engage ma responsabilité pénale." },
];

export default function DispositionsGeneralesStep({ value, onChange }) {
  const accepted = value?.accepted || {};

  const toggle = (id) => {
    const next = { ...accepted, [id]: !accepted[id] };
    const all_accepted = CLAUSES.every(c => next[c.id]);
    onChange({ accepted: next, all_accepted });
  };

  const acceptAll = () => {
    const next = {};
    CLAUSES.forEach(c => next[c.id] = true);
    onChange({ accepted: next, all_accepted: true });
  };

  const doneCount = CLAUSES.filter(c => accepted[c.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Dispositions générales</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">{doneCount}/{CLAUSES.length} clauses acceptées</p>
        </div>
        <Button variant="outline" onClick={acceptAll} className="text-sm">Tout accepter</Button>
      </div>

      {/* Progress */}
      <div className="w-full bg-[#F5F5F5] rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(doneCount / CLAUSES.length) * 100}%` }} />
      </div>

      <div className="space-y-3">
        {CLAUSES.map(c => (
          <div key={c.id}
            onClick={() => toggle(c.id)}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${accepted[c.id] ? 'border-green-400 bg-green-50' : 'border-[#E5E7EB] bg-white hover:border-[#1A1A1A]'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${accepted[c.id] ? 'border-green-500 bg-green-500' : 'border-[#D1D5DB]'}`}>
                {accepted[c.id] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <div>
                <p className="font-medium text-[#1A1A1A] text-sm">{c.title}</p>
                <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}