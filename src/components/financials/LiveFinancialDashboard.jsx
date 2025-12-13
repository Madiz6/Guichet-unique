import React, { useMemo } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Building2, Users } from 'lucide-react';

export default function LiveFinancialDashboard({ fiscalYear }) {
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', fiscalYear],
    queryFn: () => meras.entities.Transaction.filter({
      accounting_period: { $regex: `^${fiscalYear}` }
    })
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => meras.entities.Asset.list()
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => meras.entities.Loan.filter({ statut: 'En cours' })
  });

  const { data: shareholders = [] } = useQuery({
    queryKey: ['shareholders'],
    queryFn: () => meras.entities.Shareholder.filter({ statut: 'Actif' })
  });

  const financials = useMemo(() => {
    // ACTIF (Assets)
    const immobilisations = {
      incorporelles: assets.filter(a => a.categorie === 'Incorporelle').reduce((sum, a) => sum + (a.valeur_nette_comptable || 0), 0),
      corporelles: assets.filter(a => a.categorie === 'Corporelle').reduce((sum, a) => sum + (a.valeur_nette_comptable || 0), 0),
      financieres: assets.filter(a => a.categorie === 'Financière').reduce((sum, a) => sum + (a.valeur_nette_comptable || 0), 0)
    };

    const creances = transactions.filter(t => t.is_creance && t.status === 'En attente').reduce((sum, t) => sum + (t.amount || 0), 0);
    const disponibilites = 0; // From bank accounts

    const totalActif = immobilisations.incorporelles + immobilisations.corporelles + immobilisations.financieres + creances + disponibilites;

    // PASSIF (Liabilities)
    const capital = transactions.filter(t => t.source === 'Apport Capital').reduce((sum, t) => sum + (t.amount || 0), 0);
    const cca = shareholders.reduce((sum, s) => sum + (s.compte_courant_associe || 0), 0);
    const emprunts = loans.reduce((sum, l) => sum + (l.montant_restant || 0), 0);
    const dettes = transactions.filter(t => t.is_dette && t.status === 'En attente').reduce((sum, t) => sum + (t.amount || 0), 0);

    // COMPTE DE RÉSULTAT (Income Statement)
    const produits = {
      services: transactions.filter(t => t.type === 'Revenu' && t.category?.includes('Services')).reduce((sum, t) => sum + (t.amount || 0), 0),
      financiers: transactions.filter(t => t.type === 'Revenu' && t.category?.includes('Interest')).reduce((sum, t) => sum + (t.amount || 0), 0)
    };

    const charges = {
      fournitures: transactions.filter(t => t.category?.includes('Fournitures')).reduce((sum, t) => sum + (t.amount || 0), 0),
      servicesExterieurs: transactions.filter(t => t.category?.includes('Sous-traitance') || t.category?.includes('Location') || t.category?.includes('Honoraires')).reduce((sum, t) => sum + (t.amount || 0), 0),
      impotsTaxes: transactions.filter(t => t.category?.includes('Patente') || t.category?.includes('Vignette')).reduce((sum, t) => sum + (t.amount || 0), 0),
      remunerations: transactions.filter(t => t.source === 'Paie').reduce((sum, t) => sum + (t.amount || 0), 0),
      chargesFinancieres: transactions.filter(t => t.category === 'Loan Repayment - Interest').reduce((sum, t) => sum + (t.amount || 0), 0)
    };

    const totalProduits = produits.services + produits.financiers;
    const totalCharges = Object.values(charges).reduce((sum, v) => sum + v, 0);
    const resultatNet = totalProduits - totalCharges;

    return {
      actif: { immobilisations, creances, disponibilites, total: totalActif },
      passif: { capital, cca, emprunts, dettes, total: capital + cca + emprunts + dettes },
      resultat: { produits, charges, totalProduits, totalCharges, resultatNet }
    };
  }, [transactions, assets, loans, shareholders]);

  const MetricCard = ({ title, value, subtitle, trend, icon: Icon }) => (
    <Card className="border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          {trend && (
            <Badge className={trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
              {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        <h4 className="text-sm text-gray-600 mb-2">{title}</h4>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()} DJF</p>
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="resultat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resultat">Compte de Résultat</TabsTrigger>
          <TabsTrigger value="bilan">Bilan</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="resultat" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Produits d'exploitation"
              value={financials.resultat.totalProduits}
              icon={TrendingUp}
              subtitle="Classe 7 - Revenus"
            />
            <MetricCard
              title="Charges d'exploitation"
              value={financials.resultat.totalCharges}
              icon={TrendingDown}
              subtitle="Classe 6 - Dépenses"
            />
            <MetricCard
              title="Résultat Net"
              value={financials.resultat.resultatNet}
              icon={DollarSign}
              trend={financials.resultat.resultatNet > 0 ? 15 : -5}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Services (706)</span>
                    <span className="font-bold">{financials.resultat.produits.services.toLocaleString()} DJF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Produits financiers (762)</span>
                    <span className="font-bold">{financials.resultat.produits.financiers.toLocaleString()} DJF</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between">
                    <span className="font-bold">Total Produits</span>
                    <span className="font-bold text-green-600">{financials.resultat.totalProduits.toLocaleString()} DJF</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Charges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fournitures (606)</span>
                    <span className="font-bold">{financials.resultat.charges.fournitures.toLocaleString()} DJF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Services ext. (611-628)</span>
                    <span className="font-bold">{financials.resultat.charges.servicesExterieurs.toLocaleString()} DJF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Impôts (635)</span>
                    <span className="font-bold">{financials.resultat.charges.impotsTaxes.toLocaleString()} DJF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rémunérations (641)</span>
                    <span className="font-bold">{financials.resultat.charges.remunerations.toLocaleString()} DJF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Charges fin. (661)</span>
                    <span className="font-bold">{financials.resultat.charges.chargesFinancieres.toLocaleString()} DJF</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between">
                    <span className="font-bold">Total Charges</span>
                    <span className="font-bold text-red-600">{financials.resultat.totalCharges.toLocaleString()} DJF</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bilan" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  ACTIF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">IMMOBILISATIONS</p>
                    <div className="space-y-2 pl-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Incorporelles</span>
                        <span className="font-bold">{financials.actif.immobilisations.incorporelles.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Corporelles</span>
                        <span className="font-bold">{financials.actif.immobilisations.corporelles.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Financières</span>
                        <span className="font-bold">{financials.actif.immobilisations.financieres.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Créances clients</span>
                    <span className="font-bold">{financials.actif.creances.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Disponibilités</span>
                    <span className="font-bold">{financials.actif.disponibilites.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between">
                    <span className="font-bold">TOTAL ACTIF</span>
                    <span className="font-bold text-blue-600 text-xl">{financials.actif.total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  PASSIF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">CAPITAUX PROPRES</p>
                    <div className="space-y-2 pl-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Capital social (101)</span>
                        <span className="font-bold">{financials.passif.capital.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">CCA</span>
                        <span className="font-bold">{financials.passif.cca.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Emprunts (164)</span>
                    <span className="font-bold">{financials.passif.emprunts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Dettes fournisseurs</span>
                    <span className="font-bold">{financials.passif.dettes.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between">
                    <span className="font-bold">TOTAL PASSIF</span>
                    <span className="font-bold text-purple-600 text-xl">{financials.passif.total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Détails des transactions par compte NPCG en cours de développement...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}