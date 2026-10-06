# Atacama OS — continuidad (6-oct-2026)

Detalle completo, IDs y rollback: [`ATACAMA-OS-IMPLEMENTATION.md`](ATACAMA-OS-IMPLEMENTATION.md) (checkpoint al final).

## Estado actual

- **GHL como CRM operativo:** pipeline `Atacama Labs — Ventas` con 7 etapas (Nuevo, Investigado, Contactado, Respondió, Diagnóstico, Propuesta, Seguimiento); Ganado/Perdido son los estados nativos `won`/`lost`.
- **Modelo:** Business → Opportunity → **Servicio contratado** → **Proyecto**, con las asociaciones creadas y probadas.
- **Lead Sync** (inbound → *Nuevo*) y **Booking Sync** (reserva → *Diagnóstico*) funcionando.
- **Won → cliente:** workflow GHL `Atacama — Oportunidad ganada` (publicado) → n8n `11 Won to Client` (activo, `jB62BWlu1Eg6BEuD`). Prueba real con datos TEST: **PASS**, `opportunity_id` correcto, `dry_run=true`, **cero escrituras**, TEST eliminado.
- **Prospección:** Hermes → 08 Ingest → 03 Qualification → 09 Approve → 04 CRM Sync → 05 Draft, con 0 envíos. Atacama Daily en vista previa.
- **Código:** rama `feat/frontend-v2-2-1` subida a origin (`23c2936`); sin merge a `main`.

## Próximo bloque

**Tareas automáticas internas de GHL** (workflows nativos, por interfaz; especificación exacta en la sección E4 del documento de implementación):
1. Al entrar a *Investigado* → «Revisar prospecto: {empresa}», 1 día.
2. Al pasar a *Respondió* → «Revisar respuesta y definir próximo paso», 1 día.
3. Al pasar a *Propuesta* → «Seguimiento de propuesta», 3 días (salvo etiqueta `proxima-accion`).
4. Agregar las 4 tareas de onboarding a `Atacama — Oportunidad ganada` (sección E5).

Después, en este orden:
1. Dashboard `Atacama OS — Hoy`.
2. Social Planner / Instagram / LinkedIn.
3. Prospección Hermes → Supabase → GHL.
4. Gmail / aprobación / envío / replies.
5. Atacama Daily.

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

- Tareas automáticas de etapa en GHL.
- Tareas de onboarding en el workflow Won.
- Dashboard.
- Conectar Instagram y LinkedIn.
- Gmail.
- Bot de Telegram Atacama OS.
