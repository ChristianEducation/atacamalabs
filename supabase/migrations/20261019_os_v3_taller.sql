-- Atacama OS v3 · Fase 2 (Taller y «Programar») — aditiva.
-- 1) Interruptor del anexo §E2: si Christian confirma que el post TEST del 5-dic muestra todas las láminas, se enciende y los carruseles se
--    crean ya programados/aprobados. Nace APAGADO: los carruseles se crean EN REVISIÓN y esperan su último clic en GHL.
alter table public.content_config
  add column if not exists taller_carousel_direct_schedule boolean not null default false;

-- 2) n8n aplica las escrituras de un paso en paralelo (D-07): al aprobar una idea se crea la pieza y se marca la idea en el mismo paso,
--    así que content_ideas.piece_id queda como referencia simple (con índice), sin FK. content_pieces.idea_id sí mantiene su FK (la idea ya existe).
alter table public.content_ideas drop constraint if exists content_ideas_piece_id_fkey;
create index if not exists content_ideas_piece on public.content_ideas (piece_id);
create index if not exists content_pieces_taller on public.content_pieces (taller_status) where taller_status is not null;

-- REVERSIÓN:
--   alter table public.content_config drop column if exists taller_carousel_direct_schedule;
--   alter table public.content_ideas add constraint content_ideas_piece_id_fkey foreign key (piece_id) references public.content_pieces(id) on delete set null;
--   drop index if exists content_pieces_taller;
