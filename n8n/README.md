# n8n — Atacama Labs

Workflows propios de Atacama Labs en la instancia n8n compartida (`n8n.srv1650725.hstgr.cloud`). **No se tocó ningún workflow ni pipeline de EnBandeja** — todo lo de acá es nuevo, con nombre/credenciales propios.

## Atacama Labs - 01 Lead Sync

- id n8n: `oKQujZqHy09dMJao` (activo).
- Fuente/backup: [`atacama-labs-01-lead-sync.json`](atacama-labs-01-lead-sync.json) — export completo de nodos/conexiones tal como quedó creado vía API. Si se edita en el editor de n8n, re-exportar aquí para mantenerlo como fuente de verdad versionada.
- Disparador: cada 2 minutos.
- Flujo: `claim_sync_jobs` (RPC Supabase, reclama hasta 5 jobs `pending`/`retry_wait` del pack `atacama-labs` de forma atómica) → si el lead ya tiene `ghl_contact_id`+`ghl_opportunity_id` (reintento tras éxito parcial), va directo a `complete_sync_job` sin llamar a GHL de nuevo → si no, `Upsert GHL Contact` → `Create GHL Opportunity` (pipeline "Atacama Labs — Ventas", etapa "Nuevo", custom fields Fuente/Solución de interés/Lead ID) → `complete_sync_job` con éxito o fallo.
- **2026-09-15 (003)**: `claim_sync_jobs` se generalizó para también reclamar jobs originados en `prospects` calificados (no solo `lead_submissions`), de cara al futuro "Atacama Labs - 04 CRM Sync". El nodo "Claim Sync Jobs" de este workflow ahora pasa `p_source_type: "lead_submission"` explícito para seguir reclamando únicamente jobs de leads entrantes por `/contacto` — evita que este workflow y el futuro 04 CRM Sync se disputen jobs de la misma cola. Probado con regresión completa después del cambio (ver `execution/EVIDENCE.md`).
- Reintentos: `complete_sync_job` aplica backoff 1/5/15/60 min, máximo 4 intentos, luego `failed` (ver `supabase/migrations/20260915_sync_jobs_worker.sql`).
- Credenciales propias (no las de EnBandeja):
  - `Atacama Labs - Supabase` (`supabaseApi`, id n8n `XOmXUuyLVSazDIh5`) — mismo proyecto compartido, service_role.
  - `Atacama Labs - GHL Header Auth` (`httpHeaderAuth`, id n8n `8VKPDkZYHtODhRtk`) — el token "agente aliado" ya en uso para inspección, ahora también para escritura de contacts/opportunities.
- Ganado/Perdido: el workflow crea la Opportunity con `status: "open"`; marcarla `won`/`lost` es acción comercial manual en GHL (no automatizada), consistente con `execution/SYSTEM-MAP.md`.

## Probado end-to-end (2026-09-15, datos de prueba borrados después)

1. **Camino feliz**: lead de prueba real → `claim_sync_jobs` lo reclamó → contacto y oportunidad creados en GHL (pipeline/etapa/custom fields correctos, verificado con `GET /opportunities/{id}`) → `lead_submissions.status='synced'` con los IDs de GHL guardados → contacto/oportunidad de prueba eliminados de GHL, fila de prueba eliminada de Supabase.
2. **Camino de reintento** (ya tiene IDs de GHL de un intento previo): el workflow detectó los IDs ya guardados y fue directo a `complete_sync_job` **sin llamar a GHL** — verificado que los IDs no cambiaron.
3. **Camino de fallo/backoff**: probado directo en SQL sobre `complete_sync_job` (no disparado por un error real de GHL en esta sesión) — `retry_wait`, `attempts=1`, `next_at` futuro, error sin PII. El workflow usa la misma función, así que hereda ese comportamiento; no se forzó un fallo real de la API de GHL para no arriesgar nada en producción sin necesidad.

## Pendiente / no incluido en esta versión

- No hay alerta ni notificación cuando un job llega a `failed` tras 4 intentos — hoy solo queda visible consultando `sync_jobs`/`lead_submissions` directamente. Agregar si Christian lo pide (p.ej. un nodo que notifique cuando `attempts>=4`).
- Búsqueda de duplicados en GHL por "Lead ID" antes de crear: la API de búsqueda de GHL (`/opportunities/search?q=`) no filtra por valor de custom field (probado, devuelve 0 resultados aunque exista) — la idempotencia real depende de: (a) el `claim` atómico (un job se procesa una sola vez), y (b) los IDs de GHL persistidos en `lead_submissions` para reintentos. Documentado como limitación conocida, no un bug.
