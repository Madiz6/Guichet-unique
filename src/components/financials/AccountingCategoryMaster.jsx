/**
 * Master Accounting Category Reference (NPCG Djibouti)
 * Based on actual accountant Excel templates
 */

export const NPCG_CATEGORIES = {
  // CLASSE 7 - PRODUITS (REVENUS)
  REVENUS: {
    '701': {
      code: '701',
      label: 'Ventes de marchandises',
      categories: ['Product Sales / Services Revenue']
    },
    '706': {
      code: '706',
      label: 'Prestations de services',
      categories: [
        'Services aux Marchands - AISP',
        'Services aux Marchands - PISP',
        'Services aux Marchands - Intégration',
        'Services aux Banques - Passerelle AISP',
        'Services aux Banques - Passerelle PISP',
        'Services aux Banques - Support/Maintenance',
        'Services aux Banques - Conseils & développement',
        'Services Banque Centrale - Compensation',
        'Subscription Income / Recurring Revenue'
      ]
    },
    '762': {
      code: '762',
      label: 'Produits financiers',
      categories: ['Interest Income', 'Investment Income / Dividends']
    },
    '101': {
      code: '101',
      label: 'Capital social - Apports',
      categories: ['Apport Capital']
    },
    '164': {
      code: '164',
      label: 'Emprunts bancaires - Déblocage',
      categories: ['Prêt Bancaire']
    }
  },

  // CLASSE 6 - CHARGES (DÉPENSES)
  DEPENSES: {
    '601': {
      code: '601',
      label: 'Achats de matières premières',
      categories: ['Procurement / Inventory']
    },
    '606': {
      code: '606',
      label: 'Achats non stockés - Fournitures',
      categories: [
        'Fournitures - Électricité',
        'Fournitures - Eau',
        'Fournitures - Carburant',
        'Fournitures - Petit équipement',
        'Fournitures - Produits entretien',
        'Fournitures - Fournitures administratives',
        'Office & Administrative'
      ]
    },
    '613': {
      code: '613',
      label: 'Locations',
      categories: [
        'Location immobilière',
        'Charges locatives',
        'Location de matériels',
        'IT / Software / Tools'
      ]
    },
    '615': {
      code: '615',
      label: 'Entretien et réparations',
      categories: ['Maintenance & Repairs', 'Entretien et réparations']
    },
    '616': {
      code: '616',
      label: 'Primes d\'assurances',
      categories: ['Insurance', 'Primes d\'assurances']
    },
    '622': {
      code: '622',
      label: 'Honoraires',
      categories: [
        'Professional Services',
        'Honoraires comptables / juridiques',
        'Honoraires techniques',
        'Études et recherches'
      ]
    },
    '623': {
      code: '623',
      label: 'Publicité et relations publiques',
      categories: [
        'Marketing & Advertising',
        'Publicité, publications',
        'Foire expositions'
      ]
    },
    '624': {
      code: '624',
      label: 'Transports',
      categories: ['Déplacements']
    },
    '625': {
      code: '625',
      label: 'Déplacements, missions et réceptions',
      categories: ['Travel & Entertainment', 'Missions, réceptions']
    },
    '626': {
      code: '626',
      label: 'Frais postaux et télécommunications',
      categories: ['Frais télécommunications', 'Frais internet']
    },
    '627': {
      code: '627',
      label: 'Services bancaires',
      categories: ['Bank Charges & Interest', 'Services bancaires']
    },
    '628': {
      code: '628',
      label: 'Divers',
      categories: ['Cotisations, dons', 'Miscellaneous Expenses']
    },
    '635': {
      code: '635',
      label: 'Impôts et taxes',
      categories: [
        'Taxes & Regulatory Fees',
        'Patente',
        'Vignette et cartes grises',
        'Droits'
      ]
    },
    '641': {
      code: '641',
      label: 'Rémunérations du personnel',
      categories: [
        'Payroll & Benefits',
        'Rémunération - Service Administratif',
        'Rémunération - Service Technique',
        'Rémunération - Service Commercial',
        'Rémunération du dirigeant'
      ]
    },
    '661': {
      code: '661',
      label: 'Charges financières - Intérêts',
      categories: ['Loan Repayment - Interest', 'Charges financières']
    },
    '164R': {
      code: '164',
      label: 'Remboursement emprunts - Principal',
      categories: ['Loan Repayment - Principal']
    },
    '611': {
      code: '611',
      label: 'Sous-traitance générale',
      categories: ['Sous-traitance']
    },
    '617': {
      code: '617',
      label: 'Personnel extérieur',
      categories: ['Personnel extérieur à l\'entreprise']
    },
    '621': {
      code: '621',
      label: 'Documentation et séminaires',
      categories: ['Documentation, séminaires', 'Training & Development']
    }
  }
};

