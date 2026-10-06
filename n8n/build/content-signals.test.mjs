// node n8n/build/content-signals.test.mjs — prueba los nodos Code de «13 Content Signal Intake» con stubs.
import { buildContentSignals } from './content-signals.mjs';
const wf = buildContentSignals();
const codeOf = (n) => wf.nodes.find((x) => x.name === n).parameters.jsCode;
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const mk = (nodes, input) => (name) => { const $ = (n) => ({ first: () => ({ json: nodes[n] }), all: () => [].concat(nodes[n]).map((j) => ({ json: j })) }); const f = new Function('$', '$json', '$input', codeOf(name)); return f($, input[0] || {}, { first: () => ({ json: input[0] }), all: () => input.map((j) => ({ json: j })) }); };
const now = new Date().toISOString().slice(0, 10);
const good = { type: 'news', title: 'Meta actualiza el cobro de la API de WhatsApp para plantillas', summary: 'Meta cambió cómo se cobran los mensajes de plantilla de la API de WhatsApp Business Platform para empresas.', url: 'https://example.com/a', source: 'Meta', date: now, quote: 'charges per message sent', why_it_matters: 'Cambia el costo de los agentes que atienden por WhatsApp.', angle: 'Qué cambió y cómo pagar menos', audience: 'Pymes con WhatsApp', channel_suggestion: 'instagram', confidence: 0.9, factors: { relevance: 9, audience_fit: 9, novelty: 9, utility: 8, clarity: 8, conversation: 8, differentiation: 7 } };
const bad = { ...good, url: 'https://example.com/b', title: 'Otra señal con cita falsa en la página', quote: 'esta cita no existe en ninguna parte de la pagina' };
const prep = mk({ 'Signals Webhook': { body: { batch_id: 'hermes-test-1', icp_pack_id: '0ba54785-bff0-4a2d-a397-64e697d34e38', signals: [good, bad, { ...good }] } } }, [{ statusCode: 200, body: [] }])('Prepare');
t('Prepare: 3 items, cada uno con su URL (una misma página puede traer varias novedades)', prep.length === 3 && prep[2].json.fetchUrl === 'https://example.com/a' && prep[0].json.fetchUrl === 'https://example.com/a');
const thr = (b) => { try { mk({ 'Signals Webhook': { body: b } }, [{ statusCode: 200, body: [] }])('Prepare'); return false; } catch { return true; } };
t('Prepare: pack ajeno / lote vacío / >8 / sin batch_id => error', thr({ icp_pack_id: 'x', batch_id: 'abcd', signals: [good] }) && thr({ batch_id: 'abcd', signals: [] }) && thr({ batch_id: 'abcd', signals: Array(9).fill(good) }) && thr({ signals: [good] }));
const fetched = [{ statusCode: 200, data: '<p>The platform charges per message sent</p>' }, { statusCode: 200, body: '<p>otra cosa</p>' }, { statusCode: 200, body: 'x' }];
const sc = mk({ Prepare: prep.map((p) => p.json), 'Fetch Existing': { body: [] } }, fetched)('Score')[0].json;
t('Score: señal buena => candidate verificada', sc.report[0].status === 'candidate' && sc.report[0].verified === true, JSON.stringify(sc.report[0]));
t('Score: cita falsa => rejected y no verificada', sc.report[1].status === 'rejected' && sc.rows[1].verified === false && sc.rows[1].signal_status === 'rejected');
t('Score: tercera (misma URL) => duplicada, no se escribe', sc.report[2].status === 'duplicate' && sc.rows.length === 2);
t('Score: fila lista para content_sources', sc.rows[0].kind === 'hermes_research' && /^hermes_research:https:\/\/example\.com\/a#[0-9a-f]{8}$/.test(sc.rows[0].source_key) && sc.rows[0].signal_type === 'news' && sc.rows[0].verified === true && sc.rows[0].signal_score >= 70);
const resp = mk({ Score: sc }, [{ statusCode: 201 }])('Respond')[0].json;
t('Respond: resumen y mejor candidata', resp.candidates === 1 && resp.rejected === 1 && resp.duplicates === 1 && resp.best && resp.best.score >= 70 && /no se creo ninguna pieza/.test(resp.note));
let threw = false; try { mk({ Score: sc }, [{ statusCode: 400, body: { message: 'x' } }])('Respond'); } catch { threw = true; }
t('Respond: aborta si Supabase falla', threw);
t('el workflow no toca GHL ni crea piezas', !/leadconnectorhq|content_pieces/.test(JSON.stringify(wf)));
console.log(pass, 'ok', fail, 'fallos');
process.exit(fail ? 1 : 0);
