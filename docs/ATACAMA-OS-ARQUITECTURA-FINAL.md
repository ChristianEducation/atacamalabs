# Atacama OS — Arquitectura final, activación y pendientes (Bloque 3 · 7-oct-2026)

> Estado (8-oct-2026, tras la Ola A): **todo construido, probado y desplegado; el contenido (RSS, inteligencia orgánica, Founder Interview, recursos y gobernador de cola) ya opera y termina siempre en revisión.** El encendido comercial (correo en vivo) se hace con una sola orden y solo espera dos datos humanos: el pie legal del correo (razón social/RUT) y el interruptor `dry_run` de Won→Cliente en GHL. LinkedIn sigue apagado hasta tener lista y campaña de producción en Waalaxy. Ola A: ver §11.

## 1. Arquitectura (una responsabilidad por pieza)

| Pieza | Rol | Dónde vive |
|---|---|---|
| **Hermes** | Inteligencia y operador conversacional (Telegram). Investiga (radares), recomienda, redacta, consulta y ejecuta acciones permitidas | VPS, contenedor `hermes-agent`; MCP `atacama-os` (42 herramientas) |
| **GHL** | **Fuente de verdad comercial**: contactos, oportunidades (pipeline de 7 etapas), tareas, Business/Servicio/Proyecto, Social Planner | GoHighLevel |
| **n8n** | Orquestación: Gateway, motores de correo y LinkedIn, Ops, contenido | `n8n.srv1650725.hstgr.cloud` |
| **Supabase** | Estado, evidencia, auditoría (`prospect_candidates`, `outreach_*`, `content_*`, `ops_*`, `operator_audit_log`) | proyecto `uwquwjmiofixzugttals` (compartido con EnBandeja LEGACY) |
| **Gmail Engine** | Outbound por correo con aprobación humana (workflows 21–24) | n8n + Gmail OAuth |
| **Waalaxy** | **Solo ejecutor de LinkedIn** (no es CRM ni cerebro) | API pública vía n8n 26 |
| **/ops** | Panel móvil de **solo lectura** (PIN de 6 dígitos) | `https://atacamalabs.cl/ops` (Next.js en Vercel) |
| **Claude Code** | Ingeniería/mantenimiento | repo `ChristianEducation/atacamalabs` (`main`) |

Lety sigue separado y no bloquea nada. **EnBandeja es LEGACY** (workflows etiquetados `LEGACY — ENBANDEJA`, 36 contactos `legacy:enbandeja` en GHL): no se toca.

Flujo comercial completo (probado E2E el 7-oct):
`Radar/otra fuente → Prospect Gateway → GHL Investigado → recomendación de canal (email | LinkedIn | investigar más) → borrador / alta propuesta → aprobación humana con código → envío (Gmail) o alta en Waalaxy → Contactado → respuesta → Respondió (se detienen los seguimientos) → Diagnóstico → Propuesta → Seguimiento → Won → onboarding (4 tareas) → Business + Servicio contratado + Proyecto`.

## 2. Workflows n8n activos (25 de producción)

| # | Workflow | Disparo | Función |
|---|---|---|---|
| 01 Lead Sync v2.2 · 07 Booking Sync | cada 2 min | Formulario web / reservas → GHL (Nuevo / Diagnóstico) |
| 08 Prospect Ingest · 17 Prospect Search · 18 Prospect Admit | webhook | Camino v1 del radar (con gate de evidencia) y búsqueda web |
| **19 Prospect Gateway** | webhook | Entrada universal de prospectos (analyze/import/prepare/act) |
| **20 Hermes Operator** | webhook | Acciones de Hermes sobre GHL/Supabase con niveles de permiso y auditoría |
| **21 Outreach Engine · 22 Sender · 23 Gmail Sync · 24 Followup Planner** | webhook + cada 10/10/30 min | Correo: borrador → aprobación → envío → respuestas → seguimiento +3/+7 |
| **26 LinkedIn Engine** (`ve4uKTMQkGWzzmBV`) | webhook | Canal LinkedIn: recomendar, aprobar (2 pasos), alta en Waalaxy, eventos |
| 11 Won to Client | webhook (GHL al ganar) | Business + Servicio + Proyecto + relaciones (dry_run por defecto) |
| 12 Content Intake · 13 Content Signals · 14 Content Sync (30 min) · 15 Content Metrics (3 h) · 16 Content Learnings | webhook / schedule | Content Engine |
| **25 Atacama Ops** | webhook | Daily, alertas, salud, panel `/ops`, compuertas de radares |
| 01–05 «(PROD)» | solo `executeWorkflow` | Subflujos del camino v1; dormidos (0 ejecuciones) |

