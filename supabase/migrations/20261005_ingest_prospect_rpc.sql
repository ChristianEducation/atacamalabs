-- Atacama OS · Bloque G — RPC transaccional de ingesta de prospectos (2026-10-05)
-- n8n (workflow "08 Prospect Ingest") valida el gate y llama a esta función por prospecto.
-- Todo ocurre en una sola transacción: cuenta + evidencia + contacto + bitácora, o nada.
--   · rejected  -> solo se registra en prospect_inbox con los motivos.
--   · duplicate -> la cuenta (icp_pack_id, dedupe_key) ya existía; se registra y no se toca.
--   · accepted  -> se crea la cuenta, la evidencia por factor (formato que lee 03 Qualification:
--                  research_type = 'factor:<pain|budget_proxy|volume|automation|access|urgency|fit>',
--                  raw_metadata.level 0/1/2), el contacto público y queda research_status = 'complete'.
-- Seguridad: solo service_role puede ejecutarla (sin acceso para anon/authenticated).
-- Rollback: drop function public.ingest_prospect(uuid, text, jsonb);

create or replace function public.ingest_prospect(p_icp_pack_id uuid, p_batch_id text, p_item jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_pack_status text;
  v_verdict text := coalesce(p_item->>'verdict', 'rejected');
  v_domain text := nullif(lower(trim(p_item->>'domain')), '');
  v_company text := nullif(trim(p_item->>'company'), '');
  v_reasons text[] := coalesce(
    (select array_agg(value) from jsonb_array_elements_text(coalesce(p_item->'reasons', '[]'::jsonb))), '{}');
  v_existing uuid;
  v_account_id uuid;
  r jsonb;
  v_contact jsonb := p_item->'contact';
begin
  select status into v_pack_status from icp_packs where id = p_icp_pack_id;
  if v_pack_status is null then
    raise exception 'ingest_prospect: icp_pack % no existe', p_icp_pack_id;
  end if;

  if v_verdict <> 'accepted' then
    insert into prospect_inbox (batch_id, icp_pack_id, company, domain, status, reasons, payload)
    values (p_batch_id, p_icp_pack_id, v_company, v_domain, 'rejected', v_reasons, coalesce(p_item->'raw', p_item))
    on conflict (icp_pack_id, batch_id, coalesce(domain, '')) do nothing;
    return jsonb_build_object('status', 'rejected', 'reasons', to_jsonb(v_reasons));
  end if;

  if v_domain is null or v_company is null then
    raise exception 'ingest_prospect: item aceptado sin domain/company';
  end if;

  select id into v_existing from accounts where icp_pack_id = p_icp_pack_id and dedupe_key = v_domain;
  if v_existing is not null then
    insert into prospect_inbox (batch_id, icp_pack_id, company, domain, status, reasons, account_id, payload)
    values (p_batch_id, p_icp_pack_id, v_company, v_domain, 'duplicate', array['duplicate_account'], v_existing, coalesce(p_item->'raw', p_item))
    on conflict (icp_pack_id, batch_id, coalesce(domain, '')) do nothing;
    return jsonb_build_object('status', 'duplicate', 'account_id', v_existing);
  end if;

  begin
    insert into accounts (
      icp_pack_id, account_type, name, normalized_name, website, domain, city, region, phone, whatsapp,
      email_general, source, source_url, discovery_status, research_status, dedupe_key, metadata, last_verified_at)
    values (
      p_icp_pack_id, 'company', v_company, lower(v_company),
      p_item#>>'{account,website}', v_domain, p_item#>>'{account,city}', p_item#>>'{account,region}',
      p_item#>>'{account,phone}', p_item#>>'{account,whatsapp}', p_item#>>'{account,email_general}',
      coalesce(p_item#>>'{account,source}', 'hermes'), p_item#>>'{account,source_url}',
      'processed', 'pending', v_domain, coalesce(p_item->'account'->'metadata', '{}'::jsonb), now())
    returning id into v_account_id;
  exception when unique_violation then
    select id into v_existing from accounts where icp_pack_id = p_icp_pack_id and dedupe_key = v_domain;
    insert into prospect_inbox (batch_id, icp_pack_id, company, domain, status, reasons, account_id, payload)
    values (p_batch_id, p_icp_pack_id, v_company, v_domain, 'duplicate', array['duplicate_account'], v_existing, coalesce(p_item->'raw', p_item))
    on conflict (icp_pack_id, batch_id, coalesce(domain, '')) do nothing;
    return jsonb_build_object('status', 'duplicate', 'account_id', v_existing);
  end;

  for r in select * from jsonb_array_elements(coalesce(p_item->'research', '[]'::jsonb)) loop
    insert into research (account_id, research_type, finding, evidence_text, source_url, source_date,
                          verified_at, confidence, is_current, researcher, raw_metadata)
    values (
      v_account_id, r->>'research_type', r->>'finding', r->>'evidence_text', r->>'source_url',
      nullif(r->>'source_date', '')::date, now(), nullif(r->>'confidence', '')::numeric, true, 'hermes',
      jsonb_build_object('level', (r->>'level')::int, 'certainty', coalesce(r->>'certainty', 'observed'),
                         'batch_id', p_batch_id));
  end loop;

  if v_contact is not null and jsonb_typeof(v_contact) = 'object'
     and (v_contact->>'email' is not null or v_contact->>'phone' is not null or v_contact->>'whatsapp' is not null) then
    insert into contacts (account_id, name, job_title, email, phone, whatsapp, linkedin_url, source_url,
                          verified_at, confidence, is_decision_maker, contact_status, metadata)
    values (
      v_account_id, v_contact->>'name', v_contact->>'job_title', lower(v_contact->>'email'), v_contact->>'phone',
      v_contact->>'whatsapp', v_contact->>'linkedin_url', v_contact->>'source_url', now(),
      nullif(v_contact->>'confidence', '')::numeric, coalesce((v_contact->>'is_decision_maker')::boolean, false),
      'found', jsonb_build_object('public', true, 'batch_id', p_batch_id));
  end if;

  update accounts set research_status = 'complete', updated_at = now() where id = v_account_id;

  insert into prospect_inbox (batch_id, icp_pack_id, company, domain, status, reasons, account_id, payload)
  values (p_batch_id, p_icp_pack_id, v_company, v_domain, 'accepted', coalesce(v_reasons, '{}'), v_account_id, coalesce(p_item->'raw', p_item))
  on conflict (icp_pack_id, batch_id, coalesce(domain, '')) do nothing;

  return jsonb_build_object('status', 'accepted', 'account_id', v_account_id);
end;
$$;

revoke all on function public.ingest_prospect(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_prospect(uuid, text, jsonb) to service_role;

comment on function public.ingest_prospect(uuid, text, jsonb) is
  'Atacama OS: ingesta transaccional y auditada de un prospecto (accepted/rejected/duplicate). Solo service_role.';
