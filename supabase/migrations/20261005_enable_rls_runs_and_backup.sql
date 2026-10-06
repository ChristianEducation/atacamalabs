-- Atacama OS · Bloque A (seguridad P0) — 2026-10-05
-- Estado previo (registrado en docs/ATACAMA-OS-IMPLEMENTATION.md):
--   public.runs y public._backup_prospects_pre_operator_required_20260903 sin RLS,
--   con privilegios completos (incl. DELETE/TRUNCATE) para anon y authenticated.
--   La clave pública devolvía 11 y 62 filas respectivamente.
-- Cambio: habilitar RLS sin políticas (denegar por defecto a anon/authenticated).
-- service_role y postgres tienen BYPASSRLS, así que n8n (credencial service_role)
-- y las migraciones no se ven afectados. landing_writer no tiene grants sobre estas tablas.
-- Rollback:
--   alter table public.runs disable row level security;
--   alter table public._backup_prospects_pre_operator_required_20260903 disable row level security;

alter table public.runs enable row level security;
alter table public._backup_prospects_pre_operator_required_20260903 enable row level security;