Inactivos a propósito: `00 Orchestrator`, `09 Prospect Approve` (v1), `10 Atacama Daily (PREVIEW)` (reemplazado por 25), todos los `LEGACY — ENBANDEJA`, `ARCHIVO`, y `TEST - Waalaxy import manual` (prueba del 7-oct, inactiva).

## 3. Crons de Hermes (zona horaria del servidor: UTC; Chile hoy = UTC-3)

| Job | Cuándo | Qué hace | IA |
|---|---|---|---|
| `atacama-daily` | 11:30/11:45/12:30/12:45 UTC con guarda de hora Chile (08:20–09:15) | Daily por Telegram (resumen + enlace a `/ops`) | no |
| `atacama-alerts` | cada 15 min | Alertas útiles, avisos de radar, latido del estado de Hermes | no |
| Prospect Radar `8421589d0902` | mar y jue 13:30 UTC (10:30 Chile), con compuerta | Investiga e importa a **Investigado** (nunca contacta) | ≈ US$0,2/corrida |
| Content Radar `a46bd3138a0b` | lunes 12:00 UTC, con compuerta | Señales → (piezas bajo demanda) → `in_review` | ≈ US$0,2/corrida |
| `hermes-health-watch` y otros 3 | **pausados** | Reemplazados por Daily/alertas | — |

## 4. Estados y datos

- **Prospecto**: `prospect_candidates` (+ `channel_state` jsonb: canal recomendado/aprobado, estado LinkedIn: url, persona, cargo, lista/campaña, id externo de Waalaxy, códigos de resultado, último evento, próxima acción, respuesta, timestamps). GHL refleja etapa, notas, tareas y etiquetas.
- **LinkedIn**: `recomendado → aprobacion_pendiente → en_lista (sin contactar) → en_campana → conexion → mensaje → followup → respondio | rechazo | detenido | error`.
- **Correo**: `draft → approved → sending → sent` (+ `failed`/`cancelled`), clasificación de entrantes (reply/decline/unsubscribe/bounce/auto_reply).
- **Contenido**: `idea → scored → drafted → in_review → approved → scheduled → published` (aprobación solo en GHL).
- **Auditoría**: `operator_audit_log` (acciones de Hermes y del motor de LinkedIn), `ops_alerts`/`ops_runs` (alertas dedupe y corridas de radares).

## 5. Waalaxy / LinkedIn — qué funciona realmente

API pública verificada (docs.waalaxy.com, 7-oct): **4 endpoints** — importar prospectos (`POST /prospects/addProspectFromIntegration`, devuelve `importCode` y `addToCampaignCode` por prospecto), listar listas, listar campañas y probar conexión. **No existen webhooks ni consulta de estado.**

| Necesidad | Resultado |
|---|---|
| Alta aprobada de un prospecto en una lista / campaña | ✅ real (probado contra la cuenta; lista de prueba, sin campaña) |
| Detectar invitación enviada, conexión aceptada, mensaje enviado | ❌ **no hay API**: Atacama OS no puede saberlo por sí mismo |
| Detectar respuesta | ❌ no hay API: la informa Christian a Hermes (`log_linkedin_event`) → GHL **Respondió**, se detienen los seguimientos |
| Detener una secuencia en Waalaxy | ❌ no hay API (se hace en Waalaxy; en Atacama OS queda `detenido`) |
| Duplicados, límites, errores | ✅ se interpretan los códigos (`duplicated_prospect`, `max_limit_crm`, plan/permisos, 429) y quedan visibles en `/ops` y como alerta |

Reglas de seguridad: modo `off` (hoy) / `test` (solo lista de prueba, sin campaña, solo perfiles de la lista blanca) / `live` (lista + campaña de producción, tope diario). Nunca correo y LinkedIn a la vez al mismo prospecto. El alta exige código + palabras de Christian. **Una lista sin campaña no contacta a nadie.** La cuenta hoy tiene 3 listas (incluye «No contactar») y **0 campañas**: la lista y la campaña de producción las crea Christian en Waalaxy (la API no permite crearlas).

