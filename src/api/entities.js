/**
 * Entity exports — backed by Supabase via apiClient.
 */
import { apiClient } from './apiClient'

export const RegistrationDossier = apiClient.entities.RegistrationDossier
export const ModificationDossier = apiClient.entities.ModificationDossier
export const Company = apiClient.entities.Company
export const AuditLog = apiClient.entities.AuditLog

// Legacy alias kept for backward compat
export const User = apiClient.auth
export const Query = apiClient.entities.RegistrationDossier
