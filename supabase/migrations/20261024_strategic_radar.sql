-- Atacama OS · Radar estratégico — SPEC-ATACAMA-OS-RADAR-ESTRATEGICO-v1.md §5 y §17.1.
-- ADITIVO e idempotente: 6 tablas nuevas `strategic_*`, sin tocar tablas, triggers ni funciones existentes.
-- Todo nace APAGADO (strategic_radar_config en false) y SIN políticas: RLS encendido + revoke a anon/authenticated (solo la llave de servicio, vía n8n).
-- Rollback: dejar las tablas inactivas; borrarlas solo si están vacías o hay respaldo validado y autorización humana.
-- NO aplicada en ningún servidor: aplicar es una parada humana (spec F7 paso 1).

-- 1) Configuración (fila única, todo false) -----------------------------------------------------------------------------------
create table if not exists public.strategic_radar_config (
  id int primary key default 1 constraint strategic_radar_config_single check (id = 1),
  production_enabled boolean not null default false,
  products_enabled boolean not null default false,
  partners_enabled boolean not null default false,
  events_enabled boolean not null default false,
  telegram_noncritical_enabled boolean not null default false,
  daily_max_items int not null default 3 constraint strategic_radar_config_daily_max check (daily_max_items between 0 and 3),
  ai_max_items_per_run int not null default 12 constraint strategic_radar_config_ai_max check (ai_max_items_per_run between 1 and 20),
  updated_at timestamptz not null default now()
);
insert into public.strategic_radar_config (id) values (1) on conflict (id) do nothing;

-- 2) Producción: servicios propios por verificar / confirmados ----------------------------------------------------------------
create table if not exists public.strategic_prod_targets (
  id uuid primary key default gen_random_uuid(),
  logical_name text not null,
  repo_full_name text,
  repo_branch text,
  deployment_url text,
  health_url text,
  provider text,
  status text not null default 'candidate' constraint strategic_prod_targets_status check (status in ('candidate','confirmed','paused','retired')),
  monitor_enabled boolean not null default false,
  verified_by text,
  verified_at timestamptz,
  notes text,
  last_deploy_sha text,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategic_prod_targets_monitor_needs_confirm check (monitor_enabled = false or (status = 'confirmed' and verified_at is not null and health_url is not null)),
  constraint strategic_prod_targets_name_test unique (logical_name, is_test)
);

-- 3) Producción: observaciones HTTP ----------------------------------------------------------------------------------------------
create table if not exists public.strategic_prod_checks (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.strategic_prod_targets(id) on delete restrict,
  checked_at timestamptz not null default now(),
  result text not null constraint strategic_prod_checks_result check (result in ('healthy','degraded','down','unknown')),
  http_status int constraint strategic_prod_checks_http check (http_status between 100 and 599),
  latency_ms int constraint strategic_prod_checks_latency check (latency_ms >= 0),
  error_code text,
  observed_sha text,
  evidence_url text,
  is_test boolean not null default false
);
create index if not exists strategic_prod_checks_target_time on public.strategic_prod_checks (target_id, checked_at desc);
create index if not exists strategic_prod_checks_result_time on public.strategic_prod_checks (result, checked_at desc);

