# Motor semanal de Instagram (Frente C del spec «máquina de contenido y motion»)

> Puesto en marcha el 12-oct-2026. Corre solo en la VPS (Hermes + n8n + Supabase + GHL). Nada se publica, programa ni aprueba solo: toda pieza nace **en revisión** en el Planner de GHL.

## Ritmo y reglas (decididas por Christian)
- **Feed:** 5 por semana (2 reels · 2 carruseles · 1 imagen), uno por día lun–vie a las **15:00** (hora de Chile), nunca dos el mismo día.
- **Historias:** 3 al día (**10:00, 14:00, 18:00**) toda la semana = 21; cada día cuenta una mini-historia coherente con el feed del día (gancho → prueba → cierre).
- **LinkedIn no cambia** (personal y empresa): su ritmo y su cola se cuentan aparte; Instagram tiene sus **propios carriles**.
- **Las ideas no se aprueban antes**: el motor elige (parte del banco de ideas de la inteligencia de competencia pública, las señales verificadas y los recursos activos); Christian solo aprueba/edita/descarta cada pieza en GHL. Una idea propia de Christian se hace como orden explícita (`origin=explicit`).
- **Un carrusel educativo por semana con recurso:** la última lámina invita a comentar una **palabra clave**; el agente de Christian responde por mensaje directo con el enlace. El motor deja la palabra y el texto sugerido en el resumen del lunes.

## Cómo fluye (todo automático)
```
domingo 20:00 Chile (23:00 UTC; reintento lunes 20:00)  ← cron Hermes «Atacama Labs — Instagram Semanal» (38f0f3d1d99e)
  └─ compuerta igweek (n8n 25 · ops-core igWeekGate): ¿falta algo de la semana? ¿hay espacio en las colas? → run | skip
  └─ Hermes (skills atacama-motion + grounded-citations) escribe las piezas y las envía con submit_content_piece (n8n 12 · Content Intake)
       · carrusel / imagen / historia SIN media → el Intake las retiene («falta_render_o_medio») y pide SU visual al Media Gateway (n8n 30)
       · reel → /opt/data/scripts/motion_new.sh (texto sobre plantilla validada) → motion_render.sh (check, −15 LUFS) → pieza → request_visual(provider="studio")
  └─ cada ~5 min el Media Worker de la VPS (cron media-worker) reclama los assets: dibuja carruseles/imágenes (render.mjs) e historias (story-templates.mjs) o sube el MP4 del taller,
     reenvía la pieza al Intake y queda IN_REVIEW en el Planner con su hueco (feed 15:00 · historias 10/14/18)
  └─ Hermes responde a Christian por Telegram: qué quedó en revisión, palabra clave y mensaje directo del recurso, y lo que no pudo hacer
```
Cada falla queda visible: asset `failed` con el motivo (/ops, alertas) y una línea en Telegram.

## Piezas del sistema (qué cambió)
| Pieza | Cambio |
|---|---|
| Supabase | `content_pieces.format` admite `historia`; `content_config` gana `ig_feed_weekly_target` (5), `ig_feed_max_pending` (10), `ig_story_per_day` (3), `ig_story_max_pending` (28), `ig_feed_slot` (15:00), `ig_story_slots` (10:00,14:00,18:00), `ig_engine_enabled` (interruptor); `ops_runs.kind` admite `ig_week`. Migración `supabase/migrations/20261015_instagram_engine.sql` |
| n8n 12 Content Intake | carriles de cola (LinkedIn · feed IG · historias IG), huecos por hora, GHL `type` = `post`/`reel`/`story`, **historias sin texto** (GHL responde 422 «Story will not support caption»), pedido automático de visual |
| n8n 25 Atacama Ops | acciones `igweek_gate` e `ig_week_status`; el ritmo semanal de LinkedIn ya no cuenta Instagram; el panel trae el calendario `content.ig` |
| n8n 30 Media Gateway | acciones `claim` y `upload` (PNG o MP4 → biblioteca de GHL con la credencial de n8n), proveedor `studio`, historias por `piece.story` |
| n8n 27 Content Growth | `own_angles` hasta 14 con `format_suggestion` y `rubro` (banco de ideas) |
| Motor de piezas | `engine-core` valida `historia` (`story`) y `reel` (`motion_brief`); `editorial-core` acepta `historia` (visual `typographic`) |
| Hermes (VPS) | job `Instagram Semanal`, prompt `ops/hermes/content-ig-week.prompt.txt`, CLI `gate igweek`, herramienta `request_visual(provider=…)`, scripts `motion_new.sh`, `motion_render.sh`, `media_worker.sh`, `higgs.sh`, `igweek_gate.sh` |
| Worker VPS | `scripts/media/vps-worker.mjs` (historias, carruseles, video del taller); `story-templates.mjs` (plantillas dolor · pregunta · chat · embudo · recurso · dato) |
| /ops | tarjeta «Instagram · semana» con el calendario de 7 días (**requiere desplegar el sitio**; hasta entonces el panel viejo ignora el campo) |

## Operación
- **Apagar/encender:** `content_config.ig_engine_enabled = false|true` (la compuerta responde `skip`). Cambiar topes o huecos: las columnas `ig_*` de `content_config` (fila `id=1`).
- **Disparar a mano** (por ejemplo tras aprobar o si algo falló): `hermes cron run 38f0f3d1d99e` (como usuario hermes; la compuerta decide qué falta).
- **Estado de la semana:** POST `atacama-ops` `{action:"ig_week_status"}` o la tarjeta de /ops.
- **Ver qué hizo una corrida:** `hermes sessions list` → `hermes sessions export --format md --session-id <id> <carpeta>`.
- **Datos de prueba:** siempre con `is_test=true` y limpiados por ID exacto; un post TEST de historia no lleva marca en GHL (las historias no admiten texto): borrarlo de inmediato.

## Límites y decisiones conocidas
- **Higgsfield** aún sin login en la VPS (Frente B): los reels usan el audio aprobado («reuse»); cuando haya sesión, el job puede pedir audio nuevo con `higgs.sh` (tope semanal 150 créditos, 40 por llamada, reserva 300).
- **Lenguajes de motion autónomos:** `paneles-partidos` y `rafaga-de-camara` (solo cambia el texto); `mini-interfaces` y los lenguajes nuevos (tipografía cinética, antes/después) son propuestas que se construyen con Claude Code.
- **Recursos:** hoy hay 1 activo (`que-proceso-automatizar-primero`); los 5 en borrador necesitan su página en el sitio (requiere desplegar). Sin recurso activo el carrusel educativo sale sin palabra clave y el resumen lo avisa.
- **El agente que envía el recurso por mensaje directo** lo programa Christian; este motor solo entrega palabra clave, texto y enlace.
- Instagram **no admite stickers de enlace** ni encuestas vía GHL: las historias llevan «atacamalabs.cl» en la imagen.
- Los reels que Christian programó a mano (lun 12–mié 14) se registraron en `content_pieces` para que el motor los cuente.
