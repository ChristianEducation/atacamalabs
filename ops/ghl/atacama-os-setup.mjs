#!/usr/bin/env node
/**
 * Atacama OS · Bloque D (modelo de clientes, servicios y proyectos) por API de GHL.
 *
 * Usa EXCLUSIVAMENTE GHL_PRIVATE_INTEGRATION_TOKEN2 (.env.local). Nunca imprime el token.
 * No toca contactos, oportunidades, Social Planner, dashboards ni nada de EnBandeja.
 *
 * Fases (se ejecutan una a una; todas son idempotentes y verifican antes de crear):
 *   node ops/ghl/atacama-os-setup.mjs snapshot            # lee y guarda el estado previo (solo lectura)
 *   node ops/ghl/atacama-os-setup.mjs objects  --apply    # crea los 2 schemas si no existen
 *   node ops/ghl/atacama-os-setup.mjs fields   --apply    # crea los campos de cada schema
 *   node ops/ghl/atacama-os-setup.mjs assoc    --apply    # crea las asociaciones
 *   node ops/ghl/atacama-os-setup.mjs verify              # relee todo y compara (solo lectura)
 *   node ops/ghl/atacama-os-setup.mjs roundtrip --apply   # registros TEST + relaciones, y los elimina
 * Sin --apply cada fase solo simula.
 */
import fs from 'node:fs';

const PHASE = process.argv[2] || 'snapshot';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const TOKEN = env.GHL_PRIVATE_INTEGRATION_TOKEN2;
const LOC = env.GHL_LOCATION_ID;
if (!TOKEN || !LOC) { console.error('Falta GHL_PRIVATE_INTEGRATION_TOKEN2 o GHL_LOCATION_ID en .env.local'); process.exit(1); }
const BASE = 'https://services.leadconnectorhq.com';
const api = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { Authorization: 'Bearer ' + TOKEN, Version: '2021-07-28', Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; }
  return { status: r.status, body: j };
};
const err = (r) => `${r.status} ${String((r.body && (r.body.message || r.body.error || r.body.raw)) || '').slice(0, 200)}`;
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const opts = (arr) => arr.map((x) => ({ key: slug(x), label: x }));
const STATE_FILE = new URL('./atacama-os-state.json', import.meta.url);
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

// ------------------------------------------------------------------ modelo
const OBJECTS = [
  { short: 'servicios_contratados', singular: 'Servicio contratado', plural: 'Servicios contratados', primary: 'Nombre',
    description: 'Algo que un cliente efectivamente compró a Atacama Labs (Atacama OS).',
    fields: [
      { name: 'Servicio / producto', dataType: 'SINGLE_OPTIONS', options: ['Agente de IA', 'Automatización', 'Software a medida', 'Integración', 'Web', 'Ecommerce', 'Otro'] },
      { name: 'Estado', dataType: 'SINGLE_OPTIONS', options: ['Pendiente', 'Onboarding', 'Implementación', 'Activo', 'Pausado', 'Finalizado'] },
      { name: 'MRR', dataType: 'MONETORY' },
      { name: 'Fee de implementación', dataType: 'MONETORY' },
      { name: 'Fecha de inicio', dataType: 'DATE' },
      { name: 'Fecha de término', dataType: 'DATE' },
      { name: 'Próximo paso', dataType: 'TEXT' },
      { name: 'Notas', dataType: 'LARGE_TEXT' },
    ] },
  { short: 'proyectos', singular: 'Proyecto', plural: 'Proyectos', primary: 'Nombre',
    description: 'Trabajo interno o de cliente de Atacama Labs (Atacama OS).',
    fields: [
      { name: 'Tipo', dataType: 'SINGLE_OPTIONS', options: ['Agente', 'Automatización', 'Integración', 'Ecommerce', 'Software', 'Web', 'Contenido', 'Infraestructura', 'Interno'] },
      { name: 'Estado', dataType: 'SINGLE_OPTIONS', options: ['Planificado', 'En desarrollo', 'Bloqueado', 'QA', 'Producción', 'Mantenimiento', 'Finalizado'] },
      { name: 'Responsable', dataType: 'TEXT' },
      { name: 'Prioridad', dataType: 'SINGLE_OPTIONS', options: ['Baja', 'Media', 'Alta', 'Crítica'] },
      { name: 'Fecha de inicio', dataType: 'DATE' },
      { name: 'Fecha objetivo', dataType: 'DATE' },
      { name: 'Progreso %', dataType: 'NUMERICAL' },
      { name: 'Próximo hito', dataType: 'TEXT' },
      { name: 'Repo', dataType: 'TEXT' },
      { name: 'Deployment / URL', dataType: 'TEXT' },
      { name: 'Documentación', dataType: 'TEXT' },
      { name: 'Notas', dataType: 'LARGE_TEXT' },
    ] },
];
const okey = (short) => `custom_objects.${short}`;
// [clave, primer objeto, etiqueta, segundo objeto, etiqueta]
const ASSOCIATIONS = [
  ['ATACAMA_SERVICIO_BUSINESS', okey('servicios_contratados'), 'Servicio contratado', 'business', 'Empresa'],
  ['ATACAMA_SERVICIO_OPPORTUNITY', okey('servicios_contratados'), 'Servicio contratado', 'opportunity', 'Oportunidad'],
  ['ATACAMA_PROYECTO_BUSINESS', okey('proyectos'), 'Proyecto', 'business', 'Empresa'],
  ['ATACAMA_SERVICIO_PROYECTO', okey('servicios_contratados'), 'Servicio contratado', okey('proyectos'), 'Proyecto'],
];

