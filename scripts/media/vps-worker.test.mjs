import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as w from './vps-worker.mjs';
import { mgRenderHash } from './media-gateway-core.mjs';

let n = 0;
const ok = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const PIECE = { format: 'carrusel', channel: 'instagram', hook: 'Un agente no es solo un modelo', slides: [{ layout: 'cover', title: 'a' }, { layout: 'cta', title: 'b' }] };
const ROW = { id: 'p1', status: 'drafted', origin: 'explicit', interview_id: null, is_test: false, piece: PIECE };
const CLAIM = { ok: true, claimed: true, asset: { id: 'a1' }, row: ROW };
const sleep = async () => {};
const mkPng = () => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vpsw-')), 'slide-01.png'); fs.writeFileSync(f, Buffer.from('iVBORw0KGgo' + 'A'.repeat(40), 'base64')); return f; };
const mkDeps = (o) => {
  const calls = [];
  const gateway = async (b) => { calls.push(b); if (b.action === 'upload') return { ok: true, url: 'https://cdn.test/' + b.index + '.png', type: 'image/png', fileId: 'f' + b.index }; return { ok: true, http: 200 }; };
  const intake = async (b) => { calls.push({ intake: true, ...b }); return { http: 200, ok: true, action: 'in_review' }; };
  const render = async () => [mkPng(), mkPng()];
  return { calls, deps: { gateway, intake, render, sleep, log: () => {}, ...(o || {}) } };
};

await ok('procesa un asset: renderiza, sube cada slide, cierra READY con el hash de render y reenvía la pieza a revisión (con sus medios)', async () => {
  const { calls, deps } = mkDeps();
  const r = await w.processClaimed(CLAIM, deps);
  assert.equal(r.status, 'ready'); assert.equal(r.urls, 2); assert.match(r.submitted, /Content Intake HTTP 200 · in_review/); assert.equal(r.title, 'Un agente no es solo un modelo');
  const ups = calls.filter((c) => c.action === 'upload'); assert.equal(ups.length, 2); assert.equal(ups[0].id, 'a1'); assert.ok(ups[0].png_base64.startsWith('iVBORw0KGgo'));
  const done = calls.find((c) => c.action === 'complete'); assert.equal(done.status, 'ready'); assert.equal(done.urls.length, 2); assert.equal(done.content_hash, mgRenderHash(PIECE));
  const it = calls.find((c) => c.intake); assert.equal(it.piece.media.length, 2); assert.equal(it.submit_to_review, true); assert.equal(it.origin, 'explicit'); assert.equal(it.test, false);
  assert.ok(!JSON.stringify(calls.map((c) => ({ ...c, png_base64: undefined }))).match(/"(scheduled|published|approved)"/));
});

await ok('una pieza que ya no está drafted/scored NO se reenvía al Content Intake (solo se cierra el asset)', async () => {
  const { calls, deps } = mkDeps();
  const r = await w.processClaimed({ ...CLAIM, row: { ...ROW, status: 'in_review' } }, deps);
  assert.equal(r.status, 'ready'); assert.equal(r.submitted, 'no reenviada'); assert.ok(!calls.some((c) => c.intake));
});

await ok('la pieza conserva su origen (autonomous), entrevista y marca de prueba al reenviarse', async () => {
  const { calls, deps } = mkDeps();
  await w.processClaimed({ ...CLAIM, row: { ...ROW, origin: 'founder_interview', interview_id: 'i1', is_test: true } }, deps);
  const it = calls.find((c) => c.intake); assert.equal(it.origin, 'founder_interview'); assert.equal(it.interview_id, 'i1'); assert.equal(it.test, true);
  assert.equal(calls.find((c) => c.action === 'upload').label, 'prueba');
});

await ok('error visible: si el render falla, el asset se cierra FAILED con el motivo (sin secretos) y la pieza no se reenvía', async () => {
  const { calls, deps } = mkDeps({ render: async () => { throw new Error('browserType.launch: token=abcdef1234567890 sin sandbox'); } });
  const r = await w.processClaimed(CLAIM, deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /browserType\.launch/); assert.ok(!/abcdef1234567890/.test(r.error));
  const done = calls.find((c) => c.action === 'complete'); assert.equal(done.status, 'failed'); assert.ok(!calls.some((c) => c.intake));
});

