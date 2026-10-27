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
- Pruebas: `scripts/ops/strategic-radar-core.test.mjs` = **39 pruebas** (cientos de aserciones: URL, huella, fechas, evidencia, productos 9+unknown≠90 %, licencia ausente, alianza inelegible, evento pasado/sin fecha, producción 1/2 caídas y 60 min, Daily 3 máx/orden, gate, vista y revisión estática de la migración). Suite total: ver abajo.
- Pendiente de F1 para F5: el equivalente Python de `srCanonicalUrl`/huella (fixtures compartidos) se hace con el monitor/MCP.
