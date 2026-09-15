-- 003 — soporte para el motor de prospección de Atacama (workflows nuevos
-- en n8n, no tocan nada de EnBandeja). SOLO ADITIVO + un UPDATE del propio
-- registro de icp_packs que yo mismo inserté en 002 (no es dato existente
-- de EnBandeja, es config de Atacama pendiente de completar).
-- NO APLICADA TODAVIA (Supabase en mantenimiento al escribir esto).

-- 1. Completar la config del pack 'atacama-labs' (fila propia de 002/1.2,
--    JSONB vacío '{}' hasta ahora). No se toca ninguna fila de EnBandeja.
update public.icp_packs
set
  discovery = '{
    "open_sources": [{
      "query_templates": [
        "empresas de servicios en {area}",
        "pymes {area} Antofagasta",
        "empresas operacion logistica {area}",
        "consultoras y servicios empresariales {area}"
      ]
    }],
    "result_filter": {
      "positive_pattern": "(empresa|servicios|consultora|operaciones|logistica|distribuidora|ingenieria|comercial|industrial)",
      "negative_pattern": "(coleg|escuela|liceo|universidad|iglesia|hospital|clinica|municipalidad|restaurant|cafe|peluqueria|gimnasio)"
    }
  }'::jsonb,
  research_vocabulary = '{
    "factors": ["pain", "budget_proxy", "volume", "automation", "access", "urgency", "fit"],
    "prompt_context": "Empresa B2B en la Region de Antofagasta, Chile. Buscamos evidencia de: procesos manuales/repetitivos (dolor), tamano/capacidad de inversion estimada, volumen o recurrencia de operacion, potencial de automatizacion de sus procesos comerciales u operativos, acceso a un decisor/canal de contacto, señales de urgencia o intencion de compra reciente, y encaje con software/sistemas/automatizacion (no fabricacion fisica, no requiere hardware)."
  }'::jsonb,
  signals = '{
    "types": ["hiring_ops_role", "website_redesign_recent", "news_mention", "new_location_or_expansion"]
  }'::jsonb,
  qualification = '{
    "factor_weights": {"pain":20,"budgetProxy":15,"volume":15,"automation":15,"access":10,"urgency":10,"fit":15},
    "thresholds": {"A":80,"B":60},
    "evidence_age_days": 90,
    "urgency_age_days": 30,
    "human_review_required": true,
    "operator_required": false
  }'::jsonb,
  crm = '{
    "pipeline_id": "trSWhAcNDyUMmPlYIEib",
    "new_stage_id": "aad0ad01-bffd-4ea9-b00c-7ab11dc941f6",
    "fields": {
      "fuente": "Vc1cfrhuq3KCiBdzzmnf",
      "solucion_de_interes": "yY5sqFov8GeXcx5G9vuy",
      "lead_id": "QWSU0Zop89wOamQwBeme"
    }
  }'::jsonb
where slug = 'atacama-labs';

-- 2. Extender sync_jobs (generico, ya usado por 002) para que tambien
--    pueda originarse en un prospect calificado (003), no solo en un
--    lead_submission inbound (002). Columna nueva nullable, aditiva.
alter table public.sync_jobs
  add column if not exists prospect_id uuid references public.prospects(id);

comment on column public.sync_jobs.prospect_id is
  'Alternativa a lead_submission_id: sync_job originado por un prospect calificado (003). Exactamente uno de los dos deberia estar seteado.';

-- 3. claim_sync_jobs generalizado: reclama jobs de CUALQUIER origen
--    (lead_submission o prospect) del pack, misma garantia atomica de
--    antes (FOR UPDATE SKIP LOCKED + recuperacion de 'processing' > 5min).
--
--    IMPORTANTE: la version anterior tiene firma (text, int) -- 2 parametros.
--    Esta version agrega un 3er parametro (p_source_type). En Postgres,
--    CREATE OR REPLACE FUNCTION con distinta aridad NO reemplaza la funcion
--    existente: crea una sobrecarga nueva y deja DOS funciones coexistiendo.
--    El workflow n8n "Atacama Labs - 01 Lead Sync" llama a esta RPC via
--    PostgREST con notacion de parametros nombrados (2 argumentos) -- con
--    las dos sobrecargas presentes esa llamada queda ambigua y falla en
--    produccion. Por eso se elimina explicitamente la version de 2
--    parametros antes de crear la de 3 (que es retro-compatible: al llamar
--    solo con los 2 argumentos originales, p_source_type usa su default
--    null y el comportamiento es identico al de antes).
drop function if exists public.claim_sync_jobs(text, int);

create or replace function public.claim_sync_jobs(p_icp_pack_slug text, p_limit int default 5, p_source_type text default null)
returns table (
  job_id uuid,
  source_type text,
  lead_id uuid,
  name text,
  company text,
  email text,
  phone text,
  message text,
  solution text,
  source text,
  ghl_contact_id text,
  ghl_opportunity_id text,
  attempts int
)
language plpgsql
set search_path = public
as $$
declare
  v_pack_id uuid;
