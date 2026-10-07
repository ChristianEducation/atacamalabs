/**
 * Atacama OS · Prospect Gateway — núcleo (funciones puras, AUTOCONTENIDAS).
 *
 * Cada función se prueba con `gateway-core.test.mjs` y se incrusta tal cual (`Function.prototype.toString`) en el workflow n8n
 * «19 Prospect Gateway». Por eso: sin imports y sin constantes de módulo (todo vive dentro de cada función).
 *
 * Principio: Atacama OS no decide «¿puedo demostrar que esta empresa necesita Atacama?» sino «¿hay razón suficiente para intentar una
 * conversación?». Se busca fit razonable + señal observable + hipótesis comercial defendible + canal posible. NO se exige evidencia explícita
 * de «dolor». Se distingue siempre HECHO / INFERENCIA / HIPÓTESIS.
 */

/* ============================================================== NORMALIZACIÓN */

export function stripAccents(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export function normDomain(v) {
  if (!v) return null;
  let s = String(v).trim().toLowerCase();
  const m = s.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/);
  if (!m) return null;
  s = m[1];
  const social = ['facebook.com', 'instagram.com', 'linkedin.com', 'google.com', 'goo.gl', 'wa.me', 'whatsapp.com', 'linktr.ee', 'youtube.com', 'tiktok.com', 'x.com', 'twitter.com', 'wikipedia.org', 'openstreetmap.org'];
  if (social.some((d) => s === d || s.endsWith('.' + d))) return null;
  return s;
}

export function normEmail(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase().replace(/^mailto:/, '').replace(/[)>.,;\]]+$/, '');
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(s) && !/^(no-?reply|noreply|donotreply)@/.test(s) ? s : null;
}

/** Teléfono chileno → solo dígitos con prefijo 56 (p. ej. 56992240962); null si no parece un teléfono. */
export function normPhone(v) {
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.length < 8) return null;
  if (d.startsWith('56')) d = d.slice(2);
  if (d.length === 9 || d.length === 8 || d.length === 7 || d.length === 10) return '56' + d;
  return d.length > 10 && d.length <= 13 ? d : null;
}

export function normCompany(v) {
  return stripAccents(String(v == null ? '' : v)).toLowerCase().replace(/&amp;/g, ' y ').replace(/\b(spa|s\.a\.|sa|ltda|limitada|eirl|e\.i\.r\.l|chile|sociedad|compania)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normLocation(v) {
  return stripAccents(String(v == null ? '' : v)).toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter((w) => w.length > 2).slice(0, 2).join(' ');
}

/** Claves de identidad de un candidato (fuertes: dominio, correo, teléfono; media: nombre + ubicación). */
export function candidateKeys(c) {
  const keys = [];
  const d = normDomain(c.website);
  if (d) keys.push('d:' + d);
  const ct = c.contact || {};
  [ct.email].map(normEmail).filter(Boolean).forEach((e) => keys.push('e:' + e));
  [ct.phone, ct.whatsapp].map(normPhone).filter(Boolean).forEach((p) => keys.push('p:' + p.slice(-9)));
  const n = normCompany(c.company_name);
  const l = normLocation(c.location);
  if (n && l) keys.push('n:' + n + '|' + l);
  return [...new Set(keys)];
}

/** Clave canónica estable (idempotencia): dominio → correo → teléfono → nombre+ubicación → nombre. */
export function primaryKey(c) {
  const k = candidateKeys(c);
  const pick = (p) => k.find((x) => x.startsWith(p));
  return pick('d:') || pick('e:') || pick('p:') || pick('n:') || 'n:' + normCompany(c.company_name) + '|';
}

/* ============================================================== PARSERS */

export function decodeEntities(s) {
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', ordm: 'º', middot: '·', ndash: '–', mdash: '—', laquo: '«', raquo: '»', hellip: '…' };
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCharCode(n) : m; }
    return Object.prototype.hasOwnProperty.call(map, e) ? map[e] : m;
  });
}

export function htmlToText(html) {
  let s = String(html == null ? '' : html);
  s = s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ');
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(p|div|section|h[1-6]|summary|header|details|tr|ul|ol|article)[^>]*>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '\n- ').replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s).replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n');
  return s.trim();
}

/** Parte un texto en segmentos tipados HECHO / INFERENCIA / HIPÓTESIS según los marcadores del propio texto. */
export function splitTyped(text, defaultKind) {
  const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const re = /\b(Hecho|Inferencia|Hip[oó]tesis(?: comercial)?)\s*:/gi;
  const marks = [];
  let m;
  while ((m = re.exec(t)) !== null) marks.push({ idx: m.index, end: re.lastIndex, kind: /^hecho/i.test(m[1]) ? 'fact' : /^inferencia/i.test(m[1]) ? 'inference' : 'hypothesis' });
  const out = [];
  const lead = (marks.length ? t.slice(0, marks[0].idx) : t).trim();
  if (lead) out.push({ kind: defaultKind || 'fact', text: lead.replace(/[;\s]+$/, '') });
  marks.forEach((mk, i) => { const seg = t.slice(mk.end, i + 1 < marks.length ? marks[i + 1].idx : t.length).trim().replace(/[;\s]+$/, ''); if (seg) out.push({ kind: mk.kind, text: seg }); });
  return out;
}

export function sectionKey(label) {
  return stripAccents(label).toLowerCase().replace(/\s+/g, ' ').replace(/:+$/, '').trim();
}

