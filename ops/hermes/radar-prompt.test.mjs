// node ops/hermes/radar-prompt.test.mjs — guardas del prompt del Prospect Radar v2 (que siga siendo seguro, acotado y pase por el Gateway)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const p = fs.readFileSync(new URL('./prospect-radar-v2.prompt.txt', import.meta.url), 'utf8');
t('modo explícito en la primera línea (MODO=auto | import | analyze)', /^MODO=(auto|import|analyze)\s*$/m.test(p.split('\n')[0]) && /MODO=analyze/.test(p));
t('obedece la compuerta de Atacama OS (skip → [SILENT]) y trabaja en modo seguro', /COMPUERTA DEL RADAR/.test(p) && /mode=skip/.test(p) && /\[SILENT\]/.test(p) && /MODO SEGURO/.test(p) && /max_imports/.test(p));
t('reporta cada corrida a atacama-ops (radar_report) sin imprimir la clave', /"action":"radar_report"/.test(p) && /atacama-ops/.test(p));
t('presupuesto acotado: ≤ 6 candidatos, ≤ 16 búsquedas, ≤ 30 llamadas, ≤ 12 minutos, ≤ 2 páginas por empresa', /máximo 6 candidatos/.test(p) && /máximo 16 búsquedas/.test(p) && /máximo 30 llamadas/.test(p) && /12 minutos/.test(p) && /Máximo 2 páginas/.test(p));
t('import limitado a 5 por corrida y solo los que el Gateway marcó create_in_ghl', /máximo 5 por corrida/.test(p) && /create_in_ghl/.test(p));
t('la única puerta es el Prospect Gateway (analyze → import con request_id fijo); no usa el ingest viejo ni escribe en GHL/Supabase', /atacama-prospect-gateway/.test(p) && !/-X POST "\$ATACAMA_INGEST_URL"/.test(p) && /no modifiques GHL ni Supabase directamente/.test(p) && /"request_id":"radar2-/.test(p));
t('nunca contacta a nadie ni envía mensajes', /no contactes ni escribas a nadie/.test(p) && /NO se envía/.test(p));
t('distingue HECHO / INFERENCIA / HIPÓTESIS y exige cita literal con URL', /HECHO/.test(p) && /INFERENCIA/.test(p) && /HIPÓTESIS COMERCIAL/.test(p) && /COPIADA LITERALMENTE/.test(p));
t('investigación intermedia: no exige «dolor demostrado», pero exige proceso observable y 2 hechos (regla de señal verdadera)', /no buscamos «dolor demostrado»/.test(p) && /SEÑAL VERDADERA vs RELLENO/.test(p) && /DOS hechos observados/.test(p) && /PROCESO observable/.test(p));
t('contacto solo público y de la propia empresa; sin adivinar correos; sin contacto público se descarta', /PÚBLICA publicada por la propia empresa/.test(p) && /Nunca adivines correos/.test(p) && /descarta la empresa/.test(p));
t('sin secretos incrustados en el prompt', !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|Bearer [A-Za-z0-9]{20})/.test(p));
const c = fs.readFileSync(new URL('./content-radar.prompt.txt', import.meta.url), 'utf8');
t('ambos radares terminan en [SILENT]: el aviso a Telegram lo arma Atacama OS, no el agente', /EXACTAMENTE «\[SILENT\]»/.test(p) && /EXACTAMENTE «\[SILENT\]»/.test(c) && /content_radar_report/.test(c) && !/Responde SOLO con un resumen/i.test(p + c));
// ---- Ola A: prompts de los jobs de contenido (RSS, piezas, inteligencia orgánica)
const rss = fs.readFileSync(new URL('./content-rss.prompt.txt', import.meta.url), 'utf8');
const pcs = fs.readFileSync(new URL('./content-pieces.prompt.txt', import.meta.url), 'utf8');
const cmp = fs.readFileSync(new URL('./content-competitors.prompt.txt', import.meta.url), 'utf8');
const all = [['rss', rss], ['pieces', pcs], ['competitors', cmp]];
t('Ola A: los tres prompts obedecen la compuerta (skip → [SILENT]) y terminan en [SILENT]', all.every(([, x]) => /COMPUERTA/.test(x) && /mode=skip/.test(x) && /exactamente «\[SILENT\]»/i.test(x)));
t('Ola A: los tres registran la corrida con report_content_job y su tipo', /kind="content_rss"/.test(rss) && /kind="content_pieces"/.test(pcs) && /kind="competitor_intel"/.test(cmp) && all.every(([, x]) => /report_content_job/.test(x)));
t('Ola A: ninguno publica, programa ni contacta, y ninguno trae claves', all.every(([, x]) => /no publicas|Nada se publica|no contactes|no contactas/i.test(x)) && all.every(([, x]) => !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|Bearer [A-Za-z0-9]{20})/.test(x)));
t('Ola A: RSS exige abrir la URL y cita LITERAL, marcar todos los revisados y no redactar piezas', /LITERALMENTE/.test(rss) && /rss_items\(action="mark"/.test(rss) && /NO redactes la pieza/.test(rss));
t('Ola A: piezas autónomas solo linkedin_page (linkedin_profile es de Christian), origin autonomous, sin comment_keyword', /linkedin_profile está PROHIBIDO/.test(pcs) && /origin="autonomous"/.test(pcs) && /NUNCA inventes un recurso ni uses comment_keyword/.test(pcs) && /schedule_suggestion: null/.test(pcs));
t('/ops V2: el prompt de piezas conoce el ritmo semanal (5/semana, no fabricar por llenar la cola, variedad como guía)', /objetivo 5 piezas por semana/.test(pcs) && /NO fabriques piezas solo por llenar la cola/.test(pcs) && /Guía de variedad/.test(pcs) && /URGENTE=/.test(pcs));
t('Ola A: piezas reutilizan recursos existentes y respetan la cola', /content_resources\(action="list"/.test(pcs) && /pieces_allowed/.test(pcs) && /blocked \(cola llena: detente/.test(pcs));
t('Ola A: inteligencia orgánica es solo fuentes públicas, no copia, páginas leídas reales y no es Ads Radar', /PÚBLICAS/.test(cmp) && /sin iniciar sesión/.test(cmp) && /NO es copiar/.test(cmp) && /NO es el radar de anuncios pagados/.test(cmp) && /SOLO las URLs que abriste/.test(cmp) && /nunca adivines un sitio|no adivines|Nunca adivines|no lo encuentras con certeza/i.test(cmp));
// ---- Ola B · Cold Email v2: los dos radares redactan con la filosofía nueva
{
  const r1 = fs.readFileSync(new URL('./prospect-radar.prompt.txt', import.meta.url), 'utf8');
  for (const [name, txt] of [['v2', p], ['v1', r1]]) {
    t('Ola B (' + name + '): el borrador sigue la filosofía Cold Email v2 (una idea, 50–100 palabras, CTA de baja fricción, asunto específico)', /COLD EMAIL v2/.test(txt) && /50–100 palabras/.test(txt) && /baja fricción/.test(txt) && /PROHIBIDO «Una idea para \{empresa\}»/.test(txt) && /NO pidas 15 minutos/.test(txt));
    t('Ola B (' + name + '): ya no ordena abrir con «Vi que…» + hipótesis (la plantilla que aplanaba los correos)', !/Abre con un hecho verificable de la evidencia/.test(txt) && !/sigue con UNA hipótesis marcada como hipótesis/.test(txt) && /varía la apertura/.test(txt));
    t('Ola B (' + name + '): sigue siendo seguro (solo texto, no se envía; sin cifras ni resultados sin respaldo)', /solo texto, NO se envía/.test(txt) && /cifras o resultados que no puedas respaldar/.test(txt));
  }
}

// ---- Ola B · Editorial Brain: el prompt de piezas y la skill conocen los roles por canal y la decisión visual
{
  const skill = fs.readFileSync(new URL('./skills/atacama-ops/SKILL.md', import.meta.url), 'utf8');
  t('Ola B: el job de piezas llama editorial_plan antes de escribir y declara editorial_type + visual', /editorial_plan\(topic, summary/.test(pcs) && /"editorial_type"/.test(pcs) && /"visual":\{"need"/.test(pcs) && /publish=false NO escribas/.test(pcs));
  t('Ola B: el job autónomo no escribe por Christian ni por Instagram (solo la propuesta de linkedin_page)', /SOLO la propuesta de linkedin_page/.test(pcs) && /linkedin_profile está PROHIBIDO/.test(pcs));
  t('Ola B: reglas de marca visual en el prompt (sin robots/neón/cyber/circuitos; no es un hero de la web)', /PROHIBIDO robots, hologramas, cyber, neón, circuitos decorativos, glow/.test(pcs) && /NO es un hero/.test(pcs) && /#0F5CED/.test(pcs));
  t('Ola B: la skill define el rol de cada cuenta y los comandos naturales (versión personal, Instagram, imagen, diagrama, recurso)', /LinkedIn Christian/.test(skill) && /Instagram Atacama Labs/.test(skill) && /hazme una versión para LinkedIn personal/.test(skill) && /adapta esto para Instagram/.test(skill) && /submit_content_piece\(origin="explicit"\)/.test(skill) && /NO uses publish_content/.test(skill));
}

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
