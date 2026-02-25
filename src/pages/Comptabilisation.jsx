import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, CheckCircle, Clock, Search, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BookingWorkflow from '../components/transactions/BookingWorkflow';

export default function Comptabilisation() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending'); // pending | booked | all
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['compta-transactions'],
    queryFn: () => meras.entities.Transaction.list('-date'),
  });

  const filtered = transactions.filter(t => {
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && !t.booking_status) ||
      (filterStatus === 'booked' && t.booking_status === 'booked');
    const matchSearch =
      !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.contact_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: transactions.length,
    booked: transactions.filter(t => t.booking_status === 'booked').length,
    pending: transactions.filter(t => !t.booking_status).length,
  };

  // Called by BookingWorkflow after it saves to DB
  const handleBooked = (updatedRecord) => {
    setSelectedTransaction(updatedRecord);
    queryClient.invalidateQueries({ queryKey: ['compta-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Transactions')}>
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Comptabilisation</h1>
            <p className="text-[#697586] mt-1">Journal des écritures comptables — NPCG Djibouti</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">À comptabiliser</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Comptabilisées</p>
                <p className="text-2xl font-bold text-green-600">{stats.booked}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total transactions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Transaction List */}
          <div className="space-y-4">
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">À comptabiliser</SelectItem>
                    <SelectItem value="booked">Comptabilisées</SelectItem>
                    <SelectItem value="all">Toutes</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* List */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-12 text-gray-400">Chargement...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium">Aucune transaction à afficher</p>
                </div>
              ) : filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTransaction(t)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTransaction?.id === t.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-transparent bg-white hover:border-gray-200 shadow-sm hover:shadow'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {t.booking_status === 'booked' ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                        <p className="font-semibold text-[#0A2540] truncate text-sm">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{t.date && format(new Date(t.date), 'dd/MM/yyyy')}</span>
                        {t.contact_name && <><span>·</span><span>{t.contact_name}</span></>}
                        {t.category && <><span>·</span><span>{t.category}</span></>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${t.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'Revenu' ? '+' : '-'}{t.amount?.toLocaleString()} DJF
                      </p>
                      <Badge className={`text-xs mt-1 ${t.booking_status === 'booked' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.booking_status === 'booked' ? 'Comptabilisé' : 'En attente'}
                      </Badge>
                    </div>
                  </div>
                  {t.booking_status === 'booked' && t.booking_type && (
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {t.booking_type}
                      {t.booked_at && <> · {format(new Date(t.booked_at), 'dd/MM/yyyy HH:mm')}</>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Booking Workflow */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {selectedTransaction ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  {/* Transaction summary */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] rounded-xl">
                    <p className="font-bold text-[#0A2540] text-lg">{selectedTransaction.description}</p>
                    <p className={`text-2xl font-bold mt-1 ${selectedTransaction.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedTransaction.type === 'Revenu' ? '+' : '-'}{selectedTransaction.amount?.toLocaleString()} DJF
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>{selectedTransaction.date && format(new Date(selectedTransaction.date), 'dd/MM/yyyy')}</span>
                      {selectedTransaction.payment_method && <span>· {selectedTransaction.payment_method}</span>}
                      {selectedTransaction.contact_name && <span>· {selectedTransaction.contact_name}</span>}
                    </div>
                  </div>

                  <BookingWorkflow
                    transaction={selectedTransaction}
                    onBooked={handleBooked}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                  <p className="text-gray-500 font-medium">Sélectionnez une transaction</p>
                  <p className="text-gray-400 text-sm mt-1">pour démarrer la comptabilisation</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}