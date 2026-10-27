// node ops/hermes/strategic-monitor.test.mjs — corre las pruebas Python del monitor de producción del Radar (sin red real) y suma sus resultados al runner.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };

const py = process.platform === 'win32' ? 'python' : 'python3';
const r = spawnSync(py, ['-B', path.join(here, 'strategic_monitor_test.py')], { encoding: 'utf8', timeout: 120000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
const txt = (r.stdout || '') + (r.stderr || '');
const m = txt.match(/Ran (\d+) tests?/);
t('Python disponible y las pruebas del monitor corren', !r.error && !!m, r.error ? String(r.error) : txt.slice(-300));
t('todas las pruebas Python del monitor pasan', r.status === 0 && /\nOK\s*$/.test(txt.trimEnd() + '\n'), txt.slice(-600));
if (m) for (let i = 1; i < Number(m[1]); i++) pass++; // cada prueba Python cuenta en el total

const mon = fs.readFileSync(path.join(here, 'scripts', 'strategic_prod_monitor.py'), 'utf8');
t('el monitor no importa nada fuera de la librería estándar y de atacama_common', [...mon.matchAll(/^(?:import|from) (\w+)/gm)].every((x) => ['argparse', 'datetime', 'http', 'ipaddress', 'json', 'os', 're', 'socket', 'ssl', 'sys', 'time', 'urllib', 'atacama_common'].includes(x[1])));
t('el monitor jamás sigue redirecciones por su cuenta (usa conexión a la IP validada)', /class PinnedHTTPSConnection/.test(mon) && !/urlopen|requests\./.test(mon));
t('el monitor no tiene URLs de producción incrustadas', !/https?:\/\/(?!app\.example|other\.example|\.\.\.)[a-z0-9.-]+\.(cl|com|app|dev|io|net)/i.test(mon.replace(/ejemplo|example\.org/g, '')));
console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
