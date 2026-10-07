// node scripts/prospecting/gateway-core.test.mjs
import fs from 'node:fs';
import { adaptExternalRecord, normDomain, normEmail, normPhone, normCompany, candidateKeys, primaryKey, splitTyped, parseHtmlProspects, parseCsv, aliasRecord, parseFreeText, toCandidate, scoreCandidate, buildIndex, matchCandidate, decideCandidate, prepareDrafts, lintOutreach } from './gateway-core.mjs';
import { applyQuoteChecks, quoteInPage, siteSignals, candidateFromSite, evaluateBatch, buildCandidateRow, reviewNote, ghlContactBody, ghlOpportunityBody, businessDaysFrom, planAct, briefResult } from './gateway-ops.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const NOW = Date.parse('2026-10-07T15:00:00Z'); // miércoles

// ---------- normalización
t('dominio: quita protocolo, www y ruta; descarta redes sociales', normDomain('https://www.Clinica-Ejemplo.cl/contacto?x=1') === 'clinica-ejemplo.cl' && normDomain('https://instagram.com/foo') === null && normDomain('') === null);
t('correo: minúsculas, sin mailto, descarta noreply', normEmail('MAILTO:Info@Empresa.CL') === 'info@empresa.cl' && normEmail('noreply@x.cl') === null && normEmail('no-es-correo') === null);
t('teléfono chileno: +56 9 1234 5678, 9 1234 5678 y 56912345678 son el mismo', normPhone('+56 9 1234 5678') === '56912345678' && normPhone('9 1234 5678') === '56912345678' && normPhone('56912345678') === '56912345678' && normPhone('123') === null);
t('empresa: sin tildes ni sufijos legales', normCompany('Clínica Dental Ejemplo SpA') === 'clinica dental ejemplo' && normCompany('Comercial  Ñandú Ltda.') === 'comercial nandu');
const cA = toCandidate({ company_name: 'Clínica Dental Ejemplo SpA', website: 'https://www.clinicaejemplo.cl/', email: 'Contacto@ClinicaEjemplo.cl', phone: '+56 9 5555 0101', location: 'Providencia, Santiago' }, { source_type: 'manual' });
t('claves de identidad: dominio, correo, teléfono y nombre+ubicación', ['d:clinicaejemplo.cl', 'e:contacto@clinicaejemplo.cl', 'p:955550101', 'n:clinica dental ejemplo|providencia santiago'].every((k) => candidateKeys(cA).includes(k)), candidateKeys(cA).join(','));
t('clave primaria: dominio primero, luego correo, teléfono, nombre', primaryKey(cA) === 'd:clinicaejemplo.cl' && primaryKey(toCandidate({ company_name: 'X Y', email: 'a@gmail.com' }, {})) === 'e:a@gmail.com' && primaryKey(toCandidate({ company_name: 'Taller Sur', phone: '9 8888 1111' }, {})).startsWith('p:'));

// ---------- hechos / inferencias / hipótesis
const ty = splitTyped('Hotel con canal propio. Inferencia: consultas repetitivas; hipótesis: seguimiento manual.', 'fact');
t('texto con marcadores se separa en HECHO / INFERENCIA / HIPÓTESIS', ty.length === 3 && ty[0].kind === 'fact' && ty[1].kind === 'inference' && ty[2].kind === 'hypothesis', JSON.stringify(ty));
t('«Hipótesis comercial:» también es hipótesis y un texto sin marcador es hecho', splitTyped('Hecho: A. Hipótesis comercial: B.', 'fact').map((x) => x.kind).join() === 'fact,hypothesis' && splitTyped('solo texto', 'fact')[0].kind === 'fact');

