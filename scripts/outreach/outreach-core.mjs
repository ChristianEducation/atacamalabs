/**
 * Atacama OS · Outreach — núcleo puro del motor de correo (borrador → aprobación → envío → respuesta → seguimiento).
 * AUTOCONTENIDO: todas las funciones se incrustan tal cual (Function.prototype.toString) en los workflows n8n 21/22/23.
 * Reglas de oro: nada se envía sin aprobación explícita ligada al contenido exacto (hash) · sin duplicados (un mensaje vivo por
 * candidato+tipo, effect_key idempotente) · nunca a un correo suprimido · el modo lo cambia solo Christian (Hermes no puede).
 */

export function stripAcc(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
export function normEmail(e) { return String(e == null ? '' : e).trim().toLowerCase().replace(/^mailto:/, ''); }
export function isValidEmail(e) { return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(normEmail(e)); }
export function emailDomain(e) { const m = normEmail(e).match(/@([^@\s]+)$/); return m ? m[1] : ''; }

/** Hash de 16 hex (doble FNV-1a): detecta cualquier cambio de destinatario/asunto/cuerpo entre la aprobación y el envío. */
export function hash16(s) {
  const t = String(s == null ? '' : s);
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a ^= c; a = Math.imul(a, 0x01000193); b ^= c + i; b = Math.imul(b, 0x85ebca6b); }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
export function contentHash(to, subject, body) { return hash16(normEmail(to) + '\u0001' + String(subject || '').trim() + '\u0001' + String(body || '').trim()); }

export function newId(rnd) { const r = rnd || Math.random; const h = () => Math.floor(r() * 0x10000).toString(16).padStart(4, '0'); return h() + h() + '-' + h() + '-4' + h().slice(1) + '-a' + h().slice(1) + '-' + h() + h() + h(); }

/** ¿Está suprimido este correo o su dominio? list = filas {email, domain, reason}. */
export function checkSuppression(email, list) {
  const e = normEmail(email), d = emailDomain(email);
  for (const r of Array.isArray(list) ? list : []) {
    if (r.email && normEmail(r.email) === e) return { reason: r.reason, by: 'email' };
    if (r.domain && String(r.domain).toLowerCase() === d) return { reason: r.reason, by: 'domain' };
  }
  return null;
}

/** Partes de fecha en la zona horaria (Chile por defecto). */
export function zonedParts(ms, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/Santiago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(ms));
  const g = (t) => (parts.find((p) => p.type === t) || {}).value;
  const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')];
  return { y: Number(g('year')), m: Number(g('month')), d: Number(g('day')), hh: Number(g('hour')), mm: Number(g('minute')), dow, key: g('year') + '-' + g('month') + '-' + g('day') };
}
export function hhmm(s) { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; }
/** Lunes a viernes dentro de [window_start, window_end) en la zona de la configuración. */
export function inSendWindow(ms, cfg) {
  const p = zonedParts(ms, cfg && cfg.tz);
  const mins = p.hh * 60 + p.mm;
  return p.dow >= 1 && p.dow <= 5 && mins >= hhmm(cfg && cfg.window_start) && mins < hhmm(cfg && cfg.window_end);
}
/** Próximo instante (ms) en que la ventana está abierta (avanza de a 5 minutos; máx. 10 días). */
export function nextWindowStart(ms, cfg) {
  const step = 5 * 60 * 1000;
  let t = Math.ceil(ms / step) * step;
  for (let i = 0; i < 12 * 24 * 10; i++) { if (inSendWindow(t, cfg)) return t; t += step; }
  return ms;
}
/** Inicio del día (ms UTC) de «hoy» en la zona: sirve para contar el tope diario. */
export function startOfZonedDay(ms, tz) {
  const p = zonedParts(ms, tz);
  return ms - (p.hh * 60 + p.mm) * 60000 - (ms % 60000);
}
/** Suma n días hábiles (lun-vie) y devuelve el instante a las 10:00 de la zona (ISO). */
export function addBusinessDaysIso(ms, n, tz) {
  let t = ms, left = Math.max(0, Math.trunc(n));
  while (left > 0) { t += 24 * 3600000; const p = zonedParts(t, tz); if (p.dow >= 1 && p.dow <= 5) left--; }
  const p = zonedParts(t, tz);
  return new Date(t - ((p.hh - 10) * 60 + p.mm) * 60000).toISOString();
}

