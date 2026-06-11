/**
 * Supabase API client — unified data access layer for ANPI Guichet Unique.
 */
import { supabase } from '@/lib/supabase'

// ── Table mapping (entity name → Supabase table) ─────────────────────────────
const TABLE_MAP = {
  RegistrationDossier: 'registration_dossiers',
  ModificationDossier: 'modification_dossiers',
  Company: 'companies',
  User: 'profiles',
  AuditLog: 'audit_logs',
  AmlScreeningSession: 'aml_screening_sessions',
  KycRiskAssessment: 'kyc_risk_assessments',
}

// ── Field rename mapping (old → new) ────────────────────────────────────────
const FIELD_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
  created_by_id: 'created_by',
}

function parseSort(sort) {
  if (!sort) return { column: 'created_at', ascending: false }
  const desc = sort.startsWith('-')
  const raw = desc ? sort.slice(1) : sort
  const column = FIELD_MAP[raw] || raw
  return { column, ascending: !desc }
}

function createEntity(entityName) {
  const table = TABLE_MAP[entityName]
  if (!table) {
    // Unknown / legacy entity — return safe empty stubs
    return {
      list: async () => [],
      filter: async () => [],
      create: async (d) => d,
      update: async (_id, d) => d,
      delete: async () => {},
      schema: async () => ({}),
    }
  }
  return {
    async list(sort = '-created_at', limit = 1000) {
      const { column, ascending } = parseSort(sort)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(column, { ascending })
        .limit(limit)
      if (error) throw error
      return data || []
    },

    async filter(query = {}, sort = '-created_at', limit = 1000) {
      const { column, ascending } = parseSort(sort)
      let q = supabase.from(table).select('*')
      for (const [key, val] of Object.entries(query)) {
        if (val !== undefined && val !== null) q = q.eq(key, val)
      }
      const { data, error } = await q.order(column, { ascending }).limit(limit)
      if (error) throw error
      return data || []
    },

    async create(data) {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return result
    },

    async update(id, data) {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return result
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },

    async schema() { return {} },
  }
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
async function getCurrentProfile() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, onboarding_completed')
    .eq('id', session.user.id)
    .single()
  if (error || !profile) return null
  // Merge: profile fields (role, full_name, …) take precedence; email from auth
  return {
    id: session.user.id,
    email: session.user.email,
    role: profile.role,
    full_name: profile.full_name,
    company_id: profile.company_id,
    onboarding_completed: profile.onboarding_completed,
  }
}

// ── API route helper (includes Supabase session token) ───────────────────────
async function apiFetch(path, params = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  return { data }
}

// ── Function → API route mapping ─────────────────────────────────────────────
const FUNCTION_ROUTE_MAP = {
  generateLicense: '/api/generate-license',
  amlScreening: '/api/aml-screening',
  kycRiskEngine: '/api/kyc-risk-engine',
  dueDiligenceSearch: '/api/due-diligence-search',
  sendEmail: '/api/send-email',
  merasInitiatePayment: '/api/meras-initiate-payment',
  merasCheckStatus: '/api/meras-check-status',
}

// ── Main export ───────────────────────────────────────────────────────────────
export const apiClient = {
  auth: {
    async me() {
      try { return await getCurrentProfile() } catch { return null }
    },
    async isAuthenticated() {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session
    },
    async updateMe(data) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data: result, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return result
    },
    logout(redirectUrl) {
      supabase.auth.signOut().then(() => {
        window.location.href = redirectUrl || '/'
      })
    },
    redirectToLogin(nextUrl) {
      const encoded = nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''
      window.location.href = `/login${encoded}`
    },
  },

  entities: new Proxy({}, {
    get(_, name) { return createEntity(String(name)) },
  }),

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const ext = file.name.split('.').pop()
        const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage.from('dossiers').upload(path, file)
        if (error) throw error
        const { data: urlData } = await supabase.storage
          .from('dossiers')
          .createSignedUrl(data.path, 604800) // 7-day signed URL for display
        return { file_url: urlData?.signedUrl || '', path: data.path }
      },
      // Document OCR: delegates to /api/extract-document (Anthropic vision, server-side)
      // Returns the extracted fields object directly (InvokeLLM contract).
      async InvokeLLM({ prompt, file_urls, response_json_schema } = {}) {
        const { data } = await apiFetch('/api/extract-document', {
          file_urls,
          json_schema: response_json_schema,
          prompt,
        })
        if (data?.status === 'success') return data.output ?? {}
        throw new Error(data?.error || 'Extraction failed')
      },
      async SendEmail(params) {
        return apiFetch('/api/send-email', params)
      },
      SendSMS: async () => {},
      GenerateImage: async () => {},
      // Returns { status: 'success', output: {...} } matching Base44 contract.
      async ExtractDataFromUploadedFile({ file_url, json_schema } = {}) {
        try {
          const { data } = await apiFetch('/api/extract-document', {
            file_urls: [file_url].filter(Boolean),
            json_schema,
          })
          return data ?? {}
        } catch {
          return {}
        }
      },
    },
  },

  functions: {
    async invoke(name, params = {}) {
      const route = FUNCTION_ROUTE_MAP[name]
      if (!route) throw new Error(`Unknown function: ${name}`)
      return apiFetch(route, params)
    },
  },
}

export default apiClient
