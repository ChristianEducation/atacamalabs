# Atacama OS — continuidad (actualizado 6-oct-2026, tarde)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas; Ganado/Perdido son los estados nativos `won`/`lost`. Modelo Business → Opportunity → **Servicio contratado** → **Proyecto** con asociaciones probadas.
- **Automatizaciones GHL (publicadas, probadas con datos TEST):** `Atacama — Tarea al investigar`, `— Tarea al responder`, `— Seguimiento de propuesta` (con la etiqueta `proxima-accion`) y `— Oportunidad ganada` (webhook a n8n 11 **+ 4 tareas de onboarding**). Sin duplicados.
- **Won → cliente:** n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`), `dry_run=true`, cero escrituras reales.
- **Dashboard `Atacama OS — Hoy`:** Tareas pendientes, Oportunidades por etapa y abiertas, Reuniones de la próxima semana, Respuestas por atender. Falta pulir el layout (cosmético).
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando. **Prospección** Hermes → 08 → 03 → 09 → 04 → 05 con 0 envíos.
- **Código:** rama `feat/frontend-v2-2-1` en origin; sin merge a `main`.

## Próximo bloque

**Social Planner / Instagram / LinkedIn** (requiere que Christian conecte las cuentas en GHL: hoy hay 0 conectadas). Después, en este orden:
1. Prospección Hermes → Supabase → GHL (decidir la vía 60–79 cuando el flujo de revisión sea visible).
2. Gmail / aprobación / envío / replies.
3. Atacama Daily + bot de Telegram.

Antes de seguir conviene, en 5 minutos: borrar las 5 tareas de ejemplo de GHL (ensucian el dashboard), elegir qué «Christian Wevar» es el usuario real (hay dos) y pulir el layout del dashboard.

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
- Conectar Instagram y LinkedIn en Social Planner.
- Gmail / dominio de envío.
- Bot de Telegram Atacama OS.
- Cuando exista el primer cliente real ganado: revisar el plan en `dry_run`, y recién entonces pasar `dry_run` a `false` en el webhook de GHL (Custom Data, valor `false`).
