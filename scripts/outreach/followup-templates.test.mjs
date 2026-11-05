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
ok('followupBody: 3 pasos × 3 variantes por rubro (dolor, valor, cierre), sin prometer ni cotizar, una sola pregunta (el cierre sin pregunta)', () => {
  for (const v of ['corredoras', 'clinicas', 'casinos_colegios', 'casinos_empresas', null]) {
    for (const k of ['followup_1', 'followup_2', 'followup_3']) {
      const textos = [0, 1, 2].map((i) => ft.followupBody(k, v, i));
      assert.equal(new Set(textos).size, 3, (v || 'generico') + '/' + k + ': las 3 variantes son distintas');
      textos.forEach((b, i) => {
        const tag = (v || 'generico') + '/' + k + '/v' + i;
        assert.ok(b.length > 100, tag);
        assert.ok(!/\bdemo\b|video|propuesta|reuni[oó]n|\$399|\$149|precio|gratis|garantiz|\d\s?%/i.test(b), tag + ' no promete ni cotiza');
        assert.ok(!/\bno es (solo )?[^.]{3,60}(sino|,\s*es)\b/i.test(b), tag + ' sin la fórmula «no es X, sino Y»');
        if (k === 'followup_3') { assert.ok(/(cierro el hilo|no insistir)/i.test(b), tag); assert.ok(!/\?/.test(b), tag + ' el cierre no pregunta'); }
        else assert.equal((b.match(/\?/g) || []).length, 1, tag + ' una sola pregunta');
      });
    }
    assert.ok(/Retomo mi correo anterior/.test(ft.followupBody('followup_1', v, 0)));
    assert.ok(/aunque no cambien nada/.test(ft.followupBody('followup_2', v, 0)));
  }
  // cada rubro habla de lo suyo
  assert.ok(/postulaciones/.test(ft.followupBody('followup_1', 'corredoras', 1)));
  assert.ok(/inasistencias|no falte|hora vacía|confirm/.test(ft.followupBody('followup_1', 'clinicas', 2)));
  assert.ok(/comprobantes|pagos/.test(ft.followupBody('followup_1', 'casinos_colegios', 1)));
  assert.ok(/turno/.test(ft.followupBody('followup_1', 'casinos_empresas', 1)));
  assert.equal(ft.followupBody('followup_1', 'clinicas'), ft.followupBody('followup_1', 'clinicas', 0), 'sin variante = la A');
});
ok('ftPick: elige variantes de forma estable y reparte los prospectos entre las 3', () => {
  assert.equal(ft.ftPick('abc|followup_1', 3), ft.ftPick('abc|followup_1', 3), 'estable');
  const usados = new Set(); for (let i = 0; i < 60; i++) usados.add(ft.ftPick('cand-' + i + '|followup_2', 3));
  assert.deepEqual([...usados].sort(), [0, 1, 2], 'con 60 prospectos aparecen las 3 variantes');
  assert.equal(ft.ftPick('x', 0), 0);
});

console.log(n + ' ok');
