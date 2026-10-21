-- AUD-01: reserva atomica de quota outbound WhatsApp.
-- Limites comerciais verificados no backend; RPC acessivel somente a service_role.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_outbound_quota(
 p_tenant uuid, p_to text, p_body_sha256 text, p_limit integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE
 v_used bigint;
 v_pending bigint;
 v_id uuid;
 v_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
 IF p_tenant IS NULL OR p_limit < 0 OR p_to !~ '^[0-9]{8,16}$'
    OR p_body_sha256 !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'invalid outbound quota claim';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wa_quota:' || p_tenant::text, 0));
 SELECT coalesce(value,0) INTO v_used
 FROM public.usage_counters WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent';
 SELECT count(*) INTO v_pending FROM public.whatsapp_outbox
 WHERE tenant_id=p_tenant AND created_at >= v_start
   AND status IN ('sending','accepted','unknown','reconcile');
 IF v_used + v_pending >= p_limit THEN RETURN NULL; END IF;
 INSERT INTO public.whatsapp_outbox(tenant_id,to_number,body_sha256,status)
 VALUES(p_tenant,p_to,p_body_sha256,'sending') RETURNING id INTO v_id;
 RETURN v_id;
END;
$$;

-- Estado recorded e contador devem mudar na mesma transacao.
CREATE OR REPLACE FUNCTION public.finalize_whatsapp_outbound_quota(
 p_tenant uuid, p_outbox uuid, p_history uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE v_changed uuid;
BEGIN
 IF p_tenant IS NULL OR p_outbox IS NULL OR p_history IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wa_quota:' || p_tenant::text, 0));
 UPDATE public.whatsapp_outbox
 SET status='recorded',history_message_id=p_history,updated_at=now()
 WHERE id=p_outbox AND tenant_id=p_tenant AND status IN ('accepted','reconcile')
 RETURNING id INTO v_changed;
 IF v_changed IS NULL THEN RETURN false; END IF;
 INSERT INTO public.usage_counters(tenant_id,key,value)
 VALUES(p_tenant,'whatsapp_messages_sent',1)
 ON CONFLICT(tenant_id,key)
 DO UPDATE SET value=public.usage_counters.value+1;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_outbound_quota(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalize_whatsapp_outbound_quota(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_outbound_quota(uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_outbound_quota(uuid,uuid,uuid) TO service_role;
