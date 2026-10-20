// Corrige el carrusel ya creado (id dado): sube las 7 láminas y reescribe el post con todas, etiqueta «carrusel» y aprobado.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ'; const ID = process.argv[2];
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' };
const O = ROOT + '/brand/content/historias/out/';
const names = ['c1-gancho', 'c2-se-repite', 'c3-reglas-claras', 'c4-datos-a-mano', 'c5-tiempo-errores', 'c6-medir-revisar', 'c7-comenta-proceso'];
const medias = [];
for (const n of names) {
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(O + n + '.png')], { type: 'image/png' }), 'atacama-carrusel-' + n + '.png'); fd.append('hosted', 'false');
  const up = await fetch('https://services.leadconnectorhq.com/medias/upload-file', { method: 'POST', headers: H, body: fd }); const uj = await up.json();
  if (!uj.url) { console.error('subida falló', n, JSON.stringify(uj).slice(0, 200)); process.exit(2); }
  medias.push({ url: uj.url, type: 'image/png' });
}
const g0 = (await (await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + ID, { headers: H })).json()).results.post;
const body = { accountIds: g0.accountIds, summary: g0.summary, type: 'post', status: 'in_review', userId: APPROVER, media: medias, scheduleDate: g0.scheduleDate, tags: ['6ac53738c1fd27a1b5e78aa5'], postApprovalDetails: { approver: APPROVER, approvalStatus: 'approved' } };
const r = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + ID, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
console.log('PUT', r.status, (await r.text()).slice(0, 200));
const g = (await (await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + ID, { headers: H })).json()).results.post;
console.log('VERIFY', JSON.stringify({ id: ID, status: g.status, schedule: g.scheduleDate, approval: (g.postApprovalDetails || {}).approvalStatus, media: (g.media || []).length, tags: g.tags }));
