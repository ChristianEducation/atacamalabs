/**
 * Atacama OS · Media Gateway (Ola B · bloque B) — núcleo puro.
 *
 * Capa única de producción visual:  Hermes / Content Engine → Visual Decision → Media Gateway → proveedor o renderer → asset → pieza → in_review.
 *  - La DECISIÓN visual (¿hace falta imagen, y de qué tipo?) ya la toma el Editorial Brain (`visual.need`, 16 valores, `none` incluido).
 *  - El gateway enruta esa necesidad a un proveedor ABSTRACTO y reemplazable. Hoy hay tres: «renderer» (el de carruseles, determinista y con el texto
 *    exacto: es mejor para carruseles, slides tipográficas, comparaciones y checklists), «manual» (Christian sube un asset propio: capturas, fotos) y
 *    «higgsfield» (generativo): PREPARADO pero APAGADO — requiere autorización de Christian y saldo API verificado, y no está probado, así que nunca se
 *    declara operativo. Ningún asset con costo se genera sin autorización explícita.
 *  - Todo asset queda registrado (tabla media_assets): estado visible, error visible, costo, reutilización por hash y asociación con la pieza.
 *  - El gateway NUNCA publica, programa ni aprueba: solo produce assets; la pieza sigue entrando por el Content Intake y termina `in_review`.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo, sin backticks en comentarios de plantillas): se incrustan con
 * Function.prototype.toString en el workflow n8n «30 Media Gateway».
 */

export function mgNeeds() {
  return ['none', 'editorial_image', 'conceptual_image', 'diagram', 'process_flow', 'architecture', 'comparison', 'before_after', 'framework', 'checklist', 'chart', 'annotated_screenshot', 'carousel', 'resource_visual', 'typographic', 'short_video'];
}

/** Registro de proveedores. cfg = fila de content_config ({ media_generative_enabled, media_generative_budget_usd }). */
export function mgProviders(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  const generativeOn = c.media_generative_enabled === true && Number(c.media_generative_budget_usd) > 0;
  return {
    renderer: { label: 'Renderer de carruseles (Playwright)', kind: 'deterministic', runs_on: 'worker_local', enabled: true, verified: true, cost_usd: 0,
      needs: ['carousel', 'typographic', 'comparison', 'before_after', 'checklist', 'framework', 'resource_visual', 'process_flow'], operations: ['render'],
      note: 'Texto exacto, marca oficial, sin costo. Corre en el equipo de Christian: node scripts/media/media-gateway.mjs run' },
    manual: { label: 'Asset propio (captura, foto, diagrama hecho a mano)', kind: 'manual', runs_on: 'christian', enabled: true, verified: true, cost_usd: 0,
      needs: ['annotated_screenshot', 'editorial_image', 'conceptual_image', 'diagram', 'architecture', 'chart', 'short_video', 'resource_visual'], operations: ['register'],
      note: 'Christian entrega la imagen o el video y se registra y asocia a la pieza' },
    higgsfield: { label: 'Higgsfield (generativo)', kind: 'generative', runs_on: 'worker_local', enabled: generativeOn, verified: false, cost_usd: null,
      needs: ['editorial_image', 'conceptual_image', 'short_video'], operations: ['generate', 'edit', 'variation', 'from_reference', 'video'],
      note: 'PREPARADO pero APAGADO: requiere autorización de Christian, saldo API real y una prueba de punta a punta; los créditos web/promocionales no sirven para la API.' },
  };
}

export function mgBrandRules() {
  return {
    palette: ['azul Atacama #0F5CED', 'azul oscuro #041228', 'fondos blancos, crema suave o azul muy pálido'],
    style: ['sobrio, claro y tecnológico pero humano', 'mucho aire y jerarquía visual clara', 'una idea fuerte por pieza', 'poco 3D', 'la llamita solo cuando aporta personalidad'],
    avoid: ['robot', 'holograma', 'cyber', 'neon', 'circuito', 'cripto', 'blockchain', 'matrix', 'cerebro digital', 'glow', 'degradado excesivo', 'objetos flotando'],
  };
}

/** ¿El texto (brief o prompt) viola la marca? Nombrar lo que se EVITA («sin robots») es válido. */
export function mgCheckBrand(text) {
  const t = String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const bad = ['robot', 'holograma', 'cyber', 'neon', 'circuito', 'cripto', 'blockchain', 'matrix', 'cerebro digital', 'glow', 'estetica de prompt'];
  const violations = [];
  bad.forEach((w) => {
    let i = t.indexOf(w);
    while (i >= 0) {
      // la negación vale para toda la oración hasta la palabra («Evitar: robots, neón, circuitos…», «sin robots ni neón»)
      const before = t.slice(Math.max(t.lastIndexOf('.', i), 0), i);
      if (!/\b(sin|no|ni|evit\w*|nunca|nada de|ningun\w*)\b/.test(before)) { violations.push(w); break; }
      i = t.indexOf(w, i + w.length);
    }
  });
  const hm = /\bhero\b|landing|banner de (la )?web/.exec(t);
  if (hm && !/\b(sin|no|ni|evit\w*|nunca|nada de)\b/.test(t.slice(Math.max(t.lastIndexOf('.', hm.index), 0), hm.index))) violations.push('parece_un_hero_de_la_web');
  return { ok: violations.length === 0, violations };
}

