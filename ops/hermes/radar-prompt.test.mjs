// node ops/hermes/radar-prompt.test.mjs — guardas del prompt del Prospect Radar v2 (que siga siendo seguro, acotado y pase por el Gateway)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const p = fs.readFileSync(new URL('./prospect-radar-v2.prompt.txt', import.meta.url), 'utf8');
t('modo explícito en la primera línea (MODO=import | analyze)', /^MODO=(import|analyze)\s*$/m.test(p.split('\n')[0]) && /MODO=analyze/.test(p));
t('presupuesto acotado: ≤ 6 candidatos, ≤ 16 búsquedas, ≤ 30 llamadas, ≤ 12 minutos, ≤ 2 páginas por empresa', /máximo 6 candidatos/.test(p) && /máximo 16 búsquedas/.test(p) && /máximo 30 llamadas/.test(p) && /12 minutos/.test(p) && /Máximo 2 páginas/.test(p));
t('import limitado a 5 por corrida y solo los que el Gateway marcó create_in_ghl', /máximo 5 por corrida/.test(p) && /create_in_ghl/.test(p));
t('la única puerta es el Prospect Gateway (analyze → import con request_id fijo); no usa el ingest viejo ni escribe en GHL/Supabase', /atacama-prospect-gateway/.test(p) && !/-X POST "\$ATACAMA_INGEST_URL"/.test(p) && /no modifiques GHL ni Supabase directamente/.test(p) && /"request_id":"radar2-/.test(p));
t('nunca contacta a nadie ni envía mensajes', /no contactes ni escribas a nadie/.test(p) && /NO se envía/.test(p));
t('distingue HECHO / INFERENCIA / HIPÓTESIS y exige cita literal con URL', /HECHO/.test(p) && /INFERENCIA/.test(p) && /HIPÓTESIS COMERCIAL/.test(p) && /COPIADA LITERALMENTE/.test(p));
t('investigación intermedia: no exige «dolor demostrado», pero exige proceso observable y 2 hechos (regla de señal verdadera)', /no buscamos «dolor demostrado»/.test(p) && /SEÑAL VERDADERA vs RELLENO/.test(p) && /DOS hechos observados/.test(p) && /PROCESO observable/.test(p));
t('contacto solo público y de la propia empresa; sin adivinar correos; sin contacto público se descarta', /PÚBLICA publicada por la propia empresa/.test(p) && /Nunca adivines correos/.test(p) && /descarta la empresa/.test(p));
t('sin secretos incrustados en el prompt', !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|Bearer [A-Za-z0-9]{20})/.test(p));
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