Hermes: `linkedin_ready`, `linkedin_status`, `recommend_channel`, `approve_linkedin`, `log_linkedin_event`, `linkedin_config`, `waalaxy_lists`. El Radar ahora pide persona (nombre completo + cargo) y perfil personal verificable con su fuente; si no hay, recomienda correo o «investigar más» (hoy 0 de 19 prospectos tienen persona + LinkedIn verificable: 18 van por correo, 1 requiere investigar).

## 6. Seguridad (estado al cierre)

- **Supabase**: RLS activo en todas las tablas de `public` (sin políticas = solo `service_role`); sin vistas expuestas; **revocado `EXECUTE` de `anon/authenticated/public`** en las 5 funciones solo-servidor (incl. `complete_territory_scan`, SECURITY DEFINER de EnBandeja, que `anon` podía ejecutar sin que RLS lo frenara; migración `20261010_revoke_server_functions_from_public.sql`, probado: `anon` recibe `permission denied`, `service_role` conserva el acceso). `set_updated_at` con `search_path` fijo.
- **Secretos**: ningún secreto ni `.env` versionado (escaneo de patrones sobre todos los archivos trackeados); `.env.local` ignorado; permisos 600 en `/opt/data/.env`; el navegador nunca recibe tokens (`/ops` verificado).
- **/ops**: PIN de 6 dígitos, cookie firmada httpOnly de 14 días, bloqueo por intentos persistido, `noindex`, sin analytics, solo lectura.
- **Errores silenciosos corregidos**: los workflows 25 y 26 respondían «ok» cuando una escritura a Supabase fallaba por red (sin código HTTP); ahora reintentan 3 veces y delatan el fallo. Alerta nueva por correo colgado en `sending` > 15 min. El panel avisa si Hermes deja de reportar (35 min atención, 90 min fallo).
- **Despliegue**: `ops/hermes/deploy-to-vps.sh` valida (no vacío, sintaxis, tamaño), respalda, reemplaza de forma atómica, prueba y revierte solo; `scripts/run-all-tests.mjs` (22 suites, 800+ pruebas) es la compuerta antes de llevar algo a `main`.
- **Ejecuciones fallidas de las últimas 48 h (diagnosticadas)**: 16, todas del 5–6 oct, **rechazos de validación deliberados de pruebas negativas** (`icp_pack_id` incorrecto, señales vacías, query vacía, `opportunity_id` inválido) más un error de GHL en pruebas del Content Engine ya corregido. Ninguna recurrente ni de producción.
- **Backups** (fuera del repo, `…/backups/2026-10-07-bloque3/`): 47 workflows n8n, configuración de GHL (pipelines, campos, objetos, asociaciones, etiquetas, workflows), esquema completo de Supabase y jobs de Hermes; migraciones versionadas en el repo (las anteriores a sep-2026 son de EnBandeja).

## 7. Prueba E2E (7-oct, datos TEST, 100 % limpiados por ID exacto)

Más de 40 verificaciones en vivo, todas OK: Gateway → Investigado (+ tarea automática) → recomendación LinkedIn → Hermes (con herramientas reales) → aprobación en 2 pasos → Waalaxy (lista de prueba) → Contactado → conexión/mensaje/respuesta → Respondió (+ tarea automática) → Diagnóstico → Propuesta (+ tarea) → Seguimiento → Won (+ 4 tareas de onboarding) → **Won→Cliente real**: Business, Servicio (Onboarding) y Proyecto (Planificado) con las 4 asociaciones exigidas (Business↔Servicio, Servicio↔Oportunidad, Business↔Proyecto, Proyecto↔Servicio) y Business↔Oportunidad; segunda ejecución idempotente. Camino de correo (segundo TEST): recomendación email → borrador → aprobación paso 1 (código) → rechazo de código falso → cancelación, sin envío. Limpieza verificada: GHL 62 contactos / 21 oportunidades / 24 tareas / 0 servicios / 0 proyectos (= línea base), Supabase 19 candidatos / 13 borradores, 0 TEST.

## 8. Rollback

| Qué | Cómo |
|---|---|
| Apagar todo el envío | `node scripts/ops/activate-commercial.mjs --rollback --apply` (correo y LinkedIn a `off`) |
| Pausar crons | `hermes cron pause <id>` (Daily, alertas, radares) |
| Desactivar un workflow | n8n → desactivar; todos los JSON en `n8n/` y respaldo en `backups/2026-10-07-bloque3/n8n` |
| Revertir permisos de Supabase | `grant execute on function … to anon, authenticated;` (nada vigente lo necesita) |
| Revertir un archivo de Hermes | `…/archivo.bak-<fecha>` (lo deja `deploy-to-vps.sh`) |
| Revertir el sitio | revertir el commit en `main` (Vercel despliega solo) |