/** Extrae por ficha todo lo posible. Soporta las 4 estructuras observadas (y degrada con gracia en otras). */
export function parseHtmlProspects(html) {
  const src = String(html == null ? '' : html);
  const parts = src.split(/<article[^>]*class="prospect[^"]*"/i).slice(1);
  const HEADINGS = ['senal / problema', 'oferta / piloto', 'buyer / precio', 'proceso visible', 'dolor', 'evidencia', 'buyer / contacto', 'agente propuesto', 'piloto 24-72h', 'integraciones / expansion', 'valor, precio y scoring', 'email preparado', 'whatsapp / linkedin', 'proceso', 'problema / oportunidad', 'agente profesional', 'base de conocimiento', 'herramientas / sistemas', 'accion ejecutada', 'integracion', 'implementacion', 'buyer probable / actor afectado', 'angulo / mensaje', 'problema, agente y financiero', 'contacto y mensaje'];
  const INLINE = ['puntaje', 'rating', 'resenas', 'sector', 'direccion', 'zona', 'categoria', 'tel', 'whatsapp', 'web', 'agente', 'agente administrativo/financiero', 'area financiera cubierta', 'piloto 24-72h', 'expansion', 'integraciones', 'decisor', 'como contactar', 'razon', 'apertura telefonica', 'email', 'vertical/nicho lety', 'ciudad / web / contacto', 'buyer probable / actor afectado', 'angulo / mensaje', 'una accion', 'fuentes'];
  const labelRe = new RegExp('(^|\\n|\\s)(' + INLINE.concat(['hecho', 'inferencia', 'hipotesis comercial', 'hipotesis']).map((l) => l.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/ /g, '\\s')).join('|') + ')\\s*:', 'gi');
  return parts.map((card) => {
    const data = {
      source: (card.match(/data-source="([^"]*)"/) || [])[1] || null,
      name: decodeEntities((card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || (card.match(/data-name="([^"]*)"/) || [])[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s*\[\d+\]/g, '').replace(/\s+/g, ' ').trim(),
      num: (card.match(/<div class="num">([^<]*)</) || [])[1] || null,
    };
    const links = [...card.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decodeEntities(m[1]), text: decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).trim() })).filter((l) => /^(https?:|mailto:)/i.test(l.href));
    // Mensajes preparados (<div class="msg">) se sacan antes de convertir a texto
    const msgs = [...card.matchAll(/<div class="msg">([\s\S]*?)<\/div>/gi)].map((m) => { const t = htmlToText(m[1]); const lm = t.match(/^([A-Za-zÁÉÍÓÚáéíóú \/]+):\s*/); return { label: lm ? lm[1].trim() : '', text: t.replace(/^[A-Za-zÁÉÍÓÚáéíóú \/]+:\s*/, '').trim() }; });
    const body = card.replace(/<div class="msg">[\s\S]*?<\/div>/gi, ' ');
    const scoreM = body.match(/<(?:b|span)[^>]*class="score"[^>]*>\s*([\d.]+)\s*\/\s*(\d+)/i) || htmlToText(body).match(/Puntaje:\s*([\d.]+)\s*\/\s*(\d+)/i);
    const tagM = body.match(/<span class="tag">\s*(?:\d+\s*·\s*)?([^<]+)</i);
    let text = htmlToText(body);
    // Secciones por encabezado de línea o por «Etiqueta:» en línea
    const sections = [];
    let cur = { key: 'intro', text: '' };
    const flush = () => { if (cur.text.trim() || cur.key !== 'intro') sections.push({ key: cur.key, text: cur.text.trim() }); };
    text.split('\n').forEach((line) => {
      const k = sectionKey(line);
      if (HEADINGS.includes(k)) { flush(); cur = { key: k, text: '' }; return; }
      // varias etiquetas en una línea: «Tel: x WhatsApp: y Web: z»
      const pieces = [];
      let last = 0;
      let m;
      labelRe.lastIndex = 0;
      const found = [];
      const nline = stripAccents(line);
      while ((m = labelRe.exec(nline)) !== null) { const lab = sectionKey(m[2]); if (['hecho', 'inferencia', 'hipotesis', 'hipotesis comercial'].includes(lab)) continue; found.push({ lab, start: m.index + m[1].length, end: labelRe.lastIndex }); }
      if (!found.length) { cur.text += (cur.text ? '\n' : '') + line; return; }
      if (found[0].start > 0 && line.slice(0, found[0].start).trim()) cur.text += (cur.text ? '\n' : '') + line.slice(0, found[0].start).trim();
      found.forEach((f, i) => { pieces.push({ key: f.lab, text: line.slice(f.end, i + 1 < found.length ? found[i + 1].start : line.length).trim() }); });
      pieces.forEach((p) => { flush(); cur = { key: p.key, text: p.text }; });
      last = 0;
    });
    flush();
    const get = (...keys) => sections.filter((s) => keys.includes(s.key)).map((s) => s.text).filter(Boolean).join('\n');
    return { data, links, msgs, sections, get, text, scoreM, tagM, body };
  }).map((c) => finishHtmlCard(c));
}

