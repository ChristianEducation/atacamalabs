-- Secuencia de 4 correos (0/4/9/18 días hábiles): el cierre del hilo es followup_3.
-- Aplicada en producción el 22-oct-2026 (proyecto uwquwjmiofixzugttals).
alter table public.outreach_messages drop constraint if exists outreach_messages_kind_check;
alter table public.outreach_messages add constraint outreach_messages_kind_check check (kind in ('initial','followup_1','followup_2','followup_3','reply','other'));
