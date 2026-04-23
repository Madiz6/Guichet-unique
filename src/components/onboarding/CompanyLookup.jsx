import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, CheckCircle2, Building2, MapPin, Hash, Globe, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CompanyLookup — uses LLM + internet search to find company data from
 * public registries (OpenCorporates, Infogreffe, RCCM, Companies House, etc.)
 * and proposes to auto-fill the partner form.
 */
export default function CompanyLookup({ onApply, currentRaisonSociale = '' }) {
  const [query, setQuery] = useState(currentRaisonSociale || '');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState({});

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a corporate registry lookup assistant. Search public company registries and databases (OpenCorporates, Infogreffe, RCCM Djibouti, Companies House UK, SEC EDGAR, African business registries, etc.) for the company: "${query}"${country ? ` registered in ${country}` : ''}.

Return up to 3 matching companies with as much detail as you can find from public sources. For each company, provide:
- raison_sociale: official registered name
- pays_immatriculation: country of registration
- siege_social: registered address
- rcs: registration number (RCS, RCCM, Companies House number, etc.)
- nif: tax identification number if available
- forme_juridique: legal form (SA, SARL, Ltd, SAS, GmbH, etc.)
- date_creation: incorporation date (YYYY-MM-DD or partial)
- statut: active/inactive/dissolved
- capital_social: share capital if available
- activite: main business activity / NACE / SIC code description
- dirigeants: array of up to 3 directors/officers [{nom, prenom, fonction}]
- source: which registry or database this came from
- confidence: HIGH / MEDIUM / LOW based on how certain you are of the data

If no reliable data found, return an empty companies array.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            companies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  raison_sociale: { type: 'string' },
                  pays_immatriculation: { type: 'string' },
                  siege_social: { type: 'string' },
                  rcs: { type: 'string' },
                  nif: { type: 'string' },
                  forme_juridique: { type: 'string' },
                  date_creation: { type: 'string' },
                  statut: { type: 'string' },
                  capital_social: { type: 'string' },
                  activite: { type: 'string' },
                  dirigeants: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        nom: { type: 'string' },
                        prenom: { type: 'string' },
                        fonction: { type: 'string' },
                      },
                    },
                  },
                  source: { type: 'string' },
                  confidence: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setResults(r?.companies || []);
      if (!r?.companies?.length) toast.info('Aucune entreprise trouvée dans les registres publics');
    } catch (e) {
      toast.error('Erreur de recherche : ' + e.message);
    }
    setLoading(false);
  };

  const handleApply = (company) => {
    onApply({
      raison_sociale: company.raison_sociale || '',
      pays_immatriculation: company.pays_immatriculation || '',
      siege_social: company.siege_social || '',
      rcs: company.rcs || '',
      nif: company.nif || '',
    });
    toast.success(`Données de ${company.raison_sociale} importées`);
    setResults(null);
  };

  const CONF_STYLE = {
    HIGH:   { cls: 'bg-green-100 text-green-700 border-green-200', label: 'Fiable' },
    MEDIUM: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Partiel' },
    LOW:    { cls: 'bg-gray-100 text-gray-600 border-gray-200',    label: 'Incertain' },
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
        <div>
          <p className="text-xs font-bold text-[#1A1A1A]">Recherche automatique dans les registres publics</p>
          <p className="text-[10px] text-blue-600">OpenCorporates · Infogreffe · RCCM · Companies House · et autres</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Nom ou raison sociale de la société..."
            className="text-sm bg-white"
          />
          <Input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Pays (optionnel, ex: France, Djibouti...)"
            className="text-sm bg-white"
          />
        </div>
        <Button
          type="button"
          onClick={search}
          disabled={loading || !query.trim()}
          className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white h-auto px-4 self-start"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Search className="w-4 h-4" />
          }
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-blue-700 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Interrogation des registres publics en cours...
        </div>
      )}

      {/* Results */}
      {results && results.length === 0 && !loading && (
        <div className="flex items-center gap-2 text-xs text-[#6B6B6B] py-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Aucun résultat trouvé. Saisissez les informations manuellement ci-dessous.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-wide">{results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}</p>
          {results.map((company, idx) => {
            const conf = CONF_STYLE[company.confidence] || CONF_STYLE.LOW;
            const isExpanded = expanded[idx];
            return (
              <div key={idx} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-start justify-between p-3 gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-[#1A2B6B]/10 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#1A2B6B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A1A1A] truncate">{company.raison_sociale}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {company.pays_immatriculation && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[#6B6B6B]">
                            <Globe className="w-2.5 h-2.5" />{company.pays_immatriculation}
                          </span>
                        )}
                        {company.forme_juridique && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{company.forme_juridique}</span>
                        )}
                        {company.statut && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${company.statut?.toLowerCase().includes('actif') || company.statut?.toLowerCase().includes('active') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {company.statut}
                          </span>
                        )}
                        <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${conf.cls}`}>{conf.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setExpanded(p => ({ ...p, [idx]: !p[idx] }))}
                      className="text-[#9B9B9B] hover:text-[#1A1A1A] p-1">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <Button type="button" size="sm" onClick={() => handleApply(company)}
                      className="h-7 text-[10px] bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white px-2.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Utiliser
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-[#F0F0F0] px-3 pb-3 pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {company.siege_social && (
                        <div className="col-span-2 flex items-start gap-1 text-[#6B6B6B]">
                          <MapPin className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                          <span>{company.siege_social}</span>
                        </div>
                      )}
                      {company.rcs && (
                        <div className="p-1.5 bg-[#F9F9F9] rounded">
                          <p className="text-[#9B9B9B]">N° RCS</p>
                          <p className="font-semibold font-mono">{company.rcs}</p>
                        </div>
                      )}
                      {company.nif && (
                        <div className="p-1.5 bg-[#F9F9F9] rounded">
                          <p className="text-[#9B9B9B]">NIF</p>
                          <p className="font-semibold font-mono">{company.nif}</p>
                        </div>
                      )}
                      {company.date_creation && (
                        <div className="p-1.5 bg-[#F9F9F9] rounded">
                          <p className="text-[#9B9B9B]">Création</p>
                          <p className="font-semibold">{company.date_creation}</p>
                        </div>
                      )}
                      {company.capital_social && (
                        <div className="p-1.5 bg-[#F9F9F9] rounded">
                          <p className="text-[#9B9B9B]">Capital</p>
                          <p className="font-semibold">{company.capital_social}</p>
                        </div>
                      )}
                      {company.activite && (
                        <div className="col-span-2 p-1.5 bg-[#F9F9F9] rounded">
                          <p className="text-[#9B9B9B]">Activité</p>
                          <p className="font-medium">{company.activite}</p>
                        </div>
                      )}
                    </div>

                    {/* Directors */}
                    {company.dirigeants?.length > 0 && (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-[9px] font-semibold text-amber-700 mb-1">Dirigeants identifiés</p>
                        <div className="space-y-0.5">
                          {company.dirigeants.map((d, di) => (
                            <div key={di} className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-medium">{d.prenom} {d.nom}</span>
                              {d.fonction && <span className="text-[#6B6B6B]">— {d.fonction}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source */}
                    {company.source && (
                      <p className="text-[9px] text-[#9B9B9B] flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" /> Source : {company.source}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}