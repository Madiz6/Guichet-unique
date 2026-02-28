import React, { useState } from 'react';
import { meras } from "@/components/core/MerasClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Calendar, Tag, Building2, AlertTriangle, User, FileText, DollarSign, Clock } from 'lucide-react';

const STATUS_COLORS = {
  'Brouillon': 'bg-gray-100 text-gray-700',
  'Soumise': 'bg-blue-100 text-blue-700',
  'En approbation': 'bg-yellow-100 text-yellow-700',
  'Approuvée': 'bg-green-100 text-green-700',
  'Rejetée': 'bg-red-100 text-red-700',
  'En commande': 'bg-purple-100 text-purple-700',
  'Livrée': 'bg-teal-100 text-teal-700'
};

const URGENCE_COLORS = {
  'Normal': 'text-green-600 bg-green-50',
  'Urgent': 'text-orange-600 bg-orange-50',
  'Critique': 'text-red-600 bg-red-50',
};

export default function RequestDetailPanel({ request, currentUser, onApprove, onReject, isApproving, isRejecting }) {
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => meras.entities.Budget.list(),
  });

  const budget = budgets.find(b => b.id === request.budget_id);
  const allocated = budget?.amount_allocated ?? 0;
  const used = budget?.amount_used ?? 0;
  const available = budget?.amount_available ?? (allocated - used);
  const requested = request.montant_total ?? 0;
  const afterApproval = available - requested;
  const usedPct = allocated > 0 ? Math.min((used / allocated) * 100, 100) : 0;
  const requestedPct = allocated > 0 ? Math.min((requested / allocated) * 100, 100) : 0;
  const isOverBudget = requested > available;

  const isAdmin = currentUser?.role === 'admin';
  const canAct = isAdmin && ['Soumise', 'En approbation', 'Brouillon'].includes(request.statut);

  const InfoRow = ({ icon: Icon, label, value, highlight }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${highlight || 'text-gray-800'}`}>{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 font-mono mb-1">{request.numero_demande}</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{request.titre}</h2>
            <p className="text-xs text-gray-500 mt-1">
              Soumise le {new Date(request.created_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-gray-900">{requested.toLocaleString()}</p>
            <p className="text-xs text-gray-500">DJF</p>
            <Badge className={`mt-1 ${STATUS_COLORS[request.statut]}`}>{request.statut}</Badge>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 divide-y divide-gray-100">
        <InfoRow icon={Building2} label="Département" value={request.departement} />
        <InfoRow icon={Tag} label="Type d'achat" value={request.type_achat} />
        <InfoRow icon={Tag} label="Catégorie" value={request.categorie} />
        <InfoRow icon={AlertTriangle} label="Urgence" value={request.urgence} highlight={URGENCE_COLORS[request.urgence]} />
        <InfoRow icon={Calendar} label="Date de besoin" value={request.date_besoin ? new Date(request.date_besoin).toLocaleDateString('fr-FR') : null} />
        {request.budget_code && <InfoRow icon={FileText} label="Code budgétaire" value={request.budget_code} />}
      </div>

      {/* Description / Justification */}
      {(request.description || request.justification) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {request.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-gray-700">{request.description}</p>
            </div>
          )}
          {request.justification && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Justification métier</p>
              <p className="text-sm text-gray-700">{request.justification}</p>
            </div>
          )}
        </div>
      )}

      {/* Budget bar */}
      {budget && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Budget: {budget.budget_code || budget.department_name}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isOverBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {isOverBudget ? '⚠️ Dépassement' : '✅ Suffisant'}
            </span>
          </div>

          {/* Bar */}
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gray-400 transition-all"
              style={{ width: `${usedPct}%` }}
              title={`Utilisé: ${used.toLocaleString()} DJF`}
            />
            <div
              className={`h-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-blue-400'}`}
              style={{ width: `${Math.min(requestedPct, 100 - usedPct)}%` }}
              title={`Demande: ${requested.toLocaleString()} DJF`}
            />
          </div>

          {/* Legend */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0</span>
            <span className="font-medium text-gray-700">{allocated.toLocaleString()} DJF alloués</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Utilisé</p>
              <p className="text-sm font-bold text-gray-700">{used.toLocaleString()}</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-500">Cette demande</p>
              <p className="text-sm font-bold text-blue-700">{requested.toLocaleString()}</p>
            </div>
            <div className={`text-center p-2 rounded-lg ${afterApproval < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-xs text-gray-500">Restant si approuvé</p>
              <p className={`text-sm font-bold ${afterApproval < 0 ? 'text-red-700' : 'text-green-700'}`}>
                {afterApproval.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Action */}
      {canAct && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">En attente de votre décision</p>
          </div>

          {!showRejectInput ? (
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-11"
                disabled={isApproving}
                onClick={() => onApprove({
                  email: currentUser.email,
                  commentaire: 'Approuvé par l\'administrateur',
                  date_approbation: new Date().toISOString().split('T')[0]
                })}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isApproving ? 'Approbation...' : 'Approuver la demande'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-11"
                onClick={() => setShowRejectInput(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Motif du rejet (obligatoire)..."
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="border-red-200 focus:ring-red-300"
              />
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!rejectComment.trim() || isRejecting}
                  onClick={() => onReject({
                    email: currentUser.email,
                    commentaire: rejectComment,
                    date_approbation: new Date().toISOString().split('T')[0]
                  })}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {isRejecting ? 'Rejet...' : 'Confirmer le rejet'}
                </Button>
                <Button variant="outline" onClick={() => { setShowRejectInput(false); setRejectComment(''); }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approved/Rejected state */}
      {request.statut === 'Approuvée' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Demande approuvée</p>
            {request.date_approbation_finale && (
              <p className="text-xs text-green-600">
                Le {new Date(request.date_approbation_finale).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      )}
      {request.statut === 'Rejetée' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">Demande rejetée</p>
          </div>
        </div>
      )}
    </div>
  );
}