/** Prompt para un proveedor generativo, con las reglas de marca incluidas (y verificadas). */
export function mgBuildPrompt(req) {
  const r = req && typeof req === 'object' ? req : {};
  const b = mgBrandRules();
  const brief = String(r.brief || '').trim().slice(0, 600);
  const comp = String(r.composition || '').trim().slice(0, 80);
  const lines = [
    'Imagen para redes sociales de Atacama Labs (agentes de IA y automatización para empresas de Chile). Objetivo: ' + brief + '.',
    'Estilo: ' + b.style.join('; ') + '.',
    'Paleta: ' + b.palette.join('; ') + '.',
    comp ? 'Composición: ' + comp + '. Varía la composición respecto de las piezas anteriores; no es un hero de landing.' : 'Composición propia de esta idea; no es un hero de landing (no texto grande a la izquierda con visual abstracto a la derecha).',
    'Evitar: robots, hologramas, estética cyber, neón, circuitos decorativos, estética cripto, exceso de brillo, degradados excesivos, demasiados objetos flotando, look de prompt genérico de IA.',
    'Sin texto dentro de la imagen salvo que el brief lo pida; el texto exacto va en el caption o en un carrusel renderizado.',
  ];
  return lines.join(' ');
}

export function mgFnv(s) {
  let h = 0x811c9dc5;
  const x = String(s);
  for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** Clave de idempotencia: la misma pieza + necesidad + brief nunca genera dos assets. */
export function mgRequestKey(req) {
  const r = req && typeof req === 'object' ? req : {};
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return mgFnv(String(r.piece_id || '-') + '|' + String(r.need || '') + '|' + norm(r.brief) + '|' + norm(r.composition) + '|' + String(r.operation || ''));
}

export function mgValidateRequest(req) {
  const r = req && typeof req === 'object' ? req : {};
  const errors = [];
  if (!mgNeeds().includes(r.need)) errors.push('need_invalido:' + String(r.need || '').slice(0, 30));
  else if (r.need === 'none') errors.push('need_none_no_requiere_asset');
  const brief = String(r.brief || '').trim();
  if (brief.length < 15 || brief.length > 600) errors.push('brief_debe_tener_15_600_caracteres_que_debe_comunicar_el_visual');
  if (r.piece_id !== undefined && r.piece_id !== null && r.piece_id !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(r.piece_id))) errors.push('piece_id_invalido');
  if (r.reference_url && !/^https:\/\/\S+$/i.test(String(r.reference_url))) errors.push('reference_url_debe_ser_https');
  if (r.source_asset_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(r.source_asset_id))) errors.push('source_asset_id_invalido');
  const brand = mgCheckBrand(brief + ' ' + String(r.composition || ''));
  if (!brand.ok) errors.push('brief_viola_la_marca:' + brand.violations.join(','));
  return { ok: errors.length === 0, errors, brand };
}

/** Operación según lo pedido: render | generate | edit | variation | from_reference | video | register. */
export function mgOperation(req) {
  const r = req && typeof req === 'object' ? req : {};
  if (r.operation && ['render', 'generate', 'edit', 'variation', 'from_reference', 'video', 'register'].includes(r.operation)) return r.operation;
  if (r.source_asset_id && r.variation === true) return 'variation';
  if (r.source_asset_id || (r.reference_url && r.edit === true)) return 'edit';
  if (r.reference_url) return 'from_reference';
  if (r.need === 'short_video') return 'video';
  if (mgProviders({}).renderer.needs.includes(r.need)) return 'render';
  return 'generate';
}

/**
 * Enruta la necesidad a un proveedor. Devuelve { provider, operation, status: queued | unavailable, reason, alternatives[], cost_estimate_usd, needs_authorization }.
 * Un proveedor generativo apagado o sin autorización NUNCA genera: el error es visible y se ofrecen alternativas reales.
 */
