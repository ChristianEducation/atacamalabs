#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — workflow n8n «13 Content Signal Intake» (Hermes `content-radar` → Supabase).
 *
 * Webhook (X-Atacama-Key) ← lote de señales de Hermes (máx. 8) → para cada señal abre la URL y comprueba que la CITA
 * aparezca → gate de señales (scripts/content/signal-core.mjs incrustado tal cual) → upsert en `content_sources`
 * con status rejected | held | candidate. NO crea piezas ni toca GHL: solo deja señales verificadas y puntuadas.
 *
 * Uso: node n8n/build/content-signals.mjs   → escribe n8n/atacama-labs-13-content-signals.json
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { evaluateSignal } from '../../scripts/content/signal-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const PACK_ID = '0ba54785-bff0-4a2d-a397-64e697d34e38';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const sb = (name, method, urlExpr, bodyExpr, pos, prefer) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED,
  parameters: { method, url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: Boolean(prefer),
    ...(prefer ? { headerParameters: { parameters: [{ name: 'Prefer', value: prefer }] } } : {}),
    ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full() } });

export const PREPARE = `const PACK_ID = '${PACK_ID}';
const first = $('Signals Webhook').first().json ?? {};
const body = first.body ?? first;
if (!body || typeof body !== 'object') throw new Error('Cuerpo invalido');
if (body.icp_pack_id && body.icp_pack_id !== PACK_ID) throw new Error('SEGURIDAD: icp_pack_id no coincide con el pack de Atacama Labs.');
const list = Array.isArray(body.signals) ? body.signals : [];
if (!list.length) throw new Error('signals vacio');
if (list.length > 8) throw new Error('maximo 8 senales por lote');
const batch = String(body.batch_id || '').trim();
if (!/^[A-Za-z0-9._:-]{4,80}$/.test(batch)) throw new Error('batch_id obligatorio (4-80 caracteres)');
return list.map((sig, idx) => {
  const url = sig && typeof sig.url === 'string' ? sig.url.trim() : '';
  const ok = /^https?:\\/\\/[^\\s/$.?#][^\\s]*$/i.test(url);
  return { json: { idx, batch, sig, fetchUrl: ok ? url : 'https://localhost.invalid/' } };
});`;

export const SCORE = `${evaluateSignal.toString()}

const PACK_ID = '${PACK_ID}';
const prepared = $('Prepare').all().map((i) => i.json);
const fetched = $input.all().map((i) => i.json);
const existingRows = ($('Fetch Existing').first().json || {}).body;
const existing = Array.isArray(existingRows) ? existingRows.map((r) => r.source_key) : [];
const now = Date.now();
const seenKeys = new Set(existing);
const rows = [];
const report = [];
prepared.forEach((p, i) => {
  const f = fetched[i] || {};
  const httpStatus = Number(f.statusCode || 0);
  const raw = typeof f.data === 'string' ? f.data : typeof f.body === 'string' ? f.body : '';
  const text = raw.slice(0, 900000);
  const ev = evaluateSignal(p.sig, { now, httpStatus, bodyText: text, existingKeys: Array.from(seenKeys) });
  if (ev.status !== 'duplicate') seenKeys.add(ev.source_key);
  const s = p.sig || {};
  report.push({ title: String(s.title || '').slice(0, 120), type: s.type, status: ev.status, score: ev.signal_score, verified: ev.verified, quote_found: ev.quote_found, http: httpStatus, age_days: ev.age_days, reasons: ev.reasons });
  if (ev.status === 'duplicate') return;
  const kind = s.type === 'real-work' ? 'real_work' : s.type === 'evergreen' ? 'evergreen' : 'hermes_research';
  rows.push({ icp_pack_id: PACK_ID, source_key: ev.source_key, kind, title: String(s.title || 'sin titulo').slice(0, 200), url: /^https?:/.test(s.url || '') ? s.url : null,
    summary: String(s.summary || '').slice(0, 700) || null, evidence: s.quote ? [{ url: s.url, quote: String(s.quote).slice(0, 500), quote_found: ev.quote_found, verified_at: new Date(now).toISOString() }] : [],
    verified: ev.verified === true && ev.status !== 'rejected', signal_type: ['news', 'competitor', 'founder', 'customer-question', 'evergreen', 'real-work'].includes(s.type) ? s.type : null,
    signal: { batch_id: p.batch, source: s.source, why_it_matters: s.why_it_matters, angle: s.angle, audience: s.audience, channel_suggestion: s.channel_suggestion, confidence: s.confidence, factors: s.factors, score_breakdown: ev.breakdown },
    signal_score: ev.signal_score, signal_status: ev.status === 'candidate' ? 'candidate' : ev.status === 'held' ? 'held' : 'rejected', reject_reasons: ev.reasons, quote_found: ev.quote_found, http_status: httpStatus || null,
    source_date: /^\\d{4}-\\d{2}-\\d{2}$/.test(String(s.date || '')) ? s.date : null, checked_at: new Date(now).toISOString() });
});
return [{ json: { rows, report } }];`;

