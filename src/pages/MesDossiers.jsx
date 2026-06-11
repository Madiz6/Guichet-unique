import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, CheckCircle2, Clock, AlertTriangle, XCircle, FileText, Loader2, Download, Plus, ExternalLink, FilePen } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateFormulairePDF, generateStatutsPDF } from '../components/onboarding/PDFGenerator.jsx';
import ClientActeModificatifWizard from '@/components/client/ClientActeModificatifWizard';

const STATUS_MAP = {
  'En attente': { color: 'bg-amber-100 text-amber-700', icon: Clock, desc: 'Votre dossier a été soumis et est en attente d\'examen.' },
  'En cours de traitement': { color: 'bg-blue-100 text-blue-700', icon: Clock, desc: 'Un agent du Guichet Unique examine votre dossier.' },
  'Validé': { color: 'bg-green-100 text-green-700', icon: CheckCircle2, desc: 'Félicitations ! Votre dossier a été validé.' },
  'Rejeté': { color: 'bg-red-100 text-red-700', icon: XCircle, desc: 'Votre dossier a été rejeté. Consultez le commentaire ci-dessous.' },
  'Modification requise': { color: 'bg-orange-100 text-orange-700', icon: AlertTriangle, desc: 'Des modifications sont requises. Veuillez consulter le commentaire et joindre les documents demandés.' },
};

