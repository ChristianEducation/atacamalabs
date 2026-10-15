-- Atacama OS v3 · Fase 8 — Resultados y aprendizaje (spec §8.2 / §8.3). Solo aditivo.

-- 1) Contactos atribuidos a una pieza (mensaje directo con palabra clave) — «Registrar contacto de esta pieza».
create table if not exists public.content_attributions (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid references public.content_pieces(id) on delete set null,
  resource_id uuid references public.content_resources(id) on delete set null,
  keyword text,
  source text not null default 'dm' check (source in ('dm','web','manual')),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  handle text,
  ghl_contact_id text,
  note text,
  created_by text not null default 'Christian',
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists content_attributions_piece on public.content_attributions (piece_id, created_at desc);
alter table public.content_attributions enable row level security;
revoke all on public.content_attributions from anon, authenticated;

-- 2) Interruptor del job semanal «Aprendizaje» (nace APAGADO; solo Christian lo enciende).
alter table public.content_config add column if not exists learning_enabled boolean not null default false;
alter table public.content_config add column if not exists learning_min_sample integer not null default 30;

-- 3) Semilla de aprendizaje: los 12 pares de §7-S6 (borrador original de Hermes → versión editada por Christian).
insert into public.learning_events (type, subject_id, before, after, reason, by, created_at)
select 'email_edit', o.id::text,
       jsonb_build_object('subject', o.subject, 'body', o.body, 'kind', o.kind, 'message_id', o.id),
       jsonb_build_object('subject', f.subject, 'body', f.body, 'message_id', f.id),
       'Par S6 (semilla): borrador de Hermes reemplazado por la versión de Christian',
       'Christian', coalesce(f.created_at, o.created_at)
  from public.outreach_messages o
  join lateral (
    select x.id, x.subject, x.body, x.created_at
      from public.outreach_messages x
     where x.candidate_id = o.candidate_id and x.kind = o.kind and x.direction = 'outbound'
       and x.id <> o.id and not x.learning_pair
     order by (x.status in ('sent','approved','sending')) desc, x.created_at desc limit 1
  ) f on true
 where o.learning_pair
   and not exists (select 1 from public.learning_events e where e.type = 'email_edit' and e.subject_id = o.id::text);
