-- Atacama OS · Ola A (8-oct-2026): Founder Interview, RSS, Inteligencia orgánica de competencia, Recursos y Content Queue Governor.
-- Todo con RLS activo y sin políticas (solo service_role). Reutiliza content_sources / content_pieces.

-- ---------------------------------------------------------------- Configuración del Content (Queue Governor)
create table if not exists public.content_config (
  id int primary key default 1 check (id = 1),
  max_pending_in_review int not null default 6 check (max_pending_in_review between 1 and 50),
  rss_enabled boolean not null default true,
  competitor_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.content_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- RSS / Atom
create table if not exists public.content_feeds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  url text not null,
  topic text,
  priority int not null default 5 check (priority between 1 and 10),
  enabled boolean not null default true,
  last_checked_at timestamptz,
  last_status text check (last_status in ('ok', 'error')),
  last_error text,
  last_item_count int,
  consecutive_failures int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.content_feed_items (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.content_feeds(id) on delete cascade,
  item_hash text not null,
  title text not null,
  url text not null,
  summary text,
  published_at timestamptz,
  ingested_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'signal', 'ignored')),
  note text,
  signal_source_id uuid references public.content_sources(id) on delete set null,
  constraint content_feed_items_uq unique (feed_id, item_hash)
);
create index if not exists content_feed_items_status_idx on public.content_feed_items (status, published_at desc);

-- ---------------------------------------------------------------- Inteligencia orgánica de competencia (NO es Ads Radar)
create table if not exists public.content_competitors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text,
  urls text[] not null default '{}',
  notes text,
  enabled boolean not null default true,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.content_intel_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'competitor_organic' check (kind in ('competitor_organic')),
  run_id text not null unique,
  competitors_scanned text[] not null default '{}',
  report jsonb not null default '{}'::jsonb,      -- topics, saturated_topics, gaps, formats, hooks, offers, resources, own_angles
  signals_submitted int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Biblioteca de recursos (Resource & Conversation Engine v1)
create table if not exists public.content_resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  type text not null check (type in ('guia', 'checklist', 'plantilla', 'diagnostico', 'prompt', 'documento', 'comparativa', 'caso', 'herramienta', 'pagina')),
  topic text not null,
  audience text,
  problem text not null,
  cta_mode text not null default 'resource_link' check (cta_mode in ('resource_link', 'dm', 'diagnostic')),
  cta_copy text,
  url text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null default 'claude-code',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_pieces
  add column if not exists resource_id uuid references public.content_resources(id) on delete set null,
  add column if not exists cta_mode text check (cta_mode in ('none', 'resource_link', 'dm', 'diagnostic')),
  add column if not exists cta_copy text,
  add column if not exists origin text check (origin in ('autonomous', 'explicit', 'founder_interview')),
  add column if not exists interview_id uuid;

create index if not exists content_pieces_resource_idx on public.content_pieces (resource_id) where resource_id is not null;

-- ---------------------------------------------------------------- Founder Interview
create table if not exists public.founder_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  context text not null,                           -- el hecho REAL que motiva la pregunta (nunca una pregunta genérica)
  topic text,
  priority int not null default 5 check (priority between 1 and 10),
  status text not null default 'available' check (status in ('available', 'used', 'skipped')),
  created_by text not null default 'claude-code',
  created_at timestamptz not null default now()
);

create table if not exists public.founder_interviews (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.founder_questions(id) on delete set null,
  question text not null,
  context text,
  status text not null default 'asked' check (status in ('asked', 'answered', 'submitted', 'cancelled')),
  answer_text text,
  answer_source text check (answer_source in ('text', 'audio')),
  piece_ids uuid[] not null default '{}',
  is_test boolean not null default false,
  asked_at timestamptz not null default now(),
  answered_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists founder_interviews_status_idx on public.founder_interviews (status, asked_at desc);

alter table public.content_config enable row level security;
alter table public.content_feeds enable row level security;
alter table public.content_feed_items enable row level security;
alter table public.content_competitors enable row level security;
alter table public.content_intel_reports enable row level security;
alter table public.content_resources enable row level security;
alter table public.founder_questions enable row level security;
alter table public.founder_interviews enable row level security;

comment on table public.content_config is 'Ola A: configuración del Content (tope de piezas en revisión). Sin política: solo service_role.';
comment on table public.content_feeds is 'Ola A: fuentes RSS/Atom configurables del Content Radar.';
comment on table public.content_feed_items is 'Ola A: artículos detectados en los feeds (dedupe por feed_id + item_hash).';
comment on table public.content_competitors is 'Ola A: competidores/referentes para la inteligencia ORGÁNICA (fuentes públicas; no es Ads Radar).';
comment on table public.content_resources is 'Ola A: biblioteca de recursos reutilizables (atacamalabs.cl/recursos/...).';
comment on table public.founder_interviews is 'Ola A: entrevistas del fundador por Telegram (la IA estructura, no inventa vivencias).';

-- Relevancia (pista 0–10 calculada al ingerir) y slug del feed para los listados sin join.
alter table public.content_feed_items add column if not exists relevance int not null default 0 check (relevance between 0 and 10);
alter table public.content_feed_items add column if not exists feed_slug text;

-- ops_runs: nuevos tipos de corrida de los jobs de Ola A (RSS, inteligencia orgánica, generación de piezas).
alter table public.ops_runs drop constraint if exists ops_runs_kind_check;
alter table public.ops_runs add constraint ops_runs_kind_check check (kind in ('prospect_radar', 'content_radar', 'daily', 'alerts', 'other', 'content_rss', 'competitor_intel', 'content_pieces'));

-- /ops V2 · ritmo editorial semanal (regla persistente): objetivo 5/semana, mínimo sano 4, máximo normal 6, 1 publicación por cuenta y día, runway 3–5 días.
alter table public.content_config
  add column if not exists weekly_target int not null default 5 check (weekly_target between 1 and 14),
  add column if not exists weekly_min int not null default 4 check (weekly_min between 0 and 14),
  add column if not exists weekly_max int not null default 6 check (weekly_max between 1 and 14),
  add column if not exists max_per_account_day int not null default 1 check (max_per_account_day between 1 and 3),
  add column if not exists runway_min_days int not null default 3 check (runway_min_days between 0 and 30),
  add column if not exists runway_max_days int not null default 5 check (runway_max_days between 1 and 30);
