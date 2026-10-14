-- Atacama OS v3 · Fase 1 (cimientos) — spec SPEC-ATACAMA-OS-V3-TALLER-Y-CORREO.md §9 + anexo §B.
-- Todo ADITIVO y reversible: tablas nuevas, columnas nuevas con default, bucket privado. No toca tablas de EnBandeja ni borra/renombra nada.
-- Acceso: RLS encendido y sin políticas (solo la llave de servicio, como ops_alerts/operator_audit_log); además se revoca anon/authenticated.

-- 1) Pausa general (fila única) -----------------------------------------------------------------------------------------
create table if not exists public.system_state (
  id int primary key default 1 check (id = 1),
  global_pause boolean not null default false,
  reason text,
  paused_at timestamptz,
  paused_by text,
  resume_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.system_state (id) values (1) on conflict (id) do nothing;

-- 2) Ideas de la semana (§6.1, ficha de 12 campos) ------------------------------------------------------------------------
create table if not exists public.content_idea_batches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null check (extract(isodow from week_start) = 1),
  created_by text not null default 'hermes',
  proposed int not null default 0 check (proposed >= 0),
  discarded_weak int not null default 0 check (discarded_weak >= 0),
  discarded jsonb not null default '[]'::jsonb,
  notes text,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists content_idea_batches_week on public.content_idea_batches (week_start, created_at desc);

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  week_start date not null check (extract(isodow from week_start) = 1),
  channel text not null check (channel in ('instagram','linkedin_page','linkedin_profile')),
  format text not null check (format in ('texto','imagen','carrusel','demo','reel','historia')),
  title text not null check (char_length(title) between 3 and 200),
  hook text,
  angle text,
  why text,
  source_ids uuid[] not null default '{}',
  evidence jsonb not null default '[]'::jsonb,
  competitor_ref text,
  objective text check (objective in ('alcance','autoridad','conversaciones','leads','recurso','servicio','educar')),
  audience_insight text,
  core_message text,
  structure jsonb not null default '[]'::jsonb,
  cta text,
  production jsonb not null default '{}'::jsonb,
  cost_note text,
  risks text,
  primary_metric text check (primary_metric in ('reach','watch_time','saves','profile_visits','intent_comments','dms','leads')),
  ficha_complete boolean not null default false,
  resource_id uuid references public.content_resources(id) on delete set null,
  keyword text,
  effort text check (effort in ('bajo','medio','alto')),
  score int check (score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  rank int,
  status text not null default 'proposed' check (status in ('proposed','approved','changed','discarded','in_production','scheduled','published')),
  change_request text,
  decision_reason text,
  decision_chips text[] not null default '{}',
  origin text not null default 'hermes' check (origin in ('hermes','christian')),
  batch_id uuid references public.content_idea_batches(id) on delete set null,
  parent_idea_id uuid references public.content_ideas(id) on delete set null,
  piece_id uuid references public.content_pieces(id) on delete set null,
  history jsonb not null default '[]'::jsonb,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create index if not exists content_ideas_week_channel_status on public.content_ideas (week_start, channel, status);

-- 3) Taller: versiones y feedback (§6.2) -----------------------------------------------------------------------------------
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.content_pieces(id) on delete cascade,
  version_no int not null check (version_no >= 1),
  kind text not null check (kind in ('carrusel','reel','imagen','historia','texto')),
  assets jsonb not null default '[]'::jsonb,
  caption text,
  lane text not null check (lane in ('vps','pc')),
  qa jsonb not null default '{}'::jsonb,
  attempts int not null default 0 check (attempts >= 0),
  created_by text not null,
  notes text,
  cost_credits numeric(10,2) not null default 0 check (cost_credits >= 0),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  unique (piece_id, version_no)
);
create index if not exists content_versions_piece_version on public.content_versions (piece_id, version_no);

create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.content_pieces(id) on delete cascade,
  version_id uuid references public.content_versions(id) on delete set null,
  scope text not null default 'global' check (scope ~ '^(global|lamina [0-9]{1,2})$'),
  text text not null check (char_length(text) between 1 and 2000),
  status text not null default 'open' check (status in ('open','done')),
  author text not null default 'Christian',
  resolved_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists content_feedback_piece on public.content_feedback (piece_id, status);

