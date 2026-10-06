#!/usr/bin/env node
/**
 * Atacama OS · generador de workflows n8n de prospección (Bloque G).
 *
 * Genera, a partir de constantes (pack ICP, ids de sub-workflows, credenciales), los JSON de:
 *   - 08 Prospect Ingest   (webhook ← Hermes: valida el gate, deduplica y escribe en Supabase vía RPC,
 *                           luego ejecuta 03 Qualification sobre las cuentas nuevas)
 *   - 09 Prospect Approve  (webhook ← Christian/Telegram: marca prospectos hot como ready_to_contact y
 *                           ejecuta 04 CRM Sync → 05 Outreach Draft; NO envía nada)
 * y parchea 04 CRM Sync para que los aprobados entren en la etapa "Investigado".
 *
 * Mismo protocolo seguro de n8n/README.md: el JSON versionado queda en modo `test`
 * (pack atacama-labs-test); la versión `real` se genera con MODE=real y constantes fijadas.
 *
 * Uso (desde la raíz del repo):
 *   node n8n/build/atacama-os-workflows.mjs write            # reescribe los JSON versionados (modo test)
 * o importado desde un script de despliegue: import { build08, build09, patch04 } from ...
 */
import fs from 'node:fs';
import { evidenceSupports } from '../../scripts/prospecting/admit-core.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKS = {
  test: { id: 'f412a742-7c7f-4cc0-9e2a-20c39d6fcd46', slug: 'atacama-labs-test' },
  real: { id: '0ba54785-bff0-4a2d-a397-64e697d34e38', slug: 'atacama-labs' },
};
const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };

const uuid = () => crypto.randomUUID();
const fullResponse = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const ifYes = (expr) => ({
  conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
    combinator: 'and',
    conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }],
  },
  options: {},
});

