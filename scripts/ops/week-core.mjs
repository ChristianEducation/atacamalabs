/**
 * Atacama OS v3 · Fase 7 — «Mi semana» (spec §8.6, anexo §H2) y Costos. Núcleo PURO y AUTOCONTENIDO (n8n «25 Atacama Ops», acción `week_status`).
 * El ritual por día vive en content_config.week_ritual (editable desde /ops). Nada se inventa: cada tarea se marca hecha con un dato real.
 */

export function wkDefaultRitual() {
  return { lun: ['ideas', 'correos'], mar: ['reuniones'], mie: ['competencia'], jue: ['revisar_piezas'], vie: ['cierre'] };
}

export function wkTasks() {
  return { ideas: 'Decidir las ideas de la semana', correos: 'Revisar los borradores de correo', reuniones: 'Reuniones del día', competencia: 'Leer el informe de competencia', revisar_piezas: 'Revisar piezas del Taller', cierre: 'Cierre: semana siguiente programada' };
}

/** Valida un ritual editado: cada día lun–vie con 0–4 tareas conocidas, sin repetir una tarea en dos días. */
export function wkValidateRitual(r) {
  const days = ['lun', 'mar', 'mie', 'jue', 'vie'];
  const known = Object.keys(wkTasks());
  if (!r || typeof r !== 'object') return { ok: false, message: 'Ritual inválido.' };
  const out = {}, seen = new Set();
  for (const d of days) {
    const list = Array.isArray(r[d]) ? r[d] : [];
    if (list.length > 4) return { ok: false, message: 'Máximo 4 tareas por día.' };
    for (const t of list) {
      if (!known.includes(t)) return { ok: false, message: 'Tarea desconocida: ' + t };
      if (seen.has(t)) return { ok: false, message: 'La tarea «' + wkTasks()[t] + '» está en dos días.' };
      seen.add(t);
    }
    out[d] = list.slice();
  }
  return { ok: true, value: out };
}

/** Lunes (YYYY-MM-DD) de la semana de `ms` en la zona dada, y fecha de cada día lun–vie. */
export function wkDays(ms, tz) {
  const ymd = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: tz });
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date(ms)));
  const mondayMs = ms - ((wd + 6) % 7) * 86400000;
  return ['lun', 'mar', 'mie', 'jue', 'vie'].map((k, i) => ({ key: k, date: ymd(mondayMs + i * 86400000) }));
}