const step = (s) => console.log('\n▶ ' + s);

async function snapshot() {
  step('Estado previo (solo lectura)');
  const biz = await api('GET', `/businesses/?locationId=${LOC}`);
  const objs = await api('GET', `/objects/?locationId=${LOC}`);
  const assoc = await api('GET', `/associations/?locationId=${LOC}&skip=0&limit=100`);
  const co = await api('GET', `/contacts/?locationId=${LOC}&limit=1`);
  const op = await api('GET', `/opportunities/search?location_id=${LOC}&limit=1`);
  const pre = {
    capturedAt: new Date().toISOString(),
    businesses: { status: biz.status, count: (biz.body.businesses || []).length, names: (biz.body.businesses || []).map((b) => b.name) },
    schemas: { status: objs.status, keys: (objs.body.objects || []).map((o) => `${o.key} (${o.type})`) },
    associations: { status: assoc.status, items: (assoc.body.associations || []).map((a) => ({ id: a.id, key: a.key, first: a.firstObjectKey, second: a.secondObjectKey, type: a.associationType })) },
    contactsTotal: co.body.meta && co.body.meta.total, opportunitiesTotal: op.body.meta && op.body.meta.total,
  };
  console.log(JSON.stringify(pre, null, 2));
  const existing = new Set((objs.body.objects || []).map((o) => o.key));
  for (const o of OBJECTS) console.log(`  ¿ya existe ${okey(o.short)}? ${existing.has(okey(o.short))}`);
  state.pre = pre; save();
}

async function objects() {
  for (const o of OBJECTS) {
    step(`Schema ${o.singular} (${okey(o.short)})`);
    const ex = await api('GET', `/objects/${okey(o.short)}?locationId=${LOC}`);
    if (ex.status === 200) { console.log('  = ya existe'); continue; }
    if (!APPLY) { console.log('  (simulación) crear'); continue; }
    const r = await api('POST', '/objects/', { labels: { singular: o.singular, plural: o.plural }, key: okey(o.short), description: o.description, locationId: LOC,
      primaryDisplayPropertyDetails: { name: o.primary, key: `${okey(o.short)}.${slug(o.primary)}`, dataType: 'TEXT' } });
    console.log('  POST /objects →', err(r));
    if (r.status < 300) { state[o.short] = { objectId: r.body.object && r.body.object.id, key: okey(o.short) }; save(); }
  }
}

