# Atacama OS — continuidad (actualizado 7-oct-2026 · Bloque 3 cerrado, listo para activar)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas; Ganado/Perdido son los estados nativos `won`/`lost`. Modelo Business → Opportunity → **Servicio contratado** → **Proyecto** con asociaciones probadas.
- **Automatizaciones GHL (publicadas, probadas con datos TEST):** `Atacama — Tarea al investigar`, `— Tarea al responder`, `— Seguimiento de propuesta` (con la etiqueta `proxima-accion`) y `— Oportunidad ganada` (webhook a n8n 11 **+ 4 tareas de onboarding**). Sin duplicados.
- **Won → cliente:** n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`), `dry_run=true`, cero escrituras reales.
- **Dashboard `Atacama OS — Hoy`:** Tareas pendientes, Oportunidades por etapa y abiertas, Reuniones de la próxima semana, Respuestas por atender. Falta pulir el layout (cosmético).
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando.
- **Prospect Gateway (Bloque L, 7-oct):** puerta universal de prospectos — cualquier fuente (Hermes, otras IAs, HTML/JSON/CSV/texto/URL, Christian) → normalización → dedupe (Supabase + GHL) → scoring propio (fit + señal + alcance; **60+ entra a GHL**, 80+ es prioridad) → GHL *Investigado* con nota y borradores. Comandos `analyze | import | prepare | act`, `FORCE_IMPORT`, registro de contactos manuales; **`send_email` no ejecuta** (bloque Gmail). Workflow n8n `19` (`ZlYTYp9AVdCYPdwS`) + CLI `scripts/prospecting/gateway.mjs`. Guía: [`PROSPECT-GATEWAY.md`](PROSPECT-GATEWAY.md). Calibrado con las 140 fichas reales (no importadas): 43 entrarían a GHL. Hermes sigue pausado.
- **Gmail conectado (8-oct):** credencial `Atacama Labs - Gmail (envío)` (`christian.wevar@atacamalabs.cl`) en n8n 22 y 23, verificada con `gmail_check`; **`mode = off`**, lista blanca de envío (solo el correo de la prueba) y tope 1/día. Procedimiento de la autoprueba de UN envío a tu propio correo: [`OUTREACH.md`](OUTREACH.md) §8 (`scripts/outreach/self-test.mjs`). Pie legal temporal «Atacama Labs · atacamalabs.cl».
- **Bloque 1 COMPLETO (8-oct), listo para puesta en marcha:** motor de correo (borrador → aprobación con código → envío → respuesta), follow-up +3/+7 días hábiles (n8n 24), Prospección v2 de Hermes (Radar cargado y **pausado**, [`PROSPECTING-V2.md`](PROSPECTING-V2.md)) y **primer lote real de 14 prospectos en *Investigado*** con ángulo + borrador, sin contactar a nadie ([`PRIMER-LOTE.md`](PRIMER-LOTE.md)). **Envío real apagado** hasta tener buzón + credencial de Gmail + OK de Christian.
- **Bloque 1 · Parte 1 (8-oct): motor de correo** — borrador → aprobación con código → envío (n8n 22 + Gmail) → respuesta (n8n 23) → *Respondió*. Construido y probado en vivo en modo `test_sim`; **envío real apagado** (`outreach_config.mode = off`, sin credencial de Gmail). Guía y checklist: [`OUTREACH.md`](OUTREACH.md). Roadmap vigente: [`ATACAMA-OS-PROXIMOS-3-BLOQUES.md`](ATACAMA-OS-PROXIMOS-3-BLOQUES.md).
- **Bloque 3 — Cierre y blindaje (7-oct):** Atacama OS está **técnicamente listo**; solo falta la decisión explícita de encenderlo. Canal LinkedIn (n8n 26 + Waalaxy como ejecutor; la API no informa estados, los registra Hermes), Supabase blindado (revocación de funciones públicas), E2E completo probado y limpiado, despliegue seguro a la VPS, respaldos y documentación final. **Todo en [`ATACAMA-OS-ARQUITECTURA-FINAL.md`](ATACAMA-OS-ARQUITECTURA-FINAL.md)** (arquitectura, crons, activación en un paso, rollback y pendientes humanos).
- **Bloque 2 — Operación diaria (7-oct), OPERATIVO, envío real apagado:** n8n `25 Atacama Ops` (`OxLcj12RP0qLVLVc`, solo lectura) calcula; Hermes cron entrega sin IA: **Atacama Daily 08:30 Chile** (`atacama-daily`) y **alertas cada 15 min, silenciosas** (`atacama-alerts`). Hermes responde las 9 preguntas diarias con 8 herramientas MCP nuevas (35 en total). **Prospect Radar v2 ACTIVO en modo seguro** (mar y jue 10:30, compuerta de costo; solo deja prospectos en *Investigado*) y **Content Radar ACTIVO** (lunes 09:00, compuerta; nada se publica solo). Guía: [`OPERATIONS.md`](OPERATIONS.md).
- **Hermes como operador (Bloque M, 7-oct):** Christian opera Atacama OS por Telegram a través de Hermes: servidor MCP `atacama-os` (27 herramientas) → n8n `20 Hermes Operator` (`Pm5XfYBocmWR3YgY`) → Prospect Gateway / GHL / Supabase. **Hermes no tiene el token de GHL.** Niveles: 1 directo · 2 (FORCE_IMPORT, descartar) exige orden explícita + motivo · 3 (enviar/publicar/borrar) pide confirmación y **no ejecuta todavía**. Auditoría «Christian vía Hermes» en `operator_audit_log`. Guía: [`HERMES-OPERATOR.md`](HERMES-OPERATOR.md).
- **Prospección real por Hermes (Bloque K):** Hermes «Prospect Radar» (busca con n8n 17) → 08 (gate + citas que existen **y demuestran** el factor) → 03 (score) → **18 Prospect Admit** → GHL *Investigado* con contacto, oportunidad con campos, nota de revisión y borrador (solo score ≥ 80 + todos los gates; 60–79 se queda en Supabase). **Nada se envía** y nada pasa a *Contactado*. Aprobación: etiqueta de GHL `aprobado-para-contactar` / `descartado-prospecto` (el bloque siguiente la usa). Primera corrida real: 8 candidatos, 0 ≥ 80 (el mejor 50), ≈ US$ 0,75, 13 min. Job de Hermes **pausado**; 09, 04 y 05 antiguos sin uso.
- **Content Engine + Hermes + métricas (Bloques H–J):** Hermes `content-radar` → n8n `13` (gate de señales) → Supabase `content_sources` → pieza → n8n `12` → GHL Social Planner `in_review` → **Christian aprueba en GHL** → `scheduled` → `published` → n8n `14` sincroniza el estado cada 30 min (solo lectura en GHL) → n8n `15 Content Metrics` toma snapshots a 24 h / 72 h / 7 d (cada 3 h, solo si toca) → aprendizaje a 7 días → n8n `16 Content Learnings` lo expone a Hermes. Nada se aprueba ni se publica solo.
- **Publicaciones programadas (aprobadas por Christian el 6-oct):** Founder · LinkedIn Christian → **7-oct 16:00 (Chile)**; Atacama Labs · LinkedIn empresa → **8-oct 10:00 (Chile)**. Job del radar de Hermes pausado.
- **Cadencia editorial objetivo:** Día A = LinkedIn personal Christian + Instagram Atacama Labs · Día B = LinkedIn Atacama Labs · Día C = descanso · repetir. **No se fuerza publicación si no existe contenido con score ≥ 70.** (7-oct = A, 8-oct = B, 9-oct = C.)
- **Código:** rama `feat/frontend-v2-2-1` en origin; sin merge a `main`.

## Próximo paso

**Poner en marcha el Bloque 1** (acciones de Christian, en este orden; ver `OUTREACH.md` §5): 1) elegir el buzón remitente; 2) crear la credencial OAuth de Gmail en n8n; 3) datos legales del pie; 4) autorizar un único envío de prueba a su propio correo; 5) primeros 3–5 contactos controlados del lote 1 (aprobando de a uno por Telegram).
Bloques 1–3 **cerrados**. Siguiente y único paso: la decisión de encendido comercial (`scripts/ops/activate-commercial.mjs`, ver arquitectura §9) y los pendientes humanos de §10 (campaña de Waalaxy, pie legal, interruptor Won→Cliente).

## Decisiones actuales

- GHL es el centro operativo diario.
- n8n es el orquestador.
- Supabase guarda research, scoring y logs.
- Hermes es el investigador principal.
- OpenClaw queda fuera de la ruta crítica.
- EnBandeja es legacy (no se borra).
- **No activar `dry_run=false` hasta el primer cliente real ganado.**
- **No habilitar todavía la vía 60–79** hasta tener visible el flujo de revisión.

## Pendientes manuales importantes

- Borrar las 5 tareas `(Example)` de GHL y revisar que las tareas queden asignadas al usuario correcto (hay dos «Christian Wevar»).
- Pulir el layout del dashboard (mover/achicar *Respuestas por atender*).
- Reanudar el radar de **contenido** de Hermes (`a46bd3138a0b`, hoy pausado) cuando haga falta material nuevo; recomendado: 1 vez por semana (lunes).
- El job de **prospección** de Hermes (`8421589d0902`, «Prospect Radar») está **pausado**; reanudar solo cuando la investigación produzca prospectos ≥ 80 (`hermes cron resume 8421589d0902`; sugerido: martes y jueves, máx. 10 candidatos ≈ US$ 0,75 por corrida).
- Para meter prospectos: darle el archivo a Claude con «Analiza esto y mete a GHL las que valgan la pena» (usa `scripts/prospecting/gateway.mjs`; ver `docs/PROSPECT-GATEWAY.md`).
- Revisar en GHL los prospectos que lleguen a *Investigado* (nota del contacto) y decidir con la etiqueta `aprobado-para-contactar` o `descartado-prospecto`.
- Aprobar cada pieza nueva con **Approve** (⋮ de la fila en Planner); recordar que **Edit no aprueba**.
- Gmail / dominio de envío.
- Bot de Telegram Atacama OS.
- Cuando exista el primer cliente real ganado: revisar el plan en `dry_run`, y recién entonces pasar `dry_run` a `false` en el webhook de GHL (Custom Data, valor `false`).
