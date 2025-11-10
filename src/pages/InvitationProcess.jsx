import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, UserPlus, CheckCircle, AlertTriangle, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function InvitationProcess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl('Parametres')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Processus d'Invitation Simplifié</h1>
            <p className="text-[#64748B] mt-1">Application en mode public - Inscription directe</p>
          </div>
        </div>

        {/* SUCCESS NOTICE */}
        <Card className="border-0 shadow-lg mb-6 bg-gradient-to-r from-[#ECFDF5] to-[#D1FAE5] border-l-4 border-[#10B981]">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <CheckCircle className="w-6 h-6 text-[#10B981] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-[#065F46] mb-2">✅ Mode Public Activé</h3>
                <p className="text-[#065F46] mb-3">
                  Votre application est maintenant en <strong>mode public</strong>. Les utilisateurs peuvent s'inscrire directement via le lien d'invitation - aucune intervention manuelle requise!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simple 4-Step Process */}
        <Card className="border-0 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] p-6 text-white rounded-t-xl">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Processus d'Invitation Simplifié
            </h2>
            <p className="text-indigo-100 mt-2">4 étapes faciles - Aucune configuration manuelle</p>
          </div>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">Aller dans Paramètres → Inviter</h3>
                  <p className="text-[#64748B] mb-3">
                    Connectez-vous à Paie360 et naviguez vers l'onglet <strong>Inviter</strong> dans les paramètres.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">Entrer l'Email et le Rôle</h3>
                  <p className="text-[#64748B] mb-3">
                    Saisissez l'adresse email de l'utilisateur et choisissez son rôle (Utilisateur ou Administrateur).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">Envoyer l'Invitation</h3>
                  <p className="text-[#64748B] mb-3">
                    Cliquez sur <strong>"Envoyer l'invitation"</strong>. Un email personnalisé avec votre branding sera envoyé automatiquement.
                  </p>
                  <div className="bg-[#F7F9FC] p-4 rounded-lg border border-[#E5E7EB]">
                    <p className="text-sm text-[#64748B]">
                      📧 L'email contient un bouton <strong>"Créer mon compte"</strong> qui redirige vers votre application
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">L'Utilisateur S'inscrit</h3>
                  <p className="text-[#64748B] mb-3">
                    L'utilisateur clique sur le bouton, crée son mot de passe et accède immédiatement à Paie360.
                  </p>
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">C'est terminé! L'utilisateur peut commencer à travailler.</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Preview */}
        <Card className="border-0 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-[#10B981] to-[#059669] p-6 text-white rounded-t-xl">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Aperçu de l'Email d'Invitation
            </h2>
            <p className="text-green-100 mt-2">Voici ce que l'utilisateur recevra</p>
          </div>
          <CardContent className="p-8">
            <div className="bg-white border-2 border-[#E5E7EB] rounded-lg p-6">
              <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white p-6 rounded-lg text-center mb-6">
                <h3 className="text-2xl font-bold">🎉 Bienvenue chez Paie360 !</h3>
              </div>
              
              <p className="text-[#0F172A] mb-4">Bonjour,</p>
              <p className="text-[#64748B] mb-4">
                Vous avez été invité(e) à rejoindre <strong>Votre Entreprise</strong> en tant qu'<strong>Utilisateur</strong>.
              </p>
              
              <div className="bg-[#F7F9FC] p-4 rounded-lg mb-6">
                <p className="text-[#64748B] text-sm font-semibold mb-2">Avec Paie360, vous pouvez:</p>
                <ul className="text-[#64748B] text-sm space-y-1 ml-4">
                  <li>✅ Gérer les employés et leurs dossiers</li>
                  <li>💰 Calculer automatiquement la paie</li>
                  <li>📄 Générer les déclarations CNSS</li>
                  <li>📊 Consulter les rapports</li>
                </ul>
              </div>
              
              <div className="text-center mb-6">
                <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white px-8 py-3">
                  🚀 Créer mon compte
                </Button>
              </div>
              
              <p className="text-[#94A3B8] text-xs text-center">© 2025 Paie360. Tous droits réservés.</p>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertTriangle className="w-6 h-6 text-[#D97706] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-[#92400E] mb-2">⚠️ Note de Sécurité</h3>
                <p className="text-[#92400E] mb-3">
                  En mode public, n'importe qui peut s'inscrire s'il a l'URL de votre application. 
                  Utilisez les <strong>permissions par utilisateur</strong> pour contrôler l'accès aux fonctionnalités sensibles.
                </p>
                <p className="text-[#92400E] text-sm">
                  <strong>Recommandation:</strong> Configurez les permissions dans Paramètres → Utilisateurs après l'inscription de chaque nouvel utilisateur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}