#!/usr/bin/env node
/**
 * ASTER 2026 · workflow n8n «32 ASTER PDF Link» — herramienta ÚNICA de Lety para la demo (variante «enlace»).
 *
 *   POST /webhook/atacama-aster-pdf-link   (cabecera X-Atacama-Key)   → contrato en docs/aster-demo/LETY-HERRAMIENTA-PDF-LINK.md
 *
 * Webhook → Validate (JSON → datos seguros, sin HTML del usuario) → [Drive: busca la plantilla corporativa → Drive: la descarga]
 *         → Merge (reemplaza los 4 marcadores) → API2PDF (HTML → PDF) → Format (status | pdf_url | error).
 * NO envía correo ni guarda el PDF en Drive (fuera de alcance por ahora). Aislado: no toca el workflow 31, Nayra ni producción.
 *
 * Uso:  node n8n/build/aster-pdf-link.mjs            → n8n/atacama-labs-32-aster-pdf-link.json   (real; sin credenciales Drive/API2PDF asignadas)
 *       MODE=test node n8n/build/aster-pdf-link.mjs  → copia DESECHABLE: plantilla local embebida + API2PDF simulado (devuelve el HTML para revisarlo)
 */
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as core from '../../scripts/aster/aster-html-core.mjs';
import * as frag from '../../scripts/aster/aster-html-fragments.mjs';

export const WEBHOOK_PATH = 'atacama-aster-pdf-link';
export const TEMPLATE_NAME = 'ATACAMA-DEMO-PLANTILLA-DINAMICA.html';
const KEY_CRED = { httpHeaderAuth: { id: 'REPLACE_KEY_CRED_ID', name: 'Atacama Labs - ASTER Demo Key' } };
const uuid = () => randomUUID();

const FUNCS = [core.asterHtmlEsc, core.asterHtmlRich, core.asterHtmlValidate, core.asterHtmlSlug, core.asterHtmlIssued, core.asterHtmlRender, core.asterHtmlMerge, core.asterHtmlExtract, frag.asterHtmlDecode, frag.asterHtmlText, frag.asterHtmlParseSections, frag.asterHtmlParseMetadata];
export const LIB = `const ASTER_HTML_PLACEHOLDERS = ${JSON.stringify(core.ASTER_HTML_PLACEHOLDERS)};
const ASTER_HTML_DEFAULT_CATEGORY = ${JSON.stringify(core.ASTER_HTML_DEFAULT_CATEGORY)};
const ASTER_HTML_LAYOUT_FIX = ${JSON.stringify(core.ASTER_HTML_LAYOUT_FIX)};
const ASTER_HTML_BLOCK_RE = ${JSON.stringify(frag.ASTER_HTML_BLOCK_RE)};
const ASTER_HTML_ROW_RE = ${JSON.stringify(frag.ASTER_HTML_ROW_RE)};
const clean = ${'' /* clean() es privada del módulo: se redefine aquí idéntica */}(s, max) => {
  if (s == null) return '';
  if (typeof s === 'number' || typeof s === 'boolean') s = String(s);
  if (typeof s !== 'string') return '';
  const t = s.replace(/\\r\\n?/g, '\\n').replace(/[ \\t]+\\n/g, '\\n').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};
const P = (inner, first) => '<p' + (first ? '' : ' style="margin-top:1.6mm"') + '>' + inner + '</p>';
${FUNCS.map((f) => f.toString()).join('\n\n')}`;

