/**
 * ASTER 2026 · compatibilidad con herramientas que envían HTML ya armado (document_title, metadata_html, sections_html).
 *
 * El HTML recibido NUNCA se inserta en la plantilla: se reduce a TEXTO (títulos, párrafos, viñetas y **negrita**) y se
 * vuelve a dibujar con el marcado propio de la plantilla. Scripts, estilos, atributos, enlaces y cualquier otra
 * etiqueta se descartan. Funciones PURAS (se incrustan en los nodos Code de n8n con Function.toString).
 */

export const ASTER_HTML_BLOCK_RE = '<(h[1-6])\\b[^>]*>([\\s\\S]*?)<\\/\\1\\s*>|<(p|li|div)\\b[^>]*>([\\s\\S]*?)<\\/\\3\\s*>';
export const ASTER_HTML_ROW_RE = '<(p|li|div|tr)\\b[^>]*>([\\s\\S]*?)<\\/\\1\\s*>';

export function asterHtmlDecode(s) {
  return String(s == null ? '' : s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => { const c = parseInt(h, 16); return c >= 32 && c <= 0x10ffff ? String.fromCodePoint(c) : ''; })
    .replace(/&#(\d{1,7});/g, (m, d) => { const c = parseInt(d, 10); return c >= 32 && c <= 0x10ffff ? String.fromCodePoint(c) : ''; })
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&amp;/gi, '&');
}

/** HTML → texto plano con **negrita**. Descarta script/style (y similares) completos y todas las demás etiquetas. */
export function asterHtmlText(html) {
  let t = String(html == null ? '' : html)
    .replace(/<(script|style|iframe|object|embed|svg|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (m, tag, inner) => {
      const x = inner.replace(/<[^>]*>/g, '').replace(/\*/g, '').trim();
      return x ? '**' + x + '**' : '';
    })
    .replace(/<[^>]*>/g, ' ');
  return asterHtmlDecode(t).replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** sections_html → [{heading, text, items, pending}] */
export function asterHtmlParseSections(html) {
  const src = String(html == null ? '' : html).replace(/<(script|style|iframe|object|embed|svg|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  const re = new RegExp(ASTER_HTML_BLOCK_RE, 'gi');
  const out = [];
  let cur = null;
  let m;
  const open = (heading) => { cur = { heading, paras: [], items: [] }; out.push(cur); };
  while ((m = re.exec(src)) !== null) {
    if (m[1]) {
      const h = asterHtmlText(m[2]).replace(/\*\*/g, '');
      if (h) open(h.slice(0, 90));
      continue;
    }
    const txt = asterHtmlText(m[4]);
    if (!txt) continue;
    if (!cur) open('Detalle');
    if (m[3].toLowerCase() === 'li') cur.items.push(txt); else cur.paras.push(txt);
  }
  if (out.length === 0) {
    const all = asterHtmlText(src);
    if (all) out.push({ heading: 'Detalle', paras: [all], items: [] });
  }
  return out
    .filter((s) => s.paras.length || s.items.length)
    .map((s) => {
      const sec = { heading: s.heading };
      if (/pendiente/i.test(s.heading) && s.paras.length && !s.items.length) {
        // «Pendientes» → recuadro azul de la plantilla: primera frase como título, el resto como detalle
        const all = s.paras.join(' ');
        const cut = all.search(/[.!?](\s|$)/);
        const first = cut > 0 && cut < 110 ? all.slice(0, cut + 1) : all.slice(0, 110);
        sec.pending = { title: first.replace(/\*\*/g, ''), text: all.slice(first.length).trim() };
      } else {
        if (s.paras.length) sec.text = s.paras.join('\n\n');
        if (s.items.length) sec.items = s.items;
      }
      return sec;
    });
}

/** metadata_html → [{label, value}] (de <p><strong>Etiqueta:</strong> valor</p> o «Etiqueta: valor») */
export function asterHtmlParseMetadata(html) {
  const src = String(html == null ? '' : html).replace(/<(script|style|iframe|object|embed|svg|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  const re = new RegExp(ASTER_HTML_ROW_RE, 'gi');
  const rows = [];
  let m;
  while ((m = re.exec(src)) !== null) rows.push(m[2]);
  if (rows.length === 0) rows.push(...src.split(/<br\s*\/?>|\n/i));
  const out = [];
  for (const r of rows) {
    const t = asterHtmlText(r);
    if (!t) continue;
    const i = t.indexOf(':');
    if (i <= 0 || i > 60) continue;
    const label = t.slice(0, i).replace(/\*\*/g, '').trim();
    const value = t.slice(i + 1).replace(/\*\*/g, '').trim();
    if (label) out.push({ label, value });
  }
  return out;
}