export function finishHtmlCard(c) {
  const { data, links, msgs, get, scoreM, tagM, text } = c;
  const clean = (s) => String(s || '').replace(/\s*\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
  const dash = (s) => { const v = clean(s); return !v || /^[—–-]+$/.test(v) || /^(n\/d|no (disponible|identificado)|pendiente)/i.test(v) ? '' : v; };
  const bad = /(google\.|goo\.gl|instagram\.|facebook\.|linkedin\.|wa\.me|maps\.|openstreetmap|nominatim|wikipedia|youtube\.|tiktok\.|twitter\.|x\.com)/i;
  // web
  let web = null;
  const webLabel = dash(get('web'));
  const webLink = links.find((l) => /^https?:/i.test(l.href) && !bad.test(l.href) && l.href !== '—');
  if (webLink) web = webLink.href;
  const urlInText = (webLabel + ' ' + get('ciudad / web / contacto')).match(/https?:\/\/[^\s·|)]+/i);
  if (!web && urlInText && !bad.test(urlInText[0])) web = urlInText[0];
  if (!web) { const dm = (webLabel || get('ciudad / web / contacto')).match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:cl|com|net|org|io|co|app|lat))\b/i); if (dm && !bad.test(dm[1])) web = 'https://' + dm[1].toLowerCase(); }
  // correos y teléfonos (solo de texto no-mensaje)
  const emails = [...new Set([...(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []), ...links.filter((l) => /^mailto:/i.test(l.href)).map((l) => l.href.replace(/^mailto:/i, ''))].map(normEmail).filter(Boolean))];
  const phoneRe = /(?:\+?56[\s-]?)?(?:9[\s-]?\d{4}[\s-]?\d{4}|\(?\d{1,2}\)?[\s-]?\d{3,4}[\s-]?\d{4})/g;
  const telText = [get('tel'), get('como contactar'), get('buyer / contacto'), get('buyer / precio'), get('ciudad / web / contacto'), get('decisor')].join(' | ');
  // Números con prefijo +56 en cualquier parte de la ficha; los sin prefijo solo en los campos de contacto (evita confundir fechas o precios).
  const phonesAll = [...new Set(((text.match(/\+\s?56[\s\d()-]{8,16}/g) || []).concat(telText.match(phoneRe) || [])).map(normPhone).filter(Boolean))];
  const waText = get('whatsapp');
  const waNum =[...(waText.match(/\+?\d[\d\s()-]{7,16}/g) || [])].map(normPhone).filter(Boolean)[0] || (links.map((l) => (l.href.match(/wa\.me\/(\d+)/) || [])[1]).filter(Boolean).map(normPhone)[0]) || null;
  const phones = phonesAll.filter((p) => p !== waNum);
  // ubicación / rubro
  let location = dash(get('sector')) || dash(get('direccion')) || null;
  const meta = (text.match(/\n([^\n]{3,140}·[^\n]{3,200})/) || [])[1];
  const cityWeb = get('ciudad / web / contacto');
  if (!location && cityWeb) location = clean(cityWeb.split('·')[0].replace(/https?:\/\/\S+/g, ''));
  if (!location && meta) location = clean(meta.split('·')[0]);
  if (!location) { const pm = c.body.match(/<p[^>]*>\s*<b>([^<]+)<\/b>/); if (pm) location = clean(pm[1]); }
  location = clean(String(location || '').replace(/https?:\/\/\S+/g, '').split(/[;]|\. | con proyectos/i)[0]).replace(/[\s,]+$/, '').slice(0, 70);
  const flagM = c.body.match(/<span class="flag">([^<]+)</i);
  let industry = dash(get('categoria')) || dash(String(get('vertical/nicho lety')).split(/;|nicho/i)[0]) || (tagM ? clean(tagM[1]) : '') || (meta ? clean(meta.split('·')[1] || '') : '');
  // hechos / inferencias / hipótesis
  const typed = [];
  ['senal / problema', 'dolor', 'problema / oportunidad', 'problema, agente y financiero', 'razon'].forEach((k) => splitTyped(get(k), 'fact').forEach((x) => typed.push(x)));
  const hechoAll = [...text.matchAll(/Hecho:\s*([^\n]+)/gi)].map((m) => ({ kind: 'fact', text: clean(m[1]).replace(/\s*(Hip[oó]tesis|Inferencia)[\s\S]*$/i, '') }));
  if (!typed.length) hechoAll.forEach((x) => typed.push(x));
  const process = [get('proceso visible'), get('proceso')].filter(Boolean).map(clean);
  const evidence = get('evidencia', 'fuentes');
  const evLines = evidence.split('\n').map((l) => clean(l.replace(/^-\s*/, ''))).filter((l) => l.length > 15);
  const evidenceUrls = [...new Set([...(evidence.match(/https?:\/\/[^\s)·|,;]+/g) || []), ...links.map((l) => l.href).filter((h) => /^https?:/i.test(h) && !/^https?:\/\/(www\.)?(wa\.me)/i.test(h))])].map((u) => u.replace(/[.,;]+$/, '')).filter((u) => u !== '—').slice(0, 8);
  const solution = clean([get('oferta / piloto'), get('agente propuesto'), get('agente profesional'), get('agente'), get('accion ejecutada')].filter(Boolean).join(' '));
  const pilot = clean([get('piloto 24-72h')].filter(Boolean).join(' '));
  const buyerRaw = clean([get('decisor'), get('buyer / precio'), get('buyer / contacto'), get('buyer probable / actor afectado')].filter(Boolean).join(' ').split('\n')[0]).split(/\s(?:Esencial|Operaci[oó]n|Premium|Profesional|Inferencia)\b|\$\s?\d/i)[0].replace(/[.:\s]+$/, '').slice(0, 160);
  const angle = clean(get('angulo / mensaje') || get('una accion') || '').replace(/^["“]|["”]$/g, '');
  // mensajes preparados
  const emailMsg = (msgs.find((m) => /email|correo/i.test(m.label)) || {}).text || ((get('email preparado').match(/Asunto:[\s\S]{40,1600}/) || [])[0]) || ((get('email').match(/Asunto:[\s\S]{40,1600}/) || [])[0]) || ((get('buyer / contacto').match(/Asunto:[\s\S]{40,1600}/) || [])[0]) || '';
  const waMsg = (msgs.find((m) => /whatsapp/i.test(m.label)) || {}).text || clean(get('whatsapp / linkedin')).slice(0, 700) || '';
  const phoneOpening = (msgs.find((m) => /tel/i.test(m.label)) || {}).text || '';
  return {
    source_name: data.source, source_reference: data.num ? 'ficha ' + data.num : null,
    company_name: data.name, website: web, industry: clean(industry), location: clean(location),
    emails, phones, whatsapp: waNum, whatsapp_declared: /whatsapp/i.test(text) && !/^[—–-]?$/.test(clean(get('whatsapp'))),
    facts: typed.filter((x) => x.kind === 'fact').map((x) => x.text), inferences: typed.filter((x) => x.kind === 'inference').map((x) => x.text), hypotheses: typed.filter((x) => x.kind === 'hypothesis').map((x) => x.text),
    process, evidence_lines: evLines, evidence_urls: evidenceUrls, proposed_solution: solution, pilot, buyer: buyerRaw, angle,
    suggested_email: String(emailMsg).slice(0, 1600), suggested_whatsapp: String(waMsg).slice(0, 800), phone_opening: String(phoneOpening).slice(0, 400),
    source_flags: flagM ? clean(flagM[1]) : null,
    external_score: scoreM ? Number(scoreM[1]) : null, external_score_scale: scoreM ? String(scoreM[2]) : null,
  };
}

