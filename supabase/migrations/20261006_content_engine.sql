-- Atacama OS · Content Engine MVP (6-oct-2026)
-- Dos tablas mínimas: fuentes verificables y piezas de contenido. GHL Social Planner NO es la base de
-- conocimiento: solo calendario, revisión, aprobación y publicación. Acceso solo con service_role (RLS sin políticas).

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null references public.icp_packs(id),
  source_key text not null,                      -- clave de deduplicación (p. ej. 'url:<sha1>' o 'real:<slug>')
  kind text not null check (kind in ('hermes_research', 'real_work', 'evergreen', 'manual')),
  title text not null,
  url text,
  summary text,
  evidence jsonb not null default '[]'::jsonb,   -- [{url, quote, verified_at}]
  verified boolean not null default false,       -- una afirmación factual externa exige verified=true
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint content_sources_key_uq unique (icp_pack_id, source_key)
);

create table if not exists public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null references public.icp_packs(id),
  idea_key text not null,                        -- anti-repetición (hash de tema+ángulo+canal)
  source_ids uuid[] not null default '{}',
  topic text not null,
  angle text,
  audience text,
  channel text not null check (channel in ('instagram', 'linkedin_page', 'linkedin_profile')),
  format text not null check (format in ('texto', 'imagen', 'carrusel', 'demo', 'reel')),
  category text check (category in ('Educativo', 'Caso', 'Demo', 'Noticia', 'Evergreen', 'Founder')),
  score int check (score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  rationale text,
  evidence_urls text[] not null default '{}',
  piece jsonb,                                   -- JSON canónico de la pieza (docs/ATACAMA-OS-IMPLEMENTATION.md, Bloque H)
  status text not null default 'idea' check (status in
    ('idea', 'scored', 'rejected', 'drafted', 'rendered', 'in_review', 'approved', 'scheduled', 'published', 'discarded')),
  ghl_account_id text,
  ghl_post_id text,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_pieces_idea_uq unique (icp_pack_id, idea_key)
);

create index if not exists content_pieces_status_idx on public.content_pieces (icp_pack_id, status, created_at desc);

alter table public.content_sources enable row level security;
alter table public.content_pieces enable row level security;

comment on table public.content_sources is 'Fuentes de contenido de Atacama OS (Hermes, trabajo real, evergreen). Sin política: solo service_role.';
comment on table public.content_pieces is 'Ideas y piezas de contenido con score, JSON canónico y vínculo a GHL Social Planner (ghl_post_id). Sin política: solo service_role.';