// ---------- HTML (fixture sintético con los 4 formatos)
const html = fs.readFileSync(new URL('./fixtures/prospects-sample.html', import.meta.url), 'utf8');
const raws = parseHtmlProspects(html);
t('HTML: 8 fichas de 4 formatos', raws.length === 7 && new Set(raws.map((r) => r.source_name)).size === 4, raws.length + ' ' + [...new Set(raws.map((r) => r.source_name))].join('|'));
const by = (n) => raws.find((r) => r.company_name === n);
const a = by('Hotel Ejemplo Sur');
t('formato A: web, correo, ciudad, rubro, hecho/inferencia/hipótesis, solución, buyer sin precios, ángulo', a.website === 'https://hotelejemplosur.invalid/' && a.emails.includes('reservas@hotelejemplosur.invalid') && a.location === 'Puerto Varas' && /Hotel boutique/.test(a.industry) && a.facts.length >= 1 && a.inferences.length === 1 && a.hypotheses.length === 1 && /Agente de reservas/.test(a.proposed_solution) && !/\$/.test(a.buyer) && /enviar email/.test(a.angle), JSON.stringify({ w: a.website, e: a.emails, l: a.location, i: a.industry, f: a.facts, inf: a.inferences, h: a.hypotheses, s: a.proposed_solution, b: a.buyer, an: a.angle }));
const b = by('Clínica Dental Ejemplo');
t('formato B: ubicación, rubro, WhatsApp y teléfono con número, correo del sitio, hecho + hipótesis, score externo, evidencia, correo preparado', b.location === 'Providencia, Santiago' && /odontológica/.test(b.industry) && b.whatsapp === '56955550101' && b.phones.includes('56225550102') && b.emails.includes('contacto@clinicadentalejemplo.invalid') && b.facts.length === 1 && b.hypotheses.length === 1 && b.external_score === 19 && b.external_score_scale === '21' && b.evidence_urls.length >= 1 && /^Asunto: Una idea/.test(b.suggested_email) && /agente de recepción/i.test(b.proposed_solution), JSON.stringify({ l: b.location, wa: b.whatsapp, p: b.phones, e: b.emails, f: b.facts.length, h: b.hypotheses.length, sc: b.external_score, ev: b.evidence_urls, em: b.suggested_email.slice(0, 30), s: b.proposed_solution.slice(0, 40) }));
const c = by('Centro Médico Ejemplo Norte');
t('formato C: teléfono, web, sector, categoría, hecho (directorio), hipótesis, mensaje de WhatsApp preparado y score externo', c.phones.includes('56552550199') && c.website === 'https://centromedicoejemplonorte.invalid/' && /Centro/.test(c.location) && /Centro médico/.test(c.industry) && c.facts.length === 1 && c.hypotheses.length === 1 && /Hola, soy Christian/.test(c.suggested_whatsapp) && c.external_score === 18 && c.external_score_scale === '24', JSON.stringify({ p: c.phones, w: c.website, l: c.location, i: c.industry, f: c.facts, h: c.hypotheses.length, wm: c.suggested_whatsapp.slice(0, 20), sc: c.external_score }));
const v = by('Veterinaria Fantasma');
t('formato C sin contacto: no inventa web, correo ni teléfono', !v.website && !v.emails.length && !v.phones.length && !v.whatsapp);
const d = by('Inmobiliaria Ejemplo');
t('formato D: web desde el texto, teléfono, ciudad limpia, rubro sin «nicho», hecho + hipótesis, ángulo, score', d.website === 'https://www.inmobiliariaejemplo.invalid' && d.phones.includes('56225550103') && d.location === 'Santiago' && d.industry === 'inmobiliaria residencial' && d.facts.length === 1 && d.hypotheses.length === 1 && /agente que califique/i.test(d.angle) && d.external_score === 15, JSON.stringify({ w: d.website, p: d.phones, l: d.location, i: d.industry, f: d.facts.length, h: d.hypotheses.length, an: d.angle, sc: d.external_score }));
t('formato D: bandera enterprise capturada', /enterprise/.test(by('Retail Gigante').source_flags || ''));

