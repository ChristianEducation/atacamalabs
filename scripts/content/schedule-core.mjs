/**
 * Atacama OS · Content Engine — propuesta de fecha de publicación (núcleo puro).
 *
 * Sustituye al antiguo fallback «+7 días a las 10:00». REGLAS (decididas por Christian el 7-oct-2026):
 *  - Contenido reciente (categoría Noticia): el siguiente hueco disponible, idealmente dentro de 24 h.
 *  - Contenido normal (Educativo, Caso, Demo, Founder y demás): dentro de 48 h.
 *  - Evergreen: como máximo 72 h.
 *  - NUNCA hay un fallback a +7 días. Una fecha sugerida posterior a 72 h solo se acepta si viene con una justificación escrita
 *    (`schedule_justification`, ≥ 20 caracteres) y dentro de 30 días; sin justificación se ignora y se usa el siguiente hueco.
 *  - Zona horaria siempre America/Santiago; los huecos son horas locales fijas por cuenta.
 *  - Máximo UNA publicación por cuenta y día (calendario de Chile): si ya hay otra programada, publicada ese día o propuesta,
 *    se pasa al siguiente hueco/día razonable. Se consideran los posts de Atacama OS y los manuales de Christian.
 *  - Esto es solo una PROPUESTA: el post nace `in_review` y no se publica sin aprobación humana en GHL.
 *
 * Funciones autocontenidas (sin imports ni constantes de módulo): se incrustan con Function.prototype.toString en el nodo Code
 * «Evaluate» del workflow n8n «12 Content Intake».
 */

export function schedTzOffsetMs(utcMs, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs));
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utcMs;
}

/** Hora local (y-m-d hh:mm en `tz`) → milisegundos UTC, respetando el horario de verano. */
export function schedZonedToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - schedTzOffsetMs(guess, tz);
  return guess - schedTzOffsetMs(first, tz);
}

/** Clave de día de calendario (YYYY-MM-DD) en `tz`. */
export function schedDayKey(ms, tz) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz });
}

/**
 * o = { now (ms), channel, category, suggestion (ISO|null), justification (texto|null), taken: [{ account, at (ms) }], account, tz? }
 * Devuelve { iso, ms, label, tier, hours_ahead, within_target, target_hours, source: 'suggestion'|'slot', warnings[] }.
 */
export function proposeSlot(o) {
  const tz = o.tz || 'America/Santiago';
  const now = Number(o.now);
  const SLOTS = { instagram: ['12:30', '19:00'], linkedin_page: ['10:00', '15:00'], linkedin_profile: ['09:00', '16:00'] };
  const cat = String(o.category || '');
  const tier = cat === 'Noticia' ? { name: 'noticia', minLeadH: 3, targetH: 24 } : cat === 'Evergreen' ? { name: 'evergreen', minLeadH: 12, targetH: 72 } : { name: 'normal', minLeadH: 12, targetH: 48 };
  const minMs = now + tier.minLeadH * 3600000;
  const warnings = [];
  const takenDays = {};
  (o.taken || []).forEach((t) => { if (t && Number.isFinite(Number(t.at)) && (!t.account || t.account === o.account)) takenDays[schedDayKey(Number(t.at), tz)] = true; });
  const free = (ms) => !takenDays[schedDayKey(ms, tz)];
  const label = (ms) => new Date(ms).toLocaleString('es-CL', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const done = (ms, source) => ({ iso: new Date(ms).toISOString(), ms, label: label(ms), tier: tier.name, hours_ahead: Math.round((ms - now) / 360000) / 10, target_hours: tier.targetH, within_target: ms - now <= tier.targetH * 3600000, source, warnings });
  // 1) fecha sugerida por Hermes: solo si es válida, está libre y cumple el plazo (o viene justificada)
  const sug = o.suggestion ? Date.parse(o.suggestion) : NaN;
  if (Number.isFinite(sug)) {
    const why = String(o.justification || '').trim();
    if (sug < minMs) warnings.push('sugerencia_muy_cercana_ignorada');
    else if (!free(sug)) warnings.push('sugerencia_choca_con_otra_publicacion_de_la_cuenta');
    else if (sug - now > 72 * 3600000 && !(why.length >= 20 && sug - now <= 30 * 86400000)) warnings.push('sugerencia_posterior_a_72h_sin_justificacion_ignorada');
    else return done(sug, 'suggestion');
  }
  // 2) siguiente hueco libre de la cuenta, día por día (hora local de Chile)
  const slots = SLOTS[o.channel] || SLOTS.linkedin_page;
  const [y, m, d] = schedDayKey(now, tz).split('-').map(Number);
  for (let k = 0; k <= 21; k++) {
    const day = new Date(Date.UTC(y, m - 1, d + k));
    for (const s of slots) {
      const [hh, mm] = s.split(':').map(Number);
      const ms = schedZonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hh, mm, tz);
      if (ms >= minMs && free(ms)) { const r = done(ms, 'slot'); if (!r.within_target) r.warnings.push('sin_hueco_dentro_de_' + tier.targetH + 'h_por_otras_publicaciones_de_la_cuenta'); return r; }
    }
  }
  // 3) cuenta saturada 3 semanas: se propone el primer hueco aunque choque (nunca un +7 ciego) y se avisa
  const fb = schedZonedToUtc(y, m, d + 1, Number(slots[0].split(':')[0]), Number(slots[0].split(':')[1]), tz);
  const r = done(fb, 'slot'); r.warnings.push('cuenta_saturada_21_dias_revisar_a_mano'); return r;
}
