CREATE TABLE public.ai_interaction_reservations (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','settled','released')),
 tokens_used integer CHECK(tokens_used >= 0),
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX ai_interaction_reservations_open_idx ON public.ai_interaction_reservations(tenant_id,created_at) WHERE status='reserved';
ALTER TABLE public.ai_interaction_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_interaction_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai_interaction_reservations TO service_role;
CREATE FUNCTION public.reserve_ai_interaction(p_tenant_id uuid,p_id uuid,p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_current integer; v_existing public.ai_interaction_reservations%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_tenant_id IS NULL OR p_id IS NULL OR (p_limit IS NOT NULL AND p_limit < 0) THEN RAISE EXCEPTION 'invalid arguments' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tenant_id::text||':ai_interactions',0));
 SELECT * INTO v_existing FROM public.ai_interaction_reservations WHERE id=p_id;
 IF FOUND THEN RETURN v_existing.tenant_id=p_tenant_id AND v_existing.status='reserved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=p_tenant_id) THEN RAISE EXCEPTION 'unknown tenant' USING ERRCODE='23503'; END IF;
 INSERT INTO public.usage_counters(tenant_id,key,value) VALUES(p_tenant_id,'ai_chat_interactions_used',0)
 ON CONFLICT(tenant_id,key) DO NOTHING;
 SELECT value INTO v_current FROM public.usage_counters WHERE tenant_id=p_tenant_id AND key='ai_chat_interactions_used' FOR UPDATE;
 IF p_limit IS NOT NULL AND v_current>=p_limit THEN RETURN false; END IF;
 UPDATE public.usage_counters SET value=value+1 WHERE tenant_id=p_tenant_id AND key='ai_chat_interactions_used';
 INSERT INTO public.ai_interaction_reservations(id,tenant_id) VALUES(p_id,p_tenant_id);
 RETURN true;
END $$;
CREATE FUNCTION public.finish_ai_interaction(p_id uuid,p_success boolean,p_tokens integer DEFAULT 0)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tenant uuid; v_row public.ai_interaction_reservations%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_success IS NULL OR p_tokens IS NULL OR p_tokens<0 THEN RAISE EXCEPTION 'invalid arguments' USING ERRCODE='22023'; END IF;
 SELECT tenant_id INTO v_tenant FROM public.ai_interaction_reservations WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing' USING ERRCODE='P0002'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_tenant::text||':ai_interactions',0));
 SELECT * INTO v_row FROM public.ai_interaction_reservations WHERE id=p_id FOR UPDATE;
 IF v_row.status!='reserved' THEN RETURN false; END IF;
 IF p_success THEN
  INSERT INTO public.usage_counters(tenant_id,key,value) VALUES(v_tenant,'ai_chat_tokens_used',p_tokens)
  ON CONFLICT(tenant_id,key) DO UPDATE SET value=public.usage_counters.value+EXCLUDED.value;
 ELSE
  UPDATE public.usage_counters SET value=value-1 WHERE tenant_id=v_tenant AND key='ai_chat_interactions_used';
 END IF;
 UPDATE public.ai_interaction_reservations SET status=CASE WHEN p_success THEN 'settled' ELSE 'released' END,
 tokens_used=CASE WHEN p_success THEN p_tokens ELSE NULL END,finished_at=now() WHERE id=p_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_interaction(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_interaction(uuid,boolean,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_interaction(uuid,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_interaction(uuid,boolean,integer) TO service_role;