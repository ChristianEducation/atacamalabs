#!/usr/bin/env node
/**
 * Chequeo funcional de SOLO LECTURA contra los webhooks vivos de Atacama OS (tras un despliegue).
 *   node scripts/ops/n8n-read.mjs ops '{"action":"panel"}'          → 25 Atacama Ops (clave de ingesta)
 *   node scripts/ops/n8n-read.mjs actions '{"action":"overview"}'   → 29 Ops Actions (clave de /ops); SOLO acciones de lectura
 * Imprime un resumen (o el JSON con --raw). Nunca imprime claves. Se niega a mandar acciones de escritura a 29.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [target, bodyArg, flag] = process.argv.slice(2);
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const body = JSON.parse(bodyArg || '{}');
const READ_29 = ['overview', 'ideas_list', 'taller_list', 'week_status', 'history_list'];
let url, headers;
if (target === 'ops') { url = env.N8N_BASE_URL.replace(/\/$/, '') + '/webhook/atacama-ops'; headers = { 'X-Atacama-Key': env.ATACAMA_INGEST_KEY }; }
else if (target === 'actions') {
  if (!READ_29.includes(body.action)) { console.error('Solo lecturas en 29: ' + READ_29.join(', ')); process.exit(2); }
  url = env.N8N_BASE_URL.replace(/\/$/, '') + '/webhook/atacama-ops-actions'; headers = { 'X-Ops-Approval': env.OPS_APPROVAL_KEY };
} else { console.error('uso: n8n-read.mjs ops|actions \'{"action":"…"}\' [--raw]'); process.exit(2); }
if (!Object.values(headers)[0]) { console.error('Falta la clave en .env.local para ' + target); process.exit(2); }
const t0 = Date.now();
const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const j = await r.json().catch(() => null);
console.log('HTTP', r.status, '·', Date.now() - t0, 'ms');
if (flag === '--raw') { console.log(JSON.stringify(j, null, 1)); process.exit(0); }
const out = j && j.panel ? { ok: j.ok, panel_keys: Object.keys(j.panel), v3: j.panel.v3 ? { pause: j.panel.v3.pause, nav_v2: j.panel.v3.nav_v2, inbox: j.panel.v3.inbox && j.panel.v3.inbox.items.map((i) => i.kind + ':' + i.count) } : null, missing: j.panel.missing } : j;
console.log(JSON.stringify(out, null, 1).slice(0, 3000));
