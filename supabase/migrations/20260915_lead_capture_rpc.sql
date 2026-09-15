-- 002/2.1 — función atómica de captura + columna de rate-limit.
-- SOLO ADITIVO: 1 columna nueva (nullable) + 1 función nueva. Nada existente
-- se toca. Continúa 20260915_lead_capture_horizontal.sql.

alter table public.lead_submissions
  add column if not exists ip_hash text;

comment on column public.lead_submissions.ip_hash is
  'Hash SHA-256 de la IP, solo para rate-limiting técnico efímero (SECURITY.md) — no es dato comercial, no identifica a la persona.';

create index if not exists lead_submissions_ip_hash_idx
  on public.lead_submissions (ip_hash, created_at desc);

-- Inserta LeadSubmission + SyncJob en una misma transacción (ARCHITECTURE.md
-- "captura+intención sync atómicas"). Idempotente por (icp_pack, key):
-- mismo payload_hash -> devuelve la fila existente; distinto -> conflicto.
create or replace function public.create_lead_submission(
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
  p_ip_hash text
) returns table (id uuid, outcome text)
language plpgsql
set search_path = public
as $$
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
    message, solution, notice_version, source, ip_hash
  ) values (
    v_pack_id, p_idempotency_key, p_payload_hash, p_name, p_company, p_email, p_phone,
    p_message, p_solution, p_notice_version, p_source, p_ip_hash
  )
  returning lead_submissions.id into v_new_id;

  insert into public.sync_jobs (icp_pack_id, lead_submission_id, effect_key)
  values (v_pack_id, v_new_id, 'lead_submission:' || v_new_id::text);

  return query select v_new_id, 'created'::text;
end;
$$;

comment on function public.create_lead_submission is
  'Captura atómica de LeadSubmission + SyncJob. Se llama solo desde el servidor con service_role (no expuesta a anon/authenticated) — contracts/INTERFACES.md POST /api/leads.';
