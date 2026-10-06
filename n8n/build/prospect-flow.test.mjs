// node n8n/build/prospect-flow.test.mjs
import { build08 } from './atacama-os-workflows.mjs';
import { buildProspectSearch, buildProspectAdmit, CRM, PACKS, DAILY_SEARCH_CAP } from './prospect-flow.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const wf = buildProspectAdmit('real');
const node = (n, w = wf) => w.nodes.find((x) => x.name === n);
const js = (n, w = wf) => node(n, w).parameters.jsCode;
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- fixtures
const ev = (factor, level, certainty) => ({ account_id: 'a1', research_type: 'factor:' + factor, finding: 'Hallazgo de ' + factor + ' suficientemente largo', evidence_text: factor === 'pain' ? 'Agenda tu hora por WhatsApp y te respondemos' : 'cita literal de ' + factor, source_url: 'https://empresa-demo.cl/' + factor, source_date: null, raw_metadata: { level, certainty } });
const prospect = { id: 'p1', account_id: 'a1', classification: 'hot', crm_candidate: true, final_score: 85, status: 'new', ghl_opportunity_id: null, ghl_contact_id: null, pain_verified: true, prospect_key: 'account:a1', metadata: { factors: { pain: { points: 20, weight: 20 } } } };
const account = { id: 'a1', name: 'Empresa Demo SpA', domain: 'empresa-demo.cl', website: 'https://empresa-demo.cl', city: 'Antofagasta', metadata: { hermes: { vertical: 'Salud', signal: 's', pain: 'p', fit: 'f', offer: 'un agente que agenda y confirma las horas por WhatsApp', why_now: 'Publicaron hoy una vacante de recepcionista para atender WhatsApp', commercial_angle: 'Liberar a recepción de agendar manualmente las horas del día' } } };
const contact = { id: 'c1', account_id: 'a1', name: 'Ana Pérez', job_title: 'Gerente', email: 'ana@empresa-demo.cl', phone: '+56911112222', source_url: 'https://empresa-demo.cl/contacto', metadata: { public: true } };
const research = [ev('pain', 2, 'observed'), ev('fit', 2, 'observed'), ev('automation', 2, 'observed')];
const runPlan = (over = {}) => {
  const data = { 'Fetch Candidates': { statusCode: 200, body: [over.prospect || prospect] }, 'Fetch Accounts': { statusCode: 200, body: [over.account || account] }, 'Fetch Contacts': { statusCode: 200, body: over.contacts || [contact] }, 'Fetch Research': { statusCode: 200, body: over.research || research }, 'Fetch Drafts': { statusCode: 200, body: over.drafts || [] } };
  const $ = (n) => ({ first: () => ({ json: data[n] }) });
  return new Function('$', js('Plan'))($);
};

// ---------- Plan
let out = runPlan();
t('Plan: prospecto completo => ok con cargas de GHL, borrador y nota', out.length === 1 && out[0].json.ok && out[0].json.payloads.opportunity.pipelineStageId === CRM.stageId && out[0].json.payloads.note.includes('NO ENVIADO') && out[0].json.draft.lint.length === 0, JSON.stringify(out[0] && out[0].json.reasons));
t('Plan: busca duplicados por dominio del correo corporativo', out[0].json.search_q === 'empresa-demo.cl');
out = runPlan({ contacts: [{ ...contact, email: 'dueno@gmail.com' }] });
t('Plan: correo gratuito => busca por el correo completo', out[0].json.search_q === 'dueno@gmail.com');
out = runPlan({ prospect: { ...prospect, final_score: 79 } });
t('Plan: score 79 => no pasa, queda en Supabase con el motivo (held_patch) y sin cargas a GHL', !out[0].json.ok && out[0].json.reasons.includes('score_bajo_80') && out[0].json.held_patch.metadata.admission.status === 'held' && !out[0].json.payloads);
out = runPlan({ research: [ev('pain', 1, 'unverified'), ev('fit', 2, 'observed'), ev('automation', 2, 'observed')] });
t('Plan: cita del dolor no verificada => no pasa aunque el score diga 85', !out[0].json.ok && out[0].json.reasons.includes('sin_evidencia_literal_del_dolor'));
out = runPlan({ drafts: [{ id: 'd1', prospect_id: 'p1', status: 'draft' }] });
t('Plan: ya tiene borrador => no se duplica', out[0].json.has_draft === true);
out = runPlan({ prospect: { ...prospect, ghl_contact_id: 'ghlc1' } });
t('Plan: reintento con contacto ya creado => resume_contact_id (no crea otro)', out[0].json.resume_contact_id === 'ghlc1');
t('Plan: si Supabase falla, lanza error (no asume vacío)', (() => { try { new Function('$', js('Plan'))((n) => ({ first: () => ({ json: { statusCode: 500, body: {} } }) })); return false; } catch { return true; } })());
t('Plan: sin candidatos devuelve lista vacía', runPlan().length === 1 && (() => { const data = { 'Fetch Candidates': { statusCode: 200, body: [] }, 'Fetch Accounts': { statusCode: 200, body: [] }, 'Fetch Contacts': { statusCode: 200, body: [] }, 'Fetch Research': { statusCode: 200, body: [] }, 'Fetch Drafts': { statusCode: 200, body: [] } }; return new Function('$', js('Plan'))((n) => ({ first: () => ({ json: data[n] }) })).length === 0; })());

