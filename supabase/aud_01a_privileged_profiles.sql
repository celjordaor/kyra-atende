-- AUD-01A — Immediate privileged RPC + profile privilege hardening
-- Safe to apply before the public-booking code rollout.

begin;

-- Privileged RPCs are server-only.
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

-- current_tenant_id remains callable by anon temporarily because existing public
-- table policies still reference it until AUD-01B removes that browser surface.
alter function public.current_tenant_id()
  set search_path = pg_catalog, public;
revoke all privileges on function public.current_tenant_id()
  from public;
grant execute on function public.current_tenant_id()
  to anon, authenticated, service_role;

alter function public.set_updated_at()
  set search_path = pg_catalog, public;
revoke all privileges on function public.set_updated_at()
  from public, anon, authenticated;
grant execute on function public.set_updated_at()
  to service_role;

revoke all privileges on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

-- Profiles must never allow tenant users to change authorization fields.
drop policy if exists "profiles_tenant_rw" on public.profiles;
drop policy if exists "profiles_own_r" on public.profiles;
drop policy if exists "profiles_tenant_r" on public.profiles;
drop policy if exists "profiles_own_u" on public.profiles;

create policy "profiles_tenant_r"
  on public.profiles
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

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

commit;
