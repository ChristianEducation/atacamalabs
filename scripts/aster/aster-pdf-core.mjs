/**
 * ASTER 2026 · motor de documentos de la demostración de Atacama Labs.
 *
 * Funciones puras, sin dependencias ni `require`: el nodo Code de n8n no permite módulos (zlib/crypto están bloqueados),
 * por eso el PDF se escribe a mano (Helvetica estándar + logo ya comprimido). El build (n8n/build/aster-demo.mjs) incrusta
 * estas funciones con Function.toString(), igual que el resto de los workflows del repo. FONT_W y LOGO vienen de aster-assets.mjs.
 *
 *   asterValidate(body)            → { ok:true, p } | { ok:false, code, message }
 *   asterBuildDoc(p, folio, issued)→ modelo de documento (bloques) según document_type
 *   asterPdf(doc)                  → Buffer con el PDF (A4)
 *   asterFolio / asterAutoId       → utilidades de folio e idempotencia
 */
import { FONT_W, LOGO } from './aster-assets.mjs';

export const ASTER_TYPES = ['informe_tecnico', 'observacion_preventiva', 'parte_turno', 'solicitud_trabajo', 'informe_general', 'informe_avance', 'novedades_logisticas', 'acta_reunion'];
export const ASTER_NEUTRAL_COMPANY = 'Documento de demostración — Atacama Labs';

/* ───────────────────────── texto → WinAnsi (cp1252) ───────────────────────── */
export function asterWin(input) {
  const SP = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };
  let s = String(input == null ? '' : input);
  try { s = s.normalize('NFC'); } catch (e) { /* sin normalización */ }
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c === 10) out += '\n';
    else if (c === 9 || c === 13 || c < 32 || c === 127) out += ' ';
    else if (c <= 126 || (c >= 160 && c <= 255)) out += ch;
    else if (SP[c]) out += String.fromCharCode(SP[c]);
    else if (c > 0xffff || c === 0x200d || (c >= 0xfe00 && c <= 0xfe0f) || (c >= 0x200b && c <= 0x200f)) out += '';
    else if (c === 0x2028 || c === 0x2029) out += '\n';
    else out += '?';
  }
  return out;
}

export function asterW(str, size, font) {
  const t = FONT_W[font];
  let w = 0;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); w += c >= 32 && c <= 255 ? t[c - 32] : 0; }
  return (w * size) / 1000;
}

