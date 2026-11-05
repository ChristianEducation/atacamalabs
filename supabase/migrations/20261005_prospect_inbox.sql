-- Atacama OS · Bloque G — bitácora de ingesta de prospectos (2026-10-05)
-- Cada prospecto que llega desde Hermes (u otra fuente de investigación) queda registrado aquí,
-- aceptado o rechazado, con los motivos del gate. Es la trazabilidad del "máximo 20 buenos al día":
-- lo que no pasa el gate no entra a accounts/research/prospects, pero queda auditado.
-- Aditivo. RLS activo sin políticas (solo service_role / n8n).
-- Rollback: drop table public.prospect_inbox;

create table if not exists public.prospect_inbox (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  icp_pack_id uuid not null references public.icp_packs(id),
  source text not null default 'hermes',
  company text,
  domain text,
  status text not null check (status in ('accepted', 'rejected', 'duplicate')),
  reasons text[] not null default '{}',
  account_id uuid references public.accounts(id),
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- Idempotencia: reenviar el mismo lote no duplica registros.
create unique index if not exists prospect_inbox_batch_domain_idx
  on public.prospect_inbox (icp_pack_id, batch_id, coalesce(domain, ''));
create index if not exists prospect_inbox_pack_received_idx
  on public.prospect_inbox (icp_pack_id, received_at desc);

alter table public.prospect_inbox enable row level security;

comment on table public.prospect_inbox is
  'Bitácora de ingesta de prospectos (Atacama OS). accepted/rejected/duplicate + motivos del gate + payload original.';
