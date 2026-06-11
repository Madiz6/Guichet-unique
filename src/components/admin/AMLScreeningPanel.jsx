import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, AlertTriangle, CheckCircle2, Search, Loader2,
  RefreshCw, Eye, EyeOff, FileText, Globe, Flag, Zap,
  ThumbsUp, ThumbsDown, History, ChevronDown, ChevronUp,
  Download, Clock, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const RISK_CONFIG = {
  CLEAR:           { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Conforme' },
  REVIEW_REQUIRED: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, label: 'À vérifier' },
  HIGH_RISK:       { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle, label: 'Risque élevé' },
  MATCH_FOUND:     { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, label: 'Correspondance trouvée' },
};

const PEP_CONFIG = {
  NOT_PEP:       { color: 'bg-green-100 text-green-700', label: 'Non PPE' },
  PEP:           { color: 'bg-red-100 text-red-700', label: 'PPE — Diligence renforcée' },
  FORMER_PEP:    { color: 'bg-orange-100 text-orange-700', label: 'Ex-PPE' },
  PEP_ASSOCIATE: { color: 'bg-amber-100 text-amber-700', label: 'Proche PPE' },
  UNKNOWN:       { color: 'bg-gray-100 text-gray-700', label: 'Inconnu' },
};

const FENERGO_CONFIG = {
  LOW:       { color: 'bg-green-100 text-green-700', label: 'Faible' },
  MEDIUM:    { color: 'bg-amber-100 text-amber-700', label: 'Moyen' },
  HIGH:      { color: 'bg-orange-100 text-orange-700', label: 'Élevé' },
  VERY_HIGH: { color: 'bg-red-100 text-red-700', label: 'Très élevé' },
};

const SANCTIONS_CHECKS = [
  { key: 'ofac_status',        label: 'OFAC (US SDN)', flag: '🇺🇸' },
  { key: 'un_sanctions_status', label: 'ONU',          flag: '🌐' },
  { key: 'eu_sanctions_status', label: 'UE',           flag: '🇪🇺' },
  { key: 'uk_sanctions_status', label: 'Royaume-Uni',  flag: '🇬🇧' },
];

