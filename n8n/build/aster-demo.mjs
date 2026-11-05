#!/usr/bin/env node
/**
 * ASTER 2026 · workflow n8n «31 ASTER Demo Documents» — la ÚNICA pieza externa de la demostración.
 *
 * Lety (WhatsApp + audio + conversación) recoge los datos y llama a esta herramienta:
 *   POST /webhook/atacama-aster-demo-document   (cabecera X-Atacama-Key)   → contrato en docs/aster-demo/LETY-HERRAMIENTA.md
 *
 * Webhook → Build (valida, idempotencia por request_id, folio, PDF A4 escrito a mano) → [Drive: sube el PDF a la carpeta privada]
 *         → [Gmail: envía el PDF ADJUNTO] → Finalize (respuesta honesta: completed | partial | failed) .
 * Un solo componente envía el correo (este); Lety NO envía por su cuenta. Sin Supabase ni GHL: nada del CRM comercial se toca.
 *
 * Uso:  node n8n/build/aster-demo.mjs            → n8n/atacama-labs-31-aster-demo-documents.json   (real; Drive/Gmail sin credencial asignada)
 *       MODE=test node n8n/build/aster-demo.mjs  → copia DESECHABLE sin Drive/Gmail (entrega simulada) que devuelve el PDF en base64
 */
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { FONT_W, LOGO } from '../../scripts/aster/aster-assets.mjs';
import * as core from '../../scripts/aster/aster-pdf-core.mjs';

export const WEBHOOK_PATH = 'atacama-aster-demo-document';
const KEY_CRED = { httpHeaderAuth: { id: 'REPLACE_KEY_CRED_ID', name: 'Atacama Labs - ASTER Demo Key' } };
const uuid = () => randomUUID();

const FUNCS = [core.asterWin, core.asterW, core.asterWrap, core.asterPdf, core.asterValidate, core.asterFolio, core.asterAutoId, core.asterIssued, core.asterBuildDoc, core.asterSlug];
export const LIB = `const ASTER_TYPES = ${JSON.stringify(core.ASTER_TYPES)};
const ASTER_NEUTRAL_COMPANY = ${JSON.stringify(core.ASTER_NEUTRAL_COMPANY)};
const FONT_W = ${JSON.stringify(FONT_W)};
const LOGO = ${JSON.stringify(LOGO)};
${FUNCS.map((f) => f.toString()).join('\n\n')}`;

const esc = `const escH = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');`;

/** Nodo «Build»: valida, aplica idempotencia, genera folio y PDF. Devuelve {_route:'respond'} para responder sin entregar. */
export const buildCode = (test) => `${LIB}
${esc}
const CFG = { driveFolderId: 'REEMPLAZAR_ID_CARPETA_DRIVE', test: ${test ? 'true' : 'false'}, autoIdWindowMs: 600000 };
const TYPE_LABEL = { informe_tecnico: 'Informe técnico de terreno', observacion_preventiva: 'Registro de observación preventiva', parte_turno: 'Parte de turno', solicitud_trabajo: 'Borrador de solicitud de trabajo', informe_general: 'Registro general de actividad', informe_avance: 'Informe de avance / visita', novedades_logisticas: 'Registro de novedades logísticas', acta_reunion: 'Acta de reunión operacional' };
const first = $input.first().json;
const body = first && typeof first.body === 'object' && first.body !== null ? first.body : first;
const sd = $getWorkflowStaticData('global');
sd.done = sd.done || {}; sd.folios = sd.folios || {};
const now = new Date();
const v = asterValidate(body);
if (!v.ok) return [{ json: { _route: 'respond', response: { request_id: String((body && body.request_id) || ''), status: 'failed', email_status: 'not_sent', drive_status: 'not_saved', error_code: v.code, message: v.message } } }];
const p = v.p;
const auto = !p.request_id;
if (auto) p.request_id = asterAutoId(p);
const prev = sd.done[p.request_id];
if (prev && (!prev.auto || now.getTime() - prev.at < CFG.autoIdWindowMs)) {
  return [{ json: { _route: 'respond', response: Object.assign({}, prev.response, { duplicate: true, message: 'Esta solicitud ya se había procesado; no se generó ni se envió un documento nuevo. ' + (prev.response.message || '') }) } }];
}
const issued = asterIssued(now);
const n = (sd.folios[issued.ymd] || 0) + 1;
sd.folios[issued.ymd] = n;
const folio = asterFolio(issued.ymd, n);
const doc = asterBuildDoc(p, folio, issued);
const pdf = asterPdf(doc);
const file_name = folio + '-' + asterSlug(p.document_type) + '.pdf';
const label = TYPE_LABEL[p.document_type];
const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1F2937;font-size:15px;line-height:1.55;max-width:560px">'
  + '<p>Hola' + (p.person_name ? ' ' + escH(p.person_name) : '') + ',</p>'
  + '<p>Adjuntamos el borrador que pediste: <b>' + escH(label) + '</b> (folio <b>' + escH(folio) + '</b>), preparado a partir de lo que nos contaste.</p>'
  + '<p>Es una <b>demostración</b>: un borrador ilustrativo sujeto a revisión, que no es un documento oficial ni reemplaza un formulario aprobado por tu empresa.</p>'
  + '<p>Lo que viste es un ejemplo de cómo un agente de Atacama Labs convierte un audio en trabajo real: entiende, ordena, documenta y entrega.</p>'
  + '<p style="margin-top:24px">Un saludo,<br><b>Atacama Labs</b><br><span style="color:#64748B">Tecnología para el trabajo real · atacamalabs.cl</span></p></div>';
const bin = await this.helpers.prepareBinaryData(pdf, file_name, 'application/pdf');
const json = { _route: 'deliver', request_id: p.request_id, auto_request_id: auto, document_type: p.document_type, email: p.email, folio, file_name, subject: 'Tu informe de demostración | Atacama Labs', html, drive_folder_id: CFG.driveFolderId, pdf_bytes: pdf.length, pages: (pdf.toString('latin1').match(/\\/Type \\/Page /g) || []).length };
if (CFG.test) json.pdf_base64 = pdf.toString('base64');
return [{ json, binary: { data: bin } }];`;

