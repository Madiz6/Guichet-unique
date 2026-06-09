import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Copy, Check, QrCode, ExternalLink, Users } from 'lucide-react';

const PORTAL_URL = `https://securetest998376466473835464724353533454u7567nj44.online/onboarding`;

export default function CustomerPortalCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PORTAL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(PORTAL_URL)}`;

  return (
    <Card className="border border-[#E5E7EB] bg-white swan-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A] text-base">Portail Client — Créer une société</h3>
            <p className="text-xs text-[#6B6B6B] font-normal">Partagez ce lien ou QR code avec vos clients pour démarrer une demande</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* QR Code */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="p-3 border-2 border-dashed border-orange-200 rounded-xl bg-orange-50">
              <img
                src={qrCodeUrl}
                alt="QR Code portail client"
                className="w-32 h-32 rounded"
              />
            </div>
            <p className="text-xs text-[#6B6B6B] text-center">Scanner pour créer une société</p>
          </div>

          {/* URL + Actions */}
          <div className="flex-1 flex flex-col gap-3 w-full">
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-lg px-4 py-3 border border-[#E5E7EB]">
              <Link2 className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
              <span className="text-sm text-[#1A1A1A] font-mono truncate flex-1">{PORTAL_URL}</span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1 border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F5F5F5]"
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-2 text-green-500" /> Copié !</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copier le lien</>
                )}
              </Button>
              <Button
                asChild
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ouvrir le portail
                </a>
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Comment ça marche :</strong> Le client clique sur le lien, crée un compte ou se connecte, puis est guidé automatiquement à travers les 9 étapes de création de société.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}