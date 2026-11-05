import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as core from '../../scripts/aster/aster-html-core.mjs';
import { buildAsterPdfLink, validateCode, mergeCode, formatCode } from './aster-pdf-link.mjs';

const TEMPLATE = fs.readFileSync(new URL('../../docs/aster-demo/plantilla/ATACAMA-DEMO-PLANTILLA-DINAMICA.html', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Caso 1 — el informe BP-204 (mismo contenido que el PDF de referencia).
export const BP204 = {
  request_id: 'bp204-test-001',
  title: 'Informe técnico de terreno',
  category: 'REPORTE TÉCNICO / DEMOSTRACIÓN',
  metadata: [
    { label: 'Equipo', value: 'Bomba BP-204' },
    { label: 'Fecha del hecho', value: 'No informada' },
    { label: 'Ubicación', value: 'No informada' },
    { label: 'Responsable', value: 'No informado' },
  ],
  sections: [
    { heading: 'Actividad realizada', text: 'Se realizó una revisión en terreno de la bomba de agua identificada como **BP-204**, mientras el equipo se encontraba en funcionamiento.' },
    { heading: 'Hallazgo informado', text: 'Durante la revisión se percibió un **ruido inusual** mientras la bomba estaba funcionando. No se informó la causa ni se estableció un diagnóstico técnico.' },
    { heading: 'Acciones realizadas', text: 'La observación detectada fue comunicada al supervisor, según el relato proporcionado.' },
    { heading: 'Estado y actividades pendientes', pending: { title: 'Revisión de mantenimiento pendiente', text: 'No se indicaron responsable, plazo ni mediciones asociadas. El hallazgo permanece pendiente de verificación.' } },
  ],
};

// Caso 2 — otro tipo de documento: parte de turno minero (datos ficticios), con listas y varios párrafos.
export const PARTE_TURNO = {
  request_id: 'parte-turno-test-002',
  title: 'Parte de turno · Chancado primario',
  category: 'PARTE DE TURNO / DEMOSTRACIÓN',
  metadata: { Turno: 'Noche', Área: 'Chancado primario', 'Jefe de turno': 'No informado' },
  sections: [
    { heading: 'Resumen del turno', text: 'Operación **normal** durante el turno.\n\nSe detuvo la correa transportadora CV-12 por 40 minutos por acumulación de material en la tolva.' },
    { heading: 'Novedades informadas', items: ['Acumulación de material en tolva de CV-12', 'Se limpió el punto de transferencia', 'Se avisó a mantenimiento mecánico'] },
    { heading: 'Pendientes para el turno siguiente', pending: { title: 'Revisión de rodillos de CV-12', text: 'Sin responsable ni hora comprometida.' }, items: ['Confirmar limpieza completa del punto de transferencia'] },
    { heading: 'Datos no informados', items: ['Tonelaje procesado', 'Causa de la acumulación'] },
  ],
};

const issued = { stamp: '20261105-1030', human: '05-11-2026 10:30' };

test('validación: rechaza lo que debe rechazar', () => {
  assert.equal(core.asterHtmlValidate(null).code, 'EMPTY_BODY');
  assert.equal(core.asterHtmlValidate({}).code, 'EMPTY_BODY');
  assert.equal(core.asterHtmlValidate({ sections: [{ heading: 'a', text: 'b' }] }).code, 'VALIDATION_ERROR'); // sin title
  assert.equal(core.asterHtmlValidate({ title: 'T' }).code, 'VALIDATION_ERROR'); // sin sections
  assert.equal(core.asterHtmlValidate({ title: 'T', sections: [{ heading: 'a' }] }).code, 'VALIDATION_ERROR'); // sección vacía
  assert.equal(core.asterHtmlValidate({ title: 'T', sections: [{ text: 'b' }] }).code, 'VALIDATION_ERROR'); // sin heading
  assert.equal(core.asterHtmlValidate({ title: 'T', sections: [{ heading: 'a', text: 'b' }], metadata: 'x' }).code, 'VALIDATION_ERROR');
  assert.equal(core.asterHtmlValidate({ title: 'T', sections: Array(15).fill({ heading: 'a', text: 'b' }) }).code, 'VALIDATION_ERROR');
  assert.equal(core.asterHtmlValidate({ title: 'T', sections: [{ heading: 'a', text: 'x'.repeat(61000) }] }).code, 'PAYLOAD_TOO_LARGE');
});

test('validación: normaliza (metadata como objeto, vacíos → «No informado», request_id seguro)', () => {
  const v = core.asterHtmlValidate({ ...PARTE_TURNO, request_id: 'a b/c;d' });
  assert.ok(v.ok);
  assert.equal(v.p.request_id, 'abcd');
  assert.equal(v.p.metadata.length, 3);
  const w = core.asterHtmlValidate({ title: 'T', metadata: [{ label: 'Lugar', value: '' }], sections: [{ heading: 'H', text: 'x' }] });
  assert.equal(w.p.metadata[0].value, 'No informado');
  assert.equal(w.p.category, core.ASTER_HTML_DEFAULT_CATEGORY);
});

test('BP-204: la plantilla real queda completa, sin marcadores y con el contenido esperado', () => {
  const v = core.asterHtmlValidate(BP204);
  assert.ok(v.ok);
  const r = core.asterHtmlRender(v.p, issued);
  const html = core.asterHtmlMerge(TEMPLATE, r);
  for (const ph of core.ASTER_HTML_PLACEHOLDERS) assert.ok(!html.includes(ph), 'quedó ' + ph);
  assert.ok(html.includes('<title>Atacama Labs | Informe técnico de terreno</title>'));
  assert.ok(html.includes('<h1>Informe técnico de terreno</h1>'));
  assert.ok(html.includes('REPORTE TÉCNICO / DEMOSTRACIÓN'));
  assert.ok(html.includes('<div class="label">Equipo</div><div class="value">Bomba BP-204</div>'));
  assert.ok(html.includes('REPORTE TÉCNICO / DEMOSTRACIÓN · Emitido 05-11-2026 10:30'), 'emisión en la franja azul');
  assert.ok(html.includes('<div class="label">Fecha del hecho</div><div class="value">No informada</div>'), 'fecha del hecho NO se deduce de la emisión');
  assert.ok(!html.includes('<div class="label">Fecha de emisión</div>'), 'no se agrega un 5.º campo (rompe la hoja)');
  assert.ok(html.includes('<style id="aster-layout-fix">') && html.indexOf('aster-layout-fix') < html.indexOf('</head>'));
  assert.ok(html.includes('<span class="numb">04</span><h2>Estado y actividades pendientes</h2>'));
  assert.ok(html.includes('<strong>BP-204</strong>'));
  assert.ok(html.includes('<div class="pending"><strong>Revisión de mantenimiento pendiente</strong>'));
  assert.equal(r.fileName, 'atacama-informe-tecnico-de-terreno-20261105-1030.pdf');
  // identidad corporativa intacta: logo, nota de validación y pie comercial siguen ahí
  assert.ok(html.includes('class="brand-logo"') && html.includes('Nota de validación.') && html.includes('atacamalabs.cl'));
});

test('otro tipo de documento (parte de turno): párrafos, listas y pendientes', () => {
  const v = core.asterHtmlValidate(PARTE_TURNO);
  assert.ok(v.ok);
  const r = core.asterHtmlRender(v.p, issued);
  const html = core.asterHtmlMerge(TEMPLATE, r);
  assert.ok(html.includes('PARTE DE TURNO / DEMOSTRACIÓN · Emitido'));
  assert.ok(html.includes('<div class="label">Turno</div><div class="value">Noche</div>'));
  assert.ok(html.includes('<div class="label">Jefe de turno</div><div class="value">No informado</div>'));
  assert.ok(html.includes('<p>Operación <strong>normal</strong> durante el turno.</p><p style="margin-top:1.6mm">Se detuvo'));
  assert.ok(html.includes('<p>• Acumulación de material en tolva de CV-12</p>'));
  assert.ok(html.includes('<span class="numb">03</span><h2>Pendientes para el turno siguiente</h2>'));
  assert.equal((html.match(/<div class="section">/g) || []).length, 4);
});

test('seguridad: el HTML del usuario se escapa; no se pueden inyectar marcadores ni scripts', () => {
  const evil = {
    title: '<script>alert(1)</script> {{SECTIONS_HTML}} $& $1',
    category: '"><img src=x onerror=alert(2)>',
    metadata: [{ label: '<b>x</b>', value: '<iframe src="https://malo.test"></iframe>' }],
    sections: [{ heading: '<h1>hack</h1>', text: 'Hola <script>steal()</script> **<u>ok</u>** {{DOCUMENT_TITLE}}', items: ['<a href="javascript:alert(3)">clic</a>'], pending: { title: '</div><div>', text: '<style>*{display:none}</style>' } }],
  };
  const v = core.asterHtmlValidate(evil);
  assert.ok(v.ok);
  const html = core.asterHtmlMerge(TEMPLATE, core.asterHtmlRender(v.p, issued));
  const body = html.slice(html.indexOf('<body>'));
  assert.ok(!/<script/i.test(body), 'script en el cuerpo');
  assert.ok(!/<iframe/i.test(body) && !/<img src=x/i.test(body) && !/<style>\*/i.test(body) && !/<a href="javascript/i.test(body));
  assert.ok(!/onerror=/.test(body.replace(/&quot;|&#39;/g, '')) || body.includes('&lt;img'), 'atributo peligroso sin escapar');
  assert.ok(body.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(body.includes('&#123;&#123;SECTIONS_HTML&#125;&#125;'), 'marcador inyectado no debe re-expandirse');
  assert.ok(body.includes('$&amp; $1') || body.includes('$&amp;'), 'patrones $ literales');
  assert.ok(body.includes('<strong>&lt;u&gt;ok&lt;/u&gt;</strong>'), 'negrita sobre texto ya escapado');
});

test('merge: lanza si la plantilla no trae los 4 marcadores', () => {
  const r = core.asterHtmlRender(core.asterHtmlValidate(BP204).p, issued);
  assert.throws(() => core.asterHtmlMerge(TEMPLATE.replace('{{SECTIONS_HTML}}', ''), r), /TEMPLATE_INVALID.*SECTIONS_HTML/);
  assert.throws(() => core.asterHtmlMerge('', r), /TEMPLATE_INVALID/);
});

test('logo oficial obligatorio: una plantilla sin logo incrustado NO genera documento', () => {
  const r = core.asterHtmlRender(core.asterHtmlValidate(BP204).p, issued);
  const sinLogo = TEMPLATE.replace(/(<img alt="Atacama Labs" class="brand-logo" src=")data:image\/png;base64,[A-Za-z0-9+\/=]+(")/, '$1https://ejemplo.invalid/logo.png$2');
  assert.ok(sinLogo !== TEMPLATE, 'la sustitución de prueba debe aplicarse');
  assert.throws(() => core.asterHtmlMerge(sinLogo, r), /TEMPLATE_INVALID.*logotipo/);
  const soloTexto = TEMPLATE.replace(/<img alt="Atacama Labs" class="brand-logo"[^>]*>/, '<div class="brand-logo">ATACAMA LABS</div>');
  assert.throws(() => core.asterHtmlMerge(soloTexto, r), /TEMPLATE_INVALID.*logotipo/);
  // con la plantilla oficial sí sale, y el logo está incrustado en el HTML final
  const html = core.asterHtmlMerge(TEMPLATE, r);
  assert.ok(/class="brand-logo" src="data:image\/png;base64,[A-Za-z0-9+\/=]{2000,}"/.test(html));
});

test('fecha de emisión en horario de Chile y slug de archivo', () => {
  assert.equal(core.asterHtmlIssued(new Date('2026-11-05T13:30:00Z')).human, '05-11-2026 10:30');
  assert.equal(core.asterHtmlSlug('Parte de turno · Chancado primario'), 'parte-de-turno-chancado-primario');
  assert.equal(core.asterHtmlSlug('¿¿??'), 'documento');
});

/** Ejecuta el JS REAL de los nodos Code (el mismo que viaja a n8n) con un entorno simulado. */
async function runNode(src, { input, sd = {}, nodes = {}, binary = null }) {
  const fn = new AsyncFunction('$input', '$getWorkflowStaticData', '$', 'Buffer', src);
  const ctx = { helpers: { getBinaryDataBuffer: async () => { if (binary == null) throw new Error('sin binario'); return Buffer.from(binary, 'utf8'); } } };
  return fn.call(ctx, { first: () => ({ json: input }), all: () => [{ json: input }] }, () => sd, (name) => ({ first: () => ({ json: nodes[name] }) }), Buffer);
}

test('nodos Code (JS real): BP-204 → Validate → Merge → Format con API2PDF simulado', async () => {
  const sd = {};
  const [v] = await runNode(validateCode(), { input: { body: BP204 }, sd });
  assert.equal(v.json._route, 'build');
  const [m] = await runNode(mergeCode(null), { input: {}, sd, nodes: { Validate: v.json }, binary: TEMPLATE });
  assert.equal(m.json._route, 'pdf');
  assert.ok(m.json.api2pdf_body.html.includes('Bomba BP-204'));
  assert.equal(m.json.api2pdf_body.inline, false);
  const [f] = await runNode(formatCode(false), { input: { Success: true, FileUrl: 'https://api2pdf.example/pdf.pdf' }, sd, nodes: { Merge: m.json } });
  assert.equal(f.json.status, 'completed');
  assert.equal(f.json.pdf_url, 'https://api2pdf.example/pdf.pdf');
  assert.equal(f.json.error, null);
  // reintento con el mismo request_id → mismo enlace, sin regenerar
  const [again] = await runNode(validateCode(), { input: { body: BP204 }, sd });
  assert.equal(again.json._route, 'respond');
  assert.equal(again.json.response.duplicate, true);
  assert.equal(again.json.response.pdf_url, 'https://api2pdf.example/pdf.pdf');
});

test('nodos Code (JS real): errores honestos (validación, plantilla ausente, fallo de API2PDF)', async () => {
  const [bad] = await runNode(validateCode(), { input: { body: { title: 'x' } }, sd: {} });
  assert.equal(bad.json._route, 'respond');
  assert.equal(bad.json.response.status, 'failed');
  assert.equal(bad.json.response.pdf_url, null);
  assert.equal(bad.json.response.error_code, 'VALIDATION_ERROR');
  const [ok] = await runNode(validateCode(), { input: { body: PARTE_TURNO }, sd: {} });
  const [noTpl] = await runNode(mergeCode(null), { input: {}, nodes: { Validate: ok.json }, binary: null });
  assert.equal(noTpl.json.response.error_code, 'TEMPLATE_UNAVAILABLE');
  const [badTpl] = await runNode(mergeCode(null), { input: {}, nodes: { Validate: ok.json }, binary: '<html>sin marcadores</html>'.padEnd(600, ' ') });
  assert.equal(badTpl.json.response.error_code, 'TEMPLATE_INVALID');
  const [m] = await runNode(mergeCode(null), { input: {}, nodes: { Validate: ok.json }, binary: TEMPLATE });
  const [f1] = await runNode(formatCode(false), { input: { Success: false, Error: 'API key inválida' }, sd: {}, nodes: { Merge: m.json } });
  assert.equal(f1.json.status, 'failed');
  assert.equal(f1.json.error_code, 'PDF_SERVICE_ERROR');
  assert.equal(f1.json.pdf_url, null);
  const [f2] = await runNode(formatCode(false), { input: { error: { message: 'timeout' } }, sd: {}, nodes: { Merge: m.json } });
  assert.equal(f2.json.status, 'failed');
});

test('workflow: estructura, webhook protegido, sin secretos y sin credenciales inventadas', () => {
  const wf = buildAsterPdfLink('real');
  const json = JSON.stringify(wf);
  const names = wf.nodes.map((n) => n.name);
  assert.deepEqual(names, ['Webhook ASTER PDF', 'Validate', 'Construir?', 'Drive Buscar plantilla', 'Drive Descargar plantilla', 'Merge', 'PDF?', 'API2PDF HTML a PDF', 'Format', 'Respond']);
  const hook = wf.nodes[0];
  assert.equal(hook.parameters.authentication, 'headerAuth');
  assert.equal(hook.parameters.path, 'atacama-aster-pdf-link');
  // Drive y API2PDF NO llevan credencial asignada (no se inventa ninguna conexión)
  for (const n of wf.nodes.filter((x) => /Drive|API2PDF/.test(x.name))) assert.equal(n.credentials, undefined, n.name);
  assert.ok(!/api2pdf[-_ ]?key|sk-[A-Za-z0-9]{10,}|AIza|ya29\./i.test(json), 'parece haber un secreto');
  assert.ok(json.includes('https://v2.api2pdf.com/chrome/pdf/html'));
  // todas las conexiones apuntan a nodos existentes
  for (const [from, c] of Object.entries(wf.connections)) { assert.ok(names.includes(from)); for (const br of c.main) for (const l of br) assert.ok(names.includes(l.node), l.node); }
  // variante de prueba: sin Drive ni API2PDF reales
  const t = buildAsterPdfLink('test', TEMPLATE);
  assert.ok(!t.nodes.some((n) => /googleDrive|httpRequest/.test(n.type)));
  assert.ok(t.name.startsWith('ZZ-TEST'));
});

test('extracción tolerante: cuerpo directo, envuelto, como texto JSON y con nombres en español', () => {
  const ok = (first) => { const { body } = core.asterHtmlExtract(first); const v = core.asterHtmlValidate(body); assert.ok(v.ok, JSON.stringify(v)); return v.p; };
  const base = ok({ headers: {}, body: BP204 });
  assert.equal(base.title, 'Informe técnico de terreno');
  assert.equal(ok({ body: { input: BP204 } }).title, base.title);                                  // envuelto
  assert.equal(ok({ body: { arguments: JSON.stringify(BP204) } }).title, base.title);               // JSON como texto dentro de un campo
  assert.equal(ok({ body: JSON.stringify(BP204) }).title, base.title);                              // cuerpo completo como texto
  assert.equal(ok({ body: { data: { payload: BP204 } } }).sections.length, 4);                      // doble envoltura
  const es = ok({ body: { titulo: 'Parte de turno', categoria: 'PARTE', metadatos: { Turno: 'Noche' }, secciones: [{ titulo: 'Resumen', texto: 'Todo normal' }, { encabezado: 'Pendientes', puntos: ['uno'] }] } });
  assert.equal(es.title, 'Parte de turno');
  assert.equal(es.sections[0].heading, 'Resumen');
  assert.equal(es.sections[1].items[0], 'uno');
  assert.equal(es.metadata[0].label, 'Turno');
  const sec = ok({ body: { title: 'T', sections: JSON.stringify([{ heading: 'H', text: 'x' }]) } });
  assert.equal(sec.sections[0].heading, 'H');
});

test('rechazo con diagnóstico: dice qué llegó (tipos y nombres de campos, sin valores)', async () => {
  const sd = {};
  const run = async (item) => { const [r] = await runNode(validateCode(), { input: item, sd }); return r.json.response; };
  // n8n entrega el item sin 'body' (p. ej. si Lety no manda JSON)
  const sinCuerpo = await run({ headers: { 'content-type': 'text/plain' }, params: {}, query: {}, webhookUrl: 'x', executionMode: 'production' });
  assert.equal(sinCuerpo.status, 'failed');
  assert.match(sinCuerpo.error_code, /VALIDATION_ERROR|EMPTY_BODY/);
  assert.match(sinCuerpo.message, /Recibí content-type text\/plain/);
  assert.ok(sinCuerpo.received.keys.includes('headers'));
  // texto suelto que no es JSON
  const texto = await run({ headers: { 'content-type': 'text/plain' }, body: 'solo un texto secreto 12345' });
  assert.equal(texto.status, 'failed');
  assert.equal(texto.received.body_type, 'string');
  assert.ok(!JSON.stringify(texto).includes('secreto 12345'), 'no debe devolver valores recibidos');
  // el caso reportado: llega 'sections' pero el título está bajo otro nombre desconocido
  const raro = await run({ headers: {}, body: { nombre_del_documento: 'X', sections: [{ heading: 'H', text: 't' }] } });
  assert.equal(raro.status, 'failed');
  assert.match(raro.message, /Falta title/);
  assert.match(raro.message, /campos: nombre_del_documento, sections/);
});

// Payload EXACTO que envió la herramienta de Lety (document_title / metadata_html / sections_html).
export const LETY = {
  request_id: '1762311096_nuevo_desde_cero_bp204_q4x8',
  document_title: 'Informe técnico de terreno - Bomba BP204',
  document_category: 'ACTIVIDAD',
  metadata_html: '<p><strong>Equipo:</strong> Bomba BP204</p><p><strong>Fecha del hecho:</strong> 5 de noviembre de 2026, durante la mañana</p><p><strong>Supervisor informado:</strong> Fernando Carvajal</p><p><strong>Ubicación:</strong> No informada</p><p><strong>Estado:</strong> Borrador de demostración — pendiente de validación</p>',
  sections_html: '<h2>Hechos informados</h2><p>Durante la mañana se realizó una revisión en terreno de la bomba de agua BP204. La bomba seguía funcionando durante la revisión y comenzó a escucharse un ruido extraño, distinto a lo habitual.</p><h2>Observaciones</h2><p>Se escuchó un ruido diferente a lo habitual mientras el equipo estaba funcionando. No se ha determinado el origen ni la causa del ruido.</p><h2>Acciones realizadas</h2><p>Se decidió no intervenir la bomba mientras no se conociera el origen del ruido. La situación fue informada al supervisor, Fernando Carvajal.</p><h2>Pendientes</h2><p>Queda pendiente una revisión por parte de mantenimiento. El pendiente permanece abierto; no se informa plazo de ejecución ni diagnóstico.</p><h2>Evidencia</h2><p>No se informaron fotografías, mediciones, registros instrumentales ni otros adjuntos. Este documento se basa en el relato recibido y requiere validación antes de utilizarse como registro operativo definitivo.</p>',
};

test('Lety (document_title + metadata_html + sections_html): se convierte a datos y genera el documento', async () => {
  const { body, diag } = core.asterHtmlExtract({ headers: { 'content-type': 'application/json' }, body: LETY });
  assert.equal(diag.from_html, true);
  const v = core.asterHtmlValidate(body);
  assert.ok(v.ok, JSON.stringify(v));
  assert.equal(v.p.title, 'Informe técnico de terreno - Bomba BP204');
  assert.equal(v.p.category, 'ACTIVIDAD');
  assert.equal(v.p.request_id, '1762311096_nuevo_desde_cero_bp204_q4x8');
  assert.equal(v.p.metadata.length, 5);
  assert.deepEqual(v.p.metadata[0], { label: 'Equipo', value: 'Bomba BP204' });
  assert.deepEqual(v.p.metadata[2], { label: 'Supervisor informado', value: 'Fernando Carvajal' });
  assert.deepEqual(v.p.sections.map((s) => s.heading), ['Hechos informados', 'Observaciones', 'Acciones realizadas', 'Pendientes', 'Evidencia']);
  const pend = v.p.sections[3];
  assert.ok(pend.pending && /Queda pendiente una revisión/.test(pend.pending.title), 'Pendientes → recuadro azul');
  for (const s of v.p.sections) assert.ok(!/[<>]/.test(JSON.stringify(s)), 'queda marcado HTML en ' + s.heading);
  // y el documento final usa NUESTRO marcado, no el HTML recibido
  const html = core.asterHtmlMerge(TEMPLATE, core.asterHtmlRender(v.p, issued));
  assert.ok(html.includes('<span class="numb">01</span><h2>Hechos informados</h2>'));
  assert.ok(!html.includes('<h2>Hechos informados</h2><p>Durante'), 'no debe insertarse el HTML recibido');
  // nodo Validate real
  const [r] = await runNode(validateCode(), { input: { headers: { 'content-type': 'application/json' }, body: LETY }, sd: {} });
  assert.equal(r.json._route, 'build');
  assert.equal(r.json.request_id, '1762311096_nuevo_desde_cero_bp204_q4x8');
});

test('HTML malicioso en sections_html/metadata_html: se reduce a texto, nada se ejecuta', () => {
  const evil = {
    document_title: 'T',
    metadata_html: '<p onclick="x()"><strong>Equipo:</strong> <script>alert(1)</script>BP&amp;204</p><iframe src="https://malo.test"></iframe>',
    sections_html: '<script>steal()</script><h2><img src=x onerror=alert(1)>Hola</h2><p onclick="y()">a &lt;b&gt; <a href="javascript:alert(3)">clic</a> {{SECTIONS_HTML}}</p><style>*{display:none}</style><ul><li>uno <b>dos</b></li></ul>',
  };
  const { body } = core.asterHtmlExtract({ body: evil });
  const v = core.asterHtmlValidate(body);
  assert.ok(v.ok, JSON.stringify(v));
  assert.equal(v.p.sections[0].heading, 'Hola');
  assert.equal(v.p.metadata[0].value, 'BP&204');
  const html = core.asterHtmlMerge(TEMPLATE, core.asterHtmlRender(v.p, issued));
  const cuerpo = html.slice(html.indexOf('<body>'));
  for (const mala of ['<script', '<iframe', 'onerror=', 'onclick=', 'javascript:', '<img src=x', '<style>*', 'malo.test']) assert.ok(!cuerpo.includes(mala), 'quedó: ' + mala);
  assert.ok(cuerpo.includes('&#123;&#123;SECTIONS_HTML&#125;&#125;'));
  assert.ok(cuerpo.includes('a &lt;b&gt; clic'));
  assert.ok(cuerpo.includes('• uno <strong>dos</strong>'));
});

test('sections_html sin títulos ni etiquetas de bloque → una sección «Detalle»', () => {
  const { body } = core.asterHtmlExtract({ body: { title: 'T', sections_html: 'Solo un texto <i>suelto</i>' } });
  assert.deepEqual(core.asterHtmlValidate(body).p.sections, [{ heading: 'Detalle', text: 'Solo un texto suelto', items: [], pending: null }]);
});
