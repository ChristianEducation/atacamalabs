# n8n — Atacama Labs

Workflows propios de Atacama Labs en la instancia n8n compartida (`n8n.srv1650725.hstgr.cloud`). **No se tocó ningún workflow ni pipeline de EnBandeja** — todo lo de acá es nuevo, con nombre/credenciales propios.

## Protocolo de pruebas seguras (vigente desde 2026-09-15, tras el incidente de 02 Research)

Tras el incidente de abajo, Christian decidió: entorno de prueba aislado dentro del mismo motor, no probar más contra `atacama-labs` directamente. Reglas vigentes para **todo** workflow nuevo de 003+:

1. **ICP de prueba separado**: `atacama-labs-test` (id `f412a742-7c7f-4cc0-9e2a-20c39d6fcd46`, en Supabase `icp_packs`), config espejo de `atacama-labs` pero exclusivamente para datos ficticios. Nunca se usa para datos reales.
2. **Sin defaults de ICP pack**: `Init ICP Config` en todos los workflows ya no tiene `|| 'casino-escolar'` ni `|| 'atacama-labs'` — si no llega `icp_pack_id`/`icp_pack_slug` explícito, lanza error y termina antes de leer `icp_packs`.
3. **Doble validación obligatoria**: nodo `Assert Expected Pack` justo después de `Parse ICP Pack` (compara contra una constante literal `EXPECTED_ICP_PACK_ID`/`SLUG` incrustada en el código de esa copia del workflow — no una variable que pueda derivar) + un guard `Assert Expected Pack (before write...)` inmediatamente antes de cada nodo de escritura (`Upsert Account`, `Claim School`, `Insert Research`, `Insert Contacts`, `Update Account Final Status`).
4. **Todo acceso a `accounts` incluye `icp_pack_id` explícito** en la URL/filtro (nunca solo `id=eq.X`) — incluido el `PATCH` de `Claim School`, que ahora es `...&icp_pack_id=eq.<esperado>`, por lo que una cuenta de otro pack simplemente no se reclama (0 filas), sin necesidad de tocar `research`/`contacts`. Los escrituras finales (`Upsert Account`) usan el `icp_pack_id` como **literal hardcodeado en el body**, no una variable — no puede derivar aunque algo upstream fallara.
5. Discovery/Research de Atacama siguen sin tocar `schools` ni ninguna entidad de casino-escolar (ya era así, reafirmado).
6. **Copias desechables e inmutables**: cada prueba usa un workflow nuevo (`POST /workflows`, id nuevo). Antes de activar, `GET` de vuelta y diff contra el JSON enviado (nodos + conexiones) para confirmar que coincide exactamente.
7. **Nunca se edita/reactiva una copia ya ejecutada** — si hace falta un cambio, se desactiva, se `DELETE`, y se crea una copia nueva con id nuevo. Evita el riesgo (ya confirmado una vez) de que la instancia ejecute una versión cacheada tras un `PUT` rápido.
8. **Una sola ejecución controlada**: se activa, se hace polling ajustado (cada ~8-15s) hasta ver la primera ejecución, y se desactiva de inmediato — nunca se deja un cron repitiendo sin supervisión. Al terminar: se desactiva y se **elimina** la copia (no solo se desactiva) y todos los datos ficticios creados.
9. **Conteos de EnBandeja verificados antes y después** de cada prueba (`schools`, `contacts`, `research`, `accounts` por pack) — deben quedar idénticos.

**Validado con este protocolo, 2026-09-15**: "01 Discovery" y "02 Research" (v2, con las validaciones de arriba) probados cada uno con una copia desechable contra `atacama-labs-test`, una sola ejecución cada uno, sin tocar EnBandeja (conteos idénticos antes/después), copias eliminadas después. Detalle en `execution/EVIDENCE.md`.

**Promoción a `atacama-labs` real**: pendiente hasta que 02b/03/04/05/06 también pasen bajo `atacama-labs-test`. Cuando se promueva, se genera una copia con las constantes cambiadas a `atacama-labs` (mismo protocolo de copia desechable) y se corre una única prueba final supervisada, antes de dejar cualquier workflow activo en producción.

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

