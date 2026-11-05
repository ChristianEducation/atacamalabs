// node n8n/build/media-gateway.test.mjs — prueba los nodos Code de «30 Media Gateway» con stubs de n8n (sin red, sin proveedores, sin costos).
import { buildMediaGateway, ACTIONS } from './media-gateway.mjs';

const wf = buildMediaGateway();
const codeOf = (name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : String(x).slice(0, 400)); };
const mk = (arr) => ({ first: () => ({ json: arr[0] }), all: () => arr.map((j) => ({ json: j })) });
const runNode = (name, nodes) => new Function('$', codeOf(name))((n) => { if (!(n in nodes)) throw new Error('sin datos: ' + n); return mk([].concat(nodes[n])); });
const parse = (body) => runNode('Parse', { 'Media Webhook': { body } })[0].json;
const exec = (body, data = {}) => {
  const p = parse(body);
  if (p.fatal) return { fatal: p.fatal };
  const reads = runNode('Expand Reads', { Parse: p }).map((x) => x.json);
  const res = reads.map((r) => (r.key in data ? (data[r.key] && data[r.key].__status ? { statusCode: data[r.key].__status, body: {} } : { statusCode: 200, body: data[r.key] }) : { statusCode: 200, body: r.key === 'config' ? [{ media_generative_enabled: false, media_generative_budget_usd: 0 }] : [] }));
  const out = runNode('Compute', { Parse: p, Read: res })[0].json;
  return { ...out, reads, parsed: p };
};
const wr = (o, re) => (o.writes || []).filter((w) => re.test(w.path));

const PID = '11111111-1111-4111-8111-111111111111';
const PIECE = { id: PID, status: 'drafted', format: 'carrusel', channel: 'instagram', is_test: false, piece: { format: 'carrusel', channel: 'instagram', slides: [{ layout: 'cover', title: 'Conversar no es trabajar' }, { layout: 'content', title: 'Herramientas' }, { layout: 'cta', title: 'Escríbenos' }] } };
const BRIEF = 'Carrusel que explique qué necesita un agente para trabajar de verdad';

