import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { Upload, CheckCircle2, Loader2, FileText, PenLine, CloudUpload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import StatutsGenerator from './StatutsGenerator.jsx';
import FormulaireGenerator from './FormulaireGenerator.jsx';

// Pièces à joindre for Personne Physique (from official ODPIC form)
const PIECES_PHYSIQUE = [
  { key: 'pp_piece_cin_url', label: 'Copie CIN / carte de séjour / passeport (gérant)', required: true },
  { key: 'pp_declaration_honneur_url', label: 'Déclaration sur l\'honneur', required: true },
  { key: 'pp_cin_salaries_url', label: 'Copie CIN / carte de séjour / passeport des salarié(s)', required: false },
  { key: 'pp_photos_url', label: '3 photos d\'identité', required: true },
  { key: 'pp_pouvoir_mandataire_url', label: 'Pouvoir du mandataire (si nécessaire)', required: false },
  { key: 'pp_agrement_url', label: 'Agrément à l\'activité (si nécessaire)', required: false },
  { key: 'pp_contrat_bail_url', label: 'Contrat de bail / lettre d\'engagement pour enregistrement', required: false },
];

// Pièces à joindre for Personne Morale (from official ODPIC form)
const PIECES_MORALE = [
  { key: 'piece_cin_associes_url', label: 'Copie CIN / carte de séjour / passeport (associés & gérant)', required: true },
  { key: 'piece_casier_judiciaire_url', label: 'Casier judiciaire ou déclaration sur l\'honneur', required: true },
  { key: 'piece_pouvoir_mandataire_url', label: 'Pouvoir du mandataire (si nécessaire)', required: false },
  { key: 'piece_cin_salaries_url', label: 'Copie CIN / carte de séjour / passeport des salarié(s)', required: false },
  { key: 'piece_agrement_url', label: 'Agrément à l\'activité (si nécessaire)', required: false },
  { key: 'piece_contrat_bail_url', label: 'Contrat de bail / lettre d\'engagement pour enregistrement', required: false },
  { key: 'piece_attestations_bancaires_url', label: '2 Attestations bancaires (Copie + Original)', required: true },
  { key: 'piece_statuts_societe_url', label: 'Statut de la société (acte notarié ou sous seing privé)', required: true },
  { key: 'piece_extrait_rcs_actionnaire_url', label: 'Extrait RCS de la personne morale actionnaire (si applicable)', required: false },
  { key: 'piece_statuts_actionnaire_url', label: 'Copie certifiée conforme des statuts de la personne morale actionnaire (si applicable)', required: false },
];

export default function DocumentsStep({ value, onChange, stepData }) {
  const docs = value?.docs || {};
  const [uploading, setUploading] = useState({});

  const handleUpload = async (key, file) => {
    setUploading(p => ({ ...p, [key]: true }));
    const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
    onChange({ docs: { ...docs, [key]: file_url } });
    setUploading(p => ({ ...p, [key]: false }));
    toast.success('Document téléchargé avec succès');
  };

  const setDocMode = (docType, mode) => {
    onChange({ docs: { ...docs, [`${docType}_mode`]: mode } });
  };

  const statutsMode = docs.statuts_mode || null;
  const formulaireMode = docs.formulaire_mode || null;

  const statutsDone = docs.statuts_mode === 'online' ? !!docs.statuts_signed : !!docs.statuts_signes_url;
  const formulaireDone = docs.formulaire_mode === 'online' ? !!docs.formulaire_signed : !!docs.formulaire_gui_url;
  const allDone = statutsDone && formulaireDone;

  // Detect Personne Morale from activite step data
  const formeJuridique = stepData?.activite?.forme_juridique || '';
  const isPersonneMorale = ['SARL', 'SA', 'SAS', 'EURL', 'SASU', 'Association'].includes(formeJuridique)
    || stepData?.identification?.entity_type === 'morale';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Documents officiels</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">Pièces justificatives requises pour l'enregistrement</p>
      </div>

      {allDone && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700">Tous les documents sont prêts</p>
            <p className="text-xs text-green-500 mt-0.5">Votre dossier documentaire est complet</p>
          </div>
        </div>
      )}

      {/* STATUTS */}
      <DocSection
        title="Statuts de la société"
        desc="Statuts originaux signés par tous les associés"
        done={statutsDone}
        mode={statutsMode}
        onChooseMode={(m) => setDocMode('statuts', m)}
      >
        {statutsMode === 'upload' && (
          <UploadZone
            done={!!docs.statuts_signes_url}
            uploading={uploading['statuts_signes_url']}
            onFile={f => handleUpload('statuts_signes_url', f)}
            onReplace={f => handleUpload('statuts_signes_url', f)}
          />
        )}

      </DocSection>

      {/* FORMULAIRE UNIQUE */}
      <DocSection
        title="Formulaire Unique GUI"
        desc="Formulaire officiel du Guichet Unique d'Investissement"
        done={formulaireDone}
        mode={formulaireMode}
        onChooseMode={(m) => setDocMode('formulaire', m)}
      >
        {formulaireMode === 'upload' && (
          <UploadZone
            done={!!docs.formulaire_gui_url}
            uploading={uploading['formulaire_gui_url']}
            onFile={f => handleUpload('formulaire_gui_url', f)}
            onReplace={f => handleUpload('formulaire_gui_url', f)}
          />
        )}

      </DocSection>

      {/* PIÈCES À JOINDRE — Personne Physique */}
      {!isPersonneMorale && (
        <PiecesSection
          title="Pièces à joindre — Personne Physique"
          pieces={PIECES_PHYSIQUE}
          docs={docs}
          uploading={uploading}
          onUpload={handleUpload}
        />
      )}

      {/* PIÈCES À JOINDRE — Personne Morale */}
      {isPersonneMorale && (
        <PiecesSection
          title="Pièces à joindre — Personne Morale"
          pieces={PIECES_MORALE}
          docs={docs}
          uploading={uploading}
          onUpload={handleUpload}
        />
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700">
          <strong>Note :</strong> Pour la signature en ligne, les documents sont générés automatiquement à partir de vos données saisies et pré-remplis. Formats d'upload acceptés : PDF, JPG, PNG.
        </p>
      </div>
    </div>
  );
}

function DocSection({ title, desc, done, mode, onChooseMode, children }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#F0F0F0]">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-green-100' : 'bg-[#F5F5F5]'}`}>
            {done ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <FileText className="w-5 h-5 text-[#9B9B9B]" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm text-[#1A1A1A]">{title}</p>
              <span className="text-xs text-red-500 font-medium">* Obligatoire</span>
              {done && <span className="text-xs text-green-600 font-medium">✓ Complété</span>}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{desc}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!mode ? (
          <div>
            <p className="text-xs font-medium text-[#6B6B6B] mb-3">Comment souhaitez-vous fournir ce document ?</p>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => onChooseMode('upload')}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#E5E7EB] rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
              >
                <CloudUpload className="w-6 h-6 text-[#6B6B6B]" />
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">Télécharger</p>
                  <p className="text-xs text-[#9B9B9B]">J'ai déjà le document signé</p>
                </div>
              </button>

            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mode === 'upload' ? <CloudUpload className="w-4 h-4 text-[#6B6B6B]" /> : <PenLine className="w-4 h-4 text-[#1A2B6B]" />}
                <span className="text-xs font-medium text-[#6B6B6B]">
                  {mode === 'upload' ? 'Mode : Téléchargement' : 'Mode : Signature en ligne'}
                </span>
              </div>
              {!done && (
                <button type="button" onClick={() => onChooseMode(null)} className="text-xs text-blue-600 hover:underline">
                  Changer
                </button>
              )}
            </div>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function PiecesSection({ title, pieces, docs, uploading, onUpload }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#F0F0F0] bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-[#1A1A1A]">{title}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">Documents requis par l'ODPIC pour le dossier d'enregistrement</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {pieces.map(({ key, label, required }) => {
          const url = docs[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-[#1A1A1A]">
                  {label}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </p>
              </div>
              {url ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                  <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                    Changer<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && onUpload(key, e.target.files[0])} />
                  </label>
                </div>
              ) : (
                <label className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all
                  ${required ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-[#E5E7EB] text-[#6B6B6B] hover:bg-[#F5F5F5]'}`}>
                  {uploading[key]
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Upload className="w-3 h-3" />
                  }
                  {uploading[key] ? 'Envoi...' : 'Télécharger'}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && onUpload(key, e.target.files[0])} />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UploadZone({ done, uploading, onFile, onReplace }) {
  if (done) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Document téléchargé</span>
        <label className="cursor-pointer text-xs text-blue-600 hover:underline">
          Remplacer <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && onReplace(e.target.files[0])} />
        </label>
      </div>
    );
  }
  return (
    <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-lg px-4 py-4 hover:border-blue-400 hover:bg-blue-50 transition-all">
      {uploading
        ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span className="text-sm text-blue-600">Téléchargement...</span></>
        : <><Upload className="w-4 h-4 text-[#9B9B9B]" /><span className="text-sm text-[#6B6B6B]">Cliquez pour télécharger (PDF, JPG, PNG)</span></>
      }
      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
    </label>
  );
}