import React, { useState } from 'react';

const COUNTRIES = [
  { code: 'DJ', dial: '+253', flag: '🇩🇯', name: 'Djibouti' },
  { code: 'ET', dial: '+251', flag: '🇪🇹', name: 'Éthiopie' },
  { code: 'SO', dial: '+252', flag: '🇸🇴', name: 'Somalie' },
  { code: 'ER', dial: '+291', flag: '🇪🇷', name: 'Érythrée' },
  { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'États-Unis' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Arabie Saoudite' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'Émirats Arabes Unis' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Koweït' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: 'YE', dial: '+967', flag: '🇾🇪', name: 'Yémen' },
  { code: 'EG', dial: '+20', flag: '🇪🇬', name: 'Égypte' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: 'SN', dial: '+221', flag: '🇸🇳', name: 'Sénégal' },
  { code: 'CI', dial: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'CM', dial: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: 'TZ', dial: '+255', flag: '🇹🇿', name: 'Tanzanie' },
  { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'Chine' },
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'Inde' },
  { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Turquie' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Allemagne' },
  { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italie' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Espagne' },
];

export default function PhoneInput({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Parse existing value to extract dial code and number
  const matchedCountry = COUNTRIES.find(c => value && value.startsWith(c.dial)) || COUNTRIES[0];
  const [selected, setSelected] = useState(matchedCountry);
  const localNumber = value && value.startsWith(selected.dial)
    ? value.slice(selected.dial.length).trim()
    : (value || '');

  const handleSelect = (country) => {
    setSelected(country);
    setOpen(false);
    setSearch('');
    onChange(country.dial + ' ' + localNumber);
  };

  const handleNumber = (e) => {
    onChange(selected.dial + ' ' + e.target.value);
  };

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 border border-input rounded-l-md bg-transparent text-sm hover:bg-accent transition-colors shrink-0 border-r-0"
      >
        <span className="text-base">{selected.flag}</span>
        <span className="text-xs text-muted-foreground">{selected.dial}</span>
        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <input
        type="tel"
        value={localNumber}
        onChange={handleNumber}
        placeholder={placeholder || 'XX XX XX XX'}
        className="flex h-9 w-full rounded-r-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#F0F0F0]">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un pays..."
              className="w-full px-2 py-1.5 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F5F5] transition-colors text-left ${selected.code === c.code ? 'bg-[#F0F4FF] text-blue-700' : ''}`}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}