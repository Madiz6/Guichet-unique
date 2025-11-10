import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function UpcomingPayments() {
  const today = new Date();
  const taxDate = new Date(today.getFullYear(), today.getMonth(), 10);
  const salaryDate = new Date(today.getFullYear(), today.getMonth(), 30);
  
  const getDaysUntil = (targetDate) => {
    const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    return diff < 0 ? 0 : diff;
  };
  
  const isUrgent = (daysLeft) => daysLeft <= 3;
  
  const payments = [
    {
      title: 'Tax & CNSS Declaration',
      date: taxDate,
      daysLeft: getDaysUntil(taxDate),
      type: 'declaration',
      icon: Calendar
    },
    {
      title: 'Employee Salary Payment',
      date: salaryDate,
      daysLeft: getDaysUntil(salaryDate),
      type: 'salary',
      icon: Clock
    }
  ];
  
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((payment, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isUrgent(payment.daysLeft) ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                <payment.icon className={`w-5 h-5 ${
                  isUrgent(payment.daysLeft) ? 'text-amber-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <p className="font-medium text-slate-900">{payment.title}</p>
                <p className="text-sm text-slate-500">
                  {format(payment.date, 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <Badge variant={isUrgent(payment.daysLeft) ? "destructive" : "secondary"}>
              {payment.daysLeft === 0 ? 'Today' : `${payment.daysLeft} days`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}