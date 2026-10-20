-- Acquire tenant advisory lock BEFORE reservation row lock to match reserve_ai_tokens.
CREATE OR REPLACE FUNCTION public.finish_ai_token_reservation(
  p_reservation_id uuid, p_actual_tokens integer, p_success boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_rec public.ai_token_reservations%ROWTYPE; v_tenant uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  IF p_reservation_id IS NULL OR p_success IS NULL OR
     (p_success AND (p_actual_tokens IS NULL OR p_actual_tokens < 0)) THEN
    RAISE EXCEPTION 'invalid settlement' USING ERRCODE='22023';
  END IF;
  SELECT tenant_id INTO v_tenant FROM public.ai_token_reservations WHERE id=p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE='P0002'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_tenant::text || ':ai_tokens', 0));
  SELECT * INTO v_rec FROM public.ai_token_reservations WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE='P0002'; END IF;
  IF v_rec.status != 'reserved' THEN RETURN false; END IF;
  IF p_success THEN
    INSERT INTO public.usage_counters(tenant_id,key,value)
      VALUES(v_rec.tenant_id,'ai_chat_tokens_used',p_actual_tokens)
      ON CONFLICT(tenant_id,key) DO UPDATE
       SET value=public.usage_counters.value+EXCLUDED.value;
  END IF;
  UPDATE public.ai_token_reservations SET
    status=CASE WHEN p_success THEN 'settled' ELSE 'released' END,
    actual_tokens=CASE WHEN p_success THEN p_actual_tokens ELSE NULL END,
    settled_at=now()
  WHERE id=p_reservation_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finish_ai_token_reservation(uuid,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_ai_token_reservation(uuid,integer,boolean) TO service_role;
