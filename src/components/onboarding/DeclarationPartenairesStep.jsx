import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X, ChevronDown, ChevronUp, User, Building2, CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import IdentificationStep from './IdentificationStep';
import { toast } from 'sonner';

function PartnerCard({ partner, index, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [idPhase, setIdPhase] = useState(partner.id_verified ? 'done-summary' : 'start');
  const [uploading, setUploading] = useState(false);

  const update = (k, v) => onUpdate(index, { ...partner, [k]: v });

  const handleCompanyDocUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update('company_registration_url', file_url);
    setUploading(false);
    toast.success('Document téléchargé');
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${partner.id_verified ? 'border-green-300' : 'border-[#E5E7EB]'}`}>
      {/* Card header */}
      <div
        className={`flex items-center justify-between px-5 py-4 cursor-pointer ${partner.id_verified ? 'bg-green-50' : 'bg-[#FAFAFA]'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${partner.id_verified ? 'bg-green-600' : 'bg-[#1A1A1A]'}`}>
            {partner.id_verified ? <CheckCircle2 className="w-4 h-4" /> : (index + 1)}
          </div>
          <div>
            <p className="font-semibold text-[#1A1A1A] text-sm">
              {partner.type === 'societe' ? (partner.company_name || `Société ${index + 1}`) : (partner.data?.nom ? `${partner.data.prenom || ''} ${partner.data.nom}`.trim() : `Partenaire ${index + 1}`)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-xs border-0 ${partner.type === 'societe' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {partner.type === 'societe' ? <Building2 className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                {partner.type === 'societe' ? 'Société' : 'Personne physique'}
              </Badge>
              {partner.part_percentage && <span className="text-xs text-[#6B6B6B]">{partner.part_percentage}%</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onRemove(index); }}
            className="p-1.5 hover:bg-red-100 rounded-lg text-[#9B9B9B] hover:text-red-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#6B6B6B]" /> : <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />}
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-4 border-t border-[#E5E7EB]">
          {/* Type selector */}
          <div>
            <Label className="text-xs text-[#6B6B6B] mb-2 block">Type de partenaire</Label>
            <div className="flex gap-2">
              {[{ v: 'physique', label: 'Personne physique', icon: User }, { v: 'societe', label: 'Société', icon: Building2 }].map(opt => (
                <button key={opt.v} onClick={() => update('type', opt.v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${partner.type === opt.v ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E7EB] text-[#6B6B6B] hover:border-[#1A1A1A]'}`}>
                  <opt.icon className="w-4 h-4" /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Identification — physique */}
          {partner.type === 'physique' && (
            <div>
              {idPhase === 'start' && !partner.id_verified && (
                <div className="p-4 border-2 border-dashed border-[#E5E7EB] rounded-xl text-center">
                  <User className="w-10 h-10 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-sm text-[#6B6B6B] mb-3">Vérification d'identité du partenaire requise</p>
                  <Button size="sm" onClick={() => setIdPhase('id-form')} className="bg-[#1A1A1A] text-white hover:bg-[#333]">
                    Démarrer la vérification
                  </Button>
                </div>
              )}
              {idPhase === 'id-form' && (
                <IdentificationStep
                  title="Identité du partenaire"
                  subtitle="Vérification d'identité"
                  showBiometric={false}
                  value={{ data: partner.data, document_url: partner.document_url }}
                  onChange={(d) => {
                    onUpdate(index, {
                      ...partner,
                      data: d.data,
                      document_url: d.document_url,
                      id_verified: !!(d.document_url && d.data?.nom)
                    });
                    if (d.document_url && d.data?.nom) setIdPhase('done-summary');
                  }}
                />
              )}
              {(idPhase === 'done-summary' || partner.id_verified) && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">
                      {partner.data?.prenom} {partner.data?.nom}
                    </p>
                    <p className="text-xs text-green-600">{partner.data?.nationalite} • {partner.data?.type_identite}</p>
                  </div>
                  <button onClick={() => setIdPhase('id-form')} className="text-xs text-green-600 hover:text-green-800">Modifier</button>
                </div>
              )}
            </div>
          )}

          {/* Société documents */}
          {partner.type === 'societe' && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-[#6B6B6B] mb-1">Nom de la société <span className="text-red-500">*</span></Label>
                <Input value={partner.company_name || ''} onChange={e => update('company_name', e.target.value)}
                  placeholder="Raison sociale" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-[#6B6B6B] mb-1">Documents d'immatriculation <span className="text-red-500">*</span></Label>
                {partner.company_registration_url ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 flex-1">Document téléchargé</span>
                    <button onClick={() => update('company_registration_url', null)} className="text-xs text-red-600">Supprimer</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 border border-dashed border-[#E5E7EB] rounded-lg p-3 cursor-pointer hover:border-[#1A1A1A] transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-[#6B6B6B]" /> : <Upload className="w-4 h-4 text-[#9B9B9B]" />}
                    <span className="text-sm text-[#9B9B9B]">{uploading ? 'Téléchargement…' : 'Registre de commerce, statuts…'}</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => e.target.files[0] && handleCompanyDocUpload(e.target.files[0])}
                      disabled={uploading} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Financial fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Email</Label>
              <Input type="email" value={partner.email || ''} onChange={e => update('email', e.target.value)}
                placeholder="email@example.com" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Part (%) <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" max="100" value={partner.part_percentage || ''} onChange={e => update('part_percentage', e.target.value)}
                placeholder="0" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-[#6B6B6B] mb-1">Apport (DJF) <span className="text-red-500">*</span></Label>
              <Input type="number" value={partner.apport || ''} onChange={e => update('apport', e.target.value)}
                placeholder="0" className="h-9 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeclarationPartenairesStep({ value = {}, onChange }) {
  const [partners, setPartners] = useState(value.partners || []);

  const totalParts = partners.reduce((s, p) => s + (parseFloat(p.part_percentage) || 0), 0);

  const addPartner = () => {
    const updated = [...partners, { type: 'physique', id_verified: false }];
    setPartners(updated);
    onChange({ partners: updated });
  };

  const updatePartner = (i, data) => {
    const updated = partners.map((p, idx) => idx === i ? data : p);
    setPartners(updated);
    onChange({ partners: updated });
  };

  const removePartner = (i) => {
    const updated = partners.filter((_, idx) => idx !== i);
    setPartners(updated);
    onChange({ partners: updated });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#333] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Déclaration des partenaires</h3>
            <p className="text-white/70 text-sm">Associés, actionnaires ou co-fondateurs</p>
          </div>
        </div>
        {/* Parts gauge */}
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/70 text-xs">Répartition du capital</span>
            <span className={`text-sm font-bold ${totalParts > 100 ? 'text-red-300' : totalParts === 100 ? 'text-green-300' : 'text-white'}`}>
              {totalParts.toFixed(1)}% / 100%
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${totalParts > 100 ? 'bg-red-400' : totalParts === 100 ? 'bg-green-400' : 'bg-white'}`}
              style={{ width: `${Math.min(totalParts, 100)}%` }} />
          </div>
        </div>
      </div>

      {totalParts > 100 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-red-700 text-sm font-medium">⚠️ La somme des parts dépasse 100%. Veuillez corriger.</span>
        </div>
      )}
      {totalParts === 100 && partners.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-green-700 text-sm font-medium">Capital réparti à 100% — parfait !</span>
        </div>
      )}

      {/* Partner cards */}
      <div className="space-y-3">
        {partners.map((p, i) => (
          <PartnerCard key={i} partner={p} index={i} onUpdate={updatePartner} onRemove={removePartner} />
        ))}
      </div>

      {/* Add partner */}
      <button onClick={addPartner}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#E5E7EB] rounded-xl text-sm text-[#6B6B6B] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all group">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] group-hover:bg-[#1A1A1A] flex items-center justify-center transition-colors">
          <Plus className="w-4 h-4 text-[#6B6B6B] group-hover:text-white transition-colors" />
        </div>
        Ajouter un partenaire / associé
      </button>

      {partners.length === 0 && (
        <p className="text-center text-sm text-[#9B9B9B] py-2">
          Optionnel — si l'entreprise n'a pas de partenaires, vous pouvez passer cette étape
        </p>
      )}
    </div>
  );
}