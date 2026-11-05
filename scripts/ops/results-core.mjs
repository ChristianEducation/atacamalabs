// Atacama OS v3 · Fase 8 — Contenido → ventas e iteraciones por pieza (spec §8.3). Núcleo puro, sin cifras inventadas:
// solo cuenta lo que existe en Supabase (contactos registrados por pieza, formularios del recurso, reuniones agendadas, métricas de GHL).
// Oportunidades y ganados viven en GHL y no se infieren aquí. Funciones autocontenidas (se incrustan con toString).

export function rsSlugOf(page) {
  const m = String(page || '').match(/\/recursos\/([a-z0-9]+(?:-[a-z0-9]+)*)/);
  return m ? m[1] : null;
}

export function rsPieceContactInput(req) {
  const name = String(req.contact_name || '').trim(), handle = String(req.handle || '').trim().replace(/^@/, ''), kw = String(req.keyword || '').trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(String(req.piece_id || ''))) return { error: 'falta_pieza', message: 'piece_id inválido.' };
  if (name.length < 2 || name.length > 80) return { error: 'falta_nombre', message: 'Escribe el nombre (2–80 caracteres).' };
  if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle)) return { error: 'usuario_invalido', message: 'El usuario de Instagram solo lleva letras, números, punto y guion bajo.' };
  if (kw && !/^[a-z0-9ñáéíóú-]{2,30}$/.test(kw)) return { error: 'palabra_invalida', message: 'La palabra clave va en una sola palabra (2–30 letras).' };
  return { ok: true, name, handle: handle || null, keyword: kw || null };
}

/** Reporte por pieza y por recurso + resumen del lunes + iteraciones por pieza. */
export function resultsView({ now, pieces, resources, attributions, leads, metrics, versions, feedback, days }) {
  const D = Number(days) > 0 ? Number(days) : 60, since = now - D * 86400000;
  const real = (pieces || []).filter((p) => p && !p.is_test);
  const res = Object.fromEntries((resources || []).map((r) => [r.id, r]));
  const resBySlug = Object.fromEntries((resources || []).map((r) => [r.slug, r]));
  const att = (attributions || []).filter((a) => !a.is_test);
  const web = (leads || []).filter((l) => l.source_section === 'recurso-cierre' && rsSlugOf(l.source_page));
  const lastMetric = {};
  (metrics || []).forEach((m) => { const k = m.content_piece_id, rank = { '24h': 1, '72h': 2, '7d': 3 }[m.metric_window] || 0; if (!lastMetric[k] || rank > lastMetric[k].rank) lastMetric[k] = { rank, likes: m.likes, comments: m.comments, shares: m.shares, window: m.metric_window }; });
  const at = (p) => p.published_at || p.scheduled_at || p.created_at;
  const shown = real.filter((p) => Date.parse(at(p)) >= since && (p.published_at || ['programada', 'publicada'].includes(p.taller_status) || att.some((a) => a.piece_id === p.id)));
  const piecesOut = shown.map((p) => {
    const r = p.resource_id ? res[p.resource_id] : null;
    const dm = att.filter((a) => a.piece_id === p.id);
    const w = r ? web.filter((l) => rsSlugOf(l.source_page) === r.slug && Date.parse(l.created_at) >= Date.parse(at(p))) : [];
    const mt = lastMetric[p.id] || null;
    return { id: p.id, topic: p.topic || '(sin título)', channel: p.channel || null, format: p.format || null, at: at(p), keyword: p.keyword || (p.idea && p.idea.keyword) || null,
      resource: r ? { slug: r.slug, name: r.name } : null, contacts_dm: dm.length, contacts_web: w.length, meetings: w.filter((l) => l.meeting_start).length,
      metrics: mt ? { likes: mt.likes, comments: mt.comments, shares: mt.shares, window: mt.window } : null };
  }).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const resOut = (resources || []).filter((r) => r.status === 'active' || web.some((l) => rsSlugOf(l.source_page) === r.slug)).map((r) => {
    const w = web.filter((l) => rsSlugOf(l.source_page) === r.slug && Date.parse(l.created_at) >= since);
    const pcs = real.filter((p) => p.resource_id === r.id).map((p) => p.id);
    return { slug: r.slug, name: r.name, web_leads: w.length, meetings: w.filter((l) => l.meeting_start).length, contacts_dm: att.filter((a) => a.resource_id === r.id || pcs.includes(a.piece_id)).length, pieces: pcs.length };
  }).sort((a, b) => b.web_leads + b.contacts_dm - (a.web_leads + a.contacts_dm) || a.slug.localeCompare(b.slug));
  const unknownWeb = web.filter((l) => !resBySlug[rsSlugOf(l.source_page)]).length;
  return { generated_at: new Date(now).toISOString(), days: D, pieces: piecesOut, resources: resOut, unknown_web: unknownWeb, summary: rsMondaySummary({ now, pieces: real, attributions: att, leads: web, resources }),
    iterations: rsIterations({ pieces: real, versions, feedback }).slice(0, 30),
    note: 'Atribución parcial: los comentarios y mensajes de Instagram no se leen solos. Registra cada contacto con «Registrar contacto de esta pieza». Oportunidades y ganados se ven en GHL.' };
}

