import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle, AlertCircle, Link } from "lucide-react";
import { format } from "date-fns";

export default function BankReconciliation() {
  const queryClient = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState({ bank_name: "", account_number: "", period_start: "", period_end: "", opening_balance: "", closing_balance: "" });
  const [csvLines, setCsvLines] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);

  const { data: statements = [] } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: () => base44.entities.BankStatement.list("-statement_date", 50)
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 200)
  });

  const createStatementMutation = useMutation({
    mutationFn: (data) => base44.entities.BankStatement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-statements"] }); setShowImport(false); }
  });

  const updateStatementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankStatement.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-statements"] })
  });

  const handleCSVParse = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const rows = text.split("\n").slice(1).filter(r => r.trim()).map(row => {
        const cols = row.split(",");
        return { date: cols[0]?.trim(), description: cols[1]?.trim(), debit: parseFloat(cols[2]) || 0, credit: parseFloat(cols[3]) || 0, balance: parseFloat(cols[4]) || 0, reference: cols[5]?.trim() || "", reconciled: false };
      });
      setCsvLines(rows);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    await createStatementMutation.mutateAsync({
      ...importForm,
      opening_balance: parseFloat(importForm.opening_balance) || 0,
      closing_balance: parseFloat(importForm.closing_balance) || 0,
      statement_date: importForm.period_end,
      lines: csvLines,
      import_source: "CSV",
      reconciliation_status: "Non rapproché",
      total_lines: csvLines.length,
      reconciled_count: 0
    });
  };

  const handleReconcileLine = async (statementId, lineIdx, transactionId) => {
    const stmt = statements.find(s => s.id === statementId);
    if (!stmt) return;
    const lines = [...(stmt.lines || [])];
    lines[lineIdx] = { ...lines[lineIdx], reconciled: true, transaction_id: transactionId };
    const reconciledCount = lines.filter(l => l.reconciled).length;
    await updateStatementMutation.mutateAsync({
      id: statementId,
      data: { lines, reconciled_count: reconciledCount, reconciliation_status: reconciledCount === lines.length ? "Rapproché" : reconciledCount > 0 ? "Partiellement rapproché" : "Non rapproché" }
    });
  };

  const getStatusBadge = (status) => {
    if (status === "Rapproché") return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
    if (status === "Partiellement rapproché") return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
    return <Badge className="bg-red-100 text-red-800">{status}</Badge>;
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Rapprochement Bancaire</h2>
        <Button onClick={() => setShowImport(true)} className="bg-[#1A1A1A] text-white hover:bg-[#333]">
          <Upload className="w-4 h-4 mr-2" /> Importer relevé
        </Button>
      </div>

      {/* Statement list */}
      <div className="grid gap-3">
        {statements.length === 0 ? (
          <Card className="border-dashed border-2 border-[#E5E7EB]">
            <CardContent className="p-8 text-center text-[#6B6B6B]">
              Aucun relevé bancaire importé. Importez un fichier CSV pour commencer le rapprochement.
            </CardContent>
          </Card>
        ) : statements.map(stmt => (
          <Card key={stmt.id} className="border border-[#F0F0F0] cursor-pointer hover:border-[#1A1A1A] transition-colors"
            onClick={() => setSelectedStatement(selectedStatement?.id === stmt.id ? null : stmt)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-[#1A1A1A]">{stmt.bank_name} — {stmt.account_number}</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">{stmt.period_start} → {stmt.period_end} · {stmt.total_lines} lignes</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-[#6B6B6B]">Rapprochées</p>
                    <p className="text-sm font-semibold">{stmt.reconciled_count || 0} / {stmt.total_lines}</p>
                  </div>
                  {getStatusBadge(stmt.reconciliation_status)}
                </div>
              </div>

              {/* Expanded lines */}
              {selectedStatement?.id === stmt.id && stmt.lines?.length > 0 && (
                <div className="mt-4 border-t border-[#F0F0F0] pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F9F9F9]">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Débit</TableHead>
                        <TableHead className="text-xs text-right">Crédit</TableHead>
                        <TableHead className="text-xs">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stmt.lines.map((line, idx) => (
                        <TableRow key={idx} className={line.reconciled ? "bg-green-50" : ""}>
                          <TableCell className="text-xs">{line.date}</TableCell>
                          <TableCell className="text-xs">{line.description}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{line.debit > 0 ? line.debit.toLocaleString() : ""}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{line.credit > 0 ? line.credit.toLocaleString() : ""}</TableCell>
                          <TableCell>
                            {line.reconciled ? (
                              <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Rapproché</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 text-xs"><AlertCircle className="w-3 h-3 mr-1" />En attente</Badge>
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

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importer un relevé bancaire</DialogTitle></DialogHeader>
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
              <p className="text-xs text-[#6B6B6B] mb-2">Format: Date, Description, Débit, Crédit, Solde, Référence</p>
              <Input type="file" accept=".csv" onChange={handleCSVParse} />
              {csvLines.length > 0 && <p className="text-xs text-green-600 mt-1">✓ {csvLines.length} lignes détectées</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>Annuler</Button>
              <Button className="bg-[#1A1A1A] text-white" onClick={handleImportSubmit}>Importer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}