import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Calendar, MapPin, Users, DollarSign, Briefcase, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DueDiligenceSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery && !registrationNumber) {
      toast.error('Veuillez saisir un nom d\'entreprise ou un numéro d\'enregistrement');
      return;
    }

    setSearching(true);
    setResult(null);

    try {
      const response = await meras.functions.invoke('dueDiligenceSearch', {
        company_name: searchQuery,
        registration_number: registrationNumber
      });

      if (response.data.success) {
        setResult(response.data);
        toast.success('Entreprise trouvée dans le registre ODPIC');
      } else {
        toast.error(response.data.message || 'Aucune entreprise trouvée');
        setResult(null);
      }
    } catch (error) {
      toast.error('Erreur lors de la recherche');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Recherche Due Diligence - Registre ODPIC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Nom de l'entreprise
              </label>
              <Input
                placeholder="Ex: PELVO SARL"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Numéro d'enregistrement
              </label>
              <Input
                placeholder="Ex: DJ/2023/12345"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={searching || (!searchQuery && !registrationNumber)}
            className="bg-[#1A1A1A] hover:bg-[#2A2A2A] w-full md:w-auto"
          >
            {searching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Rechercher
              </>
            )}
          </Button>

          <p className="text-xs text-[#6B6B6B] mt-4">
            Source: <a href="https://odpic.dj/publication-registre/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Registre ODPIC - Office Djiboutien de la Propriété Industrielle et Commerciale
            </a>
          </p>
        </CardContent>
      </Card>

      {result && result.success && result.data && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                {result.data.raison_sociale}
              </span>
              <Badge className="bg-green-100 text-green-800">
                Vérifiée
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Numéro d'enregistrement</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.numero_enregistrement || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Forme juridique</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.forme_juridique || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Date d'immatriculation</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.date_immatriculation || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Siège social</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.siege_social || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Capital social</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.capital_social || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Activité principale</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.activite_principale || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Dirigeants</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.dirigeants || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#6B6B6B] mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6B6B6B]">NIF</p>
                    <p className="font-semibold text-[#1A1A1A]">{result.data.nif || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                  <AlertCircle className="w-4 h-4" />
                  Vérifié le {new Date(result.timestamp).toLocaleDateString('fr-FR')} via {result.source}
                </div>
                <Badge className={result.data.statut === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {result.data.statut || 'Actif'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}