export function quoteCut() { return /^(>|el .{5,120} escribi[oó]:?\s*$|on .{5,120} wrote:?\s*$|-{2,}\s*(original|mensaje original|forwarded)|de:\s.+<.+@.+>\s*$|from:\s.+<.+@.+>\s*$)/i; }
/** Solo el texto nuevo de una respuesta (sin citas ni firma larga). */
export function newText(body) {
  const lines = String(body == null ? '' : body).replace(/\r/g, '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (quoteCut().test(l)) break;
    // atribución de Gmail partida en 2-3 líneas: «El mié, 7 oct 2026 a la(s) 11:00 a.m., Nombre\n(correo) escribió:»
    if (/^(el|on)\s.{3,200}$/i.test(l) && /(escribi[oó]|wrote):?\s*$/i.test(lines.slice(i, i + 3).join(' ').trim())) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}

/** Clasifica un mensaje entrante: own | bounce | auto_reply | unsubscribe | decline | reply. Determinista; ante la duda es «reply» (lo ve un humano). */
export function classifyInbound(m, ourEmail) {
  const from = normEmail(String(m.from || '').replace(/^.*</, '').replace(/>.*$/, '')) || String(m.from || '').toLowerCase();
  const rawFrom = String(m.from || '').toLowerCase();
  const our = normEmail(ourEmail);
  if (our && from === our) return { cls: 'own', reason: 'mensaje propio' };
  const h = {};
  Object.keys(m.headers || {}).forEach((k) => { h[String(k).toLowerCase()] = String(m.headers[k]); });
  const subj = stripAcc(m.subject || '').toLowerCase();
  const bodyAll = stripAcc(m.body || m.snippet || '').toLowerCase();
  const fresh = stripAcc(newText(m.body || m.snippet || '')).toLowerCase();
  if (/(mailer-daemon|postmaster|mail delivery subsystem)/.test(rawFrom) || /multipart\/report/.test(h['content-type'] || '') || /(delivery status notification|undeliverable|returned mail|failure notice|mail delivery failed|mensaje no entregado|no se pudo entregar|delivery has failed)/.test(subj + ' ' + bodyAll.slice(0, 600))) {
    const fr = (h['x-failed-recipients'] || '').trim() || ((bodyAll.match(/(?:to|a|for|para)[:\s]+<?([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})>?/) || [])[1] || '') || ((bodyAll.match(/([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/) || [])[1] || '');
    const hard = /(550|551|553|5\.1\.1|user unknown|no such user|address not found|does not exist|no existe|unknown user|invalid address)/.test(bodyAll);
    return { cls: 'bounce', reason: hard ? 'rebote definitivo' : 'rebote', failed_recipient: normEmail(fr), hard };
  }
  const as = h['auto-submitted'];
  if ((as && as.toLowerCase() !== 'no') || h['x-autoreply'] || h['x-autorespond'] || /^(bulk|auto_reply|junk)$/.test((h['precedence'] || '').toLowerCase()) ||
    /(respuesta automatica|automatic reply|autoreply|auto-reply|out of office|fuera de (la )?oficina|autorespuesta|ausente de la oficina)/.test(subj) ||
    /^(estimad[oa]s?[,:]?\s*)?(actualmente )?(me encuentro|estoy|estaremos) (fuera|de vacaciones|ausente)/.test(fresh.slice(0, 200))) return { cls: 'auto_reply', reason: 'respuesta automática' };
  const unsub = /(\bdar(me|nos)? de baja\b|\bdesuscrib\w*|\bunsubscribe\b|\bremove me\b|\bno (me |nos )?(vuelvan a |sigan |siga |quiero |queremos )?(escrib|contact|enviar|envi|moles)\w*|\bno deseo(mos)? (recibir|continuar|seguir)|\belimin(en|ar)(me|nos)? de (su|sus|la|el) (lista|base|registro)|\bsacarme de (su|la) lista|\bspam\b)/;
  if (unsub.test(fresh.slice(0, 700)) || /^(baja|stop|no|cancelar|remove)\W*$/.test(fresh)) return { cls: 'unsubscribe', reason: 'pidió no recibir más mensajes' };
  const decl = /(\bno (nos )?interesa(n)?\b|\bno estamos interesad\w+|\bno estoy interesad\w+|\bno (lo )?(requerimos|necesitamos|necesito)\b|\bno,? gracias\b|\bgracias,? pero no\b|\bpor ahora no\b|\bno es el momento\b)/;
  if (decl.test(fresh.slice(0, 500))) return { cls: 'decline', reason: 'respuesta negativa' };
  return { cls: 'reply', reason: 'respuesta humana' };
}

/** Marcadores que NUNCA deben salir en un correo. */
export function findPlaceholders(text) {
  const t = String(text || '');
  const hits = [];
  if (/\{\{|\}\}|\{[a-z_]+\}/i.test(t)) hits.push('llaves {{ }}');
  if (/\[(nombre|empresa|cargo|tu nombre|completar|xxx|aqu[ií]|insert[^\]]*)\]/i.test(t)) hits.push('[marcador]');
  if (/\b(lorem ipsum|xxxx+|TODO|COMPLETAR|PENDIENTE DE)\b/.test(t)) hits.push('texto de relleno');
  if (/<[a-z\/][^>]*>/i.test(t)) hits.push('HTML en texto plano');
  return hits;
}

/** Quita del cuerpo la despedida/firma (el sistema agrega la suya al enviar) y separa un «Asunto:» incrustado. */
export function cleanDraftText(subject, body) {
  let b = String(body == null ? '' : body).replace(/\r/g, '').trim();
  let sub = subject == null ? null : String(subject).trim();
  const m = b.match(/^asunto:\s*([^\n]+)\n+/i);
  if (m) { if (sub == null || sub === '') sub = m[1].trim(); b = b.slice(m[0].length).trim(); }
  const lines = b.split('\n');
  let guard = 0;
  while (lines.length && guard++ < 5) {
    const last = lines[lines.length - 1].trim();
    if (!last) { lines.pop(); continue; }
    if (/^(saludos|atentamente|cordialmente|un abrazo|un saludo|cari[ñn]os|gracias)[,.!]?$/i.test(last) || /^christian( wevar)?\s*([·|,\-–—].*)?$/i.test(last) || /^atacama labs\s*([·|,\-–—].*)?$/i.test(last) || /^(https?:\/\/)?(www\.)?atacamalabs\.cl\/?$/i.test(last)) { lines.pop(); continue; }
    break;
  }
  return { subject: sub, body: lines.join('\n').trim() };
}

/** Valida un borrador antes de guardarlo o aprobarlo. */
export function validateDraft(d, ctx) {
  const errors = [];
  const to = normEmail(d.to_email);
  if (!isValidEmail(to)) errors.push('falta un correo de destino válido');
  const subject = String(d.subject || '').trim(), body = String(d.body || '').trim();
  if (subject.length < 4 || subject.length > 150) errors.push('el asunto debe tener entre 4 y 150 caracteres');
  if (body.length < 40) errors.push('el cuerpo es demasiado corto (mínimo 40 caracteres)');
  if (body.length > 2500) errors.push('el cuerpo es demasiado largo (máximo 2500 caracteres: un correo en frío corto convierte más)');
  const urls = (body.match(/https?:\/\/\S+/g) || []).length;
  if (urls > 1) errors.push('máximo un enlace en el cuerpo (sin acortadores ni rastreo)');
  if (/(bit\.ly|tinyurl|t\.co\/|goo\.gl)/i.test(body)) errors.push('sin acortadores de enlaces');
  const ph = findPlaceholders(subject + '\n' + body);
  if (ph.length) errors.push('quedan marcadores sin completar: ' + ph.join(', '));
  if (/(!!!|GRATIS|100% garantizado|oferta imperdible|haz clic aqu[ií])/i.test(subject + ' ' + body)) errors.push('lenguaje promocional/spam');
  const sup = ctx && ctx.suppression ? checkSuppression(to, ctx.suppression) : null;
  if (sup) errors.push('destinatario suprimido (' + sup.reason + ', por ' + sup.by + '): no se le puede escribir');
  if (ctx && ctx.allowed_emails && ctx.allowed_emails.length && isValidEmail(to) && !ctx.allowed_emails.map(normEmail).includes(to) && !ctx.override_to) errors.push('el correo no es uno de los publicados por la empresa (' + ctx.allowed_emails.join(', ') + '); usa uno de esos o indica que Christian lo eligió (override_to)');
  return { ok: errors.length === 0, errors };
}

/** Plantilla de seguimiento (el humano la edita y aprueba; nunca se envía sola). */
export function followupTemplate(kind, cand, firstSubject) {
  const co = (cand && cand.company_name) || 'su empresa';
  const subj = 'Re: ' + String(firstSubject || 'Atacama Labs').replace(/^re:\s*/i, '');
  if (kind === 'followup_2') return { subject: subj, body: 'Hola, retomo mi mensaje anterior por si se perdió entre otros correos. Si automatizar la atención o la agenda de ' + co + ' no es prioridad hoy, no hay problema y no insisto más. Si te interesa, te muestro un ejemplo concreto en 10 minutos.' };
  return { subject: subj, body: 'Hola, te escribí hace unos días sobre cómo podríamos ayudar a ' + co + ' a ahorrar tiempo en tareas repetitivas. ¿Tiene sentido que te muestre un ejemplo concreto en 10 minutos? Si no es buen momento, dímelo y lo dejamos ahí.' };
}

export function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/** ¿El pie legal configurado es solo la marca (temporal)? Entonces no se repite: la firma ya la dice. */
export function isBrandOnlyFooter(foot) { const f = stripAcc(String(foot || '')).toLowerCase().replace(/[\s·|\-–—]+/g, ' ').trim(); return !f || f === 'atacama labs atacamalabs.cl' || f === 'atacamalabs.cl' || f === 'atacama labs'; }
/**
 * Correo final = cuerpo aprobado + firma + (pie legal si existe) + línea de baja. El sistema solo agrega esto.
 * Firma: «Christian Wevar | Atacama Labs» / «atacamalabs.cl» / logo oficial (PNG derivado de public/brand/logo-horizontal.svg).
 * opts.logo: 'cid' (envío: imagen incrustada cid:atacama-logo) | '<data URI>' (vista previa) | null (sin logo).
 */
export function renderEmail(msg, cfg, opts) {
  const name = (cfg && cfg.from_name) || 'Christian Wevar';
  const foot = (cfg && cfg.legal_footer) ? String(cfg.legal_footer).trim() : '';
  const legal = isBrandOnlyFooter(foot) ? '' : foot;
  const unsub = 'Si prefieres no recibir más mensajes de Atacama Labs, responde «baja» y no volveré a escribirte.';
  const bodyText = String(msg.body || '').trim();
  const text = bodyText + '\n\n' + name + ' | Atacama Labs\natacamalabs.cl\n\n--\n' + (legal ? legal + '\n' : '') + unsub;
  const logo = opts && opts.logo !== undefined ? opts.logo : 'cid';
  const src = logo === 'cid' ? 'cid:atacama-logo' : logo;
  const paras = bodyText.split(/\n{2,}/).map((p) => '<p style="margin:0 0 14px 0;">' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>').join('');
  const html = '<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#ffffff;">'
    + '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#121A2B;max-width:640px;padding:4px 0;">'
    + paras
    + '<div style="margin-top:22px;">'
    + '<div style="font-weight:700;color:#121A2B;">' + escapeHtml(name) + ' | Atacama Labs</div>'
    + '<div style="margin-top:2px;"><a href="https://atacamalabs.cl" style="color:#0F5CED;text-decoration:none;">atacamalabs.cl</a></div>'
    + (src ? '<div style="margin-top:12px;"><img src="' + src + '" width="220" alt="Atacama Labs" style="display:block;border:0;width:220px;max-width:100%;height:auto;"></div>' : '')
    + '</div>'
    + '<div style="margin-top:22px;padding-top:10px;border-top:1px solid #E5E7EB;font-size:12px;line-height:1.5;color:#6B7280;">' + (legal ? escapeHtml(legal) + '<br>' : '') + escapeHtml(unsub) + '</div>'
    + '</div></body></html>';
  return { subject: String(msg.subject || '').trim(), text, html };
}

export function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function encodeHeader(s) { return /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?='; }
export function wrap76(b64) { return String(b64).replace(/(.{76})/g, '$1\r\n'); }
/**
 * Mensaje RFC 2822 listo para users.messages.send (base64url). Incluye List-Unsubscribe mailto y encadenado de hilo.
 * Con o.html: multipart/alternative [ text/plain, multipart/related [ text/html, image/png inline (Content-ID <atacama-logo>) ] ].
 */
export function buildMime(o) {
  const from = o.from_name ? encodeHeader(o.from_name) + ' <' + o.from + '>' : o.from;
  const domain = emailDomain(o.from) || 'atacamalabs.cl';
  const messageId = o.message_id || '<' + newId() + '@' + domain + '>';
  const common = [
    'From: ' + from, 'To: ' + o.to, 'Subject: ' + encodeHeader(o.subject), 'Date: ' + new Date(o.now || Date.now()).toUTCString(), 'Message-ID: ' + messageId, 'MIME-Version: 1.0',
    'List-Unsubscribe: <mailto:' + o.from + '?subject=baja>',
    ...(o.in_reply_to ? ['In-Reply-To: ' + o.in_reply_to, 'References: ' + (o.references || o.in_reply_to)] : []),
  ];
  const part = (type, data) => 'Content-Type: ' + type + '; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + wrap76(Buffer.from(String(data || ''), 'utf8').toString('base64'));
  if (!o.html) return { raw: b64url(common.concat(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64']).join('\r\n') + '\r\n\r\n' + wrap76(Buffer.from(String(o.text || ''), 'utf8').toString('base64'))), message_id: messageId };
  const tag = String(messageId).replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'x';
  const alt = 'alt_' + tag, rel = 'rel_' + tag;
  const related = ['--' + rel, part('text/html', o.html)];
  if (o.inline_png_b64) related.push('--' + rel, 'Content-Type: image/png; name="logo-atacama-labs.png"\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <atacama-logo>\r\nContent-Disposition: inline; filename="logo-atacama-labs.png"\r\n\r\n' + wrap76(o.inline_png_b64));
  related.push('--' + rel + '--');
  const body = ['--' + alt, part('text/plain', o.text), '--' + alt, 'Content-Type: multipart/related; boundary="' + rel + '"\r\n', related.join('\r\n'), '--' + alt + '--', ''].join('\r\n');
  return { raw: b64url(common.concat(['Content-Type: multipart/alternative; boundary="' + alt + '"']).join('\r\n') + '\r\n\r\n' + body), message_id: messageId };
}

export function codeFrom(rnd) { const r = rnd || Math.random; return 'CONF-' + (100000 + Math.floor(r() * 900000)); }

export function preview(m) { return { id: m.id, kind: m.kind, to: m.to_email, subject: m.subject, body: m.body, status: m.status, hash: m.content_hash }; }

/**
 * Operaciones del motor. Todas devuelven { response, writes[] } donde cada write es
 * { method: 'POST'|'PATCH', path: 'tabla?filtro', body, prefer }. No tocan nada por sí mismas.
 */
export function planDraft(req, ctx) {
  const now = new Date(ctx.now).toISOString();
  const cand = ctx.candidate;
  const kind = ['initial', 'followup_1', 'followup_2', 'reply'].includes(req.kind) ? req.kind : 'initial';
  const fail = (code, message) => ({ response: { ok: false, status: 'error', error: code, message }, writes: [] });
  if (!cand) return fail('candidato_no_encontrado', 'El prospecto no está guardado en Atacama OS: impórtalo primero.');
  if (cand.status === 'discarded') return fail('descartado', 'El prospecto está descartado: no se le escribe.');
  const history = ctx.history || [];
  const live = history.find((m) => m.kind === kind && ['draft', 'approved', 'sending'].includes(m.status)) || null;
  if (live && live.status === 'sending') return fail('en_envio', 'Ese correo se está enviando ahora mismo.');
  const sentSame = history.find((m) => m.kind === kind && m.direction === 'outbound' && m.status === 'sent');
  if (sentSame) return fail('ya_enviado', 'Ya se envió un correo de tipo «' + kind + '» a este prospecto: un solo envío por tipo (usa seguimiento o respuesta).');
  const initialSent = history.find((m) => m.kind === 'initial' && m.direction === 'outbound' && m.status === 'sent');
  if (kind !== 'initial' && !initialSent && kind !== 'reply') return fail('sin_primer_correo', 'Un seguimiento solo existe después de enviar el primer correo.');
  const canon = cand.canonical || {};
  const contact = canon.contact || {};
  const published = [contact.email].concat(canon.emails || []).filter(Boolean);
  const to = normEmail(req.to_email || (live && live.to_email) || contact.email || (initialSent && initialSent.to_email) || '');
  const drafts = cand.drafts || {};
  const inboundMsg = kind === 'reply' ? history.filter((m) => m.direction === 'inbound' && m.gmail_thread_id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] : null;
  if (kind === 'reply' && !inboundMsg) return fail('sin_respuesta_previa', 'No hay una respuesta del prospecto a la que contestar.');
  let subject = req.subject != null ? req.subject : (live ? live.subject : null);
  let body = req.body != null ? req.body : (live ? live.body : null);
  if (subject == null || body == null) {
    if (kind === 'initial') { subject = subject != null ? subject : (drafts.email_subject || null); body = body != null ? body : (drafts.email_body || null); }
    else if (kind === 'reply') { if (subject == null) subject = 'Re: ' + String((inboundMsg && inboundMsg.subject) || (initialSent && initialSent.subject) || 'Atacama Labs').replace(/^re:s*/i, ''); }
    else { const t = followupTemplate(kind, cand, initialSent && initialSent.subject); subject = subject != null ? subject : t.subject; body = body != null ? body : t.body; }
  }
  if (subject != null || body != null) { const cl = cleanDraftText(subject, body); subject = cl.subject; body = cl.body; }
  if (subject == null || body == null) return fail('sin_contenido', kind === 'reply' ? 'Redacta la respuesta (body) para guardarla como borrador.' : 'No hay borrador base: indica subject y body.');
  const inbound = inboundMsg;
  const v = validateDraft({ to_email: to, subject, body }, { suppression: ctx.suppression, allowed_emails: published, override_to: req.override_to === true });
  if (!v.ok) return { response: { ok: false, status: 'invalid_draft', error: 'borrador_invalido', message: 'El borrador no se puede guardar: ' + v.errors.join('; ') + '.', errors: v.errors }, writes: [] };
  const hash = contentHash(to, subject, body);
  const base = { to_email: to, subject: String(subject).trim(), body: String(body).trim(), content_hash: hash, status: 'draft', confirm_code: null, confirm_hash: null, confirm_expires_at: null, approved_by: null, approved_at: null, approval_text: null, scheduled_for: null, updated_at: now };
  let writes, msg, invalidated = false;
  if (live) {
    invalidated = live.status === 'approved' && live.content_hash !== hash;
    if (live.content_hash === hash && live.status !== 'draft') return { response: { ok: true, status: 'unchanged', message: 'El borrador ya está así y ' + (live.status === 'approved' ? 'aprobado.' : 'guardado.'), draft: preview(live) }, writes: [] };
    msg = { ...live, ...base };
    writes = [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + live.id, body: base }];
  } else {
    const id = ctx.new_id;
    msg = { id, candidate_id: cand.id, company_name: cand.company_name, ghl_contact_id: cand.ghl_contact_id || null, ghl_opportunity_id: cand.ghl_opportunity_id || null, kind, direction: 'outbound', from_email: ctx.config && ctx.config.from_email || null, created_by: req.by || 'Christian vía Hermes', created_at: now, metadata: inbound ? { reply_to_message_id: inbound.id } : {}, gmail_thread_id: inbound ? inbound.gmail_thread_id : (initialSent ? initialSent.gmail_thread_id : null), in_reply_to: inbound ? (inbound.rfc_message_id || null) : (initialSent ? (initialSent.rfc_message_id || null) : null), ...base };
    writes = [{ method: 'POST', path: 'outreach_messages', body: msg, prefer: 'return=minimal' }];
  }
  return { response: { ok: true, status: live ? 'updated' : 'created', message: (live ? 'Actualicé' : 'Guardé') + ' el borrador de ' + cand.company_name + ' (' + kind + ', NO enviado)' + (invalidated ? '. La aprobación anterior quedó anulada: hay que aprobarlo de nuevo.' : '.'), draft: preview(msg), approval_invalidated: invalidated, warnings: [], next: 'approve_outreach' }, writes, message: msg };
}

export function planApprove(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate;
  const fail = (code, message, status) => ({ response: { ok: false, status: status || 'error', error: code, message }, writes: [] });
  const history = ctx.history || [];
  const kind = req.kind;
  const lives = history.filter((m) => (!kind || m.kind === kind) && ['draft', 'approved', 'sending'].includes(m.status) && m.direction === 'outbound');
  if (lives.length > 1) return fail('varios_borradores', 'Hay varios correos pendientes (' + lives.map((m) => m.kind).join(', ') + '): indica kind.');
  const live = lives[0];
  if (!cand || !live) return fail('sin_borrador', 'No hay un borrador guardado para ese prospecto: créalo primero (draft).');
  if (live.status === 'sending') return fail('en_envio', 'Ese correo se está enviando ahora mismo.');
  if (live.status === 'approved') return { response: { ok: true, status: 'already_approved', message: 'Ya estaba aprobado; sale en la próxima ventana de envío.', draft: preview(live), scheduled_for: live.scheduled_for }, writes: [] };
  if (cand.status === 'discarded') return fail('descartado', 'El prospecto está descartado.');
  const v = validateDraft({ to_email: live.to_email, subject: live.subject, body: live.body }, { suppression: ctx.suppression });
  if (!v.ok) return { response: { ok: false, status: 'invalid_draft', error: 'borrador_invalido', message: 'No se puede aprobar: ' + v.errors.join('; ') + '.', errors: v.errors }, writes: [] };
  const hash = contentHash(live.to_email, live.subject, live.body);
  const code = String(req.confirmation_code || '').trim();
  if (!code) {
    const c = codeFrom(ctx.rnd);
    const exp = new Date(nowMs + 30 * 60000).toISOString();
    return { response: { ok: false, status: 'confirmation_required', confirmation_code: c, expires_at: exp, executed: false, safety: { messages_sent: 0 },
      message: 'Falta la confirmación de Christian. Muéstrale EXACTAMENTE este correo (destinatario, asunto y cuerpo) y pídele que confirme. Si confirma, vuelve a llamar con confirmation_code y sus palabras en christian_order. El correo se enviará en la próxima ventana (lun-vie 09:00-17:30), nunca en este momento.', preview: { ...preview(live), rendered: renderEmail(live, ctx.config || {}).text } },
      writes: [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + live.id, body: { confirm_code: c, confirm_hash: hash, confirm_expires_at: exp, updated_at: now } }] };
  }
  if (!live.confirm_code || live.confirm_code !== code) return fail('codigo_invalido', 'El código de confirmación no corresponde a este correo. Pide uno nuevo (llama sin código).', 'invalid_code');
  if (!live.confirm_expires_at || Date.parse(live.confirm_expires_at) < nowMs) return fail('codigo_vencido', 'El código venció (30 min). Pide uno nuevo y confirma de nuevo.', 'expired_code');
  if (live.confirm_hash !== hash) return fail('contenido_cambio', 'El correo cambió después de emitir el código: Christian debe ver y confirmar la versión actual.', 'content_changed');
  const order = String(req.order_text || '').trim();
  if (order.length < 4) return fail('falta_orden', 'Falta christian_order: las palabras exactas con las que Christian confirmó el envío.', 'needs_explicit_order');
  const sched = ctx.config ? nextWindowStart(nowMs, ctx.config) : nowMs;
  const upd = { status: 'approved', approved_by: req.by || 'Christian vía Hermes', approved_at: now, approval_text: order.slice(0, 400), scheduled_for: new Date(sched).toISOString(), confirm_code: null, confirm_hash: null, confirm_expires_at: null, updated_at: now };
  return { response: { ok: true, status: 'approved', executed: true, safety: { messages_sent: 0 }, message: 'Aprobado: ' + cand.company_name + ' (' + live.to_email + '). Saldrá ' + (sched <= nowMs + 60000 ? 'en la próxima corrida (cada 10 min)' : 'en la próxima ventana de envío (' + new Date(sched).toISOString() + ')') + '. Aún NO se ha enviado; puedes cancelarlo antes.', draft: preview({ ...live, ...upd }), scheduled_for: upd.scheduled_for },
    writes: [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + live.id + '&status=eq.draft', body: upd }], approved: { ...live, ...upd } };
}

export function planCancel(req, ctx) {
  const live = (ctx.history || []).find((m) => (!req.kind || m.kind === req.kind) && ['draft', 'approved'].includes(m.status) && m.direction === 'outbound');
  if (!live) return { response: { ok: false, status: 'not_found', error: 'sin_borrador', message: 'No hay un correo pendiente que cancelar.' }, writes: [] };
  const now = new Date(ctx.now).toISOString();
  return { response: { ok: true, status: 'cancelled', message: 'Cancelé el correo ' + live.kind + ' de ' + (ctx.candidate ? ctx.candidate.company_name : '') + ' (no se enviará).' }, writes: [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + live.id + '&status=in.(draft,approved)', body: { status: 'cancelled', confirm_code: null, updated_at: now, error: 'cancelado por ' + (req.by || 'Christian') } }] };
}

export function messageView(m) {
  return { id: m.id, company: m.company_name, kind: m.kind, direction: m.direction, status: m.status, to: m.to_email, subject: m.subject, classification: m.classification || null, at: m.sent_at || m.created_at, scheduled_for: m.scheduled_for || null, preview: String(m.body || '').slice(0, 280), thread: m.gmail_thread_id || null, error: m.error || null };
}

/** Elige UN mensaje para enviar ahora (o explica por qué no). Mantiene el espaciado: una corrida = máximo un correo. */
export function pickDue(msgs, cfg, nowMs, sentToday, suppression, candidatesById, inboundByCandidate, lastSentByCandidate) {
  if (!cfg || cfg.mode === 'off') return { action: 'none', reason: 'modo off: el envío está apagado' };
  if (cfg.paused) return { action: 'none', reason: 'pausa de emergencia activa' };
  if (!inSendWindow(nowMs, cfg)) return { action: 'none', reason: 'fuera de la ventana de envío (lun-vie ' + cfg.window_start + '-' + cfg.window_end + ')' };
  if (cfg.mode === 'live' && (Number(sentToday) || 0) >= Number(cfg.daily_cap || 10)) return { action: 'none', reason: 'tope diario alcanzado (' + cfg.daily_cap + ')' };
  const due = (msgs || []).filter((m) => m.status === 'approved' && m.direction === 'outbound' && (!m.scheduled_for || Date.parse(m.scheduled_for) <= nowMs)).sort((a, b) => String(a.scheduled_for || a.created_at).localeCompare(String(b.scheduled_for || b.created_at)));
  const skipped = [];
  for (const m of due) {
    const c = candidatesById && candidatesById[m.candidate_id];
    if (cfg.mode === 'test_sim' && !/TEST/.test(String((c && c.company_name) || m.company_name || ''))) { skipped.push({ id: m.id, why: 'test_sim solo procesa candidatos TEST' }); continue; }
    if (cfg.mode === 'live' && /TEST/.test(String(m.company_name || '')) ) { skipped.push({ id: m.id, why: 'candidato TEST nunca se envía en modo live' }); continue; }
    if (cfg.mode === 'live' && Array.isArray(cfg.send_allowlist) && cfg.send_allowlist.length && !cfg.send_allowlist.map(normEmail).includes(normEmail(m.to_email))) { skipped.push({ id: m.id, why: 'lista blanca de envío: ' + normEmail(m.to_email) + ' no está autorizado' }); continue; }
    const sup = checkSuppression(m.to_email, suppression);
    if (sup) return { action: 'cancel', message: m, reason: 'suprimido (' + sup.reason + ')' };
    if (c && c.status === 'discarded') return { action: 'cancel', message: m, reason: 'el prospecto fue descartado' };
    if (contentHash(m.to_email, m.subject, m.body) !== m.content_hash) return { action: 'cancel', message: m, reason: 'el contenido cambió después de la aprobación' };
    if (m.kind !== 'initial' && m.kind !== 'reply') {
      if (lastSentByCandidate && lastSentByCandidate[m.candidate_id] && nowMs - lastSentByCandidate[m.candidate_id] < 48 * 3600000) { skipped.push({ id: m.id, why: 'espaciado: menos de 48 h desde el último correo a este prospecto' }); continue; }
      if (inboundByCandidate && inboundByCandidate[m.candidate_id]) return { action: 'cancel', message: m, reason: 'el prospecto ya respondió' };
    }
    return { action: 'send', message: m, candidate: c || null, mode: cfg.mode };
  }
  return { action: 'none', reason: due.length ? 'nada elegible' : 'sin mensajes aprobados pendientes', skipped };
}

/** Efectos de un envío: filas de Supabase y operaciones de GHL (vía Prospect Gateway act). */
export function planSendResult(msg, cand, cfg, res, nowMs) {
  const now = new Date(nowMs).toISOString();
  const mode = cfg.mode;
  const ok = res && res.ok === true;
  const upd = ok ? { status: mode === 'dry_run' ? 'dry_run' : 'sent', ...(mode === 'dry_run' ? {} : { effect_key: 'send:' + msg.id }), sent_at: mode === 'dry_run' ? null : now, gmail_message_id: res.gmail_message_id || null, gmail_thread_id: res.gmail_thread_id || msg.gmail_thread_id || null, rfc_message_id: res.rfc_message_id || null, from_email: cfg.from_email || msg.from_email || null, error: null, updated_at: now, metadata: { ...(msg.metadata || {}), mode, sent_via: mode === 'live' ? 'gmail' : 'simulado' } }
    : { status: 'failed', error: String((res && res.error) || 'envío falló').slice(0, 300), updated_at: now };
  const writes = [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + msg.id + '&status=in.(approved,sending)', body: upd }];
  const effects = [];
  if (ok && mode !== 'dry_run') {
    if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { last_contact_channel: 'email', last_contact_at: now, status: cand.status === 'in_ghl' || cand.status === 'accepted' ? 'contacted' : cand.status, ghl_stage: cand.ghl_stage === 'investigado' || !cand.ghl_stage ? 'contactado' : cand.ghl_stage, updated_at: now } });
    effects.push({ type: 'gateway_act', act: { type: 'mark_contacted', channel: 'email', by_system: true, note: (mode === 'test_sim' ? '[SIMULADO] ' : '') + 'Correo enviado' + (msg.kind !== 'initial' ? ' (' + msg.kind + ')' : '') + ' a ' + msg.to_email + ' · asunto: «' + msg.subject + '». Sistema: Atacama OS (aprobado por ' + (msg.approved_by || 'Christian') + ').', follow_up_days: 0 } });
  }
  return { update: upd, writes, effects, ok };
}

