import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function SupplierDebtPayment() {
  const [showForm, setShowForm] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [formData, setFormData] = useState({
    payment_amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    reference_number: '',
    description: '',
    receipt_url: ''
  });

  const queryClient = useQueryClient();

  const { data: debts = [], isLoading: debtsLoading } = useQuery({
    queryKey: ['supplier-debts'],
    queryFn: () => base44.entities.SupplierDebt.list('-created_date'),
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['debt-payments'],
    queryFn: () => base44.entities.DebtPayment.list('-payment_date'),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      // Create the payment record
      const payment = await base44.entities.DebtPayment.create(paymentData);

      // Update the debt's remaining balance
      const debt = debts.find(d => d.id === paymentData.debt_id);
      const newBalance = debt.remaining_balance - paymentData.payment_amount;
      const debtStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

      await base44.entities.SupplierDebt.update(paymentData.debt_id, {
        remaining_balance: Math.max(0, newBalance),
        status: debtStatus
      });

      // Create accounting entry (Accounts Payable debit, Bank credit)
      await base44.entities.Transaction.create({
        description: `Payment to ${debt.creditor_name} - Invoice #${debt.invoice_number}`,
        montant: paymentData.payment_amount,
        date_transaction: paymentData.payment_date,
        fournisseur: debt.creditor_name,
        methode_paiement: paymentData.payment_method,
        statut: 'Approuvé',
        type: 'Dépense',
        category_id: 'accounts-payable', // Special category for AP
        notes: `Debt Payment - Remaining: ${Math.max(0, newBalance)}`
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplier-debts']);
      queryClient.invalidateQueries(['debt-payments']);
      toast.success('Payment recorded successfully!');
      setShowForm(false);
      setSelectedDebt(null);
      setFormData({
        payment_amount: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: '',
        reference_number: '',
        description: '',
        receipt_url: ''
      });
    },
    onError: (error) => {
      toast.error(`Error recording payment: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedDebt || !formData.payment_amount || !formData.payment_method) {
      toast.error('Please fill in all required fields');
      return;
    }

    const paymentAmount = parseFloat(formData.payment_amount);
    if (paymentAmount <= 0 || paymentAmount > selectedDebt.remaining_balance) {
      toast.error(`Payment must be between 0 and ${selectedDebt.remaining_balance}`);
      return;
    }

    createPaymentMutation.mutate({
      debt_id: selectedDebt.id,
      ...formData,
      payment_amount: paymentAmount
    });
  };

  const activeDebts = debts.filter(d => d.status !== 'Paid');

  if (showForm && selectedDebt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowForm(false);
                setSelectedDebt(null);
                setFormData({
                  payment_amount: '',
                  payment_date: format(new Date(), 'yyyy-MM-dd'),
                  payment_method: '',
                  reference_number: '',
                  description: '',
                  receipt_url: ''
                });
              }}
              className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0A2540]">Record Debt Payment</h1>
              <p className="text-[#697586] mt-1">Pay off debt for {selectedDebt.creditor_name}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border border-[#E8ECF2] shadow-lg mb-6">
              <CardHeader className="bg-gradient-to-r from-white to-[#F7F9FC] border-b border-[#E8ECF2]">
                <CardTitle>Debt Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#697586] font-medium">Creditor</p>
                    <p className="text-lg font-semibold text-[#0A2540]">{selectedDebt.creditor_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#697586] font-medium">Type</p>
                    <p className="text-lg font-semibold text-[#0A2540]">{selectedDebt.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#697586] font-medium">Original Amount</p>
                    <p className="text-lg font-semibold text-[#0A2540]">{selectedDebt.original_amount.toLocaleString()} DJF</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#697586] font-medium">Remaining Balance</p>
                    <p className="text-lg font-semibold text-[#FA6400]">{selectedDebt.remaining_balance.toLocaleString()} DJF</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#E8ECF2] shadow-lg">
              <CardHeader className="bg-gradient-to-r from-white to-[#F7F9FC] border-b border-[#E8ECF2]">
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0A2540]">Payment Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      max={selectedDebt.remaining_balance}
                      placeholder="Enter payment amount"
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                      className="border-[#D3DCE6] focus-visible:ring-[#0066FF]"
                    />
                    <p className="text-xs text-[#697586]">Max: {selectedDebt.remaining_balance.toLocaleString()} DJF</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#0A2540]">Payment Date *</label>
                      <Input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="border-[#D3DCE6] focus-visible:ring-[#0066FF]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#0A2540]">Payment Method *</label>
                      <Select 
                        value={formData.payment_method}
                        onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                      >
                        <SelectTrigger className="border-[#D3DCE6] focus-visible:ring-[#0066FF]">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Virement">Bank Transfer</SelectItem>
                          <SelectItem value="Chèque">Check</SelectItem>
                          <SelectItem value="Espèces">Cash</SelectItem>
                          <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                          <SelectItem value="Carte bancaire">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0A2540]">Reference Number</label>
                    <Input
                      placeholder="Transfer ID, check number, etc."
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="border-[#D3DCE6] focus-visible:ring-[#0066FF]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0A2540]">Notes</label>
                    <Textarea
                      placeholder="Additional payment details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="border-[#D3DCE6] focus-visible:ring-[#0066FF]"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E8ECF2]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedDebt(null);
                      }}
                      className="border-[#D3DCE6] hover:bg-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-[#00C48C] to-[#00A876] hover:shadow-lg transition-all"
                      disabled={createPaymentMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {createPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0A2540]">Supplier Debt Payments</h1>
            <p className="text-[#697586] mt-1">Manage and record debt payments</p>
          </div>
        </motion.div>

        {/* Active Debts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border border-[#E8ECF2] shadow-lg">
            <div className="p-6 border-b border-[#E8ECF2] bg-gradient-to-r from-white to-[#F7F9FC] flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#0A2540]">Active Debts ({activeDebts.length})</h3>
              <Button
                onClick={() => {
                  setShowForm(true);
                  setSelectedDebt(null);
                }}
                className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Payment
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC] border-b border-[#E8ECF2]">
                    <TableHead className="text-[#425466] font-semibold">Creditor</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Type</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Original Amount</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Remaining Balance</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Due Date</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Status</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#697586]">Loading...</TableCell>
                    </TableRow>
                  ) : activeDebts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#697586]">No active debts</TableCell>
                    </TableRow>
                  ) : (
                    activeDebts.map((debt) => (
                      <motion.tr 
                        key={debt.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-[#E8ECF2] hover:bg-[#F7F9FC] transition-colors"
                      >
                        <TableCell className="font-semibold text-[#0A2540]">{debt.creditor_name}</TableCell>
                        <TableCell className="text-[#425466]">{debt.type}</TableCell>
                        <TableCell className="text-[#425466]">{debt.original_amount.toLocaleString()} DJF</TableCell>
                        <TableCell className="text-[#FA6400] font-semibold">{debt.remaining_balance.toLocaleString()} DJF</TableCell>
                        <TableCell className="text-[#425466]">
                          {debt.due_date ? format(new Date(debt.due_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            debt.status === 'Active' ? 'bg-[#FFF4E5] text-[#FA6400]' :
                            debt.status === 'Partially Paid' ? 'bg-[#E5F8F3] text-[#00C48C]' :
                            'bg-[#F5F5F5] text-[#8896A8]'
                          }`}>
                            {debt.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDebt(debt);
                              setShowForm(true);
                            }}
                            className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:shadow-lg transition-all text-white"
                          >
                            Pay
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-[#E8ECF2] shadow-lg">
            <div className="p-6 border-b border-[#E8ECF2] bg-gradient-to-r from-white to-[#F7F9FC]">
              <h3 className="text-lg font-bold text-[#0A2540]">Payment History</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC] border-b border-[#E8ECF2]">
                    <TableHead className="text-[#425466] font-semibold">Date</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Debt</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Amount</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Method</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Reference</TableHead>
                    <TableHead className="text-[#425466] font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#697586]">Loading...</TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#697586]">No payments yet</TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => {
                      const debt = debts.find(d => d.id === payment.debt_id);
                      return (
                        <motion.tr 
                          key={payment.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-[#E8ECF2] hover:bg-[#F7F9FC] transition-colors"
                        >
                          <TableCell className="text-[#425466]">
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-semibold text-[#0A2540]">{debt?.creditor_name || 'N/A'}</TableCell>
                          <TableCell className="font-semibold text-[#00C48C]">{payment.payment_amount.toLocaleString()} DJF</TableCell>
                          <TableCell className="text-[#425466]">{payment.payment_method}</TableCell>
                          <TableCell className="text-[#425466]">{payment.reference_number || '-'}</TableCell>
                          <TableCell>
                            <span className="text-xs px-3 py-1 rounded-full font-medium bg-[#E5F8F3] text-[#00C48C]">
                              Recorded
                            </span>
                          </TableCell>
                        </motion.tr>
                      );
                    })
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