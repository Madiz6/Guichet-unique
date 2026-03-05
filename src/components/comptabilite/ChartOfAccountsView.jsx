import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Download } from "lucide-react";

const CLASS_LABELS = {
  "1": "Classe 1 — Capitaux propres et assimilés",
  "2": "Classe 2 — Immobilisations",
  "3": "Classe 3 — Stocks et encours",
  "4": "Classe 4 — Tiers",
  "5": "Classe 5 — Trésorerie",
  "6": "Classe 6 — Charges",
  "7": "Classe 7 — Produits"
};

const PCG_DJIBOUTI_BASE = [
  { code: "101", name: "Capital social", class: "1", type: "passif", normal_balance: "credit" },
  { code: "106", name: "Réserves", class: "1", type: "passif", normal_balance: "credit" },
  { code: "110", name: "Report à nouveau", class: "1", type: "passif", normal_balance: "credit" },
  { code: "120", name: "Résultat de l'exercice (bénéfice)", class: "1", type: "passif", normal_balance: "credit" },
  { code: "129", name: "Résultat de l'exercice (perte)", class: "1", type: "actif", normal_balance: "debit" },
  { code: "164", name: "Emprunts auprès des établissements de crédit", class: "1", type: "passif", normal_balance: "credit" },
  { code: "211", name: "Terrains", class: "2", type: "actif", normal_balance: "debit" },
  { code: "213", name: "Constructions", class: "2", type: "actif", normal_balance: "debit" },
  { code: "215", name: "Installations techniques, matériel et outillage", class: "2", type: "actif", normal_balance: "debit" },
  { code: "218", name: "Autres immobilisations corporelles", class: "2", type: "actif", normal_balance: "debit" },
  { code: "401", name: "Fournisseurs", class: "4", type: "passif", normal_balance: "credit" },
  { code: "408", name: "Fournisseurs — Factures non parvenues", class: "4", type: "passif", normal_balance: "credit" },
  { code: "411", name: "Clients", class: "4", type: "actif", normal_balance: "debit" },
  { code: "421", name: "Personnel — Rémunérations dues", class: "4", type: "passif", normal_balance: "credit" },
  { code: "431", name: "Sécurité sociale (CNSS)", class: "4", type: "passif", normal_balance: "credit" },
  { code: "444", name: "État — Impôts sur les bénéfices", class: "4", type: "passif", normal_balance: "credit" },
  { code: "445", name: "État — TVA", class: "4", type: "passif", normal_balance: "credit" },
  { code: "447", name: "Autres impôts et taxes (ITS)", class: "4", type: "passif", normal_balance: "credit" },
  { code: "512", name: "Banques", class: "5", type: "actif", normal_balance: "debit" },
  { code: "530", name: "Caisse", class: "5", type: "actif", normal_balance: "debit" },
  { code: "601", name: "Achats de matières premières", class: "6", type: "charge", normal_balance: "debit" },
  { code: "606", name: "Achats non stockés de matières et fournitures", class: "6", type: "charge", normal_balance: "debit" },
  { code: "611", name: "Sous-traitance générale", class: "6", type: "charge", normal_balance: "debit" },
  { code: "613", name: "Locations", class: "6", type: "charge", normal_balance: "debit" },
  { code: "616", name: "Primes d'assurance", class: "6", type: "charge", normal_balance: "debit" },
  { code: "622", name: "Rémunérations d'intermédiaires et honoraires", class: "6", type: "charge", normal_balance: "debit" },
  { code: "626", name: "Frais postaux et de télécommunications", class: "6", type: "charge", normal_balance: "debit" },
  { code: "641", name: "Rémunérations du personnel", class: "6", type: "charge", normal_balance: "debit" },
  { code: "645", name: "Charges de sécurité sociale et de prévoyance", class: "6", type: "charge", normal_balance: "debit" },
  { code: "648", name: "Autres charges sociales", class: "6", type: "charge", normal_balance: "debit" },
  { code: "661", name: "Charges d'intérêts", class: "6", type: "charge", normal_balance: "debit" },
  { code: "681", name: "Dotations aux amortissements — Immobilisations", class: "6", type: "charge", normal_balance: "debit" },
  { code: "701", name: "Ventes de produits finis", class: "7", type: "produit", normal_balance: "credit" },
  { code: "706", name: "Prestations de services", class: "7", type: "produit", normal_balance: "credit" },
  { code: "708", name: "Produits des activités annexes", class: "7", type: "produit", normal_balance: "credit" },
  { code: "741", name: "Subventions d'exploitation", class: "7", type: "produit", normal_balance: "credit" },
  { code: "761", name: "Produits de participations", class: "7", type: "produit", normal_balance: "credit" },
  { code: "764", name: "Revenus des valeurs mobilières de placement", class: "7", type: "produit", normal_balance: "credit" },
];

