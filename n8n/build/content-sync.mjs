#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — workflow n8n «14 Content Sync (GHL → Supabase)».
 *
 * Cada 30 minutos, SOLO si hay piezas con post en GHL todavía abiertas (drafted / in_review / approved / scheduled), lee el estado
 * real de esos posts en Social Planner (una sola consulta) y refleja los cambios en `content_pieces`:
 *   draft → drafted · in_review → in_review (o approved si la aprobación ya figura aprobada) · scheduled → scheduled
 *   published → published (+ published_at) · failed → failed · el post ya no existe en GHL → discarded.
 * GHL es la fuente de verdad; este workflow NUNCA escribe en GHL (solo lee) y no aprueba ni publica nada.
 *
 * Uso: node n8n/build/content-sync.mjs   → escribe n8n/atacama-labs-14-content-sync.json
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { summaryHash } from '../../scripts/content/metrics-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const PACK_ID = '0ba54785-bff0-4a2d-a397-64e697d34e38';
const GHL_LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
const ACCOUNT_IDS = [
  '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090',
  '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_145278681_page',
  '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_D9Z-EPMxLu_profile',
];
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });

/**
 * Mapea el post de GHL a los campos de la pieza. Autocontenida salvo `summaryHash` (se incrusta junto).
 * piece (opcional) = fila actual de content_pieces: permite detectar edición humana (hash del texto) y no pisar fechas ya conocidas.
 * Estados: draft→drafted · in_review→in_review | approved (aprobación ya figura aprobada) · scheduled/in_progress/publishing→scheduled ·
 * published→published (+published_at) · failed/error→failed · rechazado o borrado en GHL→discarded · desconocido→status null (no se toca).
 */
export function mapGhlToPiece(post, now, piece) {
  const cur = piece || {};
  if (!post) return { status: 'discarded', ghl_status: 'deleted', ghl_approval_status: null };
  const det = post.postApprovalDetails || {};
  const approval = det.approvalStatus ? String(det.approvalStatus) : null;
  const st = String(post.status || '').toLowerCase();
  const out = { ghl_status: st, ghl_approval_status: approval };
  if (post.scheduleDate) out.scheduled_at = new Date(post.scheduleDate).toISOString();
  if (st === 'published') { out.status = 'published'; out.published_at = new Date(post.publishedAt || post.updatedAt || now).toISOString(); }
  else if (st === 'scheduled' || st === 'in_progress' || st === 'publishing') out.status = 'scheduled';
  else if (st === 'failed' || st === 'error') out.status = 'failed';
  else if (st === 'draft') out.status = 'drafted';
  else if (st === 'in_review') out.status = approval === 'rejected' ? 'discarded' : approval === 'approved' ? 'approved' : 'in_review';
  else if (st === 'deleted') out.status = 'discarded';
  else out.status = null; // estado desconocido: no se toca la pieza
  if (out.status === null) return out;
  // Fecha de aprobación: solo si GHL la expone en el post; si no, se registra cuándo se VIO aprobado (aproximada, por la frecuencia de sincronización).
  const exact = det.approvedAt || det.approvalDate || det.approvedOn || null;
  if (exact && !cur.approved_at && Number.isFinite(Date.parse(exact))) out.approved_at = new Date(exact).toISOString();
  const approvedNow = approval === 'approved' || out.status === 'scheduled' || out.status === 'published';
  if (approvedNow && !cur.approved_seen_at && (cur.status === 'in_review' || cur.status === 'approved' || cur.status === 'drafted' || approval === 'approved')) out.approved_seen_at = new Date(now).toISOString();
  // Edición humana: el texto del post ya no coincide con el que envió Atacama OS.
  if (cur.ghl_summary_hash && typeof post.summary === 'string' && summaryHash(post.summary) !== cur.ghl_summary_hash && cur.ghl_edited !== true) { out.ghl_edited = true; out.ghl_edited_seen_at = new Date(now).toISOString(); }
  return out;
}