// ---------- Dup Check / Contact Result / Opp Decision / Save Result
const planItem = runPlan()[0].json;
const itemStub = (map) => (n) => ({ item: { json: map[n] } });
const dup = (res) => new Function('$', '$json', js('Dup Check'))(itemStub({ Plan: planItem }), res).json;
t('Dup Check: sin coincidencias => proceed', dup({ statusCode: 200, body: { contacts: [] } }).proceed === true);
t('Dup Check: contacto existente con el mismo dominio => se deja en revisión y NO se toca', (() => { const d = dup({ statusCode: 200, body: { contacts: [{ id: 'old1', email: 'otra@empresa-demo.cl' }] } }); return d.proceed === false && d.held_patch.metadata.admission.reasons[0] === 'ya_existe_en_ghl' && d.held_patch.metadata.admission.existing_contact_id === 'old1'; })());
t('Dup Check: si GHL no responde => falla cerrado (no crea nada)', dup({ statusCode: 500, body: {} }).proceed === false);
const cr = (res) => new Function('$', '$json', js('Contact Result'))(itemStub({ Plan: planItem }), res).json;
t('Contact Result: creado', cr({ statusCode: 201, body: { contact: { id: 'ghlc9' } } }).created === true && cr({ statusCode: 201, body: { contact: { id: 'ghlc9' } } }).contact_id === 'ghlc9');
t('Contact Result: GHL rechaza por duplicado (meta.contactId) => held, sin modificar al existente', (() => { const r = cr({ statusCode: 400, body: { message: 'duplicated contacts', meta: { contactId: 'ex1' } } }); return r.created === false && r.held_patch.metadata.admission.existing_contact_id === 'ex1'; })());
t('Contact Result: otro error => held con motivo', cr({ statusCode: 422, body: { message: 'bad' } }).held_patch.metadata.admission.reasons[0].startsWith('error_al_crear_contacto'));
const opp = (searchRes, cid = 'ghlc9', which = 'Resolve New') => new Function('$', '$json', js('Opp Decision'))(itemStub({ Plan: planItem, [which]: { contact_id: cid } }), searchRes).json;
t('Opp Decision: sin oportunidades => crear con contactId', (() => { const d = opp({ statusCode: 200, body: { opportunities: [] } }); return d.exists === false && d.opp_body.contactId === 'ghlc9' && d.opp_body.pipelineStageId === CRM.stageId; })());
t('Opp Decision: el id del contacto sale de Resolve (reintento: Resolve Resume), no de la respuesta de búsqueda', opp({ statusCode: 200, body: { opportunities: [] } }, 'ghlcR', 'Resolve Resume').contact_id === 'ghlcR' && opp({ statusCode: 200, body: { opportunities: [] } }).opp_body.contactId === 'ghlc9');
t('Opp Decision: sin id de contacto => error (nunca crea una oportunidad huérfana)', (() => { try { new Function('$', '$json', js('Opp Decision'))(itemStub({ Plan: planItem }), { statusCode: 200, body: { opportunities: [] } }); return false; } catch (e) { return /Sin id de contacto/.test(e.message); } })());
t('Opp Decision: ya existe una con el mismo Prospect Key => no crear otra', opp({ statusCode: 200, body: { opportunities: [{ id: 'o1', name: 'x', customFields: [{ id: CRM.fields.prospect_key, fieldValueString: 'account:a1' }] }] } }).exists === true);
t('Opp Decision: ya existe una con el mismo nombre => no crear otra', opp({ statusCode: 200, body: { opportunities: [{ id: 'o2', name: 'Empresa Demo SpA — Prospecto', customFields: [] }] } }).existing_opportunity_id === 'o2');
const save = (oppRes) => new Function('$', '$json', js('Save Result'))(itemStub({ Plan: planItem, 'Opp Decision': { contact_id: 'ghlc9' } }), oppRes).json;
t('Save Result: guarda ids, deja status new (NO ready_to_contact ni contacted) y arma el borrador sin enviar', (() => { const s = save({ statusCode: 201, body: { opportunity: { id: 'opp9' } } }); return s.patch.ghl_opportunity_id === 'opp9' && s.patch.ghl_contact_id === 'ghlc9' && s.patch.status === undefined && s.draft_row.status === 'draft' && s.draft_row.metadata.never_sent === true && s.draft_row.channel === 'email' && s.needs_draft === true; })());
t('Save Result: si GHL no devolvió id de oportunidad lanza error', (() => { try { save({ statusCode: 422, body: { message: 'x' } }); return false; } catch { return true; } })());
t('18: no crea una tarea propia (ya la crea la automatización nativa de GHL al entrar en Investigado; evita duplicados)', !wf.nodes.some((n) => /tasks/.test(JSON.stringify(n.parameters))) && save({ statusCode: 201, body: { opportunity: { id: 'opp9' } } }).task === undefined);
t('Finalize: registra si la nota y la tarea se crearon (sin romper si fallan)', (() => { const sr = save({ statusCode: 201, body: { opportunity: { id: 'opp9' } } }); const f = new Function('$', '$input', js('Finalize Body'))(itemStub({ Plan: planItem, 'Save Result': sr, 'Add Note': { statusCode: 403 } }), { item: { json: { statusCode: 201 } } }).json; return f.patch.metadata.admission.note_created === false && f.patch.metadata.admission.note_http === 403 && f.patch.metadata.admission.status === 'in_ghl'; })());
t('18: el prospecto se guarda ANTES de la nota/tarea (si estas fallan no se pierde el vínculo con GHL)', (() => { const c = wf.connections; return c['Create Opportunity'].main[0][0].node === 'Save Result' && c['Save Result'].main[0][0].node === 'Patch Prospect' && c['Patch Prospect'].main[0][0].node === 'Insert Draft' && c['Insert Draft'].main[0][0].node === 'Add Note'; })());
t('18: sin candidatos responde ok con admitted 0 (no 500)', node('No Work').parameters.jsCode.includes('admitted: 0') && wf.connections['Any Candidates?'].main[1][0].node === 'No Work');
t('18: el borrador solo se inserta si hace falta (sin duplicar)', /needs_draft \? JSON.stringify\(.*\) : "\[\]"/.test(node('Insert Draft').parameters.jsonBody));

