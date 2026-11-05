/**
 * ASTER 2026 · núcleo de la herramienta «PDF por enlace» (plantilla HTML corporativa + API2PDF).
 *
 * Funciones PURAS (sin require ni I/O): se prueban con `node --test` y se incrustan tal cual en los
 * nodos Code de n8n (Function.toString), igual que aster-pdf-core.mjs.
 *
 * Seguridad: Lety/el usuario entrega DATOS, nunca HTML. Todo texto se escapa; los únicos tags que
 * llegan a la plantilla son los que genera este módulo (item/label/value, section/sec-head/numb/h2/p,
 * pending/strong). La única «marca» admitida es **negrita**, y se convierte a <strong> DESPUÉS de escapar.
 */

import { asterHtmlParseSections, asterHtmlParseMetadata } from './aster-html-fragments.mjs';

export const ASTER_HTML_PLACEHOLDERS = ['{{DOCUMENT_TITLE}}', '{{DOCUMENT_CATEGORY}}', '{{METADATA_HTML}}', '{{SECTIONS_HTML}}'];
export const ASTER_HTML_DEFAULT_CATEGORY = 'INFORME / DEMOSTRACIÓN';

/**
 * Ajuste de paginación (CSS fijo, escrito por nosotros; NO viene de datos). La plantilla posiciona el bloque
 * «TECNOLOGÍA PARA EL TRABAJO REAL» y el pie con position:absolute sobre una hoja de alto fijo: con contenido
 * variable el pie se desborda a una hoja casi vacía. Aquí pasan a fluir al final (flex): igual aspecto en una
 * hoja, y si el contenido es largo siguen al texto en la hoja siguiente. Colores, tipografía y logo no se tocan.
 */
export const ASTER_HTML_LAYOUT_FIX = '<style id="aster-layout-fix">'
  + '.sheet{display:flex;flex-direction:column;min-height:297mm;height:auto;padding:12mm 18mm 7mm 18mm}'
  + '.brand-header{margin-bottom:5.5mm}'
  + '.blue-title{min-height:0;padding:7.5mm 11mm 7mm 11mm}'
  + '.blue-kicker{margin-bottom:2.4mm}'
  + '.blue-title .sub{margin-top:2.5mm}'
  + '.meta{padding:4mm 0 3.5mm;row-gap:2.4mm}'
  + '.main-content{flex:1 0 auto;padding-top:3.5mm;padding-bottom:2mm}'
  + '.section{margin-bottom:3.4mm}'
  + '.sec-head{margin-bottom:1.4mm}'
  + '.notice{margin-top:3mm;padding-top:3mm;break-inside:avoid}'
  + '.showcase,.footer{position:static;left:auto;right:auto;bottom:auto;break-inside:avoid}'
  + '.showcase{margin-top:3.5mm;margin-bottom:2.5mm}'
  + '</style>';

/** Escapa texto para HTML. También neutraliza llaves para que nadie pueda inyectar {{PLACEHOLDERS}}. */
export function asterHtmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

/** Texto enriquecido mínimo: escapa todo y luego convierte **negrita** en <strong>. */
export function asterHtmlRich(s) {
  return asterHtmlEsc(s).replace(/\*\*([^*\n]{1,200}?)\*\*/g, '<strong>$1</strong>');
}

