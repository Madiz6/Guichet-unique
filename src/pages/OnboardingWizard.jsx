import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import { Building2, PlusCircle } from 'lucide-react';
import ExistingCompanySetup from '../components/onboarding/ExistingCompanySetup';
import CompanyOnboardingWizard from '../components/onboarding/CompanyOnboardingWizard';

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-onboarding'],
    queryFn: () => meras.entities.Company.list(),
  });

  useEffect(() => {
    if (!isLoading && companies.length > 0) {
      navigate('/Dashboard');
    }
  }, [isLoading, companies.length, navigate]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
    </div>
  );

  if (choice === 'existing') return (
    <ExistingCompanySetup onBack={() => setChoice(null)} onSuccess={() => navigate('/Dashboard')} />
  );
  if (choice === 'create') return (
    <CompanyOnboardingWizard onBack={() => setChoice(null)} onSuccess={() => navigate('/Dashboard')} />
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png"
          alt="Paie360"
          className="w-14 h-14 mx-auto mb-5 object-contain"
        />
        <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">Bienvenue sur Paie360</h1>
        <p className="text-[#6B6B6B] text-sm">Pour commencer, dites-nous votre situation</p>
      </div>

      <div className="flex gap-6 flex-wrap justify-center">
        <button
          onClick={() => setChoice('existing')}
          className="w-64 p-8 bg-white border border-[#E5E7EB] rounded-2xl hover:border-[#185FA5] hover:shadow-lg transition-all text-center group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <p className="font-semibold text-[#1A1A1A] mb-2">Entreprise Existante</p>
          <p className="text-xs text-[#6B6B6B]">Mon entreprise est déjà enregistrée. Je veux la configurer sur Paie360.</p>
        </button>

        <button
          onClick={() => setChoice('create')}
          className="w-64 p-8 bg-white border border-[#E5E7EB] rounded-2xl hover:border-[#3B6D11] hover:shadow-lg transition-all text-center group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-100 transition-colors">
            <PlusCircle className="w-7 h-7 text-green-600" />
          </div>
          <p className="font-semibold text-[#1A1A1A] mb-2">Créer une Entreprise</p>
          <p className="text-xs text-[#6B6B6B]">Je veux créer et enregistrer une nouvelle entreprise via le Guichet Unique ANPI.</p>
          <div className="mt-3 flex flex-wrap gap-1 justify-center">
            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">IA extraction</span>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">Biométrie</span>
            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-200">6 étapes</span>
          </div>
        </button>
      </div>

      <p className="mt-10 text-xs text-[#9B9B9B]">Paie360 · Powered by Meras PSP · © 2026</p>
    </div>
  );
}