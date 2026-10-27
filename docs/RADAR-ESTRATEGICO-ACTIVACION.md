# Radar estratégico · informe de preactivación y guion por etapas

**Estado (27-oct-2026): código local terminado y probado; TODO apagado y sin aplicar.** Este documento es el guion exacto para cuando Christian autorice cada etapa. **Cada etapa se autoriza por separado**; si solo una queda autorizada, las demás siguen apagadas. Nada de lo que sigue se ha ejecutado.

> Frase rectora: *Primero evidencia. Después decisión. La investigación no ejecuta ventas ni operaciones sin Christian.*

## 0. Resumen del orden y por qué

| Etapa | Qué | Toca | Reversible | Autorización que se pide |
|---|---|---|---|---|
| 0 | Congelar el punto de partida (local) | solo git local | sí | ninguna (es local) |
| 1 | Migración aditiva en Supabase | 6 tablas nuevas `strategic_*` | sí (rollback con candado) | «Autorizo la etapa 1» |
| 2 | Workflows 25 y 29 en n8n | 2 workflows vivos | sí (respaldo automático) | «Autorizo la etapa 2» |
| 3 | Archivos y herramientas en Hermes (**sin jobs**) | VPS, MCP | sí (`.bak`) | «Autorizo la etapa 3» |
| 4 | Merge a `main` + deploy de la UI | git, Vercel | sí (revert / promover anterior) | «Autorizo la etapa 4» (incluye el push) |
| 5 | Monitoreo de producción, **un servicio a la vez** | config + job sin IA | sí (flag) | «Autorizo la etapa 5 para <servicio>» |
| 6 | Investigación con IA: productos, alianzas, eventos | job con IA, gasto | sí (flag + pausa) | tres autorizaciones separadas + presupuesto |
| 7 | Daily, «Hoy» y alertas | `daily_max_items` | sí (volver a 0) | «Autorizo la etapa 7» |

**Orden distinto al del spec §F7 (a propósito):** el spec lista las autorizaciones pero no obliga ese orden. Pongo la UI (etapa 4) **después** de n8n y Hermes para que, al publicarla, ya haya datos reales que leer y las decisiones (workflow 29) ya existan; así nadie ve «No pude consultar el Radar» ni pulsa un botón que aún no funciona. Ninguna etapa depende de que la siguiente esté hecha: el sistema vivo ya tolera el Radar ausente (las lecturas del Daily/«Hoy»/alertas fallan en silencio y las acciones nuevas simplemente no existen hasta la etapa 2).

**Reglas que valen en todas las etapas:** sin `git add -A`; nunca imprimir claves ni `.env`; verificar antes y después con los comandos indicados; si una verificación falla, **se detiene la etapa y se revierte**, no se «arregla sobre la marcha»; los workflows 22 y 23 no se tocan (el script de despliegue se niega); datos de prueba solo con `is_test = true` y se limpian por id exacto.

## 1. Requisitos pendientes (NO asumidos como compatibles)

Todo lo de esta tabla está **sin comprobar en vivo**. Cada fila dice qué hice localmente para no depender del supuesto y cómo se comprueba.

