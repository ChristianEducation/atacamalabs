-- Atacama OS · Bloque 3 — canal LinkedIn (Waalaxy como ejecutor), 7-oct-2026
-- Modelo existente, sin tablas nuevas:
--  · prospect_candidates.channel_state  → canal recomendado/aprobado + estado de LinkedIn (url, persona, cargo, lista/campaña de Waalaxy,
--                                          id externo del prospecto, último evento, próxima acción, respuesta, timestamps y confirmación pendiente).
--  · outreach_config.linkedin_*         → interruptor y destinos de Waalaxy (igual idea que mode/send_allowlist del correo).
-- GHL sigue siendo la verdad comercial; Waalaxy solo ejecuta la secuencia en LinkedIn.

alter table public.prospect_candidates
  add column if not exists channel_state jsonb not null default '{}'::jsonb;

alter table public.outreach_config
  add column if not exists linkedin_mode text not null default 'off',
  add column if not exists linkedin_list_id text,
  add column if not exists linkedin_campaign_id text,
  add column if not exists linkedin_test_list_id text,
  add column if not exists linkedin_daily_cap integer not null default 5,
  add column if not exists linkedin_test_allowlist text[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'outreach_config_linkedin_mode_check') then
    alter table public.outreach_config add constraint outreach_config_linkedin_mode_check check (linkedin_mode in ('off', 'test', 'live'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'outreach_config_linkedin_daily_cap_check') then
    alter table public.outreach_config add constraint outreach_config_linkedin_daily_cap_check check (linkedin_daily_cap between 0 and 25);
  end if;
end $$;

-- Destino de PRUEBA ya validado a mano (lista «Atacama OS — Prueba»; sin campaña = no envía invitaciones ni mensajes).
update public.outreach_config
   set linkedin_mode = 'off',
       linkedin_test_list_id = '6ac66b417b5c4af5e7c260e4',
       linkedin_test_allowlist = array['https://www.linkedin.com/in/daniel-colodro-ebner-46498527']
 where id = 1;

-- Rollback:
--   alter table public.prospect_candidates drop column channel_state;
--   alter table public.outreach_config drop column linkedin_mode, drop column linkedin_list_id, drop column linkedin_campaign_id,
--     drop column linkedin_test_list_id, drop column linkedin_daily_cap, drop column linkedin_test_allowlist;
