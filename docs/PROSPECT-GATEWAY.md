# Prospect Gateway — puerta universal de prospectos de Atacama OS

> **Receta de un minuto.** Le das un archivo (HTML, JSON, CSV, texto o una lista de URLs) a Claude y le dices: *«Analiza esto y mete a GHL las que valgan la pena.»*
> Claude ejecuta, sin inventar nada nuevo:
>
> ```bash
> node scripts/prospecting/gateway.mjs analyze  archivo.html   # 1) qué haría (solo lectura)
> node scripts/prospecting/gateway.mjs import   archivo.html   # 2) mete a Supabase y a GHL (Investigado) lo que vale la pena
> ```
>
> Nada se envía. Lo que entra queda en **Investigado** con una nota de revisión y borradores; tú decides después si contactar.

El Gateway recibe prospectos desde **cualquier fuente** (Hermes, ChatGPT, Claude, otra IA, HTML, JSON, CSV, texto, una URL, una lista tuya, ingreso manual) y los pasa por la **misma** capa: normalización → dedupe (Supabase + GHL) → validación ligera → scoring propio → decisión → Supabase/GHL. Hermes es **una fuente más**, no la única puerta.

## 1. Principio

Atacama OS no decide *«¿puedo demostrar que esta empresa necesita Atacama?»* sino *«¿hay razón suficiente para intentar una conversación?»*. Se busca: **fit razonable + una o más señales observables + una hipótesis comercial defendible + un canal de contacto posible**. **No** se exige evidencia explícita de «dolor».

Siempre se distingue **HECHO** (observado en una fuente), **INFERENCIA** (deducida de hechos) e **HIPÓTESIS** (lo que Atacama podría hacer; nunca se presenta como hecho). Ejemplo: *Hecho:* «La empresa recibe cotizaciones por WhatsApp y ofrece 20 servicios». *Hipótesis:* «Probablemente hay trabajo repetitivo de clasificación e intake». Eso alcanza para prospectar.

## 2. Arquitectura

```
Hermes · ChatGPT · Claude · otra IA · HTML · JSON · CSV · texto · URL · Christian
                          │
                POST /webhook/atacama-prospect-gateway   (X-Atacama-Key · request_id idempotente)
                          ▼
   n8n «19 Prospect Gateway»  (ZlYTYp9AVdCYPdwS)
   Parse → [errores claros] → idempotencia → dedupe Supabase (RPC gateway_lookup) + índice GHL (contactos y oportunidades)
        → scoring (fit + señal + alcance) → decisión
        → analyze: responde (no escribe)
        → import/prepare/act: GHL etapa 1 (contactos) → etapa 2 (oportunidad, nota, tarea, etiquetas) → Supabase (prospect_candidates) → bitácora → respuesta
```

- **Supabase** guarda el candidato canónico (`prospect_candidates`), la bitácora idempotente (`prospect_gateway_log`) y hace el dedupe.
- **GHL** (pipeline `Atacama Labs — Ventas`) es donde Christian revisa; por defecto **Investigado**. La tarea de revisión la crea la automatización nativa de GHL «Atacama — Tarea al investigar».
- **El Gateway nunca envía mensajes.** `send_email` devuelve `executed:false` con la interfaz definida.
- El camino anterior Hermes → 08 → 03 → 18 sigue existiendo (con su gate estricto de evidencia); el Gateway es la entrada universal y no lo reemplaza.

## 3. API

`POST https://<n8n>/webhook/atacama-prospect-gateway` · cabecera `X-Atacama-Key` (la misma clave de ingesta de n8n/Hermes; nunca va en el cuerpo ni se imprime). Sin clave o con clave incorrecta → **403**. Los errores de validación devuelven **200** con `{ ok:false, error, hint }` (n8n no permite otros códigos desde el último nodo). Máximo **300** prospectos en `analyze` y **25** en `import | prepare | act` por solicitud (divide en lotes).

