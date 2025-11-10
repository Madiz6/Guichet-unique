import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Plus } from 'lucide-react';
import { base44 } from "@/api/base44Client";

export function PersonalInfoSection({ formData, setFormData, validationErrors }) {
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Card className="border-[#E8ECF2] shadow-sm">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#0A2540] mb-4">👤 Informations Personnelles</h3>
        
        {/* Photo Upload */}
        <div className="flex flex-col items-center mb-6">
          {formData.photo_url ? (
            <div className="relative">
              <img src={formData.photo_url} alt="Photo" className="w-24 h-24 rounded-full object-cover border-4 border-[#E8ECF2]" />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, photo_url: null })}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-white text-2xl font-bold hover:opacity-80 transition-opacity">
                {uploadingPhoto ? '...' : <Upload className="w-8 h-8" />}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo_url')} disabled={uploadingPhoto} />
            </label>
          )}
          <p className="text-sm text-[#697586] mt-2">Photo de profil</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#425466]">Prénom <span className="text-red-500">*</span></Label>
            <Input
              value={formData.prenom || ''}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.prenom ? 'border-red-500' : ''}`}
              placeholder="Ex: Mohamed"
            />
            {validationErrors.prenom && <p className="text-red-500 text-xs mt-1">{validationErrors.prenom}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Nom <span className="text-red-500">*</span></Label>
            <Input
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.nom ? 'border-red-500' : ''}`}
              placeholder="Ex: Ahmed"
            />
            {validationErrors.nom && <p className="text-red-500 text-xs mt-1">{validationErrors.nom}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Date de Naissance <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={formData.date_naissance || ''}
              onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.date_naissance ? 'border-red-500' : ''}`}
            />
            {validationErrors.date_naissance && <p className="text-red-500 text-xs mt-1">{validationErrors.date_naissance}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Sexe <span className="text-red-500">*</span></Label>
            <Select
              value={formData.sexe}
              onValueChange={(value) => setFormData({ ...formData, sexe: value })}
            >
              <SelectTrigger className={`border-[#D3DCE6] mt-2 ${validationErrors.sexe ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Homme">Homme</SelectItem>
                <SelectItem value="Femme">Femme</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.sexe && <p className="text-red-500 text-xs mt-1">{validationErrors.sexe}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Nationalité <span className="text-red-500">*</span></Label>
            <Input
              value={formData.nationalite || ''}
              onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.nationalite ? 'border-red-500' : ''}`}
              placeholder="Ex: Djiboutienne"
            />
            {validationErrors.nationalite && <p className="text-red-500 text-xs mt-1">{validationErrors.nationalite}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Ville <span className="text-red-500">*</span></Label>
            <Input
              value={formData.ville || ''}
              onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.ville ? 'border-red-500' : ''}`}
              placeholder="Ex: Djibouti"
            />
            {validationErrors.ville && <p className="text-red-500 text-xs mt-1">{validationErrors.ville}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Téléphone <span className="text-red-500">*</span></Label>
            <Input
              value={formData.telephone || ''}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.telephone ? 'border-red-500' : ''}`}
              placeholder="Ex: +253 77 XX XX XX"
            />
            {validationErrors.telephone && <p className="text-red-500 text-xs mt-1">{validationErrors.telephone}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Email</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border-[#D3DCE6] mt-2"
              placeholder="Ex: mohamed@example.com"
            />
          </div>

          <div>
            <Label className="text-[#425466]">Situation Familiale</Label>
            <Select
              value={formData.situation_familiale}
              onValueChange={(value) => setFormData({ ...formData, situation_familiale: value })}
            >
              <SelectTrigger className="border-[#D3DCE6] mt-2">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Célibataire">Célibataire</SelectItem>
                <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#425466]">Nombre d'Enfants</Label>
            <Input
              type="number"
              value={formData.nombre_enfants || 0}
              onChange={(e) => setFormData({ ...formData, nombre_enfants: parseInt(e.target.value) || 0 })}
              className="border-[#D3DCE6] mt-2"
            />
          </div>

          <div>
            <Label className="text-[#425466]">Nom de la Mère</Label>
            <Input
              value={formData.nom_mere || ''}
              onChange={(e) => setFormData({ ...formData, nom_mere: e.target.value })}
              className="border-[#D3DCE6] mt-2"
              placeholder="Ex: Fatima Hassan"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentsSection({ formData, setFormData, validationErrors }) {
  const [uploading, setUploading] = React.useState(false);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-[#E8ECF2] shadow-sm">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#0A2540] mb-4">📄 Documents</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#425466]">Type d'Identité <span className="text-red-500">*</span></Label>
            <Select
              value={formData.type_identite}
              onValueChange={(value) => setFormData({ ...formData, type_identite: value })}
            >
              <SelectTrigger className={`border-[#D3DCE6] mt-2 ${validationErrors.type_identite ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Carte d'identité">Carte d'identité</SelectItem>
                <SelectItem value="Passeport">Passeport</SelectItem>
                <SelectItem value="Permis de séjour">Permis de séjour</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.type_identite && <p className="text-red-500 text-xs mt-1">{validationErrors.type_identite}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Numéro d'Identité <span className="text-red-500">*</span></Label>
            <Input
              value={formData.numero_identite || ''}
              onChange={(e) => setFormData({ ...formData, numero_identite: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.numero_identite ? 'border-red-500' : ''}`}
              placeholder="Ex: 123456789"
            />
            {validationErrors.numero_identite && <p className="text-red-500 text-xs mt-1">{validationErrors.numero_identite}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Document d'Identité</Label>
            <div className="mt-2">
              {formData.document_identite_url ? (
                <div className="flex items-center gap-2">
                  <a href={formData.document_identite_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0066FF] hover:underline">
                    Voir le document
                  </a>
                  <button type="button" onClick={() => setFormData({ ...formData, document_identite_url: null })} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-[#D3DCE6] rounded-lg p-4 text-center hover:border-[#0066FF] transition-colors">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-[#697586]" />
                    <p className="text-sm text-[#697586]">{uploading ? 'Upload...' : 'Télécharger'}</p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'document_identite_url')} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[#425466]">Type de Contrat <span className="text-red-500">*</span></Label>
            <Select
              value={formData.type_contrat}
              onValueChange={(value) => setFormData({ ...formData, type_contrat: value })}
            >
              <SelectTrigger className={`border-[#D3DCE6] mt-2 ${validationErrors.type_contrat ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Temps Plein">Temps Plein</SelectItem>
                <SelectItem value="Temps Partiel">Temps Partiel</SelectItem>
                <SelectItem value="CDD">CDD</SelectItem>
                <SelectItem value="CDI">CDI</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.type_contrat && <p className="text-red-500 text-xs mt-1">{validationErrors.type_contrat}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Contrat de Travail</Label>
            <div className="mt-2">
              {formData.contrat_url ? (
                <div className="flex items-center gap-2">
                  <a href={formData.contrat_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0066FF] hover:underline">
                    Voir le contrat
                  </a>
                  <button type="button" onClick={() => setFormData({ ...formData, contrat_url: null })} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-[#D3DCE6] rounded-lg p-4 text-center hover:border-[#0066FF] transition-colors">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-[#697586]" />
                    <p className="text-sm text-[#697586]">{uploading ? 'Upload...' : 'Télécharger'}</p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'contrat_url')} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfessionalInfoSection({ formData, setFormData, validationErrors }) {
  return (
    <Card className="border-[#E8ECF2] shadow-sm">
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#0A2540] mb-4">💼 Informations Professionnelles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#425466]">Fonction/Poste <span className="text-red-500">*</span></Label>
            <Input
              value={formData.fonction || ''}
              onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.fonction ? 'border-red-500' : ''}`}
              placeholder="Ex: Comptable"
            />
            {validationErrors.fonction && <p className="text-red-500 text-xs mt-1">{validationErrors.fonction}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Département <span className="text-red-500">*</span></Label>
            <Input
              value={formData.departement || ''}
              onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.departement ? 'border-red-500' : ''}`}
              placeholder="Ex: Finance"
            />
            {validationErrors.departement && <p className="text-red-500 text-xs mt-1">{validationErrors.departement}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Date d'Embauche <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={formData.date_embauche || ''}
              onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.date_embauche ? 'border-red-500' : ''}`}
            />
            {validationErrors.date_embauche && <p className="text-red-500 text-xs mt-1">{validationErrors.date_embauche}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Fréquence de Paiement</Label>
            <Select
              value={formData.frequence_paiement || 'Mensuel'}
              onValueChange={(value) => setFormData({ ...formData, frequence_paiement: value })}
            >
              <SelectTrigger className="border-[#D3DCE6] mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mensuel">Mensuel</SelectItem>
                <SelectItem value="Bimensuel">Bimensuel</SelectItem>
                <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#425466]">Régime CNSS <span className="text-red-500">*</span></Label>
            <Select
              value={formData.regime_cnss}
              onValueChange={(value) => setFormData({ ...formData, regime_cnss: value })}
            >
              <SelectTrigger className={`border-[#D3DCE6] mt-2 ${validationErrors.regime_cnss ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Général">Régime Général</SelectItem>
                <SelectItem value="Zone Franche">Zone Franche</SelectItem>
                <SelectItem value="Fonctionnaire">Fonctionnaire</SelectItem>
                <SelectItem value="FNP">FNP</SelectItem>
                <SelectItem value="Gouvernement">Gouvernement</SelectItem>
                <SelectItem value="Indépendant">Indépendant</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.regime_cnss && <p className="text-red-500 text-xs mt-1">{validationErrors.regime_cnss}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Matricule CNSS</Label>
            <Input
              value={formData.matricule_cnss || ''}
              onChange={(e) => setFormData({ ...formData, matricule_cnss: e.target.value })}
              className="border-[#D3DCE6] mt-2"
              placeholder="Ex: 123456"
            />
          </div>

          <div>
            <Label className="text-[#425466]">Banque <span className="text-red-500">*</span></Label>
            <Select
              value={formData.banque}
              onValueChange={(value) => setFormData({ ...formData, banque: value })}
            >
              <SelectTrigger className={`border-[#D3DCE6] mt-2 ${validationErrors.banque ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BCIMR">BCIMR</SelectItem>
                <SelectItem value="CAC International Bank">CAC International Bank</SelectItem>
                <SelectItem value="EXIM Bank">EXIM Bank</SelectItem>
                <SelectItem value="Salaam African Bank">Salaam African Bank</SelectItem>
                <SelectItem value="Saba African Bank">Saba African Bank</SelectItem>
                <SelectItem value="Bank of Africa">Bank of Africa</SelectItem>
                <SelectItem value="East Africa Bank">East Africa Bank</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.banque && <p className="text-red-500 text-xs mt-1">{validationErrors.banque}</p>}
          </div>

          <div>
            <Label className="text-[#425466]">Numéro de Compte <span className="text-red-500">*</span></Label>
            <Input
              value={formData.numero_compte || ''}
              onChange={(e) => setFormData({ ...formData, numero_compte: e.target.value })}
              className={`border-[#D3DCE6] mt-2 ${validationErrors.numero_compte ? 'border-red-500' : ''}`}
              placeholder="Ex: 123456789"
            />
            {validationErrors.numero_compte && <p className="text-red-500 text-xs mt-1">{validationErrors.numero_compte}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RemunerationSection({ formData, setFormData, validationErrors }) {
  const [customPrimes, setCustomPrimes] = React.useState(formData.primes_personnalisees || []);
  const [newPrimeName, setNewPrimeName] = React.useState('');
  const [newPrimeMontant, setNewPrimeMontant] = React.useState('');

  const addCustomPrime = () => {
    if (!newPrimeName || !newPrimeMontant) return;
    
    const newPrime = {
      nom: newPrimeName,
      montant: parseFloat(newPrimeMontant)
    };
    
    const updatedPrimes = [...customPrimes, newPrime];
    setCustomPrimes(updatedPrimes);
    setFormData({ ...formData, primes_personnalisees: updatedPrimes });
    setNewPrimeName('');
    setNewPrimeMontant('');
  };

  const removeCustomPrime = (index) => {
    const updatedPrimes = customPrimes.filter((_, i) => i !== index);
    setCustomPrimes(updatedPrimes);
    setFormData({ ...formData, primes_personnalisees: updatedPrimes });
  };

  const primeOptions = [
    { key: 'prime_fonction', label: 'Prime de Fonction' },
    { key: 'prime_logement', label: 'Prime de Logement' },
    { key: 'prime_transport', label: 'Prime de Transport' },
    { key: 'prime_sujetion', label: 'Prime de Sujétion' },
    { key: 'prime_rendement', label: 'Prime de Rendement' },
    { key: 'autres_primes', label: 'Autres Primes' }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-[#E8ECF2] shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
            💰 Rémunération de Base
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#425466]">
                Salaire de Base (DJF) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.salaire_base || ''}
                onChange={(e) => setFormData({ ...formData, salaire_base: parseFloat(e.target.value) })}
                className={`border-[#D3DCE6] mt-2 ${validationErrors.salaire_base ? 'border-red-500' : ''}`}
                placeholder="Ex: 150000"
              />
              {validationErrors.salaire_base && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.salaire_base}</p>
              )}
            </div>

            <div>
              <Label className="text-[#425466] flex items-center gap-2">
                Prime d'Ancienneté
                <input
                  type="checkbox"
                  checked={formData.prime_anciennete_auto !== false}
                  onChange={(e) => setFormData({ ...formData, prime_anciennete_auto: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-xs text-[#697586]">Auto</span>
              </Label>
              <Input
                type="number"
                value={formData.prime_anciennete || 0}
                onChange={(e) => setFormData({ ...formData, prime_anciennete: parseFloat(e.target.value) })}
                className="border-[#D3DCE6] mt-2"
                disabled={formData.prime_anciennete_auto !== false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard Primes */}
      <Card className="border-[#E8ECF2] shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
            ⭐ Primes Standards
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primeOptions.map((prime) => (
              <div key={prime.key}>
                <Label className="text-[#425466]">{prime.label} (DJF)</Label>
                <Input
                  type="number"
                  value={formData[prime.key] || 0}
                  onChange={(e) => setFormData({ ...formData, [prime.key]: parseFloat(e.target.value) || 0 })}
                  className="border-[#D3DCE6] mt-2"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Primes */}
      <Card className="border-[#E8ECF2] shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
            🎯 Primes Personnalisées
          </h3>
          
          {customPrimes.length > 0 && (
            <div className="space-y-2 mb-4">
              {customPrimes.map((prime, index) => (
                <div key={index} className="flex items-center justify-between bg-[#F7F9FC] p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-[#0A2540]">{prime.nom}</p>
                    <p className="text-sm text-[#697586]">{prime.montant.toLocaleString()} DJF</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomPrime(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nom de la prime"
              value={newPrimeName}
              onChange={(e) => setNewPrimeName(e.target.value)}
              className="border-[#D3DCE6]"
            />
            <Input
              type="number"
              placeholder="Montant"
              value={newPrimeMontant}
              onChange={(e) => setNewPrimeMontant(e.target.value)}
              className="border-[#D3DCE6]"
            />
            <Button
              type="button"
              onClick={addCustomPrime}
              variant="outline"
              className="border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF] hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deductions */}
      <Card className="border-[#E8ECF2] shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
            📉 Déductions
          </h3>
          
          <div>
            <Label className="text-[#425466]">AIDE (DJF)</Label>
            <Input
              type="number"
              value={formData.aide || 0}
              onChange={(e) => setFormData({ ...formData, aide: parseFloat(e.target.value) || 0 })}
              className="border-[#D3DCE6] mt-2"
              placeholder="0"
            />
            <p className="text-xs text-[#697586] mt-1">Montant fixe de déduction AIDE</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}