# Ejecución · Radar estratégico (spec `SPEC-ATACAMA-OS-RADAR-ESTRATEGICO-v1.md`)

Log propio del módulo. No reescribe el cierre v3 (`EJECUCION-LOG.md`). Estado de todo: **solo código local, flags OFF**. Nada se ha aplicado, desplegado ni activado.

## F0 · Preflight (27-oct-2026)

| Qué | Resultado | Estado |
|---|---|---|
| Repo | `ChristianEducation/atacamalabs`, carpeta `atacama-labs-app` (git propio; el git de `C:\Users\alain` es otro) | comprobado |
| Rama de partida | `feat/frontend-v2-2-1` = `origin/main` = `39db2ec`. El `main` local está 150 commits atrasado, no se usa. Trabajo en rama nueva `feat/radar-estrategico` | comprobado |
| SHA del spec `dcf3a66` | Es ancestro de HEAD; hay 21 commits posteriores. Tocan archivos de `/ops` (`ops.mjs`, `ops-core.mjs`, `ops-actions-core.mjs`, `Approvals.tsx`, `Mail.tsx`, prompts). **Prevalece el código real** para nombres y rutas (spec §0) | comprobado |
| Next / React | 16.3.5 / 19.2.8 (coincide con `AGENTS.md`); docs locales en `node_modules/next/dist/docs/` (se leen antes de F2) | comprobado |
| Rutas del §1 y §10 | `views.ts`, `n8n/build/ops.mjs`, `ops-actions.mjs`, `scripts/ops/*`, `ops/hermes/*`, migraciones hasta `20261023_*` existen. Ningún archivo `strategic_*` existe aún | comprobado |
| Pruebas base | `node scripts/run-all-tests.mjs` → **58/58 suites, 1631 pruebas, exit 0** | comprobado |
| Árbol local ajeno | Hay trabajo sin versionar de contenido (`brand/content/**`, `backups/`, `social/exports/**`, `docs/HANDOFF-CONTENIDO-SEMANA-26-OCT.md`) y 2 modificados (`brand/content/historias/build.mjs`, `ghl-sched.mjs`). **No se tocan**; los commits de este módulo listan archivos exactos, nunca `git add -A` | riesgo controlado |
| Migraciones aplicadas en vivo, workflows 25/29, cron del Daily | `NO VERIFICADO EN VIVO` (no se consultó Supabase, n8n ni el VPS) | no comprobado |

Diferencias con el spec: ninguna que cambie producto, seguridad o alcance. Rama de trabajo distinta a `main` por seguridad (se integra a `main` solo con tu «sí»).

## F1 · Esquema + motor de calidad (27-oct-2026)
- `supabase/migrations/20261024_strategic_radar.sql`: 6 tablas `strategic_*` (config, prod_targets, prod_checks, opportunities, evidence, runs), constraints con nombre, índices del §5.1, semilla de 5 servicios `candidate` (§17.1, sin URLs, `monitor_enabled=false`), config con todo en `false`. RLS encendido + `revoke` a anon/authenticated, sin políticas, sin `SECURITY DEFINER`, sin triggers, sin tocar tablas existentes. **NO aplicada en ningún servidor.**
- `scripts/ops/strategic-radar-core.mjs` (puro, sin imports): `srCanonicalUrl`, `srSha256` (JS puro, igual a `node:crypto`; así corre en el sandbox de n8n), `srFingerprint`, `srValidateEvidence`, `srScoreProduct/Partner/Event`, `srCoverage`, `srRank`, `srTransition`, `srProductionHealth`, `srAttention`, `srGate`, `srView` (+ `srParseDate`, `srDaysLeft`, `srEventState`, `srIsPrivateHost`, `srDbKind`).
- Decisiones donde el spec dejaba margen (revisables): confianza de alianzas = `low` salvo fuente `official` + elegibilidad ≥12/20; cuota del gate = 3 corridas fallidas en 24 h; separación mínima entre corridas 10 min (producción) / 6 h (investigación); solo-fecha se compara por día calendario en `America/Santiago`.
- Pruebas: `scripts/ops/strategic-radar-core.test.mjs` = **39 pruebas** (cientos de aserciones: URL, huella, fechas, evidencia, productos 9+unknown≠90 %, licencia ausente, alianza inelegible, evento pasado/sin fecha, producción 1/2 caídas y 60 min, Daily 3 máx/orden, gate, vista y revisión estática de la migración). Suite total tras F1: **59/59 suites, 1670 pruebas** (base: 58/1631).
- Pendiente de F1 para F5: el equivalente Python de `srCanonicalUrl`/huella (fixtures compartidos) se hace con el monitor/MCP.

