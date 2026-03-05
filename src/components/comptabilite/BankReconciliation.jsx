/**
 * BankReconciliation — Import bank statements, auto-match with transactions,
 * and create manual ledger entries for discrepancies.
 */
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertCircle, Zap, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BankReconciliation() {
  const queryClient = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState({ bank_name: "", account_number: "", period_start: "", period_end: "", opening_balance: "", closing_balance: "" });
  const [csvLines, setCsvLines] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [manualLineIdx, setManualLineIdx] = useState(null);
  const [manualForm, setManualForm] = useState({ account_code: "606", account_name: "Achats non stockés", journal_type: "OD", libelle: "" });

  const { data: statements = [] } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: () => base44.entities.BankStatement.list("-statement_date", 50)
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ["ledger-entries"],
    queryFn: () => base44.entities.LedgerEntry.list("-entry_date", 500)
  });

  const createStatementMutation = useMutation({
    mutationFn: (data) => base44.entities.BankStatement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-statements"] }); setShowImport(false); setCsvLines([]); }
  });

  const updateStatementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankStatement.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-statements"] })
  });

  // Auto-match: find ledger entries with same amount ±1% and close date (±3 days)
  const findMatch = (line) => {
    const lineAmount = (line.debit || 0) + (line.credit || 0);
    const lineDate = line.date ? new Date(line.date) : null;
    return ledgerEntries.find(e => {
      const entryAmount = (e.debit || 0) + (e.credit || 0);
      const amountMatch = Math.abs(entryAmount - lineAmount) / (lineAmount || 1) < 0.01;
      const entryDate = e.entry_date ? new Date(e.entry_date) : null;
      const dateDiff = lineDate && entryDate ? Math.abs((lineDate - entryDate) / 86400000) : 99;
      return amountMatch && dateDiff <= 3;
    });
  };

  const handleAutoMatch = async () => {
    if (!selectedStatement) return;
    const stmt = statements.find(s => s.id === selectedStatement.id);
    if (!stmt) return;
    let matched = 0;
    const lines = (stmt.lines || []).map(line => {
      if (line.reconciled) return line;
      const match = findMatch(line);
      if (match) { matched++; return { ...line, reconciled: true, transaction_id: match.transaction_id }; }
      return line;
    });
    const reconciledCount = lines.filter(l => l.reconciled).length;
    await updateStatementMutation.mutateAsync({
      id: stmt.id,
      data: { lines, reconciled_count: reconciledCount, reconciliation_status: reconciledCount === lines.length ? "Rapproché" : reconciledCount > 0 ? "Partiellement rapproché" : "Non rapproché" }
    });
    setSelectedStatement({ ...stmt, lines });
    toast.success(`${matched} ligne(s) rapprochée(s) automatiquement`);
  };

  const handleManualEntry = async () => {
    if (!selectedStatement || manualLineIdx === null) return;
    const stmt = statements.find(s => s.id === selectedStatement.id);
    const line = stmt.lines[manualLineIdx];
    const txId = `RECON-${Date.now()}`;
    const date = line.date || format(new Date(), "yyyy-MM-dd");
    const amount = (line.debit || 0) + (line.credit || 0);
    // Create a counter-entry: 512 Banque vs chosen account
    await base44.entities.LedgerEntry.create({ transaction_id: txId, entry_date: date, journal_type: manualForm.journal_type, account_code: "512", account_name: "Banques", debit: line.credit > 0 ? line.credit : 0, credit: line.debit > 0 ? line.debit : 0, libelle: manualForm.libelle || line.description, entry_type: "manual", source_module: "bank_import", period: date.slice(0,7).replace("-",""), fiscal_year: date.slice(0,4) });
    await base44.entities.LedgerEntry.create({ transaction_id: txId, entry_date: date, journal_type: manualForm.journal_type, account_code: manualForm.account_code, account_name: manualForm.account_name, debit: line.debit > 0 ? line.debit : 0, credit: line.credit > 0 ? line.credit : 0, libelle: manualForm.libelle || line.description, entry_type: "manual", source_module: "bank_import", period: date.slice(0,7).replace("-",""), fiscal_year: date.slice(0,4) });
    // Mark line as reconciled
    const lines = [...(stmt.lines || [])];
    lines[manualLineIdx] = { ...lines[manualLineIdx], reconciled: true, transaction_id: txId };
    const reconciledCount = lines.filter(l => l.reconciled).length;
    await updateStatementMutation.mutateAsync({ id: stmt.id, data: { lines, reconciled_count: reconciledCount, reconciliation_status: reconciledCount === lines.length ? "Rapproché" : "Partiellement rapproché" } });
    queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
    setManualLineIdx(null);
    toast.success("Écriture manuelle créée et ligne rapprochée");
  };

  const handleCSVParse = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = ev.target.result.split("\n").slice(1).filter(r => r.trim()).map(row => {
        const cols = row.split(",");
        return { date: cols[0]?.trim(), description: cols[1]?.trim(), debit: parseFloat(cols[2]) || 0, credit: parseFloat(cols[3]) || 0, balance: parseFloat(cols[4]) || 0, reference: cols[5]?.trim() || "", reconciled: false };
      });
      setCsvLines(rows);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    await createStatementMutation.mutateAsync({ ...importForm, opening_balance: parseFloat(importForm.opening_balance) || 0, closing_balance: parseFloat(importForm.closing_balance) || 0, statement_date: importForm.period_end, lines: csvLines, import_source: "CSV", reconciliation_status: "Non rapproché", total_lines: csvLines.length, reconciled_count: 0 });
  };

  const expandedStmt = selectedStatement ? statements.find(s => s.id === selectedStatement.id) : null;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Rapprochement Bancaire</h2>
        <Button onClick={() => setShowImport(true)} className="bg-[#1A1A1A] text-white hover:bg-[#333]">
          <Upload className="w-4 h-4 mr-2" /> Importer relevé
        </Button>
      </div>

      {statements.length === 0 ? (
        <Card className="border-dashed border-2 border-[#E5E7EB]">
          <CardContent className="p-8 text-center text-[#6B6B6B]">
            Aucun relevé bancaire importé. Importez un fichier CSV pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {statements.map(stmt => (
            <Card key={stmt.id} className="border border-[#F0F0F0]">
              <CardContent className="p-4">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setSelectedStatement(selectedStatement?.id === stmt.id ? null : stmt)}>
                  <div>
                    <p className="font-medium">{stmt.bank_name} — {stmt.account_number}</p>
                    <p className="text-xs text-[#6B6B6B] mt-1">{stmt.period_start} → {stmt.period_end} · {stmt.total_lines} lignes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <span className="font-semibold">{stmt.reconciled_count || 0}</span>
                      <span className="text-[#6B6B6B]"> / {stmt.total_lines}</span>
                    </div>
                    {stmt.reconciliation_status === "Rapproché"
                      ? <Badge className="bg-green-100 text-green-800">Rapproché</Badge>
                      : stmt.reconciliation_status === "Partiellement rapproché"
                      ? <Badge className="bg-yellow-100 text-yellow-800">Partiel</Badge>
                      : <Badge className="bg-red-100 text-red-800">Non rapproché</Badge>}
                  </div>
                </div>

                {selectedStatement?.id === stmt.id && expandedStmt?.lines?.length > 0 && (
                  <div className="mt-4 border-t border-[#F0F0F0] pt-4 space-y-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" className="gap-2" onClick={handleAutoMatch}>
                        <Zap className="w-4 h-4" /> Rapprochement automatique
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F9F9F9]">
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Débit</TableHead>
                          <TableHead className="text-xs text-right">Crédit</TableHead>
                          <TableHead className="text-xs">Statut</TableHead>
                          <TableHead className="text-xs"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expandedStmt.lines.map((line, idx) => (
                          <TableRow key={idx} className={line.reconciled ? "bg-green-50" : ""}>
                            <TableCell className="text-xs">{line.date}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{line.description}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{line.debit > 0 ? line.debit.toLocaleString() : ""}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{line.credit > 0 ? line.credit.toLocaleString() : ""}</TableCell>
                            <TableCell>
                              {line.reconciled
                                ? <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="w-3 h-3 mr-1 inline" />Rapproché</Badge>
                                : <Badge className="bg-gray-100 text-gray-600 text-xs"><AlertCircle className="w-3 h-3 mr-1 inline" />En attente</Badge>}
                            </TableCell>
                            <TableCell>
                              {!line.reconciled && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Écriture manuelle"
                                  onClick={() => { setManualLineIdx(idx); setManualForm({ account_code: "606", account_name: "Achats non stockés", journal_type: "OD", libelle: line.description || "" }); }}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importer un relevé bancaire (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Banque</Label><Input value={importForm.bank_name} onChange={e => setImportForm({ ...importForm, bank_name: e.target.value })} placeholder="ex: BCI Djibouti" /></div>
              <div><Label>N° Compte</Label><Input value={importForm.account_number} onChange={e => setImportForm({ ...importForm, account_number: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Début période</Label><Input type="date" value={importForm.period_start} onChange={e => setImportForm({ ...importForm, period_start: e.target.value })} /></div>
              <div><Label>Fin période</Label><Input type="date" value={importForm.period_end} onChange={e => setImportForm({ ...importForm, period_end: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Solde ouverture</Label><Input type="number" value={importForm.opening_balance} onChange={e => setImportForm({ ...importForm, opening_balance: e.target.value })} /></div>
              <div><Label>Solde clôture</Label><Input type="number" value={importForm.closing_balance} onChange={e => setImportForm({ ...importForm, closing_balance: e.target.value })} /></div>
            </div>
            <div>
              <Label>Fichier CSV</Label>
              <p className="text-xs text-[#6B6B6B] mb-2">Colonnes: Date, Description, Débit, Crédit, Solde, Référence</p>
              <Input type="file" accept=".csv" onChange={handleCSVParse} />
              {csvLines.length > 0 && <p className="text-xs text-green-600 mt-1">✓ {csvLines.length} lignes détectées</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>Annuler</Button>
              <Button className="bg-[#1A1A1A] text-white" onClick={handleImportSubmit} disabled={!importForm.bank_name || csvLines.length === 0}>Importer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={manualLineIdx !== null} onOpenChange={() => setManualLineIdx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Créer une écriture manuelle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-[#6B6B6B] bg-[#F9F9F9] rounded p-3">
              Ligne : <strong>{expandedStmt?.lines?.[manualLineIdx]?.description}</strong><br />
              Montant : {((expandedStmt?.lines?.[manualLineIdx]?.debit || 0) + (expandedStmt?.lines?.[manualLineIdx]?.credit || 0)).toLocaleString()} DJF
            </p>
            <div>
              <Label>Libellé</Label>
              <Input value={manualForm.libelle} onChange={e => setManualForm({ ...manualForm, libelle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Compte de contrepartie</Label>
                <Select value={manualForm.account_code} onValueChange={v => setManualForm({ ...manualForm, account_code: v, account_name: { "606": "Achats non stockés", "641": "Rémunérations", "645": "Charges CNSS", "706": "Prestations services", "401": "Fournisseurs", "411": "Clients" }[v] || v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="606">606 — Achats</SelectItem>
                    <SelectItem value="641">641 — Salaires</SelectItem>
                    <SelectItem value="645">645 — CNSS</SelectItem>
                    <SelectItem value="706">706 — Produits</SelectItem>
                    <SelectItem value="401">401 — Fournisseurs</SelectItem>
                    <SelectItem value="411">411 — Clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Journal</Label>
                <Select value={manualForm.journal_type} onValueChange={v => setManualForm({ ...manualForm, journal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BNQ">Banque</SelectItem>
                    <SelectItem value="OD">OD</SelectItem>
                    <SelectItem value="ACH">Achats</SelectItem>
                    <SelectItem value="VTE">Ventes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManualLineIdx(null)}>Annuler</Button>
              <Button className="bg-[#1A1A1A] text-white" onClick={handleManualEntry}>Créer l'écriture</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}