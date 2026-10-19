-- AUD-01: processamento idempotente de pagamentos confirmados do Asaas.
-- A tabela permanece privada: somente service_role pode invocar a RPC.
CREATE TABLE public.asaas_processed_payments (
  payment_id text PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  plan text NOT NULL,
  period text NOT NULL,
  amount numeric(12,2) NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.asaas_processed_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asaas_processed_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.asaas_processed_payments TO service_role;

CREATE OR REPLACE FUNCTION public.apply_verified_asaas_payment(
  p_payment_id text, p_event_id text, p_tenant_id uuid,
  p_plan text, p_period text, p_amount numeric
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_period interval;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF length(p_payment_id) < 3 OR length(p_event_id) < 3 OR
     p_plan NOT IN ('essencial','cresce','expande','enterprise') OR
     p_period NOT IN ('monthly','quarterly','semiannual','annual') OR
     p_amount <= 0 THEN
    RAISE EXCEPTION 'Parâmetros financeiros inválidos' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant não encontrado' USING ERRCODE = '23503';
  END IF;

  -- Uma cobrança nunca concede duas ativações, independentemente de reenvios
  -- ou tipos distintos de evento (CONFIRMED e RECEIVED).
  IF EXISTS(SELECT 1 FROM public.asaas_processed_payments WHERE payment_id=p_payment_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.asaas_processed_payments
    (payment_id,event_id,tenant_id,plan,period,amount)
  VALUES (p_payment_id,p_event_id,p_tenant_id,p_plan,p_period,p_amount);

  v_period := CASE p_period
    WHEN 'monthly' THEN interval '1 month'
    WHEN 'quarterly' THEN interval '3 months'
    WHEN 'semiannual' THEN interval '6 months'
    ELSE interval '12 months' END;

  SELECT greatest(now(), coalesce(current_period_end, now()))
    INTO v_start FROM public.subscriptions WHERE tenant_id=p_tenant_id FOR UPDATE;

  v_start := coalesce(v_start,now());
  v_end := v_start + v_period;

  UPDATE public.tenants SET plan=p_plan,plan_status='active'
  WHERE id=p_tenant_id;

  UPDATE public.subscriptions
  SET plan=p_plan,status='active',billing_cycle=p_period,period=p_period,
      amount=p_amount,current_period_start=v_start,current_period_end=v_end
  WHERE tenant_id=p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.billing_events
    (tenant_id,event_type,plan_from,plan_to,amount,meta)
  VALUES (p_tenant_id,'asaas.payment.confirmed',v_tenant.plan,p_plan,p_amount,
          jsonb_build_object('payment_id',p_payment_id,'event_id',p_event_id,'period',p_period));

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_verified_asaas_payment(text,text,uuid,text,text,numeric)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_asaas_payment(text,text,uuid,text,text,numeric)
TO service_role;
