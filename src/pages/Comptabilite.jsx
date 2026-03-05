import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LedgerView from "@/components/comptabilite/LedgerView";
import JournalView from "@/components/comptabilite/JournalView";
import ChartOfAccountsView from "@/components/comptabilite/ChartOfAccountsView";
import BankReconciliation from "@/components/comptabilite/BankReconciliation";
import FinancialReports from "@/components/comptabilite/FinancialReports";
import AccountingDashboard from "@/components/comptabilite/AccountingDashboard";
import { LayoutDashboard, BookOpen, List, Building2, Landmark, BarChart3 } from "lucide-react";

export default function Comptabilite() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Comptabilité</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">Grand Livre · Journaux · Plan Comptable · Rapprochement · États Financiers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5F5F5] p-1 rounded-lg">
          <TabsTrigger value="ledger" className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4" /> Grand Livre
          </TabsTrigger>
          <TabsTrigger value="journals" className="flex items-center gap-2 text-sm">
            <List className="w-4 h-4" /> Journaux
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4" /> Plan Comptable
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2 text-sm">
            <Landmark className="w-4 h-4" /> Rapprochement Bancaire
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4" /> États Financiers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger"><LedgerView /></TabsContent>
        <TabsContent value="journals"><JournalView /></TabsContent>
        <TabsContent value="accounts"><ChartOfAccountsView /></TabsContent>
        <TabsContent value="bank"><BankReconciliation /></TabsContent>
        <TabsContent value="reports"><FinancialReports /></TabsContent>
      </Tabs>
    </div>
  );
}