-- 4) Aprendizaje (§8.2) ----------------------------------------------------------------------------------------------------
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('email_edit','idea_discard','piece_feedback','piece_ok')),
  subject_id text,
  before jsonb,
  after jsonb,
  reason text,
  by text not null default 'Christian',
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists learning_events_type_at on public.learning_events (type, created_at desc);

create table if not exists public.learning_proposals (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('playbook','evaluador','ranking','receta')),
  proposal text not null,
  evidence jsonb not null default '[]'::jsonb,
  sample_size int not null default 0,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  decided_at timestamptz,
  decided_by text,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5) Ampliaciones de tablas existentes (solo columnas nuevas con default) -------------------------------------------------
alter table public.content_pieces
  add column if not exists idea_id uuid references public.content_ideas(id) on delete set null,
  add column if not exists lane text check (lane in ('vps','pc')),
  add column if not exists taller_status text check (taller_status in ('en_cola','en_produccion','en_pc_con_claude','para_revisar','cambios_pedidos','lista','programada','programada_pendiente_de_clic','publicada','descartada','necesita_ayuda')),
  add column if not exists current_version int,
  add column if not exists needs_by timestamptz,
  add column if not exists credits_spent numeric(10,2) not null default 0,
  add column if not exists lead_contacts int;

alter table public.content_config
  add column if not exists ops_nav_v2 boolean not null default true;

alter table public.ops_runs drop constraint if exists ops_runs_kind_check;
alter table public.ops_runs add constraint ops_runs_kind_check
  check (kind = any (array['prospect_radar','content_radar','daily','alerts','other','content_rss','competitor_intel','content_pieces','contact_prep','ig_week','story_day','ideas_week','learning','taller_production']));

-- 6) Seguridad: solo la llave de servicio -----------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['system_state','content_idea_batches','content_ideas','content_versions','content_feedback','learning_events','learning_proposals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 7) Storage: bucket privado «taller» (versiones de piezas; URLs firmadas de 1 h; ruta <piece_id>/v<n>/<archivo>) ------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('taller', 'taller', false, 209715200, array['image/png','image/jpeg','image/webp','video/mp4','application/pdf'])
on conflict (id) do nothing;

-- 8) La pausa general detiene el envío de correos de forma ATÓMICA (aplicado como «os_v3_pausa_refleja_envio»):
--    al pasar global_pause a true se guarda el valor previo de outreach_config.paused en meta y se pone paused=true (el Sender 22 y los
--    Followups 24 ya lo respetan, sin tocar sus workflows); al reanudar se restaura el valor previo.
create or replace function public.system_state_sync_outreach_pause() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.global_pause and not coalesce(old.global_pause, false) then
    new.meta := coalesce(new.meta, '{}'::jsonb) || jsonb_build_object('prev_outreach_paused', coalesce((select paused from public.outreach_config where id = 1), false));
    update public.outreach_config set paused = true, updated_at = now() where id = 1;
  elsif not new.global_pause and coalesce(old.global_pause, false) then
    update public.outreach_config set paused = coalesce((old.meta->>'prev_outreach_paused')::boolean, false), updated_at = now() where id = 1;
  end if;
  return new;
end $$;
revoke all on function public.system_state_sync_outreach_pause() from public, anon, authenticated;
drop trigger if exists system_state_sync_outreach_pause on public.system_state;
create trigger system_state_sync_outreach_pause before update of global_pause on public.system_state
  for each row execute function public.system_state_sync_outreach_pause();

-- REVERSIÓN (en este orden; borra solo lo creado aquí):
--   drop trigger if exists system_state_sync_outreach_pause on public.system_state; drop function if exists public.system_state_sync_outreach_pause();
--   delete from storage.buckets where id = 'taller';            -- (vaciar antes sus objetos)
--   alter table public.content_pieces drop column if exists idea_id, drop column if exists lane, drop column if exists taller_status,
--     drop column if exists current_version, drop column if exists needs_by, drop column if exists credits_spent, drop column if exists lead_contacts;
--   alter table public.content_config drop column if exists ops_nav_v2;
--   drop table if exists public.learning_proposals, public.learning_events, public.content_feedback, public.content_versions,
--     public.content_ideas, public.content_idea_batches, public.system_state;
--   (ops_runs_kind_check: volver a la lista sin 'ideas_week','learning','taller_production')
