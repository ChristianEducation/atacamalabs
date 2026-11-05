-- Atacama OS · Content Engine — señales de Hermes (content-radar) y sincronización GHL → Supabase (6-oct-2026)

-- Señales: cada fuente puede ser una señal evaluada por el gate de señales (scripts/content/signal-core.mjs).
alter table public.content_sources
  add column if not exists signal_type text check (signal_type in ('news', 'competitor', 'founder', 'customer-question', 'evergreen', 'real-work')),
  add column if not exists signal jsonb not null default '{}'::jsonb,            -- why_it_matters, angle, audience, channel_suggestion, confidence, factors, quote, date, source
  add column if not exists signal_score int check (signal_score between 0 and 100),
  add column if not exists signal_status text not null default 'new' check (signal_status in ('new', 'rejected', 'held', 'candidate', 'used')),
  add column if not exists reject_reasons text[] not null default '{}',
  add column if not exists quote_found boolean,
  add column if not exists http_status int,
  add column if not exists source_date date,
  add column if not exists checked_at timestamptz;

create index if not exists content_sources_signal_idx on public.content_sources (icp_pack_id, signal_status, signal_score desc);

-- Sincronización con GHL Social Planner: refleja el estado real del post sin convertir a Supabase en la fuente de verdad.
alter table public.content_pieces
  add column if not exists ghl_status text,                 -- draft | in_review | scheduled | published | failed | deleted (tal cual lo devuelve GHL)
  add column if not exists ghl_approval_status text,        -- pending | approved | rejected (postApprovalDetails.approvalStatus)
  add column if not exists scheduled_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists synced_at timestamptz;

comment on column public.content_pieces.ghl_status is 'Estado del post en GHL Social Planner en la última sincronización (workflow 14).';

-- La sincronización puede marcar piezas cuyo post falló al publicarse.
alter table public.content_pieces drop constraint if exists content_pieces_status_check;
alter table public.content_pieces add constraint content_pieces_status_check check (status in
  ('idea', 'scored', 'rejected', 'drafted', 'rendered', 'in_review', 'approved', 'scheduled', 'published', 'failed', 'discarded'));
