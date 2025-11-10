import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, FileText, Download, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  
  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
  });
  
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action?.includes(filterAction);
    const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
    
    return matchesSearch && matchesAction && matchesEntity;
  });
  
  const getActionColor = (action) => {
    if (action?.includes('create')) return 'text-green-600 bg-green-50';
    if (action?.includes('update')) return 'text-blue-600 bg-blue-50';
    if (action?.includes('delete')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };
  
  const getActionIcon = (action) => {
    if (action?.includes('create')) return '✅';
    if (action?.includes('update')) return '✏️';
    if (action?.includes('delete')) return '🗑️';
    return '📝';
  };
  
  const exportToCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Action', 'Entité', 'IP'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss'),
      log.user_email,
      log.action,
      log.entity_type,
      log.ip_address
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A]">Journaux d'Audit</h1>
              <p className="text-[#64748B] mt-1">Historique complet de toutes les actions effectuées</p>
            </div>
          </div>
          
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </motion.div>
        
        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Total Actions</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{logs.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Créations</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {logs.filter(l => l.action?.includes('create')).length}
                  </p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Modifications</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {logs.filter(l => l.action?.includes('update')).length}
                  </p>
                </div>
                <div className="text-4xl">✏️</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Suppressions</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {logs.filter(l => l.action?.includes('delete')).length}
                  </p>
                </div>
                <div className="text-4xl">🗑️</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#64748B]" />
                  <Input
                    placeholder="Rechercher utilisateur, action, entité..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0"
                  />
                </div>
                
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="create">Créations</SelectItem>
                    <SelectItem value="update">Modifications</SelectItem>
                    <SelectItem value="delete">Suppressions</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'entité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les entités</SelectItem>
                    <SelectItem value="Employee">Employés</SelectItem>
                    <SelectItem value="PayrollCycle">Cycles de Paie</SelectItem>
                    <SelectItem value="Declaration">Déclarations</SelectItem>
                    <SelectItem value="Holiday">Congés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="font-semibold">Date & Heure</TableHead>
                    <TableHead className="font-semibold">Utilisateur</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Entité</TableHead>
                    <TableHead className="font-semibold">Détails</TableHead>
                    <TableHead className="font-semibold">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#64748B]">
                        Aucun journal trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                        <TableCell className="text-[#374151]">
                          <div>
                            <p>{format(new Date(log.created_date), 'dd/MM/yyyy')}</p>
                            <p className="text-xs text-[#64748B]">
                              {format(new Date(log.created_date), 'HH:mm:ss')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{log.user_name || 'System'}</p>
                            <p className="text-sm text-[#64748B]">{log.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)} {log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{log.entity_type}</p>
                            {log.entity_name && (
                              <p className="text-sm text-[#64748B]">{log.entity_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[#374151]">
                          {log.changes ? (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-blue-600 hover:underline">
                                Voir les modifications
                              </summary>
                              <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-[#374151] font-mono text-xs">
                          {log.ip_address || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}