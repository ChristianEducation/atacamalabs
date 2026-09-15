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

## Atacama Labs — 01 Discovery

- id n8n: `HvLcNkmL8Fo1hePi` (inactivo — se dispara manualmente o por el futuro "00 Orchestrator", no por schedule).
- Fuente/backup: [`atacama-labs-01-discovery.json`](atacama-labs-01-discovery.json).
- Clonado de "01 - Discovery Engine v3 GEO" de EnBandeja (`TWyJBIBUW4az9XJy`, **solo lectura, nunca modificado**). Reutilizados sin cambios: `Init ICP Config`/`Fetch ICP Pack`/`Parse ICP Pack` (slug default → `atacama-labs`), `Build Job Payload` (prefijo de nombre de job → "Atacama Labs"), `Create Maps Job`/`Prepare Job Context`/`Check Job`/`Finished?`/loop de poll/`Download CSV`/`Extract CSV`/`Normalize Results`/`Filter and Deduplicate` (ya eran pack-driven vía `icp_packs.discovery.result_filter`).
- **Diferencias deliberadas frente al original**:
  - No lee ni escribe `public.territories` (esa tabla es geografía compartida sin `icp_pack_id`, leída sin filtro por el `01` real de EnBandeja — agregar filas ahí sería visible para ese workflow sin poder modificarlo). En su lugar, un nodo nuevo `Build Areas` genera items en memoria desde `icp_packs.atacama-labs.discovery.areas` (`["Antofagasta","Calama","Mejillones","Tocopilla"]`).
  - Escribe únicamente en `accounts` (nunca en `schools`), con `account_type:'company'`. El nodo `Upsert Account` usa `on_conflict=icp_pack_id,dedupe_key` (índice único real `accounts_icp_dedupe_key_idx`, confirmado vía `pg_indexes` — más correcto que usar `google_place_id` solo, que no tiene constraint única propia), con `dedupe_key = google_place_id`.
  - `Aggregate Discovery Results`/`Prepare Failure Summary`/`Discovery Summary` no escriben de vuelta a `territories` (no hay fila de territorio que actualizar).
- Credenciales propias: `Atacama Labs - Supabase` en todos los nodos que llaman a Supabase. `Create Maps Job`/`Check Job`/`Download CSV` llaman al microservicio interno compartido `enbandeja-gmaps:8080` (sin auth, mismo patrón que EnBandeja, reutilizado directamente per instrucción de Christian).

### Probado 2026-09-15 (parcial)

Disparado 3 veces vía trigger de schedule temporal (agregado y retirado después — la API de n8n no tiene "run now"). Mecánica confirmada correcta end-to-end: resolución de ICP pack real, generación de áreas, construcción de keywords, creación de jobs reales en `enbandeja-gmaps` (IDs devueltos), loop de poll (21 intentos por job) sin errores, cierre limpio por "Prepare Failure Summary → Discovery Summary" sin datos falsos cuando se agota el intento. **No se completó el camino feliz todavía**: los jobs de Maps quedaron en `status:"pending"` las 3 veces (10 min cada una) — posible degradación del contenedor compartido `enbandeja-gmaps` en el momento de la prueba, no un bug de este workflow. `accounts` de Atacama quedó en 0 filas (correcto, sin inventar resultados). Pendiente: reintentar cuando el servicio esté saludable, confirmar el camino feliz completo (`Upsert Account` real) antes de conectar al orquestador.

## Atacama Labs — 02 Research