/** Qué hacer con un mensaje entrante ya clasificado. */
export function planInbound(m, cls, msg, cand, nowMs) {
  const now = new Date(nowMs).toISOString();
  const row = { id: newId(), candidate_id: cand ? cand.id : (msg ? msg.candidate_id : null), company_name: cand ? cand.company_name : (msg ? msg.company_name : null), ghl_contact_id: cand ? cand.ghl_contact_id : null, ghl_opportunity_id: cand ? cand.ghl_opportunity_id : null,
    kind: 'other', direction: 'inbound', to_email: m.to || null, from_email: normEmail(String(m.from || '').replace(/^.*</, '').replace(/>.*$/, '')), subject: String(m.subject || '').slice(0, 300), body: newText(m.body || m.snippet || '').slice(0, 4000), status: 'received', classification: cls.cls,
    gmail_message_id: m.id || null, gmail_thread_id: m.thread_id || null, rfc_message_id: m.rfc_message_id || null, in_reply_to: m.in_reply_to || null, effect_key: 'recv:' + (m.id || newId()), metadata: { reason: cls.reason, failed_recipient: cls.failed_recipient || null, received_at: m.date || now }, created_by: 'gmail-sync', created_at: now, updated_at: now };
  const writes = [{ method: 'POST', path: 'outreach_messages?on_conflict=effect_key', body: row, prefer: 'resolution=ignore-duplicates,return=minimal' }];
  const effects = [];
  const email = row.from_email;
  const co = row.company_name || 'prospecto';
  if (cls.cls === 'own' || cls.cls === 'auto_reply') return { row, writes, effects, stop_followups: false, summary: cls.cls === 'own' ? 'mensaje propio (ignorado)' : 'respuesta automática (el seguimiento sigue)' };
  if (cls.cls === 'bounce') {
    const target = cls.failed_recipient || (msg && msg.to_email) || '';
    if (target && cls.hard !== false) writes.push({ method: 'POST', path: 'outreach_suppression?on_conflict=email', body: { email: normEmail(target), reason: 'bounce', source: 'gmail-sync', candidate_id: row.candidate_id, note: String(cls.reason).slice(0, 200) }, prefer: 'resolution=ignore-duplicates,return=minimal' });
    if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { next_action_at: null, updated_at: now } });
    effects.push({ type: 'gateway_act', act: { type: 'add_note', note: 'REBOTE: el correo a ' + (target || 'el destinatario') + ' no se pudo entregar. Se detiene el seguimiento por correo; consigue otro canal o correo publicado.' } });
    return { row, writes, effects, stop_followups: true, summary: 'rebote' + (target ? ' de ' + target : '') };
  }
  if (cls.cls === 'unsubscribe') {
    writes.push({ method: 'POST', path: 'outreach_suppression?on_conflict=email', body: { email, reason: 'unsubscribe', source: 'gmail-sync', candidate_id: row.candidate_id, note: 'pidió no recibir más mensajes' }, prefer: 'resolution=ignore-duplicates,return=minimal' });
    if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { status: 'discarded', next_action_at: null, updated_at: now } });
    effects.push({ type: 'gateway_act', act: { type: 'discard', reason: 'Pidió no recibir más mensajes (baja). No volver a contactar.' } });
    return { row, writes, effects, stop_followups: true, summary: 'baja: ' + co };
  }
  if (cls.cls === 'decline') {
    if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { next_action_at: null, updated_at: now } });
    effects.push({ type: 'gateway_act', act: { type: 'move_stage', stage: 'respondio', note: 'RESPUESTA NEGATIVA de ' + co + ': «' + row.body.slice(0, 280) + '». Seguimientos detenidos. Decide si pasar a Perdida o intentar otro ángulo.' } });
    return { row, writes, effects, stop_followups: true, summary: 'respuesta negativa: ' + co };
  }
  if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { status: 'contacted', ghl_stage: 'respondio', last_contact_channel: 'email', last_contact_at: now, next_action_at: null, updated_at: now } });
  effects.push({ type: 'gateway_act', act: { type: 'move_stage', stage: 'respondio', note: 'RESPUESTA por correo de ' + co + ' (' + email + '): «' + row.body.slice(0, 500) + '»' } });
  return { row, writes, effects, stop_followups: true, summary: 'respuesta humana de ' + co };
}