function clean(s, max) {
  if (s == null) return '';
  if (typeof s === 'number' || typeof s === 'boolean') s = String(s);
  if (typeof s !== 'string') return '';
  const t = s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/** Valida y normaliza la petición. Devuelve {ok:true,p} o {ok:false,code,message}. */
export function asterHtmlValidate(body) {
  const bad = (code, message) => ({ ok: false, code, message });
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return bad('EMPTY_BODY', 'No llegaron datos. Envía un JSON con title y sections.');
  }
  let size = 0;
  try { size = JSON.stringify(body).length; } catch (e) { return bad('VALIDATION_ERROR', 'El cuerpo no es JSON válido.'); }
  if (size > 60000) return bad('PAYLOAD_TOO_LARGE', 'El contenido es demasiado largo (máximo ~60.000 caracteres).');

  const title = clean(body.title, 140);
  if (!title) return bad('VALIDATION_ERROR', 'Falta title (título del documento).');
  const category = clean(body.category, 70) || ASTER_HTML_DEFAULT_CATEGORY;

  // metadata: [{label,value}] o {Etiqueta: valor}
  let metaIn = body.metadata;
  if (metaIn && typeof metaIn === 'object' && !Array.isArray(metaIn)) {
    metaIn = Object.keys(metaIn).map((k) => ({ label: k, value: metaIn[k] }));
  }
  if (metaIn == null) metaIn = [];
  if (!Array.isArray(metaIn)) return bad('VALIDATION_ERROR', 'metadata debe ser una lista de {label, value}.');
  if (metaIn.length > 12) return bad('VALIDATION_ERROR', 'metadata admite como máximo 12 campos.');
  const metadata = [];
  for (const m of metaIn) {
    if (!m || typeof m !== 'object') return bad('VALIDATION_ERROR', 'Cada metadata debe ser {label, value}.');
    const label = clean(m.label, 40);
    if (!label) return bad('VALIDATION_ERROR', 'Cada metadata necesita label.');
    metadata.push({ label, value: clean(m.value, 160) || 'No informado' });
  }

  if (!Array.isArray(body.sections) || body.sections.length === 0) return bad('VALIDATION_ERROR', 'Falta sections (al menos una sección).');
  if (body.sections.length > 14) return bad('VALIDATION_ERROR', 'sections admite como máximo 14 secciones.');
  const sections = [];
  for (let i = 0; i < body.sections.length; i++) {
    const s = body.sections[i];
    if (!s || typeof s !== 'object') return bad('VALIDATION_ERROR', `La sección ${i + 1} no es válida.`);
    const heading = clean(s.heading, 90);
    if (!heading) return bad('VALIDATION_ERROR', `La sección ${i + 1} necesita heading.`);
    const text = clean(s.text, 4000);
    let items = [];
    if (s.items != null) {
      if (!Array.isArray(s.items)) return bad('VALIDATION_ERROR', `items de la sección ${i + 1} debe ser una lista de textos.`);
      items = s.items.slice(0, 20).map((x) => clean(x, 400)).filter(Boolean);
    }
    let pending = null;
    if (s.pending != null) {
      if (typeof s.pending !== 'object' || Array.isArray(s.pending)) return bad('VALIDATION_ERROR', `pending de la sección ${i + 1} debe ser {title, text}.`);
      const pt = clean(s.pending.title, 120);
      const px = clean(s.pending.text, 1000);
      if (pt || px) pending = { title: pt || 'Pendiente', text: px };
    }
    if (!text && items.length === 0 && !pending) return bad('VALIDATION_ERROR', `La sección ${i + 1} («${heading}») no tiene contenido: usa text, items o pending.`);
    sections.push({ heading, text, items, pending });
  }

  const rid = body.request_id == null ? '' : String(body.request_id).replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 80);
  return { ok: true, p: { request_id: rid, title, category, metadata, sections } };
}

export function asterHtmlSlug(s) {
  const t = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return t || 'documento';
}

/** Fecha/hora de emisión en horario de Chile. */
export function asterHtmlIssued(date) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const g = (t) => f.find((x) => x.type === t).value;
  const hh = g('hour') === '24' ? '00' : g('hour');
  return { stamp: `${g('year')}${g('month')}${g('day')}-${hh}${g('minute')}`, human: `${g('day')}-${g('month')}-${g('year')} ${hh}:${g('minute')}` };
}

const P = (inner, first) => `<p${first ? '' : ' style="margin-top:1.6mm"'}>${inner}</p>`;

/** Genera los 4 valores de la plantilla + nombre de archivo. */
export function asterHtmlRender(p, issued) {
  const metadataHtml = p.metadata
    .map((m) => `<div class="item"><div class="label">${asterHtmlEsc(m.label)}</div><div class="value">${asterHtmlRich(m.value)}</div></div>`)
    .join('\n    ');
  const sectionsHtml = p.sections
    .map((s, i) => {
      const num = String(i + 1).padStart(2, '0');
      let body = '';
      let first = true;
      if (s.text) {
        for (const para of s.text.split(/\n{2,}/)) {
          body += P(asterHtmlRich(para.trim()).replace(/\n/g, '<br>'), first);
          first = false;
        }
      }
      for (const it of s.items) {
        body += P('• ' + asterHtmlRich(it), first);
        first = false;
      }
      if (s.pending) {
        body += `<div class="pending"${first ? '' : ' style="margin-top:2.4mm"'}><strong>${asterHtmlEsc(s.pending.title)}</strong>${s.pending.text ? `<p>${asterHtmlRich(s.pending.text)}</p>` : ''}</div>`;
      }
      return `<div class="section"><div class="sec-head"><span class="numb">${num}</span><h2>${asterHtmlEsc(s.heading)}</h2></div>${body}</div>`;
    })
    .join('\n    ');
  return {
    titleHtml: asterHtmlEsc(p.title),
    // La fecha de EMISIÓN (de hoy) va en la franja azul y no se mezcla con la fecha del HECHO, que llega en metadata o queda «No informada».
    categoryHtml: asterHtmlEsc(p.category) + ' · Emitido ' + asterHtmlEsc(issued.human),
    metadataHtml,
    sectionsHtml,
    fileName: `atacama-${asterHtmlSlug(p.title)}-${issued.stamp}.pdf`,
  };
}

