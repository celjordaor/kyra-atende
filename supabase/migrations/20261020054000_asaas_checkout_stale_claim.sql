create or replace function public.claim_asaas_checkout(p_tenant uuid,p_plan text,p_period text,p_amount numeric,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.asaas_checkout_attempts%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_id is null or p_tenant is null or p_plan not in ('essencial','cresce','expande','enterprise') or p_period not in ('monthly','quarterly','semiannual','annual') or p_amount<=0 then raise exception 'invalid claim' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_plan||':'||p_period,0));
 update public.asaas_checkout_attempts set status='uncertain',updated_at=now()
 where tenant_id=p_tenant and plan=p_plan and period=p_period and amount=p_amount
 and status='started' and created_at<now()-interval '15 minutes';
 select * into v from public.asaas_checkout_attempts
 where tenant_id=p_tenant and plan=p_plan and period=p_period and amount=p_amount
 and (status in ('started','uncertain') or (status='link_created' and created_at>now()-interval '24 hours'))
 order by created_at desc limit 1;
 if found then return jsonb_build_object('created',false,'status',v.status,'payment_url',case when v.status='link_created' then v.payment_url else null end); end if;
 insert into public.asaas_checkout_attempts(id,tenant_id,plan,period,amount,status) values(p_id,p_tenant,p_plan,p_period,p_amount,'started');
 return jsonb_build_object('created',true,'status','started');
end $$;
revoke all on function public.claim_asaas_checkout(uuid,text,text,numeric,uuid) from public,anon,authenticated;
grant execute on function public.claim_asaas_checkout(uuid,text,text,numeric,uuid) to service_role;