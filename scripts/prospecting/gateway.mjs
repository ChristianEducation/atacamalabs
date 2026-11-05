#!/usr/bin/env node
/**
 * Atacama OS · Prospect Gateway — CLI para operar (Christian, Claude Code u otro agente).
 *
 *   node scripts/prospecting/gateway.mjs local   <archivo>                      → parsea y puntúa EN LOCAL (sin red, sin escribir nada)
 *   node scripts/prospecting/gateway.mjs analyze <archivo|URL…> [--validate light]  → clasifica contra Supabase y GHL (solo lectura)
 *   node scripts/prospecting/gateway.mjs import  <archivo|URL…> [--request-id ID] [--force "motivo"] [--enrich]
 *                                                                                → mete a Supabase y a GHL (Investigado) lo que vale la pena
 *   node scripts/prospecting/gateway.mjs prepare <archivo|URL…> [--request-id ID]  → borradores (email + WhatsApp), NO se envían
 *   node scripts/prospecting/gateway.mjs act <tipo> --target "<dominio|correo|empresa>" [--note ..] [--channel ..] [--stage ..] [--reason ..] [--days N] [--request-id ID]
 *        tipos: create_prospect create_in_ghl prepare_email send_email(no habilitado) mark_contacted log_instagram log_whatsapp log_phone discard follow_up move_stage add_note
 *
 * Formatos: .html/.htm (fichas) · .json (array o { prospects: [...] }) · .csv · .txt/.md (texto etiquetado) · URLs (sitio oficial).
 * Requiere N8N_BASE_URL y ATACAMA_INGEST_KEY (en .env.local o en el entorno). Nunca imprime secretos. Nunca envía mensajes.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseHtmlProspects, parseCsv, aliasRecord, parseFreeText, toCandidate, scoreCandidate, adaptExternalRecord } from './gateway-core.mjs';

const args = process.argv.slice(2);
const action = args[0];
const flag = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const rest = args.slice(1).filter((a, i, arr) => !a.startsWith('--') && !(i > 0 && arr[i - 1].startsWith('--') && !['enrich'].includes(arr[i - 1].slice(2))));

function loadEnv() {
  const env = { ...process.env };
  try { fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split(/\r?\n/).forEach((l) => { const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) { const k = l.slice(0, i).trim(); if (!(k in env)) env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } }); } catch { /* sin .env.local */ }
  return env;
}

function readInput(items) {
  const body = {};
  for (const it of items) {
    if (/^https?:\/\//i.test(it)) { (body.urls = body.urls || []).push(it); continue; }
    if (!fs.existsSync(it)) { console.error('No existe el archivo: ' + it); process.exit(2); }
    const txt = fs.readFileSync(it, 'utf8');
    const ext = it.toLowerCase().split('.').pop();
    if (ext === 'html' || ext === 'htm') body.html = (body.html || '') + txt;
    else if (ext === 'csv') body.csv = txt;
    else if (ext === 'json') { const j = JSON.parse(txt); body.prospects = (body.prospects || []).concat(Array.isArray(j) ? j : j.prospects || [j]); if (j.batch_id && !flag('request-id')) body._batch = j.batch_id; }
    else body.text = (body.text || '') + txt;
  }
  return body;
}

if (!action || ['-h', '--help', 'help'].includes(action)) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*|^ \* ?/gm, '')); process.exit(0); }

if (action === 'local') {
  const body = readInput(rest);
  let raws = [];
  if (body.html) raws = raws.concat(parseHtmlProspects(body.html));
  if (body.csv) raws = raws.concat(parseCsv(body.csv).map(aliasRecord));
  if (body.text) raws = raws.concat(parseFreeText(body.text));
  (body.prospects || []).forEach((p) => raws.push({ ...aliasRecord(p), ...p, ...adaptExternalRecord(p) }));
  const rows = raws.map((r) => { const c = toCandidate(r, { source_type: 'local', source_name: r.source_name || 'archivo local' }); return { c, sc: scoreCandidate(c) }; });
  rows.sort((a, b) => b.sc.priority_score - a.sc.priority_score);
  const by = rows.reduce((a, r) => { a[r.sc.band] = (a[r.sc.band] || 0) + 1; return a; }, {});
  console.log(`${rows.length} prospectos · bandas ${JSON.stringify(by)} · (análisis LOCAL: no consulta Supabase ni GHL, no escribe nada)`);
  rows.forEach((r) => console.log(`${String(r.sc.priority_score).padStart(3)} ${r.sc.band.padEnd(9)} ${r.c.company_name} | ${r.c.industry || '—'} | ${r.c.location || '—'} | ${r.sc.channels.join(',') || 'SIN CANAL'}`));
  process.exit(0);
}