async function folderFor(objectKey) {
  const list = await api('GET', `/custom-fields/object-key/${objectKey}?locationId=${LOC}`);
  if (list.status === 200 && (list.body.folders || []).length) return { id: list.body.folders[0].id, fields: list.body.fields || [] };
  if (list.status !== 200) console.log('  GET /custom-fields/object-key →', err(list));
  if (!APPLY) return { id: 'FOLDER_SIMULADO', fields: [] };
  const f = await api('POST', '/custom-fields/folder', { objectKey, name: 'Campos', locationId: LOC });
  console.log('  POST /custom-fields/folder →', err(f));
  const id = (f.body.folder && f.body.folder.id) || f.body.id;
  return { id, fields: [] };
}

async function fields() {
  for (const o of OBJECTS) {
    step(`Campos de ${o.singular}`);
    const key = okey(o.short);
    const { id: parentId, fields: have } = await folderFor(key);
    console.log('  carpeta (parentId):', parentId, '· campos actuales:', have.map((f) => f.name).join(', ') || '(solo el principal)');
    const names = new Set(have.map((f) => f.name));
    for (const f of o.fields) {
      if (names.has(f.name)) { console.log('  = ' + f.name); continue; }
      if (!APPLY) { console.log('  (simulación) ' + f.name + ' [' + f.dataType + ']'); continue; }
      const body = { locationId: LOC, objectKey: key, name: f.name, dataType: f.dataType, parentId, showInForms: true,
        fieldKey: `${key}.${slug(f.name)}`, ...(f.options ? { options: opts(f.options) } : {}) };
      let r = await api('POST', '/custom-fields/', body);
      if (r.status >= 400 && /fieldKey|key/i.test(JSON.stringify(r.body))) {
        // La documentación pública muestra a veces el prefijo "custom_object." (singular); se reintenta una vez con esa variante.
        r = await api('POST', '/custom-fields/', { ...body, fieldKey: `custom_object.${o.short}.${slug(f.name)}`, objectKey: key });
      }
      console.log('  ' + f.name.padEnd(24), '→', err(r));
    }
  }
}

async function assocs() {
  const have = await api('GET', `/associations/?locationId=${LOC}&skip=0&limit=100`);
  const keys = new Set((have.body.associations || []).map((a) => a.key));
  for (const [key, a, al, b, bl] of ASSOCIATIONS) {
    step(`Asociación ${key}`);
    if (keys.has(key)) { console.log('  = ya existe'); continue; }
    if (!APPLY) { console.log(`  (simulación) ${a} ↔ ${b}`); continue; }
    const r = await api('POST', '/associations/', { locationId: LOC, key, firstObjectLabel: al, firstObjectKey: a, secondObjectLabel: bl, secondObjectKey: b });
    console.log('  POST /associations →', err(r), r.body && r.body.id ? '· id ' + r.body.id : '');
  }
}

async function verify() {
  step('Verificación (solo lectura)');
  const out = {};
  const objs = await api('GET', `/objects/?locationId=${LOC}`);
  out.schemas = (objs.body.objects || []).map((o) => `${o.key} (${o.type}) id=${o.id}`);
  for (const o of OBJECTS) {
    const g = await api('GET', `/objects/${okey(o.short)}?locationId=${LOC}&fetchProperties=true`);
    const cf = await api('GET', `/custom-fields/object-key/${okey(o.short)}?locationId=${LOC}`);
    out[o.short] = { schema: g.status, objectId: g.body.object && g.body.object.id, primary: g.body.object && g.body.object.primaryDisplayProperty,
      campos: (cf.body.fields || []).map((f) => `${f.name}:${f.dataType}${f.options ? '[' + f.options.length + ']' : ''} key=${f.fieldKey}`) };
  }
  const as = await api('GET', `/associations/?locationId=${LOC}&skip=0&limit=100`);
  out.associations = (as.body.associations || []).map((a) => `${a.key} · ${a.firstObjectKey} ↔ ${a.secondObjectKey} · ${a.associationType} · id=${a.id}`);
  const biz = await api('GET', `/businesses/?locationId=${LOC}`);
  const co = await api('GET', `/contacts/?locationId=${LOC}&limit=1`);
  const op = await api('GET', `/opportunities/search?location_id=${LOC}&limit=1`);
  const pl = await api('GET', `/opportunities/pipelines?locationId=${LOC}`);
  out.coreIntacto = { businesses: (biz.body.businesses || []).length, contacts: co.body.meta && co.body.meta.total, opportunities: op.body.meta && op.body.meta.total, pipelines: (pl.body.pipelines || []).length };
  console.log(JSON.stringify(out, null, 2));
  state.post = out; save();
}