// Enhanced category list with NPCG mapping
export const ENHANCED_CATEGORIES = {
  REVENUS: [
    // Services (706)
    { value: 'Services aux Marchands - AISP', label: '🔐 AISP Services (Marchands)', npcg: '706', tx_marge: 100, regl_clients: 30 },
    { value: 'Services aux Marchands - PISP', label: '💳 PISP Services (Marchands)', npcg: '706', tx_marge: 100, regl_clients: 30 },
    { value: 'Services aux Banques - Passerelle', label: '🏦 Passerelle Bancaire', npcg: '706', tx_marge: 100, regl_clients: 30 },
    { value: 'Services aux Banques - Support', label: '🛠️ Support & Maintenance', npcg: '706', tx_marge: 100, regl_clients: 30 },
    { value: 'Services aux Banques - Conseils', label: '💡 Conseils & Développement', npcg: '706', tx_marge: 100, regl_clients: 30 },
    { value: 'Services Banque Centrale', label: '🏛️ Services Banque Centrale', npcg: '706', tx_marge: 100, regl_clients: 30 },
    
    // Produits financiers (762)
    { value: 'Interest Income', label: '💰 Produits financiers - Intérêts', npcg: '762' },
    
    // Financement
    { value: 'Apport Capital', label: '💎 Apport en Capital', npcg: '101' },
    { value: 'Prêt Bancaire', label: '🏦 Prêt Bancaire', npcg: '164' },
  ],

  DEPENSES: [
    // Fournitures (606)
    { value: 'Fournitures - Électricité', label: '⚡ Électricité', npcg: '606', frequence: 'Mensuelle', regl_fourn: 30 },
    { value: 'Fournitures - Eau', label: '💧 Eau', npcg: '606', frequence: 'Mensuelle', regl_fourn: 30 },
    { value: 'Fournitures - Carburant', label: '⛽ Carburant', npcg: '606', frequence: 'Mensuelle', regl_fourn: 30 },
    { value: 'Fournitures - Petit équipement', label: '🔧 Petit équipement & Petite caisse', npcg: '606', frequence: 'Mensuelle' },
    { value: 'Fournitures - Produits entretien', label: '🧹 Produits d\'entretien', npcg: '606', frequence: 'Mensuelle' },
    { value: 'Fournitures - Administratives', label: '📎 Fournitures administratives', npcg: '606', frequence: 'Mensuelle' },
    
    // Locations (613)
    { value: 'Location immobilière', label: '🏢 Location immobilière', npcg: '613' },
    { value: 'Location de matériels', label: '🖥️ Location de matériels', npcg: '613' },
    
    // Services extérieurs (611-628)
    { value: 'Sous-traitance', label: '🤝 Sous-traitance', npcg: '611', frequence: 'Mensuelle', regl_fourn: 30 },
    { value: 'Entretien et réparations', label: '🔧 Entretien et réparations', npcg: '615' },
    { value: 'Primes d\'assurances', label: '🛡️ Primes d\'assurances', npcg: '616', regl_fourn: 30 },
    { value: 'Honoraires comptables', label: '📊 Honoraires comptables/juridiques', npcg: '622' },
    { value: 'Études et recherches', label: '🔬 Études et recherches', npcg: '622' },
    { value: 'Documentation, séminaires', label: '📚 Documentation, séminaires', npcg: '621' },
    { value: 'Personnel extérieur', label: '👥 Personnel extérieur à l\'entreprise', npcg: '617' },
    { value: 'Publicité, publications', label: '📢 Publicité, publications', npcg: '623', regl_fourn: 30 },
    { value: 'Foire expositions', label: '🎪 Foire expositions', npcg: '623' },
    { value: 'Frais télécommunications', label: '📞 Frais télécommunications', npcg: '626' },
    { value: 'Frais internet', label: '🌐 Frais internet', npcg: '626' },
    { value: 'Services bancaires', label: '🏦 Services bancaires', npcg: '627' },
    
    // Impôts (635)
    { value: 'Patente', label: '📋 Patente', npcg: '635' },
    { value: 'Vignette et cartes grises', label: '🚗 Vignette et cartes grises', npcg: '635' },
    { value: 'Droits', label: '⚖️ Droits', npcg: '635' },
    
    // Salaires (641)
    { value: 'Payroll & Benefits', label: '💼 Rémunérations du personnel', npcg: '641' },
    
    // Charges financières (661)
    { value: 'Loan Repayment - Interest', label: '💸 Charges financières - Intérêts', npcg: '661' },
    { value: 'Loan Repayment - Principal', label: '💳 Remboursement Prêt - Capital', npcg: '164' },
  ]
};

// Auto-fill suggestions based on transaction type
export const TRANSACTION_TEMPLATES = {
  'Apport Capital': {
    type: 'Revenu',
    category: 'Apport Capital',
    compte_comptable: '101',
    payment_method: 'Virement',
    document_required: true,
    suggested_description: 'Apport en capital - [Nom Associé]'
  },
  'Prêt Bancaire': {
    type: 'Revenu',
    category: 'Prêt Bancaire',
    compte_comptable: '164',
    payment_method: 'Virement',
    document_required: true,
    suggested_description: 'Déblocage prêt bancaire - [Banque]'
  },
  'Remboursement Prêt': {
    type: 'Dépense',
    category: 'Loan Repayment - Principal',
    compte_comptable: '164',
    payment_method: 'Virement',
    document_required: true,
    suggested_description: 'Remboursement échéance prêt - [Banque]'
  },
  'Fournitures - Électricité': {
    type: 'Dépense',
    category: 'Fournitures - Électricité',
    compte_comptable: '606',
    payment_method: 'Virement',
    frequence: 'Mensuelle',
    regl_fourn: 30
  },
  'Services aux Banques - Conseils': {
    type: 'Revenu',
    category: 'Services aux Banques - Conseils',
    compte_comptable: '706',
    payment_method: 'Virement',
    regl_clients: 30
  }
};

export function getCategoryByNPCG(code) {
  for (const section of Object.values(NPCG_CATEGORIES)) {
    if (section[code]) return section[code];
  }
  return null;
}

export function getNPCGByCategory(category) {
  for (const section of Object.values(NPCG_CATEGORIES)) {
    for (const [code, data] of Object.entries(section)) {
      if (data.categories.includes(category)) {
        return code;
      }
    }
  }
  return null;
}