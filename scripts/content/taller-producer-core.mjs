/**
 * Atacama OS v3 · Fase 3 — producción automática de redes en la VPS (spec §6.5 + anexo §F). Núcleo puro.
 *
 * Funciones AUTOCONTENIDAS: se prueban con `taller-producer-core.test.mjs`, las usa el productor (scripts/media/taller-producer.mjs) y se
 * incrustan en n8n 30 (taller_claim · taller_file · taller_version · taller_help).
 *
 * Reglas: lámina de prueba primero; máx. 3 intentos por lámina, 30 créditos por pieza y 200 por semana; al agotarse → «necesita_ayuda»
 * con el motivo y SIN más gasto. El texto de cada lámina debe coincidir con el esperado (se admite como mucho 1 diferencia de tilde o
 * mayúscula por línea). Nada se programa ni publica desde aquí.
 */

/** Topes por defecto (anexo §F3) mezclados con content_config. */
export function tpCaps(cfg) {
  const c = cfg || {};
  const n = (v, d, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
  return { attempts_per_slide: n(c.taller_max_attempts_per_slide, 3, 1, 5), credits_per_piece: n(c.taller_max_credits_per_piece, 30, 0, 200), credits_per_week: n(c.taller_weekly_credit_cap, 200, 0, 1000) };
}

/**
 * ¿Se puede gastar en un intento más? `s` = { slide_attempts, piece_credits, week_credits, cost }. Devuelve { ok } o { ok:false, reason }.
 * El costo se cuenta ANTES de gastar (nunca se pasa del tope).
 */
export function tpCanSpend(s, caps) {
  const c = caps || tpCaps({});
  const cost = Math.max(0, Number(s.cost) || 0);
  if ((Number(s.slide_attempts) || 0) >= c.attempts_per_slide) return { ok: false, reason: 'Se agotaron los ' + c.attempts_per_slide + ' intentos de una lámina.' };
  if ((Number(s.piece_credits) || 0) + cost > c.credits_per_piece) return { ok: false, reason: 'Esta pieza llegaría a ' + ((Number(s.piece_credits) || 0) + cost) + ' créditos (tope ' + c.credits_per_piece + ').' };
  if ((Number(s.week_credits) || 0) + cost > c.credits_per_week) return { ok: false, reason: 'La semana llegaría a ' + ((Number(s.week_credits) || 0) + cost) + ' créditos (tope ' + c.credits_per_week + ').' };
  return { ok: true };
}

/** Normaliza para comparar textos de una lámina (espacios, comillas tipográficas, guiones). */
export function tpNorm(s) {
  return String(s == null ? '' : s).replace(/[«»“”"]/g, '"').replace(/[‘’']/g, "'").replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim();
}

/** Diferencias de tilde o mayúscula entre dos líneas que, sin tildes ni mayúsculas, son iguales. null si difieren en algo más. */
export function tpSoftDiffs(a, b) {
  const x = tpNorm(a), y = tpNorm(b);
  const base = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (base(x) !== base(y)) return null;
  const xs = x.normalize('NFC'), ys = y.normalize('NFC');
  if (xs.length !== ys.length) return 1;
  let n = 0; for (let i = 0; i < xs.length; i++) if (xs[i] !== ys[i]) n++;
  return n;
}

/**
 * QA de texto de una lámina (anexo §F1): cada línea esperada debe aparecer en lo leído (OCR o visión), con ≤ 1 diferencia de tilde/mayúscula.
 * `expected` = líneas que DEBEN leerse; `read` = texto leído. Devuelve { ok, missing:[...], soft:[...] }.
 */
export function tpTextCheck(expected, read) {
  const lines = (Array.isArray(expected) ? expected : [expected]).map(tpNorm).filter(Boolean);
  const got = tpNorm(read);
  const gotLines = String(read == null ? '' : read).split(/\r?\n/).map(tpNorm).filter(Boolean);
  const missing = [], soft = [];
  for (const l of lines) {
    if (got.includes(l)) continue;
    const near = gotLines.map((g) => tpSoftDiffs(l, g)).filter((d) => d !== null);
    const win = near.length ? Math.min(...near) : (() => { const base = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return base(got).includes(base(l)) ? 1 : null; })();
    if (win === null || win > 1) missing.push(l); else soft.push(l);
  }
  return { ok: missing.length === 0, missing, soft };
}

/**
 * QA completo de una lámina (anexo §F3): tamaño 1080×1350 (4:5), texto exacto, y señales del compositor (logo, cuadrícula, sin elementos prohibidos).
 * `m` = { w, h, read, expected, has_logo, has_grid, forbidden: [] }.
 */
export function tpQaSlide(m) {
  const problems = [];
  if (m.w !== 1080 || m.h !== 1350) problems.push('tamaño ' + m.w + '×' + m.h + ' (debe ser 1080×1350, 4:5)');
  const t = tpTextCheck(m.expected || [], m.read || '');
  t.missing.forEach((l) => problems.push('no se lee «' + l + '»'));
  if (m.has_logo === false) problems.push('falta el logo oficial');
  if (m.has_grid === false) problems.push('falta la cuadrícula de marca');
  (m.forbidden || []).forEach((f) => problems.push('elemento prohibido: ' + f));
  return { ok: problems.length === 0, problems, soft: t.soft };
}

/** Plan de la corrida: lámina de prueba primero (la 1), y luego las demás solo si la de prueba pasó. */
export function tpOrder(nSlides) {
  const n = Math.max(0, Math.min(10, Number(nSlides) || 0));
  return n ? { test: 1, rest: Array.from({ length: n - 1 }, (_, i) => i + 2) } : { test: null, rest: [] };
}

/**
 * Valida la especificación que Hermes escribe para producir una pieza (copia y arte por lámina). Devuelve { ok, errors, spec }.
 * spec = { caption, slides: [{ layout, title, emph?, body?, pill?, steps?, art?: { scene, texts, character?, cutout? } }] }.
 */
export function tpValidateSpec(spec, piece) {
  const s = spec && typeof spec === 'object' ? spec : {};
  const errors = [];
  const LAYOUTS = ['portada', 'arte_texto', 'pasos', 'texto', 'cierre'];
  const slides = Array.isArray(s.slides) ? s.slides : [];
  const want = piece && piece.format === 'carrusel' ? [2, 10] : piece && ['imagen', 'historia'].includes(piece.format) ? [1, 1] : [1, 10];
  if (slides.length < want[0] || slides.length > want[1]) errors.push('cantidad de láminas: ' + slides.length + ' (se esperan ' + want[0] + (want[1] !== want[0] ? '–' + want[1] : '') + ')');
  slides.forEach((x, i) => {
    if (!LAYOUTS.includes(x && x.layout)) errors.push('lámina ' + (i + 1) + ': layout inválido (usa ' + LAYOUTS.join(' | ') + ')');
    if (!x || typeof x.title !== 'string' || x.title.trim().length < 3 || x.title.length > 90) errors.push('lámina ' + (i + 1) + ': título de 3 a 90 caracteres');
    if (x && x.body && String(x.body).length > 260) errors.push('lámina ' + (i + 1) + ': texto de apoyo de máximo 260 caracteres');
    if (x && x.art && (typeof x.art.scene !== 'string' || x.art.scene.length < 20)) errors.push('lámina ' + (i + 1) + ': arte sin escena descrita');
    if (x && x.art && /\b(logo|logotipo|titular|headline|robot|hologram|neon|circuit)\b/i.test(String(x.art.scene))) errors.push('lámina ' + (i + 1) + ': la escena no debe pedir logos, titulares ni estética prohibida (lo pone el compositor)');
    if (x && x.layout === 'pasos' && !(Array.isArray(x.steps) && x.steps.length >= 2 && x.steps.length <= 4)) errors.push('lámina ' + (i + 1) + ': «pasos» lleva de 2 a 4 pasos');
  });
  if (piece && piece.format === 'carrusel' && slides.length && slides[slides.length - 1].layout !== 'cierre') errors.push('la última lámina debe ser el cierre de marca');
  if (piece && piece.format === 'historia' && s.caption) errors.push('las historias no llevan texto en GHL');
  if (piece && piece.format !== 'historia' && !(typeof s.caption === 'string' && s.caption.trim().length >= 20)) errors.push('falta el texto de la publicación (caption)');
  const kw = piece && piece.piece && piece.piece.keyword;
  if (kw && piece.format !== 'historia' && !String(s.caption || '').toUpperCase().includes(String(kw).toUpperCase())) errors.push('el texto debe incluir la palabra clave «' + kw + '»');
  return { ok: errors.length === 0, errors, spec: { caption: typeof s.caption === 'string' ? s.caption.trim() : '', slides } };
}

/** Líneas que DEBEN leerse en una lámina compuesta (título, pill, cuerpo y pasos; sin marcas de énfasis). */
export function tpExpectedLines(slide) {
  const clean = (t) => tpNorm(String(t || '').replace(/[*_]/g, ''));
  const out = [];
  if (slide.pill) out.push(clean(slide.pill));
  String(slide.title || '').split(/\n|\|/).forEach((l) => { if (clean(l)) out.push(clean(l)); });
  if (slide.emph) out.push(clean(slide.emph));
  (slide.steps || []).forEach((s) => out.push(clean(s)));
  return out.filter(Boolean);
}

/**
 * Correcciones repetidas → reglas de receta (§6.5: «toda corrección repetida se convierte en regla»). Solo PROPONE (Christian aprueba, §8.2).
 * `events` = learning_events de tipo piece_feedback. Agrupa por palabras clave simples; devuelve las que se repiten ≥ 2 veces.
 */
export function tpRuleCandidates(events) {
  const KEYS = [['cerca', 'Encuadre cercano: el objeto principal ocupa al menos el 60 % de la lámina.'], ['llamita', 'La llamita oficial: bípeda, 4 patas, sin accesorios inventados.'], ['texto', 'Textos de la escena grandes y legibles en un celular (máximo 4–5 mensajes).'],
    ['color', 'Verde = empresa / blanco = cliente en los chats; azul Atacama para el énfasis.'], ['logo', 'Nunca un logo dentro de la escena: el logo oficial lo pone el compositor.'], ['fondo', 'Fondo liso para poder recortar.'], ['corto', 'Títulos más cortos: máximo 2 líneas.']];
  const counts = {};
  (Array.isArray(events) ? events : []).forEach((e) => { const t = String(e.reason || '').toLowerCase(); KEYS.forEach(([k, rule]) => { if (t.includes(k)) counts[rule] = (counts[rule] || 0) + 1; }); });
  return Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([rule, n]) => ({ rule, n }));
}

