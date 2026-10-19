-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019032033: aud01_atomic_idempotent_signup
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.



CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  p_user_id uuid, p_email text, p_name text, p_company text, p_slug text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
  v_email text;
  v_confirmed timestamptz;
  v_claim_tenant text;
  v_trial_end timestamptz := now() + interval '14 days';
BEGIN
  -- O lock da linha de auth.users serializa tentativas concorrentes
  -- de provisionamento para a mesma identidade.
  SELECT email, email_confirmed_at, raw_app_meta_data ->> 'tenant_id'
    INTO v_email, v_confirmed, v_claim_tenant
    FROM auth.users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND OR v_confirmed IS NULL OR
     lower(v_email) IS DISTINCT FROM lower(p_email) THEN
    RAISE EXCEPTION 'Conta não verificada'
      USING ERRCODE = '28000';
  END IF;

  IF nullif(trim(p_name), '') IS NULL OR nullif(trim(p_company), '') IS NULL OR
     length(p_name) > 200 OR length(p_company) > 200 THEN
    RAISE EXCEPTION 'Dados inválidos' USING ERRCODE = '22023';
  END IF;

  SELECT tenant_id INTO v_tenant_id
    FROM public.profiles WHERE id = p_user_id;

  IF v_tenant_id IS NOT NULL THEN
    IF v_claim_tenant IS NOT NULL AND v_claim_tenant <> v_tenant_id::text THEN
      RAISE EXCEPTION 'Vínculo de tenant inconsistente'
        USING ERRCODE = '23514';
    END IF;
    -- Recupera claim ausente de um cadastro legado/interrompido.
    IF v_claim_tenant IS NULL THEN
      UPDATE auth.users SET raw_app_meta_data =
        coalesce(raw_app_meta_data,'{}'::jsonb)
        || jsonb_build_object('tenant_id', v_tenant_id)
      WHERE id = p_user_id;
    END IF;
    -- Retorno idempotente após sucesso anterior.
    RETURN v_tenant_id;
  END IF;

  IF v_claim_tenant IS NOT NULL THEN
    RAISE EXCEPTION 'Conta já vinculada a tenant'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.tenants
    (name,slug,owner_id,owner_email,plan,plan_status,trial_ends_at)
  VALUES (trim(p_company), p_slug, p_user_id, v_email, 'cresce', 'trial', v_trial_end)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.profiles (id,tenant_id,name,email,role)
  VALUES (p_user_id,v_tenant_id,trim(p_name),v_email,'admin');

  INSERT INTO public.subscriptions
    (tenant_id,plan,status,billing_cycle,trial_ends_at,current_period_start,current_period_end)
  VALUES (v_tenant_id,'cresce','trial','monthly',v_trial_end,now(),v_trial_end);

  UPDATE auth.users
     SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
       || jsonb_build_object('tenant_id', v_tenant_id)
   WHERE id=p_user_id;

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(uuid,text,text,text,text)
  TO service_role;

