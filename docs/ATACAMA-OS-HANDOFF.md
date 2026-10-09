# ATACAMA OS — HANDOFF (estado al cierre del 8/9-oct-2026)

> Léelo primero si empiezas una sesión nueva. Resume qué está vivo, qué quedó pendiente y cómo operar/desplegar sin tener que reconstruir el contexto.
> Documentos hermanos: `ATACAMA-OS-ARQUITECTURA-FINAL.md` (§11–16 = Ola A, /ops V2 y Ola B), `OPERATIONS.md` (§13–15 = operación diaria), `HERMES-OPERATOR.md`, `n8n/README.md`.

## 1. Estado del sistema (todo en `main`, último commit de código: `435abfe`)
- **Atacama OS está ON.** Correo y LinkedIn en `live` con aprobación humana por código/clic; Hermes (VPS) opera por Telegram y por MCP (**54 herramientas**); n8n orquesta (workflows 12, 20–30); Supabase `uwquwjmiofixzugttals` (compartido con EnBandeja LEGACY: no tocar sus tablas) guarda estado; GHL es la verdad comercial y el Social Planner.
- **/ops V2** (celular): Inicio, Aprobaciones, Prospección, Outreach, Contenido, Sistema. Aprobar/rechazar/editar correos, LinkedIn y publicaciones. Calidad del correo y «versión anterior» visibles. Velocidad: panel ~4,5 s en frío, ~0,1 s con datos recientes; aprobar actualiza la tarjeta al instante.
- **Cold Email v2** (Ola B-D): evaluador con score + Similarity Guard dentro del Outreach Engine (21); `save_draft(auto, evidence…)`, `lint_draft`. **Estructura aprobada por Christian**: contexto + «imagino que…» → PUENTE «Ahí suele aparecer el trabajo repetitivo…» → «Soy Christian, de Atacama Labs. Armamos agentes que pueden hacerse cargo de esa primera parte y dejar cada X completa, registrada y lista para Y, o derivarla cuando realmente necesita a una persona.» → «¿Les sirve que les mande un ejemplo aplicado a su …?». Trato «ustedes» siempre. Se ajustará con respuestas reales (~100 envíos).
- **Editorial Brain** (14 tipos, roles por cuenta, `editorial_plan`), **Resource Factory** (backlog de 6 recursos; solo 1 activo), **Media Gateway** (workflow 30 + tabla `media_assets` + worker local). **Higgsfield: APAGADO y NO verificado** (no activar ni pagar sin autorización explícita de Christian).
- **Dominio listo para enviar:** SPF, DKIM (`google._domainkey`) y DMARC (`p=none; rua=mailto:christian@atacamalabs.cl`) aprueban; verificado en un correo real («Mostrar original»). DNS en **DonWeb** (ns1/ns2.donweb.com).

## 2. Lo que está en marcha HOY
- **13 correos en frío APROBADOS** (todos con la estructura del puente), programados para salir **desde el vie 9-oct 09:00 Chile** (12:00 UTC): tope **5/día**, ventana lun–vie 09:00–17:30, uno por corrida (cada 10 min). Salen ~5 el viernes, ~5 el lunes y 3 el martes. Respuestas/rebotes/bajas las lee Gmail Sync (23) cada 10 min; seguimientos +3/+7 días hábiles como borradores (nunca se envían solos).
- **2 publicaciones de Hermes detenidas en cola** (ver §3-A): Instagram «Un agente empieza con un trabajo» (asset `8d81ad8e…`, pieza `75a8bb54…`) y LinkedIn Atacama Labs «Un agente no es solo un modelo» (asset `43731503…`, pieza `3d7130d5…`). Piezas `drafted`, assets `queued`, 5 slides, 0 imágenes.

