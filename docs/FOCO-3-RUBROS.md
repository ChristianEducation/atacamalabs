# Foco comercial de 2 semanas — 3 rubros, secuencia de 4 correos (22-oct-2026)

Vigente del **23-oct al 6-nov-2026**. Christian aprueba todo desde /ops como siempre; nada se envía solo.

## Qué cambió
- **Rubros (solo Región de Antofagasta):** corredoras de propiedades · clínicas/consultas dentales, veterinarias y profesionales de la salud independientes · casinos y servicios de alimentación (colegios que publican datos de transferencia; empresas de minería/retail/corporativo). Lo demás queda congelado.
- **Meta diaria:** 15 prospectos nuevos del radar (5 por rubro). La compuerta del radar (`radarGate`, workflow 25) lleva la cuenta y el agente lee «faltan_hoy: corredoras=x clinicas=y casinos=z».
- **Secuencia de 4 correos (días hábiles 0 / 4 / 9 / 18):** 1.º primer correo (Playbook) · 2.º `followup_1` = dolor del rubro · 3.º `followup_2` = valor práctico · 4.º `followup_3` = cierre del hilo. Mismo hilo (asunto original con «Re:»). `outreach_config.followup_days = [4,9,18]`, `daily_cap = 50`.
- **Plantillas por rubro:** `scripts/outreach/followup-templates.mjs` (`verticalOf` + `followupBody`). Nada de precios, demos, ejemplos ni reuniones. Linter de seguimientos en `coldmail-core.mjs` (premia 100–170 palabras con una pregunta; penaliza el seguimiento «vacío»).
- **Primer correo:** apertura con el patrón del rubro (opción B: «En los casinos donde las familias pagan por transferencia y mandan el comprobante, suele aparecer un trabajo repetido…»), sin «vi que», sin precios. Asunto con mayúscula inicial.
- **MX:** el motor (workflow 21) no guarda un primer correo a un dominio sin registros MX (DNS-over-HTTPS). Habría evitado 3 de los 5 rebotes de octubre.
- **LinkedIn:** secuencial; solo se propone cuando el ciclo de correo terminó (cierre `followup_3` enviado, sin respuesta) y hay persona+cargo+perfil verificable. Quien ya fue contactado a mano por LinkedIn no se propone.
- **Lista de exclusión:** los 20 casinos contactados a mano el 6–7 oct (`prospect_candidates`, `source_type='manual'`). Terravida y Palmares Oriente además en `outreach_suppression`.
- **Playbook §17** reescrito (copia en la VPS: `/opt/data/content/playbook-correos.md`).

## Cómo medir
```bash
node scripts/outreach/foco-report.mjs            # desde el 23-oct, por rubro
```
Con ~50 correos por rubro hay señales, no estadística.

## Despliegues (22-oct)
Workflows 21, 24, 25, 26 y 29 (respaldos en `backups/2026-10-22/n8n/`). **22 (Sender) y 23 (Gmail Sync) NO se tocaron** (credenciales de Gmail solo en n8n). Migración `20261023_outreach_followup_3.sql` (permite `followup_3`).
VPS Hermes: `atacama_ops_cli.py`, `playbook-correos.md`, prompts del radar (`8421589d0902`) y Contact Prep (`25562a86293c`) — respaldos `*.bak-20261022-*` y `/opt/data/cron/jobs.json.pre-foco.20261022`.

## Para revertir
- Calendario: `outreach_config.followup_days=[3,7]` (el código nuevo usa [4,9,18] por defecto si no hay 3 valores).
- Prompts: `hermes cron edit <id> --prompt "$(cat <respaldo>)"` o restaurar `jobs.json.pre-foco.20261022`.
- Workflows: `node scripts/ops/n8n-deploy.mjs backups/2026-10-22/n8n/<archivo>.json <id> --apply`.

## Incidente del 22-oct (resuelto)
Al agregar la tarea de cierre (`f3`) a los ciclos antiguos, `finalizeFollowups` reescribió el `metadata` de **46 correos iniciales** solo con `followup_tasks.f3` (se perdían `followup_state`, `followup_tasks.f1/f2`, `cold`, `history`). Se restauró el mismo día desde la ejecución 92607 de n8n (53 filas, verificado) y se corrigió: la rama registra la base de metadata en `meta_updates` y `finalizeFollowups` se niega a escribir sin base (prueba de regresión). Lección: toda escritura de `metadata` en esta tabla debe partir del metadata completo.

## Pendientes conocidos
- Rebote: 5 de 53 (9,4 %); 2 de 5 no se ven con MX (hay que verificar la casilla). Considerar dominio de envío aparte y Postmaster Tools.
- Los 18 seguimientos 2 (ya reescritos como «valor») esperan su aprobación en /ops; a los del 9-oct el 2.º llega pegado al 1.º: el Sender exige ≥48 h entre correos al mismo prospecto.
- La compuerta de Content Radar sigue mostrando «error» hasta su corrida del lunes 26-oct (cadencia 3 días).
- Ley 21.719 (vigente desde el 1-dic-2026): revisión legal pendiente.
