# Portail Admin ANPI — Guichet Unique

Business registration single-window portal for Djibouti (ANPI — Agence Nationale pour la Promotion des Investissements).

## Stack

- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui + react-router-dom v6 + TanStack Query
- **Hosting**: Vercel (frontend SPA + `api/*.js` serverless functions)
- **Database**: Supabase (PostgreSQL + Auth + Storage), project ref `jqskeddammuygojngmra`
- **Email**: Resend, from `noreply@e-businessgov.com` (`RESEND_FROM` env var)
- **Payments**: MERAS gateway (`pay.merasconnect.com`), JWT ES256 signed, server-side only
- **AML/KYC**: Anthropic API with web search tool

## Supabase tables (snake_case, already created)

```
profiles                  — auth users + role
companies                 — registered companies
registration_dossiers     — new company registration files
modification_dossiers     — post-registration modification requests
aml_screening_sessions    — AML screening results
kyc_risk_assessments      — KYC risk engine results
audit_logs                — admin action log
```

Private storage bucket: `dossiers` (access via signed URLs only — never public URLs)

### Roles in `profiles.role`

`admin`, `agent`, `entrepreneur` (+ `agent_odpic` / `agent_dgi` / `agent_cnss` reserved)

## Rules

- **NEVER** use `@base44/sdk` — it is fully removed
- `service_role` key + JWT signing + LLM calls live **only** in `api/*.js`, never client-side
- Official numbers come from Postgres RPCs: `rpc('next_license_number')`, `rpc('next_numero_registre')`
- NIF is entered by the DGI agent, **never** auto-generated
- All documents go to the private `dossiers` bucket; always display via `createSignedUrl(path, 3600)`
- Role comes **only** from `profiles.role` — no hardcoded admin email overrides

## Environment variables

### Frontend (Vite)
```
VITE_SUPABASE_URL=https://jqskeddammuygojngmra.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

### Vercel serverless (api/*)
```
SUPABASE_URL=https://jqskeddammuygojngmra.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
MERAS_MERCHANT_ID=<id>
MERAS_PRIVATE_KEY=<PKCS8 PEM — ES256>
MERAS_GATEWAY_URL=<full endpoint URL, e.g. https://pay.merasconnect.com/api/v1/gateway/initiate-payment>
RESEND_API_KEY=<key>
RESEND_FROM=noreply@e-businessgov.com
ANTHROPIC_API_KEY=<key>
```

## API routes (`api/*.js`)

| File | Auth required | Purpose |
|------|--------------|---------|
| `meras-initiate-payment.js` | authenticated | Sign ES256 JWT + POST to MERAS_GATEWAY_URL |
| `meras-webhook.js` | none (MERAS callback) | Set `payment_confirmed=true` |
| `meras-check-status.js` | authenticated | Poll MERAS for `santimPayTxnId` |
| `send-email.js` | authenticated | Resend email |
| `generate-license.js` | admin/agent | Generate license PDF + upload to storage |
| `aml-screening.js` | admin/agent | Anthropic web search AML check |
| `kyc-risk-engine.js` | admin | Anthropic KYC risk assessment |
| `due-diligence-search.js` | admin | Anthropic web search due diligence |

## Key client-side patterns

```js
// Storage upload
const { data, error } = await supabase.storage.from('dossiers').upload(path, file)

// Display document
const { data: { signedUrl } } = await supabase.storage
  .from('dossiers').createSignedUrl(storedPath, 3600)

// Call API route (include session token)
const { data: { session } } = await supabase.auth.getSession()
fetch('/api/generate-license', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ dossier_id })
})
```

## Field renames (Base44 → Supabase)

| Old | New |
|-----|-----|
| `created_date` | `created_at` |
| `updated_date` | `updated_at` |
| `created_by_id` | `created_by` |
