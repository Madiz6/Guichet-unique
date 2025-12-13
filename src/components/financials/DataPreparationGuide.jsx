import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Users, 
  DollarSign, 
  FileText,
  Landmark,
  Package,
  ArrowRight,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DataPreparationGuide({ 
  assets, 
  shareholders, 
  bankAccounts, 
  loans,
  company,
  transactions,
  onClose 
}) {
  const checks = [
    {
      id: 'company',
      title: "Informations Entreprise",
      icon: Building2,
      color: "blue",
      required: true,
      items: [
        { label: "Capital social", value: company?.capital_social, field: "capital_social" },
        { label: "Type d'entreprise", value: company?.type_entreprise, field: "type_entreprise" },
        { label: "NIF", value: company?.nif, field: "nif" },
        { label: "Numéro affiliation CNSS", value: company?.numero_affiliation, field: "numero_affiliation" },
        { label: "Date de création", value: company?.date_creation, field: "date_creation" }
      ],
      link: createPageUrl('CompanySetup'),
      linkText: "Compléter info entreprise"
    },
    {
      id: 'shareholders',
      title: "Associés / Actionnaires",
      icon: Users,
      color: "purple",
      required: true,
      items: [
        { label: "Nombre d'associés", value: shareholders?.length, min: 1 },
        { label: "Parts sociales définies", check: shareholders?.every(s => s.nombre_parts) },
        { label: "Comptes courants", check: true }
      ],
      description: "Les comptes courants associés (Note 9) doivent être enregistrés",
      link: null,
      linkText: "Gérer les associés"
    },
    {
      id: 'assets',
      title: "Immobilisations",
      icon: Package,
      color: "green",
      required: true,
      items: [
        { label: "Immobilisations incorporelles", check: assets?.filter(a => a.categorie === 'Incorporelle').length > 0 },
        { label: "Immobilisations corporelles", check: assets?.filter(a => a.categorie === 'Corporelle').length > 0 },
        { label: "Dépôts et cautionnements", check: assets?.filter(a => a.type === 'Dépôts et cautionnements').length > 0 },
        { label: "Taux d'amortissement définis", check: assets?.every(a => a.taux_amortissement) }
      ],
      description: "Toutes les immobilisations avec leurs valeurs brutes et amortissements",
      link: null,
      linkText: "Gérer les immobilisations"
    },
    {
      id: 'bank_accounts',
      title: "Comptes Bancaires",
      icon: Landmark,
      color: "amber",
      required: true,
      items: [
        { label: "Comptes en DJF", value: bankAccounts?.filter(b => b.devise === 'DJF').length },
        { label: "Comptes en devises (USD, EUR)", value: bankAccounts?.filter(b => b.devise !== 'DJF').length },
        { label: "Soldes à jour", check: bankAccounts?.every(b => b.solde_actuel !== undefined) }
      ],
      description: "Disponibilités (Note 6): tous les comptes bancaires avec leurs soldes",
      link: null,
      linkText: "Ajouter comptes bancaires"
    },
    {
      id: 'loans',
      title: "Emprunts",
      icon: DollarSign,
      color: "red",
      required: false,
      items: [
        { label: "Emprunts en cours", value: loans?.filter(l => l.statut === 'En cours').length },
        { label: "Montants restants définis", check: loans?.every(l => l.montant_restant !== undefined) }
      ],
      description: "Emprunts auprès des établissements de crédit (si applicable)",
      link: null,
      linkText: "Gérer les emprunts"
    },
    {
      id: 'transactions',
      title: "Transactions Comptables",
      icon: FileText,
      color: "indigo",
      required: true,
      items: [
        { label: "Revenus enregistrés", check: transactions?.filter(t => t.type === 'Revenu').length > 0 },
        { label: "Dépenses catégorisées", check: transactions?.filter(t => t.type === 'Dépense' && t.category).length > 0 },
        { label: "Charges externes détaillées", info: "Sous-traitance, Location, Honoraires, etc." },
        { label: "Dettes fournisseurs", info: "Factures non payées" },
        { label: "Créances clients", info: "Factures à recevoir" }
      ],
      description: "Toutes les opérations financières de l'exercice (Note 10)",
      link: createPageUrl('Transactions'),
      linkText: "Voir les transactions"
    }
  ];

  const getStatusColor = (check) => {
    if (check.required === false) return 'text-gray-500';
    const isComplete = check.items.every(item => {
      if (item.value !== undefined) return item.value > 0;
      if (item.min !== undefined) return item.value >= item.min;
      if (item.check !== undefined) return item.check;
      return false;
    });
    return isComplete ? 'text-green-600' : 'text-amber-600';
  };

  const getStatusIcon = (check) => {
    if (check.required === false) return Info;
    const isComplete = check.items.every(item => {
      if (item.value !== undefined) return item.value > 0;
      if (item.min !== undefined) return item.value >= item.min;
      if (item.check !== undefined) return item.check;
      return false;
    });
    return isComplete ? CheckCircle : AlertCircle;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
          <Info className="w-6 h-6 text-blue-600" />
          Guide de Préparation des États Financiers
        </h3>
        <p className="text-[#4A5568] mb-4">
          Pour générer des états financiers précis et conformes au NPCG, assurez-vous que toutes les données suivantes sont complètes et à jour dans le système.
        </p>
        <div className="flex gap-2">
          <Badge className="bg-blue-600 text-white">Conforme NPCG</Badge>
          <Badge className="bg-purple-600 text-white">Décret 2012-010/PR/MEF</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {checks.map((check) => {
          const StatusIcon = getStatusIcon(check);
          const statusColor = getStatusColor(check);
          
          return (
            <Card key={check.id} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-${check.color}-100 flex items-center justify-center flex-shrink-0`}>
                      <check.icon className={`w-6 h-6 text-${check.color}-600`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] mb-1">{check.title}</h4>
                      {check.required && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Requis</Badge>
                      )}
                    </div>
                  </div>
                  <StatusIcon className={`w-6 h-6 ${statusColor}`} />
                </div>

                {check.description && (
                  <p className="text-sm text-[#6B6B6B] mb-4 italic">{check.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  {check.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-[#4A5568]">{item.label}</span>
                      {item.value !== undefined && (
                        <Badge className={`${item.value > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.value}
                        </Badge>
                      )}
                      {item.check !== undefined && (
                        item.check ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )
                      )}
                      {item.info && (
                        <span className="text-xs text-[#6B6B6B]">{item.info}</span>
                      )}
                    </div>
                  ))}
                </div>

                {check.link && (
                  <Link to={check.link}>
                    <Button variant="outline" size="sm" className="w-full">
                      {check.linkText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Documents Checklist */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <h4 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Documents Requis pour la Clôture
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Statuts de la société (capital social, parts)",
              "Tableau des immobilisations et amortissements",
              "Relevés bancaires de tous les comptes",
              "Liste des dettes fournisseurs au 31/12",
              "Liste des créances clients au 31/12",
              "Comptes courants associés au 31/12",
              "Déclarations CNSS et ITS de l'année",
              "Factures et reçus de toutes les dépenses",
              "Contrats de prêt (si applicable)",
              "Inventaire physique des stocks (si applicable)"
            ].map((doc, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-[#4A5568]">
                <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-[#6B6B6B]">
          Une fois toutes les données complètes, vous pourrez générer les états financiers
        </p>
        <Button onClick={onClose} className="bg-[#1A1A1A] hover:bg-[#2A2A2A]">
          Compris
        </Button>
      </div>
    </div>
  );
}