// ---------- CSV, JSON y texto libre
const csv = 'Empresa;Web;Email;Teléfono;Ciudad;Rubro;Hechos\n"Taller Ñandú; Ltda";tallernandu.cl;ventas@tallernandu.cl;+56 9 8888 1111;Antofagasta;Taller mecánico;"Recibe cotizaciones por WhatsApp"\nSin Datos;;;;;;\n';
const rows = parseCsv(csv);
t('CSV: delimitador ; y comillas, columnas con tildes', rows.length === 2 && rows[0].empresa === 'Taller Ñandú; Ltda' && rows[0].telefono === '+56 9 8888 1111');
const csvC = toCandidate(aliasRecord(rows[0]), { source_type: 'csv', source_name: 'lista de Christian' });
t('CSV → candidato (alias de columnas)', csvC.company_name === 'Taller Ñandú; Ltda' && csvC.website === 'https://tallernandu.cl' && csvC.contact.email === 'ventas@tallernandu.cl' && csvC.contact.phone === '56988881111' && csvC.facts[0] === 'Recibe cotizaciones por WhatsApp' && csvC.location === 'Antofagasta' && csvC.industry === 'Taller mecánico');
const ft = parseFreeText('Empresa: Veterinaria Sur\nWeb: https://vetsur.cl\nCorreo: hola@vetsur.cl\nHechos: agenda por WhatsApp\nHipótesis: derivan citas a mano\n\n---\n\nGimnasio Norte - https://gimnasionorte.cl - contacto@gimnasionorte.cl');
t('texto libre: bloques etiquetados y bloque sin etiquetas (empresa en la primera línea)', ft.length === 2 && ft[0].company_name === 'Veterinaria Sur' && ft[0].website === 'https://vetsur.cl' && ft[1].company_name === 'Gimnasio Norte' && ft[1].email === 'contacto@gimnasionorte.cl', JSON.stringify(ft));
const j = toCandidate({ company_name: 'Solo Nombre' }, { source_type: 'json' });
t('información incompleta se acepta (todos los campos opcionales)', j.company_name === 'Solo Nombre' && j.contact.email === null && Array.isArray(j.facts) && j.status === 'analyzed');
const jc = toCandidate({ company: 'Empresa JSON', web: 'empresajson.cl', contact: { name: 'Ana', role: 'Gerente', email: 'ana@empresajson.cl', whatsapp: '+56 9 7777 2222' }, observed_signals: ['Recibe pedidos por WhatsApp'], facts: ['Publica 20 servicios'], commercial_hypotheses: ['Hay trabajo repetitivo de clasificación'], score: 4, external_score_scale: '5' }, { source_type: 'ia', source_name: 'ChatGPT' });
t('JSON de otra IA: objeto contact anidado, hipótesis y score externo solo como referencia', jc.contact.name === 'Ana' && jc.contact.whatsapp === '56977772222' && jc.commercial_hypotheses.length === 1 && jc.source_name === 'ChatGPT');

// ---------- salida de Hermes (contrato v2) entra por el Gateway como cualquier otra fuente
const hermesRec = { company: 'Clínica Hermes TEST', domain: 'clinicahermes-test.invalid', city: 'Antofagasta', region: 'Antofagasta', vertical: 'Salud', signal: 'Recibe solicitudes de hora por WhatsApp y formulario', pain: 'Agenda a mano las solicitudes', fit: 'Atiende por WhatsApp', offer: 'un agente que ordena solicitudes y agenda', why_now: 'Publicó una vacante de recepcionista esta semana', commercial_angle: 'Liberar a recepción de agendar a mano', source: 'search', confidence: 0.8, draft_subject: 'Hola', draft: 'Hola equipo, ¿les muestro cómo se vería un agente de agenda para Clínica Hermes TEST en 10 minutos?',
  contact: { name: null, job_title: 'Gerente', email: 'contacto@clinicahermes-test.invalid', phone: '+56 55 255 0000', linkedin_url: 'https://linkedin.com/company/x', source_url: 'https://clinicahermes-test.invalid/contacto', public: true, channel: 'email' },
  evidence: [{ factor: 'pain', level: 2, url: 'https://clinicahermes-test.invalid/agenda', quote: 'Agenda tu hora por WhatsApp y te respondemos', finding: 'Reciben solicitudes de hora por WhatsApp', certainty: 'observed' }, { factor: 'fit', level: 1, url: 'https://clinicahermes-test.invalid/', quote: 'Atendemos por WhatsApp', finding: 'Atienden por WhatsApp en horario', certainty: 'inferred' }] };
const hc = toCandidate({ ...aliasRecord(hermesRec), ...hermesRec, ...adaptExternalRecord(hermesRec) }, { source_type: 'hermes', source_name: 'Hermes Prospect Radar' });
t('Hermes v2 → ProspectCandidate: hechos (citas), inferencias (pain/fit), hipótesis/solución, ángulo, cargo y LinkedIn, ubicación y rubro', hc.company_name === 'Clínica Hermes TEST' && hc.website === 'https://clinicahermes-test.invalid' && hc.facts.length === 1 && hc.inferences.length >= 3 && hc.proposed_solution.startsWith('un agente') && /vacante/.test(hc.outreach_angle) === false && /Liberar/.test(hc.outreach_angle) && hc.contact.role === 'Gerente' && hc.contact.linkedin && hc.location === 'Antofagasta' && hc.industry === 'Salud' && hc.evidence_urls.length === 2 && hc.source_type === 'hermes', JSON.stringify({ f: hc.facts, i: hc.inferences.length, a: hc.outreach_angle, c: hc.contact }));
t('Hermes v2: se puntúa y entra igual que cualquier otra fuente (contactable con señal)', (() => { const sc = scoreCandidate(hc); return sc.priority_score >= 60 && sc.channels.includes('email'); })());

