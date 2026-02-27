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
                  date: { type: 'string', description: 'Date de la transaction (YYYY-MM-DD)' },
                  description: { type: 'string', description: 'Libellé / description de l\'opération' },
                  debit: { type: 'number', description: 'Montant débité (sortie d\'argent, dépense) — toujours positif ou 0' },
                  credit: { type: 'number', description: 'Montant crédité (entrée d\'argent, revenu) — toujours positif ou 0' },
                  balance: { type: 'number', description: 'Solde après opération si disponible' },
                  source: { type: 'string', description: 'Source probable: Manuel, Prêt Bancaire, Remboursement Prêt, Apport Capital, Paie, Autre' },
                  category: { type: 'string' },
                  payment_method: { type: 'string', description: 'Virement, Chèque, Espèces, Mobile Money' },
                  notes: { type: 'string' },
                  loan_capital_amount: { type: 'number' },
                  loan_interest_amount: { type: 'number' }
                }
              }
            }
          }
        }
      });

      if (response.status === 'success') {
        // Normalize: derive type and amount from debit/credit columns
        const normalized = (response.output.transactions || []).map(t => {
          const debit = Math.abs(t.debit || 0);
          const credit = Math.abs(t.credit || 0);
          const isExpense = debit > 0;
          const amount = isExpense ? debit : credit;
          return {
            ...t,
            amount,
            total_amount: amount,
            type: isExpense ? 'Dépense' : 'Revenu',
            source: t.source || 'Manuel',
            status: 'En attente',
            is_financing: ['Prêt Bancaire', 'Remboursement Prêt', 'Apport Capital', 'Compte Courant Associé'].includes(t.source),
          };
        });
        setPreviewData(normalized);
        const incomeCount = normalized.filter(t => t.type === 'Revenu').length;
        const expenseCount = normalized.filter(t => t.type === 'Dépense').length;
        toast.success(`${normalized.length} transactions détectées — ${incomeCount} revenus, ${expenseCount} dépenses`);
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
      const enriched = previewData.map(t => ({
        ...t,
        source: t.source || 'Manuel',
        status: t.status || 'En attente',
        is_financing: ['Prêt Bancaire', 'Remboursement Prêt', 'Apport Capital', 'Compte Courant Associé'].includes(t.source),
      }));
      await meras.entities.Transaction.bulkCreate(enriched);
      queryClient.invalidateQueries(['transactions']);
      toast.success(`${previewData.length} transactions importées`);
      onClose();
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    }
  };

  const downloadTemplate = () => {
    const template = `date,description,amount,type,source,category,department,payment_method,notes,loan_capital_amount,loan_interest_amount
2025-01-10,Vente produit,50000,Revenu,Manuel,Ventes,Commercial,Virement,,
2025-01-11,Achat fournitures,15000,Dépense,Manuel,Fournitures,Administration,Espèces,,
2025-01-15,Déblocage prêt BCI,5000000,Revenu,Prêt Bancaire,Financement,,,5000000,0
2025-01-20,Remboursement prêt janvier,85000,Dépense,Remboursement Prêt,Charges financières,,,80000,5000
2025-01-25,Apport capital associé Ahmed,2000000,Revenu,Apport Capital,Capital,,,`;
    
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