-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019030717: aud01_restrict_tenant_billing_and_owner_updates
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

REVOKE UPDATE ON TABLE public.tenants FROM anon, authenticated;
GRANT UPDATE (name, slug, logo_url, whatsapp_number) ON TABLE public.tenants TO authenticated;
