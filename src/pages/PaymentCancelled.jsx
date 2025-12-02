import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F6] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-2xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertTriangle className="w-14 h-14 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-[#0F172A] mb-3">Paiement Annulé</h1>
            
            <p className="text-lg text-[#64748B] mb-6">
              Vous avez annulé le paiement. Vous pouvez réessayer à tout moment.
            </p>

            <Link to={createPageUrl('Dashboard')}>
              <Button className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-lg py-6">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour au Tableau de Bord
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}