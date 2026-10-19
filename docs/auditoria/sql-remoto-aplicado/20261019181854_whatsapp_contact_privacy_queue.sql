-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019181854: whatsapp_contact_privacy_queue
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

create table if not exists public.whatsapp_contact_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone text not null check (phone ~ '^[0-9]{8,16}$'),
  status text not null default 'pending' check (status in ('pending','ignored','manual','ai')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  unique (tenant_id, phone)
);
create index if not exists whatsapp_contact_permissions_tenant_status on public.whatsapp_contact_permissions(tenant_id,status,last_seen_at desc);
alter table public.whatsapp_contact_permissions enable row level security;
revoke all on public.whatsapp_contact_permissions from anon,authenticated;
grant all on public.whatsapp_contact_permissions to service_role;
comment on table public.whatsapp_contact_permissions is 'Fila de autorização WhatsApp, contendo somente telefone e metadados; conteúdo de mensagens pendentes não é persistido.';
