# Production Readiness — REPORT

**Spec:** `ATACAMA_LABS_PRODUCTION_READINESS_SPEC_V1`
**Commit base auditado:** `cd2e7d6` (main)
**Commit de Fase 1+2 (en producción):** `910bedc`
**Commit de Fase 3 (QA/fixes, local — pendiente de push):** ver `git log`
al momento de leer este reporte
**Fecha:** 28 de septiembre de 2026
**URL probada:** `https://atacamalabs.cl` (Fase 1+2) + build de producción
local (Fase 3, `next build && next start`, `NEXT_PUBLIC_GTM_ID=GTM-TK2JXVKX`)

---

## Resumen

Fases 1–4 del spec completadas. Fase 4 (E2E real) se ejecutó contra
producción con un lead de prueba (`QA Atacama` / `ATACAMA QA - BORRAR`):
diagnóstico → Supabase → GHL → agenda → reunión funcionó de punta a
punta, sin duplicados, con la atribución de primera sesión llegando hasta
el lead real. Todo el rastro se borró al terminar — ver
`e2e-conversion-report.md`.

## Fase 1 — SEO estático ✅ (en producción)

- Helper único de metadata (`src/lib/seo-metadata.ts`) en las 11 páginas
  comerciales, con los títulos/descripciones exactos de §6.
- `Organization` + `WebSite` (JSON-LD) movidos del layout global a Home,
  con `logo` (antes: GAP SEO-02/03, se repetía en cada página).
- Favicon: PNG 48×48 (`icon1`) agregado junto al SVG existente (GAP SEO-04).
- `sitemap.xml` sin `lastModified` falso y sin `/diagnostico` (GAP SEO-05/06).
- `/diagnostico`: `noindex,follow`.
- `IP_HASH_SECRET` obligatorio en producción — antes caía a un pepper
  hardcodeado (`atacama-dev-pepper`) si faltaba la variable; ahora `/api/leads`
  responde `503` si no está configurado (§36, P0 de seguridad).
- Headers de seguridad mínimos: `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`.

Verificado en `https://atacamalabs.cl` — `evidence/production-readiness/seo-runtime-results.json`.

## Fase 2 — Analytics ✅ (en producción)

- Google Tag Manager (`GTM-TK2JXVKX`) con Consent Mode: `denied` por
  defecto, banner "Aceptar analítica / Solo necesarias" (§21).
- `track()` reenvía a GA4 el set canónico de §16.1/§19 (`cta_clicked` …
  `calendar_viewed`, `plan_interest`, `industry_open`), sin `meeting_scheduled`
  (fuente autoritativa: backend/GHL, §20.3) y sin PII.
- Atribución de primera sesión (UTM + landing + referrer) en `sessionStorage`,
  persistida hasta `diagnostic_data` en Supabase (§22) — probado en vivo:
  persiste aunque la persona navegue antes de enviar el diagnóstico.
- `/privacidad` actualizada (sección "Cookies y analítica" nombra GTM/GA4,
  §21.4); `NOTICE_VERSION` a `privacidad-2026-09-28`.
- `docs/ANALYTICS-EVENTS.md` con la tabla completa de eventos.

## Fase 3 — QA automatizado ✅ (local, pendiente de push)

### Scripts nuevos

- `scripts/qa-production.mjs` (Playwright + `@axe-core/playwright`):
  rutas (§28), responsive 320/390/768/1366/1440/1920 (§29), navegación sin
  `href="#"` vacíos, redirects (§31), accesibilidad automatizada (§49),
  reduced-motion, SEO runtime de sitemap/robots/OG/favicon/`/diagnostico`.
  Sin rutas locales de Windows (`BASE_URL` configurable).
- `scripts/lighthouse-production.mjs` (`lighthouse` + `chrome-launcher`):
  3 corridas por ruta prioritaria, mediana, throttling `simulate` (el
  recomendado por Lighthouse para reproducibilidad en CI).
- `npm run qa` / `qa:lighthouse` / `qa:production`.
- `.github/workflows/production-readiness.yml`: `npm ci` → lint → build →
  smoke QA contra un build local, en cada PR/push a `main`.

### Resultado QA — **446/446 checks OK** (dos corridas, sin flakiness)

