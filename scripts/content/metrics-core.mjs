/**
 * Atacama OS · Content Engine — núcleo de MÉTRICAS y APRENDIZAJE (funciones puras).
 *
 * Igual que engine-core.mjs / signal-core.mjs: cada función es AUTOCONTENIDA (sin imports) para probarse con
 * `metrics-core.test.mjs` e incrustarse tal cual en los workflows n8n «15 Content Metrics» y «16 Content Learnings».
 *
 * Qué entrega GHL de verdad (verificado el 7-oct-2026 contra la API):
 *   - Por publicación: `post.insights` (en los posts que GHL conoce: like / share / comment). Clics: NO existen.
 *   - Por CUENTA: `POST /social-media-posting/statistics?locationId=` con `profileIds` = `profileId` de la cuenta (no `id`),
 *     siempre los últimos 7 días por día: publicaciones, impresiones, alcance, likes, comentarios, compartidos, seguidores.
 *   → impresiones / alcance / seguidores son de la CUENTA y no se atribuyen a una publicación (si hubo varias ese día, no se puede separar).
 *   → No existe una métrica común entre Instagram y LinkedIn: se guardan las originales; `actions` (me gusta + comentarios + compartidos)
 *     es solo un comparador orientativo DENTRO de la misma plataforma.
 */

/** Hash corto (FNV-1a) del texto normalizado: detecta si un humano editó el texto en GHL. */
export function summaryHash(text) {
  const n = String(text == null ? '' : text).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < n.length; i++) { h ^= n.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * ¿Qué snapshots corresponde tomar ahora? (sin consultar GHL).
 * pieces: filas published {id, ghl_post_id, channel, published_at, learning, is_test}; metrics: filas {content_piece_id, metric_window, status}.
 * Una ventana ya registrada (cualquier estado) NO se repite. Si la ventana venció más allá de su tolerancia se registra como perdida (no se
 * inventa una medición tardía); dentro de la tolerancia se captura normalmente.
 */
export function planMetrics(pieces, metrics, now) {
  const WINDOWS = [{ w: '24h', h: 24, grace: 12 }, { w: '72h', h: 72, grace: 24 }, { w: '7d', h: 168, grace: 48 }];
  const have = {};
  (Array.isArray(metrics) ? metrics : []).forEach((m) => { (have[m.content_piece_id] = have[m.content_piece_id] || {})[m.metric_window] = m.status || 'ok'; });
  const snapshots = [];
  const learn = [];
  (Array.isArray(pieces) ? pieces : []).forEach((p) => {
    if (!p || !p.ghl_post_id || !p.published_at) return;
    const pub = Date.parse(p.published_at);
    if (!Number.isFinite(pub)) return;
    const mine = have[p.id] || {};
    WINDOWS.forEach((win) => {
      if (mine[win.w]) return;
      const due = pub + win.h * 3600000;
      if (now < due) return;
      const hours = Math.round(((now - pub) / 3600000) * 100) / 100;
      const expired = now > due + win.grace * 3600000;
      snapshots.push({ piece_id: p.id, ghl_post_id: p.ghl_post_id, channel: p.channel, is_test: p.is_test === true, window: win.w, due_at: new Date(due).toISOString(), hours_since_published: hours, missed: expired });
    });
    const sevenDone = Boolean(mine['7d']);
    const sevenExpired = now > pub + (168 + 48) * 3600000;
    if (!p.learning && (sevenDone || sevenExpired)) learn.push({ piece_id: p.id });
  });
  return { snapshots, learn };
}

/** Lee `post.insights` de GHL. Solo mapea lo que existe; todo lo demás queda en `extra` (nunca se inventa un equivalente). */
export function extractPostMetrics(post) {
  const ins = post && post.insights && typeof post.insights === 'object' ? post.insights : null;
  const num = (...vals) => { for (const v of vals) { if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v); if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v); } return null; };
  if (!ins) return { likes: null, comments: null, shares: null, extra: {}, available: [] };
  const out = { likes: num(ins.like, ins.likes), comments: num(ins.comment, ins.comments), shares: num(ins.share, ins.shares), extra: {} };
  const known = ['like', 'likes', 'comment', 'comments', 'share', 'shares'];
  Object.keys(ins).forEach((k) => { if (!known.includes(k) && typeof ins[k] === 'number') out.extra[k] = ins[k]; });
  out.available = ['likes', 'comments', 'shares'].filter((k) => out[k] !== null).concat(Object.keys(out.extra));
  return out;
}