## 3. Pendientes, en orden
**A. Media Worker autónomo en la VPS (decidido el diagnóstico, falta aprobar y construir).**
Diagnóstico: el renderer solo corre donde hay Playwright+Chromium+repo+llaves (hoy el PC de Christian). En la VPS: Node v26 sí; **repo no, Playwright no, Chromium no, `.env.local` no, marca/fuentes/llamita no** (≈4 MB); las librerías del sistema para Chromium **sí están**; red OK; 38 GB de disco y ~3,6 GB de RAM libres; usuario `hermes` sin root ni sudo. Hermes tiene el toolset `terminal` activo, pero NO queremos darle shell para esto.
Propuesta (mínima y limpia): **tarea programada de Hermes SIN modelo** (como `atacama-daily`/`alerts`), cada ~5 min, con compuerta (si no hay nada en cola, termina sin abrir Chromium). El worker solo usa la llave de ingesta que ya está en la VPS; **no se ponen en la VPS ni la llave de Supabase ni el token de GHL**. Para eso workflow 30 gana 2 acciones: `claim` (entrega el siguiente asset `queued` + el JSON de su pieza y lo marca `generating` como candado) y `upload` (recibe PNG en base64 y los sube a GHL). `complete` ya existe; el reenvío al Content Intake lo hace el worker con la misma llave de ingesta. Piezas a instalar en `/opt/data/atacama-media/`: `scripts/content/render.mjs`, `scripts/media/*`, `public/brand/*.svg`, `brand/content/mascot/*`, `src/app/fonts/DMSans-latin-wght.woff2`, `npm i playwright@^1.63` + `npx playwright install chromium` (≈300 MB, una vez; persiste en `/opt/data`). Ajustes: lanzar Chromium con `--no-sandbox` vía variable de entorno, candado de corrida única, tope de reintentos, errores visibles (`failed`). **No duplicar el renderer.**
Decisiones que esperan a Christian: (1) instalar Chromium/Playwright dentro del contenedor de Hermes; (2) espera de hasta ~5 min; (3) si desbloquear ya las 2 publicaciones desde el PC con `node scripts/media/media-gateway.mjs run` (no cambia código; Claude Code puede hacerlo desde el PC).

**B. Verificar RSS (workflow 28) tras la aceleración.** Corre cada hora en punto UTC; la primera ejecución con el cambio era a las 03:00 UTC del 9-oct. Comprobar en n8n (`executions?workflowId=6wnrHglfnt6l9va0`) que terminó `success` y sin errores HTTP en «Apply Writes».

**C. Lista de 20 prospectos de LinkedIn:** Christian dijo que la pasó, pero **nunca llegó** a la conversación. Pedirla de nuevo (pegada o ruta).

**D. Auditoría SEO con `Hainrixz/claude-seo-ai`** (plugin de Claude Code, MIT, joven: 73 estrellas, último commit 7-sep-2026). Recomendación dada: instalarlo en una **carpeta vacía separada** (no en el repo ni en `C:\Users\alain`), por el marketplace de plugins desde una sesión interactiva de `claude`, **sin ninguna llave**, usando solo `audit` y `geo` sobre `https://atacamalabs.cl`; NO usar `fix`, NO `npx skills add`. Ofrecí leer antes sus hooks y scripts de red (solo lectura). Pendiente de su decisión.

**E. Páginas de los 5 recursos en borrador** (calculadora de trabajo manual es la de más impacto; luego comparador agente/automatización/chatbot, canvas de proceso, checklist antes de automatizar, arquitectura mínima de un agente). Pasan a `active` solo cuando su URL responde 200.

**F. Aprendizaje de correos** (cuando haya ~100 envíos): job semanal de Hermes que cruce respuestas, versiones editadas por Christian (`metadata.history`) y rasgos del correo, y proponga cambios al evaluador; Christian aprueba cualquier cambio de regla. No construir hasta tener envíos.

**G. Mejoras de /ops pendientes (opcionales):** «Aprobar y siguiente» con contador, barra fija de acciones en celular, no duplicar correos entre Aprobaciones y Outreach, comparación visual antes/después, Inicio más corto, carga por secciones (streaming), «snapshot» del panel cada minuto en Supabase si aún se siente lento. Pedir a Christian cómo se siente en el celular antes de seguir.

**H. Conocidos de siempre:** razón social/RUT para el pie legal (NO insistir; el pie provisional está bien), `dry_run` de Won→Cliente sin verificar hasta el primer Won, audio de Founder Interview sin probar con audio real.

