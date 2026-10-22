#!/usr/bin/env node
/**
 * Informe del FOCO de 2 semanas (23-oct a 6-nov-2026): por rubro, cuántos prospectos nuevos trajo el radar, cuántos correos salieron en cada paso de la secuencia,
 * rebotes y respuestas. SOLO LECTURA (Supabase con la clave de servicio de .env.local; nunca imprime claves).
 *   node scripts/outreach/foco-report.mjs            → desde el 23-oct
 *   node scripts/outreach/foco-report.mjs 2026-10-23 → desde otra fecha
 * Con ~50 correos por rubro hay SEÑALES, no estadística: úsalo para ver qué dolor responde, no para declarar un ganador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verticalOf } from './followup-templates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const SB = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://uwquwjmiofixzugttals.supabase.co').replace(/\/$/, '');
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY };
const get = async (q) => { const r = await fetch(`${SB}/rest/v1/${q}`, { headers: H }); const j = await r.json(); if (!Array.isArray(j)) throw new Error(q + ' → ' + JSON.stringify(j).slice(0, 200)); return j; };

const since = Date.parse((process.argv[2] || '2026-10-23') + 'T00:00:00-03:00');
const cands = await get('prospect_candidates?select=id,company_name,industry,domain,canonical,source_name,source_type,created_at,status&limit=5000');
const msgs = await get('outreach_messages?select=id,candidate_id,kind,direction,status,sent_at,classification,created_at&limit=10000');
const byId = Object.fromEntries(cands.map((c) => [c.id, c]));
const bucket = (c) => { const v = verticalOf(c); return v === 'casinos_colegios' || v === 'casinos_empresas' ? 'casinos' : v || 'otros'; };
const ROWS = ['corredoras', 'clinicas', 'casinos', 'otros'];
const mk = () => ({ nuevos_radar: 0, iniciales: 0, seg1: 0, seg2: 0, seg3: 0, rebotes: 0, respuestas: 0, positivas: 0 });
const T = Object.fromEntries(ROWS.map((r) => [r, mk()]));
cands.filter((c) => /radar/i.test(c.source_name || '') && Date.parse(c.created_at) >= since).forEach((c) => { T[bucket(c)].nuevos_radar++; });
const initialsSince = new Set();
const seenBounce = new Set(), seenReply = new Set(); // cuenta prospectos distintos (un rebote suele traer varios mensajes)
msgs.forEach((m) => {
  const c = byId[m.candidate_id]; if (!c) return;
  const b = bucket(c);
  if (m.direction === 'outbound' && m.status === 'sent' && m.sent_at && Date.parse(m.sent_at) >= since) {
    const k = { initial: 'iniciales', followup_1: 'seg1', followup_2: 'seg2', followup_3: 'seg3' }[m.kind];
    if (k) T[b][k]++;
    if (m.kind === 'initial') initialsSince.add(m.candidate_id);
  }
  if (m.direction === 'inbound' && Date.parse(m.created_at) >= since) {
    if (m.classification === 'bounce' && !seenBounce.has(m.candidate_id)) { seenBounce.add(m.candidate_id); T[b].rebotes++; }
    else if (m.classification === 'reply' && !seenReply.has(m.candidate_id)) { seenReply.add(m.candidate_id); T[b].respuestas++; }
  }
});
const pad = (s, n) => String(s).padEnd(n);
console.log('FOCO desde ' + new Date(since).toISOString().slice(0, 10) + ' (por rubro)\n');
console.log(pad('rubro', 12) + ['nuevos', 'inic.', 'seg1', 'seg2', 'seg3', 'rebotes', 'respuestas'].map((h) => pad(h, 11)).join(''));
ROWS.forEach((r) => { const t = T[r]; console.log(pad(r, 12) + [t.nuevos_radar, t.iniciales, t.seg1, t.seg2, t.seg3, t.rebotes, t.respuestas].map((v) => pad(v, 11)).join('')); });
const tot = ROWS.reduce((a, r) => { Object.keys(a).forEach((k) => { a[k] += T[r][k]; }); return a; }, mk());
console.log(pad('TOTAL', 12) + [tot.nuevos_radar, tot.iniciales, tot.seg1, tot.seg2, tot.seg3, tot.rebotes, tot.respuestas].map((v) => pad(v, 11)).join(''));
console.log('\nMeta diaria del radar: 5 nuevos por rubro (corredoras, clinicas, casinos). Tasa de rebote: ' + (tot.iniciales ? (100 * tot.rebotes / tot.iniciales).toFixed(1) + ' %' : 'n/d') + ' · respuestas por correo inicial: ' + (tot.iniciales ? (100 * tot.respuestas / tot.iniciales).toFixed(1) + ' %' : 'n/d'));
