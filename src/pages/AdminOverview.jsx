import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import { useCompanyContext } from '@/lib/useCompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building2, Users, Eye, Search, ShieldCheck, Globe,
  BarChart3, X, RefreshCw
} from 'lucide-react';
import KYCComplianceBadge from '@/components/admin/KYCComplianceBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AdminOverview() {
  const { isAdmin, setAdminCompany, adminOverrideCompanyId } = useCompanyContext();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('companies');

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['all-companies'],
    queryFn: () => meras.entities.Company.list('-created_date', 200),
    enabled: isAdmin,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => meras.entities.User.list('-created_date', 200),
    enabled: isAdmin,
  });



  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => meras.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      toast.success('Utilisateur mis à jour');
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[#6B6B6B]">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  const filtered = companies.filter(c =>
    c.nom_entreprise?.toLowerCase().includes(search.toLowerCase()) ||
    c.nif?.toLowerCase().includes(search.toLowerCase())
  );

  const getCompanyUsers = (cId) => allUsers.filter(u => u.company_id === cId);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A1A1A] to-[#4B4B4B] flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">Vue d'ensemble Admin</h1>
              <p className="text-sm text-[#6B6B6B]">Supervision de toutes les entreprises</p>
            </div>
          </div>
          {adminOverrideCompanyId && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                Vue filtrée : {companies.find(c => c.id === adminOverrideCompanyId)?.nom_entreprise || '...'}
              </span>
              <button onClick={() => setAdminCompany(null)} className="ml-2 text-blue-500 hover:text-blue-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Entreprises', value: companies.length, icon: Building2, color: 'blue' },
            { label: 'Utilisateurs', value: allUsers.length, icon: Users, color: 'purple' },
            { label: 'Dossiers actifs', value: companies.length, icon: BarChart3, color: 'green' },
          ].map((kpi, i) => (
            <Card key={i} className="border border-[#E5E7EB] bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  kpi.color === 'blue' ? 'bg-blue-100' :
                  kpi.color === 'purple' ? 'bg-purple-100' :
                  kpi.color === 'green' ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  <kpi.icon className={`w-5 h-5 ${
                    kpi.color === 'blue' ? 'text-blue-600' :
                    kpi.color === 'purple' ? 'text-purple-600' :
                    kpi.color === 'green' ? 'text-green-600' : 'text-orange-600'
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B] uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-xl font-bold text-[#1A1A1A]">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#E5E7EB] mb-6">
          {[
            { id: 'companies', label: 'Entreprises' },
            { id: 'users', label: 'Utilisateurs' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Companies Tab */}
        {tab === 'companies' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher une entreprise…"
                  className="pl-9"
                />
              </div>
              <button onClick={() => queryClient.invalidateQueries(['all-companies'])} className="p-2 hover:bg-[#F5F5F5] rounded-lg">
                <RefreshCw className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            {loadingCompanies ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border border-[#E5E7EB] bg-white">
                <CardContent className="p-12 text-center">
                  <Building2 className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[#6B6B6B]">Aucune entreprise enregistrée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(company => {
                  const users = getCompanyUsers(company.id);
                  const isViewing = adminOverrideCompanyId === company.id;

                  return (
                    <Card key={company.id} className={`border ${isViewing ? 'border-blue-500 ring-2 ring-blue-200' : 'border-[#E5E7EB]'} bg-white hover:shadow-md transition-shadow`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {company.logo_url ? (
                              <img src={company.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-[#E5E7EB]" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A1A1A] to-[#555] flex items-center justify-center text-white font-bold text-sm">
                                {company.nom_entreprise?.[0] || '?'}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-[#1A1A1A] text-sm leading-tight">{company.nom_entreprise}</h3>
                              <p className="text-xs text-[#6B6B6B]">NIF: {company.nif || '—'}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${company.type_entreprise ? 'bg-[#F5F5F5] text-[#6B6B6B]' : 'bg-gray-100 text-gray-500'}`}>
                            {company.type_entreprise || 'Entreprise'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            { label: 'Utilisateurs', value: users.length },
                            { label: 'Créé le', value: company.created_date ? format(new Date(company.created_date), 'dd/MM/yy') : '—' },
                          ].map((stat, i) => (
                            <div key={i} className="bg-[#FAFAFA] rounded-lg p-2 text-center">
                              <p className="text-sm font-bold text-[#1A1A1A]">{stat.value}</p>
                              <p className="text-[10px] text-[#9B9B9B]">{stat.label}</p>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-[#9B9B9B] mb-3">
                          {company.adresse || 'Adresse non renseignée'} •{' '}
                          {company.created_date ? format(new Date(company.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </p>

                        <Button
                          size="sm"
                          className={`w-full text-xs ${isViewing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-[#1A1A1A] hover:bg-[#333] text-white'}`}
                          onClick={() => setAdminCompany(isViewing ? null : company.id)}
                        >
                          {isViewing ? (
                            <><X className="w-3 h-3 mr-1" /> Quitter cette vue</>
                          ) : (
                            <><Eye className="w-3 h-3 mr-1" /> Voir cette entreprise</>
                          )}
                        </Button>

                        <KYCComplianceBadge company={company} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <div className="border border-[#E5E7EB] rounded-xl bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E7EB]">
                  <tr>
                    {['Utilisateur', 'Email', 'Entreprise', 'Rôle', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-[#9B9B9B]">Aucun utilisateur</td></tr>
                  ) : allUsers.map(u => {
                    const co = companies.find(c => c.id === u.company_id);
                    return (
                      <tr key={u.id} className="border-t border-[#F5F5F5] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-medium">
                              {u.full_name?.[0] || '?'}
                            </div>
                            <span className="font-medium text-[#1A1A1A]">{u.full_name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6B6B6B]">{u.email}</td>
                        <td className="px-4 py-3">
                          {co ? (
                            <button
                              onClick={() => setAdminCompany(co.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              <Building2 className="w-3 h-3" />
                              {co.nom_entreprise}
                            </button>
                          ) : (
                            <span className="text-[#9B9B9B] text-xs">Non associé</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role || 'user'}
                            onChange={e => updateUserMutation.mutate({ userId: u.id, data: { role: e.target.value } })}
                            className="border border-[#E5E7EB] rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="user">Utilisateur</option>
                            <option value="manager">Manager</option>
                            <option value="accountant">Comptable</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={u.onboarding_completed ? 'bg-green-100 text-green-700 border-0' : 'bg-yellow-100 text-yellow-700 border-0'}>
                            {u.onboarding_completed ? '✓ Actif' : '⏳ Onboarding'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {co && (
                            <button
                              onClick={() => setAdminCompany(co.id)}
                              className="flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-[#1A1A1A]"
                            >
                              <Eye className="w-3 h-3" /> Voir
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}