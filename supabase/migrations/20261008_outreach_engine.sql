-- Atacama OS · Bloque 1 (activación comercial) — motor de correo saliente/entrante (8-oct-2026)
-- Los prospectos siguen viviendo SOLO en `prospect_candidates`. Estas tablas guardan mensajes, supresión y configuración de envío.
-- No reutiliza la tabla vieja `outreach` (modelo EnBandeja, FK a `prospects`).

create table if not exists public.outreach_config (
  id int primary key default 1 check (id = 1),          -- una sola fila
  mode text not null default 'off' check (mode in ('off','dry_run','test_sim','live')),  -- off: nada se envía ni simula · dry_run: simula sin tocar GHL ni Gmail · test_sim: sin Gmail, aplica efectos en GHL SOLO a candidatos TEST · live: Gmail real. Solo Christian lo cambia (nunca Hermes)
  paused boolean not null default false,                 -- pausa de emergencia
  from_email text,
  from_name text default 'Christian Wevar',
  daily_cap int not null default 10,                     -- calentamiento: 5-10 al día
  window_start text not null default '09:00',
  window_end text not null default '17:30',
  tz text not null default 'America/Santiago',
  legal_footer text,                                     -- razón social / RUT / domicilio cuando existan
  followup_days int[] not null default '{3,7}',          -- días hábiles de cada seguimiento
  updated_at timestamptz not null default now()
);
insert into public.outreach_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.prospect_candidates(id) on delete set null,
  company_name text,
  ghl_contact_id text,
  ghl_opportunity_id text,
  kind text not null check (kind in ('initial','followup_1','followup_2','reply','other')),
  direction text not null default 'outbound' check (direction in ('outbound','inbound')),
  to_email text,
  from_email text,
  subject text,
  body text,
  content_hash text,                                      -- sha de destinatario+asunto+cuerpo: la aprobación solo vale para ESTE contenido
  status text not null default 'draft' check (status in ('draft','approved','sending','sent','failed','cancelled','received','dry_run')),
  confirm_code text,                                      -- código de confirmación emitido por el servidor (nivel 3)
  confirm_hash text,
  confirm_expires_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  approval_text text,                                     -- palabras de Christian al aprobar
  scheduled_for timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  gmail_thread_id text,
  rfc_message_id text,
  in_reply_to text,
  classification text,                                    -- inbound: reply | bounce | unsubscribe | auto_reply | other
  effect_key text unique,                                 -- send:<id> | recv:<gmail_message_id> → idempotencia
  error text,
  followup_task_id text,                                  -- tarea de GHL asociada (seguimientos)
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outreach_messages_candidate_idx on public.outreach_messages (candidate_id, created_at desc);
create index if not exists outreach_messages_status_idx on public.outreach_messages (status, scheduled_for);
create index if not exists outreach_messages_thread_idx on public.outreach_messages (gmail_thread_id);
-- como máximo UN mensaje vivo (borrador/aprobado/enviando) por candidato y tipo: evita borradores y envíos duplicados
create unique index if not exists outreach_messages_one_live_idx on public.outreach_messages (candidate_id, kind) where status in ('draft','approved','sending');

create table if not exists public.outreach_suppression (
  id uuid primary key default gen_random_uuid(),
  email text,
  domain text,
  reason text not null check (reason in ('unsubscribe','bounce','do_not_contact','discarded','complaint')),
  source text,
  candidate_id uuid,
  note text,
  created_at timestamptz not null default now(),
  check (email is not null or domain is not null)
);
-- índices únicos simples (PostgREST on_conflict=email|domain no puede usar índices parciales ni por expresión); los correos se guardan siempre en minúsculas
create unique index if not exists outreach_suppression_email_uq on public.outreach_suppression (email);
create unique index if not exists outreach_suppression_domain_uq on public.outreach_suppression (domain);

alter table public.outreach_config enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_suppression enable row level security;
revoke all on public.outreach_config from anon, authenticated;
revoke all on public.outreach_messages from anon, authenticated;
revoke all on public.outreach_suppression from anon, authenticated;
