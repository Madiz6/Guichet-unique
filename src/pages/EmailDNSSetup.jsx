import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function EmailDNSSetup() {
  const [copiedRecord, setCopiedRecord] = useState(null);
  
  const copyToClipboard = (text, recordName) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordName);
    toast.success('Copié dans le presse-papier');
    setTimeout(() => setCopiedRecord(null), 2000);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link to={createPageUrl('Parametres')}>
            <Button variant="outline" size="icon" className="border-[#D3DCE6]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Configuration DNS pour Email</h1>
            <p className="text-[#64748B] mt-1">Configurer paie360.com pour envoyer des emails professionnels</p>
          </div>
        </motion.div>
        
        {/* Step 1: Get SendGrid API Key */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Étape 1: Obtenir votre clé API SendGrid</h3>
                  <p className="text-sm text-[#64748B] mt-1">Créer un compte et obtenir votre API key</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-[#DBEAFE] border-l-4 border-[#3B82F6] p-4 rounded">
                  <p className="text-sm text-[#1E40AF]">
                    <strong>🔑 Créer votre clé API SendGrid</strong>
                  </p>
                </div>
                
                <ol className="space-y-3 text-[#0F172A]">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-semibold">Créez un compte SendGrid (gratuit)</p>
                      <a href="https://signup.sendgrid.com/" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline flex items-center gap-1 text-sm mt-1">
                        S'inscrire sur SendGrid <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-semibold">Allez dans API Keys</p>
                      <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline flex items-center gap-1 text-sm mt-1">
                        Ouvrir SendGrid API Keys <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-semibold">Cliquez sur "Create API Key"</p>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-[#64748B]">• Donnez un nom (ex: "Paie360 App")</p>
                        <p className="text-sm text-[#64748B]">• Sélectionnez <strong>"Full Access"</strong></p>
                        <p className="text-sm text-[#64748B]">• Cliquez "Create & View"</p>
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <div>
                      <p className="font-semibold mb-2">Copiez la clé API</p>
                      <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-3 rounded">
                        <p className="text-sm text-[#92400E]">
                          <strong>⚠️ Important:</strong> Vous ne verrez cette clé qu'une seule fois! Copiez-la maintenant.
                        </p>
                      </div>
                      <div className="mt-3 bg-[#F7F9FC] p-3 rounded border border-[#E5E7EB]">
                        <p className="text-xs text-[#64748B] mb-1">La clé ressemble à:</p>
                        <code className="text-xs font-mono">SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                    <div>
                      <p className="font-semibold">Collez la clé dans Paie360</p>
                      <p className="text-sm text-[#64748B] mt-1">Allez dans <strong>Paramètres → Configuration</strong> et collez votre clé API SendGrid</p>
                    </div>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Step 2: Verify Domain in SendGrid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#10B981]/5 to-[#059669]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Étape 2: Vérifier votre domaine paie360.com</h3>
                  <p className="text-sm text-[#64748B] mt-1">Authentifier votre domaine pour envoyer des emails</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <ol className="space-y-3 text-[#0F172A]">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#10B981] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-semibold">Allez dans Domain Authentication</p>
                    <a href="https://app.sendgrid.com/settings/sender_auth/domain/create" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline flex items-center gap-1 text-sm mt-1">
                      Ouvrir SendGrid Domain Authentication <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#10B981] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-semibold">Cliquez sur "Authenticate Your Domain"</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#10B981] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-semibold">Configuration</p>
                    <div className="mt-2 space-y-1 text-sm text-[#64748B]">
                      <p>• DNS Host: Sélectionnez "Other Host (Not Listed)"</p>
                      <p>• Entrez votre domaine: <strong>paie360.com</strong></p>
                      <p>• Décochez "Would you also like to brand..." (optionnel)</p>
                    </div>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#10B981] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <p className="font-semibold">SendGrid vous donnera 3 enregistrements CNAME</p>
                    <p className="text-sm text-[#64748B] mt-1">Gardez cette page ouverte, vous en aurez besoin pour l'étape suivante</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Step 3: Add DNS Records via Cloudflare */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#F59E0B]/5 to-[#D97706]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Étape 3: Configurer DNS avec Cloudflare</h3>
                  <p className="text-sm text-[#64748B] mt-1">Solution gratuite et simple</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="bg-[#D1FAE5] border-l-4 border-[#10B981] p-4 rounded mb-4">
                <p className="text-sm text-[#065F46]">
                  <strong>⭐ Recommandé:</strong> Cloudflare est gratuit et plus facile que base44 pour gérer les DNS
                </p>
              </div>
              
              <ol className="space-y-3 text-[#0F172A]">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-semibold">Créez un compte Cloudflare (gratuit)</p>
                    <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" className="text-[#F59E0B] hover:underline flex items-center gap-1 text-sm mt-1">
                      S'inscrire sur Cloudflare <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-semibold">Ajoutez paie360.com à Cloudflare</p>
                    <p className="text-sm text-[#64748B] mt-1">Cloudflare scannera vos DNS existants automatiquement</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-semibold">Copiez les 2 nameservers de Cloudflare</p>
                    <div className="bg-[#F7F9FC] p-3 rounded border border-[#E5E7EB] mt-2">
                      <p className="text-xs text-[#64748B] mb-2">Exemple:</p>
                      <code className="block text-xs font-mono text-[#0F172A]">bob.ns.cloudflare.com</code>
                      <code className="block text-xs font-mono text-[#0F172A] mt-1">lisa.ns.cloudflare.com</code>
                    </div>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <p className="font-semibold">Changez les nameservers dans base44</p>
                    <div className="mt-2 space-y-1 text-sm text-[#64748B]">
                      <p>• Allez sur base44 dashboard</p>
                      <p>• Trouvez paie360.com</p>
                      <p>• Cherchez "Nameservers" ou "DNS Settings"</p>
                      <p>• Remplacez par les nameservers Cloudflare</p>
                    </div>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <div>
                    <p className="font-semibold">Ajoutez les 3 records CNAME de SendGrid dans Cloudflare</p>
                    <p className="text-sm text-[#64748B] mt-1">Dans Cloudflare: DNS → Records → Add record</p>
                    
                    <div className="mt-3 bg-[#F7F9FC] p-4 rounded border border-[#E5E7EB]">
                      <p className="text-xs font-semibold text-[#64748B] mb-2">Pour chaque record SendGrid:</p>
                      <div className="space-y-2 text-xs text-[#64748B]">
                        <p>• Type: <strong>CNAME</strong></p>
                        <p>• Name: <strong>Copier depuis SendGrid</strong></p>
                        <p>• Target: <strong>Copier depuis SendGrid</strong></p>
                        <p>• TTL: <strong>Auto</strong></p>
                        <p>• Proxy status: <strong>DNS only (gris, pas orange)</strong></p>
                      </div>
                    </div>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <div>
                    <p className="font-semibold">Attendez 15-30 minutes</p>
                    <p className="text-sm text-[#64748B] mt-1">Le temps que les DNS se propagent</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-xs font-bold">7</span>
                  <div>
                    <p className="font-semibold">Vérifiez dans SendGrid</p>
                    <p className="text-sm text-[#64748B] mt-1">Cliquez sur "Verify" - tous les records doivent être ✅</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Step 4: Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#8B5CF6]/5 to-[#7C3AED]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Étape 4: Tester l'envoi d'email</h3>
                  <p className="text-sm text-[#64748B] mt-1">Vérifier que tout fonctionne</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-[#0F172A]">Une fois les DNS vérifiés, testez l'envoi:</p>
                
                <Link to={createPageUrl('EmailTest')}>
                  <Button className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:shadow-lg transition-all">
                    Tester l'envoi d'email
                  </Button>
                </Link>
                
                <div className="bg-[#D1FAE5] border-l-4 border-[#10B981] p-4 rounded mt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-[#065F46] font-semibold">✅ Une fois configuré</p>
                      <p className="text-sm text-[#065F46] mt-1">
                        Vous pourrez envoyer des emails depuis <strong>contact@paie360.com</strong> ou <strong>noreply@paie360.com</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap gap-4 justify-center"
        >
          <Button asChild variant="outline" className="border-[#6366F1] text-[#6366F1]">
            <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              SendGrid API Keys
            </a>
          </Button>
          
          <Button asChild variant="outline" className="border-[#10B981] text-[#10B981]">
            <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              SendGrid Domain Auth
            </a>
          </Button>
          
          <Button asChild variant="outline" className="border-[#F59E0B] text-[#F59E0B]">
            <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Cloudflare Dashboard
            </a>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}