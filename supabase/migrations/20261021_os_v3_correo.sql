-- Atacama OS v3 · Fase 6 (resto): Prospección y correo. Solo aditiva.
-- G4: «Pega tu versión» marca edited_by_christian_at (protege de la regeneración automática: S5).
-- S6: los 12 pares de aprendizaje del 13-oct quedan marcados y protegidos contra borrado.
-- §7-6: umbral de muestra del embudo (configurable).

alter table public.outreach_messages add column if not exists edited_by_christian_at timestamptz;
alter table public.outreach_messages add column if not exists learning_pair boolean not null default false;

update public.outreach_messages
   set learning_pair = true
 where status = 'cancelled'
   and direction = 'outbound'
   and error like 'Reemplazado por la versión editada por Christian%'
   and learning_pair = false;

create or replace function public.outreach_messages_keep_learning_pairs() returns trigger
language plpgsql as $$
begin
  if old.learning_pair then
    raise exception 'Par de aprendizaje (S6): este borrador no se borra.';
  end if;
  return old;
end $$;

drop trigger if exists outreach_messages_keep_learning_pairs on public.outreach_messages;
create trigger outreach_messages_keep_learning_pairs before delete on public.outreach_messages
  for each row execute function public.outreach_messages_keep_learning_pairs();

alter table public.outreach_config add column if not exists funnel_min_sample integer not null default 20;
alter table public.outreach_config add column if not exists config_updated_by text;
