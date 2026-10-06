# Atacama OS — continuidad (actualizado 6-oct-2026, noche)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas; Ganado/Perdido son los estados nativos `won`/`lost`. Modelo Business → Opportunity → **Servicio contratado** → **Proyecto** con asociaciones probadas.
- **Automatizaciones GHL (publicadas, probadas con datos TEST):** `Atacama — Tarea al investigar`, `— Tarea al responder`, `— Seguimiento de propuesta` (con la etiqueta `proxima-accion`) y `— Oportunidad ganada` (webhook a n8n 11 **+ 4 tareas de onboarding**). Sin duplicados.
- **Won → cliente:** n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`), `dry_run=true`, cero escrituras reales.
- **Dashboard `Atacama OS — Hoy`:** Tareas pendientes, Oportunidades por etapa y abiertas, Reuniones de la próxima semana, Respuestas por atender. Falta pulir el layout (cosmético).
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando. **Prospección** Hermes → 08 → 03 → 09 → 04 → 05 con 0 envíos.
- **Content Engine MVP (Bloque H):** fuente → idea → score (gate ≥70) → pieza → n8n `12 Content Intake` → GHL Social Planner `in_review`. 3 cuentas conectadas (Instagram, LinkedIn empresa, LinkedIn Christian). Nada se publica solo. **Hay 1 propuesta real esperando tu decisión** en Marketing → Social Planner → Planner (LinkedIn Christian, estado In Review).
- **Código:** rama `feat/frontend-v2-2-1` en origin; sin merge a `main`.

## Próximo bloque

**Alimentar el Content Engine y cerrar el ciclo de aprobación**
1. Christian decide la propuesta real en Social Planner (aprobar / editar / descartar) y copia al repo la **guía de publicaciones** y las **hojas de la llamita** (`brand/content/`).
2. Prompt de Hermes «señales de contenido» (fuentes verificadas → `content_sources`) y primera pieza `hermes_research`.
3. Sincronizar el estado de GHL (aprobado/programado/publicado) a `content_pieces` y guardar métricas a 24 h / 72 h / 7 d.
4. Render dentro de n8n y automatización comentario → recurso (CTA con keyword).

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
- Revisar la propuesta real en Social Planner; crear categorías y etiquetas en la UI (la API no puede); confirmar el usuario aprobador (hay dos «Christian Wevar»).
- Copiar la guía de publicaciones y las hojas de la llamita al repo.
- Gmail / dominio de envío.
- Bot de Telegram Atacama OS.
- Cuando exista el primer cliente real ganado: revisar el plan en `dry_run`, y recién entonces pasar `dry_run` a `false` en el webhook de GHL (Custom Data, valor `false`).
