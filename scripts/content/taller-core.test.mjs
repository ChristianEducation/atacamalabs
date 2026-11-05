import assert from 'node:assert/strict';
import * as tc from './taller-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const NOW = Date.parse('2026-10-20T13:00:00Z');   // martes 20-oct 10:00 Chile
const PID = '11111111-1111-4111-8111-111111111111';
const IDEA = { id: '22222222-2222-4222-8222-222222222222', week_start: '2026-10-26', channel: 'instagram', format: 'carrusel', title: 'Qué proceso automatizar primero', hook: 'Gancho', objective: 'educar', keyword: 'PROCESO', resource_id: '33333333-3333-4333-8333-333333333333', status: 'proposed', history: [], score: 88, evidence: [{ type: 'source', id: 'x', url: 'https://e.cl' }], source_ids: [] };
const piece = (o = {}) => ({ id: PID, idea_id: IDEA.id, channel: 'instagram', format: 'carrusel', lane: 'vps', taller_status: 'para_revisar', current_version: 1, credits_spent: 0, status: 'idea', is_test: false, piece: { keyword: 'PROCESO' }, ...o });
const assets = (k, ext = 'png') => Array.from({ length: k }, (_, i) => ({ path: PID + '/v2/' + String(i + 1).padStart(2, '0') + '.' + ext, w: 1080, h: 1350 }));

