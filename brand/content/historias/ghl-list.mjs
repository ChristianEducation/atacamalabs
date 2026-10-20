import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const LOC = 'pxHuOsiz2i3lM6BtC9IM';
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const acc = await (await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/accounts', { headers: H })).json();
const list = (acc.results && acc.results.accounts) || [];
for (const a of list) console.log('ACC', a.id, a.platform, a.type, a.name, a.isExpired ? 'EXPIRED' : '');
const r = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/list', { method: 'POST', headers: H, body: JSON.stringify({ type: 'all', accounts: '', skip: '0', limit: '100', fromDate: '2026-10-19T00:00:00.000Z', toDate: '2026-10-27T00:00:00.000Z', includeUsers: 'false' }) });
const j = await r.json(); const posts = (j.results && j.results.posts) || [];
console.log('posts', r.status, posts.length);
const nameOf = Object.fromEntries(list.map((a) => [a.id, a.platform + ':' + (a.name || '')]));
for (const p of posts.sort((a, b) => String(a.scheduleDate).localeCompare(String(b.scheduleDate)))) { const ac = (p.accountIds || []).map((i) => nameOf[i] || i.slice(-8)).join(','); if (/linkedin/i.test(ac)) console.log(p.scheduleDate, p.status, p.type, ac, (p._id || p.id), (p.summary || '').slice(0, 60).replace(/\n/g, ' ')); }
