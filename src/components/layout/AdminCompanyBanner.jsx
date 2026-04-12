import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompanyContext } from '@/lib/useCompanyContext';
import { meras } from '@/components/core/MerasClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Eye, X, Globe, ChevronRight } from 'lucide-react';

export default function AdminCompanyBanner() {
  const { isAdmin, adminOverrideCompanyId, setAdminCompany } = useCompanyContext();

  const { data: company } = useQuery({
    queryKey: ['company-banner', adminOverrideCompanyId],
    queryFn: () => adminOverrideCompanyId
      ? meras.entities.Company.filter({ id: adminOverrideCompanyId }).then(r => r[0])
      : Promise.resolve(null),
    enabled: !!adminOverrideCompanyId,
  });

  if (!isAdmin) return null;

  if (!adminOverrideCompanyId) {
    return (
      <div className="bg-[#1A1A1A] text-white px-4 py-1.5 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-3 h-3" />
          <span>Mode Admin — Toutes les entreprises visibles</span>
        </div>
        <Link to="/AdminOverview" className="flex items-center gap-1 text-[#9B9B9B] hover:text-white transition-colors">
          Vue d'ensemble <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-blue-700 text-white px-4 py-1.5 text-xs flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Eye className="w-3 h-3" />
        <span>Vue filtrée sur : <strong>{company?.nom_entreprise || '...'}</strong></span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/AdminOverview" className="flex items-center gap-1 text-blue-200 hover:text-white transition-colors">
          Vue d'ensemble <ChevronRight className="w-3 h-3" />
        </Link>
        <button onClick={() => setAdminCompany(null)} className="flex items-center gap-1 text-blue-200 hover:text-white">
          <X className="w-3 h-3" /> Quitter
        </button>
      </div>
    </div>
  );
}