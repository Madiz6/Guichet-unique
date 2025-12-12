import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Edit2, Trash2, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionDetailDrawer({ transaction, onClose, onUpdate, onDelete, departments, categories }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(transaction);

  if (!transaction) return null;

  const handleSave = () => {
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
        <div className="p-6 border-b border-[#E8ECF2] flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#0A2540]">Détails de la Transaction</h2>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onDelete(transaction.id)} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isEditing ? (
            <>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({...editData, date: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant (DJF)</Label>
                  <Input
                    type="number"
                    value={editData.amount}
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
                  value={editData.category}
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
                <Label>Notes</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-[#697586]">Montant</p>
                  <p className={`text-3xl font-bold ${transaction.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'Revenu' ? '+' : '-'}{transaction.amount?.toLocaleString()} DJF
                  </p>
                </div>
                <Badge className={transaction.type === 'Revenu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {transaction.type}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-[#697586] mb-1">Date</p>
                <p className="text-[#0A2540] font-semibold">
                  {transaction.date && format(new Date(transaction.date), 'dd MMMM yyyy')}
                </p>
              </div>

              <div>
                <p className="text-sm text-[#697586] mb-1">Description</p>
                <p className="text-[#0A2540]">{transaction.description}</p>
              </div>

              {transaction.contact_name && (
                <div>
                  <p className="text-sm text-[#697586] mb-1">
                    {transaction.type === 'Revenu' ? 'Client' : 'Fournisseur'}
                  </p>
                  <p className="text-[#0A2540] font-medium">{transaction.contact_name}</p>
                </div>
              )}

              {transaction.category && (
                <div>
                  <p className="text-sm text-[#697586] mb-1">Catégorie</p>
                  <Badge variant="outline">{transaction.category}</Badge>
                </div>
              )}

              {transaction.department && (
                <div>
                  <p className="text-sm text-[#697586] mb-1">Département</p>
                  <Badge variant="outline">{transaction.department}</Badge>
                </div>
              )}

              {transaction.payment_method && (
                <div>
                  <p className="text-sm text-[#697586] mb-1">Méthode de paiement</p>
                  <p className="text-[#0A2540]">{transaction.payment_method}</p>
                </div>
              )}

              {transaction.notes && (
                <div>
                  <p className="text-sm text-[#697586] mb-1">Notes</p>
                  <p className="text-[#0A2540]">{transaction.notes}</p>
                </div>
              )}

              {transaction.attachments?.length > 0 && (
                <div>
                  <p className="text-sm text-[#697586] mb-2">Pièces jointes ({transaction.attachments.length})</p>
                  <div className="space-y-2">
                    {transaction.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                        <div className="flex items-center gap-2">
                          {file.type?.startsWith('image/') ? (
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-600" />
                          )}
                          <span className="text-sm text-[#0A2540]">{file.name}</span>
                        </div>
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {isEditing && (
          <div className="p-6 border-t border-[#E8ECF2] flex gap-3">
            <Button variant="outline" onClick={() => { setIsEditing(false); setEditData(transaction); }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-[#0066FF] to-[#0052CC]">
              Enregistrer
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}