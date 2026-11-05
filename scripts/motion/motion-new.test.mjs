import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createProject, validateParams, buildRafaga, MOTION_TEMPLATES } from './motion-new.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const VID = new URL('../../videos/', import.meta.url);
const mkTemplates = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mn-tpl-')); const projects = fs.mkdtempSync(path.join(os.tmpdir(), 'mn-prj-'));
  for (const [t, v] of [['paneles-partidos', 'atacama-provocacion'], ['rafaga-de-camara', 'atacama-verticales']]) {
    fs.mkdirSync(path.join(dir, t, 'assets'), { recursive: true });
    fs.copyFileSync(new URL(v + '/index.html', VID), path.join(dir, t, 'index.html'));
    fs.writeFileSync(path.join(dir, t, 'package.json'), JSON.stringify({ name: v, private: true }));
  }
  return { templatesDir: dir, projectsDir: projects };
};
const PP = { phrases: [{ top: ['¿Quién', 'cotiza'], bottom: ['cuando tú', 'no estás?'] }, { top: ['¿Quién avisa', 'a tu equipo'], bottom: ['cuando hay', 'una venta?'] }, { top: ['Tu equipo'], bottom: ['merece', 'foco'] }] };

ok('paneles-partidos: reemplaza SOLO el texto de las 6 mitades, conserva tiempos/colores/cierre y renombra el paquete', () => {
  const d = mkTemplates();
  const r = createProject({ template: 'paneles-partidos', slug: '2026-10-19-quien-cotiza', params: PP, ...d });
  const html = fs.readFileSync(path.join(r.dir, 'index.html'), 'utf8');
  const orig = fs.readFileSync(new URL('atacama-provocacion/index.html', VID), 'utf8');
  assert.match(html, /id="t1a"><span class="ln"><i>¿Quién<\/i><\/span><span class="ln"><i>cotiza<\/i>/); assert.match(html, /id="t3b"><span class="ln"><i>merece<\/i>/);
  assert.ok(!html.includes('el seguimiento'));
  const script = (h) => h.slice(h.indexOf('<script>'));
  assert.equal(script(html), script(orig), 'la animación (tiempos, transiciones, cierre) queda idéntica');
  assert.match(html, /Agentes que <b>trabajan\./); assert.match(html, /ATACAMALABS\.CL/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(r.dir, 'package.json'), 'utf8')).name, '2026-10-19-quien-cotiza');
  assert.equal(r.duration_s, 8.3); assert.match(r.time_map, /5,75/);
});

ok('texto con caracteres especiales se escapa (sin inyección)', () => {
  const d = mkTemplates(); const p = JSON.parse(JSON.stringify(PP)); p.phrases[0].top = ['<b>&x'];
  const html = fs.readFileSync(path.join(createProject({ template: 'paneles-partidos', slug: 'prueba-escape-1', params: p, ...d }).dir, 'index.html'), 'utf8');
  assert.match(html, /&lt;b&gt;&amp;x/); assert.ok(!html.includes('<i><b>'));
});

ok('audio: reuse conserva la pista aprobada, none quita la etiqueta <audio>, assets/archivo la reemplaza', () => {
  const d = mkTemplates();
  const get = (audio, slug) => fs.readFileSync(path.join(createProject({ template: 'paneles-partidos', slug, params: { ...PP, audio }, ...d }).dir, 'index.html'), 'utf8');
  assert.match(get('reuse', 'audio-reuse-1'), /<audio[^>]*src="assets\/audio-musica\.wav"/);
  assert.ok(!/<audio\b/.test(get('none', 'audio-none-1')));
  assert.match(get('assets/nuevo.mp3', 'audio-nuevo-1'), /<audio[^>]*src="assets\/nuevo\.mp3"/);
});

ok('rafaga: cambia los 6 rubros, ajusta el tamaño por largo y conserva la paleta y la animación', () => {
  const d = mkTemplates();
  const r = createProject({ template: 'rafaga-de-camara', slug: 'rafaga-rubros-02', params: { rubros: ['Logística', 'Contabilidad', 'Retail', 'Turismo', 'Seguros', 'Educación'] }, ...d });
  const html = fs.readFileSync(path.join(r.dir, 'index.html'), 'utf8');
  assert.match(html, /\{ n: "LOGÍSTICA", fs: 132, top: "real", bot: "sky"/); assert.match(html, /\{ n: "CONTABILIDAD", fs: 128, top: "mist"/); assert.match(html, /\{ n: "RETAIL", fs: 156/);
  const orig = fs.readFileSync(new URL('atacama-verticales/index.html', VID), 'utf8');
  assert.equal(html.slice(html.indexOf('const shotsEl')), orig.slice(orig.indexOf('const shotsEl')));
});

ok('validación: cantidades, líneas largas, audio inválido, slug inválido y proyecto existente (no se pisa nada)', () => {
  assert.ok(validateParams('paneles-partidos', { phrases: [] }).errors.includes('se_necesitan_exactamente_3_frases'));
  const long = JSON.parse(JSON.stringify(PP)); long.phrases[0].top = ['una línea demasiado larga'];
  assert.ok(validateParams('paneles-partidos', long).errors.some((e) => e.startsWith('frase_1_top_linea_larga')));
  const big = JSON.parse(JSON.stringify(PP)); big.phrases[2].bottom = ['doce letras!!'];
  assert.ok(validateParams('paneles-partidos', big).errors.some((e) => e.startsWith('frase_3_bottom_linea_larga_max_11')));
  assert.ok(validateParams('paneles-partidos', { ...PP, audio: '../../etc/passwd' }).errors.includes('audio_invalido_usa_reuse_none_o_assets/archivo'));
  assert.ok(validateParams('rafaga-de-camara', { rubros: ['a'] }).errors.includes('se_necesitan_exactamente_6_rubros'));
  assert.ok(validateParams('caos', {}).errors[0].startsWith('plantilla_desconocida'));
  const d = mkTemplates();
  assert.throws(() => createProject({ template: 'paneles-partidos', slug: '../mal', params: PP, ...d }), /slug inválido/);
  createProject({ template: 'paneles-partidos', slug: 'repetido-01', params: PP, ...d });
  assert.throws(() => createProject({ template: 'paneles-partidos', slug: 'repetido-01', params: PP, ...d }), /ya existe/);
});

ok('una plantilla alterada falla con un mensaje claro en vez de producir un video roto', () => {
  const d = mkTemplates(); fs.writeFileSync(path.join(d.templatesDir, 'paneles-partidos', 'index.html'), '<html><title>x</title></html>');
  assert.throws(() => createProject({ template: 'paneles-partidos', slug: 'rota-01', params: PP, ...d }), /no tiene el bloque de texto/);
  assert.throws(() => buildRafaga('<html></html>', { rubros: [] }), /arreglo R/);
  assert.ok(MOTION_TEMPLATES['paneles-partidos'] && MOTION_TEMPLATES['rafaga-de-camara']);
});

console.log(n + ' ok');