/* ---------------------------------------------------------------- 08 INGEST */
const GATE_CODE = (pack) => `// Gate de calidad de prospectos (Atacama OS). Un prospecto entra SOLO si tiene:
// empresa real + dominio propio + evidencia citada del dolor y del fit + contacto PUBLICO con su fuente + razon concreta.
// Si no pasa, se registra en prospect_inbox con los motivos y NO entra a accounts/research. Nunca se rellena una cuota.
const EXPECTED_ICP_PACK_ID = '${pack.id}';
const EXPECTED_ICP_PACK_SLUG = '${pack.slug}';
const first = $input.first().json ?? {};
const body = first.body ?? first;
if (!body || typeof body !== 'object') throw new Error('Cuerpo invalido');
if (body.icp_pack_id !== EXPECTED_ICP_PACK_ID) throw new Error('SEGURIDAD: icp_pack_id no coincide con el pack de este workflow (' + EXPECTED_ICP_PACK_SLUG + ').');
const batchId = String(body.batch_id || '').trim();
if (!/^[A-Za-z0-9._:-]{4,80}$/.test(batchId)) throw new Error('batch_id obligatorio (4-80 caracteres: letras, numeros, . _ : -)');
const list = Array.isArray(body.prospects) ? body.prospects : [];
if (!list.length) throw new Error('prospects vacio');
if (list.length > 50) throw new Error('maximo 50 prospectos por lote');

const FACTORS = ['pain', 'budget_proxy', 'volume', 'automation', 'access', 'urgency', 'fit'];
const NOT_COMPANY_DOMAINS = new Set(['facebook.com','instagram.com','linkedin.com','google.com','goo.gl','wa.me','whatsapp.com','linktr.ee','wixsite.com','wordpress.com','blogspot.com','youtube.com','tiktok.com','x.com','twitter.com','maps.app.goo.gl','sites.google.com','canva.site','carrd.co']);
const FREE_MAIL = new Set(['gmail.com','hotmail.com','outlook.com','yahoo.com','live.com','icloud.com','yahoo.es','hotmail.es']);
const isUrl = (u) => /^https?:\\/\\/[^\\s/$.?#][^\\s]*$/i.test(String(u || '')); // sin new URL(): el sandbox de Code no lo garantiza
const normDomain = (v) => { if (!v) return null; let s = String(v).trim().toLowerCase().replace(/^https?:\\/\\//, '').replace(/^www\\./, '').split(/[\\/?#]/)[0]; return /^[a-z0-9-]+(\\.[a-z0-9-]+)+$/.test(s) ? s : null; };
const isEmail = (e) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(e || '')) && !/^(no-?reply|noreply|donotreply)@/i.test(String(e));
const digits = (p) => String(p || '').replace(/\\D/g, '');
const txt = (v, max = 600) => (v == null ? null : String(v).trim().slice(0, max) || null);
const now = Date.now();

const seen = new Set();
const out = [];
for (const raw of list) {
  const reasons = [];
  const company = txt(raw?.company, 160);
  const domain = normDomain(raw?.domain || raw?.website);
  if (!company || company.length < 2) reasons.push('missing_company');
  if (!domain) reasons.push('missing_or_invalid_domain');
  else if (NOT_COMPANY_DOMAINS.has(domain) || [...NOT_COMPANY_DOMAINS].some((d) => domain.endsWith('.' + d))) reasons.push('domain_is_not_company_site');
  if (domain && seen.has(domain)) reasons.push('duplicate_in_batch');
  if (domain) seen.add(domain);

  // Evidencia por factor (contrato v2: tambien se acepta la forma plana evidence_url + evidence_quote/evidence_summary como evidencia del dolor)
  const rows = [];
  let ev = Array.isArray(raw?.evidence) ? raw.evidence : [];
  if (!ev.length && isUrl(raw?.evidence_url) && (raw?.evidence_quote || raw?.evidence_summary)) {
    ev = [{ factor: 'pain', level: raw?.evidence_quote ? 2 : 1, url: raw.evidence_url, quote: raw?.evidence_quote || null, finding: raw?.evidence_summary || raw?.evidence_quote, certainty: raw?.evidence_quote ? 'observed' : 'inferred' }];
  }
  for (const e of ev) {
    const factor = String(e?.factor || '').toLowerCase();
    let level = Number(e?.level);
    const quote = txt(e?.quote, 800);
    const finding = txt(e?.finding || quote, 500);
    if (!FACTORS.includes(factor) || ![1, 2].includes(level) || !isUrl(e?.url) || !finding || finding.length < 15) { reasons.push('invalid_evidence:' + (factor || '?')); continue; }
    const certainty = e?.certainty === 'inferred' ? 'inferred' : 'observed';
    if (certainty === 'inferred') level = Math.min(level, 1);
    let sourceDate = e?.date && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(e.date)) ? String(e.date) : null;
    if (factor === 'urgency') { const t = sourceDate ? new Date(sourceDate).getTime() : NaN; if (!Number.isFinite(t) || (now - t) / 86400000 > 30) continue; }
    rows.push({ research_type: 'factor:' + factor, finding, evidence_text: quote, source_url: String(e.url), source_date: sourceDate, level, certainty, confidence: certainty === 'observed' ? 0.9 : 0.6 });
  }
  const has = (f) => rows.some((r) => r.research_type === 'factor:' + f && r.level >= 1);
  if (!has('pain')) reasons.push('missing_pain_evidence');
  if (!has('fit')) reasons.push('missing_fit_evidence');

  // Contacto publico y verificable
  const c = raw?.contact ?? {};
  const email = isEmail(c.email) ? String(c.email).trim().toLowerCase() : null;
  const phone = digits(c.phone).length >= 8 ? txt(c.phone, 40) : null;
  const whatsapp = digits(c.whatsapp).length >= 8 ? txt(c.whatsapp, 40) : null;
  if (!(email || phone || whatsapp)) reasons.push('missing_public_contact');
  else {
    if (c.public !== true) reasons.push('contact_not_declared_public');
    if (!isUrl(c.source_url)) reasons.push('contact_missing_source_url');
  }
  const reason = txt(raw?.why_now || raw?.reason, 600);
  if (!reason || reason.length < 20) reasons.push('missing_specific_reason');

  // Factor de acceso derivado del contacto (si Hermes no aporto uno)
  if (!reasons.length && !has('access')) {
    const generic = email && /^(info|contacto|contact|ventas|hola|hello|admin|administracion|reservas|recepcion|clinica|soporte)@/i.test(email);
    const named = txt(c.name) && txt(c.job_title);
    rows.push({ research_type: 'factor:access', finding: 'Canal de contacto publico: ' + (email ? 'correo' : whatsapp ? 'WhatsApp' : 'telefono') + (named ? ' (persona con cargo)' : generic ? ' (casilla generica)' : ''), evidence_text: null, source_url: String(c.source_url), source_date: null, level: named && !generic ? 2 : 1, certainty: 'observed', confidence: 0.8 });
  }

  const verdict = reasons.length ? 'rejected' : 'accepted';
  const website = domain ? 'https://' + domain : null;
  out.push({ json: {
    batch_id: batchId,
    icp_pack_id: EXPECTED_ICP_PACK_ID,
    item: {
      verdict, reasons: [...new Set(reasons)], company, domain,
      account: { website, city: txt(raw?.city, 80), region: txt(raw?.region, 80), phone, whatsapp, email_general: email && FREE_MAIL.has(email.split('@')[1]) ? null : email,
        source: 'hermes', source_url: rows[0]?.source_url ?? null,
        metadata: { hermes: { vertical: txt(raw?.vertical, 80), signal: txt(raw?.signal || raw?.observed_signal), pain: txt(raw?.pain), fit: txt(raw?.fit), offer: txt(raw?.offer || raw?.possible_solution), reason, why_now: reason, commercial_angle: txt(raw?.commercial_angle, 500), confidence: Number.isFinite(Number(raw?.confidence)) ? Math.max(0, Math.min(1, Number(raw.confidence))) : null, source: txt(raw?.source, 60), contact_channel: txt(raw?.contact?.channel || raw?.contact_channel, 20), country: txt(raw?.country, 60) || 'Chile', contract: 'prospect-radar-v2', draft: txt(raw?.draft, 1500), draft_subject: txt(raw?.draft_subject, 200), batch_id: batchId, personal_email: Boolean(email && FREE_MAIL.has(email.split('@')[1])) } } },
      research: verdict === 'accepted' ? rows : [],
      contact: verdict === 'accepted' ? { name: txt(c.name, 120), job_title: txt(c.job_title, 120), email, phone, whatsapp, linkedin_url: isUrl(c.linkedin_url) ? String(c.linkedin_url) : null, source_url: String(c.source_url), is_decision_maker: c.is_decision_maker === true, confidence: 0.85 } : null,
      raw: raw,
    },
  } });
}
return out;`;


