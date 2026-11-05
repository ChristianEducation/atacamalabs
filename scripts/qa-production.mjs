#!/usr/bin/env node
/**
 * QA reproducible — PRODUCTION_READINESS_SPEC_V1 §25, §28-31, §49-51.
 * Reemplaza scripts/qa-006.mjs (rutas antiguas, precios antiguos, ruta local
 * de runtime de Codex/Windows). Sin dependencias de `C:/Users/alain/...`:
 * usa `playwright`/`@axe-core/playwright` como devDependency.
 *
 * Uso:
 *   npm run qa                         # contra http://localhost:3000
 *   BASE_URL=https://atacamalabs.cl npm run qa   # contra producción
 *
 * Requiere un server ya corriendo en BASE_URL (`next start` o `next dev`,
 * o el dominio de producción). No levanta el server por sí mismo.
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EVIDENCE_DIR = process.env.EVIDENCE_DIR || path.join(__dirname, "../evidence/production-readiness");
mkdirSync(EVIDENCE_DIR, { recursive: true });

/** §28 — matriz de rutas. */
const ROUTES = [
  "/",
  "/agentes",
  "/plataforma",
  "/a-medida",
  "/paginas-web",
  "/precios",
  "/rubros",
  "/conocenos",
  "/diagnostico",
  "/privacidad",
  "/terminos",
  // SEO_GROWTH_SPEC_V1 §8, §15 — landings indexables de Rubros y Agentes.
  "/rubros/salud",
  "/rubros/inmobiliarias",
  "/rubros/educacion",
  "/rubros/retail-ecommerce",
  "/rubros/alimentacion-casinos",
  "/rubros/gimnasios",
  "/rubros/servicios-profesionales",
  "/rubros/b2b-industria",
  "/rubros/contabilidad-finanzas",
  "/agentes/comercial",
  "/agentes/cobranza",
  "/agentes/administrativo-financiero",
  "/agentes/atencion",
  "/agentes/agendamiento",
  "/agentes/procesos",
  "/agentes/whatsapp",
];

/** §29 — matriz responsive obligatoria. */
const VIEWPORTS = [
  { width: 320, height: 780 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 900 },
  { width: 1440, height: 960 },
  { width: 1920, height: 1080 },
];
/** Accesibilidad automatizada: una vez por ruta en desktop y en mobile (no por cada breakpoint). */
const A11Y_WIDTHS = new Set([390, 1366]);

/** §31 — redirects permanentes a probar. [origen, substring esperado en el destino final] */
const REDIRECTS = [
  ["/contacto", "/diagnostico"],
  ["/privacy", "/privacidad"],
  ["/agenda", "/diagnostico"],
  ["/nosotros", "/conocenos"],
  ["/industrias", "/rubros"],
  // /rubros/salud y /rubros/gimnasios ya no redirigen (SEO_GROWTH_SPEC_V1 §8):
  // son páginas propias, cubiertas en ROUTES. Solo quedan los slugs viejos.
  ["/rubros/servicios-b2b", "/rubros/b2b-industria"],
  ["/rubros/fitness-bienestar", "/rubros/gimnasios"],
];

const results = { baseUrl: BASE_URL, startedAt: new Date().toISOString(), checks: [] };
let failures = 0;

function record(name, pass, detail) {
  results.checks.push({ name, pass, detail: detail ?? null });
  if (!pass) {
    failures++;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

async function checkRoutePage(page, route, width) {
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;
  record(`${route} [${width}px] → 200`, status === 200, `status=${status}`);
  if (status !== 200) return;

  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    h1Count: document.querySelectorAll("h1").length,
    hasMain: Boolean(document.querySelector("main")),
    hasHeader: Boolean(document.querySelector("header")),
    hasFooter: Boolean(document.querySelector("footer")),
    hasSkipLink: Boolean(document.querySelector(".mk-skip")),
    emptyHashLinks: Array.from(document.querySelectorAll('a[href="#"]')).length,
  }));
  record(`${route} [${width}px] sin overflow horizontal`, !state.overflow);
  record(`${route} [${width}px] un solo H1`, state.h1Count === 1, `h1Count=${state.h1Count}`);
  record(`${route} [${width}px] landmarks (header/main/footer)`, state.hasHeader && state.hasMain && state.hasFooter);
  record(`${route} [${width}px] skip link presente`, state.hasSkipLink);
  record(`${route} [${width}px] cero enlaces href="#" vacíos`, state.emptyHashLinks === 0, `count=${state.emptyHashLinks}`);
}

