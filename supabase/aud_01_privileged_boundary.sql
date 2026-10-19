-- AUD-01 — Privileged Boundary & Tenant Hardening
-- Baseline: Kyra Atende / project zrszytzlovthyezozqhj
-- Apply only after the corresponding application code is live.

begin;

-- ---------------------------------------------------------------------------
-- 1. Privileged RPCs: remove anonymous/authenticated execution and pin search_path
-- ---------------------------------------------------------------------------

alter function public.create_tenant_with_owner(uuid, text, text, text, text)
  set search_path = pg_catalog, public;

revoke all privileges on function public.create_tenant_with_owner(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_tenant_with_owner(uuid, text, text, text, text)
  to service_role;

alter function public.increment_usage_counter(uuid, text, integer)
  set search_path = pg_catalog, public;

revoke all privileges on function public.increment_usage_counter(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.increment_usage_counter(uuid, text, integer)
  to service_role;

alter function public.current_tenant_id()
  set search_path = pg_catalog, public;

revoke all privileges on function public.current_tenant_id()
  from public, anon, authenticated;
grant execute on function public.current_tenant_id()
  to authenticated, service_role;

alter function public.set_updated_at()
  set search_path = pg_catalog, public;

revoke all privileges on function public.set_updated_at()
  from public, anon, authenticated;
grant execute on function public.set_updated_at()
  to service_role;

-- Event-trigger helper is internal infrastructure and must never be a Data API RPC.
revoke all privileges on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Profiles: prevent role / tenant privilege escalation through Data API
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_tenant_rw" on public.profiles;
drop policy if exists "profiles_own_r" on public.profiles;
drop policy if exists "profiles_tenant_r" on public.profiles;
drop policy if exists "profiles_own_u" on public.profiles;

create policy "profiles_tenant_r"
  on public.profiles
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- Keeps global superadmin able to load its own profile even without tenant_id claim.
create policy "profiles_own_r"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_own_u"
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    and tenant_id = public.current_tenant_id()
  )
  with check (
    id = auth.uid()
    and tenant_id = public.current_tenant_id()
  );

revoke all privileges on table public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (name, avatar_url) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Public booking surface: browser no longer reads/writes base tables directly
-- ---------------------------------------------------------------------------

drop policy if exists "bookings_public_insert" on public.bookings;
drop policy if exists "tenants_public_r" on public.tenants;
drop policy if exists "professionals_public_r" on public.professionals;
drop policy if exists "services_public_r" on public.services;

revoke insert on table public.bookings from anon;
revoke select on table public.tenants from anon;
revoke select on table public.professionals from anon;
revoke select on table public.services from anon;

-- ---------------------------------------------------------------------------
-- 4. Relational tenant integrity: referenced IDs must belong to booking tenant
-- ---------------------------------------------------------------------------

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
