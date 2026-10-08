# n8n — Atacama Labs

Workflows propios de Atacama Labs en la instancia n8n compartida (`n8n.srv1650725.hstgr.cloud`). **No se tocó ningún workflow ni pipeline de EnBandeja** — todo lo de acá es nuevo, con nombre/credenciales propios.

## Estado REAL de la instancia (verificado el 2026-10-05)

> Esta sección manda sobre el resto del archivo cuando haya diferencias; el resto es historia técnica de cómo se construyó cada pieza. Detalle de la limpieza en `docs/ATACAMA-OS-IMPLEMENTATION.md`.

Los workflows se agrupan con **etiquetas** de n8n (la API pública no ofrece carpetas):

| Etiqueta | Workflows | Estado |
|---|---|---|
| `ATACAMA — PRODUCCIÓN` | **01 Lead Sync v2.2** (`idniXY0Du2qet57O`), **07 Booking Sync** (`sw0xbhB91s5mhHCh`) | Activos, cada 2 min, sin errores |
| `ATACAMA — EN DESARROLLO` | 00 Orchestrator (`ubXANtYTd5y9wdbP`, inactivo) y las copias PROD de 01 Discovery (`AnjrmngEzXWiXIVT`), 02 Research (`cw3oTblethuiTtEm`), 02b Signals (`liNLmszWOlEz9kVv`), 03 Qualification (`LzkojauO5ypKNALc`) | "Activos" solo para ser invocados por el orquestador; **el pipeline de prospección está detenido** (Discovery bloqueado por el scraper compartido; 0 prospectos reales de Atacama) |
| `ATACAMA — ARCHIVO` | Lead Sync v1 (`oKQujZqHy09dMJao`), v2 (`COWM3i2F4VZq7Dau`), v2.1 (`dlB8WgFwQZjtDJz1`) | Archivados (no borrados) |
| `LEGACY — ENBANDEJA` | 8 workflows del motor original + 3 benchmarks | Inactivos; no tocar, no borrar sin autorización |

**Diferencias con lo escrito más abajo**
- `04 CRM Sync`, `05 Outreach Draft` y `06 Gmail Sync` **existen solo como JSON en este directorio**: se probaron como copias desechables y se borraron. **No están desplegados en la instancia.**
- Se dejó de cumplir "no se dejó ningún workflow activo permanentemente": 01 Lead Sync v2.2 y 07 Booking Sync están activos de forma permanente.
- `06 Gmail Sync` sigue bloqueado: no existe ninguna credencial de Gmail en la instancia.
- Dependencias compartidas con EnBandeja que **siguen en uso** y se migrarán después: servicio `enbandeja-gmaps:8080` (01 Discovery), credenciales `Header Auth account` / `Header Auth account 2` (OpenClaw y Crawl4AI en 02/02b), y el propio contenedor/ruta `enbandeja-n8n`.
- Todo workflow nuevo debe llamarse **Atacama Labs — …** (o nombre genérico) y no puede introducir dependencias `enbandeja-*`.

## Atacama OS · prospección y resumen diario (workflows 08, 09 y 10)

Generados por scripts versionados en [`build/`](build/) (los JSON de esta carpeta quedan en modo `test` con marcadores de ids; la versión `real` se genera con las constantes del pack `atacama-labs` y se despliega con el protocolo de copias). Detalle completo y evidencia en `docs/ATACAMA-OS-IMPLEMENTATION.md`.

| Workflow | Disparador | Qué hace |
|---|---|---|
| **08 Prospect Ingest** (`YCl1Xns0XLX4W6M6`) | `POST /webhook/atacama-prospects-ingest` con cabecera `X-Atacama-Key` | Recibe el JSON de Hermes, aplica el gate (empresa y dominio propios; evidencia citada con URL del dolor y del encaje; contacto público con su fuente; razón específica), llama a la RPC `ingest_prospect` (transaccional, deduplica por dominio, registra en `prospect_inbox`) y ejecuta 03 Qualification sobre las cuentas nuevas |
| **09 Prospect Approve** (`jznwD7AwEI0h9pEv`) | `POST /webhook/atacama-prospects-approve` con la misma cabecera | Marca como `ready_to_contact` solo prospectos `hot` + `crm_candidate` + `new`; ejecuta 04 CRM Sync una vez (entrada en la etapa *Investigado*) y 05 Outreach Draft una vez por cuenta. **No envía nada** |
| **10 Atacama Daily** (JSON con marcadores; **sin desplegar**) | Cron `30 8 * * *` (America/Santiago) | Resumen operativo por Telegram. Falta la credencial del bot |

Credenciales propias creadas: `Atacama Labs - Ingest Key` (cabecera de 08/09 y de Hermes) y `Atacama Labs - n8n API (lectura)` (solo para contar ejecuciones fallidas en el Daily). Ambas webhooks rechazan sin clave (403) y con un `icp_pack_id` que no sea el del workflow (error, sin escribir).

Cómo se usa (aprobación manual, hoy por API):

```bash
# ver lo que espera aprobación (en Supabase): prospects con classification='hot', crm_candidate=true, status='new'
curl -X POST "$N8N_BASE_URL/webhook/atacama-prospects-approve" \
  -H "X-Atacama-Key: $ATACAMA_INGEST_KEY" -H "Content-Type: application/json" \
  -d '{"icp_pack_id":"0ba54785-bff0-4a2d-a397-64e697d34e38","prospect_ids":["<uuid>"],"approved_by":"christian"}'
```

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