function StatusDot({ status }) {
  const colors = {
    CLEAR: 'bg-green-500',
    MATCH: 'bg-red-500',
    POSSIBLE_MATCH: 'bg-amber-500',
    NOT_CHECKED: 'bg-gray-300',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-gray-300'}`} />;
}

// ── Single subject result card with verdict buttons ───────────────────────────
function SubjectResult({ result, verdict, onVerdict, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_CONFIG[result.overall_risk] || RISK_CONFIG.REVIEW_REQUIRED;
  const RiskIcon = risk.icon;

  const borderColor =
    result.overall_risk === 'MATCH_FOUND' || result.overall_risk === 'HIGH_RISK' ? 'border-red-300' :
    result.overall_risk === 'REVIEW_REQUIRED' ? 'border-amber-300' : 'border-green-200';

  const headerBg =
    result.overall_risk === 'MATCH_FOUND' ? 'bg-red-50' :
    result.overall_risk === 'HIGH_RISK' ? 'bg-orange-50' :
    result.overall_risk === 'REVIEW_REQUIRED' ? 'bg-amber-50' : 'bg-green-50';

  return (
    <div className={`border rounded-xl overflow-hidden ${borderColor}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${headerBg}`}>
        <div className="flex items-center gap-2 min-w-0">
          <RiskIcon className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{result.name}</p>
            <p className="text-[10px] text-[#6B6B6B]">{result.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Badge className={`${risk.color} border text-[10px] px-2 py-0.5`}>{risk.label}</Badge>
          {result.pep_status && result.pep_status !== 'NOT_PEP' && (
            <Badge className={`${(PEP_CONFIG[result.pep_status] || PEP_CONFIG.UNKNOWN).color} text-[10px] px-2 py-0.5`}>PPE</Badge>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-[10px] text-[#6B6B6B] hover:text-[#1A1A1A] flex items-center gap-0.5">
            <Eye className="w-3.5 h-3.5" /> {expanded ? 'Masquer' : 'Détails'}
          </button>
        </div>
      </div>

      {/* Sanctions quick view */}
      <div className="px-4 py-2.5 bg-white border-t border-[#E5E7EB] grid grid-cols-4 gap-2">
        {SANCTIONS_CHECKS.map(({ key, label, flag }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <span className="text-sm">{flag}</span>
            <StatusDot status={result[key]} />
            <span className="text-[9px] text-[#9B9B9B] text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Statut PPE</p>
              <p className="text-[10px] font-semibold mt-0.5">{(PEP_CONFIG[result.pep_status] || PEP_CONFIG.UNKNOWN).label}</p>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Interpol</p>
              <p className={`text-[10px] font-semibold mt-0.5 ${result.interpol_status === 'RED_NOTICE' ? 'text-red-600' : 'text-green-600'}`}>
                {result.interpol_status === 'RED_NOTICE' ? '⚠ Notice Rouge' : '✓ Sans alerte'}
              </p>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Risque GAFI</p>
              <p className="text-[10px] font-semibold mt-0.5">{result.fatf_jurisdiction_risk || '—'}</p>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
              <p className="text-[9px] text-[#9B9B9B]">Fenergo</p>
              <p className="text-[10px] font-semibold mt-0.5">{(FENERGO_CONFIG[result.fenergo_risk_category] || FENERGO_CONFIG.MEDIUM).label}</p>
            </div>
          </div>
          {result.pep_details && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[9px] text-amber-600 font-semibold mb-0.5">Détails PPE</p>
              <p className="text-xs text-amber-800">{result.pep_details}</p>
            </div>
          )}
          {result.adverse_media && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[9px] text-red-600 font-semibold mb-0.5">Médias défavorables détectés</p>
              <p className="text-xs text-red-800">{result.adverse_media_summary || 'Voir analyse complète'}</p>
            </div>
          )}
          {result.watchlist_hits?.length > 0 && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-[9px] text-orange-600 font-semibold mb-1">Listes de surveillance ({result.watchlist_hits.length})</p>
              <div className="flex flex-wrap gap-1">
                {result.watchlist_hits.map((hit, i) => (
                  <span key={i} className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{hit}</span>
                ))}
              </div>
            </div>
          )}
          {result.recommended_action && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[9px] text-blue-600 font-semibold mb-0.5">Action recommandée</p>
              <p className="text-xs text-blue-800">{result.recommended_action}</p>
            </div>
          )}
          {result.notes && (
            <div className="p-2.5 bg-gray-50 border border-[#E5E7EB] rounded-lg">
              <p className="text-[9px] text-[#6B6B6B] font-semibold mb-0.5">Notes d'analyse</p>
              <p className="text-xs text-[#1A1A1A]">{result.notes}</p>
            </div>
          )}
          <p className="text-[9px] text-[#9B9B9B]">
            Criblé le {result.screened_at ? new Date(result.screened_at).toLocaleString('fr-FR') : '—'}
          </p>
        </div>
      )}

      {/* Verdict buttons */}
      {!readOnly && (
        <div className="border-t border-[#E5E7EB] bg-white px-4 py-3 flex items-center gap-3">
          <p className="text-xs font-semibold text-[#6B6B6B] mr-2">Décision agent :</p>
          <button
            onClick={() => onVerdict(result.name, 'confirmed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              verdict === 'confirmed'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> Conforme (Vrai)
          </button>
          <button
            onClick={() => onVerdict(result.name, 'flagged')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              verdict === 'flagged'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> Alerte confirmée (Faux)
          </button>
          {verdict && (
            <span className="text-[10px] text-[#9B9B9B] ml-auto">
              {verdict === 'confirmed' ? '✓ Marqué conforme' : '⚠ Alerte validée'}
            </span>
          )}
        </div>
      )}

      {/* Read-only verdict display (in history) */}
      {readOnly && verdict && (
        <div className={`border-t px-4 py-2 flex items-center gap-2 text-xs font-semibold ${
          verdict === 'confirmed' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {verdict === 'confirmed'
            ? <><ThumbsUp className="w-3.5 h-3.5" /> Décision : Conforme (Vrai)</>
            : <><ThumbsDown className="w-3.5 h-3.5" /> Décision : Alerte confirmée (Faux)</>
          }
        </div>
      )}
    </div>
  );
}

// ── History item (one past screening session) ─────────────────────────────────
function HistoryItem({ session, index }) {
  const [open, setOpen] = useState(false);
  const aggConfig = RISK_CONFIG[session.aggregate_risk] || RISK_CONFIG.REVIEW_REQUIRED;
  const AggIcon = aggConfig.icon;
  const totalVerdicts = Object.keys(session.verdicts || {}).length;
  const flaggedCount = Object.values(session.verdicts || {}).filter(v => v === 'flagged').length;

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 bg-[#F9F9F9] flex items-center justify-between gap-3 hover:bg-[#F0F0F0] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#1A2B6B]/10 flex items-center justify-center text-xs font-bold text-[#1A2B6B] shrink-0">
            {index + 1}
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-[#1A1A1A]">
              Criblage du {new Date(session.screened_at).toLocaleString('fr-FR')}
            </p>
            <p className="text-[10px] text-[#9B9B9B]">
              {session.subjects_screened} sujet(s) · par {session.screened_by}
              {totalVerdicts > 0 && ` · ${totalVerdicts} décision(s) agent`}
              {flaggedCount > 0 && ` · ⚠ ${flaggedCount} alerte(s) confirmée(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${aggConfig.color} border text-[10px]`}>{aggConfig.label}</Badge>
          {open ? <ChevronUp className="w-4 h-4 text-[#9B9B9B]" /> : <ChevronDown className="w-4 h-4 text-[#9B9B9B]" />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-[#6B6B6B]">Rapport de criblage — lecture seule</p>
            <button
              onClick={() => exportReport(session)}
              className="flex items-center gap-1.5 text-xs text-[#1A2B6B] border border-[#1A2B6B]/30 px-2.5 py-1 rounded-lg hover:bg-[#1A2B6B]/5 transition-colors ml-auto"
            >
              <Download className="w-3.5 h-3.5" /> Exporter le rapport
            </button>
          </div>
          <div className="space-y-2">
            {session.results.map((r, i) => (
              <SubjectResult
                key={i}
                result={r}
                verdict={session.verdicts?.[r.name]}
                onVerdict={() => {}}
                readOnly
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export report as text ─────────────────────────────────────────────────────
function exportReport(session) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('           RAPPORT DE CRIBLAGE AML/KYC — ODPIC / ANPI');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Date du criblage : ${new Date(session.screened_at).toLocaleString('fr-FR')}`);
  lines.push(`Agent responsable : ${session.screened_by}`);
  lines.push(`Nombre de sujets criblés : ${session.subjects_screened}`);
  lines.push(`Risque global : ${RISK_CONFIG[session.aggregate_risk]?.label || session.aggregate_risk}`);
  lines.push(`PPE détecté : ${session.has_pep ? 'OUI' : 'NON'}`);
  lines.push(`Médias défavorables : ${session.has_adverse_media ? 'OUI' : 'NON'}`);
  lines.push('');
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('RÉSULTATS PAR SUJET');
  lines.push('─────────────────────────────────────────────────────────');

  session.results.forEach((r, i) => {
    lines.push('');
    lines.push(`Sujet ${i + 1} : ${r.name}`);
    lines.push(`  Rôle        : ${r.role}`);
    lines.push(`  Risque      : ${RISK_CONFIG[r.overall_risk]?.label || r.overall_risk}`);
    lines.push(`  PPE         : ${PEP_CONFIG[r.pep_status]?.label || r.pep_status || '—'}`);
    lines.push(`  OFAC        : ${r.ofac_status || '—'}`);
    lines.push(`  ONU         : ${r.un_sanctions_status || '—'}`);
    lines.push(`  UE          : ${r.eu_sanctions_status || '—'}`);
    lines.push(`  Royaume-Uni : ${r.uk_sanctions_status || '—'}`);
    lines.push(`  Fenergo     : ${FENERGO_CONFIG[r.fenergo_risk_category]?.label || '—'}`);
    lines.push(`  GAFI        : ${r.fatf_jurisdiction_risk || '—'}`);
    if (r.recommended_action) lines.push(`  Action rec. : ${r.recommended_action}`);
    const verdict = session.verdicts?.[r.name];
    lines.push(`  ► DÉCISION AGENT : ${verdict === 'confirmed' ? 'CONFORME (Vrai)' : verdict === 'flagged' ? 'ALERTE CONFIRMÉE (Faux)' : 'Non renseignée'}`);
  });

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Rapport généré le : ${new Date().toLocaleString('fr-FR')}`);
  lines.push('Ce rapport est destiné à l\'équipe de conformité — usage interne.');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport_criblage_AML_${new Date(session.screened_at).toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AMLScreeningPanel({ dossier }) {
  const [screening, setScreening] = useState(false);
  const [results, setResults] = useState(null);
  const [verdicts, setVerdicts] = useState({});
  const [history, setHistory] = useState([]); // list of past sessions
  const [showHistory, setShowHistory] = useState(false);

  const stepData = dossier?.step_data || {};
  const idData = stepData.identification?.data || {};
  const partenaires = stepData.partenaires?.partners || [];
  const employes = stepData.employes?.employees || [];

  const subjects = [];
  if (idData.nom || idData.prenom) {
    subjects.push({ name: `${idData.prenom || ''} ${idData.nom || ''}`.trim(), role: 'Représentant légal' });
  }
  partenaires.forEach((p) => {
    const name = p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : p.raison_sociale || '';
    if (name) subjects.push({ name, role: `Associé / Actionnaire (${p.part_percent || '?'}%)` });
    if (p.type === 'morale' && (p.rep_nom || p.rep_prenom)) {
      subjects.push({ name: `${p.rep_prenom || ''} ${p.rep_nom || ''}`.trim(), role: `Représentant de ${p.raison_sociale || 'société'}` });
    }
  });
  employes
    .filter(e => ['directeur', 'gerant', 'manager', 'dg', 'pdg', 'ceo', 'directrice'].some(r => (e.emploi_occupe || '').toLowerCase().includes(r)))
    .slice(0, 3)
    .forEach(e => subjects.push({ name: `${e.prenom || ''} ${e.nom || ''}`.trim(), role: e.emploi_occupe || 'Employé clé' }));

  const handleScreen = async () => {
    if (subjects.length === 0) { toast.error('Aucun sujet identifié à cribler.'); return; }
    setScreening(true);
    setResults(null);
    setVerdicts({});
    try {
      const res = await apiClient.functions.invoke('amlScreening', { names: subjects, dossier_id: dossier.id });
      if (res.data?.success) {
        setResults(res.data);
        toast.success(`Criblage terminé — ${res.data.subjects_screened} sujets analysés`);
      } else {
        toast.error(res.data?.error || 'Erreur lors du criblage');
      }
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
    setScreening(false);
  };

  const handleVerdict = (name, verdict) => {
    setVerdicts(prev => ({ ...prev, [name]: verdict }));
  };

  const handleFinalizeReport = () => {
    if (!results) return;
    const session = { ...results, verdicts };
    setHistory(prev => [session, ...prev]);
    exportReport(session);
    toast.success('Rapport finalisé et ajouté à l\'historique');
    setResults(null);
    setVerdicts({});
  };

  const aggregateRisk = results?.aggregate_risk;
  const aggConfig = aggregateRisk ? RISK_CONFIG[aggregateRisk] : null;
  const allVerdictsSet = results ? results.results.every(r => verdicts[r.name]) : false;
  const pendingVerdicts = results ? results.results.filter(r => !verdicts[r.name]).length : 0;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9F9F9] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#1A2B6B]" />
          <p className="text-sm font-semibold text-[#1A1A1A]">Criblage AML/KYC Automatisé</p>
          <span className="text-[10px] text-[#9B9B9B] ml-1">OFAC · ONU · UE · PPE · Fenergo · Médias</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showHistory ? 'bg-[#1A2B6B] text-white border-[#1A2B6B]' : 'bg-white text-[#6B6B6B] border-[#E5E7EB] hover:border-[#1A2B6B] hover:text-[#1A2B6B]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique {history.length > 0 && `(${history.length})`}
          </button>
          {!showHistory && (
            <Button
              onClick={handleScreen}
              disabled={screening || subjects.length === 0}
              size="sm"
              className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-xs h-8"
            >
              {screening
                ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Criblage en cours...</>
                : <><Zap className="w-3.5 h-3.5 mr-1" /> Lancer le criblage ({subjects.length})</>
              }
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* HISTORY VIEW */}
        {showHistory && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Historique des criblages ({history.length})
              </p>
              <button onClick={() => setShowHistory(false)} className="text-xs text-[#9B9B9B] hover:text-[#1A1A1A]">
                ← Retour au criblage
              </button>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-10 text-[#9B9B9B]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun criblage finalisé pour le moment.</p>
                <p className="text-xs mt-1">Lancez un criblage et validez les décisions pour créer un rapport.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((session, i) => (
                  <HistoryItem key={i} session={session} index={history.length - 1 - i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREENING VIEW */}
        {!showHistory && (
          <>
            {/* Subjects list */}
            <div>
              <p className="text-xs font-semibold text-[#6B6B6B] mb-2">Sujets à cribler ({subjects.length})</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-[#F5F5F5] rounded-lg px-2.5 py-1.5 text-xs">
                    <div className="w-1.5 h-1.5 bg-[#1A2B6B] rounded-full" />
                    <span className="font-medium text-[#1A1A1A]">{s.name}</span>
                    <span className="text-[#9B9B9B]">— {s.role}</span>
                  </div>
                ))}
                {subjects.length === 0 && <p className="text-xs text-[#9B9B9B]">Aucun sujet identifié dans ce dossier.</p>}
              </div>
            </div>

            {/* Databases list (pre-screening only) */}
            {!results && !screening && (
              <div className="border border-dashed border-[#E5E7EB] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#6B6B6B] mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Bases de données vérifiées
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[10px] text-[#6B6B6B]">
                  {[
                    '🇺🇸 OFAC SDN List', '🌐 ONU Sanctions', '🇪🇺 UE Sanctions',
                    '🇬🇧 HM Treasury UK', '📋 World-Check / Refinitiv', '🚔 Interpol Red Notices',
                    '🏦 GAFI Juridictions à risque', '👤 PPE — Personnes Politiquement Exposées',
                    '📰 Médias défavorables', '⚖️ Fenergo Risk Assessment', '🔍 Watchlist globale', '🛡️ ACAMS Standards',
                  ].map(db => <div key={db} className="flex items-center gap-1">{db}</div>)}
                </div>
              </div>
            )}

            {/* Loading */}
            {screening && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#1A2B6B]" />
                <p className="text-sm font-medium text-[#1A1A1A]">Criblage en cours...</p>
                <p className="text-xs text-[#6B6B6B] mt-1">Consultation des bases de données OFAC, ONU, UE, PPE, Fenergo et médias</p>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-3">
                {/* Aggregate risk banner */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  aggregateRisk === 'MATCH_FOUND' ? 'bg-red-50 border-red-300' :
                  aggregateRisk === 'HIGH_RISK' ? 'bg-orange-50 border-orange-300' :
                  aggregateRisk === 'REVIEW_REQUIRED' ? 'bg-amber-50 border-amber-300' :
                  'bg-green-50 border-green-200'
                }`}>
                  {aggConfig && <aggConfig.icon className="w-5 h-5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1A1A1A]">Risque global : {aggConfig?.label || aggregateRisk}</p>
                      {results.has_pep && <Badge className="bg-red-100 text-red-700 text-[9px]">PPE détecté</Badge>}
                      {results.has_adverse_media && <Badge className="bg-orange-100 text-orange-700 text-[9px]">Médias défavorables</Badge>}
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {results.subjects_screened} sujet(s) criblé(s) · {new Date(results.screened_at).toLocaleString('fr-FR')} · par {results.screened_by}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleScreen} className="text-xs h-7 shrink-0">
                    <RefreshCw className="w-3 h-3 mr-1" /> Re-cribler
                  </Button>
                </div>

                {/* Verdict progress indicator */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                  allVerdictsSet ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  {allVerdictsSet
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 shrink-0" />
                  }
                  <p>
                    {allVerdictsSet
                      ? 'Toutes les décisions ont été saisies. Vous pouvez finaliser le rapport.'
                      : `${pendingVerdicts} décision(s) agent manquante(s) — utilisez les boutons Conforme / Alerte confirmée sur chaque sujet.`
                    }
                  </p>
                  {allVerdictsSet && (
                    <Button
                      onClick={handleFinalizeReport}
                      size="sm"
                      className="ml-auto bg-green-600 hover:bg-green-700 text-white text-xs h-7 shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> Finaliser & Exporter le rapport
                    </Button>
                  )}
                </div>

                {/* Individual results with verdicts */}
                <div className="space-y-2">
                  {results.results.map((r, i) => (
                    <SubjectResult
                      key={i}
                      result={r}
                      verdict={verdicts[r.name]}
                      onVerdict={handleVerdict}
                      readOnly={false}
                    />
                  ))}
                </div>

                {/* Finalize button also at bottom */}
                {allVerdictsSet && (
                  <Button
                    onClick={handleFinalizeReport}
                    className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-sm"
                  >
                    <FileText className="w-4 h-4 mr-2" /> Finaliser le rapport & Enregistrer dans l'historique
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}