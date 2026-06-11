import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, Loader2, CheckCircle2, Building2, MapPin, Hash,
  Globe, ChevronDown, ChevronUp, AlertCircle, Sparkles, Users, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const REGISTRIES = [
  { name: 'OpenCorporates', url: 'opencorporates.com', flag: '🌐' },
  { name: 'Infogreffe', url: 'infogreffe.fr', flag: '🇫🇷' },
  { name: 'Companies House', url: 'find-and-update.company-information.service.gov.uk', flag: '🇬🇧' },
  { name: 'D&B Business', url: 'dnb.com/business-directory.html', flag: '🌍' },
  { name: 'RCCM Djibouti', url: 'rccm.dj', flag: '🇩🇯' },
  { name: 'SEC EDGAR', url: 'sec.gov/cgi-bin/browse-edgar', flag: '🇺🇸' },
  { name: 'Pappers.fr', url: 'pappers.fr', flag: '🇫🇷' },
  { name: 'Societe.com', url: 'societe.com', flag: '🇫🇷' },
];

const CONF_STYLE = {
  HIGH:   { cls: 'bg-green-100 text-green-700 border-green-200', label: '✓ Fiable' },
  MEDIUM: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: '~ Partiel' },
  LOW:    { cls: 'bg-gray-100 text-gray-500 border-gray-200',    label: '? Incertain' },
};

