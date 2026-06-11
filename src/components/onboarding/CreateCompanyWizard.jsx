import React, { useState } from 'react';
import { meras } from '@/components/core/MerasClient';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ANPIFormPhysique from './ANPIFormPhysique';
import ANPIFormMorale from './ANPIFormMorale';

export default function CreateCompanyWizard({ onBack, onSuccess }) {
  const [entityType, setEntityType] = useState(null); // 'physique' | 'morale'

  if (entityType === 'physique') return (
    <ANPIFormPhysique onBack={() => setEntityType(null)} onSuccess={onSuccess} />
  );
  if (entityType === 'morale') return (
    <ANPIFormMorale onBack={() => setEntityType(null)} onSuccess={onSuccess} />
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="font-semibold text-[#1A1A1A]">Créer une Entreprise</h1>
          <p className="text-xs text-[#6B6B6B]">Guichet Unique ANPI Djibouti</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Choisissez le type d'entité</h2>
          <p className="text-sm text-[#6B6B6B]">Sélectionnez la forme juridique de votre entreprise</p>
        </div>

        <div className="flex gap-6 flex-wrap justify-center">
          <button
            onClick={() => setEntityType('physique')}
            className="w-64 p-8 bg-white border border-[#E5E7EB] rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all text-center group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <p className="font-semibold text-[#1A1A1A] mb-2">Personne Physique</p>
            <p className="text-xs text-[#6B6B6B]">Entreprise individuelle ou auto-entrepreneur</p>
          </button>

          <button
            onClick={() => setEntityType('morale')}
            className="w-64 p-8 bg-white border border-[#E5E7EB] rounded-2xl hover:border-green-600 hover:shadow-lg transition-all text-center group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-100 transition-colors">
              <Building2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-[#1A1A1A] mb-2">Personne Morale</p>
            <p className="text-xs text-[#6B6B6B]">Société (SARL, SA, SAS, SNC…)</p>
          </button>
        </div>
      </div>
    </div>
  );
}