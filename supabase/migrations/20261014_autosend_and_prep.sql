-- Atacama OS · Contacto preparado + interruptor de ENVÍO AUTOMÁTICO (9-oct-2026).
-- Aditiva y segura: el autoenvío nace APAGADO. El estado de preparación vive en prospect_candidates.channel_state (jsonb, sin cambios de esquema).
alter table public.outreach_config add column if not exists autosend_enabled boolean not null default false;
alter table public.outreach_config add column if not exists autosend_min_score integer not null default 80;
alter table public.outreach_config add column if not exists autosend_updated_at timestamptz;
alter table public.outreach_config add column if not exists autosend_updated_by text;
comment on column public.outreach_config.autosend_enabled is 'ENVÍO AUTOMÁTICO (default OFF). ON: los borradores elegibles (score >= autosend_min_score, destinatario directo publicado, no B/C, sin respuesta/supresión) se aprueban solos; el Sender respeta tope, ventana y supresión. Solo se cambia desde /ops (sesión + clic).';
