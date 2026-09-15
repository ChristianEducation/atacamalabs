import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import site from "@/lib/content";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 5;
// No hay /privacidad publicada todavía (WEB-CONTENT.md: dato pendiente de
// Christian) — este es un marcador explícito de "sin aviso real todavía",
// no una versión real de un aviso publicado.
const NOTICE_VERSION = "unpublished-draft-v0";

const ALLOWED_SOLUTIONS = new Set([
  ...site.solutions.map((s) => s.slug),
  "unsure",
]);

type Body = {
  requestId?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  message?: string;
  solution?: string;
  source?: string;
  website?: string; // honeypot
};

function fieldErrors(body: Body): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = (body.name ?? "").trim();
  if (name.length < 2 || name.length > 80) errors.name = "invalid_length";

  if ((body.company ?? "").trim().length > 120) errors.company = "too_long";

  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const emailValid =
    email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.length > 0 && phone.length <= 30 && phone.replace(/[^\d]/g, "").length >= 8;
  if (!emailValid && !phoneValid) {
    errors.email = "email_or_phone_required";
    errors.phone = "email_or_phone_required";
  }

  const message = (body.message ?? "").trim();
  if (message.length < 20 || message.length > 1200) errors.message = "invalid_length";

  const solution = body.solution ?? "unsure";
  if (!ALLOWED_SOLUTIONS.has(solution)) errors.solution = "not_allowed";

  if (!body.requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) {
    errors.requestId = "invalid_uuid";
  }

  return errors;
}

function hashIp(ip: string): string {
  const pepper = process.env.IP_HASH_SECRET ?? "atacama-dev-pepper";
  return createHash("sha256").update(`${ip}:${pepper}`).digest("hex");
}

function payloadHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ errors: { body: "invalid_json" } }, { status: 422 });
  }

  // Honeypot: bots que llenan todos los campos reciben una falsa
  // confirmación sin persistir nada. No afecta a usuarios reales (el campo
  // es invisible en la UI real).
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json(
      { status: "received", receiptId: randomUUID() },
      { status: 201 },
    );
  }

  const errors = fieldErrors(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const ipHash = hashIp(ip);

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch {
    // Credenciales de Supabase todavía no configuradas en este entorno.
    return NextResponse.json(
      { error: "server_not_configured" },
      { status: 503 },
    );
  }

  // Rate limit por IP hash, respaldado en la misma tabla (funciona igual
  // en serverless, a diferencia de un contador en memoria).
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("lead_submissions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);

  if (countError) {
    return NextResponse.json({ error: "retryable" }, { status: 503 });
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MIN * 60) } },
    );
  }

  const solution = body.solution ?? "unsure";
  const hash = payloadHash({
    name: body.name?.trim(),
    company: body.company?.trim() || null,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    message: body.message?.trim(),
    solution,
  });

  const { data, error } = await supabase.rpc("create_lead_submission", {
    p_icp_pack_slug: "atacama-labs",
    p_idempotency_key: body.requestId,
    p_payload_hash: hash,
    p_name: body.name!.trim(),
    p_company: body.company?.trim() || null,
    p_email: body.email?.trim() || null,
    p_phone: body.phone?.trim() || null,
    p_message: body.message!.trim(),
    p_solution: solution,
    p_notice_version: NOTICE_VERSION,
    p_source: body.source ?? "web",
    p_ip_hash: ipHash,
  });

  if (error) {
    return NextResponse.json({ error: "retryable" }, { status: 503 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return NextResponse.json({ error: "retryable" }, { status: 503 });
  }

  if (row.outcome === "conflict") {
    return NextResponse.json({ error: "idempotency_conflict" }, { status: 409 });
  }

  const status = row.outcome === "existing" ? 200 : 201;
  return NextResponse.json({ status: "received", receiptId: row.id }, { status });
}
