#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 7 — índice de la Biblioteca (spec §8.7, anexo §H3).
 *   node scripts/ops/build-library-index.mjs          → escribe src/lib/ops/library-index.json
 *   node scripts/ops/build-library-index.mjs --check  → falla si el índice no está al día (lo usa run-all-tests)
 * Fuente única: public/brand (logos oficiales), brand/content/mascot (poses), brand/content/recetas (recetas y prompts aprobados),
 * brand/content/motion (Motion v2: perfiles, sonido, guía de estilo, brief de director, plantillas).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'src/lib/ops/library-index.json');
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

export function buildIndex() {
  const brandDir = path.join(ROOT, 'public/brand');
  const brand = fs.readdirSync(brandDir).filter((f) => /\.(svg|png)$/i.test(f)).sort().map((f) => ({ name: f.replace(/\.(svg|png)$/i, ''), url: '/brand/' + f, kind: /^logo|^wordmark/.test(f) ? 'logo' : /^isotipo|^glifo/.test(f) ? 'isotipo' : /icon|favicon|avatar/.test(f) ? 'icono' : 'otro' }));
  const mascotDir = path.join(ROOT, 'brand/content/mascot');
  const mascot = fs.existsSync(mascotDir) ? fs.readdirSync(mascotDir).filter((f) => /\.(png|jpg|webp)$/i.test(f)).sort().map((f) => ({ name: f, path: rel(path.join(mascotDir, f)) })) : [];
  const recDir = path.join(ROOT, 'brand/content/recetas');
  const recipes = fs.existsSync(recDir) ? fs.readdirSync(recDir).filter((d) => fs.statSync(path.join(recDir, d)).isDirectory()).sort().map((slug) => {
    const dir = path.join(recDir, slug);
    const md = fs.existsSync(path.join(dir, 'RECETA.md')) ? read(path.join(dir, 'RECETA.md')) : '';
    const title = (md.match(/^#\s+(.+)$/m) || [])[1] || slug;
    const pdir = path.join(dir, 'prompts');
    const prompts = fs.existsSync(pdir) ? fs.readdirSync(pdir).filter((f) => f.endsWith('.txt')).sort().map((f) => ({ name: f.replace(/\.txt$/, ''), text: read(path.join(pdir, f)).trim() })) : [];
    return { slug, title, path: rel(dir), receta: md.trim(), prompts };
  }) : [];
  const palette = [{ name: 'Azul Atacama', hex: '#0F5CED' }, { name: 'Tinta', hex: '#121A2B' }, { name: 'Noche', hex: '#041228' }, { name: 'Papel', hex: '#F5F4F0' }, { name: 'Línea', hex: '#DDD9D1' }];
  const motDir = path.join(ROOT, 'brand/content/motion');
  const motion = fs.existsSync(motDir) ? fs.readdirSync(motDir).sort().flatMap((n) => { const p = path.join(motDir, n); const md = fs.statSync(p).isDirectory() ? path.join(p, 'README.md') : (n.endsWith('.md') ? p : null); if (!md || !fs.existsSync(md)) return []; const text = read(md).trim(); return [{ slug: n.replace(/\.md$/, ''), title: (text.match(/^#\s+(.+)$/m) || [])[1] || n, path: rel(md), text }]; }) : [];
  return { font: 'DM Sans', palette, brand, mascot, recipes, motion };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const json = JSON.stringify(buildIndex(), null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? read(OUT) : '';
    if (cur !== json) { console.error('FAIL library-index.json desactualizado: corre node scripts/ops/build-library-index.mjs'); process.exit(1); }
    console.log('1 ok');
  } else { fs.writeFileSync(OUT, json); console.log('escrito', rel(OUT)); }
}
