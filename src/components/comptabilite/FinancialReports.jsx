import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function FinancialReports() {
  const [period, setPeriod] = useState(new Date().getFullYear().toString());

  const { data: entries = [] } = useQuery({
    queryKey: ["ledger-entries"],
    queryFn: () => base44.entities.LedgerEntry.list("-entry_date", 1000)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => base44.entities.ChartOfAccounts.list("code")
  });

  // Calculate account balances from ledger entries
  const balances = useMemo(() => {
    const map = {};
    const yearEntries = entries.filter(e => e.fiscal_year === period);
    for (const e of yearEntries) {
      if (!map[e.account_code]) map[e.account_code] = { debit: 0, credit: 0 };
      map[e.account_code].debit += e.debit || 0;
      map[e.account_code].credit += e.credit || 0;
    }
    return map;
  }, [entries, period]);

  const getBalance = (code) => {
    const b = balances[code];
    if (!b) return 0;
    const acc = accounts.find(a => a.code === code);
    if (!acc) return b.debit - b.credit;
    return acc.normal_balance === "debit" ? b.debit - b.credit : b.credit - b.debit;
  };

  // Group accounts by class and calculate totals
  const getClassTotal = (cls) => accounts.filter(a => a.class === cls).reduce((sum, a) => sum + getBalance(a.code), 0);

  const totalCharges = getClassTotal("6");
  const totalProduits = getClassTotal("7");
  const resultat = totalProduits - totalCharges;

  const totalActif = getClassTotal("2") + getClassTotal("3") + getClassTotal("4") + getClassTotal("5") + accounts.filter(a => a.class === "4" && a.type === "actif").reduce((s, a) => s + getBalance(a.code), 0);
  const totalPassif = getClassTotal("1") + accounts.filter(a => a.class === "4" && a.type === "passif").reduce((s, a) => s + getBalance(a.code), 0);

  const chargeAccounts = accounts.filter(a => a.class === "6");
  const produitAccounts = accounts.filter(a => a.class === "7");
  const actifAccounts = accounts.filter(a => a.class !== "6" && a.class !== "7" && ["actif"].includes(a.type));
  const passifAccounts = accounts.filter(a => a.class !== "6" && a.class !== "7" && ["passif"].includes(a.type));

  const fmt = (n) => n.toLocaleString("fr-FR") + " DJF";

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-[#6B6B6B]">Exercice fiscal :</label>
        <input type="number" value={period} onChange={e => setPeriod(e.target.value)} min="2020" max="2030"
          className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="bg-[#F5F5F5]">
          <TabsTrigger value="pl">Compte de Résultat</TabsTrigger>
          <TabsTrigger value="bs">Bilan</TabsTrigger>
          <TabsTrigger value="trial">Balance</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pl">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4">
                <CardTitle className="text-sm font-semibold text-red-700">CHARGES (Classe 6)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {chargeAccounts.filter(a => getBalance(a.code) !== 0).map(a => (
                      <tr key={a.code} className="border-b border-[#F9F9F9] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-2 text-xs font-mono text-[#6B6B6B]">{a.code}</td>
                        <td className="px-4 py-2 text-xs">{a.name}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{getBalance(a.code).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50 font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Charges</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-red-700">{fmt(totalCharges)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4">
                <CardTitle className="text-sm font-semibold text-green-700">PRODUITS (Classe 7)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {produitAccounts.filter(a => getBalance(a.code) !== 0).map(a => (
                      <tr key={a.code} className="border-b border-[#F9F9F9] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-2 text-xs font-mono text-[#6B6B6B]">{a.code}</td>
                        <td className="px-4 py-2 text-xs">{a.name}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{getBalance(a.code).toLocaleString()}</td>
                      </tr>
                    ))}
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
              <p className="text-base font-semibold">{resultat >= 0 ? "Bénéfice net" : "Perte nette"}</p>
              <p className={`text-2xl font-bold ${resultat >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(Math.abs(resultat))}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4">
                <CardTitle className="text-sm font-semibold">ACTIF</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {actifAccounts.filter(a => getBalance(a.code) !== 0).map(a => (
                      <tr key={a.code} className="border-b border-[#F9F9F9]">
                        <td className="px-4 py-2 text-xs font-mono text-[#6B6B6B]">{a.code}</td>
                        <td className="px-4 py-2 text-xs">{a.name}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{getBalance(a.code).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#F9F9F9] font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Actif</td>
                      <td className="px-4 py-2 text-xs text-right font-mono">{fmt(totalActif)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="border border-[#F0F0F0]">
              <CardHeader className="border-b border-[#F0F0F0] py-3 px-4">
                <CardTitle className="text-sm font-semibold">PASSIF</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {passifAccounts.filter(a => getBalance(a.code) !== 0).map(a => (
                      <tr key={a.code} className="border-b border-[#F9F9F9]">
                        <td className="px-4 py-2 text-xs font-mono text-[#6B6B6B]">{a.code}</td>
                        <td className="px-4 py-2 text-xs">{a.name}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{getBalance(a.code).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#F9F9F9] font-semibold">
                      <td colSpan={2} className="px-4 py-2 text-xs">Total Passif</td>
                      <td className="px-4 py-2 text-xs text-right font-mono">{fmt(totalPassif)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
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
                  {accounts.filter(a => balances[a.code]).map(a => {
                    const b = balances[a.code] || { debit: 0, credit: 0 };
                    const solde = getBalance(a.code);
                    return (
                      <tr key={a.code} className="border-b border-[#F9F9F9] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-2 text-xs font-mono">{a.code}</td>
                        <td className="px-4 py-2 text-xs">{a.name}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{b.debit.toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono">{b.credit.toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono text-blue-700">{solde > 0 ? solde.toLocaleString() : ""}</td>
                        <td className="px-4 py-2 text-xs text-right font-mono text-red-700">{solde < 0 ? Math.abs(solde).toLocaleString() : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}