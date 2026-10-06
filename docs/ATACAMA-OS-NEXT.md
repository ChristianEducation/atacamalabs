# Atacama OS — continuidad (actualizado 6-oct-2026, noche)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas; Ganado/Perdido son los estados nativos `won`/`lost`. Modelo Business → Opportunity → **Servicio contratado** → **Proyecto** con asociaciones probadas.
- **Automatizaciones GHL (publicadas, probadas con datos TEST):** `Atacama — Tarea al investigar`, `— Tarea al responder`, `— Seguimiento de propuesta` (con la etiqueta `proxima-accion`) y `— Oportunidad ganada` (webhook a n8n 11 **+ 4 tareas de onboarding**). Sin duplicados.
- **Won → cliente:** n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`), `dry_run=true`, cero escrituras reales.
- **Dashboard `Atacama OS — Hoy`:** Tareas pendientes, Oportunidades por etapa y abiertas, Reuniones de la próxima semana, Respuestas por atender. Falta pulir el layout (cosmético).
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando. **Prospección** Hermes → 08 → 03 → 09 → 04 → 05 con 0 envíos.
- **Content Engine + Hermes (Bloques H–I):** Hermes `content-radar` → n8n `13` (gate de señales: URL abierta, cita literal, frescura, duplicados, score ≥70) → Supabase `content_sources` → pieza → n8n `12` → GHL Social Planner `in_review` → n8n `14` sincroniza el estado a `content_pieces` cada 30 min (solo lectura en GHL). Guía editorial y llamita en `brand/content/`. Nada se publica solo. **Hay 2 piezas reales esperando tu decisión** en Social Planner → Planner (Founder en LinkedIn Christian · Noticia en LinkedIn Atacama Labs). El job del radar está pausado.
- **Código:** rama `feat/frontend-v2-2-1` en origin; sin merge a `main`.

## Próximo bloque

**Ciclo de aprobación y métricas del Content Engine**
1. Christian decide las 2 piezas reales (aprobar / editar / descartar) y crea las etiquetas en la UI; se confirma que aprobado → programado → publicado se refleja en Supabase.
2. Métricas a 24 h / 72 h / 7 d (`statistics` de GHL) hacia `content_pieces`, y decidir la cadencia del radar (hoy pausado).
3. Fuentes renderizadas con JavaScript (changelog de GHL): verificarlas con otra fuente oficial o con render de página.
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
- Decidir las 2 piezas reales en Social Planner; crear las etiquetas (texto, imagen, carrusel, demo, reel) desde el compositor de un post (las 6 categorías ya existen); confirmar que `c.wevarh@gmail.com` es quien aprueba.
- Decidir si el radar de Hermes corre solo (reanudar el job `a46bd3138a0b`) o a demanda.
- Gmail / dominio de envío.
- Bot de Telegram Atacama OS.
- Cuando exista el primer cliente real ganado: revisar el plan en `dry_run`, y recién entonces pasar `dry_run` a `false` en el webhook de GHL (Custom Data, valor `false`).
