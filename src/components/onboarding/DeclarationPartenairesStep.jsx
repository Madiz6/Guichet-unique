import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Users } from 'lucide-react';

const emptyPartner = () => ({ type: 'physique', nom: '', prenom: '', email: '', part_percent: '', apport: '' });

export default function DeclarationPartenairesStep({ value, onChange }) {
  const partners = value?.partners || [];
  const total = partners.reduce((s, p) => s + (parseFloat(p.part_percent) || 0), 0);

  const update = (newPartners) => onChange({ partners: newPartners });
  const add = () => update([...partners, emptyPartner()]);
  const remove = (i) => update(partners.filter((_, idx) => idx !== i));
  const set = (i, k, v) => {
    const next = partners.map((p, idx) => idx === i ? { ...p, [k]: v } : p);
    update(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration des partenaires</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Associés et actionnaires (optionnel)</p>
        </div>
        <Button onClick={add} variant="outline" className="flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      {/* Capital gauge */}
      {partners.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6B6B6B]">Répartition du capital</span>
            <span className={`font-semibold ${total > 100 ? 'text-red-500' : total === 100 ? 'text-green-600' : 'text-[#1A1A1A]'}`}>{total.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#F5F5F5] rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${total > 100 ? 'bg-red-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(total, 100)}%` }} />
          </div>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
          <Users className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#9B9B9B]">Aucun partenaire — cliquez sur Ajouter pour commencer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {partners.map((p, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  {['physique', 'morale'].map(t => (
                    <button key={t} onClick={() => set(i, 'type', t)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${p.type === t ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B]'}`}>
                      {t === 'physique' ? 'Personne physique' : 'Personne morale'}
                    </button>
                  ))}
                </div>
                <button onClick={() => remove(i)} className="text-[#9B9B9B] hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {p.type === 'physique' ? (
                  <>
                    <div><Label className="text-xs">Nom</Label><Input value={p.nom} onChange={e => set(i, 'nom', e.target.value)} className="mt-1 text-sm" /></div>
                    <div><Label className="text-xs">Prénom</Label><Input value={p.prenom} onChange={e => set(i, 'prenom', e.target.value)} className="mt-1 text-sm" /></div>
                  </>
                ) : (
                  <div className="md:col-span-2"><Label className="text-xs">Raison sociale</Label><Input value={p.nom} onChange={e => set(i, 'nom', e.target.value)} className="mt-1 text-sm" /></div>
                )}
                <div><Label className="text-xs">Email</Label><Input type="email" value={p.email} onChange={e => set(i, 'email', e.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Part (%)</Label><Input type="number" value={p.part_percent} onChange={e => set(i, 'part_percent', e.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Apport (DJF)</Label><Input type="number" value={p.apport} onChange={e => set(i, 'apport', e.target.value)} className="mt-1 text-sm" /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}