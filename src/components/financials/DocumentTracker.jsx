import React from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Upload,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentTracker({ fiscalYear }) {
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-docs', fiscalYear],
    queryFn: () => meras.entities.Transaction.filter({
      accounting_period: { $regex: `^${fiscalYear}` }
    })
  });

  const { data: declarations = [] } = useQuery({
    queryKey: ['declarations-docs', fiscalYear],
    queryFn: () => meras.entities.Declaration.filter({
      periode: { $regex: `^${fiscalYear}` }
    })
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets-docs'],
    queryFn: () => meras.entities.Asset.list()
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts-docs'],
    queryFn: () => meras.entities.BankAccount.list()
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans-docs'],
    queryFn: () => meras.entities.Loan.filter({ statut: 'En cours' })
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks-docs', fiscalYear],
    queryFn: () => meras.entities.StockInventory.filter({ fiscal_year: fiscalYear })
  });

  const { data: shareholders = [] } = useQuery({
    queryKey: ['shareholders-docs'],
    queryFn: () => meras.entities.Shareholder.filter({ statut: 'Actif' })
  });

  const documentChecks = [
    {
      id: 'bank_statements',
      title: 'Relevés Bancaires',
      description: 'Tous les comptes au 31/12',
      count: bankAccounts.length,
      required: bankAccounts.length,
      complete: bankAccounts.filter(b => b.solde_actuel !== undefined).length,
      details: bankAccounts.map(b => `${b.nom_compte} (${b.devise})`).join(', ')
    },
    {
      id: 'supplier_debts',
      title: 'Dettes Fournisseurs',
      description: 'Factures non payées au 31/12',
      count: transactions.filter(t => t.type === 'Dépense' && t.status === 'En attente' && t.is_dette).length,
      required: transactions.filter(t => t.type === 'Dépense' && t.status === 'En attente').length,
      complete: transactions.filter(t => 
        t.type === 'Dépense' && 
        t.status === 'En attente' && 
        t.attachments?.length > 0
      ).length
    },
    {
      id: 'client_receivables',
      title: 'Créances Clients',
      description: 'Factures à recevoir au 31/12',
      count: transactions.filter(t => t.type === 'Revenu' && t.status === 'En attente' && t.is_creance).length,
      required: transactions.filter(t => t.type === 'Revenu' && t.status === 'En attente').length,
      complete: transactions.filter(t => 
        t.type === 'Revenu' && 
        t.status === 'En attente' && 
        t.numero_facture
      ).length
    },
    {
      id: 'shareholder_accounts',
      title: 'Comptes Courants Associés',
      description: 'Soldes au 31/12',
      count: shareholders.length,
      required: shareholders.length,
      complete: shareholders.filter(s => s.compte_courant_associe !== undefined).length,
      details: shareholders.map(s => `${s.nom}: ${s.compte_courant_associe?.toLocaleString() || 0} DJF`).join(', ')
    },
    {
      id: 'cnss_its',
      title: 'Déclarations CNSS & ITS',
      description: "De l'année fiscale",
      count: declarations.length,
      required: 12,
      complete: declarations.filter(d => d.statut === 'Payé').length
    },
    {
      id: 'expense_receipts',
      title: 'Factures et Reçus',
      description: 'Toutes les dépenses',
      count: transactions.filter(t => t.type === 'Dépense').length,
      required: transactions.filter(t => t.type === 'Dépense').length,
      complete: transactions.filter(t => 
        t.type === 'Dépense' && 
        t.attachments?.length > 0 &&
        t.document_validated
      ).length
    },
    {
      id: 'loan_contracts',
      title: 'Contrats de Prêt',
      description: 'Si applicable',
      count: loans.length,
      required: loans.length,
      complete: loans.filter(l => l.contrat_url).length,
      optional: true
    },
    {
      id: 'stock_inventory',
      title: 'Inventaire Physique Stocks',
      description: 'Si applicable',
      count: stocks.length,
      required: stocks.length > 0 ? 1 : 0,
      complete: stocks.filter(s => s.statut === 'Validé').length,
      optional: true
    },
    {
      id: 'assets_depreciation',
      title: 'Tableau Immobilisations',
      description: 'Avec amortissements',
      count: assets.length,
      required: assets.length,
      complete: assets.filter(a => 
        a.valeur_acquisition && 
        a.taux_amortissement && 
        a.amortissement_cumule !== undefined
      ).length
    }
  ];

  const totalRequired = documentChecks.filter(c => !c.optional).reduce((sum, c) => sum + c.required, 0);
  const totalComplete = documentChecks.filter(c => !c.optional).reduce((sum, c) => sum + c.complete, 0);
  const completionRate = totalRequired > 0 ? (totalComplete / totalRequired) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-[#1A1A1A]">
                Préparation Documents {fiscalYear}
              </h3>
              <p className="text-[#6B6B6B]">Conforme NPCG - Décret 2012-010/PR/MEF</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">{completionRate.toFixed(0)}%</p>
              <p className="text-sm text-[#6B6B6B]">{totalComplete}/{totalRequired} complets</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="h-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentChecks.map((check) => {
          const isComplete = check.complete >= check.required;
          const progress = check.required > 0 ? (check.complete / check.required) * 100 : 0;

          return (
            <Card key={check.id} className={`border-0 shadow-md ${
              isComplete ? 'bg-green-50' : check.optional ? 'bg-gray-50' : 'bg-amber-50'
            }`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-[#1A1A1A] mb-1 flex items-center gap-2">
                      {check.title}
                      {check.optional && (
                        <Badge className="bg-gray-200 text-gray-700 text-xs">Optionnel</Badge>
                      )}
                    </h4>
                    <p className="text-xs text-[#6B6B6B] mb-3">{check.description}</p>
                  </div>
                  {isComplete ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className={`w-6 h-6 flex-shrink-0 ${check.optional ? 'text-gray-400' : 'text-amber-600'}`} />
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#6B6B6B]">Complétude</span>
                    <span className="font-bold text-[#1A1A1A]">{check.complete}/{check.required}</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        isComplete ? 'bg-green-600' : check.optional ? 'bg-gray-400' : 'bg-amber-600'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {check.details && (
                  <p className="text-xs text-[#6B6B6B] mt-2 line-clamp-2">{check.details}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Missing Documents Alert */}
      {completionRate < 100 && (
        <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-[#1A1A1A] mb-2">Documents Manquants</h4>
                <p className="text-sm text-[#4A5568] mb-4">
                  {totalRequired - totalComplete} document(s) requis manquant(s). Complétez les données pour générer des états financiers conformes.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-amber-600 text-amber-600">
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter documents
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Generate */}
      {completionRate === 100 && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-[#1A1A1A] mb-2">✅ Prêt pour la Génération</h4>
                <p className="text-sm text-[#4A5568]">
                  Tous les documents requis sont complets. Vous pouvez générer les états financiers conformes au NPCG.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}