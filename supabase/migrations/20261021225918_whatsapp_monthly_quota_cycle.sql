-- AUD-01: virada mensal sem dependencia do cron NestJS.
-- reset_at ancora o inicio do ciclo UTC; contadores sem ancora mantem o saldo existente no mes atual.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_outbound_quota(
 p_tenant uuid, p_to text, p_body_sha256 text, p_limit integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE
 v_used bigint := 0;
 v_pending bigint;
 v_id uuid;
 v_cycle timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 v_saved_cycle timestamptz;
 v_saved_value integer;
BEGIN
 IF p_tenant IS NULL OR p_limit IS NULL OR p_limit < 0 OR p_to !~ '^[0-9]{8,16}$'
    OR p_body_sha256 !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'invalid outbound quota claim';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wa_quota:' || p_tenant::text, 0));
 INSERT INTO public.usage_counters(tenant_id,key,value,reset_at)
 VALUES(p_tenant,'whatsapp_messages_sent',0,v_cycle)
 ON CONFLICT (tenant_id,key) DO NOTHING;
 SELECT value,reset_at INTO v_saved_value,v_saved_cycle
 FROM public.usage_counters WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent' FOR UPDATE;
 IF v_saved_cycle IS NULL THEN
  -- Legacy: saldo de outubro continua valendo; apenas identifica seu ciclo.
  UPDATE public.usage_counters SET reset_at=v_cycle
  WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent';
  v_used:=v_saved_value;
 ELSIF v_saved_cycle < v_cycle THEN
  UPDATE public.usage_counters SET value=0,reset_at=v_cycle
  WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent';
  v_used:=0;
 ELSIF v_saved_cycle > v_cycle THEN
  RAISE EXCEPTION 'quota cycle in future';
 ELSE
  v_used:=v_saved_value;
 END IF;
 SELECT count(*) INTO v_pending FROM public.whatsapp_outbox
 WHERE tenant_id=p_tenant AND created_at >= v_cycle
   AND status IN ('sending','accepted','unknown','reconcile');
 IF v_used + v_pending >= p_limit THEN RETURN NULL; END IF;
 INSERT INTO public.whatsapp_outbox(tenant_id,to_number,body_sha256,status)
 VALUES(p_tenant,p_to,p_body_sha256,'sending') RETURNING id INTO v_id;
 RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_whatsapp_outbound_quota(
 p_tenant uuid, p_outbox uuid, p_history uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE
 v_changed uuid;
 v_message_cycle timestamptz;
 v_cycle timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 v_saved_cycle timestamptz;
BEGIN
 IF p_tenant IS NULL OR p_outbox IS NULL OR p_history IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wa_quota:' || p_tenant::text, 0));
 SELECT date_trunc('month', created_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
 INTO v_message_cycle FROM public.whatsapp_outbox WHERE id=p_outbox AND tenant_id=p_tenant FOR UPDATE;
 IF v_message_cycle IS NULL THEN RETURN false; END IF;
 UPDATE public.whatsapp_outbox
 SET status='recorded',history_message_id=p_history,updated_at=now()
 WHERE id=p_outbox AND tenant_id=p_tenant AND status IN ('accepted','reconcile')
 RETURNING id INTO v_changed;
 IF v_changed IS NULL THEN RETURN false; END IF;
 -- Mensagem do mes anterior nunca consome quota do mes novo.
 IF v_message_cycle <> v_cycle THEN RETURN true; END IF;
 INSERT INTO public.usage_counters(tenant_id,key,value,reset_at)
 VALUES(p_tenant,'whatsapp_messages_sent',0,v_cycle)
 ON CONFLICT (tenant_id,key) DO NOTHING;
 SELECT reset_at INTO v_saved_cycle FROM public.usage_counters
 WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent' FOR UPDATE;
 IF v_saved_cycle IS NULL OR v_saved_cycle < v_cycle THEN
  UPDATE public.usage_counters SET value=0,reset_at=v_cycle
  WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent';
 ELSIF v_saved_cycle > v_cycle THEN
  RAISE EXCEPTION 'quota cycle in future';
 END IF;
 UPDATE public.usage_counters SET value=value+1
 WHERE tenant_id=p_tenant AND key='whatsapp_messages_sent';
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_outbound_quota(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalize_whatsapp_outbound_quota(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_outbound_quota(uuid,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_outbound_quota(uuid,uuid,uuid) TO service_role;
