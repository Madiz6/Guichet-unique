import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Edit2, Trash2, Download, FileText, Image as ImageIcon, CreditCard, Calendar, CheckCircle, Link2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import BookingWorkflow from './BookingWorkflow';

export default function TransactionDetailDrawer({ transaction, onClose, onUpdate, onDelete, departments, categories, budgets = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(transaction);
  const [isSavingBudgetLink, setIsSavingBudgetLink] = useState(false);

  useEffect(() => {
    setEditData(transaction);
    setIsEditing(false);
  }, [transaction]);

  if (!transaction) return null;

  // Budgets filtered by department of this transaction
  const filteredBudgets = budgets.filter(b =>
    !editData?.department || !b.department_name || b.department_name === editData?.department
  );

  // Find linked budget
  const linkedBudget = budgets.find(b => b.id === transaction.budget_id) ||
    budgets.find(b => b.department_name === transaction.department || b.categories_allowed?.includes(transaction.category));

  const budgetRemaining = linkedBudget
    ? linkedBudget.amount_available ?? (linkedBudget.amount_allocated - linkedBudget.amount_used - linkedBudget.amount_committed)
    : null;

  const handleSave = async () => {
    // If budget link changed and it's an expense, update budget spent amounts
    if (editData.type === 'Dépense' && editData.budget_id !== transaction.budget_id) {
      setIsSavingBudgetLink(true);
      try {
        // Remove from old budget
        if (transaction.budget_id) {
          const oldBudget = budgets.find(b => b.id === transaction.budget_id);
          if (oldBudget) {
            await base44.entities.Budget.update(oldBudget.id, {
              ...oldBudget,
              amount_used: Math.max(0, (oldBudget.amount_used || 0) - (transaction.amount || 0)),
              amount_available: (oldBudget.amount_available || 0) + (transaction.amount || 0),
            });
          }
        }
        // Add to new budget
        if (editData.budget_id) {
          const newBudget = budgets.find(b => b.id === editData.budget_id);
          if (newBudget) {
            const newUsed = (newBudget.amount_used || 0) + (editData.amount || 0);
            await base44.entities.Budget.update(newBudget.id, {
              ...newBudget,
              amount_used: newUsed,
              amount_available: newBudget.amount_allocated - newUsed - (newBudget.amount_committed || 0),
            });
          }
        }
        toast.success('Lien budget mis à jour');
      } catch (e) {
        toast.error('Erreur mise à jour budget');
      }
      setIsSavingBudgetLink(false);
    }
    onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-[#E8ECF2]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8ECF2]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#0A2540]">Transaction Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Account Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0A2540] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#697586]">Account</p>
                <p className="font-semibold text-[#0A2540]">{transaction.payment_method || 'Cash'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#697586]">
                {transaction.date && format(new Date(transaction.date), 'M/d/yyyy, hh:mm a')}
              </p>
            </div>
          </div>
        </div>

        {/* Amount Section */}
        <div className="px-6 py-4 bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6]">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-3xl font-bold ${transaction.type === 'Revenu' ? 'text-green-600' : 'text-[#0A2540]'}`}>
                {transaction.type === 'Revenu' ? '+' : '-'}{transaction.amount?.toLocaleString()} DJF
              </p>
              <p className="text-xs text-[#697586] mt-1">{transaction.category || 'Uncategorized'}</p>
            </div>
            <Badge className="bg-green-100 text-green-700 border-0">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="payment" className="px-6 py-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment">Détails</TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Comptabilisation
              {!transaction.booking_status && <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 inline-block" />}
              {transaction.booking_status && <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="events">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4 mt-4">
            {isEditing && editData ? (
            <>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editData.date || ''}
                  onChange={(e) => setEditData({...editData, date: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={editData.description || ''}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant (DJF)</Label>
                  <Input
                    type="number"
                    value={editData.amount || 0}
                    onChange={(e) => setEditData({...editData, amount: parseFloat(e.target.value)})}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={editData.type} onValueChange={(value) => setEditData({...editData, type: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revenu">Revenu</SelectItem>
                      <SelectItem value="Dépense">Dépense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Catégorie</Label>
                <Input
                  value={editData.category || ''}
                  onChange={(e) => setEditData({...editData, category: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Département</Label>
                <Select value={editData.department} onValueChange={(value) => setEditData({...editData, department: value})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Méthode de paiement</Label>
                <Select value={editData.payment_method} onValueChange={(value) => setEditData({...editData, payment_method: value})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Virement">Virement</SelectItem>
                    <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Budget lié</Label>
                <Select
                  value={editData.budget_id || 'none'}
                  onValueChange={(v) => setEditData({...editData, budget_id: v === 'none' ? null : v})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Aucun budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun budget</SelectItem>
                    {filteredBudgets.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.department_name || b.category || 'Global'} — {b.amount_available?.toLocaleString()} DJF dispo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </>
            ) : (
              <>
                {/* Description */}
                <div className="p-3 bg-[#F7F9FC] rounded-lg space-y-1">
                  <p className="text-xs font-medium text-[#697586] uppercase">Description</p>
                  <p className="text-sm text-[#0A2540]">{transaction.description}</p>
                </div>

                {/* Contact */}
                {transaction.contact_name && (
                  <div className="p-3 bg-[#F7F9FC] rounded-lg space-y-1">
                    <p className="text-xs font-medium text-[#697586] uppercase">
                      {transaction.type === 'Revenu' ? 'Client' : 'Supplier'}
                    </p>
                    <p className="text-sm text-[#0A2540] font-medium">{transaction.contact_name}</p>
                  </div>
                )}

                {/* Type/Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F7F9FC] rounded-lg space-y-1">
                    <p className="text-xs font-medium text-[#697586] uppercase">Type</p>
                    <Badge className={transaction.type === 'Revenu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {transaction.type}
                    </Badge>
                  </div>
                  <div className="p-3 bg-[#F7F9FC] rounded-lg space-y-1">
                    <p className="text-xs font-medium text-[#697586] uppercase">Category</p>
                    <p className="text-sm text-[#0A2540]">{transaction.category || '-'}</p>
                  </div>
                </div>

                {/* Department & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  {transaction.department && (
                    <div className="p-3 bg-[#F7F9FC] rounded-lg space-y-1">
                      <p className="text-xs font-medium text-[#697586] uppercase">Department</p>
                      <p className="text-sm text-[#0A2540]">{transaction.department}</p>
                    </div>
                  )}
                  <div className="p-3 bg-[#F7F9FC] rounded-lg space-y-1">
                    <p className="text-xs font-medium text-[#697586] uppercase">Payment Method</p>
                    <p className="text-sm text-[#0A2540]">{transaction.payment_method || '-'}</p>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs font-medium text-[#697586] uppercase mb-1">Montant HT</p>
                      <p className="text-lg font-semibold text-[#0A2540]">
                        {transaction.amount?.toLocaleString()} DJF
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#697586] uppercase mb-1">Date</p>
                      <p className="text-sm text-[#0A2540] font-semibold">
                        {transaction.date && format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  {transaction.tax_rate > 0 && (
                    <div className="pt-3 border-t border-blue-200">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[#697586]">TVA ({transaction.tax_rate}%)</p>
                          <p className="font-semibold text-[#0A2540]">{transaction.tax_amount?.toLocaleString()} DJF</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[#697586]">Total TTC</p>
                          <p className={`text-lg font-bold ${transaction.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'Revenu' ? '+' : '-'}{transaction.total_amount?.toLocaleString() || transaction.amount?.toLocaleString()} DJF
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {(!transaction.tax_rate || transaction.tax_rate === 0) && (
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs text-[#697586]">Total</p>
                      <p className={`text-xl font-bold ${transaction.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'Revenu' ? '+' : '-'}{transaction.amount?.toLocaleString()} DJF
                      </p>
                    </div>
                  )}
                </div>

                {/* Budget Information */}
                {transaction.type === 'Dépense' && linkedBudget && (
                  <div className="p-4 bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] border border-[#E5E7EB] rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#1A1A1A] uppercase tracking-wide flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Budget lié
                      </p>
                      <Badge variant="outline" className="text-xs font-normal">
                        {linkedBudget.department_name || linkedBudget.category || 'Global'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-[#6B6B6B] mb-1">Alloué</p>
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {linkedBudget.amount_allocated?.toLocaleString()} DJF
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B6B6B] mb-1">Utilisé</p>
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {linkedBudget.amount_used?.toLocaleString()} DJF
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B6B6B] mb-1">Disponible</p>
                        <p className={`text-sm font-semibold ${
                          budgetRemaining < linkedBudget.amount_allocated * 0.2 
                            ? 'text-red-600' 
                            : budgetRemaining < linkedBudget.amount_allocated * 0.5 
                            ? 'text-amber-600' 
                            : 'text-green-600'
                        }`}>
                          {budgetRemaining?.toLocaleString()} DJF
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-[#6B6B6B]">Utilisation</span>
                        <span className="font-medium text-[#1A1A1A]">
                          {((linkedBudget.amount_used / linkedBudget.amount_allocated) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                        <div
                          className={`h-1.5 transition-all ${
                            (linkedBudget.amount_used / linkedBudget.amount_allocated) >= 0.8 ? 'bg-red-500' :
                            (linkedBudget.amount_used / linkedBudget.amount_allocated) >= 0.5 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((linkedBudget.amount_used / linkedBudget.amount_allocated) * 100, 100)}%` }}
                        />
                        <div
                          className="h-1.5 bg-blue-400 transition-all"
                          style={{ width: `${Math.min((linkedBudget.amount_committed / linkedBudget.amount_allocated) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {transaction.notes && (
                  <div className="p-3 bg-[#FFF9E5] border border-[#FFE8A1] rounded-lg space-y-1">
                    <p className="text-xs font-medium text-[#8B6914] uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Notes
                    </p>
                    <p className="text-sm text-[#0A2540]">{transaction.notes}</p>
                  </div>
                )}

                {/* Receipts & Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#697586] uppercase">Receipts & Documents</p>
                    {transaction.attachments?.length > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {transaction.attachments.length} file{transaction.attachments.length > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <p className="text-xs text-[#697586]">No documents uploaded</p>
                    )}
                  </div>
                  
                  {transaction.attachments?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {transaction.attachments.map((file, index) => (
                        <div key={index} className="relative group">
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            {file.type?.startsWith('image/') ? (
                              <div className="w-full aspect-[4/5] rounded-lg border-2 border-[#E8ECF2] overflow-hidden hover:border-[#0066FF] transition-all hover:shadow-lg">
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-full aspect-[4/5] rounded-lg border-2 border-[#E8ECF2] bg-[#F7F9FC] flex flex-col items-center justify-center hover:border-[#0066FF] transition-all hover:shadow-lg p-3">
                                <FileText className="w-10 h-10 text-[#697586] mb-2" />
                                <p className="text-xs text-center text-[#697586] truncate w-full">{file.name}</p>
                              </div>
                            )}
                          </a>
                          <a 
                            href={file.url} 
                            download 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Button size="sm" variant="secondary" className="h-7 w-7 p-0 shadow-lg">
                              <Download className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-[#E8ECF2] rounded-lg">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-[#D3DCE6]" />
                      <p className="text-sm text-[#697586]">No receipts or documents attached</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="flex gap-2 pt-4 border-t border-[#E8ECF2]">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex-1">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDelete(transaction.id)} className="flex-1 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="booking" className="mt-4">
            <BookingWorkflow transaction={transaction} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <div className="space-y-3">
              {transaction.booking_status && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Écriture comptable créée</p>
                    <p className="text-xs text-green-600">{transaction.booking_type} — {transaction.booked_at ? format(new Date(transaction.booked_at), 'dd/MM/yyyy HH:mm') : ''}</p>
                  </div>
                </div>
              )}
              {transaction.payment_registered && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Paiement enregistré</p>
                    <p className="text-xs text-blue-600">{transaction.payment_method}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Transaction créée</p>
                  <p className="text-xs text-gray-500">{transaction.created_date ? format(new Date(transaction.created_date), 'dd/MM/yyyy HH:mm') : ''}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {isEditing && (
          <div className="px-6 py-4 border-t border-[#E8ECF2] flex gap-3">
            <Button variant="outline" onClick={() => { setIsEditing(false); setEditData(transaction); }} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSavingBudgetLink} className="flex-1 bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
                {isSavingBudgetLink ? 'Mise à jour...' : 'Enregistrer'}
              </Button>
          </div>
        )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}