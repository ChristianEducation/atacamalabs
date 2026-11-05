// Uso: node ghl-sched.mjs <clave> [--approve]   (crea el post en GHL como in_review; con --approve lo aprueba = queda programado)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const env = Object.fromEntries(fs.readFileSync(ROOT + '/.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const TOKEN = env.GHL_PRIVATE_INTEGRATION_TOKEN2; const LOC = 'pxHuOsiz2i3lM6BtC9IM';
const IG = '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090'; const APPROVER = 'OjkAjHMdUjnblO7W1kBZ';
const H = { Authorization: 'Bearer ' + TOKEN, Version: '2021-07-28', Accept: 'application/json' };
const O = ROOT + '/brand/content/historias/out/';
const REEL = ROOT + '/social/exports/content/motion-autos-mensaje-sin-respuesta/autos-mensaje-sin-respuesta-v7-final-24s-con-voz-marisol.mp4';
const REEL_CAPTION = fs.existsSync(path.join(path.dirname(process.argv[1]), 'reel-caption.txt')) ? fs.readFileSync(path.join(path.dirname(process.argv[1]), 'reel-caption.txt'), 'utf8').trim() : '';
const ITEMS = {
  'lun-12-historia-06': { file: O + '06-pregunta-11-noche.png', mime: 'image/png', type: 'story', at: '2026-10-19T15:00:00.000Z', summary: '' },
  'lun-14-historia-08': { file: O + '08-teaser-checklist-motion-lunes.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-19T17:00:00.000Z', summary: '' },
  'lun-14-historia-08-v2': { file: O + '08-teaser-checklist-motion-lunes-v2.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-19T17:00:00.000Z', summary: '' },
  'lun-15-reel-autos': { file: REEL, mime: 'video/mp4', type: 'reel', at: '2026-10-19T18:00:00.000Z', summary: REEL_CAPTION },
  'mar-12-historia-10': { file: O + '10-beneficio-octubre-motion-martes.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-20T15:00:00.000Z', summary: '' },
  'mar-1330-historia-13': { file: O + '13-mientras-tu-vendes-motion-martes.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-20T16:30:00.000Z', summary: '' },
  // Miércoles 21 (aprobado por Christian el 19-oct): historias 12/13/14 y reel de feed 15:00 (Chile UTC-3)
  'mie-12-mito': { file: O + '12-mito-vs-realidad-mie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-21T15:00:00.000Z', summary: '' },
  'mie-13-rubros': { file: O + '13-un-agente-tu-rubro-mie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-21T16:00:00.000Z', summary: '' },
  'mie-14-gancho': { file: O + '14-gancho-pedido-mie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-21T17:00:00.000Z', summary: '' },
  'mie-15-reel-pedido': { file: O + 'miercoles-pedido-motion-7s.mp4', mime: 'video/mp4', type: 'reel', at: '2026-10-21T18:00:00.000Z', summary: fs.readFileSync(path.join(path.dirname(process.argv[1]), 'reel-miercoles-caption.txt'), 'utf8').trim() },
  // Jueves 22 (aprobado por Christian el 20-oct): historias 12/13/14 y reel de estadísticas 15:00 (Chile UTC-3), reel SIN sonido
  'jue-12-62': { file: O + '15-62-se-pierden-jue.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-22T15:00:00.000Z', summary: '' },
  'jue-12-62-v2': { file: O + '15-62-se-pierden-jue-v2.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-22T15:00:00.000Z', summary: '' },
  'jue-13-34': { file: O + '16-34-min-vs-1s-jue.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-22T16:00:00.000Z', summary: '' },
  'jue-14-23-48': { file: O + '17-23-vs-48-jue.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-22T17:00:00.000Z', summary: '' },
  'jue-15-reel-stats': { file: O + 'jueves-reel-estadisticas-sin-sonido.mp4', mime: 'video/mp4', type: 'reel', at: '2026-10-22T18:00:00.000Z', summary: fs.readFileSync(path.join(path.dirname(process.argv[1]), 'reel-jueves-caption.txt'), 'utf8').trim() },
  // Viernes 23 (aprobado por Christian el 20-oct): historias 12/13/14 (Chile UTC-3). El carrusel del feed va EN REVISIÓN (ghl-multicanal.mjs) y lo aprueba él con un clic.
  'vie-12-canales': { file: O + '18-no-solo-whatsapp-vie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-23T15:00:00.000Z', summary: '' },
  'vie-13-pregunta': { file: O + '19-misma-pregunta-vie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-23T16:00:00.000Z', summary: '' },
  'vie-14-bandeja': { file: O + '20-cinco-bandejas-vie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-23T17:00:00.000Z', summary: '' },
  // Sábado 24 (aprobado por Christian el 20-oct): historias 13/14 y reel de cotización 15:00 (Chile UTC-3), reel CON la voz de Marisol (elegida por él)
  'sab-13-cotizacion': { file: O + '21-cotizacion-4-dias-sab.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-24T16:00:00.000Z', summary: '' },
  'sab-14-mitad': { file: O + '22-cotizar-es-la-mitad-sab.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-24T17:00:00.000Z', summary: '' },
  'sab-15-reel-cotizacion': { file: ROOT + '/social/exports/content/motion-cotizacion-seguimiento/cotizacion-seguimiento-v2-con-voz-26s.mp4', mime: 'video/mp4', type: 'reel', at: '2026-10-24T18:00:00.000Z', summary: fs.readFileSync(path.join(path.dirname(process.argv[1]), 'reel-sabado-caption.txt'), 'utf8').trim() },
  // Domingo 25 (aprobado por Christian el 20-oct): 3 historias en motion sobre blanco, 12/13/14 (Chile UTC-3)
  'dom-12-checklist': { file: O + '23-checklist-dom.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-25T15:00:00.000Z', summary: '' },
  'dom-13-tamano': { file: O + '24-tamano-operacion-dom.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-25T16:00:00.000Z', summary: '' },
  'dom-14-quedan6': { file: O + '25-quedan-6-dias-dom.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-25T17:00:00.000Z', summary: '' },
  // Viernes 23 NUEVO (aprobado por Christian el 20-oct): serie no show en salud, historias 12:00/13:30/14:00 y reel con voz de Julian 15:00 (Chile UTC-3)
  'vs-12-silla': { file: O + '26-silla-vacia-vie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-23T15:00:00.000Z', summary: '' },
  'vs-1330-arregla': { file: O + '27-se-arregla-antes-vie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-23T16:30:00.000Z', summary: '' },
  'vs-14-cta': { file: O + '28-recepcion-no-persigue-vie.mp4', mime: 'video/mp4', type: 'story', at: '2026-10-23T17:00:00.000Z', summary: '' },
  'vs-15-reel': { file: O + '31-reel-calendario-no-show-vie-julian.mp4', mime: 'video/mp4', type: 'reel', at: '2026-10-23T18:00:00.000Z', summary: fs.readFileSync(path.join(path.dirname(process.argv[1]), 'reel-viernes-caption.txt'), 'utf8').trim() },
  // Carrusel de feed (7 imágenes, texto aprobado por Christian el 19-oct): martes 20, 15:00 Chile = 18:00Z
  'mar-15-carrusel': { files: ['c1-gancho', 'c2-se-repite', 'c3-reglas-claras', 'c4-datos-a-mano', 'c5-tiempo-errores', 'c6-medir-revisar', 'c7-comenta-proceso'].map((n) => O + n + '.png'), mime: 'image/png', type: 'post', at: '2026-10-20T18:00:00.000Z', summary: fs.readFileSync(path.join(path.dirname(process.argv[1]), 'carrusel-caption.txt'), 'utf8').trim() },
};
const key = process.argv[2]; const approve = process.argv.includes('--approve'); const it = ITEMS[key];
if (!it) { console.error('clave inválida', Object.keys(ITEMS)); process.exit(1); }
if (it.type === 'reel' && !it.summary) { console.error('El reel necesita su texto (reel-caption.txt)'); process.exit(1); }
// 1) subir a la biblioteca de GHL
const medias = [];
for (const f of (it.files || [it.file])) {
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(f)], { type: it.mime }), 'atacama-' + path.basename(f)); fd.append('hosted', 'false');
  const up = await fetch('https://services.leadconnectorhq.com/medias/upload-file', { method: 'POST', headers: { Authorization: H.Authorization, Version: H.Version, Accept: H.Accept }, body: fd });
  const uj = await up.json().catch(() => ({})); console.log('upload', path.basename(f), up.status, uj.url ? 'ok' : JSON.stringify(uj).slice(0, 200));
  if (!up.ok || !uj.url) process.exit(2);
  medias.push({ url: uj.url, type: it.mime });
}
// 2) crear el post (in_review, como hace el motor)
const body = { accountIds: [IG], summary: it.summary, type: it.type, status: 'in_review', userId: APPROVER, media: medias, scheduleDate: it.at, postApprovalDetails: { approver: APPROVER } };
const cr = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const cj = await cr.json().catch(() => ({})); const post = (cj.results && (cj.results.post || cj.results)) || cj; const id = post._id || post.id;
console.log('create', cr.status, id || JSON.stringify(cj).slice(0, 300));
if (!cr.ok || !id) process.exit(3);
if (approve) {
  const ab = { ...body, postApprovalDetails: { approver: APPROVER, approvalStatus: 'approved' } };
  const ar = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + id, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(ab) });
  console.log('approve', ar.status, (await ar.text()).slice(0, 200));
}
const gr = await fetch('https://services.leadconnectorhq.com/social-media-posting/' + LOC + '/posts/' + id, { headers: H });
const gj = await gr.json().catch(() => ({})); const g = (gj.results && gj.results.post) || {};
console.log('VERIFY', JSON.stringify({ key, id, status: g.status, type: g.type, scheduleDate: g.scheduleDate, approval: (g.postApprovalDetails || {}).approvalStatus, media: (g.media || []).map((m) => m.type) }));
