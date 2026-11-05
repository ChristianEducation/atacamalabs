# Motor de correo de Atacama OS — borrador → aprobación → envío → respuesta

> **En una línea.** Hermes prepara el correo, Christian lo confirma con palabras y un código, y **el sistema** (n8n + Gmail) lo envía solo dentro de una ventana segura. Las respuestas se leen solas, se clasifican y mueven la oportunidad. Hermes **nunca** envía y **nunca** puede activar el envío.

## 1. Piezas

| Pieza | Qué hace |
|---|---|
| **n8n 21 Outreach Engine** (`7yRgPPDkiVyjmb3t`) | Borradores, edición, aprobación con confirmación, cancelación, «no contactar», consultas. Solo habla con Supabase; **no puede enviar nada**. |
| **n8n 22 Outreach Sender** (`aRvzG87Qg4uqI5bD`) | Cada 10 min toma **un** correo aprobado, revisa todas las barreras y lo envía por Gmail. Aplica el efecto en GHL (Contactado + nota) vía Prospect Gateway. |
| **n8n 23 Gmail Sync** (`Bx4tC1Qn5H6097BL`) | Cada 10 min lee los hilos enviados; clasifica (respuesta, rechazo, baja, rebote, autorrespuesta), guarda el mensaje y mueve la oportunidad. |
| **Tablas Supabase** (`20261008_outreach_engine.sql`) | `outreach_config` (modo y límites, una fila), `outreach_messages` (salientes y entrantes), `outreach_suppression` (a quién NO se escribe). No hay segunda base de prospectos: todo cuelga de `prospect_candidates`. |
| **Herramientas de Hermes** | `save_draft`, `get_draft`, `approve_outreach`, `cancel_outreach`, `list_outreach`, `get_replies`, `do_not_contact` (+ las de antes). Núcleo probado: `scripts/outreach/outreach-core.mjs`. |

## 2. El interruptor: `outreach_config.mode` (solo lo cambia Christian)

| Modo | Qué ocurre |
|---|---|
| `off` (hoy) | No se envía **ni se simula** nada. Los correos aprobados esperan. |
| `dry_run` | Simula el envío (estado `dry_run`); no toca Gmail ni GHL. |
| `test_sim` | Sin Gmail, pero **aplica los efectos en GHL**, solo a candidatos cuyo nombre contiene `TEST`. Para pruebas. |
| `live` | Gmail real. Los candidatos `TEST` **nunca** salen en este modo. |

Hermes no tiene acceso a esa tabla ni a ningún endpoint que cambie el modo. Para cambiarlo: pídeselo a Claude Code (o edita la fila en Supabase). `paused = true` es el freno de emergencia (detiene todo sin cambiar el modo).

## 3. Barreras (todas en el servidor, no en el prompt de Hermes)

1. **Aprobación ligada al contenido.** El correo se aprueba con un `hash` de destinatario + asunto + cuerpo. Si se edita algo después, la aprobación se anula y el sender lo cancela si lo ve cambiado.
2. **Confirmación en dos pasos con código emitido por el servidor** (nivel 3): `approve_outreach` sin código devuelve el correo exacto (con firma y pie) y `CONF-xxxxxx` (vence en 30 min, un solo uso, atado al hash). Solo con ese código **y** las palabras de Christian (`christian_order`) queda `approved`. *Límite honesto:* un modelo podría reutilizar el código sin preguntar; por eso la skill lo prohíbe, el código está atado al contenido exacto y todo queda auditado con sus palabras. El interruptor `mode` sigue siendo solo de Christian: aun así nada sale con `mode = off`.
3. **Un solo mensaje vivo por prospecto y tipo** (índice único) y `effect_key = send:<id>`: no hay borradores ni envíos duplicados. El sender **reclama** el mensaje (`approved → sending`) antes de llamar a Gmail: dos corridas simultáneas no pueden enviarlo dos veces.
4. **Ventana y tope:** lunes a viernes 09:00–17:30 (Chile), un correo por corrida (≥ 10 min entre correos), tope diario `daily_cap` (parte en 10; calentar con 5-10 al día).
5. **Supresión:** nunca se escribe a un correo (ni dominio) en `outreach_suppression` (baja, rebote definitivo, «no contactar»). Se revisa al guardar, al aprobar y otra vez al enviar.
6. **Validación del borrador:** destinatario válido y **publicado por la empresa** (salvo `override_to` que Christian elija), asunto 4–150, cuerpo 40–2500, un solo enlace, sin acortadores, sin marcadores (`[Nombre]`, `{{x}}`), sin lenguaje de spam.
7. **El sistema solo agrega** la firma, el pie legal y la línea «responde “baja”» (más la cabecera `List-Unsubscribe`). El resto es el texto aprobado.
8. **Un seguimiento solo existe tras el primer envío** y se detiene si el prospecto respondió, rebotó, se dio de baja o fue descartado.