```jsonc
{
  "action": "analyze | import | prepare | act",
  "request_id": "obligatorio salvo en analyze (4–80 caracteres: letras, números . _ : -)",
  "source": { "type": "ia | html | json | csv | text | url | manual | hermes", "name": "ChatGPT", "reference": "chat del 7-oct" },   // o un string
  "options": { "force_import": false, "manual_override_reason": "", "by": "Christian", "validate": "none|light", "enrich": false, "min_ghl_score": 60 },
  "act": { "type": "log_instagram", "note": "…", "channel": "…", "stage": "…", "reason": "…", "days": 3 },        // solo action=act
  // entradas (puedes combinar varias):
  "prospects": [ { …ProspectCandidate o JSON suelto de otra IA… } ],
  "html": "<article class=\"prospect\">…</article>",   "csv": "empresa;web;email;…",   "text": "Empresa: X\nWeb: …",
  "urls": ["https://sitio-de-la-empresa.cl"],          "targets": [ { "company_name": "…", "website": "…" } ]        // targets = a quién aplicar un act
}
```

**Idempotencia (obligatoria).** Cada `request_id` se ejecuta **una sola vez**: un reintento recibe la respuesta guardada con `replayed:true` y no vuelve a crear nada. Además, aunque cambie el `request_id`, el dedupe por candidato evita duplicar contactos u oportunidades.

**Respuesta.** `{ ok, action, request_id, replayed, safety:{messages_sent:0}, summary, results:[…], notes }`. Cada resultado trae `decision`, `band`, `priority_score`, los tres sub-scores, `channels`, `reasons`, `existing` (coincidencias en Supabase/GHL), `supabase` (`creado | actualizado | sin_cambios`), `ghl` (`contact_id`, `opportunity_id`, y qué se aplicó), `warnings` y, en `act`, `executed`/`error`.

**Decisiones:** `create_in_ghl` (cumple el criterio: entra a Investigado) · `keep_in_supabase` (queda guardado, con el motivo) · `archive` (<40) · `duplicate_in_ghl` (ya existe en GHL: **no se toca**) · `exists_in_supabase` (ya estaba: se enriquece sin pisar nada) · `invalid` (sin identidad mínima).

### Comandos (`action`)
| Acción | Qué hace |
|---|---|
| **ANALYZE** | Clasifica prospecto o lista. **No escribe nada** (ni Supabase, ni GHL, ni bitácora). |
| **IMPORT** | Crea o actualiza de forma segura en Supabase y, si cumple, crea contacto + oportunidad (**Investigado**) + nota + etiquetas en GHL. |
| **PREPARE** | Genera borradores de email y WhatsApp y los guarda (**nunca se envían**). |
| **ACT** | Ejecuta **una acción explícita** autorizada (tabla siguiente). |

### Acciones `ACT`
| `act.type` | Efecto |
|---|---|
| `create_prospect` | Guarda el candidato en Supabase (sin tocar GHL). |
| `create_in_ghl` | Crea contacto + oportunidad en Investigado (si el contacto ya existe: se rechaza salvo `attach_to_existing:true`). |
| `prepare_email` | Genera y guarda el borrador (no lo envía). |
| `send_email` | **No se ejecuta** (`executed:false`, `status:"not_enabled"`). Devuelve la interfaz prevista: `to, subject, body, thread_id` y los requisitos (etiqueta `aprobado-para-contactar` + credencial Gmail). Se activa en el bloque Gmail. |
| `mark_contacted` · `log_instagram` · `log_whatsapp` · `log_phone` | Registra un contacto hecho **fuera** de Atacama OS: canal, fecha (`at` opcional), etapa **Contactado**, nota («Atacama OS no envió este mensaje»), tarea de seguimiento a +3 días hábiles (`follow_up_days`). Si el prospecto no está en GHL se crea directo en Contactado. |
| `discard` | Estado descartado + nota + etiqueta `descartado-prospecto` (pasa a *perdida* solo con `mark_lost:true`). |
| `follow_up` | Crea una tarea de seguimiento (`days`, `title`). |
| `move_stage` | Mueve la oportunidad: `nuevo, investigado, contactado, respondio, diagnostico, propuesta, seguimiento`. |
| `add_note` | Agrega una nota al contacto en GHL. |

