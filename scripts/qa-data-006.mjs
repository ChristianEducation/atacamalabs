import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import assert from "node:assert/strict";
const root = process.cwd(),
  load = createRequire(path.join(root, "package.json"));
const ts = load("typescript"),
  React = load("react"),
  { renderToStaticMarkup } = load("react-dom/server");
const cache = new Map();
function sourceModule(file) {
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const resolve = (id) => {
    if (!id.startsWith("@/")) return load(id);
    const base = path.join(root, "src", id.slice(2));
    const target = ["", ".tsx", ".ts", ".json"]
      .map((ext) => base + ext)
      .find((p) => fs.existsSync(p));
    return sourceModule(target);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, {
    filename: file,
  })(resolve, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { AgentPlans } = sourceModule(
  path.join(root, "src/components/AgentPlans.tsx"),
);
const { AgentDemo } = sourceModule(
  path.join(root, "src/components/AgentDemo.tsx"),
);
const { validDemoUrl, money, getAgentPlan } = sourceModule(
  path.join(root, "src/lib/agents-offer.ts"),
);
const offer = JSON.parse(
  fs.readFileSync("src/content/agents-offer.json", "utf8"),
);
function render(pricing) {
  return renderToStaticMarkup(
    React.createElement(AgentPlans, {
      pricing,
      commonAvailability: offer.integrations.commonAvailability,
    }),
  );
}
let pricing = structuredClone(offer.pricing),
  html = render(pricing);
assert.match(html, /299\.000/);
assert.doesNotMatch(html, /249\.000|IVA|ilimitad/);
pricing.priceMode = "confirmed";
pricing.plans[0].monthlyPrice = null;
pricing.plans[0].setupPrice = null;
html = render(pricing);
assert.match(html, /Consultar/);
assert.doesNotMatch(html, /NaN|Valores referenciales/);
pricing.promoEnabled = true;
pricing.promoTerms = null;
html = render(pricing);
assert.doesNotMatch(html, /249\.000/);
pricing.promoTerms = "Condiciones de prueba QA";
html = render(pricing);
assert.match(html, /249\.000/);
assert.match(html, /499\.000/);
pricing.plans[0].monthlyPrice = 123456789012;
html = render(pricing);
assert.match(html, /123\.456\.789\.012/);
fs.writeFileSync("evidence/visual-006/pricing-fixture.html", html);
assert.equal(money(null), "Consultar");
assert.equal(getAgentPlan("ajeno"), undefined);
assert.equal(validDemoUrl("javascript:alert(1)", ["null"]), false);
assert.equal(
  validDemoUrl("https://example.test/chat", ["https://example.test"]),
  true,
);
for (const status of [
  "INTEGRATION_REQUIRED",
  "CONFIGURED_NOT_VERIFIED",
  "READY",
]) {
  const config = { ...offer.demo, status };
  const output = renderToStaticMarkup(
    React.createElement(AgentDemo, { config }),
  );
  assert.match(output, /Solicita una demostración/);
  assert.doesNotMatch(output, /<iframe/);
}
fs.writeFileSync(
  "evidence/visual-006/data-results.json",
  JSON.stringify(
    {
      reference: "PASS",
      confirmed: "PASS",
      null: "PASS",
      promoOff: "PASS",
      promoTermsRequired: "PASS",
      promoSetupOnly: "PASS",
      long: "PASS",
      allowlist: "PASS",
      demoMissing: "PASS",
    },
    null,
    2,
  ),
);
console.log(
  "PASS: reference/confirmed/null/long, promotion guard, plan and origin allowlists, missing demo states.",
);