begin
  select icp_packs.id into v_pack_id from public.icp_packs where slug = p_icp_pack_slug;
  if v_pack_id is null then
    return;
  end if;

  return query
    with claimed as (
      update public.sync_jobs sj
      set status = 'processing', updated_at = now()
      where sj.id in (
        select id from public.sync_jobs
        where icp_pack_id = v_pack_id
          and (
            (status in ('pending', 'retry_wait') and next_at <= now())
            or (status = 'processing' and updated_at < now() - interval '5 minutes')
          )
          and (
            p_source_type is null
            or (p_source_type = 'lead_submission' and lead_submission_id is not null)
            or (p_source_type = 'prospect' and prospect_id is not null)
          )
        order by next_at asc
        for update skip locked
        limit p_limit
      )
      returning sj.id, sj.lead_submission_id, sj.prospect_id, sj.attempts
    )
    select
      c.id,
      case when c.lead_submission_id is not null then 'lead_submission' else 'prospect' end,
      coalesce(ls.id, pr.id),
      coalesce(ls.name, ct.name, acc.name),
      coalesce(ls.company, acc.name),
      coalesce(ls.email, ct.email, acc.email_general),
      coalesce(ls.phone, ct.phone, acc.phone),
      coalesce(ls.message, 'Prospecto calificado por el motor de prospección (score ' || pr.final_score::text || ', ' || pr.classification || ').'),
      coalesce(ls.solution, 'unsure'),
      coalesce(ls.source, 'other_confirmed'),
      coalesce(ls.ghl_contact_id, pr.ghl_contact_id),
      coalesce(ls.ghl_opportunity_id, pr.ghl_opportunity_id),
      c.attempts
    from claimed c
    left join public.lead_submissions ls on ls.id = c.lead_submission_id
    left join public.prospects pr on pr.id = c.prospect_id
    left join public.accounts acc on acc.id = pr.account_id
    left join public.contacts ct on ct.id = pr.primary_contact_id;

  update public.lead_submissions
  set status = 'sync_pending'
  where id in (select lead_submission_id from public.sync_jobs where status = 'processing' and lead_submission_id is not null)
    and status = 'received';
end;
$$;

comment on function public.claim_sync_jobs is
  'Reclama sync_jobs (de lead_submission O prospect) pendientes o atascados de forma atomica. Reutilizado por Atacama Labs - 01 Lead Sync (002) y Atacama Labs - 04 CRM Sync (003).';

-- 4. complete_sync_job generalizado: cierra el job y actualiza la entidad
--    de origen correcta (lead_submission o prospect).
create or replace function public.complete_sync_job(
  p_job_id uuid,
  p_success boolean,
  p_error text default null,
  p_ghl_contact_id text default null,
  p_ghl_opportunity_id text default null
) returns void
language plpgsql
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_prospect_id uuid;
  v_attempts int;
begin
  select lead_submission_id, prospect_id, attempts into v_lead_id, v_prospect_id, v_attempts
  from public.sync_jobs where id = p_job_id;

  if v_lead_id is null and v_prospect_id is null then
    return;
  end if;

  if p_success then
    update public.sync_jobs
      set status = 'succeeded', updated_at = now(), last_error = null
      where id = p_job_id;
    if v_lead_id is not null then
      update public.lead_submissions
        set status = 'synced',
            ghl_contact_id = coalesce(p_ghl_contact_id, ghl_contact_id),
            ghl_opportunity_id = coalesce(p_ghl_opportunity_id, ghl_opportunity_id)
        where id = v_lead_id;
    else
      update public.prospects
        set ghl_contact_id = coalesce(p_ghl_contact_id, ghl_contact_id),
            ghl_opportunity_id = coalesce(p_ghl_opportunity_id, ghl_opportunity_id),
            status = 'contacted'
        where id = v_prospect_id;
    end if;
  else
    if v_attempts + 1 >= 4 then
      update public.sync_jobs
        set status = 'failed', attempts = v_attempts + 1,
            last_error = left(coalesce(p_error, 'unknown_error'), 500), updated_at = now()
        where id = p_job_id;
      if v_lead_id is not null then
        update public.lead_submissions set status = 'sync_failed' where id = v_lead_id;
      end if;
    else
      update public.sync_jobs
        set status = 'retry_wait',
            attempts = v_attempts + 1,
            next_at = now() + (case v_attempts + 1
              when 1 then interval '1 minute'
              when 2 then interval '5 minutes'
              when 3 then interval '15 minutes'
              else interval '60 minutes'
            end),
            last_error = left(coalesce(p_error, 'unknown_error'), 500),
            updated_at = now()
        where id = p_job_id;
    end if;
  end if;
end;
$$;

comment on function public.complete_sync_job is
  'Cierra un sync_job de cualquier origen (lead_submission o prospect), backoff 1/5/15/60min max 4 intentos.';

-- 5. Encolar un prospect aprobado para sync (llamada desde el workflow de
--    Qualification cuando el prospect queda listo para enviarse a GHL).
create or replace function public.enqueue_prospect_sync(p_prospect_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_icp_pack_id uuid;
  v_job_id uuid;
begin
  select icp_pack_id into v_icp_pack_id from public.prospects where id = p_prospect_id;
  if v_icp_pack_id is null then
    raise exception 'prospect % sin icp_pack_id', p_prospect_id;
  end if;

  insert into public.sync_jobs (icp_pack_id, prospect_id, event, destination, effect_key)
  values (v_icp_pack_id, p_prospect_id, 'prospect.approved', 'ghl', 'prospect:' || p_prospect_id::text)
  on conflict (effect_key) do nothing
  returning id into v_job_id;

  return v_job_id;
end;
$$;

comment on function public.enqueue_prospect_sync is
  'Crea (idempotente por effect_key) el sync_job para un prospect aprobado. Llamado por Atacama Labs - 03 Qualification.';
