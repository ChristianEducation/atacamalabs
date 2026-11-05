#!/usr/bin/env node
/**
 * Prueba de humo de la herramienta ASTER ya activa en n8n (llave y URL salen de .env.aster.local; nunca se imprimen).
 *   node scripts/aster/smoke.mjs <correo-de-prueba-confirmado> [tipo]
 * ENVÍA UN CORREO REAL al destinatario indicado y sube el PDF a Drive: úsese solo con una dirección propia.
 */
import fs from 'node:fs';
const [to, type = 'observacion_preventiva'] = process.argv.slice(2);
if (!to) { console.error('Uso: node scripts/aster/smoke.mjs <correo> [document_type]'); process.exit(2); }
const envFile = process.env.ASTER_ENV || '.env.aster.local';
const env = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
const body = {
  request_id: `smoke-${Date.now()}`, document_type: type, company_name: 'Empresa ficticia de ejemplo', person_name: 'Prueba de humo', email: to, consent_to_email: true,
  activity_location: 'Taller de mantenimiento, Mejillones',
  raw_narrative: 'Durante la inspección observamos materiales obstruyendo parcialmente un pasillo. Se informó al encargado. Queda pendiente comprobar el despeje.',
  verified_facts: ['Se observaron materiales obstruyendo parcialmente un pasillo', 'Se informó al encargado'], observations: ['Obstrucción parcial de vía de circulación'],
  actions_taken: ['Informar al encargado'], pending_actions: [{ description: 'Verificar retiro de materiales', owner: null, due_date: null }], notes: 'Datos ficticios de demostración',
};
const send = async (b) => { const r = await fetch(env.ASTER_DEMO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atacama-Key': env.ASTER_DEMO_KEY }, body: JSON.stringify(b) }); return { http: r.status, body: await r.json().catch(() => null) }; };
console.log('1) envío real →', JSON.stringify(await send(body), null, 2));
console.log('2) reintento con el mismo request_id (no debe reenviar) →', JSON.stringify(await send(body), null, 2));
console.log('3) sin llave →', (await fetch(env.ASTER_DEMO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status);