## 4. Formato canónico `ProspectCandidate`

Todos los campos son **opcionales** salvo `company_name`; acepta información incompleta (la identidad mínima es empresa + web, contacto o ubicación).

| Campo | Contenido |
|---|---|
| `company_name`, `website`, `industry`, `location` | Identidad y contexto. |
| `source_type`, `source_name`, `source_reference` | De dónde viene (Hermes, ChatGPT, «lista de Christian», ficha 042…). |
| `observed_signals[]` | Señales de proceso/canal observadas. |
| `facts[]` | **Hechos** observados. |
| `inferences[]` | **Inferencias** deducidas de hechos. |
| `commercial_hypotheses[]` | **Hipótesis** comerciales (no son hechos). |
| `evidence_urls[]` | URLs de respaldo. |
| `contact{ name, role, email, phone, whatsapp, linkedin }` | Contacto **público y profesional**. |
| `proposed_solution`, `outreach_angle` | Solución propuesta (hipótesis) y ángulo de contacto. |
| `suggested_email`, `suggested_whatsapp` | Borradores traídos por la fuente (se revisan y, si no pasan, se reemplazan). |
| `external_score`, `external_score_scale`, `external_source` | Score de otra IA/fuente: **solo referencia, no cuenta**. |
| `fit_score`, `signal_score`, `reachability_score`, `priority_score` | Los calcula Atacama OS. |
| `status` | `analyzed → accepted → in_ghl → contacted` · `archived` · `discarded`. |
| *(registro)* `manual_override`, `manual_override_by`, `manual_override_reason` | Override humano. |

El JSON suelto de otras IAs se acepta con alias en español o inglés (`empresa/company`, `web/sitio/url/domain`, `rubro/industria/vertical`, `ciudad/location`, `correo/email`, `telefono/phone`, `hechos`, `hipotesis`, `solucion/offer`, `score/puntaje`…).

## 5. Scoring (simple y documentado, 0–100)

`priority_score = FIT (0–35) + SEÑAL (0–35) + ALCANCE (0–30)`. **El score externo no cuenta.**

| Componente | Pregunta | Cómo suma |
|---|---|---|
| **FIT** | ¿Atacama podría aportar valor razonablemente? | rubro objetivo +18 (desconocido +6) · proceso repetible visible (agenda, cotización, reservas, pedidos…) +8 · solución/hipótesis concreta +6 · enterprise/secundario −8 |
| **SEÑAL** | ¿Hay algo observable? | hechos que mencionan un proceso o canal: 1 → 8, 2 → 14, ≥3 → 18 · hechos descriptivos hasta +4 · canal explícito (WhatsApp/formulario/correo visible) +5 · detalle concreto (cifras, sucursales) +3 · URL propia/de evidencia +4 (+3 si el sitio se verificó) · inferencia o hipótesis defendible +5. Las **fichas de directorio** (Google Maps, OSM, rating) **no cuentan** como señal. |
| **ALCANCE** | ¿Tenemos cómo contactar? | mejor canal (correo específico 10, correo genérico `info@` 8, correo gratuito 6, WhatsApp 10, teléfono 8, LinkedIn/formulario 4) + segundo canal distinto +5 + persona o cargo identificado +6 + sitio propio +3 · **sin ningún canal: el total no pasa de 59** |

| Banda | Score | Significado |
|---|---|---|
| **alta** | 80–100 | Prioridad alta. **No** es «las únicas dignas de contactar». |
| **válida** | 60–79 | Prospecto válido para contactar. |
| **pendiente** | 40–59 | Interesante: requiere más investigación o un contacto. |
| **archivo** | <40 | Archivo / baja prioridad. |

### Criterio de entrada a GHL
**Entra a GHL (Investigado)** si: `priority_score ≥ 60` **y** tiene al menos un canal de contacto **y** al menos una señal observable **y** una hipótesis (o inferencia, o solución propuesta) **y** no existe ya en GHL. Todo lo demás queda guardado en Supabase **con el motivo**. Con `FORCE_IMPORT` se salta el score (ver §8), nunca el dedupe ni la validación básica.