export const RESPOND = `const sc = $('Score').first().json;
const up = $json;
if ((up.statusCode || 0) >= 300 && sc.rows.length) throw new Error('Supabase content_sources fallo (HTTP ' + up.statusCode + '): ' + JSON.stringify(up.body || {}).slice(0, 300));
const by = (s) => sc.report.filter((r) => r.status === s).length;
const best = sc.report.filter((r) => r.status === 'candidate').sort((a, b) => b.score - a.score)[0] || null;
return [{ json: { ok: true, received: sc.report.length, candidates: by('candidate'), held: by('held'), rejected: by('rejected'), duplicates: by('duplicate'), best, report: sc.report,
  note: 'Solo se guardaron senales; no se creo ninguna pieza ni se toco GHL.' } }];`;

export function buildContentSignals() {
  const nodes = [
    { id: randomUUID(), name: 'Signals Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: randomUUID(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: 'atacama-content-signals', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    sb('Fetch Existing', 'GET', `${SUPABASE}/rest/v1/content_sources?icp_pack_id=eq.${PACK_ID}&select=source_key&limit=3000`, null, [240, 0]),
    code('Prepare', PREPARE, [480, 0]),
    { id: randomUUID(), name: 'Fetch Source', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [720, 0], continueOnFail: true,
      parameters: { method: 'GET', url: '={{ $json.fetchUrl }}', sendHeaders: true,
        headerParameters: { parameters: [{ name: 'User-Agent', value: 'Mozilla/5.0 (compatible; AtacamaLabsContentRadar/1.0; +https://atacamalabs.cl)' }, { name: 'Accept-Language', value: 'es,en;q=0.8' }] },
        options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } }, timeout: 20000, redirect: { redirect: { followRedirects: true, maxRedirects: 5 } } } } },
    code('Score', SCORE, [960, 0]),
    sb('Upsert Signals', 'POST', `${SUPABASE}/rest/v1/content_sources?on_conflict=icp_pack_id,source_key`, '={{ JSON.stringify($json.rows) }}', [1200, 0], 'resolution=merge-duplicates,return=minimal'),
    code('Respond', RESPOND, [1440, 0]),
  ];
  const to = (n) => [{ node: n, type: 'main', index: 0 }];
  const connections = {
    'Signals Webhook': { main: [to('Fetch Existing')] },
    'Fetch Existing': { main: [to('Prepare')] },
    'Prepare': { main: [to('Fetch Source')] },
    'Fetch Source': { main: [to('Score')] },
    'Score': { main: [to('Upsert Signals')] },
    'Upsert Signals': { main: [to('Respond')] },
  };
  return { name: 'Atacama Labs - 13 Content Signal Intake', nodes, connections, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('content-signals.mjs')) {
  const out = new URL('../atacama-labs-13-content-signals.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildContentSignals(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
