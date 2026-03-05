/**
 * FinancialReports — Balance Sheet, P&L, Cash Flow, Trial Balance.
 * Supports fiscal year or custom date range, with account filters.
 */
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

const fmt = (n) => Math.round(n || 0).toLocaleString("fr-FR") + " DJF";

export default function FinancialReports() {
  const currentYear = new Date().getFullYear().toString();
  const [filterMode, setFilterMode] = useState("year"); // "year" | "range"
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [classFilter, setClassFilter] = useState("all");

  const { data: entries = [] } = useQuery({
    queryKey: ["ledger-entries"],
    queryFn: () => base44.entities.LedgerEntry.list("-entry_date", 2000)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => base44.entities.ChartOfAccounts.list("code")
  });

  // Filter entries by date range or fiscal year
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (!e.entry_date) return false;
      if (filterMode === "year") return e.fiscal_year === fiscalYear;
      return e.entry_date >= dateFrom && e.entry_date <= dateTo;
    });
  }, [entries, filterMode, fiscalYear, dateFrom, dateTo]);

  // Build balance map per account
  const balances = useMemo(() => {
    const map = {};
    for (const e of filtered) {
      if (!map[e.account_code]) map[e.account_code] = { debit: 0, credit: 0, name: e.account_name };
      map[e.account_code].debit += e.debit || 0;
      map[e.account_code].credit += e.credit || 0;
    }
    return map;
  }, [filtered]);

  const getBalance = (code) => {
    const b = balances[code];
    if (!b) return 0;
    const acc = accounts.find(a => a.code === code);
    return acc?.normal_balance === "credit" ? b.credit - b.debit : b.debit - b.credit;
  };

  const accountsWithBalance = accounts.filter(a => balances[a.code] && (classFilter === "all" || a.class === classFilter));

  const byClass = (cls) => accountsWithBalance.filter(a => a.class === cls);
  const sumClass = (cls) => byClass(cls).reduce((s, a) => s + getBalance(a.code), 0);

  // P&L
  const totalCharges = sumClass("6");
  const totalProduits = sumClass("7");
  const resultat = totalProduits - totalCharges;

  // Balance Sheet
  const actifAccounts = accountsWithBalance.filter(a => ["2", "3", "5"].includes(a.class) || (a.class === "4" && a.type === "actif"));
  const passifAccounts = accountsWithBalance.filter(a => ["1"].includes(a.class) || (a.class === "4" && a.type === "passif"));
  const totalActif = actifAccounts.reduce((s, a) => s + getBalance(a.code), 0);
  const totalPassif = passifAccounts.reduce((s, a) => s + getBalance(a.code), 0) + resultat;

  // Cash Flow (512 Banque movements)
  const bankEntries = filtered.filter(e => e.account_code === "512");
  const cashIn = bankEntries.reduce((s, e) => s + (e.debit || 0), 0);
  const cashOut = bankEntries.reduce((s, e) => s + (e.credit || 0), 0);
  const netCash = cashIn - cashOut;

  // Cash flow by source module
  const cashByModule = useMemo(() => {
    const map = {};
    for (const e of bankEntries) {
      const mod = e.source_module || "manual";
      if (!map[mod]) map[mod] = { in: 0, out: 0 };
      map[mod].in += e.debit || 0;
      map[mod].out += e.credit || 0;
    }
    return Object.entries(map);
  }, [bankEntries]);

  const MODULE_LABELS = { payroll: "Paie", cnss: "CNSS/ITS", purchase: "Achats", debt_payment: "Dettes", lease: "Location", manual: "Manuel", bank_import: "Banque" };

  const AccountRow = ({ a }) => {
    const bal = getBalance(a.code);
    if (bal === 0) return null;
    return (
      <tr className="border-b border-[#F9F9F9] hover:bg-[#FAFAFA]">
        <td className="px-4 py-2 text-xs font-mono text-[#6B6B6B]">{a.code}</td>
        <td className="px-4 py-2 text-xs">{a.name}</td>
        <td className="px-4 py-2 text-xs text-right font-mono">{Math.round(bal).toLocaleString()}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end bg-[#F9F9F9] rounded-lg p-4">
        <div>
          <Label className="text-xs">Mode</Label>
          <Select value={filterMode} onValueChange={setFilterMode}>
            <SelectTrigger className="w-36 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Exercice fiscal</SelectItem>
              <SelectItem value="range">Plage de dates</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterMode === "year" ? (
          <div>
            <Label className="text-xs">Exercice</Label>
            <Input type="number" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} min="2020" max="2030" className="w-24 mt-1" />
          </div>
        ) : (
          <>
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1" />
            </div>
          </>
        )}
        <div>
          <Label className="text-xs">Classe de compte</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes classes</SelectItem>
              <SelectItem value="1">Classe 1 — Capitaux</SelectItem>
              <SelectItem value="2">Classe 2 — Immobilisations</SelectItem>
              <SelectItem value="3">Classe 3 — Stocks</SelectItem>
              <SelectItem value="4">Classe 4 — Tiers</SelectItem>
              <SelectItem value="5">Classe 5 — Trésorerie</SelectItem>
              <SelectItem value="6">Classe 6 — Charges</SelectItem>
              <SelectItem value="7">Classe 7 — Produits</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-[#6B6B6B] pt-5">
          {filtered.length} écritures · {accountsWithBalance.length} comptes mouvementés
        </div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="bg-[#F5F5F5]">
          <TabsTrigger value="pl">Compte de Résultat</TabsTrigger>
          <TabsTrigger value="bs">Bilan</TabsTrigger>
          <TabsTrigger value="cf">Flux de Trésorerie</TabsTrigger>
          <TabsTrigger value="trial">Balance Générale</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pl">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4"><CardTitle className="text-sm font-semibold text-red-700">CHARGES — Classe 6</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {byClass("6").map(a => <AccountRow key={a.code} a={a} />)}
                    <tr className="bg-red-50 font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Charges</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-red-700">{fmt(totalCharges)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4"><CardTitle className="text-sm font-semibold text-green-700">PRODUITS — Classe 7</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {byClass("7").map(a => <AccountRow key={a.code} a={a} />)}
                    <tr className="bg-green-50 font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Produits</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-green-700">{fmt(totalProduits)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          <Card className={`mt-4 border-2 ${resultat >= 0 ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"}`}>
            <CardContent className="p-4 flex justify-between items-center">
              <p className="text-base font-semibold">{resultat >= 0 ? "Résultat net (bénéfice)" : "Résultat net (perte)"}</p>
              <p className={`text-2xl font-bold ${resultat >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(Math.abs(resultat))}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4"><CardTitle className="text-sm font-semibold">ACTIF (Classes 2, 3, 4, 5)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {actifAccounts.map(a => <AccountRow key={a.code} a={a} />)}
                    <tr className="bg-[#F9F9F9] font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Actif</td>
                      <td className="px-4 py-2 text-xs text-right font-mono">{fmt(totalActif)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4"><CardTitle className="text-sm font-semibold">PASSIF (Classes 1, 4 + Résultat)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {passifAccounts.map(a => <AccountRow key={a.code} a={a} />)}
                    <tr className="border-b border-[#F9F9F9]">
                      <td className="px-4 py-2 text-xs font-mono text-[#6B6B6B]">RN</td>
                      <td className="px-4 py-2 text-xs">Résultat net</td>
                      <td className="px-4 py-2 text-xs text-right font-mono">{Math.round(resultat).toLocaleString()}</td>
                    </tr>
                    <tr className="bg-[#F9F9F9] font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Passif</td>
                      <td className="px-4 py-2 text-xs text-right font-mono">{fmt(totalPassif)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          <div className={`mt-3 p-3 rounded-lg text-sm text-center font-medium ${Math.abs(totalActif - totalPassif) < 10 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {Math.abs(totalActif - totalPassif) < 10 ? "✓ Bilan équilibré" : `Écart bilan: ${fmt(Math.abs(totalActif - totalPassif))}`}
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cf">
          <div className="mt-4 grid grid-cols-3 gap-4 mb-4">
            <Card className="border-0 bg-green-50"><CardContent className="p-4"><p className="text-xs text-[#6B6B6B]">Entrées (512 Débit)</p><p className="text-xl font-semibold text-green-700">{fmt(cashIn)}</p></CardContent></Card>
            <Card className="border-0 bg-red-50"><CardContent className="p-4"><p className="text-xs text-[#6B6B6B]">Sorties (512 Crédit)</p><p className="text-xl font-semibold text-red-700">{fmt(cashOut)}</p></CardContent></Card>
            <Card className={`border-0 ${netCash >= 0 ? "bg-blue-50" : "bg-orange-50"}`}><CardContent className="p-4"><p className="text-xs text-[#6B6B6B]">Flux net</p><p className={`text-xl font-semibold ${netCash >= 0 ? "text-blue-700" : "text-orange-700"}`}>{(netCash >= 0 ? "+" : "-") + fmt(Math.abs(netCash))}</p></CardContent></Card>
          </div>
          <Card className="border border-[#F0F0F0]">
            <CardHeader className="border-b border-[#F0F0F0] py-3 px-4"><CardTitle className="text-sm">Flux par module d'origine</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead><tr className="bg-[#F9F9F9]"><th className="px-4 py-2 text-xs text-left">Module</th><th className="px-4 py-2 text-xs text-right">Entrées</th><th className="px-4 py-2 text-xs text-right">Sorties</th><th className="px-4 py-2 text-xs text-right">Net</th></tr></thead>
                <tbody>
                  {cashByModule.map(([mod, data]) => (
                    <tr key={mod} className="border-t border-[#F9F9F9] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-2 text-xs font-medium">{MODULE_LABELS[mod] || mod}</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-green-700">{data.in > 0 ? data.in.toLocaleString() : "-"}</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-red-600">{data.out > 0 ? data.out.toLocaleString() : "-"}</td>
                      <td className={`px-4 py-2 text-xs text-right font-mono ${(data.in - data.out) >= 0 ? "text-blue-700" : "text-orange-700"}`}>{(data.in - data.out).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance */}
        <TabsContent value="trial">
          <Card className="border border-[#F0F0F0] mt-4">
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9F9F9] border-b border-[#F0F0F0]">
                    <th className="px-4 py-2 text-xs text-left">Code</th>
                    <th className="px-4 py-2 text-xs text-left">Intitulé</th>
                    <th className="px-4 py-2 text-xs text-right">Débit cumulé</th>
                    <th className="px-4 py-2 text-xs text-right">Crédit cumulé</th>
                    <th className="px-4 py-2 text-xs text-right">Solde débiteur</th>
                    <th className="px-4 py-2 text-xs text-right">Solde créditeur</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsWithBalance.filter(a => balances[a.code]).map(a => {
                    const b = balances[a.code];
                    const sol = getBalance(a.code);
                    return (
                      <tr key={a.code} className="border-b border-[#F9F9F9] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-2 text-xs font-mono">{a.code}</td>
                        <td className="px-4 py-2 text-xs">{a.name}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{Math.round(b.debit).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{Math.round(b.credit).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono text-blue-700">{sol > 0 ? Math.round(sol).toLocaleString() : ""}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono text-red-700">{sol < 0 ? Math.round(Math.abs(sol)).toLocaleString() : ""}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#F9F9F9] font-semibold border-t-2 border-[#E5E7EB]">
                    <td colSpan={2} className="px-4 py-2 text-xs">TOTAUX</td>
                    <td className="px-4 py-2 text-xs text-right font-mono">{Math.round(Object.values(balances).reduce((s, b) => s + b.debit, 0)).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-right font-mono">{Math.round(Object.values(balances).reduce((s, b) => s + b.credit, 0)).toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}