/** Reemplaza los 4 marcadores en la plantilla. Lanza si la plantilla no es la esperada. */
export function asterHtmlMerge(template, r) {
  if (typeof template !== 'string' || template.length < 500) throw new Error('TEMPLATE_INVALID: la plantilla está vacía o es demasiado corta.');
  for (const ph of ASTER_HTML_PLACEHOLDERS) {
    if (template.indexOf(ph) === -1) throw new Error('TEMPLATE_INVALID: falta el marcador ' + ph);
  }
  // Identidad visual: sin el logotipo oficial incrustado NO se genera el documento (falla cerrado en vez de salir sin logo).
  if (!/<img\b[^>]*\bclass="brand-logo"[^>]*\bsrc="data:image\/[a-z+]+;base64,[A-Za-z0-9+\/=]{2000,}"/i.test(template)) {
    throw new Error('TEMPLATE_INVALID: la plantilla no trae el logotipo oficial (img.brand-logo con la imagen incrustada en Base64).');
  }
  // split/join: sin patrones especiales de String.replace ($&, $1) que alteren el contenido.
  const merged = template
    .split('{{METADATA_HTML}}').join(r.metadataHtml)
    .split('{{SECTIONS_HTML}}').join(r.sectionsHtml)
    .split('{{DOCUMENT_TITLE}}').join(r.titleHtml)
    .split('{{DOCUMENT_CATEGORY}}').join(r.categoryHtml);
  return merged.indexOf('</head>') === -1 ? merged : merged.replace('</head>', () => ASTER_HTML_LAYOUT_FIX + '</head>');
}

/**
 * Extrae el cuerpo útil de lo que llegó al webhook, tolerando las formas típicas con que un agente envía una herramienta:
 * JSON como texto, envuelto en {input|data|payload|arguments|parameters|body…}, y nombres en español (titulo, secciones…).
 * Devuelve también un diagnóstico SIN valores (solo tipos y nombres de campos) para explicar un rechazo.
 */
export function asterHtmlExtract(first) {
  const item = first && typeof first === 'object' ? first : {};
  const h = item.headers && typeof item.headers === 'object' ? item.headers : {};
  const diag = { content_type: String(h['content-type'] || '').slice(0, 60) || null, body_type: null, keys: [] };
  const parse = (v) => {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t[0] === '{' || t[0] === '[') { try { return JSON.parse(t); } catch (e) { /* queda como texto */ } }
    }
    return v;
  };
  const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
  const TITLE_KEYS = ['title', 'titulo', 'título', 'document_title', 'documentTitle'];
  const hasTitle = (o) => isObj(o) && TITLE_KEYS.some((k) => o[k] != null);
  let b = parse(Object.prototype.hasOwnProperty.call(item, 'body') ? item.body : item);
  diag.body_type = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
  const WRAP = ['input', 'data', 'payload', 'arguments', 'args', 'parameters', 'body', 'request', 'document', 'documento'];
  for (let depth = 0; depth < 3 && isObj(b) && !hasTitle(b); depth++) {
    let next = null;
    for (const k of WRAP) { const v = parse(b[k]); if (isObj(v)) { next = v; break; } }
    if (!next) break;
    b = next;
  }
  if (!isObj(b)) return { body: b, diag };
  const al = (o, to, froms) => { if (o[to] == null) for (const f of froms) if (o[f] != null) { o[to] = o[f]; break; } };
  b = Object.assign({}, b);
  diag.keys = Object.keys(b).slice(0, 20);
  al(b, 'title', ['titulo', 'título', 'document_title', 'documentTitle']);
  al(b, 'category', ['categoria', 'categoría', 'document_category', 'documentCategory']);
  al(b, 'metadata', ['metadatos']);
  al(b, 'sections', ['secciones']);
  b.sections = parse(b.sections);
  b.metadata = parse(b.metadata);
  // Herramientas que envían HTML ya armado: se reduce a datos (el HTML nunca se inserta).
  if (b.sections == null && typeof b.sections_html === 'string') { b.sections = asterHtmlParseSections(b.sections_html); diag.from_html = true; }
  if (b.metadata == null && typeof b.metadata_html === 'string') { b.metadata = asterHtmlParseMetadata(b.metadata_html); diag.from_html = true; }
  if (Array.isArray(b.sections)) {
    b.sections = b.sections.map((s0) => {
      const s = parse(s0);
      if (!isObj(s)) return s;
      const s2 = Object.assign({}, s);
      al(s2, 'heading', ['title', 'titulo', 'título', 'encabezado', 'nombre', 'section_title']);
      al(s2, 'text', ['texto', 'content', 'contenido', 'body', 'descripcion', 'descripción']);
      al(s2, 'items', ['puntos', 'bullets', 'lista']);
      al(s2, 'pending', ['pendiente']);
      s2.items = parse(s2.items);
      s2.pending = parse(s2.pending);
      return s2;
    });
  }
  return { body: b, diag };
}
