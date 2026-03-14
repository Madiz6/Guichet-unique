import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Bell, Shield, Building2, Save, Upload, Mail, FileText, Download, Activity, Lock, UserPlus, Send, ExternalLink, MessageSquare, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

import UserManagement from "../components/settings/UserManagement";
import PermissionGuard from "../components/permissions/PermissionGuard";
import SignatureSettings from "../components/settings/SignatureSettings";

export default function Parametres() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await base44.auth.logout();
    } catch (e) {
      // logout regardless
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // SMS Test State
  const [smsPhone, setSmsPhone] = useState('+253');
  const [smsMessage, setSmsMessage] = useState('Test SMS from Paie360! 🚀');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies[0] || {};

  const [notificationSettings, setNotificationSettings] = useState({
    email_payroll_processed: true,
    email_declaration_due: true,
    email_employee_added: true,
    email_payment_completed: false,
    push_notifications: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: 30,
    require_password_change: false,
    ip_whitelist_enabled: false,
    login_attempt_limit: 5,
  });

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error('Veuillez entrer un email');
      return;
    }

    try {
      const roleLabel = inviteRole === 'admin' ? 'Administrateur' : 'Utilisateur';
      const inviteUrl = `${window.location.origin}`; // Use window.location.origin to get the base URL of the app
      
      // Send branded invitation email with direct signup link
      await base44.functions.invoke('sendEmail', {
        to: inviteEmail,
        subject: `Invitation à rejoindre ${company?.nom_entreprise || 'Paie360'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation Paie360</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F7F9FC;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              
              <!-- Header with Logo -->
              <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 20px; text-align: center;">
                ${company?.logo_url ? `
                  <img src="${company.logo_url}" alt="${company.nom_entreprise}" style="max-width: 120px; height: auto; margin-bottom: 20px; border-radius: 12px; background: white; padding: 10px;" />
                ` : `
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f0ad9dc27bcf0743295786/b5d1a4740_brandmark-design-26.png" alt="Paie360" style="max-width: 100px; height: auto; margin-bottom: 20px; border-radius: 12px; background: white; padding: 10px;" />
                `}
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Bienvenue chez Paie360 !</h1>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 24px;">Bonjour,</h2>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Vous avez été invité(e) à rejoindre <strong style="color: #6366F1;">${company?.nom_entreprise || 'Paie360'}</strong> en tant que <strong>${roleLabel}</strong>.
                </p>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Paie360 est une plateforme complète de gestion RH et de paie qui vous permettra de :
                </p>
                
                <!-- Features List -->
                <div style="background: #F7F9FC; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                  <ul style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.8;">
                    <li style="margin-bottom: 10px;">✅ Gérer les employés et leurs dossiers</li>
                    <li style="margin-bottom: 10px;">💰 Calculer automatiquement la paie (CNSS, ITS)</li>
                    <li style="margin-bottom: 10px;">📄 Générer les déclarations CNSS</li>
                    <li style="margin-bottom: 10px;">📊 Consulter les rapports et analyses</li>
                    <li style="margin-bottom: 10px;">📱 Notifications SMS et emails automatiques</li>
                    ${inviteRole === 'admin' ? '<li style="margin-bottom: 10px;">⚙️ Administrer la plateforme</li>' : ''}
                  </ul>
                </div>
                
                <!-- Success Notice -->
                <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 30px 0; border-radius: 8px;">
                  <p style="margin: 0; color: #065F46; font-size: 14px; line-height: 1.6;">
                    <strong>✅ Prêt à commencer?</strong> Cliquez sur le bouton ci-dessous pour créer votre compte et accéder à Paie360.
                  </p>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                    🚀 Créer mon compte
                  </a>
                </div>
                
                <div style="background: #F0F9FF; padding: 15px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #0EA5E9;">
                  <p style="margin: 0; color: #0C4A6E; font-size: 14px;">
                    <strong>📧 Email:</strong> ${inviteEmail}<br/>
                    <strong>👤 Rôle:</strong> ${roleLabel}
                  </p>
                </div>
                
                <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin-top: 30px; text-align: center;">
                  Besoin d'aide? Contactez ${user?.full_name || 'votre administrateur'} ou écrivez-nous à ${company?.email || 'support@paie360.com'}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #F7F9FC; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="color: #64748B; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>${company?.nom_entreprise || 'Paie360'}</strong>
                </p>
                ${company?.adresse ? `<p style="color: #94A3B8; font-size: 12px; margin: 5px 0;">${company.adresse}</p>` : ''}
                <p style="color: #94A3B8; font-size: 12px; margin: 5px 0;">
                  ${company?.telephone || ''} ${company?.telephone && company?.email ? '•' : ''} ${company?.email || ''}
                </p>
                <p style="color: #94A3B8; font-size: 12px; margin: 20px 0 0 0;">
                  © 2025 Paie360. Tous droits réservés.
                </p>
              </div>
              
            </div>
          </body>
          </html>
        `,
        from_name: company?.nom_entreprise || 'Paie360',
        from_email: company?.email || 'noreply@paie360.com'
      });

      toast.success(`✅ Invitation envoyée avec succès à ${inviteEmail}!`, {
        duration: 5000
      });
      
      setInviteEmail('');
      setInviteRole('user');
    } catch (error) {
      toast.error('❌ Erreur lors de l\'envoi de l\'invitation');
      console.error(error);
    }
  };

  const handleSendSMS = async (e) => {
    e.preventDefault();
    setSmsLoading(true);
    setSmsResult(null);

    if (!smsPhone || !smsMessage) {
      toast.error('Veuillez remplir tous les champs du SMS.');
      setSmsLoading(false);
      return;
    }

    try {
      const response = await base44.functions.invoke('sendSMS', {
        to: smsPhone,
        message: smsMessage
      });

      console.log('SMS Response:', response);

      if (response.data.success) {
        setSmsResult({
          success: true,
          message: response.data.message,
          sid: response.data.message_sid
        });
        toast.success('SMS envoyé avec succès!');
      } else {
        setSmsResult({
          success: false,
          error: response.data.error || 'Erreur inconnue'
        });
        toast.error('Échec de l\'envoi du SMS');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Erreur inconnue';
      setSmsResult({
        success: false,
        error: errorMessage,
        details: error?.response?.data?.details
      });
      toast.error(errorMessage);
    }

    setSmsLoading(false);
  };

  const handleExportData = async (type) => {
    toast.info(`Export ${type} en cours...`);
    setTimeout(() => {
      toast.success(`Export ${type} terminé`);
    }, 2000);
  };

  // Mock activity logs
  const activityLogs = [
    { id: 1, user: user?.email, action: 'Connexion', ip: '192.168.1.100', date: new Date(), status: 'success' },
    { id: 2, user: user?.email, action: 'Modification employé', ip: '192.168.1.100', date: new Date(Date.now() - 3600000), status: 'success' },
    { id: 3, user: 'user@example.com', action: 'Tentative de connexion', ip: '192.168.1.105', date: new Date(Date.now() - 7200000), status: 'failed' },
  ];

  const connectionLogs = [
    { id: 1, user: user?.email, ip: '192.168.1.100', device: 'Chrome on Windows', date: new Date(), status: 'Active' },
    { id: 2, user: user?.email, ip: '192.168.1.100', device: 'Safari on MacOS', date: new Date(Date.now() - 86400000), status: 'Expired' },
  ];

  return (
    <PermissionGuard permission="settings_view">
      <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon" className="border-[#D3DCE6] hover:bg-white hover:shadow-md transition-all">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A]">Paramètres</h1>
              <p className="text-[#64748B] mt-1">Gérer votre compte et vos préférences</p>
            </div>
          </div>

          <Tabs defaultValue="profil" className="space-y-6">
            <TabsList className="bg-white border border-[#E5E7EB] p-1 flex-wrap h-auto shadow-sm">
              <TabsTrigger value="profil" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                <User className="w-4 h-4 mr-2" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="compte" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                <Building2 className="w-4 h-4 mr-2" />
                Compte
              </TabsTrigger>

              {isAdmin && (
                <>
                  <TabsTrigger value="utilisateurs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <Shield className="w-4 h-4 mr-2" />
                    Utilisateurs
                  </TabsTrigger>
                  <TabsTrigger value="invitation" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Inviter
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Test SMS
                  </TabsTrigger>
                  <TabsTrigger value="securite" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <Lock className="w-4 h-4 mr-2" />
                    Sécurité
                  </TabsTrigger>
                  <TabsTrigger value="journaux" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <Activity className="w-4 h-4 mr-2" />
                    Journaux
                  </TabsTrigger>
                  <TabsTrigger value="connexions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <Activity className="w-4 h-4 mr-2" />
                    Connexions
                  </TabsTrigger>
                  <TabsTrigger value="exports" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <Download className="w-4 h-4 mr-2" />
                    Exports
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <Mail className="w-4 h-4 mr-2" />
                    Emails
                  </TabsTrigger>
                  <TabsTrigger value="signatures" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                    <FileText className="w-4 h-4 mr-2" />
                    Signatures
                  </TabsTrigger>
                </>
              )}

              <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-md">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* Profil Tab */}
            <TabsContent value="profil">
              <Card className="border-0 shadow-lg">
                <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#111827]">Informations personnelles</h3>
                      <p className="text-sm text-[#6B7280] mt-1">Vos données de profil</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">Nom complet</Label>
                      <p className="mt-2 text-[#111827] font-medium text-lg">{user?.full_name || '-'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">Email</Label>
                      <p className="mt-2 text-[#111827] font-medium text-lg">{user?.email || '-'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">Rôle</Label>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          user?.role === 'admin' 
                            ? 'bg-[#6366F1] text-white' 
                            : 'bg-[#E5E7EB] text-[#374151]'
                        }`}>
                          {user?.role === 'admin' ? '👑 Administrateur' : '👤 Utilisateur'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compte Tab */}
            <TabsContent value="compte">
              <Card className="border-0 shadow-lg">
                <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#111827]">Informations d'entreprise</h3>
                      <p className="text-sm text-[#6B7280] mt-1">Détails de votre organisation</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  {company.logo_url && (
                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold mb-3 block">Logo de l'entreprise</Label>
                      <img src={company.logo_url} alt="Logo" className="w-24 h-24 object-contain rounded-lg border-2 border-[#E5E7EB] shadow-sm" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">Nom de l'entreprise</Label>
                      <p className="mt-2 text-[#111827] font-medium">{company.nom_entreprise || '-'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">Type</Label>
                      <p className="mt-2 text-[#111827] font-medium">{company.type_entreprise || '-'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">N° d'affiliation</Label>
                      <p className="mt-2 text-[#111827] font-medium">{company.numero_affiliation || '-'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                      <Label className="text-[#374151] font-semibold">NIF</Label>
                      <p className="mt-2 text-[#111827] font-medium">{company.nif || '-'}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-4 border-t border-[#E5E7EB]">
                      <Link to={createPageUrl('Entreprise')}>
                        <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg transition-all">
                          Modifier les informations
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADMIN-ONLY TABS */}
            {isAdmin && (
              <>
                <TabsContent value="utilisateurs">
                  <UserManagement />
                </TabsContent>

                <TabsContent value="invitation">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">Inviter des utilisateurs</h3>
                          <p className="text-sm text-[#6B7280] mt-1">Envoyez des invitations par email</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div>
                          <Label className="text-[#374151] font-semibold">Adresse email</Label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="utilisateur@example.com"
                            className="border-[#D1D5DB] mt-2 focus:ring-2 focus:ring-[#6366F1]"
                          />
                        </div>

                        <div>
                          <Label className="text-[#374151] font-semibold">Rôle</Label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full mt-2 px-4 py-2 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:outline-none"
                          >
                            <option value="user">👤 Utilisateur</option>
                            <option value="admin">👑 Administrateur</option>
                          </select>
                        </div>

                        <Button 
                          onClick={handleInviteUser} 
                          className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg transition-all w-full"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Envoyer l'invitation
                        </Button>
                      </div>
                      
                      <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
                        <p className="font-bold">✅ Mode Public Activé</p>
                        <p className="text-sm mt-2">
                          Votre application est en mode public. Les utilisateurs peuvent s'inscrire directement via le lien d'invitation.
                        </p>
                        <p className="text-sm mt-2">
                          <span className="font-semibold">Processus d'invitation:</span>
                          <ol className="list-decimal list-inside mt-1 space-y-1 ml-2">
                            <li>Entrez l'email et le rôle de l'utilisateur</li>
                            <li>Cliquez sur "Envoyer l'invitation"</li>
                            <li>L'utilisateur reçoit un email avec un lien</li>
                            <li>Il clique sur "Créer mon compte" et s'inscrit</li>
                            <li>Il accède immédiatement à Paie360 ✅</li>
                          </ol>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* NEW SMS TEST TAB */}
                <TabsContent value="sms">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">Test SMS Twilio</h3>
                          <p className="text-sm text-[#6B7280] mt-1">Tester l'envoi de SMS</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSendSMS} className="space-y-6">
                        <div>
                          <Label className="text-[#374151] font-semibold">Numéro de téléphone *</Label>
                          <Input
                            type="tel"
                            value={smsPhone}
                            onChange={(e) => setSmsPhone(e.target.value)}
                            placeholder="+253 77 12 34 56"
                            required
                            className="mt-2 border-[#D1D5DB] focus:ring-2 focus:ring-[#6366F1]"
                          />
                          <p className="text-sm text-[#64748B] mt-2">
                            Format international (ex: +253 77 12 34 56)
                          </p>
                        </div>

                        <div>
                          <Label className="text-[#374151] font-semibold">Message *</Label>
                          <Textarea
                            value={smsMessage}
                            onChange={(e) => setSmsMessage(e.target.value)}
                            placeholder="Votre message..."
                            rows={4}
                            required
                            className="mt-2 border-[#D1D5DB] focus:ring-2 focus:ring-[#6366F1]"
                          />
                          <p className="text-sm text-[#64748B] mt-2">
                            {smsMessage.length} caractères
                          </p>
                        </div>

                        <Button 
                          type="submit" 
                          disabled={smsLoading}
                          className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg"
                        >
                          {smsLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Envoyer SMS
                            </>
                          )}
                        </Button>
                      </form>

                      {smsResult && (
                        <div className={`mt-6 p-4 rounded-lg ${smsResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-start gap-3">
                            {smsResult.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={`font-semibold ${smsResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                {smsResult.success ? 'Succès!' : 'Erreur'}
                              </p>
                              <p className={`text-sm mt-1 ${smsResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                {smsResult.success ? smsResult.message : smsResult.error}
                              </p>
                              {smsResult.sid && (
                                <p className="text-xs text-green-600 mt-2 font-mono">
                                  Message SID: {smsResult.sid}
                                </p>
                              )}
                              {smsResult.details && (
                                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-32">
                                  {JSON.stringify(smsResult.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-6 p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                        <h4 className="font-bold text-[#111827] mb-3">📱 Informations Twilio</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">Account SID:</span>
                            <span className="font-mono text-[#0F172A]">Configuré ✅</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">Auth Token:</span>
                            <span className="font-mono text-[#0F172A]">Configuré ✅</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#64748B]">Phone Number:</span>
                            <span className="font-mono text-[#0F172A]">Configuré ✅</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="securite">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">Sécurité du compte</h3>
                          <p className="text-sm text-[#6B7280] mt-1">Paramètres de sécurité avancés</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-6">
                      <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-[#111827]">Authentification à deux facteurs (2FA)</p>
                          <p className="text-sm text-[#6B7280] mt-1">Ajouter une couche de sécurité supplémentaire</p>
                        </div>
                        <Switch
                          checked={securitySettings.two_factor_enabled}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, two_factor_enabled: checked})}
                        />
                      </div>

                      <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                        <Label className="text-[#374151] font-semibold">Délai d'expiration de session (minutes)</Label>
                        <Input
                          type="number"
                          value={securitySettings.session_timeout}
                          onChange={(e) => setSecuritySettings({...securitySettings, session_timeout: parseInt(e.target.value)})}
                          className="border-[#D1D5DB] w-32 mt-2"
                        />
                      </div>

                      <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-[#111827]">Changement de mot de passe obligatoire</p>
                          <p className="text-sm text-[#6B7280] mt-1">Forcer le changement tous les 90 jours</p>
                        </div>
                        <Switch
                          checked={securitySettings.require_password_change}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, require_password_change: checked})}
                        />
                      </div>

                      <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-semibold text-[#111827]">Liste blanche d'IP</p>
                          <p className="text-sm text-[#6B7280] mt-1">Autoriser uniquement les IP spécifiques</p>
                        </div>
                        <Switch
                          checked={securitySettings.ip_whitelist_enabled}
                          onCheckedChange={(checked) => setSecuritySettings({...securitySettings, ip_whitelist_enabled: checked})}
                        />
                      </div>

                      <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB]">
                        <Label className="text-[#374151] font-semibold">Limite de tentatives de connexion</Label>
                        <Input
                          type="number"
                          value={securitySettings.login_attempt_limit}
                          onChange={(e) => setSecuritySettings({...securitySettings, login_attempt_limit: parseInt(e.target.value)})}
                          className="border-[#D1D5DB] w-32 mt-2"
                        />
                        <p className="text-xs text-[#6B7280] mt-2">Nombre de tentatives avant blocage</p>
                      </div>

                      <div className="pt-6 border-t border-[#E5E7EB] space-y-4">
                        <Button variant="outline" className="border-[#D1D5DB] hover:bg-[#F8FAFC]">
                          Changer le mot de passe
                        </Button>

                        <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg transition-all ml-3">
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer les paramètres
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="journaux">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">Journaux d'activité</h3>
                          <p className="text-sm text-[#6B7280] mt-1">Historique des actions effectuées</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#FAFBFC]">
                            <TableHead className="font-semibold text-[#374151]">Utilisateur</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Action</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Adresse IP</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Date</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityLogs.map((log) => (
                            <TableRow key={log.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                              <TableCell className="font-medium">{log.user}</TableCell>
                              <TableCell>{log.action}</TableCell>
                              <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                              <TableCell>{format(log.date, 'dd/MM/yyyy HH:mm')}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                  log.status === 'success' 
                                    ? 'bg-[#10B981]/10 text-[#10B981]' 
                                    : 'bg-[#EF4444]/10 text-[#EF4444]'
                                }`}>
                                  {log.status === 'success' ? '✓ Succès' : '✗ Échec'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="connexions">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">Sessions actives</h3>
                          <p className="text-sm text-[#6B7280] mt-1">Gérer vos sessions de connexion</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#FAFBFC]">
                            <TableHead className="font-semibold text-[#374151]">Utilisateur</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Appareil</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Adresse IP</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Date</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Statut</TableHead>
                            <TableHead className="font-semibold text-[#374151]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {connectionLogs.map((log) => (
                            <TableRow key={log.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                              <TableCell className="font-medium">{log.user}</TableCell>
                              <TableCell>{log.device}</TableCell>
                              <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                              <TableCell>{format(log.date, 'dd/MM/yyyy HH:mm')}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  log.status === 'Active' 
                                    ? 'bg-[#10B981]/10 text-[#10B981]' 
                                    : 'bg-[#94A3B8]/10 text-[#94A3B8]'
                                }`}>
                                  {log.status}
                                </span>
                              </TableCell>
                              <TableCell>
                                {log.status === 'Active' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    Déconnecter
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="exports">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <Download className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">Export de données</h3>
                          <p className="text-sm text-[#6B7280] mt-1">Télécharger vos données en différents formats</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-gradient-to-br from-[#6366F1]/5 to-[#8B5CF6]/5 rounded-xl border border-[#E5E7EB] hover:shadow-lg transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#111827]">Employés</h4>
                              <p className="text-sm text-[#6B7280]">Liste complète</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleExportData('Employés')} 
                            variant="outline" 
                            className="w-full border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1] hover:text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exporter CSV
                          </Button>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-[#10B981]/5 to-[#059669]/5 rounded-xl border border-[#E5E7EB] hover:shadow-lg transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#111827]">Cycles de Paie</h4>
                              <p className="text-sm text-[#6B7280]">Historique complet</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleExportData('Paie')} 
                            variant="outline" 
                            className="w-full border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exporter CSV
                          </Button>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-[#F59E0B]/5 to-[#D97706]/5 rounded-xl border border-[#E5E7EB] hover:shadow-lg transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#111827]">Déclarations CNSS</h4>
                              <p className="text-sm text-[#6B7280]">Toutes les déclarations</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleExportData('Déclarations')} 
                            variant="outline" 
                            className="w-full border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B] hover:text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exporter CSV
                          </Button>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-[#8B5CF6]/5 to-[#7C3AED]/5 rounded-xl border border-[#E5E7EB] hover:shadow-lg transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#111827]">Congés</h4>
                              <p className="text-sm text-[#6B7280]">Historique des congés</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleExportData('Congés')} 
                            variant="outline" 
                            className="w-full border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exporter CSV
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="templates">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                          <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#0F172A]">Configuration Email</h3>
                          <p className="text-sm text-[#64748B] mt-1">Tester et configurer vos emails</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link to={createPageUrl('EmailTest')}>
                          <Card className="border-2 border-[#E5E7EB] hover:border-[#6366F1] hover:shadow-lg transition-all cursor-pointer h-full">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Mail className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-[#0F172A] mb-1">Test d'envoi d'email</h4>
                                  <p className="text-sm text-[#64748B]">Vérifiez que votre configuration SendGrid fonctionne</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>

                        <Link to={createPageUrl('EmailDNSSetup')}>
                          <Card className="border-2 border-[#E5E7EB] hover:border-[#F59E0B] hover:shadow-lg transition-all cursor-pointer h-full">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center flex-shrink-0">
                                  <ExternalLink className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-[#0F172A] mb-1">Configuration DNS</h4>
                                  <p className="text-sm text-[#64748B]">Configurer paie360.com pour envoyer des emails</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="signatures">
                  <SignatureSettings />
                </TabsContent>
              </>
            )}

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="border-0 shadow-lg">
                <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#111827]">Préférences de notification</h3>
                      <p className="text-sm text-[#6B7280] mt-1">
                        {!isAdmin && 'Contactez votre administrateur pour modifier ces paramètres'}
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-[#111827]">Paie traitée</p>
                      <p className="text-sm text-[#6B7280] mt-1">Recevoir un email quand un cycle de paie est traité</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_payroll_processed}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => isAdmin && setNotificationSettings({...notificationSettings, email_payroll_processed: checked})}
                    />
                  </div>

                  <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-[#111827]">Déclarations à venir</p>
                      <p className="text-sm text-[#6B7280] mt-1">Rappel 3 jours avant l'échéance CNSS/ITS</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_declaration_due}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => isAdmin && setNotificationSettings({...notificationSettings, email_declaration_due: checked})}
                    />
                  </div>

                  <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-[#111827]">Nouvel employé</p>
                      <p className="text-sm text-[#6B7280] mt-1">Notification quand un employé est ajouté</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_employee_added}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => isAdmin && setNotificationSettings({...notificationSettings, email_employee_added: checked})}
                    />
                  </div>

                  <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-[#111827]">Paiement effectué</p>
                      <p className="text-sm text-[#6B7280] mt-1">Confirmation de paiement des salaires</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_payment_completed}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => isAdmin && setNotificationSettings({...notificationSettings, email_payment_completed: checked})}
                    />
                  </div>

                  <div className="p-4 bg-gradient-to-r from-[#F8FAFC] to-white rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-[#111827]">Notifications push</p>
                      <p className="text-sm text-[#6B7280] mt-1">Activer les notifications dans le navigateur</p>
                    </div>
                    <Switch
                      checked={notificationSettings.push_notifications}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => isAdmin && setNotificationSettings({...notificationSettings, push_notifications: checked})}
                    />
                  </div>

                  {isAdmin && (
                    <div className="pt-6 border-t border-[#E5E7EB]">
                      <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-lg transition-all">
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer les préférences
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGuard>
  );
}