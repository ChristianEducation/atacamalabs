# Prospección v2 de Hermes (Bloque 1, parte 3) — Radar listo, PAUSADO

> **En una línea.** Hermes investiga de forma *intermedia* (señales razonables, no «dolor demostrado»), separa hecho / inferencia / hipótesis y entrega todo por **una sola puerta: el Prospect Gateway**. El Radar queda cargado con este prompt y **pausado** (`8421589d0902`); se reactiva solo cuando Christian lo decida (Bloque 2).

## 1. Qué cambió respecto de v1

| | v1 (Bloque K) | **v2 (hoy)** |
|---|---|---|
| Criterio | Probar con citas que la empresa *necesita* Atacama (gate de evidencia) | **Fit razonable + señal observable + hipótesis defendible + canal público** |
| Entrada | `08 ingest → 03 score → 18 admit` | **Prospect Gateway** (`analyze` → `import`), igual que cualquier otra fuente |
| Resultado real | 8 candidatos, **0** llegaron a GHL, ≈ US$ 0,75, 13 min | 8 candidatos analizados, **US$ 0,19, 4 min** |
| Presupuesto | 10 candidatos / 30 búsquedas / 45 llamadas | **6 candidatos / 16 búsquedas / 30 llamadas / 12 min / 2 páginas por empresa** |
| Importa a GHL | solo ≥ 80 con todos los gates | los que el Gateway marca `create_in_ghl` (≥ 60 con canal + señal + hipótesis) y cumplen la regla de señal verdadera; **máx. 5 por corrida** |
| Modo | solo producción | `MODO=analyze` (solo lectura, para validar) o `MODO=import` |

El scoring del Gateway **no cambió** (fit 35 + señal 35 + alcance 30; alta ≥ 80, válida 60–79, pendiente 40–59, archivo < 40). El camino v1 (08 → 03 → 18) sigue existiendo, sin uso.

## 2. Reglas de investigación (en `ops/hermes/prospect-radar-v2.prompt.txt`)

- **HECHO** = observado en una página con URL y **cita literal** (≥ 4 palabras; el Gateway abre la URL y, si la cita no aparece, la degrada a inferencia). **INFERENCIA** = deducida de hechos. **HIPÓTESIS COMERCIAL** = lo que Atacama podría hacer; nunca se presenta como hecho.
- **Señal verdadera vs relleno:** una cita que solo describe a la empresa («nuestro compromiso es el más alto nivel de servicio») **no** es señal. Cada candidato necesita **2 hechos observados** y **al menos uno que describa un proceso**: cómo se agenda/reserva/cotiza/consulta (botón, formulario, WhatsApp, teléfono), horario acotado, varios servicios o sedes, o una vacante de atención.
- **Contacto**: solo público y de la propia empresa (correo > WhatsApp > teléfono); sin contacto público se descarta; nunca se adivinan correos.
- **Borrador** (solo texto, jamás se envía): hecho verificable + una hipótesis marcada + un resultado posible + una pregunta; sin «chatbot», sin afirmar problemas no demostrados.
- **Costo/profundidad:** presupuesto duro por corrida (arriba), una lectura por página, `known-domains` para no repetir.

## 3. Calibración con las 140 fichas reales (sin tocar el scoring)

`node scripts/prospecting/calibrate.mjs <html>` (solo lectura): 9 alta · 34 válida · 90 pendiente · 7 archivo; **43** pasan al CRM. Lo que enseñó (y está en el prompt):

| Fuente de las fichas | Promedio | Con canal | Lectura |
|---|---|---|---|
| Misión 2 — cerrables (30) | **73** | **24** (17 WhatsApp, 18 correo) | las mejores: canal público + proceso visible + varios servicios/sedes |
| Prospección actual (10) | 60 | 5 | mezcla |
| Misión 1 — 50 prospectos | 56 | 12 | bajo por falta de canal |
| Google Maps Antofagasta (50) | 48 | **2** | fichas de directorio sin correo/WhatsApp casi nunca califican |

→ el Radar v2 exige canal público y proceso observable, y descarta fichas de directorio.

## 4. Validación en vivo (7-oct, `MODO=analyze`, sin importar nada)

