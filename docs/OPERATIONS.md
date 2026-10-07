# Atacama OS — Operación diaria (Bloque 2)

Cómo Atacama OS se supervisa solo y le habla a Christian por Telegram sin que tenga que abrir el computador. Todo lo de abajo es **de solo lectura sobre GHL/Gmail/n8n**; lo único que escribe son dos tablas de bitácora en Supabase (`ops_alerts`, `ops_runs`). **Nada envía correos, publica, aprueba ni mueve prospectos a Contactado.** `outreach_config.mode` sigue en `off`.

## 1. Arquitectura (una responsabilidad por pieza)

| Pieza | Responsabilidad | Costo IA |
|---|---|---|
| **n8n `25 Atacama Ops`** (`OxLcj12RP0qLVLVc`, webhook `POST /webhook/atacama-ops`, header `X-Atacama-Key`) | **Calcula**: lee GHL (oportunidades, tareas), Supabase (mensajes, candidatos, piezas, métricas, señales, alertas, corridas), n8n (workflows y ejecuciones) y arma Daily, urgentes, health, alertas y compuertas | 0 |
| **Hermes cron `atacama-daily`** (`99484078e80e`) | **Entrega** el Daily por Telegram a las 08:30 Chile | 0 (`--no-agent`) |
| **Hermes cron `atacama-alerts`** (`f21880a598b8`) | Cada 15 min pregunta a n8n si hay algo que interrumpa; si no, **silencio** | 0 (`--no-agent`) |
| **Hermes MCP `atacama-os`** (35 herramientas) | Responde preguntas de Christian leyendo la fuente real (`get_daily`, `get_today`, `get_urgent`, `get_health`, `get_stale_opportunities`, `get_radar_new`, `get_content_status`, `get_content_performance`, + las 27 de Bloque M/1) | solo cuando Christian pregunta |
| **Hermes cron Prospect Radar** (`8421589d0902`) | Investiga prospectos (agente), con **compuerta previa** (`radar_gate.sh`) | ≈ US$0,20 por corrida |
| **Hermes cron Content Radar** (`a46bd3138a0b`) | Busca señales de contenido (agente), con **compuerta previa** (`content_gate.sh`) | ≈ US$0,15–0,25 por corrida |
| **GHL / Supabase** | Fuentes de verdad (CRM / datos) | — |

Flujo: `cron Hermes → script bash → atacama_ops_cli.py → POST atacama-ops (n8n) → texto → stdout → Telegram`. Un job `--no-agent` entrega su stdout tal cual; **stdout vacío = no se manda nada**.

## 2. Atacama Daily

- **Hora:** 08:30 Chile (lun–dom). La VPS corre en UTC y Chile cambia de horario, así que el cron dispara a las 11:30/11:45/12:30/12:45 UTC y el script decide con la hora real de Chile (ventana 08:20–09:15) y con un archivo de estado (`/opt/data/state/atacama-daily.last`): **se manda una sola vez por día**; la segunda entrada solo reintenta si la primera falló.
- **Formato:** `NECESITA TU ACCIÓN` / `PARA REVISAR` / `TODO BIEN`, solo con secciones que tienen contenido; sin novedades → un mensaje corto de 3 líneas. Largo típico < 2.600 caracteres.
- **Comercial:** respuestas nuevas y por atender, oportunidades estancadas o sin próximo paso, seguimientos vencidos/de hoy (con o sin borrador), tareas vencidas (agrupadas por tipo), prospectos nuevos y Investigado sin decisión.
- **Contenido:** pendientes de aprobación, programadas, publicadas recientes, snapshots de métricas disponibles (24h/72h/7d), publicaciones con problema, señales candidatas sin pieza.
- **Sistema:** workflows con falla, ejecuciones fallidas de 24 h, jobs de Hermes, Gmail, disco, modo de envío.
- **Si n8n no responde:** un mensaje corto avisando que no pudo consultar (y reintenta a los 15 min dentro de la ventana).
- **Umbrales de «estancada»** (días desde el último cambio de etapa): Nuevo 1 · Respondió 3 · Contactado 9 · Diagnóstico 5 · Propuesta 7 · Seguimiento 7. Investigado no cuenta como estancada (se mide aparte como «sin decisión»). Se ignoran las oportunidades de prueba `Sushi 72` y `Prueba Atacama` (configurable en `OPS_CFG.ignore_opps` del workflow 25).

## 3. Alertas (solo lo que merece interrumpir)

El job corre cada 15 min y **normalmente no dice nada**. Avisa por Telegram únicamente por:

| Alerta | Severidad | Regla |
|---|---|---|
| Workflow crítico caído | crítica | inactivo, ≥ 3 errores seguidos o programado sin correr (Gateway, Operator, Outreach, Gmail Sender/Sync, Followup Planner, Lead/Booking Sync, Content Sync) |
| Gmail sin acceso | crítica | chequeo profundo (≈ 1 vez por hora) falla en credencial de envío o de lectura |
| Prospect Gateway bloqueado | crítica | ≥ 2 errores en las últimas 3 ejecuciones dentro de 2 h |
| Respuesta humana o rechazo de un prospecto/cliente | alta (evento) | mensaje inbound clasificado `reply`/`decline`; las autorrespuestas y bajas **no** alertan |
| Publicación aprobada/programada que no salió | alta | > 60 min sin publicarse o `failed` |
| Job de Hermes con fallas seguidas | alta | racha ≥ 2 (los pausados no cuentan) |
| Hermes/Telegram caído, disco ≥ 90 % | alta | estado leído por el script |
| n8n no responde | única | 3 consultas seguidas (≈ 45 min) sin respuesta |

**Dedupe** (tabla `ops_alerts`, clave única por condición): un evento (respuesta) se avisa **una vez**; una condición crítica se repite a las 12 h hasta 3 veces; una condición que se limpia se resuelve en silencio y, si vuelve, reabre; una alerta guardada pero no confirmada (Telegram falló) se reintenta. Nunca se alerta por una ejecución aislada.

## 4. Salud («¿Está todo funcionando?»)

`get_health` (o el bloque «Sistema» del Daily) revisa **Prospect Gateway, Hermes Operator, Outreach Engine, Gmail Sender, Gmail Sync, Followup Planner, Prospect Radar, Content Radar, Content Engine, Métricas de contenido, Captura de leads y reservas, servidor Hermes** y devuelve `OK / ATENCIÓN / FALLO` con el motivo. Reglas: programado atrasado > 3× su cadencia + 5 min = atención, > 6× + 10 min = fallo; ≥ 3 errores seguidos = fallo; workflow crítico inactivo = fallo; jobs pausados = «pausado (esperado)». `deep=true` además prueba la conexión real a Gmail (solo lectura). **No hay panel web nuevo.**

## 5. Radares (modo seguro)

### Prospect Radar v2
- **Cadencia:** martes y jueves 13:30 UTC (10:30 Chile). Máximo 2 corridas/semana.
- **Compuerta (`radar_gate`)**: se salta si hubo una corrida OK en las últimas 20 h, ya hubo 3 esta semana, o hay ≥ 25 prospectos en Investigado sin decisión. Si corre, `max_imports = min(5, 25 − backlog)`. Lo omitido queda registrado y **no cuesta IA** (el agente responde `[SILENT]`).
- **Entrada única:** Prospect Gateway (analiza → importa solo `create_in_ghl` con regla de señal verdadera: 2 hechos con cita literal + un proceso observable + contacto público; hecho / inferencia / hipótesis separados; dedupe contra Supabase y GHL).
- **Modo seguro:** solo deja prospectos en GHL **Investigado** con nota y borradores para revisión. No envía, no aprueba, no mueve a Contactado.
- **Costo:** ≈ US$0,19–0,20 por corrida (Gemini 3.7 Flash), 4–5 min → **≈ US$0,4/semana máx.**; antes del v2 eran ≈ US$0,75 por corrida.
- Hermes es **una** fuente: cualquier otra IA, archivo o lista entra por la misma puerta (`analyze_prospects` / `import_prospects`).

### Content Radar
- **Cadencia:** lunes 12:00 UTC (09:00 Chile), una vez por semana.
- **Compuerta (`content_gate`)**: se salta si corrió hace < 5 días, hay ≥ 3 piezas esperando tu revisión, o ya hay ≥ 5 señales candidatas sin convertir en pieza.
- Lee primero los aprendizajes del Content Engine (`atacama-content-learnings`), máximo 5 señales verificables (URL abierta + cita literal + fecha), sin noticias genéricas de IA, y las entrega a n8n `13`. **Nada se publica solo**: señal → pieza → `in_review` en GHL Social Planner → **Christian aprueba con Approve** → publica GHL. Roles por canal: Instagram Atacama (visual/producto), LinkedIn Atacama Labs (corporativo/casos), LinkedIn Christian (aprendizajes de fundador); no se duplica texto entre cuentas.
- **Costo:** la corrida de validación (7-oct) informó US$ 0,03; se presupuesta ≈ US$ 0,15–0,25 por corrida → **≈ US$1/mes** como techo.
- **Primera corrida real (7-oct):** 8 búsquedas, 10 páginas, 5 señales enviadas; quedan 7 señales candidatas sin pieza (por eso la compuerta del lunes saltará hasta que se conviertan en piezas o se descarten). Nada se creó ni se publicó.