export function decodeB64url(s) { try { return Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch (e) { return ''; } }
export function htmlToText(h) { return String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim(); }
export function findPart(part, mime) {
  if (!part) return null;
  if (part.mimeType === mime && part.body && part.body.data) return part;
  for (const p of part.parts || []) { const r = findPart(p, mime); if (r) return r; }
  return null;
}
/** users.threads.get (format=full) → mensajes normalizados {id, thread_id, from, to, subject, date, rfc_message_id, in_reply_to, headers, body, snippet, labels}. */
export function parseGmailThread(thread) {
  const out = [];
  for (const m of (thread && thread.messages) || []) {
    const headers = {};
    for (const h of (m.payload && m.payload.headers) || []) headers[String(h.name).toLowerCase()] = h.value;
    const plain = findPart(m.payload, 'text/plain'), html = findPart(m.payload, 'text/html');
    const body = plain ? decodeB64url(plain.body.data) : html ? htmlToText(decodeB64url(html.body.data)) : decodeB64url(m.payload && m.payload.body && m.payload.body.data);
    out.push({ id: m.id, thread_id: m.threadId || (thread && thread.id), from: headers['from'] || '', to: headers['to'] || '', subject: headers['subject'] || '', date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : headers['date'] || null, rfc_message_id: headers['message-id'] || null, in_reply_to: headers['in-reply-to'] || null, headers, body, snippet: m.snippet || '', labels: m.labelIds || [] });
  }
  return out;
}

/** Correos publicados del candidato (contacto principal y adicionales del canónico). */
export function canonicalEmails(cand) {
  const c = (cand && cand.canonical) || {};
  return [...new Set([(c.contact || {}).email].concat(c.emails || []).filter(Boolean).map(normEmail))];
}

/** NO CONTACTAR: suprime todos los correos conocidos del prospecto, lo descarta y cancela lo pendiente. */
export function planSuppress(req, ctx) {
  const cand = ctx.candidate;
  if (!cand) return { response: { ok: false, status: 'not_found', error: 'candidato_no_encontrado', message: 'El prospecto no está guardado en Atacama OS.' }, writes: [] };
  const now = new Date(ctx.now).toISOString();
  const emails = [...new Set(canonicalEmails(cand).concat((ctx.history || []).map((m) => normEmail(m.to_email)).filter(Boolean)))];
  const reason = String(req.reason || 'no contactar').slice(0, 300);
  const writes = emails.map((e) => ({ method: 'POST', path: 'outreach_suppression?on_conflict=email', body: { email: e, reason: 'do_not_contact', source: 'operator', candidate_id: cand.id, note: reason }, prefer: 'resolution=ignore-duplicates,return=minimal' }));
  const live = (ctx.history || []).filter((m) => m.direction === 'outbound' && ['draft', 'approved'].includes(m.status));
  live.forEach((m) => writes.push({ method: 'PATCH', path: 'outreach_messages?id=eq.' + m.id + '&status=in.(draft,approved)', body: { status: 'cancelled', confirm_code: null, error: 'No contactar: ' + reason, updated_at: now } }));
  writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { status: 'discarded', next_action_at: null, updated_at: now } });
  return { response: { ok: true, status: 'suppressed', message: cand.company_name + ': ' + emails.length + ' correo(s) suprimidos, ' + live.length + ' mensaje(s) pendiente(s) cancelado(s). No se le vuelve a escribir.', suppressed_emails: emails, cancelled: live.length }, writes };
}