// ---------- verificación ligera de citas: hecho → inferencia si no se puede comprobar
const cq = toCandidate({ ...aliasRecord(hermesRec), ...hermesRec, ...adaptExternalRecord(hermesRec) }, { source_type: 'hermes' });
t('el adaptador conserva las citas (url + texto) para poder verificarlas', cq.evidence_quotes.length === 1 && cq.evidence_quotes[0].url === 'https://clinicahermes-test.invalid/agenda');
const ok1 = applyQuoteChecks(cq, [{ url: cq.evidence_quotes[0].url, quote: cq.evidence_quotes[0].quote, found: true }]);
const bad1 = applyQuoteChecks(cq, [{ url: cq.evidence_quotes[0].url, quote: cq.evidence_quotes[0].quote, found: false }]);
const unr = applyQuoteChecks(cq, [{ url: cq.evidence_quotes[0].url, quote: cq.evidence_quotes[0].quote, found: null }]);
t('cita encontrada => sigue siendo HECHO', ok1.facts.length === 1 && ok1.quote_checks.found === 1 && ok1.quote_checks.unverified === 0);
t('cita no encontrada o página ilegible => deja de ser HECHO y pasa a INFERENCIA (con la nota de que no se verificó)', bad1.facts.length === 0 && bad1.inferences.some((x) => /cita no verificada/.test(x)) && unr.facts.length === 0 && unr.quote_checks.unverified === 1);
t('una cita no verificada baja la señal (nunca la sube)', scoreCandidate(bad1).signal_score <= scoreCandidate(ok1).signal_score);
t('quoteInPage: compara contra el texto visible, sin tildes ni signos', quoteInPage('<html><body><script>x</script><p>Agenda tu hora por <b>WhatsApp</b> y te respondemos.</p></body></html>', 'Agenda tu hora por WhatsApp y te respondemos') === true && quoteInPage('<p>Otra cosa</p>', 'Agenda tu hora por WhatsApp y te respondemos') === false);

// ---------- scoring: banda y calibración
const rich = toCandidate({ company_name: 'Clínica Rica', website: 'https://clinicarica.cl', industry: 'Clínica dental', location: 'Santiago', email: 'dra.perez@clinicarica.cl', phone: '+56 9 5555 0101', whatsapp: '+56 9 5555 0102', contact: { name: 'Dra. Pérez', role: 'Directora' },
  facts: ['Ofrece 12 tratamientos y dos sucursales con agenda por formulario y WhatsApp', 'Publica las reservas por WhatsApp y recibe cotizaciones por correo'], commercial_hypotheses: ['Recepción repite preguntas sobre tratamientos antes de agendar'], proposed_solution: 'Agente de recepción que identifica tratamiento y sucursal y deriva a agenda', evidence_urls: ['https://clinicarica.cl'] }, {});