/** Nodo «Validate». */
export const validateCode = () => `${LIB}
const sd = $getWorkflowStaticData('global');
sd.done = sd.done || {};
const first = $input.first().json;
const ex = asterHtmlExtract(first);
const body = ex.body;
const fail = (rid, code, message, extra) => [{ json: { _route: 'respond', response: Object.assign({ request_id: rid || '', status: 'failed', pdf_url: null, file_name: null, error_code: code, error: message, message }, extra || {}) } }];
const v = asterHtmlValidate(body);
if (!v.ok) {
  const seen = 'Recibí content-type ' + (ex.diag.content_type || 'ninguno') + ', cuerpo tipo ' + ex.diag.body_type + ', campos: ' + (ex.diag.keys.join(', ') || 'ninguno') + '.';
  return fail(String((body && body.request_id) || ''), v.code, v.message + ' ' + seen, { received: ex.diag });
}
const p = v.p;
const now = new Date();
const prev = p.request_id ? sd.done[p.request_id] : null;
if (prev && now.getTime() - prev.at < 600000) {
  return [{ json: { _route: 'respond', response: Object.assign({}, prev.response, { duplicate: true, message: 'Esta solicitud ya se había procesado; se devuelve el mismo documento.' }) } }];
}
const render = asterHtmlRender(p, asterHtmlIssued(now));
return [{ json: { _route: 'build', request_id: p.request_id, render } }];`;

/** Nodo «Merge»: toma la plantilla (binario de Drive, o copia local en pruebas) y reemplaza los marcadores. */
export const mergeCode = (testTemplate) => `${LIB}
const st = $('Validate').first().json;
const fail = (code, message) => [{ json: { _route: 'respond', response: { request_id: st.request_id || '', status: 'failed', pdf_url: null, file_name: null, error_code: code, error: message, message } } }];
let template = '';
${testTemplate !== null ? `template = ${JSON.stringify(testTemplate)};` : `try { const buf = await this.helpers.getBinaryDataBuffer(0, 'data'); template = buf.toString('utf8'); } catch (e) { template = ''; }`}
if (!template) return fail('TEMPLATE_UNAVAILABLE', 'No se pudo leer la plantilla corporativa desde Google Drive. Revisa la credencial de Drive y que exista el archivo ${TEMPLATE_NAME}.');
let html;
try { html = asterHtmlMerge(template, st.render); } catch (e) { return fail('TEMPLATE_INVALID', String(e.message || e).slice(0, 200)); }
return [{ json: { _route: 'pdf', request_id: st.request_id, file_name: st.render.fileName, api2pdf_body: { html, fileName: st.render.fileName, inline: false, options: { printBackground: true, preferCSSPageSize: true } } } }];`;

/** Nodo «Format»: interpreta la respuesta de API2PDF sin inventar éxito. */
export const formatCode = (test) => `const m = $('Merge').first().json;
const sd = $getWorkflowStaticData('global');
sd.done = sd.done || {};
const j = $input.first().json || {};
const rid = m.request_id || '';
const errTxt = (x) => String(x == null ? '' : (typeof x === 'string' ? x : (x.message || JSON.stringify(x)))).replace(/\\s+/g, ' ').slice(0, 200);
if (j.error || j.Success !== true || !j.FileUrl) {
  const detail = errTxt(j.Error || j.error || 'sin detalle');
  const msg = 'No se pudo generar el PDF (' + detail + ').';
  return [{ json: { request_id: rid, status: 'failed', pdf_url: null, file_name: m.file_name, error_code: 'PDF_SERVICE_ERROR', error: msg, message: msg } }];
}
const response = { request_id: rid, status: 'completed', pdf_url: j.FileUrl, file_name: m.file_name, error_code: null, error: null, message: 'Documento generado. El enlace permanece disponible por tiempo limitado.' };
if (rid) {
  sd.done[rid] = { at: Date.now(), response };
  const ks = Object.keys(sd.done); if (ks.length > 300) { ks.sort((a, b) => sd.done[a].at - sd.done[b].at).slice(0, ks.length - 300).forEach((k) => delete sd.done[k]); }
}
${test ? `return [{ json: Object.assign({}, response, { _test_html: m.api2pdf_body.html }) }];` : `return [{ json: response }];`}`;

const respondCode = `return [{ json: $input.first().json.response }];`;
const fakeApiCode = `return [{ json: { Success: true, FileUrl: 'https://example.invalid/simulado-api2pdf.pdf' } }];`;

