// Atacama OS v3 · Fase 5 (spec §6.6-1) — puerta de calidad de video con los propios frames. Núcleo puro (sin ffmpeg): criterios,
// nota, ventana de la acción más rápida y armado del qa que viaja con `taller_add_version`.

export const QG_CRITERIA = [
  ['gancho', 'Gancho (primeros 2 s)'], ['lectura', 'Lectura en teléfono (360 px)'], ['movimiento', 'Movimiento'], ['variedad', 'Variedad'],
  ['composicion', 'Composición'], ['marca', 'Fidelidad de marca'], ['sincronia', 'Sincronía'],
];
export const QG_THRESHOLD = 8;

/** Nota = promedio de los 7 criterios (1–10); pasa con promedio ≥ 8, ninguno < 6, determinismo OK y los 3 peores problemas con su segundo. */
export function qgGrade(scores, { determinism, worst, threshold } = {}) {
  const th = Number(threshold) || QG_THRESHOLD;
  const errors = [];
  const s = {};
  QG_CRITERIA.forEach(([k]) => {
    const v = Number(scores && scores[k]);
    if (!Number.isFinite(v) || v < 1 || v > 10) errors.push('falta la nota 1–10 de «' + k + '»');
    else s[k] = Math.round(v * 10) / 10;
  });
  const w = Array.isArray(worst) ? worst.filter((x) => x && Number.isFinite(Number(x.t)) && String(x.issue || '').trim().length >= 3).slice(0, 3).map((x) => ({ t: Math.round(Number(x.t) * 100) / 100, issue: String(x.issue).trim().slice(0, 200) })) : [];
  if (w.length < 3) errors.push('anota los 3 peores problemas con su segundo exacto (t)');
  if (errors.length) return { ok: false, pass: false, errors };
  const vals = Object.values(s);
  const score = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  const low = Object.entries(s).filter(([, v]) => v < 6).map(([k]) => k);
  const det = determinism && determinism.ok === true;
  const why = [];
  if (score < th) why.push('nota ' + score + ' < ' + th);
  if (low.length) why.push('criterio bajo 6: ' + low.join(', '));
  if (!det) why.push('el render no es determinista (o no se probó)');
  return { ok: true, pass: !why.length, score, scores: s, worst: w, why, threshold: th };
}

/** Ventana de ~1 s alrededor del frame con mayor cambio (puntajes de escena de ffmpeg). */
export function qgFastestWindow(sceneScores, duration, span) {
  const d = Number(duration) || 0, sp = Number(span) || 1;
  const list = (sceneScores || []).filter((x) => x && Number.isFinite(x.t) && Number.isFinite(x.score));
  const top = list.reduce((m, x) => (!m || x.score > m.score ? x : m), null);
  const c = top ? top.t : d / 2;
  const start = Math.max(0, Math.min(Math.max(0, d - sp), c - sp / 2));
  return { center: Math.round(c * 1000) / 1000, start: Math.round(start * 1000) / 1000, end: Math.round(Math.min(d || start + sp, start + sp) * 1000) / 1000, peak: top ? top.score : null };
}

/** Lee la salida de `ffmpeg … metadata=print` (lavfi.scene_score por frame). */
export function qgParseScenes(text) {
  const out = [];
  let t = null;
  String(text || '').split(/\r?\n/).forEach((l) => {
    const m = l.match(/pts_time:([0-9.]+)/);
    if (m) t = Number(m[1]);
    const s = l.match(/lavfi\.scene_score=([0-9.]+)/);
    if (s && t != null) out.push({ t, score: Number(s[1]) });
  });
  return out;
}

/** El qa que se guarda en la versión (content_versions.qa) y que exige 29/30 para un reel del carril pc (nota ≥ 8). */
export function qgQa(grade, checks) {
  return { gate: 'motion-v2', score: grade.score, pass: grade.pass, scores: grade.scores, worst: grade.worst, why: grade.why, checks: checks || {}, at: new Date().toISOString() };
}
