// Crea el carrusel «proceso» en la PÁGINA de LinkedIn como EN REVISIÓN (nunca aprobar por API: GHL recorta carruseles). Uso: node ghl-linkedin-carrusel.mjs
import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ';
const LI_PAGE = '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_145278681_page';
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const medias = JSON.parse(fs.readFileSync(ROOT + '/brand/content/historias/ghl-media-urls.json', 'utf8'));
const summary = fs.readFileSync(ROOT + '/brand/content/historias/carrusel-linkedin-caption.txt', 'utf8').trim();
const body = { accountIds: [LI_PAGE], summary, type: 'post', status: 'in_review', userId: APPROVER, media: medias, scheduleDate: '2026-10-21T13:00:00.000Z', postApprovalDetails: { approver: APPROVER } };
const base = 'https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts';
const cr = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify(body) }); const cj = await cr.json();
const p = (cj.results && (cj.results.post || cj.results)) || cj; const id = p._id || p.id;
console.log('create', cr.status, id || JSON.stringify(cj).slice(0, 300), '| medias en la respuesta:', (p.media || []).length);
if (!id) process.exit(3);
const g = (await (await fetch(base + '/' + id, { headers: H })).json()).results.post;
console.log('VERIFY', JSON.stringify({ id, status: g.status, schedule: g.scheduleDate, approval: (g.postApprovalDetails || {}).approvalStatus, media: (g.media || []).length, account: (g.accountIds || []).map((a) => a.slice(-12)) }));
