import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Filter, X } from 'lucide-react';

const DEFAULT_FILTERS = {
  searchQuery: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  category: 'all',
  department: 'all',
  paymentMethod: 'all',
  source: 'all',
  bookingStatus: 'all',
  status: 'all',
};

export default function AdvancedFilters({ filters, setFilters, categories, departments }) {
  const hasActive = Object.entries(filters).some(([k, v]) => v && v !== 'all' && v !== '');

  const reset = () => setFilters(DEFAULT_FILTERS);
  const set = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[#0066FF]" />
        <span className="font-semibold text-[#0A2540] text-sm">Filtres avancés</span>
        {hasActive && (
          <Button variant="ghost" size="sm" onClick={reset} className="ml-auto text-xs text-red-500 h-6">
            <X className="w-3 h-3 mr-1" /> Réinitialiser
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="col-span-2">
          <Label className="text-xs text-[#697586]">Recherche</Label>
          <Input
            placeholder="Description, contact..."
            value={filters.searchQuery}
            onChange={(e) => set('searchQuery', e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Date range */}
        <div>
          <Label className="text-xs text-[#697586]">Date début</Label>
          <Input type="date" value={filters.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-[#697586]">Date fin</Label>
          <Input type="date" value={filters.dateTo} onChange={(e) => set('dateTo', e.target.value)} className="mt-1 h-8 text-sm" />
        </div>

        {/* Amount range */}
        <div>
          <Label className="text-xs text-[#697586]">Montant min (DJF)</Label>
          <Input type="number" placeholder="0" value={filters.amountMin} onChange={(e) => set('amountMin', e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-[#697586]">Montant max (DJF)</Label>
          <Input type="number" placeholder="∞" value={filters.amountMax} onChange={(e) => set('amountMax', e.target.value)} className="mt-1 h-8 text-sm" />
        </div>

        {/* Category */}
        <div>
          <Label className="text-xs text-[#697586]">Catégorie</Label>
          <Select value={filters.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div>
          <Label className="text-xs text-[#697586]">Département</Label>
          <Select value={filters.department} onValueChange={(v) => set('department', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Payment method */}
        <div>
          <Label className="text-xs text-[#697586]">Méthode paiement</Label>
          <Select value={filters.paymentMethod} onValueChange={(v) => set('paymentMethod', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="Espèces">Espèces</SelectItem>
              <SelectItem value="Chèque">Chèque</SelectItem>
              <SelectItem value="Virement">Virement</SelectItem>
              <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
              <SelectItem value="Mobile Money">Mobile Money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Booking status */}
        <div>
          <Label className="text-xs text-[#697586]">Comptabilisation</Label>
          <Select value={filters.bookingStatus} onValueChange={(v) => set('bookingStatus', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="booked">Comptabilisé</SelectItem>
              <SelectItem value="unbooked">Non comptabilisé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <Label className="text-xs text-[#697586]">Statut paiement</Label>
          <Select value={filters.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="Payé">Payé</SelectItem>
              <SelectItem value="En attente">En attente</SelectItem>
              <SelectItem value="Annulé">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_FILTERS };