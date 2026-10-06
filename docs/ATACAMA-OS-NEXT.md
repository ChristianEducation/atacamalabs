# Atacama OS — continuidad (actualizado 6-oct-2026, noche · Bloque J)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas; Ganado/Perdido son los estados nativos `won`/`lost`. Modelo Business → Opportunity → **Servicio contratado** → **Proyecto** con asociaciones probadas.
- **Automatizaciones GHL (publicadas, probadas con datos TEST):** `Atacama — Tarea al investigar`, `— Tarea al responder`, `— Seguimiento de propuesta` (con la etiqueta `proxima-accion`) y `— Oportunidad ganada` (webhook a n8n 11 **+ 4 tareas de onboarding**). Sin duplicados.
- **Won → cliente:** n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`), `dry_run=true`, cero escrituras reales.
- **Dashboard `Atacama OS — Hoy`:** Tareas pendientes, Oportunidades por etapa y abiertas, Reuniones de la próxima semana, Respuestas por atender. Falta pulir el layout (cosmético).
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando. **Prospección** Hermes → 08 → 03 → 09 → 04 → 05 con 0 envíos.
- **Content Engine + Hermes + métricas (Bloques H–J):** Hermes `content-radar` → n8n `13` (gate de señales) → Supabase `content_sources` → pieza → n8n `12` → GHL Social Planner `in_review` → **Christian aprueba en GHL** → `scheduled` → `published` → n8n `14` sincroniza el estado cada 30 min (solo lectura en GHL) → n8n `15 Content Metrics` toma snapshots a 24 h / 72 h / 7 d (cada 3 h, solo si toca) → aprendizaje a 7 días → n8n `16 Content Learnings` lo expone a Hermes. Nada se aprueba ni se publica solo.
- **Publicaciones programadas (aprobadas por Christian el 6-oct):** Founder · LinkedIn Christian → **7-oct 16:00 (Chile)**; Atacama Labs · LinkedIn empresa → **8-oct 10:00 (Chile)**. Job del radar de Hermes pausado.
- **Cadencia editorial objetivo:** Día A = LinkedIn personal Christian + Instagram Atacama Labs · Día B = LinkedIn Atacama Labs · Día C = descanso · repetir. **No se fuerza publicación si no existe contenido con score ≥ 70.** (7-oct = A, 8-oct = B, 9-oct = C.)
- **Código:** rama `feat/frontend-v2-2-1` en origin; sin merge a `main`.

## Próximo bloque

**Primera lectura real de métricas y producción continua del calendario A/B/C**
1. Tras las publicaciones del 7 y 8-oct: confirmar que el sync marca `published` + `published_at`, y que el 8-oct ~16:00 (Chile) se guarda el primer snapshot de 24 h (revisar `content_metrics` y qué trae realmente `post.insights`; ajustar el parser si GHL entrega otros campos).
2. Producir el contenido del Día A siguiente (LinkedIn personal + Instagram, **este último necesita imágenes renderizadas**) y del Día B, solo si hay material con score ≥ 70; reanudar el radar de Hermes **una vez por semana (lunes)** cuando haga falta material.
3. A los 7 días (14-oct): revisar los primeros aprendizajes (`node scripts/content/learnings.mjs`) — con n pequeño son tentativos.
4. Pendientes técnicos: render dentro de n8n, automatización comentario → recurso (CTA con keyword), fuentes renderizadas con JavaScript (changelog de GHL).

Después (sin cambios): prospección Hermes → Supabase → GHL (vía 60–79 solo cuando el flujo de revisión sea visible), Gmail / aprobación / envío / replies, Atacama Daily + bot de Telegram.

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
- Reanudar el radar de Hermes (`a46bd3138a0b`, hoy pausado) cuando haga falta material nuevo; recomendado: 1 vez por semana (lunes), nunca diario mientras la aprobación sea manual.
- Aprobar cada pieza nueva con **Approve** (⋮ de la fila en Planner); recordar que **Edit no aprueba**.
- Gmail / dominio de envío.
- Bot de Telegram Atacama OS.
- Cuando exista el primer cliente real ganado: revisar el plan en `dry_run`, y recién entonces pasar `dry_run` a `false` en el webhook de GHL (Custom Data, valor `false`).
