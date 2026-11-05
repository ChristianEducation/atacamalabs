#!/usr/bin/env node
/**
 * Atacama OS · Ola A — datos iniciales (idempotente): feeds RSS, competidores, preguntas de Founder Interview y el primer recurso.
 *
 *   node scripts/content/seed-ola-a.mjs            → inserta lo que falte (no pisa lo que Christian ya editó)
 *   node scripts/content/seed-ola-a.mjs --dry-run  → solo muestra qué insertaría
 *
 * Variables: .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). No imprime secretos.
 * Todo es CONFIGURABLE después desde Supabase (o con Hermes): las fuentes no están en el código de los workflows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const DRY = process.argv.includes('--dry-run');
const BASE = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
const call = async (p, method = 'GET', body, prefer) => { const r = await fetch(BASE + p, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j }; };

// 5–10 fuentes buenas y verificadas (HTTP 200 + XML válido el 8-oct-2026). Anthropic y Meta/WhatsApp no publican RSS oficial: los cubre el Content Radar leyendo sus changelogs.
export const FEEDS = [
  { slug: 'openai-news', name: 'OpenAI · News', url: 'https://openai.com/news/rss.xml', topic: 'modelos y agentes (OpenAI)', priority: 7 },
  { slug: 'n8n-blog', name: 'n8n · Blog', url: 'https://blog.n8n.io/rss/', topic: 'automatización y agentes con n8n', priority: 9 },
  { slug: 'supabase-blog', name: 'Supabase · Blog', url: 'https://supabase.com/rss.xml', topic: 'base de datos, auth y edge functions', priority: 6 },
  { slug: 'google-ai-blog', name: 'Google · AI', url: 'https://blog.google/technology/ai/rss/', topic: 'IA de Google (Gemini)', priority: 5 },
  { slug: 'google-developers', name: 'Google · Developers', url: 'https://developers.googleblog.com/feeds/posts/default', topic: 'APIs y herramientas para agentes (Gemini, MCP)', priority: 7 },
  { slug: 'cloudflare-ai', name: 'Cloudflare · AI', url: 'https://blog.cloudflare.com/tag/ai/rss/', topic: 'agentes, MCP e infraestructura de IA', priority: 6 },
  { slug: 'zapier-blog', name: 'Zapier · Blog', url: 'https://zapier.com/blog/feeds/latest/', topic: 'automatización para pymes', priority: 6 },
];

// Seed de investigación orgánica (solo fuentes públicas). Se editan desde Supabase. Eclectica: dominio sin confirmar → Hermes lo busca, no se inventa.
export const COMPETITORS = [
  { slug: 'iautomatiza', name: 'IAutomatiza', domain: 'iautomatiza.cl', urls: ['https://iautomatiza.cl'], notes: 'Chile · automatización con IA para empresas' },
  { slug: 'vambe', name: 'Vambe', domain: 'vambe.ai', urls: ['https://www.vambe.ai', 'https://www.vambe.ai/reads'], notes: 'Agentes conversacionales de ventas y atención (blog: /reads)' },
  { slug: 'eclectica', name: 'Eclectica', domain: null, urls: [], notes: 'Dominio por confirmar: buscar su sitio y redes públicas; si no se encuentra con certeza, dejarlo sin escanear (no inventar).' },
  { slug: 'respond-io', name: 'respond.io', domain: 'respond.io', urls: ['https://respond.io/blog'], notes: 'Plataforma de conversaciones por WhatsApp/mensajería (blog público)' },
];

// Preguntas ancladas en hechos REALES ya documentados (nunca genéricas). El `context` es lo que Hermes debe mostrarle a Christian junto a la pregunta.
export const QUESTIONS = [
  { priority: 9, topic: 'decisiones', question: 'En Atacama OS cada correo comercial lo apruebas tú con un código y hay un tope de 5 al día. ¿Por qué decidiste no dejar que se envíen solos? ¿Qué te haría cambiar de opinión?', context: 'Real: diseño del motor de correo (aprobación humana por código obligatoria, tope diario 5, ventana horaria; docs/ATACAMA-OS-ARQUITECTURA-FINAL.md §9).' },
  { priority: 9, topic: 'errores', question: 'Descubriste que 4 correos salieron del buzón de envío sin pasar por Atacama OS porque otra herramienta usaba el mismo buzón. ¿Cómo te diste cuenta, qué sentiste y qué cambiaste después?', context: 'Real: pendiente heredado del Bloque 1, documentado en docs/ATACAMA-OS-ARQUITECTURA-FINAL.md §10 (punto 8).' },
  { priority: 8, topic: 'aprendizajes', question: 'En la prueba de punta a punta, los workflows respondían «ok» aunque Supabase hubiera fallado por red. ¿Cómo lo detectaste y qué te enseñó sobre confiar en que una automatización "funcionó"?', context: 'Real: Bloque 3, workflows 25 y 26 respondían ok ante fallos silenciosos; se agregaron reintentos y ok:false (docs/ATACAMA-OS-IMPLEMENTATION.md B3.1).' },
  { priority: 8, topic: 'agentes', question: 'Hermes inventó identificadores de solicitud durante las pruebas y el servidor los ignora. ¿Qué aprendiste de dejar que un agente de IA opere tu CRM y qué controles pusiste para no confiar en su criterio?', context: 'Real: docs/HERMES-OPERATOR.md §4 (el servidor MCP ignora los request_id inventados por el modelo; niveles de permiso 1/2/3 aplicados en n8n, no en el prompt).' },
  { priority: 7, topic: 'contenido', question: 'El generador de fechas mandaba las publicaciones a 7 días sin que nadie lo hubiera pedido. ¿Cómo te diste cuenta y qué regla de publicación dejaste?', context: 'Real: corrección del 7-oct-2026 en el Content Intake (noticia ≤24 h, normal ≤48 h, evergreen ≤72 h).' },
  { priority: 7, topic: 'cuello de botella', question: 'Pusiste un tope de piezas en revisión: si hay 6 pendientes, el sistema deja de proponer. ¿Por qué el cuello de botella real es tu tiempo de revisión y no la generación de ideas?', context: 'Real: Content Queue Governor (Ola A, 8-oct-2026), max_pending_in_review=6.' },
  { priority: 6, topic: 'clientes', question: 'Cuando se gana una venta, el sistema crea solo la empresa, el servicio y el proyecto, pero deja las tareas de onboarding para ti. ¿Qué decidiste que NO debía automatizarse al cerrar un cliente, y por qué?', context: 'Real: workflow 11 Won to Client + 4 tareas de onboarding en GHL (docs/ATACAMA-OS-ARQUITECTURA-FINAL.md §1).' },
  { priority: 6, topic: 'arquitectura', question: 'GHL es la verdad comercial y Supabase guarda la evidencia. ¿Qué problema concreto te hizo separar esas dos cosas en vez de usar solo una?', context: 'Real: arquitectura de Atacama OS (GHL = verdad comercial · Supabase = estado/evidencia/auditoría · n8n = orquestación).' },
];

export const RESOURCE = {
  slug: 'que-proceso-automatizar-primero', name: 'Qué proceso de tu empresa automatizar primero', type: 'checklist', topic: 'priorización de automatización', audience: 'dueños y gerentes de pymes en Chile',
  problem: 'No sabes por dónde partir a automatizar y terminas automatizando lo que menos importa: este checklist te ayuda a elegir el primer proceso con cinco criterios simples.',
  cta_mode: 'resource_link', cta_copy: 'Checklist: qué proceso automatizar primero', url: 'https://atacamalabs.cl/recursos/que-proceso-automatizar-primero', status: 'draft', created_by: 'claude-code',
  metadata: { page: 'src/app/(site)/recursos/[slug]/page.tsx', note: 'Pasa a active cuando la URL responde 200 en producción.' },
};

async function main() {
  const out = {};
  const existing = async (table, col) => new Set(((await call(`${table}?select=${col}&limit=1000`)).j || []).map((r) => r[col]));
  const seedTable = async (table, col, rows) => {
    const have = await existing(table, col);
    const todo = rows.filter((r) => !have.has(r[col]));
    out[table] = { total: rows.length, new: todo.length };
    if (!DRY && todo.length) { const r = await call(table, 'POST', todo, 'return=minimal'); if (r.s >= 300) throw new Error(table + ' HTTP ' + r.s + ': ' + JSON.stringify(r.j).slice(0, 200)); }
  };
  await seedTable('content_feeds', 'slug', FEEDS);
  await seedTable('content_competitors', 'slug', COMPETITORS);
  await seedTable('founder_questions', 'question', QUESTIONS);
  await seedTable('content_resources', 'slug', [RESOURCE]);
  console.log(DRY ? '(dry-run)' : 'listo', JSON.stringify(out));
}
if (process.argv[1] && process.argv[1].endsWith('seed-ola-a.mjs')) main().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
