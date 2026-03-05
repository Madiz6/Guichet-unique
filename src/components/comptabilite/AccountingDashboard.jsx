/**
 * AccountingDashboard — Overview of recent activity from LedgerEntries.
 * Shows KPIs, recent movements and a breakdown by source module.
 */
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const MODULE_LABELS = {
  payroll: "Paie",
  cnss: "CNSS/ITS",
  purchase: "Achats",
  debt_payment: "Dettes fournisseurs",
  lease: "Location",
  manual: "Manuel",
  bank_import: "Import bancaire",
};

const JOURNAL_COLORS = {
  ACH: "bg-orange-100 text-orange-800",
  VTE: "bg-green-100 text-green-800",
  BNQ: "bg-blue-100 text-blue-800",
  OD: "bg-purple-100 text-purple-800",
  SAL: "bg-rose-100 text-rose-800",
  CNSS: "bg-yellow-100 text-yellow-800",
};

const JOURNAL_LABELS = {
  ACH: "Achats", VTE: "Ventes", BNQ: "Banque", OD: "OD", SAL: "Salaires", CNSS: "CNSS"
};

export default function AccountingDashboard() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7).replace("-", "");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries"],
    queryFn: () => base44.entities.LedgerEntry.list("-entry_date", 1000),
  });

  const yearEntries = useMemo(() => entries.filter(e => e.fiscal_year === currentYear), [entries]);
  const monthEntries = useMemo(() => entries.filter(e => e.period === currentMonth), [entries]);

  // KPIs
  const totalDebits = yearEntries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredits = yearEntries.reduce((s, e) => s + (e.credit || 0), 0);

  // Charges vs Produits (class 6 vs 7 accounts via account code prefix)
  const totalCharges = yearEntries.filter(e => e.account_code?.startsWith("6")).reduce((s, e) => s + (e.debit || 0), 0);
  const totalProduits = yearEntries.filter(e => e.account_code?.startsWith("7")).reduce((s, e) => s + (e.credit || 0), 0);
  const resultat = totalProduits - totalCharges;

  // Bank position: 512 Banque — sum of debits minus credits
  const bankDebits = yearEntries.filter(e => e.account_code === "512").reduce((s, e) => s + (e.debit || 0), 0);
  const bankCredits = yearEntries.filter(e => e.account_code === "512").reduce((s, e) => s + (e.credit || 0), 0);
  const bankPosition = bankDebits - bankCredits;

  // Supplier balance: 401 Fournisseurs
  const sup401Credits = yearEntries.filter(e => e.account_code === "401").reduce((s, e) => s + (e.credit || 0), 0);
  const sup401Debits = yearEntries.filter(e => e.account_code === "401").reduce((s, e) => s + (e.debit || 0), 0);
  const supplierBalance = sup401Credits - sup401Debits; // amount still owed

  // Breakdown by source module for current month
  const moduleBreakdown = useMemo(() => {
    const map = {};
    for (const e of monthEntries) {
      const mod = e.source_module || "manual";
      if (!map[mod]) map[mod] = { debit: 0, credit: 0, count: 0 };
      map[mod].debit += e.debit || 0;
      map[mod].credit += e.credit || 0;
      map[mod].count += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].debit - a[1].debit);
  }, [monthEntries]);

  // Recent 15 entries
  const recent = entries.slice(0, 15);

  const fmt = (n) => Math.abs(n).toLocaleString("fr-FR") + " DJF";

  const KPICard = ({ label, value, sub, color = "text-[#1A1A1A]", bg = "bg-[#F9F9F9]" }) => (
    <Card className={`border-0 ${bg}`}>
      <CardContent className="p-4">
        <p className="text-xs text-[#6B6B6B]">{label}</p>
        <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total Charges (année)" value={fmt(totalCharges)} sub="Classe 6" color="text-red-600" bg="bg-red-50" />
        <KPICard label="Total Produits (année)" value={fmt(totalProduits)} sub="Classe 7" color="text-green-600" bg="bg-green-50" />
        <KPICard label={resultat >= 0 ? "Résultat net" : "Perte nette"} value={fmt(resultat)} sub={currentYear} color={resultat >= 0 ? "text-green-700" : "text-red-700"} bg={resultat >= 0 ? "bg-green-50" : "bg-red-50"} />
        <KPICard label="Position Banque (512)" value={(bankPosition >= 0 ? "+" : "-") + fmt(bankPosition)} sub="Flux nets de trésorerie" color={bankPosition >= 0 ? "text-blue-700" : "text-red-600"} bg="bg-blue-50" />
        <KPICard label="Dettes fournisseurs (401)" value={fmt(supplierBalance)} sub="Solde à payer" color="text-orange-700" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module breakdown */}
        <Card className="border border-[#F0F0F0]">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <p className="text-sm font-semibold text-[#1A1A1A]">Mouvements du mois par module</p>
            <p className="text-xs text-[#6B6B6B]">{new Date().toLocaleString("fr-FR", { month: "long", year: "numeric" })}</p>
          </div>
          <CardContent className="p-0">
            {moduleBreakdown.length === 0 ? (
              <p className="text-xs text-[#9B9B9B] p-4">Aucun mouvement ce mois-ci</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9F9F9]">
                    <th className="px-4 py-2 text-xs text-left text-[#6B6B6B]">Module</th>
                    <th className="px-4 py-2 text-xs text-right text-[#6B6B6B]">Débits</th>
                    <th className="px-4 py-2 text-xs text-right text-[#6B6B6B]">Crédits</th>
                    <th className="px-4 py-2 text-xs text-right text-[#6B6B6B]">Écritures</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleBreakdown.map(([mod, data]) => (
                    <tr key={mod} className="border-t border-[#F9F9F9] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-2 text-xs font-medium">{MODULE_LABELS[mod] || mod}</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-[#1A1A1A]">{data.debit > 0 ? data.debit.toLocaleString() : "-"}</td>
                      <td className="px-4 py-2 text-xs text-right font-mono text-[#1A1A1A]">{data.credit > 0 ? data.credit.toLocaleString() : "-"}</td>
                      <td className="px-4 py-2 text-xs text-right text-[#6B6B6B]">{data.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent entries */}
        <Card className="border border-[#F0F0F0]">
          <div className="px-4 py-3 border-b border-[#F0F0F0]">
            <p className="text-sm font-semibold text-[#1A1A1A]">Dernières écritures</p>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-xs text-[#9B9B9B] p-4">Chargement...</p>
            ) : recent.length === 0 ? (
              <p className="text-xs text-[#9B9B9B] p-4">Aucune écriture enregistrée</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {recent.map(entry => (
                    <tr key={entry.id} className="border-t border-[#F9F9F9] hover:bg-[#FAFAFA]">
                      <td className="px-3 py-2 text-xs text-[#9B9B9B] whitespace-nowrap">
                        {entry.entry_date ? format(new Date(entry.entry_date), "dd/MM/yy") : "-"}
                      </td>
                      <td className="px-2 py-2">
                        <Badge className={`text-xs ${JOURNAL_COLORS[entry.journal_type] || "bg-gray-100 text-gray-700"}`}>
                          {JOURNAL_LABELS[entry.journal_type] || entry.journal_type}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-xs font-mono text-[#6B6B6B]">{entry.account_code}</td>
                      <td className="px-2 py-2 text-xs truncate max-w-[120px]">{entry.libelle}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">
                        {entry.debit > 0
                          ? <span className="text-[#1A1A1A]">{entry.debit.toLocaleString()}</span>
                          : <span className="text-[#9B9B9B]">{entry.credit.toLocaleString()}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}