### n8n
| # | Requisito | Qué hice localmente | Cómo se comprueba | Si falla |
|---|---|---|---|---|
| N1 | El entorno de los Code nodes trae `URL` | El motor **falla cerrado** con `runtime_incompleto` (no rechaza todo con un motivo engañoso) y lo detecta `radar-verify` | Etapa 2: `radar-verify.mjs n8n` hace un *dry_run* de ingesta con URL, host con tilde y fecha | Revertir la etapa 2; el Radar no puede validar direcciones |
| N2 | El entorno trae `TextEncoder` | **Eliminado**: SHA-256 con UTF-8 hecho a mano (igual a `node:crypto`; probado con tildes, emoji, CJK y sustitutos sueltos) | Mismo dry_run | — (ya no depende de él) |
| N3 | `Intl` con zonas horarias | Evidencia indirecta: `Intl.DateTimeFormat` con zona **ya corre hoy** en código incrustado (`ops-core`, `outreach-core`, `mail-view-core`) | Mismo dry_run (evento con zona) | Revertir etapa 2 |
| N4 | Tamaño de los nodos | Code node más grande: 25 → 381 KB (hoy 325 KB vivo); 29 → 219 KB (hoy 166 KB); JSON de 29: 1,5 MB (hoy 1,0 MB). El límite por defecto de payload de n8n es 16 MiB | `n8n-deploy.mjs` re-lee y compara tras el PUT | Si n8n rechaza el PUT, revertir; reducir la biblioteca incrustada |
| N5 | Versión de n8n y modo de ejecución de Code nodes (vm2 o task runner) | **Desconocidos** | Interfaz de n8n → Settings → About (versión); el dry_run de N1 es la prueba real | — |
| N6 | PostgREST: embebido `evidence:strategic_evidence(...)`, `on_conflict` con índice único compuesto, `Prefer: resolution=ignore-duplicates`, inserción en lote con arreglo, `order=score.desc.nullslast` | Todo es estándar de PostgREST y las tablas tienen las uniques exactas; **pero no hay forma de probar las ESCRITURAS sin encender una bandera** | La primera escritura real es la etapa 5a / 6a con datos `is_test` (ver abajo) | Apagar la bandera y revertir |
| N7 | Credenciales: 2 nodos nuevos en 29 (`Audit Plan`, `Apply Audit`) | Usan la misma credencial de Supabase que `Apply Writes`; los ids de credenciales de los dos workflows son idénticos a los de antes | `n8n-deploy.mjs` (modo comparación) lista los nodos nuevos; revisar que no pida credenciales nuevas | No aplicar |
| N8 | Ids vivos | 25 = `OxLcj12RP0qLVLVc`, 29 = `ruk7KnHLppPSI8wK` (según HANDOFF) | `n8n-read.mjs` / listar workflows | Corregir el id antes de aplicar |

### Hermes (VPS)
| # | Requisito | Qué hice localmente | Cómo se comprueba | Si falla |
|---|---|---|---|---|
| H1 | Python ≥ 3.9 en el contenedor (usa `zoneinfo`) | Probado con Python 3.12.5 local; el CLI actual ya usa `ZoneInfo` en la VPS | `/opt/hermes/.venv/bin/python --version` y **correr las 4 suites Python allí** (§Etapa 3): son sin red | No desplegar |
| H2 | `ipaddress.is_global` cambia entre versiones de Python (rangos reservados) | Las pruebas fijan los rangos esperados (10/8, 100.64/10, 169.254/16, etc.) | Las suites Python en la VPS | No habilitar el monitor |
| H3 | Variante del paquete `mcp` (v2 `MCPServer` o `FastMCP`) | Las 3 herramientas usan el mismo decorador que las 70 existentes | `hermes mcp test atacama-os` = **73** (la documentación vieja dice 54: medir el número real ANTES) | Restaurar el `.bak` |
| H4 | Sintaxis de creación de jobs (`hermes cron …`) y cómo un job toma su script de compuerta | **No está en el repo y no la inventé** | Solo lectura: `hermes cron --help` y mirar un job existente en `/opt/data/cron/jobs.json` (campos de horario, script, prompt, entrega, pausado) | No crear jobs hasta confirmarlo |
| H5 | Que el job `--no-agent` acepte un script `.sh` y trate stdout vacío como silencio | Existe `strategic_prod_monitor.sh` (igual patrón que `atacama_alerts.sh`); documentado «stdout vacío = no manda nada» | Crear el job **pausado** y correrlo una vez a mano | No reanudar |
| H6 | Que el agente de Hermes tenga herramientas de navegación/búsqueda para investigar | Los prompts dependen de ello; sin navegación el job termina sin hallazgos (falla seguro) | Corrida supervisada de la etapa 6 | No encender la categoría |
| H7 | Costo del modelo | **Sin telemetría**: la UI mostrará «sin medición», nunca «$0» | Christian fija un tope por corrida y por semana | No encender |
| H8 | Salida a internet y DNS del contenedor; certificados CA | El monitor usa `ssl.create_default_context()` | `--probe https://example.org/` desde la VPS | No habilitar el monitor |
| H9 | Reinicio del gateway para recargar el MCP | Interrumpe Telegram unos segundos | Se hace en la etapa 3, avisando | — |
| H10 | Ruta de importación (`strategic_lib.py` junto al MCP; `atacama_common` desde el script del monitor) | El script agrega las rutas necesarias | `--probe` y `strategic_gate.sh products` en la VPS | Restaurar |

