create or replace function public.save_asaas_payment_review(
 p_payment_id text,p_actor_id uuid,p_status text,p_reason text,p_note text
) returns void language plpgsql security definer set search_path='' as $$
declare v_tenant uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not authorized' using errcode='42501'; end if;
 if p_actor_id is null or p_status not in ('pending_review','reviewed','escalated') or p_reason not in ('refund','chargeback','cancelled','other') or length(trim(coalesce(p_note,''))) not between 5 and 1000 then
 raise exception 'invalid review' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles where id=p_actor_id and role='superadmin') then raise exception 'not superadmin' using errcode='42501'; end if;
 select tenant_id into v_tenant from public.asaas_processed_payments where payment_id=p_payment_id;
 if not found then raise exception 'payment missing' using errcode='P0002'; end if;
 insert into public.asaas_payment_reviews(payment_id,tenant_id,status,reason,note,reviewed_by)
 values(p_payment_id,v_tenant,p_status,p_reason,trim(p_note),p_actor_id)
 on conflict(payment_id) do update set status=excluded.status,reason=excluded.reason,note=excluded.note,reviewed_by=excluded.reviewed_by,updated_at=now(),reviewed_at=now();
 insert into public.admin_audit_events(actor_id,action,resource_type,resource_id,changes)
 values(p_actor_id,'asaas.payment.review','asaas_payment',p_payment_id,jsonb_build_object('status',p_status,'reason',p_reason,'tenant_id',v_tenant));
end $$;
revoke all on function public.save_asaas_payment_review(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.save_asaas_payment_review(text,uuid,text,text,text) to service_role;