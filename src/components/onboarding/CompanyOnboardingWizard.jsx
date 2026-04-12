import React, { useState } from 'react';
import { meras } from '@/components/core/MerasClient';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, FileText, Briefcase, Users, UserSquare2, FolderOpen,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import IdentificationStep from './IdentificationStep.jsx';
import DispositionsGeneralesStep from './DispositionsGeneralesStep.jsx';
import DeclarationActiviteStep from './DeclarationActiviteStep.jsx';
import DeclarationPartenairesStep from './DeclarationPartenairesStep.jsx';
import DeclarationEmployesStep from './DeclarationEmployesStep.jsx';
import DocumentsStep from './DocumentsStep.jsx';

const STEPS = [
  {
    id: 'identification', number: 1,
    title: 'Identification', subtitle: 'Représentant légal',
    icon: Shield, color: 'blue',
  },
  {
    id: 'dispositions', number: 2,
    title: 'Dispositions', subtitle: 'Clauses générales',
    icon: FileText, color: 'purple',
  },
  {
    id: 'activite', number: 3,
    title: 'Activité', subtitle: 'Nature & juridique',
    icon: Briefcase, color: 'green',
  },
  {
    id: 'partenaires', number: 4,
    title: 'Partenaires', subtitle: 'Associés & actionnaires',
    icon: Users, color: 'orange',
  },
  {
    id: 'employes', number: 5,
    title: 'Employés', subtitle: 'Personnel initial',
    icon: UserSquare2, color: 'pink',
  },
  {
    id: 'documents', number: 6,
    title: 'Documents', subtitle: 'Pièces justificatives',
    icon: FolderOpen, color: 'indigo',
  },
];

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  pink: 'bg-pink-100 text-pink-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

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
      return !!(data?.document_url && data?.data?.nom);
    }
    if (step.id === 'dispositions') {
      return !!(data?.all_accepted);
    }
    if (step.id === 'activite') {
      return !!(data?.secteur_principal && data?.activite_description && data?.forme_juridique);
    }
    if (step.id === 'documents') {
      const requiredKeys = ['licence_entreprise_url', 'registre_commerce_url', 'certificat_cnss_url', 'nif_document_url'];
      return requiredKeys.every(k => data?.docs?.[k]);
    }
    return true; // partenaires & employes are optional
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('Veuillez compléter toutes les informations requises avant de continuer.');
      return;
    }
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
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

      // Create company
      const company = await meras.entities.Company.create({
        nom_entreprise: activiteData.raison_sociale || `Entreprise de ${idData.prenom} ${idData.nom}`,
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
        // Documents
        licence_entreprise_url: docsData.licence_entreprise_url || '',
        registre_commerce_url: docsData.registre_commerce_url || '',
        certificat_cnss_url: docsData.certificat_cnss_url || '',
        patente_url: docsData.patente_url || '',
        statut_societe_url: docsData.statut_societe_url || '',
        contrat_bail_url: docsData.contrat_bail_url || '',
        immatriculation_cnss_url: docsData.immatriculation_cnss_url || '',
        // Representative data stored in structure
        structure_organisationnelle: JSON.stringify({
          representant: idData,
          biometric: stepData.identification?.biometric,
          dispositions: stepData.dispositions,
          partenaires: stepData.partenaires?.partners || [],
          employes: stepData.employes?.employees || [],
          custom_docs: stepData.documents?.custom_docs || [],
        }),
      });

      // Link user to company
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

  const isLast = currentStep === STEPS.length - 1;
  const canProceed = validateCurrentStep();

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png"
              alt="Paie360" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-semibold text-[#1A1A1A]">Enregistrement d'entreprise</h1>
              <p className="text-xs text-[#6B6B6B]">Guichet Unique ANPI — Djibouti</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#F5F5F5] text-[#6B6B6B] border-0">
              Étape {currentStep + 1} / {STEPS.length}
            </Badge>
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
              const Icon = s.icon;
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => isDone && setCurrentStep(i)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${
                      isActive ? 'bg-[#1A1A1A] text-white' :
                      isDone ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' :
                      'bg-[#F5F5F5] text-[#9B9B9B] cursor-default'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden md:inline">{s.title}</span>
                    <span className="md:hidden">{i + 1}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-[#D1D5DB] shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-32">
          {step.id === 'identification' && (
            <IdentificationStep
              title="Identification du représentant légal"
              subtitle="Vérification d'identité par document + analyse biométrique"
              value={stepData.identification}
              onChange={updateStep}
              showBiometric={true}
            />
          )}
          {step.id === 'dispositions' && (
            <DispositionsGeneralesStep
              value={stepData.dispositions}
              onChange={updateStep}
            />
          )}
          {step.id === 'activite' && (
            <DeclarationActiviteStep
              value={stepData.activite}
              onChange={updateStep}
            />
          )}
          {step.id === 'partenaires' && (
            <DeclarationPartenairesStep
              value={stepData.partenaires}
              onChange={updateStep}
            />
          )}
          {step.id === 'employes' && (
            <DeclarationEmployesStep
              value={stepData.employes}
              onChange={updateStep}
            />
          )}
          {step.id === 'documents' && (
            <DocumentsStep
              value={stepData.documents}
              onChange={updateStep}
            />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-6 py-4 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Retour' : 'Précédent'}
          </Button>

          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? 'w-6 bg-[#1A1A1A]' : completedSteps.has(i) ? 'w-3 bg-green-400' : 'w-3 bg-[#E5E7EB]'
              }`} />
            ))}
          </div>

          {isLast ? (
            <Button
              onClick={handleSubmit}
              disabled={saving || !canProceed}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Création en cours…' : 'Créer l\'entreprise'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-[#1A1A1A] hover:bg-[#333] text-white flex items-center gap-2 px-6"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}