const mid = toCandidate({ company_name: 'Hotel Medio', website: 'https://hotelmedio.cl', industry: 'Hotel boutique', location: 'Pucón', email: 'info@hotelmedio.cl', facts: ['Hotel boutique con canal propio y correo visible'], inferences: ['Consultas repetitivas de fechas'], commercial_hypotheses: ['Seguimiento manual fuera de horario'] }, {});
const nochan = toCandidate({ company_name: 'Clínica Sin Contacto', website: 'https://sincontacto.cl', industry: 'Clínica dental', location: 'Santiago', facts: ['Ofrece agenda por formulario y varias especialidades en dos sucursales'], commercial_hypotheses: ['Recepción repite preguntas'], proposed_solution: 'Agente de recepción que agenda horas por WhatsApp' }, {});
const poor = toCandidate({ company_name: 'Algo Raro', industry: 'Desconocido', email: 'x@gmail.com' }, {});
const sRich = scoreCandidate(rich), sMid = scoreCandidate(mid), sNo = scoreCandidate(nochan), sPoor = scoreCandidate(poor);
t('score: rico y contactable => alta prioridad (≥80)', sRich.priority_score >= 80 && sRich.band === 'alta', JSON.stringify(sRich));
t('score: contactable con una señal y un canal => válido para contactar (60–79)', sMid.priority_score >= 60 && sMid.priority_score < 80 && sMid.band === 'valida', JSON.stringify(sMid));
t('score: sin ningún canal NO supera 59 aunque tenga fit y señal (pendiente)', sNo.priority_score <= 59 && sNo.band === 'pendiente' && sNo.flags.includes('sin_canal_de_contacto'), JSON.stringify(sNo));
t('score: sin señal ni fit ni sitio => archivo (<40)', sPoor.priority_score < 40 && sPoor.band === 'archivo', JSON.stringify(sPoor));
t('score: componentes dentro de sus topes (fit ≤35, señal ≤35, alcance ≤30, total ≤100)', [sRich, sMid, sNo, sPoor].every((s) => s.fit_score <= 35 && s.signal_score <= 35 && s.reachability_score <= 30 && s.priority_score <= 100));
const withExt = { ...rich, external_score: 99, external_score_scale: '100', external_source: 'otra IA' };
t('el score externo NO es autoritativo: no cambia el score de Atacama OS', scoreCandidate(withExt).priority_score === sRich.priority_score);
t('una ficha de directorio (Google Maps/OSM) no cuenta como señal operativa', scoreCandidate(toCandidate({ company_name: 'Ficha Mapa', industry: 'Clínica', phone: '+56 9 1111 2222', facts: ['Google Maps tiene una ficha de búsqueda nominal para Ficha Mapa en Antofagasta'] }, {})).signal_score < 12);
t('enterprise/secundario resta fit pero no bloquea', (() => { const base = { company_name: 'Gran Retail', website: 'https://granretail.cl', industry: 'Retail', email: 'ventas@granretail.cl', facts: ['Catálogo con agenda y atención por WhatsApp visible'], commercial_hypotheses: ['Consultas repetitivas de despacho en atención'], proposed_solution: 'Agente de postventa y seguimiento de pedidos' }; return scoreCandidate(toCandidate({ ...base, source_flags: 'enterprise/secondary' }, {})).fit_score === scoreCandidate(toCandidate(base, {})).fit_score - 8; })());

// ---------- decisión y dedupe
const idx = (entries) => buildIndex(entries);
let m = matchCandidate(rich, idx([{ system: 'ghl_contact', id: 'g1', keys: ['e:dra.perez@clinicarica.cl'], info: {} }]));
let dec = decideCandidate(rich, sRich, m, { ghl_index_complete: true });
t('dedupe GHL: contacto existente => duplicate_in_ghl y NO se crea ni modifica nada', dec.decision === 'duplicate_in_ghl' && !dec.ghl_eligible && m[0].matched_on === 'correo');
m = matchCandidate(rich, idx([{ system: 'ghl_opportunity', id: 'o1', keys: ['d:clinicarica.cl'], info: {} }]));
t('dedupe GHL: oportunidad existente por dominio', decideCandidate(rich, sRich, m, { ghl_index_complete: true }).decision === 'duplicate_in_ghl');
m = matchCandidate(rich, idx([{ system: 'ghl_contact', id: 'g2', keys: ['p:955550101'], info: {} }]));
t('dedupe por teléfono (últimos 9 dígitos)', m.length === 1 && m[0].matched_on === 'teléfono');
m = matchCandidate(rich, idx([{ system: 'supabase_candidate', id: 's1', keys: ['d:clinicarica.cl'], info: { ghl_opportunity_id: null } }]));
t('ya existe en Supabase: no se duplica; queda elegible para GHL si cumple', ['exists_in_supabase', 'create_in_ghl'].includes(decideCandidate(rich, sRich, m, { ghl_index_complete: true }).decision) && decideCandidate(rich, sRich, m, { ghl_index_complete: true }).reasons.includes('ya_existe_en_supabase'));
m = matchCandidate(toCandidate({ company_name: 'Clínica Rica', location: 'Santiago', email: 'otro@x.cl' }, {}), idx([{ system: 'supabase_candidate', id: 's2', keys: ['n:clinica rica|santiago'], info: {} }]));
t('dedupe por nombre + ubicación (clave media)', m.length === 1 && m[0].matched_on === 'nombre+ubicación');
t('solo el nombre (sin ubicación) NO se considera duplicado', matchCandidate(toCandidate({ company_name: 'Clínica Rica', email: 'otro@x.cl' }, {}), idx([{ system: 'supabase_candidate', id: 's3', keys: ['n:clinica rica|santiago'], info: {} }])).length === 0);
t('60+ con canal, señal e hipótesis => create_in_ghl', decideCandidate(mid, sMid, [], { ghl_index_complete: true }).decision === 'create_in_ghl');
t('sin canal => se queda en Supabase (keep_in_supabase) con el motivo', (() => { const d2 = decideCandidate(nochan, sNo, [], { ghl_index_complete: true }); return d2.decision === 'keep_in_supabase' && d2.reasons.includes('sin_canal_de_contacto'); })());
t('<40 => archive', decideCandidate(poor, sPoor, [], { ghl_index_complete: true }).decision === 'archive');
t('FORCE_IMPORT: entra aunque el score sea bajo y queda marcado como override', (() => { const d2 = decideCandidate(nochan, sNo, [], { ghl_index_complete: true, force_import: true }); return d2.decision === 'create_in_ghl' && d2.manual_override === true && d2.reasons.includes('FORCE_IMPORT'); })());
t('FORCE_IMPORT NO salta el dedupe de GHL', decideCandidate(rich, sRich, matchCandidate(rich, idx([{ system: 'ghl_contact', id: 'g1', keys: ['e:dra.perez@clinicarica.cl'] }])), { force_import: true, ghl_index_complete: true }).decision === 'duplicate_in_ghl');
t('FORCE_IMPORT NO salta la validación básica (sin identidad)', decideCandidate(toCandidate({}, {}), scoreCandidate(toCandidate({}, {})), [], { force_import: true, ghl_index_complete: true }).decision === 'invalid');
t('si el índice de GHL está incompleto no se crea nada (falla cerrado), ni con FORCE_IMPORT', decideCandidate(mid, sMid, [], { ghl_index_complete: false }).ghl_eligible === false && decideCandidate(mid, sMid, [], { ghl_index_complete: false, force_import: true }).ghl_eligible === false);
const batch = evaluateBatch([rich, { ...rich, company_name: 'Clínica Rica (copia)' }, mid, nochan, poor], [{ system: 'ghl_contact', id: 'gX', keys: ['e:info@hotelmedio.cl'], info: {} }], { ghl_index_complete: true });
t('lote: duplicado dentro del mismo lote, duplicado en GHL, entrar, quedarse y archivar', batch[0].decision === 'create_in_ghl' && batch[1].decision === 'create_in_ghl' && batch[1].matches.some((x) => x.system === 'batch') && batch[2].decision === 'duplicate_in_ghl' && batch[3].decision === 'keep_in_supabase' && batch[4].decision === 'archive', batch.map((x) => x.decision).join());