// =====================================================================================================================
// Follow-up comercial (Bloque 1, parte 2)
// Reglas: 1er seguimiento a +3 días hábiles y 2º a +7 días hábiles desde el PRIMER envío; después parar. Cada seguimiento es un borrador
// que Christian aprueba (nunca se autoenvía) + una tarea en GHL. Se cancela todo si hay respuesta, rebote, baja, descarte o Won/Lost.
// =====================================================================================================================

export function followupSlots(sentMs, cfg) {
  const d = (cfg && Array.isArray(cfg.followup_days) && cfg.followup_days.length >= 2 ? cfg.followup_days : [3, 7]).map(Number);
  const tz = (cfg && cfg.tz) || 'America/Santiago';
  return [{ kind: 'followup_1', n: 1, days: d[0], due: Date.parse(addBusinessDaysIso(sentMs, d[0], tz)) }, { kind: 'followup_2', n: 2, days: d[1], due: Date.parse(addBusinessDaysIso(sentMs, d[1], tz)) }];
}

/** Por qué se detiene la secuencia de un candidato (o null si sigue). */
export function followupStopReason(cand, to, msgs, suppression, closedOppIds) {
  if (!cand) return 'sin_prospecto';
  if (cand.status === 'discarded') return 'descartado';
  if (cand.ghl_opportunity_id && closedOppIds && closedOppIds[cand.ghl_opportunity_id]) return 'oportunidad_' + closedOppIds[cand.ghl_opportunity_id];
  if (checkSuppression(to, suppression)) return 'suprimido';
  const lin = cand.channel_state && cand.channel_state.linkedin && cand.channel_state.linkedin.state; // respuesta/rechazo/detención por LinkedIn también frenan el correo
  if (['respondio', 'rechazo', 'detenido'].includes(lin)) return 'linkedin_' + lin;
  const inbound = (msgs || []).filter((m) => m.direction === 'inbound' && ['reply', 'decline', 'unsubscribe', 'bounce'].includes(m.classification));
  if (inbound.length) { const c = inbound[0].classification; return c === 'reply' ? 'respondio' : c === 'decline' ? 'rechazo' : c === 'unsubscribe' ? 'baja' : 'rebote'; }
  return null;
}

