// node ops/hermes/ideas-prompt.test.mjs — guardas del prompt del job «Ideas de la semana» (Atacama OS v3 · Fase 4)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const s = fs.readFileSync(new URL('./ideas-week.prompt.txt', import.meta.url), 'utf8');
const g = fs.readFileSync(new URL('./scripts/ideas_gate.sh', import.meta.url), 'utf8');
t('la compuerta va primero: skip → [SILENT]; revise → solo reescribir', /COMPUERTA \(obligatoria, ANTES/.test(s) && /mode=skip, responde exactamente \[SILENT\]/.test(s) && /mode=revise, NO propongas ideas nuevas/.test(s));
t('la ficha tiene los 12 campos con sus valores permitidos', ['1 objective', '2 audience_insight', '3 hook', '4 core_message', '5 format', '6 structure', '7 cta', '8 production', '9 resource_id', '10 effort', '11 risks', '12 primary_metric'].every((k) => s.includes(k)));
t('sin fuente verificada no se propone; inspirarse sin copiar', /Sin evidencia verificada, NO la propongas/.test(s) && /NUNCA copiar texto, diseño ni mascota/.test(s));
t('LinkedIn conserva su voz; página y perfil separados; historias sin texto', /su voz y su ritmo no se tocan/.test(s) && /primera persona/.test(s) && /historias SIN texto en GHL/.test(s));
t('nunca publica, programa, aprueba, produce ni gasta créditos', /NO publicas, NO programas, NO apruebas, NO produces piezas/.test(s) && /NO gastas créditos de Higgsfield/.test(s));
t('usa solo las herramientas propias (ideas_context, propose_ideas, revise_idea) y reporta la corrida', /ideas_context\(\)/.test(s) && /propose_ideas\(/.test(s) && /revise_idea\(/.test(s) && /report_content_job\(kind="ideas_week"/.test(s));
t('el script de compuerta llama a la compuerta «ideas» del CLI', /atacama_ops_cli\.py gate ideas/.test(g));
t('sin secretos', !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20})/.test(s + g));
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
