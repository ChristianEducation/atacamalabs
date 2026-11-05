// node scripts/content/metrics-core.test.mjs
import { summaryHash, planMetrics, extractPostMetrics, extractAccountStats, buildSnapshot, actionsOf, buildLearning, summarizeLearnings } from './metrics-core.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const H = 3600000;
const pub = Date.parse('2026-10-20T13:00:00Z');
const piece = (o = {}) => ({ id: 'p1', ghl_post_id: 'g1', channel: 'linkedin_profile', published_at: new Date(pub).toISOString(), learning: null, is_test: true, ...o });

// --- summaryHash
t('hash estable ante saltos de línea Windows y espacios', summaryHash('Hola  mundo\r\n\r\n\r\nFin ') === summaryHash('Hola mundo\n\nFin'));
t('hash cambia si el texto cambia', summaryHash('Hola mundo') !== summaryHash('Hola mundo!'));

// --- planMetrics: ventanas
let r = planMetrics([piece()], [], pub + 23 * H);
t('a las 23 h todavía no corresponde ningún snapshot', r.snapshots.length === 0 && r.learn.length === 0);
r = planMetrics([piece()], [], pub + 25 * H);
t('a las 25 h corresponde 24h', r.snapshots.length === 1 && r.snapshots[0].window === '24h' && r.snapshots[0].missed === false, JSON.stringify(r));
r = planMetrics([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok' }], pub + 26 * H);
t('deduplicación: una ventana ya registrada no se repite', r.snapshots.length === 0);
r = planMetrics([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok' }], pub + 73 * H);
t('a las 73 h solo falta 72h', r.snapshots.length === 1 && r.snapshots[0].window === '72h');
r = planMetrics([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok' }, { content_piece_id: 'p1', metric_window: '72h', status: 'partial' }], pub + 169 * H);
t('a las 169 h corresponde 7d y aún no el aprendizaje', r.snapshots.length === 1 && r.snapshots[0].window === '7d' && r.learn.length === 0);
r = planMetrics([piece()], [], pub + 90 * H);
t('ventanas vencidas más allá de su tolerancia se marcan como perdidas (no se miden tarde)', r.snapshots.find((s) => s.window === '24h').missed === true && r.snapshots.find((s) => s.window === '72h').missed === false, JSON.stringify(r.snapshots.map((s) => [s.window, s.missed])));
r = planMetrics([piece()], [{ content_piece_id: 'p1', metric_window: '24h', status: 'ok' }, { content_piece_id: 'p1', metric_window: '72h', status: 'ok' }, { content_piece_id: 'p1', metric_window: '7d', status: 'ok' }], pub + 170 * H);
t('con 7d registrada corresponde generar aprendizaje', r.learn.length === 1 && r.snapshots.length === 0);
r = planMetrics([piece({ learning: { v: 1 } })], [{ content_piece_id: 'p1', metric_window: '7d', status: 'ok' }], pub + 200 * H);
t('con aprendizaje ya guardado no se repite', r.learn.length === 0);
r = planMetrics([piece()], [], pub + 217 * H);
t('si pasó la tolerancia de 7d sin datos, igual se emite aprendizaje (con la advertencia de datos faltantes)', r.learn.length === 1);
r = planMetrics([piece({ published_at: null }), piece({ id: 'p2', ghl_post_id: null })], [], pub + 999 * H);
t('sin published_at o sin ghl_post_id no se planifica nada', r.snapshots.length === 0 && r.learn.length === 0);

// --- extractPostMetrics
let m = extractPostMetrics({ insights: { like: 4, comment: 1, share: 0 } });
t('insights de GHL: like/comment/share', m.likes === 4 && m.comments === 1 && m.shares === 0 && m.available.join() === 'likes,comments,shares', JSON.stringify(m));
m = extractPostMetrics({ insights: { like: 2, impressions: 900, clicks: 7 } });
t('métricas desconocidas quedan en extra, sin mapearlas a otras', m.likes === 2 && m.comments === null && m.extra.impressions === 900 && m.extra.clicks === 7);
m = extractPostMetrics({});
t('post sin insights => sin métricas disponibles', m.available.length === 0 && m.likes === null);
m = extractPostMetrics({ insights: { like: '3' } });
t('número como texto se acepta, otros textos no', m.likes === 3);

// --- extractAccountStats (forma real de GHL)
const stats = { results: { dayRange: ['Tue'], totals: { posts: 4, likes: 6, followers: 0, impressions: 92004, comments: 0 }, postPerformance: { impressions: [0, 365] }, breakdowns: { reach: { total: 42377 }, engagement: { instagram: { likes: 6, comments: 0, shares: 2 } } } } };
const a = extractAccountStats(stats, 'instagram');
t('estadísticas de cuenta: impresiones, alcance, seguidores, compartidos', a.impressions === 92004 && a.reach === 42377 && a.followers === 0 && a.posts === 4 && a.shares === 2, JSON.stringify(a));
t('respuesta inválida => null', extractAccountStats({ message: 'Invalid connected account ID' }, 'linkedin') === null);
const aLi = extractAccountStats({ results: { totals: { posts: 0, likes: 0, followers: 0, impressions: 0, comments: 0 }, breakdowns: { reach: { total: 0 }, engagement: {} } } }, 'linkedin');
t('LinkedIn sin engagement => compartidos null (no se inventa 0)', aLi.shares === null && aLi.impressions === 0);

// --- buildSnapshot
const due = { piece_id: 'p1', ghl_post_id: 'g1', window: '24h', due_at: '2026-10-21T13:00:00.000Z', hours_since_published: 25, missed: false };
const nowMs = pub + 25 * H;
let s = buildSnapshot({ due, platform: 'linkedin', account_id: 'acc', now: nowMs, postFound: true, postMetrics: extractPostMetrics({ insights: { like: 4, comment: 1, share: 0 } }), rawInsights: { like: 4, comment: 1, share: 0 }, accountStats: aLi });
t('snapshot completo => ok', s.status === 'ok' && s.likes === 4 && s.comments === 1 && s.shares === 0 && s.account_impressions_7d === 0 && s.error === null && s.metric_window === '24h', JSON.stringify(s));
s = buildSnapshot({ due, platform: 'linkedin', account_id: 'acc', now: nowMs, postFound: true, postMetrics: extractPostMetrics({}), accountStats: null });
t('sin insights ni estadísticas de cuenta => null (reintento en la siguiente corrida)', s === null || (s.status === 'partial' && s.likes === null));
s = buildSnapshot({ due, platform: 'linkedin', account_id: 'acc', now: nowMs, postFound: true, postMetrics: extractPostMetrics({}), accountStats: aLi });
t('solo estadísticas de cuenta => partial con el motivo', s.status === 'partial' && s.error.includes('post_sin_insights') && s.likes === null && s.account_impressions_7d === 0, JSON.stringify(s));
s = buildSnapshot({ due, platform: 'linkedin', account_id: 'acc', now: nowMs, postFound: false, postMetrics: null, accountStats: null });
t('nada disponible => null (no se guarda basura)', s === null);
s = buildSnapshot({ due: { ...due, missed: true }, platform: 'linkedin', account_id: 'acc', now: nowMs });
t('ventana perdida => fila error ventana_perdida, sin números inventados', s.status === 'error' && s.error.startsWith('ventana_perdida') && s.likes === undefined && s.late === true);

// --- actionsOf
t('actions suma solo los números presentes', actionsOf({ likes: 2, comments: null, shares: 1 }) === 3 && actionsOf({ likes: null, comments: null, shares: null }) === null && actionsOf(null) === null);

// --- buildLearning
const row = (w, o = {}) => ({ metric_window: w, status: 'ok', late: false, likes: 5, comments: 2, shares: 0, account_impressions_7d: 120, account_reach_7d: 90, account_followers: 300, account_posts_7d: 1, ...o });
const pc = { id: 'p1', channel: 'linkedin_profile', category: 'Founder', format: 'texto', score: 81, topic: 'Alta de clientes', published_at: new Date(pub).toISOString(), piece: { hook: 'Hook de prueba', topic: 'Alta de clientes' } };
let L = buildLearning(pc, [row('24h'), row('72h'), row('7d')], [], pub + 200 * H);
t('aprendizaje sin pares: confianza baja y sin base de comparación', L.confidence === 'baja' && L.comparison.basis === 'sin_base' && L.caveats.some((c) => c.includes('Sin base de comparación')), JSON.stringify(L.comparison));
t('aprendizaje: campos pedidos (tema, canal, formato, hook, categoría, score, métricas, funcionó, no funcionó, hipótesis)', L.topic === 'Alta de clientes' && L.channel === 'linkedin_profile' && L.format === 'texto' && L.hook === 'Hook de prueba' && L.category === 'Founder' && L.initial_score === 81 && L.metrics.actions === 7 && Array.isArray(L.worked) && Array.isArray(L.not_worked) && L.hypotheses.length > 0);
t('aprendizaje: comentarios => "funcionó" y regla no repetir hook', L.worked.some((w) => w.includes('2 comentarios')) && L.guidance.some((g) => g.rule === 'no_repetir_hook' && g.text.includes('Hook de prueba')));
t('aprendizaje: hipótesis siempre hedged, nunca causal', L.hypotheses.every((h) => /Hipótesis|no hay base/i.test(h)) && !JSON.stringify(L).includes('porque funcionó'));
t('aprendizaje: métricas por cuenta marcadas como contexto, clics no disponibles', L.metrics.not_available.includes('clicks') && L.metrics.account_context.note.includes('no de esta publicación'));
const peers = [4, 5, 6].map((n, i) => ({ id: 'q' + i, channel: 'linkedin_page', actions: n }));
L = buildLearning(pc, [row('7d', { likes: 20, comments: 5, shares: 3 })], peers, pub + 200 * H);
t('con ≥3 pares de la misma plataforma compara con la mediana', L.comparison.basis === 'misma_plataforma' && L.comparison.peer_median_actions === 5 && L.worked.some((w) => w.includes('mediana')), JSON.stringify(L.comparison));
const igPeers = [9, 9, 9].map((n, i) => ({ id: 'i' + i, channel: 'instagram', actions: n }));
L = buildLearning(pc, [row('7d')], igPeers, pub + 200 * H);
t('no compara LinkedIn con Instagram', L.comparison.basis === 'sin_base' && L.comparison.peers_n === 0);
L = buildLearning(pc, [row('7d', { likes: 0, comments: 0, shares: 0 })], [], pub + 200 * H);
t('cero interacciones => "no funcionó" + hipótesis sobre el score sin afirmar causa + variar ángulo', L.not_worked.some((w) => w.includes('0 interacciones')) && L.hypotheses.some((h) => h.includes('no demostrada')) && L.guidance.some((g) => g.rule === 'variar_angulo'));
L = buildLearning(pc, [], [], pub + 300 * H);
t('sin métricas válidas: lo dice y no inventa', L.metrics.actions === null && L.not_worked.some((w) => w.includes('no se puede evaluar')) && L.caveats.some((c) => c.includes('ninguna ventana')));
L = buildLearning(pc, [row('24h', { late: true }), { metric_window: '72h', status: 'error', error: 'ventana_perdida' }], [], pub + 300 * H);
t('usa la última ventana válida y avisa de tardías/faltantes', L.metrics.used_window === '24h' && L.caveats.some((c) => c.includes('fuera de su tolerancia')) && L.caveats.some((c) => c.includes('Falta la ventana de 7 días')));
const manyPeers = [1, 2, 3, 4, 5].map((n, i) => ({ id: 'z' + i, channel: 'linkedin_profile', actions: n }));
L = buildLearning(pc, [row('7d')], manyPeers, pub + 200 * H);
t('confianza media solo con ≥5 pares y nunca alta', L.confidence === 'media');

// --- summarizeLearnings
const mk = (id, ch, cat, fmt, actions) => ({ id, channel: ch, category: cat, format: fmt, published_at: 'x', learning: { hook: 'H' + id, topic: 'T', initial_score: 80, metrics: { actions }, worked: [], not_worked: [], hypotheses: [], guidance: [], confidence: 'baja' } });
const sm = summarizeLearnings([mk('1', 'linkedin_profile', 'Founder', 'texto', 4), mk('2', 'linkedin_page', 'Noticia', 'texto', 0), mk('3', 'instagram', 'Educativo', 'carrusel', null), { id: '4', learning: null }]);
t('resumen: solo piezas con aprendizaje, hooks a no repetir, grupos tentativos', sm.n_learnings === 3 && sm.do_not_repeat_hooks.length === 3 && sm.by_category.every((g) => g.tentative) && sm.note.includes('misma plataforma'));
t('resumen: promedio ignora piezas sin métricas', sm.by_format.find((g) => g.key === 'carrusel').avg_actions === null && sm.by_format.find((g) => g.key === 'texto').avg_actions === 2);

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