/** Lee la respuesta de `statistics` (últimos 7 días de UNA cuenta). Devuelve contexto de cuenta, no de la publicación. */
export function extractAccountStats(res, platform) {
  const r = res && res.results ? res.results : res;
  if (!r || typeof r !== 'object' || !r.totals) return null;
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  const eng = r.breakdowns && r.breakdowns.engagement && r.breakdowns.engagement[platform] ? r.breakdowns.engagement[platform] : {};
  return {
    impressions: n(r.totals.impressions), reach: n(r.breakdowns && r.breakdowns.reach ? r.breakdowns.reach.total : null), followers: n(r.totals.followers), posts: n(r.totals.posts),
    likes: n(r.totals.likes), comments: n(r.totals.comments), shares: n(eng.shares),
    daily_impressions: Array.isArray(r.postPerformance && r.postPerformance.impressions) ? r.postPerformance.impressions : null, day_range: r.dayRange || null,
  };
}

/**
 * Arma la fila de `content_metrics`. Devuelve null si no hay nada que guardar (fallo transitorio: se reintenta en la siguiente corrida).
 * `missed` = ventana vencida sin captura: se registra como error permanente para no repetirla ni inventar un dato tardío.
 */
export function buildSnapshot(input) {
  const d = input.due || {};
  const base = { content_piece_id: d.piece_id, ghl_post_id: d.ghl_post_id, platform: input.platform, account_id: input.account_id, metric_window: d.window, due_at: d.due_at, captured_at: new Date(input.now).toISOString(), hours_since_published: d.hours_since_published, late: false };
  if (d.missed) return { ...base, status: 'error', error: 'ventana_perdida: no se capturó dentro de la tolerancia; no se estima', late: true, raw_metrics: { reason: 'missed' } };
  const pm = input.postMetrics || { likes: null, comments: null, shares: null, extra: {}, available: [] };
  const acc = input.accountStats || null;
  const hasPost = pm.available && pm.available.length > 0;
  if (!input.postFound && !acc) return null;
  const errors = [];
  if (!input.postFound) errors.push('post_no_encontrado');
  else if (!hasPost) errors.push('post_sin_insights');
  if (!acc) errors.push('sin_estadisticas_de_cuenta');
  return {
    ...base, status: errors.length ? 'partial' : 'ok', error: errors.length ? errors.join(',') : null,
    likes: pm.likes, comments: pm.comments, shares: pm.shares,
    account_impressions_7d: acc ? acc.impressions : null, account_reach_7d: acc ? acc.reach : null, account_followers: acc ? acc.followers : null, account_posts_7d: acc ? acc.posts : null,
    raw_metrics: { post_insights: input.postFound && input.rawInsights ? input.rawInsights : null, post_insights_extra: pm.extra || {}, account_stats: acc },
  };
}

