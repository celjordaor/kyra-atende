CREATE OR REPLACE FUNCTION public.apply_verified_asaas_payment(p_payment_id text, p_event_id text, p_tenant_id uuid, p_plan text, p_period text, p_amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- Conversão de trial: contratação paga começa na confirmação, sem herdar o vencimento do teste.
  IF v_tenant.plan_status = 'trial' THEN
    v_start := now();
  ELSE
    v_start := coalesce(v_start,now());
  END IF;
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
$function$
