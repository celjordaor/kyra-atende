create table if not exists public.booking_invitations (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 client_id uuid not null,
 token_hash text not null unique,
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(client_id,tenant_id) references public.clients(id,tenant_id) on delete cascade,
 constraint booking_invitation_hash_check check(token_hash ~ '^[a-f0-9]{64}$')
);
create index if not exists booking_invitations_client on public.booking_invitations(tenant_id,client_id);
alter table public.booking_invitations enable row level security;
revoke all on public.booking_invitations from public,anon,authenticated;
grant select,insert,update,delete on public.booking_invitations to service_role;