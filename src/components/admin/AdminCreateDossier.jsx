import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, FileText, Briefcase, Users, UserSquare2, FolderOpen,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, ArrowLeft, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import IdentificationStep from '@/components/onboarding/IdentificationStep.jsx';
import AttestationPouvoirStep from '@/components/onboarding/AttestationPouvoirStep.jsx';
import DispositionsGeneralesStep from '@/components/onboarding/DispositionsGeneralesStep.jsx';
import DeclarationActiviteStep from '@/components/onboarding/DeclarationActiviteStep.jsx';
import DeclarationPartenairesStep from '@/components/onboarding/DeclarationPartenairesStep.jsx';
import DeclarationEmployesStep from '@/components/onboarding/DeclarationEmployesStep.jsx';
import DocumentsStep from '@/components/onboarding/DocumentsStep.jsx';
import ESignatureStep from '@/components/onboarding/ESignatureStep.jsx';

const STEPS = [
  { id: 'identification', number: 1, title: 'Identification',  subtitle: 'Représentant légal',        icon: Shield },
  { id: 'dispositions',  number: 2, title: 'Dispositions',     subtitle: 'Clauses générales',          icon: FileText },
  { id: 'activite',      number: 3, title: 'Activité',         subtitle: 'Nature & juridique',         icon: Briefcase },
  { id: 'partenaires',   number: 4, title: 'Partenaires',      subtitle: 'Associés & actionnaires',    icon: Users },
  { id: 'employes',      number: 5, title: 'Employés',         subtitle: 'Personnel initial',          icon: UserSquare2 },
  { id: 'attestation',   number: 6, title: 'Attestation',      subtitle: 'Pouvoir & habilitation',     icon: Shield },
  { id: 'documents',     number: 7, title: 'Documents',        subtitle: 'Pièces justificatives',      icon: FolderOpen },
  { id: 'esignature',    number: 8, title: 'Signature',        subtitle: 'Signature électronique',     icon: Shield },
];