### Calibración con un caso real (140 fichas de otros agentes, 7-oct-2026)
El archivo `ATACAMA_LABS_PROSPECTOS_CONTACTAR_TODOS.html` (4 formatos de ficha distintos) se usó como fixture; **no se importó nada**. Resultado: 140 fichas parseadas en ~2 s → **9 alta · 34 válida · 90 pendiente · 7 archivo**; **43 entrarían a GHL**. Las **43 que tienen algún canal de contacto salen todas ≥ 60** (mínimo 60); las **97 sin ningún canal nunca pasan de 59** (máximo 59). Histograma por decena: 30→7 · 40→51 · 50→39 · 60→8 · 70→26 · 80→9. Antes de calibrar, el primer borrador del scoring dejaba casi todo en 60–79 por contar descripciones de la empresa como señal, y el lote real de Hermes salía todo en 89; se corrigió dando más peso a los hechos con proceso observable y tratando como inferencia lo que no se pueda comprobar.

Muestra representativa (sin datos de contacto):

| Empresa | Fuente | Rubro | Canales | Fit | Señal | Alcance | Score | Banda | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| Clínica Ramis | Misión 2 | Salud | WhatsApp, correo | 32 | 28 | 24 | **84** | alta | entra a GHL |
| Mundo Cursos | Misión 2 | OTEC / e-learning | correo, WhatsApp | 32 | 28 | 24 | **84** | alta | entra |
| Reutter S.A. | Misión 1 | B2B insumos médicos | correo, teléfono | 32 | 28 | 22 | **82** | alta | entra |
| Rentalin | Misión 2 | Arriendo de maquinaria | WhatsApp, correo | 32 | 23 | 24 | **79** | válida | entra |
| Hidromec | Misión 2 | Mantención industrial | correo, teléfono | 32 | 23 | 22 | **77** | válida | entra |
| Audilex MR | Misión 2 | Contabilidad / servicios | teléfono | 32 | 28 | 17 | **77** | válida | entra |
| Comercial Alameda | Antofagasta (Maps) | Repuestos automotrices | WhatsApp | 32 | 22 | 19 | **73** | válida | entra |
| Hotel Magnolia | Prospección actual | Hotel boutique | correo | 32 | 22 | 17 | **71** | válida | entra |
| Centro Médico Angamos | Antofagasta (Maps) | Salud | teléfono | 32 | 17 | 17 | **66** | válida | entra |
| Casa Molle | Misión 2 | Hotel boutique | correo, teléfono | 32 | 11 | 22 | **65** | válida | entra |
| Salfa Rent | Misión 1 | Arriendo (cobertura nacional) | teléfono | 32 | 11 | 17 | **60** | válida | entra (límite) |
| Clínica Dental Océano | Antofagasta (Maps) | Salud | sin canal | 32 | 22 | 3 | **57** | pendiente | se queda en Supabase |
| Fauna Hotel | Misión 2 | Hotelería | sin canal | 32 | 19 | 3 | **54** | pendiente | se queda |
| Duoc UC / Sodimac / Lider.cl | Misión 1 | Enterprise | sin canal | 24 | 23–28 | 3 | **50–55** | pendiente | se quedan (enterprise, sin canal) |
| Mutant Gym / Veterinaria Fluffy | Antofagasta (Maps) | Gimnasio / veterinaria | sin canal | 32 | 12 | 3 | **47** | pendiente | se quedan (ficha de directorio, sin contacto) |
| Khipu | Misión 1 | Plataforma de pagos | sin canal | 20 | 14 | 3 | **37** | archivo | archivo |

## 6. Dedupe y seguridad de datos reales