### Supabase y Vercel
| # | Requisito | Cómo se comprueba |
|---|---|---|
| S1 | El proyecto `uwquwjmiofixzugttals` es compartido con EnBandeja | La migración es solo aditiva con prefijo `strategic_`; antes: `list_tables` para confirmar que ningún nombre choca |
| S2 | `gen_random_uuid()` | Ya la usan migraciones anteriores (`20260915_…`, `20261005_…`, `20261006_…`) |
| S3 | Avisos de seguridad (advisors) | `get_advisors` (security) antes y después; se esperan avisos **informativos** «RLS habilitado sin políticas» en las 6 tablas (es lo buscado: solo la llave de servicio entra) |
| V1 | Variables de entorno de Vercel | Solo **nombres**, sin valores: `N8N_BASE_URL`, `ATACAMA_INGEST_KEY`, `OPS_APPROVAL_KEY`, `OPS_PANEL_PASSWORD`, `OPS_PANEL_SECRET`. **No hay variables nuevas** para el Radar |
| V2 | Cómo despliega Vercel (rama `main` automática) | Leer el proyecto; anotar el id del deployment actual como punto de retorno |

## 2. Etapa 0 · Congelar el punto de partida (local, sin autorización)

```bash
cd atacama-labs-app
git status --short | grep -v '^??'                 # solo debe haber cambios del Radar o ajenos conocidos
node scripts/run-all-tests.mjs                     # 63+/63+ suites, 0 fallos
node scripts/ops/ui-tests.mjs                      # 0 fallos
npx tsc --noEmit && npx eslint src && npx next build
git tag radar-preactivacion-2026-10-27 HEAD        # etiqueta LOCAL (no se sube)
git rev-parse origin/main                          # SHA actual de producción (punto de retorno; hacer `git fetch` antes)
```

## 3. Etapa 1 · Supabase (migración aditiva)

**Autorización:** «Autorizo la etapa 1». **Toca:** crea 6 tablas nuevas; no modifica ninguna existente.

**Respaldo / punto de retorno** (conector de Supabase, solo lectura; guardar la salida en `backups/<fecha>/supabase/`):
1. `list_tables` (esquema `public`) y `list_migrations` → confirmar que no existe ningún `strategic_*` y anotar la última migración.
2. `get_advisors` tipo `security` → guardar para comparar.

**1a · Ensayo sin persistencia** (`execute_sql`, todo en una transacción que termina en `rollback`): `begin; <contenido de supabase/migrations/20261024_strategic_radar.sql>; <consultas de verificación>; rollback;` — comprueba que la migración corre sin errores en el motor real y no deja nada.

**1b · Aplicar:** `apply_migration` con el contenido exacto de `supabase/migrations/20261024_strategic_radar.sql`.

**Verificación** (`execute_sql`; debe dar exactamente esto):
```sql
select c.relname, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname like 'strategic\_%' order by 1;                       -- 6 filas, rls = true en todas
select table_name, grantee, privilege_type from information_schema.role_table_grants
 where table_schema='public' and table_name like 'strategic\_%' and grantee in ('anon','authenticated');   -- 0 filas
select count(*) from pg_policies where tablename like 'strategic\_%';                          -- 0
select logical_name, status, monitor_enabled, health_url, deployment_url from public.strategic_prod_targets order by 1;   -- 5 candidatos, todo null/false
select * from public.strategic_radar_config;                                                   -- todo false, daily_max_items = 0
select (select count(*) from strategic_opportunities)+(select count(*) from strategic_evidence)+(select count(*) from strategic_runs)+(select count(*) from strategic_prod_checks);  -- 0
```
Más: `get_advisors` (security) sin avisos **nuevos** de gravedad alta; y `list_tables` de EnBandeja/otras tablas sin cambios.

**Criterio de paso:** las 6 consultas dan lo indicado. **Rollback:** (a) preferido: dejar las tablas inactivas (banderas en `false`); (b) borrar solo si nunca guardaron nada: `supabase/rollbacks/20261024_strategic_radar_rollback.sql` (se niega con un mensaje si hay cualquier dato real, banderas encendidas, servicios confirmados o de prueba; sin `CASCADE`). **No está en `migrations/`**: nada lo aplica solo.

