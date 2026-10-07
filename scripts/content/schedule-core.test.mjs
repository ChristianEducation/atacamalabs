import assert from 'node:assert/strict';
import * as sc from './schedule-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const TZ = 'America/Santiago';
const NOW = Date.parse('2026-10-07T19:30:00Z');                    // miércoles 7-oct, 16:30 en Chile (UTC-3)
const H = 3600000, D = 86400000;
const day = (iso) => sc.schedDayKey(Date.parse(iso), TZ);
const hhmm = (iso) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const P = (o) => sc.proposeSlot({ now: NOW, account: 'a', taken: [], suggestion: null, justification: null, ...o });

ok('hora de Chile: 12:30 local = 15:30Z en horario de verano y 16:30Z en invierno', () => {
  assert.equal(new Date(sc.schedZonedToUtc(2026, 10, 8, 12, 30, TZ)).toISOString(), '2026-10-08T15:30:00.000Z');
  assert.equal(new Date(sc.schedZonedToUtc(2026, 8, 10, 12, 30, TZ)).toISOString(), '2026-08-10T16:30:00.000Z');
  assert.equal(sc.schedDayKey(Date.parse('2026-10-08T02:00:00Z'), TZ), '2026-10-07');
});
ok('Noticia: el siguiente hueco libre, dentro de 24 h (hoy 7-oct a las 16:30 → mañana 8-oct 12:30 Chile en Instagram)', () => {
  const r = P({ channel: 'instagram', category: 'Noticia' });
  assert.equal(day(r.iso), '2026-10-08'); assert.equal(hhmm(r.iso), '12:30'); assert.ok(r.within_target); assert.ok(r.hours_ahead <= 24); assert.equal(r.tier, 'noticia'); assert.equal(r.source, 'slot');
});
ok('contenido normal (Educativo/Founder/Demo/Caso): dentro de 48 h y no antes de 12 h', () => {
  ['Educativo', 'Founder', 'Demo', 'Caso'].forEach((c) => { const r = P({ channel: 'linkedin_profile', category: c }); assert.ok(r.hours_ahead >= 12 && r.hours_ahead <= 48, c + ' ' + r.hours_ahead); assert.equal(r.tier, 'normal'); });
});
ok('Evergreen: máximo 72 h', () => {
  const r = P({ channel: 'instagram', category: 'Evergreen' }); assert.equal(r.tier, 'evergreen'); assert.ok(r.hours_ahead <= 72 && r.hours_ahead >= 12);
});
ok('máximo una publicación por cuenta y día: si ya hay una ese día, pasa al siguiente día/hueco; otras cuentas no estorban', () => {
  const taken = [{ account: 'a', at: Date.parse('2026-10-08T13:00:00Z') }, { account: 'otra', at: Date.parse('2026-10-09T13:00:00Z') }];
  const r = P({ channel: 'linkedin_page', category: 'Educativo', taken });
  assert.equal(day(r.iso), '2026-10-09');                                   // el 8 ya tiene una de la cuenta; el 9 solo tiene una de OTRA cuenta
  const r2 = P({ channel: 'linkedin_page', category: 'Educativo', taken: [...taken, { account: 'a', at: Date.parse(r.iso) }] });
  assert.equal(day(r2.iso), '2026-10-10'); assert.notEqual(day(r.iso), day(r2.iso));
});
ok('si el choque saca la pieza del plazo, lo dice (no lo esconde) pero tampoco salta a +7 días', () => {
  const taken = [8, 9, 10].map((d) => ({ account: 'a', at: Date.parse('2026-10-' + String(d).padStart(2, '0') + 'T15:00:00Z') }));
  const r = P({ channel: 'instagram', category: 'Noticia', taken });
  assert.equal(day(r.iso), '2026-10-11'); assert.equal(r.within_target, false); assert.ok(r.warnings.some((w) => /sin_hueco_dentro_de_24h/.test(w)));
});
ok('sugerencia dentro de 72 h y libre: se respeta; muy cercana, en choque o sin justificación a +7 días: se ignora con aviso', () => {
  const sug = '2026-10-09T13:00:00Z';
  let r = P({ channel: 'linkedin_page', category: 'Educativo', suggestion: sug }); assert.equal(r.source, 'suggestion'); assert.equal(r.iso, '2026-10-09T13:00:00.000Z');
  r = P({ channel: 'linkedin_page', category: 'Educativo', suggestion: '2026-10-07T21:00:00Z' }); assert.equal(r.source, 'slot'); assert.ok(r.warnings.includes('sugerencia_muy_cercana_ignorada'));
  r = P({ channel: 'linkedin_page', category: 'Educativo', suggestion: sug, taken: [{ account: 'a', at: Date.parse(sug) }] }); assert.equal(r.source, 'slot'); assert.ok(r.warnings.includes('sugerencia_choca_con_otra_publicacion_de_la_cuenta'));
  r = P({ channel: 'instagram', category: 'Educativo', suggestion: '2026-10-14T13:00:00Z' }); assert.equal(r.source, 'slot'); assert.ok(r.warnings.includes('sugerencia_posterior_a_72h_sin_justificacion_ignorada'));
  r = P({ channel: 'instagram', category: 'Educativo', suggestion: '2026-10-14T13:00:00Z', justification: 'corta' }); assert.equal(r.source, 'slot', 'una justificación vacía de contenido no vale');
});
ok('una fecha posterior a 72 h SOLO se acepta con justificación explícita (≥ 20 caracteres) y dentro de 30 días', () => {
  const j = 'Coincide con el lanzamiento del producto el 14 de octubre.';
  let r = P({ channel: 'instagram', category: 'Educativo', suggestion: '2026-10-14T13:00:00Z', justification: j }); assert.equal(r.source, 'suggestion'); assert.equal(day(r.iso), '2026-10-14');
  r = P({ channel: 'instagram', category: 'Educativo', suggestion: '2026-12-14T13:00:00Z', justification: j }); assert.equal(r.source, 'slot', 'más de 30 días: no');
});
ok('REGLA DE ORO: hoy 7-oct, sin una solicitud explícita de publicar el 14, ninguna pieza termina el 14 por fallback', () => {
  const channels = ['instagram', 'linkedin_page', 'linkedin_profile'];
  const cats = ['Noticia', 'Educativo', 'Caso', 'Demo', 'Evergreen', 'Founder', undefined, 'Otra'];
  channels.forEach((ch) => cats.forEach((c) => [null, 'basura', '', '2026-10-07T20:00:00Z', '2026-10-14T13:00:00Z'].forEach((s) => {
    const r = P({ channel: ch, category: c, suggestion: s });                  // sin justificación: ninguna sugerencia a +7 puede colarse
    assert.notEqual(day(r.iso), '2026-10-14', ch + '/' + c + '/' + s); assert.ok(r.ms - NOW <= 72 * H, ch + '/' + c + '/' + s + ' → ' + r.hours_ahead + ' h'); assert.ok(r.ms - NOW >= 3 * H);
  })));
});
ok('REGLA DE ORO con cuentas ocupadas: tampoco salta al 14 por choques normales (1 publicación por cuenta y día)', () => {
  const taken = [{ at: '2026-10-08T13:00:00Z' }, { at: '2026-10-09T18:00:00Z' }].map((t) => ({ account: 'a', at: Date.parse(t.at) }));
  const r = P({ channel: 'linkedin_page', category: 'Educativo', taken });
  assert.equal(day(r.iso), '2026-10-10'); assert.notEqual(day(r.iso), '2026-10-14');
});
ok('barrido: 300 momentos al azar y cuentas con 0–2 días ocupados — siempre horas locales válidas, futuro ≥ plazo mínimo y nunca el +7 ciego', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 300; i++) {
    const now = Date.parse('2026-10-07T00:00:00Z') + Math.floor(rnd() * 20 * D);
    const taken = Array.from({ length: Math.floor(rnd() * 3) }, () => ({ account: 'a', at: now + Math.floor(rnd() * 3 * D) + D / 2 }));
    const ch = ['instagram', 'linkedin_page', 'linkedin_profile'][i % 3], cat = ['Noticia', 'Educativo', 'Evergreen'][i % 3];
    const r = sc.proposeSlot({ now, account: 'a', channel: ch, category: cat, taken });
    const minLead = cat === 'Noticia' ? 3 : 12;
    assert.ok(r.ms >= now + minLead * H, 'plazo mínimo'); assert.ok(r.ms - now <= 6 * D, 'no se va lejos sin razón: ' + (r.ms - now) / D + ' d');
    assert.ok(!taken.some((t) => sc.schedDayKey(t.at, TZ) === sc.schedDayKey(r.ms, TZ)), 'no comparte día con otra publicación de la cuenta');
    assert.match(hhmm(r.iso), /^(09:00|16:00|10:00|15:00|12:30|19:00)$/);
  }
});
ok('el módulo es autocontenido (sin imports ni constantes de módulo) para incrustarlo en n8n', () => {
  const src = Object.values(sc).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n');
  assert.ok(!/\bimport\b|\brequire\(/.test(src)); assert.ok(!/\+ ?7 \* 86400000|7 \* 86400000/.test(src), 'sin fallback de 7 días');
});
console.log(n + ' ok');
