// Crea el carrusel desde cero con las 7 URLs ya subidas, mide cuántas retiene GHL antes y después de aprobar.
import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ';
const IG = '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090';
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const base = 'https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts';
const medias = JSON.parse(fs.readFileSync(ROOT + '/brand/content/historias/ghl-media-urls.json', 'utf8'));
const summary = fs.readFileSync(ROOT + '/brand/content/historias/carrusel-caption.txt', 'utf8').trim();
const get = async (id) => (await (await fetch(base + '/' + id, { headers: H })).json()).results.post;
const body = { accountIds: [IG], summary, type: 'post', status: 'in_review', userId: APPROVER, media: medias, scheduleDate: '2026-10-20T18:00:00.000Z', tags: ['6ac53738c1fd27a1b5e78aa5'], postApprovalDetails: { approver: APPROVER } };
const cr = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify(body) }); const cj = await cr.json();
const p = (cj.results && (cj.results.post || cj.results)) || cj; const id = p._id || p.id;
console.log('create', cr.status, id, '| media en la respuesta:', (p.media || []).length);
if (!id) process.exit(3);
let g = await get(id); console.log('tras crear (in_review): media', (g.media || []).length, g.status);
if (process.argv.includes('--approve')) {
  const ab = { accountIds: g.accountIds, summary: g.summary, type: g.type || 'post', status: 'in_review', userId: APPROVER, media: g.media, scheduleDate: g.scheduleDate, tags: g.tags, postApprovalDetails: { approver: APPROVER, approvalStatus: 'approved' } };
  const ar = await fetch(base + '/' + id, { method: 'PUT', headers: H, body: JSON.stringify(ab) });
  console.log('approve', ar.status);
  g = await get(id); console.log('VERIFY', JSON.stringify({ id, status: g.status, schedule: g.scheduleDate, approval: (g.postApprovalDetails || {}).approvalStatus, media: (g.media || []).length }));
}
