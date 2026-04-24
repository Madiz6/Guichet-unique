import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Upload, Sparkles, Download, CheckCircle2,
  Loader2, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ACTES_RCS = [
  {
    id: 'extrait',
    label: 'Extrait RCS',
    description: "Atteste l'existence légale de l'entreprise et contient les informations enregistrées au registre de commerce et des sociétés. Valable 3 mois.",
    payant: true,
    redevance: 5000,
  },
  {
    id: 'duplicata_recepisse',
    label: 'Duplicata du récépissé d\'immatriculation',
    description: "Copie conforme du récépissé prouvant l'immatriculation de l'entreprise ou la modification de son statut auprès du RCS.",
    payant: true,
    redevance: 3000,
  },
  {
    id: 'duplicata_certificat_negatif',
    label: 'Duplicata du certificat négatif',
    description: "Copie conforme attestant qu'il n'existe pas d'entreprise enregistrée sous un nom identique ou similaire.",
    payant: true,
    redevance: 3000,
  },
  {
    id: 'certificat_negatif',
    label: 'Certificat négatif',
    description: "Protège le nom commercial ou l'enseigne de l'entreprise ou de la société.",
    payant: true,
    redevance: 5000,
  },
  {
    id: 'attestation_generale',
    label: 'Attestation générale',
    description: "Atteste de l'existence légale de l'entreprise et peut être utilisée pour prouver son activité commerciale.",
    payant: false,
    redevance: 0,
  },
  {
    id: 'attestation_non_faillite',
    label: 'Attestation de non-faillite',
    description: "Atteste que l'entreprise n'est pas en procédure collective (certificat de non-faillite).",
    payant: true,
    redevance: 5000,
  },
  {
    id: 'attestation_non_enregistrement',
    label: 'Attestation de non-enregistrement',
    description: "Atteste qu'une entreprise n'est pas enregistrée auprès du registre de commerce et des sociétés.",
    payant: true,
    redevance: 5000,
  },
  {
    id: 'attestation_enregistrement',
    label: 'Attestation d\'enregistrement RCS',
    description: "Atteste de l'enregistrement de l'entreprise auprès du registre de commerce et des sociétés.",
    payant: false,
    redevance: 0,
  },
  {
    id: 'copie_documents_odpic',
    label: 'Copie des documents ODPIC',
    description: "Copies de tous les documents établis par l'ODPIC pour l'entreprise individuelle ou la société.",
    payant: false,
    redevance: 0,
  },
];

function ActeRow({ acte, dossierDocs, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const existingDoc = dossierDocs[acte.id];

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onUploaded(acte.id, file_url, file.name);
      toast.success(`${acte.label} téléversé`);
    } catch {
      toast.error('Erreur de téléchargement');
    }
    setUploading(false);
    setShowActions(false);
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${existingDoc ? 'border-green-200 bg-green-50/40' : 'border-[#E5E7EB] bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${existingDoc ? 'bg-green-100' : 'bg-[#F0F0F0]'}`}>
            <FileText className={`w-4 h-4 ${existingDoc ? 'text-green-600' : 'text-[#6B6B6B]'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#1A1A1A]">{acte.label}</p>
              {acte.payant
                ? <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">{acte.redevance.toLocaleString()} DJF</span>
                : <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">Gratuit</span>
              }
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">{acte.description}</p>
            {existingDoc && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Document disponible</span>
                {existingDoc.date && <span className="text-[#9B9B9B]">· {existingDoc.date}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {existingDoc && (
            <a
              href={existingDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-[#1A2B6B] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f1e4d] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
          )}

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActions(v => !v)}
              className="text-xs h-8 gap-1"
            >
              {existingDoc ? 'Remplacer' : 'Action'}
              {showActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>

            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-10 overflow-hidden">
                {/* Generate (Coming Soon) */}
                <button
                  disabled
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-[#9B9B9B] cursor-not-allowed hover:bg-[#F9F9F9] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  <div className="text-left">
                    <p className="text-xs font-medium text-[#9B9B9B]">Générer automatiquement</p>
                    <p className="text-[10px] text-[#C0C0C0] flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Bientôt disponible</p>
                  </div>
                </button>

                <div className="border-t border-[#F0F0F0]" />

                {/* Upload */}
                <label className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left cursor-pointer hover:bg-blue-50 transition-colors">
                  {uploading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    : <Upload className="w-3.5 h-3.5 text-blue-600" />
                  }
                  <p className="text-xs font-medium text-[#1A1A1A]">{uploading ? 'Téléchargement...' : 'Téléverser un fichier'}</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => e.target.files[0] && handleUpload(e.target.files[0])}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActesAdministratifsRCS({ dossier, onDossierUpdated }) {
  const [open, setOpen] = useState(false);

  // Store actes docs inside step_data.actes_rcs = { [acte_id]: { url, nom, date } }
  const actesRcs = dossier.step_data?.actes_rcs || {};
  const uploadedCount = Object.keys(actesRcs).length;

  const handleUploaded = async (acteId, url, nom) => {
    const updatedActesRcs = {
      ...actesRcs,
      [acteId]: {
        url,
        nom,
        date: new Date().toLocaleDateString('fr-FR'),
      },
    };

    await base44.entities.RegistrationDossier.update(dossier.id, {
      step_data: {
        ...dossier.step_data,
        actes_rcs: updatedActesRcs,
      },
    });

    onDossierUpdated?.();
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F9F9F9] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1A2B6B]/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#1A2B6B]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#1A1A1A]">Actes Administratifs Délivrés par le RCS</p>
            <p className="text-xs text-[#9B9B9B]">Documents officiels ODPIC — {uploadedCount}/{ACTES_RCS.length} disponibles</p>
          </div>
          {uploadedCount > 0 && (
            <Badge className="bg-green-100 text-green-700 text-[10px]">{uploadedCount} document{uploadedCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#9B9B9B]" /> : <ChevronDown className="w-4 h-4 text-[#9B9B9B]" />}
      </button>

      {open && (
        <div className="border-t border-[#E5E7EB] p-5 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Délivrez les actes administratifs officiels de l'ODPIC pour cette entreprise. Utilisez <strong>Téléverser</strong> pour importer un document signé, ou attendez la génération automatique (bientôt disponible). Les documents téléversés peuvent être téléchargés par l'entreprise sur demande.
          </div>

          <div className="space-y-2">
            {ACTES_RCS.map(acte => (
              <ActeRow
                key={acte.id}
                acte={acte}
                dossierDocs={actesRcs}
                onUploaded={handleUploaded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}