const VERIFY_CODE = String.raw`${evidenceSupports.toString()}

// Verifica las citas: la evidencia nivel 2 solo cuenta si la cita aparece de verdad en la URL indicada.
// Si la página carga y la cita NO aparece, o la página no se puede leer, la evidencia baja a nivel 1 y queda marcada
// como "unverified" (no se descarta ni se rechaza el prospecto: la revisión humana lo ve). Evita que una cita inventada
// sume puntos como evidencia concreta.
const items = $input.all();
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const cache = new Map();
const pageText = (url) => {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      try {
        const r = await this.helpers.httpRequest({ method: 'GET', url, timeout: 7000, returnFullResponse: true, ignoreHttpStatusErrors: true, json: false,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtacamaLabsBot/1.0; +https://atacamalabs.cl)', Accept: 'text/html,*/*' } });
        const status = Number(r.statusCode || 0);
        const body = typeof r.body === 'string' ? r.body : String(r.body || '');
        if (status >= 200 && status < 300 && body.length > 300) {
          return { ok: true, text: norm(body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')) };
        }
        return { ok: false };
      } catch (e) { return { ok: false }; }
    })());
  }
  return cache.get(url);
};
for (const it of items) {
  const item = it.json.item;
  if (!item || item.verdict !== 'accepted') continue;
  const stats = { checked: 0, found: 0, not_found: 0, unreadable: 0, capped_no_quote: 0, not_supporting: 0 };
  for (const row of item.research) {
    if (row.research_type === 'factor:access') continue;
    if (!row.evidence_text) { if (row.level > 1) { row.level = 1; stats.capped_no_quote++; } row.certainty = row.certainty === 'inferred' ? 'inferred' : 'unverified'; continue; }
    stats.checked++;
    const page = await pageText(row.source_url);
    const q = norm(row.evidence_text).slice(0, 90);
    if (page.ok && q.length >= 12 && page.text.includes(q)) {
      // La cita existe, pero ¿demuestra el factor? (un título o un teléfono no demuestran dolor): si no, nivel 1 y sin verificar.
      if (!evidenceSupports(row.research_type.replace('factor:', ''), row.evidence_text, row.finding)) { stats.not_supporting++; row.level = Math.min(row.level, 1); row.certainty = row.certainty === 'inferred' ? 'inferred' : 'unverified'; }
      else { stats.found++; row.certainty = row.certainty === 'inferred' ? 'inferred' : 'observed'; }
    }
    else { if (page.ok) stats.not_found++; else stats.unreadable++; row.level = Math.min(row.level, 1); row.certainty = row.certainty === 'inferred' ? 'inferred' : 'unverified'; }
  }
  item.account.metadata.hermes.verification = stats;
}
return items;`;

