import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../scripts/aster/aster-pdf-core.mjs';
import { buildAsterDemo, buildCode, finalizeCode } from './aster-demo.mjs';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const base = {
  request_id: 'aster-test-001', document_type: 'observacion_preventiva', company_name: 'Empresa ficticia', person_name: 'Persona de prueba', email: 'Prueba@Example.com', consent_to_email: true,
  activity_location: 'Taller, Mejillones', raw_narrative: 'Materiales obstruyendo un pasillo; se avisó al encargado; falta comprobar el despeje.',
  verified_facts: ['Materiales obstruyendo parcialmente un pasillo', 'Se informó al encargado'], observations: ['Obstrucción parcial'], actions_taken: ['Informar al encargado'],
  pending_actions: [{ description: 'Verificar retiro de materiales', owner: null, due_date: null }], notes: 'Datos ficticios',
};

/** Ejecuta el JS REAL del nodo Code (el mismo que viaja a n8n) con un entorno simulado. */
async function runNode(src, { input, sd, nodes = {} }) {
  const fn = new AsyncFunction('$input', '$getWorkflowStaticData', '$', 'Buffer', src);
  const ctx = { helpers: { prepareBinaryData: async (buf, name, mime) => ({ data: buf.toString('base64'), fileName: name, mimeType: mime }) } };
  return fn.call(ctx, { first: () => ({ json: input.json }), all: () => [{ json: input.json }] }, () => sd, (name) => ({ first: () => nodes[name] }), Buffer);
}
const build = (body, sd, test = true) => runNode(buildCode(test), { input: { json: { body } }, sd });

test('validación: rechaza lo que debe rechazar', () => {
  assert.equal(core.asterValidate(null).code, 'EMPTY_BODY');
  assert.equal(core.asterValidate({}).code, 'EMPTY_BODY');
  assert.equal(core.asterValidate({ ...base, consent_to_email: 'true' }).code, 'CONSENT_REQUIRED');
  assert.equal(core.asterValidate({ ...base, consent_to_email: undefined }).code, 'CONSENT_REQUIRED');
  assert.equal(core.asterValidate({ ...base, email: 'sin-arroba' }).code, 'INVALID_EMAIL');
  assert.equal(core.asterValidate({ ...base, email: '' }).code, 'INVALID_EMAIL');
  assert.equal(core.asterValidate({ ...base, document_type: 'orden_de_pago' }).code, 'VALIDATION_ERROR');
  assert.equal(core.asterValidate({ ...base, raw_narrative: '', verified_facts: [], observations: [], actions_taken: [], summary: '' }).code, 'VALIDATION_ERROR');
  assert.equal(core.asterValidate({ ...base, raw_narrative: 'x'.repeat(50000) }).code, 'PAYLOAD_TOO_LARGE');
});

test('validación: normaliza, recorta y limpia', () => {
  const v = core.asterValidate({ ...base, request_id: 'a b/c;d', verified_facts: 'Un solo hecho', pending_actions: ['solo texto'], person_name: 'x'.repeat(500) });
  assert.ok(v.ok);
  assert.equal(v.p.email, 'prueba@example.com');
  assert.equal(v.p.request_id, 'a-b-c-d');
  assert.deepEqual(v.p.verified_facts, ['Un solo hecho']);
  assert.deepEqual(v.p.pending_actions, [{ description: 'solo texto', owner: null, due_date: null }]);
  assert.equal(v.p.person_name.length, 120);
});

test('folio, id automático y fecha de emisión en hora de Chile', () => {
  assert.equal(core.asterFolio('20261105', 7), 'DEMO-20261105-0007');
  const v = core.asterValidate({ ...base, request_id: undefined }).p;
  assert.match(core.asterAutoId(v), /^auto-[0-9a-f]{16}$/);
  assert.equal(core.asterAutoId(v), core.asterAutoId({ ...v }));
  assert.notEqual(core.asterAutoId(v), core.asterAutoId({ ...v, email: 'otro@example.com' }));
  // 5-nov-2026 02:30 UTC sigue siendo 4-nov en Chile (UTC-3)
  assert.equal(core.asterIssued(new Date('2026-11-05T02:30:00Z')).ymd, '20261104');
  assert.equal(core.asterIssued(new Date('2026-11-05T17:32:00Z')).human, '05-11-2026 14:32');
});