**Promoción a `atacama-labs` real — completa, 2026-09-15/16**: los 6 workflows probables (01/02/02b/03/04/05) pasaron bajo `atacama-labs-test`. Se generaron las versiones `real` (mismo script de build con `MODE=real`, constantes fijadas a `atacama-labs`/`0ba54785-bff0-4a2d-a397-64e697d34e38`) y se corrió una prueba final supervisada de la cadena completa **contra el ICP real** con una cuenta ficticia claramente rotulada (`PRUEBA FINAL SUPERVISADA (borrar despues)`, borrada al terminar): 03 Qualification (score 83, clasificación hot/A) → aprobación humana simulada (`status='ready_to_contact'`) → 04 CRM Sync (contacto+oportunidad reales creados en GHL, pipeline/etapa correctos, luego eliminados) → 05 Outreach Draft (`outreach.status='draft'`, nunca enviado). Todo limpiado después; conteos de EnBandeja verificados idénticos antes/después en cada paso.

Durante esta ronda se encontraron y corrigieron 3 bugs reales más (ninguno de aislamiento de pack):
1. **`workflowInputs` faltante**: el nodo `executeWorkflowTrigger` de n8n (typeVersion 1.1) requiere `parameters.workflowInputs.values` explícito o la activación falla con HTTP 400 — afectaba a 03/04/05/06 (construidos desde cero, no clonados).
2. **Constraint `hot_requires_v1_gates` de `prospects`** (de EnBandeja, no tocado): ya tiene una vía para verticales sin operador (`operator_required=false`), pero exige `operation_current IS TRUE` — un campo genérico ("¿empresa real operando?") que 03 Qualification dejaba en `null`. Corregido: `operation_current = company_verified`.
3. **Bug de JS en `Parse Draft Result`** (05): `const valid = errors.length===0 && subject && message` devolvía el string del mensaje (no un booleano) por el encadenamiento `&&` de JS, y `$json.valid === true` fallaba silenciosamente. Corregido con `Boolean(...)`.
4. **`Enqueue Prospect Sync`** (04): la RPC devuelve un escalar (uuid o `null`), y `responseFormat:'json'` de n8n fallaba al parsearlo pese a `neverError:true` (esa opción solo cubre errores HTTP, no de parseo). Corregido a `responseFormat:'text'` — el nodo no necesita el body parseado.

Los JSON versionados en este directorio quedan en modo `test` (el seguro por defecto para seguir iterando/probando). La promoción a `real` es un proceso repetible y ya probado (mismo script, `MODE=real`) — no se dejó ningún workflow activo permanentemente en n8n; todo se ejecuta vía copias desechables bajo demanda hasta que exista un orquestador (`00`) que decida cuándo correr cada uno en producción.

## Atacama Labs - 11 Won to Client (6-oct-2026 · **importado en n8n, INACTIVO**: id `jB62BWlu1Eg6BEuD`)

- Archivo: [`atacama-labs-11-won-to-client.json`](atacama-labs-11-won-to-client.json) (generado por [`build/won-to-client.mjs`](build/won-to-client.mjs)). Webhook `POST /webhook/atacama-won-to-client` con cabecera `X-Atacama-Key`, cuerpo `{"opportunity_id":"…","dry_run":false}` **o** el Webhook estándar de GHL con *Custom Data* (`opportunity_id`, `dry_run`), que llega en `body.customData`. `dry_run` acepta booleano o texto `"true"`/`"false"`; ausente, inválido, ambiguo o contradictorio (raíz y `customData` no coinciden) ⇒ **siempre `dry_run=true`**. Pruebas: `node n8n/build/won-to-client.test.mjs` (45 casos).
- Qué hace cuando GHL avisa de una oportunidad ganada: relee la oportunidad en GHL (solo actúa si `status=won` en `Atacama Labs — Ventas`), localiza o crea la **Business**, crea el **Servicio contratado** (estado Onboarding) y, si corresponde, un **Proyecto** inicial (Planificado), y deja las relaciones (servicio↔oportunidad, business↔servicio, business↔oportunidad, business↔contacto, business↔proyecto, proyecto↔servicio). No crea tareas (eso lo hace el Workflow nativo de GHL) ni inventa montos o fechas.
- Seguridad: **`dry_run` es verdadero por defecto**; sin nombre de empresa confiable se detiene (`needs_human`); idempotente (si la oportunidad ya tiene Servicio no repite).
- Pruebas hechas: 17 pruebas unitarias de la lógica de los nodos (guardas, plan, idempotencia, relaciones) y verificación por API de cada operación con registros TEST ya borrados. El flujo completo **no se ejecutó** (ninguna oportunidad está ganada y no se dispara de forma artificial).
- Estado: importado el 6-oct con la credencial `GHL — Atacama OS` (`4Vc6nfxyKjZ14Bep`, creada a mano por Christian) en los 8 nodos que llaman a GHL y la credencial `Atacama Labs - Ingest Key` en el webhook. **Inactivo**, sin schedule, 0 ejecuciones. Para activarlo: crear antes el Workflow de GHL descrito en `docs/ATACAMA-OS-IMPLEMENTATION.md` (E5) y activar 11 solo cuando se quiera recibir avisos.