**Efecto en lo vivo:** ninguno todavía; nada lee estas tablas hasta la etapa 2.

## 4. Etapa 2 · n8n (workflows 25 y 29)

**Autorización:** «Autorizo la etapa 2». **Toca:** `OxLcj12RP0qLVLVc` (25) y `ruk7KnHLppPSI8wK` (29). **No** toca 22 ni 23.

**Antes (local y de solo lectura):**
```bash
node n8n/build/ops.mjs && node n8n/build/ops-actions.mjs            # regenera los JSON desde el código probado
node scripts/ops/n8n-read.mjs ops '{"action":"health"}'             # línea base: salud y fallas de 24 h ANTES de cambiar nada
node scripts/ops/n8n-read.mjs ops '{"action":"panel"}' --raw > backups/<fecha>/panel-antes.json   # opcional, para comparar «Hoy»
node scripts/ops/n8n-deploy.mjs n8n/atacama-labs-25-atacama-ops.json OxLcj12RP0qLVLVc      # SOLO COMPARA: lista nodos que cambian y credenciales
node scripts/ops/n8n-deploy.mjs n8n/atacama-labs-29-ops-actions.json ruk7KnHLppPSI8wK      # SOLO COMPARA: esperados «Audit Plan» y «Apply Audit» como nuevos
```
**Respaldo:** `n8n-deploy.mjs … --apply` guarda **antes** el workflow vivo en `backups/<fecha>/n8n/wf-<id>-antes-<hora>.json` (verificar que el archivo existe y no está vacío antes de seguir).

**Aplicar (uno por vez, primero 25):**
```bash
node scripts/ops/n8n-deploy.mjs n8n/atacama-labs-25-atacama-ops.json OxLcj12RP0qLVLVc --apply
node scripts/ops/radar-verify.mjs n8n                                   # todo PASS (ver abajo)
node scripts/ops/n8n-deploy.mjs n8n/atacama-labs-29-ops-actions.json ruk7KnHLppPSI8wK --apply
node scripts/ops/radar-verify.mjs n8n                                   # todo PASS otra vez (incluye el 29)
node scripts/ops/n8n-read.mjs ops '{"action":"health"}'                 # igual que la línea base
```
**Qué comprueba `radar-verify.mjs n8n`** (solo lectura, rechazos previos a escribir y *dry_run*; imprime PASS/FAIL, nunca claves): las 4 compuertas dicen `skip · flag_off`; las 4 vistas responden con `source_state: ok` y `enabled: false`; ningún servicio muestra salud; **dry_run de ingesta con URL, host con tilde, emoji y fecha (prueba N1–N3)**; ingesta real, `strategic_targets` y `strategic_prod_check` rechazados por bandera apagada; una categoría inventada rechazada; `panel` sin tarjeta del Radar ni «missing»; `daily` sin bloque; el 29 responde y rechaza una decisión inventada. Pruebas del propio verificador: 6 (pasa con todo apagado, **falla** si una bandera está encendida, **falla** si n8n no trae `URL`, falla si falta la tabla).

**Además (manual, a ojo):** en n8n, las ejecuciones del 25 y del 29 siguen verdes; el Daily de mañana a las 08:30 llega **sin** bloque estratégico y con el mismo contenido.

**Criterio de paso:** 0 FAIL. **Rollback:** re-aplicar el JSON respaldado (`n8n-deploy.mjs backups/<fecha>/n8n/wf-<id>-antes-<hora>.json <id> --apply`, probando primero sin `--apply`) o importarlo desde la interfaz de n8n; volver a correr la línea base. Los 2 nodos nuevos del 29 desaparecen con el respaldo.

## 5. Etapa 3 · Hermes: archivos y herramientas (SIN jobs)

**Autorización:** «Autorizo la etapa 3». **Toca:** la VPS (archivos y recarga del MCP, que reinicia el gateway unos segundos: Telegram se interrumpe brevemente).