- **v2 (protocolo seguro)**: sin id n8n fijo — cada prueba/uso crea una copia desechable desde el JSON versionado (ver protocolo arriba). Fuente/backup: [`atacama-labs-01-discovery.json`](atacama-labs-01-discovery.json), actualmente en modo `test` (constantes fijadas a `atacama-labs-test`); la versión `real` (fijada a `atacama-labs`) se genera solo al promover.
- Clonado de "01 - Discovery Engine v3 GEO" de EnBandeja (`TWyJBIBUW4az9XJy`, **solo lectura, nunca modificado**). Reutilizados sin cambios: `Init ICP Config`/`Fetch ICP Pack`/`Parse ICP Pack` (slug default → `atacama-labs`), `Build Job Payload` (prefijo de nombre de job → "Atacama Labs"), `Create Maps Job`/`Prepare Job Context`/`Check Job`/`Finished?`/loop de poll/`Download CSV`/`Extract CSV`/`Normalize Results`/`Filter and Deduplicate` (ya eran pack-driven vía `icp_packs.discovery.result_filter`).
- **Diferencias deliberadas frente al original**:
  - No lee ni escribe `public.territories` (esa tabla es geografía compartida sin `icp_pack_id`, leída sin filtro por el `01` real de EnBandeja — agregar filas ahí sería visible para ese workflow sin poder modificarlo). En su lugar, un nodo nuevo `Build Areas` genera items en memoria desde `icp_packs.atacama-labs.discovery.areas` (`["Antofagasta","Calama","Mejillones","Tocopilla"]`).
  - Escribe únicamente en `accounts` (nunca en `schools`), con `account_type:'company'`. El nodo `Upsert Account` usa `on_conflict=icp_pack_id,dedupe_key` (índice único real `accounts_icp_dedupe_key_idx`, confirmado vía `pg_indexes` — más correcto que usar `google_place_id` solo, que no tiene constraint única propia), con `dedupe_key = google_place_id`.
  - `Aggregate Discovery Results`/`Prepare Failure Summary`/`Discovery Summary` no escriben de vuelta a `territories` (no hay fila de territorio que actualizar).
- Credenciales propias: `Atacama Labs - Supabase` en todos los nodos que llaman a Supabase. `Create Maps Job`/`Check Job`/`Download CSV` llaman al microservicio interno compartido `enbandeja-gmaps:8080` (sin auth, mismo patrón que EnBandeja, reutilizado directamente per instrucción de Christian).

### Probado 2026-09-15

**v1** (3 ejecuciones, sin el protocolo de copias desechables, contra `atacama-labs` directo): mecánica correcta end-to-end (ICP pack real, áreas, keywords, jobs reales creados en `enbandeja-gmaps`, poll loop sin errores, cierre limpio sin datos falsos), pero los jobs de Maps quedaron en `status:"pending"` las 3 veces (posible degradación del contenedor compartido, no un bug propio). `accounts` quedó en 0 filas.

**v2** (protocolo seguro, copia desechable contra `atacama-labs-test`, 1 sola ejecución, 3 intentos de activación hasta que el cron registró — ver hallazgo de triggers `interval`/`cronExpression` en `execution/EVIDENCE.md`): mismo resultado — mecánica correcta, `Assert Expected Pack` confirmó `atacama-labs-test`, pero el job de Maps volvió a quedar en `pending`, nunca llegó a `Upsert Account`. **Camino feliz de Discovery (escritura real en `accounts`) sigue sin confirmar** — depende de que el scraper compartido esté saludable. No bloquea seguir con 02b/03/04/05/06.

## Atacama Labs — 02 Research

- **v2 (protocolo seguro)**: sin id n8n fijo — copias desechables desde el JSON versionado. Fuente/backup: [`atacama-labs-02-research.json`](atacama-labs-02-research.json), modo `test` (fijado a `atacama-labs-test`).
- Clonado de "02 - Research Engine FINAL" de EnBandeja (`XudNFS0CNx3SeGtb`, **solo lectura, nunca modificado**). El mecanismo (`Init ICP Config→Fetch ICP Pack→Parse ICP Pack→Init Configuration→OpenClaw Preflight→Fetch Pending Accounts (por `icp_pack_id`)→Loop→Claim→Crawl4AI→Prospector (OpenClaw)→Insert Research/Contacts→Update Account Final Status`) ya era genéricamente horizontal en el original (opera sobre `accounts`, no sobre `schools`, filtrado por `icp_pack_id` real). Se retiró completo el subgrafo de resolución de "operador" (11 nodos: `Has Confirmed Operator?`… `Operator Lookup Failed`) — no aplica a Atacama, sin concepto de operador/concesionaria. Se reescribieron `Build Prospector Prompt`/`Parse Research Result` para pedir evidencia de los 7 factores de `contracts/PROSPECTING.md` (pain/budget_proxy/volume/automation/access/urgency/fit) en vez de vocabulario casino-escolar.
- **Credencial pendiente (no bloqueante para el resto)**: los nodos `OpenClaw Preflight - Models`/`Prospector Research`/`Crawl4AI Crawl Website` reutilizan temporalmente las credenciales compartidas de EnBandeja (`Header Auth account`, `Header Auth account 2`) — no tengo el token para crear credenciales propias de Atacama todavía (instrucción de Christian: "credenciales propias, aunque apunten a servicios compartidos"). Ver `docs/USER-ACTIONS.md` (nuevo ítem) para la acción exacta.