/** Nodo «Finalize»: respuesta honesta según lo que de verdad ocurrió; guarda la idempotencia cuando el correo salió. */
export const finalizeCode = `const b = $('Restore').first().json;
const mail = $input.first().json || {};
const dr = b.drive || {};
const emailSent = Boolean(mail.id) && !mail.error;
const driveOk = Boolean(dr.id) && !dr.error;
const status = emailSent && driveOk ? 'completed' : emailSent ? 'partial' : 'failed';
let message;
if (status === 'completed') message = 'Documento generado, guardado en Drive y enviado al correo.';
else if (status === 'partial') message = 'El documento se generó y el correo salió, pero el respaldo en Drive falló.';
else message = 'El documento se generó, pero el correo NO se pudo enviar todavía.' + (driveOk ? ' El respaldo en Drive sí quedó guardado.' : '');
const response = { request_id: b.request_id, status, document_id: b.folio, file_name: b.file_name, email_status: emailSent ? 'sent' : 'failed', drive_status: driveOk ? 'saved' : 'failed', drive_url_internal: driveOk ? 'https://drive.google.com/file/d/' + dr.id + '/view' : null, message };
if (b.pdf_base64) response.pdf_base64 = b.pdf_base64;
if (emailSent) {
  const sd = $getWorkflowStaticData('global');
  sd.done = sd.done || {};
  const safe = Object.assign({}, response); delete safe.pdf_base64;
  sd.done[b.request_id] = { at: Date.now(), auto: Boolean(b.auto_request_id), response: safe };
  const keys = Object.keys(sd.done);
  if (keys.length > 300) keys.sort((x, y) => sd.done[x].at - sd.done[y].at).slice(0, keys.length - 300).forEach((k) => { delete sd.done[k]; });
}
return [{ json: response }];`;

const restoreCode = `const prev = $('Build').first();
return [{ json: Object.assign({}, prev.json, { drive: $input.first().json }), binary: prev.binary }];`;
const respondCode = `return [{ json: $input.first().json.response }];`;
const fakeDriveCode = `return [{ json: { id: 'test-drive-id' } }];`;
const fakeMailCode = `return [{ json: { id: 'test-message-id' } }];`;

const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];

export function buildAsterDemo(mode = 'real') {
  const test = mode === 'test';
  const webhook = { id: uuid(), name: 'Webhook ASTER', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(),
    parameters: { httpMethod: 'POST', path: test ? `zz-aster-test-${uuid().slice(0, 8)}` : WEBHOOK_PATH, ...(test ? {} : { authentication: 'headerAuth' }), responseMode: 'lastNode', options: {} },
    ...(test ? {} : { credentials: KEY_CRED }) };
  const build = code('Build', buildCode(test), [260, 0]);
  const gate = { id: uuid(), name: 'Entregar?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [520, 0],
    parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: '={{ $json._route === "deliver" ? "yes" : "no" }}', rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] } } };
  const early = code('Respond Early', respondCode, [780, 160]);
  const drive = test ? code('Drive (simulado)', fakeDriveCode, [780, -80]) : { id: uuid(), name: 'Drive Upload', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [780, -80], continueOnFail: true,
    parameters: { resource: 'file', operation: 'upload', inputDataFieldName: 'data', name: '={{ $json.file_name }}', driveId: { __rl: true, value: 'My Drive', mode: 'list', cachedResultName: 'My Drive' }, folderId: { __rl: true, value: '={{ $json.drive_folder_id }}', mode: 'id' }, options: {} } };
  const restore = code('Restore', restoreCode, [1040, -80]);
  const mail = test ? code('Gmail (simulado)', fakeMailCode, [1300, -80]) : { id: uuid(), name: 'Gmail Send', type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [1300, -80], continueOnFail: true,
    parameters: { resource: 'message', operation: 'send', sendTo: '={{ $json.email }}', subject: '={{ $json.subject }}', emailType: 'html', message: '={{ $json.html }}', options: { appendAttribution: false, senderName: 'Atacama Labs', attachmentsUi: { attachmentsBinary: [{ property: 'data' }] } } } };
  const fin = code('Finalize', finalizeCode, [1560, -80]);
  const nodes = [webhook, build, gate, drive, restore, mail, fin, early];
  return {
    name: test ? 'ZZ-TEST Atacama Labs - 31 ASTER Demo Documents (desechable)' : 'Atacama Labs - 31 ASTER Demo Documents',
    nodes,
    connections: {
      [webhook.name]: { main: [to(build.name)] }, [build.name]: { main: [to(gate.name)] }, [gate.name]: { main: [to(drive.name), to(early.name)] },
      [drive.name]: { main: [to(restore.name)] }, [restore.name]: { main: [to(mail.name)] }, [mail.name]: { main: [to(fin.name)] },
    },
    settings: { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', saveManualExecutions: false },
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const test = process.env.MODE === 'test';
  const out = new URL(test ? '../atacama-labs-31-aster-demo-documents.TEST.json' : '../atacama-labs-31-aster-demo-documents.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildAsterDemo(test ? 'test' : 'real'), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