export function followupTitle(n, co) { return 'Seguimiento ' + n + ' · ' + String(co || '').slice(0, 80); }

/** Candidatos cuyas tareas de GHL hay que revisar antes de crearlas (evita duplicados reales). */
export function followupsNeedingTaskCheck(ctx) {
  const out = [];
  for (const m of ctx.initials || []) {
    const meta = m.metadata || {};
    if (meta.followup_state || meta.followup_tasks) continue;
    const cand = (ctx.candidates || {})[m.candidate_id];
    if (!cand || !cand.ghl_contact_id) continue;
    if (followupStopReason(cand, m.to_email, (ctx.byCandidate || {})[m.candidate_id], ctx.suppression, ctx.closed)) continue;
    out.push({ contact_id: cand.ghl_contact_id, msg_id: m.id });
  }
  return out;
}

/**
 * Plan del seguimiento. ctx = { now, config, initials[], byCandidate{candId:[msgs]}, candidates{id:row}, suppression[], closed{oppId:'won'|'lost'},
 *   contactTasks{contactId:[tasks]}, ghl:{base,locationId,userId}, newId() }.
 * Devuelve { ghl_ops[], writes[], actions[], meta_updates{} }. Los ids de las tareas nuevas se registran en finalizeFollowups.
 */
export function planFollowups(ctx) {
  const now = ctx.now, iso = new Date(now).toISOString();
  const cfg = ctx.config || {};
  const ghl = ctx.ghl || {};
  const ghl_ops = [], writes = [], actions = [], meta_updates = {};
  const setMeta = (m, patch) => { meta_updates[m.id] = { ...(meta_updates[m.id] || (m.metadata || {})), ...patch }; };
  for (const m of ctx.initials || []) {
    const cand = (ctx.candidates || {})[m.candidate_id];
    const msgs = (ctx.byCandidate || {})[m.candidate_id] || [];
    const meta = m.metadata || {};
    const state = meta.followup_state || null;
    if (state && /^(stopped|done)/.test(state)) continue;
    const co = (cand && cand.company_name) || m.company_name || 'prospecto';
    const sentMs = Date.parse(m.sent_at || m.created_at);
    if (!Number.isFinite(sentMs)) continue;
    const reason = followupStopReason(cand, m.to_email, msgs, ctx.suppression, ctx.closed);
    if (reason) {
      msgs.filter((x) => x.direction === 'outbound' && ['followup_1', 'followup_2'].includes(x.kind) && ['draft', 'approved'].includes(x.status)).forEach((x) => writes.push({ method: 'PATCH', path: 'outreach_messages?id=eq.' + x.id + '&status=in.(draft,approved)', body: { status: 'cancelled', confirm_code: null, error: 'Seguimiento detenido: ' + reason, updated_at: iso } }));
      const tasks = meta.followup_tasks || {};
      ['f1', 'f2'].forEach((k) => { if (tasks[k] && tasks[k].id && !tasks[k].deleted) ghl_ops.push({ kind: 'task_delete', msg_id: m.id, slot: k, method: 'DELETE', url: ghl.base + '/locations/' + ghl.locationId + '/tasks/' + tasks[k].id, body: null }); });
      setMeta(m, { followup_state: 'stopped:' + reason, followup_stopped_at: iso });
      if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { next_action_at: null, updated_at: iso } });
      actions.push({ company: co, action: 'detenido', reason });
      continue;
    }
    const slots = followupSlots(sentMs, cfg);
    if (!meta.followup_tasks && cand && cand.ghl_contact_id) {
      const existing = ((ctx.contactTasks || {})[cand.ghl_contact_id]) || [];
      const tasks = {};
      slots.forEach((s) => {
        const title = followupTitle(s.n, co);
        const found = existing.find((t) => String(t.title || '') === title);
        if (found) { tasks['f' + s.n] = { id: found.id || found._id, due: new Date(s.due).toISOString(), reused: true }; return; }
        ghl_ops.push({ kind: 'task_create', msg_id: m.id, slot: 'f' + s.n, method: 'POST', url: ghl.base + '/contacts/' + cand.ghl_contact_id + '/tasks',
          body: { title, body: 'Han pasado ' + s.days + ' días hábiles desde el primer correo a ' + co + ' sin respuesta. Hermes deja un borrador de seguimiento listo (pídele: «muéstrame el seguimiento de ' + co + '»). La tarea se cancela sola si responde, rebota, se da de baja o se descarta.', dueDate: new Date(s.due).toISOString(), completed: false, assignedTo: ghl.userId } });
      });
      setMeta(m, { followup_tasks: tasks, ...(meta.followup_state ? {} : { followup_state: 'active', followup_started_at: iso }) });
    } else if (!meta.followup_state) setMeta(m, { followup_state: 'active', followup_started_at: iso });
    const byKind = (k) => msgs.filter((x) => x.direction === 'outbound' && x.kind === k);
    const f1 = byKind('followup_1'), f2 = byKind('followup_2');
    const live = (arr) => arr.find((x) => ['draft', 'approved', 'sending'].includes(x.status));
    const draftFor = (kind, history) => {
      const r = planDraft({ kind, by: 'Atacama OS · seguimiento' }, { now, candidate: cand, history, suppression: ctx.suppression, new_id: ctx.newId(), config: cfg });
      if (r.response.ok && r.writes.length) { r.writes.forEach((w) => writes.push(w)); actions.push({ company: co, action: 'borrador_' + kind, due: new Date(slots.find((s) => s.kind === kind).due).toISOString() }); return true; }
      actions.push({ company: co, action: 'borrador_no_creado_' + kind, why: r.response.message || r.response.error });
      return false;
    };
    const s1 = slots[0], s2 = slots[1];
    if (now >= s2.due) {
      if (f2.length === 0) {
        const f1live = live(f1);
        if (!(f1live && f1live.status !== 'draft')) {
          if (f1live) writes.push({ method: 'PATCH', path: 'outreach_messages?id=eq.' + f1live.id + '&status=eq.draft', body: { status: 'cancelled', error: 'Seguimiento 1 caducó sin aprobarse: se prepara el 2', updated_at: iso } });
          draftFor('followup_2', f1live ? msgs.filter((x) => x.id !== f1live.id) : msgs);
        }
      }
      const f2done = f2.length > 0 && !live(f2);
      if (f2done) { setMeta(m, { followup_state: 'done', followup_done_at: iso }); if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { next_action_at: null, updated_at: iso } }); actions.push({ company: co, action: 'secuencia_terminada' }); }
    } else if (now >= s1.due) {
      if (f1.length === 0) draftFor('followup_1', msgs);
      if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { next_action_at: new Date(s2.due).toISOString(), updated_at: iso } });
    } else if (cand) writes.push({ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { next_action_at: new Date(s1.due).toISOString(), updated_at: iso } });
  }
  return { ghl_ops, writes, actions, meta_updates };
}

