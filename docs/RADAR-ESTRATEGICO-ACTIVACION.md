# Radar estratégico · guía de activación escalonada (F7)

**Estado hoy (27-oct-2026): código local y apagado.** Nada de esto se ha aplicado, desplegado ni activado. Este documento es el guion exacto para cuando Christian autorice cada paso. Cada paso se autoriza por separado; si solo uno queda autorizado, los demás siguen APAGADOS.

> Frase rectora: *Primero evidencia. Después decisión. La investigación no ejecuta ventas ni operaciones sin Christian.*

## 1. Orden de activación y qué pedir en cada paso

| # | Autorización que se pide | Qué se hace exactamente | Cómo se revierte |
|---|---|---|---|
| 1 | **Aplicar la migración aditiva en Supabase** | `supabase/migrations/20261024_strategic_radar.sql` por el MCP de Supabase (`apply_migration`, proyecto `uwquwjmiofixzugttals`). Antes: respaldo de la lista de tablas y confirmar que las 6 tablas `strategic_*` no existen. Después: comprobar RLS activo y sin permisos para `anon`/`authenticated`, 5 servicios `candidate` y config con todo `false` y `daily_max_items = 0`. | Dejar las tablas inactivas (no borrar datos). |
| 2 | **Desplegar la UI a `main`/Vercel** | Merge de `feat/radar-estrategico` a `main` + push (solo con su «sí» explícito). Verificar `https://atacamalabs.cl/` y `/ops` (las 5 secciones de siempre + «Radar estratégico»). Sin el paso 3 las pestañas dicen «No pude consultar el Radar»: es lo esperado. | `git revert` del merge. Las tablas pueden quedar. |
| 3 | **Actualizar los workflows vivos 25 y 29 en n8n** | Con `scripts/ops/n8n-deploy.mjs` (respalda el vivo antes, conserva `id`/`webhookId`/credenciales por nombre de nodo, compara credenciales). Ids: 25 `OxLcj12RP0qLVLVc`; 29 por nombre «Atacama Labs - 29 Ops Actions». **No reimportar 22 ni 23.** Verificar en n8n que `URL`, `TextEncoder` e `Intl` existen en el sandbox de los Code nodes (el motor los usa). | Re-subir el JSON respaldado. |
| 4 | **Subir herramientas a Hermes** | Con `ops/hermes/deploy-to-vps.sh` (ver §3). Recargar el MCP (`s6-svc -t /run/service/gateway-default` y `dashboard`) y verificar `hermes mcp test atacama-os` = **73** herramientas. | Restaurar los `.bak-<fecha>` que deja el script. |
| 5 | **Confirmar servicios de producción y activar chequeos (UNO POR UNO)** | En `/ops → Radar estratégico → Producción` Christian pulsa «Confirmar registro» con repo + URL real + health endpoint. Luego prueba la dirección real a mano: `python3 /opt/data/scripts/strategic_prod_monitor.py --probe https://…/health` (no usa n8n, no guarda nada). Si responde bien: pedir permiso para `production_enabled = true` **y** `monitor_enabled = true` de ESE servicio (cambio manual y auditado en Supabase; NO lo hace «Confirmar registro»). Primero `--dry-run` supervisado, después el job de 15 min. | `production_enabled = false` (apaga todo) o `monitor_enabled = false` del servicio. |
| 6 | **Encender la investigación con IA: Productos, Alianzas y Eventos (tres consentimientos independientes, gasto acotado)** | Para cada categoría: ensayo con `dry_run=true` (no guarda ni exige bandera), luego una corrida supervisada con `--force`, y solo con su «sí» `products_enabled` / `partners_enabled` / `events_enabled = true` y reanudar el job. Christian fija el presupuesto; **no hay telemetría de costo del modelo hasta que Hermes la entregue: se muestra «sin medición», nunca «$0»**. | `*_enabled = false` y `hermes cron pause <id>`. |
| 7 | **Activar la incorporación al Daily/«Hoy» y a las alertas** | Solo después de una corrida supervisada: `daily_max_items = 3` y (si quiere avisos de caída) integrar `strategic_prod:` en `alerts_poll`. La parte de código ya está en F6. `telegram_noncritical_enabled` sigue `false`. | `daily_max_items = 0`. |

Regla transversal: `global_pause = true` detiene exploración, ingesta y chequeos; las dos decisiones humanas (`strategic_decide`, `strategic_target_confirm`) siguen anotándose porque no producen efectos externos.

## 2. Jobs de Hermes preparados (NO creados)

Los jobs se crean **pausados** y sus ids se anotan aquí **solo después de crearlos de verdad** (jamás inventar un id). La sintaxis exacta de creación no está documentada en el repo: confirmarla en la VPS con `hermes cron --help` antes de ejecutar. Todos los horarios son en **hora de Chile**; como el cron de Hermes corre en UTC, cada job se dispara en los **dos horarios UTC posibles** y la compuerta (`strategic_gate.sh`) deja correr solo el que cae en la hora local correcta (misma solución que el Daily; sin «UTC-3» fijo).