**Antes (solo lectura, por `hermes-exec-agent` como indica HANDOFF §4):**
```bash
/opt/hermes/.venv/bin/python --version                                         # ≥ 3.9
/opt/hermes/.venv/bin/python -c "from zoneinfo import ZoneInfo; ZoneInfo('America/Santiago')"
hermes mcp test atacama-os                                                    # anotar el número REAL de herramientas (esperado 70; NO asumir 54)
cp /opt/data/cron/jobs.json /opt/data/cron/jobs.json.pre-radar.<fecha>         # respaldo de los jobs
hermes cron --help ; hermes cron list --all                                    # sintaxis real y estado actual (H4)
```
**Ensayo de las pruebas en la VPS (sin red y sin tocar nada vivo)** — subir a una carpeta temporal y correr:
```bash
ops/hermes/deploy-to-vps.sh ops/hermes/strategic_lib.py /opt/data/tmp-radar-tests/strategic_lib.py
# (idem: atacama_ops_mcp.py, atacama_common.py, strategic-fixtures.json, strategic_lib_test.py, strategic_mcp_test.py, scripts/strategic_prod_monitor.py → /opt/data/tmp-radar-tests/scripts/, strategic_monitor_test.py)
/opt/hermes/.venv/bin/python /opt/data/tmp-radar-tests/strategic_lib_test.py && …/strategic_mcp_test.py && …/strategic_monitor_test.py   # 53 pruebas, todas OK
```
Después, borrar `/opt/data/tmp-radar-tests` (ruta exacta).

**Desplegar (con respaldo automático `.bak-<fecha>` y prueba posterior; el script restaura solo si falla):**
| Local | Destino |
|---|---|
| `ops/hermes/atacama_ops_mcp.py` | `/opt/data/atacama-ops/atacama_ops_mcp.py` |
| `ops/hermes/strategic_lib.py` | `/opt/data/atacama-ops/strategic_lib.py` |
| `ops/hermes/scripts/strategic_gate.sh` | `/opt/data/scripts/strategic_gate.sh` |
| `ops/hermes/scripts/strategic_prod_monitor.py` y `.sh` | `/opt/data/scripts/` |
| `ops/hermes/strategic-{products,partners,events}.prompt.txt` | `/opt/data/atacama-ops/` (copia de referencia) |
Prueba posterior sugerida: `/opt/hermes/.venv/bin/python -m py_compile <destino>`. Recargar el MCP: `s6-svc -t /run/service/gateway-default` y `/run/service/dashboard`.

**Verificación:**
- `hermes mcp test atacama-os` = **línea base + 3** (esperado 73).
- Desde Hermes: `strategic_radar_status("products")` → `skip / flag_off`; `strategic_radar_submit(kind="products", payload_json=<ejemplo>, dry_run=true)` → `would_accept: 1`, nada guardado.
- `/opt/data/scripts/strategic_gate.sh products` → `mode=skip` (fuera de horario o apagado).
- `/opt/data/scripts/strategic_prod_monitor.sh` → **sin salida**, código 0 (apagado).
- `/opt/data/scripts/strategic_prod_monitor.sh --probe https://example.org/` → un JSON con `healthy` (prueba de DNS, TLS y salida a internet, H8).
- Telegram sigue respondiendo y `atacama-alerts` sigue corriendo.

**Rollback:** restaurar los `.bak-<fecha>` (`atacama_ops_mcp.py`), borrar por ruta exacta los archivos nuevos, recargar el MCP, `hermes mcp test` = línea base. `jobs.json` no se tocó en esta etapa.

## 6. Etapa 4 · UI: merge a `main` y deploy

**Autorización:** «Autorizo la etapa 4» (incluye el `git push`). **Nunca antes de las etapas 1–3 verificadas.**

**Antes:**
```bash
git fetch origin
git merge-base --is-ancestor origin/main feat/radar-estrategico && echo "fast-forward posible" || echo "main avanzó: PARAR y avisar (no rebasar sin permiso)"
git rev-parse origin/main                    # SHA de retorno
```
Vercel (conector, solo lectura): anotar el **deployment actual de producción** (id y SHA) y confirmar los **nombres** de las variables (V1/V2).

**Hacer:** `git switch main && git merge --ff-only feat/radar-estrategico && git push origin main` (el `main` local está atrasado: usar `git fetch` y actualizarlo primero con fast-forward desde `origin/main`).

