/**
 * Atacama OS · Prospect Gateway — orquestación pura (funciones AUTOCONTENIDAS junto con gateway-core.mjs y gateway-ops.mjs).
 * Cada etapa del workflow n8n «19 Prospect Gateway» es una función de aquí: evaluar → plan GHL etapa 1 (contactos) → plan etapa 2
 * (oportunidad, nota, tarea, etiquetas) → finalizar (filas de Supabase + respuesta). Ninguna escribe ni envía: devuelven datos.
 */
import { stripAccents, normDomain, normEmail, normPhone, normLocation, normCompany, candidateKeys, primaryKey, scoreCandidate, prepareDrafts } from './gateway-core.mjs';
import { evaluateBatch, buildCandidateRow, reviewNote, ghlContactBody, ghlOpportunityBody, planAct, briefResult } from './gateway-ops.mjs';

/** Enriquecimiento SEGURO: une listas, completa campos vacíos y NUNCA pisa un dato no vacío (ni el contacto) del candidato existente. */
export function mergeCandidates(existing, incoming) {
  const a = existing || {};
  const b = incoming || {};
  const uni = (x, y) => [...new Set([].concat(x || [], y || []).map((v) => String(v).trim()).filter(Boolean))];
  const pick = (x, y) => (x != null && x !== '' ? x : y != null && y !== '' ? y : null);
  const ca = a.contact || {}, cb = b.contact || {};
  return {
    ...b, ...a,
    company_name: pick(a.company_name, b.company_name), website: pick(a.website, b.website), industry: pick(a.industry, b.industry), location: pick(a.location, b.location),
    observed_signals: uni(a.observed_signals, b.observed_signals), facts: uni(a.facts, b.facts), inferences: uni(a.inferences, b.inferences), commercial_hypotheses: uni(a.commercial_hypotheses, b.commercial_hypotheses),
    evidence_urls: uni(a.evidence_urls, b.evidence_urls).slice(0, 8),
    contact: { name: pick(ca.name, cb.name), role: pick(ca.role, cb.role), email: pick(ca.email, cb.email), phone: pick(ca.phone, cb.phone), whatsapp: pick(ca.whatsapp, cb.whatsapp), linkedin: pick(ca.linkedin, cb.linkedin) },
    proposed_solution: pick(a.proposed_solution, b.proposed_solution), outreach_angle: pick(a.outreach_angle, b.outreach_angle), suggested_email: pick(a.suggested_email, b.suggested_email), suggested_whatsapp: pick(a.suggested_whatsapp, b.suggested_whatsapp),
    external_score: pick(a.external_score, b.external_score), external_score_scale: pick(a.external_score_scale, b.external_score_scale), external_source: pick(a.external_source, b.external_source),
    source_type: pick(a.source_type, b.source_type), source_name: pick(a.source_name, b.source_name), source_reference: pick(a.source_reference, b.source_reference), site_verified: Boolean(a.site_verified || b.site_verified),
  };
}

/** Entradas de dedupe a partir de lo que ya existe en Supabase (RPC) y en GHL (contactos y oportunidades del pipeline). */
export function buildEntries(lookupRows, ghlContacts, ghlOpps) {
  const free = /^(gmail|hotmail|outlook|yahoo|live|icloud)\./;
  const out = [];
  (Array.isArray(lookupRows) ? lookupRows : []).forEach((r) => out.push({ system: r.system, id: r.id, keys: r.keys || [], info: r.info || null }));
  (Array.isArray(ghlContacts) ? ghlContacts : []).forEach((c) => {
    const keys = [];
    const e = normEmail(c.email);
    if (e) { keys.push('e:' + e); const dom = e.split('@')[1]; if (dom && !free.test(dom)) keys.push('d:' + dom); }
    const p = normPhone(c.phone);
    if (p) keys.push('p:' + p.slice(-9));
    const d = normDomain(c.website);
    if (d) keys.push('d:' + d);
    out.push({ system: 'ghl_contact', id: c.id, keys, info: { name: c.contactName || c.name || c.companyName || null, email: c.email || null } });
  });
  (Array.isArray(ghlOpps) ? ghlOpps : []).forEach((o) => {
    const c = o.contact || {};
    const keys = [];
    const e = normEmail(c.email);
    if (e) { keys.push('e:' + e); const dom = e.split('@')[1]; if (dom && !free.test(dom)) keys.push('d:' + dom); }
    const p = normPhone(c.phone);
    if (p) keys.push('p:' + p.slice(-9));
    (o.customFields || []).forEach((f) => { const v = String(f.fieldValueString || f.fieldValue || f.field_value || ''); if (/^(d|e|p|n):/.test(v)) keys.push(v); });
    out.push({ system: 'ghl_opportunity', id: o.id, keys: [...new Set(keys)], info: { name: o.name || null, stage: o.pipelineStageId || null, contact_id: o.contactId || c.id || null } });
  });
  return out;
}

