# Hermes como operador de Atacama OS

> **En una línea.** Christian le habla a Hermes por Telegram («Analiza este archivo», «Mete la 27», «Le escribí por Instagram, regístralo», «Créame seguimiento para el viernes») y Hermes opera Atacama OS **solo a través de herramientas controladas**. Hermes **no tiene el token de GHL**. Claude Code sigue siendo el entorno de ingeniería y configuración.

## 1. Cómo se conecta

```
Christian (Telegram, el mismo bot de siempre)
        │
        ▼
   Hermes (VPS)  ── skill `atacama-ops` + servidor MCP `atacama-os` (27 herramientas)
        │            · solo guarda la clave de ingesta de n8n (/opt/data/.env, nunca se imprime)
        ▼
 POST /webhook/atacama-hermes-operator   (n8n «20 Hermes Operator» · X-Atacama-Key)
        │   política de permisos (nivel 1/2/3) → idempotencia → auditoría
        ├──► n8n «19 Prospect Gateway» ─► Supabase (prospect_candidates) + GHL (contacto, oportunidad, nota, tarea)
        ├──► lectura acotada de GHL (oportunidades abiertas, tareas)
        └──► lectura de Supabase (prospectos, último análisis)
```

- **Canal móvil: se reutilizó Telegram** (el gateway de Hermes ya estaba conectado con el chat de Christian). No se creó ningún bot nuevo. Para que el gateway cargara las herramientas se reinició el contenedor del agente con el wrapper autorizado (`hermes-restart agent`); Telegram volvió a conectarse solo. **No hay ninguna acción manual pendiente.** (Si algún día se agrega otro servidor MCP: enviar `/reload-mcp` en el chat o reiniciar el agente.)
- **Seguridad:** el token de GHL vive solo en n8n (credencial «GHL — Atacama OS»). Hermes únicamente puede llamar al webhook del operador con la clave de ingesta (la misma que ya usaba). El servidor MCP lee archivos **solo** dentro de `/opt/data` y `/tmp` (≤ 1,5 MB).
- **Un solo sistema de prospectos:** el operador **no crea otra base**. Todo pasa por el Prospect Gateway (workflow 19) y vive en `prospect_candidates`. El único estado nuevo es técnico: `operator_audit_log` (auditoría) y `operator_analysis_cache` (el último análisis numerado, para decir «mete la 27»).

## 2. Herramientas

| Herramienta | Nivel | Qué hace | Detrás |
|---|---|---|---|
| `analyze_prospects` | 1 | Analiza un archivo/lista/URLs (**solo lectura**); deja el análisis numerado | Gateway `analyze` |
| `import_prospects` | 1 | Mete a Supabase + GHL (*Investigado*) los que cumplen el criterio (≤ 25 por llamada) | Gateway `import` |
| `get_analysis` | 1 | Muestra el último análisis | Supabase |
| `get_prospect` | 1 | Ficha de un prospecto (por número, nombre, dominio o correo) | Supabase |
| `list_prospects` | 1 | Lista con filtros (estado, banda, score, fuente) | Supabase |
| `list_pending_prospects` | 1 | Pendientes de contactar (en *Investigado*, o aceptados sin GHL, o ambos) | Supabase |
| `prepare_outreach` | 1 | Borradores de email y WhatsApp — **no los envía** | Gateway `prepare` |
| `log_manual_contact` | 1 | Registra un contacto hecho fuera (Instagram, WhatsApp, teléfono…): mueve a *Contactado*, nota y tarea | Gateway `act` |
| `add_note` | 1 | Nota en el contacto de GHL | Gateway `act` |
| `move_opportunity` | 1 | Mueve la oportunidad de etapa (solo con orden de Christian) | Gateway `act` |
| `create_followup` | 1 | Tarea de seguimiento (fecha exacta `AAAA-MM-DD` o días hábiles) | Gateway `act` |
| `get_open_opportunities` | 1 | Oportunidades abiertas, por etapa | GHL (lectura) |
| `get_tasks` | 1 | Tareas pendientes (oculta las `(Example)`) | GHL (lectura) |
| `save_draft` · `get_draft` · `cancel_outreach` · `list_outreach` · `get_replies` | 1 | Borradores de correo, historial y respuestas (el motor **nunca** envía) | n8n 21 (ver [`OUTREACH.md`](OUTREACH.md)) |
| `get_followups` | 1 | Estado del seguimiento +3/+7 días hábiles y lo que está pendiente | n8n 21 |
| `approve_outreach` | **3** | Aprueba un correo con código del servidor + palabras de Christian; el envío lo hace n8n 22 en su ventana | n8n 21 |
| `do_not_contact` | **2** | Descarta y suprime todos los correos del prospecto | Gateway + n8n 21 |
| `force_import_prospect` | **2** | **FORCE_IMPORT**: mete aunque el score sea bajo; el motivo queda en Supabase, GHL y auditoría | Gateway `import` + `force_import` |
| `discard_prospect` | **2** | Descarta un prospecto | Gateway `act` |
| `send_email` · `send_whatsapp` · `publish_content` · `delete_record` | **3** | Piden confirmación y **hoy no ejecutan** | — (bloqueadas) |