function RegistryPill({ name, flag, active }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-[#6B6B6B] border-[#E5E7EB]'
    }`}>
      {flag} {name}
    </span>
  );
}

export default function CompanyLookup({ onApply, currentRaisonSociale = '' }) {
  const [query, setQuery] = useState(currentRaisonSociale || '');
  const [country, setCountry] = useState('');
  const [regNum, setRegNum] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [activeReg, setActiveReg] = useState(0);
  const [searchMode, setSearchMode] = useState('name'); // 'name' | 'number'

  // Cycle through registries visually during loading
  const startRegistryCycle = () => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % REGISTRIES.length;
      setActiveReg(i);
    }, 600);
    return interval;
  };

  const buildPrompt = () => {
    const target = searchMode === 'number'
      ? `registration/company number "${regNum}"${query ? ` (company name hint: "${query}")` : ''}`
      : `company name "${query}"${regNum ? ` (registration number hint: "${regNum}")` : ''}`;

    const countryHint = country ? ` in country: ${country}` : '';

    return `You are an expert corporate intelligence assistant with access to global company registry databases.

TASK: Look up the company with ${target}${countryHint} across ALL of the following public registries and data sources:

REGISTRY SOURCES TO SEARCH (query each one):
1. OpenCorporates (opencorporates.com) — global open company data, covers 140+ jurisdictions
2. Infogreffe (infogreffe.fr) — French commercial court registry, official RCS data
3. Pappers.fr (pappers.fr) — French company search with full Kbis data
4. Societe.com (societe.com) — French and European company directory
5. Companies House UK (find-and-update.company-information.service.gov.uk) — UK registered companies
6. D&B Business Directory (dnb.com/business-directory.html) — global business intelligence
7. RCCM Djibouti — Registre du Commerce et du Crédit Mobilier de Djibouti
8. SEC EDGAR (sec.gov) — US public company filings
9. OHADA registries — for West/Central African companies (SYSCOA zone)
10. Kompass (kompass.com) — global B2B directory
11. Orbis (Bureau Van Dijk) — global corporate database
12. African Development Bank business registry data
13. Any other relevant national or regional registry

EXTRACTION REQUIREMENTS:
For each matching company found, extract:
- raison_sociale: exact official registered name (as it appears in the registry)
- pays_immatriculation: country of registration (full name)
- siege_social: complete registered address including street, city, postal code, country
- rcs: registration/company number (RCS Greffe, Companies House number, RCCM number, etc.) — include the registry prefix if relevant
- nif: tax identification number / fiscal ID / EIN / VAT number
- forme_juridique: legal form (SA, SARL, SAS, Ltd, GmbH, LLC, PLC, etc.)
- date_creation: incorporation date in YYYY-MM-DD format (or YYYY-MM or YYYY if only partial)
- statut: current status (Actif/Active, Radié/Dissolved, En liquidation, etc.)
- capital_social: share capital with currency (e.g. "100,000 EUR", "50,000,000 DJF")
- activite: main business activity, APE/NAF code if available, NACE code, SIC code
- dirigeants: list of up to 5 directors/officers with nom, prenom, fonction, date_nomination
- actionnaires: list of known shareholders [{nom, part_percent}] if publicly available
- source: exact registry name and URL where this data was found
- source_url: direct URL to the company's registry page if available
- confidence: HIGH (official registry data confirmed), MEDIUM (directory/aggregator data), LOW (inferred or uncertain)
- derniere_maj: date of last registry update if known

IMPORTANT NOTES:
- Prioritize official national registry data over aggregator data
- If found in multiple registries, merge the data into one result and list all sources
- Return up to 4 results if multiple distinct companies match
- If the company is African or Djiboutian, prioritize RCCM and OHADA registry data
- Do NOT fabricate data — if a field is not found, use empty string ""

Return the structured JSON with a "companies" array.`;
  };

  const search = async () => {
    const hasQuery = query.trim() || regNum.trim();
    if (!hasQuery) return;
    setLoading(true);
    setResults(null);
    setExpanded({});
    const interval = startRegistryCycle();
    try {
      const r = await apiClient.integrations.Core.InvokeLLM({
        prompt: buildPrompt(),
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
                  raison_sociale:       { type: 'string' },
                  pays_immatriculation: { type: 'string' },
                  siege_social:         { type: 'string' },
                  rcs:                  { type: 'string' },
                  nif:                  { type: 'string' },
                  forme_juridique:      { type: 'string' },
                  date_creation:        { type: 'string' },
                  statut:               { type: 'string' },
                  capital_social:       { type: 'string' },
                  activite:             { type: 'string' },
                  dirigeants: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        nom:             { type: 'string' },
                        prenom:          { type: 'string' },
                        fonction:        { type: 'string' },
                        date_nomination: { type: 'string' },
                      },
                    },
                  },
                  actionnaires: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        nom:          { type: 'string' },
                        part_percent: { type: 'string' },
                      },
                    },
                  },
                  source:      { type: 'string' },
                  source_url:  { type: 'string' },
                  confidence:  { type: 'string' },
                  derniere_maj:{ type: 'string' },
                },
              },
            },
          },
        },
      });
      clearInterval(interval);
      setResults(r?.companies || []);
      if (!r?.companies?.length) {
        toast.info('Aucune entreprise trouvée — essayez avec le numéro d\'immatriculation');
      } else {
        toast.success(`${r.companies.length} résultat(s) trouvé(s) dans les registres publics`);
      }
    } catch (e) {
      clearInterval(interval);
      toast.error('Erreur de recherche : ' + e.message);
    }
    setLoading(false);
  };

  const handleApply = (company) => {
    onApply({
      raison_sociale:       company.raison_sociale || '',
      pays_immatriculation: company.pays_immatriculation || '',
      siege_social:         company.siege_social || '',
      rcs:                  company.rcs || '',
      nif:                  company.nif || '',
    });
    toast.success(`Données de "${company.raison_sociale}" importées`);
    setResults(null);
  };

  const isActive = (statut) =>
    statut?.toLowerCase().includes('actif') || statut?.toLowerCase().includes('active');

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#1A1A1A]">Recherche dans les registres publics mondiaux</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {REGISTRIES.map((r, i) => (
              <RegistryPill key={r.name} {...r} active={loading && activeReg === i} />
            ))}
          </div>
        </div>
      </div>

      {/* Search mode toggle */}
      <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-lg p-0.5 w-fit">
        {[{ id: 'name', label: 'Par nom' }, { id: 'number', label: 'Par N° registre' }].map(m => (
          <button key={m.id} type="button"
            onClick={() => setSearchMode(m.id)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              searchMode === m.id ? 'bg-[#1A2B6B] text-white' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Search inputs */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder={searchMode === 'number' ? 'Nom (optionnel, aide à la recherche)...' : 'Nom ou raison sociale exacte...'}
            className="text-sm bg-white"
          />
          <div className="grid grid-cols-2 gap-1.5">
            {searchMode === 'number' && (
              <Input
                value={regNum}
                onChange={e => setRegNum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="N° immatriculation / SIREN / RCCM..."
                className="text-sm bg-white"
              />
            )}
            <Input
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="Pays (ex: France, Djibouti...)"
              className={`text-sm bg-white ${searchMode !== 'number' ? 'col-span-2' : ''}`}
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={search}
          disabled={loading || (!query.trim() && !regNum.trim())}
          className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white h-auto px-4 self-start"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Interrogation de <strong>{REGISTRIES[activeReg]?.name}</strong>...</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* No results */}
      {results && results.length === 0 && !loading && (
        <div className="flex items-center gap-2 text-xs text-[#6B6B6B] py-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          Aucun résultat dans les registres publics. Utilisez la saisie manuelle ci-dessous.
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-wide">
            {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
          </p>

          {results.map((company, idx) => {
            const conf = CONF_STYLE[company.confidence] || CONF_STYLE.LOW;
            const isOpen = expanded[idx];
            const active = isActive(company.statut);
            return (
              <div key={idx} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
                {/* Card header */}
                <div className="flex items-start justify-between p-3 gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-[#1A2B6B]/10 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#1A2B6B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A1A1A] leading-tight">{company.raison_sociale}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {company.pays_immatriculation && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[#6B6B6B]">
                            <Globe className="w-2.5 h-2.5" />{company.pays_immatriculation}
                          </span>
                        )}
                        {company.forme_juridique && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{company.forme_juridique}</span>
                        )}
                        {company.statut && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {active ? '● Actif' : '○ ' + company.statut}
                          </span>
                        )}
                        <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${conf.cls}`}>{conf.label}</span>
                      </div>
                      {company.rcs && (
                        <p className="text-[10px] text-[#9B9B9B] font-mono mt-0.5">
                          <Hash className="w-2.5 h-2.5 inline mr-0.5" />{company.rcs}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setExpanded(p => ({ ...p, [idx]: !p[idx] }))}
                      className="text-[#9B9B9B] hover:text-[#1A1A1A] p-1 rounded-lg hover:bg-[#F5F5F5]">
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <Button type="button" size="sm" onClick={() => handleApply(company)}
                      className="h-7 text-[10px] bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white px-2.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Utiliser
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-[#F0F0F0] px-3 pb-3 pt-2 space-y-2.5 bg-[#FAFAFA]">
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {company.siege_social && (
                        <div className="col-span-2 flex items-start gap-1 text-[#6B6B6B] bg-white border border-[#E5E7EB] rounded-lg p-2">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-[#1A2B6B]" />
                          <span>{company.siege_social}</span>
                        </div>
                      )}
                      {[
                        { label: 'N° registre', val: company.rcs, mono: true },
                        { label: 'NIF / Fiscal', val: company.nif, mono: true },
                        { label: 'Création', val: company.date_creation },
                        { label: 'Capital', val: company.capital_social },
                      ].filter(f => f.val).map(f => (
                        <div key={f.label} className="p-1.5 bg-white border border-[#E5E7EB] rounded-lg">
                          <p className="text-[#9B9B9B] mb-0.5">{f.label}</p>
                          <p className={`font-semibold text-[#1A1A1A] ${f.mono ? 'font-mono' : ''}`}>{f.val}</p>
                        </div>
                      ))}
                      {company.activite && (
                        <div className="col-span-2 p-1.5 bg-white border border-[#E5E7EB] rounded-lg">
                          <p className="text-[#9B9B9B] mb-0.5">Activité principale</p>
                          <p className="font-medium text-[#1A1A1A]">{company.activite}</p>
                        </div>
                      )}
                    </div>

                    {/* Directors */}
                    {company.dirigeants?.length > 0 && (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[9px] font-bold text-amber-700 mb-1.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Dirigeants identifiés ({company.dirigeants.length})
                        </p>
                        <div className="space-y-1">
                          {company.dirigeants.map((d, di) => (
                            <div key={di} className="flex items-center justify-between text-[10px] bg-white/60 rounded px-2 py-1">
                              <span className="font-semibold">{[d.prenom, d.nom].filter(Boolean).join(' ')}</span>
                              <span className="text-[#6B6B6B]">{d.fonction}</span>
                              {d.date_nomination && <span className="text-[#9B9B9B]">{d.date_nomination}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shareholders */}
                    {company.actionnaires?.length > 0 && (
                      <div className="p-2 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-[9px] font-bold text-purple-700 mb-1.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Actionnaires connus
                        </p>
                        <div className="space-y-1">
                          {company.actionnaires.map((a, ai) => (
                            <div key={ai} className="flex items-center justify-between text-[10px] bg-white/60 rounded px-2 py-1">
                              <span className="font-semibold">{a.nom}</span>
                              {a.part_percent && <span className="text-purple-700 font-bold">{a.part_percent}%</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source */}
                    <div className="flex items-center justify-between text-[9px] text-[#9B9B9B]">
                      <span className="flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" /> Source : {company.source}
                        {company.derniere_maj && ` · Mis à jour le ${company.derniere_maj}`}
                      </span>
                      {company.source_url && (
                        <a href={company.source_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-blue-600 hover:underline">
                          <ExternalLink className="w-2.5 h-2.5" /> Voir au registre
                        </a>
                      )}
                    </div>
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