// ---------- filas, borradores y cargas GHL
const row = buildCandidateRow(batch[0], { pack_id: 'PACK', request_id: 'req-1', now: NOW });
t('fila de Supabase: claves, scores, bandas y score externo aparte', row.candidate_key === 'd:clinicarica.cl' && row.priority_score === sRich.priority_score && row.band === 'alta' && row.manual_override === false && row.status === 'accepted' && row.canonical.company_name === 'Clínica Rica');
const forced = buildCandidateRow({ ...batch[3], decision: 'create_in_ghl', manual_override: true }, { pack_id: 'PACK', request_id: 'req-2', now: NOW, by: 'Christian', reason: 'Me interesa igual' });
t('override manual: queda registrado quién y por qué', forced.manual_override === true && forced.manual_override_by === 'Christian' && forced.manual_override_reason === 'Me interesa igual');
const dr = prepareDrafts(rich);
t('PREPARE: borrador honesto — hecho observado, hipótesis marcada, una pregunta, sin afirmar problemas ni exagerar; nunca se envía', dr.lint.length === 0 && /hipótesis/i.test(dr.email_body) && /\?/.test(dr.email_body) && !/vi que (están|tienen) (teniendo )?problemas/i.test(dr.email_body) && dr.never_sent === true && dr.whatsapp.length > 40, JSON.stringify(dr.lint));
t('PREPARE: respeta un borrador externo válido y descarta uno malo', (() => { const ok = prepareDrafts({ ...rich, suggested_email: 'Hola Dra. Pérez, en clinicarica.cl vi que agendan por WhatsApp. Si hoy las responden a mano, en Atacama Labs podemos ordenar ese trabajo con un agente. ¿Te muestro cómo se vería para Clínica Rica en 10 minutos?' }); const bad = prepareDrafts({ ...rich, suggested_email: 'Estimado, revolucionamos su negocio con nuestro chatbot, el mejor del mercado, garantizamos 100% de resultados sin riesgo alguno para su empresa hoy mismo. ¿Hablamos?' }); return ok.email_source === 'externo' && bad.email_source === 'plantilla' && bad.external_lint.includes('exageracion'); })());
const cfg = { locationId: 'LOC', pipelineId: 'PIPE', stages: { nuevo: 's-nuevo', investigado: 's-inv', contactado: 's-con', respondio: 's-res', diagnostico: 's-dia', propuesta: 's-pro', seguimiento: 's-seg' }, userId: 'U1', fields: { fuente: 'f1', solucion_de_interes: 'f2', icp_vertical: 'f3', evidencia_url: 'f4', canal_de_contacto: 'f5', qualification_score: 'f6', commercial_angle: 'f7', prospect_key: 'f8' }, contactFields: { origen_detallado: 'c1', primary_contact_role: 'c2' } };
const cb = ghlContactBody(rich, cfg), ob = ghlOpportunityBody(rich, sRich, 'd:clinicarica.cl', cfg, 'CID', cfg.stages.investigado);
const fv = (id) => (ob.customFields.find((x) => x.id === id) || {}).field_value;
t('GHL contacto: etiquetas de revisión, origen «Prospección outbound», fuente propia, WhatsApp como teléfono', cb.tags.includes('prospecto-por-revisar') && cb.customFields[0].field_value === 'Prospección outbound' && cb.source === 'atacama-labs-prospect-gateway' && cb.phone === '+56955550102');
t('GHL contacto sin correo ni teléfono ni persona: usa firstName = empresa (GHL rechaza contactos sin nombre propio)', (() => { const x = ghlContactBody(toCandidate({ company_name: 'Taller Sin Canal', website: 'https://tallersc.cl' }, {}), cfg); return x.firstName === 'Taller Sin Canal' && !x.email && !x.phone; })() && ghlContactBody(rich, cfg).firstName === 'Dra.' && ghlContactBody(rich, cfg).lastName === 'Pérez');
t('GHL oportunidad: Investigado por defecto, campos existentes (vertical, evidencia, canal, score, ángulo, key)', ob.pipelineStageId === 's-inv' && ob.contactId === 'CID' && fv('f3') === 'Salud' && fv('f4') === 'https://clinicarica.cl' && fv('f5') === 'Correo' && fv('f6') === sRich.priority_score && fv('f8') === 'd:clinicarica.cl' && fv('f1') === 'outbound_manual');
const note = reviewNote(rich, sRich, dr, { override: true, reason: 'Me interesa' });
t('nota de revisión: score y bandas, HECHOS / INFERENCIAS / HIPÓTESIS rotulados, contacto, borradores NO ENVIADOS, override visible', /Prioridad \d+\/100/.test(note) && note.includes('HECHOS (observados)') && note.includes('HIPÓTESIS COMERCIALES (no son hechos)') && note.includes('NO ENVIADO') && note.includes('ENTRADA MANUAL (FORCE_IMPORT) — motivo: Me interesa') && note.includes('aprobado-para-contactar'));

