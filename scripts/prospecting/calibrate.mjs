#!/usr/bin/env node
/**
 * Calibración del scoring del Prospect Gateway con un HTML real de fichas (NO importa nada, no toca red, no escribe en ningún sistema).
 * Uso: node scripts/prospecting/calibrate.mjs <ruta-al-html> [--detail] [--json]
 */
import fs from 'node:fs';
import { parseHtmlProspects, toCandidate, scoreCandidate, decideCandidate, buildIndex, matchCandidate, candidateKeys, primaryKey } from './gateway-core.mjs';

const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/prospecting/calibrate.mjs <html> [--detail] [--json]'); process.exit(2); }
const raws = parseHtmlProspects(fs.readFileSync(file, 'utf8'));
const cands = raws.map((r) => toCandidate(r, { source_type: 'html', source_name: r.source_name, source_reference: r.source_reference }));
const entries = [];
const rows = cands.map((c) => {
  const sc = scoreCandidate(c);
  const matches = matchCandidate(c, buildIndex(entries));
  const dec = decideCandidate(c, sc, matches, { ghl_index_complete: true });
  entries.push({ system: 'supabase_candidate', id: primaryKey(c), keys: candidateKeys(c) });
  return { c, sc, dec };
});
const bands = { alta: 0, valida: 0, pendiente: 0, archivo: 0 };
rows.forEach((r) => { bands[r.sc.band]++; });
const dec = {};
rows.forEach((r) => { dec[r.dec.decision] = (dec[r.dec.decision] || 0) + 1; });
const bySource = {};
rows.forEach((r) => { const s = r.c.source_name; (bySource[s] = bySource[s] || []).push(r); });
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows.map((r) => ({ company: r.c.company_name, source: r.c.source_name, ...r.sc, decision: r.dec.decision })), null, 1)); process.exit(0); }
console.log('Fichas parseadas:', rows.length);
console.log('Bandas:', JSON.stringify(bands), '| decisiones:', JSON.stringify(dec));
for (const [s, rs] of Object.entries(bySource)) {
  const avg = (f) => Math.round(rs.reduce((a, r) => a + f(r), 0) / rs.length);
  const withCh = rs.filter((r) => r.sc.channels.length).length;
  console.log(`\n# ${s} (${rs.length}) · prom. prioridad ${avg((r) => r.sc.priority_score)} (fit ${avg((r) => r.sc.fit_score)}, señal ${avg((r) => r.sc.signal_score)}, alcance ${avg((r) => r.sc.reachability_score)}) · con canal ${withCh} · web ${rs.filter((r) => r.c.website).length} · email ${rs.filter((r) => r.c.contact.email).length} · tel ${rs.filter((r) => r.c.contact.phone).length} · wsp ${rs.filter((r) => r.c.contact.whatsapp).length} · hechos≥1 ${rs.filter((r) => r.c.facts.length).length} · hipótesis ${rs.filter((r) => r.c.commercial_hypotheses.length || r.c.inferences.length).length}`);
  if (process.argv.includes('--detail')) rs.forEach((r) => console.log(`  ${String(r.sc.priority_score).padStart(3)} ${r.sc.band.padEnd(9)} f${String(r.sc.fit_score).padStart(2)} s${String(r.sc.signal_score).padStart(2)} a${String(r.sc.reachability_score).padStart(2)} ${r.dec.decision.padEnd(18)} ${r.c.company_name} | ${r.c.industry || '—'} | ${r.c.location || '—'} | ${r.sc.channels.join(',') || 'SIN CANAL'}`));
}