## 9. ACTIVACIÓN COMERCIAL (una sola autorización)

Hoy: `mode=off`, `linkedin_mode=off`. El script prepara y verifica todo y **no se ejecuta solo**:

```bash
node scripts/ops/activate-commercial.mjs                       # vista previa y requisitos (no escribe nada)
node scripts/ops/activate-commercial.mjs --apply --confirm "Activo el correo comercial"          # correo live
node scripts/ops/activate-commercial.mjs --apply --confirm "…" --linkedin-list <ID> --linkedin-campaign <ID>   # + LinkedIn live
```

| Qué cambia al activar | Antes → después |
|---|---|
| **Gmail** | `mode off → live`; tope **5/día**; lista blanca de pruebas → vacía (todos los destinatarios). **Cada correo sigue requiriendo tu aprobación con código** (ventana lun–vie 09:00–17:30 Chile, un correo por corrida) |
| **LinkedIn/Waalaxy** | `linkedin_mode off → live` con lista y campaña de producción; límites conservadores (tope 5/día, una persona por alta, solo con persona+cargo+perfil verificable); el alta sigue requiriendo tu aprobación |
| **Prospect Radar** | sin cambio: investiga e importa a Investigado; **no contacta** |
| **Content** | sin cambio: genera y deja `in_review`; **no publica** sin tu aprobación en GHL |
| **Hermes** | sin cambio: investiga, recomienda y ejecuta lo permitido; acciones externas con confirmación explícita |

## 10. Pendientes humanos reales (ninguno bloquea empezar a prospectar por correo)

1. **Decidir el encendido** (el comando de arriba, con tus palabras).
2. **LinkedIn de producción**: crear en Waalaxy una lista «Atacama OS — Producción» y una **campaña** (secuencia de invitación/mensaje/follow-up que tú apruebes); pasar sus IDs al script. Mientras no exista, LinkedIn queda apagado y los prospectos van por correo.
3. **Pie legal del correo**: completar razón social/RUT en `outreach_config.legal_footer` (hoy «Atacama Labs · atacamalabs.cl»). Recomendado antes del primer envío real.
4. **Won→Cliente en producción**: el interruptor vive en la automatización de GHL «Atacama — Oportunidad ganada» (acción Webhook → Custom Data `dry_run`): hoy `"true"`. Cambiarlo a `"false"` en la interfaz de GHL. El flujo ya está probado de punta a punta (con `dry_run:false` manual) e idempotente; hasta el cambio, un Won real solo crea las 4 tareas de onboarding y describe en n8n lo que haría.
5. **Aprobar/rechazar** en GHL la pieza de Instagram en revisión (la de LinkedIn Atacama Labs de Resend ya fue aprobada por Christian y quedó programada).
6. **VPS (requiere root)**: (a) Crawl4AI (`crawl4ai-stii`, legacy) publica `0.0.0.0:32774` (responde 401): cambiar su binding a `127.0.0.1` (n8n corre en el mismo host); (b) el puerto de OpenClaw hoy está restringido a `127.0.0.1` por un archivo adicional: persistirlo en `/docker/openclaw-655m/docker-compose.yml` (un `docker compose up` normal volvería a publicarlo); (c) el contenedor `hermes-agent` publica `0.0.0.0:32781→3000` sin servicio útil (hoy filtrado desde fuera): quitar la publicación del puerto.
7. **Supabase**: confirmar en el panel (Database → Backups) el plan de respaldos automáticos; este bloque guardó el esquema y la configuración, no los datos.
8. **Heredado del Bloque 1** (sin resolver): 4 correos salieron del buzón de envío a prospectos sin pasar por Atacama OS (otra herramienta usa ese buzón); afecta reputación del dominio y el tope diario real.

## 11. Ola A (8-oct-2026) — nuevas entradas y herramientas de contenido

Todo se montó SOBRE lo existente (Content Radar, Content Intake, Supabase, `/ops`, Hermes por Telegram). Nada publica ni contacta: toda pieza termina `in_review`.

