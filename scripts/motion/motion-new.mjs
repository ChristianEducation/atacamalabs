#!/usr/bin/env node
/**
 * Atacama OS · taller de motion (Frente C) — crea un proyecto de video NUEVO desde una plantilla validada, cambiando SOLO el texto.
 * Los tiempos, colores, transiciones, cuadrícula, cierre y audio de la plantilla no se tocan: son los que Christian ya aprobó y los que
 * pasan `hyperframes check`. Así Hermes produce un reel nuevo sin reescribir HTML a mano.
 *
 *   node motion-new.mjs paneles-partidos <slug> params.json   →  {"phrases":[{"top":["¿Quién","contesta"],"bottom":["cuando tú","no puedes?"]}, {…}, {"top":["Alguien"],"bottom":["tiene que","hacerlo"]}], "audio":"reuse"|"none"|"assets/archivo"}
 *   node motion-new.mjs rafaga-de-camara <slug> params.json   →  {"rubros":["SALUD","INMOBILIARIAS","MINERÍA","GIMNASIOS","EDUCACIÓN","ALIMENTACIÓN"], "audio":"reuse"|"none"}
 * Opciones: --templates <dir> (por defecto /opt/data/motion-studio/templates) · --projects <dir> (por defecto /opt/data/motion-studio/projects).
 * El slug es el nombre del proyecto Y de la composición (motion_render.sh lo usa, y el asset «studio» del Media Gateway lo busca): minúsculas, números y guiones.
 */
import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LINE_MAX = { normal: 14, big: 11 };
const SLUG = /^[a-z0-9][a-z0-9-]{2,60}$/;

export const MOTION_TEMPLATES = {
  'paneles-partidos': { duration_s: 8.3, time_map: 'pulsos en 0,1 s · 1,74 s · 3,98 s y golpe grave en 5,75 s; cierre con logo desde 6,25 s', audio_file: 'assets/audio-musica.wav' },
  'rafaga-de-camara': { duration_s: 8.4, time_map: 'ráfaga de obturador 1,2–3,9 s, hoja de contactos 3,95 s, miniaturas aceleradas 4,08–4,61 s, cierre 5,75 s', audio_file: 'assets/audio.wav' },
};

export function validateParams(template, params) {
  const errors = [];
  const p = params && typeof params === 'object' ? params : {};
  if (!MOTION_TEMPLATES[template]) errors.push('plantilla_desconocida:' + template);
  if (template === 'paneles-partidos') {
    const ph = Array.isArray(p.phrases) ? p.phrases : [];
    if (ph.length !== 3) errors.push('se_necesitan_exactamente_3_frases');
    ph.forEach((f, i) => {
      const big = i === 2;
      ['top', 'bottom'].forEach((k) => {
        const ls = f && Array.isArray(f[k]) ? f[k] : [];
        if (!ls.length || ls.length > 3) errors.push('frase_' + (i + 1) + '_' + k + '_1_a_3_lineas');
        ls.forEach((l) => { if (!String(l || '').trim()) errors.push('frase_' + (i + 1) + '_' + k + '_linea_vacia'); else if (String(l).length > (big ? LINE_MAX.big : LINE_MAX.normal)) errors.push('frase_' + (i + 1) + '_' + k + '_linea_larga_max_' + (big ? LINE_MAX.big : LINE_MAX.normal) + ':' + String(l).slice(0, 20)); });
      });
    });
  }
  if (template === 'rafaga-de-camara') {
    const r = Array.isArray(p.rubros) ? p.rubros : [];
    if (r.length !== 6) errors.push('se_necesitan_exactamente_6_rubros');
    r.forEach((x) => { const s = String(x || '').trim(); if (!s) errors.push('rubro_vacio'); else if (s.length > 16) errors.push('rubro_largo_max_16:' + s.slice(0, 20)); });
  }
  if (p.audio !== undefined && !['reuse', 'none'].includes(p.audio) && !/^assets\/[A-Za-z0-9._-]+\.(mp3|wav|m4a)$/.test(String(p.audio))) errors.push('audio_invalido_usa_reuse_none_o_assets/archivo');
  return { ok: errors.length === 0, errors };
}

const spans = (lines) => lines.map((l) => '<span class="ln"><i>' + esc(String(l).trim()) + '</i></span>').join('');