## 6. Métricas y aprendizaje

- Pipeline existente (sin cambios): `14 Content Sync` (cada 30 min, estado de publicación desde GHL), `15 Content Metrics` (cada 3 h, snapshots 24h/72h/7d de me gusta, comentarios y compartidos que GHL entrega), `16 Content Learnings` (`GET /webhook/atacama-content-learnings`).
- **GHL no entrega impresiones ni alcance por publicación**: el sistema no los inventa. Con pocas piezas (n < 5) todo es tentativo y no se compara Instagram con LinkedIn.
- Preguntas que Hermes responde con `get_content_performance`: «¿Cómo rindieron las últimas publicaciones?», «¿Qué contenido funcionó mejor?», «¿Qué aprendimos esta semana?», «¿Qué tipo de publicación repetirías?». Los aprendizajes alimentan las sugerencias del Content Radar (ganchos a no repetir, formatos), **nunca publican**. Los primeros aprendizajes llegan 7 días después de publicar (la primera publicación fue el 7-oct).

## 7. Qué corre dónde (inventario de cadencias — sin duplicados)

| Dónde | Qué | Cadencia |
|---|---|---|
| **n8n** | 22 Gmail Sender · 23 Gmail Sync | cada 10 min |
| n8n | 24 Followup Planner | cada 30 min |
| n8n | Lead Sync · Booking Sync (web) | cada 2 min |
| n8n | 14 Content Sync / 15 Content Metrics | 30 min / 3 h |
| n8n | 19 Gateway, 20 Operator, 21 Outreach, 12/13/16 Content, 17 Search, **25 Ops** | por webhook (a pedido) |
| **Hermes cron** | `atacama-daily` | 1×/día 08:30 Chile |
| Hermes cron | `atacama-alerts` | cada 15 min (silencioso) |
| Hermes cron | Prospect Radar | mar y jue 10:30 Chile (con compuerta) |
| Hermes cron | Content Radar | lunes 09:00 Chile (con compuerta) |
| Hermes cron | `hermes-health-watch` | **pausado**: su chequeo quedó dentro del Daily/alertas |
| **GHL** | automatizaciones nativas: tarea al investigar/responder, seguimiento de propuesta, oportunidad ganada | por evento |
| **Supabase** | `ops_alerts`, `ops_runs` (bitácora de alertas y corridas) | escritura por n8n 25 |
| ~~n8n `10 Atacama Daily (PREVIEW)`~~ | reemplazado por el 25 | **desactivado** (no borrado) |

Regla: no se agrega un cron nuevo si la tarea ya la hace uno de la tabla; el mismo trabajo no vive a la vez en Hermes y en n8n (n8n calcula, Hermes programa y entrega).

## 8. Costos estimados

| Concepto | Por día | Por semana |
|---|---|---|
| Daily + alertas + health + consultas del MCP | US$0 (sin IA; HTTP a n8n/GHL/Supabase) | US$0 |
| Prospect Radar (≤ 2 corridas con compuerta) | — | ≤ US$0,40 |
| Content Radar (1 corrida con compuerta) | — | ≤ US$0,25 |
| Preguntas de Christian a Hermes | centavos por conversación | — |
| **Total IA operación diaria** | **≈ US$0,1** | **≈ US$0,7** |

Carga extra en n8n: ~96 consultas/día de alertas (cada una lee unas 10 tablas/endpoints, sin escribir salvo cambios de estado) y ~1 chequeo Gmail por hora.

## 9. Operar y revisar

- Probar el Daily sin Telegram: `ssh … 'atacama_ops_cli.py daily --force'` imprime en consola (no entrega). Desde el repo: `node n8n/build/ops.test.mjs` (38) y `node scripts/ops/ops-core.test.mjs` (25) corren offline.
- Actualizar el workflow: `node n8n/build/ops.mjs` regenera `n8n/atacama-labs-25-atacama-ops.json`, que se despliega por la API de n8n (mismo patrón que los demás).
- Pausar todo: `hermes cron pause atacama-daily|atacama-alerts|8421589d0902|a46bd3138a0b`.
- Si se pierde el Daily: revisar `hermes cron runs <id>` y `docs/HERMES-OPERATOR.md`.

