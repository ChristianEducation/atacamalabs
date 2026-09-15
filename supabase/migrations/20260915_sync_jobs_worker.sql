-- 002/2.2 — soporte para el worker n8n que sincroniza sync_jobs -> GHL.
-- SOLO ADITIVO: 2 columnas nuevas + 2 funciones nuevas. Nada existente se
-- toca. Backoff 1/5/15/60 min, máx 4 intentos (docs/INTEGRATIONS.md).

alter table public.lead_submissions
  add column if not exists ghl_contact_id text,
  add column if not exists ghl_opportunity_id text;

-- Reclama hasta p_limit jobs listos para procesar, marcándolos 'processing'
-- atómicamente (FOR UPDATE SKIP LOCKED evita que dos corridas del worker
-- tomen el mismo job). Devuelve los datos del lead ya unidos, para que el
-- workflow n8n no necesite una segunda llamada.
create or replace function public.claim_sync_jobs(p_icp_pack_slug text, p_limit int default 5)
returns table (
  job_id uuid,
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
          and status in ('pending', 'retry_wait')
          and next_at <= now()
        order by next_at asc
        for update skip locked
        limit p_limit
      )
      returning sj.id, sj.lead_submission_id, sj.attempts
    )
    select
      c.id, ls.id, ls.name, ls.company, ls.email, ls.phone, ls.message,
      ls.solution, ls.source, ls.ghl_contact_id, ls.ghl_opportunity_id, c.attempts
    from claimed c
    join public.lead_submissions ls on ls.id = c.lead_submission_id;

  update public.lead_submissions
  set status = 'sync_pending'
  where id in (select lead_submission_id from public.sync_jobs where status = 'processing')
    and status = 'received';
end;
$$;

comment on function public.claim_sync_jobs is
  'Reclama sync_jobs pendientes de forma atómica (FOR UPDATE SKIP LOCKED) para un icp_pack. Llamado por el worker n8n.';

-- Cierra un job: éxito guarda los IDs de GHL; fallo aplica backoff
-- 1/5/15/60 min y marca failed tras 4 intentos.
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
  v_attempts int;
begin
  select lead_submission_id, attempts into v_lead_id, v_attempts
  from public.sync_jobs where id = p_job_id;

  if v_lead_id is null then
    return;
  end if;

  if p_success then
    update public.sync_jobs
      set status = 'succeeded', updated_at = now(), last_error = null
      where id = p_job_id;
    update public.lead_submissions
      set status = 'synced',
          ghl_contact_id = coalesce(p_ghl_contact_id, ghl_contact_id),
          ghl_opportunity_id = coalesce(p_ghl_opportunity_id, ghl_opportunity_id)
      where id = v_lead_id;
  else
    if v_attempts + 1 >= 4 then
      update public.sync_jobs
        set status = 'failed', attempts = v_attempts + 1,
            last_error = left(coalesce(p_error, 'unknown_error'), 500), updated_at = now()
        where id = p_job_id;
      update public.lead_submissions set status = 'sync_failed' where id = v_lead_id;
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
  'Cierra un sync_job (éxito o fallo con backoff 1/5/15/60min, máx 4 intentos). Llamado por el worker n8n al terminar cada job.';
