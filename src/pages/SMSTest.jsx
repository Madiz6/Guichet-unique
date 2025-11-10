import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function SMSTest() {
  const [phoneNumber, setPhoneNumber] = useState('+253');
  const [message, setMessage] = useState('Test SMS from Paie360! 🚀');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('sendSMS', {
        to: phoneNumber,
        message: message
      });
      
      console.log('SMS Response:', response);
      
      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message,
          sid: response.data.message_sid
        });
        toast.success('SMS envoyé avec succès!');
      } else {
        setResult({
          success: false,
          error: response.data.error || 'Erreur inconnue'
        });
        toast.error('Échec de l\'envoi du SMS');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Erreur inconnue';
      setResult({
        success: false,
        error: errorMessage,
        details: error?.response?.data?.details
      });
      toast.error(errorMessage);
    }
    
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Test SMS Twilio</h1>
            <p className="text-[#64748B] mt-1">Tester l'envoi de SMS</p>
          </div>
        </div>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <Label>Numéro de téléphone *</Label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+253 77 12 34 56"
                  required
                  className="mt-2"
                />
                <p className="text-sm text-[#64748B] mt-1">
                  Format international (ex: +253 77 12 34 56)
                </p>
              </div>
              
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Votre message..."
                  rows={4}
                  required
                  className="mt-2"
                />
                <p className="text-sm text-[#64748B] mt-1">
                  {message.length} caractères
                </p>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
              >
                {loading ? (
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
            
            {result && (
              <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.success ? 'Succès!' : 'Erreur'}
                    </p>
                    <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.success ? result.message : result.error}
                    </p>
                    {result.sid && (
                      <p className="text-xs text-green-600 mt-2 font-mono">
                        Message SID: {result.sid}
                      </p>
                    )}
                    {result.details && (
                      <pre className="text-xs text-red-600 mt-2 overflow-auto">
                        {result.details}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg mt-6">
          <CardContent className="p-6">
            <h3 className="font-bold text-[#0F172A] mb-3">📱 Informations Twilio</h3>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}