/** CSV con encabezado (coma, punto y coma o tab; comillas dobles). */
export function parseCsv(text) {
  const t = String(text == null ? '' : text).replace(/^﻿/, '');
  const first = t.split(/\r?\n/)[0] || '';
  const delim = [',', ';', '\t'].map((d) => ({ d, n: first.split(d).length })).sort((a, b) => b.n - a.n)[0].d;
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); if (row.some((x) => x.trim())) rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => stripAccents(h).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return rows.slice(1).map((r) => { const o = {}; headers.forEach((h, i) => { o[h] = (r[i] || '').trim(); }); return o; });
}

/** Alias de columnas/claves → campos canónicos (CSV, JSON de otras IAs, texto etiquetado). */
export function aliasRecord(rec) {
  const A = {
    company_name: ['company_name', 'company', 'empresa', 'nombre', 'nombre_empresa', 'razon_social', 'name', 'organizacion'],
    website: ['website', 'web', 'sitio', 'sitio_web', 'url', 'dominio', 'domain', 'pagina'],
    industry: ['industry', 'rubro', 'industria', 'vertical', 'categoria', 'giro', 'sector'],
    location: ['location', 'ubicacion', 'ciudad', 'city', 'comuna', 'region', 'direccion'],
    email: ['email', 'correo', 'mail', 'e_mail', 'contact_email', 'email_contacto'],
    phone: ['phone', 'telefono', 'tel', 'fono', 'celular', 'contact_phone'],
    whatsapp: ['whatsapp', 'wsp', 'wa'],
    linkedin: ['linkedin', 'linkedin_url'],
    contact_name: ['contact_name', 'contacto', 'nombre_contacto', 'persona', 'decisor', 'buyer'],
    contact_role: ['contact_role', 'cargo', 'rol', 'role', 'job_title'],
    facts: ['facts', 'hechos', 'hecho', 'evidencia', 'observaciones'],
    observed_signals: ['observed_signals', 'senales', 'senal', 'signal', 'signals', 'proceso'],
    hypotheses: ['commercial_hypotheses', 'hipotesis', 'hipotesis_comercial', 'hypothesis'],
    proposed_solution: ['proposed_solution', 'solucion', 'solucion_propuesta', 'oferta', 'agente', 'propuesta', 'offer', 'possible_solution'],
    outreach_angle: ['outreach_angle', 'angulo', 'angulo_comercial', 'commercial_angle', 'razon', 'why_now'],
    suggested_email: ['suggested_email', 'email_preparado', 'mensaje_email', 'borrador_email', 'draft'],
    suggested_whatsapp: ['suggested_whatsapp', 'whatsapp_preparado', 'mensaje_whatsapp'],
    evidence_urls: ['evidence_urls', 'fuentes', 'fuente', 'urls', 'evidencia_urls', 'sources'],
    external_score: ['external_score', 'score', 'puntaje', 'puntuacion'],
  };
  const norm = {};
  Object.keys(rec || {}).forEach((k) => { norm[stripAccents(k).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] = rec[k]; });
  const out = {};
  Object.keys(A).forEach((f) => { for (const a of A[f]) { if (norm[a] != null && norm[a] !== '' && !(Array.isArray(norm[a]) && !norm[a].length)) { out[f] = norm[a]; break; } } });
  return out;
}

/** Texto libre razonablemente estructurado: bloques separados por línea en blanco o por «---»; cada bloque con líneas «Etiqueta: valor». */
export function parseFreeText(text) {
  const blocks = String(text == null ? '' : text).replace(/\r/g, '').split(/\n\s*(?:-{3,}|={3,})\s*\n|\n{2,}(?=(?:empresa|company|nombre)\s*:)/i).map((b) => b.trim()).filter(Boolean);
  const out = [];
  blocks.forEach((b) => {
    const rec = {};
    const lines = b.split('\n');
    let lastKey = null;
    lines.forEach((ln) => {
      const m = ln.match(/^\s*[-*•]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ_ \/]{2,40}):\s*(.*)$/);
      if (m) { lastKey = m[1].trim(); rec[lastKey] = (rec[lastKey] ? rec[lastKey] + '\n' : '') + m[2].trim(); }
      else if (lastKey && ln.trim()) rec[lastKey] += '\n' + ln.trim();
    });
    const al = aliasRecord(rec);
    if (!al.company_name) {
      // sin etiquetas: primera línea = empresa; el resto se interpreta por patrones
      const first = lines[0].replace(/^\s*[-*•\d.)]+\s*/, '').trim();
      const url = (b.match(/https?:\/\/[^\s)]+/) || [])[0];
      const email = (b.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0];
      const phone = (b.match(/\+?56[\s\d()-]{8,14}/) || [])[0];
      if (first && first.length <= 120) { al.company_name = first.replace(/https?:\/\/\S+|[\w.+-]+@\S+/g, '').replace(/[\s\-–|·,]+$/, '').trim(); if (url) al.website = url; if (email) al.email = email; if (phone) al.phone = phone; }
    }
    if (al.company_name) out.push(al);
  });
  return out;
}

