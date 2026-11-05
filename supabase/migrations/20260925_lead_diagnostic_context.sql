-- Fase 2 Atacama Labs: contexto comercial del diagnóstico en lead_submissions.
-- Aditivo: no toca columnas existentes ni `status` (estado técnico:
-- received / sync_pending / synced / sync_failed).
-- Proyecto compartido con EnBandeja (uwquwjmiofixzugttals): solo se agrega.
--
-- Rollback (si hiciera falta): restaurar la firma anterior de
-- create_lead_submission (ver 20260915_lead_capture_rpc.sql) y
--   alter table public.lead_submissions drop column ... (las 13 nuevas).

alter table public.lead_submissions
  add column if not exists service text,
  add column if not exists plan text,
  add column if not exists interest text,
  add column if not exists source_page text,
  add column if not exists source_section text,
  add column if not exists source_cta text,
  add column if not exists campaign text,
  add column if not exists diagnostic_data jsonb not null default '{}'::jsonb,
  add column if not exists diagnostic_completed_at timestamptz,
  add column if not exists meeting_scheduled boolean not null default false,
  add column if not exists meeting_start timestamptz,
  add column if not exists calendar_event_id text,
  add column if not exists calendar_provider text;

alter table public.lead_submissions
  add constraint lead_submissions_service_chk
    check (service is null or service in ('agentes', 'a-medida', 'web', 'general')),
  add constraint lead_submissions_context_len_chk
    check (
      coalesce(length(plan), 0) <= 64
      and coalesce(length(interest), 0) <= 64
      and coalesce(length(source_page), 0) <= 64
      and coalesce(length(source_section), 0) <= 64
      and coalesce(length(source_cta), 0) <= 64
      and coalesce(length(campaign), 0) <= 64
    ),
  add constraint lead_submissions_diagnostic_data_chk
    check (jsonb_typeof(diagnostic_data) = 'object' and octet_length(diagnostic_data::text) <= 8000);

-- La firma se reemplaza en una sola migración. Los parámetros nuevos llevan
-- default: los llamadores existentes con parámetros nombrados (p. ej. la Edge
-- Function registrar-lead-nayra) siguen funcionando sin cambios.
drop function if exists public.create_lead_submission(text, text, text, text, text, text, text, text, text, text, text, text);

create function public.create_lead_submission(
  p_icp_pack_slug text,
  p_idempotency_key text,
  p_payload_hash text,
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_message text,
  p_solution text,
  p_notice_version text,
  p_source text,
  p_ip_hash text,
  p_service text default null,
  p_plan text default null,
  p_interest text default null,
  p_source_page text default null,
  p_source_section text default null,
  p_source_cta text default null,
  p_campaign text default null,
  p_diagnostic_data jsonb default '{}'::jsonb
)
returns table(id uuid, outcome text)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_pack_id uuid;
  v_existing record;
  v_new_id uuid;
begin
  select icp_packs.id into v_pack_id from public.icp_packs where slug = p_icp_pack_slug;
  if v_pack_id is null then
    raise exception 'unknown_icp_pack: %', p_icp_pack_slug;
  end if;

  select ls.id as eid, ls.payload_hash as ehash into v_existing
  from public.lead_submissions ls
  where ls.icp_pack_id = v_pack_id and ls.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.ehash is distinct from p_payload_hash then
      return query select v_existing.eid, 'conflict'::text;
      return;
    end if;
    return query select v_existing.eid, 'existing'::text;
    return;
  end if;

  insert into public.lead_submissions (
    icp_pack_id, idempotency_key, payload_hash, name, company, email, phone,
    message, solution, notice_version, source, ip_hash,
    service, plan, interest, source_page, source_section, source_cta, campaign,
    diagnostic_data, diagnostic_completed_at
  ) values (
    v_pack_id, p_idempotency_key, p_payload_hash, p_name, p_company, p_email, p_phone,
    p_message, p_solution, p_notice_version, p_source, p_ip_hash,
    p_service, p_plan, p_interest, p_source_page, p_source_section, p_source_cta, p_campaign,
    coalesce(p_diagnostic_data, '{}'::jsonb),
    case when p_service is not null then now() end
  )
  returning lead_submissions.id into v_new_id;

  insert into public.sync_jobs (icp_pack_id, lead_submission_id, effect_key)
  values (v_pack_id, v_new_id, 'lead_submission:' || v_new_id::text);

  return query select v_new_id, 'created'::text;
end;
$function$;
