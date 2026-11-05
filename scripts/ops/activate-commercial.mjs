#!/usr/bin/env node
/**
 * Atacama OS · ACTIVACIÓN COMERCIAL en un solo paso (Bloque 3). NO se ejecuta sola: por defecto solo muestra qué cambiaría.
 *
 *   node scripts/ops/activate-commercial.mjs                                   → vista previa + verificación de requisitos (no escribe nada)
 *   node scripts/ops/activate-commercial.mjs --linkedin-list <ID> --linkedin-campaign <ID>
 *                                                                              → igual, e incluye LinkedIn (verifica en Waalaxy que existan)
 *   node scripts/ops/activate-commercial.mjs --apply --confirm "<frase de Christian>" [--linkedin-list … --linkedin-campaign …]
 *                                                                              → ACTIVA (correo live, tope 5/día, sin lista blanca; LinkedIn live si se dieron lista y campaña)
 *   node scripts/ops/activate-commercial.mjs --rollback --apply                → vuelve todo a OFF (correo y LinkedIn) y restaura la lista blanca de pruebas
 *
 * Qué NO cambia al activar: toda aprobación sigue siendo humana (código + palabras de Christian), el Radar solo deja prospectos en Investigado,
 * el Content Engine solo deja piezas en revisión y Hermes pide confirmación para acciones externas. No envía ni contacta a nadie por sí mismo.
 * Variables: .env.local (N8N_BASE_URL, ATACAMA_INGEST_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). No imprime secretos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const APPLY = flag('--apply'), ROLLBACK = flag('--rollback'), CONFIRM = val('--confirm');
const LI_LIST = val('--linkedin-list'), LI_CAMP = val('--linkedin-campaign');
const N8N = env.N8N_BASE_URL.replace(/\/$/, '');
const SB = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
const sbh = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
const sb = async (p, method = 'GET', body) => { const r = await fetch(SB + p, { method, headers: { ...sbh, Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j }; };
const hook = async (p, body) => { const r = await fetch(N8N + '/webhook/' + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atacama-Key': env.ATACAMA_INGEST_KEY }, body: JSON.stringify(body) }); return r.json().catch(() => ({})); };
const TEST_ALLOWLIST = ['c.wevarh@gmail.com'];
const ok = (b) => (b ? 'OK   ' : 'FALTA');

const cfg = (await sb('outreach_config?id=eq.1&select=*')).j[0];
if (!cfg) { console.error('No pude leer outreach_config'); process.exit(1); }

if (ROLLBACK) {
  console.log('ROLLBACK a OFF: correo mode=off, LinkedIn linkedin_mode=off, lista blanca de pruebas.');
  if (!APPLY) { console.log('(vista previa; agrega --apply para ejecutar)'); process.exit(0); }
  const r = await sb('outreach_config?id=eq.1', 'PATCH', { mode: 'off', linkedin_mode: 'off', send_allowlist: TEST_ALLOWLIST, daily_cap: 1, updated_at: new Date().toISOString() });
  await sb('operator_audit_log', 'POST', { request_id: 'activation-rollback-' + Date.now().toString(36), actor: 'Christian (rollback explícito)', tool: 'activation_rollback', level: 3, entity: {}, params: {}, status: r.s < 300 ? 'ok' : 'error', result_summary: 'mode=off, linkedin_mode=off' });
  console.log(r.s < 300 ? 'Listo: todo en OFF.' : 'ERROR ' + r.s); process.exit(r.s < 300 ? 0 : 1);
}

console.log('=== PREVIA DE ACTIVACIÓN COMERCIAL ===\n');
// ---- requisitos
const msgs = (await sb('outreach_messages?direction=eq.outbound&status=in.(approved,sending)&select=id')).j;
const health = await hook('atacama-ops', { action: 'health', deep: true });
const gmailOk = health.ok !== false && !(health.components || []).some((c) => /Gmail/.test(c.name) && c.status === 'fallo');
let liOk = null, liNote = 'no incluido (sin lista/campaña de producción; LinkedIn seguirá apagado)';
if (LI_LIST || LI_CAMP) {
  const l = await hook('atacama-linkedin', { action: 'lists' });
  const listOk = (l.lists || []).some((x) => x.id === LI_LIST), campOk = (l.campaigns || []).some((x) => x.id === LI_CAMP);
  liOk = Boolean(LI_LIST && LI_CAMP && listOk && campOk);
  liNote = liOk ? 'lista y campaña existen en Waalaxy' : 'NO se encontró ' + (!listOk ? 'la lista ' : '') + (!campOk ? 'la campaña ' : '') + 'en Waalaxy (¿pausada o archivada?)';
}
const footerTemp = !cfg.legal_footer || /^Atacama Labs · atacamalabs\.cl$/i.test(String(cfg.legal_footer).trim());
console.log('Requisitos');
console.log(' ', ok(gmailOk), 'Gmail Sender/Sync responden (verificación profunda)');
console.log(' ', ok(msgs.length === 0), '0 correos aprobados o enviándose (hay ' + msgs.length + ')');
console.log(' ', ok(cfg.paused === false), 'envío no pausado (paused=' + cfg.paused + ')');
console.log(' ', footerTemp ? 'AVISO' : 'OK   ', 'pie legal del correo' + (footerTemp ? ': hoy es solo «Atacama Labs · atacamalabs.cl» (falta razón social/RUT; recomendable completarlo antes del primer envío real)' : ''));
console.log(' ', liOk === null ? 'n/a  ' : ok(liOk), 'LinkedIn: ' + liNote);
console.log('\nQué cambia');
console.log('  Correo (Gmail Engine)   mode:', cfg.mode, '→ live | tope diario:', cfg.daily_cap, '→ 5 | lista blanca:', JSON.stringify(cfg.send_allowlist), '→ [] (todos los destinatarios; cada correo SIGUE requiriendo tu aprobación con código)');
console.log('  LinkedIn (Waalaxy)      linkedin_mode:', cfg.linkedin_mode, liOk ? '→ live (lista ' + LI_LIST + ', campaña ' + LI_CAMP + ', tope ' + cfg.linkedin_daily_cap + '/día; el alta SIGUE requiriendo tu aprobación)' : '(sin cambios)');
console.log('  Sin cambios             Prospect Radar (solo Investigado) · Content Engine (solo en revisión) · Hermes (acciones externas con confirmación)');
console.log('  Rollback                node scripts/ops/activate-commercial.mjs --rollback --apply');

if (!APPLY) { console.log('\n(vista previa: no se escribió nada. Para activar: --apply --confirm "<tus palabras>")'); process.exit(0); }
if (!CONFIRM || CONFIRM.trim().length < 8) { console.error('\nABORTA: falta --confirm con las palabras explícitas de Christian (mín. 8 caracteres).'); process.exit(2); }
if (!gmailOk || msgs.length || cfg.paused) { console.error('\nABORTA: un requisito crítico no se cumple (ver arriba).'); process.exit(3); }
if ((LI_LIST || LI_CAMP) && !liOk) { console.error('\nABORTA: LinkedIn pedido pero la lista/campaña no verificó.'); process.exit(3); }

const now = new Date().toISOString();
const r1 = await sb('outreach_config?id=eq.1', 'PATCH', { mode: 'live', daily_cap: 5, send_allowlist: [], updated_at: now });
console.log('\nCorreo →', r1.s < 300 ? 'LIVE (5/día, aprobación humana obligatoria)' : 'ERROR ' + r1.s);
if (liOk) { const r2 = await hook('atacama-linkedin', { action: 'set_config', config: { linkedin_list_id: LI_LIST, linkedin_campaign_id: LI_CAMP, linkedin_mode: 'live' } }); console.log('LinkedIn →', r2.ok ? 'LIVE' : 'ERROR ' + (r2.message || '')); }
await sb('operator_audit_log', 'POST', { request_id: 'activation-' + Date.now().toString(36), actor: 'Christian', tool: 'activation_commercial', level: 3, entity: {}, params: { linkedin: Boolean(liOk) }, status: r1.s < 300 ? 'ok' : 'error', result_summary: 'mode=live cap=5' + (liOk ? ' linkedin=live' : ''), response: { confirm: CONFIRM.slice(0, 200) } });
console.log('Activación registrada en la auditoría. Para volver atrás: --rollback --apply');
