/**
 * Atacama OS · Prospect Gateway — operaciones (funciones puras, AUTOCONTENIDAS junto con gateway-core.mjs).
 * Validación ligera de sitio, evaluación de lotes (dedupe + score + decisión), cargas para GHL y planificación de comandos `act`.
 * Nada aquí escribe ni envía: solo calcula qué haría el workflow n8n «19 Prospect Gateway».
 */
import { stripAccents, normDomain, normEmail, normPhone, decodeEntities, htmlToText, toCandidate, scoreCandidate, buildIndex, matchCandidate, decideCandidate, primaryKey, candidateKeys } from './gateway-core.mjs';

/* ============================================================== SITIO OFICIAL (validación ligera) */

/** Extrae título, descripción, correos y teléfonos de la portada de un sitio (una sola página; sin inventar nada). */
export function siteSignals(html) {
  const h = String(html == null ? '' : html);
  const title = decodeEntities((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  const desc = decodeEntities((h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  const text = htmlToText(h);
  const emails = [...new Set([...(h.match(/mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g) || []).map((m) => m.slice(7)), ...(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])].map(normEmail).filter((e) => e && !/\.(png|jpg|jpeg|gif|svg|webp)$/.test(e)))].slice(0, 5);
  const phones = [...new Set([...(h.match(/tel:([+\d][\d\s()-]{7,16})/g) || []).map((m) => m.slice(4)), ...(text.match(/\+\s?56[\s\d()-]{8,16}/g) || [])].map(normPhone).filter(Boolean))].slice(0, 5);
  const wa = (h.match(/wa\.me\/(\d{8,14})/) || h.match(/api\.whatsapp\.com\/send\?phone=(\d{8,14})/) || [])[1] || null;
  const name = title.replace(/\s*[|\-–—·:]\s*.*$/, '').trim();
  return { title, name_guess: name.slice(0, 100), description: desc.slice(0, 300), emails, phones, whatsapp: wa ? normPhone(wa) : null };
}

/** Candidato a partir de una URL individual + lo observado en su portada (todo como HECHO observado en la página). */
export function candidateFromSite(url, sig, ctx) {
  const facts = [];
  if (sig.title) facts.push('El sitio se presenta como «' + sig.title.slice(0, 120) + '».');
  if (sig.description) facts.push('Descripción pública del sitio: ' + sig.description.slice(0, 240));
  return toCandidate({ company_name: sig.name_guess || normDomain(url), website: url, facts, emails: sig.emails, phones: sig.phones, whatsapp: sig.whatsapp, whatsapp_declared: Boolean(sig.whatsapp), evidence_urls: [url] }, ctx);
}

/* ============================================================== LOTE: dedupe + scoring + decisión */

/**
 * Evalúa un lote completo. entries = coincidencias ya existentes (Supabase + GHL) con forma { system, id, keys[], info }.
 * Los duplicados DENTRO del mismo lote se detectan contra los anteriores.
 * opts: { force_import, ghl_index_complete, min_ghl_score }
 */
export function evaluateBatch(cands, entries, opts) {
  const base = Array.isArray(entries) ? entries.slice() : [];
  const results = [];
  (cands || []).forEach((c, i) => {
    const sc = scoreCandidate(c);
    const matches = matchCandidate(c, buildIndex(base));
    const dec = decideCandidate(c, sc, matches, opts);
    results.push({ i, candidate: c, key: primaryKey(c), keys: candidateKeys(c), scores: sc, decision: dec.decision, reasons: dec.reasons, ghl_eligible: dec.ghl_eligible, manual_override: Boolean(dec.manual_override),
      matches: matches.map((m) => ({ system: m.system, id: m.id, matched_on: m.matched_on, info: m.info })) });
    if (dec.decision !== 'invalid') base.push({ system: 'batch', id: 'item-' + i, keys: candidateKeys(c), info: { company: c.company_name } });
  });
  return results;
}

/** Fila de prospect_candidates para guardar o actualizar. */
export function buildCandidateRow(r, ctx) {
  const c = r.candidate;
  const status = r.decision === 'archive' ? 'archived' : 'accepted';
  return {
    icp_pack_id: ctx.pack_id, candidate_key: r.key, candidate_keys: r.keys, company_name: c.company_name, domain: normDomain(c.website), website: c.website, industry: c.industry, location: c.location,
    source_type: c.source_type, source_name: c.source_name, source_reference: c.source_reference, batch_id: ctx.request_id || null,
    canonical: { ...c, status }, fit_score: r.scores.fit_score, signal_score: r.scores.signal_score, reachability_score: r.scores.reachability_score, priority_score: r.scores.priority_score, band: r.scores.band, flags: r.scores.flags,
    external_score: c.external_score, external_score_scale: c.external_score_scale, external_source: c.external_source, status, decision: r.decision,
    manual_override: Boolean(r.manual_override), manual_override_by: r.manual_override ? (ctx.by || 'Christian') : null, manual_override_reason: r.manual_override ? (ctx.reason || null) : null,
    updated_at: new Date(ctx.now || Date.now()).toISOString(),
  };
}

/* ============================================================== GHL: cargas y operaciones */

/** Nota de revisión: en 60 segundos se entiende por qué escribirle. Hechos, inferencias e hipótesis siempre rotulados. */
export function reviewNote(c, sc, drafts, extra) {
  const ct = c.contact || {};
  const bl = (arr, n) => (arr || []).slice(0, n || 6).map((x) => ' · ' + String(x).replace(/\s+/g, ' ').slice(0, 260));
  const person = [ct.name, ct.role].filter(Boolean).join(', ') || 'sin persona identificada';
  const channels = [ct.email && 'correo ' + ct.email, ct.whatsapp && 'WhatsApp +' + ct.whatsapp, ct.phone && 'tel. +' + ct.phone, ct.linkedin && 'LinkedIn'].filter(Boolean).join(' · ') || 'sin canal directo';
  const bandName = { alta: 'alta prioridad', valida: 'válido para contactar', pendiente: 'pendiente', archivo: 'archivo' }[sc.band];
  const lines = [
    'PROSPECTO PARA REVISIÓN — ' + c.company_name + (c.website ? ' (' + c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') + ')' : ''),
    'Prioridad ' + sc.priority_score + '/100 (' + bandName + ') · fit ' + sc.fit_score + '/35 · señal ' + sc.signal_score + '/35 · alcance ' + sc.reachability_score + '/30 · ' + [c.industry, c.location].filter(Boolean).join(' · '),
    'Origen: ' + [c.source_type, c.source_name, c.source_reference].filter(Boolean).join(' · ') + (c.external_score != null ? ' · score externo ' + c.external_score + '/' + (c.external_score_scale || '?') + ' (solo referencia)' : ''),
  ];
  if (extra && extra.override) lines.push('ENTRADA MANUAL (FORCE_IMPORT) — motivo: ' + (extra.reason || 'sin motivo'));
  lines.push('', 'ÁNGULO DE CONTACTO: ' + (c.outreach_angle || (c.commercial_hypotheses || [])[0] || '—'), 'SOLUCIÓN PROPUESTA (hipótesis): ' + (c.proposed_solution || '—'), '', 'HECHOS (observados):');
  bl(c.facts).forEach((x) => lines.push(x));
  lines.push('SEÑALES OBSERVADAS:'); bl(c.observed_signals, 4).forEach((x) => lines.push(x));
  lines.push('INFERENCIAS (deducidas de los hechos):'); bl(c.inferences, 4).forEach((x) => lines.push(x));
  lines.push('HIPÓTESIS COMERCIALES (no son hechos):'); bl(c.commercial_hypotheses, 4).forEach((x) => lines.push(x));
  lines.push('FUENTES: ' + ((c.evidence_urls || []).slice(0, 5).join(' · ') || '—'), '', 'CONTACTO: ' + person + ' · ' + channels, '',
    'BORRADOR EMAIL (NO ENVIADO) — Asunto: ' + drafts.email_subject, drafts.email_body, '', 'BORRADOR WHATSAPP (NO ENVIADO): ' + drafts.whatsapp, '',
    'DECISIÓN: nada se envía hasta que lo apruebes (etiqueta «aprobado-para-contactar»; para descartar «descartado-prospecto»).');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 7000);
}

export function ghlContactBody(c, cfg, tags) {
  const ct = c.contact || {};
  const person = String(ct.name || '').trim();
  const parts = person ? person.split(/\s+/) : [];
  return { locationId: cfg.locationId, firstName: (parts.length ? parts[0] : String(c.company_name || '').slice(0, 60)), lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined, companyName: c.company_name, website: c.website || undefined, email: ct.email || undefined,
    phone: ct.whatsapp ? '+' + ct.whatsapp : ct.phone ? '+' + ct.phone : undefined, source: 'atacama-labs-prospect-gateway', tags: tags || ['prospecto-gateway', 'prospecto-por-revisar'],
    customFields: [{ id: cfg.contactFields.origen_detallado, field_value: 'Prospección outbound' }].concat(ct.role ? [{ id: cfg.contactFields.primary_contact_role, field_value: String(ct.role).slice(0, 120) }] : []) };
}

export function ghlOpportunityBody(c, sc, key, cfg, contactId, stageId) {
  const ct = c.contact || {};
  const ch = ct.email ? 'Correo' : ct.whatsapp ? 'WhatsApp' : ct.phone ? 'Llamada' : ct.linkedin ? 'LinkedIn' : 'Formulario web';
  const t = stripAccents(String(c.industry || '')).toLowerCase();
  const vertical = /(salud|clinica|dental|medic|veterin|kinesi)/.test(t) ? 'Salud' : /(inmobil)/.test(t) ? 'Inmobiliarias' : /(educ|colegio|instituto|otec|capacit|idioma)/.test(t) ? 'Educación'
    : /(retail|ecommerce|tienda)/.test(t) ? 'Retail & Ecommerce' : /(hotel|restaurant|aliment|casino|turismo)/.test(t) ? 'Alimentación & Casinos' : /(gimnasio|fitness|deporte)/.test(t) ? 'Gimnasios'
    : /(contab|legal|abogad|consult|informatica)/.test(t) ? 'Servicios Profesionales' : /(industri|maquin|arriendo|transporte|logist|mantenc|metalmec|mineria|electric|taller|repuesto)/.test(t) ? 'B2B & Industria' : 'Otro';
  const s = stripAccents(String(c.proposed_solution || c.outreach_angle || '')).toLowerCase();
  const sol = /(sistema|software|a medida)/.test(s) ? 'sistemas-a-medida' : /(integr|crm|erp)/.test(s) ? 'integraciones' : /(agente|atenci|whatsapp|cotiz|agend|reserva|seguimiento)/.test(s) ? 'atencion-y-seguimiento' : 'unsure';
  return { locationId: cfg.locationId, pipelineId: cfg.pipelineId, pipelineStageId: stageId, name: (c.company_name + ' — Prospecto').slice(0, 120), status: 'open', contactId,
    customFields: [
      { id: cfg.fields.fuente, field_value: 'outbound_manual' }, { id: cfg.fields.solucion_de_interes, field_value: sol }, { id: cfg.fields.icp_vertical, field_value: vertical },
      { id: cfg.fields.evidencia_url, field_value: (c.evidence_urls || [])[0] || c.website || '' }, { id: cfg.fields.canal_de_contacto, field_value: ch }, { id: cfg.fields.qualification_score, field_value: sc.priority_score },
      { id: cfg.fields.commercial_angle, field_value: String(c.outreach_angle || (c.commercial_hypotheses || [])[0] || '').slice(0, 500) }, { id: cfg.fields.prospect_key, field_value: key } ] };
}

/** Días hábiles hacia adelante (12:00 Chile = 15:00 UTC). */
export function businessDaysFrom(nowMs, n) {
  const d = new Date(nowMs);
  d.setUTCHours(15, 0, 0, 0);
  let left = Math.max(0, n);
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--; }
  return d.toISOString();
}

/**
 * Plan de comandos explícitos (act). Devuelve qué hacer en Supabase y en GHL, SIN ejecutar nada.
 * target = { candidate, ghl: { contact_id, opportunity_id } } · cfg = { stages, userId }
 * act = { type, channel, note, reason, days, follow_up_days, title, stage, mark_lost, ensure_in_ghl, at }
 */
export function planAct(act, target, cfg, nowMs) {
  const t = String((act && act.type) || '').toLowerCase();
  const plan = { type: t, supabase: {}, ghl: { create: false, stage: null, note: null, task: null, tags: [], opp_update: null }, executed: true, warnings: [] };
  const now = new Date(nowMs).toISOString();
  const ghl = target.ghl || {};
  const known = ['create_prospect', 'create_in_ghl', 'prepare_email', 'send_email', 'mark_contacted', 'log_instagram', 'log_whatsapp', 'log_phone', 'discard', 'follow_up', 'move_stage', 'add_note'];
  if (!known.includes(t)) return { ...plan, executed: false, error: 'accion_desconocida:' + t, known };
  if (t === 'send_email') {
    return { ...plan, executed: false, status: 'not_enabled', note: 'send_email NO se ejecuta en esta versión: se activa en el bloque Gmail. La interfaz queda definida; el borrador queda preparado con prepare_email.',
      interface: { to: (target.candidate.contact || {}).email || null, subject: (act && act.subject) || null, body: (act && act.body) || null, thread_id: null, requires: ['etiqueta aprobado-para-contactar', 'credencial Gmail (OAuth)'] } };
  }
  const inGhl = Boolean(ghl.opportunity_id);
  const norm = (n) => stripAccents(String(n || '')).toLowerCase();
  const stageId = (n) => ({ nuevo: cfg.stages.nuevo, investigado: cfg.stages.investigado, contactado: cfg.stages.contactado, respondio: cfg.stages.respondio, diagnostico: cfg.stages.diagnostico, propuesta: cfg.stages.propuesta, seguimiento: cfg.stages.seguimiento })[norm(n)] || null;
  const noteBase = String((act && act.note) || '').trim();
  if (t === 'create_prospect') { plan.supabase = { status: 'accepted' }; return plan; }
  if (t === 'create_in_ghl') { plan.supabase = { status: 'in_ghl' }; plan.ghl.create = !inGhl; plan.ghl.stage = cfg.stages.investigado; plan.ghl.tags = ['prospecto-gateway', 'prospecto-por-revisar']; if (inGhl) plan.warnings.push('ya_esta_en_ghl'); return plan; }
  if (t === 'prepare_email') { plan.supabase = { drafts: true }; return plan; }
  if (t === 'add_note') {
    if (!noteBase) return { ...plan, executed: false, error: 'falta_note' };
    plan.ghl.note = noteBase; plan.supabase = { note: noteBase };
    if (!ghl.contact_id) plan.warnings.push('sin_contacto_en_ghl_la_nota_queda_solo_en_supabase');
    return plan;
  }
  if (t === 'discard') {
    const why = String((act && act.reason) || noteBase || 'descartado manualmente');
    plan.supabase = { status: 'discarded', reason: why }; plan.ghl.note = 'Prospecto DESCARTADO (' + why + ').'; plan.ghl.tags = ['descartado-prospecto'];
    if (act && act.mark_lost && inGhl) plan.ghl.opp_update = { status: 'lost' };
    return plan;
  }
  if (t === 'follow_up') {
    const days = Number.isFinite(Number(act && act.days)) ? Number(act.days) : 3;
    // due_at (fecha exacta, p. ej. «el viernes») manda sobre days; se normaliza a las 12:00 de Chile si viene solo la fecha
    const exact = act && act.due_at && Number.isFinite(Date.parse(act.due_at)) ? (/^\d{4}-\d{2}-\d{2}$/.test(String(act.due_at)) ? new Date(String(act.due_at) + 'T15:00:00Z').toISOString() : new Date(act.due_at).toISOString()) : null;
    plan.ghl.task = { title: String((act && act.title) || ('Seguimiento: ' + target.candidate.company_name)).slice(0, 120), body: noteBase || 'Seguimiento de prospecto.', dueDate: exact || businessDaysFrom(nowMs, days), completed: false, assignedTo: cfg.userId };
    plan.ghl.note = noteBase || null; plan.supabase = { next_action_at: plan.ghl.task.dueDate };
    if (!ghl.contact_id) plan.warnings.push('sin_contacto_en_ghl_la_tarea_no_se_crea');
    return plan;
  }
  if (t === 'move_stage') {
    const sid = stageId(act && act.stage);
    if (!sid) return { ...plan, executed: false, error: 'etapa_desconocida:' + (act && act.stage) };
    plan.ghl.stage = sid; plan.supabase = { ghl_stage: norm(act.stage) }; if (!inGhl) plan.warnings.push('no_esta_en_ghl');
    if (noteBase) plan.ghl.note = noteBase;
    return plan;
  }
  // mark_contacted / log_*: registrar un contacto hecho FUERA de Atacama OS (no envía nada)
  const channel = t === 'log_instagram' ? 'instagram' : t === 'log_whatsapp' ? 'whatsapp' : t === 'log_phone' ? 'phone' : String((act && act.channel) || 'other').toLowerCase();
  const at = act && act.at && Number.isFinite(Date.parse(act.at)) ? new Date(act.at).toISOString() : now;
  plan.supabase = { status: 'contacted', last_contact_channel: channel, last_contact_at: at, ghl_stage: 'contactado' };
  plan.ghl.stage = cfg.stages.contactado;
  plan.ghl.create = !inGhl && !(act && act.ensure_in_ghl === false);
  plan.ghl.note = 'CONTACTO REGISTRADO MANUALMENTE · canal: ' + channel + ' · fecha: ' + at.slice(0, 16).replace('T', ' ') + ' UTC. Atacama OS no envió este mensaje.' + (noteBase ? '\n' + noteBase : '');
  plan.ghl.tags = ['contactado-manual'];
  const days = act && act.follow_up_days != null ? Number(act.follow_up_days) : 3;
  if (days > 0) plan.ghl.task = { title: 'Seguimiento: ' + target.candidate.company_name, body: 'Seguimiento tras contacto por ' + channel + '. ' + noteBase, dueDate: businessDaysFrom(nowMs, days), completed: false, assignedTo: cfg.userId };
  if (!inGhl && !plan.ghl.create) plan.warnings.push('no_esta_en_ghl_solo_se_registra_en_supabase');
  return plan;
}

/** Resumen compacto de un resultado para la respuesta del Gateway. */
export function briefResult(r) {
  const c = r.candidate;
  return { company: c.company_name, website: c.website, industry: c.industry, location: c.location, key: r.key, decision: r.decision, band: r.scores.band, priority_score: r.scores.priority_score,
    fit_score: r.scores.fit_score, signal_score: r.scores.signal_score, reachability_score: r.scores.reachability_score, channels: r.scores.channels, flags: r.scores.flags, reasons: r.reasons,
    external_score: c.external_score != null ? { value: c.external_score, scale: c.external_score_scale, note: 'solo referencia; no cuenta' } : null,
    existing: r.matches.map((m) => ({ system: m.system, id: m.id, matched_on: m.matched_on })), manual_override: r.manual_override };
}

/* ============================================================== VERIFICACIÓN LIGERA DE CITAS */

/**
 * Aplica el resultado de abrir las páginas citadas. checks = [{ url, quote, found }] donde found = true | false | null (página ilegible).
 * Una cita que NO se pudo comprobar deja de ser HECHO: pasa a INFERENCIA (no se descarta ni se inventa nada) y el candidato queda marcado.
 */
export function applyQuoteChecks(c, checks) {
  const out = { ...c, facts: (c.facts || []).slice(), inferences: (c.inferences || []).slice() };
  const list = Array.isArray(checks) ? checks : [];
  const bad = list.filter((x) => x.found !== true);
  out.quote_checks = { checked: list.length, found: list.filter((x) => x.found === true).length, unverified: bad.length };
  bad.forEach((x) => {
    const i = out.facts.indexOf(x.quote);
    if (i >= 0) { out.facts.splice(i, 1); out.inferences.push(x.quote + ' (cita no verificada en ' + x.url + ')'); }
  });
  return out;
}

/** ¿La cita aparece en el texto visible de la página? (misma normalización que la verificación de 08) */
export function quoteInPage(html, quote) {
  const norm = (x) => stripAccents(String(x || '')).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const q = norm(quote).slice(0, 90);
  if (q.length < 12) return false;
  return norm(htmlToText(String(html || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' '))).includes(q);
}
