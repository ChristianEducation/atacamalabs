/**
 * Atacama OS v3 · Fase 7 — Historial legible (spec §8.4). Núcleo PURO y AUTOCONTENIDO (se incrusta en n8n «25 Atacama Ops», acción `history_list`).
 *
 * Junta lo que hizo cada actor (Christian, Hermes, el motor/n8n, Claude) desde: operator_audit_log, ops_runs, eventos de outreach_messages
 * (enviados, cancelados o devueltos por el motor, respuestas), piezas de contenido (programadas/publicadas) y alertas críticas/importantes.
 * Agrupa acciones iguales y seguidas («Hermes guardó 12 borradores (09:56)») y devuelve líneas con enlace a su lugar en /ops.
 * Límite honesto: lo que el motor hizo ANTES del 14-oct sin dejar registro (p. ej. la cancelación del 13-oct, ya restaurada) no se puede rehacer.
 */

export function hiActor(a) {
  const s = String(a || '').toLowerCase();
  if (/v[ií]a hermes|^hermes/.test(s)) return 'Hermes';
  if (/christian/.test(s)) return 'Christian';
  if (/claude/.test(s)) return 'Claude';
  if (/motor|n8n|sistema|atacama os|gmail-sync/.test(s)) return 'Motor';
  return a ? String(a).slice(0, 40) : 'Sistema';
}

/** Un evento de auditoría → { key, actor, section, one, many(n), href } */
export function hiAudit(r) {
  const tool = String(r.tool || '').replace(/^ops_/, '');
  const p = r.params || {};
  const e = r.entity || {};
  const actor = hiActor(r.actor);
  const st = String(r.status || '');
  const co = e.company || e.title || e.topic || '';
  const T = (key, section, one, many, href) => ({ key: key + ':' + actor, actor, section, one, many, href: href || null, who: co });
  if (tool === 'save_draft') return st === 'low_quality' ? T('draft_low', 'correo', 'intentó guardar 1 borrador con score bajo (no se guardó)', (n) => 'intentó guardar ' + n + ' borradores con score bajo (no se guardaron)', '/ops?view=aprobaciones&filter=correos')
    : T('draft', 'correo', 'guardó 1 borrador', (n) => 'guardó ' + n + ' borradores', '/ops?view=aprobaciones&filter=correos');
  if (tool === 'email_approve') return T('approve_mail', 'correo', 'aprobó 1 correo', (n) => 'aprobó ' + n + ' correos', '/ops?view=cola');
  if (tool === 'email_save') return p.decision === 'paste' ? T('paste', 'correo', 'pegó su versión en 1 correo', (n) => 'pegó su versión en ' + n + ' correos', '/ops?view=aprobaciones&filter=correos') : T('edit_mail', 'correo', 'editó 1 correo', (n) => 'editó ' + n + ' correos', '/ops?view=aprobaciones&filter=correos');
  if (tool === 'email_reject') return T('reject_mail', 'correo', 'rechazó 1 correo', (n) => 'rechazó ' + n + ' correos', '/ops?view=aprobaciones&filter=correos');
  if (tool === 'email_reopen') return T('reopen_mail', 'correo', 'devolvió 1 correo a borrador', (n) => 'devolvió ' + n + ' correos a borrador', '/ops?view=aprobaciones&filter=correos');
  if (tool === 'mail_config_set') { const a = e.after || {}; const bits = []; if (a.daily_cap != null) bits.push('tope ' + ((e.before || {}).daily_cap != null ? e.before.daily_cap + ' → ' : '') + a.daily_cap); if (a.window_start) bits.push('ventana ' + a.window_start + '–' + a.window_end); if (a.followup_days) bits.push('seguimientos +' + a.followup_days.join('/+')); return T('mailcfg:' + r.id, 'correo', 'cambió el correo: ' + (bits.join(', ') || 'configuración'), () => 'cambió la configuración del correo', '/ops?view=correo'); }
  if (tool === 'mail_outcome') return T('outcome:' + r.id, 'correo', 'marcó ' + (co || 'un prospecto') + ' como ' + (p.decision === 'perdido' ? 'perdido' : 'reunión'), () => '', '/ops?view=respuestas');
  if (tool === 'autosend_set') return T('autosend:' + r.id, 'correo', (p.decision === 'set' ? 'cambió' : 'cambió') + ' el envío automático', () => '', '/ops?view=control');
  if (tool === 'pause_set') return T('pause:' + r.id, 'sistema', p.decision === 'paused' ? 'PAUSÓ todo el sistema' + (p.reason ? ' (' + p.reason + ')' : '') : 'reanudó el sistema', () => '', '/ops?view=controles');
  if (tool === 'content_approve') return T('approve_post', 'redes', 'aprobó 1 publicación', (n) => 'aprobó ' + n + ' publicaciones', '/ops?view=contenido');
  if (tool === 'content_reject') return T('reject_post', 'redes', 'rechazó 1 publicación', (n) => 'rechazó ' + n + ' publicaciones', '/ops?view=contenido');
  if (tool === 'idea_decide') { const d = p.decision; const v = d === 'approve' ? 'aprobó' : d === 'discard' ? 'descartó' : d === 'change' ? 'pidió cambios a' : 'movió'; return T('idea_' + d, 'redes', v + ' 1 idea', (n) => v + ' ' + n + ' ideas', '/ops?view=ideas'); }
  if (tool === 'idea_mine') return T('idea_mine', 'redes', 'agregó una idea propia', (n) => 'agregó ' + n + ' ideas propias', '/ops?view=ideas');
  if (/^taller_/.test(tool)) { const v = { feedback: 'pidió cambios en', approve: 'aprobó', schedule: 'programó', discard: 'descartó', duplicate: 'duplicó', caption: 'editó el texto de', add_version: 'subió una versión de' }[tool.replace('taller_', '')] || 'actuó sobre'; return T('taller_' + tool + ':' + (e.piece_id || ''), 'redes', v + ' «' + String(co || 'una pieza').slice(0, 50) + '»', () => '', '/ops?view=taller' + (e.piece_id ? '&pieza=' + e.piece_id : '')); }
  if (/^(prep_|li_)/.test(tool)) return T('prep', 'prospeccion', 'actualizó 1 contacto preparado', (n) => 'actualizó ' + n + ' contactos preparados', '/ops?view=control');
  if (/^linkedin_/.test(tool)) return T('li', 'prospeccion', 'decidió 1 envío por LinkedIn', (n) => 'decidió ' + n + ' envíos por LinkedIn', '/ops?view=outreach&tab=linkedin');
  if (/^(list_|get_|lint_)/.test(tool)) return null; // consultas: no son acciones
  return T('tool:' + tool, 'sistema', 'usó «' + tool + '»', (n) => 'usó «' + tool + '» ' + n + ' veces', null);
}