## 4. Respuestas (Gmail Sync)

Clasificación determinista: **rebote** (mailer-daemon / «no entregado» → suprime ese correo y detiene), **autorrespuesta** (cabeceras `Auto-Submitted`, «fuera de oficina» → solo se registra; el seguimiento sigue), **baja** («no me escriban», «dar de baja», «baja»… → suprime, descarta en GHL, detiene), **rechazo** («no nos interesa» → detiene y pasa a *Respondió* con nota para decidir), **respuesta** (todo lo demás → *Respondió* con el texto en la nota; el automatismo nativo de GHL «Tarea al responder» crea la tarea). Ante la duda siempre es «respuesta» (la ve un humano). **Nunca se responde solo**: Hermes puede resumir y preparar un borrador (`save_draft kind=reply`), que pasa por el mismo flujo de aprobación y sale en el mismo hilo.

## 5. Activación real — checklist (acciones tuyas en negrita)

1. **Decidir el buzón remitente** (alias de `atacamalabs.cl` en Google Workspace, o tu Gmail para los primeros ~10 contactos; el plan de dominio secundario/DNS sigue en `GMAIL-OUTREACH-PLAN.md` para cuando subas el volumen).
2. **Crear la credencial de Gmail en n8n** (10 min, con tu sesión; el token queda cifrado en n8n y no pasa por el chat):
   1. Google Cloud Console → proyecto nuevo «Atacama OS» → *APIs y servicios* → habilitar **Gmail API**.
   2. *Pantalla de consentimiento*: si el buzón es de **Workspace** → tipo **Interno**. Si es un **@gmail.com** personal → tipo **Externo** y *publícala en producción* (si la dejas en «Testing», Google **vence el token cada 7 días**); aparecerá el aviso «app no verificada»: es normal para uso propio.
   3. *Credenciales* → **ID de cliente OAuth → Aplicación web**. URI de redirección autorizada: `https://n8n.srv1650725.hstgr.cloud/rest/oauth2-credential/callback`.
   4. n8n → *Credentials* → nueva **«Gmail OAuth2 API»**, nombre exacto `Atacama Labs - Gmail (envío)`, pega ID y secreto de cliente → **Sign in with Google** con el buzón remitente.
   5. Avísale a Claude Code («listo, la credencial está creada»). Claude conecta los nodos (`GMAIL_CRED_ID=<id> node n8n/build/outreach.mjs` + redeploy de 22 y 23).
3. **Datos legales para el pie** (razón social, RUT, domicilio) → `outreach_config.legal_footer`. Sin ellos el pie dice solo «Atacama Labs · atacamalabs.cl».
4. **Prueba controlada a tu propio correo** (requiere tu OK explícito): se crea un prospecto «Prueba Christian» (nombre **sin** `TEST`) con tu correo, se aprueba por Hermes, se pone `mode = live` con `daily_cap = 1`, sale **un** correo, respondes desde tu teléfono y se verifica que Gmail Sync lo detecta y mueve la oportunidad.
5. Recién ahí: `daily_cap = 5`, primer lote real pequeño; volver a `off` si algo no se ve bien.

**Rollback:** `paused = true` (inmediato) o `mode = off`; desactivar 22/23 en n8n; los mensajes quedan en `outreach_messages` con su historial.

## 6. Pruebas

