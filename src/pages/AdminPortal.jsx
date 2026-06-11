import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search, CheckCircle2, XCircle, Eye, FileText, Users, UserSquare2,
  Building2, ArrowLeft, AlertTriangle, Clock, Download, Shield,
  PenLine, Image, ChevronRight, RefreshCw, Award, Briefcase, CreditCard, Loader2, Plus
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '@/components/onboarding/PaymentReceiptPDF.jsx';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { generateFormulairePDF, generateStatutsPDF } from '@/components/onboarding/PDFGenerator.jsx';
import ApprovalWorkflow from '@/components/admin/ApprovalWorkflow.jsx';
import ShareholderTree from '@/components/onboarding/ShareholderTree.jsx';
import AMLScreeningPanel from '@/components/admin/AMLScreeningPanel.jsx';
import ActesAdministratifsRCS from '@/components/admin/ActesAdministratifsRCS.jsx';
import AdminCreateDossier from '@/components/admin/AdminCreateDossier.jsx';

const STATUS_COLORS = {
  'En attente': 'bg-amber-100 text-amber-700 border-amber-200',
  'En cours de traitement': 'bg-blue-100 text-blue-700 border-blue-200',
  'Validé': 'bg-green-100 text-green-700 border-green-200',
  'Rejeté': 'bg-red-100 text-red-700 border-red-200',
  'Modification requise': 'bg-orange-100 text-orange-700 border-orange-200',
};

const COLOR_MAP = {
  blue: { light: 'bg-blue-50 border-blue-200', icon: 'text-blue-600' },
  purple: { light: 'bg-purple-50 border-purple-200', icon: 'text-purple-600' },
  green: { light: 'bg-green-50 border-green-200', icon: 'text-green-600' },
};

function Field({ label, value, className = '' }) {
  return (
    <div className={`p-3 bg-[#F9F9F9] rounded-lg ${className}`}>
      <p className="text-xs text-[#9B9B9B] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[#1A1A1A] break-words">{value || '—'}</p>
    </div>
  );
}

function DocImage({ url, label }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="block border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <img src={url} alt={label} className="w-full h-36 object-cover bg-gray-100"
        onError={e => { e.target.style.display = 'none'; }} />
      <div className="px-3 py-2 flex items-center gap-1.5 text-xs text-[#6B6B6B] border-t border-[#E5E7EB]">
        <Image className="w-3 h-3" />{label}
        <ChevronRight className="w-3 h-3 ml-auto" />
      </div>
    </a>
  );
}

function DocLink({ url, label }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-xl hover:bg-[#F9F9F9] transition-all text-sm">
      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
      <span className="text-[#1A1A1A]">{label}</span>
      <ChevronRight className="w-4 h-4 text-[#9B9B9B] ml-auto" />
    </a>
  );
}

const TABS = [
  { id: 'representant', label: 'Représentant', icon: UserSquare2 },
  { id: 'activite', label: 'Activité', icon: Briefcase },
  { id: 'partenaires', label: 'Partenaires', icon: Users },
  { id: 'employes', label: 'Employés', icon: UserSquare2 },
  { id: 'attestation', label: 'Attestation', icon: Shield },
  { id: 'documents', label: 'Documents', icon: FileText },
];

