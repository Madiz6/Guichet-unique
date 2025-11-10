import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from 'lucide-react';

export default function EmployeeForm({ employee, onSave, onCancel }) {
  const [formData, setFormData] = useState(employee || {
    full_name: '',
    matricule: '',
    employment_type: 'general',
    department: '',
    job_title: '',
    base_salary: 0,
    bonuses: 0,
    bank_name: '',
    bank_account: '',
    start_date: '',
    status: 'active',
    vacation_days: 0,
    sick_days: 0,
    overtime_hours: 0
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="text-xl">
          {employee ? 'Edit Employee' : 'New Employee'}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Matricule/ID *</Label>
              <Input
                value={formData.matricule}
                onChange={(e) => setFormData({...formData, matricule: e.target.value})}
                required
                placeholder="EMP001"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Employment Type *</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => setFormData({...formData, employment_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="zone_franche">Zone Franche</SelectItem>
                  <SelectItem value="fonctionnaire">Fonctionnaire</SelectItem>
                  <SelectItem value="fnp">FNP</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="independant">Indépendant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                placeholder="Finance"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                placeholder="Accountant"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Base Salary (DJF) *</Label>
              <Input
                type="number"
                value={formData.base_salary}
                onChange={(e) => setFormData({...formData, base_salary: parseFloat(e.target.value)})}
                required
                min="0"
                placeholder="50000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Monthly Bonuses (DJF)</Label>
              <Input
                type="number"
                value={formData.bonuses}
                onChange={(e) => setFormData({...formData, bonuses: parseFloat(e.target.value)})}
                min="0"
                placeholder="5000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                placeholder="Bank of Djibouti"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Input
                value={formData.bank_account}
                onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                placeholder="123456789"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t bg-slate-50 p-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Employee
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}