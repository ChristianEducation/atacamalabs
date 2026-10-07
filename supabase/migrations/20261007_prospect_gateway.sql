-- Atacama OS · Prospect Gateway / Universal Intake (7-oct-2026)
-- Capa universal de entrada de prospectos: cualquier fuente (Hermes, otras IAs, HTML/JSON/CSV, listas, URL, ingreso manual)
-- termina normalizada, deduplicada y puntuada en `prospect_candidates`. Las tablas `accounts/prospects/research` del camino
-- Hermes → 08 → 03 → 18 NO se tocan.

create table if not exists public.prospect_candidates (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null,
  candidate_key text not null,                         -- clave canónica estable: dominio → correo → teléfono → nombre+ubicación
  candidate_keys text[] not null default '{}',         -- todas las claves de identidad (dedupe)
  company_name text not null,
  domain text,
  website text,
  industry text,
  location text,
  source_type text not null default 'unknown',         -- hermes | ai | html | json | csv | text | url | manual | ...
  source_name text,
  source_reference text,
  batch_id text,                                       -- request_id que lo creó
  canonical jsonb not null default '{}'::jsonb,        -- ProspectCandidate completo (hechos / inferencias / hipótesis / contacto / borradores)
  fit_score int check (fit_score between 0 and 100),
  signal_score int check (signal_score between 0 and 100),
  reachability_score int check (reachability_score between 0 and 100),
  priority_score int check (priority_score between 0 and 100),
  band text check (band in ('alta', 'valida', 'pendiente', 'archivo')),
  flags text[] not null default '{}',
  external_score numeric,                              -- score de otra IA/fuente: SOLO referencia, no cuenta
  external_score_scale text,
  external_source text,
  status text not null default 'accepted' check (status in ('accepted', 'in_ghl', 'contacted', 'archived', 'discarded')),
  decision text,
  manual_override boolean not null default false,
  manual_override_by text,
  manual_override_reason text,
  ghl_contact_id text,
  ghl_opportunity_id text,
  ghl_stage text,
  last_contact_channel text,
  last_contact_at timestamptz,
  next_action_at timestamptz,
  drafts jsonb,                                        -- borradores preparados (nunca enviados)
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (icp_pack_id, candidate_key)
);

create index if not exists prospect_candidates_keys_idx on public.prospect_candidates using gin (candidate_keys);
create index if not exists prospect_candidates_status_idx on public.prospect_candidates (icp_pack_id, status, priority_score desc);

-- Bitácora e idempotencia: una fila por solicitud (request_id) con la respuesta devuelta; un reintento recibe la misma respuesta.
create table if not exists public.prospect_gateway_log (
  id uuid primary key default gen_random_uuid(),
  icp_pack_id uuid not null,
  request_id text not null,
  action text not null,
  source jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (icp_pack_id, request_id)
);

alter table public.prospect_candidates enable row level security;
alter table public.prospect_gateway_log enable row level security;
revoke all on public.prospect_candidates from anon, authenticated;
revoke all on public.prospect_gateway_log from anon, authenticated;

-- Búsqueda de coincidencias para el dedupe (una sola llamada): candidatos del Gateway + cuentas y contactos del camino Hermes.
create or replace function public.gateway_lookup(p_pack uuid, p_keys text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('system', 'supabase_candidate', 'id', c.id::text, 'keys', to_jsonb(c.candidate_keys),
      'info', jsonb_build_object('candidate_key', c.candidate_key, 'company', c.company_name, 'status', c.status, 'ghl_contact_id', c.ghl_contact_id,
        'ghl_opportunity_id', c.ghl_opportunity_id, 'ghl_stage', c.ghl_stage, 'canonical', c.canonical, 'manual_override', c.manual_override, 'priority_score', c.priority_score)) as x
    from prospect_candidates c where c.icp_pack_id = p_pack and c.candidate_keys && p_keys
    union all
    select jsonb_build_object('system', 'supabase_account', 'id', a.id::text, 'keys', jsonb_build_array('d:' || a.dedupe_key),
      'info', jsonb_build_object('company', a.name, 'domain', a.domain))
    from accounts a where a.icp_pack_id = p_pack and a.dedupe_key is not null and ('d:' || a.dedupe_key) = any (p_keys)
    union all
    select jsonb_build_object('system', 'supabase_contact', 'id', ct.id::text, 'keys', jsonb_build_array('e:' || lower(ct.email)),
      'info', jsonb_build_object('name', ct.name, 'account_id', ct.account_id::text))
    from contacts ct join accounts a on a.id = ct.account_id
    where a.icp_pack_id = p_pack and ct.email is not null and ('e:' || lower(ct.email)) = any (p_keys)
  ) t;
$$;

revoke all on function public.gateway_lookup(uuid, text[]) from public, anon, authenticated;
grant execute on function public.gateway_lookup(uuid, text[]) to service_role;

comment on table public.prospect_candidates is 'Prospect Gateway: ProspectCandidate canónico (cualquier fuente), normalizado, deduplicado y puntuado. El score externo es solo referencia.';