export default function AdminCreateDossier({ user, onBack, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const step = STEPS[currentStep];

  const updateStep = (data) => {
    setStepData(prev => ({ ...prev, [step.id]: data }));
  };

  const validateCurrentStep = () => {
    const data = stepData[step.id];
    if (step.id === 'identification') {
      if (!data?.entity_type || data?.via_notaire === null || data?.via_notaire === undefined) return false;
      if (data.via_notaire) return !!(data?.notaire?.nom && data?.notaire?.rcs);
      return !!(data?.document_url && data?.data?.nom);
    }
    if (step.id === 'attestation') return !!(data?.signed && data?.accepted);
    if (step.id === 'dispositions') return !!(data?.all_accepted);
    if (step.id === 'activite') return !!(data?.secteur_principal && data?.activite_description && data?.forme_juridique);
    if (step.id === 'documents') {
      const d = data?.docs || {};
      const statutsOk = d.statuts_mode === 'online' ? !!(d.statuts_signed) : !!(d.statuts_signes_url);
      const formulaireOk = d.formulaire_mode === 'online' ? !!(d.formulaire_signed) : !!(d.formulaire_gui_url);
      return statutsOk && formulaireOk;
    }
    if (step.id === 'esignature') return !!(data?.signed && data?.signature_data);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('Veuillez compléter toutes les informations requises.');
      return;
    }
    const next = new Set([...completedSteps, currentStep]);
    setCompletedSteps(next);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else onBack?.();
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error('Veuillez compléter toutes les informations requises.');
      return;
    }
    setSaving(true);
    try {
      const idData = stepData.identification?.data || {};
      const activiteData = stepData.activite || {};
      const docsData = stepData.documents?.docs || {};
      const envelopeId = stepData.esignature?.envelope_id || `ADM-ENV-${Date.now()}`;
      const companyName = activiteData.commercial_names?.[0] || activiteData.raison_sociale || 'Entreprise';
      const applicantName = `${idData.prenom || ''} ${idData.nom || ''}`.trim() || user?.full_name || 'Admin';

      const company = await base44.entities.Company.create({
        nom_entreprise: companyName,
        nif: docsData.nif || '',
        numero_affiliation: '',
        raison_sociale: activiteData.raison_sociale || '',
        adresse: idData.adresse || '',
        activite: activiteData.secteur_principal || '',
        sous_activite: activiteData.activites_secondaires?.join(', ') || '',
        capital_social: parseFloat(activiteData.capital_social) || 0,
        type_entreprise: activiteData.forme_juridique || 'Company',
        email: idData.email || '',
        telephone: idData.telephone || '',
        statut_societe_url: docsData.statuts_signes_url || '',
      });

      await base44.entities.RegistrationDossier.create({
        company_id: company.id,
        envelope_id: envelopeId,
        applicant_email: idData.email || user?.email || '',
        applicant_name: applicantName,
        company_name: companyName,
        forme_juridique: activiteData.forme_juridique || '',
        statut: 'En cours de traitement',
        step_data: stepData,
        admin_email: user?.email || '',
        admin_comment: 'Dossier créé par un agent administratif via le Portail Admin ANPI.',
        signature_data: stepData.esignature?.signature_data ? '[SIGNED]' : null,
        payment_confirmed: false,
        date_soumission: new Date().toISOString().split('T')[0],
      });

      onSuccess?.();
    } catch (e) {
      toast.error('Erreur lors de la création : ' + e.message);
    }
    setSaving(false);
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const canProceed = validateCurrentStep();
  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A2B6B] text-white px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <div className="w-px h-5 bg-white/20" />
            <Building2 className="w-5 h-5 text-blue-200" />
            <div>
              <h1 className="font-bold text-lg">Créer un nouveau dossier</h1>
              <p className="text-xs text-blue-200">Portail Admin ANPI — Création agent</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0 text-xs">
            Étape {currentStep + 1} / {STEPS.length}
          </Badge>
        </div>
      </div>

      {/* Progress steps */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-[64px] z-10">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = completedSteps.has(i);
              const SIcon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => isDone && setCurrentStep(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                      isActive ? 'bg-[#1A2B6B] text-white' :
                      isDone ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' :
                      'bg-[#F5F5F5] text-[#9B9B9B] cursor-default'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : <SIcon className="w-3 h-3" />}
                    {s.title}
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-[#D1D5DB] shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin notice banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-amber-700">
            <strong>Mode agent administratif</strong> — Ce dossier sera créé directement sans étape de paiement et marqué "En cours de traitement".
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-36">
          {step.id === 'identification' && <IdentificationStep value={stepData.identification} onChange={updateStep} showBiometric={false} />}
          {step.id === 'dispositions' && <DispositionsGeneralesStep value={stepData.dispositions} onChange={updateStep} />}
          {step.id === 'activite' && <DeclarationActiviteStep value={stepData.activite} onChange={updateStep} />}
          {step.id === 'partenaires' && <DeclarationPartenairesStep value={stepData.partenaires} onChange={updateStep} />}
          {step.id === 'employes' && <DeclarationEmployesStep value={stepData.employes} onChange={updateStep} />}
          {step.id === 'attestation' && <AttestationPouvoirStep value={stepData.attestation} onChange={updateStep} stepData={stepData} />}
          {step.id === 'documents' && <DocumentsStep value={stepData.documents} onChange={updateStep} stepData={stepData} />}
          {step.id === 'esignature' && <ESignatureStep value={stepData.esignature} onChange={updateStep} stepData={stepData} />}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Button variant="outline" onClick={handleBack} className="flex items-center gap-1.5 h-11 px-4 min-w-[90px]">
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Annuler' : 'Précédent'}
          </Button>

          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${
                i === currentStep ? 'w-5 h-1.5 bg-[#1A2B6B]' :
                completedSteps.has(i) ? 'w-2 h-1.5 bg-green-400' :
                'w-2 h-1.5 bg-[#E5E7EB]'
              }`} />
            ))}
          </div>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || saving}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 h-11 px-5 min-w-[140px] disabled:opacity-40"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                : <><CheckCircle2 className="w-4 h-4" /> Créer le dossier</>
              }
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white flex items-center gap-1.5 h-11 px-5 min-w-[100px] disabled:opacity-40"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}