- **Claves de identidad:** dominio → correo → teléfono (últimos 9 dígitos) → nombre + ubicación (el nombre solo **no** basta).
- **Se compara contra:** Supabase (`prospect_candidates`, `accounts` y `contacts` del camino Hermes, vía la RPC `gateway_lookup`), **contactos de GHL** y **oportunidades del pipeline** (leídos en vivo). También detecta duplicados **dentro del mismo lote**.
- **Nunca se modifica un contacto real existente.** Si ya existe en GHL → `duplicate_in_ghl`, se devuelve el estado y **no se escribe nada**. Los contactos se crean con `POST /contacts/` (GHL rechaza el duplicado); **no** se usa `upsert`.
- **Enriquecer con seguridad:** `import` con `options.enrich:true` sobre un duplicado solo **agrega una nota** al contacto existente (nunca campos ni oportunidad). Para crear una oportunidad sobre un contacto que ya existe hay que decirlo explícitamente: `act create_in_ghl` con `attach_to_existing:true`.
- **Candidatos ya guardados:** un nuevo `import` del mismo prospecto **suma** hechos/hipótesis y completa campos vacíos, pero no pisa datos existentes, ids de GHL ni estado.
- **Índice de GHL incompleto o no disponible** (más de 100 contactos u oportunidades, o error de la API): el Gateway **no crea nada en GHL** (falla cerrado) y lo informa. Nota: el listado de GHL tarda unos segundos en reflejar altas y bajas recientes.

## 7. Validación ligera (sin investigación profunda)

`options.validate`: **`none`** (por defecto en `analyze`, rápido y solo lectura) o **`light`** (por defecto en `import | prepare | act`). En `light`, por solicitud: hasta **15 sitios oficiales** (una sola página cada uno: ¿responde? ¿publica correo/teléfono/WhatsApp?; completa solo campos vacíos) y hasta **12 páginas citadas** para comprobar que una **cita** de otra IA realmente aparece. Una cita que no se puede comprobar (no aparece o la página no abre) **deja de ser HECHO y pasa a INFERENCIA**; no se descarta ni se inventa nada. Una URL individual (`urls[]`) produce un candidato con los hechos observados en su portada (título, descripción, contacto público) y **sin hipótesis inventada**: queda pendiente de hipótesis hasta que alguien (tú o una IA) la agregue.

## 8. Override humano y contactos hechos a mano

- **FORCE_IMPORT** — *«Esta empresa me interesa. Métela igual.»* (`action:"import"`, `options:{ "force_import":true, "manual_override_reason":"…", "by":"Christian" }`). Entra a GHL aunque el score sea 45; queda `manual_override=true`, `manual_override_by` y `manual_override_reason` en Supabase y la nota de GHL dice **ENTRADA MANUAL (FORCE_IMPORT) — motivo: …**. No salta el dedupe, ni el índice incompleto, ni la identidad mínima. El motivo es obligatorio (≥5 caracteres).
- **«Le escribí por Instagram»** → `act` con `log_instagram` (o `log_whatsapp`, `log_phone`, `mark_contacted` con `channel`). Registra canal, fecha, etapa **Contactado**, nota y tarea de seguimiento, **aunque Atacama OS no haya enviado el mensaje**.

## 9. Desde otras IAs y desde Hermes

Cualquier IA puede entregar un JSON con los campos del §4 (o parecidos) y llamar al endpoint. **Hermes** (prospect-radar v2) entra igual: su salida se adapta automáticamente (`evidence[]` → hechos (solo citas informativas) o inferencias; `signal` → señal observada; `pain`/`fit` → inferencias; `offer` → solución propuesta; `commercial_angle`/`why_now` → ángulo; `draft` → email sugerido; `contact.job_title/linkedin_url` → cargo/LinkedIn). **Hermes Prospect Radar sigue pausado** (`hermes cron resume 8421589d0902`); su optimización (Prospecting v2) es un bloque aparte.

## 10. Cómo importar un archivo

| Tienes… | Comando |
|---|---|
| HTML con fichas | `node scripts/prospecting/gateway.mjs analyze fichas.html` → `… import fichas.html` |
| JSON (array o `{ "prospects": […] }`) | `… analyze lista.json` → `… import lista.json --source "ChatGPT"` |
| CSV (`;` `,` o tab, con encabezado) | `… analyze lista.csv` |
| Texto con `Empresa:`, `Web:`, `Correo:`, `Hechos:`, `Hipótesis:` | `… analyze notas.txt` |
| Una o varias URLs | `… analyze https://sitio.cl` |
| Solo ver cómo puntúa, sin red | `node scripts/prospecting/gateway.mjs local archivo.html` |
| Registrar un contacto manual | `… act log_instagram --target clinica.cl --note "le escribí por DM"` |
| Forzar | `… import lista.json --force "me interesa igual, lo conozco"` |
| Un lote con ID fijo (reintentos seguros) | `… import lista.json --request-id mi-lote-007` |