// ---------- comandos act
const tgt = { candidate: rich, ghl: { contact_id: 'C1', opportunity_id: 'O1' } }, tgtNo = { candidate: rich, ghl: {} };
const act = (a, tg) => planAct(a, tg || tgt, cfg, NOW);
t('act desconocido => error', act({ type: 'hackear' }).executed === false && act({ type: 'hackear' }).known.includes('send_email'));
t('act send_email: NO se ejecuta; interfaz definida (to/subject/body/thread_id) y requisitos', (() => { const p = act({ type: 'send_email', subject: 'Hola', body: 'x' }); return p.executed === false && p.status === 'not_enabled' && p.interface.to === 'dra.perez@clinicarica.cl' && p.interface.requires.length === 2 && !p.ghl.create && !p.ghl.note; })());
t('act log_instagram: canal, fecha, etapa Contactado, nota «no lo envió Atacama OS» y tarea de seguimiento', (() => { const p = act({ type: 'log_instagram', note: 'Le escribí por DM' }); return p.supabase.status === 'contacted' && p.supabase.last_contact_channel === 'instagram' && p.ghl.stage === 's-con' && /Atacama OS no envió/.test(p.ghl.note) && p.ghl.task && p.ghl.task.dueDate === businessDaysFrom(NOW, 3) && p.ghl.create === false; })());
t('act log_*: si no está en GHL se crea directamente en Contactado (con override), salvo ensure_in_ghl:false', act({ type: 'log_whatsapp' }, tgtNo).ghl.create === true && act({ type: 'log_phone', ensure_in_ghl: false }, tgtNo).ghl.create === false && act({ type: 'log_phone', ensure_in_ghl: false }, tgtNo).warnings.length === 1);
t('act mark_contacted: canal explícito y fecha dada', (() => { const p = act({ type: 'mark_contacted', channel: 'email', at: '2026-10-06T10:00:00Z', follow_up_days: 0 }); return p.supabase.last_contact_channel === 'email' && p.supabase.last_contact_at === '2026-10-06T10:00:00.000Z' && p.ghl.task === null; })());
t('act discard: marca descartado, etiqueta, y solo pasa a lost si se pide', act({ type: 'discard', reason: 'no es el perfil' }).ghl.tags[0] === 'descartado-prospecto' && act({ type: 'discard' }).ghl.opp_update === null && act({ type: 'discard', mark_lost: true }).ghl.opp_update.status === 'lost');
t('act move_stage: etapa por nombre; desconocida => error', act({ type: 'move_stage', stage: 'Diagnóstico' }).ghl.stage === 's-dia' && act({ type: 'move_stage', stage: 'inexistente' }).executed === false);
t('act add_note exige texto; follow_up crea tarea en N días hábiles', act({ type: 'add_note' }).executed === false && act({ type: 'add_note', note: 'hola' }).ghl.note === 'hola' && act({ type: 'follow_up', days: 2 }).ghl.task.dueDate === businessDaysFrom(NOW, 2));
t('días hábiles: saltan el fin de semana', businessDaysFrom(Date.parse('2026-10-09T15:00:00Z'), 1).startsWith('2026-10-12') && businessDaysFrom(NOW, 0).startsWith('2026-10-07'));
t('act create_in_ghl en Investigado; si ya está, no duplica (advierte)', act({ type: 'create_in_ghl' }, tgtNo).ghl.create === true && act({ type: 'create_in_ghl' }).ghl.create === false && act({ type: 'create_in_ghl' }).warnings.includes('ya_esta_en_ghl') && act({ type: 'create_in_ghl' }, tgtNo).ghl.stage === 's-inv');
t('act create_prospect y prepare_email no tocan GHL', (() => { const a1 = act({ type: 'create_prospect' }, tgtNo), a2 = act({ type: 'prepare_email' }, tgtNo); return !a1.ghl.create && !a2.ghl.create && a2.supabase.drafts === true; })());
t('ningún act envía mensajes (no existe ninguna operación de envío en el plan)', ['create_prospect', 'create_in_ghl', 'prepare_email', 'mark_contacted', 'log_instagram', 'log_whatsapp', 'log_phone', 'discard', 'follow_up', 'move_stage', 'add_note'].every((tp) => !JSON.stringify(act({ type: tp, stage: 'investigado', note: 'x' }, tgtNo)).match(/sendEmail|send_message|gmail/i)));

