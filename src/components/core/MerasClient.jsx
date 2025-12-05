/**
 * Meras PSP Client
 * Unified API abstraction layer for all backend services
 * This module provides a clean interface that hides implementation details
 */

import { base44 as _internalClient } from "@/api/base44Client";

// Suppress console logs in production
const isDev = false; // Set to false to disable all debug logs

const log = (...args) => {
  if (isDev) {
    console.log('[Meras]', ...args);
  }
};

// Generic error handler - never expose internal details
const handleError = (error) => {
  log('Service error:', error?.message);
  return {
    success: false,
    error: 'Service temporairement indisponible',
    code: 'MERAS-500'
  };
};

/**
 * Meras Authentication Module
 */
export const MerasAuth = {
  async me() {
    try {
      return await _internalClient.auth.me();
    } catch (e) {
      return null;
    }
  },
  
  async isAuthenticated() {
    try {
      return await _internalClient.auth.isAuthenticated();
    } catch (e) {
      return false;
    }
  },
  
  async updateMe(data) {
    try {
      return await _internalClient.auth.updateMe(data);
    } catch (e) {
      throw new Error('Mise à jour du profil échouée');
    }
  },
  
  logout(redirectUrl) {
    _internalClient.auth.logout(redirectUrl);
  },
  
  redirectToLogin(nextUrl) {
    _internalClient.auth.redirectToLogin(nextUrl);
  }
};

/**
 * Meras Entity Manager
 * Dynamic entity access with unified interface
 */
const createEntityProxy = () => {
  return new Proxy({}, {
    get(target, entityName) {
      return {
        async list(sort, limit) {
          try {
            return await _internalClient.entities[entityName].list(sort, limit);
          } catch (e) {
            log(`Entity ${entityName} list error`);
            return [];
          }
        },
        
        async filter(query, sort, limit) {
          try {
            return await _internalClient.entities[entityName].filter(query, sort, limit);
          } catch (e) {
            log(`Entity ${entityName} filter error`);
            return [];
          }
        },
        
        async create(data) {
          try {
            return await _internalClient.entities[entityName].create(data);
          } catch (e) {
            throw new Error('Création échouée');
          }
        },
        
        async bulkCreate(dataArray) {
          try {
            return await _internalClient.entities[entityName].bulkCreate(dataArray);
          } catch (e) {
            throw new Error('Création en masse échouée');
          }
        },
        
        async update(id, data) {
          try {
            return await _internalClient.entities[entityName].update(id, data);
          } catch (e) {
            throw new Error('Mise à jour échouée');
          }
        },
        
        async delete(id) {
          try {
            return await _internalClient.entities[entityName].delete(id);
          } catch (e) {
            throw new Error('Suppression échouée');
          }
        },
        
        async schema() {
          try {
            return await _internalClient.entities[entityName].schema();
          } catch (e) {
            return {};
          }
        }
      };
    }
  });
};

export const MerasEntities = createEntityProxy();

/**
 * Meras Functions Module
 * Backend function invocation
 */
export const MerasFunctions = {
  async invoke(functionName, params = {}) {
    try {
      const response = await _internalClient.functions.invoke(functionName, params);
      return response;
    } catch (e) {
      log(`Function ${functionName} error`);
      return { data: handleError(e) };
    }
  }
};

/**
 * Meras Integrations Module
 */
export const MerasIntegrations = {
  Core: {
    async InvokeLLM(params) {
      try {
        return await _internalClient.integrations.Core.InvokeLLM(params);
      } catch (e) {
        throw new Error('Service IA indisponible');
      }
    },
    
    async SendEmail(params) {
      try {
        return await _internalClient.integrations.Core.SendEmail(params);
      } catch (e) {
        throw new Error('Envoi email échoué');
      }
    },
    
    async UploadFile(params) {
      try {
        return await _internalClient.integrations.Core.UploadFile(params);
      } catch (e) {
        throw new Error('Upload échoué');
      }
    },
    
    async GenerateImage(params) {
      try {
        return await _internalClient.integrations.Core.GenerateImage(params);
      } catch (e) {
        throw new Error('Génération image échouée');
      }
    },
    
    async ExtractDataFromUploadedFile(params) {
      try {
        return await _internalClient.integrations.Core.ExtractDataFromUploadedFile(params);
      } catch (e) {
        throw new Error('Extraction données échouée');
      }
    }
  }
};

/**
 * Unified Meras Client
 * Single export point for all services
 */
export const meras = {
  auth: MerasAuth,
  entities: MerasEntities,
  functions: MerasFunctions,
  integrations: MerasIntegrations
};

export default meras;