await ok('subida con reintentos: tolera 2 fallos de red y tiene éxito; al 3.º fallo cierra FAILED', async () => {
  let k = 0; const calls = [];
  const flaky = async (b) => { calls.push(b.action); if (b.action === 'upload') { k++; return k <= 2 ? { ok: false, message: 'HTTP 502' } : { ok: true, url: 'https://cdn.test/x.png', fileId: 'f' }; } return { ok: true }; };
  const { deps } = mkDeps({ gateway: flaky, render: async () => [mkPng()] });
  assert.equal((await w.processClaimed(CLAIM, deps)).status, 'ready'); assert.equal(calls.filter((a) => a === 'upload').length, 3);
  const always = async (b) => (b.action === 'upload' ? { ok: false, message: 'GHL no aceptó la imagen: HTTP 401' } : { ok: true });
  const r = await w.processClaimed(CLAIM, mkDeps({ gateway: always, render: async () => [mkPng()] }).deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /Subida de la slide 1 falló.*HTTP 401/);
});

await ok('un error de estado en la subida (asset ya no reclamado) no se reintenta en bucle', async () => {
  let ups = 0; const gw = async (b) => { if (b.action === 'upload') { ups++; return { ok: false, error: 'estado_no_valido', message: 'no generating' }; } return { ok: true }; };
  const r = await w.processClaimed(CLAIM, mkDeps({ gateway: gw, render: async () => [mkPng()] }).deps);
  assert.equal(r.status, 'failed'); assert.equal(ups, 1);
});

await ok('pieza sin slides => FAILED claro, sin abrir el renderer', async () => {
  let rendered = false; const { deps } = mkDeps({ render: async () => { rendered = true; return []; } });
  const r = await w.processClaimed({ ...CLAIM, row: { ...ROW, piece: { ...PIECE, slides: [] } } }, deps);
  assert.equal(r.status, 'failed'); assert.match(r.error, /no tiene slides/); assert.equal(rendered, false);
});



await ok('si el Content Intake NO deja la pieza en revisión (cola llena, rechazada, error 500) el asset queda FAILED con el motivo y no se cierra como listo', async () => {
  for (const bad of [{ http: 500, ok: false, error: 'GHL no creó el post (HTTP 422)' }, { http: 200, ok: false, action: 'blocked', reason: 'cola_llena' }, { http: 200, ok: true, action: 'held', reason: 'falta_render_o_medio' }]) {
    const { calls, deps } = mkDeps({ intake: async () => bad });
    const r = await w.processClaimed(CLAIM, deps);
    assert.equal(r.status, 'failed', JSON.stringify(bad)); assert.match(r.error, /no llegó a revisión/);
    assert.ok(!calls.some((c) => c.action === 'complete' && c.status === 'ready'));
    assert.equal(calls.filter((c) => c.action === 'complete').pop().status, 'failed');
  }
});

await ok('historia: se dibuja con el renderer de historias (no pide slides), sube 1 imagen y reenvía la pieza con su medio', async () => {
  const story = { template: 'chat', title: 'x', chat: [{ from: 'in', text: 'a' }, { from: 'out', text: 'b' }] };
  const hRow = { ...ROW, piece: { format: 'historia', channel: 'instagram', hook: 'Pidió la cotización y desapareció', story } };
  const { calls, deps } = mkDeps({ render: async (p) => { assert.equal(p.format, 'historia'); return [mkPng()]; } });
  const r = await w.processClaimed({ ok: true, claimed: true, asset: { id: 'h1', provider: 'renderer' }, row: hRow }, deps);
  assert.equal(r.status, 'ready'); assert.equal(r.urls, 1);
  assert.equal(calls.find((c) => c.action === 'complete').content_hash, mgRenderHash(hRow.piece));
  assert.equal(calls.find((c) => c.intake).piece.media.length, 1);
  const noStory = await w.processClaimed({ ok: true, claimed: true, asset: { id: 'h2', provider: 'renderer' }, row: { ...hRow, piece: { format: 'historia', channel: 'instagram' } } }, mkDeps().deps);
  assert.equal(noStory.status, 'failed'); assert.match(noStory.error, /no tiene story/);
});

await ok('studio: sube el MP4 del taller con mime video/mp4, cierra con hash del archivo y reenvía el reel a revisión', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpsw-studio-')); const mp4 = path.join(dir, 'reel-normalizado.mp4');
  fs.writeFileSync(mp4, Buffer.concat([Buffer.from([0, 0, 0, 28]), Buffer.from('ftypisom'), Buffer.alloc(500)]));
  const reelRow = { ...ROW, piece: { format: 'reel', channel: 'instagram', hook: '¿Quién contesta?', motion_brief: { language: 'paneles-partidos', phrases: ['a'], duration_s: 8 } } };
  const { calls, deps } = mkDeps({ studioFile: (slug) => { assert.equal(slug, 'mi-reel-01'); return mp4; }, render: async () => { throw new Error('el renderer no debe usarse para el taller'); } });
  const r = await w.processClaimed({ ok: true, claimed: true, asset: { id: 's1', provider: 'studio', composition: 'mi-reel-01' }, row: reelRow }, deps);
  assert.equal(r.status, 'ready');
  const up = calls.find((c) => c.action === 'upload'); assert.equal(up.mime, 'video/mp4');
  const done = calls.find((c) => c.action === 'complete'); assert.equal(done.status, 'ready'); assert.match(done.content_hash, /^[0-9a-f]{8}$/);
  assert.equal(calls.find((c) => c.intake).piece.media[0].type, 'image/png', 'el tipo lo informa n8n; aquí el stub devuelve png');
});

