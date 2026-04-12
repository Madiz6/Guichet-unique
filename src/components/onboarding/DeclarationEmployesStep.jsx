import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';

const TYPES_CONTRAT = ['CDI', 'CDD', 'Temps Partiel', 'Stage', 'Apprentissage'];
const EMPTY_EMPLOYEE = { prenom: '', nom: '', fonction: '', type_contrat: 'CDI', salaire_base: '', email: '', telephone: '', nationalite: '' };

function EmployeeRow({ emp, index, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA] cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-bold">
            {emp.prenom?.[0] || (index + 1)}
          </div>
          <div>
            <p className="font-medium text-[#1A1A1A] text-sm">
              {emp.prenom || emp.nom ? `${emp.prenom} ${emp.nom}`.trim() : `Employé ${index + 1}`}
            </p>
            <p className="text-xs text-[#6B6B6B]">{emp.fonction || 'Poste non défini'} • {emp.type_contrat}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onRemove(index); }}
            className="p-1.5 hover:bg-red-100 rounded-lg text-[#9B9B9B] hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#9B9B9B]" /> : <ChevronDown className="w-4 h-4 text-[#9B9B9B]" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-[#E5E7EB] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Prénom <span className="text-red-500">*</span></Label>
              <Input value={emp.prenom || ''} onChange={e => onUpdate(index, { ...emp, prenom: e.target.value })}
                placeholder="Prénom" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Nom <span className="text-red-500">*</span></Label>
              <Input value={emp.nom || ''} onChange={e => onUpdate(index, { ...emp, nom: e.target.value })}
                placeholder="Nom de famille" className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Fonction / Poste</Label>
              <Input value={emp.fonction || ''} onChange={e => onUpdate(index, { ...emp, fonction: e.target.value })}
                placeholder="Ex: Directeur commercial" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Nationalité</Label>
              <Input value={emp.nationalite || ''} onChange={e => onUpdate(index, { ...emp, nationalite: e.target.value })}
                placeholder="Djiboutienne" className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#6B6B6B] mb-2">Type de contrat</Label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES_CONTRAT.map(t => (
                <button key={t} onClick={() => onUpdate(index, { ...emp, type_contrat: t })}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${emp.type_contrat === t ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B] hover:border-[#1A1A1A]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Email</Label>
              <Input type="email" value={emp.email || ''} onChange={e => onUpdate(index, { ...emp, email: e.target.value })}
                placeholder="email@example.com" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Téléphone</Label>
              <Input value={emp.telephone || ''} onChange={e => onUpdate(index, { ...emp, telephone: e.target.value })}
                placeholder="+253 77 XX XX XX" className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#6B6B6B] mb-1">Salaire de base (DJF)</Label>
            <Input type="number" value={emp.salaire_base || ''} onChange={e => onUpdate(index, { ...emp, salaire_base: e.target.value })}
              placeholder="0" className="h-9 text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeclarationEmployesStep({ value = {}, onChange }) {
  const [employees, setEmployees] = useState(value.employees || []);

  const addEmployee = () => {
    const updated = [...employees, { ...EMPTY_EMPLOYEE }];
    setEmployees(updated);
    onChange({ employees: updated });
  };

  const updateEmployee = (i, data) => {
    const updated = employees.map((e, idx) => idx === i ? data : e);
    setEmployees(updated);
    onChange({ employees: updated });
  };

  const removeEmployee = (i) => {
    const updated = employees.filter((_, idx) => idx !== i);
    setEmployees(updated);
    onChange({ employees: updated });
  };

  const stats = {
    cdi: employees.filter(e => e.type_contrat === 'CDI').length,
    cdd: employees.filter(e => e.type_contrat === 'CDD').length,
    other: employees.filter(e => !['CDI', 'CDD'].includes(e.type_contrat)).length,
    masseSalariale: employees.reduce((s, e) => s + (parseFloat(e.salaire_base) || 0), 0),
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Déclaration des employés</h3>
            <p className="text-white/70 text-sm">Personnel initial de l'entreprise</p>
          </div>
        </div>
        {employees.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: employees.length },
              { label: 'CDI', value: stats.cdi },
              { label: 'CDD', value: stats.cdd },
              { label: 'Masse sal.', value: `${(stats.masseSalariale / 1000).toFixed(0)}K` },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee list */}
      <div className="space-y-3">
        {employees.map((emp, i) => (
          <EmployeeRow key={i} emp={emp} index={i} onUpdate={updateEmployee} onRemove={removeEmployee} />
        ))}
      </div>

      {/* Add employee */}
      <button onClick={addEmployee}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#E5E7EB] rounded-xl text-sm text-[#6B6B6B] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all group">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] group-hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
          <Plus className="w-4 h-4 text-[#6B6B6B] group-hover:text-white transition-colors" />
        </div>
        Ajouter un employé
      </button>

      {employees.length === 0 && (
        <p className="text-center text-sm text-[#9B9B9B] py-2">
          Optionnel — vous pourrez ajouter des employés après la création de l'entreprise
        </p>
      )}
    </div>
  );
}