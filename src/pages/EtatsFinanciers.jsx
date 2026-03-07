import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meras } from '@/components/core/MerasClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Scale, BarChart3, AlertTriangle, CheckCircle, FileText, RefreshCw, Building2, DollarSign, Clock, PieChart, BookOpen } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n) => (n === null || n === undefined || !isFinite(n) ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');

// PCG class helpers
const getClass = (acc) => parseInt(String(acc || '0')[0]) || 0;
const isClass = (acc, ...classes) => classes.includes(getClass(acc));

// Build trial balance map
function buildTrialBalance(entries) {
  const map = {};
  for (const e of entries) {
    const da = e.debit_account, ca = e.credit_account;
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
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: ledgerEntries = [], isLoading, refetch } = useQuery({
    queryKey: ['ledger-entries-ef'],
    queryFn: () => meras.entities.LedgerEntry.list('-date', 2000),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts-ef'],
    queryFn: () => meras.entities.DebtCentralized.list('-created_date', 500),
  });

  const { data: company } = useQuery({
    queryKey: ['company-ef'],
    queryFn: async () => { const l = await meras.entities.Company.list(); return l[0] || null; },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets-ef'],
    queryFn: () => meras.entities.Asset.list(),
  });

  // Year-filtered entries
  const yearEntries = useMemo(() => ledgerEntries.filter(e => e.date?.startsWith(selectedYear)), [ledgerEntries, selectedYear]);
  const prevEntries = useMemo(() => ledgerEntries.filter(e => e.date?.startsWith(String(parseInt(selectedYear) - 1))), [ledgerEntries, selectedYear]);

  const tb = useMemo(() => buildTrialBalance(yearEntries), [yearEntries]);
  const tbPrev = useMemo(() => buildTrialBalance(prevEntries), [prevEntries]);
  const tbAll = useMemo(() => buildTrialBalance(ledgerEntries), [ledgerEntries]);

  // ── COMPTE DE RÉSULTAT ──────────────────────────────────────────────────
  const cr = useMemo(() => {
    const produits = tb.filter(r => isClass(r.account, 7));
    const charges = tb.filter(r => isClass(r.account, 6));
    const produitsPrev = tbPrev.filter(r => isClass(r.account, 7));
    const chargesPrev = tbPrev.filter(r => isClass(r.account, 6));

    const totalProduits = produits.reduce((s, r) => s + r.solde_crediteur, 0);
    const totalCharges = charges.reduce((s, r) => s + r.solde_debiteur, 0);
    const totalProduitsPrev = produitsPrev.reduce((s, r) => s + r.solde_crediteur, 0);
    const totalChargesPrev = chargesPrev.reduce((s, r) => s + r.solde_debiteur, 0);

    return {
      produits, charges,
      totalProduits, totalCharges,
      totalProduitsPrev, totalChargesPrev,
      resultat: totalProduits - totalCharges,
      resultatPrev: totalProduitsPrev - totalChargesPrev,
    };
  }, [tb, tbPrev]);

  // ── BILAN ────────────────────────────────────────────────────────────────
  const bilan = useMemo(() => {
    // ACTIF IMMOBILISÉ — Classe 2
    const immobilise = tbAll.filter(r => isClass(r.account, 2));
    const totalImmobilise = immobilise.reduce((s, r) => s + r.solde_debiteur, 0);

    // Amortissements from Asset entity
    const totalAmort = assets.reduce((s, a) => s + (a.valeur_amortissement || 0), 0);

    // ACTIF CIRCULANT
    const stocks = tbAll.filter(r => isClass(r.account, 3));
    const creances = tbAll.filter(r => isClass(r.account, 4) && r.solde_debiteur > 0);
    const treso = tbAll.filter(r => isClass(r.account, 5) && r.solde_debiteur > 0);
    const totalStocks = stocks.reduce((s, r) => s + r.solde_debiteur, 0);
    const totalCreances = creances.reduce((s, r) => s + r.solde_debiteur, 0);
    const totalTreso = treso.reduce((s, r) => s + r.solde_debiteur, 0);
    const totalCirculant = totalStocks + totalCreances + totalTreso;
    const totalActif = totalImmobilise + totalCirculant;

    // PASSIF — CAPITAUX PROPRES (Classe 1 credit)
    const capitaux = tbAll.filter(r => isClass(r.account, 1) && r.solde_crediteur > 0);
    const totalCapitaux = capitaux.reduce((s, r) => s + r.solde_crediteur, 0);
    const resultatExercice = cr.resultat;
    const totalCapitauxPropres = totalCapitaux + resultatExercice;

    // DETTES (Classe 4 créditrice)
    const dettesRows = tbAll.filter(r => isClass(r.account, 4) && r.solde_crediteur > 0);
    // Emprunts (Classe 1 débitrice — rachat propre capital)
    const emprunts = tbAll.filter(r => isClass(r.account, 1) && r.solde_debiteur > 0);
    const totalDettes = dettesRows.reduce((s, r) => s + r.solde_crediteur, 0)
      + emprunts.reduce((s, r) => s + r.solde_debiteur, 0);
    const totalPassif = totalCapitauxPropres + totalDettes;

    return {
      immobilise, totalImmobilise, totalAmort,
      stocks, totalStocks,
      creances, totalCreances,
      treso, totalTreso,
      totalCirculant, totalActif,
      capitaux, totalCapitaux, resultatExercice, totalCapitauxPropres,
      dettesRows, emprunts, totalDettes, totalPassif,
      isBalanced: Math.abs(totalActif - totalPassif) < 100,
    };
  }, [tbAll, cr, assets]);

  // ── SIG ──────────────────────────────────────────────────────────────────
  const sig = useMemo(() => {
    const get = (prefix) => tb.filter(r => r.account.startsWith(prefix)).reduce((s, r) => s + (isClass(r.account, 7) ? r.solde_crediteur : r.solde_debiteur), 0);
    const getPrev = (prefix) => tbPrev.filter(r => r.account.startsWith(prefix)).reduce((s, r) => s + (isClass(r.account, 7) ? r.solde_crediteur : r.solde_debiteur), 0);

    const ventes707 = get('707'), achats606 = get('606');
    const ventes707p = getPrev('707'), achats606p = getPrev('606');
    const margeComm = ventes707 - achats606;
    const margeCommp = ventes707p - achats606p;

    const ca = cr.totalProduits;
    const cap = cr.totalProduitsPrev;

    const chargesExt = get('61') + get('62');
    const chargesExtp = getPrev('61') + getPrev('62');
    const va = ca - achats606 - chargesExt;
    const vap = cap - achats606p - chargesExtp;

    const chargesPerso = get('641') + get('645') + get('64');
    const chargesPersop = getPrev('641') + getPrev('645') + getPrev('64');
    const impots = get('63');
    const impotp = getPrev('63');
    const ebe = va - chargesPerso - impots;
    const ebep = vap - chargesPersop - impotp;

    const dotations = get('681') + get('682') + get('68');
    const dotationsp = getPrev('681') + getPrev('682') + getPrev('68');
    const reprises = get('781') + get('78');
    const reprisesp = getPrev('781') + getPrev('78');
    const reExploit = ebe - dotations + reprises;
    const reExploitp = ebep - dotationsp + reprisesp;

    const prodFin = get('76') + get('77');
    const prodFinp = getPrev('76') + getPrev('77');
    const chgFin = get('66') + get('67');
    const chgFinp = getPrev('66') + getPrev('67');
    const reFin = prodFin - chgFin;
    const reFinp = prodFinp - chgFinp;

    const reCourant = reExploit + reFin;
    const reCourantp = reExploitp + reFinp;

    const rows = [
      { label: "Chiffre d'Affaires", n: ca, p: cap, desc: "Total des produits (Classe 7)", highlight: true },
      { label: "Achats de marchandises (606)", n: -achats606, p: -achats606p, desc: "Compte 606" },
      { label: "Marge Commerciale", n: margeComm, p: margeCommp, desc: "Ventes — Achats revendus", separator: true },
      { label: "Charges externes (61-62)", n: -chargesExt, p: -chargesExtp, desc: "Sous-traitance, loyers, etc." },
      { label: "Valeur Ajoutée (VA)", n: va, p: vap, desc: "Marge — Charges externes", separator: true },
      { label: "Charges de personnel (64x)", n: -chargesPerso, p: -chargesPersop, desc: "Salaires + charges sociales" },
      { label: "Impôts & taxes (63)", n: -impots, p: -impotp, desc: "Taxes d'exploitation" },
      { label: "EBE — Excédent Brut d'Exploitation", n: ebe, p: ebep, desc: "VA − Personnel − Impôts", separator: true, highlight: true },
      { label: "Dotations amortissements (68x)", n: -dotations, p: -dotationsp, desc: "Amortissements & provisions" },
      { label: "Reprises sur provisions (78x)", n: reprises, p: reprisesp, desc: "Reprises" },
      { label: "Résultat d'Exploitation", n: reExploit, p: reExploitp, desc: "EBE ± Dotations", separator: true },
      { label: "Résultat Financier (76-77 / 66-67)", n: reFin, p: reFinp, desc: "Produits − Charges financiers" },
      { label: "Résultat Courant", n: reCourant, p: reCourantp, desc: "Exploitation + Financier", separator: true },
      { label: "Résultat Net de l'Exercice", n: cr.resultat, p: cr.resultatPrev, desc: "Résultat final", highlight: true, big: true },
    ];

    return { rows, ebe, ca, va, reExploit, reFin, reCourant };
  }, [tb, tbPrev, cr]);

  // ── BALANCE ÂGÉE (Clients 411 + Fournisseurs 401) ──────────────────────
  const balanceAgee = useMemo(() => {
    const today = new Date();
    const age = (due_date) => due_date ? Math.floor((today - new Date(due_date)) / 86400000) : 0;
    const bucket = (days) =>
      days <= 0 ? 'courant' : days <= 30 ? 'd30' : days <= 60 ? 'd60' : days <= 90 ? 'd90' : days <= 120 ? 'd120' : 'over120';

    const clients = debts.filter(d => d.debt_type !== 'Fournisseur' && d.status !== 'Réglée' && d.amount_remaining > 0);
    const fournisseurs = debts.filter(d => d.debt_type === 'Fournisseur' && d.status !== 'Réglée' && d.amount_remaining > 0);

    const bucketData = (list) => {
      const b = { courant: 0, d30: 0, d60: 0, d90: 0, d120: 0, over120: 0 };
      list.forEach(d => { b[bucket(age(d.due_date))] += d.amount_remaining || 0; });
      return b;
    };

    return {
      clients, fournisseurs,
      clientBuckets: bucketData(clients),
      fournisseurBuckets: bucketData(fournisseurs),
      totalClients: clients.reduce((s, d) => s + (d.amount_remaining || 0), 0),
      totalFournisseurs: fournisseurs.reduce((s, d) => s + (d.amount_remaining || 0), 0),
    };
  }, [debts]);

  // ── ANNEXE IMMOBILISATIONS (from Asset entity) ──────────────────────────
  const annexeImmo = useMemo(() => {
    return assets.map(a => ({
      nature: a.nom || a.name || 'N/A',
      compte: a.compte_comptable || '21x',
      val_brute: a.valeur_acquisition || 0,
      amort: a.valeur_amortissement || 0,
      net: (a.valeur_acquisition || 0) - (a.valeur_amortissement || 0),
      taux: a.taux_amortissement ? a.taux_amortissement + '%' : '—',
      date_acq: a.date_acquisition || '—',
    }));
  }, [assets]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const rentabilite = bilan.totalActif > 0 ? (cr.resultat / bilan.totalActif * 100) : 0;
    const margeNette = cr.totalProduits > 0 ? (cr.resultat / cr.totalProduits * 100) : 0;
    const autonomie = bilan.totalPassif > 0 ? (bilan.totalCapitauxPropres / bilan.totalPassif * 100) : 0;
    const liquidite = bilan.totalDettes > 0 ? (bilan.totalTreso / bilan.totalDettes * 100) : 0;
    return { rentabilite, margeNette, autonomie, liquidite };
  }, [bilan, cr]);

  if (isLoading) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[#6B6B6B] text-sm">Génération des états financiers PCG...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🇩🇯</span>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">États Financiers — {company?.nom_entreprise || 'MERAS SARL'}</h1>
            </div>
            <p className="text-[#6B6B6B] text-sm">
              Plan Comptable Général (PCG) · Djibouti · Clôture au 31/12/{selectedYear} · Monnaie : FDJ
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-40 bg-white">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-[#E5E7EB] flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="dashboard">🎯 Dashboard</TabsTrigger>
            <TabsTrigger value="bilan">📋 Bilan</TabsTrigger>
            <TabsTrigger value="compte_resultat">💰 Compte de Résultat</TabsTrigger>
            <TabsTrigger value="sig">📈 SIG</TabsTrigger>
            <TabsTrigger value="balance">📊 Balance Générale</TabsTrigger>
            <TabsTrigger value="balance_agee">⏰ Balance Âgée</TabsTrigger>
            <TabsTrigger value="annexe">📝 Annexe</TabsTrigger>
          </TabsList>

          {/* ══ DASHBOARD ═══════════════════════════════════════════════════ */}
          <TabsContent value="dashboard" className="mt-4 space-y-6">
            {/* Control strip */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${bilan.isBalanced ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-3">
                {bilan.isBalanced
                  ? <CheckCircle className="w-6 h-6 text-green-600" />
                  : <AlertTriangle className="w-6 h-6 text-red-600" />}
                <div>
                  <p className={`font-bold text-lg ${bilan.isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                    {bilan.isBalanced ? '⚖️ ACTIF = PASSIF — ÉQUILIBRÉ' : '⚠️ DÉSÉQUILIBRE DÉTECTÉ'}
                  </p>
                  <p className="text-sm text-[#6B6B6B]">Actif: {fmt(bilan.totalActif)} FDJ · Passif: {fmt(bilan.totalPassif)} FDJ</p>
                </div>
              </div>
              <Badge className={bilan.isBalanced ? 'bg-green-600 text-white text-sm px-4 py-1.5' : 'bg-red-600 text-white text-sm px-4 py-1.5'}>
                {bilan.isBalanced ? '✓ CONTRÔLÉ' : '✗ ÉCART ' + fmt(Math.abs(bilan.totalActif - bilan.totalPassif)) + ' FDJ'}
              </Badge>
            </div>

            {/* KPI Grid — matches Excel Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'TOTAL ACTIF', value: fmt(bilan.totalActif), unit: 'FDJ', icon: '💰', color: 'blue' },
                { label: "CHIFFRE D'AFFAIRES", value: fmt(cr.totalProduits), unit: 'FDJ', icon: '📈', color: 'green' },
                { label: 'RÉSULTAT NET', value: fmt(cr.resultat), unit: 'FDJ', icon: '✅', color: cr.resultat >= 0 ? 'emerald' : 'red' },
                { label: 'CAPITAUX PROPRES', value: fmt(bilan.totalCapitauxPropres), unit: 'FDJ', icon: '🏦', color: 'purple' },
                { label: 'EBE', value: fmt(sig.ebe), unit: 'FDJ', icon: '⚡', color: sig.ebe >= 0 ? 'amber' : 'red' },
              ].map((k, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-5 text-center">
                    <div className="text-3xl mb-2">{k.icon}</div>
                    <p className="text-xs text-[#6B6B6B] font-semibold uppercase tracking-wide mb-1">{k.label}</p>
                    <p className={`text-xl font-bold ${
                      k.color === 'blue' ? 'text-blue-700' :
                      k.color === 'green' ? 'text-green-700' :
                      k.color === 'emerald' ? 'text-emerald-700' :
                      k.color === 'purple' ? 'text-purple-700' :
                      k.color === 'amber' ? 'text-amber-700' :
                      'text-red-600'
                    }`}>{k.value}</p>
                    <p className="text-xs text-[#9CA3AF]">{k.unit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Ratios financiers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Rentabilité des actifs (ROA)', value: kpis.rentabilite.toFixed(1) + '%', desc: 'Résultat / Total Actif', ok: kpis.rentabilite > 5 },
                { label: 'Marge nette', value: kpis.margeNette.toFixed(1) + '%', desc: 'Résultat / CA', ok: kpis.margeNette > 10 },
                { label: "Autonomie financière", value: kpis.autonomie.toFixed(1) + '%', desc: 'Capitaux propres / Total Passif', ok: kpis.autonomie > 30 },
                { label: 'Ratio de liquidité', value: kpis.liquidite.toFixed(1) + '%', desc: 'Trésorerie / Dettes', ok: kpis.liquidite > 20 },
              ].map((r, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[#6B6B6B] font-semibold">{r.label}</p>
                      <Badge className={r.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {r.ok ? 'Bon' : 'À surveiller'}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{r.value}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">{r.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Workflow clôture */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-bold text-[#1A1A1A] mb-4">⚙️ Workflow de Clôture Comptable</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { num: 1, label: 'Vérifier écritures', icon: '🔍' },
                    { num: 2, label: 'Enregistrer amortissements', icon: '📉' },
                    { num: 3, label: 'Enregistrer provisions', icon: '🛡️' },
                    { num: 4, label: 'Calculer résultat', icon: '🧮' },
                    { num: 5, label: 'Générer balance finale', icon: '⚖️' },
                    { num: 6, label: 'Produire bilan', icon: '📋' },
                    { num: 7, label: 'Produire compte de résultat', icon: '💰' },
                  ].map(s => (
                    <div key={s.num} className="text-center p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E7EB]">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs font-bold flex items-center justify-center mx-auto mb-1">{s.num}</div>
                      <p className="text-xs text-[#4B4B4B] font-medium leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ BILAN ════════════════════════════════════════════════════════ */}
          <TabsContent value="bilan" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">BILAN AU 31 DÉCEMBRE {selectedYear}</h2>
                <p className="text-sm text-[#6B6B6B]">{company?.nom_entreprise || 'MERAS SARL'} · En Francs Djiboutiens (FDJ)</p>
              </div>
              <Badge className={bilan.isBalanced ? 'bg-green-100 text-green-800 px-3 py-1.5' : 'bg-red-100 text-red-800 px-3 py-1.5'}>
                {bilan.isBalanced ? '✓ ACTIF = PASSIF' : '⚠️ DÉSÉQUILIBRE'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
              {/* ACTIF */}
              <div className="border-r border-[#E5E7EB]">
                <div className="bg-blue-700 text-white px-5 py-3 grid grid-cols-4 gap-2 text-xs font-bold uppercase tracking-wide">
                  <span className="col-span-2">ACTIF</span>
                  <span className="text-right">Brut</span>
                  <span className="text-right">Net N</span>
                </div>
                {/* Actif Immobilisé */}
                <SectionHeader label="ACTIF IMMOBILISÉ" bg="bg-blue-50" color="text-blue-800" />
                <BilanLine label="Immobilisations incorporelles" compte="" brut={0} amort={0} net={0} />
                {bilan.immobilise.map(r => (
                  <BilanLine key={r.account} label={r.label} compte={r.account} brut={r.solde_debiteur} amort={0} net={r.solde_debiteur} />
                ))}
                <SubtotalLine label="Sous-total Actif Immobilisé" brut={bilan.totalImmobilise} net={bilan.totalImmobilise} color="text-blue-700" />

                {/* Actif circulant */}
                <SectionHeader label="ACTIF CIRCULANT" bg="bg-blue-50" color="text-blue-800" />
                <div className="px-4 py-1 text-xs text-[#9CA3AF] font-semibold bg-white">Stocks (Classe 3)</div>
                {bilan.stocks.length === 0 ? <BilanLine label="Stocks & en-cours" compte="3xx" brut={0} net={0} /> :
                  bilan.stocks.map(r => <BilanLine key={r.account} label={r.label} compte={r.account} brut={r.solde_debiteur} net={r.solde_debiteur} />)}
                <div className="px-4 py-1 text-xs text-[#9CA3AF] font-semibold bg-white">Créances & tiers débiteurs (Classe 4)</div>
                {bilan.creances.length === 0 ? <BilanLine label="Clients (411)" compte="411" brut={0} net={0} /> :
                  bilan.creances.map(r => <BilanLine key={r.account} label={r.label} compte={r.account} brut={r.solde_debiteur} net={r.solde_debiteur} />)}
                <div className="px-4 py-1 text-xs text-[#9CA3AF] font-semibold bg-white">Trésorerie (Classe 5)</div>
                {bilan.treso.length === 0 ? <BilanLine label="Banque (512)" compte="512" brut={0} net={0} /> :
                  bilan.treso.map(r => <BilanLine key={r.account} label={r.label} compte={r.account} brut={r.solde_debiteur} net={r.solde_debiteur} />)}
                <SubtotalLine label="Sous-total Actif Circulant" brut={bilan.totalCirculant} net={bilan.totalCirculant} color="text-blue-700" />

                <div className="bg-blue-700 text-white px-5 py-3 flex justify-between items-center">
                  <span className="font-bold text-sm">TOTAL ACTIF</span>
                  <span className="font-bold text-base">{fmt(bilan.totalActif)} FDJ</span>
                </div>
              </div>

              {/* PASSIF */}
              <div>
                <div className="bg-purple-700 text-white px-5 py-3 grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-wide">
                  <span className="col-span-2">PASSIF</span>
                  <span className="text-right">Montant N</span>
                </div>
                {/* Capitaux propres */}
                <SectionHeader label="CAPITAUX PROPRES" bg="bg-purple-50" color="text-purple-800" />
                {bilan.capitaux.length === 0
                  ? <PassifLine label="Capital social (101)" compte="101" montant={0} />
                  : bilan.capitaux.map(r => <PassifLine key={r.account} label={r.label} compte={r.account} montant={r.solde_crediteur} />)
                }
                <PassifLine
                  label={`Résultat de l'exercice (${selectedYear})`}
                  compte="12x"
                  montant={bilan.resultatExercice}
                  highlight={bilan.resultatExercice >= 0 ? 'green' : 'red'}
                />
                <SubtotalLine label="Sous-total Capitaux Propres" net={bilan.totalCapitauxPropres} color="text-purple-700" passif />

                {/* Dettes */}
                <SectionHeader label="DETTES" bg="bg-purple-50" color="text-purple-800" />
                <div className="px-4 py-1 text-xs text-[#9CA3AF] font-semibold bg-white">Emprunts & dettes financières (Classe 1)</div>
                {bilan.emprunts.length === 0
                  ? <PassifLine label="Emprunts bancaires (164)" compte="164" montant={0} />
                  : bilan.emprunts.map(r => <PassifLine key={r.account} label={r.label} compte={r.account} montant={r.solde_debiteur} />)
                }
                <div className="px-4 py-1 text-xs text-[#9CA3AF] font-semibold bg-white">Fournisseurs & tiers créditeurs (Classe 4)</div>
                {bilan.dettesRows.length === 0
                  ? <PassifLine label="Fournisseurs (401)" compte="401" montant={0} />
                  : bilan.dettesRows.map(r => <PassifLine key={r.account} label={r.label} compte={r.account} montant={r.solde_crediteur} />)
                }
                <SubtotalLine label="Sous-total Dettes" net={bilan.totalDettes} color="text-purple-700" passif />

                <div className="bg-purple-700 text-white px-5 py-3 flex justify-between items-center">
                  <span className="font-bold text-sm">TOTAL PASSIF</span>
                  <span className="font-bold text-base">{fmt(bilan.totalPassif)} FDJ</span>
                </div>
              </div>
            </div>

            {!bilan.isBalanced && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Écart de {fmt(Math.abs(bilan.totalActif - bilan.totalPassif))} FDJ. Comptabilisez toutes vos transactions dans le Grand Livre pour équilibrer le bilan.
              </div>
            )}
          </TabsContent>

          {/* ══ COMPTE DE RÉSULTAT ══════════════════════════════════════════ */}
          <TabsContent value="compte_resultat" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">COMPTE DE RÉSULTAT — 01/01/{selectedYear} au 31/12/{selectedYear}</h2>
                <p className="text-sm text-[#6B6B6B]">{company?.nom_entreprise || 'MERAS SARL'} · En FDJ</p>
              </div>
              <Badge className={cr.resultat >= 0 ? 'bg-green-100 text-green-800 px-3 py-1.5' : 'bg-red-100 text-red-800 px-3 py-1.5'}>
                {cr.resultat >= 0 ? '✅ Bénéfice' : '❌ Déficit'}
              </Badge>
            </div>

            {/* Side-by-side like Excel */}
            <div className="border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-2">
                <div className="bg-red-600 text-white px-5 py-3 border-r border-red-500">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                    <span>CHARGES</span>
                    <div className="flex gap-8"><span>Exercice N</span><span>N-1</span></div>
                  </div>
                </div>
                <div className="bg-green-600 text-white px-5 py-3">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                    <span>PRODUITS</span>
                    <div className="flex gap-8"><span>Exercice N</span><span>N-1</span></div>
                  </div>
                </div>
              </div>

              {/* Exploitation rows */}
              <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
                <div>
                  <CRSectionHeader label="I. CHARGES D'EXPLOITATION" />
                  <CRLine label="Achats de marchandises (606)" n={tb.filter(r => r.account.startsWith('606')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('606')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRLine label="Variation de stocks" n={0} p={0} />
                  <CRLine label="Charges externes (61-62)" n={tb.filter(r => r.account.startsWith('61') || r.account.startsWith('62')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('61') || r.account.startsWith('62')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRLine label="Impôts & taxes (63)" n={tb.filter(r => r.account.startsWith('63')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('63')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRLine label="Salaires (641)" n={tb.filter(r => r.account.startsWith('641')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('641')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRLine label="Charges sociales (645)" n={tb.filter(r => r.account.startsWith('645')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('645')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRLine label="Amortissements (681)" n={tb.filter(r => r.account.startsWith('68')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('68')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRSectionHeader label="II. CHARGES FINANCIÈRES" />
                  <CRLine label="Frais bancaires (627)" n={tb.filter(r => r.account.startsWith('627')).reduce((s, r) => s + r.solde_debiteur, 0)} p={tbPrev.filter(r => r.account.startsWith('627')).reduce((s, r) => s + r.solde_debiteur, 0)} />
                  <CRLine label="Intérêts (661)" n={tb.filter(r => r.account.startsWith('661') || r.account.startsWith('66')).reduce((s, r) => s + r.solde_debiteur, 0)} p={0} />
                  <div className="bg-red-50 border-t-2 border-red-300 px-5 py-2.5 flex justify-between font-bold text-sm">
                    <span className="text-red-800">TOTAL CHARGES</span>
                    <div className="flex gap-6">
                      <span className="text-red-800">{fmt(cr.totalCharges)}</span>
                      <span className="text-[#9CA3AF]">{fmt(cr.totalChargesPrev)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <CRSectionHeader label="I. PRODUITS D'EXPLOITATION" />
                  <CRLine label="Prestations de services (706)" n={tb.filter(r => r.account.startsWith('706')).reduce((s, r) => s + r.solde_crediteur, 0)} p={tbPrev.filter(r => r.account.startsWith('706')).reduce((s, r) => s + r.solde_crediteur, 0)} />
                  <CRLine label="Ventes marchandises (707)" n={tb.filter(r => r.account.startsWith('707')).reduce((s, r) => s + r.solde_crediteur, 0)} p={tbPrev.filter(r => r.account.startsWith('707')).reduce((s, r) => s + r.solde_crediteur, 0)} />
                  <CRLine label="Produits stockés (713)" n={0} p={0} />
                  <CRLine label="Subventions & autres produits" n={tb.filter(r => r.account.startsWith('74') || r.account.startsWith('75')).reduce((s, r) => s + r.solde_crediteur, 0)} p={0} />
                  <CRSectionHeader label="II. PRODUITS FINANCIERS" />
                  <CRLine label="Produits financiers (76-77)" n={tb.filter(r => r.account.startsWith('76') || r.account.startsWith('77')).reduce((s, r) => s + r.solde_crediteur, 0)} p={0} />
                  <div className="h-[calc(100%-theme(spacing.8))]" />
                  <div className="bg-green-50 border-t-2 border-green-300 px-5 py-2.5 flex justify-between font-bold text-sm">
                    <span className="text-green-800">TOTAL PRODUITS</span>
                    <div className="flex gap-6">
                      <span className="text-green-800">{fmt(cr.totalProduits)}</span>
                      <span className="text-[#9CA3AF]">{fmt(cr.totalProduitsPrev)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Résultat final */}
              <div className={`px-5 py-4 flex items-center justify-between ${cr.resultat >= 0 ? 'bg-green-700' : 'bg-red-700'} text-white`}>
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wide">Résultat net de l'exercice</p>
                  <p className="text-2xl font-bold">{fmt(cr.resultat)} FDJ</p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs">N-1</p>
                  <p className="text-lg font-semibold">{fmt(cr.resultatPrev)} FDJ</p>
                  <p className="text-xs text-white/60">{fmtPct(cr.resultatPrev !== 0 ? (cr.resultat - cr.resultatPrev) / Math.abs(cr.resultatPrev) * 100 : null)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ══ SIG ══════════════════════════════════════════════════════════ */}
          <TabsContent value="sig" className="mt-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#1A1A1A]">SOLDES INTERMÉDIAIRES DE GESTION — {selectedYear}</h2>
              <p className="text-sm text-[#6B6B6B]">{company?.nom_entreprise || 'MERAS SARL'} · Analyse de la performance économique PCG</p>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white">
                    <th className="text-left py-3 px-5 font-semibold">SOLDE INTERMÉDIAIRE</th>
                    <th className="text-xs text-[#9CA3AF] py-3 px-3 font-normal">Description</th>
                    <th className="text-right py-3 px-5 font-semibold">Exercice N ({selectedYear})</th>
                    <th className="text-right py-3 px-5 font-semibold text-[#9CA3AF]">N-1</th>
                    <th className="text-right py-3 px-5 font-semibold text-[#9CA3AF]">Variation %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {sig.rows.map((row, i) => {
                    const variation = row.p !== 0 ? (row.n - row.p) / Math.abs(row.p) * 100 : null;
                    return (
                      <tr key={i} className={`${row.separator ? 'border-t-2 border-[#E5E7EB]' : ''} ${row.highlight ? 'bg-[#F9F9F9]' : 'hover:bg-[#FAFAFA]'}`}>
                        <td className={`py-3 px-5 ${row.big ? 'font-extrabold text-[#1A1A1A]' : row.highlight ? 'font-bold text-[#1A1A1A]' : 'text-[#4B4B4B]'}`}>
                          {row.label}
                        </td>
                        <td className="py-3 px-3 text-xs text-[#9CA3AF]">{row.desc}</td>
                        <td className={`py-3 px-5 text-right font-bold ${row.n >= 0 ? 'text-[#1A1A1A]' : 'text-red-600'} ${row.big ? 'text-base' : ''}`}>
                          {row.n >= 0 ? '' : '−'}{fmt(Math.abs(row.n))} FDJ
                        </td>
                        <td className="py-3 px-5 text-right text-[#9CA3AF]">{fmt(row.p)} FDJ</td>
                        <td className="py-3 px-5 text-right">
                          {variation !== null
                            ? <span className={`text-xs font-semibold ${variation >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtPct(variation)}</span>
                            : <span className="text-[#C0C0C0]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ══ BALANCE GÉNÉRALE ════════════════════════════════════════════ */}
          <TabsContent value="balance" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">BALANCE GÉNÉRALE DES COMPTES — {selectedYear}</h2>
                <p className="text-sm text-[#6B6B6B]">Règle fondamentale : TOTAL DÉBIT = TOTAL CRÉDIT · Tout écart = ERREUR comptable</p>
              </div>
              <Badge className={
                Math.abs(tb.reduce((s, r) => s + r.debit, 0) - tb.reduce((s, r) => s + r.credit, 0)) < 1
                  ? 'bg-green-100 text-green-800 px-3 py-1.5' : 'bg-red-100 text-red-800 px-3 py-1.5'
              }>
                {Math.abs(tb.reduce((s, r) => s + r.debit, 0) - tb.reduce((s, r) => s + r.credit, 0)) < 1 ? '✅ ÉQUILIBRÉE' : '⚠️ DÉSÉQUILIBRÉE'}
              </Badge>
            </div>
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="text-left py-3 px-4 font-semibold">N° Cpte</th>
                      <th className="text-left py-3 px-4 font-semibold">Intitulé du Compte</th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-300">Débit Cumulé</th>
                      <th className="text-right py-3 px-4 font-semibold text-orange-300">Crédit Cumulé</th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-200">Solde Débiteur</th>
                      <th className="text-right py-3 px-4 font-semibold text-orange-200">Solde Créditeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {/* Group by class */}
                    {[1,2,3,4,5,6,7].map(cls => {
                      const rows = tb.filter(r => getClass(r.account) === cls);
                      if (rows.length === 0) return null;
                      const classLabels = {1:'CAPITAUX',2:'IMMOBILISATIONS',3:'STOCKS',4:'TIERS',5:'TRÉSORERIE',6:'CHARGES',7:'PRODUITS'};
                      const classBg = {1:'bg-purple-50',2:'bg-blue-50',3:'bg-yellow-50',4:'bg-orange-50',5:'bg-teal-50',6:'bg-red-50',7:'bg-green-50'};
                      const classText = {1:'text-purple-800',2:'text-blue-800',3:'text-yellow-800',4:'text-orange-800',5:'text-teal-800',6:'text-red-800',7:'text-green-800'};
                      return (
                        <React.Fragment key={cls}>
                          <tr className={classBg[cls]}>
                            <td colSpan={6} className={`py-2 px-4 text-xs font-bold uppercase tracking-widest ${classText[cls]}`}>
                              CLASSE {cls} — {classLabels[cls]}
                            </td>
                          </tr>
                          {rows.map((r, i) => (
                            <tr key={i} className="hover:bg-[#FAFAFA]">
                              <td className="py-2 px-4 font-mono font-bold text-[#1A1A1A]">{r.account}</td>
                              <td className="py-2 px-4 text-[#4B4B4B]">{r.label}</td>
                              <td className="py-2 px-4 text-right text-blue-700">{fmt(r.debit)}</td>
                              <td className="py-2 px-4 text-right text-orange-700">{fmt(r.credit)}</td>
                              <td className="py-2 px-4 text-right font-semibold text-blue-900">{r.solde_debiteur > 0 ? fmt(r.solde_debiteur) : '—'}</td>
                              <td className="py-2 px-4 text-right font-semibold text-orange-900">{r.solde_crediteur > 0 ? fmt(r.solde_crediteur) : '—'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  {tb.length > 0 && (() => {
                    const td = tb.reduce((s, r) => s + r.debit, 0);
                    const tc = tb.reduce((s, r) => s + r.credit, 0);
                    return (
                      <tfoot>
                        <tr className="bg-[#1A1A1A] text-white font-bold">
                          <td colSpan={2} className="py-3 px-4">TOTAUX GÉNÉRAUX</td>
                          <td className="py-3 px-4 text-right text-blue-300">{fmt(td)}</td>
                          <td className="py-3 px-4 text-right text-orange-300">{fmt(tc)}</td>
                          <td className="py-3 px-4 text-right">{fmt(tb.reduce((s, r) => s + r.solde_debiteur, 0))}</td>
                          <td className="py-3 px-4 text-right">{fmt(tb.reduce((s, r) => s + r.solde_crediteur, 0))}</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ══ BALANCE ÂGÉE ════════════════════════════════════════════════ */}
          <TabsContent value="balance_agee" className="mt-4 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">BALANCE ÂGÉE — Clients & Fournisseurs</h2>
              <p className="text-sm text-[#6B6B6B]">au 31/12/{selectedYear} · Analyse de l'ancienneté des créances et dettes</p>
            </div>

            {/* Clients 411 */}
            <AgedTable title="📥 BALANCE ÂGÉE CLIENTS — Compte 411" items={balanceAgee.clients} buckets={balanceAgee.clientBuckets} total={balanceAgee.totalClients} type="client" />

            {/* Fournisseurs 401 */}
            <AgedTable title="📤 BALANCE ÂGÉE FOURNISSEURS — Compte 401" items={balanceAgee.fournisseurs} buckets={balanceAgee.fournisseurBuckets} total={balanceAgee.totalFournisseurs} type="fournisseur" />
          </TabsContent>

          {/* ══ ANNEXE ══════════════════════════════════════════════════════ */}
          <TabsContent value="annexe" className="mt-4 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">ANNEXE AUX ÉTATS FINANCIERS — {selectedYear}</h2>
              <p className="text-sm text-[#6B6B6B]">{company?.nom_entreprise || 'MERAS SARL'} · Informations complémentaires obligatoires PCG</p>
            </div>

            {/* A. Tableau des immobilisations */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-slate-700 text-white px-5 py-3">
                <h3 className="font-bold">A. TABLEAU DES IMMOBILISATIONS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Nature</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Val. brute N-1</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Acquisitions</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Cessions</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Val. brute N</th>
                      <th className="text-center py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Taux amort.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {annexeImmo.length === 0 ? (
                      <>
                        <tr className="hover:bg-[#FAFAFA]"><td className="py-2.5 px-4 text-[#4B4B4B]">Terrains (211)</td><td className="py-2.5 px-4 text-right">5 000 000</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right">5 000 000</td><td className="py-2.5 px-4 text-center text-[#9CA3AF]">N/A</td></tr>
                        <tr className="hover:bg-[#FAFAFA]"><td className="py-2.5 px-4 text-[#4B4B4B]">Bâtiments (213)</td><td className="py-2.5 px-4 text-right">20 000 000</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right">20 000 000</td><td className="py-2.5 px-4 text-center text-[#9CA3AF]">2%</td></tr>
                        <tr className="hover:bg-[#FAFAFA]"><td className="py-2.5 px-4 text-[#4B4B4B]">Matériel & outillage (218)</td><td className="py-2.5 px-4 text-right">3 000 000</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right">3 000 000</td><td className="py-2.5 px-4 text-center text-[#9CA3AF]">20%</td></tr>
                      </>
                    ) : annexeImmo.map((a, i) => (
                      <tr key={i} className="hover:bg-[#FAFAFA]">
                        <td className="py-2.5 px-4 text-[#4B4B4B]">{a.nature} <span className="text-xs text-[#9CA3AF]">({a.compte})</span></td>
                        <td className="py-2.5 px-4 text-right">{fmt(a.val_brute)}</td>
                        <td className="py-2.5 px-4 text-right text-green-700">0</td>
                        <td className="py-2.5 px-4 text-right text-red-600">0</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(a.val_brute)}</td>
                        <td className="py-2.5 px-4 text-center text-[#9CA3AF]">{a.taux}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* B. Tableau des amortissements */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-slate-700 text-white px-5 py-3">
                <h3 className="font-bold">B. TABLEAU DES AMORTISSEMENTS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Nature</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Amort. N-1</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Dotation {selectedYear}</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Amort. cumulé N</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Valeur nette</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {tb.filter(r => r.account.startsWith('68')).length === 0 ? (
                      <>
                        <tr><td className="py-2.5 px-4">Amortissement bâtiments (281300)</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right text-red-700">400 000</td><td className="py-2.5 px-4 text-right">400 000</td><td className="py-2.5 px-4 text-right font-semibold">19 600 000</td></tr>
                        <tr><td className="py-2.5 px-4">Amortissement matériel (281800)</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right text-red-700">600 000</td><td className="py-2.5 px-4 text-right">600 000</td><td className="py-2.5 px-4 text-right font-semibold">2 400 000</td></tr>
                      </>
                    ) : tb.filter(r => r.account.startsWith('68')).map((r, i) => (
                      <tr key={i}><td className="py-2.5 px-4 text-[#4B4B4B]">{r.label} ({r.account})</td><td className="py-2.5 px-4 text-right">0</td><td className="py-2.5 px-4 text-right text-red-700">{fmt(r.solde_debiteur)}</td><td className="py-2.5 px-4 text-right">{fmt(r.solde_debiteur)}</td><td className="py-2.5 px-4 text-right font-semibold">—</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* C. Méthodes comptables */}
            <Card className="border-0 shadow-sm">
              <div className="bg-slate-700 text-white px-5 py-3">
                <h3 className="font-bold">C. MÉTHODES COMPTABLES & PRINCIPES</h3>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Référentiel comptable', value: 'Plan Comptable Général (PCG) — France / Djibouti (SYSCOHADA proche)' },
                    { label: "Méthode d'amortissement", value: 'Linéaire pour bâtiments (2%), Dégressif pour matériel (20%)' },
                    { label: 'Évaluation des stocks', value: 'Coût moyen pondéré (CMP)' },
                    { label: 'Monnaie de présentation', value: 'Franc Djiboutien (FDJ)' },
                    { label: 'Exercice comptable', value: `01/01/${selectedYear} au 31/12/${selectedYear}` },
                    { label: 'Architecture ledger', value: 'Double entrée immuable — Event-driven (Stripe-style)' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-[#F9F9F9] rounded-lg">
                      <p className="text-xs text-[#9CA3AF] font-semibold uppercase mb-1">{item.label}</p>
                      <p className="text-[#1A1A1A] font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ label, bg, color }) {
  return (
    <div className={`px-5 py-2 ${bg}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</p>
    </div>
  );
}

function BilanLine({ label, compte, brut, amort = 0, net }) {
  const f = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
  return (
    <div className="grid grid-cols-4 gap-2 px-5 py-2 hover:bg-[#FAFAFA] border-b border-[#F5F5F5]">
      <div className="col-span-2 flex items-center gap-2">
        {compte && <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{compte}</span>}
        <span className="text-sm text-[#4B4B4B]">{label}</span>
      </div>
      <span className="text-right text-sm text-[#6B6B6B]">{f(brut)}</span>
      <span className="text-right text-sm font-medium text-[#1A1A1A]">{f(net)}</span>
    </div>
  );
}

function PassifLine({ label, compte, montant, highlight }) {
  const f = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
  return (
    <div className="grid grid-cols-3 gap-2 px-5 py-2 hover:bg-[#FAFAFA] border-b border-[#F5F5F5]">
      <div className="col-span-2 flex items-center gap-2">
        {compte && <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{compte}</span>}
        <span className="text-sm text-[#4B4B4B]">{label}</span>
      </div>
      <span className={`text-right text-sm font-medium ${
        highlight === 'green' ? 'text-green-700' :
        highlight === 'red' ? 'text-red-600' : 'text-[#1A1A1A]'
      }`}>{f(montant)}</span>
    </div>
  );
}

function SubtotalLine({ label, brut, net, color, passif }) {
  const f = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
  return (
    <div className={`${passif ? 'grid grid-cols-3' : 'grid grid-cols-4'} gap-2 px-5 py-2.5 bg-[#F9F9F9] border-y border-[#E5E7EB]`}>
      <span className={`${passif ? 'col-span-2' : 'col-span-2'} text-xs font-bold uppercase tracking-wide ${color || 'text-[#6B6B6B]'}`}>{label}</span>
      {!passif && <span className={`text-right text-sm font-bold ${color || 'text-[#1A1A1A]'}`}>{f(brut)}</span>}
      <span className={`text-right text-sm font-bold ${color || 'text-[#1A1A1A]'}`}>{f(net)}</span>
    </div>
  );
}

function CRSectionHeader({ label }) {
  return (
    <div className="px-5 py-2 bg-[#F5F5F5]">
      <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function CRLine({ label, n, p }) {
  const f = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v || 0);
  return (
    <div className="flex items-center justify-between px-5 py-2 hover:bg-[#FAFAFA] border-b border-[#F5F5F5]">
      <span className="text-sm text-[#4B4B4B] flex-1">{label}</span>
      <div className="flex gap-6 ml-2 flex-shrink-0">
        <span className="text-sm font-medium text-[#1A1A1A] w-24 text-right">{f(n)}</span>
        <span className="text-sm text-[#9CA3AF] w-24 text-right">{f(p)}</span>
      </div>
    </div>
  );
}

function AgedTable({ title, items, buckets, total, type }) {
  const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0);
  const colHeaders = ['0–30 jrs', '31–60 jrs', '61–90 jrs', '91–120 jrs', '>120 jrs'];

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 ${type === 'client' ? 'bg-blue-700' : 'bg-orange-700'} text-white`}>
        <h3 className="font-bold">{title}</h3>
      </div>

      {/* Summary buckets */}
      <div className="grid grid-cols-5 gap-0 divide-x divide-[#E5E7EB] border-b border-[#E5E7EB]">
        {[
          { label: '0–30 jrs', val: buckets.courant + buckets.d30, color: 'text-green-700' },
          { label: '31–60 jrs', val: buckets.d60, color: 'text-yellow-700' },
          { label: '61–90 jrs', val: buckets.d90, color: 'text-orange-700' },
          { label: '91–120 jrs', val: buckets.d120, color: 'text-red-600' },
          { label: '>120 jrs', val: buckets.over120, color: 'text-rose-800' },
        ].map((b, i) => (
          <div key={i} className="p-3 text-center">
            <p className="text-xs text-[#9CA3AF] mb-1">{b.label}</p>
            <p className={`font-bold text-sm ${b.color}`}>{fmt(b.val)} FDJ</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5]">
            <tr>
              <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">{type === 'client' ? 'Client' : 'Fournisseur'}</th>
              <th className="text-left py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Type</th>
              <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Total dû</th>
              <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">0–30</th>
              <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">31–60</th>
              <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">61–90</th>
              <th className="text-right py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">>90</th>
              <th className="text-center py-2.5 px-4 text-xs font-bold text-[#6B6B6B] uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F5F5]">
            {items.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-[#9CA3AF]">
                <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-400" />
                Aucun solde ouvert
              </td></tr>
            ) : items.map((d, i) => {
              const today = new Date();
              const due = d.due_date ? new Date(d.due_date) : null;
              const days = due ? Math.floor((today - due) / 86400000) : 0;
              const amount = d.amount_remaining || 0;
              const statut = days <= 0 ? { label: '✅ Courant', cls: 'bg-green-100 text-green-700' }
                : days <= 30 ? { label: '⚠️ Surveiller', cls: 'bg-yellow-100 text-yellow-700' }
                : days <= 90 ? { label: '🔴 Litigieux', cls: 'bg-red-100 text-red-700' }
                : { label: '🚨 Contentieux', cls: 'bg-rose-100 text-rose-800' };
              const b0 = days <= 30 ? amount : 0;
              const b31 = days > 30 && days <= 60 ? amount : 0;
              const b61 = days > 60 && days <= 90 ? amount : 0;
              const bPlus = days > 90 ? amount : 0;
              return (
                <tr key={i} className="hover:bg-[#FAFAFA]">
                  <td className="py-2.5 px-4 font-medium text-[#1A1A1A]">{d.contact_name || '—'}</td>
                  <td className="py-2.5 px-4"><Badge className="text-xs bg-gray-100 text-gray-700">{d.debt_type}</Badge></td>
                  <td className="py-2.5 px-4 text-right font-bold">{fmt(amount)}</td>
                  <td className="py-2.5 px-4 text-right text-green-700">{b0 > 0 ? fmt(b0) : '—'}</td>
                  <td className="py-2.5 px-4 text-right text-yellow-700">{b31 > 0 ? fmt(b31) : '—'}</td>
                  <td className="py-2.5 px-4 text-right text-orange-700">{b61 > 0 ? fmt(b61) : '—'}</td>
                  <td className="py-2.5 px-4 text-right text-red-700">{bPlus > 0 ? fmt(bPlus) : '—'}</td>
                  <td className="py-2.5 px-4 text-center"><Badge className={statut.cls + ' text-xs'}>{statut.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-[#1A1A1A] text-white">
              <tr>
                <td colSpan={2} className="py-2.5 px-4 font-bold text-sm">TOTAL</td>
                <td className="py-2.5 px-4 text-right font-bold">{fmt(total)} FDJ</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}