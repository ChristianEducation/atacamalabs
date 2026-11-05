# ASTER 2026 · Pruebas y evidencia (4-nov-2026)

## Hecho y verificado
| Prueba | Resultado |
|---|---|
| `node --test n8n/build/aster-demo.test.mjs` | 12/12: validación (consentimiento, correo, tipo, vacío, tamaño), folio/hora de Chile, tildes/ñ/comillas/emoji, estructura PDF (xref exacto), «No informado», nunca «cerrado», 8 tipos, idempotencia, errores honestos, workflow sin secretos. Ejecuta el **mismo JS** que viaja a n8n |
| Ejecución en el n8n real (copia desechable `ZZ-TEST…`, entrega simulada, **sin Drive ni Gmail**, borrada al terminar) | PDF generado en 0,8 s; mismo `request_id` → `duplicate:true` mismo folio; otro id → folio siguiente; sin consentimiento → `CONSENT_REQUIRED`; correo inválido → `INVALID_EMAIL`; vacío → `EMPTY_BODY` |
| PDF resultante | `ejemplo-pdf-generado-en-n8n.pdf` (datos ficticios): A4, logo, folio, fecha de emisión separada de «Fecha del hecho: No informado», acentos correctos en la capa de texto |

> La entrega (`email_status: sent`, `drive_status: saved`) de esa ejecución fue **simulada**: no demuestra que Drive ni Gmail funcionen.

## No probado todavía (bloqueado)
- Drive real, Gmail real con adjunto, rechazo sin llave en el workflow activo, herramienta en Lety, WhatsApp con audio, comprensión del audio, base de conocimiento, y la prueba de punta a punta. Estado: **NO VERIFICADO** hasta hacerlas.

## Checklist para cerrar (con dirección de correo propia y datos ficticios)
1. `node scripts/aster/smoke.mjs <correo>` → `status: completed`, PDF adjunto en la bandeja, archivo en `ATACAMA_DEMO_ASTER_2026`, carpeta sin enlace público, reintento `duplicate:true` sin segundo correo, sin llave → 403.
2. En Lety: 3 audios (técnico / prevencionista / jefe de turno) → documento correcto, máx. 3 preguntas, confirmación antes de enviar.
3. Sin correo → la herramienta no se llama; correo inválido → pide corrección; doble envío → un solo correo.
