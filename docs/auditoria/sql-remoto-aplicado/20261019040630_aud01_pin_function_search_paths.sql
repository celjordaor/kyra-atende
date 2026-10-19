-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019040630: aud01_pin_function_search_paths
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

ALTER FUNCTION public.current_tenant_id() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