function UBOAdminPanel({ partner }) {
  const percent = parseFloat(partner.part_percent) || 0;
  const isUBO = percent >= 25 || partner.ubo_manual === true;
  if (!isUBO) return null;
  const isPEP = partner.pep_status === true;
  return (
    <div className={`mt-3 p-3 rounded-xl border ${isPEP ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-[#1A1A1A]">Bénéficiaire Effectif (UBO)</span>
        {isPEP && <span className="text-[10px] bg-red-200 text-red-700 rounded-full px-1.5 py-0.5 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> PEP — Diligence renforcée</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
        <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
          <p className="text-[#9B9B9B]">Part capital</p>
          <p className="font-bold text-[#1A1A1A]">{percent}%</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
          <p className="text-[#9B9B9B]">Droits de vote</p>
          <p className="font-bold text-[#1A1A1A]">{partner.voting_rights_percent || '—'}%</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
          <p className="text-[#9B9B9B]">Contrôle indirect</p>
          <p className="font-bold text-[#1A1A1A]">{partner.indirect_control === 'oui' ? `Oui — ${partner.controlling_entity_name || '?'}` : 'Non'}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
          <p className="text-[#9B9B9B]">PPE/PEP</p>
          <p className={`font-bold ${isPEP ? 'text-red-600' : 'text-green-600'}`}>{isPEP ? 'OUI ⚠' : 'Non'}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
          <p className="text-[#9B9B9B]">Sanctions</p>
          <p className={`font-bold ${partner.sanctions_clear ? 'text-green-600' : 'text-amber-600'}`}>{partner.sanctions_clear ? '✓ Déclarée conforme' : '⚠ Non déclarée'}</p>
        </div>
        <div className="p-2 bg-white rounded-lg border border-[#E5E7EB] col-span-2">
          <p className="text-[#9B9B9B]">Déclaration UBO signée</p>
          <p className={`font-bold ${partner.ubo_declaration_signed ? 'text-green-600' : 'text-red-500'}`}>{partner.ubo_declaration_signed ? '✓ Signée' : '✗ Non signée'}</p>
        </div>
      </div>
    </div>
  );
}

function DossierDetail({ dossier, user, onBack, onUpdateDossier }) {
  const [activeTab, setActiveTab] = useState('representant');
  const [comment, setComment] = useState(dossier.admin_comment || '');
  const [saving, setSaving] = useState(false);
  const [generatingLicense, setGeneratingLicense] = useState(false);
  const [licenseData, setLicenseData] = useState(null);
  const [localDossier, setLocalDossier] = useState(dossier);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const workflowComplete = ['odpic', 'dgi', 'cnss'].every(
    k => localDossier.approval_workflow?.[k]?.approved
  );

  const stepData = localDossier.step_data || {};
  const identification = stepData.identification || {};
  const idData = identification.data || {};
  const repType = identification.rep_type || 'physique';
  const notaire = identification.notaire || {};
  const activite = stepData.activite || {};
  const partenaires = stepData.partenaires?.partners || [];
  const employes = stepData.employes?.employees || [];
  const docs = stepData.documents?.docs || {};
  const attestation = stepData.attestation || {};
  const esignature = stepData.esignature || {};

  const handleAction = async (statut) => {
    setSaving(true);
    try {
      const updated = await apiClient.entities.RegistrationDossier.update(localDossier.id, {
        statut, admin_comment: comment, admin_email: user?.email,
        date_traitement: new Date().toISOString().split('T')[0]
      });
      setLocalDossier(prev => ({ ...prev, ...updated }));
      onUpdateDossier(updated);
      toast.success('Dossier mis à jour');
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const handleWorkflowSave = async (updates) => {
    const merged = { ...localDossier, ...updates };
    setLocalDossier(merged);
    await apiClient.entities.RegistrationDossier.update(localDossier.id, updates);
    onUpdateDossier(merged);
    toast.success('Progression sauvegardée');
  };

  const handleWorkflowComplete = (workflowState) => {
    const merged = { ...localDossier, approval_workflow: workflowState };
    setLocalDossier(merged);
    onUpdateDossier(merged);
  };

  const handleGenerateLicense = async () => {
    setGeneratingLicense(true);
    try {
      const response = await apiClient.functions.invoke('generateLicense', { dossier_id: localDossier.id });
      if (response.data?.success) {
        setLicenseData(response.data);
        const updated = { ...localDossier, ...response.data, statut: 'Validé' };
        setLocalDossier(updated);
        onUpdateDossier(updated);
        toast.success(`Licence générée : ${response.data.license_number}`);
        if (response.data.pdf_base64) {
          const link = document.createElement('a');
          link.href = response.data.pdf_base64;
          link.download = `licence-${response.data.license_number}.pdf`;
          link.click();
        }
      } else {
        toast.error(response.data?.error || 'Erreur de génération');
      }
    } catch (e) { toast.error('Erreur : ' + e.message); }
    setGeneratingLicense(false);
  };

  const currentLicense = licenseData || (localDossier.license_number ? localDossier : null);

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      const paiementData = stepData.paiement || {};
      await generatePaymentReceiptPDF({
        amount: localDossier.payment_amount || paiementData.totalAmount || 0,
        transactionId: paiementData.transactionId || null,
        envelopeId: localDossier.envelope_id,
        companyName: localDossier.company_name,
        formeJuridique: localDossier.forme_juridique || activite.forme_juridique || '—',
        secteur: activite.secteur_principal || '—',
        tierLabel: paiementData.tierLabel || 'Standard',
        tierDelay: paiementData.tierDelay || '—',
        applicantName: localDossier.applicant_name || '—',
        applicantEmail: localDossier.applicant_email || '—',
        patenteAmount: paiementData.patenteAmount || 0,
        odpicAmount: paiementData.odpicAmount || 0,
        statusFeesAmount: paiementData.statusFeesAmount || 0,
        tierSurcharge: paiementData.tierSurcharge || 0,
      });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-[#1A2B6B] text-white px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <div className="w-px h-5 bg-white/20" />
            <div>
              <h1 className="font-bold text-lg">{localDossier.company_name}</h1>
              <p className="text-xs text-blue-200 font-mono">{localDossier.envelope_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${STATUS_COLORS[localDossier.statut]} border text-xs px-3 py-1`}>{localDossier.statut}</Badge>
            {localDossier.payment_confirmed && (
              <Badge className="bg-green-500 text-white text-xs px-3 py-1">Paiement confirmé</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* AML Screening */}
          <AMLScreeningPanel dossier={localDossier} />

          {/* Approval Workflow */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9F9F9] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1A2B6B]" />
              <p className="text-sm font-semibold text-[#1A1A1A]">Processus de validation réglementaire</p>
              <span className="text-xs text-[#9B9B9B] ml-1">ODPIC → DGI → CNSS</span>
            </div>
            <div className="p-5">
              {workflowComplete ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">Toutes les étapes réglementaires sont validées (ODPIC, DGI, CNSS)</p>
                    <p className="text-xs text-green-600 mt-0.5">Vous pouvez procéder à la validation finale et à l'émission de la licence.</p>
                  </div>
                </div>
              ) : (
                <ApprovalWorkflow
                  dossier={localDossier}
                  onSave={handleWorkflowSave}
                  onWorkflowComplete={handleWorkflowComplete}
                />
              )}
            </div>
          </div>

          {/* Issued documents panel — shown after workflow complete */}
          {workflowComplete && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9F9F9]">
                <p className="text-sm font-semibold text-[#1A1A1A]">Documents émis par les organismes</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {['odpic', 'dgi', 'cnss'].map(sid => {
                  const wf = localDossier.approval_workflow?.[sid] || {};
                  const meta = { odpic: { label: 'ODPIC', color: 'blue' }, dgi: { label: 'DGI', color: 'purple' }, cnss: { label: 'CNSS', color: 'green' } }[sid];
                  const uploadedDocs = wf.uploaded_docs || {};
                  const cols = COLOR_MAP[meta.color];
                  return (
                    <div key={sid} className={`${cols.light} border rounded-xl p-3 space-y-2`}>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className={`w-4 h-4 ${cols.icon}`} />
                        <span className="text-xs font-bold text-[#1A1A1A]">{meta.label}</span>
                      </div>
                      {Object.entries(uploadedDocs).filter(([, url]) => url).map(([k, url]) => (
                        <a key={k} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                          <FileText className="w-3 h-3 shrink-0" />
                          {k.replace(`${sid}_`, '').replace(/_url$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </a>
                      ))}
                      {wf.comment && <p className="text-[10px] text-[#6B6B6B] italic mt-1">{wf.comment}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dossier detail tabs */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="flex border-b border-[#E5E7EB] overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all shrink-0
                    ${activeTab === id ? 'border-[#1A2B6B] text-[#1A2B6B] bg-blue-50/50' : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {id === 'partenaires' ? `${label} (${partenaires.length})` : id === 'employes' ? `${label} (${employes.length})` : label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* REPRÉSENTANT */}
              {activeTab === 'representant' && (
                <div className="space-y-4">
                  <Badge className={identification.entity_type === 'morale' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}>
                    {identification.entity_type === 'morale' ? 'Personne Morale' : 'Personne Physique'}
                  </Badge>
                  {identification.via_notaire && (
                    <Badge className="bg-amber-100 text-amber-700">Via Notaire / Mandataire</Badge>
                  )}
                  {repType === 'physique' ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Field label="Nom" value={idData.nom} />
                        <Field label="Prénom" value={idData.prenom} />
                        <Field label="NNI" value={idData.nni} />
                        <Field label="N° Identité" value={idData.numero_identite} />
                        <Field label="Date naissance" value={idData.date_naissance} />
                        <Field label="Lieu naissance" value={idData.lieu_naissance} />
                        <Field label="Nationalité" value={idData.nationalite} />
                        <Field label="Sexe" value={idData.sexe} />
                        <Field label="Profession" value={idData.profession} />
                        <Field label="Nom du père" value={idData.pere_nom} />
                        <Field label="Nom de la mère" value={idData.mere_nom} />
                        <Field label="Date émission" value={idData.date_emission} />
                        <Field label="Date expiration" value={idData.date_expiration} />
                        <Field label="Email" value={idData.email} />
                        <Field label="Téléphone" value={idData.telephone} />
                        <Field label="Adresse" value={idData.adresse} className="col-span-full" />
                        {idData.mrz_line1 && <Field label="MRZ Ligne 1" value={idData.mrz_line1} className="col-span-full font-mono" />}
                        {idData.mrz_line2 && <Field label="MRZ Ligne 2" value={idData.mrz_line2} className="col-span-full font-mono" />}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <DocImage url={identification.document_front_url} label="Pièce d'identité — Recto" />
                        <DocImage url={identification.document_back_url} label="Pièce d'identité — Verso" />
                        <DocImage url={identification.selfie_url} label="Photo biométrique" />
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nom du notaire" value={notaire.nom} />
                      <Field label="Nom commercial" value={notaire.nom_commercial} />
                      <Field label="N° RCS" value={notaire.rcs} />
                      <Field label="NIF" value={notaire.nif} />
                      <Field label="Email" value={notaire.email} />
                      <Field label="Téléphone" value={notaire.telephone} />
                      <Field label="Adresse" className="col-span-2" value={notaire.adresse} />
                    </div>
                  )}
                  {identification.biometric && (
                    <div className={`p-3 rounded-xl border text-sm ${identification.biometric.liveness ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      <strong>Vérification biométrique :</strong>{' '}
                      {identification.biometric.skipped ? 'Ignorée' : identification.biometric.liveness ? `Passée — Qualité: ${identification.biometric.quality}` : 'Non effectuée'}
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITÉ */}
              {activeTab === 'activite' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Raison sociale" value={activite.raison_sociale} />
                    <Field label="Forme juridique" value={activite.forme_juridique} />
                    <Field label="Secteur principal" value={activite.secteur_principal} />
                    <Field label="Capital social" value={activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} DJF` : '—'} />
                    <Field label="Régime fiscal" value={activite.regime_fiscal} />
                    <Field label="Nb employés prévus" value={activite.nb_employes_prevus} />
                    <Field label="1er choix nom" value={activite.commercial_names?.[0]} />
                    <Field label="2ème choix nom" value={activite.commercial_names?.[1]} />
                    <Field label="3ème choix nom" value={activite.commercial_names?.[2]} />
                  </div>
                  {activite.activite_description && (
                    <div className="p-3 bg-[#F9F9F9] rounded-lg">
                      <p className="text-xs text-[#9B9B9B] mb-1">Description de l'activité</p>
                      <p className="text-sm text-[#1A1A1A]">{activite.activite_description}</p>
                    </div>
                  )}
                  {activite.activites_secondaires?.length > 0 && (
                    <div className="p-3 bg-[#F9F9F9] rounded-lg">
                      <p className="text-xs text-[#9B9B9B] mb-2">Activités secondaires</p>
                      <div className="flex flex-wrap gap-2">
                        {activite.activites_secondaires.map((a, i) => (
                          <Badge key={i} className="bg-blue-100 text-blue-700 text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PARTENAIRES */}
              {activeTab === 'partenaires' && (
                <div className="space-y-4">
                  {/* Shareholder Tree */}
                  {partenaires.length > 0 && (
                    <ShareholderTree partners={partenaires} companyName={localDossier.company_name || 'Société'} />
                  )}
                  {partenaires.length === 0 ? (
                    <div className="text-center py-10 text-[#9B9B9B]">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun partenaire déclaré</p>
                    </div>
                  ) : partenaires.map((p, i) => (
                    <div key={i} className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={p.type === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                          {p.type === 'physique' ? 'Personne physique' : 'Personne morale'}
                        </Badge>
                        <span className="font-semibold text-sm">
                          {p.type === 'physique' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : p.raison_sociale}
                        </span>
                        <Badge className="ml-auto bg-gray-100 text-gray-700">{p.part_percent || '—'}%</Badge>
                      </div>
                      {p.type === 'physique' ? (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <Field label="NNI" value={p.nni} />
                            <Field label="N° Identité" value={p.numero_identite} />
                            <Field label="Email" value={p.email} />
                            <Field label="Téléphone" value={p.telephone} />
                            <Field label="Nationalité" value={p.nationalite} />
                            <Field label="Date naissance" value={p.date_naissance} />
                            <Field label="Apport" value={p.apport ? `${Number(p.apport).toLocaleString()} DJF` : '—'} />
                            <Field label="Adresse" value={p.adresse} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <DocImage url={p.doc_front} label="Pièce d'identité — Recto" />
                            <DocImage url={p.doc_back} label="Pièce d'identité — Verso" />
                          </div>
                          <UBOAdminPanel partner={p} />
                        </>
                      ) : (
                        <>
                          {/* Corporate identity */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <Field label="Raison sociale" value={p.raison_sociale} />
                            <Field label="Siège social" value={p.siege_social} />
                            <Field label="Pays d'immatriculation" value={p.pays_immatriculation} />
                            <Field label="RCS / RCCM" value={p.rcs} />
                            <Field label="NIF" value={p.nif} />
                            <Field label="Email" value={p.email} />
                            <Field label="Apport" value={p.apport ? `${Number(p.apport).toLocaleString()} DJF` : '—'} />
                            <Field label="Part (%)" value={p.part_percent ? `${p.part_percent}%` : '—'} />
                          </div>

                          {/* Corporate documents */}
                          <div className="space-y-1.5">
                            <DocLink url={p.registre_url} label="Registre de commerce (Kbis / extrait)" />
                            <DocLink url={p.statuts_url} label="Statuts certifiés conformes" />
                            <DocLink url={p.decision_url} label="Décision d'investir / prise de participation" />
                            <DocLink url={p.liste_dirigeants_url} label="Liste des dirigeants / organigramme de direction" />
                            <DocLink url={p.organigramme_url} label="Organigramme actionnarial" />
                          </div>

                          <UBOAdminPanel partner={p} />

                          {/* Legal representative */}
                          {(p.rep_nom || p.rep_prenom) && (
                            <div className="border border-blue-100 bg-blue-50 rounded-xl p-4 space-y-3">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Représentant légal mandaté</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Field label="Nom & prénom" value={`${p.rep_prenom || ''} ${p.rep_nom || ''}`.trim()} />
                                <Field label="N° identité" value={p.rep_numero_identite || p.rep_nni} />
                                <Field label="Nationalité" value={p.rep_nationalite} />
                                <Field label="Date naissance" value={p.rep_date_naissance} />
                                <Field label="Lieu naissance" value={p.rep_lieu_naissance} />
                                <Field label="Profession" value={p.rep_profession} />
                                <Field label="Email" value={p.rep_email} />
                                <Field label="Téléphone" value={p.rep_telephone} />
                                <Field label="Adresse" value={p.rep_adresse} className="col-span-2" />
                                <Field label="Nom du père" value={p.rep_pere_nom} />
                                <Field label="Nom de la mère" value={p.rep_mere_nom} />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <DocImage url={p.rep_doc_front} label="CIN Représentant — Recto" />
                                <DocImage url={p.rep_doc_back} label="CIN Représentant — Verso" />
                              </div>
                            </div>
                          )}

                          {/* UBO Look-through — physical owners of this corporate entity */}
                          {p.ubos_personnes_physiques?.length > 0 && (
                            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-4">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-600" />
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                                  Bénéficiaires effectifs (UBO) — Propriétaires de {p.raison_sociale || 'la société'}
                                </p>
                                <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-auto">
                                  {p.ubos_personnes_physiques.length} UBO{p.ubos_personnes_physiques.length > 1 ? 's' : ''}
                                </span>
                              </div>
                              {p.ubos_personnes_physiques.map((ubo, ui) => (
                                <div key={ui} className="bg-white border border-amber-200 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-[#1A1A1A]">
                                      {`${ubo.prenom || ''} ${ubo.nom || ''}`.trim() || `UBO #${ui + 1}`}
                                    </span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                      {ubo.part_percent || '?'}%
                                    </span>
                                    {ubo.pep_status && (
                                      <span className="text-[10px] bg-red-200 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                        <AlertTriangle className="w-2.5 h-2.5" /> PEP
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <Field label="Nom & prénom" value={`${ubo.prenom || ''} ${ubo.nom || ''}`.trim()} />
                                    <Field label="N° identité / NNI" value={ubo.numero_identite || ubo.nni} />
                                    <Field label="Nationalité" value={ubo.nationalite} />
                                    <Field label="Date naissance" value={ubo.date_naissance} />
                                    <Field label="Lieu naissance" value={ubo.lieu_naissance} />
                                    <Field label="Profession" value={ubo.profession} />
                                    <Field label="Email" value={ubo.email} />
                                    <Field label="Téléphone" value={ubo.telephone} />
                                    <Field label="Adresse" value={ubo.adresse} className="col-span-2" />
                                    <Field label="Nom du père" value={ubo.pere_nom} />
                                    <Field label="Nom de la mère" value={ubo.mere_nom} />
                                    <Field label="Droits de vote" value={ubo.voting_rights_percent ? `${ubo.voting_rights_percent}%` : '—'} />
                                    <Field label="Contrôle indirect" value={ubo.indirect_control === 'oui' ? `Oui — ${ubo.controlling_entity_name || '?'}` : 'Non'} />
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[10px]">
                                    <span className={`px-2 py-1 rounded-full font-medium ${ubo.sanctions_clear ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {ubo.sanctions_clear ? '✓ Pas de sanctions déclarées' : '⚠ Sanctions non déclarées'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full font-medium ${ubo.ubo_declaration_signed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {ubo.ubo_declaration_signed ? '✓ Déclaration UBO signée' : '✗ Déclaration UBO non signée'}
                                    </span>
                                    {ubo.pep_status && (
                                      <span className="px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">⚠ PPE/PEP — Diligence renforcée requise</span>
                                    )}
                                  </div>
                                  {(ubo.doc_front || ubo.doc_back) && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <DocImage url={ubo.doc_front} label={`UBO ${ui + 1} — CIN Recto`} />
                                      <DocImage url={ubo.doc_back} label={`UBO ${ui + 1} — CIN Verso`} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* EMPLOYÉS */}
              {activeTab === 'employes' && (
                <div className="space-y-3">
                  {employes.length === 0 ? (
                    <div className="text-center py-10 text-[#9B9B9B]">
                      <UserSquare2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun employé déclaré</p>
                    </div>
                  ) : employes.map((e, i) => (
                    <div key={i} className="border border-[#E5E7EB] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-sm">{e.prenom} {e.nom}</span>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">{e.emploi_occupe}</Badge>
                        <Badge className="ml-auto bg-blue-100 text-blue-700 text-xs">{e.type_contrat}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Field label="Type employé" value={e.type_employe} />
                        <Field label="Salaire" value={e.salaire_base ? `${Number(e.salaire_base).toLocaleString()} DJF` : '—'} />
                        <Field label="Nom mère" value={e.nom_mere} />
                        <Field label="Matricule CNSS" value={e.matricule_cnss} />
                        <Field label="Date embauche" value={e.date_embauche} />
                        <Field label="NNI" value={e.nni} />
                        <Field label="Nationalité" value={e.nationalite} />
                        <Field label="Date naissance" value={e.date_naissance} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <DocImage url={e.doc_front} label="Pièce d'identité — Recto" />
                        <DocImage url={e.doc_back} label="Pièce d'identité — Verso" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ATTESTATION & SIGNATURE */}
              {activeTab === 'attestation' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${attestation.signed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    {attestation.signed ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold text-sm">{attestation.signed ? 'Attestation signée et acceptée' : 'Attestation non signée'}</p>
                      {attestation.signed_at && <p className="text-xs text-[#6B6B6B] mt-0.5">Signée par <strong>{attestation.signed_by}</strong> le {new Date(attestation.signed_at).toLocaleString('fr-FR')}</p>}
                    </div>
                  </div>
                  {attestation.signature_data && (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-[#F9F9F9] border-b border-[#E5E7EB] flex items-center gap-2 text-xs font-medium text-[#6B6B6B]">
                        <PenLine className="w-3.5 h-3.5" /> Signature — Attestation de pouvoir
                      </div>
                      <div className="p-4 bg-white">
                        <img src={attestation.signature_data} alt="Signature attestation" className="max-h-24 object-contain" />
                      </div>
                    </div>
                  )}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${esignature.signed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    {esignature.signed ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold text-sm">{esignature.signed ? 'Documents officiels signés électroniquement' : 'Signature officielle non effectuée'}</p>
                      {esignature.envelope_id && <p className="text-xs font-mono text-[#6B6B6B] mt-0.5">Envelope ID: {esignature.envelope_id}</p>}
                    </div>
                  </div>
                  {esignature.signature_data && (
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-[#F9F9F9] border-b border-[#E5E7EB] flex items-center gap-2 text-xs font-medium text-[#6B6B6B]">
                        <Shield className="w-3.5 h-3.5" /> Signature — Documents officiels
                      </div>
                      <div className="p-4 bg-white">
                        <img src={esignature.signature_data} alt="Signature officielle" className="max-h-24 object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DocLink url={docs.statuts_signes_url || docs.statuts_pdf_url} label="Statuts signés" />
                    <DocLink url={docs.formulaire_gui_url || docs.formulaire_pdf_url} label="Formulaire GUI signé" />
                  </div>
                  {Object.entries(docs).filter(([k, v]) => v && k.endsWith('_url') && !['statuts_mode', 'formulaire_mode', 'statuts_signed', 'formulaire_signed'].includes(k)).map(([key, url]) => (
                    <DocLink key={key} url={url} label={key.replace(/_url$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                  ))}
                  <div className="flex gap-2 flex-wrap pt-2 border-t border-[#E5E7EB]">
                    <Button variant="outline" size="sm" onClick={() => generateFormulairePDF({ ...stepData, signature: esignature }, localDossier.envelope_id)} className="text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Formulaire GUI PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateStatutsPDF({ ...stepData, signature: esignature }, localDossier.envelope_id)} className="text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Statuts PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actes Administratifs RCS */}
          <ActesAdministratifsRCS
            dossier={localDossier}
            onDossierUpdated={() => onUpdateDossier(localDossier)}
          />
        </div>

        {/* Sidebar — actions */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Dossier meta */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm text-[#1A1A1A]">Informations du dossier</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-[#9B9B9B]">Demandeur</span><span className="font-medium">{localDossier.applicant_name}</span></div>
              <div className="flex justify-between"><span className="text-[#9B9B9B]">Email</span><span className="font-medium">{localDossier.applicant_email}</span></div>
              <div className="flex justify-between"><span className="text-[#9B9B9B]">Forme juridique</span><span className="font-medium">{localDossier.forme_juridique || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#9B9B9B]">Soumis le</span><span className="font-medium">{localDossier.date_soumission ? format(new Date(localDossier.date_soumission), 'dd/MM/yyyy') : '—'}</span></div>
              {localDossier.date_traitement && <div className="flex justify-between"><span className="text-[#9B9B9B]">Traité le</span><span className="font-medium">{format(new Date(localDossier.date_traitement), 'dd/MM/yyyy')}</span></div>}
              {localDossier.payment_amount && <div className="flex justify-between"><span className="text-[#9B9B9B]">Montant payé</span><span className="font-medium text-green-600">{Number(localDossier.payment_amount).toLocaleString()} DJF</span></div>}
              {localDossier.admin_email && <div className="flex justify-between"><span className="text-[#9B9B9B]">Agent traitant</span><span className="font-medium">{localDossier.admin_email}</span></div>}
            </div>
          </div>

          {/* Payment panel */}
          <div className={`rounded-xl border p-4 space-y-3 ${localDossier.payment_confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              <CreditCard className={`w-4 h-4 ${localDossier.payment_confirmed ? 'text-green-600' : 'text-amber-600'}`} />
              <h3 className="font-semibold text-sm text-[#1A1A1A]">Paiement</h3>
              <Badge className={`ml-auto text-xs ${localDossier.payment_confirmed ? 'bg-green-500 text-white' : 'bg-amber-100 text-amber-700 border border-amber-300'}`}>
                {localDossier.payment_confirmed ? '✓ Confirmé' : 'Non payé'}
              </Badge>
            </div>
            {localDossier.payment_confirmed ? (
              <>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Montant total</span>
                    <span className="font-bold text-green-700 text-sm">{Number(localDossier.payment_amount || 0).toLocaleString()} DJF</span>
                  </div>
                  {stepData.paiement?.tierLabel && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Formule</span>
                      <span className="font-medium">{stepData.paiement.tierLabel}</span>
                    </div>
                  )}
                  {stepData.paiement?.transactionId && (
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Réf. transaction</span>
                      <span className="font-mono text-[10px] text-[#1A1A1A]">{stepData.paiement.transactionId}</span>
                    </div>
                  )}
                  {stepData.paiement?.patenteAmount > 0 && (
                    <div className="pt-1 border-t border-green-200 space-y-1">
                      <p className="text-[10px] text-green-700 font-semibold mb-1">Détail des frais</p>
                      {stepData.paiement.patenteAmount > 0 && <div className="flex justify-between text-[10px]"><span className="text-[#6B6B6B]">Patente</span><span>{Number(stepData.paiement.patenteAmount).toLocaleString()} DJF</span></div>}
                      {stepData.paiement.odpicAmount > 0 && <div className="flex justify-between text-[10px]"><span className="text-[#6B6B6B]">ODPIC</span><span>{Number(stepData.paiement.odpicAmount).toLocaleString()} DJF</span></div>}
                      {stepData.paiement.statusFeesAmount > 0 && <div className="flex justify-between text-[10px]"><span className="text-[#6B6B6B]">Statuts</span><span>{Number(stepData.paiement.statusFeesAmount).toLocaleString()} DJF</span></div>}
                      {stepData.paiement.tierSurcharge > 0 && <div className="flex justify-between text-[10px]"><span className="text-[#6B6B6B]">Frais traitement</span><span>{Number(stepData.paiement.tierSurcharge).toLocaleString()} DJF</span></div>}
                    </div>
                  )}
                </div>
                <Button onClick={handleDownloadReceipt} disabled={downloadingReceipt} size="sm"
                  className="w-full bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-xs">
                  {downloadingReceipt
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Génération...</>
                    : <><Download className="w-3.5 h-3.5 mr-1.5" /> Télécharger le reçu PDF</>
                  }
                </Button>
              </>
            ) : (
              <p className="text-xs text-amber-700">Aucun paiement enregistré pour ce dossier.</p>
            )}
          </div>

          {/* Admin comment */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <Label className="text-sm font-semibold text-[#1A1A1A]">Commentaire de suivi</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Commentaire visible par le demandeur..." rows={4} className="text-sm" />
          </div>

          {/* Action buttons */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-sm text-[#1A1A1A] mb-3">Actions rapides</h3>
            <Button onClick={() => handleAction('En cours de traitement')} disabled={saving} variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 text-sm justify-start">
              <Clock className="w-4 h-4 mr-2" /> Mettre en traitement
            </Button>
            <Button onClick={() => handleAction('Modification requise')} disabled={saving} variant="outline" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 text-sm justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" /> Demander modification
            </Button>
            <Button onClick={() => handleAction('Rejeté')} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm justify-start">
              <XCircle className="w-4 h-4 mr-2" /> Rejeter le dossier
            </Button>
            {workflowComplete && (
              <Button onClick={() => handleAction('Validé')} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white text-sm justify-start">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Valider et approuver
              </Button>
            )}
            {!workflowComplete && (
              <p className="text-xs text-[#9B9B9B] text-center pt-1">Complétez les 3 étapes (ODPIC, DGI, CNSS) pour débloquer la validation finale.</p>
            )}
          </div>

          {/* License info */}
          {currentLicense && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Licence émise</p>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-green-600">N° Licence</span><span className="font-mono font-bold text-green-800">{currentLicense.license_number}</span></div>
                <div className="flex justify-between"><span className="text-green-600">NIF</span><span className="font-medium text-green-800">{currentLicense.nif}</span></div>
                <div className="flex justify-between"><span className="text-green-600">N° Registre</span><span className="font-medium text-green-800">{currentLicense.numero_registre}</span></div>
                <div className="flex justify-between"><span className="text-green-600">Émission</span><span className="font-medium">{currentLicense.license_issued_date}</span></div>
                <div className="flex justify-between"><span className="text-green-600">Expiration</span><span className="font-medium">{currentLicense.license_expiry_date}</span></div>
              </div>
              {(licenseData?.pdf_base64 || currentLicense.license_pdf_url) && (
                <a
                  href={licenseData?.pdf_base64 || currentLicense.license_pdf_url}
                  download={`licence-${currentLicense.license_number}.pdf`}
                  className="flex items-center gap-1.5 text-xs text-green-700 hover:underline font-medium mt-1">
                  <Download className="w-3 h-3" /> Télécharger la licence PDF
                </a>
              )}
            </div>
          )}

          {localDossier.admin_comment && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Dernier commentaire</p>
              <p className="text-xs text-amber-800">{localDossier.admin_comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPortal() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => apiClient.auth.me() });
  const { data: dossiers = [], isLoading, refetch } = useQuery({
    queryKey: ['registration-dossiers'],
    queryFn: () => apiClient.entities.RegistrationDossier.list('-created_date'),
  });
  const { data: freshDossier, isLoading: isLoadingDossier } = useQuery({
    queryKey: ['registration-dossier', selectedDossier?.id],
    queryFn: () => apiClient.entities.RegistrationDossier.filter({ id: selectedDossier?.id }).then(r => r[0]),
    enabled: !!selectedDossier?.id,
    staleTime: 0,
  });

  const ADMIN_ROLES = new Set(['admin', 'agent', 'agent_odpic', 'agent_dgi', 'agent_cnss']);
  if (user && !ADMIN_ROLES.has(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A]">Accès refusé</h2>
          <p className="text-[#6B6B6B] mt-2">Cette page est réservée aux agents du Guichet Unique.</p>
        </div>
      </div>
    );
  }

  if (showCreateWizard) {
    return (
      <AdminCreateDossier
        user={user}
        onBack={() => setShowCreateWizard(false)}
        onSuccess={() => {
          setShowCreateWizard(false);
          queryClient.invalidateQueries(['registration-dossiers']);
          toast.success('Dossier créé avec succès');
        }}
      />
    );
  }

  if (selectedDossier) {
    if (isLoadingDossier || !freshDossier) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1A2B6B]" />
            <p className="text-sm text-[#6B6B6B]">Chargement du dossier...</p>
          </div>
        </div>
      );
    }
    return (
      <DossierDetail
        dossier={freshDossier}
        user={user}
        onBack={() => setSelectedDossier(null)}
        onUpdateDossier={(updated) => {
          queryClient.invalidateQueries(['registration-dossiers']);
          queryClient.invalidateQueries(['registration-dossier', selectedDossier.id]);
        }}
      />
    );
  }

  const filtered = dossiers.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.company_name?.toLowerCase().includes(q) || d.applicant_name?.toLowerCase().includes(q) || d.envelope_id?.toLowerCase().includes(q) || d.applicant_email?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || d.statut === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total', count: dossiers.length, color: 'bg-gray-100 text-gray-700', key: '' },
    { label: 'En attente', count: dossiers.filter(d => d.statut === 'En attente').length, color: 'bg-amber-100 text-amber-700', key: 'En attente' },
    { label: 'En cours', count: dossiers.filter(d => d.statut === 'En cours de traitement').length, color: 'bg-blue-100 text-blue-700', key: 'En cours de traitement' },
    { label: 'Validés', count: dossiers.filter(d => d.statut === 'Validé').length, color: 'bg-green-100 text-green-700', key: 'Validé' },
    { label: 'Rejetés', count: dossiers.filter(d => d.statut === 'Rejeté').length, color: 'bg-red-100 text-red-700', key: 'Rejeté' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-[#1A2B6B] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <h1 className="font-bold text-lg">Portail Agents — Guichet Unique ANPI</h1>
              <p className="text-xs text-blue-200">Gestion des dossiers d'enregistrement d'entreprises</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Rafraîchir">
              <RefreshCw className="w-4 h-4 text-blue-200" />
            </button>
            <Button
              onClick={() => setShowCreateWizard(true)}
              size="sm"
              className="bg-white text-[#1A2B6B] hover:bg-blue-50 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" /> Créer un dossier
            </Button>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map(s => (
            <button key={s.label} onClick={() => setFilterStatus(s.key)}
              className={`${s.color} rounded-xl p-4 text-center transition-all hover:opacity-80 ${filterStatus === s.key ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Workflow Analytics */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9F9F9] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1A2B6B]" />
            <p className="text-sm font-semibold text-[#1A1A1A]">Suivi du workflow d'approbation</p>
            <span className="text-xs text-[#9B9B9B] ml-1">ODPIC → DGI → CNSS</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'odpic', label: 'ODPIC', colors: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-600' } },
              { key: 'dgi',   label: 'DGI',   colors: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-600' } },
              { key: 'cnss',  label: 'CNSS',  colors: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-600' } },
            ].map(({ key, label, colors }) => {
              const valide  = dossiers.filter(d => d.approval_workflow?.[key]?.approved === true).length;
              const rejete  = dossiers.filter(d => d.approval_workflow?.[key]?.rejected === true).length;
              const enAttente = dossiers.length - valide - rejete;
              return (
                <div key={key} className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-7 h-7 rounded-full ${colors.badge} text-white flex items-center justify-center text-xs font-bold`}>
                      {label[0]}
                    </span>
                    <span className="font-semibold text-sm text-[#1A1A1A]">{label}</span>
                    <span className="ml-auto text-xs text-[#9B9B9B]">{dossiers.length} total</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-[#6B6B6B]">En attente</span>
                      </div>
                      <span className="text-sm font-bold text-amber-600">{enAttente}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs text-[#6B6B6B]">Validé</span>
                      </div>
                      <span className="text-sm font-bold text-green-600">{valide}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-200">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs text-[#6B6B6B]">Rejeté</span>
                      </div>
                      <span className="text-sm font-bold text-red-600">{rejete}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden flex">
                    {valide > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${(valide / dossiers.length) * 100}%` }} />}
                    {rejete > 0 && <div className="bg-red-400 h-full transition-all" style={{ width: `${(rejete / dossiers.length) * 100}%` }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, email, envelope ID..." className="pl-9" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-white">
            <option value="">Tous les statuts</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9F9F9] border-b border-[#E5E7EB]">
                <tr>
                  {['Envelope ID', 'Entreprise', 'Demandeur', 'Email', 'Forme juridique', 'Soumission', 'Workflow', 'Statut', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B6B6B] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-[#9B9B9B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
                    Chargement des dossiers...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-[#9B9B9B]">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun dossier trouvé
                  </td></tr>
                ) : filtered.map(d => {
                  const wf = d.approval_workflow || {};
                  const stepsOk = ['odpic', 'dgi', 'cnss'].filter(k => wf[k]?.approved).length;
                  return (
                    <tr key={d.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA] cursor-pointer" onClick={() => setSelectedDossier(d)}>
                      <td className="px-4 py-3 font-mono text-xs text-[#1A2B6B]">{d.envelope_id?.substring(0, 10)}...</td>
                      <td className="px-4 py-3 font-semibold text-[#1A1A1A] max-w-[160px] truncate">{d.company_name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{d.applicant_name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B] text-xs">{d.applicant_email}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{d.forme_juridique || '—'}</td>
                      <td className="px-4 py-3 text-[#6B6B6B] whitespace-nowrap">{d.date_soumission ? format(new Date(d.date_soumission), 'dd/MM/yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {['odpic', 'dgi', 'cnss'].map(k => (
                            <span key={k} title={k.toUpperCase()} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                              ${wf[k]?.approved ? 'bg-green-500 text-white' : 'bg-[#E5E7EB] text-[#9B9B9B]'}`}>
                              {k[0].toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${STATUS_COLORS[d.statut] || 'bg-gray-100 text-gray-700'} border text-xs`}>{d.statut}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); setSelectedDossier(d); }}>
                          <Eye className="w-3 h-3 mr-1" /> Voir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-[#F0F0F0] text-xs text-[#9B9B9B]">
              {filtered.length} dossier{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}