// node scripts/content/engine-core.test.mjs
import fs from 'node:fs';
import { evaluatePiece } from './engine-core.mjs';

const base = JSON.parse(fs.readFileSync(new URL('./examples/linkedin-founder-dry-run.piece.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); };

// 1. La pieza real de ejemplo pasa el gate
const ok = evaluatePiece(base, { existingIdeaKeys: [] });
t('pieza real: sin errores', ok.ok, JSON.stringify(ok.errors));
t('pieza real: candidata con score >= 70', ok.decision === 'candidate' && ok.score >= 70, String(ok.score));
t('pieza real: texto final incluye gancho y hashtags', ok.post_text.startsWith(base.hook) && ok.post_text.includes('#automatización'));
t('idea_key estable', evaluatePiece(base, {}).idea_key === ok.idea_key);

// 2. No repetición
t('idea repetida se rechaza', (() => { const r = evaluatePiece(base, { existingIdeaKeys: [ok.idea_key] }); return r.decision === 'rejected' && r.errors.includes('idea_repetida'); })());

// 3. Fuente y claims
const ext = clone(base); ext.claims.push({ text: 'Meta anunció un cambio de política', external: true });
t('claim externo sin fuente => rechazo', evaluatePiece(ext).errors.some((e) => e.startsWith('claim_externo_sin_fuente')));
const ext2 = clone(base); ext2.claims.push({ text: 'Un estudio dice X', external: true, source_url: 'https://example.com/estudio' });
t('claim externo con URL no verificada => rechazo', evaluatePiece(ext2).errors.some((e) => e.startsWith('claim_externo_fuente_no_verificada')));
const ext3 = clone(base); ext3.sources.push({ kind: 'hermes_research', title: 'Estudio', url: 'https://example.com/estudio', verified: true, evidence: [] });
ext3.claims.push({ text: 'Un estudio dice X', external: true, source_url: 'https://example.com/estudio' });
t('claim externo con fuente verificada => OK', evaluatePiece(ext3).ok);
const noSrc = clone(base); noSrc.sources = [];
t('sin fuentes => rechazo', evaluatePiece(noSrc).errors.includes('sin_fuentes'));
const unver = clone(base); unver.sources[0].verified = false;
const unverR = evaluatePiece(unver);
t('fuente no verificada tope en evidencia (<=2)', unverR.breakdown.evidence <= 2);
const fig = clone(base); fig.body += '\n\nEsto ahorra un 40% del tiempo.';
t('cifra/porcentaje sin respaldo => rechazo', evaluatePiece(fig).errors.some((e) => e.startsWith('cifra_sin_respaldo')));
const fig2 = clone(fig); fig2.claims.push({ text: 'Ahorro de un 40% del tiempo medido en el piloto', external: false });
t('cifra con claim respaldado => OK', evaluatePiece(fig2).ok);
const news = clone(base); news.category = 'Noticia';
t('Noticia sin claim externo => rechazo', evaluatePiece(news).errors.includes('noticia_sin_claim_externo'));

// 4. Calidad y relleno
const filler = clone(base); filler.body += '\n\nEn el mundo actual la transformación digital es una revolución disruptiva.';
const fr = evaluatePiece(filler);
t('frases de relleno penalizan', fr.penalties >= 9 && fr.lint_hits.length >= 3, JSON.stringify(fr.lint_hits));
const cta = clone(base); cta.cta = { type: 'link', text: 'Agenda una llamada con nosotros.' };
t('CTA genérico "agenda una llamada" penaliza', evaluatePiece(cta).lint_hits.includes('cta_generico_agenda_llamada'));
const low = clone(base); Object.keys(low.factors).forEach((k) => { low.factors[k] = { value: 4, note: 'x' }; });
const lr = evaluatePiece(low);
t('score bajo no es candidato', lr.decision === 'below_threshold' && lr.score < 70, String(lr.score));
const missing = clone(base); delete missing.factors.clarity;
t('factor faltante => rechazo', evaluatePiece(missing).errors.includes('factor_faltante:clarity'));

// 5. Canal / formato / slides
const ig = clone(base); ig.channel = 'instagram'; ig.format = 'texto';
t('Instagram sin medio => rechazo', evaluatePiece(ig).errors.includes('instagram_requiere_medio'));
const car = clone(base); car.channel = 'instagram'; car.format = 'carrusel'; car.visual_direction = 'Fondo claro, una idea por slide';
car.slides = [{ layout: 'cover', title: 'Antes de automatizar, decide dónde va el freno' }, { layout: 'content', title: 'El plan primero', body: 'El flujo devuelve qué haría antes de escribir.' }, { layout: 'cta', title: '¿Dónde pondrías el freno?' }];
t('carrusel válido (3 slides)', evaluatePiece(car).ok, JSON.stringify(evaluatePiece(car).errors));
const car2 = clone(car); car2.slides = car2.slides.slice(0, 2);
t('carrusel con 2 slides => rechazo', evaluatePiece(car2).errors.includes('cantidad_de_slides_invalida'));
const car3 = clone(car); car3.slides[1].title = 'x'.repeat(95);
t('título de slide largo => rechazo', evaluatePiece(car3).errors.includes('slide_2_titulo_largo'));
const car4 = clone(car); car4.slides[1].items = [1, 2, 3, 4, 5].map((n) => ({ title: 't' + n, text: 'x' }));
t('más de 4 ideas en una slide => rechazo', evaluatePiece(car4).errors.includes('slide_2_muchas_ideas'));
const kw = clone(base); kw.cta = { type: 'comment_keyword', text: 'Comenta MAPA', keyword: 'MAPA' };
t('CTA con keyword exige recurso', evaluatePiece(kw).errors.includes('cta_keyword_requiere_keyword_y_recurso'));
const kw2 = clone(base); kw2.cta = { type: 'comment_keyword', text: 'Comenta MAPA y te lo envío', keyword: 'MAPA', resource: 'mapa-de-procesos' };
t('CTA con keyword y recurso => OK', evaluatePiece(kw2).ok);
const lng = clone(base); lng.body = 'a'.repeat(3100);
t('texto sobre el límite => rechazo', evaluatePiece(lng).errors.includes('texto_excede_limite_3000'));
const hs = clone(base); hs.hashtags = ['#a', '#b', '#c', '#d', '#e', '#f'];
t('más de 5 hashtags => rechazo', evaluatePiece(hs).errors.includes('demasiados_hashtags'));
t('entrada basura no lanza excepción', (() => { try { return evaluatePiece(null).decision === 'rejected'; } catch { return false; } })());

console.log(pass, 'ok', fail, 'fallos');
process.exit(fail ? 1 : 0);