### Frases típicas → herramienta
«Analiza este archivo» → `analyze_prospects` · «De estas empresas mete las buenas a GHL» → `import_prospects` (select = eligible) · «Mete la empresa 27 aunque tenga score bajo» → `force_import_prospect` · «Encontré esta empresa: https://… revísala y métela» → `analyze_prospects` (urls) → `import_prospects` · «Prepárame el correo para Rentalin» → `prepare_outreach` · «¿Qué prospectos tengo pendientes?» → `list_pending_prospects` · «¿Qué oportunidades tengo en Investigado?» → `get_open_opportunities` · «Le escribí por Instagram, regístralo» → `log_manual_contact` · «Mueve esta oportunidad a Respondió» → `move_opportunity` · «Créame seguimiento para el viernes» → `create_followup`.

## 3. Permisos

| Nivel | Regla | Cómo se hace cumplir |
|---|---|---|
| **1 — directo** | Leer GHL, analizar, importar, notas, contacto manual, tareas, mover oportunidades por orden, borradores | Se ejecuta y se audita |
| **2 — orden explícita** | FORCE_IMPORT, descartar | El workflow exige `order_text` (las palabras exactas de Christian, que además deben pedir esa acción) **y** un `reason` (≥ 5 caracteres). Sin eso responde `needs_explicit_order` / `needs_reason` y **no llama al Gateway** |
| **3 — confirmación** | Enviar email o WhatsApp, publicar, eliminar | Responde `confirmation_required` + código y **no ejecuta**. Aun con código de confirmación responde `not_enabled`. Se habilita en el bloque Gmail |

La política se aplica **en n8n (servidor)**, no en el prompt de Hermes. **Límite conocido:** un modelo podría rellenar `order_text` por su cuenta; el control es la skill («nunca inventes la orden»), la validación del texto y la auditoría, que guarda esas palabras para revisarlas. Para más rigor en el futuro: confirmación por botón de Telegram.

## 4. Auditoría e idempotencia

Cada llamada deja una fila en `operator_audit_log`: **actor** («Christian vía Hermes»), **timestamp**, **herramienta**, **nivel**, **entidad afectada** (nombre, ids de GHL), **resultado/estado**, **parámetros saneados** (nunca el contenido de archivos, solo su tamaño), la respuesta y el **request_id**.

- Una ejecución exitosa **ocupa** su `request_id`: repetirlo devuelve la misma respuesta con `replayed:true` sin volver a ejecutar (probado: la 2ª nota idéntica no se duplicó).
- Los rechazos y errores se auditan con un id con sufijo (`…~needs_ex~<ts>`), así que **no bloquean** un reintento legítimo (por ejemplo, la orden de Christian llega después del rechazo).
- El servidor MCP genera el `request_id`; **ignora** cualquier valor que el modelo invente (en las pruebas Hermes inventó algunos) y solo acepta uno que él mismo haya emitido (reintento de la misma acción).
- Además, el Gateway guarda su propia bitácora por `request_id` (`prospect_gateway_log`, con prefijo `op-`).

## 5. Archivos y listas de otras IAs

Hermes recibe/ubica el archivo dentro de `/opt/data` o `/tmp` y llama `analyze_prospects` con `file_path` (HTML, CSV, JSON, texto) o pasa `text` / `urls`. El Gateway parsea y puntúa; **Christian no toca Supabase**. El análisis queda numerado: «mete las buenas» o «mete la 27» usan ese análisis.

## 6. Qué no hace (este bloque)

No envía emails ni WhatsApp, no publica, no elimina, no activa el Prospect Radar (job `8421589d0902` pausado; el de contenido `a46bd3138a0b` también), no importó las 43 empresas, no tocó EnBandeja legacy ni el scoring (solo se agregaron al Gateway las opciones `include_candidates` y `act.due_at`).

## 7. Operación y mantenimiento

