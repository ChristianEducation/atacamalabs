// node ops/hermes/mcp-shape.test.mjs — guardas del servidor MCP de Hermes (lección del 7-oct: herramientas definidas DESPUÉS de mcp.run() nunca se registran)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const s = fs.readFileSync(new URL('./atacama_ops_mcp.py', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const main = s.indexOf('if __name__ == "__main__"');
const tools = [...s.matchAll(/@mcp\.tool\(\)\s*\ndef (\w+)\(/g)];
t('hay un único arranque del servidor y es lo último del archivo', main > 0 && s.indexOf('mcp.run()') > main && s.slice(s.indexOf('mcp.run()')).trim() === 'mcp.run()');
t('ninguna herramienta se define después del arranque', tools.every((m) => m.index < main), tools.filter((m) => m.index > main).map((m) => m[1]).join(','));
t('73 herramientas registradas (39 + 7 de LinkedIn + 8 de Ola A + 7 de Contacto preparado + save_story_proposal + 3 de Ideas v3 + 3 del Taller + 2 de Aprendizaje + 3 del Radar estratégico) y sin nombres repetidos', tools.length === 73 && new Set(tools.map((m) => m[1])).size === tools.length, String(tools.length));
t('las herramientas de LinkedIn existen', ['linkedin_ready', 'linkedin_status', 'recommend_channel', 'approve_linkedin', 'log_linkedin_event', 'linkedin_config', 'waalaxy_lists'].every((n) => tools.some((m) => m[1] === n)));
t('el MCP no expone cambiar el modo ni la lista de LinkedIn (set_config es solo del administrador)', !/set_config/.test(s));
t('las herramientas de Ola A existen', ['content_queue', 'founder_interview', 'submit_content_piece', 'content_resources', 'rss_items', 'competitor_intel', 'content_signals', 'report_content_job'].every((n) => tools.some((m) => m[1] === n)));
t('Ola A no publica ni envía: ninguna herramienta nueva llama a publicar/enviar y submit_content_piece solo habla con el Content Intake', (() => { const i = s.indexOf('# ---------------------------------------------------------------- Ola A'); const blk = s.slice(i, s.indexOf('# ---------------------------------------------------------------- Contacto preparado')); return !/send_email|publish_content|approve_|waalaxy|leadconnector/i.test(blk) && /atacama-content-intake/.test(blk); })());
t('submit_content_piece usa origin autonomous por defecto (el servidor bloquea con la cola llena)', /def submit_content_piece\([^)]*origin: str = "autonomous"/.test(s));
t('sin secretos incrustados', !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|Bearer [A-Za-z0-9]{20})/.test(s));
t('Contacto preparado: existen las 7 herramientas y NINGUNA puede encender el autoenvío, aprobar ni enviar', ['prep_queue', 'style_samples', 'prep_summary', 'set_prep_state', 'save_linkedin_prep', 'log_linkedin_manual', 'save_contact'].every((n) => tools.some((m) => m[1] === n)) && (() => { const a = s.indexOf('# ---------------------------------------------------------------- Contacto preparado'); const body = s.slice(a, s.indexOf(main < a ? 'zzzz' : 'if __name__')); return !/autosend_set|autosend_enabled|approve_outreach|send_email|"action": "autosweep"/.test(body.replace(/Aprobar y enviar sigue siendo[^\n]*/, '')); })());
t('Ideas v3: existen ideas_context, propose_ideas y revise_idea y NO aprueban, programan ni publican', ['ideas_context', 'propose_ideas', 'revise_idea'].every((n) => tools.some((m) => m[1] === n)) && (() => { const a = s.indexOf('# ---------------------------------------------------------------- Ideas de la semana'); const blk = s.slice(a, s.indexOf('if __name__')); return a > 0 && !/idea_decide|approve|publish|send_email|leadconnector|social-media-posting/i.test(blk.replace(/NO aprueba|No aprueba|ni publica|NO publica|NO produce|source_published_at/g, '')); })());
t('Aprendizaje v3: learning_context y propose_learning existen y solo proponen (sin decidir, aplicar, publicar ni enviar)', ['learning_context', 'propose_learning'].every((n) => tools.some((m) => m[1] === n)) && (() => { const a = s.indexOf('# ---------------------------------------------------------------- Aprendizaje semanal'); const blk = s.slice(a, s.indexOf('# ---------------------------------------------------------------- Taller')); return a > 0 && !/learning_decide|approve|publish|send_email|leadconnector|PATCH/i.test(blk); })());
t('Taller v3: taller_next, taller_produce y taller_help existen; no programan ni publican y Higgsfield queda bloqueado por defecto', ['taller_next', 'taller_produce', 'taller_help'].every((n) => tools.some((m) => m[1] === n)) && (() => { const a = s.indexOf('# ---------------------------------------------------------------- Taller · producción'); const blk = s.slice(a, s.indexOf('if __name__')); return a > 0 && /generator: str = "sim"/.test(blk) && !/taller_schedule|social-media-posting|leadconnector|approve/i.test(blk); })());

// Radar estratégico (F5): solo investigación y registro. Ninguna herramienta contacta, aplica, compra, inscribe, toca GHL ni empuja a git.
{
  const body = (name) => { const i = s.indexOf('def ' + name + '('); const j = s.indexOf('@mcp.tool()', i); return s.slice(i, j > 0 ? j : s.indexOf('if __name__')); };
  const names = ['strategic_radar_status', 'strategic_radar_submit', 'strategic_radar_read'];
  const lib = fs.readFileSync(new URL('./strategic_lib.py', import.meta.url), 'utf8');
  t('Radar estratégico: existen strategic_radar_status, strategic_radar_submit y strategic_radar_read', names.every((n) => tools.some((m) => m[1] === n)));
  const rad = names.map(body).join('\n');
  t('Radar estratégico: las tres herramientas solo hablan con n8n 25 (strategic_gate, strategic_view, strategic_ingest)', [...rad.matchAll(/"action":\s*"(\w+)"/g)].length >= 3 && [...rad.matchAll(/"action":\s*"(\w+)"/g)].every((m) => ['strategic_gate', 'strategic_view', 'strategic_ingest'].includes(m[1])) && [...rad.matchAll(/post_ops\(/g)].length >= 3);
  t('Radar estratégico: sin contacto, correo, GHL, compra, inscripción, push ni llamadas directas a la red', !/send_email|send_whatsapp|publish_content|ghl|gohighlevel|purchase|enroll|git push|urlopen|requests\.|subprocess|os\.system|open\(/i.test(rad));
  t('Radar estratégico: la huella la calcula el código (strategic_lib.check_submit), no la IA; tope de 12 ítems y 80 KB', /from strategic_lib import check_submit/.test(rad) && /uuid\.uuid4\(\)/.test(rad) && /MAX_ITEMS = 12/.test(lib) && /80 \* 1024/.test(lib) && /it\.pop\("fingerprint"/.test(lib));
  t('Radar estratégico: test y dry_run existen en submit y las compuertas las decide el servidor, no la herramienta', /test: bool = False/.test(body('strategic_radar_submit')) && /dry_run: bool = False/.test(body('strategic_radar_submit')) && !/products_enabled|events_enabled|partners_enabled|production_enabled/.test(rad));
}
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
