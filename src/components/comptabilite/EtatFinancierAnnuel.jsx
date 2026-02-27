import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Download, Loader2, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

function Row({ label, brut, amort, net, indent = false, bold = false, positive = false, separator = false }) {
  const cls = bold ? 'font-bold' : '';
  const indentCls = indent ? 'pl-6' : '';
  return (
    <tr className={`border-b border-[#F5F5F5] ${separator ? 'bg-[#F9FAFB]' : 'hover:bg-[#FAFAFA]'}`}>
      <td className={`py-2 px-3 text-sm text-[#1A1A1A] ${cls} ${indentCls}`}>{label}</td>
      {brut !== undefined && <td className={`py-2 px-3 text-right text-sm ${cls} text-[#374151]`}>{brut ? fmt(brut) : '—'}</td>}
      {amort !== undefined && <td className={`py-2 px-3 text-right text-sm text-red-500 ${cls}`}>{amort ? fmt(amort) : '—'}</td>}
      <td className={`py-2 px-3 text-right text-sm font-semibold ${positive ? 'text-green-700' : net < 0 ? 'text-red-600' : 'text-[#1A1A1A]'} ${cls}`}>
        {net !== undefined && net !== null ? fmt(net) : '—'}
      </td>
    </tr>
  );
}

function SectionHeader({ title, cols = 2 }) {
  return (
    <tr className="bg-[#1A1A1A]">
      <td colSpan={cols + 1} className="py-2 px-3 text-xs font-bold text-white uppercase tracking-wider">{title}</td>
    </tr>
  );
}

function CRRow({ label, amount, indent = false, bold = false, isCharge = false, separator = false }) {
  return (
    <tr className={`border-b border-[#F5F5F5] ${separator ? 'bg-[#F9FAFB]' : 'hover:bg-[#FAFAFA]'}`}>
      <td className={`py-2 px-3 text-sm text-[#1A1A1A] ${bold ? 'font-bold' : ''} ${indent ? 'pl-8' : ''}`}>{label}</td>
      <td className={`py-2 px-3 text-right text-sm font-semibold ${isCharge ? 'text-red-600' : amount >= 0 ? 'text-[#1A1A1A]' : 'text-red-600'} ${bold ? 'font-bold' : ''}`}>
        {amount !== undefined && amount !== null ? (isCharge ? `(${fmt(Math.abs(amount))})` : fmt(amount)) : '—'}
      </td>
    </tr>
  );
}

