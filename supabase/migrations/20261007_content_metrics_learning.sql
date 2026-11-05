-- Atacama OS · Content Engine — aprobación, métricas por ventana (24 h / 72 h / 7 d) y aprendizaje (7-oct-2026)

-- 1) Ciclo de aprobación observable desde GHL (la fuente de verdad sigue siendo el post de Social Planner).
alter table public.content_pieces
  add column if not exists approved_at timestamptz,        -- fecha de aprobación SOLO si GHL la expone en el post
  add column if not exists approved_seen_at timestamptz,   -- primera sincronización en que se vio aprobado/programado tras estar en revisión
  add column if not exists ghl_summary_hash text,          -- hash del texto enviado a GHL (para detectar edición humana)
  add column if not exists ghl_edited boolean not null default false,
  add column if not exists ghl_edited_seen_at timestamptz,
  add column if not exists learning jsonb,                 -- aprendizaje estructurado generado a los 7 días
  add column if not exists learned_at timestamptz;

create index if not exists content_pieces_published_idx on public.content_pieces (icp_pack_id, published_at) where status = 'published';
create index if not exists content_pieces_learning_idx on public.content_pieces (icp_pack_id, learned_at desc) where learning is not null;

-- 2) Snapshots de métricas: una fila por pieza y ventana (nunca se repite una ventana).
create table if not exists public.content_metrics (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null,
  content_piece_id uuid not null references public.content_pieces (id) on delete cascade,
  ghl_post_id text not null,
  platform text not null check (platform in ('instagram', 'linkedin')),
  account_id text not null,                                 -- id de la cuenta en GHL (`id`, no `profileId`)
  metric_window text not null check (metric_window in ('24h', '72h', '7d')),
  due_at timestamptz not null,                              -- published_at + ventana
  captured_at timestamptz not null default now(),
  hours_since_published numeric(8, 2),
  late boolean not null default false,                      -- capturado fuera de la tolerancia de la ventana
  status text not null default 'ok' check (status in ('ok', 'partial', 'error')),
  error text,
  -- Por publicación (GHL `post.insights`): solo lo que GHL entrega de verdad
  likes int,
  comments int,
  shares int,
  -- Por CUENTA (GHL `statistics`, últimos 7 días al momento de capturar): contexto, NO atribuible a una sola publicación
  account_impressions_7d int,
  account_reach_7d int,
  account_followers int,
  account_posts_7d int,
  raw_metrics jsonb not null default '{}'::jsonb,           -- insights del post + estadísticas de cuenta tal cual llegaron
  unique (content_piece_id, metric_window)
);

create index if not exists content_metrics_piece_idx on public.content_metrics (content_piece_id, metric_window);

-- Sin exposición pública: RLS activado y sin políticas (solo service_role, igual que content_sources / content_pieces).
alter table public.content_metrics enable row level security;
revoke all on public.content_metrics from anon, authenticated;

comment on table public.content_metrics is 'Snapshots 24h/72h/7d por publicación. likes/comments/shares vienen del post; account_* son estadísticas de la cuenta (no de la publicación).';
