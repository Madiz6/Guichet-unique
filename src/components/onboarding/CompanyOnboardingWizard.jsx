import React, { useState } from 'react';
import { meras } from '@/components/core/MerasClient';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, FileText, Briefcase, Users, UserSquare2, FolderOpen, CreditCard,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
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

  const step = STEPS[currentStep];

  const updateStep = (data) => {
    setStepData(prev => ({ ...prev, [step.id]: data }));
  };

  const validateCurrentStep = () => {
    const data = stepData[step.id];
    if (step.id === 'identification') {
      const repType = data?.rep_type || 'physique';
      if (repType === 'notaire') return !!(data?.notaire?.nom && data?.notaire?.rcs);
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

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('Veuillez compléter toutes les informations requises avant de continuer.');
      return;
    }
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
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
      const envelopeId = stepData.esignature?.envelope_id || '';
      const companyName = activiteData.commercial_names?.[0] || activiteData.raison_sociale || `Entreprise`;

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
        structure_organisationnelle: JSON.stringify({
          representant: idData,
          notaire: stepData.identification?.notaire,
          rep_type: stepData.identification?.rep_type,
          dispositions: stepData.dispositions,
          partenaires: stepData.partenaires?.partners || [],
          employes: stepData.employes?.employees || [],
          commercial_names: activiteData.commercial_names || [],
        }),
      });

      // Create registration dossier for tracking
      const user = await base44.auth.me();
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
        payment_confirmed: true,
        payment_amount: 5000,
        date_soumission: new Date().toISOString().split('T')[0],
      });

      await base44.auth.updateMe({
        company_id: company.id,
        company_name: company.nom_entreprise,
        onboarding_completed: true,
      });

      toast.success('Entreprise créée avec succès !');
      onSuccess?.();
    } catch (e) {
      toast.error("Erreur lors de la création : " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const isPayment = step.id === 'paiement';
  const canProceed = validateCurrentStep();

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/c259d5408_Untitled-design-1.png"
              alt="Guichet UN" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-semibold text-[#1A1A1A]">Guichet UN</h1>
              <p className="text-xs text-[#6B6B6B]">Enregistrement d'entreprise — ANPI Djibouti</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#F5F5F5] text-[#6B6B6B] border-0">Étape {currentStep + 1} / {STEPS.length}</Badge>
            <button onClick={onBack} className="text-xs text-[#9B9B9B] hover:text-[#1A1A1A] ml-2">Annuler</button>
          </div>
        </div>
      </div>

      {/* Steps progress */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = completedSteps.has(i);
              const StepIcon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button onClick={() => isDone && setCurrentStep(i)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${isActive ? 'bg-[#1A1A1A] text-white' : isDone ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' : 'bg-[#F5F5F5] text-[#9B9B9B] cursor-default'}`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                    <span className="hidden md:inline">{s.title}</span>
                    <span className="md:hidden">{i + 1}</span>
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-[#D1D5DB] shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-32">
          {step.id === 'identification' && <IdentificationStep value={stepData.identification} onChange={updateStep} showBiometric={true} />}
          {step.id === 'dispositions' && <DispositionsGeneralesStep value={stepData.dispositions} onChange={updateStep} />}
          {step.id === 'activite' && <DeclarationActiviteStep value={stepData.activite} onChange={updateStep} />}
          {step.id === 'partenaires' && <DeclarationPartenairesStep value={stepData.partenaires} onChange={updateStep} />}
          {step.id === 'employes' && <DeclarationEmployesStep value={stepData.employes} onChange={updateStep} />}
          {step.id === 'attestation' && <AttestationPouvoirStep value={stepData.attestation} onChange={updateStep} stepData={stepData} />}
          {step.id === 'documents' && <DocumentsStep value={stepData.documents} onChange={updateStep} stepData={stepData} />}
          {step.id === 'esignature' && <ESignatureStep value={stepData.esignature} onChange={updateStep} stepData={stepData} />}
          {step.id === 'paiement' && <PaymentStep stepData={stepData} onSuccess={onSuccess} />}
        </div>
      </div>

      {/* Bottom nav — hidden on payment step (PaymentStep has its own CTA) */}
      {!isPayment && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-6 py-4 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              {currentStep === 0 ? 'Retour' : 'Précédent'}
            </Button>
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-[#1A1A1A]' : completedSteps.has(i) ? 'w-3 bg-green-400' : 'w-3 bg-[#E5E7EB]'}`} />
              ))}
            </div>
            <Button onClick={handleNext} disabled={!canProceed} className="bg-[#1A1A1A] hover:bg-[#333] text-white flex items-center gap-2 px-6 disabled:opacity-50">
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}