### ⚠️ Incidente 2026-09-15 — dos cuentas reales de EnBandeja tocadas por error, ya revertido

Al probar el workflow (trigger de schedule temporal, mismo mecanismo que 01 Discovery), un bug propio (olvidé aplicar a `Init ICP Config` el mismo cambio de slug por defecto que sí hice en `01 Discovery`) hizo que la primera corrida resolviera el ICP pack `casino-escolar` en vez de `atacama-labs`, y procesara una cuenta real de EnBandeja (`Colegio Particular Andes Chile`) con el prompt de investigación de Atacama: insertó 5 filas en `research` y marcó `accounts.research_status='complete'`.

Corregido el código y verificado por inspección directa (`GET` del workflow). Para una segunda prueba, se agregó además un nodo que fuerza la corrida a un solo `account_id` de prueba explícito, como capa extra de seguridad. **Aun así, la segunda corrida también resolvió `casino-escolar`** y procesó OTRA cuenta real (`Colegio Marista Los Andes - Instituto Chacabuco`, 6 filas de `research` insertadas). La causa no fue el código (verificado correcto y bien conectado en ambos casos por inspección directa post-fix) sino que esta instancia de n8n parece ejecutar, en algunos casos, una versión cacheada/anterior del workflow justo después de un ciclo rápido `PUT` + `activate`/`deactivate` (ver también el hallazgo de triggers `interval` no registrándose, en `execution/EVIDENCE.md` de 003) — un problema de la plataforma, no solo de mi lógica.

**Remediado por completo, verificado con conteos exactos antes/después**: los 11 registros de `research` insertados por error fueron identificados uno por uno y eliminados; `research_status` de ambas cuentas restaurado a `pending` (su valor previo, confirmado porque `Fetch Pending Accounts` solo las tomó por tener ese estado); ninguna otra columna fue tocada (no `schools`, no `contacts`, no `current_operator_id` ni ningún campo de calificación). Conteos finales verificados: `schools` 2654, `contacts` 189, `research` 928, `accounts` 2686 — **idénticos a la línea base**, sin regresión.

**Resuelto 2026-09-15**: Christian decidió el protocolo de pruebas seguras (arriba). "02 Research" reescrito con las validaciones dobles + `atacama-labs-test`, probado con una copia desechable (1 sola ejecución, ~48s hasta que el cron disparó): `Assert Expected Pack` confirmó `atacama-labs-test`, procesó únicamente la cuenta ficticia esperada, insertó 1 fila de evidencia real (factor `fit`), sin tocar ninguna cuenta de EnBandeja. Datos ficticios y la copia del workflow eliminados después; conteos de EnBandeja verificados idénticos antes/después.

## Atacama Labs — 02b Signals

- Fuente: [`atacama-labs-02b-signals.json`](atacama-labs-02b-signals.json), modo `test`.
- Clonado de "02b - Signals Engine" de EnBandeja (`q4zOm2QckejUodh2`, solo lectura). Este workflow ya era **100% genérico** en el original (sin ningún concepto de operador/colegio) — reutilizado casi sin cambios, solo el protocolo de seguridad (sin defaults, `Assert Expected Pack` ×2, `icp_pack_id` hardcodeado en `Init Configuration`/`Fetch Accounts For Signals`/`Upsert Signals`/`Update Account Signals Checked`). Lee `icp_packs.atacama-labs.signals.{types,search_guidance}` (agregado `search_guidance`, faltaba). Solo corre sobre `accounts` con `research_status='complete'` (después de 02 Research).
- Credencial OpenClaw compartida temporalmente (mismo pendiente que 02 Research, U17).
- Aún no probado (construido, sin ejecutar todavía).

## Atacama Labs — 03 Qualification

