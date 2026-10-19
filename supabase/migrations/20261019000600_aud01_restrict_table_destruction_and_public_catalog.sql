-- Applied in production via Supabase migration aud01_revoke_truncate_profile_tenant_mutation_public_catalog.
-- Prevent destructive table operations bypassing RLS across all current public tables.
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE TRUNCATE ON TABLE public.%I FROM PUBLIC, anon, authenticated', v.tablename);
  END LOOP;
END $$;

-- Provisioning is exclusively through the service_role RPC.
REVOKE INSERT, DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT, DELETE ON public.tenants FROM PUBLIC, anon, authenticated;

-- Public catalog data is selected only by the validated server-side booking page.
DROP POLICY IF EXISTS professionals_public_r ON public.professionals;
DROP POLICY IF EXISTS services_public_r ON public.services;