**Verificación:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atacamalabs.cl/            # 200
curl -s -o /dev/null -w "%{http_code}\n" https://atacamalabs.cl/ops        # 200 (pantalla del PIN)
curl -s https://atacamalabs.cl/ops?view=radar_produccion | grep -c "Radar estratégico"   # 0: sin sesión no se ve nada del Radar
curl -s https://atacamalabs.cl/robots.txt https://atacamalabs.cl/sitemap.xml | head       # sin cambios
```
Después, **Christian** entra con su PIN y revisa: las 5 secciones de siempre + «Radar estratégico»; las 4 pestañas dicen «Monitoreo automático apagado; inventario por verificar» / «Investigación no activada» con los 5 servicios «Por verificar»; ningún botón de contactar/enviar. (No puedo hacer este paso: no tengo el PIN.)

**Rollback:** `git revert -m 1 <merge>` + push **(con autorización)**, o promover el deployment anterior de Vercel (id anotado). Las tablas y workflows pueden quedar: son inertes.

## 7. Etapa 5 · Monitoreo de producción, UN SERVICIO A LA VEZ

**Autorización por servicio:** «Autorizo la etapa 5 para <nombre>». Nada de esto envía avisos: las alertas llegan recién en la etapa 7.

1. **Christian** pulsa «Confirmar registro» en la UI con repo + URL real + dirección de salud (queda `confirmed` y `monitor_enabled=false`).
2. **Prueba no destructiva desde la VPS:** `strategic_prod_monitor.sh --probe <health_url>` → debe dar `healthy` con HTTP 2xx (recordar: solo HTTP, no base de datos ni pagos). Si da `degraded`/`down`/`unknown`, **no se continúa** (una página protegida o un redirect se configuran aparte).
3. **5a · Prueba de ESCRITURA con datos de prueba** (primera escritura real, N6): insertar un servicio `is_test=true` (`confirmed`, `monitor_enabled=true`, health `https://example.org/`), encender `production_enabled`, llamar `strategic_prod_check` con `test:true` y comprobar la fila; **limpiar por id exacto** (primero `strategic_prod_checks`, luego `strategic_prod_targets`).
4. **Habilitar el servicio** (cambio manual y auditado; NO lo hace «Confirmar registro»): `update strategic_prod_targets set monitor_enabled=true, updated_at=now() where id='<id>' and status='confirmed' and health_url is not null;` y `update strategic_radar_config set production_enabled=true, updated_at=now() where id=1;`
5. Corrida supervisada en modo sombra: `strategic_prod_monitor.sh --dry-run` (muestra, no registra); luego una corrida real a mano y revisar la fila en `strategic_prod_checks` y la UI («Responde (HTTP)»).
6. **Crear el job (pausado)** con la sintaxis confirmada en H4: nombre «Radar · Producción», cada 15 min (`*/15 * * * *`), `--no-agent`, script `strategic_prod_monitor.sh`, sin entrega a Telegram. Correrlo una vez a mano; recién entonces reanudarlo. Anotar su **id real** aquí (nunca inventarlo).

**Verificación continua:** `select result, count(*) from strategic_prod_checks group by 1;` · la UI muestra la hora de la última comprobación · «Dos caídas seguidas» NO crea alerta todavía (etapa 7).
**Rollback:** `update strategic_radar_config set production_enabled=false where id=1;` (apaga todo) y/o `monitor_enabled=false` del servicio; `hermes cron pause <id>`. Los chequeos ya guardados se conservan.

## 8. Etapa 6 · Investigación con IA (tres consentimientos separados)

**Autorización por categoría:** «Autorizo la etapa 6 para productos | alianzas | eventos, con tope de <US$ x> por corrida y <US$ y> por semana». **Costo: sin telemetría** (H7): la UI mostrará «sin medición». Christian fija el tope; yo no gasto nada sin él.

