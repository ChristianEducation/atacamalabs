import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const load = createRequire(import.meta.url),
  { chromium } = load(
    path.join(
      process.env.CODEX_NODE_MODULES ||
        "C:/Users/alain/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
      "playwright",
    ),
  );
const origin = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
let status = 201,
  requests = [];
await p.route("**/api/leads", async (r) => {
  requests.push(r.request().postDataJSON());
  await r.fulfill({
    status,
    contentType: "application/json",
    headers: { "Retry-After": "30" },
    body: JSON.stringify(
      status === 422
        ? { errors: { message: "Error sintético de QA" } }
        : { receiptId: "qa-only" },
    ),
  });
});
await p.goto(origin + "/contacto");
await p.getByRole("button", { name: "Enviar consulta", exact: true }).click();
assert.equal(requests.length, 0);
assert.ok((await p.getByRole("alert").count()) >= 1);
for (const code of [409, 429, 503, 422, 201]) {
  status = code;
  await p.goto(origin + "/contacto?servicio=agentes&plan=esencial");
  await p.locator("[name=name]").fill("Persona de prueba");
  await p.locator("[name=email]").fill("qa@example.test");
  await p.getByRole("button", { name: "Enviar consulta", exact: true }).click();
  if (code === 201)
    await p.getByRole("heading", { name: "Consulta recibida" }).waitFor();
  else {
    await p.getByRole("alert").first().waitFor();
    assert.match(await p.locator("textarea").inputValue(), /Esencial/);
  }
  await p.screenshot({
    path: `evidence/visual-006/contacto-mock-${code}.png`,
    fullPage: true,
  });
}
assert.equal(requests.length, 5);
for (const r of requests) {
  assert.equal(r.source, "web");
  assert.equal(r.solution, "unsure");
  assert.match(r.message, /Esencial/);
  assert.equal("plan" in r, false);
  assert.equal("servicio" in r, false);
}
await p.goto(origin + "/agentes");
const styles = await p
  .locator("link[rel=stylesheet]")
  .evaluateAll((es) => es.map((e) => e.href));
const fixture = fs.readFileSync(
  "evidence/visual-006/pricing-fixture.html",
  "utf8",
);
await p.setViewportSize({ width: 320, height: 740 });
await p.setContent(
  `<head>${styles.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}</head><body><div class="public-site section"><div style="padding:20px">${fixture}</div></div></body>`,
);
await p.evaluate(() => document.fonts.ready);
assert.equal(
  await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await p.screenshot({
  path: "evidence/visual-006/pricing-long-null-promo-320.png",
  fullPage: true,
});
fs.writeFileSync(
  "evidence/visual-006/form-results.json",
  JSON.stringify(
    {
      validation: "PASS",
      states: [409, 429, 503, 422, 201],
      requestContract: "unchanged",
      planIntent: "PASS",
      longPrice320: "PASS",
      externalWrites: 0,
    },
    null,
    2,
  ),
);
await b.close();
console.log(
  "PASS: contact validation, 409/429/503/422/201 intercepted, API contract, pricing fixture at 320.",
);