El CLI usa `N8N_BASE_URL` y `ATACAMA_INGEST_KEY` (de `.env.local` o del entorno); sin `--request-id` genera uno estable a partir del contenido, de modo que **repetir el mismo comando no duplica nada**. Con `--json` imprime la respuesta completa.

## 11. Qué queda en GHL por cada prospecto que entra

- **Contacto:** nombre de la persona (o la empresa si no hay), correo/teléfono públicos, empresa, sitio; fuente `atacama-labs-prospect-gateway`; etiquetas `prospecto-gateway` y `prospecto-por-revisar`; *Origen detallado* = «Prospección outbound»; cargo.
- **Oportunidad** en `Atacama Labs — Ventas` / **Investigado**, con los campos que ya existían: *Fuente* (`outbound_manual`), *Solución de interés* (orientativa), *ICP / vertical*, *Evidencia URL*, *Canal de contacto*, *Qualification Score*, *Commercial Angle*, *Prospect Key*. No se crea ningún campo.
- **Nota de revisión** para entender en 60 segundos por qué escribirle: prioridad y sub-scores, origen, override si lo hubo, ángulo, solución propuesta, **HECHOS / INFERENCIAS / HIPÓTESIS rotulados**, fuentes, contacto, **borradores de email y WhatsApp marcados NO ENVIADO** y cómo decidir.
- **Tarea de revisión:** la crea la automatización nativa de GHL al entrar en Investigado.
- **Aprobación humana:** etiqueta `aprobado-para-contactar` (o `descartado-prospecto`). El envío por Gmail es el bloque siguiente.

## 12. Operación y límites

- Máximo 25 prospectos por `import`/`prepare`/`act`; 300 por `analyze`. Para listas más grandes: lotes con `request_id` distintos.
- Costo: **sin IA** (reglas deterministas): no consume tokens; solo llamadas a Supabase y GHL. Analizar 140 fichas tarda ~2 s.
- Los textos de otras IAs se tratan como **datos**, nunca como instrucciones.
- Pruebas: `node scripts/prospecting/gateway-core.test.mjs` · `gateway-flow.test.mjs` · `GATEWAY_REAL_HTML=<ruta> node n8n/build/prospect-gateway.test.mjs`. Calibrar con un HTML real: `node scripts/prospecting/calibrate.mjs <html> --detail`. El HTML real no está en el repo (contiene contactos); el repo trae un fixture sintético en `scripts/prospecting/fixtures/`.
- Rollback: desactivar el workflow 19; las tablas `prospect_candidates` y `prospect_gateway_log` pueden borrarse sin afectar nada más.

## Opciones agregadas por el operador de Hermes (7-oct-2026)
- `options.include_candidates: true` (solo `analyze`): la respuesta incluye `candidates[]` (los candidatos canónicos, en el mismo orden que `results[]`) para que Hermes pueda importar después «la 27» sin volver a parsear el archivo. Ver `docs/HERMES-OPERATOR.md`.
- `act.due_at` (`follow_up`): fecha exacta del seguimiento (`AAAA-MM-DD` → 15:00 UTC, o ISO completo); si no viene se usan `act.days` días hábiles como antes.

## Correcciones del 8-oct-2026 (Bloque 1)
- **Persistencia de lotes mixtos:** las filas de `prospect_candidates` se guardan agrupadas por conjunto de claves (PostgREST rechaza lotes con claves distintas); antes un lote con contactos creados y otros rechazados por GHL no persistía nada y respondía igual «creado». El error ahora se informa como `persist_error`.
- **Borradores:** `import` guarda los borradores (asunto, correo, WhatsApp) al crear el prospecto, para poder editarlos y aprobarlos con el motor de correo (`docs/OUTREACH.md`).