export function build08({ mode = 'test', qualWorkflowId, admitWorkflowId, ingestKeyCredId, webhookId = uuid(), path: pathOverride }) {
  const pack = PACKS[mode];
  const path = pathOverride || (mode === 'test' ? 'atacama-prospects-ingest-test' : 'atacama-prospects-ingest');
  const nodes = [
    { id: uuid(), name: 'Ingest Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId,
      parameters: { httpMethod: 'POST', path, authentication: 'headerAuth', responseMode: 'lastNode', options: {} },
      credentials: { httpHeaderAuth: { id: ingestKeyCredId, name: 'Atacama Labs - Ingest Key' } } },
    { id: uuid(), name: 'Validate and Gate', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0], parameters: { jsCode: GATE_CODE(pack) } },
    { id: uuid(), name: 'Verify Quotes', type: 'n8n-nodes-base.code', typeVersion: 2, position: [360, 0], parameters: { jsCode: VERIFY_CODE } },
    { id: uuid(), name: 'Ingest Prospect (RPC)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [480, 0],
      parameters: { method: 'POST', url: `${SUPABASE}/rest/v1/rpc/ingest_prospect`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi',
        sendBody: true, specifyBody: 'json',
        jsonBody: '={{ { p_icp_pack_id: $json.icp_pack_id, p_batch_id: $json.batch_id, p_item: $json.item } }}',
        options: fullResponse(30000) }, credentials: SUPABASE_CRED },
    { id: uuid(), name: 'Summarize', type: 'n8n-nodes-base.code', typeVersion: 2, position: [720, 0],
      parameters: { jsCode: `const gate = $('Validate and Gate').all();
const res = $input.all();
const results = res.map((r, i) => {
  const g = gate[i]?.json?.item ?? {};
  const status = Number(r.json.statusCode ?? 0);
  const b = r.json.body ?? {};
  if (status < 200 || status >= 300) return { company: g.company, domain: g.domain, status: 'error', error: String(b.message || b.hint || status).slice(0, 200) };
  return { company: g.company, domain: g.domain, status: b.status, account_id: b.account_id ?? null, reasons: b.reasons ?? g.reasons ?? [] };
});
const count = (s) => results.filter((r) => r.status === s).length;
const accountIds = results.filter((r) => r.status === 'accepted').map((r) => r.account_id);
return [{ json: { batch_id: gate[0]?.json?.batch_id, icp_pack_id: gate[0]?.json?.icp_pack_id, received: results.length, accepted: count('accepted'), rejected: count('rejected'), duplicates: count('duplicate'), errors: count('error'), account_ids: accountIds, results } }];` } },
    { id: uuid(), name: 'Any Accepted?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [960, 0], parameters: ifYes('$json.accepted > 0') },
    { id: uuid(), name: 'Run 03 Qualification', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [1200, -100],
      parameters: { source: 'database', workflowId: { __rl: true, value: qualWorkflowId, mode: 'id' },
        workflowInputs: { value: { icp_pack_id: '={{ $json.icp_pack_id }}', account_ids: '={{ $json.account_ids }}', limit: 25 }, schema: [] }, options: { waitForSubWorkflow: true } },
      onError: 'continueRegularOutput' },
    ...(admitWorkflowId ? [
      { id: uuid(), name: 'Run 18 Admit', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [1440, -100],
        parameters: { source: 'database', workflowId: { __rl: true, value: admitWorkflowId, mode: 'id' },
          workflowInputs: { value: { icp_pack_id: '={{ $("Summarize").first().json.icp_pack_id }}', account_ids: '={{ $("Summarize").first().json.account_ids }}', limit: 10 }, schema: [] }, options: { waitForSubWorkflow: true } },
        onError: 'continueRegularOutput', alwaysOutputData: true },
      { id: uuid(), name: 'Fetch Admission', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1680, -100], executeOnce: true, credentials: SUPABASE_CRED,
        parameters: { method: 'GET', url: '={{ "' + SUPABASE + '/rest/v1/prospects?account_id=in.(" + $("Summarize").first().json.account_ids.join(",") + ")&select=account_id,final_score,classification,crm_candidate,ghl_opportunity_id,metadata" }}',
          authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: fullResponse(20000) } },
      { id: uuid(), name: 'Response (with qualification)', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1920, -100],
        parameters: { jsCode: `const s = $('Summarize').first().json;
const q = $('Run 03 Qualification').all().map((i) => i.json);
const qr = q.find((x) => x && (x.processed !== undefined || x.classification !== undefined || x.summary !== undefined)) ?? q[0] ?? null;
const rows = Array.isArray($json.body) ? $json.body : [];
const admission = rows.map((r) => ({ account_id: r.account_id, score: r.final_score, class: r.classification, crm_candidate: r.crm_candidate, in_ghl: Boolean(r.ghl_opportunity_id), admission: (r.metadata && r.metadata.admission) || null }));
return [{ json: { ok: true, batch_id: s.batch_id, received: s.received, accepted: s.accepted, rejected: s.rejected, duplicates: s.duplicates, errors: s.errors, results: s.results, qualification: qr, admission } }];` } },
    ] : [
    { id: uuid(), name: 'Response (with qualification)', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1440, -100],
      parameters: { jsCode: `const s = $('Summarize').first().json;
const q = $input.all().map((i) => i.json);
const qr = q.find((x) => x && (x.processed !== undefined || x.classification !== undefined || x.summary !== undefined)) ?? q[0] ?? null;
return [{ json: { ok: true, batch_id: s.batch_id, received: s.received, accepted: s.accepted, rejected: s.rejected, duplicates: s.duplicates, errors: s.errors, results: s.results, qualification: qr } }];` } },
    ]),
    { id: uuid(), name: 'Response (nothing to qualify)', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1200, 100],
      parameters: { jsCode: `const s = $input.first().json;
return [{ json: { ok: true, batch_id: s.batch_id, received: s.received, accepted: 0, rejected: s.rejected, duplicates: s.duplicates, errors: s.errors, results: s.results, qualification: null } }];` } },
  ];
  const connections = {
    'Ingest Webhook': { main: [[{ node: 'Validate and Gate', type: 'main', index: 0 }]] },
    'Validate and Gate': { main: [[{ node: 'Verify Quotes', type: 'main', index: 0 }]] },
    'Verify Quotes': { main: [[{ node: 'Ingest Prospect (RPC)', type: 'main', index: 0 }]] },
    'Ingest Prospect (RPC)': { main: [[{ node: 'Summarize', type: 'main', index: 0 }]] },
    'Summarize': { main: [[{ node: 'Any Accepted?', type: 'main', index: 0 }]] },
    'Any Accepted?': { main: [[{ node: 'Run 03 Qualification', type: 'main', index: 0 }], [{ node: 'Response (nothing to qualify)', type: 'main', index: 0 }]] },
    ...(admitWorkflowId
      ? { 'Run 03 Qualification': { main: [[{ node: 'Run 18 Admit', type: 'main', index: 0 }]] }, 'Run 18 Admit': { main: [[{ node: 'Fetch Admission', type: 'main', index: 0 }]] }, 'Fetch Admission': { main: [[{ node: 'Response (with qualification)', type: 'main', index: 0 }]] } }
      : { 'Run 03 Qualification': { main: [[{ node: 'Response (with qualification)', type: 'main', index: 0 }]] } }),
  };
  return { name: `Atacama Labs - 08 Prospect Ingest${mode === 'test' ? ' (TEST)' : ''}`, nodes, connections, settings: { executionOrder: 'v1' } };
}