export function mgRoute(req, cfg) {
  const r = req && typeof req === 'object' ? req : {};
  const provs = mgProviders(cfg);
  const op = mgOperation(r);
  const alt = [];
  if (provs.manual.needs.includes(r.need)) alt.push({ provider: 'manual', how: 'Entrega el asset (captura, foto o imagen propia) y se registra y asocia a la pieza' });
  if (!provs.renderer.needs.includes(r.need)) alt.push({ provider: 'renderer', how: 'Replantea el visual como carrusel, slide tipográfica, comparación o checklist (texto exacto, marca oficial, sin costo)' });
  const wanted = r.provider && provs[r.provider] ? r.provider : null;
  const pick = (name) => ({ provider: name, operation: op, cost_estimate_usd: provs[name].cost_usd == null ? null : provs[name].cost_usd });
  if (op === 'register' || wanted === 'manual') return { ...pick('manual'), operation: 'register', status: provs.manual.needs.includes(r.need) ? 'queued' : 'unavailable', reason: provs.manual.needs.includes(r.need) ? 'Esperando el asset de Christian' : 'El asset manual no aplica a esta necesidad', alternatives: alt, needs_authorization: false };
  if ((wanted === 'renderer' || !wanted) && provs.renderer.needs.includes(r.need) && op === 'render') return { ...pick('renderer'), status: 'queued', reason: 'El renderer lo produce con texto exacto y sin costo', alternatives: [], needs_authorization: false };
  const gen = provs.higgsfield;
  if (!gen.needs.includes(r.need) && !['edit', 'variation', 'from_reference'].includes(op)) {
    return { provider: null, operation: op, status: 'unavailable', reason: 'Ningún proveedor automático produce «' + r.need + '» hoy (diagrama, arquitectura, gráfico y captura anotada requieren un asset propio o replantearlo con el renderer).', alternatives: alt, cost_estimate_usd: 0, needs_authorization: false };
  }
  if (!gen.enabled) return { provider: 'higgsfield', operation: op, status: 'unavailable', reason: 'El proveedor generativo (Higgsfield) está APAGADO: requiere autorización de Christian, saldo API verificado y una prueba de punta a punta. Nada se genera ni se cobra.', alternatives: alt, cost_estimate_usd: null, needs_authorization: true };
  if (r.cost_authorized !== true) return { provider: 'higgsfield', operation: op, status: 'unavailable', reason: 'Generar con Higgsfield tiene costo: falta la autorización explícita de Christian para este asset.', alternatives: alt, cost_estimate_usd: null, needs_authorization: true };
  return { provider: 'higgsfield', operation: op, status: 'queued', reason: 'Autorizado por Christian', alternatives: [], cost_estimate_usd: null, needs_authorization: false };
}

/**
 * Plan de una solicitud frente a lo ya registrado. existing = filas de media_assets (cualquier estado) con la misma request_key o el mismo content_hash.
 * Devuelve { action: create | existing | reuse | retry, asset?, route }.
 */
export function mgPlan(req, existing, cfg) {
  const rows = Array.isArray(existing) ? existing : [];
  const key = mgRequestKey(req);
  const route = mgRoute(req, cfg);
  const same = rows.find((a) => a.request_key === key);
  if (same) {
    if (['ready', 'queued', 'generating', 'requested'].includes(same.status)) return { action: 'existing', asset: same, route, request_key: key };
    return { action: 'retry', asset: same, route, request_key: key };
  }
  const reusable = rows.find((a) => a.status === 'ready' && a.need === req.need && a.content_hash && req.content_hash && a.content_hash === req.content_hash && Array.isArray(a.urls) && a.urls.length);
  if (reusable) return { action: 'reuse', asset: reusable, route, request_key: key };
  return { action: 'create', route, request_key: key };
}

/** Validación del cierre de un asset por el worker: ready exige URLs https; failed exige un error visible (sanitizado). */
export function mgValidateResult(r) {
  const x = r && typeof r === 'object' ? r : {};
  const errors = [];
  const clean = (s) => String(s == null ? '' : s).replace(/(bearer|token|key|secret|password)[=: ]+[A-Za-z0-9._-]{8,}/gi, '$1=***').slice(0, 300);
  if (x.status === 'ready') {
    const urls = Array.isArray(x.urls) ? x.urls : [];
    if (!urls.length) errors.push('ready_exige_urls');
    if (urls.some((u) => !u || !/^https:\/\/\S+$/i.test(String(u.url || '')))) errors.push('urls_deben_ser_https');
    if (urls.length > 12) errors.push('maximo_12_urls');
  } else if (x.status === 'failed') {
    if (!String(x.error || '').trim()) errors.push('failed_exige_error_visible');
  } else errors.push('status_invalido_usa_ready_o_failed');
  return { ok: errors.length === 0, errors, value: { status: x.status, urls: (Array.isArray(x.urls) ? x.urls : []).slice(0, 12).map((u) => ({ url: String(u.url), type: String(u.type || 'image/png').slice(0, 40), fileId: u.fileId ? String(u.fileId).slice(0, 80) : undefined })), error: x.status === 'failed' ? clean(x.error) : null, content_hash: x.content_hash ? String(x.content_hash).slice(0, 64) : null } };
}

/** Hash determinista de lo que el renderer dibuja (slides + marca): permite reutilizar un render ya hecho. */
export function mgRenderHash(piece) {
  const p = piece && typeof piece === 'object' ? piece : {};
  const slides = Array.isArray(p.slides) ? p.slides : [];
  return mgFnv(JSON.stringify({ f: p.format, c: p.channel, s: slides, v: 'render-v1' }));
}
