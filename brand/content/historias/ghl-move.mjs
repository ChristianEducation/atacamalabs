// Uso: node ghl-move.mjs <postId> <nuevaFechaISO>  — reprograma una historia (SOLO videos/imagen única; no usar en carruseles)
import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ';
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' };
const [id, when] = process.argv.slice(2);
const u = 'https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + id;
const g = (await (await fetch(u, { headers: H })).json()).results.post;
if ((g.media || []).length !== 1) { console.error('no es una pieza de 1 medio', (g.media || []).length); process.exit(2); }
const body = { accountIds: g.accountIds, summary: g.summary || '', type: g.type, status: 'in_review', userId: APPROVER, media: g.media.map((m) => ({ url: m.url, type: m.type })), scheduleDate: when, postApprovalDetails: { approver: APPROVER, approvalStatus: 'approved' } };
const r = await fetch(u, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
console.log('PUT', r.status, (await r.text()).slice(0, 160));
const g2 = (await (await fetch(u, { headers: H })).json()).results.post;
console.log('VERIFY', id, g2.status, g2.scheduleDate, (g2.postApprovalDetails || {}).approvalStatus, 'media=' + (g2.media || []).length);