- id n8n: `oVNNvuRye4pp0Kz0` (inactivo).
- Fuente/backup: [`atacama-labs-02-research.json`](atacama-labs-02-research.json).
- Clonado de "02 - Research Engine FINAL" de EnBandeja (`XudNFS0CNx3SeGtb`, **solo lectura, nunca modificado**). El mecanismo (`Init ICP Config→Fetch ICP Pack→Parse ICP Pack→Init Configuration→OpenClaw Preflight→Fetch Pending Accounts (por `icp_pack_id`)→Loop→Claim→Crawl4AI→Prospector (OpenClaw)→Insert Research/Contacts→Update Account Final Status`) ya era genéricamente horizontal en el original (opera sobre `accounts`, no sobre `schools`, filtrado por `icp_pack_id` real). Se retiró completo el subgrafo de resolución de "operador" (11 nodos: `Has Confirmed Operator?`… `Operator Lookup Failed`) — no aplica a Atacama, sin concepto de operador/concesionaria. Se reescribieron `Build Prospector Prompt`/`Parse Research Result` para pedir evidencia de los 7 factores de `contracts/PROSPECTING.md` (pain/budget_proxy/volume/automation/access/urgency/fit) en vez de vocabulario casino-escolar.
- **Credencial pendiente (no bloqueante para el resto)**: los nodos `OpenClaw Preflight - Models`/`Prospector Research`/`Crawl4AI Crawl Website` reutilizan temporalmente las credenciales compartidas de EnBandeja (`Header Auth account`, `Header Auth account 2`) — no tengo el token para crear credenciales propias de Atacama todavía (instrucción de Christian: "credenciales propias, aunque apunten a servicios compartidos"). Ver `docs/USER-ACTIONS.md` (nuevo ítem) para la acción exacta.

### ⚠️ Incidente 2026-09-15 — dos cuentas reales de EnBandeja tocadas por error, ya revertido

Al probar el workflow (trigger de schedule temporal, mismo mecanismo que 01 Discovery), un bug propio (olvidé aplicar a `Init ICP Config` el mismo cambio de slug por defecto que sí hice en `01 Discovery`) hizo que la primera corrida resolviera el ICP pack `casino-escolar` en vez de `atacama-labs`, y procesara una cuenta real de EnBandeja (`Colegio Particular Andes Chile`) con el prompt de investigación de Atacama: insertó 5 filas en `research` y marcó `accounts.research_status='complete'`.

Corregido el código y verificado por inspección directa (`GET` del workflow). Para una segunda prueba, se agregó además un nodo que fuerza la corrida a un solo `account_id` de prueba explícito, como capa extra de seguridad. **Aun así, la segunda corrida también resolvió `casino-escolar`** y procesó OTRA cuenta real (`Colegio Marista Los Andes - Instituto Chacabuco`, 6 filas de `research` insertadas). La causa no fue el código (verificado correcto y bien conectado en ambos casos por inspección directa post-fix) sino que esta instancia de n8n parece ejecutar, en algunos casos, una versión cacheada/anterior del workflow justo después de un ciclo rápido `PUT` + `activate`/`deactivate` (ver también el hallazgo de triggers `interval` no registrándose, en `execution/EVIDENCE.md` de 003) — un problema de la plataforma, no solo de mi lógica.

**Remediado por completo, verificado con conteos exactos antes/después**: los 11 registros de `research` insertados por error fueron identificados uno por uno y eliminados; `research_status` de ambas cuentas restaurado a `pending` (su valor previo, confirmado porque `Fetch Pending Accounts` solo las tomó por tener ese estado); ninguna otra columna fue tocada (no `schools`, no `contacts`, no `current_operator_id` ni ningún campo de calificación). Conteos finales verificados: `schools` 2654, `contacts` 189, `research` 928, `accounts` 2686 — **idénticos a la línea base**, sin regresión.

**Pausado hasta que Christian decida cómo seguir probando workflows de n8n con seguridad** (ver mensaje de cierre de esta sesión) — no se ejecutó una tercera prueba en vivo.

## Pendiente / no incluido en esta versión

- No hay alerta ni notificación cuando un job llega a `failed` tras 4 intentos — hoy solo queda visible consultando `sync_jobs`/`lead_submissions` directamente. Agregar si Christian lo pide (p.ej. un nodo que notifique cuando `attempts>=4`).
- Búsqueda de duplicados en GHL por "Lead ID" antes de crear: la API de búsqueda de GHL (`/opportunities/search?q=`) no filtra por valor de custom field (probado, devuelve 0 resultados aunque exista) — la idempotencia real depende de: (a) el `claim` atómico (un job se procesa una sola vez), y (b) los IDs de GHL persistidos en `lead_submissions` para reintentos. Documentado como limitación conocida, no un bug.
