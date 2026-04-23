import React from 'react';

const COUNTRIES = [
  'Afghanistan','Afrique du Sud','Albanie','Algérie','Allemagne','Andorre','Angola','Antigua-et-Barbuda',
  'Arabie saoudite','Argentine','Arménie','Australie','Autriche','Azerbaïdjan',
  'Bahamas','Bahreïn','Bangladesh','Barbade','Belgique','Belize','Bénin','Bhoutan','Biélorussie',
  'Birmanie / Myanmar','Bolivie','Bosnie-Herzégovine','Botswana','Brésil','Brunei','Bulgarie','Burkina Faso','Burundi',
  'Cabo Verde','Cambodge','Cameroun','Canada','Centrafrique','Chili','Chine','Chypre','Colombie',
  'Comores','Congo (Brazzaville)','Congo (RDC)','Corée du Nord','Corée du Sud','Costa Rica','Côte d\'Ivoire',
  'Croatie','Cuba','Danemark','Djibouti','Dominique','Égypte','Émirats arabes unis','Équateur','Érythrée',
  'Espagne','Eswatini','Estonie','Éthiopie','Fidji','Finlande','France',
  'Gabon','Gambie','Géorgie','Ghana','Grèce','Grenade','Guatemala','Guinée','Guinée-Bissau','Guinée équatoriale',
  'Guyana','Haïti','Honduras','Hongrie','Inde','Indonésie','Irak','Iran','Irlande','Islande','Israël','Italie',
  'Jamaïque','Japon','Jordanie','Kazakhstan','Kenya','Kirghizistan','Kiribati','Kosovo','Koweït',
  'Laos','Lesotho','Lettonie','Liban','Liberia','Libye','Liechtenstein','Lituanie','Luxembourg',
  'Macédoine du Nord','Madagascar','Malaisie','Malawi','Maldives','Mali','Malte','Maroc','Marshall',
  'Maurice','Mauritanie','Mexique','Micronésie','Moldavie','Monaco','Mongolie','Monténégro','Mozambique',
  'Namibie','Nauru','Népal','Nicaragua','Niger','Nigéria','Norvège','Nouvelle-Zélande',
  'Oman','Ouganda','Ouzbékistan','Pakistan','Palaos','Panama','Papouasie-Nouvelle-Guinée','Paraguay',
  'Pays-Bas','Pérou','Philippines','Pologne','Portugal','Qatar',
  'Roumanie','Royaume-Uni','Russie','Rwanda',
  'Saint-Christophe-et-Niévès','Saint-Marin','Saint-Vincent-et-les-Grenadines','Sainte-Lucie','Salomon',
  'Salvador','Samoa','São Tomé-et-Príncipe','Sénégal','Serbie','Seychelles','Sierra Leone','Singapour',
  'Slovaquie','Slovénie','Somalie','Soudan','Soudan du Sud','Sri Lanka','Suède','Suisse','Suriname',
  'Syrie','Tadjikistan','Tanzanie','Tchad','Thaïlande','Timor oriental','Togo','Tonga','Trinité-et-Tobago',
  'Tunisie','Turkménistan','Turquie','Tuvalu',
  'Ukraine','Uruguay','Vanuatu','Vatican','Venezuela','Viêt Nam',
  'Yémen','Zambie','Zimbabwe',
];

export { COUNTRIES };

export default function CountrySelect({ value, onChange, placeholder = 'Sélectionner un pays', className = '', required = false }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      required={required}
      className={`w-full border border-input rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-ring ${!value ? 'text-muted-foreground' : ''} ${className}`}
    >
      <option value="">{placeholder}</option>
      {COUNTRIES.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}