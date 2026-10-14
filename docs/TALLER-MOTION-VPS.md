# Taller de motion y Media Worker en la VPS (Frente A — hecho el 12-oct-2026)

Todo vive en el contenedor de Hermes (usuario `hermes`, sin root). Nada de esto depende del PC de Christian ni de Claude.

## Qué hay
| Pieza | Dónde | Para qué |
|---|---|---|
| **Taller de motion** | `/opt/data/motion-studio/` (`hyperframes@0.8.150` + Chrome headless-shell en `/opt/data/.cache/hyperframes/`) | Renderizar videos HTML→MP4 1080×1920 |
| **Plantillas validadas** | `/opt/data/motion-studio/templates/{paneles-partidos, rafaga-de-camara, mini-interfaces}` | Los 3 lenguajes de motion ya aprobados (¿Quién contesta?, Mismo agente otro uniforme, Un agente un puesto) |
| **Script de render** | `/opt/data/scripts/motion_render.sh <proyecto> [nombre]` (repo: `ops/hermes/scripts/motion_render.sh`) | `check` → `render` → volumen −15 LUFS (2 pasadas) → copia ligera. Solo corre dentro de `/opt/data/motion-studio/projects/` |
| **Skills de motion** | `/opt/data/skills/motion/` (10 skills oficiales de HyperFrames + `atacama-motion`, repo: `ops/hermes/skills/atacama-motion/SKILL.md`) | Las reglas técnicas y el gusto de Christian; Hermes las lista como `motion` (11, enabled) |
| **Media Worker** | `/opt/data/atacama-media/` + `/opt/data/scripts/media_worker.sh` + cron `media-worker` (`301099be4b42`, cada 5 min, sin modelo, entrega por Telegram solo si hace algo) | Renderiza carruseles/imágenes en cola con el MISMO renderer del PC (`scripts/content/render.mjs`) y los manda a revisión |
| Bitácora | `/opt/data/motion-studio/BITACORA.md` | Una línea por video producido |

## Cómo fluye el Media Worker (sin secretos nuevos en la VPS)
`cron → media_worker.sh (carga /opt/data/.env) → vps-worker.mjs`
1. `list` (compuerta barata): si no hay assets del renderer en cola, termina **sin abrir Chromium**.
2. `claim` (workflow n8n 30): entrega el siguiente asset + la fila de su pieza y lo marca `generating` (candado; un huérfano de >20 min se reclama, máx. 3 intentos y luego `failed` visible).
3. Renderiza con Playwright (`ATACAMA_CHROMIUM_ARGS=--no-sandbox`), sube **cada PNG en base64 a n8n** (`upload`), que lo pone en la biblioteca de medios de GHL con la credencial «GHL — Atacama OS». La VPS **no** guarda token de GHL ni llave de Supabase: solo la llave de ingesta que ya tenía.
4. `complete` (ready + hash de render) y reenvío de la pieza al **Content Intake** con sus medios: queda `in_review` en el Planner. Nunca publica, programa ni aprueba.
5. Errores: el asset queda `failed` con el motivo (visible en `/ops`) y el worker imprime una línea en español para Telegram.
- Probar en seco: `ssh … "sudo hermes-exec-agent /opt/data/scripts/media_worker.sh --dry"` (lista, no reclama).
- Un solo worker a la vez: candado `/opt/data/state/media-worker.lock` (vigente 30 min).
- Respaldo manual desde el PC (sigue funcionando): `node scripts/media/media-gateway.mjs run`.

## Verificación del 12-oct
- «¿Quién contesta?» renderizado en la VPS: 8,3 s, 1080×1920, −15,0 LUFS, `hyperframes check` limpio (16/16 contraste AA), SSIM 0,985–0,994 frente al publicado; 49 s de render (≈80 s con validación y volumen). Copia ligera 1,1 MB.
- Carruseles de prueba: render de 3 slides en <1 s, SSIM 0,988–0,993 frente al del PC (visualmente idéntico).
- Cola real: 3 carruseles Hermes del 9-oct (5 slides c/u) renderizados, subidos y reenviados en 32 s → 3 piezas `in_review` con post en GHL.
- Pruebas: workflow 30 (40), worker (11), suite completa 39/39 · 1297 pruebas.

## Cómo operarlo
- Subir archivos: `ops/hermes/deploy-to-vps.sh <local> </opt/data/destino>` (valida y respalda); para árboles grandes se usó `tar | ssh … "sudo hermes-exec-agent bash -c 'cd … && tar xzf -'"` (el stdin sí atraviesa el wrapper).
- Actualizar el worker: re-subir `scripts/media/vps-worker.mjs`, `scripts/media/media-gateway-core.mjs` y `scripts/content/render.mjs` a `/opt/data/atacama-media/scripts/...` (misma ruta relativa).
- Actualizar HyperFrames: `cd /opt/data/motion-studio && npm i hyperframes@<versión>`; revisar un render de las plantillas antes de usarlo.
- Respaldos de esta puesta en marcha: `backups/2026-10-12/n8n/` (workflow 30 antes de cada cambio) y `/opt/data/backups/jobs.json.pre-media-worker.20261012`.

## Límites conocidos
2 CPU y ~2 GB libres: un render a la vez; sin GPU (HyperFrames usa captura por screenshots). Chromium de Playwright (≈660 MB) y Chrome de HyperFrames conviven en `/opt/data/.cache/`. No se tocó el `config.yaml` de Hermes ni se reinició el agente.
