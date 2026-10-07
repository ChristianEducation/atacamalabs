# Atacama OS — continuidad (actualizado 7-oct-2026 · Bloque L)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas; Ganado/Perdido son los estados nativos `won`/`lost`. Modelo Business → Opportunity → **Servicio contratado** → **Proyecto** con asociaciones probadas.
- **Automatizaciones GHL (publicadas, probadas con datos TEST):** `Atacama — Tarea al investigar`, `— Tarea al responder`, `— Seguimiento de propuesta` (con la etiqueta `proxima-accion`) y `— Oportunidad ganada` (webhook a n8n 11 **+ 4 tareas de onboarding**). Sin duplicados.
- **Won → cliente:** n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`), `dry_run=true`, cero escrituras reales.
- **Dashboard `Atacama OS — Hoy`:** Tareas pendientes, Oportunidades por etapa y abiertas, Reuniones de la próxima semana, Respuestas por atender. Falta pulir el layout (cosmético).
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando.
- **Prospect Gateway (Bloque L, 7-oct):** puerta universal de prospectos — cualquier fuente (Hermes, otras IAs, HTML/JSON/CSV/texto/URL, Christian) → normalización → dedupe (Supabase + GHL) → scoring propio (fit + señal + alcance; **60+ entra a GHL**, 80+ es prioridad) → GHL *Investigado* con nota y borradores. Comandos `analyze | import | prepare | act`, `FORCE_IMPORT`, registro de contactos manuales; **`send_email` no ejecuta** (bloque Gmail). Workflow n8n `19` (`ZlYTYp9AVdCYPdwS`) + CLI `scripts/prospecting/gateway.mjs`. Guía: [`PROSPECT-GATEWAY.md`](PROSPECT-GATEWAY.md). Calibrado con las 140 fichas reales (no importadas): 43 entrarían a GHL. Hermes sigue pausado.
- **Prospección real por Hermes (Bloque K):** Hermes «Prospect Radar» (busca con n8n 17) → 08 (gate + citas que existen **y demuestran** el factor) → 03 (score) → **18 Prospect Admit** → GHL *Investigado* con contacto, oportunidad con campos, nota de revisión y borrador (solo score ≥ 80 + todos los gates; 60–79 se queda en Supabase). **Nada se envía** y nada pasa a *Contactado*. Aprobación: etiqueta de GHL `aprobado-para-contactar` / `descartado-prospecto` (el bloque siguiente la usa). Primera corrida real: 8 candidatos, 0 ≥ 80 (el mejor 50), ≈ US$ 0,75, 13 min. Job de Hermes **pausado**; 09, 04 y 05 antiguos sin uso.
- **Content Engine + Hermes + métricas (Bloques H–J):** Hermes `content-radar` → n8n `13` (gate de señales) → Supabase `content_sources` → pieza → n8n `12` → GHL Social Planner `in_review` → **Christian aprueba en GHL** → `scheduled` → `published` → n8n `14` sincroniza el estado cada 30 min (solo lectura en GHL) → n8n `15 Content Metrics` toma snapshots a 24 h / 72 h / 7 d (cada 3 h, solo si toca) → aprendizaje a 7 días → n8n `16 Content Learnings` lo expone a Hermes. Nada se aprueba ni se publica solo.
- **Publicaciones programadas (aprobadas por Christian el 6-oct):** Founder · LinkedIn Christian → **7-oct 16:00 (Chile)**; Atacama Labs · LinkedIn empresa → **8-oct 10:00 (Chile)**. Job del radar de Hermes pausado.
- **Cadencia editorial objetivo:** Día A = LinkedIn personal Christian + Instagram Atacama Labs · Día B = LinkedIn Atacama Labs · Día C = descanso · repetir. **No se fuerza publicación si no existe contenido con score ≥ 70.** (7-oct = A, 8-oct = B, 9-oct = C.)
- **Código:** rama `feat/frontend-v2-2-1` en origin; sin merge a `main`.

## Próximo bloque

**Gmail y envío con aprobación humana** (Hermes sigue pausado)
1. Decidir qué importar de las 140 fichas: `node scripts/prospecting/gateway.mjs analyze <html>` y luego `import` en lotes de ≤25 (cada prospecto entra a *Investigado* con nota y borradores; nada se envía).
2. Gmail: dominio de envío, DNS (SPF/DKIM/DMARC), OAuth (acción tuya) — ver `docs/GMAIL-OUTREACH-PLAN.md`.
3. `send_email` real del Gateway (interfaz ya definida), disparado por la etiqueta `aprobado-para-contactar`; hilos, respuestas, bajas y paso a *Contactado*.
4. Luego: Prospecting v2 de Hermes (usando el Gateway como puerta) y las primeras lecturas reales de métricas de contenido.

Después (sin cambios): Atacama Daily + bot de Telegram.

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