/** d = { now, tz, ritual, ideas, messages, meetings, intel_at, pieces } */
export function weekView(d) {
  const tz = d.tz || 'America/Santiago';
  const now = d.now;
  const ritual = (d.ritual && wkValidateRitual(d.ritual).ok) ? d.ritual : wkDefaultRitual();
  const names = wkTasks();
  const days = wkDays(now, tz);
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: tz });
  const monday = days[0].date, friday = days[4].date;
  const nextMonday = new Date(Date.parse(monday + 'T12:00:00Z') + 7 * 86400000).toISOString().slice(0, 10);
  const inWeek = (iso) => { if (!iso) return false; const x = new Date(Date.parse(iso)).toLocaleDateString('en-CA', { timeZone: tz }); return x >= monday && x <= days[4].date; };
  const ideasNext = (d.ideas || []).filter((i) => i.week_start === nextMonday && !i.is_test);
  const proposed = ideasNext.filter((i) => ['proposed', 'changed'].includes(i.status)).length;
  const drafts = (d.messages || []).filter((m) => m.direction === 'outbound' && m.status === 'draft').length;
  const pieces = (d.pieces || []).filter((p) => !p.is_test && p.taller_status);
  const toReview = pieces.filter((p) => p.taller_status === 'para_revisar').length;
  const closing = pieces.filter((p) => p.needs_by && inWeek(p.needs_by) && p.taller_status !== 'descartada');
  const scheduled = closing.filter((p) => ['programada', 'programada_pendiente_de_clic', 'publicada'].includes(p.taller_status)).length;
  const meetings = (d.meetings || []).filter((m) => m.meeting_start).map((m) => ({ at: m.meeting_start, day: new Date(Date.parse(m.meeting_start)).toLocaleDateString('en-CA', { timeZone: tz }), who: [m.name, m.company].filter(Boolean).join(' · ') || 'Reunión' }));
  const intelThisWeek = Boolean(d.intel_at && inWeek(d.intel_at));
  const light = closing.length === 0 ? 'sin_datos' : scheduled === closing.length ? 'verde' : scheduled >= Math.ceil(closing.length * 0.6) ? 'amarillo' : 'rojo';
  const task = (id, date) => {
    if (id === 'ideas') return { id, label: names[id] + ' (' + nextMonday + ')', done: ideasNext.length > 0 && proposed === 0, detail: ideasNext.length ? (proposed ? proposed + ' por decidir' : 'todas decididas') : 'aún no llega la propuesta', href: '/ops?view=ideas' };
    if (id === 'correos') return { id, label: names[id], done: drafts === 0, detail: drafts ? drafts + ' borradores esperando' : 'sin borradores', href: '/ops?view=aprobaciones&filter=correos' };
    if (id === 'reuniones') { const m = meetings.filter((x) => x.day === date); return { id, label: names[id], done: date < today, detail: m.length ? m.length + (m.length === 1 ? ' reunión' : ' reuniones') : 'sin reuniones agendadas', href: null, meetings: m }; }
    if (id === 'competencia') return { id, label: names[id], done: intelThisWeek, detail: intelThisWeek ? 'informe listo esta semana' : 'aún no llega el informe de esta semana', href: '/ops?view=contenido' };
    if (id === 'revisar_piezas') return { id, label: names[id], done: toReview === 0, detail: toReview ? toReview + ' para revisar' : 'nada pendiente', href: '/ops?view=taller' };
    if (id === 'cierre') return { id, label: names[id] + ' ' + scheduled + ' de ' + closing.length, done: closing.length > 0 && scheduled === closing.length, detail: light === 'verde' ? 'lista' : light === 'sin_datos' ? 'sin piezas con cierre esta semana' : (closing.length - scheduled) + ' por programar', href: '/ops?view=taller', light };
    return { id, label: id, done: false, detail: '', href: null };
  };
  const out = days.map((x) => ({ key: x.key, label: { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes' }[x.key], date: x.date, today: x.date === today, tasks: (ritual[x.key] || []).map((t) => task(t, x.date)) }));
  const all = out.flatMap((x) => x.tasks);
  return { generated_at: new Date(now).toISOString(), week: monday, friday, ritual, days: out, progress: { done: all.filter((t) => t.done).length, total: all.length },
    meetings_today: meetings.filter((m) => m.day === today), close: { scheduled, total: closing.length, light } };
}

/** Costos: créditos de Higgsfield (saldo y gasto semanal de Atacama OS) y créditos por pieza del Taller. */
export function costsView(d) {
  const hg = d.higgs && typeof d.higgs === 'object' ? d.higgs : null;
  const pieces = (d.pieces || []).filter((p) => !p.is_test && Number(p.credits_spent) > 0).sort((a, b) => Number(b.credits_spent) - Number(a.credits_spent));
  return { higgs: hg ? { balance: hg.balance == null ? null : Number(hg.balance), spent_week: Number(hg.spent_week) || 0, cap: Number(hg.cap) || 200, reserve: Number(hg.reserve) || 300, week: hg.week || null, at: hg.at || null } : null,
    pieces: pieces.slice(0, 30).map((p) => ({ id: p.id, topic: p.topic || '—', credits: Number(p.credits_spent), status: p.taller_status || p.status || null })),
    total_pieces: pieces.reduce((a, p) => a + Number(p.credits_spent), 0), note: 'Solo cuenta lo que Atacama OS gastó (registro del guardián). Tu uso en la web de Higgsfield no entra aquí, pero sí baja el saldo.' };
}
