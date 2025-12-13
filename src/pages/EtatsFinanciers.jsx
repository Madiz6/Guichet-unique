import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus,
  Calendar,
  CheckCircle,
  BarChart3,
  Activity,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import DataPreparationGuide from "../components/financials/DataPreparationGuide";
import DocumentTracker from "../components/financials/DocumentTracker";
import LiveFinancialDashboard from "../components/financials/LiveFinancialDashboard";

export default function EtatsFinanciers() {
  const queryClient = useQueryClient();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [showPreparationGuide, setShowPreparationGuide] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [formData, setFormData] = useState({
    fiscal_year: new Date().getFullYear().toString(),
    period_start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  });

  const { data: statements = [] } = useQuery({
    queryKey: ['financial-statements'],
    queryFn: () => meras.entities.FinancialStatement.list('-created_date')
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => meras.entities.Asset.list()
  });

  const { data: shareholders = [] } = useQuery({
    queryKey: ['shareholders'],
    queryFn: () => meras.entities.Shareholder.list()
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => meras.entities.BankAccount.list()
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => meras.entities.Loan.list()
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list()
  });

  const company = companies[0] || {};

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await meras.functions.invoke('generateFinancialStatement', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-statements'] });
      toast.success('États financiers générés avec succès');
      setShowGenerateForm(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la génération: ' + error.message);
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate(formData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">États Financiers</h1>
            <p className="text-[#6B6B6B]">Rapports comptables de clôture d'exercice</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowPreparationGuide(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Info className="w-4 h-4 mr-2" />
              Guide de Préparation
            </Button>
            <Button 
              onClick={() => setShowGenerateForm(true)}
              className="bg-[#1A1A1A] hover:bg-[#2A2A2A]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Générer États Financiers
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {statements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              {
                label: 'Total Actif',
                value: statements[0]?.actif?.total_actif || 0,
                icon: DollarSign,
                color: 'text-blue-600'
              },
              {
                label: 'Total Passif',
                value: statements[0]?.passif?.total_passif || 0,
                icon: Activity,
                color: 'text-purple-600'
              },
              {
                label: 'Résultat Net',
                value: statements[0]?.compte_resultat?.resultat_net || 0,
                icon: statements[0]?.compte_resultat?.resultat_net >= 0 ? TrendingUp : TrendingDown,
                color: statements[0]?.compte_resultat?.resultat_net >= 0 ? 'text-green-600' : 'text-red-600'
              },
              {
                label: 'Rentabilité',
                value: statements[0]?.ratios_financiers?.rentabilite_nette || 0,
                icon: BarChart3,
                color: 'text-amber-600',
                suffix: '%'
              }
            ].map((stat, idx) => (
              <Card key={idx} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-sm text-[#6B6B6B]">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {stat.suffix ? stat.value.toFixed(2) + stat.suffix : formatCurrency(stat.value) + ' DJF'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Document Tracker */}
        {statements.length === 0 && (
          <div className="mb-8">
            <DocumentTracker fiscalYear={formData.fiscal_year} />
          </div>
        )}

        {/* Generate Form Dialog */}
        {showGenerateForm && (
          <Card className="mb-8 border-2 border-[#1A1A1A] shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Générer Nouveaux États Financiers</h3>
              
              {/* Document Tracker in Form */}
              <div className="mb-6">
                <DocumentTracker fiscalYear={formData.fiscal_year} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Année Fiscale</label>
                  <Input
                    type="text"
                    value={formData.fiscal_year}
                    onChange={(e) => setFormData({...formData, fiscal_year: e.target.value})}
                    placeholder="2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Date de Début</label>
                  <Input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Date de Fin</label>
                  <Input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowGenerateForm(false)}
                  className="border-[#E5E7EB]"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="bg-[#1A1A1A] hover:bg-[#2A2A2A]"
                >
                  {generateMutation.isPending ? 'Génération...' : 'Générer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Preparation Guide Dialog */}
        <Dialog open={showPreparationGuide} onOpenChange={setShowPreparationGuide}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Guide de Préparation des Données</DialogTitle>
            </DialogHeader>
            <DataPreparationGuide
              assets={assets}
              shareholders={shareholders}
              bankAccounts={bankAccounts}
              loans={loans}
              company={company}
              transactions={transactions}
              onClose={() => setShowPreparationGuide(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Statements List */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {statements.map((statement) => (
            <Card key={statement.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">
                        États Financiers {statement.fiscal_year}
                      </h3>
                      <p className="text-sm text-[#6B6B6B]">
                        Du {format(new Date(statement.period_start), 'dd/MM/yyyy')} au {format(new Date(statement.period_end), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${
                      statement.status === 'Clôturé' ? 'bg-green-100 text-green-800' :
                      statement.status === 'Validé' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {statement.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStatement(statement.id === selectedStatement ? null : statement.id)}
                    >
                      {selectedStatement === statement.id ? 'Masquer' : 'Voir Détails'}
                    </Button>
                  </div>
                </div>

                {selectedStatement === statement.id && (
                  <Tabs defaultValue="actif" className="mt-6">
                    <TabsList className="bg-[#F5F5F5]">
                      <TabsTrigger value="actif">Actif</TabsTrigger>
                      <TabsTrigger value="passif">Passif</TabsTrigger>
                      <TabsTrigger value="resultat">Compte de Résultat</TabsTrigger>
                      <TabsTrigger value="ratios">Ratios</TabsTrigger>
                    </TabsList>

                    {/* Actif Tab */}
                    <TabsContent value="actif" className="mt-6">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Immobilisations Incorporelles</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-[#6B6B6B]">Brut</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.immobilisations_incorporelles?.total_brut)} DJF</p>
                            </div>
                            <div>
                              <p className="text-[#6B6B6B]">Amortissements</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.immobilisations_incorporelles?.total_amort)} DJF</p>
                            </div>
                            <div>
                              <p className="text-[#6B6B6B]">Net</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.immobilisations_incorporelles?.total_net)} DJF</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Immobilisations Corporelles</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-[#6B6B6B]">Brut</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.immobilisations_corporelles?.total_brut)} DJF</p>
                            </div>
                            <div>
                              <p className="text-[#6B6B6B]">Amortissements</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.immobilisations_corporelles?.total_amort)} DJF</p>
                            </div>
                            <div>
                              <p className="text-[#6B6B6B]">Net</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.immobilisations_corporelles?.total_net)} DJF</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Actif Circulant</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-[#6B6B6B]">Créances</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.creances?.total)} DJF</p>
                            </div>
                            <div>
                              <p className="text-[#6B6B6B]">Disponibilités</p>
                              <p className="font-semibold">{formatCurrency(statement.actif?.disponibilites)} DJF</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-lg text-[#1A1A1A]">Total Actif</p>
                            <p className="font-bold text-2xl text-[#1A1A1A]">{formatCurrency(statement.actif?.total_actif)} DJF</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Passif Tab */}
                    <TabsContent value="passif" className="mt-6">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Capitaux Propres</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Capital Social</p>
                              <p className="font-semibold">{formatCurrency(statement.passif?.capitaux_propres?.capital_social)} DJF</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Résultat de l'exercice</p>
                              <p className={`font-semibold ${statement.passif?.capitaux_propres?.resultat_exercice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(statement.passif?.capitaux_propres?.resultat_exercice)} DJF
                              </p>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <p className="font-bold">Total</p>
                              <p className="font-bold">{formatCurrency(statement.passif?.capitaux_propres?.total)} DJF</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Dettes</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Fournisseurs</p>
                              <p className="font-semibold">{formatCurrency(statement.passif?.dettes?.fournisseurs)} DJF</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Dettes fiscales et sociales</p>
                              <p className="font-semibold">{formatCurrency(statement.passif?.dettes?.dettes_fiscales_sociales)} DJF</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Autres dettes</p>
                              <p className="font-semibold">{formatCurrency(statement.passif?.dettes?.autres_dettes)} DJF</p>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <p className="font-bold">Total</p>
                              <p className="font-bold">{formatCurrency(statement.passif?.dettes?.total)} DJF</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-lg text-[#1A1A1A]">Total Passif</p>
                            <p className="font-bold text-2xl text-[#1A1A1A]">{formatCurrency(statement.passif?.total_passif)} DJF</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Compte de Résultat Tab */}
                    <TabsContent value="resultat" className="mt-6">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Produits d'Exploitation</h4>
                          <div className="flex justify-between text-sm">
                            <p className="text-[#6B6B6B]">Total Produits</p>
                            <p className="font-bold text-green-600">{formatCurrency(statement.compte_resultat?.produits_exploitation?.total)} DJF</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-[#1A1A1A] mb-3">Charges d'Exploitation</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Salaires et traitements</p>
                              <p className="font-semibold">{formatCurrency(statement.compte_resultat?.charges_exploitation?.salaires_traitements)} DJF</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Charges sociales</p>
                              <p className="font-semibold">{formatCurrency(statement.compte_resultat?.charges_exploitation?.charges_sociales)} DJF</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-[#6B6B6B]">Dotations amortissements</p>
                              <p className="font-semibold">{formatCurrency(statement.compte_resultat?.charges_exploitation?.dotations_amortissements)} DJF</p>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <p className="font-bold">Total Charges</p>
                              <p className="font-bold text-red-600">{formatCurrency(statement.compte_resultat?.charges_exploitation?.total)} DJF</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <p className="font-bold text-[#1A1A1A]">Résultat d'Exploitation</p>
                              <p className={`font-bold ${statement.compte_resultat?.resultat_exploitation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(statement.compte_resultat?.resultat_exploitation)} DJF
                              </p>
                            </div>
                            <div className="flex justify-between">
                              <p className="font-bold text-[#1A1A1A]">Impôt sur les sociétés</p>
                              <p className="font-bold text-red-600">{formatCurrency(statement.compte_resultat?.impot_societes)} DJF</p>
                            </div>
                            <div className="flex justify-between pt-3 border-t">
                              <p className="font-bold text-lg text-[#1A1A1A]">Résultat Net</p>
                              <p className={`font-bold text-2xl ${statement.compte_resultat?.resultat_net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(statement.compte_resultat?.resultat_net)} DJF
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Ratios Tab */}
                    <TabsContent value="ratios" className="mt-6">
                      <div className="grid grid-cols-2 gap-6">
                        <Card className="border-0 bg-blue-50">
                          <CardContent className="p-6">
                            <p className="text-sm text-[#6B6B6B] mb-2">Liquidité Générale</p>
                            <p className="text-3xl font-bold text-blue-600">
                              {statement.ratios_financiers?.liquidite_generale?.toFixed(2)}
                            </p>
                            <p className="text-xs text-[#6B6B6B] mt-2">Capacité à payer les dettes CT</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-purple-50">
                          <CardContent className="p-6">
                            <p className="text-sm text-[#6B6B6B] mb-2">Autonomie Financière</p>
                            <p className="text-3xl font-bold text-purple-600">
                              {statement.ratios_financiers?.autonomie_financiere?.toFixed(1)}%
                            </p>
                            <p className="text-xs text-[#6B6B6B] mt-2">Part des capitaux propres</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-amber-50">
                          <CardContent className="p-6">
                            <p className="text-sm text-[#6B6B6B] mb-2">Taux d'Endettement</p>
                            <p className="text-3xl font-bold text-amber-600">
                              {statement.ratios_financiers?.endettement?.toFixed(1)}%
                            </p>
                            <p className="text-xs text-[#6B6B6B] mt-2">Dettes / Capitaux propres</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-green-50">
                          <CardContent className="p-6">
                            <p className="text-sm text-[#6B6B6B] mb-2">Rentabilité Nette</p>
                            <p className="text-3xl font-bold text-green-600">
                              {statement.ratios_financiers?.rentabilite_nette?.toFixed(2)}%
                            </p>
                            <p className="text-xs text-[#6B6B6B] mt-2">Résultat net / CA</p>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}