## 4. Cómo operar y desplegar (las herramientas de sesión NO están versionadas)
- **Pruebas:** `node scripts/run-all-tests.mjs` (36 suites, ~1208 pruebas, offline) · `node scripts/ops/ui-tests.mjs` (65, Playwright contra un n8n simulado; usa `OPS_NO_CACHE=1`) · `npx tsc --noEmit` · `npx eslint src` · `npx next build`.
- **Generar workflows n8n:** `node n8n/build/<nombre>.mjs` escribe `n8n/atacama-labs-NN-*.json`. **No desplegar 22 ni 23 desde el JSON** (sus credenciales de Gmail viven en n8n y el JSON no las trae).
- **Desplegar un workflow:** API de n8n (`N8N_BASE_URL` + `N8N_API_KEY` en `.env.local`): listar `/workflows`, y por nombre `PUT /workflows/{id}` con `name`, `nodes` (conservando `id` y `webhookId` de los nodos vivos), `connections`, `settings`; desactivar antes y activar después; las credenciales se referencian por id (no se copian). Guardar respaldo del JSON vivo antes. Ids: 12 `wKrn00R0x4XXcfvR` · 20 `Pm5XfYBocmWR3YgY` · 21 `7yRgPPDkiVyjmb3t` · 24 `rWulaiKeio0CsXrs` · 25 `OxLcj12RP0qLVLVc` · 26 `ve4uKTMQkGWzzmBV` · 27 `M4LyGH4UxE5sYIh5` · 28 `6wnrHglfnt6l9va0` · 29 `ruk7KnHLppPSI8wK` · 30 `3o3xAfWvkDcGjtJd`.
- **VPS de Hermes:** `ssh -i ~/hermes-ops/.ssh_hermes_ops <VPS_USER>@<VPS_HOST> "sudo hermes-exec-agent <comando>"` (datos en `~/hermes-ops/.env`, nunca imprimirlos). Subir archivos de forma segura: `ops/hermes/deploy-to-vps.sh <local> </opt/data/destino>` (respalda y valida). Recargar el MCP tras cambiarlo: `s6-svc -t /run/service/gateway-default` y `/run/service/dashboard`; verificar con `hermes mcp test atacama-os` (54).
- **Prompts de jobs de cron: se guardan EN LÍNEA.** Tras cambiar un `.prompt.txt` hay que re-aplicarlo con `hermes cron edit <id> --prompt "$(cat archivo)"` ejecutado como usuario hermes (`bash -c "… \$(cat …)"`); si se expande en el lado equivocado el prompt queda vacío. Verificar en `/opt/data/cron/jobs.json`.
- **Supabase:** migraciones por el MCP de Supabase (`apply_migration`, proyecto `uwquwjmiofixzugttals`); consultas con la service role en `.env.local`.

## 5. Reglas y lecciones que no hay que redescubrir
- Nada se publica, programa, aprueba ni envía sin aprobación humana. Datos TEST: `is_test=true` / «TEST» en el nombre, siempre limpiados por ID exacto. Pruebas jamás envían correos ni contactan prospectos reales.
- Antes de cualquier `git push`/deploy: explicar en simple y esperar el «sí» de Christian.
- En el nodo HTTP de n8n, **`sendBody` como expresión deja el cuerpo vacío** (PGRST102) y rompe las escrituras; usar `true`.
- `unstable_cache` no funciona con `force-dynamic`; /ops usa caché en memoria SWR (`src/lib/ops/swr.ts`).
- Piezas retenidas por falta de render quedan `drafted` (antes `scored`, ya corregido). El borrado de medios de GHL pide `altId` (no `locationId`); un post rechazado queda `failed` y no se borra por API (pasarlo a `draft` y luego `DELETE`).
- No abrir `.env` de la VPS (el clasificador lo bloquea; no rodearlo). El editor de workflows de GHL no carga con Claude in Chrome: los interruptores de GHL los mueve Christian a mano.
- Christian no es técnico: explicar en simple, en español, sin código cuando él lo pide; no inventar estados ni éxitos; decir lo que no se pudo verificar.
