import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Edit, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const PERMISSIONS = {
  'Employés': [
    { key: 'employees_view', label: 'Voir les employés', icon: '👁️' },
    { key: 'employees_create', label: 'Créer des employés', icon: '➕' },
    { key: 'employees_edit', label: 'Modifier des employés', icon: '✏️' },
    { key: 'employees_delete', label: 'Supprimer des employés', icon: '🗑️' },
  ],
  'Paie': [
    { key: 'payroll_view', label: 'Voir la paie', icon: '👁️' },
    { key: 'payroll_create', label: 'Créer des cycles', icon: '➕' },
    { key: 'payroll_process', label: 'Traiter les paiements', icon: '💳' },
    { key: 'payroll_delete', label: 'Supprimer des cycles', icon: '🗑️' },
  ],
  'Déclarations': [
    { key: 'declarations_view', label: 'Voir les déclarations', icon: '👁️' },
    { key: 'declarations_create', label: 'Créer des déclarations', icon: '➕' },
    { key: 'declarations_pay', label: 'Payer les déclarations', icon: '💰' },
    { key: 'declarations_delete', label: 'Supprimer des déclarations', icon: '🗑️' },
  ],
  'Congés': [
    { key: 'holidays_view', label: 'Voir les congés', icon: '👁️' },
    { key: 'holidays_create', label: 'Créer des demandes', icon: '➕' },
    { key: 'holidays_approve', label: 'Approuver des congés', icon: '✅' },
    { key: 'holidays_delete', label: 'Supprimer des congés', icon: '🗑️' },
  ],
  'Visas & Immigration': [
    { key: 'visas_view', label: 'Voir les visas', icon: '👁️' },
    { key: 'visas_manage', label: 'Gérer les visas', icon: '✏️' },
  ],
  'Entreprise': [
    { key: 'company_view', label: 'Voir l\'entreprise', icon: '👁️' },
    { key: 'company_edit', label: 'Modifier l\'entreprise', icon: '✏️' },
  ],
  'Paramètres': [
    { key: 'settings_view', label: 'Voir les paramètres', icon: '👁️' },
    { key: 'settings_manage', label: 'Gérer les utilisateurs', icon: '👥' },
  ]
};

const ROLE_TEMPLATES = {
  manager: {
    label: 'Manager',
    permissions: {
      employees_view: true,
      employees_create: true,
      employees_edit: true,
      payroll_view: true,
      payroll_create: true,
      declarations_view: true,
      holidays_view: true,
      holidays_approve: true,
      visas_view: true,
      company_view: true,
      settings_view: true
    }
  },
  employee: {
    label: 'Employé',
    permissions: {
      employees_view: true,
      holidays_view: true,
      holidays_create: true,
      company_view: true
    }
  },
  accountant: {
    label: 'Comptable',
    permissions: {
      employees_view: true,
      payroll_view: true,
      payroll_create: true,
      payroll_process: true,
      declarations_view: true,
      declarations_create: true,
      declarations_pay: true,
      company_view: true
    }
  }
};

export default function UserManagement() {
  const [editingUser, setEditingUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });
  
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      setShowDialog(false);
      setEditingUser(null);
      toast.success('Utilisateur mis à jour');
    },
  });
  
  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      permissions: user.permissions || {}
    });
    setShowDialog(true);
  };
  
  const handlePermissionToggle = (permissionKey) => {
    setEditingUser({
      ...editingUser,
      permissions: {
        ...editingUser.permissions,
        [permissionKey]: !editingUser.permissions?.[permissionKey]
      }
    });
  };
  
  const handleApplyTemplate = (template) => {
    setEditingUser({
      ...editingUser,
      permissions: ROLE_TEMPLATES[template].permissions
    });
  };
  
  const handleSave = () => {
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        permissions: editingUser.permissions,
        is_active: editingUser.is_active
      }
    });
  };
  
  const toggleUserStatus = (user) => {
    updateUserMutation.mutate({
      id: user.id,
      data: {
        is_active: !user.is_active
      }
    });
  };
  
  const countPermissions = (permissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#111827]">Gestion des utilisateurs</h3>
              <p className="text-sm text-[#6B7280] mt-1">Gérer les permissions et accès des utilisateurs</p>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAFBFC]">
                  <TableHead className="font-semibold text-[#374151]">Utilisateur</TableHead>
                  <TableHead className="font-semibold text-[#374151]">Email</TableHead>
                  <TableHead className="font-semibold text-[#374151]">Rôle</TableHead>
                  <TableHead className="font-semibold text-[#374151]">Permissions</TableHead>
                  <TableHead className="font-semibold text-[#374151]">Statut</TableHead>
                  <TableHead className="font-semibold text-[#374151]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-semibold">
                          {user.full_name?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#111827]">{user.full_name || 'Sans nom'}</p>
                          <p className="text-xs text-[#6B7280]">{user.position || 'Aucune position'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#374151]">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={user.role === 'admin' ? 'bg-[#6366F1]' : ''}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-green-100 text-green-800">
                          Tous les accès
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {countPermissions(user.permissions)} permissions
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active !== false ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="w-3 h-3 mr-1" />
                          Inactif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                          className="border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Permissions
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUserStatus(user)}
                            className={user.is_active !== false ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}
                          >
                            {user.is_active !== false ? 'Désactiver' : 'Activer'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Permission Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#111827]">
              Gérer les permissions - {editingUser?.full_name || editingUser?.email}
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-6">
              {/* Quick Templates */}
              <div className="bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5 p-4 rounded-lg border border-[#6366F1]/20">
                <Label className="text-[#374151] font-semibold mb-3 block">Modèles rapides</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyTemplate(key)}
                      className="border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10"
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Account Status */}
              <div className="flex items-center justify-between p-4 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB]">
                <div>
                  <p className="font-semibold text-[#111827]">Compte actif</p>
                  <p className="text-sm text-[#6B7280]">Autoriser l'accès à l'application</p>
                </div>
                <Switch
                  checked={editingUser.is_active !== false}
                  onCheckedChange={(checked) => setEditingUser({...editingUser, is_active: checked})}
                />
              </div>
              
              {/* Permissions Grid */}
              <div className="space-y-6">
                {Object.entries(PERMISSIONS).map(([category, perms]) => (
                  <div key={category} className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 px-4 py-3 border-b border-[#E5E7EB]">
                      <h4 className="font-semibold text-[#111827]">{category}</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {perms.map((perm) => (
                        <div key={perm.key} className="flex items-center justify-between p-3 hover:bg-[#FAFBFC] rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{perm.icon}</span>
                            <span className="text-[#374151]">{perm.label}</span>
                          </div>
                          <Switch
                            checked={editingUser.permissions?.[perm.key] === true}
                            onCheckedChange={() => handlePermissionToggle(perm.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingUser(null);
                  }}
                  className="border-[#D1D5DB]"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
                  disabled={updateUserMutation.isLoading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {updateUserMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}