export default function ChartOfAccountsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", class: "6", type: "charge", normal_balance: "debit", description: "" });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => base44.entities.ChartOfAccounts.list("code")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChartOfAccounts.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] }); setShowForm(false); }
  });

  const initializePCG = async () => {
    for (const acc of PCG_DJIBOUTI_BASE) {
      const exists = accounts.find(a => a.code === acc.code);
      if (!exists) await createMutation.mutateAsync({ ...acc, is_active: true, balance: 0, fiscal_year: new Date().getFullYear().toString() });
    }
  };

  const filtered = accounts.filter(a => {
    const matchSearch = !search || a.code.includes(search) || a.name.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === "all" || a.class === filterClass;
    return matchSearch && matchClass;
  });

  const grouped = Object.entries(CLASS_LABELS).map(([cls, label]) => ({
    cls, label, items: filtered.filter(a => a.class === cls)
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <Input placeholder="Rechercher par code ou intitulé..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {Object.entries(CLASS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v.split("—")[1]?.trim()}</SelectItem>)}
          </SelectContent>
        </Select>
        {accounts.length === 0 && (
          <Button variant="outline" onClick={initializePCG}>
            <Download className="w-4 h-4 mr-2" /> Initialiser PCG Djibouti
          </Button>
        )}
        <Button onClick={() => setShowForm(true)} className="bg-[#1A1A1A] text-white hover:bg-[#333]">
          <Plus className="w-4 h-4 mr-2" /> Nouveau compte
        </Button>
      </div>

      {accounts.length === 0 && !isLoading && (
        <Card className="border-dashed border-2 border-[#E5E7EB]">
          <CardContent className="p-8 text-center">
            <p className="text-[#6B6B6B] mb-4">Le Plan Comptable n'est pas encore initialisé.</p>
            <Button onClick={initializePCG} className="bg-[#1A1A1A] text-white">
              <Download className="w-4 h-4 mr-2" /> Initialiser le PCG Djibouti (base)
            </Button>
          </CardContent>
        </Card>
      )}

      {grouped.map(({ cls, label, items }) => (
        <Card key={cls} className="border border-[#F0F0F0]">
          <CardContent className="p-0">
            <div className="px-4 py-2 bg-[#F9F9F9] border-b border-[#F0F0F0]">
              <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Intitulé</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Solde normal</TableHead>
                  <TableHead className="text-xs text-right">Solde (DJF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(acc => (
                  <TableRow key={acc.id}>
                    <TableCell className="text-xs font-mono font-semibold">{acc.code}</TableCell>
                    <TableCell className="text-xs">{acc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{acc.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{acc.normal_balance === "debit" ? "Débiteur" : "Créditeur"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{(acc.balance || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau compte PCG</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="ex: 641" /></div>
              <div>
                <Label>Classe</Label>
                <Select value={form.class} onValueChange={v => setForm({ ...form, class: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["1","2","3","4","5","6","7"].map(c => <SelectItem key={c} value={c}>Classe {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Intitulé</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="passif">Passif</SelectItem>
                    <SelectItem value="charge">Charge</SelectItem>
                    <SelectItem value="produit">Produit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Solde normal</Label>
                <Select value={form.normal_balance} onValueChange={v => setForm({ ...form, normal_balance: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Débiteur</SelectItem>
                    <SelectItem value="credit">Créditeur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="bg-[#1A1A1A] text-white" onClick={() => createMutation.mutate({ ...form, is_active: true, balance: 0, fiscal_year: new Date().getFullYear().toString() })}>Créer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}