## Atacama Labs - 07 Booking Sync (2026-09-25; ACTIVO desde el 5-oct-2026 como copia `VsLCMZ6MeDsNvGzI`, el original `sw0xbhB91s5mhHCh` quedó archivado)

> **Actualización 6-oct-2026 (Bloque E):** el pipeline ahora tiene 7 etapas (Nuevo → Investigado → Contactado → Respondió → Diagnóstico → Propuesta → Seguimiento). Una reserva lleva a **Diagnóstico** desde Nuevo, Investigado, Contactado o Respondió (la lista "etapa temprana" tiene esas 4). Reverificado de punta a punta el 6-oct (oportunidad TEST en Investigado → reserva TEST → pasó a Diagnóstico en ~2 min; todo borrado después).

- Archivo: [`atacama-labs-07-booking-sync.json`](atacama-labs-07-booking-sync.json). Cada 2 min lista las reservas del calendario GHL **«Reunión de activación»** (id `D3CUkoKxRyze3Kpt8sa9`, 30 min, Google Calendar de atacamalabs.cl) de los últimos 3 días y los próximos 120. GHL no ofrece webhooks para Private Integrations, por eso es *polling* por API.
- Flujo: `List Booked Events` → `Split Events` (descarta canceladas/no-show) → `Find Lead` (por `ghl_contact_id` en Supabase) → `Decide` (solo si el lead ya tiene oportunidad y esa reserva no está registrada; si el lead aún no sincroniza, reintenta en la siguiente corrida) → `Get Opportunity` → si sigue en Nuevo/Contactado, `Move To Diagnostico` (etapa `fec1e794-…`; nunca retrocede una oportunidad que ya está en Propuesta/Seguimiento/Cerrado) → `Update Lead Meeting` (PATCH `meeting_scheduled`, `meeting_start`, `calendar_event_id`, `calendar_provider='ghl'`). Idempotente por `calendar_event_id`.
- Credencial propia `Atacama Labs - GHL Calendars Auth` (`MIOyxnOFWOwL1Rvt`, httpHeaderAuth con el token de la Private Integration «Atacama Labs — Web», scopes de calendars/contacts/opportunities/customFields). El token vive solo en n8n y en `.env.local` (`GHL_ATACAMA_TOKEN`); no en el repo.
- Probado end-to-end: lead de prueba → sync (Lead Sync v2) → reserva de prueba por API → en ≤2 min `meeting_scheduled=true`, `meeting_start` correcto y la oportunidad pasó a «Diagnóstico». Datos de prueba (reserva, oportunidad, contacto, lead, job) borrados.
- Limitaciones: la reserva debe hacerse con el mismo email/teléfono del lead (el formulario de `/diagnostico` los pasa por URL a la agenda); las horas del calendario están en UTC en la API (la ubicación GHL está en UTC), por eso `openHours` se guardó como 13:00–21:00 UTC = 10:00–18:00 Chile en horario de verano (UTC-3); con el cambio de hora de abril de 2027 se corre 1 h: ajustar en GHL → Calendar → Availability.

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

### 01 Lead Sync v2 — contexto del diagnóstico (2026-09-25; v2.2 ACTIVO en n8n: id `idniXY0Du2qet57O`; v2.1 `dlB8WgFwQZjtDJz1`, v2 `COWM3i2F4VZq7Dau` y v1 `oKQujZqHy09dMJao` quedaron desactivados como rollback)

> v2.2 = v2.1 + el rubro (`diagnostic_data.industry`, línea «Rubro» en la nota). v2.1 = v2 + la casilla opcional «¿Algo más que quieras contarnos?» (`extra_note`) en la nota de GHL. El JSON versionado de este directorio refleja el estado actual: v2.2 + atribución (ver abajo).

- Archivo: [`atacama-labs-01-lead-sync-v2.json`](atacama-labs-01-lead-sync-v2.json) (13 nodos). **Está activo y reemplaza al v1 (`oKQujZqHy09dMJao`), que quedó DESACTIVADO (no borrado) como respaldo de rollback.** Verificado 2026-09-25 con 2 leads de prueba reales por `/api/leads` de producción (agentes/plan operación y web/plan ecommerce): ambos `synced`, oportunidad en pipeline/etapa correctos, Solución de interés = `Agentes` / `Ecommerce`, nota completa en el contacto; datos de prueba borrados en GHL y Supabase (queda solo el lead previo de Nayra).
- Cambios sobre v1: tras `Already Has GHL IDs?` (rama "no") se agregan `Get Lead Context` (GET a `lead_submissions` por `lead_id`: service, plan, interest, source_*, campaign, diagnostic_data; **no se toca `claim_sync_jobs`**, que comparte cola con el pipeline de prospección) y `Build GHL Payload` (Code: arma "Solución de interés" y el texto de la nota). `Create GHL Opportunity` usa `ghl_solution` en vez de `solution`. Nuevo `Add GHL Note` (POST `/contacts/{id}/notes`, `continueOnFail`) cuelga de `Opportunity OK?` en paralelo a `Complete Success`: si la nota falla no falla el job.

