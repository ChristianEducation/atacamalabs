# E2E de conversión — pendiente (Fase 4)

`PRODUCTION_READINESS_SPEC_V1` §37–41. No ejecutado todavía.

Este test crea/borra un lead ficticio en el Supabase compartido con
EnBandeja, un contacto/oportunidad reales en GHL, y hace una reserva TEST
en el calendario real — son acciones de producción. Se ejecutan solo con
autorización explícita de Christian para esta ronda (más allá del permiso
general del proyecto), y usando identidad claramente ficticia
(`QA Atacama` / `ATACAMA QA - BORRAR`), con limpieza de todos los registros
al terminar.

## Pendiente de confirmar antes de correr

- [ ] OK explícito para crear/borrar un lead de prueba (Supabase + GHL).
- [ ] OK explícito para reservar y luego cancelar un horario TEST en el
      calendario real (Booking Sync corre cada 2 min; el test espera ≥2
      ciclos, ~4 min).
- [ ] Confirmar a quién avisar si `07 Booking Sync` falla repetidamente
      (§40 — alerta operacional).

## Qué se probará

1. Caso 1–7 de §33 (entrada directa, por agente, por plan, por rubro con
   `industry`, atribución UTM persistida).
2. Validación de `/api/leads` (§34–35): campos vacíos, email/teléfono
   inválidos, payload >16 KB (413), JSON inválido (422), honeypot,
   rate limit (429 tras 5 solicitudes/10 min), replay idempotente (200),
   conflicto de idempotencia (409).
3. Flujo completo diagnóstico → Supabase → GHL → agenda → reserva TEST →
   Booking Sync → `meeting_scheduled=true` → oportunidad en etapa
   Diagnóstico (§38).
4. Fallback si la agenda no carga (§39): el lead ya guardado no se pierde.

Se ejecuta en la siguiente sesión de trabajo, cuando Christian confirme.