test('texto: tildes, ñ, comillas y emojis no rompen el PDF', () => {
  assert.equal(core.asterWin('Cañería ¿qué? “hola” — € ✅'), 'Cañería ¿qué? \x93hola\x94 \x97 \x80 ?'.replace(' ?', ' ?'));
  assert.equal(core.asterWin('ok 😀 fin'), 'ok  fin');
  const lines = core.asterWrap('a'.repeat(200), 10, 'reg', 100);
  assert.ok(lines.length > 1 && lines.every((l) => core.asterW(l, 10, 'reg') <= 100.5));
});

test('PDF: estructura válida (cabecera, xref con offsets exactos, EOF)', () => {
  const v = core.asterValidate(base).p;
  const issued = core.asterIssued(new Date('2026-11-05T17:32:00Z'));
  const pdf = core.asterPdf(core.asterBuildDoc(v, core.asterFolio(issued.ymd, 1), issued));
  const s = pdf.toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.trimEnd().endsWith('%%EOF'));
  const xrefAt = Number(/startxref\n(\d+)/.exec(s)[1]);
  assert.equal(s.slice(xrefAt, xrefAt + 4), 'xref');
  const entries = [...s.slice(xrefAt).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
  entries.forEach((off, i) => assert.ok(s.slice(off).startsWith(`${i + 1} 0 obj`), `objeto ${i + 1} en offset ${off}`));
  assert.match(s, /\/MediaBox \[0 0 595.28 841.89\]/);
});

test('documento: «No informado» donde falta, DEMO visible, nunca «cerrado», no inventa fecha del hecho', () => {
  const v = core.asterValidate({ ...base, activity_location: '', person_name: '', company_name: '', reported_at: '' }).p;
  const doc = core.asterBuildDoc(v, 'DEMO-20261105-0001', core.asterIssued(new Date('2026-11-05T17:32:00Z')));
  const f = Object.fromEntries(doc.fields.map((x) => [x.l, x.v]));
  assert.equal(f['Fecha del hecho'], 'No informado');
  assert.equal(f['Autor / responsable'], 'No informado');
  assert.equal(f['Ubicación / área'], 'No informado');
  assert.equal(f['Empresa / organización'], core.ASTER_NEUTRAL_COMPANY);
  assert.equal(f['Fecha de emisión'], '05-11-2026 14:32');
  assert.match(doc.badge, /BORRADOR DE DEMOSTRACIÓN/);
  assert.equal(f.Estado, 'Pendiente de verificación');
  assert.ok(!/cerrad/i.test(JSON.stringify(doc.blocks.filter((b) => b.t !== 'p' || !/no confirma el cierre/.test(b.text)))));
});

test('todos los tipos generan un PDF', () => {
  for (const t of core.ASTER_TYPES) {
    const v = core.asterValidate({ ...base, document_type: t });
    assert.ok(v.ok, t);
    const pdf = core.asterPdf(core.asterBuildDoc(v.p, 'DEMO-20261105-0001', core.asterIssued(new Date())));
    assert.ok(pdf.length > 5000, t);
  }
});

test('nodo Build: validación fallida responde sin generar nada', async () => {
  const sd = {};
  const [r] = await build({ ...base, consent_to_email: false }, sd);
  assert.equal(r.json._route, 'respond');
  assert.equal(r.json.response.status, 'failed');
  assert.equal(r.json.response.error_code, 'CONSENT_REQUIRED');
  assert.equal(r.json.response.email_status, 'not_sent');
  assert.equal(r.binary, undefined);
  assert.deepEqual(sd.folios || {}, {});
});