/** Interacciones de la propia publicación (me gusta + comentarios + compartidos). Solo comparable DENTRO de una plataforma. */
export function actionsOf(row) {
  if (!row) return null;
  const v = [row.likes, row.comments, row.shares].filter((x) => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
}

/**
 * Aprendizaje estructurado (determinista, sin LLM) a los 7 días. NO afirma causalidad: lo que no demuestran los datos queda como
 * hipótesis explícita; con pocos pares de comparación la confianza es siempre baja.
 * piece: fila content_pieces; rows: filas content_metrics de la pieza; peers: [{id, channel, category, format, actions}] de OTRAS piezas con 7d.
 */
export function buildLearning(piece, rows, peers, now) {
  const sorted = ['24h', '72h', '7d'];
  const byWin = {};
  (Array.isArray(rows) ? rows : []).forEach((r) => { byWin[r.metric_window] = r; });
  const windows = {};
  sorted.forEach((w) => { const r = byWin[w]; windows[w] = r ? { status: r.status, late: r.late === true, likes: r.likes ?? null, comments: r.comments ?? null, shares: r.shares ?? null, actions: actionsOf(r) } : null; });
  const last = byWin['7d'] && byWin['7d'].status !== 'error' ? byWin['7d'] : (byWin['72h'] && byWin['72h'].status !== 'error' ? byWin['72h'] : (byWin['24h'] && byWin['24h'].status !== 'error' ? byWin['24h'] : null));
  const lastWin = last ? last.metric_window : null;
  const actions = last ? actionsOf(last) : null;
  const pj = piece.piece || {};
  const hook = (pj.hook || piece.hook || '').toString();
  const platform = piece.channel === 'instagram' ? 'instagram' : 'linkedin';
  const samePlatform = (Array.isArray(peers) ? peers : []).filter((p) => p && p.id !== piece.id && (p.channel === 'instagram' ? 'instagram' : 'linkedin') === platform && typeof p.actions === 'number');
  const caveats = ['Las impresiones, el alcance y los seguidores son de la cuenta, no de esta publicación.', 'GHL no entrega clics.'];
  const worked = [];
  const notWorked = [];
  const hypotheses = [];
  const guidance = [];
  const comparison = { basis: 'sin_base', peers_n: samePlatform.length, peer_median_actions: null, ratio: null };

  if (lastWin !== '7d') caveats.push(lastWin ? 'Falta la ventana de 7 días: el aprendizaje usa la última ventana disponible (' + lastWin + ').' : 'No hay ninguna ventana de métricas válida: no se puede evaluar el desempeño.');
  Object.keys(windows).forEach((w) => { if (windows[w] && windows[w].late) caveats.push('La ventana ' + w + ' se capturó fuera de su tolerancia.'); });

  if (actions === null) {
    notWorked.push('GHL no entregó interacciones de esta publicación: no se puede evaluar.');
  } else {
    const c = last.comments;
    if (actions === 0) notWorked.push('0 interacciones (me gusta, comentarios y compartidos) a ' + lastWin + '.');
    if (typeof c === 'number' && c > 0) worked.push('Generó ' + c + ' comentario' + (c === 1 ? '' : 's') + ' a ' + lastWin + '.');
    if (typeof last.shares === 'number' && last.shares > 0) worked.push('Fue compartida ' + last.shares + ' vez' + (last.shares === 1 ? '' : 'es') + ' a ' + lastWin + '.');
    if (samePlatform.length >= 3) {
      const a = samePlatform.map((p) => p.actions).sort((x, y) => x - y);
      const mid = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
      comparison.basis = 'misma_plataforma'; comparison.peer_median_actions = mid; comparison.ratio = mid > 0 ? Math.round((actions / mid) * 100) / 100 : null;
      if (mid > 0 && actions >= mid * 1.25) worked.push('Más interacciones (' + actions + ') que la mediana de tus publicaciones en ' + platform + ' (' + mid + ').');
      else if (mid > 0 && actions <= mid * 0.75) notWorked.push('Menos interacciones (' + actions + ') que la mediana de tus publicaciones en ' + platform + ' (' + mid + ').');
      else if (mid === 0 && actions > 0) worked.push('Primera con interacciones entre tus publicaciones en ' + platform + '.');
      else if (!worked.length && !notWorked.length) caveats.push('Interacciones dentro del rango habitual de tus publicaciones en ' + platform + '.');
    } else {
      caveats.push('Sin base de comparación suficiente en ' + platform + ' (pares: ' + samePlatform.length + ', se piden 3): no se puede decir si el resultado es alto o bajo.');
    }
  }
  const score = Number(piece.score);
  if (Number.isFinite(score) && actions === 0 && score >= 80) hypotheses.push('Hipótesis (no demostrada): el score inicial (' + score + ') mide calidad editorial, no interés; con una sola publicación no se puede saber si el tema, el canal o el horario influyeron.');
  if (piece.category === 'Founder' && typeof (last && last.comments) === 'number' && last.comments > 0) hypotheses.push('Hipótesis (no demostrada): el texto en primera persona con una pregunta final podría invitar a comentar; hay que repetir el patrón para confirmarlo.');
  if (piece.format === 'carrusel' && typeof (last && last.shares) === 'number' && last.shares > 0) hypotheses.push('Hipótesis (no demostrada): los carruseles podrían guardarse o compartirse más que el texto; falta comparar con más piezas.');
  if (!hypotheses.length) hypotheses.push('Con ' + (samePlatform.length + 1) + ' publicación(es) medida(s) en ' + platform + ' no hay base para una hipótesis útil; seguir acumulando datos antes de cambiar el enfoque.');

  if (hook) guidance.push({ rule: 'no_repetir_hook', text: 'No repetir exactamente este hook: «' + hook + '».' });
  if (actions === 0) guidance.push({ rule: 'variar_angulo', text: 'Probar otro ángulo o canal antes de repetir este tema (muestra n=1, no concluyente).' });
  if (typeof (last && last.comments) === 'number' && last.comments > 0) guidance.push({ rule: 'conservar_pregunta', text: 'La pregunta final generó conversación: conservar el patrón y medirlo de nuevo.' });

  return {
    version: 1, generated_at: new Date(now).toISOString(), piece_id: piece.id, topic: piece.topic || pj.topic || null, channel: piece.channel, platform, format: piece.format, category: piece.category, hook,
    initial_score: Number.isFinite(score) ? score : null, published_at: piece.published_at || null,
    metrics: { windows, used_window: lastWin, actions, available: ['likes', 'comments', 'shares'].filter((k) => last && typeof last[k] === 'number'), not_available: ['clicks', 'impresiones por publicación', 'alcance por publicación'],
      account_context: last ? { impressions_7d: last.account_impressions_7d ?? null, reach_7d: last.account_reach_7d ?? null, followers: last.account_followers ?? null, posts_7d: last.account_posts_7d ?? null, note: 'Estadísticas de la cuenta (últimos 7 días al capturar), no de esta publicación.' } : null },
    comparison, worked, not_worked: notWorked, hypotheses, guidance, caveats, confidence: samePlatform.length >= 5 ? 'media' : 'baja',
  };
}

/** Resumen compacto para Hermes / Content Engine: aprendizajes + agregados orientativos. Nunca presenta n pequeño como conclusión. */
export function summarizeLearnings(pieces) {
  const list = (Array.isArray(pieces) ? pieces : []).filter((p) => p && p.learning);
  const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100 : null);
  const groupBy = (keyFn) => {
    const g = {};
    list.forEach((p) => { const k = keyFn(p); if (!k) return; (g[k] = g[k] || []).push(p); });
    return Object.keys(g).sort().map((k) => {
      const acts = g[k].map((p) => p.learning.metrics && p.learning.metrics.actions).filter((v) => typeof v === 'number');
      return { key: k, n: g[k].length, n_with_actions: acts.length, avg_actions: avg(acts), tentative: g[k].length < 5 };
    });
  };
  return {
    n_learnings: list.length,
    note: 'Orientativo. Las interacciones (me gusta + comentarios + compartidos) solo se comparan dentro de la misma plataforma; con n < 5 es tentativo y no demuestra causalidad.',
    do_not_repeat_hooks: list.map((p) => p.learning.hook).filter(Boolean),
    by_channel: groupBy((p) => p.channel), by_category: groupBy((p) => p.category), by_format: groupBy((p) => p.format),
    learnings: list.map((p) => ({ piece_id: p.id, published_at: p.published_at, channel: p.channel, category: p.category, format: p.format, topic: p.learning.topic, hook: p.learning.hook, initial_score: p.learning.initial_score,
      actions: p.learning.metrics ? p.learning.metrics.actions : null, worked: p.learning.worked, not_worked: p.learning.not_worked, hypotheses: p.learning.hypotheses, guidance: p.learning.guidance, confidence: p.learning.confidence })),
  };
}