export function toList(v) {
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x && (x.text || x.finding || x.url) ? String(x.text || x.finding || x.url) : '')).map((x) => x.trim()).filter(Boolean);
  if (v == null || v === '') return [];
  return String(v).split(/\n+|;\s+(?=[A-ZÁÉÍÓÚ])|\s*\|\s*/).map((x) => x.replace(/^[-*•]\s*/, '').trim()).filter((x) => x.length > 2);
}

/* ============================================================== CANDIDATO CANÓNICO */

/**
 * Adaptador de la salida de Hermes (contrato prospect-radar v2) y de otras IAs que usen nombres parecidos:
 * evidence[] → hechos (citas literales) o inferencias; signal → señal observada; pain/fit → inferencias; offer → solución propuesta (hipótesis);
 * commercial_angle/why_now → ángulo; draft → email sugerido; contact.job_title/linkedin_url → cargo/LinkedIn. Solo agrega lo que encuentra.
 */
export function adaptExternalRecord(p) {
  const r = p || {};
  const out = {};
  const ev = Array.isArray(r.evidence) ? r.evidence.filter((e) => e && typeof e === 'object') : [];
  if (ev.length) {
    const facts = [], inf = [], urls = [], quotes = [];
    const words = (x) => String(x || '').replace(/[+()\d·|/@_:;.,\-–—]+/g, ' ').split(/\s+/).filter((w) => w.length > 1).length;
    // HECHO = cita textual informativa (≥ 4 palabras, no un teléfono ni un título). El resumen que redactó el modelo es INFERENCIA.
    ev.forEach((e) => {
      const q = String(e.quote || '').trim(), f = String(e.finding || '').trim();
      const observed = String(e.certainty || '').toLowerCase() !== 'inferred';
      if (observed && q && words(q) >= 4) { facts.push(q); if (e.url) quotes.push({ url: String(e.url), quote: q }); } else if (f || q) inf.push(f || q);
      if (observed && q && words(q) >= 4 && f) inf.push(f);
      if (e.url) urls.push(String(e.url));
    });
    if (facts.length && !r.facts) out.facts = facts;
    if (urls.length && !r.evidence_urls) out.evidence_urls = urls;
    out._ev_inferences = inf;
    if (quotes.length && !r.evidence_quotes) out.evidence_quotes = quotes;
  }
  const inf2 = [].concat(out._ev_inferences || [], r.pain ? [String(r.pain)] : [], r.fit ? [String(r.fit)] : []).filter(Boolean);
  delete out._ev_inferences;
  if (inf2.length && !r.inferences) out.inferences = inf2;
  if (r.signal && !r.observed_signals) out.observed_signals = [String(r.signal)];
  if (r.observed_signal && !r.observed_signals) out.observed_signals = [String(r.observed_signal)];
  const offer = r.offer || r.possible_solution;
  if (offer && !r.proposed_solution) out.proposed_solution = String(offer);
  const angle = r.commercial_angle || r.why_now || r.reason;
  if (angle && !r.outreach_angle) out.outreach_angle = String(angle);
  if (r.draft && !r.suggested_email) out.suggested_email = String(r.draft);
  if (r.city && !r.location) out.location = String(r.city);
  if (r.vertical && !r.industry) out.industry = String(r.vertical);
  if (r.domain && !r.website) out.website = String(r.domain);
  if (r.company && !r.company_name) out.company_name = String(r.company);
  const c = r.contact && typeof r.contact === 'object' ? r.contact : null;
  if (c && (c.job_title || c.linkedin_url)) out.contact = { ...c, role: c.role || c.job_title || null, linkedin: c.linkedin || c.linkedin_url || null };
  return out;
}



/**
 * Convierte un registro crudo (de cualquier parser, de otra IA o de Christian) en ProspectCandidate. Acepta información incompleta.
 * ctx = { source_type, source_name, source_reference, now }
 */
