#!/usr/bin/env node
/**
 * Radar estratégico · verificación de PREACTIVACIÓN contra n8n (solo lectura, rechazos previos a escribir y dry_run). NO activa nada y NO escribe datos.
 *
 *   node scripts/ops/radar-verify.mjs n8n [--env ruta/.env]    Tras desplegar los workflows 25/29 con todo APAGADO: comprueba que el Radar responde, que está apagado,
 *                                                               que las compuertas rechazan, que el entorno de n8n trae lo que el motor necesita (URL, Intl, UTF-8)
 *                                                               y que Daily/panel siguen sin señales ni «missing» del Radar.
 *   node scripts/ops/radar-verify.mjs n8n --expect-off=false   Igual, pero sin exigir que todo esté apagado (para etapas posteriores a propósito).
 *
 * Lee N8N_BASE_URL, ATACAMA_INGEST_KEY y OPS_APPROVAL_KEY de .env.local (o de --env). Nunca imprime claves. Solo habla con n8n por HTTPS.
 * Cada comprobación imprime PASS / FAIL; el código de salida es 1 si alguna falla.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const stage = args[0];
const flag = (n) => { const i = args.findIndex((a) => a === n || a.startsWith(n + '=')); if (i < 0) return null; return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true'); };
if (stage !== 'n8n') { console.error('uso: node scripts/ops/radar-verify.mjs n8n [--env ruta] [--expect-off=false]'); process.exit(2); }
const envFile = flag('--env') ? path.resolve(flag('--env')) : path.join(ROOT, '.env.local');
const expectOff = flag('--expect-off') !== 'false';
const env = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const BASE = String(env.N8N_BASE_URL || '').replace(/\/$/, '');
if (!BASE || !env.ATACAMA_INGEST_KEY) { console.error('Falta N8N_BASE_URL o ATACAMA_INGEST_KEY'); process.exit(2); }
if (!/^https:\/\//.test(BASE) && !(process.env.RADAR_VERIFY_ALLOW_HTTP === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE))) { console.error('N8N_BASE_URL debe ser https'); process.exit(2); }

const post = async (webhook, key, headerName, body) => {
  const r = await fetch(`${BASE}/webhook/${webhook}`, { method: 'POST', headers: { 'Content-Type': 'application/json', [headerName]: key }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  let j = null; try { j = await r.json(); } catch { j = null; }
  return { status: r.status, json: j };
};
const ops = (body) => post('atacama-ops', env.ATACAMA_INGEST_KEY, 'X-Atacama-Key', body);

let fail = 0, pass = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, detail ? '→ ' + String(detail).slice(0, 220) : ''); } };
const hourAgo = new Date(Date.now() - 3600000).toISOString();
const ev = (url, type) => ({ source_url: url, source_title: 'Fuente de prueba', source_type: type, claim: 'Dato de verificación (no es un hallazgo real)', excerpt: 'ñandú · 日本語 · 😀', source_published_at: null, verified_at: hourAgo });
// Hallazgos de PRUEBA para dry_run: UTF-8, host con tilde (IDN), fecha solo-día y zona horaria; si el entorno de n8n no los soporta, el dry_run lo dirá.
const sample = {
  products: { title: 'Repositorio de verificación ñandú', organization: 'Autor de prueba', canonical_url: 'https://münchen.example.org/Repo/?utm_source=x#readme', summary: 'Solo valida el entorno; no es un hallazgo.', business_case: 'Prueba de validación sin efecto alguno.', next_action: 'Ninguna: es una verificación', scoring: { license: 0, functionality: 5 }, requirements: [], license_id: null, license_verified: false, critical_blockers: ['Es una prueba'], evidence: [ev('https://münchen.example.org/Repo', 'repository')] },
  partners: { title: 'Programa de verificación', organization: 'Org de prueba', canonical_url: 'https://partners.example.org/programa', summary: 'Solo valida el entorno; no es un hallazgo.', business_case: 'Prueba de validación sin efecto alguno.', next_action: 'Ninguna: es una verificación', scoring: { fit: 1 }, deadline_at: '2030-01-15', evidence: [ev('https://partners.example.org/programa', 'official')] },
  events: { title: 'Evento de verificación 😀', organization: 'Organizador de prueba', canonical_url: 'https://eventos.example.org/edicion', summary: 'Solo valida el entorno; no es un hallazgo.', business_case: 'Prueba de validación sin efecto alguno.', next_action: 'Ninguna: es una verificación', scoring: { audience: 1 }, event_start_at: '2030-11-18', event_timezone: 'America/Santiago', event_location: 'Antofagasta', event_format: 'Presencial', evidence: [ev('https://eventos.example.org/edicion', 'official')] },
};

const KINDS = ['production', 'products', 'partners', 'events'];
const off = {};
for (const k of KINDS) {
  const g = await ops({ action: 'strategic_gate', params: { kind: k } });
  const j = g.json || {};
  off[k] = j.mode === 'skip' && j.reason === 'flag_off';
  check(`compuerta ${k}: responde y ${expectOff ? 'está apagada (skip · flag_off)' : 'responde con un modo válido'}`, g.status === 200 && j.ok === true && (expectOff ? off[k] : ['run', 'skip'].includes(j.mode)), `HTTP ${g.status} ${JSON.stringify({ mode: j.mode, reason: j.reason, error: j.error })}`);
}
for (const [tab, label] of [['production', 'producción'], ['products', 'productos'], ['partners', 'alianzas'], ['events', 'eventos']]) {
  const v = await ops({ action: 'strategic_view', params: { tab } });
  const s = (v.json || {}).strategic || {};
  check(`vista ${label}: el Radar responde, las tablas existen (source_state ok) y ${expectOff ? 'enabled=false' : 'forma válida'}`, v.status === 200 && s.tab === tab && s.source_state === 'ok' && (!expectOff || s.enabled === false) && Array.isArray(s.items), `HTTP ${v.status} ${JSON.stringify({ source_state: s.source_state, enabled: s.enabled })}`);
  if (tab === 'production' && expectOff) check('producción: ningún servicio muestra salud sin chequeo (todo «unverified» o confirmado sin monitoreo)', (s.items || []).every((t) => t.http_state === 'unverified'), (s.items || []).map((t) => t.logical_name + ':' + t.http_state).join(','));
}
// ¿El entorno de n8n trae lo que el motor necesita? dry_run: valida y NO escribe; no exige bandera.
for (const kind of ['products', 'partners', 'events']) {
  const d = await ops({ action: 'strategic_ingest', dry_run: true, params: { kind, run_id: randomUUID(), items: [sample[kind]], test: true } });
  const j = d.json || {};
  check(`entorno de n8n (${kind}): URL canónica, IDN, UTF-8, fechas e Intl funcionan (dry_run: would_accept 1, 0 escrituras)`, d.status === 200 && j.ok === true && j.dry_run === true && j.would_accept === 1 && Array.isArray(j.rejected) && j.rejected.length === 0, `HTTP ${d.status} ${JSON.stringify({ error: j.error, text: j.text, rejected: j.rejected, runtime: /runtime_incompleto/.test(JSON.stringify(j)) ? 'FALTA URL EN EL SANDBOX' : undefined })}`);
}
// Rechazos que ocurren ANTES de escribir (solo si la compuerta está comprobadamente apagada: así nada puede escribirse).
if (expectOff && off.products) {
  const i = await ops({ action: 'strategic_ingest', params: { kind: 'products', run_id: randomUUID(), items: [sample.products], test: true } });
  check('ingesta real con la bandera apagada: rechazada (flag_off), sin escribir', (i.json || {}).ok === false && (i.json || {}).error === 'flag_off', JSON.stringify({ ok: (i.json || {}).ok, error: (i.json || {}).error }));
}
if (expectOff && off.production) {
  const t = await ops({ action: 'strategic_targets' });
  check('strategic_targets con el monitoreo apagado: sin servicios (flag_off)', (t.json || {}).ok === false && (t.json || {}).error === 'flag_off' && Array.isArray((t.json || {}).targets) && t.json.targets.length === 0, JSON.stringify({ error: (t.json || {}).error }));
  const c = await ops({ action: 'strategic_prod_check', params: { target_id: randomUUID(), checked_at: new Date().toISOString(), result: 'healthy', http_status: 200, latency_ms: 10, test: true } });
  check('strategic_prod_check con el monitoreo apagado: rechazado (flag_off), sin escribir', (c.json || {}).ok === false && (c.json || {}).error === 'flag_off', JSON.stringify({ error: (c.json || {}).error }));
}
const bad = await ops({ action: 'strategic_ingest', dry_run: true, params: { kind: 'oro', run_id: randomUUID(), items: [sample.products] } });
check('una categoría inventada se rechaza (kind_invalido)', (bad.json || {}).ok === false && (bad.json || {}).error === 'kind_invalido', JSON.stringify({ error: (bad.json || {}).error }));
// Lo existente sigue igual: «Hoy» sin tarjeta del Radar y sin «missing» del Radar; el Daily sin bloque estratégico.
const panel = await ops({ action: 'panel' });
const inbox = ((((panel.json || {}).panel || {}).v3 || {}).inbox || { items: [] }).items;
check('panel: responde, sin «missing» del Radar' + (expectOff ? ' y sin tarjeta del Radar en «Hoy»' : ''), panel.status === 200 && (panel.json || {}).ok === true && !(((panel.json || {}).panel || {}).missing || []).some((m) => /sr_|strategic/.test(m)) && (!expectOff || !inbox.some((x) => x.kind === 'radar')), `HTTP ${panel.status}`);
const daily = await ops({ action: 'daily' });
check('daily: responde' + (expectOff ? ' y NO trae bloque «RADAR ESTRATÉGICO»' : ''), daily.status === 200 && (daily.json || {}).ok === true && (!expectOff || !/RADAR ESTRATÉGICO/.test((daily.json || {}).text || '')), `HTTP ${daily.status}`);
if (env.OPS_APPROVAL_KEY) {
  const a = await post('atacama-ops-actions', env.OPS_APPROVAL_KEY, 'X-Ops-Approval', { action: 'overview' });
  check('workflow 29: sigue respondiendo (overview, solo lectura)', a.status === 200 && (a.json || {}).email, `HTTP ${a.status}`);
  const r = await post('atacama-ops-actions', env.OPS_APPROVAL_KEY, 'X-Ops-Approval', { action: 'strategic_decide', request_id: 'verif-' + randomUUID().slice(0, 12), opportunity_id: randomUUID(), decision: 'contactar' });
  check('workflow 29: reconoce las acciones del Radar y rechaza una decisión inventada antes de leer o escribir', (r.json || {}).ok === false && /shortlist \| work \| dismiss/.test(String((r.json || {}).message || '')), JSON.stringify({ error: (r.json || {}).error, message: String((r.json || {}).message || '').slice(0, 80) }));
}
console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
