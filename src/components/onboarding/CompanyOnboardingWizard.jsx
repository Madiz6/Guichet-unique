import React, { useState, useEffect, useCallback } from 'react';
import { meras } from '@/components/core/MerasClient';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, FileText, Briefcase, Users, UserSquare2, FolderOpen, CreditCard,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Save, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const DRAFT_KEY = 'guichet_un_onboarding_draft';
import IdentificationStep from './IdentificationStep.jsx';
import AttestationPouvoirStep from './AttestationPouvoirStep.jsx';
import DispositionsGeneralesStep from './DispositionsGeneralesStep.jsx';
import DeclarationActiviteStep from './DeclarationActiviteStep.jsx';
import DeclarationPartenairesStep from './DeclarationPartenairesStep.jsx';
import DeclarationEmployesStep from './DeclarationEmployesStep.jsx';
import DocumentsStep from './DocumentsStep.jsx';
import ESignatureStep from './ESignatureStep.jsx';
import PaymentStep from './PaymentStep.jsx';

const STEPS = [
  { id: 'identification', number: 1, title: 'Identification', subtitle: 'Représentant légal', icon: Shield },
  { id: 'dispositions', number: 2, title: 'Dispositions', subtitle: 'Clauses générales', icon: FileText },
  { id: 'activite', number: 3, title: 'Activité', subtitle: 'Nature & juridique', icon: Briefcase },
  { id: 'partenaires', number: 4, title: 'Partenaires', subtitle: 'Associés & actionnaires', icon: Users },
  { id: 'employes', number: 5, title: 'Employés', subtitle: 'Personnel initial', icon: UserSquare2 },
  { id: 'attestation', number: 6, title: 'Attestation', subtitle: 'Pouvoir & habilitation', icon: Shield },
  { id: 'documents', number: 7, title: 'Documents', subtitle: 'Pièces justificatives', icon: FolderOpen },
  { id: 'esignature', number: 8, title: 'Signature', subtitle: 'Signature électronique', icon: Shield },
  { id: 'paiement', number: 9, title: 'Paiement', subtitle: 'Frais d\'enregistrement', icon: CreditCard },
];