/* --------------------------------------------------------------- 09 APPROVE */
export function build09({ mode = 'test', crmWorkflowId, draftWorkflowId, ingestKeyCredId, webhookId = uuid() }) {
  const pack = PACKS[mode];
  const path = mode === 'test' ? 'atacama-prospects-approve-test' : 'atacama-prospects-approve';
  const nodes = [
    { id: uuid(), name: 'Approve Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId,
      parameters: { httpMethod: 'POST', path, authentication: 'headerAuth', responseMode: 'lastNode', options: {} },
      credentials: { httpHeaderAuth: { id: ingestKeyCredId, name: 'Atacama Labs - Ingest Key' } } },
    { id: uuid(), name: 'Validate Approval', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0],
      parameters: { jsCode: `const EXPECTED_ICP_PACK_ID = '${pack.id}';
const first = $input.first().json ?? {};
const body = first.body ?? first;
if (body.icp_pack_id !== EXPECTED_ICP_PACK_ID) throw new Error('SEGURIDAD: icp_pack_id no coincide con el pack de este workflow.');
const ids = Array.isArray(body.prospect_ids) ? body.prospect_ids.map(String) : [];
if (!ids.length || ids.length > 20) throw new Error('prospect_ids: entre 1 y 20 ids');
if (!ids.every((i) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i))) throw new Error('prospect_ids invalidos');
const approver = String(body.approved_by || '').trim().slice(0, 60);
if (!approver) throw new Error('approved_by obligatorio');
return [{ json: { icp_pack_id: EXPECTED_ICP_PACK_ID, approved_by: approver, prospect_ids: ids,
  patch_url: '${SUPABASE}/rest/v1/prospects?icp_pack_id=eq.' + EXPECTED_ICP_PACK_ID + '&id=in.(' + ids.join(',') + ')&classification=eq.hot&crm_candidate=eq.true&status=eq.new&select=id,account_id,status' } }];` } },
    { id: uuid(), name: 'Mark Ready To Contact', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [480, 0],
      parameters: { method: 'PATCH', url: '={{ $json.patch_url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: 'return=representation' }] },
        sendBody: true, specifyBody: 'json', jsonBody: '={{ { status: "ready_to_contact", last_activity_at: new Date().toISOString() } }}', options: fullResponse(20000) },
      credentials: SUPABASE_CRED },
    { id: uuid(), name: 'Build Approved List', type: 'n8n-nodes-base.code', typeVersion: 2, position: [720, 0],
      parameters: { jsCode: `const v = $('Validate Approval').first().json;
const res = $input.first().json ?? {};
const status = Number(res.statusCode ?? 0);
if (status < 200 || status >= 300) throw new Error('No se pudo marcar como aprobados (HTTP ' + status + ')');
const rows = Array.isArray(res.body) ? res.body : [];
const skipped = v.prospect_ids.filter((id) => !rows.find((r) => r.id === id));
return [{ json: { icp_pack_id: v.icp_pack_id, approved_by: v.approved_by, approved: rows.length, approved_prospect_ids: rows.map((r) => r.id), account_ids: rows.map((r) => r.account_id), skipped_not_eligible: skipped } }];` } },
    { id: uuid(), name: 'Any Approved?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [960, 0], parameters: ifYes('$json.approved > 0') },
    { id: uuid(), name: 'Run 04 CRM Sync', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [1200, -100],
      parameters: { source: 'database', workflowId: { __rl: true, value: crmWorkflowId, mode: 'id' },
        workflowInputs: { value: { icp_pack_id: '={{ $json.icp_pack_id }}', account_ids: '={{ $json.account_ids }}', limit: 20 }, schema: [] }, options: { waitForSubWorkflow: true } },
      onError: 'continueRegularOutput' },
    { id: uuid(), name: 'Split Per Account', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1440, -100],
      parameters: { jsCode: `// 05 trabaja bien con un prospecto por ejecucion: se lanza una vez por cuenta aprobada.
const a = $('Build Approved List').first().json;
return a.account_ids.map((id) => ({ json: { icp_pack_id: a.icp_pack_id, account_ids: [id] } }));` } },
    { id: uuid(), name: 'Run 05 Outreach Draft', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [1680, -100],
      parameters: { source: 'database', workflowId: { __rl: true, value: draftWorkflowId, mode: 'id' },
        mode: 'each', workflowInputs: { value: { icp_pack_id: '={{ $json.icp_pack_id }}', account_ids: '={{ $json.account_ids }}', limit: 1 }, schema: [] }, options: { waitForSubWorkflow: true } },
      onError: 'continueRegularOutput' },
    { id: uuid(), name: 'Fetch Prospect Status', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1920, -100], executeOnce: true,
      parameters: { url: `={{ '${SUPABASE}/rest/v1/prospects?id=in.(' + $('Build Approved List').first().json.approved_prospect_ids.join(',') + ')&select=id,status,ghl_contact_id,ghl_opportunity_id' }}`,
        authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: fullResponse(20000) }, credentials: SUPABASE_CRED },
    { id: uuid(), name: 'Fetch Draft Status', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2160, -100], executeOnce: true,
      parameters: { url: `={{ '${SUPABASE}/rest/v1/outreach?prospect_id=in.(' + $('Build Approved List').first().json.approved_prospect_ids.join(',') + ')&select=prospect_id,status,channel,subject,sent_at' }}`,
        authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: fullResponse(20000) }, credentials: SUPABASE_CRED },
    { id: uuid(), name: 'Response (approved)', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2400, -100], executeOnce: true,
      parameters: { jsCode: `const a = $('Build Approved List').first().json;
const pr = $('Fetch Prospect Status').first().json;
const dr = $input.first().json;
const prospects = Array.isArray(pr.body) ? pr.body : [];
const drafts = Array.isArray(dr.body) ? dr.body : [];
const result = a.approved_prospect_ids.map((id) => {
  const p = prospects.find((x) => x.id === id) ?? {};
  const d = drafts.filter((x) => x.prospect_id === id);
  return { prospect_id: id, status: p.status ?? null, in_crm: Boolean(p.ghl_opportunity_id), draft: d.find((x) => x.status === 'draft')?.subject ?? null, sent: d.some((x) => x.sent_at) };
});
return [{ json: { ok: true, approved: a.approved, approved_by: a.approved_by, skipped_not_eligible: a.skipped_not_eligible, result, note: 'Solo borradores: no se envia ningun mensaje.' } }];` } },
    { id: uuid(), name: 'Response (none eligible)', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1200, 100],
      parameters: { jsCode: `const a = $input.first().json;
return [{ json: { ok: true, approved: 0, skipped_not_eligible: a.skipped_not_eligible, note: 'Ningun prospecto elegible (debe ser hot, crm_candidate y status=new).' } }];` } },
  ];
  const connections = {
    'Approve Webhook': { main: [[{ node: 'Validate Approval', type: 'main', index: 0 }]] },
    'Validate Approval': { main: [[{ node: 'Mark Ready To Contact', type: 'main', index: 0 }]] },
    'Mark Ready To Contact': { main: [[{ node: 'Build Approved List', type: 'main', index: 0 }]] },
    'Build Approved List': { main: [[{ node: 'Any Approved?', type: 'main', index: 0 }]] },
    'Any Approved?': { main: [[{ node: 'Run 04 CRM Sync', type: 'main', index: 0 }], [{ node: 'Response (none eligible)', type: 'main', index: 0 }]] },
    'Run 04 CRM Sync': { main: [[{ node: 'Split Per Account', type: 'main', index: 0 }]] },
    'Split Per Account': { main: [[{ node: 'Run 05 Outreach Draft', type: 'main', index: 0 }]] },
    'Run 05 Outreach Draft': { main: [[{ node: 'Fetch Prospect Status', type: 'main', index: 0 }]] },
    'Fetch Prospect Status': { main: [[{ node: 'Fetch Draft Status', type: 'main', index: 0 }]] },
    'Fetch Draft Status': { main: [[{ node: 'Response (approved)', type: 'main', index: 0 }]] },
  };
  return { name: `Atacama Labs - 09 Prospect Approve${mode === 'test' ? ' (TEST)' : ''}`, nodes, connections, settings: { executionOrder: 'v1' } };
}