## F2 · Backend de lectura + interfaz (27-oct-2026)
**Correcciones al motor de F1 (hallazgo propio):** el núcleo tenía constantes de módulo y helpers sin exportar; al incrustarlo en n8n con `.toString()` habría fallado en el servidor (los otros núcleos de `/ops` no tienen constantes de módulo y exportan todo). Se arregló y se agregó una prueba que ejecuta TODAS las funciones incrustadas en un contexto vacío. También se cerró un hueco real: `srTransition('new','constructor')` devolvía una función (herencia del prototipo). `srView` ahora entrega `last_check` (resultado/HTTP/latencia) solo para confirmados monitoreados.
**Decisión:** la fila inicial de `strategic_radar_config` parte con `daily_max_items = 0` (la columna conserva el default 3 del spec). Así nada estratégico llega al Daily/«Hoy» hasta F7 paso 7, aunque se enciendan los chequeos antes.

**n8n 25 (`n8n/build/ops.mjs`, JSON regenerado con su generador):** tres acciones nuevas, SOLO LECTURA: `strategic_view {tab}`, `strategic_today`, `strategic_gate {kind}`. Lecturas propias por acción (no cargan los 10 reads genéricos de contenido); cualquier lectura `sr_*` fallida = `source_state:'unavailable'` (nunca un vacío falso); sin fila de config = `not_configured`. `strategic_gate` pasa por el `v3GateOverride` de la pausa general. Sin acciones de escritura estratégicas todavía (F4/F5). Parámetros validados contra lista cerrada (sin inyección de tabla/URL). No se tocaron 22 ni 23, ni credenciales, ni nodos de envío.
**Web:** `types.ts` (tipos §6.3), `lib/ops/strategic.ts` (validador estricto: una fila mal formada rechaza la vista completa), `v3-data.ts` (`getStrategicRadar(tab)`, una SWR por pestaña 30 s/10 min, `.drop()` en `invalidateV3`, vista `stale` si n8n falla), `views.ts` (sexta sección `estrategico` + 4 ids `radar_*`), `PanelView.tsx` (lee el Radar solo en sus 4 URLs), `StrategicRadarViews.tsx` (solo lectura, sin botones), `ops.css` (clases `ops-strategic-*`).
**Pruebas:** `strategic-radar-core.test.mjs` 43 · `strategic-radar-contract.test.mjs` 22 (ejecuta los Code nodes reales de 25) · `ui-tests.mjs` **167 ok / 0 fallos** (Playwright contra n8n simulado: nav de 6 secciones, 4 pestañas, apagado/vacío/caído/no disponible/fila mala, 360 y 390 px sin scroll horizontal, filas ≥ 44 px, ningún botón de contactar/enviar/inscribir, `Hoy` no consulta el Radar, el «Radar» de Prospección intacto). Suite completa: **60/60 suites, 1695 pruebas** (base 58/1631). `tsc --noEmit` y `eslint src` limpios.
**Patrón de seguridad verificado contra `20261017_os_v3_cimientos.sql`:** idéntico (`enable row level security` + `revoke all … from anon, authenticated`, sin políticas, sin SECURITY DEFINER).
**No verificado en vivo:** que el sandbox de n8n exponga `URL`, `TextEncoder` e `Intl` (el núcleo los usa para URL canónica, SHA-256 y fecha de Santiago); la prueba local los ejecuta en un contexto vacío pero con esos globales. Se comprueba en la parada F7 al actualizar el workflow vivo. Tampoco se verificó el JSON contra el n8n real.
**Pendiente de F2 (para F6):** badge/tarjeta del Radar en «Hoy» y señales en el Daily (`strategic_today` ya existe pero nadie lo llama todavía).
