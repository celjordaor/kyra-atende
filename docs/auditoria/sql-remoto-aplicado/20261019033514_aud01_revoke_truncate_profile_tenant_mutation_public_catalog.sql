-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019033514: aud01_revoke_truncate_profile_tenant_mutation_public_catalog
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

DO $$
DECLARE v record;
BEGIN
 FOR v IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
   EXECUTE format('REVOKE TRUNCATE ON TABLE public.%I FROM PUBLIC, anon, authenticated', v.tablename);
 END LOOP;
END $$;
REVOKE INSERT, DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT, DELETE ON public.tenants FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS professionals_public_r ON public.professionals;
DROP POLICY IF EXISTS services_public_r ON public.services;
