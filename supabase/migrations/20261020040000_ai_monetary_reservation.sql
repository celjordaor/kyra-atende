CREATE TABLE public.ai_monetary_reservations (
 id uuid PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 reserved_brl numeric(16,8) NOT NULL CHECK(reserved_brl > 0),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','settled','released')),
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz
);
CREATE INDEX ai_monetary_reservations_open_idx ON public.ai_monetary_reservations(tenant_id,created_at) WHERE status='reserved';
ALTER TABLE public.ai_monetary_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_monetary_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai_monetary_reservations TO service_role;

CREATE FUNCTION public.reserve_ai_monetary(p_tenant uuid,p_id uuid,p_reserved_brl numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_plan text; v_limit integer; v_used numeric; v_held numeric; v_existing public.ai_monetary_reservations%ROWTYPE; v_start timestamptz;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_tenant IS NULL OR p_id IS NULL OR p_reserved_brl IS NULL OR p_reserved_brl<=0 OR p_reserved_brl>1000 THEN RAISE EXCEPTION 'invalid reservation' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tenant::text||':ai_money',0));
 SELECT * INTO v_existing FROM public.ai_monetary_reservations WHERE id=p_id;
 IF FOUND THEN RETURN v_existing.tenant_id=p_tenant AND v_existing.reserved_brl=p_reserved_brl AND v_existing.status='reserved'; END IF;
 SELECT plan INTO v_plan FROM public.tenants WHERE id=p_tenant;
 IF NOT FOUND THEN RAISE EXCEPTION 'tenant missing' USING ERRCODE='23503'; END IF;
 SELECT COALESCE(o.monthly_budget_cents,p.monthly_budget_cents) INTO v_limit
 FROM public.ai_budget_plans p LEFT JOIN public.ai_budget_tenant_overrides o ON o.tenant_id=p_tenant
 WHERE p.plan=v_plan;
 IF v_limit IS NULL THEN RAISE EXCEPTION 'budget not configured' USING ERRCODE='P0002'; END IF;
 v_start:=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 SELECT COALESCE(sum(cost_brl),0) INTO v_used FROM public.ai_cost_ledger WHERE tenant_id=p_tenant AND created_at>=v_start;
 SELECT COALESCE(sum(reserved_brl),0) INTO v_held FROM public.ai_monetary_reservations WHERE tenant_id=p_tenant AND status='reserved';
 IF v_used+v_held+p_reserved_brl>v_limit::numeric/100 THEN RETURN false; END IF;
 INSERT INTO public.ai_monetary_reservations(id,tenant_id,reserved_brl) VALUES(p_id,p_tenant,p_reserved_brl);
 RETURN true;
END $$;

CREATE FUNCTION public.finish_ai_monetary(
 p_id uuid,p_success boolean,p_input integer DEFAULT 0,p_output integer DEFAULT 0,
 p_fx numeric DEFAULT 1,p_model text DEFAULT 'claude-haiku-4-5-20251001'
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tenant uuid; v_row public.ai_monetary_reservations%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_success IS NULL OR p_input<0 OR p_output<0 OR p_fx<=0 OR p_fx>100 OR length(p_model)>100 THEN
  RAISE EXCEPTION 'invalid settlement' USING ERRCODE='22023';
 END IF;
 SELECT tenant_id INTO v_tenant FROM public.ai_monetary_reservations WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing' USING ERRCODE='P0002'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_tenant::text||':ai_money',0));
 SELECT * INTO v_row FROM public.ai_monetary_reservations WHERE id=p_id FOR UPDATE;
 IF v_row.status!='reserved' THEN RETURN false; END IF;
 IF p_success THEN
  INSERT INTO public.ai_cost_ledger(tenant_id,source,model,input_tokens,output_tokens,input_usd_per_million,output_usd_per_million,usd_to_brl)
  VALUES(v_tenant,'dashboard_chat',p_model,p_input,p_output,1,5,p_fx);
  INSERT INTO public.usage_counters(tenant_id,key,value) VALUES(v_tenant,'ai_chat_tokens_used',p_input+p_output)
   ON CONFLICT(tenant_id,key) DO UPDATE SET value=public.usage_counters.value+EXCLUDED.value;
 END IF;
 UPDATE public.ai_monetary_reservations SET status=CASE WHEN p_success THEN 'settled' ELSE 'released' END,finished_at=now() WHERE id=p_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_monetary(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_monetary(uuid,boolean,integer,integer,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_monetary(uuid,uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_monetary(uuid,boolean,integer,integer,numeric,text) TO service_role;
