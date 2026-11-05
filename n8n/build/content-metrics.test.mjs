// node n8n/build/content-metrics.test.mjs
import { buildContentMetrics, buildContentLearnings, METRIC_ACCOUNTS } from './content-metrics.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const H = 3600000;
const PUB = Date.parse('2026-10-20T13:00:00Z');
const wf = buildContentMetrics();
const node = (n) => wf.nodes.find((x) => x.name === n);
const codeOf = (n) => node(n).parameters.jsCode;
const fakeDate = (nowMs) => { class D extends Date { static now() { return nowMs; } } return D; };

// ---------- Plan
const runPlan = (pieces, metrics, nowMs, pubStatus = 200, metStatus = 200) => {
  const $ = (name) => ({ first: () => ({ json: { 'Fetch Published': { statusCode: pubStatus, body: pieces } }[name] }) });
  return new Function('$', '$json', 'Date', codeOf('Plan'))($, { statusCode: metStatus, body: metrics }, fakeDate(nowMs));
};
const piece = (o = {}) => ({ id: 'p1', ghl_post_id: 'g1', channel: 'linkedin_profile', category: 'Founder', format: 'texto', score: 81, topic: 'Tema', hook: 'Hook X', published_at: new Date(PUB).toISOString(), learning: null, is_test: true, ...o });
t('Plan: sin piezas publicadas no hace nada (sin llamadas a GHL)', runPlan([], [], PUB + 30 * H).length === 0);
t('Plan: a las 10 h no toca nada', runPlan([piece()], [], PUB + 10 * H).length === 0);
let out = runPlan([piece()], [], PUB + 26 * H);
t('Plan: a las 26 h emite 1 snapshot 24h con la cuenta correcta (profileId de estadísticas)', out.length === 1 && out[0].json.kind === 'snapshot' && out[0].json.due.window === '24h' && out[0].json.missed === false && out[0].json.profile_id === METRIC_ACCOUNTS.linkedin_profile.profile_id && out[0].json.platform === 'linkedin' && out[0].json.ghl_post_id === 'g1', JSON.stringify(out));
t('Plan: deduplicación (24h ya guardada) no emite nada', runPlan([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok' }], PUB + 26 * H).length === 0);
out = runPlan([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok' }, { content_piece_id: 'p1', metric_window: '72h', status: 'ok' }], PUB + 170 * H);
t('Plan: a las 170 h solo falta 7d', out.length === 1 && out[0].json.due.window === '7d');
out = runPlan([piece()], [], PUB + 90 * H);
t('Plan: ventana 24h vencida fuera de tolerancia => missed (no se consulta GHL), 72h normal', out.find((o) => o.json.due.window === '24h').json.missed === true && out.find((o) => o.json.due.window === '72h').json.missed === false);
out = runPlan([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok', likes: 3, comments: 1, shares: 0 }, { content_piece_id: 'p1', metric_window: '72h', status: 'ok', likes: 4, comments: 1, shares: 0 }, { content_piece_id: 'p1', metric_window: '7d', status: 'ok', likes: 5, comments: 2, shares: 1 }], PUB + 175 * H);
t('Plan: con 7d registrado emite el aprendizaje de la pieza', out.length === 1 && out[0].json.kind === 'learn' && out[0].json.learning.metrics.actions === 8 && out[0].json.learning.hook === 'Hook X' && out[0].json.learning.confidence === 'baja', JSON.stringify(out[0] && out[0].json.learning && out[0].json.learning.comparison));
t('Plan: con aprendizaje ya guardado no lo repite', runPlan([piece({ learning: { version: 1 } })], [{ content_piece_id: 'p1', metric_window: '7d', status: 'ok' }], PUB + 175 * H).filter((o) => o.json.kind === 'learn').length === 0);
t('Plan: canal desconocido se ignora sin romper', runPlan([piece({ channel: 'tiktok' })], [], PUB + 26 * H).length === 0);
t('Plan: si Supabase falla, lanza error (no asume vacío)', (() => { try { runPlan([], [], PUB, 500, 200); return false; } catch { return true; } })());
const peers = [{ id: 'a', channel: 'linkedin_page', category: 'Noticia', format: 'texto', published_at: new Date(PUB - 9 * 86400000).toISOString() }, { id: 'b', channel: 'linkedin_page', category: 'Noticia', format: 'texto', published_at: new Date(PUB - 9 * 86400000).toISOString() }, { id: 'c', channel: 'linkedin_page', category: 'Noticia', format: 'texto', published_at: new Date(PUB - 9 * 86400000).toISOString() }].map((p) => ({ ...p, ghl_post_id: 'x' + p.id, hook: 'h' + p.id, learning: { v: 1 }, is_test: true }));
const r7 = (id, n) => ({ content_piece_id: id, metric_window: '7d', status: 'ok', likes: n, comments: 0, shares: 0 });
out = runPlan([piece(), ...peers], [r7('p1', 12), r7('a', 4), r7('b', 5), r7('c', 6), { content_piece_id: 'p1', metric_window: '24h', status: 'ok', likes: 2, comments: 0, shares: 0 }], PUB + 175 * H);
const lrn = out.find((o) => o.json.kind === 'learn');
t('Plan: el aprendizaje se compara con piezas de la misma plataforma (LinkedIn) cuando hay ≥3', lrn && lrn.json.learning.comparison.basis === 'misma_plataforma' && lrn.json.learning.comparison.peer_median_actions === 5, JSON.stringify(lrn && lrn.json.learning.comparison));

// ---------- Build Snapshot / Build Missed
const planItem = (o = {}) => ({ kind: 'snapshot', missed: false, due: { piece_id: 'p1', ghl_post_id: 'g1', window: '24h', due_at: new Date(PUB + 24 * H).toISOString(), hours_since_published: 26 }, ghl_post_id: 'g1', platform: 'linkedin', account_id: METRIC_ACCOUNTS.linkedin_profile.account_id, profile_id: METRIC_ACCOUNTS.linkedin_profile.profile_id, ...o });
const runBuild = (plan, postRes, statRes, nowMs = PUB + 26 * H) => {
  const $ = (name) => ({ item: { json: { Plan: plan, 'Fetch GHL Post': postRes }[name] } });
  return new Function('$', '$input', 'Date', codeOf('Build Snapshot'))($, { item: { json: statRes } }, fakeDate(nowMs));
};
const goodStats = { statusCode: 201, body: { results: { dayRange: ['Mon'], totals: { posts: 1, likes: 3, followers: 10, impressions: 500, comments: 1 }, postPerformance: { impressions: [500] }, breakdowns: { reach: { total: 300 }, engagement: { linkedin: { likes: 3, comments: 1, shares: 0 } } } } } };
let b = runBuild(planItem(), { statusCode: 200, body: { results: { post: { _id: 'g1', insights: { like: 5, comment: 2, share: 1 } } } } }, goodStats);
t('Build Snapshot: ok con insights del post y contexto de cuenta', b.json.row.status === 'ok' && b.json.row.likes === 5 && b.json.row.comments === 2 && b.json.row.shares === 1 && b.json.row.account_impressions_7d === 500 && b.json.row.account_reach_7d === 300 && b.json.row.icp_pack_id && b.json.row.metric_window === '24h', JSON.stringify(b));
b = runBuild(planItem(), { statusCode: 200, body: { results: { post: { _id: 'g1' } } } }, goodStats);
t('Build Snapshot: post sin insights => partial (no inventa likes)', b.json.row.status === 'partial' && b.json.row.likes === null && b.json.row.error.includes('post_sin_insights'));
b = runBuild(planItem(), { statusCode: 404, body: { message: 'not found' } }, goodStats);
t('Build Snapshot: post no encontrado => partial con estadísticas de cuenta', b.json.row.status === 'partial' && b.json.row.error.includes('post_no_encontrado') && b.json.row.account_impressions_7d === 500);
b = runBuild(planItem(), { statusCode: 500, body: {} }, { statusCode: 400, body: { message: 'Invalid connected account ID' } });
t('Build Snapshot: GHL caído => no guarda nada y se reintenta (skipped)', b.json.skipped === true && !b.json.row);
b = runBuild(planItem(), { statusCode: 200, body: { results: { post: { _id: 'g1', insights: { like: 1 } } } } }, { statusCode: 400, body: { message: 'x' } });
t('Build Snapshot: estadísticas de cuenta fallan pero el post responde => partial', b.json.row.status === 'partial' && b.json.row.likes === 1 && b.json.row.account_impressions_7d === null && b.json.row.error.includes('sin_estadisticas_de_cuenta'));
const missed = new Function('$json', 'Date', codeOf('Build Missed'))(planItem({ missed: true, due: { ...planItem().due, missed: true } }), fakeDate(PUB + 100 * H));
t('Build Missed: fila error ventana_perdida, sin números', missed.json.row.status === 'error' && missed.json.row.error.startsWith('ventana_perdida') && missed.json.row.likes === undefined && missed.json.row.late === true);

// ---------- Estructura del workflow
const ghlNodes = wf.nodes.filter((n) => /leadconnectorhq/.test(JSON.stringify(n.parameters)));
t('15: solo lee en GHL (GET del post y POST de estadísticas)', ghlNodes.length === 2 && ghlNodes.every((n) => (n.parameters.method === 'GET' && /\/posts\/"/.test(n.parameters.url)) || (n.parameters.method === 'POST' && /\/statistics\?locationId=/.test(n.parameters.url))), ghlNodes.map((n) => n.parameters.url).join(' | '));
t('15: los nodos de GHL toleran fallos (continueOnFail) sin romper el workflow', ghlNodes.every((n) => n.continueOnFail === true));
t('15: no hay ninguna escritura a GHL (ni PUT/DELETE/PATCH)', !wf.nodes.some((n) => /leadconnectorhq/.test(JSON.stringify(n.parameters)) && ['PUT', 'DELETE', 'PATCH'].includes(n.parameters.method)));
t('15: frecuencia cada 3 horas (no cada minuto)', node('Every 3 Hours').parameters.rule.interval[0].hoursInterval === 3);
t('15: el upsert ignora duplicados y respeta la clave (pieza, ventana)', /on_conflict=content_piece_id,metric_window/.test(node('Upsert Metric').parameters.url) && /ignore-duplicates/.test(JSON.stringify(node('Upsert Metric').parameters.headerParameters)));
t('15: el parche de aprendizaje solo escribe si aún no hay aprendizaje', /learning=is\.null/.test(node('Patch Learning').parameters.url));
t('15: estadísticas con el profileId de la cuenta (no con el id)', /profile_id/.test(node('Fetch Account Stats').parameters.jsonBody));
const names = new Set(wf.nodes.map((n) => n.name));
t('15: todas las conexiones apuntan a nodos existentes', Object.entries(wf.connections).every(([k, v]) => names.has(k) && v.main.every((o) => o.every((c) => names.has(c.node)))));
t('15: sin secretos embebidos', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8})/.test(JSON.stringify(wf)));

// ---------- Workflow 16
const w16 = buildContentLearnings();
t('16: webhook GET autenticado con X-Atacama-Key', w16.nodes[0].parameters.httpMethod === 'GET' && w16.nodes[0].parameters.authentication === 'headerAuth' && w16.nodes[0].parameters.path === 'atacama-content-learnings');
const runSum = (learned, recent) => {
  const $ = (n) => ({ first: () => ({ json: { 'Fetch Learned': { statusCode: 200, body: learned } }[n] }) });
  return new Function('$', '$json', w16.nodes.find((n) => n.name === 'Summarize').parameters.jsCode)($, { statusCode: 200, body: recent });
};
const learned = [{ id: 'p1', channel: 'linkedin_profile', category: 'Founder', format: 'texto', published_at: 'x', learning: { hook: 'Hook X', topic: 'T', initial_score: 81, metrics: { actions: 8 }, worked: ['a'], not_worked: [], hypotheses: ['Hipótesis (no demostrada): ...'], guidance: [{ rule: 'no_repetir_hook', text: 'No repetir exactamente este hook: «Hook X».' }], confidence: 'baja' } }];
const s = runSum(learned, [{ status: 'in_review', channel: 'linkedin_page', category: 'Noticia', format: 'texto', hook: 'Hook Y' }])[0].json;
t('16: devuelve aprendizajes, hooks a no repetir y piezas recientes', s.ok && s.n_learnings === 1 && s.do_not_repeat_hooks[0] === 'Hook X' && s.recent_pieces[0].hook === 'Hook Y' && /no repetir/i.test(s.how_to_use) && s.by_channel[0].tentative === true, JSON.stringify(s).slice(0, 300));
t('16: sin aprendizajes devuelve estructura vacía válida', runSum([], [])[0].json.n_learnings === 0);
t('16: si Supabase falla lanza error', (() => { try { new Function('$', '$json', w16.nodes.find((n) => n.name === 'Summarize').parameters.jsCode)((n) => ({ first: () => ({ json: { statusCode: 500, body: {} } }) }), { statusCode: 200, body: [] }); return false; } catch { return true; } })());

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