/** Cierra el plan con las respuestas de GHL: guarda ids de tareas y estados. Devuelve las escrituras de Supabase. */
export function finalizeFollowups(plan, results, ctx) {
  const iso = new Date(ctx.now).toISOString();
  const meta = {};
  Object.keys(plan.meta_updates).forEach((k) => { meta[k] = { ...plan.meta_updates[k] }; });
  const errors = [];
  plan.ghl_ops.forEach((op, i) => {
    const res = (results || [])[i] || {};
    const ok = (res.statusCode || 0) > 0 && (res.statusCode || 0) < 300;
    if (!op.msg_id) { if (!ok) errors.push({ kind: op.kind, slot: op.slot, status: res.statusCode || 0 }); return; }
    const cur = meta[op.msg_id] || (meta[op.msg_id] = {});
    if (!ok) { errors.push({ kind: op.kind, slot: op.slot, status: res.statusCode || 0 }); if (op.kind === 'task_create' && cur.followup_tasks) { const ft = { ...cur.followup_tasks }; delete ft[op.slot]; cur.followup_tasks = ft; } return; }
    if (op.kind === 'task_create') { const t = (res.body && (res.body.task || res.body)) || {}; cur.followup_tasks = { ...(cur.followup_tasks || {}), [op.slot]: { id: t.id || t._id, due: op.body.dueDate } }; }
    if (op.kind === 'task_delete') { const ft = { ...(cur.followup_tasks || {}) }; if (ft[op.slot]) ft[op.slot] = { ...ft[op.slot], deleted: true }; cur.followup_tasks = ft; }
  });
  const writes = plan.writes.slice();
  Object.keys(meta).forEach((id) => writes.push({ method: 'PATCH', path: 'outreach_messages?id=eq.' + id, body: { metadata: meta[id], updated_at: iso } }));
  return { writes, errors };
}

