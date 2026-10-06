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
