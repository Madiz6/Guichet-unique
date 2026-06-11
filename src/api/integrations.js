/**
 * Integration exports — backed by Supabase storage via apiClient.
 */
import { apiClient } from './apiClient'

export const Core = apiClient.integrations.Core
export const UploadFile = apiClient.integrations.Core.UploadFile.bind(apiClient.integrations.Core)
export const SendEmail = apiClient.integrations.Core.SendEmail.bind(apiClient.integrations.Core)
export const SendSMS = apiClient.integrations.Core.SendSMS.bind(apiClient.integrations.Core)
export const GenerateImage = apiClient.integrations.Core.GenerateImage.bind(apiClient.integrations.Core)
export const ExtractDataFromUploadedFile = apiClient.integrations.Core.ExtractDataFromUploadedFile.bind(apiClient.integrations.Core)

// InvokeLLM is server-side only — stub that throws if called client-side
export const InvokeLLM = () => {
  throw new Error('InvokeLLM is server-side only. Use /api/aml-screening etc.')
}
