-- Infraestrutura de reservas de tokens de IA. Não ativar o fluxo enquanto
-- a unidade comercial (conversas vs tokens) não estiver reconciliada.
CREATE TABLE IF NOT EXISTS public.ai_token_reservations (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  reserved_tokens integer NOT NULL CHECK (reserved_tokens > 0),
  actual_tokens integer CHECK (actual_tokens >= 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','settled','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_token_reservations_open_idx
  ON public.ai_token_reservations (tenant_id, created_at)
  WHERE status = 'reserved';
ALTER TABLE public.ai_token_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_token_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_token_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_tokens(
  p_tenant_id uuid, p_reservation_id uuid, p_tokens integer, p_limit integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_used bigint; v_held bigint; v_existing public.ai_token_reservations%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  IF p_tenant_id IS NULL OR p_reservation_id IS NULL OR p_tokens IS NULL OR p_tokens <= 0
    OR (p_limit IS NOT NULL AND p_limit < 0) THEN
    RAISE EXCEPTION 'invalid reservation' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tenant_id::text || ':ai_tokens', 0));
  SELECT * INTO v_existing FROM public.ai_token_reservations WHERE id=p_reservation_id;
  IF FOUND THEN
    IF v_existing.tenant_id != p_tenant_id OR v_existing.reserved_tokens != p_tokens THEN
      RAISE EXCEPTION 'reservation conflict' USING ERRCODE='23505';
    END IF;
    RETURN v_existing.status = 'reserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id=p_tenant_id) THEN
    RAISE EXCEPTION 'tenant not found' USING ERRCODE='23503';
  END IF;
  SELECT COALESCE(value,0) INTO v_used FROM public.usage_counters
   WHERE tenant_id=p_tenant_id AND key='ai_chat_tokens_used';
  SELECT COALESCE(sum(reserved_tokens),0) INTO v_held FROM public.ai_token_reservations
   WHERE tenant_id=p_tenant_id AND status='reserved';
  IF p_limit IS NOT NULL AND COALESCE(v_used,0) + v_held + p_tokens > p_limit THEN
    RETURN false;
  END IF;
  INSERT INTO public.ai_token_reservations (id, tenant_id, reserved_tokens)
   VALUES (p_reservation_id,p_tenant_id,p_tokens);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.finish_ai_token_reservation(
  p_reservation_id uuid, p_actual_tokens integer, p_success boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_rec public.ai_token_reservations%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;
  IF p_reservation_id IS NULL OR p_success IS NULL OR
     (p_success AND (p_actual_tokens IS NULL OR p_actual_tokens < 0)) THEN
     RAISE EXCEPTION 'invalid settlement' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_rec FROM public.ai_token_reservations WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE='P0002'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_rec.tenant_id::text || ':ai_tokens', 0));
  IF v_rec.status != 'reserved' THEN
    RETURN false;
  END IF;
  IF p_success THEN
    INSERT INTO public.usage_counters (tenant_id, key, value)
      VALUES (v_rec.tenant_id,'ai_chat_tokens_used',p_actual_tokens)
      ON CONFLICT (tenant_id,key)
      DO UPDATE SET value=public.usage_counters.value+EXCLUDED.value;
  END IF;
  UPDATE public.ai_token_reservations SET
    status=CASE WHEN p_success THEN 'settled' ELSE 'released' END,
    actual_tokens=CASE WHEN p_success THEN p_actual_tokens ELSE NULL END,
    settled_at=now()
    WHERE id=p_reservation_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.reserve_ai_tokens(uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_token_reservation(uuid,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_tokens(uuid,uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_token_reservation(uuid,integer,boolean) TO service_role;
