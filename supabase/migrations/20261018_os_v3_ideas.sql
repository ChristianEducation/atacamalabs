-- Atacama OS v3 · Fase 4 (Ideas de la semana) — aditiva.
-- Interruptor del job «Ideas de la semana» de Hermes: nace APAGADO (además el job se crea pausado en la VPS). Solo Christian lo enciende.
alter table public.content_config
  add column if not exists ideas_enabled boolean not null default false;

-- REVERSIÓN: alter table public.content_config drop column if exists ideas_enabled;

-- (aplicado como «os_v3_ideas_batch_sin_fk») n8n aplica las escrituras de un paso EN PARALELO: una idea podía insertarse antes que su lote
-- y chocar con la llave foránea. batch_id queda como referencia simple (con índice), sin FK. Decisión D-07.
alter table public.content_ideas drop constraint if exists content_ideas_batch_id_fkey;
create index if not exists content_ideas_batch on public.content_ideas (batch_id);
-- REVERSIÓN: alter table public.content_ideas add constraint content_ideas_batch_id_fkey foreign key (batch_id) references public.content_idea_batches(id) on delete set null;
