import assert from 'node:assert/strict';
import * as mg from './media-gateway-core.mjs';
import { edVisualNeeds } from '../content/editorial-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const PID = '11111111-1111-4111-8111-111111111111';
const REQ = (o) => ({ piece_id: PID, need: 'carousel', brief: 'Carrusel que explique qué necesita un agente para trabajar de verdad', ...(o || {}) });

ok('las necesidades visuales del gateway son exactamente las del Editorial Brain (una sola decisión visual)', () => {
  assert.deepEqual(mg.mgNeeds(), edVisualNeeds());
});

ok('el gateway está DESACOPLADO del proveedor: el registro es datos (renderer, manual, higgsfield) y se enruta por capacidades, no por nombre', () => {
  const p = mg.mgProviders({});
  assert.deepEqual(Object.keys(p).sort(), ['higgsfield', 'manual', 'renderer']);
  for (const v of Object.values(p)) { assert.ok(v.needs.length && v.operations.length && typeof v.enabled === 'boolean' && v.note); }
  // Cambiar el proveedor generativo es cambiar un registro: el enrutador no menciona ninguna API concreta
  assert.ok(!/api\.|https?:\/\//.test(mg.mgRoute.toString()));
});

ok('el renderer actual sigue siendo el camino para carruseles, slides tipográficas, comparaciones y checklists (texto exacto, sin costo)', () => {
  for (const need of ['carousel', 'typographic', 'comparison', 'before_after', 'checklist', 'framework', 'process_flow']) {
    const r = mg.mgRoute(REQ({ need }), {});
    assert.equal(r.provider, 'renderer', need); assert.equal(r.status, 'queued'); assert.equal(r.operation, 'render'); assert.equal(r.cost_estimate_usd, 0); assert.equal(r.needs_authorization, false);
  }
});

ok('Higgsfield está preparado pero APAGADO: sin interruptor y presupuesto NO genera, el error es visible y se ofrecen alternativas reales', () => {
  for (const need of ['editorial_image', 'conceptual_image', 'short_video']) {
    const r = mg.mgRoute(REQ({ need }), {});
    assert.equal(r.status, 'unavailable', need); assert.equal(r.provider, 'higgsfield'); assert.match(r.reason, /APAGADO/); assert.equal(r.needs_authorization, true);
    assert.ok(r.alternatives.some((a) => a.provider === 'manual')); assert.ok(r.alternatives.some((a) => a.provider === 'renderer'));
  }
  // interruptor encendido pero sin presupuesto => sigue apagado
  assert.equal(mg.mgRoute(REQ({ need: 'editorial_image' }), { media_generative_enabled: true, media_generative_budget_usd: 0 }).status, 'unavailable');
});

ok('aun encendido, un asset con costo exige autorización explícita; con ella se encola (nunca se declara verificado)', () => {
  const cfg = { media_generative_enabled: true, media_generative_budget_usd: 5 };
  const sin = mg.mgRoute(REQ({ need: 'editorial_image' }), cfg);
  assert.equal(sin.status, 'unavailable'); assert.match(sin.reason, /autorización explícita/);
  const con = mg.mgRoute(REQ({ need: 'editorial_image', cost_authorized: true }), cfg);
  assert.equal(con.status, 'queued'); assert.equal(con.provider, 'higgsfield'); assert.equal(con.cost_estimate_usd, null);
  assert.equal(mg.mgProviders(cfg).higgsfield.verified, false);
});

ok('diagrama, arquitectura, gráfico y captura anotada no los produce ningún proveedor automático: asset manual o replantear con el renderer', () => {
  for (const need of ['diagram', 'architecture', 'chart', 'annotated_screenshot']) {
    const r = mg.mgRoute(REQ({ need }), {});
    assert.equal(r.status, 'unavailable', need); assert.equal(r.provider, null); assert.ok(r.alternatives.length >= 1, need);
  }
  const m = mg.mgRoute(REQ({ need: 'annotated_screenshot', operation: 'register' }), {});
  assert.equal(m.provider, 'manual'); assert.equal(m.status, 'queued'); assert.equal(m.cost_estimate_usd, 0);
});

ok('capacidades: generar, editar, variaciones, desde referencia, video corto y registrar se distinguen', () => {
  assert.equal(mg.mgOperation(REQ({ need: 'editorial_image' })), 'generate');
  assert.equal(mg.mgOperation(REQ({ need: 'editorial_image', reference_url: 'https://x.test/a.png' })), 'from_reference');
  assert.equal(mg.mgOperation(REQ({ need: 'editorial_image', source_asset_id: PID })), 'edit');
  assert.equal(mg.mgOperation(REQ({ need: 'editorial_image', source_asset_id: PID, variation: true })), 'variation');
  assert.equal(mg.mgOperation(REQ({ need: 'short_video' })), 'video');
  assert.equal(mg.mgOperation(REQ({ need: 'carousel' })), 'render');
  assert.equal(mg.mgOperation(REQ({ need: 'annotated_screenshot', operation: 'register' })), 'register');
});

ok('los prompts respetan las reglas de marca: paleta, estilo y lista de lo que se evita; un brief que las viola se rechaza', () => {
  const pr = mg.mgBuildPrompt(REQ({ need: 'conceptual_image', brief: 'Una imagen que muestre cómo un agente conecta un pedido con el inventario', composition: 'plano cenital, mucho aire' }));
  for (const frag of ['#0F5CED', '#041228', 'crema', 'robots', 'neón', 'circuitos', 'no es un hero de landing']) assert.ok(pr.includes(frag), frag);
  assert.ok(mg.mgCheckBrand(pr).ok, JSON.stringify(mg.mgCheckBrand(pr)));
  assert.equal(mg.mgCheckBrand('Un robot con circuitos de neón').ok, false);
  assert.equal(mg.mgCheckBrand('Fondo crema, sin robots ni neón, evitar circuitos').ok, true);
  assert.equal(mg.mgCheckBrand('Hero de la landing con texto a la izquierda').ok, false);
  const bad = mg.mgValidateRequest(REQ({ brief: 'Un robot futurista con hologramas y neón sobre fondo oscuro' }));
  assert.equal(bad.ok, false); assert.ok(bad.errors.some((e) => /viola_la_marca/.test(e)));
});

ok('validación de la solicitud: necesidad, brief y referencias', () => {
  assert.equal(mg.mgValidateRequest(REQ()).ok, true);
  assert.ok(mg.mgValidateRequest(REQ({ need: 'none' })).errors.some((e) => /need_none/.test(e)));
  assert.ok(mg.mgValidateRequest(REQ({ need: 'inventado' })).errors.some((e) => /need_invalido/.test(e)));
  assert.ok(mg.mgValidateRequest(REQ({ brief: 'corto' })).errors.some((e) => /brief_debe_tener/.test(e)));
  assert.ok(mg.mgValidateRequest(REQ({ piece_id: 'xx' })).errors.some((e) => /piece_id_invalido/.test(e)));
  assert.ok(mg.mgValidateRequest(REQ({ reference_url: 'http://insegura/x.png' })).errors.some((e) => /https/.test(e)));
});

ok('idempotencia y reutilización: la misma solicitud no crea dos assets; un render igual se reutiliza; uno fallido se reintenta', () => {
  const key = mg.mgRequestKey(REQ());
  assert.equal(key, mg.mgRequestKey(REQ({ brief: '  Carrusel que explique qué necesita un agente para trabajar de verdad  ' })));
  assert.notEqual(key, mg.mgRequestKey(REQ({ need: 'typographic' })));
  const ready = { id: 'a1', request_key: key, status: 'ready', need: 'carousel', urls: [{ url: 'https://cdn.test/1.png' }], content_hash: 'abc12345' };
  assert.equal(mg.mgPlan(REQ(), [ready], {}).action, 'existing');
  assert.equal(mg.mgPlan(REQ(), [{ ...ready, status: 'queued', urls: [] }], {}).action, 'existing');
  assert.equal(mg.mgPlan(REQ(), [{ ...ready, status: 'failed' }], {}).action, 'retry');
  const other = mg.mgPlan(REQ({ piece_id: '22222222-2222-4222-8222-222222222222', content_hash: 'abc12345' }), [ready], {});
  assert.equal(other.action, 'reuse'); assert.equal(other.asset.id, 'a1');
  assert.equal(mg.mgPlan(REQ({ piece_id: '22222222-2222-4222-8222-222222222222', content_hash: 'zzz' }), [ready], {}).action, 'create');
});

ok('cierre del asset: ready exige URLs https; failed exige un error visible y sanitizado', () => {
  assert.equal(mg.mgValidateResult({ status: 'ready', urls: [{ url: 'https://cdn.test/1.png', type: 'image/png', fileId: 'f1' }] }).ok, true);
  assert.ok(mg.mgValidateResult({ status: 'ready', urls: [] }).errors.includes('ready_exige_urls'));
  assert.ok(mg.mgValidateResult({ status: 'ready', urls: [{ url: 'http://x/1.png' }] }).errors.includes('urls_deben_ser_https'));
  assert.ok(mg.mgValidateResult({ status: 'failed', error: '' }).errors.includes('failed_exige_error_visible'));
  const f = mg.mgValidateResult({ status: 'failed', error: 'HTTP 401 token=abcdef123456789 rechazado' });
  assert.equal(f.ok, true); assert.ok(!/abcdef123456789/.test(f.value.error)); assert.ok(f.value.error.length > 5);
  assert.equal(mg.mgValidateResult({ status: 'publicado' }).ok, false);
});

ok('render hash determinista: mismas slides => mismo hash (reutilizable); otra slide => otro', () => {
  const p = { format: 'carrusel', channel: 'instagram', slides: [{ layout: 'cover', title: 'a' }, { layout: 'cta', title: 'b' }] };
  assert.equal(mg.mgRenderHash(p), mg.mgRenderHash(JSON.parse(JSON.stringify(p))));
  assert.notEqual(mg.mgRenderHash(p), mg.mgRenderHash({ ...p, slides: [{ layout: 'cover', title: 'c' }] }));
});

ok('el gateway no tiene ninguna ruta a publicar, programar o aprobar', () => {
  const src = Object.values(mg).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n');
  assert.ok(!/scheduled|published|approvalStatus|social-media-posting|status: 'in_review'/.test(src));
});

console.log(n + ' ok');