### Atribución en la nota de GHL (2026-09-29, editado directo sobre `idniXY0Du2qet57O` vía API — PRODUCTION_READINESS_SPEC_V1 §22.6)

El frontend ya guardaba `utm_source`/`utm_medium`/`utm_campaign`/`utm_content`/`utm_term`/`landing_path`/`referrer_host` dentro de `diagnostic_data` (atribución de primera sesión, capturada en `sessionStorage`), pero la nota de GHL no los mostraba — solo quedaban en Supabase. Se agregaron esas 7 claves al mapa `DATA` de `Build GHL Payload` (mismo mecanismo genérico que ya usaban `industry`/`extra_note`, sin tocar la estructura del nodo), con etiquetas: Canal de origen, Medio, Campaña, Contenido, Término, Landing, Sitio de referencia. Probado con un lead real vía `/api/leads` (`utm_source=instagram`, `utm_campaign=lanzamiento-septiembre`, `landing_path=/agentes`): la nota en GHL mostró las 4 líneas correctamente; contacto/oportunidad/lead de prueba eliminados después. El JSON de este directorio ya refleja este cambio.
- Mapeo de "Solución de interés" (dropdown de la Opportunity, id `yY5sqFov8GeXcx5G9vuy`): `agentes`→**Agentes**, `a-medida`→**A Medida**, `web`→**Página Web**, `web`+plan `ecommerce`→**Ecommerce**, `general`→**No definido**. Sin contexto (Nayra, leads antiguos, error de la consulta) se conserva el comportamiento anterior (`solution` del job: `unsure`, `atencion-y-seguimiento`…).
- **Hecho 2026-09-25 (vía API):** se agregaron al dropdown las 5 opciones (las antiguas se conservaron; respaldo del campo en el scratchpad de la sesión). Requisito que existía: el dropdown hoy solo tiene los slugs antiguos; hay que agregar las opciones `Agentes`, `A Medida`, `Página Web`, `Ecommerce`, `No definido` (exactamente esos textos) **antes** de activar v2, o la creación de la oportunidad falla y el job entra en reintentos.
- Despliegue seguro (protocolo de arriba), ya ejecutado: importado como workflow nuevo, credenciales verificadas, v1 desactivado, v2 activado, probado con leads rotulados y borrados. Nunca editar in-place un workflow activo.
- Observación (preexistente, no urgente): el campo `Fuente` recibe `web` (el `source` del API) y no `web_contact`; GHL lo acepta. Si se quiere normalizar, mapear `web`→`web_contact` en `Create GHL Opportunity`.
- Rollback: desactivar v2 y reactivar v1 (`POST /workflows/{id}/deactivate|activate`).
- Lógica del Code node probada offline con casos: agentes, ecommerce, web, general, sin contexto, error de consulta, respuesta vacía.

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

## Atacama Labs — 00 Orchestrator

- Fuente: [`atacama-labs-00-orchestrator.json`](atacama-labs-00-orchestrator.json), modo `real`. Workflow estable en n8n (id `ubXANtYTd5y9wdbP`), **inactivo** salvo cuando se dispara manualmente (ver protocolo de disparo abajo — no tiene "run now" en la API, se usa el mismo truco de trigger temporal que el resto).
- Encadena **01 Discovery → 02 Research → 02b Signals → 03 Qualification** vía nodos `executeWorkflow` apuntando a 4 sub-workflows estables e inactivos (creados una vez, referenciados por id fijo: `AnjrmngEzXWiXIVT`/`cw3oTblethuiTtEm`/`liNLmszWOlEz9kVv`/`LzkojauO5ypKNALc`). **Se detiene después de 03 Qualification por diseño** — no existe ningún camino, ni siquiera ante error, que llegue a llamar a 04 CRM Sync o 05 Outreach Draft. Esos requieren que un humano apruebe cada prospect (`status='ready_to_contact'`) fuera de este workflow.
- **`icp_pack_id` explícito obligatorio**: el primer nodo (`Require ICP Pack ID`) no acepta ningún default ni resolución por slug — si falta o no coincide con la constante fijada en esta copia del workflow, lanza error antes de tocar cualquier tabla.
- **Lock atómico contra ejecuciones superpuestas**: `supabase/migrations/20260916_runs_one_active_lock.sql` agrega un índice único parcial `runs_one_active_per_pack` sobre `public.runs(icp_pack_id) where status='running'`. El nodo `Acquire Lock (insert run)` inserta un run nuevo; si ya hay uno `running` para ese pack, el índice hace fallar el `INSERT` (HTTP 409) y el orquestador aborta con un mensaje claro — no es una bandera de lectura-luego-escritura (no atómica), es una restricción real de base de datos.
- **Recuperación de claims atascados**: antes de tomar el lock, hace `PATCH accounts SET research_status='pending' WHERE research_status='researching' AND updated_at < now()-15min` — si una corrida anterior de 02 Research murió a mitad de un item, esa cuenta no queda huérfana.
- **Checkpoint de progreso**: después de cada paso (Discovery/Research/Signals/Qualification) hace `PATCH runs.result` con el resultado acumulado — permite ver el avance real consultando la tabla `runs` sin esperar a que termine todo el flujo, y es la base de la reanudabilidad (cada sub-workflow ya es idempotente por diseño: vuelve a llamarlos con los mismos parámetros y solo procesan lo que sigue pendiente).
- **Discovery opcional** (`skip_discovery`): si el scraper compartido `enbandeja-gmaps` está bloqueado, el flujo puede saltarse Discovery y usar cuentas ya sembradas manualmente (ver "Cohorte 1" abajo) — nunca reintenta Discovery en loop ni genera ejecuciones superpuestas para compensar.
- **Manejo de errores sin dejar el lock atascado**: cada nodo `Call *` tiene `continueOnFail:true` — si un sub-workflow falla, el orquestador registra el error y sigue hasta `Release Lock (finish run)`, que **siempre** se ejecuta y marca el run `completed` o `error` según corresponda. Nunca hay un camino que deje `status='running'` colgado indefinidamente por una falla de un paso.

