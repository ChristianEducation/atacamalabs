// node ops/hermes/mcp-shape.test.mjs — guardas del servidor MCP de Hermes (lección del 7-oct: herramientas definidas DESPUÉS de mcp.run() nunca se registran)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const s = fs.readFileSync(new URL('./atacama_ops_mcp.py', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const main = s.indexOf('if __name__ == "__main__"');
const tools = [...s.matchAll(/@mcp\.tool\(\)\s*\ndef (\w+)\(/g)];
t('hay un único arranque del servidor y es lo último del archivo', main > 0 && s.indexOf('mcp.run()') > main && s.slice(s.indexOf('mcp.run()')).trim() === 'mcp.run()');
t('ninguna herramienta se define después del arranque', tools.every((m) => m.index < main), tools.filter((m) => m.index > main).map((m) => m[1]).join(','));
t('51 herramientas registradas (36 + 7 de LinkedIn + 8 de Ola A) y sin nombres repetidos', tools.length === 51 && new Set(tools.map((m) => m[1])).size === tools.length, String(tools.length));
t('las herramientas de LinkedIn existen', ['linkedin_ready', 'linkedin_status', 'recommend_channel', 'approve_linkedin', 'log_linkedin_event', 'linkedin_config', 'waalaxy_lists'].every((n) => tools.some((m) => m[1] === n)));
t('el MCP no expone cambiar el modo ni la lista de LinkedIn (set_config es solo del administrador)', !/set_config/.test(s));
t('las herramientas de Ola A existen', ['content_queue', 'founder_interview', 'submit_content_piece', 'content_resources', 'rss_items', 'competitor_intel', 'content_signals', 'report_content_job'].every((n) => tools.some((m) => m[1] === n)));
t('Ola A no publica ni envía: ninguna herramienta nueva llama a publicar/enviar y submit_content_piece solo habla con el Content Intake', (() => { const i = s.indexOf('# ---------------------------------------------------------------- Ola A'); const blk = s.slice(i, s.indexOf('if __name__')); return !/send_email|publish_content|approve_|waalaxy|leadconnector/i.test(blk) && /atacama-content-intake/.test(blk); })());
t('submit_content_piece usa origin autonomous por defecto (el servidor bloquea con la cola llena)', /def submit_content_piece\([^)]*origin: str = "autonomous"/.test(s));
t('sin secretos incrustados', !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|Bearer [A-Za-z0-9]{20})/.test(s));
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
