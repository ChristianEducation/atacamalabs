-- 002/2.3 — recuperación de jobs atascados en 'processing' (worker caído
-- a mitad de un job, sin llamar nunca a complete_sync_job).
-- SOLO ADITIVO: reemplaza el cuerpo de claim_sync_jobs (mismo nombre y
-- firma, create or replace) para que también reclame jobs 'processing'
-- con updated_at de hace más de 5 minutos, tratándolos como abandonados.
-- No aplicada todavía (MCP de Supabase caído al momento de escribir esto,
-- 2026-09-15) — aplicar con apply_migration en cuanto el conector responda.

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
          and (
            (status in ('pending', 'retry_wait') and next_at <= now())
            or (status = 'processing' and updated_at < now() - interval '5 minutes')
          )
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
  'Reclama sync_jobs pendientes o atascados (processing > 5 min = worker caído) de forma atómica. Llamado por el worker n8n.';
