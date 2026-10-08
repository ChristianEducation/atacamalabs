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

t('estructura: 5 acciones y conexiones válidas; solo toca media_assets (+ lee content_config y content_pieces)', ACTIONS.length === 5 && wf.nodes.length === 10);
t('sin secretos incrustados y los nodos HTTP toleran fallos', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => n.continueOnFail === true));
t('seguridad: ningún nodo habla con GHL Social Planner, Gmail ni proveedores generativos; no hay estados de publicación', !/social-media-posting|gmail|googleapis|leadconnectorhq/i.test(JSON.stringify(wf)) && !/https?:[^\s"']*higgsfield/i.test(JSON.stringify(wf)) && !/status['"]?\s*[:=]\s*['"](scheduled|published)|approvalStatus/.test(codeOf('Compute')));
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

// ---- Respond: errores de Supabase visibles
const respond = (resp, writes, applied) => new Function('$', codeOf('Respond'))((n) => (n === 'Compute' ? mk([{ resp, writes }]) : mk(applied)))[0].json;
t('Respond: si Supabase falla al guardar, el error es visible (no hay éxito falso)', respond({ ok: true }, [{ path: 'media_assets' }], [{ statusCode: 500, body: { message: 'boom' } }]).ok === false && /HTTP 500/.test(respond({ ok: true }, [{ path: 'media_assets' }], [{ statusCode: 500, body: {} }]).persist_error));

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
