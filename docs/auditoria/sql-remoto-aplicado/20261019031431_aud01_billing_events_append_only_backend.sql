-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019031431: aud01_billing_events_append_only_backend
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.billing_events FROM anon, authenticated;
DROP POLICY IF EXISTS tenant_billing_events ON public.billing_events;
GRANT SELECT ON public.billing_events TO authenticated;

