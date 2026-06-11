import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, FileText, FilePen, Plus, Clock, CheckCircle2,
  AlertTriangle, XCircle, Download, Upload, ExternalLink,
  Loader2, ChevronRight, History, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateFormulairePDF, generateStatutsPDF } from '../components/onboarding/PDFGenerator.jsx';
import ClientActeModificatifWizard from '@/components/client/ClientActeModificatifWizard';

const STATUS_MAP = {
  'En attente':            { color: 'bg-amber-100 text-amber-700',  icon: Clock,          label: 'En attente' },
  'En cours de traitement':{ color: 'bg-blue-100 text-blue-700',    icon: Clock,          label: 'En cours' },
  'Validé':                { color: 'bg-green-100 text-green-700',  icon: CheckCircle2,   label: 'Validé' },
  'Rejeté':                { color: 'bg-red-100 text-red-700',      icon: XCircle,        label: 'Rejeté' },
  'Modification requise':  { color: 'bg-orange-100 text-orange-700',icon: AlertTriangle,  label: 'Modification requise' },
};

const MOD_STATUS = {
  "En cours d'étude": 'bg-amber-100 text-amber-700',
  'Approuvé':         'bg-green-100 text-green-700',
  'Rejeté':           'bg-red-100 text-red-700',
};

