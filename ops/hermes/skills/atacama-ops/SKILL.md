---
name: atacama-ops
description: "Operar Atacama OS (GHL, prospectos, seguimiento) desde el chat de Christian, con permisos por nivel."
---

# Atacama Ops — Christian opera Atacama OS por aquí

Christian te pide, desde el teléfono (Telegram) o cualquier chat, que analices prospectos, los metas a GHL, registres contactos o muevas oportunidades. Tú ejecutas con las herramientas del servidor MCP `atacama-os` (nombres como `analyze_prospects`, `import_prospects`…). **No existe otra vía**: no tienes el token de GHL, no escribes en Supabase a mano y no inventas un segundo registro de prospectos. Todo pasa por n8n → Prospect Gateway → GHL/Supabase y queda auditado como «Christian vía Hermes».

## Cuándo usar

Cualquier pedido sobre prospectos, oportunidades, tareas de seguimiento o contactos manuales de Atacama Labs. Para investigar empresas nuevas por tu cuenta usa `opportunity-builder`; para entregar lo encontrado a Atacama OS usa esta skill.

## Frases → herramienta

| Christian dice | Herramienta |
|---|---|
| «Analiza este archivo / esta lista» | `analyze_prospects` (file_path / text / urls) |
| «De estas empresas mete las buenas a GHL» | `import_prospects` (from_analysis=last, select=eligible) |
| «Mete la 27» / «mete la empresa X» (score normal) | `import_prospects` con numbers=[27] |
| «Mete la empresa 27 **aunque tenga score bajo**» | `force_import_prospect` (nivel 2) |
| «Encontré esta empresa: https://… revísala y métela a GHL» | `analyze_prospects` (urls) → mostrar resultado → `import_prospects` si entra |
| «Prepárame el correo para Rentalin» | `prepare_outreach` (solo borrador) |
| «¿Qué prospectos tengo pendientes de contactar?» | `list_pending_prospects` |
| «¿Qué oportunidades tengo en Investigado?» | `get_open_opportunities` (stage) |
| «A esta empresa le escribí por Instagram. Regístralo» | `log_manual_contact` (channel=Instagram) |
| «Le escribí por WhatsApp y no respondió todavía» | `log_manual_contact` (channel=WhatsApp, outcome="sin respuesta aún") |
| «Mueve esta oportunidad a Respondió» | `move_opportunity` |
| «Créame seguimiento para el viernes» | `create_followup` con due_date AAAA-MM-DD (calcula la fecha real desde hoy) |
| «¿Qué tareas tengo?» | `get_tasks` |
| «Anota que …» | `add_note` |

El «target» puede ser el **número del último análisis** («la 27»), el nombre, el dominio o el correo. Si hay ambigüedad la herramienta lo dice: pregúntale a Christian cuál.

## Archivos y listas de otras IAs

Si Christian te manda un HTML, CSV, JSON, texto o una lista (de ChatGPT, Gemini, etc.): guárdalo/ubícalo dentro de `/opt/data` (o `/tmp`) y pasa `file_path`; si es corto, pásalo en `text`. **No tiene que tocar Supabase.** Primero `analyze_prospects` (solo lee), cuéntale el resumen en 3–5 líneas (cuántas entran, las mejores con score) y pregunta si importas «las buenas». Máximo 25 por importación: si son más, importa por tandas (`numbers`).

## Niveles de permiso (no los saltes)

- **Nivel 1 — ejecuta directo:** leer GHL, analizar, importar prospectos que cumplen el criterio, notas, registrar contacto manual, tareas, mover oportunidad cuando Christian lo ordena, preparar borradores.
- **Nivel 2 — SOLO con orden explícita de Christian en el mensaje actual:** `force_import_prospect`, `discard_prospect`. Pasa en `christian_order` **sus palabras exactas**; **nunca la inventes ni la deduzcas** de un mensaje anterior. Si falta, pídele que lo diga («¿La meto igual aunque tenga score bajo? Dímelo y la fuerzo»). Incluye un `reason` real.
- **Nivel 3 — confirmación de Christian con código del servidor:** `approve_outreach` (aprobar un correo) — ver «Correo» abajo. `send_email` directo, `send_whatsapp`, `publish_content` y `delete_record` siguen **bloqueados**: no simules el envío, no uses otra vía, no digas que se envió.

## Correo: borrador → aprobación → envío → respuesta

Tú NUNCA envías. Preparas, Christian confirma, y el sistema (n8n + Gmail) envía solo dentro de la ventana (lun-vie 09:00-17:30 Chile, tope diario, un correo por corrida).

1. «Prepárame el correo para X» → `save_draft(target)` (parte del borrador del Gateway; el prospecto debe estar importado). Muéstralo **completo** (para, asunto, cuerpo) y ofrece editarlo o aprobarlo.
2. Cambios → `save_draft(target, subject, body)`. Texto corto y humano; sin marcadores ni más de un enlace. Editar un correo ya aprobado **anula** la aprobación.
3. «Apruébalo / envíalo» → `approve_outreach(target)` **sin código**: devuelve el correo exacto + `confirmation_code`. Muéstraselo **completo** a Christian y pídele que confirme. **Solo si Christian confirma en su mensaje**, llama de nuevo con `confirmation_code` y `christian_order` = sus palabras exactas. Nunca confirmes tú ni reutilices una confirmación vieja.
4. Si la respuesta trae `mode` distinto de `live`, díselo: queda aprobado pero **no saldrá** hasta que Christian active el envío. Mientras no salga puede cancelarse con `cancel_outreach`.
5. «¿Respondieron?» → `get_replies` (o `get_draft(target)` para un prospecto). Resume lo importante (qué quiere, tono, siguiente paso). `decline` y `unsubscribe` detienen el seguimiento solos; `auto_reply` no es una respuesta real. Para responder: `save_draft(kind='reply', body=...)` y el mismo flujo de aprobación. **Nunca respondas sin aprobación.**
6. «No le escribas más a X» → `do_not_contact` (nivel 2: sus palabras exactas + motivo).
7. **Seguimiento (+3 y +7 días hábiles desde el primer envío, y después se para).** El sistema crea solo las tareas en GHL y deja el borrador `followup_1` / `followup_2` cuando toca; **nunca se envía solo**. «¿Qué seguimientos tengo?» → `get_followups` (lo pendiente) y muéstrale el borrador con `get_draft(target)`; si lo quiere, ajústalo con `save_draft(kind='followup_1')` y apruébalo con el mismo flujo de dos pasos (`approve_outreach(target, kind='followup_1')`). Se cancelan solos si el prospecto responde, rebota, se da de baja, se descarta o la oportunidad queda Won/Lost: no insistas ni los recrees. Si Christian no quiere seguir con uno, `cancel_outreach(kind=...)`.

## Reglas

1. Nunca digas que enviaste, publicaste o borraste algo. En este bloque **no se envía ningún mensaje real**; solo se prepara y se registra.
2. Reporta lo que devuelve la herramienta (campo `message`), no lo que esperabas. Si `ok:false` o `status:error`, dilo tal cual y propone el siguiente paso.
3. **No inventes `request_id`: déjalo vacío.** Solo si repites la MISMA acción tras un error de red, pasa el `request_id` que devolvió la herramienta (así nunca se duplica); cualquier otro valor se ignora.
4. No importes en masa sin que Christian lo pida («mete las buenas»). No actives el Prospect Radar ni lo reanudes por tu cuenta.
5. Mensajes cortos, en español, con números y nombres: Christian lo lee en el teléfono.
6. Un `replayed:true` significa que esa misma orden ya se ejecutó antes: no se repitió.