export function asterWrap(text, size, font, maxW) {
  const lines = [];
  const paras = asterWin(text).split('\n');
  for (const para of paras) {
    const words = para.split(/ +/).filter((x) => x !== '');
    if (!words.length) { lines.push(''); continue; }
    let cur = '';
    for (let word of words) {
      while (asterW(word, size, font) > maxW) {
        let cut = word.length - 1;
        while (cut > 1 && asterW(word.slice(0, cut), size, font) > maxW) cut--;
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const test = cur ? cur + ' ' + word : word;
      if (cur && asterW(test, size, font) > maxW) { lines.push(cur); cur = word; } else cur = test;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

/* ───────────────────────── PDF ───────────────────────── */
export function asterPdf(doc) {
  const PW = 595.28, PH = 841.89, MX = 42, BOTTOM = 78, CW = PW - 2 * MX;
  const C = { blue: '0F5CED', navy: '041228', ink: '1F2937', gray: '64748B', light: 'EEF4FF', line: 'D9E2F2', white: 'FFFFFF', card: 'F0F5FF' };
  const rgb = (hex) => [0, 2, 4].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const num = (n) => (Math.round(n * 100) / 100).toString();
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r/g, '');
  const FN = { reg: 'F1', bold: 'F2', ital: 'F3' };
  const BUL = asterWin('•');
  const pages = [];
  let ops = null;
  let y = 0;
  const Y = (top) => PH - top;
  const fill = (hex) => `${rgb(hex)} rg\n`;
  const rect = (x, top, w, h, hex) => { ops.push(`${fill(hex)}${num(x)} ${num(Y(top + h))} ${num(w)} ${num(h)} re f\n`); };
  const rrect = (x, top, w, h, r, hex) => {
    const k = 0.5523 * r, x2 = x + w, yb = Y(top + h), yt = Y(top);
    ops.push(`${fill(hex)}${num(x + r)} ${num(yb)} m ${num(x2 - r)} ${num(yb)} l ${num(x2 - r + k)} ${num(yb)} ${num(x2)} ${num(yb + r - k)} ${num(x2)} ${num(yb + r)} c ` +
      `${num(x2)} ${num(yt - r)} l ${num(x2)} ${num(yt - r + k)} ${num(x2 - r + k)} ${num(yt)} ${num(x2 - r)} ${num(yt)} c ${num(x + r)} ${num(yt)} l ` +
      `${num(x + r - k)} ${num(yt)} ${num(x)} ${num(yt - r + k)} ${num(x)} ${num(yt - r)} c ${num(x)} ${num(yb + r)} l ${num(x)} ${num(yb + r - k)} ${num(x + r - k)} ${num(yb)} ${num(x + r)} ${num(yb)} c f\n`);
  };
  const hline = (x1, x2, top, hex, wd) => { ops.push(`${rgb(hex)} RG ${num(wd || 0.6)} w ${num(x1)} ${num(Y(top))} m ${num(x2)} ${num(Y(top))} l S\n`); };
  const text = (x, base, str, size, font, hex) => {
    if (str === '') return;
    ops.push(`BT ${fill(hex).trim()} /${FN[font]} ${num(size)} Tf ${num(x)} ${num(Y(base))} Td (${esc(str)}) Tj ET\n`);
  };
  const newPage = () => { ops = []; pages.push(ops); y = 54; };
  const ensure = (h) => { if (y + h > PH - BOTTOM) newPage(); };

  // ── página 1: cabecera corporativa
  ops = []; pages.push(ops);
  rect(0, 0, PW, 6, C.blue);
  rect(0, 6, PW, 142, C.light);
  const lh = 22, lw = (LOGO.w / LOGO.h) * lh;
  ops.push(`q ${num(lw)} 0 0 ${num(lh)} ${num(MX)} ${num(Y(34 + lh))} cm /Im1 Do Q\n`);
  const tag = asterWin('ATACAMA LABS  /  DEMOSTRACIÓN ASTER 2026');
  text(PW - MX - asterW(tag, 8, 'reg'), 47, tag, 8, 'reg', C.gray);
  asterWrap(doc.title, 21, 'bold', CW).forEach((ln, i) => text(MX, 88 + i * 24, ln, 21, 'bold', C.navy));
  const tl = asterWrap(doc.title, 21, 'bold', CW).length - 1;
  asterWrap(doc.subtitle, 9.5, 'reg', CW).slice(0, 2).forEach((ln, i) => text(MX, 106 + tl * 24 + i * 12, ln, 9.5, 'reg', C.gray));
  const badge = asterWin(doc.badge);
  const bw = asterW(badge, 7.5, 'bold') + 30;
  rrect(MX, 120 + tl * 24, bw, 17, 8.5, C.blue);
  text(MX + 15, 131.8 + tl * 24, badge, 7.5, 'bold', C.white);
  y = 168 + tl * 24;

  // ── datos generales
  const sectionHead = (label) => { ensure(40); text(MX, y + 10, asterWin(label), 10.5, 'bold', C.navy); hline(MX, PW - MX, y + 17, C.line, 0.6); y += 30; };
  const para = (str, size, font, hex, lead, indent, maxW) => {
    for (const ln of asterWrap(str, size, font, (maxW || CW) - (indent || 0))) { ensure(lead); text(MX + (indent || 0), y + size, ln, size, font, hex); y += lead; }
  };

  sectionHead('DATOS GENERALES');
  const colW = CW / 2;
  for (let i = 0; i < doc.fields.length; i += 2) {
    const pair = doc.fields.slice(i, i + 2).map((f) => ({ l: asterWin(f.l).toUpperCase(), v: asterWrap(f.v, 10, 'bold', colW - 16).slice(0, 3) }));
    const rowH = 14 + Math.max(...pair.map((f) => f.v.length)) * 13 + 10;
    ensure(rowH);
    pair.forEach((f, k) => {
      const x = MX + k * colW;
      text(x, y + 8, f.l, 7, 'reg', C.gray);
      f.v.forEach((ln, j) => text(x, y + 22 + j * 13, ln, 10, 'bold', C.navy));
    });
    y += rowH;
  }
  y += 6;

  // ── bloques
  for (const b of doc.blocks) {
    if (b.t === 'h') { ensure(60); y += 6; text(MX, y + 10, asterWin(b.text), 10.5, 'bold', C.navy); y += 22; }
    else if (b.t === 'p') { para(b.text, 10, 'reg', C.ink, 14.5, 0); y += 6; }
    else if (b.t === 'small') { para(b.text, 8.5, 'ital', C.gray, 12, 0); y += 4; }
    else if (b.t === 'ul') {
      for (const it of b.items) {
        const lines = asterWrap(it, 10, 'reg', CW - 16);
        ensure(14.5 * Math.min(lines.length, 2));
        text(MX + 3, y + 10, BUL, 10, 'bold', C.blue);
        lines.forEach((ln, i) => { ensure(14.5); text(MX + 16, y + 10, ln, 10, 'reg', C.ink); y += 14.5; if (i === lines.length - 1) y += 3; });
      }
      y += 4;
    } else if (b.t === 'callout') {
      const inner = CW - 32;
      const blocks = b.items.map((it) => ({ main: asterWrap(it.text, 10, 'reg', inner - 12), meta: it.meta ? asterWrap(it.meta, 8.5, 'reg', inner - 12) : [] }));
      const hh = 14 + 12 + blocks.reduce((a, bl) => a + bl.main.length * 14 + bl.meta.length * 11.5 + 8, 0) + 8;
      ensure(Math.min(hh, 140));
      const top = y;
      const h = Math.min(hh, PH - BOTTOM - y);
      rrect(MX, top, CW, h, 8, C.card);
      text(MX + 16, top + 22, asterWin(b.title).toUpperCase(), 8.5, 'bold', C.blue);
      let cy = top + 36;
      for (const bl of blocks) {
        bl.main.forEach((ln, i) => { text(MX + 16 + (i === 0 ? 0 : 12), cy + 8, (i === 0 ? BUL + ' ' : '') + ln, 10, 'reg', C.ink); cy += 14; });
        bl.meta.forEach((ln) => { text(MX + 28, cy + 6, ln, 8.5, 'reg', C.gray); cy += 11.5; });
        cy += 8;
      }
      y = Math.max(top + h, cy) + 12;
    }
  }

  // ── pies de página (necesitan el total de páginas)
  const total = pages.length;
  pages.forEach((p, idx) => {
    ops = p;
    if (idx > 0) { rect(0, 0, PW, 4, C.blue); text(MX, 30, asterWin(doc.folio), 8, 'bold', C.gray); }
    hline(MX, PW - MX, PH - 66, C.line, 0.6);
    doc.footer.slice(0, 2).forEach((ln, i) => asterWrap(ln, 7.5, 'reg', CW).slice(0, 1).forEach((l1) => text(MX, PH - 54 + i * 11, l1, 7.5, 'reg', C.gray)));
    const site = 'ATACAMALABS.CL';
    text(PW - MX - asterW(site, 8, 'bold'), PH - 28, site, 8, 'bold', C.blue);
    const pg = `${doc.folio}  ·  Página ${idx + 1} de ${total}`;
    text(MX, PH - 28, asterWin(pg), 7.5, 'reg', C.gray);
  });

  // ── ensamblado binario
  const chunks = [];
  let offset = 0;
  const offsets = [];
  const push = (b) => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); chunks.push(buf); offset += buf.length; };
  const obj = (id, body, stream) => {
    offsets[id] = offset;
    push(`${id} 0 obj\n${body}`);
    if (stream) { push('\nstream\n'); push(stream); push('\nendstream'); }
    push('\nendobj\n');
  };
  const nPages = pages.length;
  const firstPage = 8;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${nPages} /Kids [${pages.map((_, i) => `${firstPage + i * 2} 0 R`).join(' ')}] >>`);
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
  const rgbBuf = Buffer.from(LOGO.rgb, 'base64'), alphaBuf = Buffer.from(LOGO.alpha, 'base64');
  obj(6, `<< /Type /XObject /Subtype /Image /Width ${LOGO.w} /Height ${LOGO.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 7 0 R /Length ${rgbBuf.length} >>`, rgbBuf);
  obj(7, `<< /Type /XObject /Subtype /Image /Width ${LOGO.w} /Height ${LOGO.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${alphaBuf.length} >>`, alphaBuf);
  pages.forEach((p, i) => {
    const pid = firstPage + i * 2, cid = pid + 1;
    const content = Buffer.from(p.join(''), 'latin1');
    obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents ${cid} 0 R >>`);
    obj(cid, `<< /Length ${content.length} >>`, content);
  });
  const infoId = firstPage + nPages * 2;
  const pdfDate = (doc.issuedIso || '').replace(/[-:T]/g, '').slice(0, 14) || '20261105000000';
  obj(infoId, `<< /Title (${esc(asterWin(doc.title + ' — ' + doc.folio))}) /Author (Atacama Labs) /Producer (Atacama Labs · ASTER 2026) /CreationDate (D:${pdfDate}) >>`);
  const xref = offset;
  push(`xref\n0 ${infoId + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= infoId; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

/* ───────────────────────── validación y folio ───────────────────────── */
export function asterValidate(body) {
  const fail = (code, message) => ({ ok: false, code, message });
  if (body == null || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) return fail('EMPTY_BODY', 'La solicitud llegó vacía.');
  let size = 0;
  try { size = JSON.stringify(body).length; } catch (e) { return fail('VALIDATION_ERROR', 'Cuerpo no válido.'); }
  if (size > 40000) return fail('PAYLOAD_TOO_LARGE', 'La solicitud es demasiado grande.');
  const str = (v, max) => (v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, max);
  const list = (v, max, n) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]).map((x) => str(typeof x === 'object' && x ? x.description || x.text || '' : x, max)).filter(Boolean).slice(0, n);
  const type = str(body.document_type, 60);
  if (!ASTER_TYPES.includes(type)) return fail('VALIDATION_ERROR', 'document_type no es válido. Valores permitidos: ' + ASTER_TYPES.join(', ') + '.');
  if (body.consent_to_email !== true) return fail('CONSENT_REQUIRED', 'Falta la autorización explícita de la persona para enviar el documento a su correo (consent_to_email=true).');
  const email = str(body.email, 200).toLowerCase();
  if (!/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email) || email.length > 150) return fail('INVALID_EMAIL', 'El correo no tiene un formato válido; pide a la persona que lo confirme.');
  const raw = str(body.raw_narrative, 6000);
  const facts = list(body.verified_facts, 500, 20), obs = list(body.observations, 500, 20), acts = list(body.actions_taken, 500, 20);
  const summary = str(body.summary, 700);
  if (!raw && !facts.length && !obs.length && !acts.length && !summary) return fail('VALIDATION_ERROR', 'No hay contenido: falta el relato (raw_narrative) o los hechos informados.');
  const pending = (Array.isArray(body.pending_actions) ? body.pending_actions : body.pending_actions ? [body.pending_actions] : []).slice(0, 20).map((x) => (x && typeof x === 'object'
    ? { description: str(x.description || x.text, 500), owner: str(x.owner, 120) || null, due_date: str(x.due_date, 60) || null } : { description: str(x, 500), owner: null, due_date: null })).filter((x) => x.description);
  const evidence = list(body.evidence, 300, 10);
  return { ok: true, p: {
    request_id: str(body.request_id, 120).replace(/[^A-Za-z0-9._:-]/g, '-'), document_type: type, company_name: str(body.company_name, 120), person_name: str(body.person_name, 120), email,
    activity_location: str(body.activity_location, 200), asset_id: str(body.asset_id, 120), reported_at: str(body.reported_at, 80), summary, raw_narrative: raw,
    verified_facts: facts, observations: obs, actions_taken: acts, pending_actions: pending, evidence, notes: str(body.notes, 800),
  } };
}

/** Folio de sistema: DEMO-AAAAMMDD-NNNN (la fecha es la de EMISIÓN, hora de Chile). */
export function asterFolio(dateYmd, n) { return `DEMO-${dateYmd}-${String(n).padStart(4, '0')}`; }

/** Id determinista cuando Lety no manda request_id (hash FNV-1a de correo + tipo + relato): evita el doble envío en reintentos. */
export function asterAutoId(p) {
  const s = [p.email, p.document_type, p.raw_narrative || p.verified_facts.join('|')].join('\u0001');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let h2 = 0x9747b28c;
  for (let i = s.length - 1; i >= 0; i--) { h2 ^= s.charCodeAt(i); h2 = Math.imul(h2, 0x85ebca6b) >>> 0; }
  return 'auto-' + h.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Fecha y hora de emisión en America/Santiago → { ymd:'20261105', human:'05-11-2026 14:32', iso:'20261105T143200' }. */
export function asterIssued(date) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date);
  const g = (t) => f.find((x) => x.type === t).value;
  const hh = g('hour') === '24' ? '00' : g('hour');
  return { ymd: `${g('year')}${g('month')}${g('day')}`, human: `${g('day')}-${g('month')}-${g('year')} ${hh}:${g('minute')}`, iso: `${g('year')}-${g('month')}-${g('day')}T${hh}:${g('minute')}:${g('second')}` };
}

/* ───────────────────────── modelo de documento por tipo ───────────────────────── */
export function asterBuildDoc(p, folio, issued) {
  const NI = 'No informado';
  const T = {
    informe_tecnico: { title: 'Informe técnico de terreno', sub: 'Borrador elaborado a partir de un relato de terreno', facts: 'Hechos informados', obs: 'Observaciones informadas', acts: 'Acciones informadas', pend: 'Pendientes y acciones sugeridas para revisión', note: 'Este borrador organiza lo que la persona relató; no constituye aceptación del mandante, certificación ni cierre de una orden de trabajo.' },
    observacion_preventiva: { title: 'Registro de observación preventiva', sub: 'Borrador elaborado a partir de un relato de terreno', facts: 'Observación registrada', obs: 'Condición o actividad observada', acts: 'Acciones informadas', pend: 'Acción pendiente', note: 'Corresponde confirmar la corrección por personal autorizado según los procedimientos internos aplicables. Este documento no confirma el cierre del hallazgo ni reemplaza reportes o inspecciones oficiales.', state: 'Pendiente de verificación' },
    parte_turno: { title: 'Parte de turno', sub: 'Borrador de reporte de actividades del turno', facts: 'Actividades realizadas', obs: 'Novedades informadas', acts: 'Acciones informadas', pend: 'Pendientes para el relevo', note: 'Borrador para revisión del responsable del turno. No reemplaza el parte oficial de la faena.' },
    solicitud_trabajo: { title: 'Borrador de solicitud de trabajo', sub: 'Solicitud preparatoria — pendiente de revisión', facts: 'Motivo de la solicitud', obs: 'Síntomas y antecedentes informados', acts: 'Actuaciones previas informadas', pend: 'Trabajo solicitado y pendientes de evaluación', note: 'Este borrador NO es una orden de trabajo autorizada ni un permiso para ejecutar. La orden oficial y los permisos requieren validación por el rol y el sistema competentes.', state: 'Solicitud — pendiente de revisión' },
    informe_general: { title: 'Registro general de actividad', sub: 'Borrador elaborado a partir de un relato', facts: 'Hechos informados', obs: 'Observaciones informadas', acts: 'Acciones informadas', pend: 'Pendientes para revisión', note: 'Borrador de demostración elaborado con lo que la persona relató; requiere revisión humana antes de cualquier uso.' },
    informe_avance: { title: 'Informe de avance / visita', sub: 'Borrador elaborado a partir de un relato de terreno', facts: 'Actividades y avance informado', obs: 'Desviaciones y observaciones informadas', acts: 'Acciones informadas', pend: 'Pendientes y acciones para revisión', note: 'No certifica volúmenes, avance porcentual ni conformidad del trabajo: solo recoge lo informado.' },
    novedades_logisticas: { title: 'Registro de novedades logísticas', sub: 'Registro operativo preliminar', facts: 'Novedad informada', obs: 'Consecuencias y antecedentes informados', acts: 'Actuación informada', pend: 'Próximas acciones', note: 'Registro preliminar elaborado a partir de un relato; debe contrastarse con la documentación de despacho o recepción.' },
    acta_reunion: { title: 'Acta de reunión operacional', sub: 'Borrador de acuerdos informados', facts: 'Temas tratados', obs: 'Decisiones y observaciones informadas', acts: 'Acuerdos informados', pend: 'Pendientes y responsables', note: 'Borrador de acta: no infiere aprobación de terceros y debe ser validado por los participantes.' },
  }[p.document_type];
  const none = (txt) => ({ t: 'p', text: txt });
  const blocks = [];
  let n = 0;
  const head = (name) => blocks.push({ t: 'h', text: `${++n}. ${name.toUpperCase()}` });
  if (p.summary) { head('Resumen del relato'); blocks.push({ t: 'p', text: p.summary }, { t: 'small', text: 'Resumen redactado por el agente a partir del relato recibido; sujeto a revisión.' }); }
  head(T.facts);
  blocks.push(p.verified_facts.length ? { t: 'ul', items: p.verified_facts } : none('No se informaron hechos específicos más allá del relato recibido (ver sección final).'));
  if (p.observations.length) { head(T.obs); blocks.push({ t: 'ul', items: p.observations }); }
  head(T.acts);
  blocks.push(p.actions_taken.length ? { t: 'ul', items: p.actions_taken } : none('No se informaron acciones realizadas.'));
  head(T.pend);
  if (p.pending_actions.length) {
    blocks.push({ t: 'callout', title: 'Pendientes informados', items: p.pending_actions.map((x) => ({ text: x.description, meta: `Responsable: ${x.owner || 'por asignar'}   ·   Plazo: ${x.due_date || 'no informado'}${T.state ? '   ·   Estado: ' + T.state.toLowerCase() : ''}` })) });
  } else blocks.push(none('No se informaron pendientes.'));
  head('Evidencias');
  blocks.push(p.evidence.length ? { t: 'ul', items: p.evidence } : none('No se adjuntaron fotografías ni documentación adicional.'));
  if (p.notes) { head('Notas'); blocks.push({ t: 'p', text: p.notes }); }
  head('Observación para revisión');
  blocks.push({ t: 'p', text: T.note });
  if (p.raw_narrative) {
    head('Relato recibido (fuente)');
    blocks.push({ t: 'p', text: p.raw_narrative.length > 1500 ? p.raw_narrative.slice(0, 1500) + '…' : p.raw_narrative }, { t: 'small', text: 'Texto tal como lo entregó la persona o su transcripción; no fue corregido.' });
  }
  return {
    title: T.title, subtitle: T.sub, badge: 'BORRADOR DE DEMOSTRACIÓN — SUJETO A REVISIÓN', folio, issuedIso: issued.iso.replace(/[-:T]/g, ''),
    fields: [
      { l: 'Documento / folio', v: folio }, { l: 'Fecha de emisión', v: issued.human },
      { l: 'Ubicación / área', v: p.activity_location || NI }, { l: 'Empresa / organización', v: p.company_name || ASTER_NEUTRAL_COMPANY },
      { l: 'Autor / responsable', v: p.person_name || NI }, { l: 'Fecha del hecho', v: p.reported_at || NI },
      { l: 'Equipo / activo', v: p.asset_id || NI }, { l: 'Estado', v: T.state || 'Borrador — pendiente de validación' },
    ],
    blocks,
    footer: ['Demostración de Atacama Labs · Borrador sujeto a revisión · No sustituye un informe aprobado ni un formulario del mandante.', 'Documento generado por un agente a partir de un relato de la persona; requiere validación humana. La fecha de emisión no es la fecha del hecho.'],
  };
}

export function asterSlug(type) { return String(type).replace(/_/g, '-'); }
