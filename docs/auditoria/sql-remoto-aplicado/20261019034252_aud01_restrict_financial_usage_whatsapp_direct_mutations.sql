-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019034252: aud01_restrict_financial_usage_whatsapp_direct_mutations
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

-- AUD-01: tabelas financeiras, contadores e trilha WhatsApp geridas no backend.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscriptions FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.usage_counters FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.whatsapp_messages FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS tenant_whatsapp_messages ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_tenant_read ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
GRANT SELECT ON TABLE public.subscriptions, public.usage_counters, public.whatsapp_messages TO authenticated;