export function toCandidate(raw, ctx) {
  const r = raw || {};
  const c0 = ctx || {};
  const contactIn = r.contact && typeof r.contact === 'object' ? r.contact : {};
  const emails = [].concat(r.emails || [], r.email || [], contactIn.email || []).map((e) => String(e).split(/[;,\s]+/)).flat().map(normEmail).filter(Boolean);
  const phones = [].concat(r.phones || [], r.phone || [], contactIn.phone || []).flat().map((p) => String(p)).map(normPhone).filter(Boolean);
  const wa = normPhone(r.whatsapp || contactIn.whatsapp || '') || null;
  const rawWeb = r.website || r.web || r.domain || r.url || '';
  const webDomain = normDomain(rawWeb) || (emails[0] && !/(gmail|hotmail|outlook|yahoo|live|icloud)\./.test(emails[0]) ? normDomain(emails[0].split('@')[1]) : null);
  const website = webDomain ? (/^https?:\/\//i.test(String(rawWeb)) && normDomain(rawWeb) ? String(rawWeb).trim() : 'https://' + webDomain) : null;
  const sourceLines = (v) => toList(v);
  const facts = sourceLines(r.facts), inferences = sourceLines(r.inferences), hyps = sourceLines(r.commercial_hypotheses || r.hypotheses);
  const signals = sourceLines(r.observed_signals).concat(sourceLines(r.process));
  const evUrls = [...new Set(sourceLines(r.evidence_urls).map((u) => (String(u).match(/https?:\/\/[^\s)]+/) || [])[0]).filter(Boolean).concat(sourceLines(r.evidence_lines).map((u) => (u.match(/https?:\/\/[^\s)]+/) || [])[0]).filter(Boolean)))].slice(0, 8);
  const buyer = String(r.buyer || '').replace(/\(?(por validar|no verificado|no identificado[^)]*)\)?/gi, '').trim();
  const cname = contactIn.name || r.contact_name || null;
  const crole = contactIn.role || contactIn.job_title || r.contact_role || null;
  const c = {
    company_name: String(r.company_name || r.company || '').replace(/\s+/g, ' ').trim() || null,
    website, industry: r.industry ? String(r.industry).trim() : null, location: r.location ? String(r.location).trim() : null,
    source_type: c0.source_type || r.source_type || 'unknown', source_name: c0.source_name || r.source_name || r.source || null, source_reference: c0.source_reference || r.source_reference || null,
    observed_signals: signals, facts, inferences, commercial_hypotheses: hyps, evidence_urls: evUrls,
    contact: { name: cname ? String(cname).trim() : null, role: crole ? String(crole).trim() : (buyer || null), email: emails[0] || null, phone: phones[0] || null, whatsapp: wa || (r.whatsapp_declared ? null : null), linkedin: contactIn.linkedin || r.linkedin || null },
    extra_contacts: { emails: emails.slice(1), phones: phones.slice(1) },
    whatsapp_declared: Boolean(r.whatsapp_declared || wa),
    proposed_solution: String(r.proposed_solution || '').trim() || null, outreach_angle: String(r.outreach_angle || r.angle || '').trim() || null,
    suggested_email: String(r.suggested_email || '').trim() || null, suggested_whatsapp: String(r.suggested_whatsapp || '').trim() || null,
    pilot: r.pilot ? String(r.pilot).trim() : null, source_flags: r.source_flags || null,
    evidence_quotes: Array.isArray(r.evidence_quotes) ? r.evidence_quotes.filter((x) => x && x.url && x.quote).slice(0, 6).map((x) => ({ url: String(x.url), quote: String(x.quote).slice(0, 300) })) : [],
    external_score: r.external_score != null && r.external_score !== '' && Number.isFinite(Number(r.external_score)) ? Number(r.external_score) : null,
    external_score_scale: r.external_score_scale ? String(r.external_score_scale) : null, external_source: r.external_source || (r.external_score != null ? (c0.source_name || r.source_name || null) : null),
    status: 'analyzed', ingested_at: new Date(c0.now || Date.now()).toISOString(),
  };
  return c;
}

/* ============================================================== SCORING */

/**
 * Scoring simple y documentado (0–100 = FIT 0–35 + SEÑAL 0–35 + ALCANCE 0–30). NO usa el score externo (solo se guarda como referencia).
 *  FIT (¿Atacama podría aportar valor razonablemente?): rubro objetivo +18 (desconocido +6) · proceso repetible visible +8 · solución/hipótesis concreta +6 · −8 si es enterprise/secundario.
 *  SEÑAL (¿hay algo observable?): hechos distintos de la operación (1→8, 2→14, ≥3→18; las fichas de directorio no cuentan) · canal/proceso digital observable +6
 *        · detalle concreto (cifras, sucursales, servicios) +4 · URL propia/de evidencia +4 (+3 si el sitio fue verificado) · hipótesis o inferencia defendible +5
 *        · si no hay hechos pero la empresa es verificable por directorio +3.
 *  ALCANCE (¿tenemos cómo contactar?): mejor canal (correo específico 10, correo genérico info@/contacto@ 8, correo gratuito 6, WhatsApp 10, teléfono 8, LinkedIn/formulario 4)
 *        + segundo canal distinto +5 + persona o cargo identificado +6 + sitio propio +3. Sin ningún canal: máximo 3 y el score total no pasa de 59.
 *  Bandas: ≥80 alta prioridad · 60–79 válido para contactar · 40–59 pendiente (investigar o conseguir contacto) · <40 archivo.
 */
