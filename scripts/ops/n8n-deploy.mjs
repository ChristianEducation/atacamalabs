#!/usr/bin/env node
/**
 * Atacama OS · despliegue seguro de UN workflow n8n generado en el repo (HANDOFF §4, spec §0-4, anexo §K).
 *
 *   node scripts/ops/n8n-deploy.mjs <archivo.json> <workflowId>            → solo compara (no cambia nada)
 *   node scripts/ops/n8n-deploy.mjs <archivo.json> <workflowId> --apply    → respalda, despliega y verifica
 *   node scripts/ops/n8n-deploy.mjs <copia-parcheada-del-vivo.json> <id> --apply --live-patch  → SOLO 22/23: parche puntual sobre una copia del
 *       workflow vivo; exige que todos los nodos conserven EXACTAMENTE sus credenciales (las de Gmail viven solo en n8n).
 *
 * 1) Lee el workflow vivo y lo guarda en backups/<fecha>/n8n/wf-<id>-antes-<hora>.json (antes de cualquier cambio).
 * 2) Muestra qué nodos cambian (por nombre) entre lo vivo y lo generado: así se ve si el JSON local trae algo más que el cambio buscado.
 * 3) Con --apply: conserva id/webhookId/credenciales de los nodos vivos con el mismo nombre, desactiva, hace PUT, reactiva si estaba activo
 *    y vuelve a leer para confirmar que el código desplegado es exactamente el generado.
 * Se niega a tocar los workflows 22 y 23 (sus credenciales de Gmail viven solo en n8n). Lee N8N_BASE_URL y N8N_API_KEY de .env.local;
 * nunca los imprime.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [file, id, flag, flag2] = process.argv.slice(2);
const livePatch = flag2 === '--live-patch' || flag === '--live-patch';
if (!file || !id) { console.error('uso: node scripts/ops/n8n-deploy.mjs <archivo.json> <workflowId> [--apply]'); process.exit(2); }
const gen = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
const is2223 = /^Atacama Labs - 2[23] /.test(gen.name) || /-2[23]-/.test(path.basename(file));
if (is2223 && !livePatch) { console.error('PROHIBIDO: los workflows 22 y 23 no se despliegan desde el JSON (credenciales de Gmail). Solo se admite --live-patch sobre una copia del vivo.'); process.exit(3); }

const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const BASE = String(env.N8N_BASE_URL || '').replace(/\/$/, '');
const KEY = env.N8N_API_KEY;
if (!BASE || !KEY) { console.error('Falta N8N_BASE_URL o N8N_API_KEY en .env.local'); process.exit(2); }
const api = async (method, p, body) => {
  const r = await fetch(BASE + '/api/v1' + p, { method, headers: { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = null; }
  if (!r.ok) throw new Error(method + ' ' + p + ' → HTTP ' + r.status + ': ' + t.slice(0, 300));
  return j;
};
const h = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12);
const sig = (n) => h({ type: n.type, typeVersion: n.typeVersion, parameters: n.parameters, credentials: n.credentials || null, flags: [n.continueOnFail, n.alwaysOutputData, n.retryOnFail, n.maxTries, n.waitBetweenTries] });

const live = await api('GET', '/workflows/' + id);
if (live.name !== gen.name) { console.error('El nombre no coincide: vivo «' + live.name + '» vs generado «' + gen.name + '». No hago nada.'); process.exit(4); }
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const day = new Date().toISOString().slice(0, 10);
const dir = path.join(ROOT, 'backups', day, 'n8n');
fs.mkdirSync(dir, { recursive: true });
const bak = path.join(dir, 'wf-' + id + '-antes-' + stamp + '.json');
fs.writeFileSync(bak, JSON.stringify(live, null, 2));
console.log('respaldo:', path.relative(ROOT, bak));

const liveBy = Object.fromEntries(live.nodes.map((n) => [n.name, n]));
if (is2223) {
  const credDiff = gen.nodes.filter((n) => !liveBy[n.name] || JSON.stringify(n.credentials || null) !== JSON.stringify(liveBy[n.name].credentials || null)).map((n) => n.name);
  if (credDiff.length || gen.nodes.length !== live.nodes.length) { console.error('PROHIBIDO: --live-patch exige los mismos nodos y credenciales que el vivo. Distintos: ' + (credDiff.join(', ') || 'cantidad de nodos')); process.exit(3); }
}
const genBy = Object.fromEntries(gen.nodes.map((n) => [n.name, n]));
const added = gen.nodes.filter((n) => !liveBy[n.name]).map((n) => n.name);
const removed = live.nodes.filter((n) => !genBy[n.name]).map((n) => n.name);
const changed = gen.nodes.filter((n) => liveBy[n.name] && sig(n) !== sig(liveBy[n.name])).map((n) => n.name);
const connChanged = h(live.connections) !== h(gen.connections);
console.log('nodos nuevos:', added.length ? added.join(', ') : '—');
console.log('nodos quitados:', removed.length ? removed.join(', ') : '—');
console.log('nodos que cambian:', changed.length ? changed.join(', ') : '—');
console.log('conexiones cambian:', connChanged ? 'sí' : 'no', '· activo:', live.active);
if (flag !== '--apply') { console.log('\n(solo comparación; usa --apply para desplegar)'); process.exit(0); }
if (!added.length && !removed.length && !changed.length && !connChanged) { console.log('Nada que desplegar: lo vivo ya es igual al generado.'); process.exit(0); }

const nodes = gen.nodes.map((n) => { const l = liveBy[n.name]; return l ? { ...n, id: l.id, ...(l.webhookId ? { webhookId: l.webhookId } : {}), ...(l.credentials && !n.credentials ? { credentials: l.credentials } : {}) } : n; });
const ALLOWED = ['saveExecutionProgress', 'saveManualExecutions', 'saveDataErrorExecution', 'saveDataSuccessExecution', 'executionTimeout', 'errorWorkflow', 'timezone', 'executionOrder'];
const settings = Object.fromEntries(Object.entries({ ...(live.settings || {}), ...(gen.settings || {}) }).filter(([k]) => ALLOWED.includes(k)));
const wasActive = live.active === true;
if (wasActive) await api('POST', '/workflows/' + id + '/deactivate');
try {
  await api('PUT', '/workflows/' + id, { name: gen.name, nodes, connections: gen.connections, settings });
} catch (e) {
  console.error('PUT falló:', e.message);
  if (wasActive) await api('POST', '/workflows/' + id + '/activate').catch(() => {});
  process.exit(5);
}
if (wasActive) await api('POST', '/workflows/' + id + '/activate');
const after = await api('GET', '/workflows/' + id);
const afterBy = Object.fromEntries(after.nodes.map((n) => [n.name, n]));
const mismatch = gen.nodes.filter((n) => !afterBy[n.name] || h(afterBy[n.name].parameters) !== h(n.parameters)).map((n) => n.name);
console.log('desplegado. activo ahora:', after.active, '· nodos:', after.nodes.length, '· distintos del generado:', mismatch.length ? mismatch.join(', ') : 'ninguno');
if (mismatch.length || after.active !== wasActive) { console.error('VERIFICACIÓN FALLIDA. Revertir con: node scripts/ops/n8n-deploy.mjs ' + path.relative(ROOT, bak) + ' ' + id + ' --apply'); process.exit(6); }
console.log('Revertir si hace falta: node scripts/ops/n8n-deploy.mjs ' + path.relative(ROOT, bak).replace(/\\/g, '/') + ' ' + id + ' --apply');
