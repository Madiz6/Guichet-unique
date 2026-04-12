import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserSquare2 } from 'lucide-react';

const emptyEmployee = () => ({ prenom: '', nom: '', email: '', telephone: '', fonction: '', type_contrat: 'CDI', salaire_base: '' });

export default function DeclarationEmployesStep({ value, onChange }) {
  const employees = value?.employees || [];

  const update = (next) => onChange({ employees: next });
  const add = () => update([...employees, emptyEmployee()]);
  const remove = (i) => update(employees.filter((_, idx) => idx !== i));
  const set = (i, k, v) => update(employees.map((e, idx) => idx === i ? { ...e, [k]: v } : e));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Déclaration des employés</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Personnel initial (optionnel) — {employees.length} employé(s)</p>
        </div>
        <Button onClick={add} variant="outline" className="flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
          <UserSquare2 className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#9B9B9B]">Aucun employé déclaré pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map((e, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm text-[#1A1A1A]">{e.prenom || e.nom ? `${e.prenom} ${e.nom}` : `Employé ${i + 1}`}</p>
                <button onClick={() => remove(i)} className="text-[#9B9B9B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label className="text-xs">Prénom</Label><Input value={e.prenom} onChange={e2 => set(i, 'prenom', e2.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Nom</Label><Input value={e.nom} onChange={e2 => set(i, 'nom', e2.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Email</Label><Input type="email" value={e.email} onChange={e2 => set(i, 'email', e2.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Téléphone</Label><Input value={e.telephone} onChange={e2 => set(i, 'telephone', e2.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Fonction</Label><Input value={e.fonction} onChange={e2 => set(i, 'fonction', e2.target.value)} className="mt-1 text-sm" /></div>
                <div>
                  <Label className="text-xs">Type de contrat</Label>
                  <select value={e.type_contrat} onChange={e2 => set(i, 'type_contrat', e2.target.value)} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent">
                    {['CDI', 'CDD', 'Temps Plein', 'Temps Partiel'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Salaire de base (DJF)</Label><Input type="number" value={e.salaire_base} onChange={e2 => set(i, 'salaire_base', e2.target.value)} className="mt-1 text-sm" /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}