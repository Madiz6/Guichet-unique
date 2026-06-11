/**
 * Entity exports — backed by Supabase via base44 compat shim.
 */
import { base44 } from './base44Client'

export const RegistrationDossier = base44.entities.RegistrationDossier
export const ModificationDossier = base44.entities.ModificationDossier
export const Company = base44.entities.Company
export const AuditLog = base44.entities.AuditLog

// Legacy alias kept for backward compat
export const User = base44.auth
export const Query = base44.entities.RegistrationDossier
