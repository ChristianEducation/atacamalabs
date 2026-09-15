-- 002-operationalize-commercial-system, tarea 1.3/2.1 — REQ-CRM-002
-- Captura durable de leads (formulario /contacto) + intención de sync a GHL,
-- diseñada para el motor horizontal ya existente en este proyecto
-- (icp_packs/accounts), NO como tablas acopladas a Atacama.
--
-- Revisado contra el esquema real (list_tables verbose, 2026-09-15):
-- icp_packs es el mecanismo de registro multi-vertical ya usado por
-- accounts/schools/operators/prospects/signals/runs. lead_submissions y
-- sync_jobs son conceptos que HOY no existen (leads es específico de la
-- landing enbandeja.app: cantidad_colegios, tiene_cafeteria, etc. — no
-- reutilizable). Nombres genéricos a propósito para que un futuro vertical
-- los reutilice con su propio icp_pack_id, igual que ya hacen las demás
-- tablas horizontales.
--
-- SOLO ADITIVO: nuevas tablas, columnas, índices, FKs, policies e INSERT
-- de un registro nuevo en icp_packs. Nada existente se toca, renombra,
-- ni cambia de restricción. NO APLICADA TODAVIA — pendiente de revisión.

-- 1. Registrar el vertical Atacama en el mecanismo multiempresa existente.
insert into public.icp_packs (slug, name, description, status, version)
values (
  'atacama-labs',
  'Atacama Labs',
  'Software, sistemas y automatización para empresas — captación web directa (no motor de prospección 003 todavía).',
  'active',
  '1'
)
on conflict (slug) do nothing;

-- 2. Captura durable del formulario (contracts/DATA.md LeadSubmission).
create table if not exists public.lead_submissions (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null references public.icp_packs(id),
  account_id uuid references public.accounts(id), -- nullable: resolución posterior opcional, no se fuerza en V1
  idempotency_key text not null,
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
  constraint lead_submissions_contact_chk check (email is not null or phone is not null),
  -- "idempotency_key única por scope" (contracts/DATA.md) = por icp_pack_id, no global:
  -- así un futuro vertical no colisiona con las claves de otro.
  constraint lead_submissions_idempotency_scope_uq unique (icp_pack_id, idempotency_key)
);

comment on table public.lead_submissions is
  'Recepción durable de formularios de contacto, genérica por icp_pack_id. Primer uso: Atacama Labs (/contacto). Inmutable tras creación.';

create index if not exists lead_submissions_icp_pack_idx
  on public.lead_submissions (icp_pack_id, created_at desc);

-- 3. Cola de intención de sincronización (contracts/DATA.md SyncJob).
create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null references public.icp_packs(id),
  lead_submission_id uuid references public.lead_submissions(id),
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

comment on table public.sync_jobs is
  'Cola genérica de intención de sincronización a un destino (hoy: GHL). Un worker reclama por (status, next_at). Genérica por icp_pack_id, no acoplada a un vertical.';

create index if not exists sync_jobs_claim_idx
  on public.sync_jobs (status, next_at);

create index if not exists sync_jobs_icp_pack_idx
  on public.sync_jobs (icp_pack_id, created_at desc);

-- 4. RLS: activo en ambas, sin policies para anon/authenticated a propósito.
-- SECURITY.md exige "denegar a anon SELECT de leads... y comandos". El
-- servidor Next.js (API route /api/leads) usa SUPABASE_SERVER_KEY
-- (service_role, bypassa RLS) para insertar en una misma transacción.
alter table public.lead_submissions enable row level security;
alter table public.sync_jobs enable row level security;