// ---------- Estructura
const names = new Set(wf.nodes.map((n) => n.name));
t('18: todas las conexiones apuntan a nodos existentes', Object.entries(wf.connections).every(([k, v]) => names.has(k) && v.main.every((o) => o.every((c) => names.has(c.node)))));
const ghlNodes = wf.nodes.filter((n) => /leadconnectorhq/.test(JSON.stringify(n.parameters)));
t('18: escrituras a GHL limitadas a crear contacto, oportunidad y nota (nada de PUT/DELETE/PATCH ni de envío)', ghlNodes.filter((n) => n.parameters.method !== 'GET').every((n) => n.parameters.method === 'POST' && (/\/contacts\/$/.test(n.parameters.url) || /\/opportunities\/$/.test(n.parameters.url) || /\/notes/.test(n.parameters.url))), ghlNodes.map((n) => n.parameters.method + ' ' + n.parameters.url).join(' | '));
t('18: no usa contacts/upsert (que podría modificar un contacto real existente)', !JSON.stringify(wf).includes('/contacts/upsert'));
t('18: la oportunidad entra en Investigado, nunca en Contactado ni en Nuevo', CRM.stageId === '2216d3ae-d153-4446-bc3b-77d0a240e415' && !JSON.stringify(wf).includes('b947fae7-0941-4296-a76b-e9a826dd47d0'));
t('18: no hay nodos de envío (Gmail, WhatsApp, correo)', !wf.nodes.some((n) => /gmail|emailSend|whatsapp|telegram/i.test(n.type)));
t('18: solo toma prospectos hot + crm_candidate + status new + score ≥ 80 + sin oportunidad, y limita a 10', /classification=eq\.hot&crm_candidate=eq\.true&status=eq\.new&ghl_opportunity_id=is\.null&final_score=gte\.80/.test(js('Init')) && /Math\.min\(.*10\)/.test(js('Init')));
t('18: pack incorrecto => error (SEGURIDAD)', (() => { try { new Function('$input', js('Init'))({ first: () => ({ json: { body: { icp_pack_id: 'otro' } } }) }); return false; } catch (e) { return /SEGURIDAD/.test(e.message); } })());
t('18: Init con account_ids filtra solo esas cuentas y descarta ids inválidos', (() => { const r = new Function('$input', js('Init'))({ first: () => ({ json: { account_ids: ['6f1c2a00-0000-4000-8000-000000000001', 'x;drop'] } }) })[0].json; return r.url.includes('account_id=in.(6f1c2a00-0000-4000-8000-000000000001)') && !r.url.includes('drop'); })());
t('18: modo test usa el pack de pruebas y otra ruta', buildProspectAdmit('test').nodes[0].parameters.path.endsWith('-test') && js('Init', buildProspectAdmit('test')).includes(PACKS.test.id) && js('Init').includes(PACKS.real.id));
t('18: sin secretos embebidos', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8})/.test(JSON.stringify(wf)));
t('18: nombre de credenciales correctas (GHL — Atacama OS, Supabase, Ingest Key)', wf.nodes.some((n) => n.credentials && n.credentials.httpHeaderAuth && n.credentials.httpHeaderAuth.id === '4Vc6nfxyKjZ14Bep') && wf.nodes.some((n) => n.credentials && n.credentials.supabaseApi));

