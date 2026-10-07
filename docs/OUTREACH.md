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