## 10. Panel `/ops` y mensajes de Telegram simplificados (7-oct-2026)

**Una sola vista viva, privada y de solo lectura** dentro del Next.js existente: `/ops` (no es una fuente de verdad nueva; solo dibuja lo que calcula n8n `25 Atacama Ops`).

- **Flujo de datos:** `GHL / Supabase / n8n / Hermes → n8n 25 (acción panel) → servidor Next.js → /ops`. El navegador nunca habla con GHL, n8n ni Supabase; el servidor de Next.js guarda una caché de 25 s y, si n8n no responde, muestra lo último con aviso «Sin conexión con n8n».
- **Secciones:** NECESITA TU ATENCIÓN (respuestas, seguimientos/tareas vencidas, oportunidades sin próximo paso o estancadas, contenido por aprobar, fallas) · PROSPECCIÓN (en Investigado, nuevos de la última corrida, prioridad alta, contactados, últimos prospectos con score y detalle desplegable: ángulo, hecho observado, estado) · CONTENIDO (señales nuevas, por aprobar, programadas, publicadas con métricas de GHL; cada pieza ya es desplegable y quedó el espacio para preview de copy, carruseles y assets) · SISTEMA (OK / atención / fallo por componente, modo de envío, ejecuciones fallidas de 24 h).
- **Refresco:** al cargar, al volver a la pestaña y cada 45 s mientras está visible. Mobile-first, tokens del sitio, sin JavaScript pesado (`<details>` nativo).
- **Protección (actualizado):** **PIN de 6 dígitos** (`OPS_PANEL_PASSWORD` debe tener exactamente 6 dígitos; si no, el acceso queda cerrado con el aviso «El acceso aún no está configurado») + cookie firmada de 14 días (httpOnly, `secure` en producción, SameSite=Lax, ruta `/ops`; firmada con un secreto de servidor, no con el PIN, así que cambiar el PIN cierra las sesiones). Login pensado para móvil: logo + seis casillas, teclado numérico, dígitos ocultos, intento automático al completar, error discreto. **Bloqueo por intentos** (guardado en Supabase, `ops_alerts` claves `_lock:*`): 5 fallos en 15 min bloquean ese visitante 5 min, 10 fallos 30 min; 30 fallos en 1 h entre todos bloquean 15 min. Ni el PIN ni la IP en claro se guardan. Sin contraseña configurada el panel queda **cerrado**. Sin sesión no se envía ningún dato. Además: `noindex` (metadata + `X-Robots-Tag`), `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `Disallow: /ops` en robots.txt, sin Google Tag Manager ni banner de cookies en esa ruta.
- **Variables de entorno (Vercel, solo servidor):** `OPS_PANEL_PASSWORD` (la elige Christian), `N8N_BASE_URL`, `ATACAMA_INGEST_KEY`; opcional `OPS_PANEL_SECRET` para firmar la cookie. Hoy solo existen en `.env.local` (desarrollo): **hay que agregarlas en Vercel y desplegar la rama para que `/ops` exista en producción.**
- **Código:** `src/app/ops/` (página, login, vista, CSS), `src/lib/ops/` (auth, datos, tipos). Cálculo: `composePanel` en `scripts/ops/ops-core.mjs`.

### Telegram = resumen + enlace
- **Daily** (08:30): 5–8 líneas — Necesita tu acción / Prospección / Contenido / Sistema — más «Ver Atacama OS → enlace». El detalle largo sigue disponible preguntándole a Hermes (`get_daily`).
- **Radares:** el agente termina con `[SILENT]` y n8n arma el aviso corto (una sola vez por corrida, vía el job de alertas): `PROSPECT RADAR · N nuevos · N prioridad alta · Top: … · Todos en Investigado. 0 contactados.` / `CONTENT RADAR · N señales nuevas · M candidatas sin pieza · 2 títulos · Nada publicado ni aprobado.`
- **Alertas:** solo lo que requiere acción, sin IDs ni rutas.
- **No se envía** (salvo error que requiera acción): IDs de GHL, rutas del servidor, archivos de telemetría, IDs de jobs ni detalles técnicos. El aviso del *file-mutation verifier* quedó apagado en Hermes (`display.file_mutation_verifier: false` en `/opt/data/config.yaml`, respaldo `config.yaml.bak-bloque2-ui`).
- **El enlace** lo agrega el script de Hermes solo si `ATACAMA_PANEL_URL` está definido en `/opt/data/.env` (por ejemplo `https://atacamalabs.cl/ops`), para no mandar un enlace muerto antes de desplegar el panel.
- El estado de Hermes que el panel necesita (jobs, disco, gateway) lo guarda el job de alertas cada 15 min en `ops_alerts` (fila `_state:hermes`, nunca se notifica).

