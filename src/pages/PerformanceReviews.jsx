import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Star, TrendingUp, Award, FileText, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PerformanceReviews() {
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [viewingReview, setViewingReview] = useState(null);
  const [formData, setFormData] = useState({
    overall_rating: 3,
    technical_skills: 3,
    communication: 3,
    teamwork: 3,
    leadership: 3,
    punctuality: 3,
    status: 'Brouillon'
  });
  
  const queryClient = useQueryClient();
  
  const { data: reviews = [] } = useQuery({
    queryKey: ['performance-reviews'],
    queryFn: () => base44.entities.PerformanceReview.list('-created_date'),
  });
  
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PerformanceReview.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['performance-reviews']);
      setShowForm(false);
      setFormData({
        overall_rating: 3,
        technical_skills: 3,
        communication: 3,
        teamwork: 3,
        leadership: 3,
        punctuality: 3,
        status: 'Brouillon'
      });
      toast.success('Évaluation créée avec succès');
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PerformanceReview.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['performance-reviews']);
      setShowForm(false);
      setEditingReview(null);
      toast.success('Évaluation mise à jour');
    },
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      reviewer_email: user?.email,
      reviewer_name: user?.full_name,
      review_date: formData.review_date || format(new Date(), 'yyyy-MM-dd')
    };
    
    if (editingReview) {
      updateMutation.mutate({ id: editingReview.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'Brouillon': 'bg-gray-100 text-gray-800',
      'En attente signature': 'bg-yellow-100 text-yellow-800',
      'Complété': 'bg-green-100 text-green-800',
      'Archivé': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
              <h1 className="text-3xl font-bold text-[#0F172A]">Évaluations de Performance</h1>
              <p className="text-[#64748B] mt-1">Gérer les évaluations annuelles des employés</p>
            </div>
          </div>
          
          <Button
            onClick={() => {
              setEditingReview(null);
              setFormData({
                overall_rating: 3,
                technical_skills: 3,
                communication: 3,
                teamwork: 3,
                leadership: 3,
                punctuality: 3,
                status: 'Brouillon'
              });
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Évaluation
          </Button>
        </motion.div>
        
        {/* Stats Cards */}
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
                  <p className="text-sm text-[#64748B]">Total Évaluations</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{reviews.length}</p>
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
                  <p className="text-sm text-[#64748B]">Note Moyenne</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / reviews.length).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">En Attente</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {reviews.filter(r => r.status === 'En attente signature').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">Augmentations</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">
                    {reviews.filter(r => r.salary_increase_recommended).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Reviews Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h3 className="text-lg font-bold text-[#0F172A]">Toutes les Évaluations</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F7F9FC]">
                    <TableHead className="font-semibold">Employé</TableHead>
                    <TableHead className="font-semibold">Période</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Évaluateur</TableHead>
                    <TableHead className="font-semibold">Note</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#64748B]">
                        Aucune évaluation
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviews.map((review) => {
                      const employee = employees.find(e => e.id === review.employee_id);
                      return (
                        <TableRow key={review.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold">
                                {employee?.prenom?.[0]}{employee?.nom?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0F172A]">
                                  {employee?.prenom} {employee?.nom}
                                </p>
                                <p className="text-sm text-[#64748B]">{employee?.fonction}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#374151]">{review.review_period}</TableCell>
                          <TableCell className="text-[#374151]">
                            {review.review_date ? format(new Date(review.review_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-[#374151]">{review.reviewer_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className={`w-4 h-4 ${getRatingColor(review.overall_rating)}`} fill="currentColor" />
                              <span className={`font-semibold ${getRatingColor(review.overall_rating)}`}>
                                {review.overall_rating}/5
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                              {review.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingReview(review)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingReview(review);
                                  setFormData(review);
                                  setShowForm(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
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
          </Card>
        </motion.div>
      </div>
      
      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingReview ? 'Modifier l\'Évaluation' : 'Nouvelle Évaluation'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Employé *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({...formData, employee_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.prenom} {emp.nom} - {emp.fonction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Période *</Label>
                <Input
                  value={formData.review_period || ''}
                  onChange={(e) => setFormData({...formData, review_period: e.target.value})}
                  placeholder="Ex: 2025 Q1"
                  required
                />
              </div>
              
              <div>
                <Label>Date d'évaluation *</Label>
                <Input
                  type="date"
                  value={formData.review_date || ''}
                  onChange={(e) => setFormData({...formData, review_date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brouillon">Brouillon</SelectItem>
                    <SelectItem value="En attente signature">En attente signature</SelectItem>
                    <SelectItem value="Complété">Complété</SelectItem>
                    <SelectItem value="Archivé">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Rating Section */}
            <div className="border-t pt-4">
              <h3 className="font-bold text-[#0F172A] mb-4">Évaluations (1-5)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'overall_rating', label: 'Note Globale' },
                  { key: 'technical_skills', label: 'Compétences Techniques' },
                  { key: 'communication', label: 'Communication' },
                  { key: 'teamwork', label: 'Travail d\'équipe' },
                  { key: 'leadership', label: 'Leadership' },
                  { key: 'punctuality', label: 'Ponctualité' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label} *</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        step="0.5"
                        value={formData[key] || 3}
                        onChange={(e) => setFormData({...formData, [key]: parseFloat(e.target.value)})}
                        className="w-20"
                        required
                      />
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-5 h-5 cursor-pointer ${
                              star <= (formData[key] || 0) ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            fill={star <= (formData[key] || 0) ? 'currentColor' : 'none'}
                            onClick={() => setFormData({...formData, [key]: star})}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Comments Section */}
            <div className="space-y-4">
              <div>
                <Label>Points forts</Label>
                <Textarea
                  value={formData.strengths || ''}
                  onChange={(e) => setFormData({...formData, strengths: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Points à améliorer</Label>
                <Textarea
                  value={formData.weaknesses || ''}
                  onChange={(e) => setFormData({...formData, weaknesses: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Réalisations</Label>
                <Textarea
                  value={formData.achievements || ''}
                  onChange={(e) => setFormData({...formData, achievements: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Objectifs futurs</Label>
                <Textarea
                  value={formData.goals || ''}
                  onChange={(e) => setFormData({...formData, goals: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Commentaires généraux</Label>
                <Textarea
                  value={formData.comments || ''}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="border-t pt-4">
              <h3 className="font-bold text-[#0F172A] mb-4">Recommandations</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={formData.salary_increase_recommended || false}
                    onChange={(e) => setFormData({...formData, salary_increase_recommended: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Augmentation de salaire recommandée</Label>
                </div>
                
                {formData.salary_increase_recommended && (
                  <div>
                    <Label>Pourcentage d'augmentation (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.salary_increase_percentage || ''}
                      onChange={(e) => setFormData({...formData, salary_increase_percentage: parseFloat(e.target.value)})}
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={formData.promotion_recommended || false}
                    onChange={(e) => setFormData({...formData, promotion_recommended: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Promotion recommandée</Label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">
                {editingReview ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* View Dialog */}
      {viewingReview && (
        <Dialog open={!!viewingReview} onOpenChange={() => setViewingReview(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">Détails de l'Évaluation</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gradient-to-r from-[#F7F9FC] to-white p-4 rounded-lg">
                <h3 className="font-bold text-[#0F172A] mb-2">Employé</h3>
                <p className="text-[#374151]">
                  {employees.find(e => e.id === viewingReview.employee_id)?.prenom}{' '}
                  {employees.find(e => e.id === viewingReview.employee_id)?.nom}
                </p>
                <p className="text-sm text-[#64748B]">
                  {employees.find(e => e.id === viewingReview.employee_id)?.fonction}
                </p>
              </div>
              
              {/* Ratings */}
              <div>
                <h3 className="font-bold text-[#0F172A] mb-3">Évaluations</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'overall_rating', label: 'Note Globale' },
                    { key: 'technical_skills', label: 'Compétences Techniques' },
                    { key: 'communication', label: 'Communication' },
                    { key: 'teamwork', label: 'Travail d\'équipe' },
                    { key: 'leadership', label: 'Leadership' },
                    { key: 'punctuality', label: 'Ponctualité' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                      <span className="text-sm text-[#64748B]">{label}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                        <span className="font-bold text-[#0F172A]">{viewingReview[key]}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Comments */}
              {viewingReview.strengths && (
                <div>
                  <h3 className="font-bold text-[#0F172A] mb-2">Points forts</h3>
                  <p className="text-[#374151] bg-[#F7F9FC] p-4 rounded-lg">{viewingReview.strengths}</p>
                </div>
              )}
              
              {viewingReview.weaknesses && (
                <div>
                  <h3 className="font-bold text-[#0F172A] mb-2">Points à améliorer</h3>
                  <p className="text-[#374151] bg-[#F7F9FC] p-4 rounded-lg">{viewingReview.weaknesses}</p>
                </div>
              )}
              
              {viewingReview.achievements && (
                <div>
                  <h3 className="font-bold text-[#0F172A] mb-2">Réalisations</h3>
                  <p className="text-[#374151] bg-[#F7F9FC] p-4 rounded-lg">{viewingReview.achievements}</p>
                </div>
              )}
              
              {viewingReview.goals && (
                <div>
                  <h3 className="font-bold text-[#0F172A] mb-2">Objectifs futurs</h3>
                  <p className="text-[#374151] bg-[#F7F9FC] p-4 rounded-lg">{viewingReview.goals}</p>
                </div>
              )}
              
              {/* Recommendations */}
              {(viewingReview.salary_increase_recommended || viewingReview.promotion_recommended) && (
                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  <h3 className="font-bold text-[#0F172A] mb-2">Recommandations</h3>
                  {viewingReview.salary_increase_recommended && (
                    <p className="text-[#374151]">
                      ✅ Augmentation de salaire: {viewingReview.salary_increase_percentage}%
                    </p>
                  )}
                  {viewingReview.promotion_recommended && (
                    <p className="text-[#374151]">✅ Promotion recommandée</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}