// ─── Progress tracker ─────────────────────────────────────────────────────────
function ProgressTracker({ statut }) {
  const steps = ['En attente', 'En cours de traitement', 'Validé'];
  const currentIdx = steps.indexOf(statut);
  const progress = currentIdx >= 0 ? currentIdx : (statut === 'Rejeté' || statut === 'Modification requise') ? -1 : 0;
  if (progress < 0) return null;
  return (
    <div className="flex items-center justify-between relative py-2">
      <div className="absolute top-6 left-4 right-4 h-0.5 bg-[#E5E7EB] z-0" />
      <div className="absolute top-6 left-4 h-0.5 bg-[#1A2B6B] z-0 transition-all"
        style={{ width: `${Math.min((progress / 2) * 92, 92)}%` }} />
      {[{ label: 'Soumis', step: 0 }, { label: 'En examen', step: 1 }, { label: 'Validé', step: 2 }].map(({ label, step }) => (
        <div key={step} className="flex flex-col items-center z-10 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
            progress > step ? 'bg-[#1A2B6B] text-white border-[#1A2B6B]'
            : progress === step ? 'bg-white text-[#1A2B6B] border-[#1A2B6B]'
            : 'bg-white text-[#9B9B9B] border-[#E5E7EB]'
          }`}>
            {progress > step ? <CheckCircle2 className="w-4 h-4" /> : step + 1}
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Official docs section ────────────────────────────────────────────────────
function OfficialDocs({ dossier }) {
  const wf = dossier.approval_workflow || {};
  const docs = [
    { agency: 'ODPIC', color: 'blue',   key: 'odpic_recepisse_url',         label: 'Récépissé d\'immatriculation',   url: wf.odpic?.uploaded_docs?.odpic_recepisse_url },
    { agency: 'ODPIC', color: 'blue',   key: 'odpic_certificat_negatif_url', label: 'Certificat Négatif (CN1)',       url: wf.odpic?.uploaded_docs?.odpic_certificat_negatif_url },
    { agency: 'DGI',   color: 'purple', key: 'dgi_nif_url',                  label: 'Attestation NIF',               url: wf.dgi?.uploaded_docs?.dgi_nif_url },
    { agency: 'DGI',   color: 'purple', key: 'dgi_patente_url',              label: 'Patente Fiscale',               url: wf.dgi?.uploaded_docs?.dgi_patente_url },
    { agency: 'CNSS',  color: 'green',  key: 'cnss_affiliation_url',         label: 'Certificat d\'Affiliation CNSS',url: wf.cnss?.uploaded_docs?.cnss_affiliation_url },
    { agency: 'CNSS',  color: 'green',  key: 'cnss_immatriculation_url',     label: 'Immatriculation CNSS',          url: wf.cnss?.uploaded_docs?.cnss_immatriculation_url },
  ];
  const available = docs.filter(d => d.url);
  if (available.length === 0) return null;

  const colors = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'text-purple-700' },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'text-green-700' },
  };

  return (
    <div className="border-t border-[#E5E7EB] pt-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <p className="text-sm font-semibold text-[#1A1A1A]">Documents officiels délivrés</p>
        <span className="text-xs text-[#9B9B9B]">({available.length}/6)</span>
      </div>
      {['ODPIC', 'DGI', 'CNSS'].map(agency => {
        const agencyDocs = available.filter(d => d.agency === agency);
        if (!agencyDocs.length) return null;
        const c = colors[agencyDocs[0].color];
        return (
          <div key={agency} className={`${c.bg} ${c.border} border rounded-xl p-3 mb-2`}>
            <p className={`text-xs font-bold mb-2 ${c.badge}`}>{agency}</p>
            <div className="space-y-1.5">
              {agencyDocs.map(doc => (
                <a key={doc.key} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-white border border-[#E5E7EB] rounded-lg hover:shadow-sm transition-all group">
                  <FileText className="w-3.5 h-3.5 text-[#6B6B6B] shrink-0" />
                  <span className="text-xs text-[#1A1A1A] flex-1">{doc.label}</span>
                  <div className="flex items-center gap-1">
                    <Download className="w-3 h-3 text-[#9B9B9B] group-hover:text-blue-500" />
                    <ExternalLink className="w-3 h-3 text-[#9B9B9B] group-hover:text-blue-500" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dossier card ─────────────────────────────────────────────────────────────
function DossierCard({ dossier, user, onModify, onUpload, uploadingDoc }) {
  const [showMods, setShowMods] = useState(false);
  const statusInfo = STATUS_MAP[dossier.statut] || STATUS_MAP['En attente'];
  const StatusIcon = statusInfo.icon;
  const stepData = dossier.step_data || {};

  const { data: modifications = [] } = useQuery({
    queryKey: ['my-modifications', dossier.id],
    queryFn: () => apiClient.entities.ModificationDossier.filter({ registration_dossier_id: dossier.id }, '-created_date'),
    enabled: showMods,
  });

  return (
    <Card className="border border-[#E5E7EB] overflow-hidden">
      {/* Header */}
      <div className="bg-[#1A2B6B] text-white px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">
              {dossier.company_name?.[0] || 'C'}
            </div>
            <div>
              <p className="font-bold text-base leading-tight">{dossier.company_name}</p>
              <p className="text-xs text-blue-200 font-mono mt-0.5">{dossier.envelope_id?.substring(0, 16)}…</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusInfo.color}>{dossier.statut}</Badge>
            {dossier.statut === 'Validé' && (
              <Button size="sm" onClick={() => onModify(dossier)}
                className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs h-7">
                <FilePen className="w-3 h-3 mr-1" /> Modifier
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Progress */}
        <ProgressTracker statut={dossier.statut} />

        {/* Status message */}
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${
          dossier.statut === 'Validé' ? 'bg-green-50 border-green-200' :
          dossier.statut === 'Rejeté' ? 'bg-red-50 border-red-200' :
          dossier.statut === 'Modification requise' ? 'bg-orange-50 border-orange-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">{statusInfo.label === 'Validé'
            ? 'Félicitations ! Votre dossier a été validé.'
            : statusInfo.label === 'Rejeté'
            ? 'Votre dossier a été rejeté. Consultez le commentaire ci-dessous.'
            : statusInfo.label === 'Modification requise'
            ? 'Des modifications sont requises. Consultez le commentaire et joignez les documents demandés.'
            : statusInfo.label === 'En cours'
            ? 'Un agent du Guichet Unique examine votre dossier.'
            : 'Votre dossier a été soumis et est en attente d\'examen.'
          }</p>
        </div>

        {/* Admin comment */}
        {dossier.admin_comment && (
          <div className="p-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl">
            <p className="text-xs font-semibold text-[#6B6B6B] mb-1">Message de l'agent ANPI</p>
            <p className="text-sm text-[#1A1A1A]">{dossier.admin_comment}</p>
          </div>
        )}

        {/* Licence info */}
        {dossier.license_number && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-[#9B9B9B]">N° Licence</p><p className="font-bold text-green-700">{dossier.license_number}</p></div>
            {dossier.nif && <div><p className="text-[#9B9B9B]">NIF</p><p className="font-bold text-[#1A1A1A]">{dossier.nif}</p></div>}
            {dossier.numero_registre && <div><p className="text-[#9B9B9B]">N° Registre</p><p className="font-bold text-[#1A1A1A]">{dossier.numero_registre}</p></div>}
            {dossier.license_expiry_date && <div><p className="text-[#9B9B9B]">Expiration</p><p className="font-semibold text-[#1A1A1A]">{format(new Date(dossier.license_expiry_date), 'dd/MM/yyyy')}</p></div>}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Soumis le</p><p className="font-medium">{dossier.date_soumission ? format(new Date(dossier.date_soumission), 'dd/MM/yyyy') : '—'}</p></div>
          <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Forme</p><p className="font-medium">{dossier.forme_juridique || '—'}</p></div>
          <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Paiement</p><p className={`font-medium ${dossier.payment_confirmed ? 'text-green-600' : 'text-amber-600'}`}>{dossier.payment_confirmed ? '✓ Confirmé' : 'En attente'}</p></div>
        </div>

        {/* Downloads */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => generateFormulairePDF(stepData, dossier.envelope_id)} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Formulaire GUI
          </Button>
          <Button variant="outline" size="sm" onClick={() => generateStatutsPDF(stepData, dossier.envelope_id)} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Statuts
          </Button>
          {dossier.license_pdf_url && (
            <a href={dossier.license_pdf_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs text-green-700 border-green-300">
                <Download className="w-3.5 h-3.5 mr-1" /> Licence PDF
              </Button>
            </a>
          )}
        </div>

        {/* Official docs from agencies */}
        <OfficialDocs dossier={dossier} />

        {/* Supplementary docs upload */}
        {(dossier.statut === 'Modification requise' || dossier.statut === 'Rejeté') && (
          <div className="border-t border-[#E5E7EB] pt-4">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Documents complémentaires</p>
            {(dossier.docs_supplementaires || []).map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-[#F9F9F9] rounded-lg mb-2">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex-1">{d.nom}</a>
                <span className="text-xs text-[#9B9B9B]">{d.date}</span>
              </div>
            ))}
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all">
              {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
              <span className="text-sm text-[#6B6B6B]">{uploadingDoc ? 'Téléchargement...' : 'Ajouter un document complémentaire'}</span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => e.target.files[0] && onUpload(dossier.id, dossier.docs_supplementaires, e.target.files[0])}
                disabled={uploadingDoc} />
            </label>
          </div>
        )}

        {/* Modifications history toggle */}
        <div className="border-t border-[#E5E7EB] pt-3">
          <button onClick={() => setShowMods(p => !p)}
            className="flex items-center gap-2 text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors w-full">
            <History className="w-3.5 h-3.5" />
            <span>Actes modificatifs soumis</span>
            <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${showMods ? 'rotate-90' : ''}`} />
          </button>
          {showMods && (
            <div className="mt-3 space-y-2">
              {modifications.length === 0 ? (
                <p className="text-xs text-[#9B9B9B] text-center py-3">Aucun acte modificatif soumis</p>
              ) : modifications.map(mod => (
                <div key={mod.id} className="p-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl">
                  <div className="flex items-center justify-between flex-wrap gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-[#1A1A1A]">{mod.type_acte}</span>
                    <Badge className={`${MOD_STATUS[mod.statut] || 'bg-gray-100 text-gray-700'} text-[10px]`}>{mod.statut}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#9B9B9B]">
                    <span>Réf. {mod.recepisse_number}</span>
                    <span>•</span>
                    <span>{mod.date_soumission ? format(new Date(mod.date_soumission), 'dd/MM/yyyy') : '—'}</span>
                    {mod.montant_redevance > 0 && <><span>•</span><span>{mod.montant_redevance.toLocaleString()} DJF</span></>}
                  </div>
                  {mod.admin_comment && <p className="text-[10px] text-red-500 mt-1 italic">Motif : {mod.admin_comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EntrepreneurPortal() {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [modifyingDossier, setModifyingDossier] = useState(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.auth.me(),
  });

  const { data: dossiers = [], isLoading, refetch } = useQuery({
    queryKey: ['my-dossiers', user?.email],
    queryFn: () => apiClient.entities.RegistrationDossier.filter(
      { applicant_email: user.email },
      '-created_date'
    ),
    enabled: !!user?.email,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.RegistrationDossier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-dossiers']);
      toast.success('Document ajouté');
    },
  });

  const handleUpload = async (dossierId, currentDocs, file) => {
    setUploadingDoc(true);
    const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
    const newDocs = [...(currentDocs || []), { nom: file.name, url: file_url, date: new Date().toISOString().split('T')[0] }];
    updateMutation.mutate({ id: dossierId, data: { docs_supplementaires: newDocs } });
    setUploadingDoc(false);
  };

  if (loadingUser || isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1A2B6B]" />
    </div>
  );

  return (
    <>
      {modifyingDossier && (
        <ClientActeModificatifWizard
          dossier={modifyingDossier}
          user={user}
          onClose={() => setModifyingDossier(null)}
          onSubmitted={() => {
            setModifyingDossier(null);
            queryClient.invalidateQueries(['my-dossiers']);
            toast.success('Demande de modification soumise — un agent ANPI va l\'examiner');
          }}
        />
      )}

      <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Mon Espace Entreprise</h1>
              <p className="text-sm text-[#6B6B6B] mt-1">
                {user?.full_name && <span className="font-medium">{user.full_name} · </span>}
                {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Actualiser
              </Button>
              <Button
                className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white shrink-0 text-sm"
                onClick={() => window.location.href = '/onboarding'}
              >
                <Plus className="w-4 h-4 mr-2" /> Créer une entreprise
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          {dossiers.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Dossiers soumis', value: dossiers.length, color: 'bg-[#1A2B6B]/5 border-[#1A2B6B]/20' },
                { label: 'Validés', value: dossiers.filter(d => d.statut === 'Validé').length, color: 'bg-green-50 border-green-200' },
                { label: 'En cours', value: dossiers.filter(d => d.statut !== 'Validé' && d.statut !== 'Rejeté').length, color: 'bg-amber-50 border-amber-200' },
              ].map(s => (
                <div key={s.label} className={`${s.color} border rounded-xl p-3 text-center`}>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{s.value}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Dossiers */}
          {dossiers.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-14 h-14 text-[#D1D5DB] mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#1A1A1A] mb-1">Aucun dossier soumis</p>
              <p className="text-[#6B6B6B] text-sm mb-6">Créez votre première entreprise pour démarrer le processus d'enregistrement.</p>
              <Button className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white" onClick={() => window.location.href = '/onboarding'}>
                <Plus className="w-4 h-4 mr-2" /> Créer une entreprise
              </Button>
            </div>
          ) : (
            dossiers.map(dossier => (
              <DossierCard
                key={dossier.id}
                dossier={dossier}
                user={user}
                onModify={setModifyingDossier}
                onUpload={handleUpload}
                uploadingDoc={uploadingDoc}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}