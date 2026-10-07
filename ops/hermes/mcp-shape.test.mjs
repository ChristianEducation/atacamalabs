// node ops/hermes/mcp-shape.test.mjs — guardas del servidor MCP de Hermes (lección del 7-oct: herramientas definidas DESPUÉS de mcp.run() nunca se registran)
import fs from 'node:fs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const s = fs.readFileSync(new URL('./atacama_ops_mcp.py', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const main = s.indexOf('if __name__ == "__main__"');
const tools = [...s.matchAll(/@mcp\.tool\(\)\s*\ndef (\w+)\(/g)];
t('hay un único arranque del servidor y es lo último del archivo', main > 0 && s.indexOf('mcp.run()') > main && s.slice(s.indexOf('mcp.run()')).trim() === 'mcp.run()');
t('ninguna herramienta se define después del arranque', tools.every((m) => m.index < main), tools.filter((m) => m.index > main).map((m) => m[1]).join(','));
t('42 herramientas registradas (35 + 7 de LinkedIn) y sin nombres repetidos', tools.length === 42 && new Set(tools.map((m) => m[1])).size === tools.length, String(tools.length));
t('las herramientas de LinkedIn existen', ['linkedin_ready', 'linkedin_status', 'recommend_channel', 'approve_linkedin', 'log_linkedin_event', 'linkedin_config', 'waalaxy_lists'].every((n) => tools.some((m) => m[1] === n)));
t('el MCP no expone cambiar el modo ni la lista de LinkedIn (set_config es solo del administrador)', !/set_config/.test(s));
t('sin secretos incrustados', !/(pit-[0-9a-f]{8}|eyJ[A-Za-z0-9_-]{20}|sk-[A-Za-z0-9]{20}|Bearer [A-Za-z0-9]{20})/.test(s));
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
