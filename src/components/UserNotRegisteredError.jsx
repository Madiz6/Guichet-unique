import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, Mail } from 'lucide-react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA]">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-orange-100">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>

        <img
          src="https://media.base44.com/images/public/69db89e14e315ad78c6a394b/e597c3294_Untitled-design-1.png"
          alt="Guichet UN"
          className="w-10 h-10 object-contain mx-auto mb-4"
        />

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Accès non autorisé</h1>
        <p className="text-[#6B6B6B] text-sm mb-6 leading-relaxed">
          Votre compte n'est pas encore enregistré sur cette application. Veuillez contacter un administrateur du Guichet Unique ANPI pour obtenir l'accès.
        </p>

        <div className="bg-[#F9F9F9] rounded-xl p-4 text-left text-sm text-[#6B6B6B] mb-6 border border-[#E5E7EB]">
          <p className="font-semibold text-[#1A1A1A] mb-2">Que faire ?</p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Vérifiez que vous êtes connecté avec le bon compte</li>
            <li>Contactez l'administrateur ANPI pour demander l'accès</li>
            <li>Déconnectez-vous et reconnectez-vous si nécessaire</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => base44.auth.logout('/')}
            className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
          <a
            href="mailto:support@anpi.dj"
            className="flex items-center justify-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors py-2"
          >
            <Mail className="w-4 h-4" />
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;