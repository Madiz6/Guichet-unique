import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Users, Search, Mail, Phone, MapPin, Edit2, Trash2, Eye, Building2, TrendingUp, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function Contacts() {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => meras.entities.Contact.list('-created_date'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => meras.entities.Transaction.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => meras.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setShowForm(false);
      setEditingContact(null);
      toast.success('Contact créé avec succès');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => meras.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setShowForm(false);
      setEditingContact(null);
      toast.success('Contact mis à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => meras.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      toast.success('Contact supprimé');
    },
  });

  const handleSubmit = (data) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery || 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getContactTransactions = (contactName) => {
    return transactions.filter(t => t.contact_name === contactName);
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-[#697586]">{label}</p>
            <p className="text-2xl font-bold text-[#0A2540]">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Contacts</h1>
            <p className="text-[#697586] mt-1">Gérer vos clients et fournisseurs</p>
          </div>
          <Button
            onClick={() => {
              setEditingContact(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Contact
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            icon={Users}
            label="Total Contacts"
            value={contacts.length}
            color="from-[#6366F1] to-[#8B5CF6]"
          />
          <StatCard
            icon={TrendingUp}
            label="Clients"
            value={contacts.filter(c => c.type === 'Client' || c.type === 'Les deux').length}
            color="from-[#10B981] to-[#059669]"
          />
          <StatCard
            icon={Building2}
            label="Fournisseurs"
            value={contacts.filter(c => c.type === 'Fournisseur' || c.type === 'Les deux').length}
            color="from-[#F59E0B] to-[#D97706]"
          />
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#697586]" />
                <Input
                  placeholder="Rechercher par nom, entreprise, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#D3DCE6]"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px] border-[#D3DCE6]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Client">Clients</SelectItem>
                  <SelectItem value="Fournisseur">Fournisseurs</SelectItem>
                  <SelectItem value="Les deux">Les deux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border border-[#E8ECF2] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#697586]">
                        Aucun contact trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact) => {
                      const contactTxns = getContactTransactions(contact.name);
                      return (
                        <TableRow key={contact.id} className="hover:bg-[#F7F9FC]">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-[#0A2540]">{contact.name}</p>
                              {contact.company && (
                                <p className="text-xs text-[#697586]">{contact.company}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              contact.type === 'Client' ? 'bg-green-100 text-green-700' :
                              contact.type === 'Fournisseur' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }>
                              {contact.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-[#697586]">
                              <Mail className="w-4 h-4" />
                              {contact.email || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-[#697586]">
                              <Phone className="w-4 h-4" />
                              {contact.phone || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-[#0A2540]">
                              {contactTxns.length} transaction(s)
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingContact(contact)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingContact(contact);
                                  setShowForm(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Supprimer ce contact?')) {
                                    deleteMutation.mutate(contact.id);
                                  }
                                }}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Modifier le contact' : 'Nouveau contact'}</DialogTitle>
          </DialogHeader>
          <ContactForm
            contact={editingContact}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingContact(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Contact Detail Dialog */}
      <Dialog open={!!viewingContact} onOpenChange={() => setViewingContact(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du contact</DialogTitle>
          </DialogHeader>
          {viewingContact && (
            <ContactDetail
              contact={viewingContact}
              transactions={getContactTransactions(viewingContact.name)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactForm({ contact, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(contact || {
    name: '',
    type: 'Client',
    company: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Le nom est requis');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            className="mt-2"
          />
        </div>
        <div>
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Client">Client</SelectItem>
              <SelectItem value="Fournisseur">Fournisseur</SelectItem>
              <SelectItem value="Les deux">Les deux</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Entreprise</Label>
        <Input
          value={formData.company}
          onChange={(e) => setFormData({...formData, company: e.target.value})}
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="mt-2"
          />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label>Adresse</Label>
        <Textarea
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="mt-2"
          rows={2}
        />
      </div>

      <div>
        <Label>NIF / Numéro fiscal</Label>
        <Input
          value={formData.tax_id}
          onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="mt-2"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
          {contact ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}

function ContactDetail({ contact, transactions }) {
  const totalRevenue = transactions
    .filter(t => t.type === 'Revenu')
    .reduce((sum, t) => sum + (t.total_amount || t.amount), 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'Dépense')
    .reduce((sum, t) => sum + (t.total_amount || t.amount), 0);

  return (
    <div className="space-y-6">
      <Card className="border border-[#E8ECF2]">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#697586]">Nom</p>
              <p className="font-semibold text-[#0A2540]">{contact.name}</p>
            </div>
            <div>
              <p className="text-sm text-[#697586]">Type</p>
              <Badge className={
                contact.type === 'Client' ? 'bg-green-100 text-green-700' :
                contact.type === 'Fournisseur' ? 'bg-blue-100 text-blue-700' :
                'bg-purple-100 text-purple-700'
              }>
                {contact.type}
              </Badge>
            </div>
            {contact.company && (
              <div>
                <p className="text-sm text-[#697586]">Entreprise</p>
                <p className="text-[#0A2540]">{contact.company}</p>
              </div>
            )}
            {contact.email && (
              <div>
                <p className="text-sm text-[#697586]">Email</p>
                <p className="text-[#0A2540]">{contact.email}</p>
              </div>
            )}
            {contact.phone && (
              <div>
                <p className="text-sm text-[#697586]">Téléphone</p>
                <p className="text-[#0A2540]">{contact.phone}</p>
              </div>
            )}
            {contact.tax_id && (
              <div>
                <p className="text-sm text-[#697586]">NIF</p>
                <p className="text-[#0A2540]">{contact.tax_id}</p>
              </div>
            )}
            {contact.address && (
              <div className="col-span-2">
                <p className="text-sm text-[#697586]">Adresse</p>
                <p className="text-[#0A2540]">{contact.address}</p>
              </div>
            )}
            {contact.notes && (
              <div className="col-span-2">
                <p className="text-sm text-[#697586]">Notes</p>
                <p className="text-[#0A2540]">{contact.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-[#697586]">Transactions</p>
            <p className="text-2xl font-bold text-[#0A2540]">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-[#697586]">Revenus</p>
            <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()} DJF</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-[#697586]">Dépenses</p>
            <p className="text-2xl font-bold text-red-600">{totalExpense.toLocaleString()} DJF</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold text-[#0A2540] mb-4">Historique des transactions</h3>
        <div className="border border-[#E8ECF2] rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F9FC]">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-[#697586]">
                    Aucune transaction
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-sm text-[#697586]">
                      {txn.date && format(new Date(txn.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-[#0A2540]">{txn.description}</TableCell>
                    <TableCell>
                      <Badge className={txn.type === 'Revenu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${txn.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'Revenu' ? '+' : '-'}{(txn.total_amount || txn.amount).toLocaleString()} DJF
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}