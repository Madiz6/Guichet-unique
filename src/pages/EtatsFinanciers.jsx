import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Scale, BarChart3, AlertTriangle, CheckCircle, FileText, RefreshCw, Building2, DollarSign, Clock } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);

// PCG account classification helpers
const getClass = (account) => parseInt(String(account || '0')[0]) || 0;

const isActifImmobilise = (acc) => getClass(acc) === 2;
const isStock = (acc) => getClass(acc) === 3;
const isTiers = (acc) => getClass(acc) === 4;
const isTresorerie = (acc) => getClass(acc) === 5;
const isCharge = (acc) => getClass(acc) === 6;
const isProduit = (acc) => getClass(acc) === 7;
const isCapitaux = (acc) => getClass(acc) === 1;

// Net balance for an account (positive = debit balance, negative = credit balance)
function netBalance(account, entries) {
  let debit = 0, credit = 0;
  for (const e of entries) {
    if (e.debit_account === account) debit += e.amount || 0;
    if (e.credit_account === account) credit += e.amount || 0;
  }
  return debit - credit;
}

// Build trial balance map from ledger entries
function buildTrialBalance(entries) {
  const map = {};
  for (const e of entries) {
    const da = e.debit_account;
    const ca = e.credit_account;
    if (!map[da]) map[da] = { account: da, label: e.debit_account_label || da, debit: 0, credit: 0 };
    if (!map[ca]) map[ca] = { account: ca, label: e.credit_account_label || ca, debit: 0, credit: 0 };
    map[da].debit += e.amount || 0;
    map[ca].credit += e.amount || 0;
  }
  return Object.values(map).map(r => ({
    ...r,
    solde_debiteur: Math.max(0, r.debit - r.credit),
    solde_crediteur: Math.max(0, r.credit - r.debit),
  })).sort((a, b) => a.account.localeCompare(b.account));
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function EtatsFinanciers() {
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [activeTab, setActiveTab] = useState('bilan');

  const { data: ledgerEntries = [], isLoading, refetch } = useQuery({
    queryKey: ['ledger-entries-financials'],
    queryFn: () => meras.entities.LedgerEntry.list('-date', 2000),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts-financials'],
    queryFn: () => meras.entities.DebtCentralized.list('-created_date', 500),
  });

  const { data: company } = useQuery({
    queryKey: ['company-financials'],
    queryFn: async () => {
      const list = await meras.entities.Company.list();
      return list[0] || null;
    },
  });

  // Filter entries by selected year
  const yearEntries = useMemo(() =>
    ledgerEntries.filter(e => e.date && e.date.startsWith(selectedYear)),
    [ledgerEntries, selectedYear]
  );

  const trialBalance = useMemo(() => buildTrialBalance(yearEntries), [yearEntries]);
  const allTimeBalance = useMemo(() => buildTrialBalance(ledgerEntries), [ledgerEntries]);

  // ─── BILAN ────────────────────────────────────────────────────────────────
  const bilan = useMemo(() => {
    const tb = allTimeBalance; // Bilan uses cumulative balances

    // ACTIF IMMOBILISÉ (Class 2)
    const actifImmobilise = tb.filter(r => isActifImmobilise(r.account));
    const totalActifImmobilise = actifImmobilise.reduce((s, r) => s + r.solde_debiteur, 0);

    // ACTIF CIRCULANT (Class 3 stocks + Class 4 debit tiers + Class 5 tresorerie)
    const stocks = tb.filter(r => isStock(r.account));
    const totalStocks = stocks.reduce((s, r) => s + r.solde_debiteur, 0);

    const tiersDebiteurs = tb.filter(r => isTiers(r.account) && r.solde_debiteur > 0);
    const totalTiers = tiersDebiteurs.reduce((s, r) => s + r.solde_debiteur, 0);

    const tresorerie = tb.filter(r => isTresorerie(r.account) && r.solde_debiteur > 0);
    const totalTresorerie = tresorerie.reduce((s, r) => s + r.solde_debiteur, 0);

    const totalActifCirculant = totalStocks + totalTiers + totalTresorerie;
    const totalActif = totalActifImmobilise + totalActifCirculant;

    // PASSIF — CAPITAUX PROPRES (Class 1)
    const capitaux = tb.filter(r => isCapitaux(r.account));
    const totalCapitaux = capitaux.reduce((s, r) => s + r.solde_crediteur, 0);

    // Résultat de l'exercice (Produits - Charges for the year)
    const produits = yearEntries.filter(e => isProduit(e.credit_account));
    const totalProduits = produits.reduce((s, e) => s + (e.amount || 0), 0);
    const charges = yearEntries.filter(e => isCharge(e.debit_account));
    const totalCharges = charges.reduce((s, e) => s + (e.amount || 0), 0);
    const resultat = totalProduits - totalCharges;

    // DETTES (Class 1 credit balance + class 4 credit tiers)
    const emprunts = tb.filter(r => isCapitaux(r.account) && r.solde_debiteur > 0);
    const totalEmprunts = emprunts.reduce((s, r) => s + r.solde_debiteur, 0);

    const tiersCreditors = tb.filter(r => isTiers(r.account) && r.solde_crediteur > 0);
    const totalDettes = tiersCreditors.reduce((s, r) => s + r.solde_crediteur, 0);

    const totalPassif = totalCapitaux + resultat + totalDettes;

    return {
      actifImmobilise, totalActifImmobilise,
      stocks, totalStocks,
      tiersDebiteurs, totalTiers,
      tresorerie, totalTresorerie,
      totalActifCirculant, totalActif,
      capitaux, totalCapitaux,
      resultat,
      tiersCreditors, totalDettes,
      totalPassif,
      isBalanced: Math.abs(totalActif - totalPassif) < 100,
    };
  }, [allTimeBalance, yearEntries]);

  // ─── COMPTE DE RÉSULTAT ───────────────────────────────────────────────────
  const compteResultat = useMemo(() => {
    const tb = trialBalance;

    const produitsRows = tb.filter(r => isProduit(r.account));
    const totalProduits = produitsRows.reduce((s, r) => s + r.solde_crediteur, 0);

    const chargesRows = tb.filter(r => isCharge(r.account));
    const totalCharges = chargesRows.reduce((s, r) => s + r.solde_debiteur, 0);

    const resultat = totalProduits - totalCharges;

    return { produitsRows, totalProduits, chargesRows, totalCharges, resultat };
  }, [trialBalance]);

  // ─── SIG (Soldes Intermédiaires de Gestion) ───────────────────────────────
  const sig = useMemo(() => {
    const get = (prefix) => trialBalance
      .filter(r => r.account.startsWith(prefix))
      .reduce((s, r) => s + (isProduit(r.account) ? r.solde_crediteur : r.solde_debiteur), 0);

    const ca = get('706') + get('707') + get('708') + get('7');
    const achatsRevendus = get('606') + get('607');
    const margeCommerciale = ca - achatsRevendus;

    const autresProduits = trialBalance.filter(r => isProduit(r.account)).reduce((s, r) => s + r.solde_crediteur, 0);
    const production = autresProduits;

    const chargesExternes = get('61') + get('62');
    const valeurAjoutee = production - achatsRevendus - chargesExternes;

    const chargesPersonnel = get('641') + get('645') + get('64');
    const impots = get('63');
    const ebe = valeurAjoutee - chargesPersonnel - impots;

    const dotations = get('681') + get('682') + get('68');
    const reprisesProvisions = get('781') + get('78');
    const resultatExploitation = ebe - dotations + reprisesProvisions;

    const produitsFin = get('76') + get('77');
    const chargesFin = get('66') + get('67');
    const resultatFinancier = produitsFin - chargesFin;

    const resultatCourant = resultatExploitation + resultatFinancier;
    const resultatNet = compteResultat.resultat;

    return {
      ca: compteResultat.totalProduits,
      margeCommerciale,
      valeurAjoutee,
      ebe,
      resultatExploitation,
      resultatFinancier,
      resultatCourant,
      resultatNet,
      chargesPersonnel,
    };
  }, [trialBalance, compteResultat]);

  // ─── BALANCE ÂGÉE ─────────────────────────────────────────────────────────
  const balanceAgee = useMemo(() => {
    const today = new Date();
    const buckets = { current: [], d30: [], d60: [], d90: [], over90: [] };

    debts.filter(d => d.status !== 'Réglée' && d.amount_remaining > 0).forEach(d => {
      const due = d.due_date ? new Date(d.due_date) : null;
      const days = due ? Math.floor((today - due) / (1000 * 60 * 60 * 24)) : 0;
      if (days <= 0) buckets.current.push(d);
      else if (days <= 30) buckets.d30.push(d);
      else if (days <= 60) buckets.d60.push(d);
      else if (days <= 90) buckets.d90.push(d);
      else buckets.over90.push(d);
    });

    const sum = (arr) => arr.reduce((s, d) => s + (d.amount_remaining || 0), 0);
    return {
      buckets,
      totals: {
        current: sum(buckets.current),
        d30: sum(buckets.d30),
        d60: sum(buckets.d60),
        d90: sum(buckets.d90),
        over90: sum(buckets.over90),
        total: sum(Object.values(buckets).flat()),
      },
    };
  }, [debts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#6B6B6B] text-sm">Génération des états financiers...</p>
        </div>
      </div>
    );
  }

  const totalEntries = ledgerEntries.length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">États Financiers</h1>
            <p className="text-[#6B6B6B] mt-1 text-sm">
              {company?.nom_entreprise || 'Votre entreprise'} · PCG Djibouti · Double entrée immuable · {totalEntries} écritures
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={String(y)}>Exercice {y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Résultat net", icon: TrendingUp,
              value: fmt(compteResultat.resultat) + ' DJF',
              color: compteResultat.resultat >= 0 ? 'text-green-600' : 'text-red-500',
              bg: compteResultat.resultat >= 0 ? 'bg-green-50' : 'bg-red-50',
              sub: compteResultat.resultat >= 0 ? 'Bénéfice' : 'Déficit',
            },
            {
              label: "Total Actif", icon: Building2,
              value: fmt(bilan.totalActif) + ' DJF',
              color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Patrimoine total',
            },
            {
              label: "EBE", icon: BarChart3,
              value: fmt(sig.ebe) + ' DJF',
              color: sig.ebe >= 0 ? 'text-emerald-600' : 'text-red-500',
              bg: sig.ebe >= 0 ? 'bg-emerald-50' : 'bg-red-50',
              sub: 'Excédent brut exploitation',
            },
            {
              label: "Dettes actives", icon: AlertTriangle,
              value: fmt(balanceAgee.totals.total) + ' DJF',
              color: 'text-amber-600', bg: 'bg-amber-50', sub: 'À régler',
            },
          ].map((k, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <p className="text-xs text-[#6B6B6B]">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-[#9CA3AF]">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-[#E5E7EB] flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="bilan">🏦 Bilan</TabsTrigger>
            <TabsTrigger value="compte_resultat">📊 Compte de Résultat</TabsTrigger>
            <TabsTrigger value="sig">📈 SIG</TabsTrigger>
            <TabsTrigger value="balance">⚖️ Balance Générale</TabsTrigger>
            <TabsTrigger value="balance_agee">🕐 Balance Âgée</TabsTrigger>
          </TabsList>

          {/* ─── BILAN ─────────────────────────────────────────────────────── */}
          <TabsContent value="bilan" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">Bilan — Exercice {selectedYear}</h2>
                <p className="text-sm text-[#6B6B6B]">{company?.nom_entreprise || ''}</p>
              </div>
              <Badge className={bilan.isBalanced ? 'bg-green-100 text-green-800 px-3 py-1' : 'bg-red-100 text-red-800 px-3 py-1'}>
                {bilan.isBalanced ? <><CheckCircle className="w-3.5 h-3.5 mr-1 inline" />ACTIF = PASSIF</> : <><AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />Déséquilibre</>}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ACTIF */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-blue-600 text-white px-5 py-3">
                  <h3 className="font-bold text-lg">ACTIF</h3>
                  <p className="text-blue-200 text-xs">Ce que possède l'entreprise</p>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {/* Actif immobilisé */}
                  <div className="px-5 py-3 bg-blue-50/50">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Actif Immobilisé (Classe 2)</p>
                  </div>
                  {bilan.actifImmobilise.length === 0 ? (
                    <div className="px-5 py-2 text-sm text-[#9CA3AF] italic">— Aucun actif immobilisé</div>
                  ) : bilan.actifImmobilise.map(r => (
                    <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_debiteur} />
                  ))}
                  <SubtotalRow label="Sous-total Actif Immobilisé" amount={bilan.totalActifImmobilise} color="text-blue-700" />

                  {/* Actif circulant */}
                  <div className="px-5 py-3 bg-blue-50/50">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Actif Circulant</p>
                  </div>
                  {bilan.stocks.length > 0 && <div className="px-5 py-1 text-xs text-[#6B6B6B] font-semibold">Stocks (Classe 3)</div>}
                  {bilan.stocks.map(r => <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_debiteur} />)}
                  {bilan.tiersDebiteurs.length > 0 && <div className="px-5 py-1 text-xs text-[#6B6B6B] font-semibold">Créances clients & tiers (Classe 4)</div>}
                  {bilan.tiersDebiteurs.map(r => <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_debiteur} />)}
                  {bilan.tresorerie.length > 0 && <div className="px-5 py-1 text-xs text-[#6B6B6B] font-semibold">Trésorerie (Classe 5)</div>}
                  {bilan.tresorerie.map(r => <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_debiteur} />)}
                  <SubtotalRow label="Sous-total Actif Circulant" amount={bilan.totalActifCirculant} color="text-blue-700" />
                </div>
                <div className="bg-blue-600 text-white px-5 py-3 flex justify-between items-center">
                  <span className="font-bold">TOTAL ACTIF</span>
                  <span className="font-bold text-lg">{fmt(bilan.totalActif)} DJF</span>
                </div>
              </Card>

              {/* PASSIF */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-purple-600 text-white px-5 py-3">
                  <h3 className="font-bold text-lg">PASSIF</h3>
                  <p className="text-purple-200 text-xs">Comment l'entreprise est financée</p>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {/* Capitaux propres */}
                  <div className="px-5 py-3 bg-purple-50/50">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Capitaux Propres (Classe 1)</p>
                  </div>
                  {bilan.capitaux.map(r => (
                    <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_crediteur} />
                  ))}
                  <BilanRow account="12x" label={`Résultat de l'exercice ${selectedYear}`} amount={bilan.resultat} highlight={bilan.resultat >= 0 ? 'green' : 'red'} />
                  <SubtotalRow label="Sous-total Capitaux Propres" amount={bilan.totalCapitaux + bilan.resultat} color="text-purple-700" />

                  {/* Dettes */}
                  <div className="px-5 py-3 bg-purple-50/50">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Dettes (Tiers créditeurs — Classe 4)</p>
                  </div>
                  {bilan.tiersCreditors.length === 0 ? (
                    <div className="px-5 py-2 text-sm text-[#9CA3AF] italic">— Aucune dette</div>
                  ) : bilan.tiersCreditors.map(r => (
                    <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_crediteur} />
                  ))}
                  <SubtotalRow label="Sous-total Dettes" amount={bilan.totalDettes} color="text-purple-700" />
                </div>
                <div className="bg-purple-600 text-white px-5 py-3 flex justify-between items-center">
                  <span className="font-bold">TOTAL PASSIF</span>
                  <span className="font-bold text-lg">{fmt(bilan.totalPassif)} DJF</span>
                </div>
              </Card>
            </div>
            {!bilan.isBalanced && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Écart de {fmt(Math.abs(bilan.totalActif - bilan.totalPassif))} DJF. Vérifiez que toutes les transactions sont comptabilisées dans le Grand Livre.
              </div>
            )}
          </TabsContent>

          {/* ─── COMPTE DE RÉSULTAT ────────────────────────────────────────── */}
          <TabsContent value="compte_resultat" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">Compte de Résultat — Exercice {selectedYear}</h2>
                <p className="text-sm text-[#6B6B6B]">Produits − Charges = Résultat net</p>
              </div>
              <Badge className={compteResultat.resultat >= 0 ? 'bg-green-100 text-green-800 px-3 py-1' : 'bg-red-100 text-red-800 px-3 py-1'}>
                {compteResultat.resultat >= 0 ? '✅ Bénéfice' : '❌ Déficit'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Produits */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-green-600 text-white px-5 py-3">
                  <h3 className="font-bold">PRODUITS (Classe 7)</h3>
                  <p className="text-green-200 text-sm font-bold">{fmt(compteResultat.totalProduits)} DJF</p>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {compteResultat.produitsRows.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-[#9CA3AF] italic text-center">Aucun produit enregistré</div>
                  ) : compteResultat.produitsRows.map(r => (
                    <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_crediteur} />
                  ))}
                </div>
                <div className="bg-green-50 border-t border-green-200 px-5 py-3 flex justify-between">
                  <span className="font-bold text-green-800">Total Produits</span>
                  <span className="font-bold text-green-800">{fmt(compteResultat.totalProduits)} DJF</span>
                </div>
              </Card>

              {/* Charges */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-red-500 text-white px-5 py-3">
                  <h3 className="font-bold">CHARGES (Classe 6)</h3>
                  <p className="text-red-200 text-sm font-bold">{fmt(compteResultat.totalCharges)} DJF</p>
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {compteResultat.chargesRows.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-[#9CA3AF] italic text-center">Aucune charge enregistrée</div>
                  ) : compteResultat.chargesRows.map(r => (
                    <BilanRow key={r.account} account={r.account} label={r.label} amount={r.solde_debiteur} />
                  ))}
                </div>
                <div className="bg-red-50 border-t border-red-200 px-5 py-3 flex justify-between">
                  <span className="font-bold text-red-800">Total Charges</span>
                  <span className="font-bold text-red-800">{fmt(compteResultat.totalCharges)} DJF</span>
                </div>
              </Card>
            </div>

            {/* Résultat final */}
            <Card className={`border-0 shadow-sm mt-4 ${compteResultat.resultat >= 0 ? 'bg-green-600' : 'bg-red-500'} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Résultat net de l'exercice {selectedYear}</p>
                    <p className="text-3xl font-bold mt-1">{fmt(compteResultat.resultat)} DJF</p>
                    <p className="text-white/80 text-sm mt-1">{compteResultat.resultat >= 0 ? '✅ Bénéfice' : '❌ Perte'} · {fmt(compteResultat.totalProduits)} − {fmt(compteResultat.totalCharges)}</p>
                  </div>
                  <DollarSign className="w-16 h-16 text-white/20" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── SIG ────────────────────────────────────────────────────────── */}
          <TabsContent value="sig" className="mt-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Soldes Intermédiaires de Gestion — {selectedYear}</h2>
              <p className="text-sm text-[#6B6B6B]">Analyse de la performance économique selon les normes PCG</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Chiffre d'Affaires (CA)", value: sig.ca, desc: "Produits de l'activité principale", color: "blue" },
                { label: "Marge Commerciale", value: sig.margeCommerciale, desc: "CA − Achats revendus (606-607)", color: "blue" },
                { label: "Valeur Ajoutée (VA)", value: sig.valeurAjoutee, desc: "Production − Consommations intermédiaires", color: "indigo" },
                { label: "Excédent Brut d'Exploitation (EBE)", value: sig.ebe, desc: "VA − Charges personnel − Impôts", color: "emerald", big: true },
                { label: "Résultat d'Exploitation", value: sig.resultatExploitation, desc: "EBE − Dotations + Reprises", color: "teal" },
                { label: "Résultat Financier", value: sig.resultatFinancier, desc: "Produits financiers − Charges financières", color: "violet" },
                { label: "Résultat Courant", value: sig.resultatCourant, desc: "Exploitation + Financier", color: "purple" },
                { label: "Résultat Net", value: sig.resultatNet, desc: "Résultat final après tout", color: sig.resultatNet >= 0 ? "green" : "red", big: true },
              ].map((row, i) => (
                <SIGRow key={i} {...row} />
              ))}
            </div>
          </TabsContent>

          {/* ─── BALANCE GÉNÉRALE ───────────────────────────────────────────── */}
          <TabsContent value="balance" className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">Balance Générale — {selectedYear}</h2>
                <p className="text-sm text-[#6B6B6B]">Tous les comptes PCG · Total Débit = Total Crédit</p>
              </div>
              <Badge className={
                Math.abs(trialBalance.reduce((s, r) => s + r.debit, 0) - trialBalance.reduce((s, r) => s + r.credit, 0)) < 1
                  ? 'bg-green-100 text-green-800 px-3 py-1'
                  : 'bg-red-100 text-red-800 px-3 py-1'
              }>
                {Math.abs(trialBalance.reduce((s, r) => s + r.debit, 0) - trialBalance.reduce((s, r) => s + r.credit, 0)) < 1
                  ? '✅ Équilibrée'
                  : '⚠️ Déséquilibrée'}
              </Badge>
            </div>
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="text-left py-3 px-4 font-semibold">Classe</th>
                      <th className="text-left py-3 px-4 font-semibold">Compte</th>
                      <th className="text-left py-3 px-4 font-semibold">Intitulé</th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-300">Total Débit</th>
                      <th className="text-right py-3 px-4 font-semibold text-orange-300">Total Crédit</th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-200">Solde Débiteur</th>
                      <th className="text-right py-3 px-4 font-semibold text-orange-200">Solde Créditeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {trialBalance.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-[#9CA3AF]">Aucune écriture pour l'exercice {selectedYear}</td></tr>
                    ) : trialBalance.map((r, i) => {
                      const cls = getClass(r.account);
                      return (
                        <tr key={i} className="hover:bg-[#FAFAFA]">
                          <td className="py-2.5 px-4">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              cls === 1 ? 'bg-purple-100 text-purple-700' :
                              cls === 2 ? 'bg-blue-100 text-blue-700' :
                              cls === 3 ? 'bg-yellow-100 text-yellow-700' :
                              cls === 4 ? 'bg-orange-100 text-orange-700' :
                              cls === 5 ? 'bg-teal-100 text-teal-700' :
                              cls === 6 ? 'bg-red-100 text-red-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {cls}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-[#1A1A1A]">{r.account}</td>
                          <td className="py-2.5 px-4 text-[#6B6B6B]">{r.label}</td>
                          <td className="py-2.5 px-4 text-right text-blue-700">{fmt(r.debit)}</td>
                          <td className="py-2.5 px-4 text-right text-orange-700">{fmt(r.credit)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-blue-900">{r.solde_debiteur > 0 ? fmt(r.solde_debiteur) : '—'}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-orange-900">{r.solde_crediteur > 0 ? fmt(r.solde_crediteur) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {trialBalance.length > 0 && (() => {
                    const td = trialBalance.reduce((s, r) => s + r.debit, 0);
                    const tc = trialBalance.reduce((s, r) => s + r.credit, 0);
                    return (
                      <tfoot className="bg-[#1A1A1A] text-white">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 font-bold">TOTAUX</td>
                          <td className="py-3 px-4 text-right font-bold text-blue-300">{fmt(td)}</td>
                          <td className="py-3 px-4 text-right font-bold text-orange-300">{fmt(tc)}</td>
                          <td className="py-3 px-4 text-right font-bold">{fmt(trialBalance.reduce((s, r) => s + r.solde_debiteur, 0))}</td>
                          <td className="py-3 px-4 text-right font-bold">{fmt(trialBalance.reduce((s, r) => s + r.solde_crediteur, 0))}</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ─── BALANCE ÂGÉE ──────────────────────────────────────────────── */}
          <TabsContent value="balance_agee" className="mt-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Balance Âgée des Dettes</h2>
              <p className="text-sm text-[#6B6B6B]">Analyse de l'ancienneté des dettes impayées · Utilisé par les banques et experts-comptables</p>
            </div>

            {/* Summary buckets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'À venir / Courant', count: balanceAgee.buckets.current.length, total: balanceAgee.totals.current, color: 'green' },
                { label: '1 – 30 jours', count: balanceAgee.buckets.d30.length, total: balanceAgee.totals.d30, color: 'yellow' },
                { label: '31 – 60 jours', count: balanceAgee.buckets.d60.length, total: balanceAgee.totals.d60, color: 'orange' },
                { label: '61 – 90 jours', count: balanceAgee.buckets.d90.length, total: balanceAgee.totals.d90, color: 'red' },
                { label: '> 90 jours', count: balanceAgee.buckets.over90.length, total: balanceAgee.totals.over90, color: 'rose' },
              ].map((b, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className={`flex items-center gap-1.5 mb-2`}>
                      <Clock className={`w-3.5 h-3.5 ${
                        b.color === 'green' ? 'text-green-500' :
                        b.color === 'yellow' ? 'text-yellow-500' :
                        b.color === 'orange' ? 'text-orange-500' :
                        b.color === 'red' ? 'text-red-500' : 'text-rose-600'
                      }`} />
                      <p className="text-xs font-semibold text-[#6B6B6B]">{b.label}</p>
                    </div>
                    <p className={`text-lg font-bold ${
                      b.color === 'green' ? 'text-green-700' :
                      b.color === 'yellow' ? 'text-yellow-700' :
                      b.color === 'orange' ? 'text-orange-700' :
                      b.color === 'red' ? 'text-red-700' : 'text-rose-700'
                    }`}>{fmt(b.total)} DJF</p>
                    <p className="text-xs text-[#9CA3AF]">{b.count} dette(s)</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Aged debt table */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1A1A1A] text-white">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Créancier</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-right py-3 px-4 font-semibold">Montant dû</th>
                      <th className="text-right py-3 px-4 font-semibold">Restant</th>
                      <th className="text-center py-3 px-4 font-semibold">Échéance</th>
                      <th className="text-center py-3 px-4 font-semibold">Ancienneté</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {debts.filter(d => d.status !== 'Réglée' && d.amount_remaining > 0).length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-[#9CA3AF]">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                        Aucune dette impayée — balance âgée vide
                      </td></tr>
                    ) : debts.filter(d => d.status !== 'Réglée' && d.amount_remaining > 0).map((d, i) => {
                      const today = new Date();
                      const due = d.due_date ? new Date(d.due_date) : null;
                      const days = due ? Math.floor((today - due) / (1000 * 60 * 60 * 24)) : 0;
                      const agingColor = days <= 0 ? 'text-green-600 bg-green-50' :
                        days <= 30 ? 'text-yellow-700 bg-yellow-50' :
                        days <= 60 ? 'text-orange-700 bg-orange-50' :
                        days <= 90 ? 'text-red-700 bg-red-50' : 'text-rose-800 bg-rose-50';
                      return (
                        <tr key={i} className="hover:bg-[#FAFAFA]">
                          <td className="py-2.5 px-4 font-medium text-[#1A1A1A]">{d.contact_name || '—'}</td>
                          <td className="py-2.5 px-4">
                            <Badge className="text-xs bg-gray-100 text-gray-700">{d.debt_type}</Badge>
                          </td>
                          <td className="py-2.5 px-4 text-[#6B6B6B] max-w-[200px] truncate">{d.description}</td>
                          <td className="py-2.5 px-4 text-right font-medium">{fmt(d.amount_due)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-red-700">{fmt(d.amount_remaining)}</td>
                          <td className="py-2.5 px-4 text-center text-xs text-[#6B6B6B]">{d.due_date || '—'}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${agingColor}`}>
                              {days <= 0 ? 'Courant' : `${days}j`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {debts.filter(d => d.status !== 'Réglée' && d.amount_remaining > 0).length > 0 && (
                    <tfoot className="bg-[#1A1A1A] text-white">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 font-bold">TOTAL DETTES IMPAYÉES</td>
                        <td className="py-3 px-4 text-right font-bold text-red-300">
                          {fmt(debts.filter(d => d.status !== 'Réglée').reduce((s, d) => s + (d.amount_remaining || 0), 0))} DJF
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function BilanRow({ account, label, amount, highlight }) {
  return (
    <div className="flex items-center justify-between px-5 py-2 hover:bg-[#FAFAFA]">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{account}</span>
        <span className="text-sm text-[#4B4B4B]">{label}</span>
      </div>
      <span className={`text-sm font-bold ${
        highlight === 'green' ? 'text-green-700' :
        highlight === 'red' ? 'text-red-600' :
        'text-[#1A1A1A]'
      }`}>
        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} DJF
      </span>
    </div>
  );
}

function SubtotalRow({ label, amount, color }) {
  return (
    <div className={`flex items-center justify-between px-5 py-2.5 bg-[#F9F9F9] border-t border-b`}>
      <span className={`text-xs font-bold uppercase tracking-wide ${color || 'text-[#6B6B6B]'}`}>{label}</span>
      <span className={`text-sm font-bold ${color || 'text-[#1A1A1A]'}`}>
        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} DJF
      </span>
    </div>
  );
}

function SIGRow({ label, value, desc, color, big }) {
  const isPositive = value >= 0;
  const colorMap = {
    blue: ['bg-blue-50', 'text-blue-700'],
    indigo: ['bg-indigo-50', 'text-indigo-700'],
    emerald: ['bg-emerald-50', 'text-emerald-700'],
    teal: ['bg-teal-50', 'text-teal-700'],
    violet: ['bg-violet-50', 'text-violet-700'],
    purple: ['bg-purple-50', 'text-purple-700'],
    green: ['bg-green-50', 'text-green-700'],
    red: ['bg-red-50', 'text-red-600'],
  };
  const [bg, text] = colorMap[color] || ['bg-gray-50', 'text-gray-700'];

  return (
    <Card className={`border-0 shadow-sm ${big ? 'shadow-md' : ''}`}>
      <CardContent className={`p-4 flex items-center justify-between ${big ? 'py-5' : ''}`}>
        <div>
          <p className={`font-bold ${big ? 'text-base' : 'text-sm'} text-[#1A1A1A]`}>{label}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">{desc}</p>
        </div>
        <div className={`px-4 py-2 rounded-lg ${bg} text-right`}>
          <p className={`font-bold ${big ? 'text-xl' : 'text-base'} ${text}`}>
            {value >= 0 ? '' : '−'}{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(value || 0))} DJF
          </p>
        </div>
      </CardContent>
    </Card>
  );
}