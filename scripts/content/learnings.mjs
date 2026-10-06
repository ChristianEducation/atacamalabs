#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — consulta de aprendizajes (para quien vaya a proponer o generar contenido nuevo).
 *
 * Llama al workflow n8n «16 Content Learnings» (GET autenticado) y muestra, sin secretos:
 *   - hooks que NO se deben repetir (publicados o en revisión),
 *   - aprendizajes por pieza (qué funcionó / qué no / hipótesis) y agregados orientativos (n<5 = tentativo, sin causalidad).
 *
 * Uso: node scripts/content/learnings.mjs [--json]
 * Requiere N8N_BASE_URL y ATACAMA_INGEST_KEY (en .env.local o en el entorno).
 */
import fs from 'node:fs';

function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
    txt.split(/\r?\n/).forEach((l) => { const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) { const k = l.slice(0, i).trim(); if (!(k in env)) env[k] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } });
  } catch { /* sin .env.local: se usa el entorno */ }
  return env;
}

const env = loadEnv();
if (!env.N8N_BASE_URL || !env.ATACAMA_INGEST_KEY) { console.error('Faltan N8N_BASE_URL o ATACAMA_INGEST_KEY.'); process.exit(2); }
const res = await fetch(env.N8N_BASE_URL.replace(/\/$/, '') + '/webhook/atacama-content-learnings', { headers: { 'X-Atacama-Key': env.ATACAMA_INGEST_KEY } });
if (!res.ok) { console.error('El workflow 16 respondió HTTP ' + res.status); process.exit(1); }
const data = await res.json();
if (process.argv.includes('--json')) { console.log(JSON.stringify(data, null, 2)); process.exit(0); }

console.log(`Aprendizajes disponibles: ${data.n_learnings}`);
console.log(data.note);
console.log('\nNo repetir estos hooks:');
const hooks = new Set([...(data.do_not_repeat_hooks || []), ...((data.recent_pieces || []).map((p) => p.hook).filter(Boolean))]);
if (!hooks.size) console.log('  (ninguno todavía)');
hooks.forEach((h) => console.log('  - ' + h));
for (const [title, list] of [['Por canal', data.by_channel], ['Por categoría', data.by_category], ['Por formato', data.by_format]]) {
  if (!list || !list.length) continue;
  console.log('\n' + title + ' (promedio de interacciones propias, solo orientativo):');
  list.forEach((g) => console.log(`  ${g.key}: n=${g.n}${g.tentative ? ' (tentativo)' : ''}, promedio=${g.avg_actions ?? 'sin datos'}`));
}
(data.learnings || []).forEach((l) => {
  console.log(`\n· ${l.channel} · ${l.category} · «${l.hook}» (score inicial ${l.initial_score}, interacciones ${l.actions ?? 'sin datos'}, confianza ${l.confidence})`);
  (l.worked || []).forEach((x) => console.log('    + ' + x));
  (l.not_worked || []).forEach((x) => console.log('    - ' + x));
  (l.hypotheses || []).forEach((x) => console.log('    ? ' + x));
});
