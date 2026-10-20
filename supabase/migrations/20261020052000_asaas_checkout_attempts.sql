create table if not exists public.asaas_checkout_attempts (
 id uuid primary key,
 tenant_id uuid not null references public.tenants(id),
 plan text not null,
 period text not null,
 amount numeric(12,2) not null check(amount>0),
 status text not null default 'started' check(status in ('started','link_created','uncertain','rejected')),
 payment_link_id text,
 payment_url text,
 http_status integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists asaas_checkout_attempts_tenant_date_idx on public.asaas_checkout_attempts(tenant_id,created_at desc);
alter table public.asaas_checkout_attempts enable row level security;
revoke all on public.asaas_checkout_attempts from public,anon,authenticated;
grant select,insert,update on public.asaas_checkout_attempts to service_role;