/** Decisión de reclamo (n8n 30 taller_claim): la siguiente pieza del carril VPS en cola o con cambios pedidos; nada si la producción está apagada o en pausa. */
export function tpPickClaim(rows, cfg, sys, opts) {
  const o = opts || {};
  if (sys && sys.global_pause === true) return { action: 'none', reason: 'Pausa general activa.' };
  if (!o.test && !(cfg && cfg.taller_production_enabled === true)) return { action: 'none', reason: 'La producción automática está apagada (content_config.taller_production_enabled = false).' };
  const list = (Array.isArray(rows) ? rows : []).filter((p) => p.lane === 'vps' && ['en_cola', 'cambios_pedidos'].includes(p.taller_status) && Boolean(p.is_test) === Boolean(o.test))
    .sort((a, b) => (a.taller_status === 'cambios_pedidos' ? 0 : 1) - (b.taller_status === 'cambios_pedidos' ? 0 : 1) || String(a.needs_by || '').localeCompare(String(b.needs_by || '')));
  if (o.piece_id) { const p = list.find((x) => x.id === o.piece_id); return p ? { action: 'claim', piece: p } : { action: 'none', reason: 'Esa pieza no está en cola del carril VPS.' }; }
  return list[0] ? { action: 'claim', piece: list[0] } : { action: 'none', reason: 'No hay piezas en cola para la VPS.' };
}
