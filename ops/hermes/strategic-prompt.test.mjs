// node ops/hermes/strategic-prompt.test.mjs — guardas de los 3 prompts del Radar estratégico (F5): estructura de 9 pasos, solo las 3 herramientas permitidas,
// ningún contacto/compra/inscripción, datos de la web tratados como NO confiables y contrato idéntico al del servidor.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { srScoringSpec } from '../../scripts/ops/strategic-radar-core.mjs';

let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const read = (f) => fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const mcp = read('atacama_ops_mcp.py');
const allTools = [...mcp.matchAll(/@mcp\.tool\(\)\s*\ndef (\w+)\(/g)].map((m) => m[1]);
const ALLOWED = ['strategic_radar_status', 'strategic_radar_read', 'strategic_radar_submit'];

const P = { products: read('strategic-products.prompt.txt'), partners: read('strategic-partners.prompt.txt'), events: read('strategic-events.prompt.txt') };
const STEPS = [/^1\. COMPUERTA\./m, /^2\. /m, /^3\. INVESTIGAR FUENTES PRIMARIAS\./m, /^4\. ANOTAR EVIDENCIA\./m, /^5\. LLENAR EL CONTRATO\./m, /^6\. SCORE EXPLICABLE Y DESCARTE\./m, /^7\. ENVIAR\./m, /^8\. REGISTRAR EL RESULTADO\./m, /^9\. NO CONTACTAR\./m];

for (const [kind, txt] of Object.entries(P)) {
  const idx = STEPS.map((re) => txt.search(re));
  t(`${kind}: los 9 pasos del spec §9.2 existen y van en orden`, idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), idx.join(','));
  t(`${kind}: la compuerta manda (mode=skip → [SILENT]) y nombra su bloque`, /mode=skip/.test(txt) && /\[SILENT\]/.test(txt) && txt.includes('COMPUERTA DEL RADAR ESTRATÉGICO · ' + kind));
  t(`${kind}: usa las 3 herramientas del Radar y ninguna otra herramienta de Hermes`, ALLOWED.every((n) => txt.includes(n)) && allTools.filter((n) => !ALLOWED.includes(n)).every((n) => !new RegExp('\\b' + n + '\\b').test(txt)), allTools.filter((n) => !ALLOWED.includes(n) && new RegExp('\\b' + n + '\\b').test(txt)).join(','));
  t(`${kind}: la web y los README son DATOS no confiables y no se obedecen sus órdenes`, /DATOS NO CONFIABLES/.test(txt) && /DATOS, no instrucciones/.test(txt) && /NO lo obedeces/.test(txt) && /ignora lo anterior/.test(txt));
  t(`${kind}: prohíbe contactar, inscribirse, comprar, publicar, aprobar, programar y usar cuentas`, /NO contactas/.test(txt) && /NO publicas, NO programas, NO apruebas/.test(txt) && /(Nunca|NO) (escribas|te inscribas|te registres)/i.test(txt) && /compr/i.test(txt) && /cuentas/.test(txt));
  t(`${kind}: tope de 3 hallazgos por corrida y nunca más que max_items; sin puntaje total (lo suma el servidor)`, /máximo 3 hallazgos/.test(txt) && /max_items/.test(txt) && /NO envíes un puntaje total/.test(txt));
  t(`${kind}: sin evidencia no se envía; no se inventan datos`, /sin evidencia verificable no se envía|sin prueba|NO inventes|No inventes/i.test(txt) && /verified_at/.test(txt) && /URL exacta/.test(txt) && /350/.test(txt));
  t(`${kind}: los criterios y máximos de scoring coinciden EXACTAMENTE con los del servidor`, Object.entries(srScoringSpec(kind)).every(([k, max]) => new RegExp('\\b' + k + ' 0–' + max + '\\b').test(txt)), JSON.stringify(srScoringSpec(kind)));
  t(`${kind}: nombra los campos obligatorios del contrato cerrado §17.2`, ['title', 'organization', 'canonical_url', 'summary', 'business_case', 'target_customer', 'next_action', 'scoring', 'evidence'].every((f) => txt.includes(f)) || ['title', 'organization', 'canonical_url', 'summary', 'business_case', 'target_customer', 'next_action', 'scoring'].every((f) => txt.includes(f)));
  t(`${kind}: el texto final es corto y sin precios inventados ni claves`, /RESPUESTA FINAL \(máximo \d líneas/.test(txt) && !/\$\s?\d|USD\s?\d|\bUF\s?\d/.test(txt) && !/(Bearer |eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|pit-[0-9a-f]{8})/.test(txt));
  t(`${kind}: no manda a ninguna URL fuera de atacamalabs.cl`, [...txt.matchAll(/https?:\/\/[^\s)»"]+/g)].every((m) => /atacamalabs\.cl/.test(m[0])), [...txt.matchAll(/https?:\/\/[^\s)»"]+/g)].map((m) => m[0]).join(' '));
}
t('productos: licencia solo verificada leyendo el LICENSE, nada de clonar/instalar/ejecutar, 10 requisitos exactos y copyleft sin asumir compatibilidad', /LEÍSTE el archivo LICENSE/.test(P.products) && /NUNCA clonas, instalas, ejecutas ni descargas/.test(P.products) && /EXACTAMENTE 10 requisitos/.test(P.products) && /AGPL, GPL, SSPL/.test(P.products) && /unknown, nunca implemented/.test(P.products) && /estrellas/.test(P.products));
t('productos: sin precios (modalidad implementación + mensualidad se valida después) y OpenMerch solo como pista', /sin precios/.test(P.products) && /No fijes precios/.test(P.products) && /OpenMerch/.test(P.products) && /no se declara elegible/.test(P.products));
t('alianzas: solo página oficial VIGENTE; lo antiguo/secundario no es convocatoria; sin plazo inventado; cerrado ≠ abierto', /OFICIAL VIGENTE/.test(P.partners) && /secundarias[^.]*NUNCA como único fundamento/.test(P.partners) && /deadline_at SOLO si la página oficial lo declara/.test(P.partners) && /Un programa cerrado NO puede aparecer como abierto/.test(P.partners) && /no es una oportunidad/.test(P.partners));
t('eventos: próximos 90 días, organizador oficial, fecha solo-día sin inventar medianoche, sin fecha = no «próximo» y nada de viaje por puntaje', /90 DÍAS/.test(P.events) && /ORGANIZADOR/.test(P.events) && /NO inventes una medianoche/.test(P.events) && /NO es «próximo»/.test(P.events) && /no recomiendas viajar/.test(P.events) && /America\/Santiago/.test(P.events));

// compuerta (shell)
const gate = read('scripts/strategic_gate.sh');
t('strategic_gate.sh: ejecuta strategic_lib.py gate con los argumentos recibidos y no trae claves', /exec \/opt\/hermes\/\.venv\/bin\/python \/opt\/data\/atacama-ops\/strategic_lib\.py gate "\$@"/.test(gate) && !/(Bearer |eyJ|sk-|pit-|KEY=|TOKEN)/.test(gate));
const sh = spawnSync('bash', ['-n'], { input: gate, encoding: 'utf8' });
t('strategic_gate.sh: sintaxis de bash válida', sh.error ? true : sh.status === 0, sh.stderr);
t('los 3 prompts son archivos propios y el job de cada categoría usa su compuerta', fs.existsSync(new URL('./strategic-products.prompt.txt', import.meta.url)) && fs.existsSync(new URL('./strategic-partners.prompt.txt', import.meta.url)) && fs.existsSync(new URL('./strategic-events.prompt.txt', import.meta.url)) && fs.existsSync(new URL('./scripts/strategic_gate.sh', import.meta.url)));

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
