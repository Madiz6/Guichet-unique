import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkUpload({ onClose }) {
  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const queryClient = useQueryClient();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewing(true);

    try {
      const response = await meras.integrations.Core.ExtractDataFromUploadedFile({
        file_url: await uploadFile(selectedFile),
        json_schema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  type: { type: 'string' },
                  source: { type: 'string' },
                  category: { type: 'string' },
                  department: { type: 'string' },
                  payment_method: { type: 'string' },
                  notes: { type: 'string' },
                  loan_capital_amount: { type: 'number' },
                  loan_interest_amount: { type: 'number' },
                  is_financing: { type: 'boolean' }
                }
              }
            }
          }
        }
      });

      if (response.status === 'success') {
        setPreviewData(response.output.transactions || []);
        toast.success(`${response.output.transactions?.length || 0} transactions détectées`);
      } else {
        toast.error('Erreur lors de l\'extraction des données');
      }
    } catch (error) {
      toast.error('Erreur lors du traitement du fichier');
    } finally {
      setPreviewing(false);
    }
  };

  const uploadFile = async (file) => {
    const { file_url } = await meras.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('Aucune donnée à importer');
      return;
    }

    try {
      await meras.entities.Transaction.bulkCreate(previewData);
      queryClient.invalidateQueries(['transactions']);
      toast.success(`${previewData.length} transactions importées`);
      onClose();
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    }
  };

  const downloadTemplate = () => {
    const template = `date,description,amount,type,category,department,payment_method,notes
2025-01-10,Vente produit,50000,Revenu,Ventes,Commercial,Virement,
2025-01-11,Achat fournitures,15000,Dépense,Fournitures,Administration,Espèces,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_transactions.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center p-8 border-2 border-dashed border-[#D3DCE6] rounded-lg">
        <Upload className="w-12 h-12 text-[#697586] mx-auto mb-4" />
        <p className="text-[#0A2540] font-semibold mb-2">Télécharger un fichier</p>
        <p className="text-sm text-[#697586] mb-4">Formats acceptés: CSV, Excel (.xlsx, .xls)</p>
        
        <label className="inline-block">
          <Button as="span" disabled={previewing}>
            {previewing ? 'Traitement...' : 'Choisir un fichier'}
          </Button>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            disabled={previewing}
          />
        </label>

        <div className="mt-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger le modèle
          </Button>
        </div>
      </div>

      {previewData.length > 0 && (
        <div>
          <h3 className="font-semibold text-[#0A2540] mb-4">
            Aperçu ({previewData.length} transactions)
          </h3>
          <div className="max-h-[400px] overflow-y-auto border border-[#E8ECF2] rounded-lg">
            <table className="w-full">
              <thead className="bg-[#F7F9FC] sticky top-0">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-[#64748B]">Date</th>
                  <th className="text-left p-3 text-xs font-semibold text-[#64748B]">Description</th>
                  <th className="text-left p-3 text-xs font-semibold text-[#64748B]">Montant</th>
                  <th className="text-left p-3 text-xs font-semibold text-[#64748B]">Type</th>
                  <th className="text-left p-3 text-xs font-semibold text-[#64748B]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} className="border-b border-[#F1F5F9]">
                    <td className="p-3 text-sm">{row.date}</td>
                    <td className="p-3 text-sm">{row.description}</td>
                    <td className="p-3 text-sm font-semibold">{row.amount?.toLocaleString()} DJF</td>
                    <td className="p-3 text-sm">{row.type}</td>
                    <td className="p-3">
                      {row.description && row.amount ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleImport} className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
              Importer {previewData.length} transactions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}