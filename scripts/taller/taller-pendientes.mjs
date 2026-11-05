#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 5 (spec §6.6) — `taller-pendientes`: la cola del carril `pc` para abrir una sesión de motion con Christian.
 *   node scripts/taller/taller-pendientes.mjs [--json] [--test]
 * Lista las piezas «en el PC con Claude» y «cambios pedidos» del carril pc con su idea (ficha), fecha límite y feedback abierto.
 * Solo lectura (Supabase, llave de .env.local que nunca se imprime). Sin piezas: lo dice.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from '../media/env.mjs';

export function tpSummary(pieces, feedback, now) {
  const fb = (id) => (feedback || []).filter((f) => f.piece_id === id && f.status === 'open');
  return (pieces || []).map((p) => {
    const i = p.idea || {};
    const due = p.needs_by || null;
    const days = due ? Math.round((Date.parse(due) - now) / 86400000) : null;
    return { id: p.id, topic: p.topic || i.title || '(sin título)', format: p.format, channel: p.channel, status: p.taller_status, version: p.current_version || 0, needs_by: due, days_left: days,
      idea: { title: i.title || null, hook: i.hook || null, core_message: i.core_message || null, structure: i.structure || null, cta: i.cta || null, production: i.production || null, keyword: i.keyword || null },
      feedback: fb(p.id).map((f) => (f.scope && f.scope !== 'global' ? f.scope + ': ' : '') + f.text) };
  }).sort((a, b) => (a.status === 'cambios_pedidos' ? 0 : 1) - (b.status === 'cambios_pedidos' ? 0 : 1) || String(a.needs_by || '9').localeCompare(String(b.needs_by || '9')));
}

export function tpText(list) {
  if (!list.length) return 'Taller · carril PC: no hay piezas pendientes.';
  return ['Taller · carril PC: ' + list.length + ' pendiente(s)'].concat(list.map((p, n) => [
    (n + 1) + '. ' + p.topic + ' — ' + p.format + ' · ' + p.channel + ' · ' + (p.status === 'cambios_pedidos' ? 'CAMBIOS PEDIDOS' : 'por hacer') + ' · v' + p.version + (p.needs_by ? ' · para ' + p.needs_by.slice(0, 10) + (p.days_left != null ? ' (' + p.days_left + ' días)' : '') : ''),
    p.idea.hook ? '   gancho: ' + p.idea.hook : null, p.idea.core_message ? '   mensaje: ' + p.idea.core_message : null,
    p.feedback.length ? '   feedback abierto: ' + p.feedback.join(' | ') : null, '   id: ' + p.id,
  ].filter(Boolean).join('\n'))).join('\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const env = loadEnv();
  const test = process.argv.includes('--test');
  const sb = (q) => fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + q, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } }).then((r) => r.json());
  (async () => {
    const pieces = await sb('content_pieces?lane=eq.pc&taller_status=in.(en_pc_con_claude,cambios_pedidos)&is_test=eq.' + test + '&select=id,topic,format,channel,taller_status,current_version,needs_by,idea:content_ideas!content_pieces_idea_id_fkey(title,hook,core_message,structure,cta,production,keyword)&order=needs_by.asc.nullslast&limit=50');
    if (!Array.isArray(pieces)) throw new Error('Supabase no respondió');
    const ids = pieces.map((p) => p.id);
    const feedback = ids.length ? await sb('content_feedback?piece_id=in.(' + ids.join(',') + ')&status=eq.open&select=piece_id,scope,text,status') : [];
    const list = tpSummary(pieces, feedback, Date.now());
    console.log(process.argv.includes('--json') ? JSON.stringify(list, null, 1) : tpText(list));
  })().catch((e) => { console.log('No pude leer la cola: ' + String(e.message || e).slice(0, 200)); process.exitCode = 1; });
}