| Job | Hora de Chile | Cron en UTC (dos disparos) | Script de compuerta | Prompt | Tipo | ID |
|---|---|---|---|---|---|---|
| Radar · Productos | martes y viernes 07:00 | `0 10,11 * * 2,5` | `strategic_gate.sh products` | `strategic-products.prompt.txt` | agente (con IA) | _pendiente: se anota al crear_ |
| Radar · Alianzas | lunes y jueves 07:15 | `15 10,11 * * 1,4` | `strategic_gate.sh partners` | `strategic-partners.prompt.txt` | agente (con IA) | _pendiente_ |
| Radar · Eventos | lunes 07:30 | `30 10,11 * * 1` | `strategic_gate.sh events` | `strategic-events.prompt.txt` | agente (con IA) | _pendiente_ |
| Radar · Producción | cada 15 min | `*/15 * * * *` | (la compuerta va dentro del script) | — | `--no-agent`, **sin IA, costo 0** | _pendiente_ |

- Los prompts de cron se guardan **en línea**: tras crear o cambiar el job, aplicar con `hermes cron edit <id> --prompt "$(cat archivo)"` ejecutado como usuario `hermes` y verificar en `/opt/data/cron/jobs.json`.
- Un job que falla **no reintenta sin límite**: el prompt dice «no insistas más de una vez» y la compuerta frena tras 3 corridas fallidas en 24 h y exige 6 h entre corridas buenas de investigación (10 min en producción).
- El job de producción imprime **nada** por defecto (stdout vacío = Hermes no manda nada). La alerta de «2 caídas seguidas» la evalúa n8n, no el script.
- Corrida supervisada fuera de horario: `strategic_gate.sh products --force` (la compuerta de Atacama OS igual manda).

## 3. Archivos a subir a la VPS (paso 4)

Con `ops/hermes/deploy-to-vps.sh <local> <destino>` (respalda, valida sintaxis y restaura si la prueba falla):

| Local | Destino |
|---|---|
| `ops/hermes/atacama_ops_mcp.py` | `/opt/data/atacama-ops/atacama_ops_mcp.py` (73 herramientas) |
| `ops/hermes/strategic_lib.py` | `/opt/data/atacama-ops/strategic_lib.py` |
| `ops/hermes/scripts/strategic_gate.sh` | `/opt/data/scripts/strategic_gate.sh` |
| `ops/hermes/scripts/strategic_prod_monitor.py` | `/opt/data/scripts/strategic_prod_monitor.py` |
| `ops/hermes/strategic-products.prompt.txt` · `-partners` · `-events` | `/opt/data/atacama-ops/` (copia de referencia; el prompt vivo está en línea en cada job) |

Comando de prueba posterior sugerido para el MCP: `/opt/hermes/.venv/bin/python -c "import ast,sys;ast.parse(open('/opt/data/atacama-ops/atacama_ops_mcp.py').read())"`.

## 4. Verificación tras cada paso (sin gasto)

- Paso 1: `strategic_radar_config` existe con 6 columnas de bandera en `false`; consultar con la llave `anon` devuelve 401/permiso denegado.
- Paso 3: `POST atacama-ops {"action":"strategic_view"}` con la clave de ingesta devuelve `source_state:"ok"` y `enabled:false`; `{"action":"strategic_gate","params":{"kind":"products"}}` devuelve `mode:"skip", reason:"flag_off"`.
- Paso 4: `strategic_radar_status("products")` desde Hermes devuelve `skip/flag_off`; `strategic_radar_submit(..., dry_run=true)` valida sin guardar.
- Paso 5: `--probe` devuelve `healthy` HTTP; `strategic_prod_check` registra una fila y `/ops` muestra «Responde (HTTP)» (nunca «Operativo»: HTTP 200 no prueba base de datos ni pagos).
- Paso 6: `strategic_runs` tiene una fila; la pestaña muestra los hallazgos con evidencia; ningún correo, ninguna oportunidad en GHL, ninguna inscripción.
- Paso 7: «Hoy» muestra como máximo una tarjeta «Radar estratégico · N asuntos» y el Daily no pasa de 3 señales; sin hallazgos el Daily es idéntico al de antes.

## 5. Qué NO hace el Radar (verificado por pruebas)

No envía correos ni mensajes, no crea leads ni oportunidades en GHL, no se inscribe ni postula, no compra, no publica, no ejecuta código de terceros, no hace `git push`, no modifica los workflows 22/23, no cambia reglas de correo, LinkedIn o Instagram ni precios. «Trabajar» solo anota una prioridad interna.
