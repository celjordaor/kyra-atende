-- Applied in production as aud01_pin_function_search_paths.
ALTER FUNCTION public.current_tenant_id() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