export function scoreCandidate(c) {
  const flags = [];
  const norm = (x) => stripAccents(String(x == null ? '' : x)).toLowerCase();
  const weak = /(google maps|nominatim|openstreetmap|\bosm\b|ficha (de busqueda|nominal)|direccion exacta|rating|resenas)/;
  const allFacts = (c.facts || []).map((f) => String(f).trim()).filter((f) => f.length >= 20);
  const strongFacts = allFacts.filter((f) => !weak.test(norm(f)));
  const sigText = norm(strongFacts.concat(c.observed_signals || []).join(' '));
  const txt = norm([].concat(c.facts || [], c.observed_signals || [], c.inferences || [], c.commercial_hypotheses || [], [c.proposed_solution || '', c.outreach_angle || '']).join(' '));
  const ind = norm(String(c.industry || '') + ' ' + String(c.company_name || ''));
  const targets = /(salud|clinica|dental|dentista|odontolog|medic|veterin|kinesi|laborator|optica|psicolog|centro de salud|inmobil|corretaje|propiedad|educacion|colegio|instituto|otec|capacitacion|academia|universidad|idiomas|hotel|hostal|turismo|restaurant|alimenta|casino|catering|gimnasio|deporte|fitness|contab|legal|abogad|consult|ingenieria|informatica|software|servicios? profesional|b2b|industri|maquinaria|arriendo|transporte|logistica|mantencion|mantenimiento|metalmecanica|maestranza|mineria|electric|construccion|retail|ecommerce|e-commerce|tienda|comercial|distribuidora|seguros|rent a car|automotr|taller|repuestos|estetica|belleza)/;
  let fit = targets.test(ind) ? 18 : 6;
  if (/(agend|reserv|cotiz|solicit|pedido|consulta|formulario|whatsapp|derivacion|seguimiento|cobranza|factur|inscripcion|matricula|postventa|presupuesto|despacho|orden de trabajo|ticket|atencion|disponibilidad|horas?\b)/.test(txt)) fit += 8;
  if ((String(c.proposed_solution || '').length >= 30) || (c.commercial_hypotheses || []).some((h) => h.length >= 30)) fit += 6;
  if (/(enterprise|secondary|gran empresa|multinacional|operacion nacional)/.test(norm(String(c.industry || '') + ' ' + (c.source_flags || '') + ' ' + txt))) { fit -= 8; flags.push('enterprise_o_secundario'); }
  fit = Math.max(0, Math.min(35, fit));
  // Un hecho que menciona un proceso/canal observable (agenda, cotización, WhatsApp, formulario, pedidos…) pesa más que uno que solo describe a la empresa.
  const procRe = /(whatsapp|formulario|agend|reserv|cotiz|solicit|pedido|consulta|correo|atencion|turno|inscripcion|matricula|postventa|presupuesto|despacho|derivacion|seguimiento|cobranza|factur|manual|telefono)/;
  const procFacts = [...new Set(strongFacts.filter((f) => procRe.test(norm(f))).concat((c.observed_signals || []).map((f) => String(f).trim()).filter((f) => f.length >= 20 && procRe.test(norm(f)))))];
  const descFacts = strongFacts.filter((f) => !procRe.test(norm(f)));
  let signal = procFacts.length >= 3 ? 18 : procFacts.length === 2 ? 14 : procFacts.length === 1 ? 8 : 0;
  signal += Math.min(4, descFacts.length * 2);
  if (/(whatsapp|formulario|correo visible|canal propio|agenda por|reserva por|cotiza por)/.test(sigText)) signal += 5;
  if (strongFacts.some((f) => /\d/.test(f))) signal += 3;
  if ((c.evidence_urls || []).length > 0 || c.website) signal += 4;
  if (c.site_verified) signal += 3;
  if ((c.inferences || []).length || (c.commercial_hypotheses || []).length) signal += 5;
  if (!strongFacts.length && allFacts.length) signal += 3;
  signal = Math.max(0, Math.min(35, signal));
  const ct = c.contact || {};
  const free = /@(gmail|hotmail|outlook|yahoo|live|icloud)\./.test(String(ct.email || ''));
  const generic = /^(info|contacto|contact|ventas|hola|hello|admin|administracion|reservas|recepcion|clinica|soporte|atencion|comercial)@/.test(String(ct.email || ''));
  const channels = [];
  if (ct.email) channels.push({ k: 'email', v: free ? 6 : generic ? 8 : 10 });
  if (ct.whatsapp) channels.push({ k: 'whatsapp', v: 10 });
  if (ct.phone) channels.push({ k: 'phone', v: 8 });
  if (ct.linkedin || c.instagram || c.contact_form_url) channels.push({ k: 'social', v: 4 });
  channels.sort((a, b) => b.v - a.v);
  let reach = channels.length ? channels[0].v + (channels.length > 1 ? 5 : 0) : 0;
  if (ct.name || ct.role) reach += 6;
  if (c.website) reach += 3;
  if (!channels.length) { flags.push('sin_canal_de_contacto'); reach = Math.min(reach, 3); }
  reach = Math.max(0, Math.min(30, reach));
  let priority = fit + signal + reach;
  // Sin ningún canal de contacto no es «válido para contactar»: queda como pendiente (máx. 59) hasta conseguir uno.
  if (!channels.length && priority > 59) { priority = 59; flags.push('tope_59_por_falta_de_canal'); }
  const band = priority >= 80 ? 'alta' : priority >= 60 ? 'valida' : priority >= 40 ? 'pendiente' : 'archivo';
  if (!allFacts.length && !(c.observed_signals || []).length) flags.push('sin_senal_observable');
  if (!c.website) flags.push('sin_sitio_web');
  return { fit_score: fit, signal_score: signal, reachability_score: reach, priority_score: priority, band, flags, channels: channels.map((x) => x.k) };
}

/* ============================================================== DEDUPE + DECISIÓN */

/** Índice por clave → coincidencias. entries: [{ system, id, keys[], info }] */
export function buildIndex(entries) {
  const idx = {};
  (Array.isArray(entries) ? entries : []).forEach((e) => (e.keys || []).forEach((k) => { (idx[k] = idx[k] || []).push({ system: e.system, id: e.id, info: e.info || null }); }));
  return idx;
}

export function matchCandidate(c, idx) {
  const out = [];
  const seen = new Set();
  candidateKeys(c).forEach((k) => (idx[k] || []).forEach((m) => { const id = m.system + ':' + m.id; if (!seen.has(id)) { seen.add(id); out.push({ ...m, matched_on: k.split(':')[0] === 'd' ? 'dominio' : k.startsWith('e:') ? 'correo' : k.startsWith('p:') ? 'teléfono' : 'nombre+ubicación' }); } }));
  return out;
}

/**
 * Decisión por candidato (sin escribir nada).
 * opts: { force_import, ghl_index_complete, min_ghl_score (60) }
 * Resultados: duplicate_in_ghl | exists_in_supabase | create_in_ghl | keep_in_supabase | archive
 */