/* ------------------------------------------------------------- 04 (parche) */
/** Los prospectos aprobados deben entrar en "Investigado", no directamente como contactados ni como leads nuevos. */
export function patch04(workflow) {
  const s = JSON.stringify(workflow);
  const from = ".crm.new_stage_id";
  const to = ".crm.prospect_entry_stage_id";
  if (!s.includes(from)) return { workflow, changed: false };
  return { workflow: JSON.parse(s.split(from).join(to)), changed: true };
}

/** 05: solo prospectos APROBADOS (ready_to_contact) y, si se indica, solo las cuentas pedidas.
 *  Antes tomaba todos los crm_candidate (gastando OpenClaw en no aprobados) y solo procesaba el primero del lote. */
export function patch05(workflow) {
  const s = JSON.stringify(workflow);
  const fromInit = "return [{json:{ icp_pack_url:";
  const toInit = "return [{json:{ account_ids: Array.isArray(incoming.account_ids) ? incoming.account_ids.map(String) : [], icp_pack_url:";
  const fromFetch = "&crm_candidate=eq.true&select=id,icp_pack_id,account_id,primary_contact_id,commercial_angle,qualification_reason,metadata&limit=25' }}";
  const toFetch = "&crm_candidate=eq.true&status=eq.ready_to_contact' + (($('Init ICP Config').first().json.account_ids || []).length ? '&account_id=in.(' + $('Init ICP Config').first().json.account_ids.join(',') + ')' : '') + '&select=id,icp_pack_id,account_id,primary_contact_id,commercial_angle,qualification_reason,metadata&limit=25' }}";
  if (!s.includes(fromInit) || !s.includes(fromFetch)) return { workflow, changed: false };
  return { workflow: JSON.parse(s.replace(fromInit, toInit).replace(fromFetch, toFetch)), changed: true };
}