await ok('studio: sin video, con nombre inválido o con archivo gigante => FAILED con el motivo exacto (sin subir nada)', async () => {
  const mk = (asset, studioFile) => w.processClaimed({ ok: true, claimed: true, asset, row: { ...ROW, piece: { format: 'reel', channel: 'instagram' } } }, mkDeps({ studioFile }).deps);
  const a = await mk({ id: 's2', provider: 'studio', composition: 'no-existe-01' }, () => '/nada/aqui.mp4'); assert.equal(a.status, 'failed'); assert.match(a.error, /No encuentro el video del taller/);
  const b = await mk({ id: 's3', provider: 'studio', composition: '../etc' }, () => '/x'); assert.equal(b.status, 'failed'); assert.match(b.error, /nombre de proyecto válido/);
  const big = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vpsw-big-')), 'big.mp4'); fs.writeFileSync(big, Buffer.alloc(11 * 1024 * 1024));
  const c = await mk({ id: 's4', provider: 'studio', composition: 'grande-01' }, () => big); assert.equal(c.status, 'failed'); assert.match(c.error, /máximo 10 MB/);
});

await ok('bucle: sin nada en cola termina tras UN claim (compuerta barata); con 2 en cola procesa los 2 y para; respeta el máximo', async () => {
  let claims = 0; const { deps } = mkDeps();
  const queue = [CLAIM, { ...CLAIM, asset: { id: 'a2' } }];
  const gw = async (b) => { if (b.action === 'claim') { claims++; const q = queue.shift(); return q || { ok: true, claimed: false }; } return deps.gateway(b); };
  const res = await w.runWorker({ ...deps, gateway: gw }, 3);
  assert.equal(res.length, 2); assert.equal(claims, 3);
  claims = 0; const empty = await w.runWorker({ ...deps, gateway: async () => { claims++; return { ok: true, claimed: false }; } }, 3);
  assert.equal(empty.length, 0); assert.equal(claims, 1);
  claims = 0; const many = await w.runWorker({ ...deps, gateway: async (b) => (b.action === 'claim' ? (claims++, CLAIM) : deps.gateway(b)) }, 2);
  assert.equal(many.length, 2); assert.equal(claims, 2);
});

await ok('bucle: si el claim falla se informa el error y se detiene; un huérfano abandonado (3 intentos) se reporta como fallido', async () => {
  const res = await w.runWorker({ gateway: async () => ({ ok: false, http: 500, message: 'No pude leer Supabase' }) }, 3);
  assert.equal(res[0].status, 'error'); assert.match(res[0].error, /Supabase/);
  const gu = await w.runWorker({ gateway: async () => ({ ok: true, claimed: false, gave_up: 'a9', message: 'tras 3 intentos' }) }, 3);
  assert.equal(gu[0].status, 'failed'); assert.equal(gu[0].id, 'a9');
});

await ok('candado de corrida única: el segundo worker no corre mientras el primero está vigente; uno huérfano (>30 min) se retoma', async () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vpsw-lock-')), 'sub', 'media-worker.lock');
  assert.equal(w.acquireLock(f, 1000000, 1), true); assert.equal(w.acquireLock(f, 1000000 + 5 * 60000, 2), false); assert.equal(w.acquireLock(f, 1000000 + 31 * 60000, 3), true);
});

await ok('cliente n8n: usa solo el origen de ATACAMA_INGEST_URL y la llave de ingesta; no incluye otros secretos', async () => {
  const seen = [];
  const c = w.n8nClient({ ATACAMA_INGEST_URL: 'https://n8n.example.test/webhook/atacama-prospects-ingest', ATACAMA_INGEST_KEY: 'k1' }, async (url, o) => { seen.push({ url, h: o.headers }); return { status: 200, json: async () => ({ ok: true }) }; });
  await c.gateway({ action: 'claim' }); await c.intake({ piece: {} });
  assert.equal(seen[0].url, 'https://n8n.example.test/webhook/atacama-media-gateway'); assert.equal(seen[1].url, 'https://n8n.example.test/webhook/atacama-content-intake'); assert.equal(seen[0].h['X-Atacama-Key'], 'k1');
});

console.log(n + ' ok');
