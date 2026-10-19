-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019040412: aud01_revoke_client_schema_modification_privileges
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

DO $audit$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE REFERENCES, TRIGGER ON TABLE public.%I FROM PUBLIC, anon, authenticated',t.tablename);
  END LOOP;
END
$audit$;