export default function MesDossiers() {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [modifyingDossier, setModifyingDossier] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => apiClient.auth.me() });
  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['my-dossiers', user?.email],
    queryFn: () => apiClient.entities.RegistrationDossier.filter({ applicant_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.RegistrationDossier.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['my-dossiers']); toast.success('Document ajouté'); },
  });

  const handleUploadSupplementaire = async (dossierId, currentDocs, file) => {
    setUploadingDoc(true);
    const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
    const newDocs = [...(currentDocs || []), { nom: file.name, url: file_url, date: new Date().toISOString().split('T')[0] }];
    updateMutation.mutate({ id: dossierId, data: { docs_supplementaires: newDocs } });
    setUploadingDoc(false);
  };

  const getStepProgress = (statut) => {
    const steps = ['En attente', 'En cours de traitement', 'Validé'];
    const idx = steps.indexOf(statut);
    return idx >= 0 ? idx + 1 : (statut === 'Rejeté' || statut === 'Modification requise') ? -1 : 0;
  };

  if (modifyingDossier) return (
    <ClientActeModificatifWizard
      dossier={modifyingDossier}
      user={user}
      onClose={() => setModifyingDossier(null)}
      onSubmitted={() => {
        setModifyingDossier(null);
        toast.success('Demande de modification soumise — un agent ANPI va l\'examiner');
      }}
    />
  );

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1A2B6B]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Mes Dossiers</h1>
            <p className="text-sm text-[#6B6B6B] mt-1">Suivez l'état d'avancement de vos enregistrements d'entreprise</p>
          </div>
          <Button
            className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white shrink-0"
            onClick={() => window.location.href = '/onboarding'}
          >
            <Plus className="w-4 h-4 mr-2" /> Créer une entreprise
          </Button>
        </div>

        {dossiers.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
            <p className="text-[#6B6B6B]">Aucun dossier soumis pour l'instant.</p>
            <Button className="mt-4 bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white" onClick={() => window.location.href = '/onboarding'}>
              <Plus className="w-4 h-4 mr-2" /> Créer une entreprise
            </Button>
          </div>
        ) : (
          dossiers.map(dossier => {
            const statusInfo = STATUS_MAP[dossier.statut] || STATUS_MAP['En attente'];
            const StatusIcon = statusInfo.icon;
            const progress = getStepProgress(dossier.statut);
            const stepData = dossier.step_data || {};

            return (
              <Card key={dossier.id} className="border border-[#E5E7EB] overflow-hidden">
                {/* Header */}
                <div className="bg-[#1A2B6B] text-white px-5 py-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-base">{dossier.company_name}</p>
                      <p className="text-xs text-blue-200 mt-0.5 font-mono">Envelope ID: {dossier.envelope_id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusInfo.color}>{dossier.statut}</Badge>
                      {dossier.statut === 'Validé' && (
                        <Button size="sm" onClick={() => setModifyingDossier(dossier)}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs h-7">
                          <FilePen className="w-3 h-3 mr-1" /> Modifier
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-5 space-y-5">
                  {/* Progress tracker */}
                  {progress > 0 && (
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#E5E7EB] z-0" />
                      <div className="absolute top-4 left-0 h-0.5 bg-[#1A2B6B] z-0" style={{ width: `${Math.min((progress - 1) / 2 * 100, 100)}%` }} />
                      {[{ label: 'Soumis', step: 1 }, { label: 'En examen', step: 2 }, { label: 'Validé', step: 3 }].map(({ label, step }) => (
                        <div key={step} className="flex flex-col items-center z-10 w-1/3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${progress >= step ? 'bg-[#1A2B6B] text-white border-[#1A2B6B]' : 'bg-white text-[#9B9B9B] border-[#E5E7EB]'}`}>
                            {progress > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                          </div>
                          <p className="text-xs text-[#6B6B6B] mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status message */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl border ${dossier.statut === 'Validé' ? 'bg-green-50 border-green-200' : dossier.statut === 'Rejeté' ? 'bg-red-50 border-red-200' : dossier.statut === 'Modification requise' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                    <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-sm">{statusInfo.desc}</p>
                  </div>

                  {/* Admin comment */}
                  {dossier.admin_comment && (
                    <div className="p-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl">
                      <p className="text-xs font-semibold text-[#6B6B6B] mb-1">Message de l'agent</p>
                      <p className="text-sm text-[#1A1A1A]">{dossier.admin_comment}</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Soumis le</p><p className="font-medium">{dossier.date_soumission ? format(new Date(dossier.date_soumission), 'dd/MM/yyyy') : '—'}</p></div>
                    <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Forme</p><p className="font-medium">{dossier.forme_juridique || '—'}</p></div>
                    <div className="p-2 bg-[#F9F9F9] rounded-lg"><p className="text-[#9B9B9B]">Paiement</p><p className="font-medium">{dossier.payment_confirmed ? '✓ Confirmé' : 'En attente'}</p></div>
                  </div>

                  {/* Downloads - Generated docs */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateFormulairePDF(stepData, dossier.envelope_id)} className="text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Formulaire GUI
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateStatutsPDF(stepData, dossier.envelope_id)} className="text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Statuts
                    </Button>
                  </div>

                  {/* Official documents from ODPIC, DGI, CNSS */}
                  {(() => {
                    const wf = dossier.approval_workflow || {};
                    const officialDocs = [
                      { agency: 'ODPIC', color: 'blue',   key: 'odpic_recepisse_url',          label: 'Récépissé d\'immatriculation',       url: wf.odpic?.uploaded_docs?.odpic_recepisse_url },
                      { agency: 'ODPIC', color: 'blue',   key: 'odpic_certificat_negatif_url',  label: 'Certificat Négatif (CN1)',            url: wf.odpic?.uploaded_docs?.odpic_certificat_negatif_url },
                      { agency: 'DGI',   color: 'purple', key: 'dgi_nif_url',                   label: 'Attestation NIF',                    url: wf.dgi?.uploaded_docs?.dgi_nif_url },
                      { agency: 'DGI',   color: 'purple', key: 'dgi_patente_url',               label: 'Patente Fiscale',                    url: wf.dgi?.uploaded_docs?.dgi_patente_url },
                      { agency: 'CNSS',  color: 'green',  key: 'cnss_affiliation_url',          label: 'Certificat d\'Affiliation CNSS',     url: wf.cnss?.uploaded_docs?.cnss_affiliation_url },
                      { agency: 'CNSS',  color: 'green',  key: 'cnss_immatriculation_url',      label: 'Immatriculation CNSS',               url: wf.cnss?.uploaded_docs?.cnss_immatriculation_url },
                    ];
                    const available = officialDocs.filter(d => d.url);
                    if (available.length === 0) return null;

                    const agencyColors = {
                      blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     icon: 'text-blue-600' },
                      purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-600' },
                      green:  { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',   icon: 'text-green-600' },
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
                          if (agencyDocs.length === 0) return null;
                          const color = agencyDocs[0].color;
                          const c = agencyColors[color];
                          return (
                            <div key={agency} className={`${c.bg} ${c.border} border rounded-xl p-3 mb-2`}>
                              <p className={`text-xs font-bold mb-2 ${c.icon}`}>{agency}</p>
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
                  })()}

                  {/* Supplementary docs */}
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
                          onChange={e => e.target.files[0] && handleUploadSupplementaire(dossier.id, dossier.docs_supplementaires, e.target.files[0])}
                          disabled={uploadingDoc} />
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}