- Núcleo: `node scripts/outreach/outreach-core.test.mjs` (28) · workflows 21/22/23 nodo a nodo: `node n8n/build/outreach.test.mjs` (56) · operador: `node n8n/build/hermes-operator.test.mjs` (34).
- **En vivo (7-oct, datos TEST, modo `test_sim`, sin Gmail):** 48 comprobaciones: import de 3 prospectos, borrador desde el del Gateway, código incorrecto / sin orden / código viejo tras editar → rechazados, aprobación en dos pasos, edición posterior que anula la aprobación, sender en `off` (no hace nada), `dry_run` (no toca GHL), `test_sim` (GHL → Contactado + nota «[SIMULADO]»), segunda corrida sin reenviar, respuesta inyectada → *Respondió*, repetición sin duplicar, baja → suprimido + descartado, «no contactar» cancelando lo aprobado, modo `live` con candidato TEST → no envía; **0 mensajes reales** (las conversaciones de GHL solo tienen actividad).
- **Con Hermes real:** preparó el correo, lo mostró completo y **pidió confirmación**; recién tras «sí, confirmo» quedó aprobado (código y palabras guardados); ante «mándalo sin pedirme confirmación» respondió que no puede.
- **Bugs reales hallados y corregidos:** (1) el Gateway no guardaba nada en Supabase cuando un lote mezclaba filas con y sin `ghl_contact_id` (PostgREST exige claves uniformes) y aun así decía «creado» → ahora agrupa por conjunto de claves y reporta el error; (2) el import no guardaba los borradores (solo `prepare`) → ahora los persiste al crear el prospecto; (3) `ON CONFLICT (email)` no funcionaba con un índice parcial → índice único simple.

## 7. Seguimiento comercial (follow-up) — n8n 24 Followup Planner (`rWulaiKeio0CsXrs`)

**Reglas (definidas por Christian):** primer seguimiento a **+3 días hábiles** y segundo a **+7 días hábiles desde el primer envío** (10:00 Chile); después **se para**. Nunca se autoenvía: cada seguimiento es un **borrador** que Christian aprueba con el mismo flujo de dos pasos (`approve_outreach kind=followup_1|followup_2`), y el sender espera ≥ 48 h desde el último correo a ese prospecto.

**Qué hace el planificador (cada 30 min, y webhook manual `atacama-followup-planner`):**
1. Por cada primer correo **enviado**: crea en GHL las dos tareas «Seguimiento 1 · Empresa» y «Seguimiento 2 · Empresa» (vencen en +3 y +7 días hábiles, asignadas a Christian) y guarda sus ids en el mensaje (`metadata.followup_tasks`). **Antes** de crear lee las tareas del contacto: si ya existen con ese título las reutiliza (sin duplicados); si no puede leerlas, no crea nada.
2. Cuando llega la fecha: deja **un** borrador `followup_1` (o `followup_2`) en el mismo hilo (`Re: asunto`), con plantilla breve y sin presión; no lo repite aunque se corra de nuevo. Si el 1 quedó sin aprobar al llegar el +7, lo caduca y prepara el 2; si el 1 está aprobado espera a que salga.
3. **Se detiene y limpia solo** si el prospecto **responde, rechaza, se da de baja, rebota, se descarta, queda suprimido o su oportunidad pasa a Won/Lost en GHL**: cancela los borradores/aprobados pendientes, **borra las tareas abiertas** (por id exacto) y deja `followup_state = stopped:<motivo>`. Una autorrespuesta («fuera de oficina») **no** detiene la secuencia.
4. Tras el segundo seguimiento (o pasada su fecha y resuelto) marca `followup_state = done`: máximo 2 seguimientos.
5. Actualiza `prospect_candidates.next_action_at` con la próxima fecha (visible para el Daily del Bloque 2).
6. **Higiene (siempre, aunque el modo sea `off`):** la automatización nativa de GHL «Tarea al investigar» a veces crea **dos** tareas idénticas; el planificador borra la repetida (misma tarea y día; conserva la más antigua) en los prospectos de los últimos 3 días.

Hermes: `get_followups` (qué seguimientos hay y cuáles tienen algo pendiente), `get_draft`/`save_draft kind=followup_1|2`, `approve_outreach`, `cancel_outreach`. Solo opera con `mode ≠ off` (sin envíos no hay secuencia que planificar).

