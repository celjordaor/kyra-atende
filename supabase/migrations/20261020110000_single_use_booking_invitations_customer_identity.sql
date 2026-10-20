alter table public.booking_invitations add column if not exists consumed_at timestamptz;
alter table public.booking_invitations add column if not exists consumed_booking_id uuid references public.bookings(id) on delete set null;
create index if not exists booking_invitations_active on public.booking_invitations(tenant_id,client_id,expires_at) where revoked_at is null and consumed_at is null;
-- Central identity is independent from tenant operational users and never grants tenant access.
create table if not exists public.customer_identities (
 id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.customer_memberships (
 identity_id uuid not null references public.customer_identities(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 client_id uuid not null,
 verified_at timestamptz not null default now(),
 primary key(identity_id,tenant_id,client_id),
 foreign key(client_id,tenant_id) references public.clients(id,tenant_id) on delete cascade
);
create index if not exists customer_memberships_tenant on public.customer_memberships(tenant_id,client_id);
alter table public.customer_identities enable row level security;
alter table public.customer_memberships enable row level security;
revoke all on public.customer_identities,public.customer_memberships from anon,authenticated,public;
grant select,insert,update,delete on public.customer_identities,public.customer_memberships to service_role;
-- The customer identity can be linked only by a verified server-side authentication flow.
create or replace function public.create_booking_from_invitation(
 p_tenant uuid,p_token_hash text,p_service uuid,p_professional uuid,p_start timestamptz,p_end timestamptz,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.booking_invitations%rowtype; c public.clients%rowtype; duration integer; new_id uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' or p_start<=now() or p_end<=p_start or p_end-p_start>interval '8 hours' or length(coalesce(p_notes,''))>2000 then raise exception 'invalid request' using errcode='22023';end if;
 select * into inv from public.booking_invitations where tenant_id=p_tenant and token_hash=p_token_hash for update;
 if not found or inv.expires_at<=now() or inv.revoked_at is not null or inv.consumed_at is not null then raise exception 'invitation unavailable' using errcode='P0002';end if;
 select * into c from public.clients where id=inv.client_id and tenant_id=p_tenant;
 if not found then raise exception 'invalid client' using errcode='22023';end if;
 select duration_minutes into duration from public.services where tenant_id=p_tenant and id=p_service and is_active=true;
 if duration is null or duration<=0 or p_end-p_start<>make_interval(mins=>duration) then raise exception 'invalid service duration' using errcode='22023';end if;
 if p_professional is not null and not exists(select 1 from public.professionals where id=p_professional and tenant_id=p_tenant and is_active=true) then raise exception 'invalid professional' using errcode='22023';end if;
 insert into public.bookings(tenant_id,service_id,professional_id,client_id,client_name,client_phone,client_email,notes,start_at,end_at,status)
 values(p_tenant,p_service,p_professional,c.id,c.name,c.phone,c.email,nullif(trim(p_notes),''),p_start,p_end,'pending')
 returning id into new_id;
 update public.booking_invitations set consumed_at=now(),consumed_booking_id=new_id where id=inv.id;
 return new_id;
end $$;
revoke all on function public.create_booking_from_invitation(uuid,text,uuid,uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_booking_from_invitation(uuid,text,uuid,uuid,timestamptz,timestamptz,text) to service_role;