| Pieza | Dónde |
|---|---|
| Workflow 20 | `n8n/atacama-labs-20-hermes-operator.json` (`Pm5XfYBocmWR3YgY`, activo, etiqueta PRODUCCIÓN) · generador `node n8n/build/hermes-operator.mjs` |
| Núcleo puro (probado) | `scripts/operator/operator-core.mjs` (registro de herramientas, política, resolución de objetivos, construcción de llamadas, respuestas y auditoría) |
| Servidor MCP + skill (versionados) | `ops/hermes/atacama_ops_mcp.py` → VPS `/opt/data/atacama-ops/atacama_ops_mcp.py` · `ops/hermes/skills/atacama-ops/SKILL.md` → VPS `/opt/data/skills/atacama-ops/SKILL.md` |
| Registro en Hermes | `hermes mcp add atacama-os --command /opt/hermes/.venv/bin/python --args /opt/data/atacama-ops/atacama_ops_mcp.py` (entrada `mcp_servers.atacama-os` en `/opt/data/config.yaml`; backup `backups/config.yaml.pre-atacama-ops.20261007-0129`) |
| Supabase | `supabase/migrations/20261007_hermes_operator.sql` |
| Pruebas | `node scripts/operator/operator-core.test.mjs` (30) · `node n8n/build/hermes-operator.test.mjs` (24, recorre el workflow nodo a nodo) |

**Actualizar una herramienta:** editar `operator-core.mjs` → `node n8n/build/hermes-operator.mjs` → desplegar el JSON (PUT al workflow `Pm5XfYBocmWR3YgY` conservando ids de nodo) → probar. **Cambiar el servidor MCP o la skill:** copiar al VPS, y `/reload-mcp` en Telegram (o reiniciar el agente).

**Rollback:** desactivar el workflow 20 (los 19 y todo lo previo siguen intactos); `hermes mcp remove atacama-os`; restaurar `config.yaml` desde el backup; borrar la skill `atacama-ops`.

## 8. Pruebas en vivo (7-oct-2026, datos TEST, a través de Hermes real)

| Frase | Resultado |
|---|---|
| «Muéstrame prospectos pendientes.» | `list_pending_prospects` → «no hay» |
| «Analiza estas empresas» (archivo de 2 TEST) | `analyze_prospects` → 87 alta / 27 archivo, sin escribir nada |
| «Importa el prospecto TEST número 1» | `import_prospects` → contacto + oportunidad en *Investigado* |
| «Le escribí por Instagram. Regístralo.» | `log_manual_contact` → *Contactado*, nota, tarea, etiquetas; 0 mensajes |
| «Muévelo a Contactado» · «…a Respondió» | `move_opportunity` → etapa verificada en GHL |
| «Créame seguimiento para el viernes» | `create_followup` → tarea 9-oct-2026 |
| «¿Puedes meter el Taller (nº 2)?» (sin orden de forzar) | Hermes **se negó** y recomendó archivar |
| «Mete el Taller aunque tenga score bajo» | `force_import_prospect` (nivel 2) → entró con `manual_override` y motivo |
| «Envíale ahora un correo a la Clínica…» | `send_email` bloqueado: borrador mostrado, **«no enviado»**, 0 mensajes |
| Directo al webhook | sin clave 403 · clave errónea 403 · nivel 2 sin orden/motivo rechazado · etapa inválida y objetivo ambiguo con mensaje claro · `delete_record` y `send_whatsapp` con código → no ejecutan · replay idempotente |

Las conversaciones de GHL de los contactos de prueba solo tenían entradas de actividad («Opportunity created/updated»): **ningún mensaje real**. Limpieza solo por ids exactos; GHL volvió a 43 contactos y 2 oportunidades; 0 filas en las tablas de prueba.

## 9. Pendientes

1. **Gmail y envío con aprobación** (siguiente bloque): habilitar `send_email` detrás de `confirmation_required` con botón/código por Telegram.
2. Confirmación humana más fuerte para el nivel 2 (botón de Telegram en vez de texto libre).
3. Importar de verdad las 43 empresas cuando Christian lo ordene («mete las buenas», en tandas de ≤ 25).
4. Reanudar el Prospect Radar solo cuando Christian lo decida.

## 10. Operación diaria (Bloque 2, 7-oct-2026) — 8 herramientas nuevas, solo lectura

El MCP `atacama-os` pasó de 27 a **35 herramientas**. Todas llaman a n8n `25 Atacama Ops` (`POST /webhook/atacama-ops`) con la misma clave de ingesta y **no escriben nada** (ni publican, ni aprueban, ni envían):

