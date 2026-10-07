-- Atacama OS · Bloque 2 (operación diaria automática) — 9-oct-2026
-- ops_alerts: alertas con deduplicación (una por clave; se vuelve a avisar solo si sigue abierta y es crítica, con tope).
-- ops_runs: registro liviano de corridas de jobs de Hermes (Prospect Radar, Content Radar, Daily) para compuerta de costo y salud.
-- Solo service_role (RLS sin políticas). No guarda secretos ni contenido de mensajes.

create table if not exists public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,                       -- p. ej. wf_down:23 · reply:<message_id> · hermes_job:<id> · publish_failed:<piece>
  severity text not null check (severity in ('critical', 'high', 'info')),
  title text not null,
  detail text,
  event boolean not null default false,                 -- true = evento puntual (respuesta recibida): se avisa una vez y se cierra
  status text not null default 'open' check (status in ('open', 'resolved')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_notified_at timestamptz,
  notify_count int not null default 0,
  resolved_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists ops_alerts_status_idx on public.ops_alerts (status, last_seen_at desc);

create table if not exists public.ops_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('prospect_radar', 'content_radar', 'daily', 'alerts', 'other')),
  status text not null default 'ok' check (status in ('ok', 'skipped', 'error')),
  summary jsonb not null default '{}'::jsonb,           -- {searches, pages_opened, candidates, imported, mode, reason, minutes}
  est_cost_usd numeric(8, 4),
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists ops_runs_kind_idx on public.ops_runs (kind, created_at desc);

alter table public.ops_alerts enable row level security;
alter table public.ops_runs enable row level security;
revoke all on public.ops_alerts from anon, authenticated;
revoke all on public.ops_runs from anon, authenticated;
