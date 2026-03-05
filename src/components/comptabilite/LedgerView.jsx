import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, RotateCcw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const JOURNAL_LABELS = {
  ACH: "Achats", VTE: "Ventes", BNQ: "Banque", OD: "OD", SAL: "Salaires", CNSS: "CNSS"
};

const JOURNAL_COLORS = {
  ACH: "bg-orange-100 text-orange-800",
  VTE: "bg-green-100 text-green-800",
  BNQ: "bg-blue-100 text-blue-800",
  OD: "bg-purple-100 text-purple-800",
  SAL: "bg-rose-100 text-rose-800",
  CNSS: "bg-yellow-100 text-yellow-800"
};

export default function LedgerView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterJournal, setFilterJournal] = useState("all");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    journal_type: "OD",
    libelle: "",
    lines: [
      { account_code: "", account_name: "", debit: "", credit: "" },
      { account_code: "", account_name: "", debit: "", credit: "" }
    ]
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries"],
    queryFn: () => base44.entities.LedgerEntry.list("-entry_date", 200)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => base44.entities.ChartOfAccounts.list("code")
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.LedgerEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ledger-entries"] }); }
  });

  const handleManualSubmit = async () => {
    const txId = `MANUAL-${Date.now()}`;
    for (const line of form.lines) {
      if (!line.account_code) continue;
      await createEntryMutation.mutateAsync({
        transaction_id: txId,
        entry_date: form.entry_date,
        journal_type: form.journal_type,
        account_code: line.account_code,
        account_name: line.account_name,
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        libelle: form.libelle,
        entry_type: "manual",
        source_module: "manual",
        period: form.entry_date.slice(0, 7).replace("-", ""),
        fiscal_year: form.entry_date.slice(0, 4)
      });
    }
    setShowManualEntry(false);
    setForm({ entry_date: new Date().toISOString().split("T")[0], journal_type: "OD", libelle: "", lines: [{ account_code: "", account_name: "", debit: "", credit: "" }, { account_code: "", account_name: "", debit: "", credit: "" }] });
  };

  const handleReversal = async () => {
    if (!selectedEntry) return;
    await createEntryMutation.mutateAsync({
      transaction_id: `REV-${selectedEntry.transaction_id}`,
      entry_date: new Date().toISOString().split("T")[0],
      journal_type: selectedEntry.journal_type,
      account_code: selectedEntry.account_code,
      account_name: selectedEntry.account_name,
      debit: selectedEntry.credit,
      credit: selectedEntry.debit,
      libelle: `CONTREPASSATION: ${selectedEntry.libelle}`,
      entry_type: "reversing",
      source_module: selectedEntry.source_module,
      period: new Date().toISOString().slice(0, 7).replace("-", ""),
      fiscal_year: new Date().getFullYear().toString()
    });
    setShowReversalDialog(false);
    setSelectedEntry(null);
  };

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.libelle?.toLowerCase().includes(search.toLowerCase()) || e.account_code?.includes(search);
    const matchJournal = filterJournal === "all" || e.journal_type === filterJournal;
    return matchSearch && matchJournal;
  });

  const totalDebit = filtered.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + (e.credit || 0), 0);

  const updateLine = (idx, field, value) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    if (field === "account_code") {
      const acc = accounts.find(a => a.code === value);
      if (acc) lines[idx].account_name = acc.name;
    }
    setForm({ ...form, lines });
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-[#F9F9F9]">
          <CardContent className="p-4">
            <p className="text-xs text-[#6B6B6B]">Total Débits</p>
            <p className="text-xl font-semibold text-[#1A1A1A]">{totalDebit.toLocaleString()} DJF</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#F9F9F9]">
          <CardContent className="p-4">
            <p className="text-xs text-[#6B6B6B]">Total Crédits</p>
            <p className="text-xl font-semibold text-[#1A1A1A]">{totalCredit.toLocaleString()} DJF</p>
          </CardContent>
        </Card>
        <Card className={`border-0 ${Math.abs(totalDebit - totalCredit) < 1 ? "bg-green-50" : "bg-red-50"}`}>
          <CardContent className="p-4">
            <p className="text-xs text-[#6B6B6B]">Équilibre</p>
            <p className={`text-xl font-semibold ${Math.abs(totalDebit - totalCredit) < 1 ? "text-green-700" : "text-red-600"}`}>
              {Math.abs(totalDebit - totalCredit) < 1 ? "✓ Équilibré" : `Écart: ${(totalDebit - totalCredit).toLocaleString()} DJF`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <Input placeholder="Rechercher par libellé ou compte..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterJournal} onValueChange={setFilterJournal}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Journal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous journaux</SelectItem>
            {Object.entries(JOURNAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowManualEntry(true)} className="bg-[#1A1A1A] text-white hover:bg-[#333]">
          <Plus className="w-4 h-4 mr-2" /> Écriture manuelle
        </Button>
      </div>

      {/* Ledger Table */}
      <Card className="border border-[#F0F0F0]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9F9F9]">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Journal</TableHead>
                <TableHead className="text-xs">Compte</TableHead>
                <TableHead className="text-xs">Libellé</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs text-right">Débit</TableHead>
                <TableHead className="text-xs text-right">Crédit</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-[#6B6B6B]">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-[#6B6B6B]">Aucune écriture</TableCell></TableRow>
              ) : (
                filtered.map(entry => (
                  <TableRow key={entry.id} className={entry.is_reversed ? "opacity-50 line-through" : ""}>
                    <TableCell className="text-xs">{entry.entry_date ? format(new Date(entry.entry_date), "dd/MM/yy") : "-"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${JOURNAL_COLORS[entry.journal_type] || "bg-gray-100 text-gray-700"}`}>
                        {JOURNAL_LABELS[entry.journal_type] || entry.journal_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{entry.account_code} — {entry.account_name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{entry.libelle}</TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{entry.source_module}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{entry.debit > 0 ? entry.debit.toLocaleString() : ""}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{entry.credit > 0 ? entry.credit.toLocaleString() : ""}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.entry_type === "reversing" ? "Contrepassation" : entry.entry_type === "manual" ? "Manuel" : entry.entry_type === "import" ? "Import" : "Système"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.entry_type !== "reversing" && !entry.is_reversed && (
                        <Button variant="ghost" size="icon" className="w-7 h-7" title="Contrepasser"
                          onClick={() => { setSelectedEntry(entry); setShowReversalDialog(true); }}>
                          <RotateCcw className="w-3 h-3 text-[#6B6B6B]" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Écriture manuelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
              </div>
              <div>
                <Label>Journal</Label>
                <Select value={form.journal_type} onValueChange={v => setForm({ ...form, journal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOURNAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Libellé</Label>
              <Input value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} placeholder="Description de l'écriture..." />
            </div>
            <div>
              <Label>Lignes d'écriture</Label>
              <div className="space-y-2 mt-2">
                {form.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Select value={line.account_code} onValueChange={v => updateLine(idx, "account_code", v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Compte" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => <SelectItem key={a.id} value={a.code}>{a.code} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Intitulé" value={line.account_name} onChange={e => updateLine(idx, "account_name", e.target.value)} className="text-xs" />
                    <Input placeholder="Débit" type="number" value={line.debit} onChange={e => updateLine(idx, "debit", e.target.value)} className="text-xs" />
                    <Input placeholder="Crédit" type="number" value={line.credit} onChange={e => updateLine(idx, "credit", e.target.value)} className="text-xs" />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setForm({ ...form, lines: [...form.lines, { account_code: "", account_name: "", debit: "", credit: "" }] })}>
                + Ajouter une ligne
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowManualEntry(false)}>Annuler</Button>
              <Button className="bg-[#1A1A1A] text-white" onClick={handleManualSubmit}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reversal Dialog */}
      <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Contrepassation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B6B6B]">
            Vous allez créer une écriture inverse pour : <strong>{selectedEntry?.libelle}</strong>.<br />
            Cette opération est irréversible et immutable.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReversalDialog(false)}>Annuler</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleReversal}>Confirmer la contrepassation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}