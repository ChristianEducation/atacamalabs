-- Atacama OS v3 · Fase 3 (producción automática de redes en la VPS) — aditiva.
-- La producción nace APAGADA (además el job de Hermes se crea pausado). Topes del spec §6.5 / anexo §F3.
alter table public.content_config
  add column if not exists taller_production_enabled boolean not null default false,
  add column if not exists taller_max_attempts_per_slide int not null default 3 check (taller_max_attempts_per_slide between 1 and 5),
  add column if not exists taller_max_credits_per_piece int not null default 30 check (taller_max_credits_per_piece between 0 and 200),
  add column if not exists taller_weekly_credit_cap int not null default 200 check (taller_weekly_credit_cap between 0 and 1000);

-- REVERSIÓN: alter table public.content_config drop column if exists taller_production_enabled, drop column if exists taller_max_attempts_per_slide,
--   drop column if exists taller_max_credits_per_piece, drop column if exists taller_weekly_credit_cap;