/** 05: usa el borrador que ya trae Hermes (accounts.metadata.hermes.draft) y solo recurre a OpenClaw si no existe.
 *  Saca a OpenClaw de la ruta crítica sin romper cuentas antiguas. */
export function patch05Hermes(workflow) {
  const w = JSON.parse(JSON.stringify(workflow));
  const fetchAcc = w.nodes.find((n) => n.name === 'Fetch Account And Research');
  if (!fetchAcc || w.nodes.some((n) => n.name === 'Use Hermes Draft?')) return { workflow, changed: false };
  fetchAcc.parameters.url = fetchAcc.parameters.url.replace("&select=id,name,website,city,region'", "&select=id,name,website,city,region,metadata'");
  const mk = (name, type, typeVersion, position, parameters) => ({ id: crypto.randomUUID(), name, type, typeVersion, position, parameters });
  w.nodes.push(
    mk('Use Hermes Draft?', 'n8n-nodes-base.if', 2.2, [-300, 620], ifYes("$json.account && $json.account.metadata && $json.account.metadata.hermes && String($json.account.metadata.hermes.draft || '').trim().length >= 40")),
    mk('Hermes Draft Result', 'n8n-nodes-base.code', 2, [-60, 520], { jsCode: `const base = $input.first().json;
const h = base.account.metadata.hermes;
const subject = (h.draft_subject && String(h.draft_subject).trim().slice(0, 200)) || ('Consulta para ' + (base.account.name || 'su equipo'));
const message = String(h.draft).trim().slice(0, 3000);
return [{ json: { ...base, valid: Boolean(subject && message), parse_errors: [], subject, message, draft_source: 'hermes' } }];` }),
  );
  w.connections['Has Evidence?'].main[1] = [{ node: 'Use Hermes Draft?', type: 'main', index: 0 }];
  w.connections['Use Hermes Draft?'] = { main: [[{ node: 'Hermes Draft Result', type: 'main', index: 0 }], [{ node: 'Call OpenClaw Draft', type: 'main', index: 0 }]] };
  w.connections['Hermes Draft Result'] = { main: [[{ node: 'Draft Valid?', type: 'main', index: 0 }]] };
  return { workflow: w, changed: true };
}

