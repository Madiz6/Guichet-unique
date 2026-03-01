import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, X, Plus, User, Mail, Phone, MapPin, Heart, Users, FileText, Briefcase, Building2, CreditCard, DollarSign, Star, Target, TrendingDown } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import SmartDatePicker from "./SmartDatePicker";

const NATIONALITIES = [
  'Djiboutienne', 'Éthiopienne', 'Somalienne', 'Érythréenne', 'Française', 'Américaine',
  'Britannique', 'Allemande', 'Italienne', 'Espagnole', 'Marocaine', 'Tunisienne',
  'Algérienne', 'Sénégalaise', 'Camerounaise', 'Ivoirienne', 'Kenyane', 'Tanzanienne',
  'Autre'
];

const CITIES = ['Djibouti', 'Ali Sabieh', 'Tadjourah', 'Obock', 'Dikhil', 'Arta', 'Autre'];

const DEPARTMENTS = [
  'Direction Générale', 'Finance & Comptabilité', 'Ressources Humaines', 'Commercial & Ventes',
  'Marketing', 'Informatique & IT', 'Juridique', 'Logistique', 'Production', 'Qualité',
  'Administration', 'Autre'
];

// --- Shared styled field wrapper ---
function Field({ icon: Icon, iconColor = 'text-indigo-500', label, required, error, children }) {
  return (
    <div className="group">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      </div>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function StyledInput({ error, ...props }) {
  return (
    <Input
      {...props}
      className={`h-11 rounded-xl border-2 bg-white transition-all ${
        error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-indigo-400'
      } font-medium placeholder:font-normal placeholder:text-gray-300`}
    />
  );
}

function StyledSelect({ error, value, onValueChange, placeholder, children }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`h-11 rounded-xl border-2 bg-white transition-all ${
        error ? 'border-red-300' : 'border-gray-200 focus:border-indigo-400'
      } font-medium`}>
        <SelectValue placeholder={placeholder || 'Sélectionner...'} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
        {children}
      </SelectContent>
    </Select>
  );
}

