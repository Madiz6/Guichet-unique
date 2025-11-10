import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AssetPerformanceReport({ asset, maintenanceRecords, leases, payments }) {
  // Calculate metrics
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cout_total || 0), 0);
  const maintenanceCount = maintenanceRecords.length;
  const avgMaintenanceCost = maintenanceCount > 0 ? totalMaintenanceCost / maintenanceCount : 0;
  
  // Revenue from this asset
  const assetLeases = leases.filter(l => l.asset_id === asset.id);
  const totalRevenue = assetLeases.reduce((sum, l) => {
    const leasePayments = payments.filter(p => p.lease_id === l.id && p.statut === 'Payé');
    return sum + leasePayments.reduce((s, p) => s + (p.montant || 0), 0);
  }, 0);
  
  const monthlyRevenue = assetLeases
    .filter(l => l.statut === 'Actif')
    .reduce((sum, l) => sum + (l.montant_mensuel || 0), 0);
  
  const netProfit = totalRevenue - totalMaintenanceCost;
  const roi = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
  
  // Maintenance cost over time
  const maintenanceByMonth = maintenanceRecords.reduce((acc, record) => {
    const month = format(new Date(record.date_maintenance), 'MMM yyyy', { locale: fr });
    acc[month] = (acc[month] || 0) + (record.cout_total || 0);
    return acc;
  }, {});
  
  const maintenanceCostData = Object.entries(maintenanceByMonth)
    .slice(-12)
    .map(([month, cout]) => ({ month, cout }));
  
  // Revenue vs Maintenance comparison
  const revenueByMonth = payments.filter(p => {
    const lease = leases.find(l => l.id === p.lease_id);
    return lease?.asset_id === asset.id && p.statut === 'Payé';
  }).reduce((acc, payment) => {
    const month = payment.periode;
    acc[month] = (acc[month] || 0) + (payment.montant || 0);
    return acc;
  }, {});
  
  const comparisonData = Object.keys({ ...revenueByMonth, ...maintenanceByMonth })
    .slice(-12)
    .map(month => ({
      month,
      revenus: revenueByMonth[month] || 0,
      maintenance: maintenanceByMonth[month] || 0
    }));
  
  // Export to CSV
  const exportToCSV = () => {
    const csvData = [
      ['Rapport de Performance d\'Actif'],
      ['Actif:', asset.nom],
      ['Type:', asset.type_actif],
      ['Date du rapport:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })],
      [''],
      ['MÉTRIQUES FINANCIÈRES'],
      ['Revenus totaux:', `${totalRevenue.toLocaleString()} DJF`],
      ['Coûts maintenance totaux:', `${totalMaintenanceCost.toLocaleString()} DJF`],
      ['Bénéfice net:', `${netProfit.toLocaleString()} DJF`],
      ['ROI:', `${roi}%`],
      ['Revenus mensuels actuels:', `${monthlyRevenue.toLocaleString()} DJF`],
      [''],
      ['MAINTENANCE'],
      ['Nombre de maintenances:', maintenanceCount],
      ['Coût moyen par maintenance:', `${Math.round(avgMaintenanceCost).toLocaleString()} DJF`],
      [''],
      ['HISTORIQUE DES MAINTENANCES'],
      ['Date', 'Type', 'Description', 'Coût (DJF)', 'Statut', 'Urgence'],
      ...maintenanceRecords.map(r => [
        format(new Date(r.date_maintenance), 'dd/MM/yyyy'),
        r.type_maintenance,
        r.description,
        r.cout_total || 0,
        r.statut,
        r.urgence
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Performance_${asset.nom}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-[#0F172A]">Rapport de Performance</h3>
          <p className="text-sm text-[#64748B] mt-1">{asset.nom} - {asset.type_actif}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="border-[#6366F1] text-[#6366F1]">
          <Download className="w-4 h-4 mr-2" />
          Exporter en CSV
        </Button>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Revenus Totaux</p>
                <p className="text-xl font-bold text-green-600">{totalRevenue.toLocaleString()} DJF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Coûts Maintenance</p>
                <p className="text-xl font-bold text-red-600">{totalMaintenanceCost.toLocaleString()} DJF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center`}>
                {netProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-white" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Bénéfice Net</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {netProfit.toLocaleString()} DJF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">ROI</p>
                <p className="text-xl font-bold text-purple-600">{roi}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Cost Trend */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b border-[#E5E7EB]">
            <h4 className="font-bold text-[#0F172A]">Coûts de Maintenance</h4>
            <p className="text-sm text-[#64748B]">Évolution mensuelle</p>
          </div>
          <CardContent className="p-6">
            {maintenanceCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={maintenanceCostData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cout" stroke="#EF4444" strokeWidth={2} name="Coût (DJF)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-[#64748B] py-12">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
        
        {/* Revenue vs Maintenance */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b border-[#E5E7EB]">
            <h4 className="font-bold text-[#0F172A]">Revenus vs Maintenance</h4>
            <p className="text-sm text-[#64748B]">Comparaison mensuelle</p>
          </div>
          <CardContent className="p-6">
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenus" fill="#10B981" name="Revenus" />
                  <Bar dataKey="maintenance" fill="#EF4444" name="Maintenance" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-[#64748B] py-12">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-blue-500" />
              <p className="text-sm text-[#64748B]">Revenus Mensuels</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{monthlyRevenue.toLocaleString()} DJF</p>
            <p className="text-xs text-[#64748B] mt-1">Contrats actifs</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Wrench className="w-8 h-8 text-orange-500" />
              <p className="text-sm text-[#64748B]">Coût Moyen/Maintenance</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{Math.round(avgMaintenanceCost).toLocaleString()} DJF</p>
            <p className="text-xs text-[#64748B] mt-1">{maintenanceCount} maintenance(s)</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <p className="text-sm text-[#64748B]">Rentabilité</p>
            </div>
            <p className={`text-2xl font-bold ${roi >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{roi}%</p>
            <p className="text-xs text-[#64748B] mt-1">Retour sur investissement</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Analysis */}
      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b border-[#E5E7EB]">
          <h4 className="font-bold text-[#0F172A]">Analyse Détaillée</h4>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-[#0F172A] mb-3">💰 Performance Financière</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-[#F7F9FC] rounded">
                  <span className="text-[#64748B]">Revenus totaux:</span>
                  <span className="font-semibold text-green-600">+{totalRevenue.toLocaleString()} DJF</span>
                </div>
                <div className="flex justify-between p-2 bg-[#F7F9FC] rounded">
                  <span className="text-[#64748B]">Coûts maintenance:</span>
                  <span className="font-semibold text-red-600">-{totalMaintenanceCost.toLocaleString()} DJF</span>
                </div>
                <div className="flex justify-between p-2 bg-[#F7F9FC] rounded font-bold border-t-2 border-[#6366F1]">
                  <span className="text-[#0F172A]">Bénéfice net:</span>
                  <span className={netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} DJF
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-semibold text-[#0F172A] mb-3">🔧 Statistiques de Maintenance</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-[#F7F9FC] rounded">
                  <span className="text-[#64748B]">Total maintenances:</span>
                  <span className="font-semibold text-[#0F172A]">{maintenanceCount}</span>
                </div>
                <div className="flex justify-between p-2 bg-[#F7F9FC] rounded">
                  <span className="text-[#64748B]">Coût moyen:</span>
                  <span className="font-semibold text-[#0F172A]">{Math.round(avgMaintenanceCost).toLocaleString()} DJF</span>
                </div>
                <div className="flex justify-between p-2 bg-[#F7F9FC] rounded">
                  <span className="text-[#64748B]">% du revenu en maintenance:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {totalRevenue > 0 ? ((totalMaintenanceCost / totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200">
            <h5 className="font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
              💡 Recommandations
            </h5>
            <ul className="space-y-1 text-sm text-[#64748B]">
              {avgMaintenanceCost > monthlyRevenue * 0.3 && (
                <li>⚠️ Les coûts de maintenance représentent plus de 30% des revenus - envisager une optimisation</li>
              )}
              {maintenanceCount === 0 && (
                <li>✅ Aucune maintenance enregistrée - créer un plan de maintenance préventive</li>
              )}
              {roi < 50 && roi >= 0 && (
                <li>📊 ROI modéré - possibilité d'augmenter le tarif ou réduire les coûts</li>
              )}
              {roi >= 70 && (
                <li>🎉 Excellent ROI - actif très performant!</li>
              )}
              {maintenanceRecords.filter(r => r.urgence === 'Critique' || r.urgence === 'Haute').length > 0 && (
                <li>🚨 Maintenances urgentes récentes - surveiller de près</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}