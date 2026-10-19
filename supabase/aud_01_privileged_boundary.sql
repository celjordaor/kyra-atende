-- AUD-01B — Public booking surface + relational tenant integrity
-- Apply only after the corresponding application code is live in production.

begin;

-- Browser no longer reads/writes public booking base tables directly.
drop policy if exists "bookings_public_insert" on public.bookings;
drop policy if exists "tenants_public_r" on public.tenants;
drop policy if exists "professionals_public_r" on public.professionals;
drop policy if exists "services_public_r" on public.services;

revoke insert on table public.bookings from anon;
revoke select on table public.tenants from anon;
revoke select on table public.professionals from anon;
revoke select on table public.services from anon;

-- With the anonymous catalog surface gone, current_tenant_id is no longer an
-- anonymous API function.
revoke execute on function public.current_tenant_id() from anon;

-- Referenced booking resources must belong to the same tenant.
alter table public.clients
  add constraint clients_id_tenant_key unique (id, tenant_id);

alter table public.professionals
  add constraint professionals_id_tenant_key unique (id, tenant_id);

alter table public.services
  add constraint services_id_tenant_key unique (id, tenant_id);

alter table public.bookings
  add constraint bookings_client_same_tenant_fk
  foreign key (client_id, tenant_id)
  references public.clients (id, tenant_id)
  not valid;

alter table public.bookings
  add constraint bookings_professional_same_tenant_fk
  foreign key (professional_id, tenant_id)
  references public.professionals (id, tenant_id)
  not valid;

alter table public.bookings
  add constraint bookings_service_same_tenant_fk
  foreign key (service_id, tenant_id)
  references public.services (id, tenant_id)
  not valid;

alter table public.bookings validate constraint bookings_client_same_tenant_fk;
alter table public.bookings validate constraint bookings_professional_same_tenant_fk;
alter table public.bookings validate constraint bookings_service_same_tenant_fk;

commit;