ok('autocontenidas', () => { for (const f of Object.values(tc)) assert.ok(!/\bimport\b|\brequire\(/.test(f.toString()), f.name); });

ok('transiciones del anexo §E1', () => {
  assert.ok(tc.tallerCan('en_cola', 'en_produccion')); assert.ok(tc.tallerCan('para_revisar', 'cambios_pedidos')); assert.ok(tc.tallerCan('cambios_pedidos', 'en_produccion'));
  assert.ok(tc.tallerCan('en_produccion', 'necesita_ayuda')); assert.ok(tc.tallerCan('lista', 'programada'));
  assert.ok(!tc.tallerCan('publicada', 'descartada')); assert.ok(!tc.tallerCan('en_cola', 'programada')); assert.ok(!tc.tallerCan('descartada', 'para_revisar'));
});

ok('aprobar una idea crea su pieza: carril VPS en cola o PC con Claude; viernes de cierre; dos escrituras sin dependencia', () => {
  const r = tc.tallerApproveIdeaPlan(IDEA, { now: NOW, piece_id: PID, pack_id: 'pack' });
  const p = r.writes[0].body;
  assert.equal(p.taller_status, 'en_cola'); assert.equal(p.lane, 'vps'); assert.equal(p.idea_id, IDEA.id); assert.equal(p.idea_key, 'idea:' + IDEA.id); assert.equal(p.needs_by, '2026-10-23T21:00:00.000Z'); assert.equal(p.cta_mode, 'dm');
  assert.equal(r.writes[1].body.status, 'in_production'); assert.equal(r.writes[1].body.piece_id, PID); assert.match(r.writes[1].path, /status=in\.\(proposed\)/);
  const reel = tc.tallerApproveIdeaPlan({ ...IDEA, format: 'reel' }, { now: NOW, piece_id: PID, pack_id: 'pack' });
  assert.equal(reel.writes[0].body.taller_status, 'en_pc_con_claude'); assert.match(reel.resp.message, /PC con Claude/);
  assert.equal(tc.tallerApproveIdeaPlan({ ...IDEA, status: 'discarded' }, { now: NOW }).error, 'no_aprobable');
  assert.equal(tc.tallerApproveIdeaPlan({ ...IDEA, status: 'approved', piece_id: null }, { now: NOW, piece_id: PID, pack_id: 'p' }).resp.status, 'approved');   // «Mi idea» ya aprobada → crea su pieza
});

ok('archivos: carrusel 2–10 imágenes 4:5 en la ruta de la pieza; reel 1 MP4; historia 1 imagen', () => {
  const p = piece();
  assert.deepEqual(tc.tallerValidateAssets(assets(5), p), []);
  assert.ok(tc.tallerValidateAssets(assets(1), p).some((e) => /2 a 10/.test(e)));
  assert.ok(tc.tallerValidateAssets([{ path: 'otra/v1/x.png' }, ...assets(2)], p).some((e) => /ruta/.test(e)));
  assert.ok(tc.tallerValidateAssets([{ ...assets(1)[0], w: 1080, h: 1080 }, assets(2)[1]], p).some((e) => /4:5/.test(e)));
  assert.deepEqual(tc.tallerValidateAssets(assets(1, 'mp4'), piece({ format: 'reel' })), []);
  assert.ok(tc.tallerValidateAssets(assets(2), piece({ format: 'historia' })).length);
});

ok('nueva versión: v(n+1), para_revisar, cierra el feedback abierto, suma créditos; el video del PC exige nota ≥ 8', () => {
  const r = tc.tallerAddVersionPlan(piece({ taller_status: 'cambios_pedidos', credits_spent: 17.5 }), { assets: assets(5), caption: 'Texto PROCESO', cost_credits: 4, created_by: 'Hermes' }, { now: NOW, id: 'v2' });
  assert.equal(r.resp.version_no, 2); assert.equal(r.writes[0].body.version_no, 2); assert.equal(r.writes[1].body.taller_status, 'para_revisar'); assert.equal(r.writes[1].body.credits_spent, 21.5);
  assert.match(r.writes[2].path, /content_feedback\?piece_id=eq\..*&status=eq\.open/); assert.equal(r.writes[2].body.status, 'done');
  assert.equal(tc.tallerAddVersionPlan(piece({ taller_status: 'programada' }), { assets: assets(5) }, { now: NOW }).error, 'estado_invalido');
  const pc = piece({ format: 'reel', lane: 'pc', taller_status: 'en_pc_con_claude', current_version: 0 });
  assert.equal(tc.tallerAddVersionPlan(pc, { assets: [{ path: PID + '/v1/r.mp4' }], qa: { score: 7 } }, { now: NOW }).error, 'puerta_de_calidad');
  assert.equal(tc.tallerAddVersionPlan(pc, { assets: [{ path: PID + '/v1/r.mp4' }], qa: { score: 8.5 } }, { now: NOW, id: 'v1' }).resp.version_no, 1);
});

ok('pedir cambio: feedback global o por lámina, estado cambios_pedidos y evento de aprendizaje', () => {
  const r = tc.tallerFeedbackPlan(piece(), { text: 'La portada más cerca', scope: 'lamina 1' }, { now: NOW });
  assert.equal(r.writes[0].body.scope, 'lamina 1'); assert.equal(r.writes[1].body.taller_status, 'cambios_pedidos'); assert.equal(r.writes[2].body.type, 'piece_feedback');
  assert.equal(tc.tallerFeedbackPlan(piece(), { text: 'x' }, { now: NOW }).error, 'falta_texto');
  assert.equal(tc.tallerFeedbackPlan(piece({ taller_status: 'cambios_pedidos' }), { text: 'otro cambio más' }, { now: NOW }).writes.length, 2);   // ya estaba en cambios: solo suma el feedback
  assert.match(tc.tallerFeedbackPlan(piece({ lane: 'pc' }), { text: 'más corto' }, { now: NOW }).resp.message, /PC con Claude/);
});

ok('aprobar versión, descartar (idea y aprendizaje), duplicar a otra red (idea hija sin copiar texto), editar texto', () => {
  assert.equal(tc.tallerApprovePlan(piece(), { now: NOW }).writes[0].body.taller_status, 'lista');
  const d = tc.tallerDiscardPlan(piece(), { reason: 'no convence' }, { now: NOW });
  assert.equal(d.writes[0].body.taller_status, 'descartada'); assert.equal(d.writes[0].body.status, 'discarded'); assert.ok(d.writes.some((w) => /content_ideas/.test(w.path))); assert.ok(d.writes.some((w) => w.path === 'learning_events'));
  assert.equal(tc.tallerDiscardPlan(piece({ taller_status: 'publicada' }), {}, { now: NOW }).error, 'estado_invalido');
  const du = tc.tallerDuplicatePlan(piece(), IDEA, { channel: 'linkedin_page' }, { now: NOW, id: 'i2' });
  assert.equal(du.writes[0].body.channel, 'linkedin_page'); assert.equal(du.writes[0].body.format, 'texto'); assert.equal(du.writes[0].body.parent_idea_id, IDEA.id); assert.equal(du.writes[0].body.ficha_complete, false);
  assert.equal(tc.tallerDuplicatePlan(piece(), IDEA, { channel: 'instagram' }, { now: NOW }).error, 'red_invalida');
  assert.equal(tc.tallerCaptionPlan(piece({ format: 'historia' }), { id: 'v', version_no: 1 }, 'hola', { now: NOW }).error, 'historia_sin_texto');
  assert.equal(tc.tallerCaptionPlan(piece(), { id: 'v', version_no: 1 }, 'Texto nuevo', { now: NOW }).writes[0].body.caption, 'Texto nuevo');
});

ok('fecha propuesta (§E3): feed IG 15:00 sin dos el mismo día; LinkedIn 10:00 uno por cuenta; historias 10/14/18', () => {
  const taken = [{ id: 'a', channel: 'instagram', format: 'carrusel', scheduled_at: '2026-10-26T18:00:00.000Z' }];
  assert.equal(tc.tallerProposeSlot(piece(), taken, {}, NOW, '2026-10-26'), '2026-10-27T18:00:00.000Z');
  assert.equal(tc.tallerProposeSlot(piece({ channel: 'linkedin_page', format: 'texto' }), [], {}, NOW, '2026-10-26'), '2026-10-26T13:00:00.000Z');
  const st = [10, 14, 18].map((h, i) => ({ id: 's' + i, channel: 'instagram', format: 'historia', scheduled_at: new Date(Date.UTC(2026, 9, 26, h + 3)).toISOString() }));
  assert.equal(tc.tallerProposeSlot(piece({ format: 'historia' }), st, {}, NOW, '2026-10-26'), '2026-10-27T13:00:00.000Z');
});

ok('programar · validaciones: estado, versión, fecha, palabra clave, historias sin texto, hueco del día, 55 días', () => {
  const v = { id: 'v', version_no: 1, assets: assets(5).map((a) => ({ ...a, path: a.path.replace('/v2/', '/v1/') })), caption: 'Texto con PROCESO' };
  const base = { piece: piece(), version: v, idea: IDEA, schedule_at: '2026-10-27T18:00:00.000Z', taken: [], cfg: {}, now: NOW };
  const ok1 = tc.tallerSchedulePrecheck(base);
  assert.equal(ok1.ok, true); assert.equal(ok1.carousel, true); assert.equal(ok1.direct, false); assert.equal(ok1.paths.length, 5); assert.equal(ok1.type, 'post');
  assert.equal(tc.tallerSchedulePrecheck({ ...base, cfg: { taller_carousel_direct_schedule: true } }).direct, true);
  assert.equal(tc.tallerSchedulePrecheck({ ...base, piece: piece({ taller_status: 'en_cola' }) }).error, 'estado_invalido');
  assert.equal(tc.tallerSchedulePrecheck({ ...base, version: null }).error, 'sin_version');
  assert.equal(tc.tallerSchedulePrecheck({ ...base, schedule_at: '2026-10-20T13:10:00.000Z' }).error, 'fecha_pasada');
  assert.equal(tc.tallerSchedulePrecheck({ ...base, schedule_at: '2027-01-20T13:10:00.000Z' }).error, 'fecha_lejana');
  assert.equal(tc.tallerSchedulePrecheck({ ...base, version: { ...v, caption: 'sin palabra' } }).error, 'falta_palabra_clave');
  assert.equal(tc.tallerSchedulePrecheck({ ...base, taken: [{ id: 'z', channel: 'instagram', format: 'reel', scheduled_at: '2026-10-27T15:00:00.000Z' }] }).error, 'hueco_ocupado');
  const h = { ...base, piece: piece({ format: 'historia' }), idea: { ...IDEA, keyword: null }, version: { ...v, assets: [v.assets[0]], caption: 'texto' } };
  assert.equal(tc.tallerSchedulePrecheck(h).error, 'historia_sin_texto');
  assert.equal(tc.tallerSchedulePrecheck({ ...h, version: { ...h.version, caption: '' } }).type, 'story');
});

ok('programar · cuerpo GHL: carrusel EN REVISIÓN (pending); imagen aprobada directo', () => {
  const pre = { account: 'acc', caption: 'Texto', type: 'post', schedule_iso: '2026-10-27T18:00:00.000Z', direct: false, paths: ['a', 'b'] };
  const b = tc.tallerGhlBody(pre, [{ url: 'https://x/a.png' }, { url: 'https://x/b.png' }], 'APR');
  assert.equal(b.status, 'in_review'); assert.equal(b.postApprovalDetails.approvalStatus, 'pending'); assert.equal(b.media.length, 2); assert.equal(b.userId, 'APR');
  assert.equal(tc.tallerGhlBody({ ...pre, direct: true }, [], 'APR').status, 'scheduled');
});

ok('programar · cierre: carrusel → pendiente de clic; directo → programada (+ idea scheduled, señal positiva en v1 sin feedback); estado raro → error', () => {
  const pre = { account: 'acc', schedule_iso: '2026-10-27T18:00:00.000Z', direct: false, paths: ['a', 'b', 'c'] };
  const r = tc.tallerScheduleFinal({ piece: piece(), pre, post: { _id: 'g1', status: 'in_review', postApprovalDetails: { approvalStatus: 'pending' } }, now: NOW });
  assert.equal(r.resp.status, 'programada_pendiente_de_clic'); assert.equal(r.resp.needs_ghl, true); assert.match(r.resp.message, /último clic/); assert.match(r.resp.message, /3 láminas/);
  assert.equal(r.writes[0].body.ghl_post_id, 'g1');
  assert.deepEqual(tc.tallerScheduleFinal({ piece: piece(), pre, post: { _id: 'g1', status: 'in_review' }, media: [{ url: 'u', fileId: 'f' }], now: NOW }).writes[0].body.piece.ghl_media, [{ url: 'u', fileId: 'f' }]); assert.ok(r.writes.some((w) => w.path === 'learning_events' && w.body.type === 'piece_ok'));
  const d = tc.tallerScheduleFinal({ piece: piece(), pre: { ...pre, direct: true }, post: { _id: 'g2', status: 'scheduled', postApprovalDetails: { approvalStatus: 'approved' } }, now: NOW, had_feedback: true });
  assert.equal(d.resp.status, 'programada'); assert.ok(!d.writes.some((w) => w.path === 'learning_events'));
  assert.equal(tc.tallerScheduleFinal({ piece: piece(), pre: { ...pre, direct: true }, post: { _id: 'g3', status: 'draft' }, now: NOW }).error, 'ghl_estado_inesperado');
  assert.equal(tc.tallerScheduleFinal({ piece: piece(), pre, post: null, now: NOW }).error, 'ghl_no_confirmo');
});

ok('sync: pendiente de clic → programada cuando GHL la aprueba; publicada; rechazada → descartada', () => {
  assert.equal(tc.tallerSyncStatus({ taller_status: 'programada_pendiente_de_clic' }, { status: 'scheduled' }), 'programada');
  assert.equal(tc.tallerSyncStatus({ taller_status: 'programada' }, { status: 'published' }), 'publicada');
  assert.equal(tc.tallerSyncStatus({ taller_status: 'programada' }, { status: 'discarded' }), 'descartada');
  assert.equal(tc.tallerSyncStatus({ taller_status: 'para_revisar' }, { status: 'scheduled' }), null);
});

ok('vista: orden por urgencia, URLs firmadas, versiones y feedback; sin TEST', () => {
  const v = tc.tallerListView({ now: NOW, pieces: [piece(), piece({ id: 'b', taller_status: 'en_cola', current_version: null }), piece({ id: 't', is_test: true })], ideas: [IDEA],
    versions: [{ id: 'v1', piece_id: PID, version_no: 1, kind: 'carrusel', assets: [{ path: PID + '/v1/01.png' }], caption: 'c', created_at: 'x' }], feedback: [{ id: 'f', piece_id: PID, scope: 'global', text: 't', status: 'done', created_at: 'y' }],
    signed: { [PID + '/v1/01.png']: 'https://firmada/01' }, taken: [], cfg: {} });
  assert.deepEqual(v.pieces.map((p) => p.id), [PID, 'b']); assert.equal(v.pieces[0].thumb, 'https://firmada/01'); assert.equal(v.pieces[0].keyword, 'PROCESO'); assert.ok(v.pieces[0].proposed_slot);
  assert.equal(v.counts.para_revisar, 1); assert.equal(v.pieces[0].feedback[0].status, 'done');
});

console.log(n + ' ok');