export function buildPanelesPartidos(html, params) {
  let out = html;
  params.phrases.forEach((f, i) => {
    [['a', 'top'], ['b', 'bottom']].forEach(([s, k]) => {
      const id = 't' + (i + 1) + s;
      const re = new RegExp('(<div class="txt[^"]*" id="' + id + '">)(?:<span class="ln"><i>[^<]*</i></span>)+(</div>)');
      if (!re.test(out)) throw new Error('La plantilla no tiene el bloque de texto #' + id + ' (¿plantilla modificada?)');
      out = out.replace(re, (_, a, b) => a + spans(f[k]) + b);
    });
  });
  const title = params.phrases[0].top.concat(params.phrases[0].bottom).join(' ');
  return out.replace(/<title>[^<]*<\/title>/, () => '<title>Atacama Labs — ' + esc(title) + '</title>');
}

const FS = (n) => (n <= 5 ? 196 : n <= 7 ? 156 : n <= 9 ? 132 : n <= 12 ? 128 : Math.floor(1460 / n));
export function buildRafaga(html, params) {
  const m = html.match(/const R = \[\n([\s\S]*?)\n      \];/);
  if (!m) throw new Error('La plantilla no tiene el arreglo R de rubros (¿plantilla modificada?)');
  const pal = [...m[1].matchAll(/top: "(\w+)", bot: "(\w+)", tt: "(\w+)", ic: "(\w+)"/g)];
  if (pal.length !== 6) throw new Error('La plantilla debe traer 6 paletas de rubro');
  const rows = params.rubros.map((n, i) => { const name = String(n).trim().toUpperCase(); return '        { n: "' + name.replace(/"/g, '') + '", fs: ' + FS(name.length) + ', top: "' + pal[i][1] + '", bot: "' + pal[i][2] + '", tt: "' + pal[i][3] + '", ic: "' + pal[i][4] + '" },'; });
  return html.replace(m[0], () => 'const R = [\n' + rows.join('\n') + '\n      ];');
}

/** Crea el proyecto. Devuelve { dir, slug, template, duration_s, time_map, audio }. */
export function createProject({ template, slug, params, templatesDir, projectsDir }) {
  if (!SLUG.test(String(slug || ''))) throw new Error('slug inválido: minúsculas, números y guiones (3–61 caracteres)');
  const v = validateParams(template, params);
  if (!v.ok) throw new Error('parámetros inválidos: ' + v.errors.join('; '));
  const src = path.join(templatesDir, template), dst = path.join(projectsDir, slug);
  if (!fs.existsSync(path.join(src, 'index.html'))) throw new Error('No existe la plantilla ' + template + ' en ' + templatesDir);
  if (fs.existsSync(dst)) throw new Error('El proyecto ' + slug + ' ya existe: elige otro nombre (no se pisa nada)');
  fs.cpSync(src, dst, { recursive: true });
  const f = path.join(dst, 'index.html');
  let html = fs.readFileSync(f, 'utf8');
  html = template === 'paneles-partidos' ? buildPanelesPartidos(html, params) : buildRafaga(html, params);
  const audio = params.audio || 'reuse';
  if (audio === 'none') html = html.replace(/\s*<audio\b[^>]*><\/audio>/, '');
  else if (audio !== 'reuse') html = html.replace(/(<audio\b[^>]*\bsrc=")[^"]*(")/, (_, a, b) => a + audio + b);
  fs.writeFileSync(f, html);
  if (fs.existsSync(path.join(dst, 'package.json'))) { const pj = JSON.parse(fs.readFileSync(path.join(dst, 'package.json'), 'utf8')); pj.name = slug; fs.writeFileSync(path.join(dst, 'package.json'), JSON.stringify(pj, null, 2) + '\n'); }
  return { dir: dst, slug, template, ...MOTION_TEMPLATES[template], audio };
}

if (process.argv[1] && process.argv[1].endsWith('motion-new.mjs')) {
  const a = process.argv.slice(2);
  const flag = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !['--templates', '--projects'].includes(a[i - 1]));
  try {
    if (pos.length < 3) throw new Error('uso: motion-new.mjs <plantilla> <slug> <params.json>');
    const r = createProject({ template: pos[0], slug: pos[1], params: JSON.parse(fs.readFileSync(pos[2], 'utf8')), templatesDir: flag('--templates', '/opt/data/motion-studio/templates'), projectsDir: flag('--projects', '/opt/data/motion-studio/projects') });
    console.log(JSON.stringify(r, null, 2));
  } catch (e) { console.error('ERROR', e.message); process.exit(1); }
}
