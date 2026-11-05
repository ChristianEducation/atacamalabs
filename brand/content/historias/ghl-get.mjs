import fs from 'node:fs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const H = { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' };
for (const id of process.argv.slice(2)) {
  const r = await fetch('https://services.leadconnectorhq.com/social-media-posting/pxHuOsiz2i3lM6BtC9IM/posts/' + id, { headers: H }); const j = await r.json(); const g = (j.results && j.results.post) || {};
  console.log(id, g.status, g.type, g.scheduleDate, (g.postApprovalDetails || {}).approvalStatus, 'media=' + (g.media || []).length, (g.summary || '').slice(0, 40).replace(/\n/g, ' '));
}