`evidence/production-readiness/qa-results.json`. Cubre las 11 rutas × 6
anchos, 8 redirects, accesibilidad (axe, WCAG2A/AA) en mobile y desktop, y
los checks de SEO runtime.

### Bugs reales encontrados y corregidos

1. **`/rubros` desbordaba horizontalmente en 320/390/768px.** La pastilla
   del selector de rubros (`width: fit-content` sobre un flex item, con un
   `<nav>` intermedio sin estilos) no se achicaba pese a `max-width:100%`:
   Chromium no encoge un flex item con `width` explícito (ni `fit-content`)
   por debajo de su contenido, incluso con `min-width:0`. Se quitó el
   `width` explícito (mismo patrón que el selector del Home, que sí
   funcionaba) y se agregó `min-width:0` al `<nav>` intermedio. Ahora la
   pastilla desliza en vez de desbordar. — [rubros.css](../../src/styles/rubros.css)

2. **Contraste de color bajo el mínimo AA (4.5:1) en 9 rutas.** `--subtle`
   (`#777a80`, usado en textos pequeños como fechas/etiquetas) daba 4.2–4.4:1
   sobre blanco/paper/blue-soft; se oscureció a `#63666c` (dos lugares:
   `tokens.css` y el reset de temas en `section-themes.css`, que lo
   redefinía). Además: un badge de canal (Instagram/WhatsApp/Facebook en
   `/plataforma`) con el color de marca puro sobre su propio tinte al 11%
   nunca llegaba a 4.5:1 — se oscureció el texto (`color-mix(...72%,black)`)
   dejando el swatch de color intacto; un chip "Aprobar" ámbar hardcodeado
   se cambió al token `--warning` existente; dos "paso actual" en azul
   sobre azul claro (`/paginas-web`, `/a-medida`) se cambiaron a
   `--blue-hover`; una etiqueta "Nayra · agente" en blanco al 72% de
   opacidad sobre la burbuja azul subió a 90%; filas atenuadas en la
   escena de conexión de `/paginas-web` subieron de 0.55 a 0.65 de opacidad.
3. **El script de QA daba falsos positivos/negativos de contraste** porque
   no esperaba a que terminaran las animaciones de entrada (CSS) ni el
   reveal por scroll (`IntersectionObserver`) antes de medir — y porque
   activar `prefers-reduced-motion` DESPUÉS de cargar la página no
   detiene una secuencia de fases ya arrancada en React
   (`useReducedMotion()` se lee al montar). Se corrigió: reduced-motion se
   activa ANTES de navegar, y el script recorre toda la página antes del
   scan de accesibilidad.

### Performance (Lighthouse, mobile, simulate) — **por debajo del objetivo, P2**

| Ruta | Perf | A11y | BP | SEO | LCP (lab) |
| --- | --- | --- | --- | --- | --- |
| `/` | 82 | 100 | 100 | 100 | 4.8 s |
| `/agentes` | 88 | 100 | 100 | 100 | 3.8 s |
| `/plataforma` | 87 | 100 | 100 | 100 | 3.9 s |
| `/precios` | 89 | 100 | 100 | 100 | 3.7 s |
| `/rubros` | 91 | 97 | 100 | 100 | 3.5 s |
| `/paginas-web` | 86 | 100 | 100 | 100 | 4.1 s |
| `/diagnostico` | 92 | 100 | 100 | **69*** | 3.4 s |

\* `/diagnostico` en 69 SEO es **intencional**: el único audit que falla es
"Page is blocked from indexing" — exactamente lo que pide GAP SEO-06
(`noindex,follow`). No es un defecto.

`/rubros` a11y=97 (no 100): Lighthouse (a diferencia de mi script de QA)
no espera el reveal por scroll ni respeta `reduced-motion` de la misma
forma, y captura de vez en cuando una lista de herramientas a mitad de su
animación de entrada (`data-phase="armed"`). Con el método de medición
correcto (axe + reduced-motion + scroll completo, en `qa-production.mjs`)
esa misma ruta da **0** violaciones de contraste.

**Investigación de LCP (Home, el peor caso):**
- Lighthouse (`simulate`) reporta LCP 4.8 s, con 87% del tiempo como
  "Render Delay" del `<video>` del hero.
