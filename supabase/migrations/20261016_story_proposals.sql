-- Atacama OS · reglas de historias v1.1 (fuente de verdad de Christian, brand/content/ATACAMA-LABS-REGLAS-HISTORIAS-INSTAGRAM.md).
-- Propuesta diaria de historias: 0–3 por día, tipo por historia, decisión editorial y NOTAS manuales (repost del feed, stickers) para Christian.
create table if not exists public.story_proposals (
  id uuid primary key default gen_random_uuid(),
  for_date date not null unique,
  decision text not null,
  story_count int not null default 0 check (story_count between 0 and 6),
  items jsonb not null default '[]'::jsonb,
  manual_notes jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','done','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.story_proposals enable row level security;
alter table public.ops_runs drop constraint if exists ops_runs_kind_check;
alter table public.ops_runs add constraint ops_runs_kind_check
  check (kind = any (array['prospect_radar','content_radar','daily','alerts','other','content_rss','competitor_intel','content_pieces','contact_prep','ig_week','story_day']));
