/* Local browser QA: every lead request is intercepted; no external writes. */
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loadModule = createRequire(import.meta.url);
import assert from "node:assert/strict";
const runtime =
  process.env.CODEX_NODE_MODULES ||
  "C:/Users/alain/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const { chromium } = loadModule(path.join(runtime, "playwright"));
const site = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/content/site.json"), "utf8"),
);
const origin = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidence = path.join(__dirname, "../evidence/visual-006");
fs.mkdirSync(evidence, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  let writes = 0;
  await p.route("**/api/leads", async (route) => {
    writes++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "received" }),
    });
  });
  const results = [];
  const routes = site.routes
    .filter((x) => !["privacy"].includes(x.kind))
    .map((x) => x.path);
  for (const width of [1920, 1440, 1366, 768, 390, 320]) {
    await p.setViewportSize({
      width,
      height: width < 768 ? 844 : width === 768 ? 1024 : 900,
    });
    for (const route of routes) {
      const response = await p.goto(origin + route);
      await p.evaluate(() => document.fonts.ready);
      assert.equal(response.status(), 200, route);
      const state = await p.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        h1: document.querySelectorAll("h1").length,
        font: getComputedStyle(document.querySelector("h1")).fontFamily,
        height: document.documentElement.scrollHeight,
      }));
      assert.equal(state.overflow, false, `${route} ${width} overflow`);
      assert.equal(state.h1, 1, `${route} h1`);
      assert.match(state.font, /Newsreader/);
      const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      if (width === 1366 || width === 390 || ["/", "/agentes"].includes(route))
        await p.screenshot({
          path: path.join(evidence, `${slug}-${width}-after.png`),
          fullPage: true,
        });
      results.push({ route, width, status: response.status(), ...state });
    }
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(origin);
  await p.getByRole("button", { name: "Abrir menú" }).click();
  await p.screenshot({ path: path.join(evidence, "menu-390-open.png") });
  assert.equal(
    await p
      .locator("#mobile-nav a")
      .first()
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await p.keyboard.press("Tab");
  await p.keyboard.press("Shift+Tab");
  assert.equal(
    await p
      .locator("#mobile-nav a")
      .first()
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await p.keyboard.press("Escape");
  assert.equal(
    await p
      .getByRole("button", { name: "Abrir menú" })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await p.getByRole("button", { name: "Abrir menú" }).click();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForFunction(() => !document.querySelector("#mobile-nav"));
  assert.equal(
    await p
      .locator(".desktop-nav a")
      .first()
      .evaluate((e) => e === document.activeElement),
    true,
  );
  const alias = await p.request.get(origin + "/casos", { maxRedirects: 0 });
  assert.equal(alias.status(), 308);
  assert.equal(alias.headers().location, "/proyectos");
  const anchors = [
    "capacidades",
    "procesos",
    "integraciones",
    "como-funciona",
    "demo",
    "plataforma",
    "planes",
    "a-medida",
  ];
  await p.goto(origin + "/agentes");
  assert.deepEqual(
    await p
      .locator("main section[id]")
      .evaluateAll((es) => es.map((e) => e.id)),
    anchors,
  );
  assert.equal(await p.locator("#demo iframe").count(), 0);
  assert.equal(
    await p.getByText("Acceso clientes", { exact: true }).count(),
    0,
  );
  const plans = await p.locator(".plan-card").allTextContents();
  assert.match(plans[0], /299.000/);
  assert.match(plans[1], /499.000/);
  assert.match(plans[2], /desde.*1.190.000/);
  assert.equal(await p.getByText("$249.000", { exact: true }).count(), 0);
  await p.goto(origin + "/contacto?servicio=agentes&plan=growth");
  assert.match(await p.locator("textarea").inputValue(), /Growth/);
  await p.goto(origin + "/contacto?servicio=agentes&plan=desconocido");
  assert.equal(await p.locator("textarea").inputValue(), "");
  await p.goto(origin + "/contacto?solucion=integraciones");
  assert.equal(await p.locator("select").inputValue(), "integraciones");
  await p.goto(origin + "/agenda");
  assert.equal(
    await p.getByRole("link", { name: "Reservar horario" }).count(),
    0,
  );
  await p.goto(origin + "/contacto?preview=estados");
  await p.screenshot({
    path: path.join(evidence, "contacto-states.png"),
    fullPage: true,
  });
  await p.goto(origin + "/studio/social/presentacion/0");
  const studioFont = await p
    .locator("h1,h2")
    .first()
    .evaluate((e) => getComputedStyle(e).fontFamily);
  assert.doesNotMatch(studioFont, /Newsreader/);
  await p.setViewportSize({ width: 1080, height: 1350 });
  await p.screenshot({ path: path.join(evidence, "studio-regression.png") });
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(origin);
  const motion = await p
    .locator(".service-portal")
    .first()
    .evaluate((e) => getComputedStyle(e).transitionDuration);
  assert.equal(motion, "1e-05s");
  const nojs = await b.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const nj = await nojs.newPage();
  await nj.goto(origin + "/agentes");
  assert.equal(await nj.locator("h1").isVisible(), true);
  await nojs.close();
  await p.setViewportSize({ width: 640, height: 740 });
  await p.goto(origin + "/contacto");
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  const ref=fs.readFileSync(path.resolve('../atacama-labs-spec/openspec/changes/006-visual-home-v2/references/logo-reference.png')).toString('base64');
  await p.setViewportSize({width:1440,height:1000});
  await p.setContent('<body style="background:#faf6f0;margin:32px;font-family:Arial"><div style="display:flex;gap:40px"><div><h2>Referencia privada de marca</h2><img width="720" src="data:image/png;base64,'+ref+'"></div><div><h2>Máster refinado</h2><img width="430" src="'+origin+'/brand/logo-stacked.svg"><h2>Header · 196 / 148 px</h2><img width="196" src="'+origin+'/brand/logo-horizontal.svg"> <img width="148" src="'+origin+'/brand/logo-horizontal.svg"></div></div></body>');
  await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await p.screenshot({path:path.join(evidence,'logo-result.png')});
  const summary = {
    browser: await b.version(),
    origin,
    routes: results,
    keyboard: "PASS",
    alias: "308 /proyectos",
    commercial: "PASS UI / real integrations pending",
    studioFont,
    motion,
    externalLeadWrites: 0,
    interceptedLeadRequests: writes,
  };
  fs.writeFileSync(
    path.join(evidence, "qa-results.json"),
    JSON.stringify(summary, null, 2),
  );
  await b.close();
  console.log(
    JSON.stringify({
      checks: results.length,
      keyboard: "PASS",
      commercial: "PASS UI",
      externalLeadWrites: 0,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
