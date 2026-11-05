// Prueba: ¿cuántas imágenes retiene GHL en el post? Sube 7 (guarda las URLs) y prueba PUT con 2, 3 y 7.
import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ'; const ID = process.argv[2];
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' };
const O = ROOT + '/brand/content/historias/out/';
const names = ['c1-gancho', 'c2-se-repite', 'c3-reglas-claras', 'c4-datos-a-mano', 'c5-tiempo-errores', 'c6-medir-revisar', 'c7-comenta-proceso'];
const cache = ROOT + '/brand/content/historias/ghl-media-urls.json';
let medias = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : null;
if (!medias) {
  medias = [];
  for (const n of names) {
    const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(O + n + '.png')], { type: 'image/png' }), 'atacama-carrusel-' + n + '.png'); fd.append('hosted', 'false');
    const uj = await (await fetch('https://services.leadconnectorhq.com/medias/upload-file', { method: 'POST', headers: H, body: fd })).json();
    medias.push({ url: uj.url, type: 'image/png' });
  }
  fs.writeFileSync(cache, JSON.stringify(medias, null, 1));
}
const get = async () => (await (await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + ID, { headers: H })).json()).results.post;
const put = async (n) => {
  const g0 = await get();
  const body = { accountIds: g0.accountIds, summary: g0.summary, type: 'post', status: 'in_review', userId: APPROVER, media: medias.slice(0, n), scheduleDate: g0.scheduleDate, tags: g0.tags, postApprovalDetails: { approver: APPROVER, approvalStatus: 'approved' } };
  const r = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + ID, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.text(); const g = await get(); console.log('PUT con', n, '→', r.status, 'GHL retiene', (g.media || []).length, '| status', g.status, '| respuesta:', j.slice(0, 120));
};
for (const n of [2, 3, 7]) await put(n);
