/**
 * Atacama OS · guardián de créditos de Higgsfield (Frente B) — núcleo puro (sin red, sin procesos).
 * El tope semanal se mide con un REGISTRO propio (costo estimado de cada generación que pide Atacama OS), NO con el saldo de la cuenta:
 * Christian también usa Higgsfield en la web y su gasto no debe frenar a Hermes (ni al revés). Además hay un tope por llamada y una reserva
 * mínima de saldo que Atacama OS nunca toca.
 */

export const HG_DEFAULTS = { cap: 200, per_call: 40, reserve: 300, warn_at: 0.8 };

/** Atacama OS usa Higgsfield SOLO para IMÁGENES (reglas de historias v1.1 §0.3): los videos los hace Christian. Cualquier otro modelo se bloquea. */
export const HG_IMAGE_MODELS = ['gpt_image_2_5', 'gpt_image_2', 'nano_banana_flash', 'nano_banana_2_1', 'nano_banana_pro', 'nano_banana_2_lite', 'seedream_v5_pro', 'seedream_5_0_flash', 'seedream_v4_5', 'flux_3_image', 'flux_2', 'flux_kontext', 'z_image', 'text2image_soul_v2', 'recraft_v4_1', 'ideogram_4_5', 'image_background_remover', 'bytedance_image_upscale'];

/** Semana de Chile (lunes–domingo) como la fecha del lunes «YYYY-MM-DD». */
export function hgWeekKey(ms) {
  const d = new Date(ms);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(d);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const dow = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[p.weekday];
  const base = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) - dow * 86400000;
  return new Date(base).toISOString().slice(0, 10);
}

export function hgNewLedger() { return { v: 1, ...HG_DEFAULTS, weeks: {} }; }

export function hgSpent(ledger, weekKey) {
  const w = ledger && ledger.weeks && ledger.weeks[weekKey];
  return w ? Math.round(w.jobs.reduce((a, j) => a + (Number(j.credits) || 0), 0) * 100) / 100 : 0;
}

/** Decide si una generación de `cost` créditos puede correr. balance puede ser null (no se pudo leer): en ese caso se exige el resto de reglas. */
export function hgDecide({ ledger, weekKey, cost, balance }) {
  const L = { ...HG_DEFAULTS, ...(ledger || {}) };
  const c = cost == null || cost === '' ? NaN : Number(cost);
  if (!Number.isFinite(c) || c < 0) return { ok: false, reason: 'unknown_cost', message: 'No pude estimar el costo de esta generación: no se ejecuta.' };
  const spent = hgSpent(ledger, weekKey);
  if (c > L.per_call) return { ok: false, reason: 'per_call', spent, message: 'TOPE POR LLAMADA: esta generación cuesta ' + c + ' créditos y el máximo por llamada es ' + L.per_call + '. No se ejecuta.' };
  if (spent + c > L.cap) return { ok: false, reason: 'weekly_cap', spent, message: 'TOPE SEMANAL: llevo ' + spent + ' de ' + L.cap + ' créditos esta semana y esta generación suma ' + c + '. No se ejecuta; Christian puede subir el tope.' };
  if (balance != null && Number(balance) - c < L.reserve) return { ok: false, reason: 'reserve', spent, message: 'RESERVA DE SALDO: la cuenta tiene ' + balance + ' créditos y Atacama OS no baja de ' + L.reserve + '. No se ejecuta.' };
  const after = Math.round((spent + c) * 100) / 100;
  return { ok: true, spent, spent_after: after, remaining_after: Math.round((L.cap - after) * 100) / 100, warn: after >= L.cap * L.warn_at ? 'Aviso: con esta generación Atacama OS llega a ' + after + ' de ' + L.cap + ' créditos semanales.' : null };
}

/** Agrega una generación al registro (devuelve un registro nuevo; conserva 12 semanas). */
export function hgRecord(ledger, weekKey, entry) {
  const L = ledger && ledger.weeks ? JSON.parse(JSON.stringify(ledger)) : hgNewLedger();
  L.weeks[weekKey] = L.weeks[weekKey] || { jobs: [] };
  L.weeks[weekKey].jobs.push({ at: entry.at, model: String(entry.model || '').slice(0, 60), credits: Number(entry.credits) || 0, job_id: entry.job_id || null, purpose: String(entry.purpose || '').slice(0, 120), status: entry.status || 'created' });
  for (const k of Object.keys(L.weeks).sort().slice(0, -12)) delete L.weeks[k];
  return L;
}

/** Qué subcomandos del CLI se permiten. `create` y `workflow` gastan créditos (pasan por el tope); el resto de gastos queda bloqueado. */
export function hgClassify(args) {
  const a = Array.isArray(args) ? args.filter((x) => !x.startsWith('--json') && x !== '--no-color') : [];
  const [g, s] = a;
  if (g === 'account' && ['status', 'transactions'].includes(s)) return { kind: 'passthrough' };
  if (g === 'model' && ['list', 'get'].includes(s)) return { kind: 'passthrough' };
  if (g === 'voices' || g === 'upload') return { kind: 'passthrough' };
  if ((g === 'generate' || g === 'gen') && ['cost', 'get', 'list', 'wait'].includes(s)) return { kind: 'passthrough' };
  if ((g === 'generate' || g === 'gen') && s === 'create') return ['gpt_image_2_5', 'gpt_image_2', 'nano_banana_flash', 'nano_banana_2_1', 'nano_banana_pro', 'nano_banana_2_lite', 'seedream_v5_pro', 'seedream_5_0_flash', 'seedream_v4_5', 'flux_3_image', 'flux_2', 'flux_kontext', 'z_image', 'text2image_soul_v2', 'recraft_v4_1', 'ideogram_4_5', 'image_background_remover', 'bytedance_image_upscale'].includes(a[2]) ? { kind: 'create', model: a[2] } : { kind: 'blocked', message: 'Modelo no permitido: Atacama OS usa Higgsfield solo para IMÁGENES (' + String(a[2] || '').slice(0, 40) + ' no es un modelo de imagen permitido).' };
  if (g === 'auth' && s === 'login') return { kind: 'passthrough' };
  return { kind: 'blocked', message: 'Comando no permitido por el guardián de créditos: ' + [g, s].filter(Boolean).join(' ') + ' (solo se permite consultar y «generate create» con tope).' };
}

/** Extrae los créditos de la salida JSON de `generate cost`. */
export function hgParseCost(text) {
  try { const j = JSON.parse(String(text).trim()); return typeof j.credits === 'number' ? j.credits : null; } catch { return null; }
}

/** Extrae el id de job de la salida JSON de `generate create` (acepta objeto o lista). */
export function hgParseJobId(text) {
  try { const j = JSON.parse(String(text).trim()); const o = Array.isArray(j) ? j[0] : j; return (o && (o.id || o.job_id || (o.job && o.job.id))) || null; } catch { return null; }
}
