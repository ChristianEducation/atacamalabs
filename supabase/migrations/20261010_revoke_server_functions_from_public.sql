-- Atacama OS · Bloque 3 (blindaje) — 7-oct-2026
-- Hallazgo (docs/ATACAMA-OS-IMPLEMENTATION.md, línea «complete_territory_scan»): funciones del esquema public ejecutables por
-- anon/authenticated/PUBLIC vía /rest/v1/rpc/*. complete_territory_scan es SECURITY DEFINER (EnBandeja) y corría sin que RLS la frenara.
-- Verificado antes de revocar: ningún workflow n8n activo ni el código (src/, scripts/) la usa; el resto de las funciones solo se invoca con
-- service_role (n8n «Atacama Labs - Supabase» y el cliente server-only de Next.js), que conserva su EXECUTE.
-- set_updated_at es función de trigger (no se invoca por RPC): solo se fija su search_path.

revoke execute on function public.complete_territory_scan(uuid, integer, boolean, text) from public, anon, authenticated;
revoke execute on function public.claim_sync_jobs(text, integer, text) from public, anon, authenticated;
revoke execute on function public.complete_sync_job(uuid, boolean, text, text, text) from public, anon, authenticated;
revoke execute on function public.enqueue_prospect_sync(uuid) from public, anon, authenticated;
revoke execute on function public.create_lead_submission(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

alter function public.set_updated_at() set search_path = public, pg_temp;

-- Rollback (si algo vigente dependiera de anon, lo que hoy NO ocurre):
--   grant execute on function public.complete_territory_scan(uuid, integer, boolean, text) to anon, authenticated;
--   (y el equivalente para cada función de arriba)
