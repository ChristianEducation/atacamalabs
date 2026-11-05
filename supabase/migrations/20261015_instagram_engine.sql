-- Atacama OS · Motor semanal de Instagram (Frente C del spec «máquina de contenido y motion», 12-oct-2026).
-- Aditiva y reversible: (1) permite el formato «historia» en content_pieces; (2) carriles propios de Instagram en content_config
-- (topes de cola y ritmo) para que 5 piezas de feed + 21 historias por semana NO cuenten contra el ritmo/cola de LinkedIn.
alter table public.content_pieces drop constraint if exists content_pieces_format_check;
alter table public.content_pieces add constraint content_pieces_format_check
  check (format = any (array['texto','imagen','carrusel','demo','reel','historia']));

alter table public.content_config
  add column if not exists ig_feed_weekly_target int not null default 5 check (ig_feed_weekly_target between 1 and 14),
  add column if not exists ig_feed_max_pending int not null default 10 check (ig_feed_max_pending between 1 and 50),
  add column if not exists ig_story_per_day int not null default 3 check (ig_story_per_day between 1 and 6),
  add column if not exists ig_story_max_pending int not null default 28 check (ig_story_max_pending between 1 and 120),
  add column if not exists ig_feed_slot text not null default '15:00',
  add column if not exists ig_story_slots text not null default '10:00,14:00,18:00';
-- Reversión: alter table content_pieces drop constraint content_pieces_format_check; add constraint ... sin 'historia'; drop column ig_* de content_config.

-- Corridas del motor semanal y interruptor general (aplicado también como «instagram_engine_runs_and_switch»).
alter table public.ops_runs drop constraint if exists ops_runs_kind_check;
alter table public.ops_runs add constraint ops_runs_kind_check
  check (kind = any (array['prospect_radar','content_radar','daily','alerts','other','content_rss','competitor_intel','content_pieces','contact_prep','ig_week']));
alter table public.content_config add column if not exists ig_engine_enabled boolean not null default true;