t('estructura: 12 acciones y 23 nodos (v3: subida desde Storage y producción del Taller); toca media_assets y, en el Taller, solo content_pieces/versions/feedback', ACTIONS.length === 12 && wf.nodes.length === 23);
t('sin secretos incrustados y los nodos HTTP toleran fallos', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => n.continueOnFail === true));
const httpUrls = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').map((n) => n.parameters.url);
t('seguridad: la ÚNICA llamada a GHL es subir una imagen a la biblioteca de medios (nada de Social Planner, Gmail ni proveedores generativos); no hay estados de publicación', !/social-media-posting|gmail|googleapis/i.test(JSON.stringify(wf)) && (JSON.stringify(wf).match(/leadconnectorhq\.com\/[a-z\/-]+/g) || []).every((u) => u === 'leadconnectorhq.com/medias/upload-file') && httpUrls.filter((u) => /leadconnectorhq/.test(u)).length === 2 && httpUrls.filter((u) => /leadconnectorhq/.test(u)).every((u) => /medias\/upload-file$/.test(u)) && !/https?:[^\s"']*higgsfield/i.test(JSON.stringify(wf)) && !/status['"]?\s*[:=]\s*['"](scheduled|published)|approvalStatus/.test(codeOf('Compute')));
{
  const PCE = '11111111-1111-4111-8111-111111111111';
  t('v3 · storage_upload: valida rutas del bucket taller (1–10, formato <pieza>/v<n>/<archivo>, de esa pieza)', /ruta inválida/.test(exec({ action: 'storage_upload', paths: ['../x.png'] }).fatal) && /1 a 10/.test(exec({ action: 'storage_upload', paths: [] }).fatal) && /no son de esa pieza/.test(exec({ action: 'storage_upload', piece_id: '22222222-2222-4222-8222-222222222222', paths: [PCE + '/v1/01.png'] }).fatal));
  const sp = parse({ action: 'storage_upload', piece_id: PCE, paths: [PCE + '/v1/01.png', PCE + '/v1/r.mp4'] });
  const items = runNode('Storage Items', { Parse: sp }).map((x) => x.json);
  t('v3 · storage_upload: una descarga por archivo desde el bucket privado (URL de storage, no pública)', items.length === 2 && items[0].url === 'https://uwquwjmiofixzugttals.supabase.co/storage/v1/object/taller/' + PCE + '/v1/01.png');
  const resp = runNode('Respond Storage', { 'Storage Items': items, 'GHL Upload Storage': [{ statusCode: 201, body: { url: 'https://a/1.png', fileId: 'f1' } }, { statusCode: 413, body: {} }] })[0].json;
  t('v3 · storage_upload: devuelve las URLs en orden y avisa qué archivo falló (sin éxito falso); nunca publica', resp.ok === false && resp.files[0].url === 'https://a/1.png' && resp.files[1].type === 'video/mp4' && /HTTP 413/.test(resp.message) && resp.safety.published === 0);
}
{
  const PC = '33333333-3333-4333-8333-333333333333';
  const row = (o) => ({ id: PC, lane: 'vps', taller_status: 'en_cola', format: 'carrusel', topic: 'Carrusel X', is_test: false, current_version: 0, needs_by: '2026-10-23', idea: { id: 'i', keyword: 'PROCESO' }, feedback: [{ id: 'f', status: 'open', text: 'más cerca' }, { id: 'g', status: 'done' }], versions: [], ...(o || {}) });
  let o = exec({ action: 'taller_claim' }, { tpieces: [row()], tcfg: [{ taller_production_enabled: false }], sys: [{}] });
  t('v3 · taller_claim: con la producción APAGADA no toma nada', o.resp.claimed === false && /apagada/.test(o.resp.message) && (o.writes || []).length === 0);
  o = exec({ action: 'taller_claim' }, { tpieces: [row()], tcfg: [{ taller_production_enabled: true }], sys: [{ global_pause: true }] });
  t('v3 · taller_claim: con pausa general no toma nada', o.resp.claimed === false && /Pausa general/.test(o.resp.message));
  o = exec({ action: 'taller_claim' }, { tpieces: [row()], tcfg: [{ taller_production_enabled: true }], sys: [{}] });
  t('v3 · taller_claim: toma la pieza con candado (en_cola → en_produccion) y entrega el brief (idea, feedback abierto, topes, versión siguiente)', o.resp.claimed === true && o.writes[0].body.taller_status === 'en_produccion' && /taller_status=eq\.en_cola/.test(o.writes[0].path) && o.writes[0].check_rows === true && o.resp.feedback.length === 1 && o.resp.next_version === 1 && o.resp.caps.attempts_per_slide === 3 && o.resp.idea.keyword === 'PROCESO');
  o = exec({ action: 'taller_claim', test: true, piece_id: PC }, { tpieces: [row({ is_test: true, taller_status: 'en_produccion' })], tcfg: [{}], sys: [{}] });
  t('v3 · taller_claim TEST de una pieza ya en producción: la retoma sin volver a escribir', o.resp.claimed === true && o.resp.resumed === true && (o.writes || []).length === 0);
  o = exec({ action: 'taller_version', piece_id: PC, assets: [{ path: PC + '/v1/01.png', w: 1080, h: 1350 }, { path: PC + '/v1/02.png', w: 1080, h: 1350 }], caption: 'Texto PROCESO', cost_credits: 0, qa: { problems: [] } }, { tpiece: [row({ taller_status: 'en_produccion' })] });
  t('v3 · taller_version: registra v1 y deja la pieza «para revisar»', o.resp.ok === true && o.resp.version_no === 1 && o.writes.some((w) => w.path === 'content_versions') && o.writes.some((w) => w.body && w.body.taller_status === 'para_revisar'));
  o = exec({ action: 'taller_help', piece_id: PC, reason: 'Se agotaron los 3 intentos de la lámina 1' }, { tpiece: [row({ taller_status: 'en_produccion' })] });
  t('v3 · taller_help: detiene la pieza en «necesita ayuda» con el motivo (sin más gasto)', o.resp.status === 'necesita_ayuda' && o.writes[0].body.taller_status === 'necesita_ayuda' && /3 intentos/.test(o.writes[0].body.piece.help.reason));
  const fp = parse({ action: 'taller_file', piece_id: PC, version_no: 2, name: '01.png', mime: 'image/png', b64: 'iVBORw0KGgo' + 'A'.repeat(200) });
  t('v3 · taller_file: valida y arma la ruta del bucket privado <pieza>/v<n>/<archivo>', fp.file && fp.file.path === PC + '/v2/01.png' && /name inválido/.test(exec({ action: 'taller_file', piece_id: PC, version_no: 1, name: '../x.png', b64: 'A'.repeat(200) }).fatal));
}
t('Parse: action inválida / piece_id inválido / status sin id => fatal', /action inválida/.test(exec({ action: 'borrar' }).fatal) && /piece_id inválido/.test(exec({ action: 'request', need: 'carousel', brief: BRIEF, piece_id: 'x;drop' }).fatal) && /status necesita id o piece_id/.test(exec({ action: 'status' }).fatal));

// ---- request: renderer
let o = exec({ action: 'request', piece_id: PID, need: 'carousel', brief: BRIEF }, { piece: [PIECE] });
const post = wr(o, /^media_assets$/)[0];
t('request carrusel: enruta al renderer, en cola, sin costo; registra el asset con hash de render y la pieza asociada', o.resp.ok && o.resp.created && o.resp.asset.provider === 'renderer' && o.resp.asset.status === 'queued' && post.body.piece_id === PID && post.body.cost_estimate_usd === 0 && post.body.content_hash && post.body.operation === 'render' && /scripts\/media\/media-gateway/.test(o.resp.message), JSON.stringify(o.resp));
t('request: nada se publica ni se programa (safety en cada respuesta) y no toca content_pieces', o.resp.safety.published === 0 && o.resp.safety.approved === 0 && o.resp.safety.generated_with_cost === 0 && !(o.writes || []).some((w) => /content_pieces/.test(w.path)));
const key = o.parsed.key;
const asset = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', request_key: key, status: 'queued', need: 'carousel', provider: 'renderer', urls: [], attempts: 0, content_hash: post.body.content_hash };
o = exec({ action: 'request', piece_id: PID, need: 'carousel', brief: BRIEF }, { piece: [PIECE], same: [asset] });
t('request idempotente: la misma solicitud devuelve el asset existente y NO escribe nada', o.resp.deduped === true && (o.writes || []).length === 0 && o.resp.asset.id === asset.id, JSON.stringify(o.resp));
o = exec({ action: 'request', piece_id: PID, need: 'carousel', brief: BRIEF }, { piece: [PIECE], same: [{ ...asset, status: 'failed', error: 'x' }] });
t('request tras un fallo: reintenta el MISMO registro (attempts+1) en vez de duplicar', o.resp.retried === true && wr(o, /^media_assets\?id=eq\./).length === 1 && wr(o, /^media_assets\?id=eq\./)[0].body.attempts === 1 && !wr(o, /^media_assets$/).length, JSON.stringify(o.resp));
const OTHER = '22222222-2222-4222-8222-222222222222';
o = exec({ action: 'request', piece_id: OTHER, need: 'carousel', brief: BRIEF }, { piece: [{ ...PIECE, id: OTHER }], ready: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', request_key: 'otra', status: 'ready', need: 'carousel', provider: 'renderer', urls: [{ url: 'https://cdn.test/1.png', type: 'image/png' }], content_hash: post.body.content_hash }] });
const reuse = wr(o, /^media_assets$/)[0];
t('reutiliza un asset ya renderizado con el mismo contenido: nuevo registro READY con las mismas URLs y sin volver a renderizar', o.resp.reused === true && reuse.body.status === 'ready' && reuse.body.urls.length === 1 && reuse.body.meta.reused_from === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' && /Reutilizado/.test(reuse.body.meta.reason), JSON.stringify(o.resp));
o = exec({ action: 'request', piece_id: PID, need: 'carousel', brief: BRIEF }, { piece: [{ ...PIECE, piece: { ...PIECE.piece, slides: [] } }] });
t('request: el renderer sin slides => error claro (no encola nada)', o.resp.error === 'pieza_sin_slides' && (o.writes || []).length === 0);

// ---- request: generativo APAGADO, manual y errores
o = exec({ action: 'request', piece_id: PID, need: 'editorial_image', brief: 'Imagen editorial que muestre un pedido conectándose con el inventario' }, { piece: [PIECE] });
const un = wr(o, /^media_assets$/)[0];
t('request imagen generativa con Higgsfield APAGADO: queda «unavailable» con el motivo visible y alternativas; NO se genera ni se cobra', o.resp.ok && o.resp.asset.status === 'unavailable' && un.body.provider === 'higgsfield' && /APAGADO/.test(un.body.error) && un.body.cost_estimate_usd === 0 && un.body.cost_authorized === false && o.resp.asset.alternatives.length >= 1 && /NO disponible/.test(o.resp.message) && o.resp.safety.generated_with_cost === 0, JSON.stringify(o.resp));
o = exec({ action: 'request', piece_id: PID, need: 'editorial_image', brief: 'Imagen editorial que muestre un pedido conectándose con el inventario', cost_authorized: true }, { piece: [PIECE] });
t('autorizar el costo NO basta si el proveedor está apagado (interruptor + presupuesto en content_config)', o.resp.asset.status === 'unavailable' && wr(o, /^media_assets$/)[0].body.cost_authorized === false);
o = exec({ action: 'request', piece_id: PID, need: 'editorial_image', brief: 'Imagen editorial que muestre un pedido conectándose con el inventario', cost_authorized: true }, { piece: [PIECE], config: [{ media_generative_enabled: true, media_generative_budget_usd: 5 }] });
const gq = wr(o, /^media_assets$/)[0];
t('solo con interruptor, presupuesto Y autorización explícita se encola al proveedor generativo, con el prompt de marca verificado', gq.body.status === 'queued' && gq.body.provider === 'higgsfield' && gq.body.cost_authorized === true && /#0F5CED/.test(gq.body.prompt) && /robots/.test(gq.body.prompt) && gq.body.brand_check.ok === true, JSON.stringify(gq.body).slice(0, 300));
o = exec({ action: 'request', piece_id: PID, need: 'annotated_screenshot', operation: 'register', brief: 'Captura anotada del panel de aprobaciones de /ops' }, { piece: [PIECE] });
t('asset manual (captura anotada): proveedor manual, en cola, sin costo', wr(o, /^media_assets$/)[0].body.provider === 'manual' && o.resp.asset.status === 'queued' && /Esperando el asset de Christian/.test(o.resp.message));
o = exec({ action: 'request', piece_id: PID, need: 'diagram', brief: 'Diagrama de la arquitectura mínima de un agente' }, { piece: [PIECE] });
t('diagrama: ningún proveedor automático => unavailable con alternativas (manual o replantear con el renderer)', o.resp.asset.status === 'unavailable' && o.resp.asset.alternatives.some((a) => a.provider === 'manual') && o.resp.asset.alternatives.some((a) => a.provider === 'renderer'));
o = exec({ action: 'request', piece_id: PID, need: 'conceptual_image', brief: 'Un robot futurista con hologramas y neón sobre fondo oscuro' }, { piece: [PIECE] });
t('un brief que viola la marca se rechaza (robots, hologramas, neón)', o.resp.error === 'solicitud_invalida' && /viola_la_marca/.test(JSON.stringify(o.resp.errors)) && (o.writes || []).length === 0);
t('pieza inexistente / need none / brief corto => errores claros y 0 escrituras', exec({ action: 'request', piece_id: PID, need: 'carousel', brief: BRIEF }, { piece: [] }).resp.error === 'pieza_no_encontrada' && exec({ action: 'request', need: 'none', brief: BRIEF }).resp.error === 'solicitud_invalida' && exec({ action: 'request', need: 'carousel', brief: 'corto' }).resp.error === 'solicitud_invalida');
o = exec({ action: 'request', piece_id: PID, need: 'editorial_image', brief: 'Variación de la imagen editorial anterior con otra composición', source_asset_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', variation: true }, { piece: [PIECE], source: [] });
t('editar/variar exige que el asset de origen exista', o.resp.error === 'asset_origen_no_encontrado');

// ---- status / list / complete / cancel
o = exec({ action: 'status', piece_id: PID }, { assets: [asset] });
t('status por pieza: devuelve el estado, el proveedor y el error visible', o.resp.ok && o.resp.assets[0].status === 'queued');
t('status sin resultados => no_encontrado', exec({ action: 'status', id: asset.id }, { assets: [] }).resp.error === 'no_encontrado');
o = exec({ action: 'list', status: 'queued,failed' }, { assets: [asset] });
t('list: filtra por estado, no incluye TEST por defecto y muestra los proveedores (higgsfield enabled:false, verified:false)', /status=in\.\(queued,failed\)/.test(o.reads.find((r) => r.key === 'assets').url) && /is_test=eq\.false/.test(o.reads.find((r) => r.key === 'assets').url) && o.resp.providers.higgsfield.enabled === false && o.resp.providers.higgsfield.verified === false && o.resp.providers.renderer.enabled === true);
o = exec({ action: 'complete', id: asset.id, status: 'ready', urls: [{ url: 'https://cdn.test/1.png', type: 'image/png', fileId: 'f1' }], content_hash: 'abc123' }, { asset: [asset] });
const done = wr(o, /^media_assets\?id=eq\./)[0];
t('complete ready: guarda las URLs https y queda asociado a su pieza; la escritura exige que siga en cola (no pisa un cierre previo)', o.resp.ok && done.body.status === 'ready' && done.body.urls[0].url === 'https://cdn.test/1.png' && /status=in\.\(queued,generating,requested\)/.test(done.path) && o.resp.asset.status === 'ready' && o.resp.asset.urls.length === 1, JSON.stringify(o.resp));
o = exec({ action: 'complete', id: asset.id, status: 'ready', urls: [{ url: 'http://inseguro/1.png' }] }, { asset: [asset] });
t('complete con URL no https => rechazado (0 escrituras)', o.resp.error === 'resultado_invalido' && (o.writes || []).length === 0);
o = exec({ action: 'complete', id: asset.id, status: 'failed', error: 'HTTP 401 token=abcdef1234567890 rechazado por el proveedor' }, { asset: [asset] });
t('complete failed: el error queda VISIBLE y sin secretos; suma un intento', o.resp.ok && wr(o, /^media_assets\?id=eq\./)[0].body.status === 'failed' && !/abcdef1234567890/.test(wr(o, /^media_assets\?id=eq\./)[0].body.error) && wr(o, /^media_assets\?id=eq\./)[0].body.attempts === 1);
t('complete sobre un asset ya listo => estado_no_valido', exec({ action: 'complete', id: asset.id, status: 'ready', urls: [{ url: 'https://x.test/1.png' }] }, { asset: [{ ...asset, status: 'ready' }] }).resp.error === 'estado_no_valido');
o = exec({ action: 'cancel', id: asset.id }, { asset: [asset] });
t('cancel: marca cancelado un asset en cola; uno listo no se cancela', wr(o, /^media_assets\?id=eq\./)[0].body.status === 'cancelled' && exec({ action: 'cancel', id: asset.id }, { asset: [{ ...asset, status: 'ready' }] }).resp.error === 'ya_listo');

// ---- claim (worker de la VPS)
const QROW = { ...asset, content_pieces: { id: PID, status: 'drafted', origin: 'explicit', interview_id: null, is_test: false, piece: PIECE.piece } };
o = exec({ action: 'claim' }, { queue: [QROW], stale: [] });
const cl = wr(o, /^media_assets\?id=eq\./)[0] || {};
t('claim: entrega el asset en cola con la fila de su pieza y lo marca «generating» con candado (la escritura exige que siga en cola o generating)', o.resp.ok && o.resp.claimed === true && o.resp.asset.status === 'generating' && o.resp.row.piece.slides.length === 3 && cl.body.status === 'generating' && /status=in\.\(queued,generating\)/.test(cl.path) && cl.body.attempts === 0, JSON.stringify(o.resp).slice(0, 300));
t('claim: lee el más antiguo del renderer (no TEST por defecto) y los huérfanos de más de 20 min', /status=eq\.queued&provider=in\.\(renderer,studio\)&is_test=eq\.false/.test(o.reads.find((r) => r.key === 'queue').url) && /order=created_at\.asc&limit=1/.test(o.reads.find((r) => r.key === 'queue').url) && /status=eq\.generating[^"]*updated_at=lt\./.test(o.reads.find((r) => r.key === 'stale').url));
o = exec({ action: 'claim' }, { queue: [QROW], stale: [], sys: [{ global_pause: true, reason: 'viaje' }] });
t('v3 · pausa general: el worker NO reclama nada aunque haya cola (0 escrituras)', o.resp.ok && o.resp.claimed === false && o.resp.paused === true && (o.writes || []).length === 0 && /Pausa general/.test(o.resp.message));
t('v3 · claim lee system_state', /system_state\?id=eq\.1/.test((o.reads.find((r) => r.key === 'sys') || {}).url || ''));
o = exec({ action: 'claim' }, { queue: [], stale: [] });
t('claim sin nada en cola => claimed:false y 0 escrituras', o.resp.ok && o.resp.claimed === false && (o.writes || []).length === 0);
o = exec({ action: 'claim' }, { queue: [], stale: [{ ...QROW, status: 'generating', attempts: 1 }] });
t('claim de un huérfano: se reclama de nuevo sumando un intento', o.resp.claimed === true && (wr(o, /^media_assets\?id=eq\./)[0] || { body: {} }).body.attempts === 2);
o = exec({ action: 'claim' }, { queue: [], stale: [{ ...QROW, status: 'generating', attempts: 2 }] });
const gu = wr(o, /^media_assets\?id=eq\./)[0] || { body: {}, path: '' };
t('claim de un huérfano con 3 intentos: se cierra FAILED con el motivo visible y no se entrega', o.resp.claimed === false && o.resp.gave_up === asset.id && gu.body.status === 'failed' && /3 intentos/.test(gu.body.error) && /status=eq\.generating/.test(gu.path));
o = exec({ action: 'claim', test: true }, { queue: [], stale: [] });
t('claim con test:true lee solo assets de PRUEBA', /is_test=eq\.true/.test(o.reads.find((r) => r.key === 'queue').url));

// ---- upload (worker de la VPS → biblioteca de medios de GHL)
const PNG = 'iVBORw0KGgo' + 'A'.repeat(300);
const GEN = { ...asset, status: 'generating' };
o = exec({ action: 'upload', id: asset.id, png_base64: PNG, index: 1, label: 'Carrusel Prueba' }, { asset: [GEN] });
t('upload: valida el PNG de un asset reclamado, arma un nombre seguro y NO escribe en Supabase', o.resp.ok && o.resp.upload.filename === 'atacama-carruselprueba-02.png' && o.resp.upload.b64 === PNG && (o.writes || []).length === 0, JSON.stringify(o.resp).slice(0, 200));
t('upload rechaza un asset que no está generating', exec({ action: 'upload', id: asset.id, png_base64: PNG }, { asset: [asset] }).resp.error === 'estado_no_valido');
t('upload rechaza una imagen que no es PNG, que trae caracteres raros, vacía o enorme', exec({ action: 'upload', id: asset.id, png_base64: 'AAAA' + 'B'.repeat(200) }, { asset: [GEN] }).resp.error === 'imagen_invalida' && exec({ action: 'upload', id: asset.id, png_base64: 'iVBORw0KGgo<script>' + 'A'.repeat(200) }, { asset: [GEN] }).resp.error === 'imagen_invalida' && exec({ action: 'upload', id: asset.id }, { asset: [GEN] }).resp.error === 'imagen_invalida' && exec({ action: 'upload', id: asset.id, png_base64: 'iVBORw0KGgo' + 'A'.repeat(9000100) }, { asset: [GEN] }).resp.error === 'imagen_invalida');
t('upload: asset inexistente o id inválido => error claro', exec({ action: 'upload', id: asset.id, png_base64: PNG }, { asset: [] }).resp.error === 'asset_no_encontrado' && /uuid del asset/.test(exec({ action: 'upload', png_base64: PNG }).fatal));
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const prep = await new AsyncFn('$', codeOf('Prep Upload')).call({ helpers: { prepareBinaryData: async (buf, name, mime) => ({ bytes: buf.length, name, mime }) } }, (n) => mk([{ resp: { upload: { filename: 'x.png', b64: PNG } } }]));
t('Prep Upload: convierte el base64 en binario PNG con el nombre dado y descarta el base64 del JSON', prep[0].binary.data.name === 'x.png' && prep[0].binary.data.mime === 'image/png' && prep[0].binary.data.bytes > 200 && !JSON.stringify(prep[0].json).includes('iVBOR'));
const respUp = (g) => new Function('$', codeOf('Respond Upload'))((n) => (n === 'Compute' ? mk([{ resp: { asset_id: asset.id } }]) : mk([g])))[0].json;
t('Respond Upload: devuelve url y fileId; si GHL falla el error es visible (sin éxito falso)', respUp({ statusCode: 201, body: { url: 'https://storage.googleapis.com/x/1.png', fileId: 'f9' } }).url === 'https://storage.googleapis.com/x/1.png' && respUp({ statusCode: 401, body: { message: 'Unauthorized' } }).ok === false && /HTTP 401/.test(respUp({ statusCode: 401, body: {} }).message) && respUp({ statusCode: 200, body: {} }).error === 'subida_ghl_fallida' && respUp({}).ok === false);
t('conexiones: Compute → Upload? → (Prep Upload → GHL Upload → Respond Upload | Expand Writes)', wf.connections.Compute.main[0][0].node === 'Upload?' && wf.connections['Upload?'].main[0][0].node === 'Prep Upload' && wf.connections['Upload?'].main[1][0].node === 'Expand Writes' && wf.connections['GHL Upload'].main[0][0].node === 'Respond Upload' && wf.nodes.find((n) => n.name === 'GHL Upload').parameters.bodyParameters.parameters[0].parameterType === 'formBinaryData');


// ---- Frente C: historias, studio (video) y subida de MP4
const HPIECE = { id: PID, status: 'drafted', format: 'historia', channel: 'instagram', is_test: false, piece: { format: 'historia', channel: 'instagram', story: { template: 'dolor', title: '¿Quién contesta?', body: 'x' } } };
o = exec({ action: 'request', piece_id: PID, need: 'typographic', brief: 'Historia de dolor: la consulta que nadie contestó a tiempo' }, { piece: [HPIECE] });
t('historia: need typographic con piece.story va al renderer, en cola y con hash que depende de la historia', o.resp.ok && o.resp.asset.provider === 'renderer' && o.resp.asset.status === 'queued' && wr(o, /^media_assets$/)[0].body.content_hash, JSON.stringify(o.resp).slice(0, 250));
o = exec({ action: 'request', piece_id: PID, need: 'typographic', brief: 'Historia de dolor: la consulta que nadie contestó a tiempo' }, { piece: [{ ...HPIECE, piece: { format: 'historia', channel: 'instagram' } }] });
t('historia sin story => error claro y 0 escrituras', o.resp.error === 'pieza_sin_slides' && /piece\.story/.test(o.resp.message) && (o.writes || []).length === 0);
o = exec({ action: 'request', piece_id: PID, need: 'short_video', provider: 'studio', composition: '2026-10-19-quien-contesta', brief: 'Reel de provocación en paneles partidos: ¿quién contesta cuando tú no puedes?' }, { piece: [{ ...PIECE, piece: { format: 'reel', channel: 'instagram' } }] });
const st = wr(o, /^media_assets$/)[0];
t('studio: short_video con proyecto del taller queda en cola SIN costo y guarda el proyecto en meta.composition', o.resp.ok && st.body.provider === 'studio' && st.body.status === 'queued' && st.body.cost_estimate_usd === 0 && st.body.meta.composition === '2026-10-19-quien-contesta' && /taller de motion/.test(o.resp.message), JSON.stringify(o.resp).slice(0, 250));
o = exec({ action: 'claim' }, { queue: [{ ...QROW, provider: 'studio', need: 'short_video', meta: { composition: 'mi-reel-01' } }], stale: [] });
t('claim entrega también los assets del taller (studio) con su composición', o.resp.claimed === true && o.resp.asset.provider === 'studio' && o.resp.asset.composition === 'mi-reel-01');
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 28]), Buffer.from('ftypisom'), Buffer.alloc(400)]).toString('base64');
o = exec({ action: 'upload', id: asset.id, png_base64: MP4, mime: 'video/mp4', label: 'reel' }, { asset: [GEN] });
t('upload de MP4: valida la firma, nombre .mp4 y mime video/mp4 hacia GHL', o.resp.ok && o.resp.upload.filename === 'atacama-reel-01.mp4' && o.resp.upload.mime === 'video/mp4');
const prep2 = await new AsyncFn('$', codeOf('Prep Upload')).call({ helpers: { prepareBinaryData: async (buf, name, mime) => ({ name, mime }) } }, () => mk([{ resp: { upload: { filename: 'r.mp4', mime: 'video/mp4', b64: MP4 } } }]));
t('Prep Upload conserva el mime del video', prep2[0].binary.data.mime === 'video/mp4' && prep2[0].json.mime === 'video/mp4');
const respUp2 = new Function('$', codeOf('Respond Upload'))((n) => (n === 'Compute' ? mk([{ resp: { asset_id: asset.id } }]) : n === 'Prep Upload' ? mk([{ mime: 'video/mp4' }]) : mk([{ statusCode: 201, body: { url: 'https://cdn.test/r.mp4', fileId: 'f1' } }])))[0].json;
t('Respond Upload devuelve el tipo real (video/mp4)', respUp2.type === 'video/mp4' && respUp2.url === 'https://cdn.test/r.mp4');

// ---- Respond: errores de Supabase visibles
const respond = (resp, writes, applied) => new Function('$', codeOf('Respond'))((n) => (n === 'Compute' ? mk([{ resp, writes }]) : mk(applied)))[0].json;
t('Respond: si Supabase falla al guardar, el error es visible (no hay éxito falso)', respond({ ok: true }, [{ path: 'media_assets' }], [{ statusCode: 500, body: { message: 'boom' } }]).ok === false && /HTTP 500/.test(respond({ ok: true }, [{ path: 'media_assets' }], [{ statusCode: 500, body: {} }]).persist_error));

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
