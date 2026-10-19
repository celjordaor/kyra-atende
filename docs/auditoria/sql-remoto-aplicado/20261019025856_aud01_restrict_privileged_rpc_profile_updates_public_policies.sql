-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019025856: aud01_restrict_privileged_rpc_profile_updates_public_policies
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

REVOKE EXECUTE ON FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_usage_counter(uuid,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(uuid,text,integer) TO service_role;
ALTER FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_usage_counter(uuid,text,integer) SET search_path = public, pg_temp;
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (name, avatar_url) ON TABLE public.profiles TO authenticated;
DROP POLICY IF EXISTS bookings_public_insert ON public.bookings;
DROP POLICY IF EXISTS tenants_public_r ON public.tenants;
