import React from 'react';
import { Building2, User, Shield, AlertTriangle, ChevronDown } from 'lucide-react';

function getUBOBadge(partner) {
  const percent = parseFloat(partner.part_percent) || 0;
  const isUBO = percent >= 25 || partner.ubo_manual === true;
  const isPEP = partner.pep_status === true;
  return { isUBO, isPEP, percent };
}

function PartnerNode({ partner, companyName }) {
  const { isUBO, isPEP, percent } = getUBOBadge(partner);
  const isPhysique = partner.type === 'physique';

  const name = isPhysique
    ? `${partner.prenom || ''} ${partner.nom || ''}`.trim() || 'Partenaire physique'
    : partner.raison_sociale || 'Partenaire moral';

  return (
    <div className="flex flex-col items-center">
      {/* Connector line from parent */}
      <div className="w-px h-6 bg-[#D1D5DB]" />

      <div className={`relative rounded-xl border-2 p-3 w-48 text-center shadow-sm transition-all ${
        isPEP ? 'border-red-400 bg-red-50'
        : isUBO ? 'border-amber-400 bg-amber-50'
        : 'border-[#E5E7EB] bg-white'
      }`}>
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
          isPEP ? 'bg-red-100' : isUBO ? 'bg-amber-100' : isPhysique ? 'bg-blue-100' : 'bg-purple-100'
        }`}>
          {isPhysique
            ? <User className={`w-5 h-5 ${isPEP ? 'text-red-500' : isUBO ? 'text-amber-500' : 'text-blue-500'}`} />
            : <Building2 className={`w-5 h-5 ${isPEP ? 'text-red-500' : 'text-purple-500'}`} />
          }
        </div>

        <p className="text-xs font-semibold text-[#1A1A1A] leading-tight truncate px-1" title={name}>{name}</p>
        <p className="text-[10px] text-[#6B6B6B] mt-0.5">{isPhysique ? 'Pers. physique' : 'Pers. morale'}</p>

        {/* Percentage badge */}
        <div className="mt-2 inline-flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-full px-2 py-0.5">
          <span className="text-xs font-bold text-[#1A1A1A]">{percent > 0 ? `${percent}%` : '—'}</span>
        </div>

        {/* UBO / PEP badges */}
        <div className="flex justify-center gap-1 mt-1.5 flex-wrap">
          {isUBO && !isPEP && (
            <span className="text-[9px] bg-amber-200 text-amber-800 rounded-full px-1.5 py-0.5 font-medium flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" /> UBO
            </span>
          )}
          {isPEP && (
            <span className="text-[9px] bg-red-200 text-red-800 rounded-full px-1.5 py-0.5 font-medium flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> PEP
            </span>
          )}
          {partner.sanctions_clear && (
            <span className="text-[9px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-medium">✓ KYC</span>
          )}
          {partner.indirect_control === 'oui' && (
            <span className="text-[9px] bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5 font-medium">Indirect</span>
          )}
        </div>

        {/* Indirect entity */}
        {partner.indirect_control === 'oui' && partner.controlling_entity_name && (
          <p className="text-[9px] text-[#9B9B9B] mt-1 truncate">via {partner.controlling_entity_name}</p>
        )}
      </div>
    </div>
  );
}

export default function ShareholderTree({ partners = [], companyName = 'Société' }) {
  if (partners.length === 0) return null;

  const total = partners.reduce((s, p) => s + (parseFloat(p.part_percent) || 0), 0);
  const ubos = partners.filter(p => parseFloat(p.part_percent) >= 25 || p.ubo_manual === true);
  const peps = partners.filter(p => p.pep_status === true);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#6B6B6B]" />
          Structure Actionnariale
        </h3>
        <div className="flex gap-2 text-[10px]">
          {ubos.length > 0 && (
            <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> {ubos.length} UBO{ubos.length > 1 ? 's' : ''}
            </span>
          )}
          {peps.length > 0 && (
            <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> {peps.length} PEP{peps.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tree diagram */}
      <div className="flex flex-col items-center overflow-x-auto">
        {/* Root company node */}
        <div className="bg-[#1A1A1A] text-white rounded-xl px-5 py-3 text-center shadow-md">
          <Building2 className="w-5 h-5 mx-auto mb-1 opacity-80" />
          <p className="text-sm font-semibold">{companyName}</p>
          <p className="text-[10px] opacity-60 mt-0.5">Société en cours de création</p>
        </div>

        {/* Connector + children */}
        <div className="flex items-start gap-4 mt-0 flex-wrap justify-center">
          {partners.map((partner, i) => (
            <PartnerNode key={i} partner={partner} companyName={companyName} />
          ))}
        </div>
      </div>

      {/* Capital summary bar */}
      <div className="mt-5 pt-4 border-t border-[#F0F0F0]">
        <div className="flex items-center justify-between text-xs text-[#6B6B6B] mb-2">
          <span>Répartition du capital</span>
          <span className={`font-bold ${total > 100 ? 'text-red-500' : total === 100 ? 'text-green-600' : 'text-[#1A1A1A]'}`}>
            {total.toFixed(1)}% / 100%
          </span>
        </div>
        <div className="w-full h-3 bg-[#F5F5F5] rounded-full overflow-hidden flex">
          {partners.map((p, i) => {
            const pct = Math.min(parseFloat(p.part_percent) || 0, 100);
            const colors = ['bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-green-400', 'bg-pink-400', 'bg-teal-400'];
            return pct > 0 ? (
              <div
                key={i}
                className={`h-full ${colors[i % colors.length]} transition-all`}
                style={{ width: `${Math.min(pct, 100)}%` }}
                title={`${p.prenom || p.raison_sociale || 'Partenaire'}: ${pct}%`}
              />
            ) : null;
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          {partners.map((p, i) => {
            const pct = parseFloat(p.part_percent) || 0;
            if (pct === 0) return null;
            const colors = ['bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-green-400', 'bg-pink-400', 'bg-teal-400'];
            const name = p.type === 'physique'
              ? `${p.prenom || ''} ${p.nom || ''}`.trim() || `#${i + 1}`
              : p.raison_sociale || `Partenaire #${i + 1}`;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                <span className="text-[10px] text-[#6B6B6B]">{name} <strong>{pct}%</strong></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* UBO Register summary */}
      {ubos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#F0F0F0]">
          <p className="text-xs font-semibold text-[#1A1A1A] mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" /> Registre des Bénéficiaires Effectifs
          </p>
          <div className="space-y-2">
            {ubos.map((p, i) => {
              const name = p.type === 'physique'
                ? `${p.prenom || ''} ${p.nom || ''}`.trim()
                : p.raison_sociale || '';
              return (
                <div key={i} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-amber-500" />
                    <span className="font-medium text-[#1A1A1A]">{name}</span>
                    {p.pep_status && <span className="text-[9px] bg-red-200 text-red-700 rounded-full px-1.5 py-0.5">PEP</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[#6B6B6B]">
                    <span>{parseFloat(p.part_percent) || 0}%</span>
                    {p.ubo_declaration_signed
                      ? <span className="text-green-600 font-medium">✓ Signé</span>
                      : <span className="text-red-500">⚠ Non signé</span>}
                    {p.sanctions_clear
                      ? <span className="text-green-600">✓ Sanctions OK</span>
                      : <span className="text-[#9B9B9B]">— Sanctions</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}