// ---------- 17 búsqueda
const s17 = buildProspectSearch();
const guard = (body, sd = {}) => new Function('$', '$getWorkflowStaticData', js('Search Guard', s17))((n) => ({ first: () => ({ json: { body } }) }), () => sd)[0].json;
t('17: webhook autenticado y la clave de Exa solo vive en la credencial de n8n', s17.nodes[0].parameters.authentication === 'headerAuth' && !!s17.nodes[2].credentials.httpHeaderAuth && !/x-api-key/i.test(JSON.stringify(s17)));
t('17: limita resultados a 8 y valida la consulta', guard({ query: 'clínica dental Antofagasta', num_results: 50 }).exa.numResults === 8 && (() => { try { guard({ query: 'ab' }); return false; } catch { return true; } })());
t('17: tope diario de búsquedas', (() => { const sd = {}; for (let i = 0; i < DAILY_SEARCH_CAP; i++) guard({ query: 'consulta valida ' + i }, sd); try { guard({ query: 'una más' }, sd); return false; } catch (e) { return /Tope diario/.test(e.message); } })());
t('17: filtra dominios inválidos y acepta include/exclude', (() => { const g = guard({ query: 'empresas de servicios Calama', include_domains: ['https://www.empresa.cl/x', 'no es dominio'], exclude_domains: ['facebook.com'] }); return g.exa.includeDomains[0] === 'empresa.cl' && g.exa.includeDomains.length === 1 && g.exa.excludeDomains[0] === 'facebook.com'; })());
t('17: respuesta compacta con texto citable', (() => { const r = new Function('$', '$json', js('Shape', s17))((n) => ({ first: () => ({ json: { exa: { query: 'q' }, searches_today: 3, cap: 80 } }) }), { statusCode: 200, body: { results: [{ url: 'https://a.cl', title: 'T', text: 'x'.repeat(5000), highlights: ['h1', 'h2', 'h3'] }] } })[0].json; return r.results[0].text.length === 1500 && r.results[0].highlights.length === 2 && r.count === 1; })());
t('17: error de Exa => lanza error claro', (() => { try { new Function('$', '$json', js('Shape', s17))((n) => ({ first: () => ({ json: { exa: { query: 'q' } } }) }), { statusCode: 401, body: { error: 'x' } }); return false; } catch (e) { return /Exa respondió/.test(e.message); } })());