- **Corrida 1:** 10 búsquedas, 15 páginas, 8 candidatos reales del norte (Antofagasta/Calama) con contacto público; **US$ 0,187** (155 k tokens de entrada, 14 k de salida, Gemini 3.7 Flash), 4 min. Los 8 calificaron (81–86). **Hallazgo:** la evidencia era delgada (citas genéricas de misión puntuaban como «señal»; inferencias con cita vacía). No es un bug de scoring (así puntúan también las fichas reales con un hecho + canal), pero con importación automática dejaría pasar candidatos flojos.
- **Corrección:** regla «señal verdadera vs relleno» (2 hechos + 1 proceso observable), inferencias con `finding`, tope de 6 candidatos y **máx. 5 importaciones por corrida**. Guardas cubiertas por `node ops/hermes/radar-prompt.test.mjs` (9).
- **Corrida 2 (prompt endurecido):** 6 candidatos analizados (Antofagasta, Calama, Iquique), **US$ 0,20**, 4,7 min, 18 llamadas al modelo; 6 de 6 con **2 hechos de páginas distintas y un proceso observable** (horario + formulario de cotización, «agenda tu hora», plazo de 24 h para cotizar, cupos de urgencia). Descartó 4 con motivo razonable: sitio plantilla con contacto ficticio, sin proceso diferenciado, sin correo directo y un dominio ya conocido. El Gateway detectó un duplicado previo en Supabase (dedupe funcionando). Quedó en *analyze*: no se importó nada.
- Los dominios de ambas corridas de validación se **sacaron** de `atacama-known-domains.txt` (no se importaron; no deben quedar vetados).

## 5. Estado y activación

- Job `8421589d0902` «Atacama Labs — Prospect Radar»: **PAUSADO**, con el prompt v2 (`MODO=import`), modelo `google/gemini-3.7-flash`, horario `0 11 * * 1-5` (L-V 11:00), herramientas web/file/terminal (sin MCP: usa `curl` al Gateway). Entrega el resumen al Telegram de Christian.
- **Reanudar (solo cuando Christian lo decida):** `hermes cron resume 8421589d0902`. Costo esperado ≈ US$ 0,2–0,4 por corrida. Recomendación: primero una semana con `MODO=analyze` (editar la primera línea del prompt del job) y revisar el resumen en Telegram.
- **Rollback / pausa:** `hermes cron pause 8421589d0902`. Todo lo que entra queda en *Investigado* con nota de revisión: nada se envía ni pasa a *Contactado* sin aprobación.
- **Hermes no es la única fuente:** listas de otras IAs, HTML/CSV/JSON, URLs y entradas manuales siguen entrando por el mismo Gateway (`analyze_prospects` / `import_prospects` desde Telegram).

## 6. Actualización Bloque 2 (7-oct-2026) — Radar ACTIVO en modo seguro

- **Estado:** el job `8421589d0902` quedó **ACTIVO**, entregando a Telegram. Horario **martes y jueves 13:30 UTC (10:30 Chile)**, con **compuerta previa** (`radar_gate.sh` → n8n `25 Atacama Ops`, acción `radar_gate`): se salta si hubo una corrida OK en las últimas 20 h, ya hubo 3 en la semana, o hay ≥ 25 prospectos en Investigado sin decisión; si corre, `max_imports = min(5, 25 − backlog)`. Lo omitido queda en `ops_runs` como `skipped` y no gasta IA (el agente responde `[SILENT]`).
- **Prompt:** primera línea `MODO=auto` (obedece la compuerta), reporte final a `atacama-ops` (`radar_report`, queda en `ops_runs`). Todo lo demás igual (señal verdadera, hecho/inferencia/hipótesis, único camino = Prospect Gateway).
- **Modo seguro:** investiga → analiza → importa a GHL **Investigado** con nota y borradores para revisión. No envía, no aprueba, no mueve a Contactado. `outreach_config.mode` sigue `off`.
- **Primera corrida real (7-oct, 12:02 Chile):** 6 búsquedas, 10 páginas, 5 candidatos → 5 importados (Maxservicios 91, Laboratorio Clínico Luis Pasteur Antofagasta 91, EDL Servicios y Maquinarias 91, SETECMA 85, Sel Otec 85), 3 min. Costo informado por el agente: US$ 0,04 (la validación anterior midió ≈ US$ 0,19–0,20; se toma el rango alto como referencia presupuestaria).
- **Dónde se ve:** `get_radar_new` / el Daily («Prospección: N candidatos nuevos…»). Los prospectos esperan decisión de Christian en *Investigado*.
- **Pausa / rollback:** `hermes cron pause 8421589d0902`.
- Detalle operativo y de costos: [`OPERATIONS.md`](OPERATIONS.md).

## 7. Persona y LinkedIn (Bloque 3)
- El prompt del Radar pide `contact.name` + `contact.job_title` reales y, si la empresa o una búsqueda enlaza un perfil **personal** de LinkedIn, `contact.linkedin_url` con `linkedin_source_url` (la página donde se vio). Prohibido adivinar URLs, usar páginas de empresa o scrapear LinkedIn. El Gateway normaliza (`normLinkedInProfile`) y descarta lo que no sea `/in/<perfil>`.
- El canal lo decide Atacama OS (`recommendChannel`): LinkedIn solo con persona + cargo confiable + perfil verificable + evidencia; si no, correo o «investigar más». Hoy 0 de 19 prospectos cumplen para LinkedIn.
