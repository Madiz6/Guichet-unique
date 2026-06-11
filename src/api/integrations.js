/**
 * Integration exports — backed by Supabase storage via base44 compat shim.
 */
import { base44 } from './base44Client'

export const Core = base44.integrations.Core
export const UploadFile = base44.integrations.Core.UploadFile.bind(base44.integrations.Core)
export const SendEmail = base44.integrations.Core.SendEmail.bind(base44.integrations.Core)
export const SendSMS = base44.integrations.Core.SendSMS.bind(base44.integrations.Core)
export const GenerateImage = base44.integrations.Core.GenerateImage.bind(base44.integrations.Core)
export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile.bind(base44.integrations.Core)

// InvokeLLM is server-side only — stub that throws if called client-side
export const InvokeLLM = () => {
  throw new Error('InvokeLLM is server-side only. Use /api/aml-screening etc.')
}