// ---------- 08: contrato Hermes v2 (gate)
const w08 = build08({ mode: 'real', qualWorkflowId: 'Q', admitWorkflowId: 'A', ingestKeyCredId: 'I' });
const gate = (prospects) => new Function('$input', w08.nodes.find((n) => n.name === 'Validate and Gate').parameters.jsCode)({ first: () => ({ json: { body: { icp_pack_id: PACKS.real.id, batch_id: 'hermes-test-1', prospects } } }) }).map((x) => x.json.item);
const rawP = (o = {}) => ({ company: 'Empresa Demo', domain: 'empresa-demo.cl', city: 'Antofagasta', vertical: 'Salud', signal: 'Agenda por WhatsApp', pain: 'Responden a mano', fit: 'Atiende por WhatsApp', offer: 'un agente que agenda', why_now: 'Publicaron hoy una vacante de recepcionista para WhatsApp', commercial_angle: 'Liberar a recepción de agendar a mano las horas', confidence: 0.8, source: 'search',
  contact: { name: 'Ana', job_title: 'Gerente', email: 'ana@empresa-demo.cl', public: true, source_url: 'https://empresa-demo.cl/contacto', channel: 'email' },
  evidence: [{ factor: 'pain', level: 2, url: 'https://empresa-demo.cl/a', quote: 'Agenda tu hora por WhatsApp y te respondemos', finding: 'Reciben solicitudes por WhatsApp manual', certainty: 'observed' }, { factor: 'fit', level: 2, url: 'https://empresa-demo.cl/b', quote: 'Atendemos por WhatsApp de lunes a viernes', finding: 'Atienden por WhatsApp en horario', certainty: 'observed' }], ...o });
let g = gate([rawP()])[0];
t('08 gate v2: prospecto completo aceptado con campos nuevos en metadata.hermes', g.verdict === 'accepted' && g.account.metadata.hermes.why_now.startsWith('Publicaron') && g.account.metadata.hermes.commercial_angle.startsWith('Liberar') && g.account.metadata.hermes.confidence === 0.8 && g.account.metadata.hermes.contact_channel === 'email' && g.account.metadata.hermes.contract === 'prospect-radar-v2', JSON.stringify(g.reasons));
g = gate([rawP({ why_now: undefined, reason: 'Razón específica de más de veinte caracteres' })])[0];
t('08 gate v2: «reason» del contrato anterior sigue valiendo', g.verdict === 'accepted' && g.account.metadata.hermes.why_now.startsWith('Razón'));
g = gate([rawP({ why_now: 'corto', reason: undefined })])[0];
t('08 gate v2: sin motivo específico se rechaza', g.verdict === 'rejected' && g.reasons.includes('missing_specific_reason'));
g = gate([rawP({ evidence: [], evidence_url: 'https://empresa-demo.cl/a', evidence_quote: 'Agenda tu hora por WhatsApp y te respondemos', evidence_summary: 'Reciben solicitudes por WhatsApp' })])[0];
t('08 gate v2: evidencia plana (evidence_url + evidence_quote) cuenta como evidencia del dolor, pero falta el encaje', g.verdict === 'rejected' && g.reasons.includes('missing_fit_evidence') && !g.reasons.includes('missing_pain_evidence'), JSON.stringify(g.reasons));
g = gate([rawP({ contact: { email: 'ana@empresa-demo.cl', public: false, source_url: 'https://empresa-demo.cl/c' } })])[0];
t('08 gate v2: contacto no declarado público se rechaza', g.verdict === 'rejected' && g.reasons.includes('contact_not_declared_public'));
g = gate([rawP({ domain: 'facebook.com' })])[0];
t('08 gate v2: redes sociales no cuentan como sitio de la empresa', g.verdict === 'rejected' && g.reasons.includes('domain_is_not_company_site'));
t('08 encadena 18 tras 03 y la respuesta incluye la admisión', w08.connections['Run 03 Qualification'].main[0][0].node === 'Run 18 Admit' && w08.nodes.some((n) => n.name === 'Fetch Admission'));
t('08 sin envío: ningún nodo de envío ni de GHL directo', !w08.nodes.some((n) => /gmail|emailSend|telegram/i.test(n.type)) && !JSON.stringify(w08).includes('leadconnectorhq'));

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