export const COMPUTE = `${summaryHash.toString()}

${mapGhlToPiece.toString()}

const pending = ($('Fetch Pending').first().json || {}).body;
const res = $json || {};
const posts = res.body && res.body.results && Array.isArray(res.body.results.posts) ? res.body.results.posts : null;
if (!Array.isArray(pending) || !pending.length) return [];
if (!posts || (res.statusCode || 0) >= 300) throw new Error('GHL posts/list fallo (HTTP ' + res.statusCode + '): ' + JSON.stringify(res.body || {}).slice(0, 300));
const byId = {};
posts.forEach((p) => { byId[p._id] = p; });
const now = Date.now();
const out = [];
pending.forEach((piece) => {
  const post = byId[piece.ghl_post_id] || null;
  const m = mapGhlToPiece(post, now, piece);
  if (m.status === null) return;
  const patch = { ...m, synced_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() };
  const same = (a, b) => (a || null) === (b || null);
  const changed = m.status !== piece.status || !same(m.ghl_status, piece.ghl_status) || !same(m.ghl_approval_status, piece.ghl_approval_status)
    || (m.scheduled_at && Date.parse(m.scheduled_at) !== Date.parse(piece.scheduled_at || 0)) || Boolean(m.approved_seen_at) || Boolean(m.approved_at) || m.ghl_edited === true;
  if (changed) out.push({ json: { id: piece.id, from: piece.status, to: m.status, patch } });
});
return out;`;

export function buildContentSync() {
  const nodes = [
    { id: randomUUID(), name: 'Every 30 Minutes', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0], parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } } },
    { id: randomUUID(), name: 'Fetch Pending', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [240, 0], credentials: SUPABASE_CRED,
      parameters: { method: 'GET', url: `${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&ghl_post_id=not.is.null&status=in.(drafted,in_review,approved,scheduled)&select=id,ghl_post_id,status,ghl_status,ghl_approval_status,scheduled_at,approved_at,approved_seen_at,ghl_summary_hash,ghl_edited&limit=100`,
        authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } },
    { id: randomUUID(), name: 'Any Pending?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [360, 0], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: '={{ (Array.isArray($json.body) && $json.body.length > 0) ? "yes" : "no" }}', rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] } } },
    { id: randomUUID(), name: 'List GHL Posts', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [600, 0], credentials: GHL_CRED, alwaysOutputData: true,
      parameters: { method: 'POST', url: `https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION}/posts/list`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] },
        sendBody: true, specifyBody: 'json',
        jsonBody: `={{ JSON.stringify({ type: 'all', accounts: ${JSON.stringify(ACCOUNT_IDS.join(','))}, skip: '0', limit: '100', fromDate: new Date(Date.now() - 400 * 86400000).toISOString(), toDate: new Date(Date.now() + 400 * 86400000).toISOString(), includeUsers: 'false' }) }}`,
        options: full() } },
    code('Compute', COMPUTE, [840, 0]),
    { id: randomUUID(), name: 'Patch Piece', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1080, 0], credentials: SUPABASE_CRED,
      parameters: { method: 'PATCH', url: `={{ "${SUPABASE}/rest/v1/content_pieces?id=eq." + $json.id }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: 'return=minimal' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.patch) }}', options: full() } },
  ];
  const to = (n) => [{ node: n, type: 'main', index: 0 }];
  const connections = {
    'Every 30 Minutes': { main: [to('Fetch Pending')] },
    'Fetch Pending': { main: [to('Any Pending?')] },
    'Any Pending?': { main: [to('List GHL Posts'), []] },
    'List GHL Posts': { main: [to('Compute')] },
    'Compute': { main: [to('Patch Piece')] },
  };
  return { name: 'Atacama Labs - 14 Content Sync (GHL → Supabase)', nodes, connections, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('content-sync.mjs')) {
  const out = new URL('../atacama-labs-14-content-sync.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildContentSync(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
