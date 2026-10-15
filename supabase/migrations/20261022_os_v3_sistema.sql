-- Atacama OS v3 · Fase 7: «Mi semana» (ritual editable por día). Solo aditiva.
alter table public.content_config add column if not exists week_ritual jsonb not null
  default '{"lun":["ideas","correos"],"mar":["reuniones"],"mie":["competencia"],"jue":["revisar_piezas"],"vie":["cierre"]}'::jsonb;
-- Historial (§8.4): retención mínima de 90 días; índices para leer por fecha.
create index if not exists operator_audit_log_created_idx on public.operator_audit_log (created_at desc);
create index if not exists ops_runs_created_idx on public.ops_runs (created_at desc);
