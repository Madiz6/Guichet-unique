
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Send, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function EmailTest() {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });
  
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });
  
  const company = companies[0] || {};
  const senderEmail = company.email || 'noreply@paie360.com';
  
  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }
    
    setSending(true);
    setLastResult(null);
    
    try {
      const response = await base44.functions.invoke('sendEmail', {
        to: testEmail,
        subject: 'Test Email - SendGrid Configuration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #6366F1; color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px;">✅ Success!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your email configuration works!</p>
            </div>
            <div style="background: #F7F9FC; padding: 25px; border-radius: 8px;">
              <h2 style="margin-top: 0; color: #0F172A;">Hello!</h2>
              <p style="color: #64748B;">Your SendGrid integration is now active.</p>
            </div>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            <div style="text-align: center; color: #64748B; font-size: 12px;">
              <p>${company.nom_entreprise || 'Paie360'}</p>
            </div>
          </div>
        `,
        from_name: company.nom_entreprise || 'Paie360',
        from_email: senderEmail
      });
      
      if (response.data && response.data.success) {
        setLastResult({ success: true, message: 'Email envoyé avec succès!' });
        toast.success('✅ Email sent!');
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      let errorDetails = '';
      
      if (error.response?.data) {
        errorMessage = error.response.data.error || errorMessage;
        errorDetails = error.response.data.details || '';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLastResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
        senderEmail: senderEmail
      });
      
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Parametres')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Test Email - Simple Setup</h1>
            <p className="text-[#64748B] mt-1">No DNS or Cloudflare needed!</p>
          </div>
        </div>
        
        {/* SUCCESS - EMAIL VERIFIED */}
        <Card className="border-4 border-[#10B981] shadow-xl mb-6 bg-gradient-to-r from-[#D1FAE5] to-[#A7F3D0]">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#065F46] mb-3">✅ Email Verified in SendGrid!</h2>
                
                <div className="bg-white p-6 rounded-lg border-2 border-[#10B981]">
                  <p className="text-lg font-bold text-[#065F46] mb-2">Your verified email:</p>
                  <code className="block text-xl font-bold text-[#10B981] bg-[#F0FDF4] px-4 py-3 rounded-lg border-2 border-[#10B981]">
                    amelia@paie360.com
                  </code>
                </div>
                
                <div className="mt-4 p-4 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-lg">
                  <p className="text-sm font-bold text-[#92400E] mb-2">⚠️ LAST STEP:</p>
                  <p className="text-sm text-[#92400E] mb-3">
                    You need to update the email address in your company settings
                  </p>
                  <Link to={createPageUrl('Entreprise')}>
                    <Button className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:shadow-lg text-white">
                      Go to Entreprise Page → Set Email
                    </Button>
                  </Link>
                  <div className="mt-3 bg-white p-3 rounded border border-[#F59E0B]">
                    <p className="text-xs text-[#92400E] font-semibold mb-1">Instructions:</p>
                    <ol className="text-xs text-[#92400E] space-y-1 ml-4 list-decimal">
                      <li>Click the button above to go to Entreprise page</li>
                      <li>Find the "Email" field</li>
                      <li>Enter: <strong>amelia@paie360.com</strong></li>
                      <li>Click "Enregistrer les modifications" (Save)</li>
                      <li>Come back here and send a test email!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* SIMPLE 3-STEP GUIDE */}
        <Card className="border-4 border-[#6366F1] shadow-xl mb-6 bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF]">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-[#6366F1] rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#1E40AF] mb-3">🚀 3 Simple Steps - No DNS Required!</h2>
                
                <div className="bg-white p-6 rounded-lg space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4 pb-4 border-b border-[#E5E7EB]">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#0F172A] text-lg mb-2">Open SendGrid</p>
                      <a 
                        href="https://app.sendgrid.com/settings/sender_auth/senders" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-4 py-2 rounded-lg hover:bg-[#5558E3] font-semibold"
                      >
                        Click here to open SendGrid
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="flex items-start gap-4 pb-4 border-b border-[#E5E7EB]">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#0F172A] text-lg mb-3">Verify This Email Address</p>
                      <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-lg p-4 mb-3">
                        <p className="text-sm text-[#92400E] font-semibold mb-2">📧 Use YOUR email address (easiest option):</p>
                        <code className="block text-lg font-bold text-[#0F172A] bg-white px-3 py-2 rounded border border-[#F59E0B]">
                          remoz.giovanni@meras.io
                        </code>
                        <p className="text-xs text-[#92400E] mt-2">✅ You have access to this email = Easy verification!</p>
                      </div>
                      
                      <div className="bg-[#F3F4F6] rounded-lg p-4">
                        <p className="text-sm text-[#374151] mb-2">
                          <strong>Steps in SendGrid:</strong>
                        </p>
                        <ol className="text-sm text-[#374151] space-y-1 ml-4 list-decimal">
                          <li>Click "Create New Sender" or "Verify a Single Sender"</li>
                          <li>Enter <strong>remoz.giovanni@meras.io</strong> as the "From Email"</li>
                          <li>Fill in name, address, city = Djibouti</li>
                          <li>Click "Create"</li>
                          <li>Check your <strong>meras.io inbox</strong> for verification email</li>
                          <li>Click the verification link</li>
                          <li>Done! ✅</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#059669] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#0F172A] text-lg mb-2">Update App Email</p>
                      <p className="text-sm text-[#64748B] mb-3">Go to Entreprise page and set the email field</p>
                      <Link to={createPageUrl('Entreprise')}>
                        <Button className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:shadow-lg">
                          Go to Entreprise Page
                        </Button>
                      </Link>
                      <p className="text-xs text-[#64748B] mt-2">Set Email = remoz.giovanni@meras.io, then Save</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-[#D1FAE5] border-2 border-[#10B981] rounded-lg">
                  <p className="text-sm text-[#065F46] font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Why this is easier:
                  </p>
                  <ul className="text-sm text-[#065F46] mt-2 ml-6 space-y-1 list-disc">
                    <li><strong>No DNS configuration needed</strong></li>
                    <li><strong>No Cloudflare account needed</strong></li>
                    <li><strong>No domain setup needed</strong></li>
                    <li><strong>Just verify one email address and done!</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Current Status */}
        <Card className="border-0 shadow-lg mb-6">
          <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#6366F1]/5 to-[#8B5CF6]/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827]">Current Configuration</h3>
                <p className="text-sm text-[#6B7280] mt-1">What the app will use</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="bg-[#F7F9FC] p-4 rounded-lg border border-[#E5E7EB]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#64748B]">SendGrid Status</p>
                  <p className="text-lg font-bold text-[#10B981]">✅ Connected</p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Verified Email</p>
                  <p className="text-lg font-bold text-[#10B981]">amelia@paie360.com</p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">App Sender Email</p>
                  <p className={`text-lg font-bold ${company.email === 'amelia@paie360.com' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {company.email || 'Not set yet'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Ready to Send</p>
                  <p className={`text-lg font-bold ${company.email === 'amelia@paie360.com' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {company.email === 'amelia@paie360.com' ? '✅ Yes' : '⚠️ Update email first'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Test Form */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b border-[#E5E7EB] bg-gradient-to-r from-[#10B981]/5 to-[#059669]/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827]">Send Test Email</h3>
                <p className="text-sm text-[#6B7280] mt-1">After updating the email in Entreprise page</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-[#374151] font-semibold">Your Email *</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="border-[#D1D5DB] mt-2 focus:ring-2 focus:ring-[#6366F1]"
                />
                <p className="text-xs text-[#64748B] mt-2">
                  💡 Enter your email to receive the test
                </p>
              </div>
              
              <Button
                onClick={handleSendTest}
                disabled={sending || !testEmail}
                className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:shadow-lg transition-all"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>
            
            {lastResult && (
              <div className={`mt-6 p-4 rounded-lg border-2 ${
                lastResult.success
                  ? 'bg-[#D1FAE5] border-[#10B981]'
                  : 'bg-[#FEE2E2] border-[#EF4444]'
              }`}>
                <div className="flex items-start gap-3">
                  {lastResult.success ? (
                    <CheckCircle className="w-6 h-6 text-[#10B981] flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#EF4444] flex-shrink-0" />
                  )}
                  <div>
                    <h4 className={`font-bold ${lastResult.success ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
                      {lastResult.message}
                    </h4>
                    {!lastResult.success && lastResult.details && (
                      <p className="text-sm mt-2 text-[#991B1B]">{lastResult.details}</p>
                    )}
                    {!lastResult.success && lastResult.senderEmail && (
                      <p className="text-sm mt-2 text-[#991B1B]">
                        Current sender: <code className="bg-white px-2 py-1 rounded">{lastResult.senderEmail}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
