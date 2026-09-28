# E2E de conversión — ejecutado ✅

`PRODUCTION_READINESS_SPEC_V1` §37–41. Ejecutado el 28-sep-2026 contra
`https://atacamalabs.cl` en producción, con autorización explícita de
Christian. Identidad de prueba: `QA Atacama` / `ATACAMA QA - BORRAR` /
`qa-atacama-borrar@example.com`. Todos los registros se borraron al
terminar (ver §"Limpieza").

## Flujo probado (Caso 3 — CTA desde /precios con plan)

1. Entrada real: `/precios` → CTA "Quiero este plan" (Esencial) →
   `/diagnostico?servicio=agentes&source=precios&section=agentes&cta=quiero-esencial&plan=esencial`.
2. Paso 1: interés "Vender" (comercial). Paso 2: nombre, empresa, email,
   WhatsApp, nota.
3. Envío → `lead_submissions` creado en Supabase (`b7825b39-…`, borrado
   después): `service=agentes`, `plan=esencial`, `interest=comercial`,
   `source_page=precios` — el contexto del CTA se conservó completo.
4. **Atribución de primera sesión funcionando de punta a punta**: el
   navegador había visitado antes `/rubros` en esta misma sesión;
   `diagnostic_data.landing_path` llegó como `"/rubros"` — confirma que
   persiste en `sessionStorage` y sobrevive hasta el registro real en
   Supabase (§22, verificado con un lead real, no solo en local).
5. `sync_jobs` lo tomó en ~18 s (`status: processing` → `succeeded`).
6. **GHL**: contacto creado (`bhvvCYX9MHpNd0bV0b33`) con nombre, email,
   teléfono y empresa correctos; oportunidad creada (`CrC8z2YEmxg5LLKuKOfW`)
   en el pipeline **Atacama Labs — Ventas**, etapa inicial **Nuevo**; nota
   generada con el contexto completo (servicio, plan, interés, origen,
   objetivo del agente, nota del usuario).
7. Reserva TEST creada vía la API de calendario de GHL (mismo efecto que
   reservar por el iframe embebido — ver nota abajo) para el 29-sep 18:30
   UTC.
8. **Booking Sync** (`07 Booking Sync`, corre cada 2 min) la detectó en
   **~100 segundos** (1 ciclo, dentro de la ventana esperada de ≤2 ciclos):
   - `meeting_scheduled = true`
   - `meeting_start = 2026-09-29T18:30:00+00:00`
   - `calendar_event_id = tCjLlywRwvUYImdDmIFS`
   - `calendar_provider = 'ghl'`
   - Oportunidad movida a etapa **Diagnóstico** en GHL.
9. **Idempotencia**: varios ciclos adicionales de Booking Sync corrieron
   mientras se verificaba (varios minutos de espera) — `calendar_event_id`
   y la etapa de la oportunidad no cambiaron ni se duplicaron.

## Nota sobre el paso 7 (agenda embebida)

El iframe de la agenda (GHL, `bookingUrl`) cargó correctamente con los
datos precargados del contacto (`first_name`, `last_name`, `email`,
`phone` en la URL del iframe — verificado por `src` real del `<iframe>`),
confirmando que el paso "el lead ya está guardado antes de mostrar la
agenda" funciona. La reserva en sí se hizo vía la API de calendario de GHL
en vez de clics dentro del iframe: el panel de navegador de esta sesión no
pudo renderizar visualmente el contenido del iframe (limitación de la
herramienta en esta sesión, no del sitio — el iframe sí cargaba, con la
URL y los parámetros correctos). El resultado es equivalente: ambos
caminos terminan creando el mismo tipo de evento en el mismo calendario,
que es exactamente lo que Booking Sync consume. Pendiente para una
próxima ronda: repetir el clic real dentro del iframe cuando el panel de
navegador renderice bien, para cubrir también la UX del clic en sí.

## Limpieza (todo borrado, confirmado)

- [x] Evento del calendario (`tCjLlywRwvUYImdDmIFS`) — GHL `DELETE`, `200`.
- [x] Oportunidad (`CrC8z2YEmxg5LLKuKOfW`) — GHL `DELETE`, `200`.
- [x] Contacto (`bhvvCYX9MHpNd0bV0b33`) — GHL `DELETE`, `200`; búsqueda
      posterior por email confirma 0 contactos.
- [x] `lead_submissions` y `sync_jobs` — Supabase `DELETE`; confirmado con
      `SELECT count(*) = 0` en ambas tablas.

## No ejecutado en esta ronda

- **§34–35 (validación/resiliencia de `/api/leads`: 413/422/429/409/503,
  honeypot)**: ya estaba implementado en el código antes de este spec
  (revisado por lectura de `src/app/api/leads/route.ts`), pero no se
  volvió a probar contra producción real en esta ronda para no gastar el
  rate limit real (5 solicitudes/10 min por IP) de un dominio que ya está
  en producción. Se puede probar contra un build local sin tocar el
  dominio real, en una próxima sesión.
- **Casos 1, 2, 4, 5, 6 de §33** (entrada directa, y CTA desde
  `/agentes`, `/paginas-web`, `/a-medida`, `/rubros`): no repetidos —
  comparten el mismo código de contexto (`cta-context.ts`) que el Caso 3
  ya probado, y el QA automatizado de Fase 3 ya verificó que cada CTA
  genera el `href` correcto hacia `/diagnostico`.

## Conclusión

Diagnóstico → Supabase → GHL → agenda → reunión funciona de punta a
punta en producción, sin duplicados, con la atribución de primera sesión
llegando hasta el lead real. **Gate D del spec: cerrado.**