if (!['analyze', 'import', 'prepare', 'act'].includes(action)) { console.error('Acción desconocida: ' + action + '. Usa local | analyze | import | prepare | act (o --help).'); process.exit(2); }
const env = loadEnv();
if (!env.N8N_BASE_URL || !env.ATACAMA_INGEST_KEY) { console.error('Faltan N8N_BASE_URL o ATACAMA_INGEST_KEY.'); process.exit(2); }

let body;
if (action === 'act') {
  const type = rest[0];
  const target = flag('target');
  if (!type || !target || target === true) { console.error('Uso: act <tipo> --target "<dominio|correo|empresa>" [opciones]'); process.exit(2); }
  const ref = /@/.test(target) ? { email: target, company_name: target } : /\.[a-z]{2,}(\/|$)/i.test(target) ? { website: target, company_name: target } : { company_name: target };
  const act = { type };
  ['note', 'channel', 'stage', 'reason', 'title', 'subject', 'body'].forEach((k) => { const v = flag(k); if (v && v !== true) act[k] = v; });
  if (flag('days')) act.days = Number(flag('days'));
  if (flag('follow-up-days')) act.follow_up_days = Number(flag('follow-up-days'));
  if (flag('mark-lost')) act.mark_lost = true;
  if (flag('attach-to-existing')) act.attach_to_existing = true;
  if (flag('no-ghl')) act.ensure_in_ghl = false;
  body = { action: 'act', act, targets: [ref] };
} else {
  body = { action, ...readInput(rest) };
  if (!rest.length) { console.error('Indica al menos un archivo o URL.'); process.exit(2); }
}
body.source = { type: flag('source-type') || 'cli', name: flag('source') && flag('source') !== true ? flag('source') : rest.map((r) => r.split(/[\\/]/).pop()).join(', ') || 'CLI' };
const o = {};
if (flag('validate')) o.validate = flag('validate');
if (flag('enrich')) o.enrich = true;
if (flag('force') && flag('force') !== true) { o.force_import = true; o.manual_override_reason = flag('force'); o.by = flag('by') && flag('by') !== true ? flag('by') : 'Christian'; }
if (Object.keys(o).length) body.options = o;
if (action !== 'analyze') {
  const given = flag('request-id');
  body.request_id = given && given !== true ? given : 'cli-' + action + '-' + crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 12);
}
delete body._batch;

const res = await fetch(env.N8N_BASE_URL.replace(/\/$/, '') + '/webhook/atacama-prospect-gateway', { method: 'POST', headers: { 'X-Atacama-Key': env.ATACAMA_INGEST_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const text = await res.text();
let j;
try { j = JSON.parse(text); } catch { console.error('Respuesta no válida (HTTP ' + res.status + '): ' + text.slice(0, 200)); process.exit(1); }
if (flag('json')) { console.log(JSON.stringify(j, null, 2)); process.exit(0); }
if (j.ok === false) { console.error('✖ ' + j.error); process.exit(1); }
console.log(`${j.action.toUpperCase()}${j.replayed ? ' (respuesta almacenada: ya se había ejecutado con este request_id)' : ''} · request_id ${j.request_id || '—'} · mensajes enviados: ${j.safety ? j.safety.messages_sent : 0}`);
console.log('Resumen:', JSON.stringify(j.summary));
(j.notes || []).forEach((n) => console.log('· ' + n));
(j.results || []).forEach((r) => {
  const g = r.ghl ? (r.ghl.opportunity_id ? ' · GHL ✔' : '') : '';
  console.log(`${String(r.priority_score).padStart(3)} ${r.band.padEnd(9)} ${r.decision.padEnd(18)} ${r.company}${g}${r.error ? ' · ERROR: ' + r.error : ''}${r.reasons && r.reasons.length && r.decision !== 'create_in_ghl' ? ' · ' + r.reasons.join(', ') : ''}${r.executed === false ? ' · NO EJECUTADO' + (r.act_status ? ' (' + r.act_status + ')' : '') : ''}`);
});
