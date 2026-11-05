// Crea el carrusel multicanal en GHL como EN REVISIÓN (nunca aprobar por API: GHL recorta el carrusel a 1 imagen). Uso: node ghl-multicanal.mjs
import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ';
const IG = '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090';
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' };
const O = ROOT + '/brand/content/historias/out/';
const files = ['m1g-celular-notificaciones-claro', 'm2-cada-cliente', 'm3-cada-canal', 'm4-un-agente', 'm5-que-hace', 'm6-tu-equipo', 'm7-cierre'].map((n) => O + n + '.png');
const summary = fs.readFileSync(ROOT + '/brand/content/historias/carrusel-multicanal-caption.txt', 'utf8').trim();
const medias = [];
for (const f of files) {
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(f)], { type: 'image/png' }), 'atacama-multicanal-' + f.split('/').pop()); fd.append('hosted', 'false');
  const uj = await (await fetch('https://services.leadconnectorhq.com/medias/upload-file', { method: 'POST', headers: H, body: fd })).json();
  if (!uj.url) { console.error('subida falló', f, JSON.stringify(uj).slice(0, 200)); process.exit(2); }
  medias.push({ url: uj.url, type: 'image/png' });
}
const body = { accountIds: [IG], summary, type: 'post', status: 'in_review', userId: APPROVER, media: medias, scheduleDate: '2026-10-23T18:00:00.000Z', tags: ['6ac53738c1fd27a1b5e78aa5'], postApprovalDetails: { approver: APPROVER } };
const H2 = { ...H, 'Content-Type': 'application/json' };
const cr = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts', { method: 'POST', headers: H2, body: JSON.stringify(body) });
const cj = await cr.json(); const p = (cj.results && (cj.results.post || cj.results)) || cj; const id = p._id || p.id;
console.log('create', cr.status, id, '| medias en la respuesta:', (p.media || []).length);
if (!id) process.exit(3);
const g = (await (await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + id, { headers: H })).json()).results.post;
console.log('VERIFY', JSON.stringify({ id, status: g.status, schedule: g.scheduleDate, approval: (g.postApprovalDetails || {}).approvalStatus, media: (g.media || []).length }));
