#!/usr/bin/env node
// Corre TODAS las suites offline de Atacama OS y falla si alguna falla. Compuerta antes de llevar cambios a main:
//   node scripts/run-all-tests.mjs        (≈ 1 min, sin red, sin tocar nada)
import { spawnSync } from 'node:child_process';

const SUITES = [
  'scripts/ops/ops-core.test.mjs', 'n8n/build/ops.test.mjs',
  'scripts/linkedin/linkedin-core.test.mjs', 'n8n/build/linkedin.test.mjs',
  'scripts/outreach/outreach-core.test.mjs', 'n8n/build/outreach.test.mjs',
  'scripts/prospecting/gateway-core.test.mjs', 'scripts/prospecting/gateway-flow.test.mjs', 'scripts/prospecting/admit-core.test.mjs',
  'n8n/build/prospect-gateway.test.mjs', 'n8n/build/prospect-flow.test.mjs', 'n8n/build/hermes-operator.test.mjs', 'scripts/operator/operator-core.test.mjs',
  'n8n/build/content-engine.test.mjs', 'n8n/build/content-signals.test.mjs', 'n8n/build/content-sync.test.mjs', 'n8n/build/content-metrics.test.mjs',
  'scripts/content/engine-core.test.mjs', 'scripts/content/signal-core.test.mjs', 'scripts/content/metrics-core.test.mjs',
  'n8n/build/won-to-client.test.mjs', 'ops/hermes/radar-prompt.test.mjs',
];

let failed = 0, total = 0;
for (const f of SUITES) {
  const r = spawnSync(process.execPath, [f], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const last = out.trim().split('\n').filter(Boolean).pop() || '';
  const m = out.match(/(\d+) ok(?:,| )\s*(\d+)? ?fallos?/) || out.match(/^(\d+) ok$/m);
  const nOk = m ? Number(m[1]) : 0;
  const bad = r.status !== 0 || /\bFAIL\b/.test(out) || /\b[1-9]\d* fallos?\b/.test(out);
  total += nOk;
  if (bad) failed++;
  console.log((bad ? 'FALLA ' : 'ok    ') + f.padEnd(52) + (bad ? last.slice(0, 120) : nOk + ' pruebas'));
}
console.log(`\n${SUITES.length - failed}/${SUITES.length} suites ok · ${total} pruebas`);
process.exit(failed ? 1 : 0);
