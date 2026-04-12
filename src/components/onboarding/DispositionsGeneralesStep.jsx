import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

const CLAUSES = [
  {
    id: 'identite',
    title: 'Déclaration sur l\'identité',
    text: 'Je déclare que les informations fournies concernant mon identité sont exactes, complètes et authentiques. Je m\'engage à informer immédiatement l\'autorité compétente de tout changement relatif à ma situation personnelle ou professionnelle.'
  },
  {
    id: 'activite',
    title: 'Déclaration sur l\'activité',
    text: 'Je déclare que l\'activité exercée est légale, conforme à la réglementation djiboutienne en vigueur, et ne contrevient pas aux lois et règlements applicables. Je m\'engage à ne pas exercer d\'activités illicites ou contraires à l\'ordre public.'
  },
  {
    id: 'blanchiment',
    title: 'Lutte contre le blanchiment d\'argent (LBA)',
    text: 'Je déclare que les fonds utilisés pour la création et le fonctionnement de l\'entreprise proviennent de sources légales. Je m\'engage à respecter les dispositions relatives à la lutte contre le blanchiment de capitaux et le financement du terrorisme (LBC/FT) conformément à la loi djiboutienne.'
  },
  {
    id: 'fiscalite',
    title: 'Obligations fiscales',
    text: 'Je m\'engage à respecter toutes les obligations fiscales découlant de l\'exercice de mon activité professionnelle, notamment en matière de déclaration et de paiement des impôts, taxes et contributions sociales auprès des autorités compétentes (DGI, CNSS).'
  },
  {
    id: 'protection',
    title: 'Protection des données personnelles',
    text: 'J\'accepte que mes données personnelles soient collectées, traitées et conservées conformément à la réglementation en vigueur sur la protection des données, dans le cadre exclusif de la gestion de mon entreprise et des obligations légales associées.'
  },
  {
    id: 'sanctions',
    title: 'Sanctions et responsabilités',
    text: 'Je reconnais que toute fausse déclaration ou omission intentionnelle peut entraîner des sanctions administratives, civiles ou pénales prévues par la législation djiboutienne. Je prends l\'entière responsabilité des informations fournies dans ce formulaire.'
  },
];

export default function DispositionsGeneralesStep({ value = {}, onChange }) {
  const [accepted, setAccepted] = useState(value.accepted || {});
  const [scrolled, setScrolled] = useState(false);

  const allAccepted = CLAUSES.every(c => accepted[c.id]);

  const toggle = (id) => {
    const updated = { ...accepted, [id]: !accepted[id] };
    setAccepted(updated);
    onChange({ accepted: updated, all_accepted: CLAUSES.every(c => updated[c.id]) });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Dispositions Générales</h3>
            <p className="text-white/70 text-sm">Veuillez lire et accepter les conditions réglementaires</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${allAccepted ? 'bg-green-400' : 'bg-white/20'} transition-all`}>
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(Object.values(accepted).filter(Boolean).length / CLAUSES.length) * 100}%` }}
            />
          </div>
          <span className="text-white/70 text-xs shrink-0">
            {Object.values(accepted).filter(Boolean).length}/{CLAUSES.length}
          </span>
        </div>
      </div>

      {/* Status */}
      {!allAccepted && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-amber-700 text-sm">Vous devez accepter toutes les clauses pour continuer.</p>
        </div>
      )}
      {allAccepted && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">Toutes les dispositions ont été acceptées.</p>
        </div>
      )}

      {/* Clauses */}
      <div className="space-y-3">
        {CLAUSES.map(clause => (
          <div
            key={clause.id}
            className={`border rounded-xl p-5 transition-all ${accepted[clause.id] ? 'border-green-300 bg-green-50/50' : 'border-[#E5E7EB] bg-white'}`}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                id={clause.id}
                checked={!!accepted[clause.id]}
                onCheckedChange={() => toggle(clause.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor={clause.id} className="font-semibold text-[#1A1A1A] text-sm cursor-pointer mb-2 block">
                  {clause.title}
                  {accepted[clause.id] && <CheckCircle2 className="w-4 h-4 text-green-600 inline ml-2" />}
                </Label>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">{clause.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Accept all */}
      <button
        onClick={() => {
          const all = {};
          CLAUSES.forEach(c => all[c.id] = true);
          setAccepted(all);
          onChange({ accepted: all, all_accepted: true });
        }}
        className="w-full py-3 border-2 border-dashed border-[#E5E7EB] rounded-xl text-sm text-[#6B6B6B] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
      >
        Tout accepter d'un coup
      </button>
    </div>
  );
}