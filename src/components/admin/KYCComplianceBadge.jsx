import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, AlertTriangle, CheckCircle2, Loader2, Zap,
  Eye, EyeOff, Clock, TrendingUp, Users, FileText, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const RISK_STYLES = {
  LOW:       { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  label: 'Faible' },
  MEDIUM:    { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500',  label: 'Moyen' },
  HIGH:      { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', label: 'Élevé' },
  VERY_HIGH: { bg: 'bg-red-50',   border: 'border-red-300',    badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    label: 'Très élevé' },
};

const DD_STYLES = {
  SIMPLIFIED: { color: 'bg-green-100 text-green-700',  label: 'Diligence simplifiée' },
  STANDARD:   { color: 'bg-blue-100 text-blue-700',    label: 'Diligence standard' },
  ENHANCED:   { color: 'bg-red-100 text-red-700',      label: 'Diligence renforcée (EDD)' },
};

const COMPLIANCE_STYLES = {
  COMPLIANT:        { color: 'text-green-600', label: 'Conforme' },
  REVIEW_REQUIRED:  { color: 'text-amber-600', label: 'À réviser' },
  NON_COMPLIANT:    { color: 'text-red-600',   label: 'Non conforme' },
};

function RiskBar({ score }) {
  const color = score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 25 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-[10px] font-bold text-[#1A1A1A] w-6 text-right">{score}</span>
    </div>
  );
}

export default function KYCComplianceBadge({ company, dossier_id }) {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleAssess = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await apiClient.functions.invoke('kycRiskEngine', {
        company_id: company.id,
        company_name: company.nom_entreprise,
        nif: company.nif,
        type_entreprise: company.type_entreprise,
        activite: company.activite,
        capital_social: company.capital_social,
        date_creation: company.date_creation,
        dossier_id: dossier_id || null
      });
      if (res.data?.success) {
        setAssessment(res.data.assessment);
        setExpanded(true);
        toast.success('Évaluation KYC complétée');
      } else {
        toast.error(res.data?.error || 'Erreur KYC');
      }
    } catch (e) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const risk = assessment ? RISK_STYLES[assessment.risk_category] : null;
  const dd = assessment ? DD_STYLES[assessment.due_diligence_level] : null;
  const compliance = assessment ? COMPLIANCE_STYLES[assessment.fenergo_compliance_status] : null;

  return (
    <div className="mt-3 border-t border-[#E5E7EB] pt-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#1A2B6B]" />
          <span className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-wide">KYC / AML Compliance</span>
          {assessment && (
            <span className={`w-2 h-2 rounded-full ${risk?.dot}`} title={`Risque ${risk?.label}`} />
          )}
        </div>
        <div className="flex items-center gap-1">
          {assessment && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="text-[#9B9B9B] hover:text-[#1A1A1A] p-0.5"
            >
              {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={handleAssess}
            disabled={loading}
            className="flex items-center gap-0.5 text-[10px] bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white rounded px-2 py-1 disabled:opacity-50 transition-colors"
          >
            {loading
              ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Analyse...</>
              : assessment
                ? <><RefreshCw className="w-2.5 h-2.5" /> Réévaluer</>
                : <><Zap className="w-2.5 h-2.5" /> Évaluer</>
            }
          </button>
        </div>
      </div>

      {/* Quick status badges when not expanded */}
      {assessment && !expanded && (
        <div className="flex flex-wrap gap-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${risk?.badge}`}>
            Risque {risk?.label}
          </span>
          {assessment.edd_required && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700">EDD requis</span>
          )}
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${dd?.color}`}>
            {dd?.label}
          </span>
        </div>
      )}

      {/* Expanded assessment */}
      {assessment && expanded && (
        <div className={`rounded-xl border p-3 space-y-3 ${risk?.bg} ${risk?.border}`}>
          {/* Risk Score */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#1A1A1A]">Score de risque global</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${risk?.badge}`}>{risk?.label}</span>
            </div>
            <RiskBar score={assessment.overall_risk_score || 0} />
          </div>

          {/* Key indicators */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white rounded-lg p-2 border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Niveau de diligence</p>
              <p className={`text-[10px] font-semibold mt-0.5 ${dd?.color?.split(' ')[1]}`}>{dd?.label}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Fenergo Compliance</p>
              <p className={`text-[10px] font-semibold mt-0.5 ${compliance?.color}`}>{compliance?.label}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Transparence UBO</p>
              <p className={`text-[10px] font-semibold mt-0.5 ${assessment.ubo_transparency === 'TRANSPARENT' ? 'text-green-600' : assessment.ubo_transparency === 'OPAQUE' ? 'text-red-600' : 'text-amber-600'}`}>
                {assessment.ubo_transparency === 'TRANSPARENT' ? '✓ Transparent' : assessment.ubo_transparency === 'OPAQUE' ? '✗ Opaque' : '~ Partiel'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Prochaine révision</p>
              <p className="text-[10px] font-semibold mt-0.5 text-[#1A1A1A] flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {assessment.next_review_date || `${assessment.next_review_months}m`}
              </p>
            </div>
          </div>

          {/* Risk sub-scores */}
          <div className="space-y-1">
            <p className="text-[9px] font-semibold text-[#6B6B6B] uppercase tracking-wide">Facteurs de risque</p>
            {[
              { label: 'Géographique', value: assessment.geographic_risk },
              { label: 'Structure actionnariat', value: assessment.ownership_risk },
              { label: 'Exposition PPE', value: assessment.pep_exposure_risk },
              { label: 'Secteur d\'activité', value: assessment.sector_risk },
            ].map(({ label, value }) => {
              const colors = { LOW: 'text-green-600', NONE: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600', VERY_HIGH: 'text-red-700' };
              return (
                <div key={label} className="flex items-center justify-between text-[10px]">
                  <span className="text-[#6B6B6B]">{label}</span>
                  <span className={`font-semibold ${colors[value] || 'text-gray-600'}`}>{value || '—'}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#6B6B6B]">Qualité des données</span>
              <span className="font-semibold text-[#1A1A1A]">{assessment.data_quality_score || 0}/100</span>
            </div>
          </div>

          {/* Monitoring flags */}
          {assessment.continuous_monitoring_flags?.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg p-2">
              <p className="text-[9px] font-semibold text-amber-600 mb-1 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Alertes surveillance continue ({assessment.continuous_monitoring_flags.length})
              </p>
              <ul className="space-y-0.5">
                {assessment.continuous_monitoring_flags.slice(0, 3).map((flag, i) => (
                  <li key={i} className="text-[9px] text-amber-800">• {flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* EDD warning */}
          {assessment.edd_required && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
              <p className="text-[9px] text-red-700 font-semibold">Diligence renforcée (EDD) requise pour ce client</p>
            </div>
          )}

          {/* Recommended actions */}
          {assessment.recommended_actions?.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1">Actions recommandées</p>
              <ul className="space-y-0.5">
                {assessment.recommended_actions.slice(0, 4).map((action, i) => (
                  <li key={i} className="text-[9px] text-[#1A1A1A] flex items-start gap-1">
                    <span className="text-[#1A2B6B] font-bold shrink-0">{i + 1}.</span> {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk narrative */}
          {assessment.risk_narrative && (
            <p className="text-[9px] text-[#6B6B6B] italic leading-relaxed border-t border-[#E5E7EB] pt-2">
              {assessment.risk_narrative}
            </p>
          )}

          <p className="text-[8px] text-[#9B9B9B]">
            Évalué le {new Date(assessment.assessed_at).toLocaleString('fr-FR')} par {assessment.assessed_by}
          </p>
        </div>
      )}
    </div>
  );
}