## 11. Content Radar → pieza (7-oct-2026) — flujo probado de punta a punta

`señal (content_sources, candidate) → Hermes selecciona y redacta → pieza canónica → validador (engine-core) → renderer + biblioteca de medios de GHL → n8n 12 Content Intake → content_pieces + GHL Social Planner «In Review» → visible en /ops`. No hay sistema paralelo: es el Content Engine existente (Bloques H–J).

- **Prompt de Hermes:** `ops/hermes/content-piece.prompt.txt`. Entradas en la VPS (`/opt/data/content/`): señales candidatas, la guía oficial (`brand/content/ATACAMA-LABS-GUIA-PUBLICACIONES.md`), piezas de ejemplo con el esquema exacto y la lista de temas ya publicados. Hermes decide **qué señales sirven** (máx. 3, con motivo de cada descarte), **cuenta, formato, ángulo, copy y slides**. No usa el canal «LinkedIn Christian» salvo que exista trabajo propio verificable (nunca inventa experiencias del fundador).
- **Reglas que se aplican solas:** cita literal verificada, claims externos con fuente, ninguna cifra sin respaldo, la llamita solo en portada/cierre, una idea por slide, score ≥ 70. La pieza lleva la `key` de la señal para que n8n la enlace a la fuente verificada.
- **Revisión humana editorial:** antes de enviarla se contrasta con la fuente; en esta primera corrida se detectó que la fuente decía «en beta» y el texto no, se lo devolvimos a Hermes y lo corrigió él.
- **Envío:** `node scripts/content/submit.mjs scripts/content/generated/<pieza>.piece.json` (renderiza con Playwright 1080×1350, sube las slides a GHL y llama a n8n 12). Estado final siempre `in_review`; nunca programa ni publica.
- **En `/ops` (Contenido → Por aprobar):** texto completo del post, slides del carrusel (miniaturas deslizables, tocar para ampliar), por qué se eligió, fuentes, fecha propuesta y enlace a Social Planner. **Aprobar o rechazar se hace en GHL** (`In Review → Approve`); `/ops` es de solo lectura.
- **Piezas de la prueba:** `scripts/content/generated/2026-10-07-*` (selección de Hermes, carrusel de Instagram sobre compactación de conversaciones —score 79— y texto de LinkedIn Atacama Labs sobre la Account Usage API de Resend —score 80—).
- **Aprendizaje:** el radar ya lee `atacama-content-learnings` (métricas 24 h/72 h/7 d); no se construyó un subsistema nuevo.

## 12. LinkedIn y protecciones del Bloque 3

- **LinkedIn**: ver [`ATACAMA-OS-ARQUITECTURA-FINAL.md`](ATACAMA-OS-ARQUITECTURA-FINAL.md) §5. En `/ops` aparece como sección propia; el Daily pide acción si hay altas por confirmar o errores de Waalaxy.
- **Desplegar a la VPS**: siempre con `ops/hermes/deploy-to-vps.sh <archivo> <ruta en /opt/data> ["prueba posterior"]` (valida antes de reemplazar y revierte solo si la prueba falla). Evita comillas simples dentro de la prueba.
- **Antes de llevar algo a `main`**: `node scripts/run-all-tests.mjs` + `npx tsc --noEmit` + `npx eslint src` + `npx next build`.
- **Vigilancia**: alerta por correo colgado en «enviando» > 15 min; el panel marca «Hermes · reporte de alertas» si Hermes no reporta en 35/90 min; los workflows 25 y 26 reintentan las escrituras y delatan los fallos de red.
- **Aviso de operación**: reiniciar el agente (`sudo hermes-restart agent`) corta las corridas en curso; al desplegar una regla de avisos nueva pueden llegar mensajes de Telegram inesperados la primera vez (sembrar `ops_alerts` o anunciarlo antes).
- **Fechas del Content Engine**: la fecha de cada pieza es una propuesta del sistema (Noticia ≤ 24 h, normal ≤ 48 h, Evergreen ≤ 72 h, hora de Chile, una publicación por cuenta y día; nunca +7 días). Si una pieza llega con fecha lejana, es porque Hermes mandó `schedule_justification`; revisar el aviso `schedule_warnings` en la respuesta del intake.
