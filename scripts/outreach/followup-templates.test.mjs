import assert from 'node:assert/strict';
import * as ft from './followup-templates.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

ok('verticalOf: reconoce los 3 flancos por nombre, giro o sitio', () => {
  const v = (company_name, industry, extra) => ft.verticalOf({ company_name, canonical: { industry, ...(extra || {}) } });
  assert.equal(v('Maxservicios', 'Corredora de propiedades y arriendos'), 'corredoras');
  assert.equal(v('Inmobiliaria Norte SpA', ''), 'corredoras');
  assert.equal(v('DentisPro', 'Clínica dental'), 'clinicas');
  assert.equal(v('Vet24', 'Veterinaria'), 'clinicas');
  assert.equal(v('Dra. Pérez Kinesiología', ''), 'clinicas');
  assert.equal(v('Casino Colegio San José', 'Servicio de alimentación escolar'), 'casinos_colegios');
  assert.equal(v('Concesionaria Los Andes', 'Casino y comedor para colegios'), 'casinos_colegios');
  assert.equal(v('Alimentos del Norte', 'Servicios de alimentación para empresas y minería'), 'casinos_empresas');
  assert.equal(v('HJ Consultores', 'Consultoría en licitaciones'), null);
  assert.equal(v('Mundo Cursos', 'OTEC y e-learning para salud, educación y empresas'), null, 'la palabra salud sola no hace una clínica');
  assert.equal(v('Rentalin', 'Arriendo de maquinaria'), null, 'arriendo de maquinaria no es una corredora de propiedades');
  assert.equal(v('Propiedades Estatopulos', 'Corretaje y administración de arriendos'), 'corredoras');
  assert.equal(v('Arriendos Norte', 'Arriendo de departamentos y casas'), 'corredoras');
  assert.equal(v('Transportes NMB', 'Transporte de carga'), null);
  assert.equal(ft.verticalOf(null), null);
});
ok('verticalOf: canonical.vertical manda sobre las palabras clave', () => {
  assert.equal(ft.verticalOf({ company_name: 'HJ Consultores', canonical: { vertical: 'corredoras' } }), 'corredoras');
  assert.equal(ft.verticalOf({ company_name: 'Clínica X', canonical: { vertical: 'casinos_empresas' } }), 'casinos_empresas');
  assert.equal(ft.verticalOf({ company_name: 'Clínica X', canonical: { vertical: 'inventado' } }), 'clinicas', 'un valor inválido se ignora');
});
ok('followupBody: 3 pasos por rubro (dolor, valor, cierre), sin prometer ni cotizar, con una sola pregunta (el cierre sin pregunta)', () => {
  for (const v of ['corredoras', 'clinicas', 'casinos_colegios', 'casinos_empresas', null]) {
    for (const k of ['followup_1', 'followup_2', 'followup_3']) {
      const b = ft.followupBody(k, v);
      const tag = (v || 'generico') + '/' + k;
      assert.ok(b.length > 100, tag);
      assert.ok(!/\bdemo\b|video|propuesta|reuni[oó]n|\$399|\$149|precio|gratis|garantiz|\d\s?%/i.test(b), tag + ' no promete ni cotiza');
      if (k === 'followup_3') { assert.ok(/Cierro el hilo/.test(b), tag); assert.ok(!/\?/.test(b), tag + ' el cierre no pregunta'); }
      else assert.equal((b.match(/\?/g) || []).length, 1, tag + ' una sola pregunta');
    }
    assert.ok(/Retomo mi correo anterior/.test(ft.followupBody('followup_1', v)));
    assert.ok(/aunque no cambien nada/.test(ft.followupBody('followup_2', v)));
  }
  // cada rubro habla de lo suyo
  assert.ok(/postulaciones/.test(ft.followupBody('followup_1', 'corredoras')));
  assert.ok(/inasistencias|no falte/.test(ft.followupBody('followup_1', 'clinicas')));
  assert.ok(/comprobantes/.test(ft.followupBody('followup_1', 'casinos_colegios')));
  assert.ok(/turno/.test(ft.followupBody('followup_1', 'casinos_empresas')));
  assert.ok(/eventualmente|suele/.test(ft.followupBody('followup_1', 'casinos_empresas')) || /En los servicios de alimentación/.test(ft.followupBody('followup_1', 'casinos_empresas')), 'habla del rubro como patrón, no afirma nada de la empresa');
});

console.log(n + ' ok');