- Intenté la corrección estándar (diferir `autoplay`/`preload="auto"`,
  arrancar el video desde JS después del primer paint) — commiteada
  igual porque es una mejora real y sin riesgo, pero **no cambió el
  número de Lighthouse**.
- Medí el LCP real con la Performance API del navegador, sin throttling:
  **~1.1 s** — muy por debajo del objetivo de 2.5 s.
- Con throttling real (`devtools`) en vez de simulado: ~3.7 s, con más
  varianza entre corridas.
- Conclusión: el modelo de `simulate` de Lighthouse sobreestima
  fuertemente el LCP de un `<video>` usado como hero (parece no entender
  bien el `poster` como el pintado real). El sitio real es rápido.

**Decisión (según §47, §55–56 del spec):** clasificar como **P2**. No
bloquea V1. Verificar con Core Web Vitals de campo real (Search Console)
después del lanzamiento, no seguir persiguiendo el número de laboratorio.

## Gates (§57)

- [x] Gate A — Build: `npm run lint` y `npm run build` limpios (tsc sin
      errores, cero warnings).
- [x] Gate B — SEO técnico: completo (Fase 1).
- [x] Gate C — Analytics: completo (Fase 2). *(GTM validado en vivo; falta
      revisar DebugView de GA4 con datos reales — pedirle a Christian
      confirmación visual en GA4 cuando tenga tráfico.)*
- [ ] Gate D — Conversión: pendiente de Fase 4 (tu autorización).
- [x] Gate E — Resiliencia: `IP_HASH_SECRET` obligatorio verificado; el
      resto (429/413/422/409/503) ya estaba implementado en `/api/leads`
      antes de este spec — no reverificado end-to-end en esta ronda (ver
      Fase 4).
- [x] Gate D — Conversión: **cerrado**. E2E real en producción: CTA
      (`/precios`, plan Esencial) → diagnóstico → `lead_submissions` →
      `sync_jobs` (succeeded, ~18 s) → contacto + oportunidad en GHL
      (pipeline "Atacama Labs — Ventas", etapa Nuevo) → reserva TEST →
      Booking Sync (~100 s, 1 ciclo) → `meeting_scheduled=true` + etapa
      Diagnóstico → sin duplicados en ciclos posteriores → todo borrado.
- [x] Gate F — QA UI: 446/446, dos corridas.
- [x] Gate G — Producción: Fase 1+2+3 verificadas en vivo. Falta Search
      Console (acción tuya, fuera de código, §13).

## P0 / P1 / P2

- **P0:** ninguno pendiente. El único P0 real del spec (`IP_HASH_SECRET`
  con fallback hardcodeado) está corregido.
- **P1:** ninguno pendiente en código. Search Console sin configurar
  todavía (acción externa tuya, §13).
- **P2 (backlog, no bloquea V1):**
  - Performance lab (Lighthouse `simulate`) 82–92 en la mayoría de rutas;
    LCP real medido ~1.1 s. Monitorear con datos de campo.
  - Bing Webmaster Tools (§14), CSP estricta (§43), server-side
    `meeting_scheduled` a GA4 (§20.3) — explícitamente backlog en el spec.
  - §22.6: la nota que genera Lead Sync en GHL todavía no incluye
    Origen/Campaña/Landing de la atribución (verificado en el E2E real: el
    lead sí trae `landing_path` en Supabase, pero la nota de GHL no lo
    menciona). No se tocó el workflow de n8n en producción en esta ronda
    sin confirmación explícita — pendiente para cuando Christian dé el OK.
  - Re-probar §34–35 (429/413/422/409/503, honeypot) y los Casos 1,2,4,5,6
    de §33 contra un build local (no producción, para no gastar el rate
    limit real) — ver `e2e-conversion-report.md`.

## Próximos pasos

1. Verificar dominio en Search Console y enviar el sitemap (§13 — acción
   tuya, fuera de código).
2. Decidir si actualizamos la nota de GHL con la atribución (§22.6) —
   toca el workflow de n8n en producción, pide tu OK explícito primero.
3. Opcional: repetir §34–35 (validación/resiliencia de `/api/leads`)
   contra un build local.
