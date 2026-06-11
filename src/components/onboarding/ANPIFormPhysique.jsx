import React, { useState } from 'react';
import { meras } from '@/components/core/MerasClient';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Dispositions générales', 'Identification du représentant', 'Activités', 'Déclaration des salariés', 'Documents'];

const ACTIVITIES = ['Commerce général','Import / Export','Transport et logistique','Construction et immobilier','Industrie et fabrication','Technologies de l\'information','Santé et pharmacie','Tourisme et hôtellerie','Agriculture et pêche','Services financiers','Éducation et formation','Restauration','Énergie et mines','Matériels de Communication','Infirmier'];

const NATIONALITIES = ['Djiboutienne','Éthiopienne','Somalienne','Française','Américaine','Autre'];

export default function ANPIFormPhysique({ onBack, onSuccess }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [activities, setActivities] = useState([{ name: '' }]);
  const [employees, setEmployees] = useState([]);
  const [empForm, setEmpForm] = useState({});
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNo] = useState(() => 'DJ-ANPI-' + Math.floor(100000 + Math.random() * 900000));

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleUpload = async (key, file) => {
    setUploading(p => ({ ...p, [key]: true }));
    const { file_url } = await apiClient.integrations.Core.UploadFile({ file });
    setDocs(p => ({ ...p, [key]: file_url }));
    setUploading(p => ({ ...p, [key]: false }));
    toast.success('Document téléchargé');
  };

  const handleSubmit = async () => {
    if (!agreed) { toast.error('Veuillez accepter les termes et conditions.'); return; }
    setSubmitting(true);
    const company = await meras.entities.Company.create({
      nom_entreprise: form.nom_commercial || form.adresse || 'Mon Entreprise',
      nif: form.nif || '',
      numero_affiliation: form.affiliation || '',
      adresse: form.adresse,
      email: form.email,
      telephone: form.tel_fixe,
      capital_social: Number(form.capital) || 0,
      activite: activities.map(a => a.name).filter(Boolean).join(', '),
      nombre_assures: Number(form.nombre_salaries) || 0,
      type_entreprise: 'EURL',
      ...docs,
    });
    await apiClient.auth.updateMe({ company_id: company.id, company_name: company.nom_entreprise, onboarding_completed: true });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Dossier soumis avec succès</h2>
        <p className="text-sm text-[#6B6B6B] mb-4">Votre demande a été reçue. Vous serez notifié par email sous 5 à 10 jours ouvrables.</p>
        <div className="bg-[#F5F5F5] rounded-lg px-6 py-3 inline-block mb-6 text-sm text-[#1A1A1A]">
          Référence : <strong>{refNo}</strong>
        </div>
        <Button onClick={onSuccess} className="bg-[#1A1A1A] hover:bg-[#333] text-white w-full">
          Accéder au tableau de bord
        </Button>
      </div>
    </div>
  );

  const progressBar = (
    <div className="bg-white border-b border-[#E5E7EB] px-6 py-3 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 text-xs font-medium ${i === step ? 'text-[#1A1A1A]' : i < step ? 'text-green-600 cursor-pointer' : 'text-[#9B9B9B]'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-[#1A1A1A] text-white' : i < step ? 'bg-green-600 text-white' : 'bg-[#F0F0F0] text-[#9B9B9B]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {s}
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-[#E5E7EB]" />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="font-semibold text-[#1A1A1A]">Enregistrement — Personne Physique</h1>
          <p className="text-xs text-[#6B6B6B]">Étape {step + 1} sur {STEPS.length}</p>
        </div>
      </div>

      {progressBar}

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        {/* STEP 0 — Dispositions générales */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">Dispositions générales</h2>
            <p className="text-sm text-[#6B6B6B] mb-6">Informations de la société</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { k: 'adresse', l: 'Adresse', req: true },
                { k: 'email', l: 'Email', type: 'email', req: true },
                { k: 'nif', l: 'NIF / Tax', req: false },
                { k: 'date_creation', l: 'Date de création', type: 'date', req: true },
                { k: 'nationalite', l: 'Nationalité', type: 'select', opts: NATIONALITIES, req: true },
                { k: 'nom_commercial', l: 'Nom commercial / Enseigne' },
                { k: 'nombre_salaries', l: 'Nombre de salariés', type: 'number', req: true },
                { k: 'capital', l: 'Capital social (FDJ)', type: 'number' },
                { k: 'tel_fixe', l: 'Tél. fixe' },
                { k: 'fax', l: 'Numéro de fax' },
              ].map(f => (
                <div key={f.k} className={f.k === 'adresse' ? 'md:col-span-2' : ''}>
                  <Label className="text-sm font-medium text-[#1A1A1A]">
                    {f.l} {f.req && <span className="text-red-500">*</span>}
                  </Label>
                  {f.type === 'select' ? (
                    <select value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)}
                      className="mt-1 w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm bg-white">
                      <option value="">Sélectionner</option>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)} className="mt-1" placeholder={f.l} />
                  )}
                </div>
              ))}
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-[#1A1A1A]">BP</Label>
                <Input value={form.bp || ''} onChange={e => set('bp', e.target.value)} className="mt-1" placeholder="BP" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — Identification du représentant */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Identification du représentant</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { k: 'rep_nom', l: 'Nom & Prénom', req: true, full: true },
                { k: 'rep_genre', l: 'Genre', req: true, type: 'select', opts: ['Homme', 'Femme'] },
                { k: 'rep_dob', l: 'Date de naissance', req: true, type: 'date' },
                { k: 'rep_tel', l: 'Téléphone', req: true },
                { k: 'rep_cin', l: 'N° CIN' },
                { k: 'rep_email', l: 'Email', req: true, type: 'email' },
                { k: 'rep_nat', l: 'Nationalité', req: true, type: 'select', opts: NATIONALITIES },
                { k: 'rep_lieu', l: 'Lieu de naissance', req: true, full: true },
              ].map(f => (
                <div key={f.k} className={f.full ? 'md:col-span-2' : ''}>
                  <Label className="text-sm font-medium text-[#1A1A1A]">
                    {f.l} {f.req && <span className="text-red-500">*</span>}
                  </Label>
                  {f.type === 'select' ? (
                    <select value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)}
                      className="mt-1 w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm bg-white">
                      <option value="">Sélectionner</option>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)} className="mt-1" placeholder={f.l} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Activités */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Déclaration relative à l'activité</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(n => (
                <div key={n}>
                  <Label className="text-sm font-medium text-[#1A1A1A]">
                    Appellation commerciale {n} {n === 1 && <span className="text-red-500">*</span>}
                  </Label>
                  <Input value={form[`appellation_${n}`] || ''} onChange={e => set(`appellation_${n}`, e.target.value)} className="mt-1" placeholder={`Appellation ${n}`} />
                </div>
              ))}
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-[#1A1A1A]">Activités</Label>
                <button onClick={() => setActivities(a => [...a, { name: '' }])}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5]">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#6B6B6B] w-10">No</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#6B6B6B]">Nom de l'activité</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a, i) => (
                      <tr key={i} className="border-t border-[#F0F0F0]">
                        <td className="px-4 py-2 text-[#6B6B6B]">{i + 1}</td>
                        <td className="px-4 py-2">
                          <select value={a.name} onChange={e => setActivities(prev => prev.map((x, j) => j === i ? { name: e.target.value } : x))}
                            className="w-full border border-[#E5E7EB] rounded px-2 py-1 text-sm bg-white">
                            <option value="">Sélectionner</option>
                            {ACTIVITIES.map(ac => <option key={ac}>{ac}</option>)}
                          </select>
                        </td>
                        <td className="px-2">
                          {activities.length > 1 && (
                            <button onClick={() => setActivities(a => a.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Déclaration des salariés */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">Déclaration des employés</h2>
            <p className="text-sm text-[#6B6B6B] mb-6">Entrez les détails de l'employé et maintenez les dossiers</p>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { k: 'type', l: 'Type d\'employé', req: true, type: 'select', opts: ['Gérant','Employé','Directeur général','Associé gérant'] },
                  { k: 'nom', l: 'Nom & Prénom', req: true },
                  { k: 'mat', l: 'Matricule assuré social', full: true },
                  { k: 'mere', l: 'Nom de la mère' },
                  { k: 'sal', l: 'Salaire brut mensuel', req: true, type: 'number' },
                  { k: 'poste', l: 'Emploi occupé', req: true },
                  { k: 'date', l: 'Date d\'embauche', req: true, type: 'date' },
                ].map(f => (
                  <div key={f.k} className={f.full ? 'md:col-span-2' : ''}>
                    <Label className="text-sm font-medium text-[#1A1A1A]">
                      {f.l} {f.req && <span className="text-red-500">*</span>}
                    </Label>
                    {f.type === 'select' ? (
                      <select value={empForm[f.k] || ''} onChange={e => setEmpForm(p => ({ ...p, [f.k]: e.target.value }))}
                        className="mt-1 w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm bg-white">
                        <option value="">Sélectionner</option>
                        {f.opts.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <Input type={f.type || 'text'} value={empForm[f.k] || ''} onChange={e => setEmpForm(p => ({ ...p, [f.k]: e.target.value }))} className="mt-1" placeholder={f.l} />
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-4 text-sm"
                onClick={() => { setEmployees(e => [...e, empForm]); setEmpForm({}); toast.success('Employé ajouté'); }}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter l'employé
              </Button>
            </div>
            {employees.length > 0 && (
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5]">
                    <tr>{['Type','Nom','Matricule','Salaire','Poste','Embauche',''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[#6B6B6B]">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {employees.map((e, i) => (
                      <tr key={i} className="border-t border-[#F0F0F0]">
                        <td className="px-3 py-2">{e.type}</td>
                        <td className="px-3 py-2">{e.nom}</td>
                        <td className="px-3 py-2">{e.mat || '—'}</td>
                        <td className="px-3 py-2">{Number(e.sal || 0).toLocaleString()} FDJ</td>
                        <td className="px-3 py-2">{e.poste}</td>
                        <td className="px-3 py-2">{e.date}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => setEmployees(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Documents */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">Téléchargements de documents</h2>
            <p className="text-sm text-[#6B6B6B] mb-6">Téléchargez tous les documents requis pour continuer</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { key: 'passeport_url', label: 'Passeport (gérant) *' },
                { key: 'doc_selfie_url', label: 'Vidéo de vérification selfie *' },
              ].map(d => (
                <div key={d.key} className="border border-[#E5E7EB] rounded-xl p-4 bg-white">
                  <p className="text-sm font-medium text-[#1A1A1A] mb-3">{d.label}</p>
                  {docs[d.key] ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs">Téléchargé</span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-lg p-4 cursor-pointer hover:border-[#1A1A1A] transition-all">
                      <Upload className="w-5 h-5 text-[#9B9B9B] mb-1" />
                      <span className="text-xs text-[#9B9B9B]">{uploading[d.key] ? 'Téléchargement...' : 'Cliquez pour télécharger'}</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.mp4"
                        onChange={e => e.target.files[0] && handleUpload(d.key, e.target.files[0])} />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="border border-[#E5E7EB] rounded-xl p-4 bg-white mb-6 flex items-start gap-3">
              <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 accent-blue-600" />
              <label htmlFor="terms" className="text-sm text-[#1A1A1A] cursor-pointer">
                J'accepte les termes et conditions et certifie que les informations fournies sont exactes et conformes à la réglementation en vigueur à Djibouti.
              </label>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-8 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>← Retour</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} className="bg-[#1A1A1A] hover:bg-[#333] text-white px-8">
              Suivant →
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-700 hover:bg-green-800 text-white px-8">
              {submitting ? 'Soumission...' : 'Soumettre le dossier'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}