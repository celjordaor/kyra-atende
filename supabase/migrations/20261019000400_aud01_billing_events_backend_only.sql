-- AUD-01: trilha financeira somente gerenciada pelo backend.
-- Espelha a migration aplicada ao projeto Kyra Atende.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON public.billing_events FROM anon, authenticated;
DROP POLICY IF EXISTS tenant_billing_events ON public.billing_events;
GRANT SELECT ON public.billing_events TO authenticated;