### Validado en producción, 2026-09-16 (lock probado con datos reales, no solo simulado)

Se ejecutó 2 veces contra el ICP real (`atacama-labs`). En **ambas** ejecuciones, el trigger de schedule temporal disparó dos veces (mismo comportamiento de plataforma ya documentado) — y en **ambas** el lock rechazó correctamente la segunda ejecución con el mensaje `LOCK: ya existe una ejecución en curso`. Esto no fue una prueba planeada del lock — fue el propio comportamiento errático de la plataforma poniendo a prueba la protección en condiciones reales, y funcionó las 3 veces (2 en esta corrida real + 1 en la prueba mecánica contra `atacama-labs-test`).

**1er intento** (`skip_discovery=false`): Discovery falló las 4 áreas (scraper bloqueado, 4ta vez en la sesión). Research/Signals/Qualification correctamente no hicieron nada (`no_work`) en vez de inventar datos. Run completado limpio en ~10 min, lock liberado.

**2do intento** (`skip_discovery=true`, tras sembrar 25 cuentas reales manualmente — ver abajo): Research encontró 0 pendientes (correcto, ya estaban `research_status='complete'`), Signals empezó a procesar las 25 cuentas reales.

### Cierre de sesión 2026-09-16: cohorte 1 interrumpida a las 2/25 (por instrucción explícita de Christian)

El ritmo real observado en 02b Signals (llamadas OpenClaw reales contra contenido real, no simulado) fue de **~7 minutos por empresa** — extrapolado a las 25, ~3 horas totales, incompatible con la ventana de cierre de la sesión. Christian instruyó terminar únicamente la ejecución en curso sin iniciar cohortes nuevas.

- Detenida con `POST /executions/386/stop` (ejecución padre del orquestador) → n8n confirmó `status:"canceled"`.
- **Hallazgo**: la ejecución hija de 02b Signals (`388`, invocada por el padre vía `executeWorkflow`) siguió `status:"running"` después de detener al padre — detener un padre `executeWorkflow` no detiene automáticamente a sus hijos ya en curso. Se detuvo aparte con `POST /executions/388/stop`, también confirmado `canceled`.
- `runs` id `a9357d03-4e23-4437-ac55-2a60a0d9d1ee` cerrado manualmente: `status='cancelled'`, `finished_at=now()`, `result` con checkpoint completo — 2 empresas procesadas (Logística FG, EXPPRO), 23 pendientes por nombre y orden exacto, `qualification.status='not_started'` (nunca se invocó 03 en este run), y un `resume_procedure` explícito para retomar mañana.
- Verificación de cierre: `GET /executions?status=running` → 0 en toda la instancia n8n; `accounts`/`sync_jobs` sin nada en `researching`/`processing` para `atacama-labs`; sin locks activos.
- **Limpieza adicional**: 2 copias pre-PROD ya superadas eliminadas (`HvLcNkmL8Fo1hePi` "01 Discovery", `oVNNvuRye4pp0Kz0` "02 Research" — ambas del 2026-09-15, previas a la convención `(PROD)`). Se encontró y retiró un trigger de prueba olvidado dentro de este mismo orquestador (`TEST Trigger (disposable)`, cron `*/1 * * * *`, nunca limpiado tras una prueba anterior) — el workflow quedó en 25 nodos, `active:false`, sin cron automático.
- **Para retomar**: crear una copia nueva del orquestador (nunca reactivar una ya ejecutada), invocar con `{icp_pack_id: '0ba54785-bff0-4a2d-a397-64e697d34e38', skip_discovery: true, cohort_limit: 25, run_label: 'cohorte-1-2026-09-16-resume'}`. Idempotente por diseño — las 2 cuentas ya procesadas no se repiten.

## Atacama Labs — 02b Signals

- Fuente: [`atacama-labs-02b-signals.json`](atacama-labs-02b-signals.json), modo `test`.
- Clonado de "02b - Signals Engine" de EnBandeja (`q4zOm2QckejUodh2`, solo lectura). Este workflow ya era **100% genérico** en el original (sin ningún concepto de operador/colegio) — reutilizado casi sin cambios, solo el protocolo de seguridad (sin defaults, `Assert Expected Pack` ×2, `icp_pack_id` hardcodeado en `Init Configuration`/`Fetch Accounts For Signals`/`Upsert Signals`/`Update Account Signals Checked`). Lee `icp_packs.atacama-labs.signals.{types,search_guidance}` (agregado `search_guidance`, faltaba). Solo corre sobre `accounts` con `research_status='complete'` (después de 02 Research).
- Credencial OpenClaw compartida temporalmente (mismo pendiente que 02 Research, U17).
- **Probado 2026-09-15/16** (copia desechable, `atacama-labs-test`, 1 ejecución): mecánica correcta, sin errores, sin señales inventadas (agente reportó `signals_found:0` para el sitio ficticio `example.com`, correcto — no forzó una señal falsa). No promovido con prueba real dedicada (mecánica idéntica a 01/02, ya validada dos veces bajo el pack real).