**Pruebas del seguimiento:** núcleo (39) + workflow 24 nodo a nodo (13) + **en vivo 32/32** con datos TEST y fechas simuladas (modo `test_sim`): tareas +3/+7 con las fechas correctas (13 y 19-oct para un envío el 8-oct), sin duplicar al repetir, respuesta de Beta → tareas borradas en GHL y secuencia detenida, Gamma pasada a *Lost* → detenida, borrador `followup_1` solo al llegar el +3 (nunca aprobado ni enviado solo), seguimiento 1 y 2 aprobados con código y «enviados» (simulado), `done` y bloqueo de un tercer seguimiento.

## 8. Gmail conectado y autoprueba de envío (8-oct-2026)

**Estado:** la credencial `Atacama Labs - Gmail (envío)` (`rA6hBRbpf0nbDWmh`, tipo `gmailOAuth2`, cuenta `christian.wevar@atacamalabs.cl`) está conectada a los nodos de Gmail de **22 Outreach Sender** (envío + 2 sondas) y **23 Gmail Sync** (lectura). `outreach_config.mode = off`: nada sale. Pie legal temporal: «Atacama Labs · atacamalabs.cl» (no bloquea la integración; se cambia en `legal_footer`).

**Verificación de conexión y scopes (sin enviar nada):** `POST` al webhook de cada workflow con `{"gmail_check": true}` (funciona en cualquier modo):
- **22:** lee el perfil de Gmail y hace una sonda de envío **sin destinatario**; Gmail la rechaza siempre con `400 Recipient address required` (si faltara el permiso de envío respondería `403`). Resultado 8-oct: `credential_access: true`, cuenta `christian.wevar@atacamalabs.cl`, `send_scope_ok: true`, `messages_sent: 0`.
- **23:** lee perfil, etiquetas y lista de hilos (solo GET). Resultado: `credential_access: true`, `read_labels_ok`, `read_threads_ok`, 57 mensajes en el buzón.

**Candado extra de la autoprueba:** `outreach_config.send_allowlist`. Si no está vacía, en modo `live` solo se envía a esos correos; hoy contiene **únicamente** el destinatario de la prueba. Además `daily_cap = 1`, el envío exige un mensaje **aprobado** (hoy los 13 borradores del lote 1 siguen sin aprobar) y los candidatos con «TEST» nunca salen en `live`.

### Procedimiento de la autoprueba (UN solo correo, a tu propio correo)
Destinatario propuesto: **c.wevarh@gmail.com** (se cambia con `--to`). Remitente: `christian.wevar@atacamalabs.cl`. Prospecto de la prueba: «Autoprueba Christian Wevar» (ya creado en *Investigado*, con borrador; nombre sin «TEST» a propósito).

1. **Revisar el correo exacto:** `node scripts/outreach/self-test.mjs preview` (De, Para, Asunto y texto con firma y línea de baja).
2. **Tu autorización explícita** en el chat (por ejemplo: «Autorizo el envío de prueba a c.wevarh@gmail.com»). Sin eso no se arma nada.
3. **Armar y enviar:** `node scripts/outreach/self-test.mjs arm --confirm "<tus palabras>"`. El script se niega si hay otro mensaje aprobado, si el destinatario no es el autorizado, si la lista blanca no es solo ese correo, si el sistema está en pausa o si la autoprueba ya salió. Aprueba con el código del servidor (dos pasos, con tus palabras), pone `mode = live` (restringido: lista blanca + tope 1) y dispara **una** corrida del sender. Si no sale, vuelve a `off`.
4. **Verificar el envío:** `self-test.mjs status` → el mensaje en `sent`, con `gmail_thread_id`; GHL: la oportunidad pasa a **Contactado** con la nota «Correo enviado…»; en tu Gmail llega el correo (revisa también spam) y en el buzón `christian.wevar@atacamalabs.cl` queda en *Enviados*.
5. **Probar la respuesta:** respóndelo desde tu teléfono con la palabra «prueba». Corre `self-test.mjs sync` (o espera ≤ 10 min al sync automático): Gmail Sync detecta el mensaje en el mismo hilo, lo clasifica `reply`, guarda la fila entrante, y GHL pasa la oportunidad a **Respondió** con la nota «RESPUESTA por correo…»; el seguimiento de la autoprueba se detiene (planificador, ≤ 30 min: `followup_state = stopped:respondio` y tareas borradas).
6. **Cerrar:** `self-test.mjs disarm` (vuelve a `mode = off`; cancela cualquier pendiente de la prueba). La lista blanca queda con solo tu correo hasta definir el envío real.
7. **Limpiar:** `self-test.mjs cleanup` borra el prospecto de autoprueba por id exacto (GHL + Supabase). El hilo queda en tu Gmail.