| Herramienta | Responde a |
|---|---|
| `get_daily` | «Dame el resumen / el Daily» |
| `get_today` | «¿Qué tengo que hacer hoy?» |
| `get_urgent` | «Dame solo lo urgente» |
| `get_health` (`deep`) | «¿Está todo funcionando?» · «¿Falló algo hoy?» |
| `get_stale_opportunities` | «¿Qué oportunidades llevan demasiado tiempo quietas?» |
| `get_radar_new` | «¿Qué prospectos nuevos encontró el radar?» |
| `get_content_status` | «¿Qué publicaciones tengo pendientes?» |
| `get_content_performance` | «¿Cómo rindieron las últimas publicaciones?» · «¿Qué aprendimos?» |

(`¿Quién respondió?` y `¿Qué seguimientos tengo?` usan `get_replies` / `get_followups` de los bloques anteriores.)

**Lección aprendida (importante):** la primera prueba mostró que Hermes respondía «¿qué oportunidades están quietas?» y «¿qué prospectos nuevos hay?» desde sus ledgers personales antiguos (`agent-os/RADAR_LEDGER.md`), porque `HERMES.md` los declara estado operativo. Se agregó a `HERMES.md` (respaldo `HERMES.md.bak-bloque2`) una sección fija «Atacama OS — operación comercial y de contenido» que obliga a usar estas herramientas para el negocio de Atacama Labs, y la descripción de la skill `atacama-ops` ahora lista esas frases. Fuente: `ops/hermes/HERMES-atacama-os-section.md`. Después del cambio las 9 preguntas se respondieron con datos reales de GHL/Supabase/n8n.

**Jobs de cron de Hermes (sin IA):** `atacama-daily` (08:30 Chile), `atacama-alerts` (cada 15 min, silencioso) — ver [`OPERATIONS.md`](OPERATIONS.md). Archivos en la VPS: `/opt/data/atacama-ops/{atacama_common.py,atacama_ops_cli.py,atacama_ops_mcp.py}`, `/opt/data/scripts/{atacama_daily,atacama_alerts,radar_gate,content_gate}.sh`. Reiniciar el agente tras tocar el MCP: `sudo hermes-restart agent` (corta las corridas `hermes -z` en curso).

## 11. Canal LinkedIn (Bloque 3) — 7 herramientas más (42 en total)

| Herramienta | Nivel | Qué hace |
|---|---|---|
| `linkedin_ready` | 1 (lectura) | Separa Investigado en LinkedIn / correo / investigar más, con motivo y faltantes |
| `linkedin_status` | 1 | Estado de un prospecto en LinkedIn y canal recomendado hoy |
| `recommend_channel` | 1 | Calcula y guarda la recomendación |
| `approve_linkedin` | **3** | Alta en Waalaxy en dos pasos (código + palabras de Christian); bloqueada si el modo es `off`, si hay correo activo o si el perfil no es verificable |
| `log_linkedin_event` | 1 | Registra lo que Christian ve en Waalaxy (conexión, mensaje, follow-up, respuesta, rechazo, detener) |
| `linkedin_config` · `waalaxy_lists` | 1 | Modo/destinos y listas/campañas de Waalaxy |

**Lección:** las herramientas definidas después de `mcp.run()` no se registran; `ops/hermes/mcp-shape.test.mjs` lo impide y `hermes mcp test atacama-os` debe mostrar 42.

## 12. Contenido de Ola A — 8 herramientas más (50 en total)

| Herramienta | Qué hace |
|---|---|
| `content_queue` | Cola de revisión (n/6), señales candidatas, artículos RSS nuevos, entrevistas abiertas, carruseles esperando render |
| `founder_interview` | `start` · `answer` · `cancel` · `status` · `add_question` (la IA estructura, no inventa vivencias) |
| `submit_content_piece` | Envía UNA pieza al Content Intake (`origin`: autonomous · explicit · founder_interview); termina `in_review`, nunca publica |
| `content_resources` | `list` (reutilizar antes de crear) · `register` · `retire` |
| `rss_items` | `pending` · `mark` · `status` de los feeds |
| `competitor_intel` | `list` · `latest` · `save` (inteligencia orgánica, solo fuentes públicas) |
| `content_signals` | `candidates` · `submit` (gate de señales: URL + cita literal) · `learnings` |
| `report_content_job` | Registra la corrida de un job (para `/ops` y avisos) |

**Jobs:** `Content RSS` (lun–vie 13:15 UTC), `Content Pieces` (lun–vie 13:45 UTC) y `Competitor Intelligence` (miércoles 14:00 UTC), todos con compuerta previa (`rss_gate.sh`, `pieces_gate.sh`, `competitors_gate.sh`) que decide ANTES de gastar IA. Prompts versionados en `ops/hermes/content-*.prompt.txt`. Despliegue: `ops/hermes/deploy-to-vps.sh`.
