-- Atacama OS · Ola B · Media Gateway (registro de assets visuales).
-- Un solo lugar para pedir, seguir, reutilizar y asociar assets (imágenes, carruseles, video corto) sin acoplarse a un proveedor.
-- El renderer actual (Playwright, texto exacto) y cualquier proveedor generativo escriben aquí; nada se publica desde esta tabla.
-- Sin políticas RLS: solo service_role (n8n / worker local). No toca tablas de EnBandeja.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,                       -- idempotencia: pieza + necesidad + hash del brief
  piece_id uuid references public.content_pieces(id) on delete set null,
  need text not null check (need in ('none', 'editorial_image', 'conceptual_image', 'diagram', 'process_flow', 'architecture', 'comparison', 'before_after', 'framework', 'checklist', 'chart', 'annotated_screenshot', 'carousel', 'resource_visual', 'typographic', 'short_video')),
  operation text not null default 'render' check (operation in ('render', 'generate', 'edit', 'variation', 'from_reference', 'video', 'register')),
  provider text not null,                                  -- renderer | higgsfield | manual | ...
  status text not null default 'requested' check (status in ('requested', 'queued', 'generating', 'ready', 'failed', 'unavailable', 'cancelled')),
  brief text,                                              -- qué debe comunicar (humano)
  prompt text,                                             -- prompt final con reglas de marca (proveedores generativos)
  brand_check jsonb not null default '{}'::jsonb,          -- resultado de la validación de marca del prompt/brief
  reference_url text,                                      -- imagen de referencia (from_reference / edit)
  source_asset_id uuid references public.media_assets(id) on delete set null,
  urls jsonb not null default '[]'::jsonb,                 -- [{url, type, fileId}] ya alojadas (GHL media)
  content_hash text,                                       -- hash del contenido renderizado: permite reutilizar sin volver a generar
  cost_estimate_usd numeric(10, 4) not null default 0,
  cost_authorized boolean not null default false,          -- ningún asset con costo se genera sin autorización explícita
  error text,                                              -- error visible (sanitizado)
  attempts int not null default 0,
  meta jsonb not null default '{}'::jsonb,
  is_test boolean not null default false,
  created_by text not null default 'atacama-os',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_status_idx on public.media_assets (status, created_at desc);
create index if not exists media_assets_piece_idx on public.media_assets (piece_id) where piece_id is not null;
create index if not exists media_assets_hash_idx on public.media_assets (content_hash) where content_hash is not null;

alter table public.media_assets enable row level security;
comment on table public.media_assets is 'Ola B: registro del Media Gateway (assets visuales, proveedor, estado, costo, asociación a piezas). Sin política: solo service_role.';

-- Interruptores del proveedor generativo (apagados por defecto: requieren autorización de Christian y saldo API verificado).
alter table public.content_config
  add column if not exists media_generative_enabled boolean not null default false,
  add column if not exists media_generative_budget_usd numeric(10, 2) not null default 0;