/* ------------------------------------------------------------------- CLI */
if (process.argv[2] === 'write') {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const placeholder = { qualWorkflowId: 'QUALIFICATION_WORKFLOW_ID', crmWorkflowId: 'CRM_SYNC_WORKFLOW_ID', draftWorkflowId: 'OUTREACH_DRAFT_WORKFLOW_ID', admitWorkflowId: 'ADMIT_WORKFLOW_ID', ingestKeyCredId: 'INGEST_KEY_CREDENTIAL_ID', webhookId: '00000000-0000-0000-0000-000000000000' };
  fs.writeFileSync(path.join(root, 'atacama-labs-08-prospect-ingest.json'), JSON.stringify(build08({ mode: 'test', ...placeholder }), null, 2));
  fs.writeFileSync(path.join(root, 'atacama-labs-09-prospect-approve.json'), JSON.stringify(build09({ mode: 'test', ...placeholder }), null, 2));
  const f04 = path.join(root, 'atacama-labs-04-crm-sync.json');
  const w04 = JSON.parse(fs.readFileSync(f04, 'utf8'));
  const p = patch04(w04);
  if (p.changed) fs.writeFileSync(f04, JSON.stringify(p.workflow, null, 2));
  const f05 = path.join(root, 'atacama-labs-05-outreach-draft.json');
  const w05 = JSON.parse(fs.readFileSync(f05, 'utf8'));
  const p5 = patch05(w05);
  const p5h = patch05Hermes(p5.changed ? p5.workflow : w05);
  if (p5.changed || p5h.changed) fs.writeFileSync(f05, JSON.stringify(p5h.changed ? p5h.workflow : p5.workflow, null, 2));
  console.log('08 y 09 escritos (modo test, ids como marcadores). 04 parcheado:', p.changed, '| 05 parcheado:', p5.changed || p5h.changed);
}
