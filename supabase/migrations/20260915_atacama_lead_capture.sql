-- 002-operationalize-commercial-system, tarea 1.3/2.1 — REQ-CRM-002
-- Captura durable de leads del formulario /contacto + intención de sync a GHL.
-- Prefijo atacama_ para no colisionar ni confundirse con tablas de EnBandeja
-- en el mismo proyecto Supabase compartido (uwquwjmiofixzugttals).
--
-- NO APLICADA TODAVIA. Revisar y autorizar antes de ejecutar
-- (mcp apply_migration o supabase db push), per ARCHITECTURE.md
-- "Migraciones únicamente tras inventario... y ensayo".

create table if not exists public.atacama_lead_submissions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  payload_hash text not null,
  name text not null,
  company text,
  email text,
  phone text,
  message text not null,
  solution text not null default 'unsure',
  notice_version text not null,
  source text not null default 'web',
  status text not null default 'received'
    check (status in ('received', 'sync_pending', 'synced', 'sync_failed')),
  created_at timestamptz not null default now(),
  constraint atacama_lead_submissions_contact_chk
    check (email is not null or phone is not null)
);

comment on table public.atacama_lead_submissions is
  'Recepción durable del formulario /contacto de Atacama Labs (contracts/DATA.md LeadSubmission). Inmutable tras creación.';

create table if not exists public.atacama_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_submission_id uuid not null references public.atacama_lead_submissions(id),
  event text not null default 'lead_submission.created',
  destination text not null default 'ghl',
  effect_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'retry_wait', 'failed')),
  attempts int not null default 0,
  next_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.atacama_sync_jobs is
  'Cola de intención de sincronización a GHL (contracts/DATA.md SyncJob). Un worker reclama por (status, next_at).';

create index if not exists atacama_sync_jobs_claim_idx
  on public.atacama_sync_jobs (status, next_at);

alter table public.atacama_lead_submissions enable row level security;
alter table public.atacama_sync_jobs enable row level security;

-- Sin policies para anon/authenticated a propósito: SECURITY.md exige
-- "Denegar a anon SELECT de leads... y comandos". El servidor Next.js
-- (API route /api/leads) usa SUPABASE_SERVER_KEY (service_role, bypassa
-- RLS) para insertar LeadSubmission + SyncJob en una misma transacción.
-- Nadie más puede leer ni escribir estas tablas directamente.
