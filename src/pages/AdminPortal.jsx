import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, CheckCircle2, XCircle, Eye, FileText, Users, UserSquare2, Building2, ChevronRight, ArrowLeft, AlertTriangle, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { generateFormulairePDF, generateStatutsPDF } from '../components/onboarding/PDFGenerator.jsx';

const STATUS_COLORS = {
  'En attente': 'bg-amber-100 text-amber-700',
  'En cours de traitement': 'bg-blue-100 text-blue-700',
  'Validé': 'bg-green-100 text-green-700',
  'Rejeté': 'bg-red-100 text-red-700',
  'Modification requise': 'bg-orange-100 text-orange-700',
};

export default function AdminPortal() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('representant');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['registration-dossiers'],
    queryFn: () => base44.entities.RegistrationDossier.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegistrationDossier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['registration-dossiers']);
      toast.success('Dossier mis à jour');
    },
  });

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A]">Accès refusé</h2>
          <p className="text-[#6B6B6B] mt-2">Cette page est réservée aux agents du Guichet Unique.</p>
        </div>
      </div>
    );
  }

  const filtered = dossiers.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.company_name?.toLowerCase().includes(q) || d.applicant_name?.toLowerCase().includes(q) || d.envelope_id?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || d.statut === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAction = (id, statut) => {
    updateMutation.mutate({ id, data: { statut, admin_comment: comment, admin_email: user?.email, date_traitement: new Date().toISOString().split('T')[0] } });
    setComment('');
    setSelected(null);
  };

  const stepData = selected?.step_data || {};
  const idData = stepData?.identification?.data || {};
  const activite = stepData?.activite || {};
  const partenaires = stepData?.partenaires?.partners || [];
  const employes = stepData?.employes?.employees || [];
  const docs = stepData?.documents?.docs || {};

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-[#1A2B6B] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <h1 className="font-bold text-lg">Portail Agents — Guichet Unique ANPI</h1>
              <p className="text-xs text-blue-200">Gestion des dossiers d'enregistrement d'entreprises</p>
            </div>
          </div>
          <Link to="/Dashboard"><Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10"><ArrowLeft className="w-4 h-4 mr-1" /> Tableau de bord</Button></Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', count: dossiers.length, color: 'bg-gray-100 text-gray-700' },
            { label: 'En attente', count: dossiers.filter(d => d.statut === 'En attente').length, color: 'bg-amber-100 text-amber-700' },
            { label: 'En cours', count: dossiers.filter(d => d.statut === 'En cours de traitement').length, color: 'bg-blue-100 text-blue-700' },
            { label: 'Validés', count: dossiers.filter(d => d.statut === 'Validé').length, color: 'bg-green-100 text-green-700' },
            { label: 'Rejetés', count: dossiers.filter(d => d.statut === 'Rejeté').length, color: 'bg-red-100 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, envelope ID..." className="pl-9" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-white">
            <option value="">Tous les statuts</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <Card className="border border-[#E5E7EB]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F9F9F9] border-b border-[#E5E7EB]">
                  <tr>
                    {['Envelope ID', 'Entreprise', 'Demandeur', 'Forme', 'Soumission', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B6B6B]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-[#9B9B9B]">Chargement...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-[#9B9B9B]">Aucun dossier trouvé</td></tr>
                  ) : filtered.map(d => (
                    <tr key={d.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-xs text-[#1A2B6B]">{d.envelope_id?.substring(0, 8)}...</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A1A]">{d.company_name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{d.applicant_name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{d.forme_juridique || '—'}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{d.date_soumission ? format(new Date(d.date_soumission), 'dd/MM/yyyy') : '—'}</td>
                      <td className="px-4 py-3"><Badge className={STATUS_COLORS[d.statut] || 'bg-gray-100 text-gray-700'}>{d.statut}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(d); setComment(d.admin_comment || ''); setActiveTab('representant'); }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                          <Eye className="w-3.5 h-3.5" /> Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
                  <span>{selected.company_name}</span>
                  <Badge className={STATUS_COLORS[selected.statut]}>{selected.statut}</Badge>
                </DialogTitle>
                <p className="font-mono text-xs text-[#6B6B6B]">Envelope ID: {selected.envelope_id}</p>
              </DialogHeader>

              {/* Tabs */}
              <div className="flex border-b overflow-x-auto gap-1">
                {[
                  { id: 'representant', label: 'Représentant', icon: UserSquare2 },
                  { id: 'activite', label: 'Activité', icon: Building2 },
                  { id: 'partenaires', label: `Partenaires (${partenaires.length})`, icon: Users },
                  { id: 'employes', label: `Employés (${employes.length})`, icon: UserSquare2 },
                  { id: 'documents', label: 'Documents', icon: FileText },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === id ? 'border-[#1A2B6B] text-[#1A2B6B]' : 'border-transparent text-[#6B6B6B]'}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              {activeTab === 'representant' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Nom', idData.nom], ['Prénom', idData.prenom], ['N° Identité', idData.numero_identite],
                    ['NNI', idData.nni], ['Date naissance', idData.date_naissance], ['Nationalité', idData.nationalite],
                    ['Email', idData.email], ['Téléphone', idData.telephone], ['Adresse', idData.adresse],
                  ].map(([label, val]) => (
                    <div key={label} className="p-2 bg-[#F9F9F9] rounded-lg">
                      <p className="text-xs text-[#9B9B9B]">{label}</p>
                      <p className="font-medium text-[#1A1A1A]">{val || '—'}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'activite' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Raison sociale', activite.raison_sociale],
                    ['Forme juridique', activite.forme_juridique],
                    ['Secteur', activite.secteur_principal],
                    ['Capital social', activite.capital_social ? `${Number(activite.capital_social).toLocaleString()} DJF` : '—'],
                    ['1er choix nom', activite.commercial_names?.[0]],
                    ['2ème choix nom', activite.commercial_names?.[1]],
                    ['3ème choix nom', activite.commercial_names?.[2]],
                    ['Activité secondaire', (activite.activites_secondaires || []).join(', ')],
                  ].map(([label, val]) => (
                    <div key={label} className="p-2 bg-[#F9F9F9] rounded-lg">
                      <p className="text-xs text-[#9B9B9B]">{label}</p>
                      <p className="font-medium text-[#1A1A1A]">{val || '—'}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'partenaires' && (
                <div className="space-y-3">
                  {partenaires.length === 0 ? <p className="text-sm text-[#9B9B9B] text-center py-4">Aucun partenaire déclaré</p> :
                    partenaires.map((p, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={p.type === 'physique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>{p.type === 'physique' ? 'Personne physique' : 'Personne morale'}</Badge>
                          <span className="font-medium text-sm">{p.type === 'physique' ? `${p.prenom} ${p.nom}` : p.raison_sociale}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-[#9B9B9B]">Part</span><p className="font-medium">{p.part_percent || '—'}%</p></div>
                          <div><span className="text-[#9B9B9B]">Apport</span><p className="font-medium">{p.apport ? `${Number(p.apport).toLocaleString()} DJF` : '—'}</p></div>
                          <div><span className="text-[#9B9B9B]">Email</span><p className="font-medium">{p.email || '—'}</p></div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {activeTab === 'employes' && (
                <div className="space-y-3">
                  {employes.length === 0 ? <p className="text-sm text-[#9B9B9B] text-center py-4">Aucun employé déclaré</p> :
                    employes.map((e, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-xl p-4">
                        <p className="font-medium text-sm mb-2">{e.prenom} {e.nom} — <span className="text-[#6B6B6B]">{e.emploi_occupe}</span></p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-[#9B9B9B]">Type</span><p>{e.type_employe}</p></div>
                          <div><span className="text-[#9B9B9B]">Contrat</span><p>{e.type_contrat}</p></div>
                          <div><span className="text-[#9B9B9B]">Salaire</span><p>{e.salaire_base ? `${Number(e.salaire_base).toLocaleString()} DJF` : '—'}</p></div>
                          <div><span className="text-[#9B9B9B]">Nom mère</span><p>{e.nom_mere || '—'}</p></div>
                          <div><span className="text-[#9B9B9B]">Matricule CNSS</span><p>{e.matricule_cnss || '—'}</p></div>
                          <div><span className="text-[#9B9B9B]">Embauche</span><p>{e.date_embauche || '—'}</p></div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-3">
                  {Object.entries(docs).map(([key, url]) => url && (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-xl hover:bg-[#F9F9F9] transition-all">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm capitalize">{key.replace(/_url$/, '').replace(/_/g, ' ')}</span>
                      <ChevronRight className="w-4 h-4 text-[#9B9B9B] ml-auto" />
                    </a>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => generateFormulairePDF(stepData, selected.envelope_id)} className="text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Formulaire GUI PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateStatutsPDF(stepData, selected.envelope_id)} className="text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" /> Statuts PDF
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin comment + actions */}
              <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
                <div>
                  <Label className="text-sm font-medium">Commentaire de suivi</Label>
                  <Textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Ajoutez un commentaire visible par le demandeur..." rows={3} className="mt-1" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => handleAction(selected.id, 'En cours de traitement')} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
                    <Clock className="w-3.5 h-3.5 mr-1" /> En cours de traitement
                  </Button>
                  <Button onClick={() => handleAction(selected.id, 'Modification requise')} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Modification requise
                  </Button>
                  <Button onClick={() => handleAction(selected.id, 'Rejeté')} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeter
                  </Button>
                  <Button onClick={() => handleAction(selected.id, 'Validé')} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valider le dossier
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}