/** Una línea por pieza con resultados de la semana pasada (lunes a domingo). Sin datos, lo dice. */
export function rsMondaySummary({ now, pieces, attributions, leads, resources }) {
  const d = new Date(now), dow = (d.getUTCDay() + 6) % 7;
  const mon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - (dow + 7) * 86400000, end = mon + 7 * 86400000;
  const inW = (t) => { const x = Date.parse(t); return x >= mon && x < end; };
  const byRes = Object.fromEntries((resources || []).map((r) => [r.id, r]));
  const lines = [];
  (pieces || []).forEach((p) => {
    const dm = (attributions || []).filter((a) => a.piece_id === p.id && inW(a.created_at)).length;
    const r = p.resource_id ? byRes[p.resource_id] : null;
    const w = r ? (leads || []).filter((l) => rsSlugOf(l.source_page) === r.slug && inW(l.created_at)) : [];
    const contacts = dm + w.length, meet = w.filter((l) => l.meeting_start).length;
    if (contacts || meet) lines.push({ piece_id: p.id, contacts, meetings: meet, text: '«' + String(p.topic || 'pieza').slice(0, 60) + '» trajo ' + contacts + (contacts === 1 ? ' contacto' : ' contactos') + (meet ? ' y ' + meet + (meet === 1 ? ' reunión' : ' reuniones') : '') + '.' });
  });
  lines.sort((a, b) => b.contacts + b.meetings * 3 - (a.contacts + a.meetings * 3));
  return { week: new Date(mon).toISOString().slice(0, 10), lines: lines.slice(0, 8), empty_text: lines.length ? null : 'La semana pasada ninguna pieza registró contactos (atribución parcial: faltan los contactos sin registrar).' };
}

/** Iteraciones por pieza: versiones, rondas de cambios, créditos y días hasta quedar lista. */
export function rsIterations({ pieces, versions, feedback }) {
  return (pieces || []).filter((p) => (versions || []).some((v) => v.piece_id === p.id)).map((p) => {
    const vs = (versions || []).filter((v) => v.piece_id === p.id && !v.is_test).sort((a, b) => a.version_no - b.version_no);
    const fb = (feedback || []).filter((f) => f.piece_id === p.id && !f.is_test);
    const first = vs[0] ? Date.parse(vs[0].created_at) : null, last = vs.length ? Date.parse(vs[vs.length - 1].created_at) : null;
    return { id: p.id, topic: p.topic || '(sin título)', format: p.format || null, status: p.taller_status || null, versions: vs.length, feedback: fb.length,
      credits: Math.round(vs.reduce((s, v) => s + Number(v.cost_credits || 0), 0) * 100) / 100, days: first && last ? Math.round(((last - first) / 86400000) * 10) / 10 : 0, first_try: vs.length === 1 && fb.length === 0 };
  }).sort((a, b) => b.versions - a.versions || b.feedback - a.feedback);
}
