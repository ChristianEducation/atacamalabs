#!/usr/bin/env node
/**
 * Atacama OS · guardián de créditos de Higgsfield (Frente B). Es la ÚNICA puerta por la que Hermes usa Higgsfield en la VPS.
 *
 *   higgs-guard status                                  → saldo de la cuenta, gastado esta semana por Atacama OS, tope y reserva
 *   higgs-guard generate create <modelo> [params…] [--wait] [--purpose "para qué"]
 *                                                       → estima el costo (`generate cost`), aplica los topes y, solo si cabe, genera y lo anota
 *   higgs-guard <account|model|voices|upload|generate cost|get|list|wait> …   → consultas sin gasto, pasan tal cual
 * Todo lo demás (website, marketing-studio, soul-id, workflows de pago…) queda BLOQUEADO. Nunca imprime el token.
 * * SOLO modelos de IMAGEN (los videos los hace Christian). Topes (en el registro `/opt/data/state/higgsfield-ledger.json`): semanal 200 créditos (lunes–domingo, hora de Chile), 40 por llamada y reserva de
 * saldo de 300 que Atacama OS no toca. Se mide con el costo estimado de cada generación pedida por Atacama OS, no con el saldo (Christian también
 * usa la web). Sale con código 4 cuando un tope frena la generación.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { hgDecide, hgRecord, hgSpent, hgWeekKey, hgNewLedger, hgClassify, hgParseCost, hgParseJobId, HG_DEFAULTS } from './higgs-guard-core.mjs';

const STATE = process.env.ATACAMA_STATE_DIR || '/opt/data/state';
const LEDGER = path.join(STATE, 'higgsfield-ledger.json');
const BIN = process.env.HIGGSFIELD_BIN || '/opt/data/motion-studio/node_modules/.bin/higgsfield';

export function readLedger(file) { try { return { ...hgNewLedger(), ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return hgNewLedger(); } }
export function writeLedger(file, ledger) { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2)); fs.renameSync(tmp, file); }

const PRE = process.env.HIGGSFIELD_BIN_PREFIX ? [process.env.HIGGSFIELD_BIN_PREFIX] : []; // solo para pruebas (CLI falso en Node)
const run = (args) => spawnSync(BIN, [...PRE, ...args], { encoding: 'utf8', timeout: 20 * 60000, env: process.env });
const balanceOf = () => { const r = run(['account', 'status', '--json']); try { return JSON.parse(r.stdout).credits; } catch { return null; } };

async function main() {
  let args = process.argv.slice(2);
  const out = (s) => process.stdout.write(s + '\n');
  if (!args.length) { out('Uso: higgs-guard status | generate create <modelo> … [--purpose "…"] | consultas'); process.exit(2); }
  const now = Date.now(); const wk = hgWeekKey(now); const ledger = readLedger(LEDGER);
  if (args[0] === 'status') {
    const bal = balanceOf(); const spent = hgSpent(ledger, wk);
    out('Higgsfield · saldo de la cuenta: ' + (bal == null ? 'no se pudo leer' : bal) + ' créditos · Atacama OS gastó ' + spent + ' de ' + ledger.cap + ' esta semana (desde el lunes ' + wk + ') · máximo por llamada ' + ledger.per_call + ' · reserva ' + ledger.reserve);
    return;
  }
  let purpose = '';
  const pi = args.indexOf('--purpose'); if (pi >= 0) { purpose = args[pi + 1] || ''; args = args.filter((_, i) => i !== pi && i !== pi + 1); }
  const c = hgClassify(args);
  if (c.kind === 'blocked') { out(c.message); process.exit(5); }
  if (c.kind === 'passthrough') { const r = run(args); process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || ''); process.exit(r.status == null ? 1 : r.status); }

  // create: estimar → decidir → generar → anotar
  const costArgs = ['generate', 'cost', ...args.slice(2).filter((a) => a !== '--wait'), '--json'];
  const cr = run(costArgs); const cost = hgParseCost(cr.stdout);
  const d = hgDecide({ ledger, weekKey: wk, cost, balance: cost == null ? null : balanceOf() });
  if (!d.ok) { out(d.message + (cr.status ? ' (' + String(cr.stderr || '').trim().split('\n')[0].slice(0, 160) + ')' : '')); fs.appendFileSync(path.join(STATE, 'higgsfield-guard.log'), new Date(now).toISOString() + ' DENEGADO ' + d.reason + ' ' + args[2] + ' cost=' + cost + '\n'); process.exit(4); }
  const r = run([...args.filter((a) => a !== '--json'), '--json']);
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.status !== 0) process.exit(r.status == null ? 1 : r.status);
  writeLedger(LEDGER, hgRecord(ledger, wk, { at: new Date(now).toISOString(), model: args[2], credits: cost, job_id: hgParseJobId(r.stdout), purpose }));
  if (d.warn) out(d.warn);
}
if (process.argv[1] && process.argv[1].endsWith('higgs-guard.mjs')) main().catch((e) => { console.error('ERROR', String(e && e.message).slice(0, 200)); process.exit(1); });
export { HG_DEFAULTS };
