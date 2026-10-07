-- Atacama OS · Hermes como operador (7-oct-2026)
-- Auditoría de cada acción que Hermes ejecuta en nombre de Christian y conjunto de trabajo del último análisis numerado.
-- NO es una segunda base de prospectos: los prospectos siguen viviendo solo en `prospect_candidates`.

create table if not exists public.operator_audit_log (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,                   -- idempotencia: un reintento recibe la respuesta guardada
  actor text not null,                               -- «Christian vía Hermes»
  tool text not null,
  level int not null check (level between 1 and 3),  -- 1 directo · 2 exige orden explícita · 3 exige confirmación (hoy no ejecuta)
  entity jsonb not null default '{}'::jsonb,         -- entidad afectada (prospecto, lote, oportunidad…)
  params jsonb not null default '{}'::jsonb,         -- parámetros saneados (sin contenido de archivos)
  status text not null,                              -- executed | refused | needs_explicit_order | confirmation_required | not_enabled | error | not_found | ambiguous
  result_summary text,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operator_audit_log_created_idx on public.operator_audit_log (created_at desc);
create index if not exists operator_audit_log_tool_idx on public.operator_audit_log (tool, created_at desc);

create table if not exists public.operator_analysis_cache (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  source jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '[]'::jsonb,     -- candidatos canónicos del último análisis (para «mete la empresa 27»)
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operator_analysis_cache_created_idx on public.operator_analysis_cache (created_at desc);

alter table public.operator_audit_log enable row level security;
alter table public.operator_analysis_cache enable row level security;
revoke all on public.operator_audit_log from anon, authenticated;
revoke all on public.operator_analysis_cache from anon, authenticated;