/**
 * Evalúa una solicitud completa (analyze | import | prepare | act). No escribe nada.
 * req = { action, request_id, options, act, candidates[] } · st = { lookup[], contacts[], opps[], contacts_ok, opps_ok, contacts_total, opps_total }
 */
export function evaluateRequest(req, st, cfg, nowMs) {
  const o = req.options || {};
  const truncated = (Number(st.contacts_total) > (st.contacts || []).length) || (Number(st.opps_total) > (st.opps || []).length);
  const ghlComplete = st.contacts_ok !== false && st.opps_ok !== false && !truncated;
  const entries = buildEntries(st.lookup, st.contacts, st.opps);
  const force = Boolean(o.force_import) && (req.action === 'import');
  const results = evaluateBatch(req.candidates, entries, { force_import: force, ghl_index_complete: ghlComplete, min_ghl_score: o.min_ghl_score });
  const items = results.map((r) => {
    const exM = r.matches.find((m) => m.system === 'supabase_candidate');
    const exInfo = exM ? exM.info : null;
    const ghlContactM = r.matches.find((m) => m.system === 'ghl_contact');
    const ghlOppM = r.matches.find((m) => m.system === 'ghl_opportunity');
    const ghl = {
      contact_id: (exInfo && exInfo.ghl_contact_id) || (ghlOppM && ghlOppM.info && ghlOppM.info.contact_id) || (ghlContactM && ghlContactM.id) || null,
      opportunity_id: (exInfo && exInfo.ghl_opportunity_id) || (ghlOppM && ghlOppM.id) || null,
      existing_in_ghl: Boolean(ghlContactM || ghlOppM),
    };
    const merged = exInfo && exInfo.canonical ? mergeCandidates(exInfo.canonical, r.candidate) : r.candidate;
    const item = { i: r.i, key: exInfo && exInfo.candidate_key ? exInfo.candidate_key : r.key, keys: r.keys, candidate: merged, scores: scoreCandidate(merged), decision: r.decision, reasons: r.reasons, manual_override: r.manual_override,
      existing_row: exInfo ? { id: exM.id, status: exInfo.status, candidate_key: exInfo.candidate_key } : null, ghl, matches: r.matches, plan: { ghl: { create: false }, supabase: {} }, persist: false, warnings: [], applied: {} };
    if (exInfo) item.keys = [...new Set(item.keys.concat(candidateKeys(merged)))];
    const act = req.act || {};
    if (req.action === 'analyze') return item;
    if (item.decision === 'invalid') return item;
    if (req.action === 'import') {
      if (item.decision === 'duplicate_in_ghl') {
        item.warnings.push('ya_existe_en_ghl_no_se_modifica');
        if (o.enrich && ghl.contact_id) { item.plan = { ghl: { create: false, note: 'ENRIQUECIMIENTO (Prospect Gateway, solo agrega información; no modifica campos): ' + [].concat((merged.facts || []).slice(0, 3), (merged.commercial_hypotheses || []).slice(0, 2)).join(' | ').slice(0, 900), tags: [] }, supabase: {} }; }
        return item;
      }
      item.persist = true;
      if (item.decision === 'create_in_ghl' && !ghl.opportunity_id) item.plan = { ghl: { create: true, stage: cfg.stages.investigado, tags: ['prospecto-gateway', 'prospecto-por-revisar'], note: null }, supabase: { status: 'in_ghl' } };
      return item;
    }
    if (req.action === 'prepare') { item.persist = true; item.drafts = prepareDrafts(merged); item.plan = { ghl: { create: false }, supabase: { drafts: true } }; return item; }
    if (req.action === 'act') {
      const ap = planAct(act, { candidate: merged, ghl }, cfg, nowMs);
      item.plan = ap;
      item.persist = ap.executed !== false && item.decision !== 'invalid';
      if (ap.type === 'prepare_email') item.drafts = prepareDrafts(merged);
      // Crear/vincular en GHL sobre un contacto que ya existe solo con autorización explícita (attach_to_existing)
      if (ap.ghl && ap.ghl.create && ghl.existing_in_ghl && !(exInfo && exInfo.ghl_contact_id) && !act.attach_to_existing) {
        ap.ghl.create = false; ap.executed = false; ap.error = 'ya_existe_en_ghl: usa attach_to_existing:true para crear la oportunidad sobre ese contacto';
        item.persist = false;
      }
      if (ap.type === 'create_in_ghl' && item.decision === 'duplicate_in_ghl' && !act.attach_to_existing) { ap.executed = false; ap.error = 'ya_existe_en_ghl'; item.persist = false; }
      return item;
    }
    return item;
  });
  return { items, ghl_index_complete: ghlComplete, truncated };
}

