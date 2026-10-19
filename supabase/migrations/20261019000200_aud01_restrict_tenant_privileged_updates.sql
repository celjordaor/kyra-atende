-- AUD-01: espelhamento do hotfix já aplicado ao projeto zrszytzlovthyezozqhj.
-- Campos financeiros/autoridade não podem ser alterados pelo cliente Supabase.
REVOKE UPDATE ON TABLE public.tenants FROM anon, authenticated;
GRANT UPDATE (name, slug, logo_url, whatsapp_number) ON TABLE public.tenants TO authenticated;