Para **cada** categoría, en este orden:
1. Verificar la compuerta apagada: `strategic_gate.sh <cat> --force` → `skip · flag_off`.
2. **Ensayo sin guardar y sin bandera:** el agente (o yo) llama `strategic_radar_submit(..., dry_run=true)` con un hallazgo de ejemplo → `would_accept`.
3. **6a · Primera escritura real con datos de prueba (N6):** encender solo esa bandera (`update strategic_radar_config set <cat>_enabled=true where id=1;`), `strategic_radar_submit(..., test=true)` con 1 hallazgo `is_test`, comprobar oportunidad + evidencia + corrida en la base y la vista; **limpiar por id exacto** (evidencia → oportunidades → corridas de prueba) y volver a `false`.
4. **Corrida supervisada real** (`strategic_gate.sh <cat> --force`, con Christian presente): revisar cada hallazgo, su evidencia y los rechazos. Criterios de paso: ningún hallazgo sin fuente oficial/primaria, ninguna fecha o plazo inventado, ningún contacto, costo dentro del tope.
5. **Crear el job (pausado)** (horarios en §9) y correrlo una vez a mano; recién entonces reanudarlo.
**Rollback:** `<cat>_enabled=false` y `hermes cron pause <id>`. Los hallazgos guardados se conservan (evidencia y decisiones nunca se borran en cascada).

## 9. Jobs de Hermes preparados (NO creados; se crean pausados)

Los horarios son de **Chile**; el cron de Hermes corre en UTC, así que cada job se dispara en los **dos horarios UTC posibles** y `strategic_gate.sh` deja correr solo el que cae en la hora local correcta (misma solución que el Daily; sin «UTC-3» fijo). Fuera de horario: `strategic_gate.sh <cat> --force` para una corrida supervisada.

| Job | Hora de Chile | Cron en UTC | Compuerta | Prompt | Tipo | ID |
|---|---|---|---|---|---|---|
| Radar · Productos | mar y vie 07:00 | `0 10,11 * * 2,5` | `strategic_gate.sh products` | `strategic-products.prompt.txt` | con IA | _se anota al crear_ |
| Radar · Alianzas | lun y jue 07:15 | `15 10,11 * * 1,4` | `strategic_gate.sh partners` | `strategic-partners.prompt.txt` | con IA | _se anota al crear_ |
| Radar · Eventos | lun 07:30 | `30 10,11 * * 1` | `strategic_gate.sh events` | `strategic-events.prompt.txt` | con IA | _se anota al crear_ |
| Radar · Producción | cada 15 min | `*/15 * * * *` | (dentro del script) | — | `--no-agent`, **sin IA** | _se anota al crear_ |

Los prompts de cron se guardan **en línea**: tras crear o editar el job, `hermes cron edit <id> --prompt "$(cat archivo)"` como usuario `hermes` y verificar en `/opt/data/cron/jobs.json`. Un job que falla **no reintenta sin límite** (el prompt dice «no insistas más de una vez»; la compuerta frena tras 3 corridas fallidas en 24 h y exige 6 h entre corridas de investigación).

## 10. Etapa 7 · Daily, «Hoy» y alertas

**Autorización:** «Autorizo la etapa 7» — solo después de al menos una corrida supervisada con hallazgos buenos o una semana de chequeos de producción sanos.
**Hacer:** `update strategic_radar_config set daily_max_items=3, updated_at=now() where id=1;` (es el interruptor único: con 0 no entra nada al Daily, a «Hoy» ni a Telegram). `telegram_noncritical_enabled` sigue `false`.
**Verificación:** `node scripts/ops/n8n-read.mjs ops '{"action":"daily"}'` → sin hallazgos elegibles el texto es idéntico al de antes; con señales, un único bloque «RADAR ESTRATÉGICO» de máximo 3 viñetas. `{"action":"panel"}` → una sola tarjeta «Radar estratégico · N asuntos para decidir». Una caída confirmada crea `strategic_prod:<id>` (crítica) y llega a Telegram **una vez** (repite cada 12 h hasta 3 veces); con dos `healthy` seguidos se resuelve sola.
**Rollback:** `daily_max_items=0` (las alertas abiertas se resuelven en el próximo ciclo; nada nuevo entra).

## 11. Qué NO hace el Radar (verificado por pruebas)

No envía correos ni mensajes, no crea leads ni oportunidades en GHL, no se inscribe ni postula, no compra, no publica, no ejecuta código de terceros, no hace `git push` por sí solo, no modifica los workflows 22/23, no cambia reglas de correo, LinkedIn o Instagram ni precios. «Trabajar» solo anota una prioridad interna. Todo lo que lee de la web es **dato**, nunca una instrucción.