export default function CompanyOnboardingWizard({ onBack, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [saving, setSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

  // ── Draft persistence ──────────────────────────────────────────────────────
  const saveDraft = useCallback((data, step, completed) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        stepData: data,
        currentStep: step,
        completedSteps: [...completed],
        savedAt: new Date().toISOString(),
      }));
      setDraftSavedAt(new Date());
    } catch {
      // localStorage full or blocked — silently ignore
    }
  }, []);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.stepData || !draft?.savedAt) return;
      const savedDate = new Date(draft.savedAt);
      const ageHours = (Date.now() - savedDate.getTime()) / 3600000;
      if (ageHours > 72) { clearDraft(); return; } // Expire drafts older than 72h
      setHasDraft(true);
      toast(
        `Brouillon trouvé — étape ${draft.currentStep + 1}/${STEPS.length} (${savedDate.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})`,
        {
          duration: 10000,
          action: {
            label: 'Reprendre',
            onClick: () => {
              setStepData(draft.stepData || {});
              setCurrentStep(draft.currentStep || 0);
              setCompletedSteps(new Set(draft.completedSteps || []));
              setHasDraft(false);
              toast.success('Brouillon restauré !');
            },
          },
          cancel: {
            label: 'Ignorer',
            onClick: () => { clearDraft(); setHasDraft(false); },
          },
        }
      );
    } catch {
      clearDraft();
    }
  }, []);

  // Auto-save draft whenever stepData or currentStep changes
  useEffect(() => {
    if (Object.keys(stepData).length === 0) return;
    const timer = setTimeout(() => saveDraft(stepData, currentStep, completedSteps), 800);
    return () => clearTimeout(timer);
  }, [stepData, currentStep, completedSteps, saveDraft]);

  // ──────────────────────────────────────────────────────────────────────────

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
    if (step.id === 'paiement') return true;
    return true;
  };

  const handleNext = async () => {
    try {
      if (!validateCurrentStep()) {
        toast.error('Veuillez compléter toutes les informations requises avant de continuer.');
        return;
      }
      const next = new Set([...completedSteps, currentStep]);
      setCompletedSteps(next);
      if (currentStep < STEPS.length - 1) {
        const nextStep = currentStep + 1;
        // If we're about to enter the payment step, create the dossier first
        if (STEPS[nextStep].id === 'paiement') {
          await handleSubmit();
        }
        setCurrentStep(nextStep);
        saveDraft(stepData, nextStep, next);
      }
    } catch (e) {
      toast.error('Erreur de navigation — vos données sont sauvegardées en brouillon.');
    }
  };

  const handleBack = () => {
    try {
      if (currentStep > 0) setCurrentStep(prev => prev - 1);
      else onBack?.();
    } catch {
      onBack?.();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const idData = stepData.identification?.data || {};
      const activiteData = stepData.activite || {};
      const docsData = stepData.documents?.docs || {};
      const envelopeId = stepData.esignature?.envelope_id || `ENV-${Date.now()}`;
      const companyName = activiteData.commercial_names?.[0] || activiteData.raison_sociale || 'Entreprise';

      const user = await apiClient.auth.me();

      // Avoid duplicate creation if already submitted
      const existing = await meras.entities.RegistrationDossier.filter({ applicant_email: user?.email || '', envelope_id: envelopeId });
      if (existing?.length > 0) return;

      const company = await meras.entities.Company.create({
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

      await meras.entities.RegistrationDossier.create({
        company_id: company.id,
        envelope_id: envelopeId,
        applicant_email: user?.email || '',
        applicant_name: user?.full_name || `${idData.prenom || ''} ${idData.nom || ''}`.trim(),
        company_name: companyName,
        forme_juridique: activiteData.forme_juridique || '',
        statut: 'En attente',
        step_data: stepData,
        signature_data: stepData.esignature?.signature_data ? '[SIGNED]' : null,
        payment_confirmed: false,
        date_soumission: new Date().toISOString().split('T')[0],
      });

      await apiClient.auth.updateMe({
        company_id: company.id,
        company_name: companyName,
        onboarding_completed: true,
      });

      toast.success('Dossier soumis — procédez au paiement pour valider.');
    } catch (e) {
      saveDraft(stepData, currentStep, completedSteps);
      console.error('Onboarding submit error:', e);
      toast.error('Erreur lors de la soumission — vos données sont sauvegardées.');
      throw e; // re-throw so handleNext can catch it and not proceed
    } finally {
      setSaving(false);
    }
  };

  const isPayment = step.id === 'paiement';
  const canProceed = validateCurrentStep();

  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Top bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
              alt="Guichet UN" className="w-7 h-7 object-contain" />
            <div>
              <h1 className="font-semibold text-[#1A1A1A] text-sm leading-tight">Guichet UN</h1>
              <p className="text-[10px] text-[#6B6B6B] leading-tight hidden sm:block">Enregistrement — ANPI Djibouti</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6B6B6B] bg-[#F5F5F5] px-2.5 py-1 rounded-full">
              {currentStep + 1}/{STEPS.length}
            </span>
            {draftSavedAt && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                <Save className="w-2.5 h-2.5" />
                Brouillon sauvegardé
              </span>
            )}
            <button onClick={onBack} className="text-xs text-[#9B9B9B] hover:text-[#1A1A1A] px-2 py-1 touch-target">Annuler</button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-[52px] z-20">
        {/* Mobile: linear progress + step name */}
        <div className="block md:hidden px-4 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
              <StepIcon className="w-3.5 h-3.5" />
              {step.title}
            </span>
            <span className="text-[10px] text-[#9B9B9B]">{step.subtitle}</span>
          </div>
          <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop: pill steps */}
        <div className="hidden md:block px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {STEPS.map((s, i) => {
                const isActive = i === currentStep;
                const isDone = completedSteps.has(i);
                const SIcon = s.icon;
                return (
                  <div key={s.id} className="flex items-center gap-1 shrink-0">
                    <button onClick={() => isDone && setCurrentStep(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${isActive ? 'bg-[#1A1A1A] text-white' : isDone ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' : 'bg-[#F5F5F5] text-[#9B9B9B] cursor-default'}`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <SIcon className="w-3.5 h-3.5" />}
                      {s.title}
                    </button>
                    {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-[#D1D5DB] shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-36">
          {step.id === 'identification' && <IdentificationStep value={stepData.identification} onChange={updateStep} showBiometric={true} />}
          {step.id === 'dispositions' && <DispositionsGeneralesStep value={stepData.dispositions} onChange={updateStep} />}
          {step.id === 'activite' && <DeclarationActiviteStep value={stepData.activite} onChange={updateStep} />}
          {step.id === 'partenaires' && <DeclarationPartenairesStep value={stepData.partenaires} onChange={updateStep} />}
          {step.id === 'employes' && <DeclarationEmployesStep value={stepData.employes} onChange={updateStep} />}
          {step.id === 'attestation' && <AttestationPouvoirStep value={stepData.attestation} onChange={updateStep} stepData={stepData} />}
          {step.id === 'documents' && <DocumentsStep value={stepData.documents} onChange={updateStep} stepData={stepData} />}
          {step.id === 'esignature' && <ESignatureStep value={stepData.esignature} onChange={updateStep} stepData={stepData} />}
          {step.id === 'paiement' && <PaymentStep stepData={stepData} onSuccess={() => { clearDraft(); onSuccess?.(); }} onStepDataChange={setStepData} />}
        </div>
      </div>

      {/* Bottom nav */}
      {!isPayment && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-1.5 h-11 px-4 min-w-[90px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{currentStep === 0 ? 'Retour' : 'Précédent'}</span>
            </Button>

            {/* Dot indicators — hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${i === currentStep ? 'w-5 h-1.5 bg-[#1A1A1A]' : completedSteps.has(i) ? 'w-2 h-1.5 bg-green-400' : 'w-2 h-1.5 bg-[#E5E7EB]'}`} />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-[#1A1A1A] hover:bg-[#333] text-white flex items-center gap-1.5 h-11 px-5 min-w-[100px] disabled:opacity-40"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}