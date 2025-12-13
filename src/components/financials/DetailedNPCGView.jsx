import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Building2,
  Users,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const NPCG_LABELS = {
  // PRODUITS (Classe 7)
  '701': 'Ventes de marchandises',
  '706': 'Prestations de services',
  '762': 'Produits financiers',
  '101': 'Capital social',
  '164': 'Emprunts bancaires',
  
  // CHARGES (Classe 6)
  '601': 'Achats de matières premières',
  '606': 'Achats non stockés - Fournitures',
  '611': 'Sous-traitance générale',
  '613': 'Locations',
  '615': 'Entretien et réparations',
  '616': 'Primes d\'assurances',
  '617': 'Personnel extérieur',
  '621': 'Documentation et séminaires',
  '622': 'Honoraires',
  '623': 'Publicité et relations publiques',
  '624': 'Transports',
  '625': 'Déplacements, missions et réceptions',
  '626': 'Frais postaux et télécommunications',
  '627': 'Services bancaires',
  '628': 'Divers',
  '635': 'Impôts et taxes',
  '641': 'Rémunérations du personnel',
  '661': 'Charges financières'
};

export default function DetailedNPCGView({ statement }) {
  const [expandedAccount, setExpandedAccount] = useState(null);

  const details = statement.details_par_compte_npcg || {};
  
  // Separate by class
  const produits = Object.entries(details).filter(([code]) => 
    ['701', '706', '762', '101', '164'].includes(code)
  );
  
  const charges = Object.entries(details).filter(([code]) => 
    ['601', '606', '611', '613', '615', '616', '617', '621', '622', '623', 
     '624', '625', '626', '627', '628', '635', '641', '661'].includes(code)
  );

  const nonClasses = Object.entries(details).filter(([code]) => 
    code === 'NON_CLASSE' || !NPCG_LABELS[code]
  );

  const AccountCard = ({ code, data, type }) => {
    const isExpanded = expandedAccount === code;
    const isRevenue = type === 'produit';

    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => setExpandedAccount(isExpanded ? null : code)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className={isRevenue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {code}
                  </Badge>
                  {NPCG_LABELS[code] || 'Compte non classé'}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {data.count} transaction{data.count > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${isRevenue ? 'text-green-600' : 'text-red-600'}`}>
                {data.total.toLocaleString()} DJF
              </p>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="border-t bg-gray-50">
            <div className="space-y-2">
              {data.transactions.slice(0, 50).map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tx.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span>{format(new Date(tx.date), 'dd/MM/yyyy')}</span>
                      {tx.contact_name && <span>• {tx.contact_name}</span>}
                      {tx.numero_facture && <span>• Facture #{tx.numero_facture}</span>}
                      {tx.category && <span>• {tx.category}</span>}
                    </div>
                  </div>
                  <p className={`font-bold ${isRevenue ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount.toLocaleString()} DJF
                  </p>
                </div>
              ))}
              {data.transactions.length > 50 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  ... et {data.transactions.length - 50} autre{data.transactions.length - 50 > 1 ? 's' : ''} transaction{data.transactions.length - 50 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="produits" className="w-full">
        <TabsList className="bg-white border">
          <TabsTrigger value="produits" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Produits (Classe 7)
          </TabsTrigger>
          <TabsTrigger value="charges" className="gap-2">
            <TrendingDown className="w-4 h-4" />
            Charges (Classe 6)
          </TabsTrigger>
          <TabsTrigger value="immobilisations" className="gap-2">
            <Building2 className="w-4 h-4" />
            Immobilisations
          </TabsTrigger>
          <TabsTrigger value="creances-dettes" className="gap-2">
            <Users className="w-4 h-4" />
            Créances & Dettes
          </TabsTrigger>
          {nonClasses.length > 0 && (
            <TabsTrigger value="non-classes" className="gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Non classés ({nonClasses.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="produits" className="space-y-4">
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Total Produits</h3>
                <p className="text-3xl font-bold text-green-600">
                  {produits.reduce((sum, [_, d]) => sum + d.total, 0).toLocaleString()} DJF
                </p>
              </div>
            </CardContent>
          </Card>

          {produits.map(([code, data]) => (
            <AccountCard key={code} code={code} data={data} type="produit" />
          ))}
        </TabsContent>

        <TabsContent value="charges" className="space-y-4">
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Total Charges</h3>
                <p className="text-3xl font-bold text-red-600">
                  {charges.reduce((sum, [_, d]) => sum + d.total, 0).toLocaleString()} DJF
                </p>
              </div>
            </CardContent>
          </Card>

          {charges.map(([code, data]) => (
            <AccountCard key={code} code={code} data={data} type="charge" />
          ))}
        </TabsContent>

        <TabsContent value="immobilisations" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-bold">Nom</th>
                      <th className="text-left py-3 px-2 font-bold">Type</th>
                      <th className="text-left py-3 px-2 font-bold">Date Acq.</th>
                      <th className="text-right py-3 px-2 font-bold">Valeur Brute</th>
                      <th className="text-center py-3 px-2 font-bold">Taux %</th>
                      <th className="text-right py-3 px-2 font-bold">Amort. {statement.fiscal_year}</th>
                      <th className="text-right py-3 px-2 font-bold">Amort. Cumulé</th>
                      <th className="text-right py-3 px-2 font-bold">VNC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statement.details_immobilisations || []).map((immo, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{immo.nom}</td>
                        <td className="py-3 px-2 text-gray-600">{immo.type}</td>
                        <td className="py-3 px-2 text-gray-600">
                          {immo.date_acquisition ? format(new Date(immo.date_acquisition), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">{immo.valeur_brute?.toLocaleString()}</td>
                        <td className="py-3 px-2 text-center">{immo.taux_amort}%</td>
                        <td className="py-3 px-2 text-right font-mono text-amber-600">
                          {immo.amort_annee?.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-gray-600">
                          {immo.amort_cumule?.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-bold">
                          {immo.valeur_nette?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creances-dettes" className="space-y-6">
          {/* Créances */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Créances Clients</h3>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-bold">Client</th>
                        <th className="text-left py-3 px-2 font-bold">N° Facture</th>
                        <th className="text-left py-3 px-2 font-bold">Date</th>
                        <th className="text-left py-3 px-2 font-bold">Échéance</th>
                        <th className="text-right py-3 px-2 font-bold">Montant</th>
                        <th className="text-center py-3 px-2 font-bold">Retard</th>
                        <th className="text-center py-3 px-2 font-bold">Risque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(statement.details_creances || []).map((creance, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{creance.contact_name}</td>
                          <td className="py-3 px-2 font-mono text-gray-600">{creance.numero_facture || '-'}</td>
                          <td className="py-3 px-2 text-gray-600">
                            {creance.date_facture ? format(new Date(creance.date_facture), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {creance.date_echeance ? format(new Date(creance.date_echeance), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="py-3 px-2 text-right font-bold">{creance.montant?.toLocaleString()} DJF</td>
                          <td className="py-3 px-2 text-center">
                            <Badge className={
                              creance.jours_retard > 90 ? 'bg-red-100 text-red-800' :
                              creance.jours_retard > 60 ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {creance.jours_retard || 0}j
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge className={
                              creance.categorie_risque === 'Douteuse' ? 'bg-red-600 text-white' :
                              creance.categorie_risque === 'Moyenne' ? 'bg-amber-600 text-white' :
                              'bg-green-600 text-white'
                            }>
                              {creance.categorie_risque}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dettes */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Dettes Fournisseurs</h3>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-bold">Fournisseur</th>
                        <th className="text-left py-3 px-2 font-bold">N° Facture</th>
                        <th className="text-left py-3 px-2 font-bold">Compte</th>
                        <th className="text-left py-3 px-2 font-bold">Date</th>
                        <th className="text-left py-3 px-2 font-bold">Échéance</th>
                        <th className="text-right py-3 px-2 font-bold">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(statement.details_dettes || []).map((dette, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{dette.contact_name}</td>
                          <td className="py-3 px-2 font-mono text-gray-600">{dette.numero_facture || '-'}</td>
                          <td className="py-3 px-2">
                            <Badge className="bg-gray-100 text-gray-800">{dette.compte_comptable}</Badge>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {dette.date_facture ? format(new Date(dette.date_facture), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {dette.date_echeance ? format(new Date(dette.date_echeance), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="py-3 px-2 text-right font-bold">{dette.montant?.toLocaleString()} DJF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Emprunts */}
          {statement.details_emprunts && statement.details_emprunts.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Emprunts Bancaires</h3>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-bold">Banque</th>
                          <th className="text-left py-3 px-2 font-bold">N° Prêt</th>
                          <th className="text-left py-3 px-2 font-bold">Type</th>
                          <th className="text-right py-3 px-2 font-bold">Montant Initial</th>
                          <th className="text-right py-3 px-2 font-bold">Restant Dû</th>
                          <th className="text-center py-3 px-2 font-bold">Taux %</th>
                          <th className="text-left py-3 px-2 font-bold">Échéance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.details_emprunts.map((loan, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium">{loan.banque}</td>
                            <td className="py-3 px-2 font-mono text-gray-600">{loan.numero_pret}</td>
                            <td className="py-3 px-2">
                              <Badge className="bg-blue-100 text-blue-800">{loan.type_pret}</Badge>
                            </td>
                            <td className="py-3 px-2 text-right font-mono">{loan.montant_initial?.toLocaleString()}</td>
                            <td className="py-3 px-2 text-right font-bold text-red-600">
                              {loan.montant_restant?.toLocaleString()} DJF
                            </td>
                            <td className="py-3 px-2 text-center">{loan.taux_interet}%</td>
                            <td className="py-3 px-2 text-gray-600">
                              {loan.date_echeance ? format(new Date(loan.date_echeance), 'dd/MM/yyyy') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="charges" className="space-y-4">
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Total Charges</h3>
                <p className="text-3xl font-bold text-red-600">
                  {charges.reduce((sum, [_, d]) => sum + d.total, 0).toLocaleString()} DJF
                </p>
              </div>
            </CardContent>
          </Card>

          {charges.map(([code, data]) => (
            <AccountCard key={code} code={code} data={data} type="charge" />
          ))}
        </TabsContent>

        <TabsContent value="immobilisations">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Tableau des Immobilisations - Exercice {statement.fiscal_year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold">Désignation</th>
                      <th className="text-left py-3 px-4 font-bold">Catégorie</th>
                      <th className="text-center py-3 px-4 font-bold">Date Acq.</th>
                      <th className="text-right py-3 px-4 font-bold">Valeur Brute</th>
                      <th className="text-center py-3 px-4 font-bold">Taux</th>
                      <th className="text-center py-3 px-4 font-bold">Durée</th>
                      <th className="text-right py-3 px-4 font-bold">Amort. {statement.fiscal_year}</th>
                      <th className="text-right py-3 px-4 font-bold">Amort. Cumulé</th>
                      <th className="text-right py-3 px-4 font-bold">VNC</th>
                      <th className="text-center py-3 px-4 font-bold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statement.details_immobilisations || []).map((immo, idx) => (
                      <tr key={idx} className="border-b hover:bg-blue-50">
                        <td className="py-3 px-4 font-medium">{immo.nom}</td>
                        <td className="py-3 px-4">
                          <Badge className={
                            immo.categorie === 'Incorporelle' ? 'bg-purple-100 text-purple-800' :
                            immo.categorie === 'Corporelle' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {immo.categorie}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {immo.date_acquisition ? format(new Date(immo.date_acquisition), 'dd/MM/yy') : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{immo.valeur_brute?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-bold">{immo.taux_amort}%</td>
                        <td className="py-3 px-4 text-center text-gray-600">{immo.duree_ans}ans</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-600 font-bold">
                          {immo.amort_annee?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {immo.amort_cumule?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {immo.valeur_nette?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={immo.statut === 'En service' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {immo.statut}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan="3" className="py-3 px-4">TOTAL IMMOBILISATIONS</td>
                      <td className="py-3 px-4 text-right">
                        {(statement.details_immobilisations || []).reduce((sum, i) => sum + (i.valeur_brute || 0), 0).toLocaleString()}
                      </td>
                      <td></td>
                      <td></td>
                      <td className="py-3 px-4 text-right text-amber-600">
                        {(statement.details_immobilisations || []).reduce((sum, i) => sum + (i.amort_annee || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(statement.details_immobilisations || []).reduce((sum, i) => sum + (i.amort_cumule || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600">
                        {(statement.details_immobilisations || []).reduce((sum, i) => sum + (i.valeur_nette || 0), 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Provisions */}
          {statement.provisions && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Provisions</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-2">Créances Douteuses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statement.provisions.provisions_creances_douteuses?.toLocaleString() || 0} DJF
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-2">Charges à Payer</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statement.provisions.provisions_charges_a_payer?.toLocaleString() || 0} DJF
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-2">Total Provisions</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statement.provisions.total_provisions?.toLocaleString() || 0} DJF
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {nonClasses.length > 0 && (
          <TabsContent value="non-classes" className="space-y-4">
            <Card className="border-2 border-amber-300 bg-amber-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <div>
                    <h3 className="text-lg font-bold text-amber-900">Transactions Non Classées</h3>
                    <p className="text-sm text-amber-700">
                      Ces transactions doivent être reclassées avec un compte NPCG valide
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {nonClasses.map(([code, data]) => (
              <AccountCard key={code} code={code} data={data} type="charge" />
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}