export default function EtatFinancierAnnuel({ transactions = [], loans = [], bankAccounts = [] }) {
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [formYear, setFormYear] = useState(year.toString());
  const [showForm, setShowForm] = useState(false);
  const [expandedStatement, setExpandedStatement] = useState(null);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['financial-statements'],
    queryFn: () => meras.entities.FinancialStatement.list('-created_date'),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => meras.entities.Company.list(),
  });
  const company = companies[0] || {};

  const generateMutation = useMutation({
    mutationFn: async () => {
      const resp = await meras.functions.invoke('generateFinancialStatement', {
        fiscal_year: formYear,
        period_start: `${formYear}-01-01`,
        period_end: `${formYear}-12-31`,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-statements'] });
      toast.success('États financiers générés avec succès');
      setShowForm(false);
    },
    onError: (e) => toast.error('Erreur: ' + e.message),
  });

  const downloadPDF = async (statement) => {
    try {
      const resp = await meras.functions.invoke('generateFinancialStatementPDF', { statement_id: statement.id });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Etats_Financiers_${statement.fiscal_year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const toggle = (id) => setExpandedStatement(prev => prev === id ? null : id);

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-[#6B6B6B]">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">États Financiers Annuels</h2>
          <p className="text-xs text-[#6B6B6B] mt-0.5">Conformes au NPCG (Nouveau Plan Comptable Général de Djibouti)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#1A1A1A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Générer {year}
        </Button>
      </div>

      {/* Generate form */}
      {showForm && (
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Générer les États Financiers</h3>
            <div className="flex items-end gap-4">
              <div>
                <label className="text-xs text-[#6B6B6B] mb-1 block">Année fiscale</label>
                <Input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} className="w-32" />
              </div>
              <div className="text-sm text-[#6B6B6B]">
                Période : 01/01/{formYear} — 31/12/{formYear}
              </div>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</> : '🚀 Générer'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-3">
              ℹ️ La génération analyse toutes les transactions comptabilisées de l'année et produit : Bilan (Actif/Passif), Compte de Résultat, et Ratios financiers selon le NPCG Djibouti.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No statements yet */}
      {statements.length === 0 && !showForm && (
        <Card className="border border-dashed border-[#D1D5DB]">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[#D1D5DB]" />
            <p className="font-semibold text-[#6B6B6B] mb-1">Aucun état financier généré</p>
            <p className="text-xs text-[#9CA3AF] mb-4">Cliquez sur "Générer {year}" pour produire votre premier état financier annuel.</p>
            <Button onClick={() => setShowForm(true)} className="bg-[#1A1A1A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Générer les États {year}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Statements list */}
      {statements.map((s) => {
        const cr = s.compte_resultat || {};
        const actif = s.actif || {};
        const passif = s.passif || {};
        const ratios = s.ratios_financiers || {};
        const isExpanded = expandedStatement === s.id;
        const balanced = Math.abs((actif.total_actif || 0) - (passif.total_passif || 0)) < 100;

        return (
          <Card key={s.id} className="border-0 shadow-sm overflow-hidden">
            {/* Statement header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#F0F0F0]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A]">États Financiers {s.fiscal_year}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    {s.period_start} → {s.period_end} · {company.nom_entreprise || 'Entreprise'}
                  </p>
                </div>
                <Badge className={balanced ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {balanced ? <><CheckCircle className="w-3 h-3 mr-1 inline" />Bilan équilibré</> : <><AlertTriangle className="w-3 h-3 mr-1 inline" />Vérifier le bilan</>}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadPDF(s)}>
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggle(s.id)}>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isExpanded ? 'Réduire' : 'Voir le détail'}
                </Button>
              </div>
            </div>

            {/* Summary KPIs always visible */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#F0F0F0] bg-[#FAFAFA] border-b border-[#F0F0F0]">
              {[
                { label: 'Total Actif', value: fmt(actif.total_actif) + ' DJF', color: 'text-blue-700' },
                { label: 'Capitaux Propres', value: fmt(passif.capitaux_propres?.total) + ' DJF', color: 'text-purple-700' },
                { label: 'Résultat Net', value: fmt(cr.resultat_net) + ' DJF', color: cr.resultat_net >= 0 ? 'text-green-700' : 'text-red-600' },
                { label: 'Rentabilité', value: (ratios.rentabilite_nette || 0).toFixed(1) + '%', color: 'text-amber-700' },
              ].map((k, i) => (
                <div key={i} className="p-4">
                  <p className="text-xs text-[#6B6B6B]">{k.label}</p>
                  <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Full detail when expanded */}
            {isExpanded && (
              <CardContent className="p-0">
                <Tabs defaultValue="bilan" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b border-[#F0F0F0] bg-white px-4">
                    <TabsTrigger value="bilan">📋 Bilan</TabsTrigger>
                    <TabsTrigger value="cr">📊 Compte de Résultat</TabsTrigger>
                    <TabsTrigger value="ratios">📈 Ratios & Analyse</TabsTrigger>
                  </TabsList>

                  {/* ===== BILAN ===== */}
                  <TabsContent value="bilan" className="p-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {/* ACTIF */}
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] mb-3 text-center">ACTIF — Exercice {s.fiscal_year}</h4>
                        <table className="w-full text-sm rounded-lg overflow-hidden border border-[#E5E7EB]">
                          <thead>
                            <tr className="bg-[#F5F5F5]">
                              <th className="text-left py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Désignation</th>
                              <th className="text-right py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Brut</th>
                              <th className="text-right py-2 px-3 text-xs text-red-500 font-semibold">Amort./Prov.</th>
                              <th className="text-right py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            <SectionHeader title="ACTIF IMMOBILISÉ" cols={3} />
                            <Row label="Immobilisations incorporelles"
                              brut={actif.immobilisations_incorporelles?.total_brut}
                              amort={actif.immobilisations_incorporelles?.total_amort}
                              net={actif.immobilisations_incorporelles?.total_net} indent />
                            <Row label="Immobilisations corporelles"
                              brut={actif.immobilisations_corporelles?.total_brut}
                              amort={actif.immobilisations_corporelles?.total_amort}
                              net={actif.immobilisations_corporelles?.total_net} indent />
                            <Row label="Immobilisations financières"
                              brut={actif.immobilisations_financieres?.total}
                              amort={0}
                              net={actif.immobilisations_financieres?.total} indent />

                            <SectionHeader title="ACTIF CIRCULANT" cols={3} />
                            <Row label="Stocks" brut={actif.stocks || 0} amort={0} net={actif.stocks || 0} indent />
                            <Row label="Créances clients (411)" brut={actif.creances?.clients} amort={0} net={actif.creances?.clients} indent />
                            <Row label="Autres créances" brut={actif.creances?.autres_creances} amort={0} net={actif.creances?.autres_creances} indent />
                            <Row label="Disponibilités (512-531)" brut={actif.disponibilites} amort={0} net={actif.disponibilites} indent />

                            <tr className="bg-[#1A1A1A]">
                              <td className="py-3 px-3 text-sm font-bold text-white">TOTAL ACTIF</td>
                              <td colSpan={2} />
                              <td className="py-3 px-3 text-right text-sm font-bold text-white">{fmt(actif.total_actif)} DJF</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* PASSIF */}
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] mb-3 text-center">PASSIF — Exercice {s.fiscal_year}</h4>
                        <table className="w-full text-sm rounded-lg overflow-hidden border border-[#E5E7EB]">
                          <thead>
                            <tr className="bg-[#F5F5F5]">
                              <th className="text-left py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Désignation</th>
                              <th className="text-right py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Montant (DJF)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <SectionHeader title="CAPITAUX PROPRES" cols={1} />
                            <Row label="Capital social (101)" net={passif.capitaux_propres?.capital_social} indent />
                            <Row label="Réserve légale (106)" net={passif.capitaux_propres?.reserve_legale} indent />
                            <Row label="Report à nouveau (11)" net={passif.capitaux_propres?.report_nouveau} indent />
                            <Row label="Résultat de l'exercice (12)" net={passif.capitaux_propres?.resultat_exercice} indent positive={passif.capitaux_propres?.resultat_exercice >= 0} />
                            <Row label="Total Capitaux Propres" net={passif.capitaux_propres?.total} bold separator />

                            <SectionHeader title="DETTES" cols={1} />
                            <Row label="Emprunts & dettes financières (16)" net={passif.dettes?.emprunts} indent />
                            <Row label="Fournisseurs & comptes rattachés (401)" net={passif.dettes?.fournisseurs} indent />
                            <Row label="Dettes fiscales et sociales (43-44)" net={passif.dettes?.dettes_fiscales_sociales} indent />
                            <Row label="Autres dettes" net={passif.dettes?.autres_dettes} indent />
                            <Row label="Total Dettes" net={passif.dettes?.total} bold separator />

                            <tr className="bg-[#1A1A1A]">
                              <td className="py-3 px-3 text-sm font-bold text-white">TOTAL PASSIF</td>
                              <td className="py-3 px-3 text-right text-sm font-bold text-white">{fmt(passif.total_passif)} DJF</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Balance check */}
                        <div className={`mt-3 p-3 rounded-lg text-xs ${balanced ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                          {balanced
                            ? '✅ Bilan équilibré — Actif = Passif'
                            : `⚠️ Différence : ${fmt(Math.abs((actif.total_actif || 0) - (passif.total_passif || 0)))} DJF — Vérifiez les écritures comptables`}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ===== COMPTE DE RÉSULTAT ===== */}
                  <TabsContent value="cr" className="p-4">
                    <h4 className="font-bold text-[#1A1A1A] mb-3 text-center">Compte de Résultat — Exercice {s.fiscal_year}</h4>
                    <table className="w-full text-sm rounded-lg overflow-hidden border border-[#E5E7EB]">
                      <thead>
                        <tr className="bg-[#F5F5F5]">
                          <th className="text-left py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Désignation</th>
                          <th className="text-right py-2 px-3 text-xs text-[#6B6B6B] font-semibold">Montant (DJF)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* PRODUITS */}
                        <SectionHeader title="PRODUITS D'EXPLOITATION" cols={1} />
                        <CRRow label="Ventes de marchandises (701)" amount={cr.produits_exploitation?.ventes_marchandises_701} indent />
                        <CRRow label="Prestations de services (706)" amount={cr.produits_exploitation?.prestations_services_706} indent />
                        <CRRow label="Autres produits d'exploitation" amount={cr.produits_exploitation?.autres_produits} indent />
                        <CRRow label="TOTAL PRODUITS D'EXPLOITATION" amount={cr.produits_exploitation?.total} bold separator />

                        {/* CHARGES */}
                        <SectionHeader title="CHARGES D'EXPLOITATION" cols={1} />
                        <CRRow label="Achats de matières (601)" amount={cr.charges_exploitation?.achats_matieres_601} indent isCharge />
                        <CRRow label="Achats & charges externes (606-628)" amount={
                          (cr.charges_exploitation?.achats_fournitures_606 || 0) +
                          (cr.charges_exploitation?.sous_traitance_611 || 0) +
                          (cr.charges_exploitation?.locations_613 || 0) +
                          (cr.charges_exploitation?.entretien_615 || 0) +
                          (cr.charges_exploitation?.assurances_616 || 0) +
                          (cr.charges_exploitation?.honoraires_622 || 0) +
                          (cr.charges_exploitation?.publicite_623 || 0) +
                          (cr.charges_exploitation?.transports_624 || 0) +
                          (cr.charges_exploitation?.telecom_626 || 0) +
                          (cr.charges_exploitation?.banque_627 || 0) +
                          (cr.charges_exploitation?.divers_628 || 0)
                        } indent isCharge />
                        <CRRow label="Impôts & taxes (635)" amount={cr.charges_exploitation?.impots_taxes_635} indent isCharge />
                        <CRRow label="Salaires & traitements (641)" amount={cr.charges_exploitation?.salaires_traitements_641} indent isCharge />
                        <CRRow label="Charges sociales CNSS (645)" amount={cr.charges_exploitation?.charges_sociales_cnss} indent isCharge />
                        <CRRow label="Dotations aux amortissements (68)" amount={cr.charges_exploitation?.dotations_amortissements} indent isCharge />
                        <CRRow label="Autres charges" amount={cr.charges_exploitation?.autres_charges} indent isCharge />
                        <CRRow label="TOTAL CHARGES D'EXPLOITATION" amount={cr.charges_exploitation?.total} bold isCharge separator />

                        {/* RÉSULTAT D'EXPLOITATION */}
                        <tr className="bg-blue-50">
                          <td className="py-3 px-3 text-sm font-bold text-blue-900">I. RÉSULTAT D'EXPLOITATION</td>
                          <td className={`py-3 px-3 text-right text-sm font-bold ${cr.resultat_exploitation >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                            {fmt(cr.resultat_exploitation)} DJF
                          </td>
                        </tr>

                        {/* FINANCIER */}
                        <SectionHeader title="RÉSULTAT FINANCIER" cols={1} />
                        <CRRow label="Produits financiers (762)" amount={cr.produits_financiers} indent />
                        <CRRow label="Charges financières — intérêts (661)" amount={cr.charges_financieres} indent isCharge />
                        <tr className="bg-purple-50">
                          <td className="py-3 px-3 text-sm font-bold text-purple-900">II. RÉSULTAT FINANCIER</td>
                          <td className={`py-3 px-3 text-right text-sm font-bold ${cr.resultat_financier >= 0 ? 'text-purple-900' : 'text-red-700'}`}>
                            {fmt(cr.resultat_financier)} DJF
                          </td>
                        </tr>

                        {/* COURANT */}
                        <tr className="bg-indigo-50">
                          <td className="py-3 px-3 text-sm font-bold text-indigo-900">III. RÉSULTAT COURANT AVANT IMPÔTS (I + II)</td>
                          <td className={`py-3 px-3 text-right text-sm font-bold ${cr.resultat_courant_avant_impots >= 0 ? 'text-indigo-900' : 'text-red-700'}`}>
                            {fmt(cr.resultat_courant_avant_impots)} DJF
                          </td>
                        </tr>

                        {/* EXCEPTIONNEL */}
                        <SectionHeader title="RÉSULTAT EXCEPTIONNEL" cols={1} />
                        <CRRow label="Produits exceptionnels" amount={cr.produits_exceptionnels} indent />
                        <CRRow label="Charges exceptionnelles" amount={cr.charges_exceptionnelles} indent isCharge />

                        {/* IMPÔT */}
                        <SectionHeader title="IMPÔT SUR LES SOCIÉTÉS" cols={1} />
                        <CRRow label="IMF / IS (Impôt Minimum Forfaitaire Djibouti)" amount={cr.impot_societes} indent isCharge />

                        {/* RÉSULTAT NET */}
                        <tr className={`${cr.resultat_net >= 0 ? 'bg-green-700' : 'bg-red-700'}`}>
                          <td className="py-3 px-3 text-sm font-bold text-white">RÉSULTAT NET DE L'EXERCICE {s.fiscal_year}</td>
                          <td className="py-3 px-3 text-right text-lg font-bold text-white">
                            {cr.resultat_net >= 0 ? '+' : ''}{fmt(cr.resultat_net)} DJF
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </TabsContent>

                  {/* ===== RATIOS ===== */}
                  <TabsContent value="ratios" className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ratios de liquidité */}
                      <Card className="border border-[#E5E7EB]">
                        <CardContent className="p-5">
                          <h4 className="font-bold text-[#1A1A1A] mb-4">Ratios de Liquidité</h4>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm text-[#6B6B6B]">Liquidité générale</span>
                                <span className={`font-bold text-sm ${ratios.liquidite_generale >= 1 ? 'text-green-700' : 'text-red-600'}`}>
                                  {(ratios.liquidite_generale || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-[#F0F0F0] rounded-full">
                                <div className={`h-full rounded-full ${ratios.liquidite_generale >= 1 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: Math.min((ratios.liquidite_generale || 0) * 50, 100) + '%' }} />
                              </div>
                              <p className="text-xs text-[#9CA3AF] mt-1">Norme: &gt; 1 (idéalement &gt; 2)</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Ratios de structure */}
                      <Card className="border border-[#E5E7EB]">
                        <CardContent className="p-5">
                          <h4 className="font-bold text-[#1A1A1A] mb-4">Ratios de Structure</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6B6B6B]">Autonomie financière</span>
                              <span className={`font-bold text-sm ${(ratios.autonomie_financiere || 0) >= 30 ? 'text-green-700' : 'text-amber-600'}`}>
                                {(ratios.autonomie_financiere || 0).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6B6B6B]">Taux d'endettement</span>
                              <span className={`font-bold text-sm ${(ratios.endettement || 0) <= 100 ? 'text-green-700' : 'text-red-600'}`}>
                                {(ratios.endettement || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Ratios de rentabilité */}
                      <Card className="border border-[#E5E7EB]">
                        <CardContent className="p-5">
                          <h4 className="font-bold text-[#1A1A1A] mb-4">Rentabilité</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6B6B6B]">Marge nette</span>
                              <span className={`font-bold text-sm ${(ratios.rentabilite_nette || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {(ratios.rentabilite_nette || 0).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-[#6B6B6B]">Résultat d'exploitation</span>
                              <span className={`font-bold text-sm ${(cr.resultat_exploitation || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {fmt(cr.resultat_exploitation)} DJF
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* IMF Djibouti */}
                      <Card className="border border-[#E5E7EB] bg-amber-50">
                        <CardContent className="p-5">
                          <h4 className="font-bold text-amber-900 mb-3">🏛️ Fiscalité Djibouti</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-amber-800">IMF (Impôt Minimum Forfaitaire)</span>
                              <span className="font-bold text-amber-900">{fmt(cr.impot_societes)} DJF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-800">Résultat net après impôt</span>
                              <span className={`font-bold ${cr.resultat_net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(cr.resultat_net)} DJF</span>
                            </div>
                            <p className="text-xs text-amber-700 mt-2">
                              Conforme au Code des Impôts de la République de Djibouti.
                              L'IMF est calculé sur le chiffre d'affaires HT.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}