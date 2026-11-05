#!/usr/bin/env node
/**
 * Lighthouse reproducible — PRODUCTION_READINESS_SPEC_V1 §26, §47. Reemplaza
 * scripts/lighthouse-006.mjs (dependía de un runtime local de Codex/Windows
 * y de Playwright para lanzar Chrome). Usa `lighthouse` + `chrome-launcher`
 * como devDependency; 3 corridas por ruta, se reporta la mediana.
 *
 * Uso:
 *   npm run qa:lighthouse                        # contra http://localhost:3000
 *   BASE_URL=https://atacamalabs.cl npm run qa:lighthouse
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EVIDENCE_DIR = process.env.EVIDENCE_DIR || path.join(__dirname, "../evidence/production-readiness");
mkdirSync(EVIDENCE_DIR, { recursive: true });

/** §47 — rutas prioritarias. */
const ROUTES = ["/", "/agentes", "/plataforma", "/precios", "/rubros", "/paginas-web", "/diagnostico"];
const RUNS_PER_ROUTE = 3;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runRoute(route, port) {
  const runs = [];
  for (let i = 0; i < RUNS_PER_ROUTE; i++) {
    const result = await lighthouse(`${BASE_URL}${route}`, {
      port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "mobile",
      screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 2.625, disabled: false },
      // "simulate" (recomendado por Lighthouse para reproducibilidad) infla
      // el LCP del hero en video a ~4.8s ("Render Delay" ~88% del total);
      // "devtools" (throttling real) da ~3.7s con más varianza entre
      // corridas; la API real de PerformanceObserver sin throttling mide
      // ~1.1s. Documentado en evidence/production-readiness/REPORT.md como
      // P2 — no bloquea V1 (§47), a validar con Core Web Vitals de campo
      // (Search Console) tras el lanzamiento.
      throttlingMethod: "simulate",
    });
    const { categories, audits } = result.lhr;
    runs.push({
      performance: Math.round(categories.performance.score * 100),
      accessibility: Math.round(categories.accessibility.score * 100),
      bestPractices: Math.round(categories["best-practices"].score * 100),
      seo: Math.round(categories.seo.score * 100),
      lcpMs: audits["largest-contentful-paint"].numericValue,
      clsScore: audits["cumulative-layout-shift"].numericValue,
      inpMs: audits["interaction-to-next-paint"]?.numericValue ?? null,
    });
  }
  return {
    route,
    runs,
    median: {
      performance: median(runs.map((r) => r.performance)),
      accessibility: median(runs.map((r) => r.accessibility)),
      bestPractices: median(runs.map((r) => r.bestPractices)),
      seo: median(runs.map((r) => r.seo)),
      lcpMs: Math.round(median(runs.map((r) => r.lcpMs))),
      clsScore: Number(median(runs.map((r) => r.clsScore)).toFixed(3)),
    },
  };
}

/** §47 — objetivos de release (móvil). */
const TARGETS = { performance: 90, accessibility: 95, bestPractices: 95, seo: 95 };

async function main() {
  const chrome = await launch({ chromeFlags: ["--headless=new"] });
  const results = { baseUrl: BASE_URL, startedAt: new Date().toISOString(), routes: [] };
  try {
    for (const route of ROUTES) {
      console.log(`Lighthouse ×${RUNS_PER_ROUTE}: ${route}`);
      const result = await runRoute(route, chrome.port);
      results.routes.push(result);
      const m = result.median;
      const belowTarget = Object.entries(TARGETS).filter(([key, target]) => m[key] < target);
      const flag = belowTarget.length
        ? `bajo objetivo: ${belowTarget.map(([k, t]) => `${k} ${m[k]}<${t}`).join(", ")}`
        : "OK";
      console.log(
        `  perf=${m.performance} a11y=${m.accessibility} bp=${m.bestPractices} seo=${m.seo} LCP=${m.lcpMs}ms CLS=${m.clsScore} — ${flag}`,
      );
    }
  } finally {
    await chrome.kill();
  }
  results.finishedAt = new Date().toISOString();
  results.targets = TARGETS;
  const outPath = path.join(EVIDENCE_DIR, "lighthouse-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResultado en ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