## Atacama Labs — 03 Qualification

- Fuente: [`atacama-labs-03-qualification.json`](atacama-labs-03-qualification.json), modo `test`.
- **Construido desde cero** (NO clonado de EnBandeja): el `03` real está profundamente acoplado a conceptos de operador/colegio/plataforma-incumbente (`operator_relation`, `manual_process_count`, `platform_status`, `Hard Gates`/`Raw Score`/`Caps Penalties` específicos de casino-escolar) que Christian pidió explícitamente no reutilizar ("no inventar criterios nuevos" también implica no heredar los de otro vertical). Se reutilizó solo la forma general de orquestación (resolución de ICP, fetch de cuentas elegibles, loop, upsert).
- Implementa **exactamente** `contracts/PROSPECTING.md` + `contracts/prospecting-policy.json`: 7 factores (pain/budgetProxy/volume/automation/access/urgency/fit), nivel 0/1/2 por factor leído de `research.research_type='factor:<clave>'` (poblado por 02 Research), puntos = peso×nivel/2, score 0-100 con medios puntos. Gate A (score≥80 + empresa verificada + dolor≥1 + contacto verificable + evidencia vigente) degrada a B si falla, con motivo registrado. Evidencia de urgencia >30 días se trata como no vigente (nivel→0), otras evidencias >90 días quedan marcadas como `_evidence_aged` en `uncertainty_codes` sin forzar el nivel a 0.
- Escribe en `prospects` (`account_id`, sin `school_id`/`operator_id`), `prospect_key='account:<id>'`, `classification` mapeada A→hot/B→warm/C→cold (mismo enum ya existente), `crm_candidate=true` solo para clasificación A, `status='new'` (nunca `ready_to_contact` automáticamente — **la revisión humana de las primeras 2-3 cohortes es quien cambia el status a `ready_to_contact`**, no este workflow). `metadata` guarda el desglose completo por factor (auto-score, evidencia usada, versión) para calibración futura.
- **Probado 2026-09-15/16, bajo `atacama-labs-test` y bajo `atacama-labs` real** (2 copias desechables): con 7 evidencias ficticias (4 factores nivel 2, 3 nivel 1), calculó `raw=82.5→83`, `classification=hot`, `crm_candidate=true`, `status='new'` — correcto. Encontrado y corregido en el camino: el constraint `hot_requires_v1_gates` de `prospects` (de EnBandeja) exige `operation_current IS TRUE` incluso con `operator_required=false`; se corrigió a `operation_current = company_verified` (ver detalle arriba, "Promoción a real").

## Atacama Labs — 04 CRM Sync

- Fuente: [`atacama-labs-04-crm-sync.json`](atacama-labs-04-crm-sync.json), modo `test`.
- Sincroniza **únicamente** `prospects` con `status='ready_to_contact'` AND `crm_candidate=true` (o sea, solo lo que un humano ya aprobó) — nunca lee por clasificación/score directamente. Reutiliza el patrón contact-upsert→opportunity-upsert de "01 Lead Sync" y las RPCs generalizadas de 003: `enqueue_prospect_sync` (encola aprobados no encolados aún) + `claim_sync_jobs(..., p_source_type:'prospect')` (reclama solo jobs de origen prospect, nunca compite con "01 Lead Sync") + `complete_sync_job`. Campos personalizados de GHL (Fuente/Solución de interés/Lead ID) tomados de `icp_packs.crm.fields`, ya creados en 002.
- Sin trigger de schedule (a diferencia de "01 Lead Sync") — se dispara manualmente o por el futuro orquestador, consistente con que el gate de revisión humana es manual por ahora.
- **Probado 2026-09-15/16, bajo `atacama-labs-test` y bajo `atacama-labs` real** (2 copias desechables): prospect `ready_to_contact` → contacto + oportunidad reales creados en GHL (pipeline/etapa correctos, verificado, luego eliminados) → `prospects.status='contacted'` con IDs de GHL reales. Encontrado y corregido: `Enqueue Prospect Sync` fallaba por `responseFormat` (la RPC devuelve un escalar, no un objeto/array) — corregido a `text`.

## Atacama Labs — 05 Outreach Draft

