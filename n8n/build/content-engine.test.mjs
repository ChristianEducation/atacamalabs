// node n8n/build/content-engine.test.mjs — prueba los nodos Code de «12 Content Intake» con stubs de n8n.
import fs from 'node:fs';
import { buildContentIntake, ACCOUNTS, APPROVER_USER_ID, CATEGORY_IDS, TAG_IDS } from './content-engine.mjs';

const wf = buildContentIntake();
const codeOf = (name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;
const base = JSON.parse(fs.readFileSync(new URL('../../scripts/content/examples/linkedin-founder-dry-run.piece.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };

const run = (name, { nodes = {}, json = {}, input }) => {
  const $ = (n) => ({ first: () => ({ json: nodes[n] }), all: () => [{ json: nodes[n] }] });
  const f = new Function('$', '$json', '$input', '$items', codeOf(name));
  return f($, json, { first: () => ({ json: input ?? json }) }, null);
};
const evaluate = (body, keys = [], db = [], extra = {}) => {
  const realNow = Date.now; if (extra.now) Date.now = () => extra.now;
  try {
    return run('Evaluate', { nodes: { 'Intake Webhook': { body }, 'Fetch Keys': { body: keys.map((k) => ({ idea_key: k })) }, 'Fetch Sources': { body: db }, 'Fetch Scheduled': { body: extra.scheduled || [] }, 'List GHL Posts': { body: { results: { posts: extra.ghlPosts || [] } } } }, json: { statusCode: 200, body: [] } })[0].json;
  } finally { Date.now = realNow; }
};

// Evaluate
let r = evaluate({ piece: base, test: true });
t('LinkedIn texto candidato => submit', r.action === 'submit' && r.evaluation.score >= 70, JSON.stringify(r.evaluation.errors));
t('post a GHL: in_review, cuenta y aprobador correctos', r.ghlBody.status === 'in_review' && r.ghlBody.accountIds[0] === ACCOUNTS.linkedin_profile && r.ghlBody.postApprovalDetails.approver === APPROVER_USER_ID && r.ghlBody.userId === APPROVER_USER_ID);
t('post de prueba lleva el prefijo NO PUBLICAR', r.ghlBody.summary.startsWith('[PRUEBA ATACAMA OS — NO PUBLICAR]'));
t('scheduleDate propuesta: futuro y dentro de 72 h (sin fallback a +7 días)', new Date(r.ghlBody.scheduleDate).getTime() > Date.now() && new Date(r.ghlBody.scheduleDate).getTime() <= Date.now() + 72 * 3600000, r.ghlBody.scheduleDate);
{
  // REGLA (7-oct-2026): sin solicitud explícita de publicar el 14, ninguna pieza termina el 14 por fallback.
  const NOW7 = Date.parse('2026-10-07T19:30:00Z');
  const dayCL = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  ['linkedin_profile', 'linkedin_page', 'instagram'].forEach((ch) => ['Noticia', 'Educativo', 'Evergreen', 'Founder'].forEach((cat) => [null, '2026-10-14T13:00:00Z'].forEach((sug) => {
    const pc = clone(base); pc.channel = ch; pc.category = cat; pc.schedule_suggestion = sug;
    if (ch === 'instagram') { pc.format = 'carrusel'; pc.visual_direction = 'Fondo claro'; pc.render = { media: [{ url: 'https://x/1.png' }, { url: 'https://x/2.png' }, { url: 'https://x/3.png' }] }; }
    const q = evaluate({ piece: pc }, [], [], { now: NOW7 });
    if (q.action !== 'submit') return;
    t('7-oct: ' + ch + '/' + cat + '/' + (sug ? 'sugiere 14' : 'sin sugerencia') + ' no termina el 14 (' + q.ghlBody.scheduleDate + ')', dayCL(q.ghlBody.scheduleDate) !== '2026-10-14' && Date.parse(q.ghlBody.scheduleDate) - NOW7 <= 72 * 3600000);
  })));
  // una sugerencia a +7 días CON justificación explícita sí se respeta; sin ella, no
  const pj = clone(base); pj.schedule_suggestion = '2026-10-14T13:00:00Z';
  t('sugerencia al 14 sin justificación => ignorada con aviso', (() => { const q = evaluate({ piece: pj }, [], [], { now: NOW7 }); return dayCL(q.ghlBody.scheduleDate) !== '2026-10-14' && q.schedule.warnings.includes('sugerencia_posterior_a_72h_sin_justificacion_ignorada'); })());
  pj.schedule_justification = 'Coincide con el lanzamiento del producto el 14 de octubre.';
  t('sugerencia al 14 con justificación explícita => se respeta', dayCL(evaluate({ piece: pj }, [], [], { now: NOW7 }).ghlBody.scheduleDate) === '2026-10-14');
  // choque: un post ya programado (Supabase o GHL, incluso manual) en la misma cuenta ese día => pasa al siguiente día; otra cuenta no estorba
  const first = evaluate({ piece: base }, [], [], { now: NOW7 }).ghlBody.scheduleDate;
  const q1 = evaluate({ piece: base }, [], [], { now: NOW7, scheduled: [{ ghl_account_id: ACCOUNTS.linkedin_profile, scheduled_at: first }] }).ghlBody.scheduleDate;
  t('choque con un post de Supabase de la misma cuenta => otro día', dayCL(q1) !== dayCL(first), q1);
  const q2 = evaluate({ piece: base }, [], [], { now: NOW7, ghlPosts: [{ _id: 'manual', status: 'scheduled', scheduleDate: first, accountIds: [ACCOUNTS.linkedin_profile] }] }).ghlBody.scheduleDate;
  t('choque con un post manual de GHL de la misma cuenta => otro día', dayCL(q2) !== dayCL(first), q2);
  const q3 = evaluate({ piece: base }, [], [], { now: NOW7, ghlPosts: [{ _id: 'otra', status: 'scheduled', scheduleDate: first, accountIds: [ACCOUNTS.instagram] }] }).ghlBody.scheduleDate;
  t('un post de OTRA cuenta no estorba', q3 === first, q3);
  t('la fecha propuesta sigue siendo solo propuesta: el post nace in_review', evaluate({ piece: base }, [], [], { now: NOW7 }).ghlBody.status === 'in_review');
}
t('sin media para texto', r.ghlBody.media.length === 0);
t('fila de pieza: drafted, is_test, cuenta GHL', r.pieceRow.status === 'drafted' && r.pieceRow.is_test === true && r.pieceRow.ghl_account_id === ACCOUNTS.linkedin_profile);
t('fuentes con source_key y verified', r.sourcesBody[0].source_key.startsWith('real_work:') && r.sourcesBody[0].verified === true);
r = evaluate({ piece: base });
t('sin test: sin prefijo', !r.ghlBody.summary.startsWith('[PRUEBA'));
t('categoría de Social Planner según la pieza (Founder)', r.ghlBody.categoryId === CATEGORY_IDS.Founder);
t('etiqueta de Social Planner según el formato (texto)', Array.isArray(r.ghlBody.tags) && r.ghlBody.tags[0] === TAG_IDS.texto && r.ghlBody.tags.length === 1);
r = evaluate({ piece: base, submit_to_review: false });
t('submit_to_review=false => hold', r.action === 'hold' && r.holdReason === 'submit_to_review_false');
const bad = clone(base); bad.hook = 'x';
t('pieza inválida => reject sin escribir nada', evaluate({ piece: bad }).action === 'reject');
t('idea repetida => reject', evaluate({ piece: base }, [evaluate({ piece: base }).evaluation.idea_key]).action === 'reject');
const low = clone(base); Object.keys(low.factors).forEach((k) => { low.factors[k] = { value: 3, note: 'x' }; });
r = evaluate({ piece: low });
t('score < 70 => hold (no se fuerza) y queda como scored', r.action === 'hold' && r.pieceRow.status === 'scored' && r.holdReason === 'score_bajo_el_umbral');
const ig = clone(base); ig.channel = 'instagram'; ig.format = 'carrusel'; ig.visual_direction = 'Fondo claro';
ig.slides = [{ layout: 'cover', title: 'El freno es una decisión' }, { layout: 'content', title: 'Plan primero', body: 'Antes de escribir, el flujo muestra qué haría.' }, { layout: 'cta', title: '¿Dónde va tu freno?' }];
r = evaluate({ piece: ig });
t('Instagram sin render => hold falta_render_o_medio', r.action === 'hold' && r.holdReason === 'falta_render_o_medio');
ig.media = [{ url: 'https://example.com/a.png', type: 'image/png' }, { url: 'https://example.com/b.png', type: 'image/png' }, { url: 'https://example.com/c.png', type: 'image/png' }];
r = evaluate({ piece: ig });
t('Instagram con render => submit con 3 medios', r.action === 'submit' && r.ghlBody.media.length === 3 && r.ghlBody.accountIds[0] === ACCOUNTS.instagram);
try { run('Evaluate', { nodes: { 'Intake Webhook': { body: { icp_pack_id: '00000000-0000-0000-0000-000000000000', piece: base } }, 'Fetch Keys': { body: [] }, 'Fetch Sources': { body: [] } }, json: {} }); t('pack ajeno => error', false); } catch { t('pack ajeno => error', true); }


// Verificación de fuentes externas: la decide Supabase (gate de señales), no la pieza
const ext = clone(base); ext.sources.push({ kind: 'hermes_research', title: 'Cambio de precios', url: 'https://example.com/precios', verified: true, evidence: [] });
ext.claims.push({ text: 'Meta cambió el cobro de plantillas', external: true, source_url: 'https://example.com/precios' });
r = evaluate({ piece: ext });
t('fuente externa que se autodeclara verificada pero no está en BD => rechazo', r.action === 'reject' && r.evaluation.errors.some((e) => e.startsWith('claim_externo_fuente_no_verificada')), JSON.stringify(r.evaluation.errors));
r = evaluate({ piece: ext }, [], [{ id: 'src-1', source_key: 'hermes_research:https://example.com/precios', verified: true }]);
t('fuente externa verificada en BD => OK y se reutiliza su id', r.action === 'submit' && r.existingSourceIds.includes('src-1') && r.sourcesBody.every((x) => x.kind !== 'hermes_research'), JSON.stringify(r.evaluation.errors));
r = evaluate({ piece: ext }, [], [{ id: 'src-1', source_key: 'hermes_research:https://example.com/precios', verified: false }]);
t('fuente en BD pero no verificada => rechazo', r.action === 'reject');
t('Mark Sources Used solo toca candidatas', JSON.stringify(wf.nodes.find((n) => n.name === 'Mark Sources Used').parameters).includes('signal_status=eq.candidate'));

// Check GHL (guardas)
const ev = { ...evaluate({ piece: base, test: true }) };
const nodes = { 'Upsert Piece': { statusCode: 201, body: [{ id: 'p1' }] }, 'Build Row': ev };
const okRes = run('Check GHL', { nodes, json: { statusCode: 201, body: { results: { post: { _id: 'abc', status: 'in_review' } } } } })[0].json;
t('Check GHL acepta in_review', okRes.ghl_post_id === 'abc' && okRes.patchBody.status === 'in_review');
t('Check GHL guarda el hash del texto enviado (detección de edición)', /^[0-9a-f]{8}$/.test(okRes.patchBody.ghl_summary_hash) && okRes.patchBody.ghl_status === 'in_review');
const guard = (res, n = nodes) => { try { run('Check GHL', { nodes: n, json: res }); return false; } catch (e) { return String(e.message); } };
t('Check GHL aborta si GHL devuelve scheduled', /SEGURIDAD/.test(guard({ statusCode: 201, body: { results: { post: { _id: 'abc', status: 'scheduled' } } } }) || ''));
t('Check GHL aborta si GHL falla', /no creó el post/.test(guard({ statusCode: 422, body: { message: 'x' } }) || ''));
t('Check GHL aborta si Supabase falló', /content_pieces falló/.test(guard({ statusCode: 201, body: { results: { post: { _id: 'a', status: 'in_review' } } } }, { ...nodes, 'Upsert Piece': { statusCode: 400, body: { message: 'x' } } }) || ''));
// Ningún nodo del workflow puede crear scheduled/published
const all = JSON.stringify(wf);
t('el workflow no contiene estados scheduled/published en cuerpos a GHL', !/status: 'scheduled'|status: 'published'|"status":"scheduled"|"status":"published"/.test(all));

console.log(pass, 'ok', fail, 'fallos');
process.exit(fail ? 1 : 0);
