// node n8n/build/linkedin.test.mjs — recorre el workflow 26 nodo a nodo con Supabase, Waalaxy y el Gateway simulados (sin red)
import { buildLinkedin, ACTIONS } from './linkedin.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : String(x).slice(0, 400)); };
const wf = buildLinkedin();
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (n) => wf.nodes.find((x) => x.name === n).parameters.jsCode;
const mkDollar = (store) => (name) => ({ first: () => { if (!(name in store)) throw new Error('Node ' + name + ' no ejecutado'); return { json: store[name] }; }, all: () => (Array.isArray(store[name + '#all']) ? store[name + '#all'] : [store[name]]).map((json) => ({ json })), item: { json: store[name] } });
const run = async (name, store) => new AsyncFunction('$', '$json', code(name)).call({}, mkDollar(store), {});
const ok200 = (body) => ({ statusCode: 200, body });
const URL1 = 'https://www.linkedin.com/in/daniel-colodro-ebner-46498527';

const CAND = (o) => ({ id: 'k1', company_name: 'Empresa Prueba SpA', domain: 'prueba.cl', website: 'https://prueba.cl', status: 'in_ghl', band: 'alta', priority_score: 85, ghl_stage: 'investigado', ghl_contact_id: 'gc1', ghl_opportunity_id: 'go1', channel_state: {},
  canonical: { company_name: 'Empresa Prueba SpA', contact: { name: 'Daniel Colodro Ebner', role: 'Gerente Comercial', email: 'info@prueba.cl', linkedin: URL1, linkedin_source_url: 'https://prueba.cl/equipo' } }, ...(o || {}) });
const CFG = (o) => ({ id: 1, mode: 'off', linkedin_mode: 'off', linkedin_list_id: null, linkedin_campaign_id: null, linkedin_test_list_id: 'LIST-TEST', linkedin_daily_cap: 5, linkedin_test_allowlist: [URL1], ...(o || {}) });
const FIX = (o) => ({ cfg: CFG(), cands: [CAND(), CAND({ id: 'k2', company_name: 'Sin Datos Ltda', domain: 'sindatos.cl', priority_score: 70, canonical: { contact: { name: null, role: 'Dueño (NO ENCONTRADO)' } } })], msgs: [], sup: [], wa: {}, waImport: null, ...(o || {}) });

async function call(body, fx) {
  const f = fx || FIX();
  const store = { 'LI Webhook': { body } };
  store.Parse = (await run('Parse', store))[0].json;
  if (store.Parse.fatal) return { fatal: store.Parse.fatal };
  store['SB Config'] = ok200([f.cfg]); store['SB Candidates'] = ok200(f.cands); store['SB Messages'] = ok200(f.msgs); store['SB Suppression'] = ok200(f.sup);
  store['Waalaxy Lists'] = f.wa.lists || { statusCode: 0 }; store['Waalaxy Campaigns'] = f.wa.campaigns || { statusCode: 0 }; store['Waalaxy Test'] = f.wa.test || { statusCode: 0 };
  store.Compute = (await run('Compute', store))[0].json;
  const importCalled = Boolean(store.Compute.out.waalaxy && !store.Compute.out.waalaxy.skip);
  store['Waalaxy Import'] = importCalled ? (f.waImport || ok200({ result: [{ importCode: 'success', prospect: { _id: 'WX1' } }] })) : { statusCode: 0 };
  store.Finish = (await run('Finish', store))[0].json;
  const w = (await run('Expand Writes', store)).map((x) => x.json); store['Apply Writes'] = ok200({}); store['Apply Writes#all'] = w.map(() => ({ statusCode: f.writeStatus || 204, body: {} }));
  const gw = (await run('Expand Gateway', store)).map((x) => x.json); store['Gateway Act'] = ok200({}); store['Gateway Act#all'] = gw.map(() => ({ statusCode: f.gwStatus || 200, body: {} }));
  const resp = (await run('Respond', store))[0].json;
  return { parsed: store.Parse, comp: store.Compute, importCalled, fin: store.Finish, writes: w.filter((x) => !x.skip), gw: gw.filter((x) => !x.skip), resp };
}

