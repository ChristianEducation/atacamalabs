# Contacto preparado — de «Investigado» a «próxima acción» (9-oct-2026)

**Regla:** un prospecto válido en Investigado no puede quedarse esperando. Cada uno termina en una de estas salidas visibles (la métrica crítica es **Investigados válidos sin acción**, objetivo 0):

| Salida | Qué significa | Dónde se ve |
|---|---|---|
| **EMAIL LISTO** (`email_listo` / `email_aprobado`) | Hay un borrador de correo (cualquier correo empresarial publicado, también `info@`/`contacto@`), con score de calidad | `/ops` → Aprobaciones y Control |
| **LINKEDIN LISTO** (`linkedin_listo`) | Invitación + mensaje + enlace del perfil, para enviar a mano | `/ops` → Control → «LinkedIn por enviar» |
| **LinkedIn / Waalaxy en curso** | Ya se contactó (Christian lo confirmó) | Control |
| **BUSCAR CONTACTO** (`buscar_contacto`) | Sin correo ni LinkedIn: queda redactado el mensaje; solo falta pegar el contacto | Control → «Buscar contacto» |
| **EN ESPERA / NO CONTACTAR** | Solo con una **razón explícita** para no prospectar: mal fit, identidad dudosa, no corresponde, falta demasiada evidencia, riesgo/regulación, competidor o instrucción manual de Christian. **No** por ser prioridad B o C, ni por faltar el correo | Control → «En espera» (con «Liberar») |
| **SIN ACCIÓN** | El problema: ya no debería existir | Control (rojo si > 0) |

El estado se **deduce** de datos existentes (mensajes de correo + `prospect_candidates.channel_state`): `channel_state.prep` = `{state: hold|no_contact|find_contact, reason, draft}` y `channel_state.li_manual` = `{status: ready|invite_sent|connected|message_sent|replied|closed, profile_url, invitation, message, …}`. Código puro: `scripts/outreach/prep-core.mjs` (+ test).

## Piezas
- **Workflow 26** (motor de canales; ruta `atacama-linkedin`): acciones `prep_summary`, `prep_queue`, `style_samples`, `prep_set`, `prep_contact`, `li_save`, `li_sent`, `autosweep`; reloj `Autosweep Tick` (5 min) para el autoenvío.
- **Workflow 25** (Ops): `radar_gate` (hasta 3 corridas por día hábil, mínimo 2 h 50 min entre corridas, tope semanal 15; contrapresión = Investigados válidos sin acción ≥ 10 o ≥ 30 mensajes esperando revisión), `prep_gate`, `panel.prep`, aviso de preparación calculado desde los datos (`prepFreshNotice`, una vez por tanda, ignora prospectos `TEST …`).
- **Workflow 29** (Ops Actions, clave exclusiva de /ops): `autosend_set`, `autosend_sweep`, `prep_li_sent`, `prep_hold`, `prep_release`, `prep_contact`.
- **Hermes** (61 herramientas): `prep_queue`, `style_samples`, `prep_summary`, `set_prep_state`, `save_linkedin_prep`, `log_linkedin_manual`, `save_contact`. Job cron **«Atacama Labs — Contact Prep»** (`25562a86293c`, `55 12,16,19 * * 1-5` UTC = 09:55/13:55/16:55 Chile en horario de verano) con compuerta `prep_gate.sh`; el Prospect Radar pasó a `30 12,16,19 * * 1-5`. **En abril (cambio de hora de Chile) hay que mover ambos cron +1 h** (13/17/20 UTC).
- **/ops → Control:** métricas, interruptor «Envío automático», colas (correos listos, LinkedIn por enviar con copiar/«Envié…», buscar contacto con campo para pegar correo/LinkedIn, sin acción, en espera).

## Prioridad A/B/C (regla de Christian, 9-oct)
La prioridad **ordena** (se revisa y se prepara primero A y sin prioridad, luego B, luego C) y **gradúa la automatización** (B/C nunca son elegibles para el envío automático), pero **no impide** que exista el borrador: un B o C con correo/LinkedIn válidos y oportunidad razonable queda preparado igual. Preparado ≠ enviado: nada se aprueba ni se envía sin Christian (o sin el interruptor, solo para los elegibles).

## Aprendizaje de redacción
Antes de redactar, el job lee `style_samples`: correos enviados recientes y **ediciones de Christian** (entradas de `metadata.history` cuyo autor es «Christian via /ops»: versión original vs final, frases quitadas/agregadas, largo medio, cierres). Aprende estilo; los hechos salen solo del prospecto actual.

## Envío automático
Interruptor en `outreach_config.autosend_enabled` (**default OFF**; columnas `autosend_min_score` = 80, `autosend_updated_at/by`). Solo se cambia desde /ops (sesión + clic + confirmación; Hermes no tiene herramienta para eso). ON: cada 5 min (y al encender) el barrido aprueba, con el aprobador «Atacama OS · autoenvío», los **borradores del primer correo** con score ≥ mínimo, destinatario **directo** (no `info@`, `contacto@`, `ventas@`…) publicado por la empresa, no B/C, sin respuesta ni supresión; máx. 10 por barrido. El Sender sigue aplicando tope diario, ventana lun–vie, supresión, dedupe y hash. OFF: lo que el autoenvío aprobó y no salió vuelve a borrador; lo aprobado por Christian no se toca. Seguimientos y genéricos siguen siendo manuales (V1).

## Waalaxy (verificado 9-oct)
La API pública solo acepta `customProfile` (firstName, lastName, email, gender, headline, occupation, company, phoneNumbers, region) y la campaña usa una plantilla fija con variables; las «propiedades personalizadas» existen en la app pero **no está confirmado** que la API las rellene. No se sacrifica personalización: LinkedIn queda como cola manual en Atacama OS. Estado/respuesta tampoco se pueden leer por API: los registra Christian (botones de Control o `log_linkedin_manual`).

## Operación
- Confirmar un envío de LinkedIn: Control → «Envié la invitación» / «Aceptó» / «Envié el mensaje» / «Respondió…» → Supabase + GHL (Contactado, nota con fecha, canal y texto, tarea +3 días hábiles).
- Pausar la preparación: `hermes cron pause 25562a86293c`. Pausar el radar: `hermes cron pause 8421589d0902`.
- Backups: scratchpad de sesión `backup-prep/` (workflows vivos antes del cambio, config, candidatos, mensajes) y `.bak-<fecha>` de cada archivo desplegado en la VPS.
