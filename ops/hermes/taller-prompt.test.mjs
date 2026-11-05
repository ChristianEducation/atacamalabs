// node ops/hermes/taller-prompt.test.mjs — guardas del prompt del job «Taller — producción» y del script del productor (Atacama OS v3 · Fase 3)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const s = fs.readFileSync(new URL('./taller-produccion.prompt.txt', import.meta.url), 'utf8');
const sh = fs.readFileSync(new URL('./scripts/taller_produce.sh', import.meta.url), 'utf8');
t('sin pieza (apagado, pausa o vacío) → [SILENT]', /claimed=false[^\n]*\[SILENT\]/.test(s));
t('aplica SOLO el feedback de Christian y sigue la receta', /cambia SOLO lo que pidió/.test(s) && /RECETA\.md/.test(s));
t('usa el generador simulado; Higgsfield BLOQUEADO hasta autorización', /generator="sim"/.test(s) && /BLOQUEADO/.test(s));
t('nunca programa, aprueba, publica ni gasta créditos', /NO programas, NO apruebas, NO publicas, NO gastas créditos/.test(s));
t('el script no exporta TALLER_HIGGS (Higgsfield queda apagado) y corre con tope de tiempo', !/export TALLER_HIGGS/.test(sh) && /timeout 1500/.test(sh));
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
