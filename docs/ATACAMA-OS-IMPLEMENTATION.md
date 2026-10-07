# Atacama OS — Registro de implementación

Registro cronológico de cada cambio hecho a partir de la autorización del 5-oct-2026 (decisiones aprobadas en `ATACAMA-OS-DIAGNOSTIC.md`). Cada entrada: **cambio · fecha · sistema · estado anterior · estado nuevo · evidencia · rollback · pendientes**.

Respaldos de esta sesión (contienen datos personales, **fuera del repo**): `ATACAMA-LABS-SPEC-DRIVEN-v1.0/backups/2026-10-05/` → 21 workflows de n8n (JSON completo), y GHL (pipelines, oportunidades, contactos, campos personalizados, calendarios, location).

---

## BLOQUE A — Seguridad · ✅ COMPLETO

### A1. Row Level Security en `runs` y `_backup_prospects_pre_operator_required_20260903`
- **Fecha / sistema:** 5-oct-2026 · Supabase `uwquwjmiofixzugttals`.
- **Estado anterior:** ambas tablas con RLS desactivado y privilegios completos (SELECT/INSERT/UPDATE/**DELETE/TRUNCATE**) para `anon` y `authenticated`. Con la clave pública: `runs` devolvía 11 filas y el respaldo 62 (registrado en `rls_before.txt`).
- **Verificaciones previas:** `service_role` y `postgres` tienen `BYPASSRLS`; `landing_writer` no tiene grants sobre estas tablas; las demás 13 tablas ya tenían RLS; `Atacama Labs - Supabase` (n8n) usa `service_role` (lo prueba que Lead Sync lee `lead_submissions`, que tiene RLS sin políticas).
- **Cambio:** migración `supabase/migrations/20261005_enable_rls_runs_and_backup.sql` (aplicada con `apply_migration`): `ENABLE ROW LEVEL SECURITY` en ambas, sin políticas (denegar por defecto).
- **Estado nuevo / evidencia:** con la clave pública ambas devuelven 0 filas (`rls_after.txt`); con `service_role` `runs` sigue mostrando 11; el asesor de seguridad de Supabase ya no reporta la alerta crítica; Lead Sync y Booking Sync siguieron ejecutando con éxito en el minuto siguiente.
- **Rollback:** `ALTER TABLE public.runs DISABLE ROW LEVEL SECURITY;` (idem el respaldo).
- **Pendiente / hallazgo nuevo (no corregido, fuera de la lista aprobada):** `public.complete_territory_scan(...)` (función de EnBandeja, `SECURITY DEFINER`) puede ser ejecutada por `anon` y `authenticated` vía `/rest/v1/rpc/`. Propuesta: `REVOKE EXECUTE ... FROM anon, authenticated, public;` tras confirmar que ningún workflow la llama con la clave pública. También `set_updated_at` sin `search_path` fijo (advertencia menor).

### A2. OpenClaw: UI fuera de internet + Chromium descontrolado
- **Fecha / sistema:** 5-oct-2026 · VPS · proyecto Docker `openclaw-655m` (`/docker/openclaw-655m`).
- **Estado anterior:** puerto `0.0.0.0:61460` publicado y respondiendo 200 desde internet; contenedor con un `chromium` vivo desde el 7-sep (14.680 min de CPU, ~50 % de CPU sostenido, 2,3 GB de RAM).
- **Restricción encontrada:** el `docker-compose.yml` es de `root` (644) y el usuario de la auditoría no tiene `sudo`. En vez de forzar el permiso, se usó un **archivo de configuración adicional** que no toca el original: `~/atacama-os/openclaw-localhost-only.override.yml` (en el home de `enbandeja-ops`), invocado con `docker compose -p openclaw-655m -f docker-compose.yml -f <override> up -d`.
- **Cambio:** `ports: !override ["127.0.0.1:${PORT}:${PORT}"]` + `mem_limit: 4g`. Se recrearon `openclaw` y `gateway-proxy` (datos en `./data`, intactos).
- **Incidente durante el cambio:** el primer arranque reanudó automáticamente muchas sesiones interrumpidas, la memoria del host llegó a 7,0/7,8 GB y el sistema mató el proceso del gateway (`OOMKilled=true`). El gateway estuvo caído unos 8 minutos (18:11–18:16 UTC). No afectó a n8n, Hermes ni al sitio. Se corrigió agregando el tope de memoria de 4 GB (pico posterior 2,3 GB) y se monitoreó 4 minutos. **Efecto colateral posible:** durante la reanudación, OpenClaw respondió "no pude recuperar la tarea anterior" a sesiones antiguas; si alguna estaba ligada a un chat de Telegram, esos mensajes pudieron llegar a sus destinatarios (no verificable desde aquí).
- **Estado nuevo / evidencia:** `127.0.0.1:61460` en el host; `curl http://IP:61460` → sin respuesta; contenedores `Up`, `OOMKilled=false`, `RestartCount=0`, límite 4 GiB; `openclaw channels status` → gateway alcanzable y 4 bots de Telegram conectados; n8n llega a `openclaw-gateway:18790` (prueba TCP OK); proceso Chromium anterior eliminado; CPU en reposo ~1,4 % (antes ~50 %); RAM libre del host ~4,9 GB (antes 2,8 GB).
- **Rollback:** `cd /docker/openclaw-655m && docker compose -p openclaw-655m up -d` (sin el archivo adicional vuelve a publicar el puerto).
- **Pendientes:**
  1. **Persistir el cambio en el compose original** (requiere root): reemplazar `- "${PORT}:${PORT}"` por `- "127.0.0.1:${PORT}:${PORT}"` y agregar `mem_limit: 4g` bajo `openclaw`. Mientras no se haga, cualquier `docker compose up` ejecutado desde el panel de Hostinger *sin* el archivo adicional volvería a abrir el puerto.
  2. La UI sigue accesible por **HTTPS** a través de Traefik (`https://openclaw-655m.<host>` responde 200). Es la ruta pensada por Hostinger, protegida por el token del gateway; si no la necesitas desde internet, quitar los labels `traefik.*` o limitarla (decisión pendiente).
  3. Quien accedía a la UI por `http://IP:61460` ahora debe usar el túnel (`ssh -L 61460:127.0.0.1:61460`) o la ruta HTTPS.

---

## BLOQUE B — Orden (EnBandeja legacy, n8n, documentación) · ✅ COMPLETO

### B1. GHL: contactos `legacy:enbandeja`
- **Sistema:** GHL (location actual). **Fecha:** 5-oct-2026.
- **Estado anterior:** 43 contactos, 36 provenientes de EnBandeja (fuente `EnBandeja Prospecting*` y/o oportunidad en el pipeline `EnBandeja — Ventas`) sin ninguna marca.
- **Cambio:** etiqueta `legacy:enbandeja` agregada a esos 36 contactos (`POST /contacts/{id}/tags`). **No** se tocaron los 7 restantes (2 de la web de Atacama + 5 sin origen, entre ellos Sushi72 y Delicor) ni se modificó ninguna oportunidad. No hay solapamiento con oportunidades del pipeline de Atacama.
- **Evidencia:** lectura individual de los 36 → todos con la etiqueta (la lista general tarda unos segundos en reflejarla).
- **Rollback:** quitar la etiqueta por contacto (`DELETE /contacts/{id}/tags`).
- **Notas:** las 36 oportunidades del pipeline `EnBandeja — Ventas` (incluidas las 23 abiertas en "Contactado") **no se mueven ni se eliminan**. Se excluyen de Atacama por pipeline en los dashboards/vistas. Pendiente: crear en la interfaz una Smart List "Atacama (sin legacy)" que excluya la etiqueta.

### B2. n8n: agrupación por etiquetas y archivo de versiones antiguas
- **Sistema:** n8n (`enbandeja-n8n`). **Fecha:** 5-oct-2026. La API pública no permite carpetas; se usaron **etiquetas** (visibles en la lista de workflows).
- **Estado anterior:** 21 workflows sin ninguna organización.
- **Cambio:**
  - `ATACAMA — PRODUCCIÓN` (2): Lead Sync v2.2, Booking Sync.
  - `ATACAMA — EN DESARROLLO` (5): 00 Orchestrator y las copias PROD de 01 Discovery, 02 Research, 02b Signals, 03 Qualification (pipeline de prospección detenido).
  - `LEGACY — ENBANDEJA` (11): los 8 workflows del motor original y los 3 benchmarks.
  - `ATACAMA — ARCHIVO` (3): Lead Sync v1, v2 y v2.1 → además **archivados** (`POST /workflows/{id}/archive`), siguen existiendo con sus IDs.
- **Evidencia:** mismo estado activo/inactivo antes y después (ninguno cambió); Lead Sync v2.2 y Booking Sync siguen ejecutando con éxito cada 2 min; respaldo JSON de los 21 workflows en `backups/2026-10-05/n8n/`.
- **Rollback:** quitar etiquetas (`PUT /workflows/{id}/tags []`) y `POST /workflows/{id}/unarchive`.
- **Pendiente de borrar/migrar (legacy):** los 11 workflows `LEGACY — ENBANDEJA` y los 3 `ARCHIVO` se borran solo con autorización expresa; `enbandeja-gmaps` (dependencia de 01 Discovery) y las credenciales compartidas se mantienen hasta migrarlas.

### B3. Documentación
`n8n/README.md` ahora abre con la sección "Estado REAL de la instancia" (qué está en producción, qué está detenido, qué existe solo como JSON y qué dependencias de EnBandeja siguen en uso). `brand/content/README.md` se agrega en el Bloque F/contenido.

---

## BLOQUE C — GHL Core · ✅ COMPLETO (con 2 pendientes manuales)

### C1. Location: nombre y zona horaria
- **Sistema / fecha:** GHL · 5-oct-2026. Ninguno de los dos tokens tiene el scope `locations.write`, así que se hizo por la interfaz (Settings → Business Profile).
- **Estado anterior:** nombre `Christian Weva`, zona horaria `UTC`.
- **Análisis previo de horas (antes de tocar la zona):** calendario "Reunión de activación" con horarios por día guardados en UTC (p. ej. martes 16:30–22:00 UTC = 13:30–19:00 Chile). Se midieron los cupos reales con `free-slots?timezone=America/Santiago` como línea base (lunes 09:00–17:30 [4 cupos], martes 13:30–18:30, miércoles 10:00–18:30, jueves 10:00–17:30, viernes 09:00–18:30).
- **Cambio:** nombre → `Atacama Labs`; zona horaria → `America/Santiago`.
- **Evidencia:** `GET /locations/{id}` → `name: Atacama Labs`, `timezone: America/Santiago`; los cupos en hora de Chile quedaron **idénticos** a la línea base (la disponibilidad del calendario depende de la zona de su usuario asignado, no de la de la location, por eso no hizo falta desplazar `openHours`). Reserva de prueba (contacto + cita "PRUEBA ATACAMA OS — NO USAR", ambos borrados) → la API devuelve `startTime: 2026-10-13T13:30:00-03:00` (con offset), así que **Booking Sync guarda el instante correcto** (`timestamptz`).
- **Rollback:** Settings → Business Profile → volver a `UTC` y al nombre anterior.
- **Pendiente:** el calendario sigue definido en UTC a nivel de usuario (`My Profile`). Con el cambio de hora de **abril de 2027** (Chile vuelve a UTC-4) los horarios se correrán una hora. Solución recomendada: poner la zona del usuario en Santiago **y** restar 3 h a `openHours` en la misma operación, verificando con `free-slots`. La marca "Imperio Digital" es la capa white-label de la plataforma y no se tocó.

### C2. Incidente propio durante C1 (corregido)
- Para sondear permisos envié un `PUT /calendars/{id}` con cuerpo vacío. El API lo aceptó y **dejó `openHours` en `{}`** (y `notifications: []`). Lo detecté al comparar con el respaldo (antes de cualquier cambio de zona), restauré `openHours` desde `backups/2026-10-05/ghl/calendars.json` y verifiqué: campo idéntico al respaldo y cupos idénticos al baseline. Único residuo: `notifications` pasó de ausente a `[]` (sin efecto). **Regla desde ahora: no hacer sondas de escritura con cuerpo vacío en producción.**

### C3. Pipeline `Atacama Labs — Ventas`
- **Estado anterior:** Nuevo → Contactado → Diagnóstico → Propuesta → Seguimiento → Cerrado (2 oportunidades, ambas en Nuevo, 0 en Cerrado).
- **Dónde estaban fijados los IDs:** pipeline y etapa *Nuevo* en Lead Sync (v1–v2.2); etapas *Nuevo/Contactado* (lista de "etapa temprana") y *Diagnóstico* (destino) en Booking Sync; `icp_packs.crm` (packs `atacama-labs` y `atacama-labs-test`); migración `20260915_atacama_prospecting_engine.sql`.
- **Prueba controlada:** pipeline desechable "PRUEBA ATACAMA OS (borrar)" con una oportunidad: insertar una etapa y quitar otra con `PUT` conservó los IDs de las etapas incluidas y no movió la oportunidad. Pipeline y oportunidad de prueba borrados.
- **Cambio real:** Nuevo → **Investigado** → Contactado → **Respondió** → Diagnóstico → Propuesta → Seguimiento. "Cerrado" eliminada (0 oportunidades). Ganado/Perdido siguen siendo los estados nativos `won`/`lost`.
  - IDs nuevos: Investigado `2216d3ae-d153-4446-bc3b-77d0a240e415`, Respondió `38059f54-3ebf-47cd-9a10-126589e61b86`. Los 5 IDs existentes se conservaron; las 2 oportunidades siguen en Nuevo.
- **Dependencias actualizadas:**
  - `icp_packs.crm` (ambos packs de Atacama): se agregó `stages` (mapa de las 7 etapas) y `prospect_entry_stage_id = Investigado`; `new_stage_id` (Nuevo) se mantiene porque Lead Sync lo usa para leads entrantes.
  - **Booking Sync:** la lista de "etapa temprana" ahora incluye Investigado y Respondió (una reserva debe llevar a Diagnóstico desde cualquiera de las cuatro). Siguiendo el protocolo (no editar un workflow activo): copia nueva `VsLCMZ6MeDsNvGzI` ("07 Booking Sync (etapas Investigado/Respondió)"), GET de vuelta idéntico al enviado, desactivar el anterior (`sw0xbhB91s5mhHCh`), activar la copia, primera ejecución `success` a los 2 minutos (con reversión automática prevista si fallaba), etiquetas actualizadas y el anterior archivado. JSON actualizado en `n8n/atacama-labs-07-booking-sync.json`.
  - Lead Sync no necesitó cambios (usa pipeline y *Nuevo*, que no cambiaron).
- **Rollback:** `PUT /opportunities/pipelines/{id}` con el listado anterior (respaldo en `backups/2026-10-05/ghl/pipelines.json`); Booking Sync: `unarchive` + `activate` de `sw0xbhB91s5mhHCh` y desactivar la copia.

### C4. Campos del pipeline (oportunidad)
- **Conservados (genéricos):** Fuente, Solución de interés, Lead ID, Prospect Key, Qualification Score, Commercial Angle.
- **Creados (3):** `Evidencia URL` (texto), `ICP / vertical` (los 9 rubros del sitio + Otro), `Canal de contacto` (Correo, WhatsApp, Instagram, LinkedIn, Llamada, Formulario web, Referido). IDs guardados en `icp_packs.crm.fields`.
- **"Motivo de pérdida":** no se creó campo: las oportunidades de GHL traen el motivo de pérdida **nativo** (lost reason). Pendiente: configurar la lista de motivos en Settings → Opportunities & Pipelines.
- **EnBandeja (no borrados, sin usar):** Schools Count, Operator Relation, Platform Status, Manual Process Count, Manual Process Verified. GHL no permite ocultar un campo por API; quedan en su carpeta original. Pendiente de ocultarlos en la interfaz o moverlos a una carpeta "Legacy EnBandeja".
- **Rollback:** borrar los 3 campos nuevos (ids en `icp_packs.crm.fields`).

### C5. Companies
- **Estado real:** el módulo existe (Contacts → Companies) y hoy contiene **solo 3 empresas de ejemplo** de GHL (Dunder Mifflin y similares, creadas el 9-jul-2026). Ninguna empresa real. Los tokens actuales no tienen el scope de Companies (`businesses.*`), por lo que no se pudieron crear empresas por API.
- **Modelo definido (sin crear objetos extra):** Company → Contacts → Opportunities (asociaciones nativas). **Cliente = Company + oportunidad `won`.** No existe objeto `Cliente`.
- **Pendiente:** habilitar el scope (ver "Pasos manuales de Christian") y cargar solo empresas reales aprobadas. No se borraron las 3 de ejemplo.

---

## BLOQUE D — Clientes y proyectos · 🟡 EVALUADO, CONFIGURACIÓN BLOQUEADA POR SCOPES

### D1. Evaluación de Project Management (real, no la documentación)
- **Hallazgo:** en tu cuenta **no está disponible el Project Management con Spaces / Folders / Lists / Kanban**. Contacts → Tasks muestra solo el módulo básico de tareas (Todas / Vencen hoy / Vencidas / Próximas, "Manage fields" para campos personalizados, asociación a contactos) y el botón **"+ List" muestra "Coming soon!"**. Hoy hay 5 tareas de ejemplo de GHL.
- **Conclusión según tu regla:** PM no permite hoy relacionar proyectos con clientes ni armarlos como tablero → **se crea el Custom Object `Proyecto`** (no hay solución duplicada que evitar). Las tareas siguen siendo las nativas, asociadas al contacto (y a más objetos si la función "tareas multi-objeto" está activa en tu cuenta; sin verificar).
- **Custom Objects:** la sección Settings → Objects está disponible (Opportunities, Contacts, Companies como estándar; **0 objetos personalizados creados**). Límite documentado por GHL: 10 objetos por location y 300.000 registros por objeto en todos los planes.

### D2. Diseño listo para crear (cuando haya scopes)
- **`Proyecto`** — nombre (principal), empresa/cliente (asociación a Company), tipo (agente, ecommerce, integración, interno, contenido, web, infraestructura), estado (preventa, en curso, en pausa, completado, cancelado), responsable (usuario), prioridad, fecha de inicio, fecha objetivo, próximo hito, progreso (%), enlace de documentación, repo, deployment. Asociaciones: Company (1 cliente → N proyectos), Oportunidad (el cierre que lo originó), Contacto.
- **`Servicio contratado`** — nombre, empresa, servicio, plan, implementación (CLP), MRR (CLP), fecha de inicio, estado, próximo paso. Asociaciones: Company, Oportunidad ganada, Proyecto.
- **Sushi72 y Delicor:** no se marcan como clientes. Cuando existan los objetos se podrán cargar como **Proyecto en preventa** asociados a su oportunidad, sin MRR, contrato ni fecha de inicio inventados.

### Pasos manuales de Christian para desbloquear C5, D, E (objetos) y F
1. GHL → **Settings → Private Integrations** → abrir la integración **«Atacama Labs — Web»** → editar scopes → agregar (lectura y escritura): `objects/schema`, `objects/record`, `associations`, `associations/relation`, `businesses` (Companies), `locations/tags`, `locations/customValues`, `locations/tasks`, `socialplanner/account`, `socialplanner/post`, `socialplanner/oauth`, `socialplanner/category`, `socialplanner/tag`, y lectura de `forms`, `workflows`, `users`. Guardar. **Esto no debería cambiar el token** (si GHL pidiera regenerarlo, avisar antes: n8n lo usa en 3 credenciales).
2. Avisarme cuando esté hecho; los pasos D y F se ejecutan por API de forma reproducible (necesario también para el Snapshot).

---

## BLOQUE E — Dashboard "Atacama OS — Hoy" · 🟡 CREADO CON LO DISPONIBLE (4 widgets)

- **Sistema / fecha:** GHL · 5-oct-2026 (por interfaz: el dashboard no tiene API pública).
- **Estado anterior:** solo el dashboard por defecto de GHL, con widgets sobre "All pipelines" (mezclan EnBandeja y el pipeline de ejemplo).
- **Intentos descartados:** "Clone existing dashboard" no creó nada; el dashboard en blanco sí. Se creó y borró un primer dashboard en blanco (propio, vacío) antes del definitivo.
- **Cambio:** dashboard privado **Atacama OS — Hoy** (id `6ac3fc3626ac4365db388126`) con 4 widgets, todos filtrados al pipeline `Atacama Labs — Ventas` y estado abierto (no incluyen EnBandeja ni el Marketing Pipeline):
  1. *Reuniones agendadas* (número).
  2. *Oportunidades abiertas* (dona).
  3. *Oportunidades por etapa* (dona agrupada por etapa).
  4. *Valor del pipeline (abiertas)* (suma de ingreso; hoy $0 porque las oportunidades no tienen monto).
- **Evidencia:** captura del dashboard guardada por la sesión (`…\tool-results\mcp-claude-in-chrome-blob-1791229457531-v812xz.jpg`); muestra 0 reuniones, 2 oportunidades abiertas en *Nuevo*.
- **Rollback:** Dashboard → ⋮ → Delete (solo afecta a este dashboard).
- **Pendiente (no se pudo poner todavía):**
  - *Clientes activos / servicios / MRR* y *Proyectos activos / atrasados*: requieren los objetos personalizados (Bloque D).
  - *Tareas vencidas / de hoy*: **GHL no ofrece un widget de tareas** en el catálogo estándar (la búsqueda "task" devuelve 0); se resolverá con un widget de objeto personalizado o con la lista de tareas en Contacts → Tasks.
  - *Publicaciones en revisión / programadas*: requieren Social Planner con cuentas conectadas (Bloque F); GHL no ofrece widget nativo de Social Planner en el catálogo revisado.
  - Marcarlo como dashboard por defecto y revisar "Manage dashboard timezone" (hereda `America/Santiago` de la location; no se confirmó en la interfaz).

---

## BLOQUE F — Social Planner · ⛔ BLOQUEADO POR PASO MANUAL

- **Estado real (UI):** Social Planner está habilitado pero **sin ninguna cuenta conectada**: la pantalla muestra solo el asistente "Connect your social accounts" (Facebook, Instagram, LinkedIn, TikTok, YouTube, Pinterest, Threads, Bluesky, GBP, Community).
- **No se pudo hacer:** categorías, verificación de la API y el draft de prueba `PRUEBA ATACAMA OS — NO PUBLICAR`. El endpoint de crear post exige `accountIds` (al menos una cuenta) y los tokens actuales no tienen los scopes `socialplanner/*` (ver "Pasos manuales de Christian").
- **Sin cambios** en GHL. No se publicó nada.
- **Pasos exactos para Christian:**
  1. GHL → **Marketing → Social Planner** → *Instagram → + Connect*. Instagram debe ser cuenta **Profesional** y estar vinculada a una **página de Facebook** (si no lo está: Instagram → Configuración → Cuenta → *Cambiar a cuenta profesional* y luego vincular la página). Elegir la página y aceptar los permisos.
  2. *LinkedIn → + Connect* → elegir **perfil personal** o **página de empresa** (si existe y eres administrador, la de empresa).
  3. Agregar los scopes `socialplanner/*` a la integración «Atacama Labs — Web» (paso anterior).
  4. Avisarme. Entonces: configuro las categorías (educativo, caso, demo, actualidad, evergreen, producto, detrás de escena), creo el draft de prueba por API, verifico que aparezca y lo elimino.
- **Contenido (MVP):** diseño en `docs/ATACAMA-OS-DIAGNOSTIC.md` §17. No se creó ninguna tabla ni workflow de contenido: sin cuentas conectadas no se puede probar el último eslabón (crear el post en revisión) y se evita código sin consumidor. Se versionó `brand/content/README.md` con lo que falta incorporar (guía oficial de publicaciones, hoja de poses y de emociones de la llamita) y el aviso de que las piezas C01–C06 usan la paleta anterior.

---

## BLOQUE G — Prospección (Hermes → Supabase → Qualification → 04 → 05) · ✅ COMPLETO Y PROBADO, SIN ENVÍOS

**Qué se construyó (todo con el protocolo de copias desechables; los datos de prueba se borraron):**

| Pieza | Qué hace | Dónde |
|---|---|---|
| `prospect_inbox` (tabla) | Bitácora de cada prospecto recibido: aceptado / rechazado (con motivos) / duplicado | `supabase/migrations/20261005_prospect_inbox.sql` |
| `ingest_prospect()` (RPC) | Ingesta transaccional: cuenta + evidencia por factor + contacto + bitácora, o nada; deduplica por dominio; solo ejecutable por `service_role` | `…_ingest_prospect_rpc.sql` y `…_rpc_v2.sql` |
| **08 Prospect Ingest** (n8n, webhook con clave) | Gate de calidad → RPC → ejecuta 03 Qualification sobre las cuentas nuevas | workflow `YCl1Xns0XLX4W6M6` (PROD) · JSON `n8n/atacama-labs-08-prospect-ingest.json` · generador `n8n/build/atacama-os-workflows.mjs` |
| **09 Prospect Approve** (n8n, webhook con clave) | Marca como `ready_to_contact` solo prospectos `hot` + `crm_candidate` + `new`, ejecuta 04 CRM Sync (una vez) y 05 Outreach Draft (una vez por cuenta). **No envía nada** | workflow `jznwD7AwEI0h9pEv` (PROD) |
| **04 CRM Sync / 05 Outreach Draft** (PROD) | Desplegados desde sus JSON con el protocolo seguro. 04 ahora entra en la etapa **Investigado** | `bweEmgWTuqSLhnPd` / `LTkXsYwcIDVF0GGC` |
| Hermes Client Finder | 1 corrida al día (11:00 UTC), prompt nuevo que devuelve JSON estructurado y lo envía al endpoint; modelo barato; sin continuidad | `ops/hermes/client-finder.prompt.txt` · job `8421589d0902` |

**Gate de calidad (en 08):** empresa y dominio propios (no redes sociales ni directorios); evidencia citada con URL y cita del **dolor** y del **encaje** (nivel 1-2; lo inferido se limita a nivel 1; urgencia exige fecha ≤ 30 días); contacto **público** declarado, con su URL; razón específica de ≥ 20 caracteres. Si falla, se rechaza con motivos y **no se rellena una cuota**. Seguridad: clave en cabecera (`X-Atacama-Key`, credencial de n8n y variable de Hermes; nunca impresa), `icp_pack_id` debe coincidir con el pack del workflow, RPC cerrada a anon/authenticated.

**Pruebas (pack `atacama-labs-test`, datos ficticios `.invalid`):**
- Lote de 5: 1 aceptado (calificó **A / hot / 85**), 3 rechazados con el motivo correcto (`missing_pain_evidence`, `duplicate_in_batch`, `missing_public_contact`) y 1 duplicado contra una cuenta existente; sin clave → 403; clave incorrecta → 403; pack equivocado → error sin escribir.
- Aprobación: contacto + oportunidad creados en GHL en **Investigado**, `prospects.status = ready_to_contact`, borrador en `outreach` con `sent_at` nulo. **0 mensajes enviados.**
- Bugs reales encontrados y corregidos en la prueba: (1) el sandbox de Code no tiene `new URL` → validación de URL por regex; (2) `complete_sync_job` marcaba al prospecto como `contacted` al sincronizar → ahora conserva `ready_to_contact` (`…_complete_sync_job_prospect_keeps_status.sql`); (3) **05 solo procesaba el primer prospecto del lote** (un nodo Code de "todos los items") y tomaba también prospectos no aprobados → 05 ahora filtra `ready_to_contact` y por cuenta, y 09 lo llama una vez por cuenta (`mode: each`); probado con 2 prospectos simultáneos (ambos con borrador).
- Limpieza verificada: GHL volvió a 43 contactos y 42 oportunidades (36 con `legacy:enbandeja` intactos); Supabase: pack de prueba en 0 y el resto de los packs sin cambios; 0 workflows de prueba en n8n.

**Hermes (hallazgos y números):**
- Conectividad: Hermes llega al webhook con su clave (respuesta 500 a un cuerpo vacío = clave válida, rechazado por el gate).
- Primera corrida real (modelo Codex): **1.448.308 tokens de entrada en 5,4 min y terminó `[SILENT]`** — buscó con `curl` a Bing (Hermes no tiene API de búsqueda: sin claves de Tavily/Firecrawl/Exa) y no halló prospectos que cumplieran el gate. Al estar la cuota Codex compartida con OpenClaw, el job pasó a `google/gemini-3.7-flash` por OpenRouter y se desactivó la continuidad. **Segunda corrida real (Gemini 3.7 Flash, 19:29–19:46 UTC): envió 1 lote de 10 prospectos reales de Chile (`hermes-20261005-1945`) y los 10 pasaron el gate (10 aceptados, 0 rechazados, 0 duplicados).** El flujo funcionó de punta a punta con datos reales. Pero hay dos hallazgos importantes:
  1. **Los 10 calificaron `cold` (puntaje 50-55 de 100) y ninguno es `crm_candidate`**: solo la clase A (≥ 80 y todos los gates) puede pasar a GHL, y Hermes entrega evidencia fuerte de dolor y encaje pero casi nunca de volumen, presupuesto, automatización o urgencia, que suman la mayor parte de los puntos. Con el contrato actual (`contracts/PROSPECTING.md`) llegar a 80 exige evidencia de ~5 factores. Opciones (decisión de Christian): pedirle a Hermes evidencia de los 7 factores, o permitir que los `warm` (60-79) entren a *Investigado* con revisión manual. Hoy el resultado seguro es "0 al CRM".
  2. **Costo:** la corrida usó **5,66 millones de tokens de entrada** (17 min) aunque con un modelo barato (créditos de OpenRouter, no cuota Codex). A 1 corrida diaria es del orden de US$1 al día; conviene poner un tope de pasos al prompt o pedir menos prospectos por corrida antes de dejarlo permanente.
  Los 10 dominios quedaron además registrados en `atacama-known-domains.txt` y los 10 en `accounts`/`prospects` del pack real (`atacama-labs`), sin sincronizar a GHL.
- Respaldo: prompt anterior en `backups/2026-10-05/hermes/client-finder-prompt-ANTES.txt`; copia del `.env` y de `jobs.json` en `/opt/data/backups/` del servidor.
- Lista compacta de dominios ya investigados (`atacama-known-domains.txt`, 106 dominios) para que Hermes no relea ~500 KB de HTML.

**Pendientes de esta línea:** (a) API de búsqueda para Hermes (decisión de Christian; la credencial de Exa existe en n8n para los benchmarks); (b) verificar automáticamente que la cita de cada evidencia aparezca en la URL antes de aceptar nivel 2 (anti-alucinación); (c) 05 sigue redactando con OpenClaw (`prospector`): debe reemplazarse por el borrador que ya trae Hermes en `accounts.metadata.hermes.draft`; (d) cargar en Companies de GHL a los aprobados (requiere scope); (e) neutralizar nombres heredados de la tabla `prospects` (`operator_relation`, `platform_status`, `schools_count`); (f) `complete_territory_scan` (SECURITY DEFINER ejecutable por anon) pendiente de decisión.

---

## BLOQUE H — Atacama Daily · 🟡 CONSTRUIDO Y PROBADO EN VISTA PREVIA, FALTA EL BOT DE TELEGRAM

- **Qué es:** workflow n8n `10 Atacama Daily` (generador `n8n/build/atacama-daily.mjs`, JSON `n8n/atacama-labs-10-atacama-daily.json`) que a las **08:30 (Santiago)** arma un resumen de solo excepciones y datos útiles: VENTAS (pipeline Atacama + reuniones de hoy), PROSPECCIÓN (por aprobar, ingesta 24 h con motivos de rechazo más comunes, borradores listos, última ingesta de Hermes), SISTEMA (workflows con error en 24 h, cola de sync con problemas, OpenClaw `/healthz`) y HOY TE TOCA. No incluye secciones sin datos (Clientes, Proyectos, Contenido aparecerán cuando existan).
- **Prueba:** una copia de vista previa (webhook con clave, no envía nada) devolvió el texto real de hoy; luego se borró. Ejemplo de salida: *VENTAS abiertas 2 (Nuevo 2) · SISTEMA workflows con error 24 h: 3 (mis pruebas deliberadas de seguridad) · cola de sync con problemas: 1 (un lead de prueba de Nayra del 29-sep con correo inválido, `c wevarh@gmail.com`)*.
- **Hallazgos que salieron del Daily:** el único trabajo de sync fallido es una prueba del 29-sep con un espacio dentro del correo (no es un lead perdido); aparecerá hasta el 6-oct (el filtro mira 7 días).
- **Credenciales creadas en n8n:** `Atacama Labs - Ingest Key` (clave de ingesta/aprobación) y `Atacama Labs - n8n API (lectura)` (solo se usa para leer ejecuciones fallidas).
- **Falta (manual):** crear el bot en Telegram (@BotFather → `/newbot`), pulsar *Start* en él y entregarme el token **sin pegarlo en el chat** (guardarlo en `.env.local` como `TELEGRAM_ATACAMA_BOT_TOKEN`); con eso creo la credencial de n8n, pongo tu chat id y activo el workflow. Mientras tanto no está desplegado en producción (el JSON del repo lleva marcadores).

---

## Estado de los datos y workflows al cerrar la sesión

- **n8n:** producción = Lead Sync v2.2, Booking Sync (copia nueva `VsLCMZ6MeDsNvGzI`), 03 Qualification, 04 CRM Sync, 05 Outreach Draft, 08 Prospect Ingest, 09 Prospect Approve. En desarrollo: 00 Orchestrator, 01 Discovery, 02 Research, 02b Signals. Legacy EnBandeja (11) y archivo (3) sin tocar.
- **Supabase:** migraciones nuevas aplicadas: RLS de 2 tablas, `prospect_inbox`, `ingest_prospect` (v1 y v2), `complete_sync_job`.
- **GHL:** nombre/zona horaria, pipeline de 7 etapas, 3 campos, 36 etiquetas `legacy:enbandeja`, dashboard con 4 widgets.
- **Repo:** cambios sin commit (ver `git status`); nada subido a GitHub.

---

## Mejoras posteriores a la primera entrega (misma sesión, tareas que dependían solo de mí)

### G2. Verificación automática de citas (anti-alucinación) en 08
- **Qué hace:** antes de guardar, 08 abre cada URL de evidencia y comprueba que la cita exista en la página. La evidencia nivel 2 **solo cuenta si la cita aparece**; si la página carga y la cita no está, o si no se puede leer, la evidencia baja a nivel 1 y queda marcada `unverified` (no se rechaza el prospecto: lo ve la revisión humana). Las evidencias de nivel 2 sin cita bajan a nivel 1. El resumen queda en `accounts.metadata.hermes.verification` (`checked / found / not_found / unreadable`).
- **Prueba (pack de pruebas, páginas reales):** `example.com` con cita literal → 4/4 encontradas → **hot, 85, candidato a CRM**; `example.org` con una cita inventada → 0/4 → todo nivel 1 `unverified` → **cold, 55**. (Un primer intento con una cita antigua de example.com fue marcado correctamente como "no encontrada": la página había cambiado su texto.)
- **Implicancia:** un prospecto solo puede ser `hot` si sus citas son reales; esto cierra el riesgo de que un modelo barato invente evidencia para sumar puntos.

### G3. 05 usa el borrador que trae Hermes (OpenClaw fuera de la ruta crítica)
- 05 ahora toma `accounts.metadata.hermes.draft` (+ `draft_subject`) cuando existe (≥ 40 caracteres) y solo recurre a OpenClaw si no hay borrador. **Probado:** el borrador salió con el asunto de Hermes, `sent_at` nulo, y la ejecución de 05 **no llamó a OpenClaw**.
- El prompt de Hermes pide ahora `draft_subject`, citas literales y un presupuesto de esfuerzo (máx. 8 prospectos, 60 llamadas a herramientas, 20 minutos) para frenar el gasto de tokens (la prueba anterior usó 5,66 M).

### Producción tras la mejora (cambio de copias, con reversión automática prevista)
- Nuevos: `08 Prospect Ingest` `i8VEHPHrBsT4fCBn`, `09 Prospect Approve` `fxIBBQX2jlNhzAO5`, `05 Outreach Draft (PROD)` `c8jZ4BwKToX9kwSu`. Anteriores archivados (`YCl1Xns0XLX4W6M6`, `jznwD7AwEI0h9pEv`, `LTkXsYwcIDVF0GGC`). Verificado después del cambio: sin clave → 403; pack equivocado → error sin escribir. **Datos de prueba borrados** (GHL de vuelta a 43 contactos y 42 oportunidades; pack de pruebas en 0).
- Documentación nueva: `docs/GMAIL-OUTREACH-PLAN.md` (dominio, DNS, OAuth, hilos, respuestas, bajas, cumplimiento, orden de activación) y la sección de 08/09/10 en `n8n/README.md`.

## BLOQUE D2 — Modelo de clientes, servicios y proyectos en GHL (6-oct-2026, token `Atacama OS — Claude`)

**Estado previo (leído antes de escribir; guardado también en `ops/ghl/atacama-os-state.json`):**
- Businesses: 3, todos ejemplos de GHL (`(Example) Dunder Mifflin`, `(Example) Goliath National Bank`, `(Example) MacLarens Pub`). No se reutilizan ni se borran.
- Schemas de objetos: solo los 3 del sistema (`business` = Company, `opportunity`, `contact`). **No existe ningún objeto equivalente** a Servicio contratado ni a Proyecto.
- Asociaciones (4): `BUSINESSES_OPPORTUNITIES_ASSOCIATION` (business↔opportunity, id `6aab99ca4b0508155da7f710`), `OPPORTUNITIES_CONTACTS_ADDITIONAL_ASSOCIATION` (id `6aab99ca4b0508155da7f70f`), `OPPORTUNITIES_CONTACTS_ASSOCIATION` y `BUSINESSES_CONTACTS_ASSOCIATION` (del sistema).
- Referencias de control: 43 contactos, 42 oportunidades, 3 pipelines.
- Decisión de diseño: **no se crea un objeto "Cliente"**; un cliente es una Business + una oportunidad `won`. Cadena: Business → Contacts → Opportunities → Servicios contratados → Proyectos.

### Resultado (ejecutado el 6-oct-2026 con `GHL_PRIVATE_INTEGRATION_TOKEN2`, solo este token)

**Objetos creados (Custom Objects)**

| Objeto | Clave | ID del schema | ID de carpeta de campos |
|---|---|---|---|
| Servicio contratado | `custom_objects.servicios_contratados` | `6ac440feb01eea82c5076de2` | `BJNDyttkwD1w1BdnPzqe` |
| Proyecto | `custom_objects.proyectos` | `6ac440ff79c86f212d1cac6b` | `51Z3OIXofmaLOzVYK5MN` |

El cliente sigue siendo el objeto nativo **Business** (no se creó "Cliente"; los 3 ejemplos de GHL no se tocaron).

**Campos — Servicio contratado** (campo principal: Nombre): Nombre (texto) · Servicio / producto (lista: Agente de IA, Automatización, Software a medida, Integración, Web, Ecommerce, Otro) · Estado (Pendiente, Onboarding, Implementación, Activo, Pausado, Finalizado) · MRR (monetario) · Fee de implementación (monetario) · Fecha de inicio · Fecha de término (fechas) · Próximo paso (texto) · Notas (texto largo).

**Campos — Proyecto** (campo principal: Nombre): Nombre · Tipo (Agente, Automatización, Integración, Ecommerce, Software, Web, Contenido, Infraestructura, Interno) · Estado (Planificado, En desarrollo, Bloqueado, QA, Producción, Mantenimiento, Finalizado) · Responsable (texto) · Prioridad (Baja, Media, Alta, Crítica) · Fecha de inicio · Fecha objetivo · Progreso % (numérico) · Próximo hito · Repo · Deployment / URL · Documentación (texto) · Notas (texto largo).

**Interpretación a validar:** el pedido listaba "Implementación" junto a "Fee de implementación". Se interpretó como un solo campo: el estado *Implementación* vive en **Estado** y el dinero en **Fee de implementación**. No se creó un campo "Implementación" separado.

**Asociaciones creadas** (GHL pasa las claves a minúsculas y a veces invierte primer/segundo objeto; no afecta el uso):

| Clave | ID | Une |
|---|---|---|
| `atacama_servicio_business` | `6ac4412e1ef24423a65a24b6` | Business ↔ Servicio contratado |
| `atacama_servicio_opportunity` | `6ac4412e79bbec5a0686f0ea` | Servicio contratado ↔ Opportunity |
| `atacama_proyecto_business` | `6ac4412fd143f08a0a642c44` | Business ↔ Proyecto |
| `atacama_servicio_proyecto` | `6ac44130ad83d04a973c2511` | Proyecto ↔ Servicio contratado |

Las 4 asociaciones previas (ver estado previo) quedaron intactas.

**Pruebas**
1. Lectura de schemas/campos/IDs tras crear: ambos schemas legibles, campos presentes (el campo principal viene por defecto en la carpeta).
2. Núcleo sin cambios: 3 businesses, 43 contactos, 42 oportunidades, 3 pipelines (iguales al estado previo).
3. Ida y vuelta con registros `TEST ATACAMA…` (1 por objeto): creación OK; relación creada y leída de vuelta para Servicio↔Business, Proyecto↔Business y Servicio↔Proyecto; relaciones eliminadas (200).
4. **No probado a nivel de registro:** Servicio↔Opportunity (la definición existe; para probarla había que enlazar una oportunidad real y se evitó). 
5. Incidente menor: el borrado de los registros TEST devolvió **422** porque el script agregaba `?locationId=` al DELETE. Se borraron con `DELETE /objects/{key}/records/{id}` sin query (200; GET posterior 404) y se corrigió el script.
6. Verificación final: 0 registros en ambos objetos; las relaciones de prueba ya no existen. (Las relaciones que aún muestran los businesses de ejemplo son de GHL; el estado previo no las inventarió, pero las de prueba se borraron una por una con 200.)

**Rollback:** borrar relaciones y registros si los hubiera → `DELETE /associations/{id}` de las 4 asociaciones → borrar los campos/carpeta y luego los 2 schemas (`DELETE /objects/{key}`), todo con el mismo token. Nada del resto de GHL fue modificado, así que no hay nada más que revertir.

**Fuera de alcance (no tocado):** dashboard, Social Planner, automatizaciones, Instagram/LinkedIn/Gmail, prospección, Snapshots, contactos/oportunidades reales, EnBandeja.

### Script de configuración de GHL (Bloques D y F — la versión anterior de este párrafo quedó reemplazada)
`ops/ghl/atacama-os-setup.mjs`: fases `snapshot | objects | fields | assoc | verify | roundtrip` (solo escribe con `--apply`; usa únicamente `GHL_PRIVATE_INTEGRATION_TOKEN2`; estado en `ops/ghl/atacama-os-state.json`). Es idempotente para el modelo de Servicio contratado y Proyecto. Las categorías de Social Planner y el borrador de prueba (Bloque F) **no están en este script**: siguen pendientes y fuera de este bloque.

## BLOQUE E2 — Pipeline comercial, tareas y preparación de cliente ganado (6-oct-2026, solo `GHL_PRIVATE_INTEGRATION_TOKEN2` para GHL)

### E0. Estado previo (leído antes de tocar nada)
- Pipeline `Atacama Labs — Ventas` (`trSWhAcNDyUMmPlYIEib`): **ya tenía las 7 etapas pedidas desde el Bloque C3** (Nuevo, Investigado, Contactado, Respondió, Diagnóstico, Propuesta, Seguimiento) y `Cerrado` ya estaba eliminada (0 oportunidades). Por eso en este bloque **no se modificó el pipeline**: se verificó.
- Las 2 oportunidades de Atacama (`María José Venegas - Sushi 72` y `Juan Pérez - Prueba Atacama`) están `open` en *Nuevo*; no se tocaron ni se marcaron como ganadas.
- Campos de oportunidad existentes: Fuente, Solución de interés, Lead ID, Prospect Key, Qualification Score, Commercial Angle (genéricos) + Evidencia URL, ICP / vertical, Canal de contacto (creados en C4) + 5 legacy de EnBandeja. Campos de contacto: solo `Primary Contact Role`.
- Workflows nativos de GHL: **0** (`GET /workflows` → lista vacía). La API pública no tiene endpoint para crear/editar workflows ni para definir motivos de pérdida.

### E1. Pipeline final y dependencias de IDs (sin cambios)
| Pos. | Etapa | ID |
|---|---|---|
| 0 | Nuevo | `aad0ad01-bffd-4ea9-b00c-7ab11dc941f6` |
| 1 | Investigado | `2216d3ae-d153-4446-bc3b-77d0a240e415` |
| 2 | Contactado | `b947fae7-0941-4296-a76b-e9a826dd47d0` |
| 3 | Respondió | `38059f54-3ebf-47cd-9a10-126589e61b86` |
| 4 | Diagnóstico | `fec1e794-fb25-4242-806d-f3c13316df6e` |
| 5 | Propuesta | `62d85e18-1bef-44fa-a82d-cf45462d1ae5` |
| 6 | Seguimiento | `b8d98d33-b593-4b0e-b0da-0aa8ab0ffa4d` |

`won` y `lost` siguen siendo los estados nativos de GHL (no hay etapas Ganado/Perdido). **Dónde se usan los IDs (búsqueda en n8n vivo, repo y Supabase):**
- n8n vivo: `01 Lead Sync v2.2` (`idniXY0Du2qet57O`) → pipeline + **Nuevo**; `07 Booking Sync` (`VsLCMZ6MeDsNvGzI`) → las 4 etapas tempranas + **Diagnóstico**; `10 Atacama Daily (PREVIEW)` → las 7 (solo lectura). `04 CRM Sync` y `05 Outreach Draft` toman el ID desde `icp_packs.crm` (no lo llevan fijo). Ningún otro workflow activo ni legacy lo referencia.
- Repo: `n8n/atacama-labs-01-lead-sync*.json`, `-07-booking-sync.json`, `-10-atacama-daily.json`, `n8n/build/atacama-daily.mjs`, migración histórica `supabase/migrations/20260915_atacama_prospecting_engine.sql`.
- Supabase: `icp_packs.crm` de `atacama-labs` y `atacama-labs-test` (mapa `stages`, `new_stage_id` = Nuevo, `prospect_entry_stage_id` = Investigado).

### E2. Campos comerciales
| Campo | Objeto | Estado | ID |
|---|---|---|---|
| Fuente, Solución de interés, Lead ID, Prospect Key, Qualification Score, Commercial Angle | Oportunidad | reutilizados (sin cambios) | ver `icp_packs.crm.fields` |
| Evidencia URL | Oportunidad | **ya existía** (C4), reutilizado | `WoO2N4rtxNPqkjWflOAf` |
| ICP / vertical | Oportunidad | **ya existía**, reutilizado | `0uK7RJiBCZkpzPofV5cV` |
| Canal de contacto | Oportunidad | **ya existía**, reutilizado. Opciones actuales: Correo, WhatsApp, Instagram, LinkedIn, Llamada, Formulario web, Referido (equivalen a las sugeridas; no se creó un duplicado ni se cambiaron las opciones) | `iNNT2QdbHmtlvqgxunIB` |
| **Motivo de pérdida** | Oportunidad | **creado** (Precio, Sin respuesta, Sin prioridad, No existe fit, Eligió otra solución, Proyecto pausado, Timing, Otro) | `tYjEMFrR2LAaWqPSQN0S` (`opportunity.motivo_de_prdida`) |
| **Origen detallado** | Contacto | **creado** (Formulario web, Nayra, Prospección outbound, Referido, Networking, Orgánico, Otro) | `JzsnIz7M4LPS6yIrQ2mI` (`contact.origen_detallado`) |

- Los 5 campos legacy de EnBandeja (Schools Count, Operator Relation, Platform Status, Manual Process Count, Manual Process Verified) **no se borraron ni se usan**; ocultarlos sigue siendo un paso de interfaz.
- `icp_packs.crm` (ambos packs) ahora incluye `fields.motivo_perdida`, `contact_fields.origen_detallado` y `entry_policy`. Copia previa: `backups/2026-10-05/icp_packs_crm_*_before_E.json` (fuera del repo).
- Pendiente (no tocado a propósito, es producción): Lead Sync no rellena `Origen detallado`; mapear Nayra / Formulario web es una mejora recomendada.

### E3. Regla de entrada al CRM (formalizada)
| Score | Qué pasa | Etapa | ¿Envía? |
|---|---|---|---|
| 0–59 | Se queda en Supabase (`prospects`), no entra a GHL | — | No |
| 60–79 | Puede entrar **solo si**: empresa verificada, evidencia real con URL verificable, fit concreto con Atacama y contacto razonable | **Investigado** | **No** |
| 80+ | Entra como candidato HOT para revisión humana | **Investigado** | **No** |
| Inbound (web / Nayra) | Entra por Lead Sync | **Nuevo** | No (lo atiende una persona) |

- Guardada como dato en `icp_packs.crm.entry_policy` (ambos packs) y descrita aquí. **Estado de aplicación, sin maquillar:** hoy `03 Qualification` marca `crm_candidate` solo para la clase A (≥80 con todos los gates) y `09 Prospect Approve` solo aprueba `hot` + `crm_candidate`. Eso ya garantiza que nada bajo 60 entra y que nada se envía. **Lo que falta implementar es la vía 60–79 con gates** (en 03: `crm_candidate = A o (B con los 4 gates)`; en 09: aceptar `classification in (hot, warm)`). No se tocó porque modifica la cadena de prospección en producción y se pidió no cambiar outbound; queda como decisión (ver Pendientes).

### E4. Tareas diarias
- **Decisión:** son automatizaciones puramente internas del CRM → corresponden a **Workflow nativo de GHL**. La API pública no los crea (0 existentes, sin endpoint de escritura) y no se inventó ningún atajo (no se creó nada en n8n para esto). **Configuración exacta por interfaz** (Automation → Workflows → Create from scratch, estado Published; ajuste común *Allow re-entry = OFF*, que evita tareas duplicadas porque un contacto entra una sola vez; asignar a Christian):
  1. **«Atacama — Tarea al investigar»** — Triggers: *Opportunity Created* **y** *Pipeline Stage Changed*, ambos con Pipeline = `Atacama Labs — Ventas` y Stage = `Investigado` (04 crea la oportunidad directamente en esa etapa). Acción *Create Task*: título `Revisar prospecto: {{contact.company_name}}`, vence en **1 día**.
  2. **«Atacama — Tarea al responder»** — Trigger *Pipeline Stage Changed* → `Respondió`. *Create Task*: `Revisar respuesta y definir próximo paso`, vence en **1 día**.
  3. **«Atacama — Seguimiento de propuesta»** — Trigger *Pipeline Stage Changed* → `Propuesta`. Primero *If/Else*: si el contacto tiene la etiqueta `proxima-accion` (la pones cuando ya definiste la próxima acción) → terminar sin tarea; si no → *Create Task* `Seguimiento de propuesta`, vence en **3 días**.
- **Limitaciones de GHL:** *Create Task* cuenta días corridos (un prospecto que entra el viernes queda con tarea el sábado) y no detecta «ya existe una próxima tarea» sin la etiqueta. Con *re-entry OFF*, un mismo contacto no genera una segunda tarea en una segunda oportunidad.
- **Estado:** especificado, **no configurado** (requiere interfaz). Verificación pendiente al crearlos: mover un contacto de prueba por las etapas y borrarlo.

### E5. Oportunidad ganada → cliente (preparado, no disparado)
- **Reparto:** lo interno de GHL (tareas de onboarding) → Workflow nativo; lo que GHL no hace solo (crear Business, Servicio, Proyecto y relaciones) → **n8n `11 Won to Client`** (`n8n/atacama-labs-11-won-to-client.json`, generado por `n8n/build/won-to-client.mjs`; detalle en `n8n/README.md`).
- **Workflow de GHL a crear (interfaz):** «Atacama — Oportunidad ganada», trigger *Opportunity Status Changed* = `Won`, filtro Pipeline = `Atacama Labs — Ventas`. Acciones: (1) *Create Task* ×4: «Enviar bienvenida y confirmar alcance» (1 día), «Agendar kickoff» (3 días), «Pedir accesos y materiales» (3 días), «Completar Servicio contratado y Proyecto (MRR, fee, fechas)» (2 días); (2) *Webhook* `POST https://<n8n>/webhook/atacama-won-to-client`, cabecera `X-Atacama-Key: <ATACAMA_INGEST_KEY>`, *Custom Data* `opportunity_id` = `{{opportunity.id}}` y `dry_run` = `true` (pasar a `false` solo tras revisar el primer plan en dry-run).
- **Lógica de 11:** relee la oportunidad y solo sigue si es `won` en el pipeline de Atacama → localiza Business (relación existente > businessId del contacto > mismo nombre; ignora los 3 ejemplos) o la crea → crea Servicio (`Onboarding`, producto según *Solución de interés*) y Proyecto (`Planificado`, salvo producto «Otro») → crea las relaciones que falten (servicio↔oportunidad, business↔servicio, business↔oportunidad, business↔contacto, business↔proyecto, proyecto↔servicio). No inventa MRR, fee ni fechas. **`dry_run` por defecto** e **idempotente**. Sin nombre de empresa confiable se detiene (`needs_human`). Limitación: si falla a mitad de camino tras crear el Servicio y antes de relacionarlo, un reintento podría duplicar el Servicio (la relación servicio↔oportunidad es la primera que se crea para minimizarlo).
- **Pruebas:** (a) 17 pruebas unitarias de guardas, plan y relaciones, todas OK; (b) con registros TEST (ya borrados) se verificó por API cada operación que usa el flujo: crear Business, Servicio y Proyecto con las propiedades exactas y **las 6 relaciones** (incluida Servicio↔Oportunidad, que en D2 había quedado sin probar), lectura de vuelta y borrado. **El flujo completo no se ejecutó ni se desplegó.**
- **Actualización (6-oct, tarde):** Christian creó a mano la credencial `GHL — Atacama OS` (`4Vc6nfxyKjZ14Bep`). Se verificó contra GHL (solo lectura) que los IDs de pipeline, asociaciones (orden primero/segundo), campos y opciones del workflow coinciden, y se importó en n8n como `jB62BWlu1Eg6BEuD`: **inactivo**, sin schedule, credencial vinculada a los 8 nodos GHL, `dry_run` por defecto, 0 ejecuciones. No se ejecutó con ninguna oportunidad.
- **Ajuste de entrada (6-oct, noche):** `Validate Input` ahora lee `opportunity_id` y `dry_run` de la raíz o de `body.customData` (formato estándar del Webhook de GHL) y acepta booleano o `"true"`/`"false"`. Regla de seguridad: solo es `dry_run=false` si hay al menos un valor y **todos** los presentes son `false`; ausente, inválido, ambiguo o contradictorio ⇒ `true`. Se cambió únicamente ese nodo (el resto del workflow, las credenciales y las guardas siguen idénticos); el workflow sigue **inactivo** con 0 ejecuciones. Pruebas: `n8n/build/won-to-client.test.mjs` (45 casos, todos OK). Respaldo previo: `backups/2026-10-05/n8n/wf11-before-input-fix.json`.
- **Prueba real de punta a punta (6-oct, noche) — PASS:** workflow de GHL «Atacama — Oportunidad ganada» publicado (v4) → contacto `TEST — Atacama Won Flow` + oportunidad `TEST — Won to Client` (Atacama Labs — Ventas, Nuevo, Solución de interés = Agentes) → status cambiado a Won → GHL disparó el webhook solo (ejecución n8n 22305, ~6 s) con `customData = {opportunity_id: <id real>, dry_run: "true"}` (caso A: `{{opportunity.id}}` resuelve bien; en las pruebas manuales anteriores llegaba vacío porque no tenían contexto de oportunidad) → n8n devolvió `action: dry_run`, `wrote_nothing: true` con el plan: Business, Servicio «… — Agente de IA» (Onboarding), Proyecto «… (implementación)» (Planificado, tipo Agente) y 6 relaciones. Cero escrituras: Business 3, Servicios 0, Proyectos 0 durante y después. Datos TEST eliminados; conteos finales = iniciales (43 contactos, 42 oportunidades, 5 tareas). `dry_run` sigue en `true`; pasar a `false` queda para el primer cliente real ganado.
- **Observaciones de la prueba:** (1) el workflow de GHL hoy solo tiene el webhook: **no creó las 4 tareas de onboarding** (las tareas siguen en 5, ninguna del contacto TEST), faltan esas acciones en la interfaz; (2) el nombre publicado termina con un punto («…ganada.»); (3) el filtro de pipeline del trigger no es legible por API (lo cubre la guarda de n8n: una ganada de otro pipeline se omite).

### E6. Motivo de pérdida
- GHL tiene un motivo de pérdida **nativo** (Settings → Opportunities & Pipelines; sin API) y no permite exigirlo por API. Se creó el campo **Motivo de pérdida** (lista cerrada) en la oportunidad: es el oficial para dashboards y n8n.
- **Proceso:** al marcar una oportunidad como `Lost`, completar *Motivo de pérdida* antes de cerrar. Forzarlo es un ajuste de interfaz (no verificado desde aquí).

### E7. Lead Sync y Booking Sync
- **Lead Sync v2.2** (`idniXY0Du2qet57O`): el nodo que crea la oportunidad usa pipeline `trSWhAcNDyUMmPlYIEib` y etapa **Nuevo** (`aad0ad01-…`); no referencia Investigado. Últimas 4 ejecuciones `success`. Regla explícita: **inbound web/Nayra → Nuevo; outbound investigado → Investigado**.
- **Booking Sync** (`VsLCMZ6MeDsNvGzI`): prueba end-to-end el 6-oct con datos TEST temporales (contacto, oportunidad en **Investigado**, fila de `lead_submissions` y cita en el calendario): la oportunidad pasó a **Diagnóstico** (`fec1e794-…`) en ~2 min. Se borró todo (cita, oportunidad, contacto, lead). Conteos finales idénticos a los iniciales (43 contactos, 42 oportunidades; el listado mostró 44/43 unos segundos por retraso de GHL y se reverificó).

### E8. Resultado de pruebas
| Prueba | Resultado |
|---|---|
| Pipeline: etapas e IDs | OK, 7 etapas, IDs sin cambios; 2 oportunidades intactas en Nuevo |
| Lead Sync apunta a Nuevo | OK |
| Booking Sync → Diagnóstico | OK (e2e con datos TEST borrados) |
| Campos sin duplicados | OK (2 creados; el resto reutilizado) |
| Tareas | Especificadas (requiere interfaz) |
| Won → cliente | Preparado, no desplegado, no disparado |
| Lost → motivo | Campo disponible |
| Residuos TEST | 0 |

### E9. Rollback
- Campos nuevos: borrar `tYjEMFrR2LAaWqPSQN0S` y `JzsnIz7M4LPS6yIrQ2mI` (`DELETE /locations/{id}/customFields/{id}`); quitar `fields.motivo_perdida`, `contact_fields` y `entry_policy` de `icp_packs.crm` (copia previa en `backups/2026-10-05/`).
- Workflow 11: no está desplegado; basta no importarlo. Pipeline y workflows en producción: sin cambios.

## CHECKPOINT FINAL — 6-oct-2026 (noche)

**Resumen en una línea:** GHL ya es el centro operativo (modelo Business → Opportunity → Servicio contratado → Proyecto), y el flujo «oportunidad ganada → n8n» está probado de punta a punta en modo seguro (`dry_run = true`). Falta lo que depende de la interfaz de GHL y de cuentas externas (tareas automáticas, dashboard, redes, Gmail, Telegram).

### Qué quedó funcionando
| Área | Estado |
|---|---|
| GHL Core y permisos | Listos. Token `GHL_PRIVATE_INTEGRATION_TOKEN2` («Atacama OS — Claude») con Businesses, Objetos (schema y registros), Asociaciones, Contactos, Oportunidades, Calendarios, campos personalizados |
| Objetos personalizados | **Servicio contratado** (`custom_objects.servicios_contratados`, `6ac440feb01eea82c5076de2`) y **Proyecto** (`custom_objects.proyectos`, `6ac440ff79c86f212d1cac6b`) |
| Asociaciones | Business↔Servicio, Servicio↔Opportunity, Business↔Proyecto, Proyecto↔Servicio, más las nativas Business↔Opportunity y Business↔Contact: las 6 relaciones se crearon, leyeron y borraron con registros TEST |
| Pipeline `Atacama Labs — Ventas` (`trSWhAcNDyUMmPlYIEib`) | Nuevo → Investigado → Contactado → Respondió → Diagnóstico → Propuesta → Seguimiento. **Ganado/Perdido son los estados nativos `won`/`lost`** (no hay etapas con esos nombres). IDs en la sección E1 |
| Campos nuevos | `Motivo de pérdida` (oportunidad) y `Origen detallado` (contacto) |
| Lead Sync v2.2 (`idniXY0Du2qet57O`) | Funcionando; los inbound entran a **Nuevo** |
| Booking Sync (`VsLCMZ6MeDsNvGzI`) | Funcionando; probado e2e: reserva → oportunidad pasa a **Diagnóstico** |
| n8n `Atacama Labs - 11 Won to Client` (`jB62BWlu1Eg6BEuD`) | **Activo**; credencial `GHL — Atacama OS` en los 8 nodos GHL; entrada compatible con el Webhook de GHL (`customData`, booleano o texto); 45 pruebas OK |
| Workflow GHL `Atacama — Oportunidad ganada` | **Publicado** (v4). Hoy solo contiene el webhook |
| Prueba real GHL → n8n | **PASS**. Datos TEST, oportunidad en Won → GHL disparó solo → ejecución n8n 22305 |
| `opportunity_id` | Llegó correcto desde GHL (`{{opportunity.id}}` resuelve bien en un evento real) |
| `dry_run` | `true` validado: ausente, inválido o ambiguo ⇒ siempre `true`. **Sigue en `true` en el webhook de GHL** |
| Escrituras reales en la prueba | **Cero** (Business 3 de ejemplo, Servicios 0, Proyectos 0 antes, durante y después) |
| Datos TEST | Eliminados; conteos iguales a los iniciales (43 contactos, 42 oportunidades, 5 tareas) |

### Git
- Rama: `feat/frontend-v2-2-1`. Commit funcional: `23c2936` — `feat: complete Atacama OS won-to-client flow` (encima de `4a98cfd` — `feat: establish Atacama OS CRM operations`).
- **Push hecho** (`c28f001..23c2936`, fast-forward): `origin/feat/frontend-v2-2-1` = `23c2936`. Sin merge a `main`, sin PR. `main` remoto sigue en `2ccbf2a` (esos 2 commits solo agregan docs, n8n, ops y migraciones; no tocan `src/`).
- Este checkpoint y `docs/ATACAMA-OS-NEXT.md` se guardaron **después** de ese commit: quedan sin commit hasta que se pida.
- `.claude/` sigue fuera del repo.

### Pendiente que depende de interfaz o de terceros
- Tareas automáticas de etapa en GHL (3 workflows, especificados en E4) y las 4 tareas de onboarding dentro de `Atacama — Oportunidad ganada` (especificadas en E5). La prueba mostró que hoy ese workflow **no crea tareas**.
- Nombre publicado del workflow GHL termina con un punto («…ganada.»): cosmético.
- Dashboard `Atacama OS — Hoy` (clientes, servicios, proyectos, tareas, social).
- Instagram y LinkedIn en Social Planner (0 cuentas conectadas), Gmail/dominio de envío, bot de Telegram para el Atacama Daily.
- Vía 60–79 con gates en 03/09: decidida **no habilitar** hasta que el flujo de revisión sea visible.
- Ocultar los campos legacy de EnBandeja, forzar el motivo al marcar Lost, rellenar `Origen detallado` desde Lead Sync (mejoras menores).
- Sin resolver de bloques anteriores: `complete_territory_scan` ejecutable por anon, persistir el override de OpenClaw (requiere root), datos legales (razón social/RUT).

## BLOQUE F — Automatizaciones operativas de GHL (6-oct-2026, por interfaz con Claude in Chrome) · ✅ CERRADO

**Estado previo (auditado antes de tocar):** pipeline de 7 etapas intacto; Lead Sync v2.2 y Booking Sync con ejecuciones `success`; workflow GHL `Atacama — Oportunidad ganada` publicado con trigger *Opportunity Status Changed → Won* en el pipeline `Atacama Labs — Ventas` (verificado en la interfaz) y solo el webhook; n8n `11 Won to Client` activo; `dry_run=true`. El webhook no se tocó.

### Workflows nativos creados (todos Published, responsable Christian Wevar, *Allow re-entry = OFF*, *Allow multiple opportunities = ON*)
| Workflow | Trigger | Acción | Vencimiento |
|---|---|---|---|
| `Atacama — Tarea al investigar` (id `25f50c8c-1d17-4e98-810e-227e924d869e`) | *Opportunity Created* **y** *Pipeline Stage Changed*, ambos pipeline Atacama + etapa Investigado | Tarea `Revisar prospecto: {{contact.company_name}}` | 1 día, 9:00, **saltando fines de semana** |
| `Atacama — Tarea al responder` (`fe26f533-eca5-47ae-b7ac-a04ac3ca765b`) | *Pipeline Stage Changed* → Respondió | Tarea `Revisar respuesta y definir próximo paso` | 1 día, 9:00, saltando fines de semana |
| `Atacama — Seguimiento de propuesta` (`120d5496-0544-4aa1-bb51-0bb07fe30a84`) | *Pipeline Stage Changed* → Propuesta | If/else «Tiene próxima acción?»: si el contacto tiene la etiqueta `proxima-accion` → no hace nada; rama *None* → tarea `Seguimiento de propuesta` | 3 días corridos, 9:00 |
| `Atacama — Oportunidad ganada` (`83ae56d7-da8b-4c1c-bf3a-e8a94cf17664`) | *Opportunity Status Changed* → Won (pipeline Atacama) | Webhook a n8n 11 (sin cambios) **+ 4 tareas de onboarding** | `Enviar bienvenida y confirmar alcance` 1 día · `Agendar kickoff` 3 días · `Pedir accesos y materiales` 3 días · `Completar Servicio contratado y Proyecto (MRR, fee, fechas)` 2 días (9:00, días corridos) |

- **Mejora sobre lo documentado en E4:** GHL sí ofrece *Skip weekends* en la acción *Add task*; se activó en las dos tareas de «1 día» (equivale a «1 día hábil»). Las de 3 y 2 días quedan corridas, como decía la especificación.
- **Antiduplicados:** *Allow re-entry = OFF* hace que la misma oportunidad no vuelva a entrar al workflow (es lo que evita que *Opportunity Created* + *Stage Changed* generen dos tareas); *Allow multiple opportunities = ON* permite que otra oportunidad del mismo contacto sí genere su tarea.
- **Etiqueta nueva:** `proxima-accion` (id `BBjibpCkZaVCbIIZqdOz`). Se aplica al contacto cuando ya hay próxima acción definida y no se quiere la tarea de seguimiento.
- **Observación del entorno:** hay dos usuarios llamados «Christian Wevar» en GHL; las tareas quedaron asignadas al primero de la lista (`OjkAjHMdUjnblO7W1kBZ`). Si es el usuario equivocado, se cambia en cada acción *Add task*.

### Pruebas (solo datos TEST, borrados)
| Prueba | Resultado |
|---|---|
| Crear oportunidad en *Nuevo* | 0 tareas (correcto) |
| → Investigado | 1 tarea «Revisar prospecto: TEST Empresa Tareas», vence 7-oct 9:00 Chile; repetir la etapa no duplica |
| → Respondió | +1 tarea «Revisar respuesta y definir próximo paso», 7-oct |
| → Propuesta | +1 tarea «Seguimiento de propuesta», vence 9-oct (3 días); repetir no duplica |
| → Propuesta con etiqueta `proxima-accion` | 0 tareas (la guarda funciona) |
| → Won | webhook disparado solo (ejecución n8n 22893, `dry_run`, `wrote_nothing=true`) + **4 tareas de onboarding** con los vencimientos de la tabla; Business 3, Servicios 0, Proyectos 0 |
| Limpieza | Oportunidades y contactos TEST borrados; conteos 43 contactos / 42 oportunidades / 5 tareas (solo las de ejemplo) |

- **Lección:** al borrar un contacto, **sus tareas quedan huérfanas** y siguen listadas (sin contacto). Se borran con `DELETE /locations/{locationId}/tasks/{taskId}`; el `DELETE /contacts/{id}/tasks/{id}` de mis scripts devolvía 200 sin borrar. Se limpiaron las 8 tareas de prueba huérfanas.
- **Lección de interfaz:** el editor de workflows de GHL se congela si se navega fuera con cambios recientes (diálogo `beforeunload`); se evita neutralizando `onbeforeunload` antes de navegar.
- **Rollback:** poner cada workflow en *Draft* o eliminarlo (Automation → Workflows → ⋮); la etiqueta `proxima-accion` puede quedarse. El workflow Won vuelve a su estado anterior borrando las 4 acciones *Add task* tras el Webhook.

**BLOQUE AUTOMATIZACIONES GHL CERRADO**

## BLOQUE G — Dashboard `Atacama OS — Hoy` (6-oct-2026, por interfaz) · ✅ CREADO (con pulido de layout pendiente)

**Capacidades reales de GHL en esta cuenta (auditadas en el editor de widgets, no supuestas):** categorías de widgets: Contacts (17), Appointments (25), Opportunities (17), Conversations (16), General (15, incluye **Tasks**), Servicios contratados (11), Proyectos (9), más Payments, Emails, SMS, Calls, Social Planner, Reputation, Ads y Analytics. Los objetos personalizados `Servicio contratado` y `Proyecto` **ya exponen widgets propios** (no hizo falta construir nada externo). Límites: no hay widget de «oportunidades estancadas / sin movimiento» ni de «conversaciones sin atender» más allá de *unread*; el rango de fechas del dashboard es global (cada widget puede sobrescribirlo).

**Dashboard existente** (id `6ac3fc3626ac4365db388126`, ya creado en el Bloque C) — estado final:

| Widget | Qué responde | Notas |
|---|---|---|
| **Tareas pendientes (vencidas primero)** — widget *Tasks* nativo, filtros Pendientes · Fecha ASC · Todos los usuarios | «¿Qué tengo que hacer hoy?» (aquí caen las tareas de las 4 automatizaciones) | Arriba a la izquierda |
| **Oportunidades por etapa** (dona) | Dónde está cada prospecto | Arriba a la derecha |
| **Oportunidades abiertas** (dona) | Cuántas hay en juego | Segunda fila |
| **Reuniones próxima semana** (número; *Booked for*, rango «Next week», estados New/Confirmed) | Diagnósticos que vienen | Calendario semanal de GHL (lunes–domingo) |
| **Respuestas por atender (sin leer)** (número, *Total unread conversations*) | Respuestas nuevas | Hoy 0 |

- **Quitados por ser ruido:** *Valor del pipeline (abiertas)* — hoy siempre $0 porque las oportunidades no llevan monto (no es fiable); *Reuniones agendadas (30 días)* — duplicaba la de la próxima semana y mide el pasado.
- **Lo que no cubre (y por qué):** *propuestas que requieren seguimiento* y *prospectos en Respondió* se ven con la **tarea** que crean los workflows (ver Tareas) y en **Opportunities → pipeline Atacama Labs — Ventas** (vista Kanban por etapa); GHL no tiene un widget de «estancadas». *Won/Lost recientes* y *Motivo de pérdida* están disponibles como widgets (*Won/Lost Opportunities*, *Lost by reason*) y se agregan cuando haya datos. *Onboarding pendiente* = las 4 tareas «Enviar bienvenida…», etc. en el widget de tareas.
- **Datos que ensucian hoy:** las **5 tareas de ejemplo de GHL** (`(Example) …`, vencidas desde julio) aparecen primero en el widget de tareas. No se borraron (no son mías); conviene borrarlas desde Contactos → Tasks.
- **Pulido pendiente (cosmético, por interfaz):** el widget *Respuestas por atender* quedó al final y grande; en modo edición se puede achicar (esquina inferior derecha) y moverlo junto a Tareas arrastrándolo por el icono ⋮⋮ del título. Se probó que el arrastre y el redimensionado funcionan.
- **Smart Lists / vistas:** no se crearon; la navegación diaria recomendada es Dashboard → Opportunities (Kanban del pipeline Atacama) → Tasks → Conversations → Calendars. Pendiente opcional: una Smart List de contactos con la etiqueta `proxima-accion`.
- **Rollback:** Dashboard → Edit dashboard → borrar/añadir widgets; los dos widgets quitados se pueden recrear (*Opportunity value*, *Appointments*).

## BLOQUE H — Social Planner + Content Engine MVP (6-oct-2026) · ✅ CIRCUITO FUNCIONANDO

**Regla de oro:** nada se publica ni se programa solo. El circuito termina en GHL Social Planner con estado **`in_review`** y aprobador pendiente (Christian). Aprobar/editar/descartar se hace dentro de GHL.

### H0. Fuentes de verdad y un faltante importante
- Leídos: `ATACAMA-OS-NEXT.md`, `ATACAMA-OS-IMPLEMENTATION.md`, `brand/content/README.md`, `public/brand/README.md`.
- **`ATACAMA-LABS-GUIA-PUBLICACIONES.md` NO existe en el repo ni en el disco** (se buscó en todo el directorio del usuario). Se aplicaron las reglas editoriales del encargo y de `brand/content/README.md` (sobrio, claro, tecnológico, humano, #0F5CED / #041228, fondos limpios, aire, tipografía fina, una idea por slide, sin neón/crypto/robots, mascota solo si aporta). **Pendiente de Christian:** copiar la guía a `brand/content/guia-de-publicaciones.md` y las hojas de la llamita a `brand/content/mascota/`; hasta entonces **no se usa mascota** y el renderer no la incluye. Cuando la guía llegue, hay que contrastar `BANNED` (lista de frases de relleno) y los layouts contra ella.
- Voz de referencia ya publicada en Instagram (4 posts nativos del 30-sep: «Tus clientes no siempre escriben en horario de oficina…», «Conecta WhatsApp, CRM, correo…», «Hay señales de que tu equipo…», «La IA está pasando de responder a ejecutar…»). Las piezas nuevas no deben repetirlos.

### H1. Auditoría de Social Planner (token `Atacama OS — Claude`)
| Cuenta | Plataforma / tipo | ID de cuenta GHL | Rol |
|---|---|---|---|
| `atacama.labs` | Instagram · profile | `6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090` | Visual de marca: educativo, producto, integraciones, casos, demos, carruseles, recursos |
| Atacama Labs | LinkedIn · page (`urn:li:organization:145278681`) | `6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_145278681_page` | Corporativo: producto, casos, integraciones, novedades, demos, aprendizajes |
| Christian Wevar | LinkedIn · profile (`urn:li:person:D9Z-EPMxLu`) | `6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_D9Z-EPMxLu_profile` | Founder-led: aprendizajes, opinión con fundamento, decisiones, experimentos, visión |

Las 3 están `active`, sin expirar (tokens de red hasta dic-2026), `hasStatisticsPermissions: true`; Instagram sin scopes faltantes. **No se publica el mismo texto en las 3**: una idea se adapta por canal (el `idea_key` incluye el canal).

| Capacidad (token de integración) | Resultado |
|---|---|
| Listar cuentas / categorías / etiquetas / posts | ✅ |
| Crear post `draft` | ✅ (probado y borrado) |
| Crear post `in_review` | ✅ — exige `media` (array, puede ir vacío), `scheduleDate` futuro y `postApprovalDetails: { approver: "<userId GHL>" }`; queda `approvalStatus: pending` |
| Subir medios a la biblioteca (`POST /medias/upload-file`) | ✅ (y borrarlos) |
| Estadísticas (`POST /social-media-posting/statistics?locationId=`) | ✅ (agregadas) |
| Borrar post | ✅ |
| **Crear categorías** (`POST …/categories`) | ❌ exige `createdBy` de un usuario de interfaz y rechaza ese campo: **crearlas desde la UI** |
| **Crear etiquetas** (`POST …/tags`) | ❌ responde «Created» pero no crea; los posts exigen `ObjectId` de etiquetas existentes |
| `…/csv` | ❌ 401 (sin scope) |
- **Categorías y etiquetas:** no se crearon (límite de la API, no decisión). Plan mínimo si se quieren: categorías Educativo, Caso, Demo, Noticia, Evergreen, Founder y etiquetas texto, imagen, carrusel, demo, reel, creadas una vez en Social Planner → Settings. Mientras tanto la categoría y el formato viven en Supabase (`content_pieces`) y el workflow no manda etiquetas a GHL.
- **Aprobador:** hay dos usuarios «Christian Wevar» en GHL: `OjkAjHMdUjnblO7W1kBZ` (`c.wevarh@gmail.com`, **el usado**) y `wTEyOmg7jpn018RPjzxX` (`christian.wevar@atacamalabs.cl`). Si el que aprueba es el otro, hay que cambiar `APPROVER_USER_ID` en `n8n/build/content-engine.mjs` y reimportar.
- **No verificado desde aquí:** el botón exacto de «Approve» en la interfaz (abrir el editor de un post congela la pestaña del navegador automatizado). Los posts aparecen con estado «In Review» en Social Planner → Planner.

### H2. Arquitectura final
```
Hermes (investiga) ─┐
Trabajo real ───────┼─► pieza canónica JSON ─► n8n «12 Content Intake» ─► Supabase (content_sources / content_pieces)
Evergreen ──────────┘      (scripts/content/submit.mjs)            │
                                                                    └─► GHL Social Planner  status=in_review ─► Christian aprueba/edita/descarta
render PNG (scripts/content/render.mjs) ─► biblioteca de medios GHL ─► URLs en `media` de la pieza
```
Hermes investiga · Supabase guarda · n8n orquesta · GHL aprueba/publica · OpenClaw fuera de la ruta crítica.

### H3. Supabase (migración `20261006_content_engine.sql`, aplicada)
Auditado antes: no había estructura de contenido (solo `signals`, de cuentas comerciales). Se crearon **dos tablas mínimas**, RLS activado sin políticas (solo service_role):
- `content_sources`: `icp_pack_id`, `source_key` (único por pack), `kind` (`hermes_research | real_work | evergreen | manual`), `title`, `url`, `summary`, `evidence` (jsonb), `verified`.
- `content_pieces`: `idea_key` (único por pack = anti-repetición), `source_ids`, `topic`, `angle`, `audience`, `channel`, `format`, `category`, `score`, `score_breakdown`, `rationale`, `evidence_urls`, `piece` (JSON canónico), `status` (`idea → scored → drafted → rendered → in_review → approved → scheduled → published`, más `rejected/discarded`), `ghl_account_id`, `ghl_post_id`, `is_test`, timestamps.

### H4. JSON canónico de pieza (versión 1)
`version, channel (instagram|linkedin_page|linkedin_profile), format (texto|imagen|carrusel|demo|reel), category (Educativo|Caso|Demo|Noticia|Evergreen|Founder), topic, angle, audience, sources[{kind,title,url,verified,evidence[{url,quote}]}], claims[{text,external,source_url?}], factors{relevance,audience_fit,novelty,evidence,utility,clarity,conversation,differentiation,non_repetition → {value 0–10, note}}, rationale, hook, body, slides[{layout cover|content|cta, kicker, title, body, items[{title,text}], cta_label}], cta{type none|comment_keyword|resource|dm|link, text, keyword?, resource?}, hashtags[], evidence_urls[], visual_direction, schedule_suggestion, media[{url,type}]`. Ejemplos reales en `scripts/content/examples/`.

### H5. Gate (scripts/content/engine-core.mjs, 27 pruebas)
- Score 0–100 = Σ peso·valor/10 con pesos: relevancia 15, encaje 12, novedad 8, evidencia 15, utilidad 12, claridad 10, conversación 8, diferenciación 10, no repetición 10; menos penalizaciones de marca (hasta −20: frases de relleno de IA, CTA genérico «agenda una llamada», exceso de emojis).
- **Rechazo duro:** claim externo sin URL o con fuente no verificada; cifra/porcentaje en el texto sin claim que lo respalde; categoría Noticia sin claim externo; sin fuentes; idea repetida; límites de largo, #slides, ideas por slide, hashtags; Instagram sin medio. Sin fuente verificada el factor evidencia se topa en 2.
- **Umbral 70:** ≥70 candidata; <70 queda `scored` y no se fuerza. Los factores 0–10 los asigna quien genera la pieza (Hermes/yo) con nota obligatoria; el motor los valida y acota.
- CTA: modelo listo (`type`, `keyword`, `resource`) sin construir aún las automatizaciones de comentario → recurso.

### H6. Workflow n8n `Atacama Labs - 12 Content Intake` (id `wKrn00R0x4XXcfvR`, **activo**, etiqueta PRODUCCIÓN)
Webhook `POST /webhook/atacama-content-intake` (`X-Atacama-Key`, misma credencial que 08/09) → consulta `idea_key` existentes → **Evaluate** (validación + scoring, el mismo código de `engine-core.mjs`) → `Rejected?` → upsert de fuentes → upsert de pieza → `Submit?` → **Create GHL Post** → **Check GHL** → `Mark In Review` → respuesta. Credenciales: `GHL — Atacama OS`, `Atacama Labs - Supabase`, `Atacama Labs - Ingest Key`. Cuerpo: `{ piece, test?: true, submit_to_review?: false }`.
- **Seguridad:** el post se arma con `status: 'in_review'` fijo; `Check GHL` aborta si GHL devolviera otro estado; ningún nodo puede crear `scheduled`/`published`. Una pieza `test:true` lleva el prefijo `[PRUEBA ATACAMA OS — NO PUBLICAR]` y `is_test=true`. La fecha de GHL (`scheduleDate`) es solo una **propuesta**: la sugerida si es ≥2 días futura, si no +7 días 10:00 Chile; al aprobar, GHL la programa para esa fecha (editable).
- Sin `media` (Instagram o formatos visuales) la pieza queda `scored` y respondida como `held / falta_render_o_medio`.
- 20 pruebas de los nodos Code con stubs (`n8n/build/content-engine.test.mjs`). JSON versionado: `n8n/atacama-labs-12-content-intake.json` (generado por `n8n/build/content-engine.mjs`).
- **Render:** hoy es un paso previo (`scripts/content/submit.mjs` renderiza, sube a la biblioteca de medios de GHL y llama al webhook). Moverlo dentro de n8n requiere un servicio con Chromium; queda como mejora.

### H7. Renderer (scripts/content/render.mjs)
Auditoría: `src/components/studio/SocialCard.tsx` y los exportables `social/exports/C01–C06` usaban la **paleta anterior (marrón #4E2E1E / crema) e isotipo antiguo** → **actualizado** `SocialCard.tsx` a la identidad vigente (azul #0F5CED, #041228, Newsreader fina + DM Sans, logo oficial vía `/brand/*.svg`); los exportables antiguos siguen marcados como no publicables. Nuevo renderer con Playwright/Chromium: 1080×1350, **3 layouts** (portada · contenido con tarjetas opcionales · cierre/CTA) con variantes de fondo (claro, gris, azul, oscuro) elegidas por hash de la idea, logos SVG **oficiales** incrustados tal cual, sin mascota. Revisado visualmente (portada azul, tarjetas sobre gris, cierre oscuro).

### H8. Pruebas controladas (todo borrado después)
| Prueba | Resultado |
|---|---|
| Seguridad del webhook | sin clave / clave mala → 403 |
| LinkedIn Christian, texto TEST → n8n → GHL | **PASS** `in_review`, `approvalStatus: pending`, fecha propuesta 13-oct, fila en Supabase (`is_test`) |
| Reenvío de la misma idea | rechazada `idea_repetida` |
| Instagram carrusel TEST (5 slides renderizados + subidos) → `in_review` | **PASS** (5 medios en el post) |
| Verificación visual en GHL | **PASS**: ambos aparecen «In Review» en Social Planner → Planner (cuentas y fecha correctas) |
| Limpieza | 2 posts TEST, 6 medios TEST, 2 piezas y 2 fuentes TEST borrados; 0 posts residuales |
- Hallazgos: el primer intento falló por `tags` (GHL exige ObjectId) → se quitaron; el nodo leía el cuerpo del nodo equivocado → corregido (los tests no lo habían detectado porque simulaban la entrada directa; ahora simulan el flujo real).

### H9. Candidato REAL dejado en revisión (no programado ni publicado)
- **Cuenta:** LinkedIn — Christian Wevar · **Categoría:** Founder · **Score 80/100** · fuente: trabajo real verificable (commit `23c2936`).
- **Idea:** «Automatizamos el alta de clientes. Y lo primero que hicimos fue impedir que escribiera algo» — por qué el flujo «oportunidad ganada → cliente» parte en modo ensayo; aprendizaje: automatizar es decidir dónde va el freno; cierra con una pregunta (conversación).
- **Dónde verlo:** GHL → **Marketing → Social Planner → Planner** (lista): fila con estado **In Review**, cuenta Christian Wevar, fecha propuesta **13-oct-2026 10:00**. Ahí puedes abrirla y aprobar, editar el texto o descartarla (borrarla). Es texto en primera persona: **léelo como tuyo antes de aprobar**. IDs: post GHL `6ac51f2bd3e22f4c60c0c08c`, pieza Supabase `5cb8e163-eaf0-436b-ab6d-f1be1919e6c2`.

### H10. Métricas disponibles (no se construyó analytics)
- **Agregadas** (`POST /social-media-posting/statistics?locationId=` con `profileIds`): por día y plataforma — publicaciones, impresiones, alcance (reach), likes, comentarios, compartidos, seguidores, y demografía (género/edad). Hoy: Instagram 4 posts y ~92.000 impresiones en 7 días (posts nativos del 30-sep), LinkedIn 0.
- **Por post:** el objeto del post trae `insights {like, share, comment}`; los **posts nativos** (publicados fuera de GHL) no se devuelven por la API de posts. **Clics: no expuestos.** Las ventanas 24 h / 72 h / 7 d quedan para una fase posterior (habría que guardar snapshots en Supabase).

### H11. Pendientes y limitaciones
1. Copiar la **guía de publicaciones** y las hojas de la **llamita** al repo (ver H0).
2. Crear categorías y etiquetas en la UI de Social Planner (la API no puede) y luego mapear sus IDs.
3. Confirmar que el aprobador correcto es `OjkAjHMdUjnblO7W1kBZ`.
4. Verificar en la UI el botón de aprobación (la pestaña se congela al abrir el editor).
5. Render dentro de n8n (servicio con Chromium) y automatización comentario → recurso (CTA con keyword): modelo listo, flujo no construido.
6. Hermes: aún no alimenta el Content Engine; falta su prompt de «señales de contenido» (entrada `hermes_research` con fuentes verificadas).
7. Estado `approved/scheduled/published` en Supabase: hoy no se sincroniza desde GHL (el post es la fuente de verdad); sincronización y métricas a 24 h/72 h/7 d quedan para la fase siguiente.
- **Rollback:** desactivar/archivar el workflow 12; las tablas `content_*` se pueden borrar sin afectar nada más; borrar el post `in_review` desde Social Planner.

## BLOQUE I — Cierre del Content Engine + Hermes como fuente real (6-oct-2026) · ✅ FUNCIONANDO DE PUNTA A PUNTA

### I1. Sistema de marca y guía editorial
- Del ZIP `Atacama-brand-content-references.zip` se copiaron **sin alterar** `brand/content/ATACAMA-LABS-GUIA-PUBLICACIONES.md` (fuente editorial oficial), `brand/content/mascot/poses.png` y `brand/content/mascot/emociones.png` (hojas 3×3 de la llamita).
- Auditoría de assets: `public/brand/` = logos/isotipos oficiales (para código y renderer); `brand/content/` = guía + referencias de la mascota. Nada duplicado, ningún logo rehecho ni recoloreado. `brand/content/README.md` reescrito: qué logo va sobre fondo claro/oscuro, reglas de la llamita, flujo y aviso sobre los exportables antiguos `social/exports/` (paleta marrón, no usar).
- Línea editorial aplicada: tipografía sans (DM Sans 300/400), azul `#0F5CED` / tinta `#041228`, la llamita **solo en portada/cierre y solo cuando suma**, tomada de las hojas de referencia (recortes en `MASCOT_CROPS`). `SocialCard.tsx` (Studio) alineado a la identidad vigente.

### I2. Renderer y motor de piezas
- `scripts/content/render.mjs` (Playwright → PNG 1080×1350): 3 familias de layout (portada/idea, contenido·comparación·tarjetas, cierre/CTA) con variación determinista por hash de la idea; logos SVG oficiales incrustados; mascota opcional. Comprobado visualmente con una pieza de 5 láminas.
- `engine-core.mjs` (37 pruebas): valida pose/emoción de la mascota, que solo aparezca en portada/cierre, `figure`, `compare`, mezcla de estructuras y lint de ataques/promesas exageradas.

### I3. Pieza Founder revisada
LinkedIn · Christian Wevar · categoría Founder · `in_review` (post `6ac51f2bd3e22f4c60c0c08c`, propuesta 13-oct 10:00 Chile, score 81). Se reescribió desde la experiencia real de construir el alta de clientes: «Automatizamos el alta de clientes y lo primero que hicimos fue impedir que escribiera algo.» Sin publicar.

### I4. Aprobador (resuelto con evidencia, no por suposición)
Hay dos «Christian Wevar» en GHL. La evidencia indica que el **usuario operativo es `OjkAjHMdUjnblO7W1kBZ` (`c.wevarh@gmail.com`)**: es el usuario de la sesión de interfaz con la que se operó GHL y el dueño del proyecto n8n; `wTEyOmg7jpn018RPjzxX` no mostró actividad. Queda como `APPROVER_USER_ID` en `n8n/build/content-engine.mjs`. Si en la práctica aprueba el otro, cambiar esa constante y reimportar el workflow 12 (decisión humana: no es demostrable desde la API).

### I5. Social Planner: categorías y etiquetas
- **Categorías creadas por UI** (la API no puede) y verificadas por API: Educativo `6ac5265a…`, Caso `6ac52690…`, Demo `6ac52699…`, Noticia `6ac527bf…`, Evergreen `6ac527cc…`, Founder `6ac527f0…`. El workflow 12 ahora manda `categoryId` según `piece.category`; las dos piezas reales ya lo llevan (Founder, Noticia).
- **Etiquetas (texto, imagen, carrusel, demo, reel): NO creadas.** La API responde «Created» sin crear y en la interfaz se crean desde el compositor de un post. El formato queda en Supabase (`content_pieces.format`) y no bloquea nada. Pasos manuales en I10.

### I6. Hermes `content-radar` (señales verificadas)
- Prompt versionado: `ops/hermes/content-radar.prompt.txt` — radar de cambios de plataformas que Atacama integra, preguntas repetidas de clientes, casos reales, competidores/founders y rubros; **no** es un agregador de noticias de IA. Máx. 5 señales, 40 llamadas a herramientas, 12 min. Por señal: título, resumen, URL, fuente, fecha, cita literal, por qué importa, ángulo, audiencia, canal sugerido, tipo, confianza y factores.
- Job Hermes `a46bd3138a0b` (modelo barato `google/gemini-3.7-flash`), **pausado** tras la corrida controlada: la cadencia es decisión de Christian.
- Workflow n8n `13 Content Signal Intake` (`8EI8YcBJ5lQaPK0L`, activo): webhook `POST /webhook/atacama-content-signals` (`X-Atacama-Key`) → abre cada URL → `evaluateSignal` (`scripts/content/signal-core.mjs`, 20 pruebas) → `content_sources`. **Gate de señales:** HTTP 2xx, cita literal presente en el texto visible, fecha/frescura (>90 días se rechaza; >30 pierde novedad), duplicado por `URL#hash(cita)`, esquema completo; score 0–100 con los 9 factores (la evidencia la calcula el sistema), umbral 70; `<70` queda `held`. No se rellena cuota: 0 piezas es válido.
- Migración `20261006_content_signals_and_sync.sql` (aplicada): columnas de señal en `content_sources` y de sincronización en `content_pieces`; estado `failed`.

### I7. Corrida real controlada (una sola)
Hermes entregó **5 señales**: **3 candidatas** (90 Claude Managed Agents · permisos `auto`; 88 compactación bajo demanda en la API de Claude; 84 Account Usage API de Resend) y **2 rechazadas** (77 y 76, changelog de GoHighLevel: la cita no aparece en el HTML porque la página se renderiza con JavaScript; no se verificó, no se forzó). 0 duplicadas. Se eligió la mejor (90) y se generó **una sola pieza**: LinkedIn · página Atacama Labs · Noticia · score **82**, con dos fuentes (la nota de lanzamiento de Anthropic verificada + el commit propio 3d5f85d). Post `6ac527672249615b17fbd838`, `in_review`, propuesta 15-oct 10:00 Chile. Las otras dos candidatas siguen disponibles (`candidate`). Costo de tokens de Hermes: **no medido**.

### I8. Sincronización GHL → Supabase
Workflow `14 Content Sync` (`E9KMwNH7QmWbuy8Q`, activo, cada 30 min, **solo lectura en GHL**): si no hay piezas abiertas (drafted/in_review/approved/scheduled con `ghl_post_id`) termina sin llamar a GHL; si las hay, hace **una** consulta `posts/list` y mapea draft→drafted, in_review→in_review/approved, scheduled→scheduled, published→published (+`published_at`), failed→failed, borrado→discarded, guardando `ghl_post_id`, `ghl_status`, `ghl_approval_status`, `scheduled_at`, `synced_at`. Probado con una copia desechable por webhook y una pieza TEST (sin cambios → no-op; post a draft → `drafted`; post borrado → `discarded`; nada pendiente → no-op). El disparo programado todavía no había corrido al cierre (recién activado): la pieza de la página se sincroniza en la primera ejecución. **No** hay métricas a 24 h/72 h/7 d (siguiente bloque).

### I9. Seguridad y estado final
Cero publicaciones, cero aprobaciones, cero programaciones automáticas; los cuerpos a GHL llevan `status: 'in_review'` fijo (hay prueba que lo verifica). No se tocó Gmail, prospección, leads 60–79, `dry_run` de Won, EnBandeja ni la web de producción. Los datos TEST de las pruebas (posts, medios, filas) se borraron. Pruebas: engine-core 37, signal-core 20, content-engine 25, content-signals 9, content-sync 15, won-to-client 45; todas OK. Escaneo de secretos sin hallazgos.

### I10. Pasos manuales pendientes (solo Christian)
1. **Decidir las 2 piezas** en Marketing → Social Planner → Planner (estado *In Review*): Founder (LinkedIn Christian, 13-oct) y Noticia (LinkedIn Atacama Labs, 15-oct). El botón «Approve» no se pudo verificar por UI automatizada.
2. **Etiquetas:** Social Planner → Planner → Create post; en el campo *Tags* escribir `texto` y confirmar con Enter para crearla; repetir con `imagen`, `carrusel`, `demo`, `reel`; cerrar sin publicar.
3. Decidir la cadencia del radar (reanudar el job `a46bd3138a0b` o mantenerlo manual).
4. Confirmar que `c.wevarh@gmail.com` es quien aprueba (ver I4).

## BLOQUE J — Aprobación + publicación + métricas + aprendizaje (6-oct-2026) · ✅ CICLO PREPARADO DE PUNTA A PUNTA

Objetivo: Hermes / trabajo real → fuente → scoring → pieza → GHL `in_review` → **Christian aprueba** → `scheduled`/`published` → métricas 24 h / 72 h / 7 d → aprendizaje → mejor contenido siguiente. GHL sigue siendo la interfaz de aprobación; la aprobación **no** se automatiza.

### J1. Piezas reales revisadas (antes de pedir aprobación)
- **Noticia · LinkedIn Atacama Labs:** sin cambios (fuente de Anthropic verificada, tono y claim correctos, cierre con pregunta).
- **Founder · LinkedIn Christian Wevar:** una corrección objetiva: decía «las dos primeras pruebas… la siguiente salió completa», pero las ejecuciones de n8n (workflow 11) muestran más pruebas entre medio. Ahora: «Las primeras pruebas desde GHL llegaron con el ID vacío… Cuando probamos con una oportunidad ganada de verdad, salió completa». Texto, claims, repo (`scripts/content/examples/`), GHL y Supabase quedaron iguales.

### J2. Ciclo de aprobación observado en GHL (hechos verificados por API y en pantalla)
| Paso | Qué pasa |
|---|---|
| Creación (workflow 12) | `status: in_review`, `postApprovalDetails: { approver, approvalStatus: "pending" }`, `scheduleDate` propuesta, `categoryId`, `tags` |
| Quién aprueba | El usuario `approver` (`OjkAjHMdUjnblO7W1kBZ`); en la interfaz: Planner → lista → **⋮ de la fila → View / Edit / Approve / Reject / Delete** |
| **Edit** (cambiar fecha/texto) | Guarda y **mantiene `in_review` + `pending`**: editar NO aprueba. Cambia `scheduleDate`/`displayDate` y `updatedAt` |
| **Approve** | `status: in_review → scheduled`, `postApprovalDetails.approvalStatus: pending → approved`, y aparece **`approvalActionAt`** (timestamp exacto de la acción; está en la raíz del post, no dentro de `postApprovalDetails`). Respeta el `scheduleDate` vigente: no hace falta programar aparte |
| Reject | `approvalStatus: rejected` (el mismo `approvalActionAt` se llena) → el sync lo marca `discarded` |
| Publicación | `status: scheduled → published` y `publishedAt` se rellena (aún no observado: ninguna fecha ha llegado) |
| Fallo | `status: failed` |
| Borrado | el post desaparece de `posts/list` → `discarded` |
| Edición humana del texto | `summary` cambia; el sync lo detecta por hash (`ghl_edited`) |

Resultado real (6-oct, 18:51 UTC): ambos posts `scheduled` + `approved`. Founder → 7-oct 16:00 (Chile) = `2026-10-07T19:00Z`, `approvalActionAt 18:51:08Z`; Atacama Labs → 8-oct 10:00 (Chile) = `2026-10-08T13:00Z`, `approvalActionAt 18:51:04Z`. Cuando Christian dijo «aprobé» la primera vez, solo había editado fechas (seguían `in_review`/`pending`); la API y la pantalla lo mostraron y se pidió el clic en **Approve**. Lección: **la interfaz de GHL tiene dos acciones distintas (Edit y Approve); el estado manda, no el aviso.**

### J3. Sincronización GHL → Supabase (workflow 14, cada 30 min, solo lectura en GHL)
- Mapea: `draft→drafted`, `in_review→in_review | approved`, `scheduled/in_progress/publishing→scheduled`, `published→published (+published_at)`, `failed→failed`, rechazado o borrado→`discarded`.
- Campos nuevos en `content_pieces`: `approved_at` (= `approvalActionAt`, solo si la aprobación figura `approved`), `approved_seen_at` (respaldo aproximado si GHL no diera la hora), `scheduled_at`, `published_at`, `ghl_status`, `ghl_approval_status`, `ghl_summary_hash` + `ghl_edited`/`ghl_edited_seen_at` (el texto fue editado en GHL), `synced_at`.
- Solo escribe cuando algo cambió (estado, aprobación, fecha reprogramada, edición, aprobación vista); sin piezas abiertas no llama a GHL. Las piezas `published` dejan de consultarse.

### J4. Métricas reales que entrega GHL (verificado el 6-oct-2026)
| Dato | Instagram | LinkedIn página | LinkedIn personal | Notas |
|---|---|---|---|---|
| Por publicación (`post.insights`): me gusta, comentarios, compartidos | campo presente (sin verificar con una publicación real) | campo presente (sin verificar) | campo presente (sin verificar) | `{like, comment, share}`; hoy llega en 0 en los posts programados; los valores reales se confirmarán con la primera publicación |
| Clics | **no** | **no** | **no** | no se inventan |
| Por **cuenta** (`POST /social-media-posting/statistics?locationId=`, `profileIds`=`profileId` de la cuenta, **no** `id`): impresiones, alcance, seguidores, publicaciones, me gusta, comentarios | sí | sí | sí (ceros hasta tener publicaciones) | siempre **últimos 7 días, por día**; sin rango de fechas; compartidos solo dentro de `breakdowns.engagement` |
| Impresiones / alcance **por publicación** | **no** | **no** | **no** | solo se puede inferir por día si hubo una sola publicación ese día; **no se hace** |
| Posts nativos (publicados fuera de GHL) | aparecen en la pantalla, **no** en `posts/list` | — | — | por eso no se miden |
- No hay métrica común entre plataformas. `actions` = me gusta + comentarios + compartidos es solo un comparador orientativo **dentro de la misma plataforma**.

### J5. Estructura de datos (migración `20261007_content_metrics_learning.sql`, aplicada)
- `content_metrics` (RLS activado, sin políticas, `revoke` a anon/authenticated): una fila por (`content_piece_id`, `metric_window` ∈ 24h/72h/7d) — **única**, no se repite. Columnas: `ghl_post_id`, `platform`, `account_id`, `due_at`, `captured_at`, `hours_since_published`, `late`, `status` (ok/partial/error), `error`, **por publicación** `likes`, `comments`, `shares`; **por cuenta (contexto, no atribuible)** `account_impressions_7d`, `account_reach_7d`, `account_followers`, `account_posts_7d`; `raw_metrics` JSONB (insights y estadísticas tal cual llegan).
- `content_pieces`: `approved_at`, `approved_seen_at`, `ghl_summary_hash`, `ghl_edited`, `ghl_edited_seen_at`, `learning` JSONB, `learned_at`.

### J6. Workflow n8n `Atacama Labs - 15 Content Metrics` (id `HDUZ0nrGFiO01hYN`, activo)
Cada **3 horas**: lee piezas `published` + sus snapshots → **decide sin llamar a GHL** si toca 24 h / 72 h / 7 d → solo si toca: lee el post (`insights`) y las estadísticas de la cuenta (solo lectura) → guarda una fila (`ignore-duplicates`). Tolerancias: 24 h (+12 h), 72 h (+24 h), 7 d (+48 h); pasada la tolerancia la ventana se registra como `ventana_perdida` (no se estima ni se mide tarde). Fallos de GHL no rompen el workflow: si el post y las estadísticas fallan no se guarda nada y se reintenta en la siguiente corrida; si falta una de las dos fuentes, el snapshot queda `partial` con el motivo. No aprueba, no programa, no publica.
- **Prueba en vivo** (copia desechable por webhook + pieza TEST con el reloj de la fila adelantado como fixture, todo borrado): 24 h guardada → misma corrida otra vez no duplica → 72 h → 7 d → siguiente corrida genera el aprendizaje → corridas posteriores no repiten nada. Pruebas unitarias: `scripts/content/metrics-core.test.mjs` (38) y `n8n/build/content-metrics.test.mjs` (30).
- **Estado real:** no hay snapshots reales todavía; la primera publicación es el 7-oct 16:00 (Chile), el 24 h cae el 8-oct ~16:00 y el 7 d el 14-oct.

### J7. Aprendizaje (determinista, sin LLM, sin causalidad)
A los 7 días el workflow 15 guarda en `content_pieces.learning`: tema, canal, formato, hook, categoría, score inicial, ventanas de métricas, qué funcionó, qué no, hipótesis (siempre marcadas «no demostrada»), guía (`no_repetir_hook`, etc.), advertencias y `confidence` (**baja** salvo ≥5 pares de la misma plataforma; nunca alta). Compara contra la mediana de piezas **de la misma plataforma** solo con ≥3 pares; sin pares lo dice. Las métricas de cuenta se marcan como contexto, y los clics como no disponibles.
- **Consulta:** workflow `16 Content Learnings` (`f29HJ40N7Vz8M3Rm`): `GET /webhook/atacama-content-learnings` con `X-Atacama-Key` → hooks a no repetir, piezas recientes, agregados por canal/categoría/formato (n<5 = tentativo), aprendizajes. CLI: `node scripts/content/learnings.mjs`. El prompt de Hermes `content-radar` lo consulta antes de buscar (1 llamada).

### J8. Etiquetas y categorías de Social Planner
Categorías (6) y etiquetas (`texto`, `imagen`, `carrusel`, `demo`, `reel`) existen. Las etiquetas solo se crean al **guardar** un post desde el compositor (Advanced options → Social tags); se creó un borrador de configuración y se borró. El workflow 12 envía `categoryId` según la categoría y `tags` según el formato. Las dos piezas reales llevan categoría y etiqueta `texto`.

### J9. Cadencia editorial objetivo (acordada con Christian, 6-oct-2026)
| Día | Publicar |
|---|---|
| **Día A** | LinkedIn personal (Christian Wevar) **+** Instagram Atacama Labs |
| **Día B** | LinkedIn Atacama Labs |
| **Día C** | Descanso |
Repetir A → B → C. **No se fuerza publicación:** si no existe contenido con score ≥ 70 para el canal del día, ese día no se publica (0 publicaciones es válido). Sobre la cadencia: Founder = Día A (7-oct) y Atacama Labs = Día B (8-oct); el 9-oct sería Día C (descanso). Cada pieza sigue pasando por `in_review` y la aprobación humana.

### J10. Content Radar (Hermes)
Job `a46bd3138a0b` **pausado** (semanal, lunes 12:00 UTC si se reanuda). No se hizo otra corrida real. Recomendación: reanudar **1 vez por semana (lunes)**, y pasar a 2 por semana (lunes y jueves, días hábiles) solo después de tener los primeros aprendizajes de 7 días y si hay capacidad de revisar lo que genera; nunca diario mientras la aprobación sea manual.

### J11. Seguridad y límites
Cero publicaciones automáticas (ninguna aprobación ni programación fue hecha por el sistema; las dos aprobaciones las hizo Christian en la interfaz de GHL; GHL publicará en las fechas programadas). No se creó ningún post público de prueba. Sin Gmail, prospección, leads 60–79, `dry_run` de Won, clientes reales, EnBandeja ni web de producción. **Limitaciones:** métricas por publicación = solo me gusta/comentarios/compartidos; impresiones y alcance por cuenta (7 días); posts nativos de Instagram no medibles por API; los datos reales de 24 h/72 h/7 d dependen del paso del tiempo; `approvalActionAt` también se llena al rechazar; sin historial de ediciones (solo detección por hash).

### J12. Verificación final (6-oct-2026, 19:01 UTC)
- **Sync real (ejecución programada de las 19:00, n8n 23347):** ambas piezas `scheduled`, `ghl_approval_status = approved`, `approved_at` exacto (`18:51:08Z` Founder, `18:51:04Z` Atacama Labs, de `approvalActionAt`), `scheduled_at` correcto, `ghl_edited = false`, `published_at` vacío (aún no publicadas).
- **Workflow 15:** activo; la corrida programada de las 18:00 UTC terminó OK sin tocar GHL (no había publicaciones). `content_metrics` = 0 filas reales (correcto); 0 piezas/fuentes TEST residuales.
- **GHL:** exactamente 2 posts programados (7-oct 19:00Z y 8-oct 13:00Z); ninguna otra publicación o programación creada por el sistema.

## BLOQUE K — Prospección real: Hermes → evidencia → Supabase → scoring → GHL «Investigado» → borrador para revisión (6-oct-2026) · ✅ OPERATIVO, SIN ENVÍOS

Objetivo: que Christian pueda entrar a GHL y encontrar prospectos reales, bien investigados, con empresa, contacto público, por qué encaja, señal/dolor, evidencia, score, ángulo y borrador, y decidir **después** si contactar. Sin Gmail, sin envíos (eso es el bloque siguiente).

### K1. Auditoría del flujo existente (estado real al empezar)
| Pieza | Estado real | Decisión |
|---|---|---|
| Hermes `Client Finder` (job `8421589d0902`, diario 11:00 UTC) | activo; modelo `gemini-3.7-flash`; solo leía HTML por `curl` (sin buscador); entregaba evidencia de dolor/encaje, casi nunca de volumen/automatización/urgencia | **Se rehizo como «Prospect Radar»** (K3); job **pausado** tras la corrida controlada |
| 01 Discovery / 02 Research / 02b Signals | desplegados (PROD, activos pero solo se ejecutan por Execute Workflow/manual); dependen de **OpenClaw** y del descubrimiento por Maps | **Fuera de la ruta crítica** (se conservan sin tocar) |
| 03 Qualification (PROD `LzkojauO5ypKNALc`) | funciona: 7 factores × nivel 0/1/2, clase A/B/C, `crm_candidate` solo clase A | **Se conserva igual** (pesos y umbrales sin cambios) |
| 04 CRM Sync / 05 Outreach Draft (PROD) | camino antiguo: 04 solo escribía 3 campos y ninguna nota; ambos exigían un prospecto ya «aprobado» (`ready_to_contact`) | **Sustituidos** por el 18; quedan sin uso |
| 06 Gmail Sync | esqueleto bloqueado (sin credencial) | **No se toca** (bloque siguiente) |
| 08 Prospect Ingest (PROD `i8VEHPHrBsT4fCBn`) | gate + verificación de citas + RPC `ingest_prospect` + ejecuta 03 | **Se conserva y se amplía** (contrato v2, verificación semántica, encadena 18) |
| 09 Prospect Approve (PROD `fxIBBQX2jlNhzAO5`) | aprobaba **antes** de CRM → contradice el flujo nuevo | **Desactivado** (reversible) |
| Supabase | `accounts/research/contacts/prospects/outreach/prospect_inbox` + RPC `ingest_prospect` | sin migraciones nuevas |
| GHL | pipeline `Atacama Labs — Ventas`, etapa «Investigado»; campos de oportunidad (Evidencia URL, ICP/vertical, Canal de contacto, Qualification Score, Commercial Angle, Prospect Key, Fuente, Solución de interés) y de contacto (Origen detallado, Primary Contact Role) **ya existían** | **Se reutilizan; no se creó ningún campo** |

### K2. Arquitectura final
```
Hermes «Prospect Radar» ──(busca)──► n8n 17 Prospect Search (Exa; la clave no sale de n8n)
        │
        └─ JSON v2 ─► n8n 08 Prospect Ingest ─► gate + verificación de citas (la cita debe EXISTIR y DEMOSTRAR el factor)
                          │ RPC ingest_prospect (cuenta+evidencia+contacto, dedupe por dominio)
                          ▼
                     n8n 03 Qualification ─► score 0–100 (7 factores) ─► clase A/B/C
                          ▼
                     n8n 18 Prospect Admit ─► (solo score ≥ 80, clase A y TODOS los gates)
                          ▼
                     GHL: contacto + oportunidad «Investigado» + nota de revisión  ·  Supabase: borrador `outreach` (draft, sin enviar)
```
Hermes investiga · Supabase guarda evidencia, score y logs · n8n orquesta · GHL es el lugar de revisión y fuente de verdad comercial · OpenClaw fuera de la ruta crítica.

### K3. Hermes `prospect-radar` (prompt `ops/hermes/prospect-radar.prompt.txt`, reemplaza a `client-finder.prompt.txt`)
- **Contrato v2** (JSON por candidato): `company, domain, city, region, country, vertical, signal` (señal observada), `pain, fit, offer` (hipótesis), `why_now`, `commercial_angle`, `source`, `confidence`, `contact{name, job_title, email, phone, whatsapp, linkedin_url, source_url, public:true, channel, is_decision_maker}`, `draft_subject`, `draft` y `evidence[{factor, level 1|2, url, quote, finding, date, certainty observed|inferred}]`. 08 acepta además la forma plana `evidence_url + evidence_quote/evidence_summary` y el alias `reason` del contrato anterior.
- **Reglas del prompt:** distinguir HECHO (cita literal) / INFERENCIA / HIPÓTESIS comercial; contacto solo profesional y público con su URL (nada de adivinar correos ni datos personales); borrador sin «vi que tienen problemas», sin exageraciones ni «chatbot», **un** dolor y **un** resultado; presupuesto de esfuerzo duro: **≤10 candidatos, ≤30 búsquedas, ≤45 llamadas a herramientas, ≤15 min**, páginas leídas una vez y acotadas a 6.000 caracteres.
- **Buscador** (workflow `17 Prospect Search`, `aGe77cEyCmobdAg7`): `POST /webhook/atacama-prospect-search` con `X-Atacama-Key`; Exa vía la credencial que ya existía en n8n; ≤8 resultados por llamada, texto citable de ~1.500 caracteres, **tope de 80 búsquedas por día**. Hermes pasó de leer HTML de Bing a tener búsqueda real.
- Skills del job: solo `grounded-citations` (se quitó `opportunity-builder`). Job **pausado**; copia de seguridad de `jobs.json` en `/opt/data/backups/`.

### K4. Verificación de evidencia y una corrección objetiva (documentada)
- **Tres tipos de evidencia, siempre rotulados:** ✔ **literal** (nivel 2, `certainty=observed`: la cita se encontró en la URL **y** demuestra el factor) · ~ **inferencia** (siempre nivel 1) · ? **sin verificar** (cita no encontrada/ilegible/no demostrativa → nivel 1, no suma como evidencia concreta). La nota de GHL los marca así; las hipótesis comerciales se rotulan «hipótesis».
- **Error objetivo encontrado con la corrida real:** la verificación solo comprobaba que la cita *existiera* en la página, no que *probara* el factor. Hermes etiquetó como «dolor» (20 puntos) textos como `MAESTRANZA Y TORNERIA`, `Contáctanos al +56 9 8852 0730` o `Llamadas: (56) 9 6727 6825`: existen en la página, pero no son dolor. **Corrección (`evidenceSupports`, `scripts/prospecting/admit-core.mjs`, usada en 08 y de nuevo en 18):** una cita debe tener ≥4 palabras (≥3 para el dolor, sin contar números ni signos) y, para el dolor, mencionar un proceso manual/de atención observable (WhatsApp, cotizar, agendar, formulario, solicitudes, llamadas, pedidos, horario…). Si no, la evidencia baja a nivel 1 (`unverified`). **Los umbrales y pesos NO se tocaron.** Las 6 cuentas aceptadas en la corrida se recalcularon con el mismo criterio (`research.raw_metadata.rescored`).
- Limitación honesta: es una heurística por palabras clave; reduce falsos positivos obvios pero no reemplaza la revisión humana (que sigue siendo obligatoria).

### K5. Scoring (sin cambios)
`pain 20 · fit 15 · automation 15 · volume 15 · budget_proxy 15 · urgency 10 · access 10` = 100; nivel 0/1/2 → puntos = peso × nivel/2; urgencia exige fecha ≤ 30 días; `access` lo deriva el sistema del contacto. Clase A ≥ 80 con gates (empresa verificada, dolor ≥ nivel 1, contacto verificable, evidencia vigente), B ≥ 60, C < 60. Se guardan `final_score`, componentes (`prospects.metadata.factors`: nivel, peso, puntos y evidencia por factor) y `qualification_reason`. **Política de entrada a GHL intacta:** ≥ 80 → puede entrar; 60–79 → se queda en Supabase (la vía 60–79 **no** se habilitó); < 60 → no entra. Nota: la constraint de la BD exige ≥ 75 para `hot`, pero el CRM exige 80.

### K6. Admisión a GHL (workflow `18 Prospect Admit`, `VV358NdbpNreMCDM`, activo; equivalente nuevo de 04 + 05)
- **Gates** (todos, vueltos a comprobar en el 18 aunque 03 ya haya marcado `crm_candidate`; código probado en `admit-core.test.mjs`, 47 pruebas): clase A y score ≥ 80; `status = new` y sin oportunidad; empresa con sitio propio; **cita literal del dolor que describa un proceso**; **≥ 3 factores con evidencia literal**; contacto público con URL de fuente; **motivo para escribir ahora** (≥ 20 caracteres); **ángulo comercial** (≥ 20 caracteres). Lo que no pasa se queda en Supabase con el motivo en `prospects.metadata.admission` (`held` + razones).
- **Deduplicación** (4 capas): Supabase (`accounts.dedupe_key` = dominio; solo prospectos sin `ghl_opportunity_id`); **GHL: contacto por dominio/correo/teléfono antes de crear — si ya existe un contacto (p. ej. un cliente o lead real) NO se toca, el prospecto queda `held: ya_existe_en_ghl`**; creación con `POST /contacts/` (nunca `upsert`, que podría modificar un contacto real; GHL rechaza el duplicado); `Prospect Key` = `account:<uuid>` y búsqueda de oportunidad por contacto; el id del contacto se guarda en Supabase **antes** de crear la oportunidad y la oportunidad antes de la nota (un reintento reanuda sin duplicar).
- **Qué se crea en GHL:** **contacto** (nombre o «empresa» si no hay persona; correo/teléfono públicos; empresa, sitio; fuente `atacama-labs-prospecting`; etiquetas `prospecto-hermes` y `prospecto-por-revisar`; *Origen detallado* = «Prospección outbound»; cargo) · **oportunidad** en `Atacama Labs — Ventas` / **Investigado** con *Fuente* = `outbound_manual`, *Solución de interés* (orientativa), *ICP / vertical*, *Evidencia URL*, *Canal de contacto*, *Qualification Score*, *Commercial Angle*, *Prospect Key* · **nota de revisión** en el contacto (empresa y dominio, score, **por qué escribirle ahora**, ángulo, señal, dolor, encaje y posible solución rotulados como hipótesis, evidencia con ✔/~/? y su cita y URL, contacto público y su fuente, puntos por factor, confianza de Hermes y **el borrador marcado NO ENVIADO**) · la tarea de revisión la crea la automatización nativa de GHL «Atacama — Tarea al investigar» (se comprobó: una tarea por prospecto, sin duplicar).
- **Borrador** (`outreach`, `status=draft`, `sent_at` nulo, `metadata.never_sent`): se usa el de Hermes si pasa la revisión (≤ 140 palabras, con pregunta final, sin «vi que tienen problemas», sin exageraciones/«chatbot»/relación falsa, no ofrece varios servicios, menciona a la empresa); si no, una **plantilla honesta**: «En <sitio> leí: «<cita literal>». Mi hipótesis, sin haberlo visto por dentro, es que eso hoy se resuelve a mano…» + una posibilidad concreta + una pregunta.
- **Aprobación humana (convención, sin sistema externo):** el contacto lleva `prospecto-por-revisar`. Christian decide con una **etiqueta nativa de GHL**: `aprobado-para-contactar` (el bloque siguiente la usará como disparador del envío por Gmail) o `descartado-prospecto`. Mientras tanto: `prospects.status` queda en `new` (**`ready_to_contact` queda reservado para la aprobación**), la oportunidad queda en Investigado y **nada se envía ni pasa a «Contactado»**.

### K7. Corrida real controlada (una sola, 6-oct-2026 19:28–19:41 UTC)
| Medida | Valor |
|---|---|
| Candidatos investigados | **8** (tope 10) |
| Búsquedas (n8n 17) / páginas abiertas por Hermes / llamadas a herramientas | 20 / 12 / 46 |
| Duración | **13,3 min** (12 min declarados por Hermes) |
| Tokens | entrada 599.122 + 1.682.182 en caché (≈ 2,28 M), salida 46.823, razonamiento 12.444; 94 mensajes |
| Costo estimado (reportado por Hermes) | **≈ US$ 0,75** (≈ US$ 0,09 por candidato); modelo `gemini-3.7-flash` |
| Aceptados / rechazados / duplicados | 6 / 2 (`missing_fit_evidence`: Nazka Maquinarias, Centro Cumbres Antofagasta) / 0 |
| Citas | 13 de 13 citas legibles existían en la página (3 ilegibles: Mediped); 6 de esas 13 existían pero **no demostraban** el factor (K4) |
| Scores con el gate corregido | Bazz 50 · Sermaqui 45 · Pulmari 45 · Ingeniería JL 30 · Mediped 30 · Centro de Salud 360 23 (todos **cold**; antes de la corrección: 60, 55, 55, 40, 30 y 40 respectivamente) |
| Prospectos ≥ 80 | **0** → **0 entran a GHL** (correcto: no se bajaron criterios ni se forzó cuota) |
- **Por qué ninguno llega a 80:** Hermes con un modelo barato entregó solo 2–3 factores por empresa (dolor, encaje y a veces capacidad de pago), nunca automatización, volumen ni urgencia fechada; los «porqué ahora» fueron descripciones genéricas de la empresa, no hechos recientes. Con los pesos actuales, 80 exige evidencia literal de ≥ 5 factores. Es un límite de la **calidad de la investigación**, no del pipeline.
- El tablero de GHL queda sin prospectos nuevos de esta corrida (las 6 cuentas quedan en Supabase como `cold`).

### K8. Pruebas
- Unitarias: `admit-core` 47, `prospect-flow` 52 (17: tope diario, validación, forma de la respuesta; 18: gates, dedupe, orden de guardado, cargas a GHL, ninguna escritura distinta a crear contacto/oportunidad/nota, sin envío, pack equivocado; 08: contrato v2 y gate), más las suites previas.
- **Punta a punta con datos TEST** (copia desechable de 08 → 03 PROD → 18 PROD → GHL real; todo borrado después): Hermes-like batch de 2 empresas → la de citas reales se calificó **90 / hot / candidato** y llegó a GHL (contacto, oportunidad en Investigado con los 8 campos, nota completa, borrador de plantilla porque el de Hermes fallaba la revisión, tarea nativa); la de citas inventadas quedó **50 / cold** sin entrar; reintento del 18 y lote repetido **no duplican** (oportunidad, contacto ni borrador); un contacto ya existente en GHL (p. ej. el de ejemplo `jordan.smith@example.com`) fue **detectado y no se tocó**. Sin clave → 403; clave incorrecta → 403; pack equivocado → error sin escribir.
- **Bugs reales que solo aparecieron en la prueba y se corrigieron:** (1) la oportunidad se creaba **sin contacto** y la nota fallaba (el id del contacto se leía de la respuesta de búsqueda en vez de los nodos «Resolve»); (2) el webhook respondía 500 cuando el 18 no tenía candidatos; (3) el borrador de plantilla tenía una frase mal construida; (4) las citas que existen pero no demuestran el factor inflaban el score (K4).
- **Incidente propio, resuelto:** mi limpieza final borró por patrón de nombre («TEST …») un workflow legacy de EnBandeja, inactivo (`TEST - Direct Model vs Prospector Agent`, `IDDoxJy4iHZjpmKN`). **Se restauró desde el respaldo del 5-oct** (`backups/2026-10-05/n8n/`): nuevo id `UmIhW9YnoaocDwz9`, inactivo, con etiqueta LEGACY — ENBANDEJA. No tenía ejecuciones activas. Lección aplicada: las limpiezas borran solo por id exacto.

### K9. Workflows activos (n8n)
`08 Prospect Ingest` `i8VEHPHrBsT4fCBn` (PROD, ampliado; respaldo previo en `backups/2026-10-06/n8n/`) · `03 Qualification` `LzkojauO5ypKNALc` · **`17 Prospect Search` `aGe77cEyCmobdAg7`** · **`18 Prospect Admit` `VV358NdbpNreMCDM`**. Desactivado: `09 Prospect Approve`. Sin uso: 04, 05, 01, 02, 02b. Generadores: `n8n/build/prospect-flow.mjs` (17 y 18) y `n8n/build/atacama-os-workflows.mjs` (08; el JSON versionado queda en modo test con marcadores).

### K10. Límites, pendientes y recomendaciones
- **Calidad de la investigación (lo que falta para tener prospectos ≥ 80):** (a) probar un modelo más capaz o un **segundo paso de profundización por candidato** (leer sus páginas de contacto, equipo, sucursales y ofertas de trabajo para evidenciar automatización/volumen/urgencia) antes de enviar; (b) exigir en el prompt que `why_now` sea un hecho fechado y reciente; (c) medir de nuevo costo y tasa de ≥ 80 con 10 candidatos. No se recomienda bajar el umbral.
- **Cadencia sugerida del radar:** no diario mientras no produzca ≥ 80; cuando lo haga, **2 veces por semana en días hábiles** (martes y jueves, 11:00 UTC), máximo 10 candidatos por corrida (costo ≈ US$ 0,75). El job está **pausado** (`hermes cron resume 8421589d0902`).
- Pendiente para el **bloque siguiente (Gmail y envío)**: disparar desde la etiqueta `aprobado-para-contactar`, enviar, mover a «Contactado», seguimiento y respuestas; hoy no hay nada de eso.
- Heurística `evidenceSupports` basada en palabras clave en español; revisión humana siempre.

## BLOQUE L — Prospect Gateway / Universal Intake (7-oct-2026) · ✅ OPERATIVO, SIN ENVÍOS

Guía de uso y contrato completo: **[`PROSPECT-GATEWAY.md`](PROSPECT-GATEWAY.md)** (léela primero). Aquí queda el registro de la implementación.

### L1. Por qué y qué cambia
El camino anterior (Hermes → 08 → 03 → 18) exigía **certeza** («¿puedo demostrar que esta empresa necesita Atacama?») y dependía de una sola fuente: en la corrida real del 6-oct ninguno de 8 candidatos llegó a GHL. El Gateway cambia la pregunta a *«¿hay razón suficiente para intentar una conversación?»* (fit razonable + señal observable + hipótesis defendible + canal posible) y acepta **cualquier fuente** por una sola puerta. El camino Hermes → 08 → 03 → 18 **se conserva intacto** (con su gate de evidencia); el Gateway es la entrada universal. Hermes sigue **pausado**.

### L2. Auditoría previa (estado real, no el documentado)
Repo `ChristianEducation/atacamalabs`, rama `feat/frontend-v2-2-1` (commit base `40a3434`). 03 Qualification (PROD `LzkojauO5ypKNALc`): 7 factores × nivel 0/1/2, A ≥ 80 con gates; 08 Ingest (PROD `i8VEHPHrBsT4fCBn`): gate + verificación de citas + RPC; 17 Prospect Search (`aGe77cEyCmobdAg7`) y 18 Prospect Admit (`VV358NdbpNreMCDM`) activos; GHL: pipeline de 7 etapas y campos ya existentes. Supabase: `accounts/prospects/research/contacts/outreach/prospect_inbox` (sin tocar). El HTML adjunto no estaba en el disco local; se usó la copia idéntica que ya estaba en el servidor de Hermes (`/opt/data/ATACAMA_LABS_PROSPECTOS_CONTACTAR_TODOS.html`, 140 fichas, 4 formatos), solo lectura.

### L3. Qué se construyó
| Pieza | Detalle |
|---|---|
| **Workflow n8n `19 Prospect Gateway`** | `ZlYTYp9AVdCYPdwS`, activo, etiqueta PRODUCCIÓN. `POST /webhook/atacama-prospect-gateway` con `X-Atacama-Key`. Generador `n8n/build/prospect-gateway.mjs` (el JSON versionado es el de producción; `MODE=test` genera la copia de pruebas con otro pack y ruta). Cada nodo Code incrusta las mismas funciones que prueban los tests. |
| **Núcleo puro (probado)** | `scripts/prospecting/gateway-core.mjs` (normalización, parsers HTML/CSV/texto, adaptador de Hermes/otras IAs, `ProspectCandidate`, scoring, dedupe, decisión, borradores) · `gateway-ops.mjs` (validación ligera, lote, cargas GHL, nota de revisión, `planAct`) · `gateway-flow.mjs` (evaluar → etapa 1 → etapa 2 → cierre). |
| **CLI de operador** | `scripts/prospecting/gateway.mjs` (`local | analyze | import | prepare | act`); `scripts/prospecting/calibrate.mjs` para calibrar con un HTML real. |
| **Supabase** (migración `20261007_prospect_gateway.sql`, aplicada) | `prospect_candidates` (candidato canónico + scores + estado + override + ids de GHL + borradores), `prospect_gateway_log` (idempotencia por `request_id` con la respuesta guardada), función `gateway_lookup(p_pack, p_keys)` (dedupe en una llamada: candidatos, cuentas y contactos del camino Hermes; solo `service_role`). RLS activado, sin políticas, `revoke` a anon/authenticated. **Ninguna tabla existente se modificó.** |
| **GHL** | **Ningún cambio de configuración** (no se crearon campos, etapas, etiquetas ni automatizaciones). El workflow usa lo que ya existía: pipeline y etapas, 8 campos de oportunidad, 2 de contacto y la automatización «Atacama — Tarea al investigar». |
| **n8n** | Nuevo: 19. Sin modificar 03, 08, 17, 18 ni el resto. |
| **Hermes** | Sin cambios (pausado). Solo se agregó el adaptador de su salida en el núcleo del Gateway. |

### L4. Flujo del workflow
`Webhook (auth) → Parse` (JSON / HTML / CSV / texto / URLs / targets; validación ligera; errores como JSON `ok:false`) `→ Idem Check` (replay) `→ Lookup` (RPC) `→ GHL Contacts + GHL Opps` (índice de dedupe) `→ Evaluate` (score + dedupe + decisión + plan del comando) `→ [analyze: responde] → Plan S1 → Exec S1` (crear contactos) `→ Plan S2 → Exec S2` (oportunidad / etapa / nota / tarea / etiquetas) `→ Finalize → Persist` (upsert) `→ Log → Respond`. Los ejecutores de GHL son genéricos y reciben solo operaciones ya planificadas (con un «skip» que no llama a ninguna API); los fallos de GHL no rompen el lote. Si el índice de GHL está incompleto, **no se crea nada** (falla cerrado).

### L5. Scoring, criterio de entrada y calibración
Detalle en `PROSPECT-GATEWAY.md` §5. Resumen: `priority = FIT(≤35) + SEÑAL(≤35) + ALCANCE(≤30)`; bandas **alta ≥80 · válida 60–79 · pendiente 40–59 · archivo <40**; **entra a GHL (Investigado) con ≥ 60 + algún canal + alguna señal + hipótesis/inferencia/solución + sin duplicado**; sin ningún canal el total no pasa de 59; el score externo es solo referencia. **Calibrado con el HTML real de 140 fichas** (no se importó): 9 alta · 34 válida · 90 pendiente · 7 archivo; 43 entrarían a GHL; **las 43 con algún canal quedan ≥ 60 (mínimo 60) y las 97 sin canal ≤ 59**. Dos calibraciones fallidas que se corrigieron: (1) el primer borrador dejaba casi todo en 60–79 porque contaba descripciones de la empresa como señal; (2) al pasar el lote real de Hermes, las 8 empresas salían en 89 porque el modelo trataba el resumen del LLM como «hecho» y títulos/teléfonos como señal → ahora solo una **cita informativa** (≥4 palabras, no un teléfono/título) cuenta como hecho, el resumen del modelo es inferencia, las fichas de directorio no cuentan, los hechos con proceso observable pesan más y, con validación ligera, una cita que no se puede comprobar pasa de hecho a inferencia (el lote de Hermes quedó 78–91, con Mediped bajando de 89 a 78).

### L6. Pruebas
- **Unitarias** (sin red): `gateway-core` **73**, `gateway-flow` **27**, workflow 19 simulado nodo a nodo **38** (con el HTML real de 140 fichas parseado por el propio workflow) — todas OK; más las suites previas (engine-core 37, signal-core 20, metrics-core 38, content-engine 27, content-signals 9, content-sync 27, content-metrics 30, won-to-client 45, admit-core 47, prospect-flow 52).
- **En vivo, con datos TEST** (copia desechable del workflow con pack propio; contactos reales de GHL solo leídos): sin clave 403 · clave incorrecta 403 · `import` sin `request_id` → error claro · **ANALYZE del HTML real de 140 fichas en 1,6–2,6 s sin escribir nada** (0 filas en Supabase) · import de un prospecto individual (contacto → oportunidad en Investigado → nota; 84 alta) · **reintento con el mismo `request_id` → `replayed:true`** · mismo prospecto con otro `request_id` → `duplicate_in_ghl`, sin crear nada · lista mixta (alta 84, válida 65 y 71, sin canal 59 → queda en Supabase, archivo 12) · **FORCE_IMPORT** del sin canal (entra con `manual_override`, quién y por qué en Supabase y en la nota) · `log_instagram` (Contactado + nota «Atacama OS no envió este mensaje» + tarea) · **`send_email` → `executed:false`, `not_enabled`, 0 mensajes** · PREPARE · `discard` · verificación de la oportunidad (etapa, 8 campos), del contacto (etiquetas, fuente), de la nota y de las tareas (la propia y la nativa de GHL) · **0 salidas enviadas**.
- **Producción, solo lectura:** el workflow 19 real analizó el HTML (140) y un lote real de Hermes (8) con `wrote_nothing:true`; `prospect_candidates`, `prospect_gateway_log` y `prospects` quedaron sin cambios.
- **Bugs reales hallados por las pruebas en vivo y corregidos:** GHL rechaza contactos sin correo, teléfono ni `firstName` (los sin canal fallaban; ahora `firstName` = empresa); los errores de validación salían como un 500 genérico (ahora JSON `ok:false` + pista); una constante de módulo no se incrustaba en n8n (`nodeNoop`); y las dos calibraciones de L5.
- **Limpieza:** solo por ids exactos (oportunidades, contactos y tareas creados por la prueba; filas del pack de pruebas; la copia del workflow por su id). GHL volvió a **43 contactos y 2 oportunidades** del pipeline; 0 candidatos y 0 filas de bitácora. (Un listado de GHL puede tardar unos segundos en reflejar borrados: se verificó por id.)

### L7. Costo y seguridad
- **Costo de las pruebas:** US$ 0 en IA (el Gateway es determinista, sin LLM); solo llamadas a Supabase, GHL y a las páginas citadas. Hermes no se ejecutó. Ningún correo, WhatsApp, llamada, DM ni LinkedIn enviado; `send_email` no existe como ejecución.
- No se tocaron: Gmail, contactos o clientes reales, Won `dry_run`, EnBandeja (el workflow legacy restaurado ayer sigue intacto), Content Engine, producción web, Telegram. El radar de Hermes sigue pausado.

### L8. Pendientes y siguientes pasos
1. **Gmail y envío** (bloque siguiente): `send_email` real (interfaz ya definida), disparado por la etiqueta `aprobado-para-contactar`, hilos, respuestas y bajas.
2. **Import real** de las 140 fichas (o de las 43 que entrarían) cuando Christian lo decida: `import` en lotes de ≤25 con `request_id` fijo; revisar primero con `analyze`.
3. **Prospecting v2 de Hermes** (investigar con el Gateway como puerta y la nueva calibración).
4. Mejoras: hipótesis automática para URLs individuales (hoy quedan pendientes de hipótesis), panel de revisión de candidatos en `pendiente`, y paginar el índice de GHL si crece sobre 100 contactos u oportunidades (hoy falla cerrado).

## BLOQUE M — Hermes como operador de Atacama OS (7-oct-2026) · ✅ OPERATIVO, SIN ENVÍOS

Guía de uso, herramientas y permisos: **[`HERMES-OPERATOR.md`](HERMES-OPERATOR.md)**. Aquí queda el registro.

### M1. Qué se construyó
| Pieza | Detalle |
|---|---|
| **Workflow n8n `20 Hermes Operator`** | `Pm5XfYBocmWR3YgY`, activo, etiqueta PRODUCCIÓN. `POST /webhook/atacama-hermes-operator` (`X-Atacama-Key`; sin clave o con clave errónea → 403). Parse + política de permisos → idempotencia → rechazos auditados → lectura acotada de Supabase → Prospect Gateway (19) o lectura de GHL → respuesta + auditoría + caché del análisis. Generador `n8n/build/hermes-operator.mjs`. |
| **Núcleo puro** | `scripts/operator/operator-core.mjs` (19 herramientas con niveles 1/2/3, resolución de objetivos por número/nombre/dominio/correo, construcción de llamadas, respuestas, auditoría). |
| **Supabase** (migración `20261007_hermes_operator.sql`) | `operator_audit_log` (única por `request_id`) y `operator_analysis_cache` (último análisis numerado). RLS activado, `revoke` a anon/authenticated. No es una segunda base de prospectos. |
| **Prospect Gateway (19)** | Solo dos opciones nuevas, redesplegado: `options.include_candidates` (devuelve los candidatos canónicos en `analyze`) y `act.due_at` (seguimiento con fecha exacta). Scoring sin cambios. |
| **Hermes (VPS)** | Servidor MCP `atacama-os` (`/opt/data/atacama-ops/atacama_ops_mcp.py`, 19 herramientas) + skill `atacama-ops`; registrado con `hermes mcp add` (backup de `config.yaml`). **Canal móvil: Telegram ya existente, reutilizado**; el agente se reinició una vez para cargar las herramientas (Telegram reconectó solo). Sin acciones manuales pendientes. |

### M2. Seguridad
Hermes no recibe el token de GHL (solo la clave de ingesta de n8n, ya existente); la política de permisos vive en n8n; el MCP lee archivos solo de `/opt/data` y `/tmp`; el `request_id` lo emite el servidor (los inventados por el modelo se ignoran); los fallos no ocupan el `request_id`. Nivel 3 (`send_email`, `send_whatsapp`, `publish_content`, `delete_record`) nunca ejecuta en este bloque. Límite conocido: un LLM podría autocompletar `order_text` del nivel 2 (se audita y la skill lo prohíbe).

### M3. Pruebas
- **Unitarias:** `operator-core` **30**, workflow 20 simulado nodo a nodo **24**; gateway-core 73, gateway-flow 29 (+ include_candidates/due_at), workflow 19 **37** (la prueba que usa el HTML real de 140 fichas requiere `GATEWAY_REAL_HTML`).
- **En vivo con Hermes real** (datos TEST, workflows de producción): las 8 frases del bloque (pendientes, analizar, importar, registrar Instagram, mover a Contactado/Respondió, crear tarea, FORCE_IMPORT, send_email → «no enviado») + oportunidades en Investigado + negativa a forzar sin orden. Verificado por id en GHL: etapa, notas, tareas (viernes 9-oct), etiquetas, override manual con motivo; **0 mensajes** (las conversaciones solo contienen actividad de oportunidad). Directo al webhook: 403 sin/mala clave, nivel 2 sin orden/motivo, objetivo ambiguo, etapa inválida, replay idempotente.
- **Hallazgos corregidos durante las pruebas:** el MCP de Hermes es v2 (`mcp.server.mcpserver`, no `fastmcp`); `hermes cron list` oculta los pausados (usar `--all`); Hermes inventaba `request_id`; rechazos/errores no deben ocupar el `request_id`; un script mío vació por error el archivo del VPS al usar una ruta relativa tras un `cd` (se repuso al instante, antes de registrar).
- **Limpieza:** solo por ids exactos (2 contactos, 2 oportunidades, 5 tareas en GHL; 2 candidatos, 8 filas de bitácora del Gateway, 28 de auditoría y 1 de caché en Supabase). GHL: **43 contactos y 2 oportunidades**; 0 filas en las tablas. También se borraron antes 22 tareas TEST huérfanas de bloques previos.

### M4. Pendientes
1. **Gmail y envío con aprobación** (siguiente bloque): habilitar `send_email` tras `confirmation_required` (idealmente botón de Telegram).
2. Importar las 43 empresas cuando Christian lo ordene («mete las buenas», tandas de ≤ 25).
3. Prospect Radar sigue **pausado** (`8421589d0902`; contenido `a46bd3138a0b` también).

## BLOQUE 1 — Activación comercial · Parte 1: Gmail + aprobación + respuestas (8-oct-2026) · ✅ CONSTRUIDA Y PROBADA, ENVÍO REAL APAGADO

Guía de uso, barreras, modos y checklist de activación: **[`OUTREACH.md`](OUTREACH.md)** (léela primero). Roadmap vigente: [`ATACAMA-OS-PROXIMOS-3-BLOQUES.md`](ATACAMA-OS-PROXIMOS-3-BLOQUES.md).

### B1.1. Auditoría previa (estado real)
- Existía: Prospect Gateway (19), Hermes Operator (20), automatizaciones GHL, `act: follow_up/mark_contacted`, borradores del Gateway; la aprobación era solo una convención (etiqueta `aprobado-para-contactar`) que nada leía.
- No existía: ninguna credencial de Gmail en n8n, workflows de envío/sincronización (el `06 Gmail Sync` del repo era un esqueleto no desplegado), tabla de mensajes ligada a `prospect_candidates` (la tabla `outreach` es del modelo EnBandeja, con FK a `prospects`, 0 filas), supresión, hilos, respuestas.
- Diferencia con docs: `GMAIL-OUTREACH-PLAN.md` es anterior al Gateway (usa `outreach`, el 09 y un «11 Outreach Send»; el 11 ya es Won to Client). Se usa `prospect_candidates` + GHL + Gateway y los workflows 21/22/23.

### B1.2. Qué se construyó
| Pieza | Detalle |
|---|---|
| **Supabase** (`20261008_outreach_engine.sql`, aplicada) | `outreach_config` (modo `off|dry_run|test_sim|live`, tope diario, ventana, `paused`, `from_email`, pie legal), `outreach_messages` (salientes/entrantes, hash de contenido, código de confirmación, `effect_key` único, un mensaje vivo por candidato+tipo), `outreach_suppression`. RLS activado, sin acceso anon/authenticated. |
| **n8n 21 Outreach Engine** (`7yRgPPDkiVyjmb3t`) | Webhook `atacama-outreach-engine`: draft · approve · cancel · get · list · replies · suppress. No puede enviar. |
| **n8n 22 Outreach Sender** (`aRvzG87Qg4uqI5bD`) | Cada 10 min (y webhook manual): un correo por corrida, ventana, tope, supresión, hash, candado `approved→sending`, Gmail solo en `live` y con credencial; efectos en GHL vía Gateway `mark_contacted`. |
| **n8n 23 Gmail Sync** (`Bx4tC1Qn5H6097BL`) | Cada 10 min: lee hilos enviados, clasifica (reply/decline/unsubscribe/bounce/auto_reply), idempotente por `recv:<id>`, mueve a *Respondió* / suprime / descarta. |
| **Hermes** | 7 herramientas nuevas (`save_draft`, `get_draft`, `approve_outreach` [nivel 3 con código del servidor], `cancel_outreach`, `list_outreach`, `get_replies`, `do_not_contact` [nivel 2]); skill con el flujo; el operador (20) llama al motor. MCP en el VPS actualizado y agente reiniciado. |
| **Gateway (19)** | Dos correcciones de bugs reales (ver B1.4). |

### B1.3. Seguridad
`mode` y `paused` solo los cambia Christian (Hermes no tiene ningún camino para tocarlos). Sin credencial de Gmail no existe envío real; hoy `mode = off` y no hay credencial. Candidatos `TEST` nunca salen en `live`. Hermes jamás envía.

### B1.4. Bugs reales hallados con las pruebas en vivo (y corregidos)
1. **Gateway: lote mixto no persistía en Supabase.** Un lote con filas con y sin `ghl_contact_id` (p. ej. un contacto creado y otro rechazado por duplicado en GHL) hacía fallar el upsert completo de PostgREST («todas las claves deben coincidir») y el Gateway igual respondía «creado». Ahora agrupa filas por conjunto de claves (`groupRowsByKeys`) y reporta `persist_error` (el operador lo muestra como error).
2. **Gateway: el import no guardaba los borradores** (solo `prepare`); ahora los persiste al crear el prospecto.
3. **Supabase:** `on_conflict=email` no funciona con índice parcial/por expresión → índice único simple.

### B1.5. Pruebas
Núcleo outreach 28, workflows 21/22/23 nodo a nodo 56, operador 34 (+nuevas), gateway-flow 31, workflow 19 41 (con regresión del lote mixto); suites previas intactas (gateway-core 73, admit-core 47, prospect-flow 52, engine-core 37, signal-core 20, metrics-core 38, content-engine 27, content-signals 9, content-sync 27, content-metrics 30, won-to-client 45). **En vivo (datos TEST, modo `test_sim`, sin Gmail): 48/48.** Con Hermes real (3 turnos): borrador → correo exacto + código → «sí, confirmo» → aprobado; ante «mándalo sin confirmación» se negó. 0 mensajes reales (conversaciones de GHL solo con actividad). Limpieza por id exacto (contactos, oportunidades, tareas, candidatos, mensajes, bitácoras); GHL de vuelta a 43 contactos y 2 oportunidades; tablas de prueba en 0.

### B1.6. Pendiente para el envío REAL (acciones de Christian)
Buzón remitente · credencial OAuth de Gmail en n8n (pasos en `OUTREACH.md` §5) · datos legales del pie · OK explícito para un único envío de prueba a su propio correo. Después: Parte 2 (follow-up) y el resto del Bloque 1.

## BLOQUE 1 — Activación comercial · Partes 2–4: follow-up, Prospección v2 y primer lote (8-oct-2026) · ✅ LISTO PARA PUESTA EN MARCHA (envío real apagado)

Guías: [`OUTREACH.md`](OUTREACH.md) §7 (seguimiento) · [`PROSPECTING-V2.md`](PROSPECTING-V2.md) · [`PRIMER-LOTE.md`](PRIMER-LOTE.md).

### B1.7. Parte 2 — Follow-up comercial
- **n8n 24 Followup Planner** (`rWulaiKeio0CsXrs`, cada 30 min + webhook `atacama-followup-planner`): por cada primer correo enviado crea las tareas de GHL «Seguimiento 1/2 · Empresa» (+3 y +7 días hábiles desde el primer envío), deja el borrador `followup_1`/`followup_2` cuando llega la fecha (nunca aprobado ni enviado solo; el sender espera ≥ 48 h entre correos al mismo prospecto), y **se detiene y limpia solo** (cancela borradores, borra tareas por id) si el prospecto responde, rechaza, se da de baja, rebota, se descarta, queda suprimido o su oportunidad pasa a Won/Lost. Máximo 2 seguimientos; luego `followup_state = done`.
- **Higiene:** borra tareas duplicadas idénticas que la automatización nativa de GHL crea a veces (4 de los 14 contactos del primer lote tenían dos «Revisar prospecto»; ya limpiadas).
- Hermes: `get_followups` (nuevo) + `save_draft kind=followup_1|2` + `approve_outreach`.
- Pruebas: núcleo 39, workflow 24 nodo a nodo, **en vivo 32/32** (TEST, fechas simuladas, modo `test_sim`).

### B1.8. Parte 3 — Prospección v2 de Hermes (Radar listo, PAUSADO)
- Prompt `ops/hermes/prospect-radar-v2.prompt.txt` (investigación intermedia, hecho/inferencia/hipótesis, regla «señal verdadera vs relleno», presupuesto duro, entrega solo por el Prospect Gateway, `MODO=analyze|import`, máx. 5 imports por corrida). Cargado en el job `8421589d0902` (**pausado**; horario L-V 11:00). Scoring del Gateway sin cambios.
- Calibrado con las 140 fichas reales (9 alta · 34 válida · 90 pendiente · 7 archivo; 43 pasan) y validado en vivo en `MODO=analyze`: US$ 0,19 y 4 min por corrida (v1: US$ 0,75 y 13 min). Detalle y hallazgo de calidad en [`PROSPECTING-V2.md`](PROSPECTING-V2.md).

### B1.9. Parte 4 — Primer lote real
- 14 de los 43 elegidos por score, canal público, proceso observable y facilidad de conversación (lista y criterios en [`PRIMER-LOTE.md`](PRIMER-LOTE.md)). Importados por el Gateway a *Investigado* (request_id `lote1-2026-10-08`): 14 contactos + 14 oportunidades + nota de revisión + ángulo en el campo de GHL + tarea «Revisar prospecto»; 13 borradores de correo en el motor (estado `draft`; Clínica Smile es solo WhatsApp). **Cero mensajes enviados, cero contactos.** No se importaron los otros 29.

### B1.10. Bugs reales corregidos en esta etapa
1. Firma duplicada y «Asunto:» incrustado en los borradores del Gateway (el motor agregaba otra firma): `cleanDraftText`.
2. Tareas «Revisar prospecto» duplicadas por la automatización de GHL: limpieza en el planificador.
3. (Del tramo anterior) lote mixto que no persistía, borradores no guardados al importar, `on_conflict` con índice parcial.
4. Incidente propio: al importar un script de pruebas se re-ejecutó y creó 3 prospectos TEST; borrados por id exacto (el registro del lote real quedó intacto).

### B1.11. Pendiente (acciones de Christian, ver informe final)
Buzón remitente · credencial OAuth de Gmail en n8n · datos legales del pie · OK explícito para un único envío de prueba a su propio correo · decidir cuándo reanudar el Radar (Bloque 2).

## BLOQUE 2 — Operación diaria automática (7-oct-2026) · ✅ OPERATIVO, ENVÍO REAL APAGADO

Guía operativa completa (cadencias, alertas, costos, qué corre dónde): [`OPERATIONS.md`](OPERATIONS.md).

### B2.1. Arquitectura
- **n8n `25 Atacama Ops`** (`OxLcj12RP0qLVLVc`) calcula todo en **solo lectura** (GHL, Supabase, n8n, Gmail `deep`) y solo escribe `ops_alerts` / `ops_runs` (migración `20261009_ops_daily.sql`). **Hermes cron programa y entrega** con jobs `--no-agent` (cero IA): `atacama-daily` (`99484078e80e`, 08:30 Chile) y `atacama-alerts` (`f21880a598b8`, cada 15 min, silencioso). Los radares son jobs de agente con **compuerta previa** de costo/calidad.
- Núcleo puro y testeable: `scripts/ops/ops-core.mjs` (25 pruebas) + builder `n8n/build/ops.mjs` (38 pruebas nodo a nodo).

### B2.2. Entregables
1. **Atacama Daily** (NECESITA TU ACCIÓN / PARA REVISAR / TODO BIEN; comercial, prospección, contenido, sistema).
2. **8 herramientas MCP nuevas** (35 en total) para las 9 preguntas diarias; `HERMES.md` y la skill `atacama-ops` corregidos para que Hermes use las herramientas y no sus ledgers viejos.
3. **Alertas** con dedupe (`ops_alerts`): solo respuestas humanas, workflows críticos caídos, Gmail sin acceso, Gateway bloqueado, publicación que no salió, jobs de Hermes con fallas seguidas, Hermes/disco; nunca por ejecución aislada.
4. **Health** (`get_health`): 12 componentes con OK / atención / fallo + motivo; `deep` prueba Gmail real. Sin panel web.
5. **Prospect Radar v2 ACTIVO en modo seguro**: martes y jueves 10:30 Chile, compuerta (≥ 20 h entre corridas, ≤ 3/semana, backlog < 25), entrada única = Prospect Gateway, solo deja prospectos en *Investigado*.
6. **Content Radar ACTIVO**: lunes 09:00 Chile, compuerta (≥ 5 días, < 3 piezas por revisar, < 5 señales sin usar); nada se publica solo.
7. **Métricas/aprendizaje**: el pipeline 14/15/16 ya existente se consulta desde el Daily y `get_content_performance`; sin impresiones inventadas (GHL no las entrega), n pequeño = tentativo.
8. `10 Atacama Daily (PREVIEW)` desactivado (no borrado).

### B2.3. Pruebas (todas seguras, sin mensajes comerciales ni publicaciones reales)
Offline: A–J en `ops-core.test.mjs` + simulación nodo a nodo. **En vivo:** Daily con datos reales desde la VPS (A); respuesta TEST controlada → aparece en el Daily como acción y alerta «Respondió» una sola vez, reintento solo si no se confirmó, silencio tras el ack (C, J); fallo simulado: reloj +3 h en `health`/`alerts_poll dry_run` → 6 alertas críticas sin escribir nada, y workflow TMP que falla de verdad → aparece en «fallidas 24 h» sin alertar (H); health general OK (I); 9 preguntas a Hermes (`hermes -z`) con datos reales; corrida real del Prospect Radar (5 importados a *Investigado*) y del Content Radar (7-oct, 4 min, 8 búsquedas, 5 señales enviadas → 7 señales candidatas sin pieza; ninguna pieza creada ni publicada; por tener ≥ 5 señales sin usar la compuerta saltará la corrida del lunes hasta que se conviertan en piezas). Costo informado por los agentes: US$ 0,03–0,04 por corrida (la validación previa del Radar midió ≈ US$ 0,19–0,20; el presupuesto usa el rango alto). Limpieza por ID exacto: mensaje TEST, fila `ops_alerts` TEST y workflow TMP borrados; verificado 0 restos.

### B2.4. Errores reales encontrados y corregidos
1. Hermes contestaba «oportunidades quietas» y «prospectos nuevos» desde `agent-os/RADAR_LEDGER.md` (HERMES.md lo declaraba estado operativo): sección fija nueva + descripción de skill; revalidado.
2. Evento de respuesta ya avisado se re-notificaba mientras el mensaje tuviera < 24 h: dedupe por evento corregido.
3. Oportunidades de prueba (`Sushi 72`, `Prueba Atacama`) ensuciaban «estancadas»: lista de ignorados configurable.
4. Estado de Hermes no informado se leía como falla: ahora «no informado».

### B2.5. Estado de seguridad al cierre
`outreach_config.mode = off`; 0 mensajes aprobados/enviando/enviados; 13 borradores intactos; los 14 prospectos del primer lote sin tocar (en *Investigado*); +5 del Radar v2 en *Investigado* (sin contacto). EnBandeja intacto. Sin secretos en repo/docs.

### B2.6. Incidentes del 7-oct para revisar en Bloque 3 (no se abre otro frente ahora)

1. **Job `atacama-alerts` roto ≈ 1 h (16:00–16:45 UTC, 4 corridas fallidas).** Causa: al agregar el enlace al panel dejé un salto de línea literal dentro de un string de `atacama_ops_cli.py` (SyntaxError, línea 31) por un reemplazo de texto con escapes. El Daily no se vio afectado (corre a las 11:30 UTC). Corregido a las 16:52 UTC; el ciclo de las 17:00 corrió bien. **No verificado:** si Hermes mandó a Telegram el error de esas 4 corridas. Lo detectó el propio sistema (alerta «Job de Hermes con fallos: 4 fallos seguidos»), pero solo porque el Daily/alertas se leen a sí mismos: no hay un vigilante externo.
2. **Despliegue sin compilar antes.** Primero se subió una versión rota y después un archivo **vacío** (el helper `hr.sh` hace `cd` y la ruta relativa de `base64` falló, pero la verificación `py_compile` de un archivo vacío pasa). Regla desde ahora: rutas absolutas, `test -s` + `py_compile` **antes** de `mv`, y correr el wrapper una vez a mano antes de dejar que el cron lo use.
3. **Avisos no pedidos a las 15:45 UTC.** El cron de alertas entregó a Telegram los avisos de las dos corridas de radar de la mañana (formato nuevo, sin enlace) apenas se desplegó la lógica de avisos. Efecto esperado del diseño, pero no se anunció. Para próximos cambios que generen mensajes: sembrar `ops_alerts` como ya notificado o avisar antes.
4. **`sudo hermes-restart agent` corta corridas en curso** (`hermes -z` y, potencialmente, jobs de radar): reiniciar solo sin corridas activas.
5. **Candidatos para Bloque 3 que salieron de esto:** (a) vigilante externo del Daily/alertas (p. ej. un chequeo desde n8n que avise si no hubo Daily a las 09:15 o si `atacama-alerts` lleva 2 fallos); (b) paso de despliegue con *canary* para los scripts de Hermes; (c) `display.tool_progress: all` en la config de Hermes manda trazas técnicas a las sesiones interactivas de Telegram (hoy solo se apagó el verifier de archivos); (d) 5 ejecuciones fallidas en 24 h (08 Prospect Ingest ×2, 17 Prospect Search, 13 Content Signal Intake, 12 Content Intake) sin diagnosticar; (e) 4 correos que salieron del buzón de envío sin pasar por Atacama OS (Bloque 1).
6. **Panel `/ops`:** construido y validado en local; **pendiente publicarlo y validarlo en producción** (variables `OPS_PANEL_PASSWORD`, `N8N_BASE_URL`, `ATACAMA_INGEST_KEY` en Vercel y despliegue de la rama). `ATACAMA_PANEL_URL` en Hermes se define después de validarlo.

## BLOQUE 3 — Cierre y blindaje final (7-oct-2026) · ✅ TÉCNICAMENTE LISTO, ENVÍO REAL APAGADO

Resumen ejecutivo, arquitectura, activación y pendientes: [`ATACAMA-OS-ARQUITECTURA-FINAL.md`](ATACAMA-OS-ARQUITECTURA-FINAL.md). Aquí el registro de lo hecho y hallado.

### B3.1. Auditoría inicial (antes de cambiar nada) — correcto / inconsistente / riesgo
- **Correcto:** `main` = rama de trabajo; 25 workflows de producción activos sin triggers duplicados (22/23/24 tienen schedule + webhook a propósito); 01–05 «(PROD)» solo por `executeWorkflow` y dormidos; GHL sin duplicados, sin oportunidades sin contacto y sin tareas huérfanas (41 contactos sin oportunidad = 36 EnBandeja legacy + 5 ejemplos de GHL); 2 oportunidades heredadas de pruebas web (`Sushi 72`, `Prueba Atacama`) intactas e ignoradas en el Daily; VPS sin runaway (carga 0,05, 4,4 GB libres, disco 59 %) y sin reinicios en bucle.
- **Inconsistente (corregido):** (1) `complete_territory_scan` y otras 4 funciones solo-servidor eran ejecutables por `anon`/`authenticated`/`public` → revocado y probado; (2) los workflows 25 y 26 respondían «ok» ante un fallo de red al escribir en Supabase → reintentos + `ok:false`; (3) correos colgados en `sending` sin vigilancia → alerta a los 15 min; (4) si el job de alertas de Hermes se caía nadie lo veía → el panel avisa a los 35/90 min; (5) el workflow de prueba manual de Waalaxy se llamaba «My workflow» → renombrado e inactivo.
- **Riesgo real que queda (requiere root, ver arquitectura §10):** Crawl4AI público en `0.0.0.0:32774` (responde 401), override de OpenClaw sin persistir en el compose original y publicación `0.0.0.0:32781` del contenedor de Hermes.
- **Ejecuciones fallidas (diagnóstico):** 16 en 48 h, todas rechazos de validación de pruebas negativas del 5–6 oct (más un error de GHL del Content Engine ya corregido); ninguna recurrente.

### B3.2. LinkedIn / Waalaxy
- API pública real: solo importar, listar listas/campañas y probar conexión; **sin webhooks ni estado** (detalle y consecuencias en la arquitectura §5). Credencial de n8n `Waalaxy — Atacama OS` verificada; la cuenta tiene 3 listas y 0 campañas.
- **Migración `20261011_linkedin_channel.sql`:** `prospect_candidates.channel_state` + `outreach_config.linkedin_*` (sin tablas nuevas).
- **n8n `26 LinkedIn Engine`** (`ve4uKTMQkGWzzmBV`, generado por `n8n/build/linkedin.mjs`; núcleo `scripts/linkedin/linkedin-core.mjs`, 13 + 36 pruebas): `list | status | recommend | approve | event | config | set_config | lists | test`. Gateway: normaliza perfiles personales de LinkedIn y conserva la fuente (`linkedin_source_url`); `mark_contacted` acepta canal `linkedin`. Los seguimientos de correo se detienen si hay respuesta o rechazo por LinkedIn. `/ops`: sección LinkedIn (pendiente, conexión, mensaje, follow-up, respondió, error); alerta por error de Waalaxy.
- **Radar:** el prompt ahora pide persona (nombre y cargo reales) y perfil personal verificable con su fuente; nunca adivinar ni scrapear LinkedIn.

### B3.3. Protecciones contra los incidentes del 7-oct
Job de alertas roto por sintaxis → `ops/hermes/deploy-to-vps.sh` (valida antes de reemplazar). Archivo vacío desplegado por ruta relativa → rutas absolutas + `test -s`. Herramientas del MCP definidas después de `mcp.run()` (nunca se registraban; lo detectó el E2E) → `ops/hermes/mcp-shape.test.mjs`. Deploy de Vercel roto por un archivo sin commitear → `scripts/run-all-tests.mjs` + `tsc`/`lint`/`build` antes de empujar a `main`. Avisos no anunciados → regla documentada en `OPERATIONS.md`.

### B3.4. Prueba E2E real y Won → Cliente
Ver arquitectura §7. Hallazgos del E2E: la falla silenciosa de red (corregida), las herramientas del MCP que no se registraban (corregido) y la ausencia de persona + LinkedIn en los 19 prospectos actuales (decisión de canal: 18 correo, 1 investigar más). **Won→Cliente validado con `dry_run:false` sobre una oportunidad TEST** (Business, Servicio, Proyecto y relaciones correctas, idempotente) y limpiado por ID exacto; el interruptor de producción es el `dry_run` del webhook de la automatización de GHL (pendiente humano).

### B3.5. Estado final de los datos
`outreach_config.mode=off`, `linkedin_mode=off`; 0 correos aprobados/enviando/enviados; 13 borradores; los 14 prospectos del primer lote y los 5 del Radar v2 intactos en Investigado; 0 datos TEST; 2 filas de auditoría de cambios de configuración de LinkedIn se conservan como evidencia.
