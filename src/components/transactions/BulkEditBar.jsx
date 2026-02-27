import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, Edit2, Tag, Building2, CheckCircle, Trash2 } from 'lucide-react';

export default function BulkEditBar({ selectedIds, onApply, onClear, categories, departments }) {
  const [action, setAction] = useState('');
  const [value, setValue] = useState('');

  const handleApply = () => {
    if (!action || !value) return;
    onApply(selectedIds, action, value);
    setAction('');
    setValue('');
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#0A2540] rounded-xl text-white flex-wrap">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Edit2 className="w-4 h-4 text-blue-300" />
        <span className="text-blue-200">{selectedIds.length}</span> sélectionnée{selectedIds.length > 1 ? 's' : ''}
      </div>
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        <Select value={action} onValueChange={(v) => { setAction(v); setValue(''); }}>
          <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white text-sm h-8">
            <SelectValue placeholder="Choisir une action..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status"><CheckCircle className="w-3 h-3 inline mr-1" />Changer statut</SelectItem>
            <SelectItem value="category"><Tag className="w-3 h-3 inline mr-1" />Assigner catégorie</SelectItem>
            <SelectItem value="department"><Building2 className="w-3 h-3 inline mr-1" />Assigner département</SelectItem>
            <SelectItem value="payment_method">Méthode de paiement</SelectItem>
          </SelectContent>
        </Select>

        {action === 'status' && (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white text-sm h-8">
              <SelectValue placeholder="Statut..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="En attente">En attente</SelectItem>
              <SelectItem value="Payé">Payé</SelectItem>
              <SelectItem value="Annulé">Annulé</SelectItem>
            </SelectContent>
          </Select>
        )}
        {action === 'category' && (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white text-sm h-8">
              <SelectValue placeholder="Catégorie..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value="Salaires">Salaires</SelectItem>
              <SelectItem value="Opérations">Opérations</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
        )}
        {action === 'department' && (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white text-sm h-8">
              <SelectValue placeholder="Département..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {action === 'payment_method' && (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white text-sm h-8">
              <SelectValue placeholder="Méthode..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Espèces">Espèces</SelectItem>
              <SelectItem value="Chèque">Chèque</SelectItem>
              <SelectItem value="Virement">Virement</SelectItem>
              <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
              <SelectItem value="Mobile Money">Mobile Money</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button size="sm" onClick={handleApply} disabled={!action || !value}
          className="bg-blue-500 hover:bg-blue-400 text-white h-8 text-xs">
          Appliquer
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}
          className="text-white/60 hover:text-white hover:bg-white/10 h-8">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}