// ---------- estructura y seguridad
const names = new Set(wf.nodes.map((n) => n.name));
t('26: conexiones válidas y webhook protegido con clave en ruta propia', Object.entries(wf.connections).every(([a, v]) => names.has(a) && v.main.every((o) => o.every((c) => names.has(c.node)))) && wf.nodes[0].parameters.authentication === 'headerAuth' && wf.nodes[0].parameters.path === 'atacama-linkedin');
t('26: sin secretos y sin nodos de envío (Gmail, Telegram, WhatsApp, SMTP, Slack)', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|ya29\.)/.test(JSON.stringify(wf)) && !wf.nodes.some((n) => /gmail|emailSend|whatsapp|telegram|slack|smtp/i.test(n.type)));
t('26: los nodos HTTP toleran fallos (siempre responde)', wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => n.continueOnFail === true));
const waNodes = wf.nodes.filter((n) => n.credentials && n.credentials.waalaxyApi);
t('26: Waalaxy solo con la credencial propia; lecturas = GET y el único POST es el import (/prospects/addProspectFromIntegration)', waNodes.length === 4 && waNodes.filter((n) => n.parameters.method === 'POST').length === 1 && /addProspectFromIntegration/.test(waNodes.find((n) => n.parameters.method === 'POST').parameters.url));
t('26: el import a Waalaxy se omite salvo que el plan lo ordene (URL de descarte por defecto)', /out\.waalaxy && !\$\("Compute"\)\.first\(\)\.json\.out\.waalaxy\.skip \? .*: "https:\/\/localhost\.invalid\//.test(wf.nodes.find((n) => n.name === 'Waalaxy Import').parameters.url));
t('26: escribe solo en prospect_candidates, outreach_config y operator_audit_log (más el Gateway para GHL)', (() => { const c = code('Compute') + code('Finish'); const paths = [...c.matchAll(/path: '([a-z_]+)/g)].map((m) => m[1]); return paths.length >= 2 && paths.every((p) => ['prospect_candidates', 'outreach_config', 'operator_audit_log'].includes(p)); })());
let r = await call({ action: 'inventada' }); t('acción inválida → error con la lista', /action inválida/.test(r.fatal) && ACTIONS.every((a) => r.fatal.includes(a)));
r = await call({ action: 'approve' }); t('target obligatorio para approve/status/recommend/event', /target obligatorio/.test(r.fatal));

// ---------- lectura
r = await call({ action: 'list' });
t('list: separa LinkedIn / correo / investigar más y muestra el modo apagado', r.resp.ok && r.resp.ready_for_linkedin.length === 1 && r.resp.ready_for_linkedin[0].company === 'Empresa Prueba SpA' && r.resp.needs_research === 1 && /LinkedIn 1 · correo 0 · investigar más 1/.test(r.resp.text) && /apagado/.test(r.resp.text), r.resp.text);
r = await call({ action: 'status', target: 'prueba.cl' });
t('status: recomendación fresca y próxima acción', r.resp.ok && r.resp.recommendation.channel === 'linkedin' && /sin canal elegido; recomendado: linkedin/.test(r.resp.text), r.resp.text);
r = await call({ action: 'status', target: 'no existe' }); t('status con prospecto inexistente → error claro', r.resp.ok === false && r.resp.error === 'sin_coincidencia');
r = await call({ action: 'status', target: 'sin datos' }); t('status de «Sin Datos»: investigar más (falta persona/perfil)', /investigar más/.test(r.resp.text) && r.resp.recommendation.channel === 'none' && r.resp.recommendation.missing.length >= 3, r.resp.text);
r = await call({ action: 'config' }); t('config: muestra modos y destinos sin secretos', r.resp.config.linkedin_mode === 'off' && r.resp.config.linkedin_test_list_id === 'LIST-TEST' && !JSON.stringify(r.resp).match(/token|secret|key/i));

// ---------- recomendar
r = await call({ action: 'recommend', target: 'prueba.cl' });
t('recommend: guarda la recomendación en channel_state y deja auditoría', r.writes.some((w) => w.path === 'prospect_candidates?id=eq.k1' && w.body.channel_state.recommended.channel === 'linkedin') && r.writes.some((w) => w.path === 'operator_audit_log'), JSON.stringify(r.writes.map((w) => w.path)));

// ---------- aprobar: apagado, test, errores
r = await call({ action: 'approve', target: 'prueba.cl' });
t('approve con linkedin_mode=off: muestra qué haría, NO emite código y NO llama a Waalaxy', r.resp.status === 'mode_off' && !r.importCalled && r.writes.every((w) => w.path === 'operator_audit_log') && r.resp.summary.will_contact === false, JSON.stringify(r.resp));
const fxTest = FIX({ cfg: CFG({ linkedin_mode: 'test' }) });
r = await call({ action: 'approve', target: 'prueba.cl' }, fxTest);
t('approve (test) paso 1: emite código, guarda confirmación y NO llama a Waalaxy', r.resp.status === 'confirmation_required' && /^LI-\d{6}$/.test(r.resp.confirmation_code) && !r.importCalled && r.writes.some((w) => w.body.channel_state && w.body.channel_state.linkedin.confirm), JSON.stringify(r.resp));
const code1 = r.resp.confirmation_code; const stored = r.writes.find((w) => w.body.channel_state).body.channel_state;
r = await call({ action: 'approve', target: 'prueba.cl', confirmation_code: 'LI-000000', order_text: 'sí, apruebo' }, { ...fxTest, cands: [CAND({ channel_state: stored })] });
t('approve con código incorrecto: rechaza y NO llama a Waalaxy', r.resp.error === 'codigo_invalido' && !r.importCalled);
r = await call({ action: 'approve', target: 'prueba.cl', confirmation_code: code1, order_text: 'sí' }, { ...fxTest, cands: [CAND({ channel_state: stored })] });
t('approve sin palabras de Christian: rechaza y NO llama a Waalaxy', r.resp.error === 'falta_orden' && !r.importCalled);
r = await call({ action: 'approve', target: 'prueba.cl', confirmation_code: code1, order_text: 'Sí, confirmo el alta de PRUEBA en la lista de test' }, { ...fxTest, cands: [CAND({ channel_state: stored })] });
t('approve (test) paso 2: importa SOLO a la lista de prueba, sin campaña, y registra estado', r.importCalled && r.comp.out.waalaxy.body.prospectListId === 'LIST-TEST' && !('campaignId' in r.comp.out.waalaxy.body) && r.resp.status === 'imported' && r.resp.state === 'en_lista' && r.resp.waalaxy_prospect_id === 'WX1', JSON.stringify(r.resp));
const upd = r.writes.find((w) => w.path === 'prospect_candidates?id=eq.k1');
t('approve paso 2: channel_state guarda lista, id externo, código de import y próxima acción; sin confirmación pendiente', upd.body.channel_state.linkedin.list_id === 'LIST-TEST' && upd.body.channel_state.linkedin.waalaxy_prospect_id === 'WX1' && upd.body.channel_state.linkedin.import_code === 'success' && upd.body.channel_state.linkedin.confirm === null && /sin campaña|no se contactó/.test(upd.body.channel_state.linkedin.next_action) && upd.body.channel_state.approved_channel === 'linkedin', JSON.stringify(upd.body));
t('approve paso 2: GHL por el Gateway (solo nota; no se marca Contactado en una lista sin campaña) + auditoría nivel 3', r.gw.length === 1 && r.gw[0].body.action === 'act' && r.gw[0].body.act.type === 'add_note' && /SIN campaña/.test(r.gw[0].body.act.note) && r.gw[0].body.targets[0].company_name === 'Empresa Prueba SpA' && r.writes.some((w) => w.path === 'operator_audit_log' && w.body.level === 3 && w.body.tool === 'linkedin_approve'), JSON.stringify(r.gw));
r = await call({ action: 'approve', target: 'prueba.cl', confirmation_code: code1, order_text: 'Sí, confirmo el alta' }, { ...fxTest, cands: [CAND({ channel_state: stored })], waImport: ok200({ result: [{ importCode: 'duplicated_prospect', message: 'ya existe', prospect: { _id: 'WX0' } }] }) });
t('approve: duplicado en Waalaxy → queda en lista y lo dice (no crea otro)', r.resp.state === 'en_lista' && /Ya existía/.test(r.resp.message));
r = await call({ action: 'approve', target: 'prueba.cl', confirmation_code: code1, order_text: 'Sí, confirmo el alta' }, { ...fxTest, cands: [CAND({ channel_state: stored })], waImport: { statusCode: 401, body: { code: 'M000401-001' } } });
t('approve: error de Waalaxy (plan/permisos) → estado error visible y mensaje útil', r.resp.state === 'error' && r.resp.ok === false && /permisos/.test(r.resp.message) && r.writes.some((w) => w.body.channel_state && w.body.channel_state.linkedin.state === 'error'));
r = await call({ action: 'approve', target: 'prueba.cl' }, { ...fxTest, msgs: [{ candidate_id: 'k1', status: 'sent' }] });
t('approve con correo ya enviado/aprobado: bloquea el segundo canal', r.resp.error === 'canal_email_activo' && !r.importCalled);
r = await call({ action: 'approve', target: 'prueba.cl' }, { ...fxTest, cands: [CAND({ canonical: { company_name: 'X', contact: { name: 'Pedro Soto', role: 'Gerente', linkedin: 'https://www.linkedin.com/in/pedro-soto', linkedin_source_url: 'x' } } })] });
t('approve (test) con un perfil fuera de la lista blanca: rechaza', r.resp.error === 'fuera_de_allowlist' && !r.importCalled);

// ---------- eventos manuales (Waalaxy no los reporta por API)
const inCamp = CAND({ channel_state: { approved_channel: 'linkedin', linkedin: { state: 'en_campana', person: 'Daniel Colodro Ebner', role: 'Gerente', events: [] } } });
r = await call({ action: 'event', target: 'prueba.cl', event: 'respondio', note: 'Me interesa, ¿hablamos?' }, FIX({ cands: [inCamp] }));
t('event respondió: estado, mueve a Respondió por el Gateway, detiene seguimientos y audita', r.resp.state === 'respondio' && r.resp.stop_followups === true && r.gw[0].body.act.type === 'move_stage' && r.gw[0].body.act.stage === 'respondio' && r.writes.find((w) => w.path === 'prospect_candidates?id=eq.k1').body.ghl_stage === 'respondio' && r.writes.some((w) => w.path === 'operator_audit_log'), JSON.stringify(r.resp));
r = await call({ action: 'event', target: 'prueba.cl', event: 'conexion_aceptada' }, FIX({ cands: [inCamp] }));
t('event conexión aceptada: solo nota y estado (no detiene nada)', r.resp.state === 'conexion' && !r.resp.stop_followups && r.gw[0].body.act.type === 'add_note');
r = await call({ action: 'event', target: 'prueba.cl', event: 'respondio', note: 'x y' }, FIX({ cands: [CAND()] })); t('event sobre un prospecto que no está en LinkedIn → error', r.resp.error === 'no_esta_en_linkedin');

// ---------- config y Waalaxy de solo lectura
r = await call({ action: 'set_config', config: { linkedin_mode: 'live' } });
t('set_config: no permite live sin lista de producción', r.resp.error === 'live_sin_lista' && r.writes.length === 0);
r = await call({ action: 'set_config', config: { linkedin_mode: 'test', linkedin_daily_cap: 3, linkedin_test_allowlist: [URL1, 'https://evil.com/x', 'https://www.linkedin.com/company/y'], mode: 'live', send_allowlist: ['x@y.cl'] } });
const cw = r.writes.find((w) => w.path === 'outreach_config?id=eq.1');
t('set_config: solo campos de LinkedIn (no toca el modo de correo), normaliza la lista blanca y audita', r.resp.status === 'config_updated' && cw.body.linkedin_mode === 'test' && cw.body.linkedin_daily_cap === 3 && cw.body.linkedin_test_allowlist.length === 1 && !('mode' in cw.body) && !('send_allowlist' in cw.body) && r.writes.some((w) => w.path === 'operator_audit_log'), JSON.stringify(cw && cw.body));
r = await call({ action: 'lists' }, FIX({ wa: { lists: ok200([{ _id: 'L1', name: 'Atacama OS — Prueba', totalProspects: 1 }]), campaigns: ok200({ total: 1, campaigns: [{ _id: 'C1', name: 'Campaña X', status: 'paused' }] }) } }));
t('lists: devuelve listas y campañas de Waalaxy (solo lectura, sin escribir)', r.resp.ok && r.resp.lists[0].id === 'L1' && r.resp.campaigns[0].id === 'C1' && r.writes.length === 0 && !r.importCalled);
r = await call({ action: 'test' }, FIX({ wa: { test: ok200({ ok: true }) } })); t('test: credencial válida', r.resp.ok === true);
r = await call({ action: 'test' }, FIX({ wa: { test: { statusCode: 401, body: {} } } })); t('test: credencial inválida se informa', r.resp.ok === false && /no responde/.test(r.resp.message));
r = await call({ action: 'approve', target: 'prueba.cl' }, { ...fxTest, writeStatus: 500 });
t('si Supabase falla al guardar, la respuesta lo informa', /Supabase HTTP 500/.test(r.resp.persist_error || ''));
r = await call({ action: 'status', target: 'prueba.cl' }); t('toda respuesta declara que no se envió ningún mensaje', r.resp.safety.messages_sent === 0);
console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
