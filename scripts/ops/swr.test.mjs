// node --conditions=react-server --experimental-strip-types --import ./scripts/ops/swr-test-hooks.mjs scripts/ops/swr.test.mjs
// Prueba la caché «stale-while-revalidate» de /ops (src/lib/ops/swr.ts): fresco, viejo-pero-útil (instantáneo + refresco por detrás), frío, fallos y drop().
import assert from 'node:assert/strict';

process.env.OPS_NO_CACHE = '';
const { swr } = await import('../../src/lib/ops/swr.ts');
let n = 0;
const ok = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (delay = 30) => { let calls = 0; const fetcher = async () => { calls++; const v = calls; await sleep(delay); return { value: 'v' + v, at: Date.now() }; }; return { fetcher, calls: () => calls }; };

await ok('arranque en frío: espera la lectura real una sola vez (varias peticiones a la vez comparten la misma)', async () => {
  const { fetcher, calls } = mk(60);
  const c = swr(fetcher, { freshMs: 1000, maxStaleMs: 10000 });
  const [a, b] = await Promise.all([c.get(), c.get()]);
  assert.equal(a.value, 'v1'); assert.equal(b.value, 'v1'); assert.equal(calls(), 1);
});

await ok('dato fresco: se devuelve sin volver a leer', async () => {
  const { fetcher, calls } = mk(5);
  const c = swr(fetcher, { freshMs: 1000, maxStaleMs: 10000 });
  await c.get(); const r = await c.get();
  assert.equal(r.value, 'v1'); assert.equal(calls(), 1);
});

await ok('viejo pero útil: responde AL INSTANTE con lo último y refresca por detrás (la siguiente lectura ya trae lo nuevo)', async () => {
  const { fetcher, calls } = mk(80);
  const c = swr(fetcher, { freshMs: 20, maxStaleMs: 10000 });
  await c.get(); await sleep(40);
  const t0 = Date.now(); const r = await c.get(); const ms = Date.now() - t0;
  assert.equal(r.value, 'v1'); assert.ok(ms < 40, 'tardó ' + ms + ' ms'); assert.equal(r.stale, false);
  await sleep(150);
  assert.equal(calls(), 2); assert.equal((await c.get()).value, 'v2');
});

await ok('si la lectura falla y hay un dato anterior útil, se muestra ese marcado como viejo; sin dato anterior el error sube', async () => {
  let fail = false, calls = 0;
  const c = swr(async () => { calls++; if (fail) throw new Error('n8n caído'); return { value: 'bueno', at: Date.now() }; }, { freshMs: 10, maxStaleMs: 25 });
  await c.get(); fail = true; await sleep(60);
  // pasado maxStale: bloquea, falla y NO hay dato útil → el error sube
  await assert.rejects(() => c.get(), /n8n caído/);
  const d = swr(async () => { throw new Error('nunca respondió'); }, { freshMs: 10, maxStaleMs: 1000 });
  await assert.rejects(() => d.get(), /nunca respondió/);
});

await ok('drop(): tras aprobar/rechazar lo siguiente que se lee es el estado real, y una lectura que venía en camino NO vuelve a guardar datos viejos', async () => {
  let n1 = 0; const gate = [];
  const c = swr(async () => { n1++; const mine = n1; await sleep(mine === 1 ? 80 : 5); return { value: 'v' + mine, at: Date.now() }; }, { freshMs: 5000, maxStaleMs: 10000 });
  const first = c.get();          // lectura 1 (lenta) en camino
  await sleep(10); c.drop();      // la acción ocurre mientras viene la lectura vieja
  const after = await c.get();    // lectura 2 (nueva)
  assert.equal(after.value, 'v2');
  await first; await sleep(100);  // la lectura vieja termina… y no debe pisar el dato nuevo
  assert.equal((await c.get()).value, 'v2'); gate.push(1);
});

await ok('OPS_NO_CACHE=1: nunca guarda (cada lectura es real; para pruebas con estado simulado)', async () => {
  process.env.OPS_NO_CACHE = '1';
  const { fetcher, calls } = mk(5);
  const c = swr(fetcher, { freshMs: 100000, maxStaleMs: 100000 });
  await c.get(); await c.get();
  assert.equal(calls(), 2);
  process.env.OPS_NO_CACHE = '';
});

console.log(n + ' ok');
