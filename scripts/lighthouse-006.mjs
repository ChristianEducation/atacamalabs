import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url),
  runtime =
    process.env.CODEX_NODE_MODULES ||
    "C:/Users/alain/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const { chromium } = load(path.join(runtime, "playwright"));
const { default: lighthouse } = await import(
  pathToFileURL(
    path.resolve(".tmp/lighthouse/node_modules/lighthouse/core/index.js"),
  )
);
const browser = await chromium.launch({
  args: ["--remote-debugging-port=9222"],
});
const origin = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidence = process.env.EVIDENCE_DIR || "evidence/visual-006";
fs.mkdirSync(evidence, { recursive: true });
const routes = process.env.QA_ROUTES
  ? process.env.QA_ROUTES.split(",")
  : ["/", "/agentes", "/soluciones/integraciones"];
const results = [];
try {
  for (const route of routes) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const r = await lighthouse(origin + route, {
        port: 9222,
        output: "html",
        onlyCategories: ["performance", "accessibility"],
        logLevel: "error",
      });
      const audits = r.lhr.audits;
      runs.push({
        performance: r.lhr.categories.performance.score * 100,
        accessibility: r.lhr.categories.accessibility.score * 100,
        LCP: audits["largest-contentful-paint"].numericValue,
        CLS: audits["cumulative-layout-shift"].numericValue,
        failedAccessibility: r.lhr.categories.accessibility.auditRefs
          .filter((x) => x.weight > 0 && audits[x.id].score === 0)
          .map((x) => ({
            id: x.id,
            description: audits[x.id].description,
            items: audits[x.id].details?.items,
          })),
      });
      if (i === 2)
        fs.writeFileSync(
          `${evidence}/lighthouse-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}.html`,
          r.report,
        );
      console.log(
        JSON.stringify({
          route,
          run: i + 1,
          ...runs.at(-1),
          failedAccessibility: runs.at(-1).failedAccessibility.map((x) => x.id),
        }),
      );
    }
    const median = (key) => runs.map((x) => x[key]).sort((a, b) => a - b)[1];
    results.push({
      route,
      config:
        "Lighthouse default mobile simulated throttling / production localhost",
      runs,
      median: {
        performance: median("performance"),
        accessibility: median("accessibility"),
        LCP: median("LCP"),
        CLS: median("CLS"),
      },
    });
    fs.writeFileSync(
      `${evidence}/lighthouse-results.json`,
      JSON.stringify(results, null, 2),
    );
  }
} finally {
  await browser.close();
}