/** Recorre toda la página para que el reveal por IntersectionObserver (.mk-reveal) llegue a su estado final antes de medir contraste: si no, axe mide contenido bajo el pliegue en su opacity de partida, no la que ve una persona real. */
async function scrollThroughPage(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight);
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
}

async function checkAccessibility(page, route, width) {
  // reduced-motion: evita falsos positivos de contraste a mitad de una
  // animación de entrada (opacity 0→1) — el sitio ya usa reduced-motion como
  // fallback instantáneo real (§49), así que también es el estado estable
  // correcto para medir. `.lety-status` (widget de terceros) queda excluido:
  // no es CSS nuestro, y su contraste real (4.46) es casi el mínimo (4.5).
  //
  // Se re-navega DESPUÉS de activar reduced-motion (no basta con activarlo
  // sobre la página ya cargada): componentes como IndustryDemo leen
  // `prefers-reduced-motion` una vez al montar (useReducedMotion) y, si en
  // ese momento no estaba activo, igual arrancan su secuencia de fases
  // (static→armed→play) con temporizadores propios — cambiar el media query
  // después no la detiene, y el scan queda a merced de en qué paso de esa
  // secuencia caiga (violaciones de contraste intermitentes).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  await scrollThroughPage(page);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude('[data-lety-widget=""]')
    .analyze();
  await page.emulateMedia({ reducedMotion: null });
  const critical = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  record(
    `${route} [${width}px] accesibilidad (axe, sin violaciones serious/critical)`,
    critical.length === 0,
    critical.length ? critical.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`).join("; ") : undefined,
  );
}

async function checkReducedMotion(page, route) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  record(`${route} carga con prefers-reduced-motion`, (response?.status() ?? 0) === 200);
  await page.emulateMedia({ reducedMotion: null });
}

async function checkRedirects() {
  for (const [source, expectedSubstring] of REDIRECTS) {
    try {
      const res = await fetch(`${BASE_URL}${source}`, { redirect: "manual" });
      const isRedirect = res.status === 301 || res.status === 308 || res.status === 307 || res.status === 302;
      const location = res.headers.get("location") ?? "";
      record(`redirect ${source} → 30x`, isRedirect, `status=${res.status}`);
      record(`redirect ${source} destino contiene "${expectedSubstring}"`, location.includes(expectedSubstring), `location=${location}`);
    } catch (err) {
      record(`redirect ${source}`, false, String(err));
    }
  }
}

async function checkSeoFiles() {
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemapBody = await sitemapRes.text();
  record("sitemap.xml → 200", sitemapRes.status === 200);
  record("sitemap.xml sin /diagnostico", !sitemapBody.includes("/diagnostico"), undefined);
  record("sitemap.xml sin lastmod falso", !sitemapBody.includes("<lastmod>"), undefined);

  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  const robotsBody = await robotsRes.text();
  record("robots.txt → 200", robotsRes.status === 200);
  record("robots.txt sin disallow global", !/Disallow:\s*\/\s*$/m.test(robotsBody), undefined);

  const ogRes = await fetch(`${BASE_URL}/opengraph-image`);
  record("opengraph-image → 200", ogRes.status === 200, `status=${ogRes.status}`);

  const faviconRes = await fetch(`${BASE_URL}/icon.svg`);
  record("icon.svg → 200", faviconRes.status === 200);
  const icon1Res = await fetch(`${BASE_URL}/icon1`);
  record("icon1 (PNG 48x48) → 200", icon1Res.status === 200, `status=${icon1Res.status}`);

  const diagRes = await fetch(`${BASE_URL}/diagnostico`);
  const diagBody = await diagRes.text();
  record("/diagnostico → noindex,follow", /name="robots" content="noindex, ?follow"/.test(diagBody));

  const notFoundRes = await fetch(`${BASE_URL}/esto-no-existe-404-test`);
  record("ruta inexistente → 404", notFoundRes.status === 404, `status=${notFoundRes.status}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const { width, height } of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    for (const route of ROUTES) {
      await checkRoutePage(page, route, width);
      if (A11Y_WIDTHS.has(width)) await checkAccessibility(page, route, width);
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await checkReducedMotion(page, "/");
  await checkReducedMotion(page, "/rubros");

  await browser.close();

  await checkRedirects();
  await checkSeoFiles();

  results.finishedAt = new Date().toISOString();
  results.total = results.checks.length;
  results.failures = failures;
  writeFileSync(path.join(EVIDENCE_DIR, "qa-results.json"), JSON.stringify(results, null, 2));

  console.log(`\n${results.total - failures}/${results.total} checks OK. Resultado en ${path.join(EVIDENCE_DIR, "qa-results.json")}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) fallaron.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