/** Higiene de tareas: la automatización nativa de GHL a veces crea dos tareas idénticas. Conserva la más antigua y borra las demás (mismo título y mismo día de vencimiento, no completadas). */
export function dedupeReviewTasks(tasksByContact, contactIds, ghl) {
  const ops = [];
  for (const cid of contactIds || []) {
    const tasks = ((tasksByContact || {})[cid] || []).filter((t) => t && !t.completed);
    const groups = {};
    tasks.forEach((t) => { const k = String(t.title || '') + '|' + String(t.dueDate || '').slice(0, 10); (groups[k] = groups[k] || []).push(t); });
    Object.keys(groups).forEach((k) => {
      const g = groups[k];
      if (g.length < 2) return;
      g.sort((a, b) => String(a.dateAdded || a.createdAt || '').localeCompare(String(b.dateAdded || b.createdAt || '')) || String(a.id || a._id).localeCompare(String(b.id || b._id)));
      g.slice(1).forEach((t) => ops.push({ kind: 'task_dedupe', msg_id: null, slot: 'dup', method: 'DELETE', url: ghl.base + '/locations/' + ghl.locationId + '/tasks/' + (t.id || t._id), body: null, title: t.title }));
    });
  }
  return ops;
}

/** Vista para Hermes: estado del seguimiento de cada primer correo enviado. */
export function followupOverview(initials, byCandidate, candidates, cfg, nowMs) {
  return (initials || []).map((m) => {
    const cand = (candidates || {})[m.candidate_id] || {};
    const msgs = (byCandidate || {})[m.candidate_id] || [];
    const sentMs = Date.parse(m.sent_at || m.created_at);
    const slots = Number.isFinite(sentMs) ? followupSlots(sentMs, cfg) : [];
    const meta = m.metadata || {};
    const pick = (k) => { const x = msgs.find((y) => y.direction === 'outbound' && y.kind === k && y.status !== 'cancelled') || msgs.find((y) => y.direction === 'outbound' && y.kind === k); return x ? { status: x.status, id: x.id } : null; };
    const replied = msgs.some((x) => x.direction === 'inbound' && ['reply', 'decline', 'unsubscribe', 'bounce'].includes(x.classification));
    return { company: cand.company_name || m.company_name, to: m.to_email, first_sent_at: m.sent_at, state: meta.followup_state || 'pendiente', replied,
      followup_1: { due: slots[0] ? new Date(slots[0].due).toISOString() : null, due_now: slots[0] ? nowMs >= slots[0].due : false, message: pick('followup_1') },
      followup_2: { due: slots[1] ? new Date(slots[1].due).toISOString() : null, due_now: slots[1] ? nowMs >= slots[1].due : false, message: pick('followup_2') } };
  });
}