/** Etapa 1 de GHL: crear contactos nuevos (POST /contacts/ nunca modifica un contacto existente: GHL rechaza el duplicado). */
export function planStage1(items, cfg) {
  const ops = [];
  items.forEach((it) => {
    const wantCreate = it.plan && it.plan.ghl && it.plan.ghl.create;
    if (wantCreate && !it.ghl.contact_id) ops.push({ ref: it.i, kind: 'contact_create', skip: false, method: 'POST', url: 'https://services.leadconnectorhq.com/contacts/', body: ghlContactBody(it.candidate, cfg, it.plan.ghl.tags) });
  });
  return ops.length ? ops : [{ ref: -1, kind: 'noop', skip: true, method: 'GET', url: 'https://localhost.invalid/', body: {} }];
}

/** Etapa 2: oportunidad, cambio de etapa, nota, tarea y etiquetas. s1 = respuestas de la etapa 1 en el mismo orden que planStage1. */
export function planStage2(items, s1ops, s1res, cfg, nowMs, ctx) {
  const contactIds = {};
  const errors = {};
  s1ops.forEach((op, k) => {
    if (op.kind !== 'contact_create') return;
    const r = (s1res || [])[k] || {};
    const id = r.body && r.body.contact && r.body.contact.id;
    if ((r.statusCode || 0) < 300 && id) contactIds[op.ref] = id;
    else errors[op.ref] = (r.body && r.body.meta && r.body.meta.contactId) ? 'ya_existe_en_ghl (contacto ' + r.body.meta.contactId + '): no se modificó' : 'error_al_crear_contacto: ' + String((r.body && r.body.message) || r.statusCode || 'sin respuesta').slice(0, 160);
  });
  const ops = [];
  items.forEach((it) => {
    const g = it.plan && it.plan.ghl;
    if (!g) return;
    const cid = it.ghl.contact_id || contactIds[it.i];
    if (errors[it.i]) { it.applied.error = errors[it.i]; return; }
    const needsContact = Boolean(g.create || g.note || g.task || (g.tags || []).length);
    if (!cid && needsContact) it.warnings.push('sin_contacto_en_ghl_no_se_aplican_nota_tarea_ni_etiquetas');
    if (cid) it.applied.contact_id = cid;
    const base = 'https://services.leadconnectorhq.com';
    const oppId = it.ghl.opportunity_id;
    if (g.create && cid) {
      const stage = g.stage || cfg.stages.investigado;
      ops.push({ ref: it.i, kind: 'opp_create', skip: false, method: 'POST', url: base + '/opportunities/', body: ghlOpportunityBody(it.candidate, it.scores, it.key, cfg, cid, stage) });
    } else if (oppId && (g.stage || g.opp_update)) {
      ops.push({ ref: it.i, kind: 'opp_update', skip: false, method: 'PUT', url: base + '/opportunities/' + oppId, body: { ...(g.stage ? { pipelineStageId: g.stage } : {}), ...(g.opp_update || {}) } });
    }
    let note = g.note;
    if (g.create && cid) note = reviewNote(it.candidate, it.scores, it.drafts || prepareDrafts(it.candidate), { override: it.manual_override, reason: ctx && ctx.reason }) + (g.note ? '\n\n' + g.note : '');
    if (note && cid) ops.push({ ref: it.i, kind: 'note_create', skip: false, method: 'POST', url: base + '/contacts/' + cid + '/notes', body: { body: String(note).slice(0, 7500), userId: cfg.userId } });
    if (g.task && cid) ops.push({ ref: it.i, kind: 'task_create', skip: false, method: 'POST', url: base + '/contacts/' + cid + '/tasks', body: g.task });
    if ((g.tags || []).length && cid) ops.push({ ref: it.i, kind: 'tags_add', skip: false, method: 'POST', url: base + '/contacts/' + cid + '/tags', body: { tags: g.tags } });
  });
  return { ops: ops.length ? ops : [{ ref: -1, kind: 'noop', skip: true, method: 'GET', url: 'https://localhost.invalid/', body: {} }], contactIds, errors };
}