export function decideCandidate(c, sc, matches, opts) {
  const o = opts || {};
  const min = Number.isFinite(o.min_ghl_score) ? o.min_ghl_score : 60;
  const reasons = [];
  const ghl = matches.filter((m) => m.system === 'ghl_contact' || m.system === 'ghl_opportunity');
  const sb = matches.filter((m) => m.system !== 'ghl_contact' && m.system !== 'ghl_opportunity');
  const basics = Boolean(c.company_name) && Boolean(c.website || c.contact.email || c.contact.phone || c.contact.whatsapp || c.contact.linkedin || c.location);
  if (!basics) return { decision: 'invalid', reasons: ['falta_identidad_minima (empresa + web, contacto o ubicación)'], ghl_eligible: false };
  if (ghl.length) return { decision: 'duplicate_in_ghl', reasons: ['ya_existe_en_ghl'], ghl_eligible: false, existing: ghl };
  if (o.ghl_index_complete === false) reasons.push('indice_de_ghl_incompleto_no_se_crea');
  const reachable = sc.channels.length > 0;
  const hasSignal = !sc.flags.includes('sin_senal_observable');
  const hasHyp = (c.commercial_hypotheses || []).length > 0 || Boolean(c.proposed_solution) || (c.inferences || []).length > 0;
  let eligible = sc.priority_score >= min && reachable && hasSignal && hasHyp;
  if (!reachable) reasons.push('sin_canal_de_contacto');
  if (!hasSignal) reasons.push('sin_senal_observable');
  if (!hasHyp) reasons.push('sin_hipotesis_comercial');
  if (sc.priority_score < min) reasons.push('score_bajo_' + min);
  let override = false;
  if (o.force_import && o.ghl_index_complete !== false) { override = true; eligible = true; reasons.push('FORCE_IMPORT'); }
  if (o.ghl_index_complete === false) eligible = false;
  if (sb.length) return { decision: eligible ? (sb.some((m) => m.info && m.info.ghl_opportunity_id) ? 'exists_in_supabase' : 'create_in_ghl') : 'exists_in_supabase', reasons: ['ya_existe_en_supabase'].concat(eligible ? [] : reasons), ghl_eligible: eligible, existing: sb, manual_override: override };
  if (eligible) return { decision: 'create_in_ghl', reasons: override ? reasons : ['cumple_criterio_de_entrada'], ghl_eligible: true, manual_override: override };
  if (sc.band === 'archivo') return { decision: 'archive', reasons, ghl_eligible: false };
  return { decision: 'keep_in_supabase', reasons, ghl_eligible: false };
}

/* ============================================================== BORRADORES (PREPARE) */

export function lintOutreach(subject, message, company) {
  const probs = [];
  const text = String(message || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 20) probs.push('muy_corto');
  if (words > 150) probs.push('muy_largo');
  if (/vi que (est[aá]n|estás|tienen|tienes) (teniendo )?(problemas|dificultades)/i.test(text)) probs.push('afirma_un_problema_no_demostrado');
  if (/revolucion|disrupt|el mejor|garantizamos|100 ?%|sin riesgo/i.test(text)) probs.push('exageracion');
  if (/chatbot/i.test(text)) probs.push('dice_chatbot');
  if (/como (conversamos|hablamos|acordamos)|de nuevo|nuevamente/i.test(text)) probs.push('finge_relacion_previa');
  if (!/\?/.test(text)) probs.push('sin_pregunta_final');
  const n = String(company || '').toLowerCase().split(/\s+/)[0];
  if (n && n.length > 2 && !text.toLowerCase().includes(n) && !String(subject || '').toLowerCase().includes(n)) probs.push('no_menciona_a_la_empresa');
  return probs;
}

/** Borrador honesto: parte de un HECHO observado, marca la hipótesis como hipótesis, un solo resultado, una pregunta. */
export function prepareDrafts(c) {
  const company = c.company_name || 'su empresa';
  const first = String((c.contact && c.contact.name) || '').trim().split(/\s+/)[0];
  const greet = first ? 'Hola ' + first + ',' : 'Hola, equipo de ' + company + ',';
  const fact = (c.facts || []).find((f) => f.length >= 20 && f.length <= 240) || (c.facts || [])[0] || (c.observed_signals || [])[0] || '';
  const factClean = String(fact).replace(/\s+/g, ' ').replace(/[.\s]+$/, '').replace(/^(el sitio|la empresa|la página)\s+/i, '').slice(0, 200);
  const hyp = (c.commercial_hypotheses || []).find((h) => h.length >= 20) || (c.inferences || [])[0] || '';
  const hypClean = String(hyp).replace(/\s+/g, ' ').replace(/[.\s]+$/, '').slice(0, 220);
  const sol = String(c.proposed_solution || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').slice(0, 200);
  const lines = [greet, ''];
  if (factClean) lines.push('Estuve mirando ' + (c.website ? c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : 'su sitio') + ' y vi que ' + factClean.charAt(0).toLowerCase() + factClean.slice(1) + '.', '');
  if (hypClean) lines.push('Mi hipótesis (no lo he visto por dentro): ' + hypClean.charAt(0).toLowerCase() + hypClean.slice(1) + '.');
  lines.push('En Atacama Labs armamos agentes y automatizaciones conectadas a las herramientas que ya usan' + (sol ? ', por ejemplo: ' + sol.charAt(0).toLowerCase() + sol.slice(1) : '') + '.', '');
  lines.push(first ? '¿Te sirve que te muestre en 10 minutos cómo se vería para ' + company + '?' : '¿Les sirve que les muestre en 10 minutos cómo se vería para ' + company + '?', '', 'Christian Wevar · Atacama Labs · atacamalabs.cl');
  const emailBody = lines.join('\n');
  const subject = ('Una idea para ' + company).slice(0, 80);
  const wa = 'Hola' + (first ? ' ' + first : '') + ', soy Christian de Atacama Labs. ' + (factClean ? 'Vi que ' + factClean.charAt(0).toLowerCase() + factClean.slice(1).slice(0, 140) + '. ' : '') + 'Armamos agentes que ordenan ese trabajo (sin reemplazar a su equipo). ¿Te muestro una idea en 10 minutos?';
  const hermesLint = c.suggested_email ? lintOutreach(subject, c.suggested_email, company) : ['sin_borrador_previo'];
  const useGiven = c.suggested_email && !hermesLint.length && !/^Asunto:/i.test(c.suggested_email.trim() ? '' : '');
  return {
    email_subject: subject, email_body: useGiven ? c.suggested_email : emailBody, email_source: useGiven ? 'externo' : 'plantilla',
    whatsapp: c.suggested_whatsapp && !lintOutreach('', c.suggested_whatsapp, company).filter((p) => p !== 'muy_corto').length ? c.suggested_whatsapp : wa.slice(0, 480),
    lint: lintOutreach(subject, useGiven ? c.suggested_email : emailBody, company), external_lint: hermesLint, never_sent: true,
  };
}