- Fuente: [`atacama-labs-05-outreach-draft.json`](atacama-labs-05-outreach-draft.json), modo `test`.
- Genera **solo borradores** (`outreach.status='draft'`) — no existe ningún nodo que llame a un proveedor de email/WhatsApp, es estructuralmente imposible que este workflow envíe algo. Si un prospect no tiene evidencia real en `research`, se salta explícitamente (`skip_reason`) en vez de inventar un ángulo — consistente con "no inventar dolores ni información". El prompt exige citar al menos una evidencia real con su URL.
- Alcance: `prospects.crm_candidate=true` sin un draft/envío previo activo. Usa OpenClaw (credencial compartida temporal, mismo pendiente U17) para redactar, citando evidencia de `research`.
- **Probado 2026-09-15/16, bajo `atacama-labs-test` y bajo `atacama-labs` real** (2 copias desechables): generó un draft real citando evidencia real ("procesos manuales de despacho por planilla Excel", "no cuentan con sistema de seguimiento"), `outreach.status='draft'` confirmado, nunca enviado. Encontrado y corregido: bug de JS en `Parse Draft Result` (`errors.length===0 && subject && message` devolvía el string del mensaje en vez de un booleano — `$json.valid === true` fallaba siempre) — corregido con `Boolean(...)`.

## Atacama Labs — 06 Gmail Sync

- Fuente: [`atacama-labs-06-gmail-sync.json`](atacama-labs-06-gmail-sync.json).
- **Esqueleto terminado, deliberadamente INACTIVO**: no existe credencial de Gmail para Atacama (nunca se compartió). El único nodo real lanza un error explicando el bloqueo exacto. Nunca se activará ni se probará hasta que exista la credencial — registrado en `docs/USER-ACTIONS.md`. Alcance previsto cuando exista: leer respuestas de Gmail vinculadas a drafts `sent`, registrar `direction=inbound` en `outreach` — nunca enviar correos (eso seguiría sin existir; 05 solo genera drafts).

## Pendiente / no incluido en esta versión

- No hay alerta ni notificación cuando un job llega a `failed` tras 4 intentos — hoy solo queda visible consultando `sync_jobs`/`lead_submissions` directamente. Agregar si Christian lo pide (p.ej. un nodo que notifique cuando `attempts>=4`).
- Búsqueda de duplicados en GHL por "Lead ID" antes de crear: la API de búsqueda de GHL (`/opportunities/search?q=`) no filtra por valor de custom field (probado, devuelve 0 resultados aunque exista) — la idempotencia real depende de: (a) el `claim` atómico (un job se procesa una sola vez), y (b) los IDs de GHL persistidos en `lead_submissions` para reintentos. Documentado como limitación conocida, no un bug.

## Prospección real (Bloque K, 6-oct-2026)
- **17 Prospect Search** (`n8n/atacama-labs-17-prospect-search.json`): buscador autenticado para Hermes (Exa vía la credencial de n8n; tope de 80 búsquedas por día).
- **18 Prospect Admit** (`n8n/atacama-labs-18-prospect-admit.json`): admisión a GHL (contacto + oportunidad en *Investigado* + nota de revisión) y borrador en Supabase; solo score ≥ 80 con todos los gates. No envía nada. Lo llama 08 después de 03; también puede invocarse por webhook (`/webhook/atacama-prospect-admit`, `X-Atacama-Key`, `{ "account_ids": [...] }`) para reintentar.
- Ambos se generan con `node n8n/build/prospect-flow.mjs` (JSON de producción, con ids reales). 08 se genera con `n8n/build/atacama-os-workflows.mjs` (JSON versionado en modo test con marcadores; ahora encadena 18). 09 queda desactivado (aprobaba antes de CRM); 04/05 antiguos sin uso.
- Pruebas: `node scripts/prospecting/admit-core.test.mjs` y `node n8n/build/prospect-flow.test.mjs`.

## Prospect Gateway (Bloque L, 7-oct-2026)
- **19 Prospect Gateway** (`n8n/atacama-labs-19-prospect-gateway.json`, id `ZlYTYp9AVdCYPdwS`): puerta universal de prospectos (`POST /webhook/atacama-prospect-gateway`, `X-Atacama-Key`; acciones `analyze | import | prepare | act`; `request_id` idempotente). Generador: `node n8n/build/prospect-gateway.mjs` (el JSON versionado es el de producción; `MODE=test` genera la copia de pruebas con otro pack y ruta). Guía y contrato: `docs/PROSPECT-GATEWAY.md`.
- Tests: `node scripts/prospecting/gateway-core.test.mjs` · `node scripts/prospecting/gateway-flow.test.mjs` · `GATEWAY_REAL_HTML=<ruta> node n8n/build/prospect-gateway.test.mjs`.

## Hermes Operator (Bloque M, 7-oct-2026)
- **20 Hermes Operator** (`n8n/atacama-labs-20-hermes-operator.json`, id `Pm5XfYBocmWR3YgY`): única puerta por la que Hermes opera Atacama OS (`POST /webhook/atacama-hermes-operator`, `X-Atacama-Key`; `{ tool, request_id, params, order_text?, confirmation_code? }`). Aplica niveles de permiso 1/2/3, idempotencia y auditoría (`operator_audit_log`), y delega en el Prospect Gateway (19) o lee GHL de forma acotada. Generador: `node n8n/build/hermes-operator.mjs`; prueba nodo a nodo: `node n8n/build/hermes-operator.test.mjs`. Guía: `docs/HERMES-OPERATOR.md`.

