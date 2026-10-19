-- AUD-01: mirror of the production security migration applied on 2026-10-18.
-- Restrict privileged RPCs to server-side service_role.
REVOKE EXECUTE ON FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_usage_counter(uuid,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(uuid,text,integer) TO service_role;
ALTER FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_usage_counter(uuid,text,integer) SET search_path = public, pg_temp;
-- Do not allow client-side privilege or tenant reassignment.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (name, avatar_url) ON TABLE public.profiles TO authenticated;
-- Public booking must go through a validated backend endpoint.
DROP POLICY IF EXISTS bookings_public_insert ON public.bookings;
-- Public tenant lookup must use a minimal server-controlled projection.
DROP POLICY IF EXISTS tenants_public_r ON public.tenants;