/** Cierre: filas de Supabase (con los ids de GHL ya conocidos) + respuesta + registro de idempotencia. */
export function finalizeRun(req, items, s2ops, s2res, contactIds, errors, cfg, ctx) {
  const byRef = {};
  s2ops.forEach((op, k) => { if (op.kind === 'noop') return; (byRef[op.ref] = byRef[op.ref] || []).push({ op, res: (s2res || [])[k] || {} }); });
  const rows = [];
  const results = items.map((it) => {
    const mine = byRef[it.i] || [];
    const okOf = (kind) => { const m = mine.find((x) => x.op.kind === kind); return m ? ((m.res.statusCode || 0) < 300 ? 'ok' : 'error_http_' + (m.res.statusCode || 'sin_respuesta')) : null; };
    const oppRes = mine.find((x) => x.op.kind === 'opp_create');
    const oppId = (oppRes && (oppRes.res.statusCode || 0) < 300 && oppRes.res.body && ((oppRes.res.body.opportunity && oppRes.res.body.opportunity.id) || oppRes.res.body.id)) || it.ghl.opportunity_id || null;
    const contactId = contactIds[it.i] || it.ghl.contact_id || null;
    const applied = { ...it.applied, contact_id: contactId, opportunity_id: oppId, opportunity: okOf('opp_create') || okOf('opp_update'), note: okOf('note_create'), task: okOf('task_create'), tags: okOf('tags_add') };
    if (it.persist) {
      const row = buildCandidateRow({ ...it, candidate: it.candidate, key: it.key, keys: it.keys, scores: it.scores, decision: it.decision, manual_override: it.manual_override }, { pack_id: ctx.pack_id, request_id: ctx.request_id, now: ctx.now, by: ctx.by, reason: ctx.reason });
      const sp = (it.plan && it.plan.supabase) || {};
      const failedGhl = Boolean(errors[it.i]);
      if (it.existing_row && !it.manual_override) { row.manual_override = false; row.manual_override_by = null; row.manual_override_reason = null; }
      if (sp.status && !failedGhl) row.status = sp.status; else if (it.existing_row && ['in_ghl', 'contacted', 'discarded'].includes(it.existing_row.status) && !sp.status) row.status = it.existing_row.status;
      if (oppId) { row.ghl_opportunity_id = oppId; if (!sp.status && row.status === 'accepted') row.status = 'in_ghl'; }
      if (contactId) row.ghl_contact_id = contactId;
      if (sp.ghl_stage) row.ghl_stage = sp.ghl_stage; else if (oppId) row.ghl_stage = it.existing_row ? undefined : 'investigado';
      if (sp.last_contact_channel) { row.last_contact_channel = sp.last_contact_channel; row.last_contact_at = sp.last_contact_at; }
      if (sp.next_action_at) row.next_action_at = sp.next_action_at;
      if (it.drafts) row.drafts = it.drafts;
      if (sp.status === 'discarded') row.notes = [{ at: new Date(ctx.now).toISOString(), text: 'Descartado: ' + (sp.reason || '') }];
      if (sp.note) row.notes = [{ at: new Date(ctx.now).toISOString(), text: sp.note }];
      Object.keys(row).forEach((k) => { if (row[k] === undefined) delete row[k]; });
      rows.push(row);
    }
    const brief = briefResult({ candidate: it.candidate, key: it.key, scores: it.scores, decision: it.decision, reasons: it.reasons, matches: it.matches, manual_override: it.manual_override });
    return { ...brief, supabase: it.persist ? (it.existing_row ? 'actualizado' : 'creado') : 'sin_cambios', status_after: it.persist ? (rows[rows.length - 1].status) : (it.existing_row ? it.existing_row.status : null),
      ghl: { contact_id: contactId, opportunity_id: oppId, existing_in_ghl: it.ghl.existing_in_ghl, applied: { opportunity: applied.opportunity, note: applied.note, task: applied.task, tags: applied.tags } },
      executed: it.plan && it.plan.executed === false ? false : true, act_status: it.plan && it.plan.status || null, act_interface: it.plan && it.plan.interface || null, error: (it.plan && it.plan.error) || errors[it.i] || null, warnings: it.warnings.concat((it.plan && it.plan.warnings) || []), drafts: it.drafts ? { email_subject: it.drafts.email_subject, email_body: it.drafts.email_body, whatsapp: it.drafts.whatsapp, lint: it.drafts.lint, source: it.drafts.email_source, never_sent: true } : undefined };
  });
  const count = (f) => results.filter(f).length;
  const response = { ok: true, action: req.action, request_id: req.request_id || null, replayed: false, safety: { messages_sent: 0, note: 'El Gateway nunca envía mensajes; send_email no está habilitado.' },
    summary: { received: results.length, created_in_ghl: count((r) => r.ghl.applied.opportunity === 'ok' && r.supabase !== 'sin_cambios' && !r.ghl.existing_in_ghl), kept_in_supabase: count((r) => ['keep_in_supabase', 'exists_in_supabase', 'archive'].includes(r.decision)), duplicates_in_ghl: count((r) => r.decision === 'duplicate_in_ghl'), invalid: count((r) => r.decision === 'invalid'), manual_overrides: count((r) => r.manual_override), errors: count((r) => r.error) },
    results };
  return { rows, response, log: { icp_pack_id: ctx.pack_id, request_id: req.request_id, action: req.action, source: req.source || {}, response } };
}

/** Respuesta de ANALYZE (solo lectura). */
export function analyzeResponse(req, ev) {
  const results = ev.items.map((it) => briefResult({ candidate: it.candidate, key: it.key, scores: it.scores, decision: it.decision, reasons: it.reasons, matches: it.matches, manual_override: it.manual_override }));
  const by = (k) => results.reduce((a, r) => { a[r[k]] = (a[r[k]] || 0) + 1; return a; }, {});
  return { ok: true, action: 'analyze', request_id: req.request_id || null, replayed: false, wrote_nothing: true, ...(req.options && req.options.include_candidates ? { candidates: ev.items.map((it) => it.candidate) } : {}), ghl_index_complete: ev.ghl_index_complete, source: req.source || {}, summary: { received: results.length, by_band: by('band'), by_decision: by('decision'), would_enter_ghl: results.filter((r) => r.decision === 'create_in_ghl').length }, safety: { messages_sent: 0 }, results };
}