export function hiRunLabel(kind) {
  return { prospect_radar: 'el Radar de prospectos', content_radar: 'el Radar de contenido', content_rss: 'la lectura de RSS', competitor_intel: 'el informe de competencia', content_pieces: 'la creación de piezas', contact_prep: 'la preparación de contactos', story_day: 'las historias del día', ig_week: 'la semana de Instagram', ideas_week: 'la propuesta de ideas' }[kind] || kind;
}

/** d = { now, tz, audit, runs, msgs, pieces, alerts } → { lines, actors, sections, days } */
export function historyView(d) {
  const tz = d.tz || 'America/Santiago';
  const ev = [];
  const push = (at, x) => { const t = Date.parse(at); if (Number.isFinite(t) && x) ev.push({ t, ...x }); };
  for (const r of Array.isArray(d.audit) ? d.audit : []) push(r.created_at, hiAudit(r));
  for (const r of Array.isArray(d.runs) ? d.runs : []) {
    const sm = r.summary || {};
    const skip = r.status === 'skipped' || sm.mode === 'skip';
    const extra = skip ? ' (omitido' + (sm.reason ? ': ' + String(sm.reason).slice(0, 60) : '') + ')' : (sm.imported != null ? ' · ' + sm.imported + ' nuevos' : sm.created != null ? ' · ' + sm.created + ' creados' : '');
    push(r.created_at, { key: 'run:' + r.id, actor: 'Hermes', section: /prospect|contact/.test(r.kind) ? 'prospeccion' : 'redes', one: 'corrió ' + hiRunLabel(r.kind) + extra, many: () => '', href: null });
  }
  for (const m of Array.isArray(d.msgs) ? d.msgs : []) {
    const err = String(m.error || '');
    if (m.direction === 'inbound') { if (m.classification !== 'own') push(m.created_at, { key: 'in:' + (m.classification || 'x'), actor: 'Gmail', section: 'correo', one: 'recibió 1 ' + (m.classification === 'bounce' ? 'rebote' : m.classification === 'unsubscribe' ? 'baja' : m.classification === 'auto_reply' ? 'respuesta automática' : 'respuesta'), many: (n) => 'recibió ' + n + ' ' + (m.classification === 'bounce' ? 'rebotes' : m.classification === 'unsubscribe' ? 'bajas' : m.classification === 'auto_reply' ? 'respuestas automáticas' : 'respuestas'), href: '/ops?view=respuestas', who: m.company_name }); continue; }
    if (m.status === 'sent' && m.sent_at) push(m.sent_at, { key: 'sent', actor: 'Motor', section: 'correo', one: 'envió 1 correo', many: (n) => 'envió ' + n + ' correos', href: '/ops?view=respuestas', who: m.company_name });
    if (m.status === 'cancelled' && /^Cancelado por el motor/.test(err)) push(m.updated_at, { key: 'mcancel:' + err.slice(0, 60), actor: 'Motor', section: 'correo', one: 'canceló 1 correo: ' + err.replace(/^Cancelado por el motor:\s*/, ''), many: (n) => 'canceló ' + n + ' correos: ' + err.replace(/^Cancelado por el motor:\s*/, ''), href: '/ops?view=aprobaciones&filter=correos', who: m.company_name });
    if (m.status === 'draft' && /^Devuelto a borrador por el motor/.test(err)) push(m.updated_at, { key: 'mreturn', actor: 'Motor', section: 'correo', one: 'devolvió 1 correo a borrador: el texto cambió', many: (n) => 'devolvió ' + n + ' correos a borrador: el texto cambió', href: '/ops?view=aprobaciones&filter=correos', who: m.company_name });
    if (m.status === 'cancelled' && /^Reemplazado por la versión editada por Christian/.test(err)) push(m.updated_at, { key: 'replaced', actor: 'Christian', section: 'correo', one: 'reemplazó 1 borrador de Hermes por su versión', many: (n) => 'reemplazó ' + n + ' borradores de Hermes por su versión', href: '/ops?view=aprobaciones&filter=correos', who: m.company_name });
  }
  for (const p of Array.isArray(d.pieces) ? d.pieces : []) {
    if (p.is_test) continue;
    if (p.published_at) push(p.published_at, { key: 'pub', actor: 'GHL', section: 'redes', one: 'publicó «' + String(p.topic || '').slice(0, 50) + '»', many: (n) => 'publicó ' + n + ' piezas', href: '/ops?view=contenido' });
  }
  for (const a of Array.isArray(d.alerts) ? d.alerts : []) {
    if (/^_state:/.test(a.alert_key || '') || !['critical', 'high'].includes(a.severity) || (a.meta && a.meta.notice)) continue;
    push(a.first_seen_at, { key: 'alert:' + a.alert_key, actor: 'Alertas', section: 'sistema', one: (a.severity === 'critical' ? 'CRÍTICA: ' : 'importante: ') + String(a.title || '').slice(0, 120) + (a.status === 'resolved' && a.resolved_at ? ' (resuelta)' : ''), many: () => '', href: '/ops?view=sistema' });
  }
  ev.sort((a, b) => b.t - a.t);
  // Agrupar: misma clave, mismo actor, mismo día y a menos de 45 min del primero del grupo
  const dayOf = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: tz });
  const hm = (t) => new Date(t).toLocaleTimeString('es-CL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const groups = [];
  for (const e of ev) {
    const g = groups[groups.length - 1];
    if (g && g.key === e.key && g.actor === e.actor && g.day === dayOf(e.t) && g.first - e.t <= 45 * 60000) { g.n++; g.last = e.t; if (e.who && g.who.length < 4 && !g.who.includes(e.who)) g.who.push(e.who); continue; }
    groups.push({ key: e.key, actor: e.actor, section: e.section, one: e.one, many: e.many, href: e.href, first: e.t, last: e.t, n: 1, day: dayOf(e.t), who: e.who ? [e.who] : [] });
  }
  const lines = groups.map((g) => {
    const verb = g.n > 1 && g.many(g.n) ? g.many(g.n) : g.one;
    const span = g.n > 1 && g.first - g.last >= 60000 ? hm(g.last) + '–' + hm(g.first) : hm(g.first);
    return { at: new Date(g.first).toISOString(), day: g.day, time: span, actor: g.actor, section: g.section, count: g.n, text: g.actor + ' ' + verb + ' (' + span + ')', who: g.who, href: g.href };
  });
  const uniq = (k) => [...new Set(lines.map((l) => l[k]))];
  return { generated_at: new Date(d.now).toISOString(), lines: lines.slice(0, 600), actors: uniq('actor'), sections: uniq('section'), days: uniq('day').slice(0, 90), retention_days: 90 };
}
