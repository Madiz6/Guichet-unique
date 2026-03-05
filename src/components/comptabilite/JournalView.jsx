import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const JOURNALS = [
  { code: "ACH", label: "Journal des Achats", color: "bg-orange-100 text-orange-800" },
  { code: "VTE", label: "Journal des Ventes", color: "bg-green-100 text-green-800" },
  { code: "BNQ", label: "Journal de Banque", color: "bg-blue-100 text-blue-800" },
  { code: "OD", label: "Opérations Diverses", color: "bg-purple-100 text-purple-800" },
  { code: "SAL", label: "Journal des Salaires", color: "bg-rose-100 text-rose-800" },
  { code: "CNSS", label: "Journal CNSS/ITS", color: "bg-yellow-100 text-yellow-800" },
];

export default function JournalView() {
  const [activeJournal, setActiveJournal] = useState("ACH");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries"],
    queryFn: () => base44.entities.LedgerEntry.list("-entry_date", 500)
  });

  const periodKey = period.replace("-", "");
  const filtered = entries.filter(e => e.journal_type === activeJournal && e.period === periodKey);

  const totalDebit = filtered.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + (e.credit || 0), 0);

  const currentJournal = JOURNALS.find(j => j.code === activeJournal);

  return (
    <div className="space-y-4 mt-4">
      {/* Journal Tabs */}
      <div className="flex flex-wrap gap-2">
        {JOURNALS.map(j => (
          <button key={j.code}
            onClick={() => setActiveJournal(j.code)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeJournal === j.code ? "bg-[#1A1A1A] text-white" : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EBEBEB]"}`}>
            {j.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-[#6B6B6B]">Période :</label>
        <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
          className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-[#F9F9F9]">
          <CardContent className="p-4">
            <p className="text-xs text-[#6B6B6B]">Écritures</p>
            <p className="text-xl font-semibold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#F9F9F9]">
          <CardContent className="p-4">
            <p className="text-xs text-[#6B6B6B]">Total Débits</p>
            <p className="text-xl font-semibold">{totalDebit.toLocaleString()} DJF</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#F9F9F9]">
          <CardContent className="p-4">
            <p className="text-xs text-[#6B6B6B]">Total Crédits</p>
            <p className="text-xl font-semibold">{totalCredit.toLocaleString()} DJF</p>
          </CardContent>
        </Card>
      </div>

      {/* Journal Table */}
      <Card className="border border-[#F0F0F0]">
        <CardHeader className="border-b border-[#F0F0F0] py-3 px-4">
          <CardTitle className="text-sm font-medium">
            <Badge className={currentJournal?.color}>{currentJournal?.label}</Badge>
            <span className="ml-2 text-[#6B6B6B] font-normal">— {period}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9F9F9]">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">N° Transaction</TableHead>
                <TableHead className="text-xs">Compte</TableHead>
                <TableHead className="text-xs">Libellé</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs text-right">Débit</TableHead>
                <TableHead className="text-xs text-right">Crédit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#6B6B6B]">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[#6B6B6B]">Aucune écriture pour cette période</TableCell></TableRow>
              ) : (
                filtered.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">{entry.entry_date ? format(new Date(entry.entry_date), "dd/MM/yy") : "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-[#6B6B6B]">{entry.transaction_id?.slice(0, 16)}…</TableCell>
                    <TableCell className="text-xs font-mono">{entry.account_code} — {entry.account_name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{entry.libelle}</TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{entry.source_module}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-[#1A1A1A]">{entry.debit > 0 ? entry.debit.toLocaleString() : ""}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-[#1A1A1A]">{entry.credit > 0 ? entry.credit.toLocaleString() : ""}</TableCell>
                  </TableRow>
                ))
              )}
              {filtered.length > 0 && (
                <TableRow className="bg-[#F9F9F9] font-semibold">
                  <TableCell colSpan={5} className="text-xs text-right">TOTAUX</TableCell>
                  <TableCell className="text-xs text-right font-mono">{totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{totalCredit.toLocaleString()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}