function SectionCard({ gradient, icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">{title}</h3>
            {subtitle && <p className="text-white/70 text-xs">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

// ─── STEP 1: Personal Info ───────────────────────────────────────────────────
export function PersonalInfoSection({ formData, setFormData, validationErrors }) {
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const set = (key) => (val) => setFormData({ ...formData, [key]: val });
  const setE = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  return (
    <div className="space-y-5">
      <SectionCard gradient="from-violet-600 to-indigo-600" icon={User} title="Informations Personnelles" subtitle="Identité civile de l'employé">
        {/* Photo */}
        <div className="flex justify-center mb-2">
          {formData.photo_url ? (
            <div className="relative">
              <img src={formData.photo_url} alt="Photo" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-100" />
              <button type="button" onClick={() => setFormData({ ...formData, photo_url: null })}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex flex-col items-center justify-center text-white hover:opacity-90 transition-opacity shadow-lg">
                {uploadingPhoto ? <div className="text-xs">...</div> : <>
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Photo</span>
                </>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_url')} disabled={uploadingPhoto} />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={User} label="Prénom" required error={validationErrors.prenom}>
            <StyledInput value={formData.prenom || ''} onChange={setE('prenom')} placeholder="Ex: Mohamed" error={validationErrors.prenom} />
          </Field>
          <Field icon={User} label="Nom" required error={validationErrors.nom}>
            <StyledInput value={formData.nom || ''} onChange={setE('nom')} placeholder="Ex: Ahmed" error={validationErrors.nom} />
          </Field>
        </div>

        <SmartDatePicker
          label="Date de Naissance"
          required
          value={formData.date_naissance || ''}
          onChange={set('date_naissance')}
          error={validationErrors.date_naissance}
          minYear={1940}
          maxYear={new Date().getFullYear() - 16}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={Users} label="Sexe" required error={validationErrors.sexe}>
            <StyledSelect value={formData.sexe} onValueChange={set('sexe')} placeholder="Sélectionner" error={validationErrors.sexe}>
              <SelectItem value="Homme">👨 Homme</SelectItem>
              <SelectItem value="Femme">👩 Femme</SelectItem>
            </StyledSelect>
            {validationErrors.sexe && <p className="text-red-500 text-xs mt-1">{validationErrors.sexe}</p>}
          </Field>

          <Field icon={MapPin} label="Nationalité" required error={validationErrors.nationalite}>
            <StyledSelect value={formData.nationalite} onValueChange={set('nationalite')} placeholder="Sélectionner" error={validationErrors.nationalite}>
              {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </StyledSelect>
            {validationErrors.nationalite && <p className="text-red-500 text-xs mt-1">{validationErrors.nationalite}</p>}
          </Field>

          <Field icon={MapPin} label="Ville" required error={validationErrors.ville}>
            <StyledSelect value={formData.ville} onValueChange={set('ville')} placeholder="Sélectionner" error={validationErrors.ville}>
              {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </StyledSelect>
            {validationErrors.ville && <p className="text-red-500 text-xs mt-1">{validationErrors.ville}</p>}
          </Field>

          <Field icon={Phone} label="Téléphone" required error={validationErrors.telephone}>
            <StyledInput value={formData.telephone || ''} onChange={setE('telephone')} placeholder="+253 77 XX XX XX" error={validationErrors.telephone} />
          </Field>

          <Field icon={Mail} label="Email">
            <StyledInput type="email" value={formData.email || ''} onChange={setE('email')} placeholder="nom@exemple.com" />
          </Field>

          <Field icon={Heart} label="Situation Familiale">
            <StyledSelect value={formData.situation_familiale} onValueChange={set('situation_familiale')} placeholder="Sélectionner">
              <SelectItem value="Célibataire">💍 Célibataire</SelectItem>
              <SelectItem value="Marié(e)">👫 Marié(e)</SelectItem>
              <SelectItem value="Divorcé(e)">💔 Divorcé(e)</SelectItem>
              <SelectItem value="Veuf(ve)">🕊️ Veuf(ve)</SelectItem>
            </StyledSelect>
          </Field>

          <Field icon={Users} label="Nombre d'Enfants">
            <StyledSelect value={String(formData.nombre_enfants ?? 0)} onValueChange={(v) => setFormData({ ...formData, nombre_enfants: parseInt(v) })}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </StyledSelect>
          </Field>

          <Field icon={User} label="Nom de la Mère">
            <StyledInput value={formData.nom_mere || ''} onChange={setE('nom_mere')} placeholder="Ex: Fatima Hassan" />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── STEP 2: Documents ────────────────────────────────────────────────────────
export function DocumentsSection({ formData, setFormData, validationErrors }) {
  const [uploading, setUploading] = React.useState({});

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  };

  const set = (key) => (val) => setFormData({ ...formData, [key]: val });
  const setE = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const UploadZone = ({ field, label }) => (
    <div>
      {formData[field] ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-green-600" />
          </div>
          <a href={formData[field]} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 font-medium hover:underline flex-1">
            Voir le document ↗
          </a>
          <button type="button" onClick={() => setFormData({ ...formData, [field]: null })} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-indigo-200 rounded-xl p-5 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
            <Upload className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
            <p className="text-sm font-medium text-indigo-600">{uploading[field] ? 'Upload en cours...' : label}</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG</p>
          </div>
          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, field)} disabled={uploading[field]} />
        </label>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <SectionCard gradient="from-blue-600 to-cyan-500" icon={FileText} title="Documents d'Identité" subtitle="Pièces officielles">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={FileText} label="Type d'Identité" required error={validationErrors.type_identite}>
            <StyledSelect value={formData.type_identite} onValueChange={set('type_identite')} placeholder="Sélectionner" error={validationErrors.type_identite}>
              <SelectItem value="Carte d'identité">🪪 Carte d'identité</SelectItem>
              <SelectItem value="Passeport">🛂 Passeport</SelectItem>
              <SelectItem value="Permis de séjour">📋 Permis de séjour</SelectItem>
            </StyledSelect>
            {validationErrors.type_identite && <p className="text-red-500 text-xs mt-1">{validationErrors.type_identite}</p>}
          </Field>

          <Field icon={FileText} label="Numéro d'Identité" required error={validationErrors.numero_identite}>
            <StyledInput value={formData.numero_identite || ''} onChange={setE('numero_identite')} placeholder="Ex: 123456789" error={validationErrors.numero_identite} />
          </Field>
        </div>

        <Field label="Scanner du Document d'Identité">
          <UploadZone field="document_identite_url" label="Télécharger la pièce d'identité" />
        </Field>
      </SectionCard>

      <SectionCard gradient="from-emerald-600 to-teal-500" icon={Briefcase} title="Contrat de Travail" subtitle="Type de contrat et documents">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={Briefcase} label="Type de Contrat" required error={validationErrors.type_contrat}>
            <StyledSelect value={formData.type_contrat} onValueChange={set('type_contrat')} placeholder="Sélectionner" error={validationErrors.type_contrat}>
              <SelectItem value="CDI">🏢 CDI — Durée Indéterminée</SelectItem>
              <SelectItem value="CDD">📅 CDD — Durée Déterminée</SelectItem>
              <SelectItem value="Temps Plein">⏰ Temps Plein</SelectItem>
              <SelectItem value="Temps Partiel">🕐 Temps Partiel</SelectItem>
            </StyledSelect>
            {validationErrors.type_contrat && <p className="text-red-500 text-xs mt-1">{validationErrors.type_contrat}</p>}
          </Field>
        </div>

        <Field label="Contrat de Travail (scan)">
          <UploadZone field="contrat_url" label="Télécharger le contrat" />
        </Field>
      </SectionCard>
    </div>
  );
}

// ─── STEP 3: Professional Info ────────────────────────────────────────────────
export function ProfessionalInfoSection({ formData, setFormData, validationErrors }) {
  const set = (key) => (val) => setFormData({ ...formData, [key]: val });
  const setE = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  return (
    <div className="space-y-5">
      <SectionCard gradient="from-orange-500 to-pink-500" icon={Briefcase} title="Poste & Département" subtitle="Rôle dans l'entreprise">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={Briefcase} label="Fonction / Poste" required error={validationErrors.fonction}>
            <StyledInput value={formData.fonction || ''} onChange={setE('fonction')} placeholder="Ex: Comptable, Développeur..." error={validationErrors.fonction} />
          </Field>

          <Field icon={Building2} label="Département" required error={validationErrors.departement}>
            <StyledSelect value={formData.departement} onValueChange={set('departement')} placeholder="Choisir département" error={validationErrors.departement}>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </StyledSelect>
            {validationErrors.departement && <p className="text-red-500 text-xs mt-1">{validationErrors.departement}</p>}
          </Field>
        </div>

        <SmartDatePicker
          label="Date d'Embauche"
          required
          value={formData.date_embauche || ''}
          onChange={set('date_embauche')}
          error={validationErrors.date_embauche}
          minYear={1990}
          maxYear={new Date().getFullYear() + 1}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Fréquence de Paiement">
            <StyledSelect value={formData.frequence_paiement || 'Mensuel'} onValueChange={set('frequence_paiement')}>
              <SelectItem value="Mensuel">📅 Mensuel</SelectItem>
              <SelectItem value="Bimensuel">📆 Bimensuel</SelectItem>
              <SelectItem value="Hebdomadaire">🗓️ Hebdomadaire</SelectItem>
            </StyledSelect>
          </Field>

          <Field label="Régime CNSS" required error={validationErrors.regime_cnss}>
            <StyledSelect value={formData.regime_cnss} onValueChange={set('regime_cnss')} placeholder="Régime" error={validationErrors.regime_cnss}>
              <SelectItem value="Général">Régime Général</SelectItem>
              <SelectItem value="Zone Franche">Zone Franche</SelectItem>
              <SelectItem value="Fonctionnaire">Fonctionnaire</SelectItem>
              <SelectItem value="FNP">FNP</SelectItem>
              <SelectItem value="Gouvernement">Gouvernement</SelectItem>
              <SelectItem value="Indépendant">Indépendant</SelectItem>
            </StyledSelect>
            {validationErrors.regime_cnss && <p className="text-red-500 text-xs mt-1">{validationErrors.regime_cnss}</p>}
          </Field>

          <Field label="Matricule CNSS">
            <StyledInput value={formData.matricule_cnss || ''} onChange={setE('matricule_cnss')} placeholder="Ex: 123456" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard gradient="from-slate-700 to-slate-500" icon={CreditCard} title="Informations Bancaires" subtitle="Pour le virement du salaire">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={Building2} label="Banque" required error={validationErrors.banque}>
            <StyledSelect value={formData.banque} onValueChange={set('banque')} placeholder="Choisir banque" error={validationErrors.banque}>
              <SelectItem value="BCIMR">🏦 BCIMR</SelectItem>
              <SelectItem value="CAC International Bank">🏦 CAC International Bank</SelectItem>
              <SelectItem value="EXIM Bank">🏦 EXIM Bank</SelectItem>
              <SelectItem value="Salaam African Bank">🏦 Salaam African Bank</SelectItem>
              <SelectItem value="Saba African Bank">🏦 Saba African Bank</SelectItem>
              <SelectItem value="Bank of Africa">🏦 Bank of Africa</SelectItem>
              <SelectItem value="East Africa Bank">🏦 East Africa Bank</SelectItem>
            </StyledSelect>
            {validationErrors.banque && <p className="text-red-500 text-xs mt-1">{validationErrors.banque}</p>}
          </Field>

          <Field icon={CreditCard} label="Numéro de Compte" required error={validationErrors.numero_compte}>
            <StyledInput value={formData.numero_compte || ''} onChange={setE('numero_compte')} placeholder="Ex: 123456789" error={validationErrors.numero_compte} />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── STEP 4: Remuneration ─────────────────────────────────────────────────────
export function RemunerationSection({ formData, setFormData, validationErrors }) {
  const [customPrimes, setCustomPrimes] = React.useState(formData.primes_personnalisees || []);
  const [newPrimeName, setNewPrimeName] = React.useState('');
  const [newPrimeMontant, setNewPrimeMontant] = React.useState('');

  const addCustomPrime = () => {
    if (!newPrimeName || !newPrimeMontant) return;
    const updated = [...customPrimes, { nom: newPrimeName, montant: parseFloat(newPrimeMontant) }];
    setCustomPrimes(updated);
    setFormData({ ...formData, primes_personnalisees: updated });
    setNewPrimeName('');
    setNewPrimeMontant('');
  };

  const removeCustomPrime = (i) => {
    const updated = customPrimes.filter((_, idx) => idx !== i);
    setCustomPrimes(updated);
    setFormData({ ...formData, primes_personnalisees: updated });
  };

  const setNum = (key) => (e) => setFormData({ ...formData, [key]: parseFloat(e.target.value) || 0 });

  const totalGross = (
    (parseFloat(formData.salaire_base) || 0) +
    (parseFloat(formData.prime_anciennete) || 0) +
    (parseFloat(formData.prime_fonction) || 0) +
    (parseFloat(formData.prime_logement) || 0) +
    (parseFloat(formData.prime_transport) || 0) +
    (parseFloat(formData.prime_sujetion) || 0) +
    (parseFloat(formData.prime_rendement) || 0) +
    (parseFloat(formData.autres_primes) || 0) +
    customPrimes.reduce((s, p) => s + p.montant, 0)
  );

  const primeOptions = [
    { key: 'prime_fonction', label: 'Prime de Fonction', icon: '💼' },
    { key: 'prime_logement', label: 'Prime de Logement', icon: '🏠' },
    { key: 'prime_transport', label: 'Prime de Transport', icon: '🚗' },
    { key: 'prime_sujetion', label: 'Prime de Sujétion', icon: '⚙️' },
    { key: 'prime_rendement', label: 'Prime de Rendement', icon: '📈' },
    { key: 'autres_primes', label: 'Autres Primes', icon: '🎁' },
  ];

  return (
    <div className="space-y-5">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
        <p className="text-white/80 text-sm font-medium mb-1">Salaire Brut Total Estimé</p>
        <p className="text-4xl font-bold tracking-tight">{totalGross.toLocaleString('fr-FR')} <span className="text-2xl font-semibold text-white/80">DJF</span></p>
        <p className="text-white/60 text-xs mt-1">Base + toutes primes</p>
      </div>

      <SectionCard gradient="from-green-600 to-emerald-500" icon={DollarSign} title="Salaire de Base" subtitle="Rémunération principale">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={DollarSign} label="Salaire de Base (DJF)" required error={validationErrors.salaire_base}>
            <StyledInput type="number" value={formData.salaire_base || ''} onChange={setNum('salaire_base')} placeholder="Ex: 150 000" error={validationErrors.salaire_base} />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Prime d'Ancienneté</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">Auto</span>
                <div
                  onClick={() => setFormData({ ...formData, prime_anciennete_auto: !(formData.prime_anciennete_auto !== false) })}
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${formData.prime_anciennete_auto !== false ? 'bg-indigo-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.prime_anciennete_auto !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
            <StyledInput
              type="number"
              value={formData.prime_anciennete || 0}
              onChange={setNum('prime_anciennete')}
              disabled={formData.prime_anciennete_auto !== false}
              placeholder="Calculée automatiquement"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard gradient="from-amber-500 to-orange-500" icon={Star} title="Primes Standards" subtitle="Avantages et compléments de salaire">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {primeOptions.map(p => (
            <div key={p.key}>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <span>{p.icon}</span> {p.label} (DJF)
              </label>
              <StyledInput type="number" value={formData[p.key] || 0} onChange={setNum(p.key)} placeholder="0" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard gradient="from-purple-600 to-pink-500" icon={Target} title="Primes Personnalisées" subtitle="Bonus et avantages spécifiques">
        {customPrimes.length > 0 && (
          <div className="space-y-2 mb-4">
            {customPrimes.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-purple-50 border border-purple-100 px-4 py-3 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{p.nom}</p>
                  <p className="text-xs text-purple-600 font-medium">{p.montant.toLocaleString()} DJF</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomPrime(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StyledInput placeholder="Nom de la prime" value={newPrimeName} onChange={(e) => setNewPrimeName(e.target.value)} />
          <StyledInput type="number" placeholder="Montant (DJF)" value={newPrimeMontant} onChange={(e) => setNewPrimeMontant(e.target.value)} />
          <Button type="button" onClick={addCustomPrime} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
      </SectionCard>

      <SectionCard gradient="from-red-500 to-rose-600" icon={TrendingDown} title="Déductions" subtitle="Retenues fixes">
        <Field icon={TrendingDown} label="AIDE (DJF)">
          <StyledInput type="number" value={formData.aide || 0} onChange={(e) => setFormData({ ...formData, aide: parseFloat(e.target.value) || 0 })} placeholder="0" />
          <p className="text-xs text-gray-400 mt-1">Montant fixe déduit du salaire net</p>
        </Field>
      </SectionCard>
    </div>
  );
}