test('nodo Build + Finalize: genera, envía una sola vez y responde igual ante reintentos', async () => {
  const sd = {};
  const [a] = await build(base, sd);
  assert.equal(a.json._route, 'deliver');
  assert.equal(a.json.email, 'prueba@example.com');
  assert.match(a.json.folio, /^DEMO-\d{8}-0001$/);
  assert.match(a.json.file_name, /^DEMO-\d{8}-0001-observacion-preventiva\.pdf$/);
  assert.equal(a.json.subject, 'Tu informe de demostración | Atacama Labs');
  assert.ok(Buffer.from(a.binary.data.data, 'base64').toString('latin1').startsWith('%PDF-1.4'));
  const restore = { json: { ...a.json, drive: { id: 'drv1' } }, binary: a.binary };
  const [fin] = await runNode(finalizeCode, { input: { json: { id: 'msg1' } }, sd, nodes: { Restore: restore } });
  assert.equal(fin.json.status, 'completed');
  assert.equal(fin.json.email_status, 'sent');
  assert.equal(fin.json.drive_status, 'saved');
  assert.equal(fin.json.document_id, a.json.folio);
  // reintento con el mismo request_id → no genera, no envía, mismo documento
  const [b] = await build(base, sd);
  assert.equal(b.json._route, 'respond');
  assert.equal(b.json.response.duplicate, true);
  assert.equal(b.json.response.document_id, a.json.folio);
  assert.equal(b.json.response.email_status, 'sent');
  assert.equal(b.binary, undefined);
  // otro request_id → folio siguiente
  const [c] = await build({ ...base, request_id: 'aster-test-002' }, sd);
  assert.match(c.json.folio, /0002$/);
});

test('Finalize: honesto cuando falla el correo o Drive, y no cachea un fallo de correo', async () => {
  const mk = async (mail, drive) => {
    const sd = {};
    const [a] = await build(base, sd);
    const restore = { json: { ...a.json, drive }, binary: a.binary };
    const [fin] = await runNode(finalizeCode, { input: { json: mail }, sd, nodes: { Restore: restore } });
    return { fin: fin.json, sd };
  };
  const noMail = await mk({ error: 'auth' }, { id: 'd1' });
  assert.equal(noMail.fin.status, 'failed');
  assert.equal(noMail.fin.email_status, 'failed');
  assert.match(noMail.fin.message, /NO se pudo enviar/);
  assert.deepEqual(Object.keys(noMail.sd.done || {}), [], 'un correo fallido no debe bloquear el reintento');
  const noDrive = await mk({ id: 'm1' }, { error: 'sin permiso' });
  assert.equal(noDrive.fin.status, 'partial');
  assert.equal(noDrive.fin.email_status, 'sent');
  assert.equal(noDrive.fin.drive_status, 'failed');
  assert.equal(noDrive.fin.drive_url_internal, null);
});

test('request_id ausente: id automático evita doble envío en reintentos inmediatos', async () => {
  const sd = {};
  const body = { ...base, request_id: undefined };
  const [a] = await build(body, sd);
  const restore = { json: { ...a.json, drive: { id: 'd' } }, binary: a.binary };
  await runNode(finalizeCode, { input: { json: { id: 'm' } }, sd, nodes: { Restore: restore } });
  const [b] = await build(body, sd);
  assert.equal(b.json.response.duplicate, true);
  // pasada la ventana de 10 min, un ensayo repetido genera un documento nuevo
  Object.values(sd.done).forEach((e) => { e.at -= 11 * 60 * 1000; });
  const [c] = await build(body, sd);
  assert.equal(c.json._route, 'deliver');
});

test('workflow: forma, autenticación y ausencia de secretos', () => {
  const real = buildAsterDemo('real');
  const names = real.nodes.map((n) => n.name);
  assert.deepEqual(names, ['Webhook ASTER', 'Build', 'Entregar?', 'Drive Upload', 'Restore', 'Gmail Send', 'Finalize', 'Respond Early']);
  assert.equal(real.nodes[0].parameters.authentication, 'headerAuth');
  assert.equal(real.nodes[0].parameters.path, 'atacama-aster-demo-document');
  assert.equal(real.nodes.find((n) => n.name === 'Gmail Send').parameters.options.attachmentsUi.attachmentsBinary[0].property, 'data');
  for (const n of real.nodes) if (n.type === 'n8n-nodes-base.code') new AsyncFunction('$input', '$getWorkflowStaticData', '$', 'Buffer', n.parameters.jsCode); // compila
  const txt = JSON.stringify(real);
  assert.ok(!/eyJ[A-Za-z0-9_-]{20,}.eyJ|sk-[A-Za-z0-9]{20}|pit-[0-9a-f]{8}|Bearer |N8N_API_KEY/.test(txt));
  const t = buildAsterDemo('test');
  assert.ok(!t.nodes.some((n) => /googleDrive|gmail/.test(n.type)), 'la copia de pruebas no puede enviar ni subir nada');
  assert.equal(t.nodes[0].parameters.authentication, undefined);
});