async function roundtrip() {
  step('Prueba de ida y vuelta con registros TEST (se eliminan al final)');
  if (!APPLY) { console.log('  (simulación)'); return; }
  const biz = await api('GET', `/businesses/?locationId=${LOC}`);
  const b0 = (biz.body.businesses || [])[0];
  if (!b0) { console.log('  sin businesses: no se puede probar la relación'); return; }
  const as = await api('GET', `/associations/?locationId=${LOC}&skip=0&limit=100`);
  const byKey = Object.fromEntries((as.body.associations || []).map((a) => [String(a.key).toLowerCase(), a]));
  const created = [];
  const mk = async (short, props) => {
    const r = await api('POST', `/objects/${okey(short)}/records`, { locationId: LOC, properties: props });
    const id = r.body.record && r.body.record.id;
    console.log(`  crear registro TEST en ${short} →`, err(r), id ? '· ' + id : '');
    if (id) created.push({ short, id });
    return id;
  };
  const sv = await mk('servicios_contratados', { nombre: 'TEST ATACAMA OS — borrar' });
  const pr = await mk('proyectos', { nombre: 'TEST ATACAMA OS — borrar' });
  const rec = { [okey('servicios_contratados')]: sv, [okey('proyectos')]: pr, business: b0.id };
  const rels = [];
  const link = async (assocKey, objA, objB) => {
    const a = byKey[assocKey.toLowerCase()];
    if (!a || !rec[objA] || !rec[objB]) { console.log('  (omitido) ' + assocKey); return; }
    // GHL puede invertir el orden de los objetos de la asociación: se respeta el orden guardado
    const [firstKey, secondKey] = [a.firstObjectKey, a.secondObjectKey];
    const r = await api('POST', '/associations/relations', { locationId: LOC, associationId: a.id, firstRecordId: rec[firstKey], secondRecordId: rec[secondKey] });
    console.log('  relación ' + assocKey + ' →', err(r));
    if (r.body && r.body.id) rels.push(r.body.id);
    const back = await api('GET', `/associations/relations/${rec[secondKey]}?locationId=${LOC}&skip=0&limit=10`);
    console.log('    lectura de relaciones del segundo registro →', back.status, '· relaciones:', (back.body.relations || []).length);
  };
  await link('ATACAMA_SERVICIO_BUSINESS', okey('servicios_contratados'), 'business');
  await link('ATACAMA_PROYECTO_BUSINESS', okey('proyectos'), 'business');
  await link('ATACAMA_SERVICIO_PROYECTO', okey('servicios_contratados'), okey('proyectos'));
  for (const id of rels) console.log('  eliminar relación', id, '→', (await api('DELETE', `/associations/relations/${id}?locationId=${LOC}`)).status);
  for (const c of created) console.log('  eliminar registro TEST', c.short, '→', (await api('DELETE', `/objects/${okey(c.short)}/records/${c.id}`)).status);
  const left = await api('POST', `/objects/${okey('proyectos')}/records/search`, { locationId: LOC, page: 1, pageLimit: 5, query: 'TEST ATACAMA' });
  console.log('  registros TEST que quedan en Proyectos:', (left.body.records || []).length);
}

const phases = { snapshot, objects, fields, assoc: assocs, verify, roundtrip };
if (!phases[PHASE]) { console.error('Fase desconocida: ' + PHASE); process.exit(1); }
console.log(`FASE: ${PHASE} · ${APPLY ? 'APLICAR' : 'solo lectura / simulación'}`);
await phases[PHASE]();