const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const gate = (name, route, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ $json._route === "${route}" ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] } } });

export function buildAsterPdfLink(mode = 'real', testTemplate = null) {
  const test = mode === 'test';
  const webhook = { id: uuid(), name: 'Webhook ASTER PDF', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(),
    parameters: { httpMethod: 'POST', path: test ? `zz-aster-pdf-test-${uuid().slice(0, 8)}` : WEBHOOK_PATH, ...(test ? {} : { authentication: 'headerAuth' }), responseMode: 'lastNode', options: {} },
    ...(test ? {} : { credentials: KEY_CRED }) };
  const validate = code('Validate', validateCode(), [260, 0]);
  const g1 = gate('Construir?', 'build', [520, 0]);
  const respond = code('Respond', respondCode, [1560, 220]);
  const search = { id: uuid(), name: 'Drive Buscar plantilla', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [780, -80], alwaysOutputData: true, onError: 'continueRegularOutput',
    parameters: { resource: 'fileFolder', operation: 'search', searchMethod: 'query', queryString: `name = '${TEMPLATE_NAME}' and trashed = false`, returnAll: false, limit: 1, filter: {}, options: { fields: ['id', 'name'] } } };
  const download = { id: uuid(), name: 'Drive Descargar plantilla', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [1040, -80], onError: 'continueRegularOutput',
    parameters: { resource: 'file', operation: 'download', fileId: { __rl: true, value: '={{ $json.id }}', mode: 'id' }, options: {} } };
  const merge = code('Merge', mergeCode(test ? testTemplate : null), [test ? 780 : 1300, -80]);
  const g2 = gate('PDF?', 'pdf', [test ? 1040 : 1560, -80]);
  const api = test ? code('API2PDF (simulado)', fakeApiCode, [1300, -160]) : { id: uuid(), name: 'API2PDF HTML a PDF', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1820, -160], onError: 'continueRegularOutput',
    parameters: { method: 'POST', url: 'https://v2.api2pdf.com/chrome/pdf/html', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.api2pdf_body) }}', options: { timeout: 60000 } } };
  const format = code('Format', formatCode(test), [test ? 1560 : 2080, -160]);
  const nodes = test ? [webhook, validate, g1, merge, g2, api, format, respond] : [webhook, validate, g1, search, download, merge, g2, api, format, respond];
  const connections = test
    ? { [webhook.name]: { main: [to(validate.name)] }, [validate.name]: { main: [to(g1.name)] }, [g1.name]: { main: [to(merge.name), to(respond.name)] }, [merge.name]: { main: [to(g2.name)] }, [g2.name]: { main: [to(api.name), to(respond.name)] }, [api.name]: { main: [to(format.name)] } }
    : { [webhook.name]: { main: [to(validate.name)] }, [validate.name]: { main: [to(g1.name)] }, [g1.name]: { main: [to(search.name), to(respond.name)] }, [search.name]: { main: [to(download.name)] }, [download.name]: { main: [to(merge.name)] }, [merge.name]: { main: [to(g2.name)] }, [g2.name]: { main: [to(api.name), to(respond.name)] }, [api.name]: { main: [to(format.name)] } };
  return {
    name: test ? 'ZZ-TEST Atacama Labs - 32 ASTER PDF Link (desechable)' : 'Atacama Labs - 32 ASTER PDF Link',
    nodes, connections,
    settings: { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', saveManualExecutions: false },
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const test = process.env.MODE === 'test';
  const tpl = test ? fs.readFileSync(new URL('../../docs/aster-demo/plantilla/ATACAMA-DEMO-PLANTILLA-DINAMICA.html', import.meta.url), 'utf8') : null;
  const out = new URL(test ? '../atacama-labs-32-aster-pdf-link.TEST.json' : '../atacama-labs-32-aster-pdf-link.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildAsterPdfLink(test ? 'test' : 'real', tpl), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