**Después de la prueba:** vaciar `send_allowlist` (o ampliarla al lote) y pasar `daily_cap = 5` se hace solo con tu orden explícita, junto con los primeros 3–5 contactos del lote 1 aprobados de a uno.

## 9. Resultado de la primera autoprueba real (7-oct-2026) y firma nueva

**Primera autoprueba (un correo a `c.wevarh@gmail.com`, autorizado por Christian):** el envío real por Gmail funcionó (hilo `1a116aa3739cdaad`, oportunidad → *Contactado*). Christian respondió «prueba» desde su teléfono; Gmail Sync (forzado) lo detectó en el mismo hilo, lo clasificó `reply`, guardó la fila entrante idempotente (`recv:<id>`), movió la oportunidad a **Respondió** con la nota «RESPUESTA por correo…» y el planificador dejó la secuencia en `stopped:respondio` (0 borradores de seguimiento; las tareas de seguimiento ni se habían creado). Después: `disarm` (`mode = off`) y limpieza por id exacto (contacto, oportunidad, tareas, mensajes, bitácoras).

**Defectos que salieron de la prueba real (corregidos):**
1. La nota de GHL decía «CONTACTO REGISTRADO MANUALMENTE… Atacama OS no envió este mensaje» para envíos del propio sistema. Ahora el Gateway acepta `act.by_system` y escribe «CORREO ENVIADO POR ATACAMA OS · canal: email…» con la etiqueta `contactado-por-correo` (los contactos manuales siguen igual).
2. La respuesta guardada arrastraba la atribución de Gmail en español partida en dos líneas («El mié, 7 oct 2026 a la(s) 11:00 a.m., Christian Wevar\n(correo) escribió:»); `newText` ahora la corta.
3. El primer intento de `arm` no envió porque el sender corrió segundos antes de la hora programada (siguiente marca de 5 min de la ventana); se agregó `self-test.mjs send`, que espera y dispara una sola vez.

**Firma del motor (desde el 8-oct):** `Christian Wevar | Atacama Labs` · `atacamalabs.cl` (enlace) · logo oficial, y debajo, en gris pequeño, el pie legal (solo si es distinto de la marca) y la línea de baja. No hay firma ni pie duplicados: el cuerpo aprobado se limpia de firmas/despedidas (`cleanDraftText`) y el pie temporal «Atacama Labs · atacamalabs.cl» no se repite (`isBrandOnlyFooter`).
- **Logo:** Gmail y la mayoría de clientes **no muestran SVG** en correos. Se usa el asset oficial `public/brand/logo-horizontal.svg` rasterizado **sin redibujar** con `node scripts/outreach/build-email-logo.mjs` → `public/brand/email/logo-horizontal-email.png` (440×41 px, 3,9 KB, transparente; se muestra a 220 px de ancho) e incrustado en el correo (imagen inline `cid:atacama-logo`; no depende de que el sitio esté publicado).
- **Formato del mensaje:** `multipart/alternative` [texto plano · `multipart/related` [HTML + PNG inline]]. El texto plano lleva la misma firma sin imagen.
- **Vista previa:** `node scripts/outreach/self-test.mjs preview [--html <archivo>]` (texto exacto y HTML con el logo real).

**Segunda autoprueba (preparada, SIN enviar):** «Autoprueba Christian Wevar» en *Investigado* con el borrador «Autoprueba 2 de Atacama OS: firma y logo». Mismo procedimiento (§8) con la autorización de Christian: `self-test.mjs arm`/`send`, responder «prueba 2», `sync`, `disarm`, `cleanup`.