## Motor de correo (Bloque 1, 8-oct-2026)
- **21 Outreach Engine** (`7yRgPPDkiVyjmb3t`, webhook `atacama-outreach-engine`), **22 Outreach Sender** (`aRvzG87Qg4uqI5bD`, cada 10 min + webhook `atacama-outreach-send-due`), **23 Gmail Sync** (`Bx4tC1Qn5H6097BL`, cada 10 min + webhook `atacama-gmail-sync`). Generador: `node n8n/build/outreach.mjs` (con `GMAIL_CRED_ID`/`GMAIL_CRED_NAME` conecta la credencial de Gmail). Prueba: `node n8n/build/outreach.test.mjs`. Modo en `outreach_config.mode`; guía: `docs/OUTREACH.md`.
- **24 Followup Planner** (`rWulaiKeio0CsXrs`, cada 30 min + webhook `atacama-followup-planner`): tareas +3/+7 días hábiles en GHL, borradores de seguimiento, cancelación automática y limpieza de tareas duplicadas. Generador: `node n8n/build/outreach.mjs`. Ver `docs/OUTREACH.md` §7.

## 25 Atacama Ops (Bloque 2, 7-oct-2026) — Daily, alertas, health y compuertas
- Workflow `Atacama Labs - 25 Atacama Ops` (`OxLcj12RP0qLVLVc`, activo, etiqueta «ATACAMA — PRODUCCIÓN»). Webhook `POST /webhook/atacama-ops`, header `X-Atacama-Key` (credencial Ingest Key). Archivo: [`atacama-labs-25-atacama-ops.json`](atacama-labs-25-atacama-ops.json), generado por `node n8n/build/ops.mjs` (pruebas: `node n8n/build/ops.test.mjs`, 38; núcleo `node scripts/ops/ops-core.test.mjs`, 25).
- **Solo lectura** sobre GHL (oportunidades, búsqueda de tareas), Gmail (`gmail_check` de 22/23 solo si `deep`), n8n (workflows y ejecuciones) y Supabase (mensajes, candidatos, piezas, métricas, señales). **Escribe únicamente** `ops_alerts` y `ops_runs`. No tiene nodos de envío.
- Acciones: `daily`, `today`, `urgent`, `health`, `stale`, `followups`, `replies`, `radar_new`, `content_status`, `content_performance`, `radar_gate`, `content_gate`, `radar_report`, `content_radar_report`, `alerts_poll`, `alerts_ack`. `dry_run:true` y `now_ms` permiten simular sin escribir.
- Lo agenda Hermes (cron `atacama-daily` / `atacama-alerts`), no n8n: n8n calcula, Hermes programa y entrega. Detalle en [`../docs/OPERATIONS.md`](../docs/OPERATIONS.md).
- El preview anterior `10 Atacama Daily (PREVIEW)` (`LzZCCKXLMctkJRUo`) quedó **desactivado** (no borrado) por este reemplazo.
- Migración: [`../supabase/migrations/20261009_ops_daily.sql`](../supabase/migrations/20261009_ops_daily.sql) (`ops_alerts`, `ops_runs`; RLS activa, sin acceso para anon/authenticated).

## 26 LinkedIn Engine (Bloque 3, 7-oct-2026)
- `Atacama Labs - 26 LinkedIn Engine` (`ve4uKTMQkGWzzmBV`, activo, etiqueta PRODUCCIÓN), webhook `POST /webhook/atacama-linkedin` (`X-Atacama-Key`). Generado por `node n8n/build/linkedin.mjs`; pruebas `node n8n/build/linkedin.test.mjs` (36).
- Acciones: `list | status | recommend | approve | event | config | set_config | lists | test`. Waalaxy vía la credencial `Waalaxy — Atacama OS` (`S6oCbITh4Z93ZRjx`); el único POST a Waalaxy es el alta (`/prospects/addProspectFromIntegration`). Escribe `prospect_candidates.channel_state`, `outreach_config.linkedin_*` y `operator_audit_log`; GHL siempre por el Prospect Gateway (`act`).
- Reconstruir los workflows de correo exige `GMAIL_CRED_ID=rA6hBRbpf0nbDWmh node n8n/build/outreach.mjs` (sin la variable se generan sin la credencial de Gmail).

## 12 Content Intake — fechas (7-oct-2026)
- El nodo `Evaluate` propone la fecha con `scripts/content/schedule-core.mjs` (incrustado) leyendo antes `Fetch Scheduled` (Supabase) y `List GHL Posts` (GHL, incluye posts manuales). Sin fallback a +7 días; ver `docs/ATACAMA-OS-IMPLEMENTATION.md` «Corrección de fechas».

## 27 Content Growth y 28 Content RSS (Ola A, 8-oct-2026)
- `Atacama Labs - 27 Content Growth` (`M4LyGH4UxE5sYIh5`): webhook `POST /webhook/atacama-content-growth` (`X-Atacama-Key`) con 16 acciones (cola, Founder Interview, recursos, RSS, competencia, señales candidatas). Generado por `node n8n/build/content-growth.mjs`; pruebas `node n8n/build/content-growth.test.mjs` (51).
- `Atacama Labs - 28 Content RSS` (`6wnrHglfnt6l9va0`): cada hora + webhook `atacama-content-rss`. Feeds en `content_feeds`. `node n8n/build/content-rss.mjs` · pruebas 27.
- Datos iniciales idempotentes: `node scripts/content/seed-ola-a.mjs`.
