// node scripts/content/signal-core.test.mjs
import { evaluateSignal } from './signal-core.mjs';
const now = Date.parse('2026-10-06T12:00:00Z');
const page = '<html><body><h1>Cambios de precios</h1><p>Starting on October 1, 2026 the WhatsApp Business Platform charges per message sent.</p></body></html>';
const good = { type: 'news', title: 'WhatsApp Business Platform cobra por mensaje desde octubre', summary: 'Meta cambió el modelo de cobro de la API de WhatsApp: ahora se cobra por mensaje de plantilla entregado.', url: 'https://example.com/whatsapp-pricing', source: 'Meta for Developers', date: '2026-10-01',
  quote: 'the WhatsApp Business Platform charges per message sent', why_it_matters: 'Cambia el costo de cualquier agente que use WhatsApp para atender clientes.', angle: 'Qué cambió y cómo pagar menos', audience: 'Pymes que atienden por WhatsApp', channel_suggestion: 'instagram', confidence: 0.9,
  factors: { relevance: 9, audience_fit: 9, novelty: 9, utility: 8, clarity: 8, conversation: 8, differentiation: 7 } };
const ev = (s, c = {}) => evaluateSignal(s, { now, httpStatus: 200, bodyText: page, existingKeys: [], ...c });
const clone = (o) => JSON.parse(JSON.stringify(o));
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };

let r = ev(good);
t('señal buena y verificada => candidate', r.status === 'candidate' && r.verified && r.quote_found && r.signal_score >= 70, JSON.stringify(r));
t('source_key de investigación externa (URL + hash de la cita)', /^hermes_research:https:\/\/example\.com\/whatsapp-pricing#[0-9a-f]{8}$/.test(r.source_key), r.source_key);
r = ev(good, { bodyText: '<p>Otra página sin relación</p>' });
t('cita que no aparece => rechazada', r.status === 'rejected' && r.reasons.includes('cita_no_aparece_en_la_pagina') && !r.verified);
r = ev(good, { httpStatus: 404, bodyText: '' });
t('URL inaccesible => rechazada', r.status === 'rejected' && r.reasons.includes('url_inaccesible'));
const old = clone(good); old.date = '2026-05-01';
t('noticia de más de 90 días => obsoleta', ev(old).reasons.includes('senal_obsoleta'));
const mid = clone(good); mid.date = '2026-08-20';
t('entre 30 y 90 días pierde novedad', ev(mid).breakdown.novelty < ev(good).breakdown.novelty);
const nodate = clone(good); delete nodate.date;
t('noticia sin fecha => rechazada', ev(nodate).reasons.includes('fecha_obligatoria_en_senal_externa'));
const noquote = clone(good); delete noquote.quote;
t('señal externa sin cita => rechazada', ev(noquote).reasons.includes('cita_obligatoria_en_senal_externa'));
t('duplicada => status duplicate', ev(good, { existingKeys: [ev(good).source_key] }).status === 'duplicate');
const low = clone(good); Object.keys(low.factors).forEach((k) => { low.factors[k] = 4; });
r = ev(low);
t('score bajo => held (no se fuerza)', r.status === 'held' && r.signal_score < 70, String(r.signal_score));
const ever = { type: 'evergreen', title: 'Tres preguntas antes de automatizar', summary: 'Método de diagnóstico propio de Atacama Labs para decidir qué proceso automatizar primero.', url: 'https://atacamalabs.cl', source: 'Atacama Labs', why_it_matters: 'Contenido educativo recurrente de alto valor.', angle: 'Mapear antes de automatizar', audience: 'Dueños de pymes', channel_suggestion: 'instagram', confidence: 0.8, factors: { relevance: 9, audience_fit: 8, novelty: 5, utility: 8, clarity: 9, conversation: 6, differentiation: 6 } };
r = ev(ever, { bodyText: '', httpStatus: 0 });
t('evergreen no exige cita ni fecha', r.status !== 'rejected' && r.verified, JSON.stringify(r.reasons));
t('source_key evergreen', r.source_key === 'evergreen:https://atacamalabs.cl');
const bad = clone(good); bad.type = 'meme';
t('tipo inválido => rechazada', ev(bad).reasons.includes('tipo_invalido'));
const noch = clone(good); noch.channel_suggestion = 'tiktok';
t('canal inválido => rechazada', ev(noch).reasons.includes('canal_invalido'));
const nof = clone(good); delete nof.factors.utility;
t('factor faltante => rechazada', ev(nof).reasons.includes('factor_faltante:utility'));
t('la evidencia no la declara Hermes: sin verificar vale 0', ev(good, { bodyText: 'x' }).breakdown.evidence === 0);
t('entrada basura no lanza', (() => { try { return evaluateSignal(null, {}).status === 'rejected'; } catch { return false; } })());

const split = '<div><b>Starting on October 1, 2026</b> the WhatsApp&nbsp;Business Platform <span>charges per message</span> sent.</div><script>var x="charges per message sent"</script>';
t('cita partida entre etiquetas HTML se encuentra', ev(good, { bodyText: split }).quote_found === true);
t('texto solo dentro de <script> no cuenta como cita', ev({ ...good, quote: 'var x charges per message sent zzz' }, { bodyText: split }).quote_found === false);

const other = clone(good); other.title = 'Otra novedad distinta en la misma página de cambios'; other.quote = 'charges per message sent';
other.quote = 'Starting on October 1, 2026'; 
t('dos novedades distintas en la misma URL NO son duplicadas', ev(other, { existingKeys: [ev(good).source_key] }).status !== 'duplicate' && ev(other).source_key !== ev(good).source_key);
console.log(pass, 'ok', fail, 'fallos');
process.exit(fail ? 1 : 0);
