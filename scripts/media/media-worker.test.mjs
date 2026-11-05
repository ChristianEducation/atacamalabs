import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as worker from './media-gateway.mjs';
import * as higgs from './providers/higgsfield.mjs';
import { mgRenderHash } from './media-gateway-core.mjs';

let n = 0;
const ok = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const PIECE = { format: 'carrusel', channel: 'instagram', slides: [{ layout: 'cover', title: 'a' }, { layout: 'cta', title: 'b' }] };
const ROW = { id: 'p1', status: 'drafted', origin: 'explicit', interview_id: null, is_test: true, piece: PIECE };
const mkDeps = (o) => {
  const calls = [];
  const gateway = async (b) => { calls.push(b); return { ok: true, http: 200 }; };
  return { calls, deps: { gateway, readPiece: async () => ROW, env: {}, providers: { renderer: { produce: async () => ({ urls: [{ url: 'https://cdn.test/1.png', type: 'image/png', fileId: 'f1' }, { url: 'https://cdn.test/2.png', type: 'image/png', fileId: 'f2' }] }) }, higgsfield: higgs, manual: {} }, submit: (row, media) => { calls.push({ submit: row.id, media: media.length }); return 'ok'; }, ...(o || {}) } };
};

await ok('renderer: produce el asset, lo cierra READY con las URLs y el hash de render, y reenvía la pieza al Content Intake (nunca publica)', async () => {
  const { calls, deps } = mkDeps();
  const r = await worker.runAsset({ id: 'a1', provider: 'renderer', piece_id: 'p1' }, deps);
  assert.equal(r.status, 'ready'); assert.equal(r.urls, 2); assert.equal(r.submitted, 'reenviada al Content Intake');
  const done = calls.find((c) => c.action === 'complete');
  assert.equal(done.status, 'ready'); assert.equal(done.urls.length, 2); assert.equal(done.content_hash, mgRenderHash(PIECE));
  assert.deepEqual(calls.find((c) => c.submit), { submit: 'p1', media: 2 });
  assert.ok(!JSON.stringify(calls).match(/scheduled|published|approved/));
});

await ok('renderer con --no-submit: deja el asset listo sin reenviar la pieza', async () => {
  const { calls, deps } = mkDeps({ submit: null });
  const r = await worker.runAsset({ id: 'a1', provider: 'renderer', piece_id: 'p1' }, deps);
  assert.equal(r.status, 'ready'); assert.equal(r.submitted, 'no reenviada'); assert.ok(!calls.some((c) => c.submit));
});

await ok('error visible: si el render falla, el asset se cierra FAILED con el motivo (nada se traga) y la pieza no se reenvía', async () => {
  const { calls, deps } = mkDeps();
  deps.providers.renderer.produce = async () => { throw new Error('Subida a GHL falló: HTTP 401'); };
  const r = await worker.runAsset({ id: 'a2', provider: 'renderer', piece_id: 'p1' }, deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /HTTP 401/);
  const done = calls.find((c) => c.action === 'complete'); assert.equal(done.status, 'failed'); assert.match(done.error, /HTTP 401/);
  assert.ok(!calls.some((c) => c.submit));
});

await ok('pieza sin slides => failed con motivo claro', async () => {
  const { deps } = mkDeps({ readPiece: async () => ({ ...ROW, piece: { format: 'carrusel', slides: [] } }) });
  const r = await worker.runAsset({ id: 'a3', provider: 'renderer', piece_id: 'p1' }, deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /no tiene slides/);
});

await ok('Higgsfield: aunque un asset llegara en cola, el adaptador APAGADO falla con error visible y NO genera ni cobra nada', async () => {
  const { calls, deps } = mkDeps();
  const r = await worker.runAsset({ id: 'a4', provider: 'higgsfield', operation: 'generate', prompt: 'x' }, deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /apagado/i);
  assert.equal(calls.find((c) => c.action === 'complete').status, 'failed');
});

await ok('Higgsfield habilitado pero sin implementar ni verificar: tampoco genera (no se declara operativo algo no probado)', async () => {
  for (const fn of ['generate', 'edit', 'variation', 'fromReference', 'video', 'status']) {
    await assert.rejects(() => higgs[fn]({ MEDIA_HIGGSFIELD_ENABLED: '1', HIGGSFIELD_API_KEY: 'x' }), (e) => e.code === 'provider_off' && /NO está implementado ni verificado/.test(e.message), fn);
  }
  assert.equal(higgs.capabilities.cost_usd, null);
});

await ok('proveedor manual: el worker no inventa el asset; indica el comando register', async () => {
  const { deps } = mkDeps();
  const r = await worker.runAsset({ id: 'a5', provider: 'manual', piece_id: 'p1' }, deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /register/);
});

await ok('el worker local no contiene rutas a publicar, programar ni aprobar en GHL', async () => {
  const src = fs.readFileSync(new URL('./media-gateway.mjs', import.meta.url), 'utf8') + fs.readFileSync(new URL('./providers/renderer.mjs', import.meta.url), 'utf8') + fs.readFileSync(new URL('./providers/higgsfield.mjs', import.meta.url), 'utf8');
  assert.ok(!/social-media-posting|approvalStatus|status:\s*['"](scheduled|published)/.test(src));
});

await ok('el renderer actual sigue funcionando: la pieza de ejemplo se renderiza con el motor existente (render.mjs sin cambios)', async () => {
  const { renderPiece } = await import('../content/render.mjs');
  const os = await import('node:os'); const path = await import('node:path');
  const piece = JSON.parse(fs.readFileSync(new URL('../content/examples/instagram-evergreen-test.piece.json', import.meta.url), 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atacama-mgtest-'));
  try {
    const files = await renderPiece(piece, dir);
    assert.equal(files.length, piece.slides.length); assert.ok(files.every((f) => fs.statSync(f).size > 5000));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

console.log(n + ' ok');
