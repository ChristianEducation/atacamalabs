-- Atacama OS · Bloque G — la sincronización con GHL ya no marca al prospecto como "contacted" (2026-10-05)
-- Hallazgo del test end-to-end: complete_sync_job fijaba prospects.status = 'contacted' al crear el contacto/
-- oportunidad en GHL. Pero un prospecto aprobado entra al CRM en la etapa "Investigado" y todavía nadie lo contactó.
-- Ahora la sincronización solo guarda los ids de GHL; el estado queda en ready_to_contact y 'contacted'
-- lo fija una acción comercial real. La rama de lead_submissions (formulario web) no cambia.
-- Rollback: restaurar la versión de 20260915_atacama_prospecting_engine.sql (sección 4), que agrega "status = 'contacted'".

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
            last_activity_at = now()
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