| Capacidad | Cómo funciona | Dónde vive |
|---|---|---|
| **Content Queue Governor** | Tope configurable de piezas en revisión (`content_config.max_pending_in_review`, por defecto **6**). Con la cola llena, lo AUTÓNOMO se bloquea en el servidor (el Content Intake responde `blocked` y no guarda nada) pero el radar sigue recolectando señales; una orden explícita de Christian pasa con advertencia. `/ops` muestra «cola n/6» | n8n 12 · `growth-core.mjs` · `ops-core.mjs` |
| **RSS / Real-Time Content Radar** | n8n **28 Content RSS** (cada hora) lee los feeds de `content_feeds` (configurables: 7 oficiales hoy), guarda solo artículos nuevos (único por feed + hash; > 14 días se ignoran) y la salud de cada feed. El job de Hermes **Content RSS** (lun–vie 10:15 Chile, con compuerta: solo corre si hay artículos relevantes y espacio) elige hasta 3, abre la URL, cita literal → señal (n8n 13) | n8n 28 · `rss-core.mjs` · job `3423e7821026` |
| **Content Pieces** | Job de Hermes (lun–vie 10:45 Chile, con compuerta) que convierte las señales candidatas en hasta 2 piezas de **LinkedIn Atacama Labs** (texto) y las manda al Intake. Instagram queda para render manual (`scripts/content/render-pending.mjs`) | job `f667ec9b786c` |
| **Competitor Organic Intelligence** | Job semanal (miércoles) donde Hermes revisa solo fuentes **públicas** de competidores/referentes configurados (`content_competitors`: IAutomatiza, Vambe, respond.io; Eclectica sin dominio confirmado), y guarda un reporte (temas saturados, huecos, ángulos propios) en `content_intel_reports`. Regla: contexto, nunca copia. NO es Ads Radar | job `a88a78d263f9` |
| **Founder Interview** | Hermes pregunta (preguntas ancladas en hechos reales, `founder_questions`), Christian responde por texto (audio si Hermes lo transcribe), Hermes estructura 1–3 piezas. El Intake RECHAZA cualquier pieza cuya cita `real_work` no aparezca literal en la respuesta. Sin cron: se usa a pedido («entrevístame») | n8n 27 + 12 · tablas `founder_*` |
| **Resource & Conversation Engine v1** | Biblioteca `content_resources` + páginas en `atacamalabs.cl/recursos/<slug>`. La pieza puede llevar `resource_id`, `cta_mode` (resource_link · dm · diagnostic) y `{{resource_url}}` (se reemplaza por la URL con UTM de canal/recurso/pieza). **«Comenta PALABRA → DM» NO está automatizado** | n8n 12 · `/recursos` · `growth-core.mjs` |

**Tablas nuevas** (RLS sin políticas, migración `20261012_ola_a.sql`): `content_config`, `content_feeds`, `content_feed_items`, `content_competitors`, `content_intel_reports`, `content_resources`, `founder_questions`, `founder_interviews`; `content_pieces` suma `resource_id`, `cta_mode`, `cta_copy`, `origin`, `interview_id`; `ops_runs.kind` suma `content_rss`, `competitor_intel`, `content_pieces`.

**Workflows nuevos:** `27 Content Growth` (`M4LyGH4UxE5sYIh5`, webhook `atacama-content-growth`) y `28 Content RSS` (`6wnrHglfnt6l9va0`, cada hora + webhook `atacama-content-rss`). Cambiados: `12 Content Intake` (governor, recurso, Founder, key de fuentes) y `25 Atacama Ops` (compuertas rss/competitor/pieces, panel, alertas). Hermes pasa a **50 herramientas** (8 nuevas, ver `HERMES-OPERATOR.md` §12) y **7 jobs** (3 nuevos).

**Seguridad:** nada se publica, programa ni contacta; `/ops` sigue de solo lectura; las fechas propuestas siguen la regla «noticia ≤ 24 h · normal ≤ 48 h · evergreen ≤ 72 h, una publicación por cuenta y día»; todo job reporta su corrida (`ops_runs`) y los fallos de RSS/jobs aparecen en el panel y como alerta.

**Límites conocidos (honestos):** (1) la transcripción de audios depende de Hermes (STT configurado pero sin probar con un audio real; si no transcribe, Christian escribe la respuesta); (2) Hermes no puede renderizar carruseles: quedan retenidos hasta correr `render-pending.mjs`; (3) Anthropic y Meta/WhatsApp no publican RSS oficial: los cubre el Content Radar semanal con sus changelogs; (4) Apify, Pain Radar, Ads Radar, Media Gateway/Higgsfield y Call Intelligence NO se hicieron (fuera de alcance).