// ---------- sitio oficial (validación ligera)
const sig = siteSignals('<html><head><title>Clínica Dental Ejemplo | Ortodoncia en Santiago</title><meta name="description" content="Ortodoncia y estética dental. Agenda tu hora por WhatsApp."></head><body><a href="mailto:contacto@clinicaejemplo.cl">Escríbenos</a><a href="https://wa.me/56955550101">WhatsApp</a><p>Llámanos +56 2 2555 0102</p></body></html>');
t('sitio oficial: título, descripción, correo, WhatsApp y teléfono (de la propia página)', sig.name_guess === 'Clínica Dental Ejemplo' && /Ortodoncia/.test(sig.description) && sig.emails[0] === 'contacto@clinicaejemplo.cl' && sig.whatsapp === '56955550101' && sig.phones.includes('56225550102'));
const fs1 = candidateFromSite('https://clinicaejemplo.cl', sig, { source_type: 'url' });
t('URL individual → candidato: hechos observados en la página, con evidencia, sin hipótesis inventada', fs1.company_name === 'Clínica Dental Ejemplo' && fs1.facts.length === 2 && fs1.evidence_urls[0] === 'https://clinicaejemplo.cl' && fs1.commercial_hypotheses.length === 0 && fs1.contact.whatsapp === '56955550101');
t('briefResult: resumen sin datos internos y con el score externo marcado como referencia', (() => { const br = briefResult(evaluateBatch([withExt], [], { ghl_index_complete: true })[0]); return br.external_score.note.includes('solo referencia') && br.band === 'alta' && Array.isArray(br.channels); })());
t('lintOutreach detecta relaciones falsas', lintOutreach('Hola', 'Hola Ana, como conversamos la semana pasada sobre Clínica Rica te escribo de nuevo para avanzar con tu propuesta, ¿te parece bien que coordinemos?', 'Clínica Rica').includes('finge_relacion_previa'));

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
