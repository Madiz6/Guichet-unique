import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkEmployeeImport({ onClose }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();
  
  const downloadTemplate = () => {
    const template = `Prénom,Nom,Email,Téléphone,Ville,Date de naissance,Sexe,Nationalité,Type de contrat,Fonction,Département,Date d'embauche,Régime CNSS,Matricule CNSS,Banque,Numéro de compte,Salaire de base,Prime ancienneté,Prime rendement
Jean,Dupont,jean.dupont@example.com,+253 77 12 34 56,Djibouti,1990-05-15,Homme,Djiboutien,CDI,Comptable,Finance,2023-01-15,Général,12345678,BCI,001234567890,250000,10000,5000
Marie,Martin,marie.martin@example.com,+253 77 98 76 54,Djibouti,1985-08-20,Femme,Djiboutienne,CDI,RH Manager,Ressources Humaines,2022-06-01,Général,87654321,SABA,009876543210,350000,15000,10000`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-employes.csv';
    a.click();
  };
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
  };
  
  const parseCSV = (text) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      data.push(row);
    }
    
    return data;
  };
  
  const mapCSVToEmployee = (csvRow) => {
    return {
      prenom: csvRow['Prénom'],
      nom: csvRow['Nom'],
      email: csvRow['Email'],
      telephone: csvRow['Téléphone'],
      ville: csvRow['Ville'],
      date_naissance: csvRow['Date de naissance'],
      sexe: csvRow['Sexe'],
      nationalite: csvRow['Nationalité'],
      type_contrat: csvRow['Type de contrat'],
      fonction: csvRow['Fonction'],
      departement: csvRow['Département'],
      date_embauche: csvRow['Date d\'embauche'],
      regime_cnss: csvRow['Régime CNSS'],
      matricule_cnss: csvRow['Matricule CNSS'],
      banque: csvRow['Banque'],
      numero_compte: csvRow['Numéro de compte'],
      salaire_base: parseFloat(csvRow['Salaire de base']) || 0,
      prime_anciennete: parseFloat(csvRow['Prime ancienneté']) || 0,
      prime_rendement: parseFloat(csvRow['Prime rendement']) || 0,
      prime_sujetion: 0,
      prime_logement: 0,
      prime_voiture: 0,
      autres_primes: 0,
      statut: 'Actif',
      nombre_enfants: 0
    };
  };
  
  const handleImport = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }
    
    setImporting(true);
    
    try {
      const text = await file.text();
      const csvData = parseCSV(text);
      const employees = csvData.map(mapCSVToEmployee);
      
      const importResults = {
        total: employees.length,
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const emp of employees) {
        try {
          await base44.entities.Employee.create(emp);
          importResults.success++;
        } catch (error) {
          importResults.failed++;
          importResults.errors.push({
            employee: `${emp.prenom} ${emp.nom}`,
            error: error.message
          });
        }
      }
      
      setResults(importResults);
      queryClient.invalidateQueries(['employees']);
      
      if (importResults.failed === 0) {
        toast.success(`${importResults.success} employés importés avec succès`);
      } else {
        toast.warning(`${importResults.success} importés, ${importResults.failed} échoués`);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'importation');
      console.error(error);
    }
    
    setImporting(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl border border-[#E8ECF2]">
        <div className="p-6 border-b border-[#E8ECF2]">
          <h3 className="text-xl font-semibold text-[#0A2540]">Importation en masse</h3>
          <p className="text-sm text-[#697586] mt-1">Importez plusieurs employés via un fichier CSV</p>
        </div>
        
        <CardContent className="p-6 space-y-6">
          <div className="bg-[#F7F9FC] rounded-lg p-4 border border-[#E8ECF2]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#0A2540] mb-2">Instructions:</p>
                <ol className="text-sm text-[#697586] space-y-1 list-decimal list-inside">
                  <li>Téléchargez le modèle CSV ci-dessous</li>
                  <li>Remplissez les données des employés</li>
                  <li>Importez le fichier complété</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="border-[#D3DCE6]"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le modèle CSV
            </Button>
          </div>
          
          <div className="border-2 border-dashed border-[#D3DCE6] rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-[#8896A8] mx-auto mb-4" />
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs mx-auto"
            />
            {file && (
              <p className="text-sm text-[#0066FF] mt-2">
                Fichier sélectionné: {file.name}
              </p>
            )}
          </div>
          
          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#00C48C]" />
                <span className="text-sm text-[#425466]">
                  {results.success} employés importés avec succès
                </span>
              </div>
              
              {results.failed > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-[#FA6400]" />
                    <span className="text-sm text-[#425466]">
                      {results.failed} échoués
                    </span>
                  </div>
                  
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 max-h-48 overflow-y-auto">
                    <p className="font-medium text-[#991B1B] mb-2 text-sm">Erreurs:</p>
                    <ul className="space-y-1">
                      {results.errors.map((err, idx) => (
                        <li key={idx} className="text-xs text-[#B91C1C]">
                          {err.employee}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#D3DCE6]"
            >
              Fermer
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-[#0066FF] hover:bg-[#0052CC]"
            >
              {importing ? 'Importation...' : 'Importer les employés'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}