import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PenLine, Save, X, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const FORMES_JURIDIQUES = ['SARL', 'SA', 'SAS', 'EURL', 'SNC', 'Association', 'Établissement public', 'Entreprise individuelle', 'Succursale'];

export default function DossierEditPanel({ dossier, onSave }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepData = dossier.step_data || {};
  const activite = stepData.activite || {};

  const [form, setForm] = useState({
    company_name: dossier.company_name || '',
    forme_juridique: dossier.forme_juridique || activite.forme_juridique || '',
    raison_sociale: activite.raison_sociale || '',
    capital_social: activite.capital_social || '',
    secteur_principal: activite.secteur_principal || '',
    activite_description: activite.activite_description || '',
    regime_fiscal: activite.regime_fiscal || '',
    nb_employes_prevus: activite.nb_employes_prevus || '',
    adresse: stepData.identification?.data?.adresse || '',
    email: stepData.identification?.data?.email || '',
    telephone: stepData.identification?.data?.telephone || '',
    admin_comment: dossier.admin_comment || '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedStepData = {
        ...stepData,
        activite: {
          ...activite,
          forme_juridique: form.forme_juridique,
          raison_sociale: form.raison_sociale,
          capital_social: form.capital_social,
          secteur_principal: form.secteur_principal,
          activite_description: form.activite_description,
          regime_fiscal: form.regime_fiscal,
          nb_employes_prevus: form.nb_employes_prevus,
        },
        identification: {
          ...stepData.identification,
          data: {
            ...(stepData.identification?.data || {}),
            adresse: form.adresse,
            email: form.email,
            telephone: form.telephone,
          }
        }
      };

      const updated = await base44.entities.RegistrationDossier.update(dossier.id, {
        company_name: form.company_name,
        forme_juridique: form.forme_juridique,
        admin_comment: form.admin_comment,
        step_data: updatedStepData,
        date_traitement: new Date().toISOString().split('T')[0],
      });

      toast.success('Dossier mis à jour avec succès');
      onSave(updated);
      setOpen(false);
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center justify-between bg-[#F9F9F9] border-b border-[#E5E7EB] hover:bg-[#F0F0F0] transition-colors"
      >
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-[#1A2B6B]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">Modifier le dossier</span>
          <span className="text-xs text-[#9B9B9B]">Corrections administratives</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#6B6B6B]" /> : <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />}
      </button>

      {open && (
        <div className="p-5 space-y-5">
          {/* Company identity */}
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Identité de l'entreprise</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom commercial</Label>
                <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Raison sociale</Label>
                <Input value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forme juridique</Label>
                <select
                  value={form.forme_juridique}
                  onChange={e => set('forme_juridique', e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">— Sélectionner —</option>
                  {FORMES_JURIDIQUES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Capital social (DJF)</Label>
                <Input type="number" value={form.capital_social} onChange={e => set('capital_social', e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>

          {/* Activity */}
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Activité</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Secteur principal</Label>
                <Input value={form.secteur_principal} onChange={e => set('secteur_principal', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Régime fiscal</Label>
                <Input value={form.regime_fiscal} onChange={e => set('regime_fiscal', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nb employés prévus</Label>
                <Input type="number" value={form.nb_employes_prevus} onChange={e => set('nb_employes_prevus', e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1 mt-3">
              <Label className="text-xs">Description de l'activité</Label>
              <Textarea
                value={form.activite_description}
                onChange={e => set('activite_description', e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">Coordonnées</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-3">
                <Label className="text-xs">Adresse</Label>
                <Input value={form.adresse} onChange={e => set('adresse', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Téléphone</Label>
                <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>

          {/* Admin comment */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Note de modification (visible par le demandeur)</Label>
            <Textarea
              value={form.admin_comment}
              onChange={e => set('admin_comment', e.target.value)}
              placeholder="Ex: Nous avons corrigé votre raison sociale suite à votre demande du ..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1A2B6B] hover:bg-[#0f1e4d] text-white text-sm"
            >
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Enregistrement...</>
                : <><Save className="w-4 h-4 mr-2" />Enregistrer les modifications</>
              }
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-sm">
              <X className="w-4 h-4 mr-1" /> Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}