-- 4) Oportunidades: producto, alianza, evento (producción va en targets) ------------------------------------------------------
create table if not exists public.strategic_opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null constraint strategic_opportunities_kind check (kind in ('product','partner','event')),
  fingerprint text not null constraint strategic_opportunities_fp_unique unique constraint strategic_opportunities_fp_hex check (fingerprint ~ '^[a-f0-9]{64}$'),
  title text not null,
  organization text,
  canonical_url text not null,
  summary text not null,
  business_case text not null,
  target_customer text,
  next_action text not null,
  status text not null default 'new' constraint strategic_opportunities_status check (status in ('new','shortlisted','working','dismissed','expired')),
  score int constraint strategic_opportunities_score check (score between 0 and 100),
  score_parts jsonb not null default '{}'::jsonb,
  confidence text not null default 'low' constraint strategic_opportunities_confidence check (confidence in ('low','medium','high')),
  license_id text,
  license_verified boolean not null default false,
  coverage_pct int constraint strategic_opportunities_coverage check (coverage_pct between 0 and 100),
  critical_blockers jsonb not null default '[]'::jsonb,
  event_start_at timestamptz,
  event_end_at timestamptz,
  deadline_at timestamptz,
  event_timezone text,
  event_location text,
  event_format text,
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  decision_at timestamptz,
  decision_by text,
  decision_reason text,
  last_daily_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategic_opportunities_license_needs_id check (kind <> 'product' or license_verified = false or license_id is not null)
);
create index if not exists strategic_opportunities_kind_status_score on public.strategic_opportunities (kind, status, score desc);
create index if not exists strategic_opportunities_deadline on public.strategic_opportunities (deadline_at);
create index if not exists strategic_opportunities_checked on public.strategic_opportunities (last_checked_at desc);

-- 5) Evidencia (nunca se borra en cascada) ------------------------------------------------------------------------------------
create table if not exists public.strategic_evidence (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.strategic_opportunities(id) on delete restrict,
  source_url text not null,
  source_title text not null,
  source_type text not null constraint strategic_evidence_source_type check (source_type in ('official','repository','documentation','secondary')),
  claim text not null,
  excerpt text,
  source_published_at timestamptz,
  verified_at timestamptz not null default now(),
  is_test boolean not null default false,
  constraint strategic_evidence_unique unique (opportunity_id, source_url, claim)
);
create index if not exists strategic_evidence_opp_time on public.strategic_evidence (opportunity_id, verified_at desc);

-- 6) Corridas de investigación / monitoreo ------------------------------------------------------------------------------------
create table if not exists public.strategic_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null constraint strategic_runs_kind check (kind in ('production','products','partners','events')),
  trigger text not null constraint strategic_runs_trigger check (trigger in ('manual','cron','test')),
  status text not null constraint strategic_runs_status check (status in ('ok','partial','blocked','failed')),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  scanned_count int not null default 0,
  accepted_count int not null default 0,
  duplicate_count int not null default 0,
  failed_count int not null default 0,
  error_code text,
  is_test boolean not null default false
);
create index if not exists strategic_runs_kind_finished on public.strategic_runs (kind, finished_at desc);

-- 7) Inventario inicial por verificar (§17.1): NO son evidencia de producción ni autorización para ping ---------------------
insert into public.strategic_prod_targets (logical_name, repo_full_name, notes) values
  ('Atacama Labs / OS', 'ChristianEducation/atacamalabs', 'Código identificado; confirmar deployment y health endpoint'),
  ('Librería Crecer', 'ChristianEducation/LibreriaCrecer', 'Repositorio candidato; verificar correspondencia con producción'),
  ('Pedidos Empresas', null, 'Múltiples repos candidatos: AppPedidosEmpresas, PedidosEmpresasDFS, PedidosEmpresasNuevo; confirmar cuál se despliega'),
  ('Registro Almuerzos', 'ChristianEducation/PlataformaAlmuerzosSanLuis', 'Repositorio candidato; confirmar correspondencia con producción'),
  ('Casino Escolar', null, 'Múltiples repos candidatos: casinoescolar, casinoescolar-1, CasinoAppWeb; confirmar cuál se despliega')
on conflict (logical_name, is_test) do nothing;

-- 8) Seguridad: solo la llave de servicio (como ops_alerts / operator_audit_log). Sin SECURITY DEFINER, sin RPC, sin vistas. -----
do $$
declare t text;
begin
  foreach t in array array['strategic_radar_config','strategic_prod_targets','strategic_prod_checks','strategic_opportunities','strategic_evidence','strategic_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