- Fuente: [`atacama-labs-03-qualification.json`](atacama-labs-03-qualification.json), modo `test`.
- **Construido desde cero** (NO clonado de EnBandeja): el `03` real está profundamente acoplado a conceptos de operador/colegio/plataforma-incumbente (`operator_relation`, `manual_process_count`, `platform_status`, `Hard Gates`/`Raw Score`/`Caps Penalties` específicos de casino-escolar) que Christian pidió explícitamente no reutilizar ("no inventar criterios nuevos" también implica no heredar los de otro vertical). Se reutilizó solo la forma general de orquestación (resolución de ICP, fetch de cuentas elegibles, loop, upsert).
- Implementa **exactamente** `contracts/PROSPECTING.md` + `contracts/prospecting-policy.json`: 7 factores (pain/budgetProxy/volume/automation/access/urgency/fit), nivel 0/1/2 por factor leído de `research.research_type='factor:<clave>'` (poblado por 02 Research), puntos = peso×nivel/2, score 0-100 con medios puntos. Gate A (score≥80 + empresa verificada + dolor≥1 + contacto verificable + evidencia vigente) degrada a B si falla, con motivo registrado. Evidencia de urgencia >30 días se trata como no vigente (nivel→0), otras evidencias >90 días quedan marcadas como `_evidence_aged` en `uncertainty_codes` sin forzar el nivel a 0.
- Escribe en `prospects` (`account_id`, sin `school_id`/`operator_id`), `prospect_key='account:<id>'`, `classification` mapeada A→hot/B→warm/C→cold (mismo enum ya existente), `crm_candidate=true` solo para clasificación A, `status='new'` (nunca `ready_to_contact` automáticamente — **la revisión humana de las primeras 2-3 cohortes es quien cambia el status a `ready_to_contact`**, no este workflow). `metadata` guarda el desglose completo por factor (auto-score, evidencia usada, versión) para calibración futura.
- Aún no probado (construido, sin ejecutar todavía).

## Atacama Labs — 04 CRM Sync

- Fuente: [`atacama-labs-04-crm-sync.json`](atacama-labs-04-crm-sync.json), modo `test`.
- Sincroniza **únicamente** `prospects` con `status='ready_to_contact'` AND `crm_candidate=true` (o sea, solo lo que un humano ya aprobó) — nunca lee por clasificación/score directamente. Reutiliza el patrón contact-upsert→opportunity-upsert de "01 Lead Sync" y las RPCs generalizadas de 003: `enqueue_prospect_sync` (encola aprobados no encolados aún) + `claim_sync_jobs(..., p_source_type:'prospect')` (reclama solo jobs de origen prospect, nunca compite con "01 Lead Sync") + `complete_sync_job`. Campos personalizados de GHL (Fuente/Solución de interés/Lead ID) tomados de `icp_packs.crm.fields`, ya creados en 002.
- Sin trigger de schedule (a diferencia de "01 Lead Sync") — se dispara manualmente o por el futuro orquestador, consistente con que el gate de revisión humana es manual por ahora.
- Aún no probado (construido, sin ejecutar todavía).

## Atacama Labs — 05 Outreach Draft

- Fuente: [`atacama-labs-05-outreach-draft.json`](atacama-labs-05-outreach-draft.json), modo `test`.
- Genera **solo borradores** (`outreach.status='draft'`) — no existe ningún nodo que llame a un proveedor de email/WhatsApp, es estructuralmente imposible que este workflow envíe algo. Si un prospect no tiene evidencia real en `research`, se salta explícitamente (`skip_reason`) en vez de inventar un ángulo — consistente con "no inventar dolores ni información". El prompt exige citar al menos una evidencia real con su URL.
- Alcance: `prospects.crm_candidate=true` sin un draft/envío previo activo. Usa OpenClaw (credencial compartida temporal, mismo pendiente U17) para redactar, citando evidencia de `research`.
- Aún no probado (construido, sin ejecutar todavía).

## Atacama Labs — 06 Gmail Sync

- Fuente: [`atacama-labs-06-gmail-sync.json`](atacama-labs-06-gmail-sync.json).
- **Esqueleto terminado, deliberadamente INACTIVO**: no existe credencial de Gmail para Atacama (nunca se compartió). El único nodo real lanza un error explicando el bloqueo exacto. Nunca se activará ni se probará hasta que exista la credencial — registrado en `docs/USER-ACTIONS.md`. Alcance previsto cuando exista: leer respuestas de Gmail vinculadas a drafts `sent`, registrar `direction=inbound` en `outreach` — nunca enviar correos (eso seguiría sin existir; 05 solo genera drafts).

## Pendiente / no incluido en esta versión

- No hay alerta ni notificación cuando un job llega a `failed` tras 4 intentos — hoy solo queda visible consultando `sync_jobs`/`lead_submissions` directamente. Agregar si Christian lo pide (p.ej. un nodo que notifique cuando `attempts>=4`).
- Búsqueda de duplicados en GHL por "Lead ID" antes de crear: la API de búsqueda de GHL (`/opportunities/search?q=`) no filtra por valor de custom field (probado, devuelve 0 resultados aunque exista) — la idempotencia real depende de: (a) el `claim` atómico (un job se procesa una sola vez), y (b) los IDs de GHL persistidos en `lead_submissions` para reintentos. Documentado como limitación conocida, no un bug.
