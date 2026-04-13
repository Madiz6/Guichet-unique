import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const ACTIVITES = [
  // COMMERCE
  "Achat/revente de véhicules automobiles",
  "Agence commerciale (représentation)",
  "Agence de location de véhicules",
  "Agence de voyages",
  "Alcools et boissons alcoolisées (commerce de)",
  "Alimentation générale / Épicerie",
  "Articles de ménage et ustensiles (vente)",
  "Articles de sport (commerce)",
  "Articles électriques et électroniques (commerce)",
  "Articles scolaires et fournitures de bureau",
  "Bijouterie / Joaillerie",
  "Boucherie / Charcuterie",
  "Boulangerie / Pâtisserie",
  "Brocante / Antiquités",
  "Bureau de change",
  "Chaussures (commerce de)",
  "Commerce de bétail",
  "Commerce de céréales et légumineuses",
  "Commerce de charbon et combustibles",
  "Commerce de détail général",
  "Commerce de gros",
  "Commerce de matériaux de construction",
  "Commerce de matières premières",
  "Commerce de médicaments / Pharmacie",
  "Commerce de meubles",
  "Commerce de pièces automobiles",
  "Commerce de produits alimentaires",
  "Commerce de produits chimiques",
  "Commerce de produits cosmétiques et parfumerie",
  "Commerce de produits informatiques",
  "Commerce de produits pétroliers",
  "Commerce de textiles et vêtements",
  "Commerce de vins et spiritueux",
  "Commerce import/export",
  "Confiserie / Chocolaterie",
  "Electroménager (vente et réparation)",
  "Fleurs et plantes (commerce de)",
  "Fruits et légumes (commerce de)",
  "Grande surface / Supermarché / Libre-service",
  "Horlogerie / Bijouterie",
  "Imprimerie / Reprographie",
  "Informatique et matériel bureautique (commerce)",
  "Jouets et articles de loisirs",
  "Librairie / Papeterie",
  "Linge et articles de maison",
  "Marchand ambulant",
  "Marchand de journaux / Kiosque à presse",
  "Matériel agricole (commerce)",
  "Matériel médical et dentaire (commerce)",
  "Optique (commerce)",
  "Photographie (vente matériel)",
  "Poissonnerie",
  "Produits de beauté et soins (commerce)",
  "Quincaillerie",
  "Tabac et cigarettes (commerce)",
  "Téléphones et accessoires (commerce)",
  // INDUSTRIE & PRODUCTION
  "Abattoir (exploitation d'un)",
  "Biscuiterie / Confiserie industrielle",
  "Blanchisserie / Pressing (procédé mécanique)",
  "Brasserie / Fabrication de boissons",
  "Cartonnerie / Emballages",
  "Conserverie alimentaire",
  "Construction métallique / Serrurerie",
  "Eau minérale (production et distribution)",
  "Fabrique de glace",
  "Fabrique de meubles",
  "Fabrique de produits plastiques",
  "Fabrication de matériaux de construction",
  "Fonderie / Métallurgie",
  "Imprimerie industrielle",
  "Industrie agro-alimentaire",
  "Industrie chimique",
  "Industrie de la pêche",
  "Industrie du bois",
  "Industrie textile et habillement",
  "Meunerie / Minoterie",
  "Menuiserie industrielle",
  "Plastique et caoutchouc (fabrication)",
  "Savonnerie / Cosmétiques (fabrication)",
  // BÂTIMENT & TRAVAUX PUBLICS
  "Bureau d'études techniques (BET)",
  "Carrelage / Revêtements de sol",
  "Charpente / Menuiserie bois",
  "Climatisation / Réfrigération (installation)",
  "Décoration d'intérieur",
  "Electricité du bâtiment",
  "Entreprise de nettoyage industriel",
  "Entreprise de peinture",
  "Entreprise de sécurité / Gardiennage",
  "Entrepreneur de travaux publics",
  "Entrepreneur de travaux privés",
  "Entrepreneur général (BTP)",
  "Génie civil",
  "Installation sanitaire / Plomberie",
  "Maçonnerie / Béton armé",
  "Menuiserie aluminium / PVC",
  "Terrassement / Démolition",
  "Vitrerie / Miroiterie",
  // SERVICES
  "Agence de communication / Publicité",
  "Agence de recrutement / Intérim",
  "Agence immobilière",
  "Assistance technique",
  "Audit / Expertise comptable",
  "Auto-école",
  "Cabinet d'architecture",
  "Cabinet de conseil en gestion",
  "Cabinet de notaire",
  "Cabinet juridique / Avocat",
  "Cabinet médical",
  "Cabinet dentaire",
  "Centre de formation professionnelle",
  "Clinique / Centre de santé privé",
  "Coiffure / Salon de beauté",
  "Conseil en informatique / SSII",
  "Courtier en assurances",
  "Courtier maritime",
  "Déménagement / Manutention",
  "Dépannage informatique",
  "Développement logiciels",
  "École privée / Enseignement privé",
  "Entrepôt / Entreposage",
  "Étude topographique",
  "Garderie / Crèche",
  "Gérance d'immeuble",
  "Géomètre-expert",
  "Hôtel / Hébergement",
  "Huissier de justice",
  "Kinésithérapie / Rééducation",
  "Laboratoire d'analyses médicales",
  "Location de matériel",
  "Location immobilière",
  "Maison d'hôtes / Résidence",
  "Nettoyage et entretien (ménage)",
  "Officine pharmaceutique",
  "Opérateur de télécommunications",
  "Organisation d'événements",
  "Parking / Garage automobile",
  "Pressing / Laverie",
  "Radiologie / Imagerie médicale",
  "Réparation d'appareils électroménagers",
  "Réparation automobile / Carrosserie",
  "Réparation de cycles et motos",
  "Restaurant / Cafétéria",
  "Restauration rapide / Fast-food",
  "Salle de sport / Fitness",
  "Salon de coiffure hommes",
  "Secrétariat / Dactylographie",
  "Services informatiques",
  "Société de gardiennage / Sécurité",
  "Studio d'enregistrement / Multimédia",
  "Taxi / Transport de personnes",
  "Traduction / Interprétariat",
  "Vétérinaire / Clinique vétérinaire",
  // TRANSPORT & LOGISTIQUE
  "Affrètement maritime",
  "Agent maritime",
  "Camionnage / Transport de marchandises",
  "Commissionnaire en douane",
  "Entreposage sous douane",
  "Expédition / Messagerie",
  "Location de camions / Engins",
  "Manutention portuaire",
  "Transit douanier",
  "Transport international routier",
  "Transport maritime",
  // FINANCE & ASSURANCES
  "Assurance (société d')",
  "Banque / Établissement de crédit",
  "Courtier en assurances",
  "Établissement de microfinance",
  "Établissement de paiement",
  "Société de leasing",
  // AGRICULTURE & PÊCHE
  "Agriculture / Maraîchage",
  "Aquaculture / Pisciculture",
  "Aviculture / Élevage de volailles",
  "Élevage",
  "Pêche industrielle",
  "Pêche artisanale",
  "Production de sel",
  // TOURISME & LOISIRS
  "Agence de tourisme",
  "Bar / Débit de boissons",
  "Centre de loisirs",
  "Cinéma",
  "Discothèque / Night-club",
  "Hôtel 1-2 étoiles",
  "Hôtel 3-5 étoiles",
  "Parc d'attractions",
  "Plongée / Sports nautiques",
  // ARTISANAT
  "Artisan bijoutier",
  "Artisan couturier / Broderie",
  "Artisan électricien",
  "Artisan mécanicien",
  "Artisan menuisier",
  "Artisan plombier",
  "Artisan soudeur",
  "Atelier de couture",
  "Atelier de poterie",
  "Tannerie / Maroquinerie",
  // NUMERIQUE & MEDIA
  "Centre d'appels / Call center",
  "Cybercafé / Accès Internet",
  "Développement web / Applications mobiles",
  "Édition / Presse écrite",
  "Infographie / Design graphique",
  "Production audiovisuelle / Cinéma",
  "Radio / Télévision privée",
  "Réseaux sociaux / Marketing digital",
  // ENERGIE & ENVIRONNEMENT
  "Collecte et traitement de déchets",
  "Distribution d'eau",
  "Distribution d'électricité",
  "Énergies renouvelables (installation)",
  "Station-service / Distribution carburant",
];

export default function SecteurSearchSelect({ value, onChange, placeholder = "Rechercher un secteur d'activité..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = ACTIVITES.filter(a =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (activite) => {
    onChange(activite);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center justify-between border border-input rounded-md px-3 py-2 text-sm bg-transparent text-left hover:bg-accent/20 transition-colors"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span onClick={handleClear} className="hover:text-destructive p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#F9F9F9] rounded-lg border border-[#E5E7EB]">
              <Search className="w-3.5 h-3.5 text-[#9B9B9B] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#C4C4C4]"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-3 h-3 text-[#9B9B9B]" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#9B9B9B] text-center">Aucun résultat</p>
            ) : (
              filtered.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F5F5F5] transition-colors ${value === a ? 'bg-[#F0F0F0] font-medium text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}
                >
                  {a}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-[#F0F0F0] bg-[#FAFAFA]">
            <p className="text-xs text-[#9B9B9B]">{filtered.length} activité(s) — Source: CGI Djibouti</p>
          </div>
        </div>
      )}
    </div>
  );
}