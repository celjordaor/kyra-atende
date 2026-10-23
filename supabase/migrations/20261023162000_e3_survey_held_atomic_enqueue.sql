-- E3 P12.4: atomic, held-only survey outbox enqueue. Deliberately no claim/send operation.
create or replace function public.enqueue_held_survey_invitation(p_tenant uuid,p_invitation uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_inv public.survey_invitations%rowtype;
 v_booking public.bookings%rowtype;
 v_template public.survey_templates%rowtype;
 v_outbox public.survey_outbox%rowtype;
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'not authorized' using errcode='42501';
 end if;
 select * into v_inv from public.survey_invitations i
  where i.id=p_invitation and i.tenant_id=p_tenant for update;
 if not found then return jsonb_build_object('error','not_found'); end if;
 if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
  return jsonb_build_object('error','invitation_unavailable');
 end if;
 select * into v_booking from public.bookings b
  where b.id=v_inv.booking_id and b.tenant_id=p_tenant for update;
 select * into v_template from public.survey_templates t
  where t.id=v_inv.template_id and t.tenant_id=p_tenant;
 if v_booking.id is null or v_booking.client_id is null
  or v_template.id is null or v_template.status <> 'published' then
  return jsonb_build_object('error','ineligible');
 end if;
 if (v_template.kind='service_satisfaction' and v_booking.status<>'completed')
  or (v_template.kind='booking_experience' and v_booking.status not in ('confirmed','completed'))
  or v_template.kind not in ('service_satisfaction','booking_experience') then
  return jsonb_build_object('error','ineligible');
 end if;
 if exists(select 1 from public.survey_contact_opt_outs o
  where o.tenant_id=p_tenant and o.client_id=v_booking.client_id and o.purpose=v_template.kind) then
  return jsonb_build_object('error','opt_out');
 end if;
 insert into public.survey_outbox(tenant_id,invitation_id,state)
 values(p_tenant,p_invitation,'held')
 on conflict(invitation_id) do nothing;
 select * into v_outbox from public.survey_outbox o
  where o.tenant_id=p_tenant and o.invitation_id=p_invitation;
 if v_outbox.id is null then return jsonb_build_object('error','ineligible'); end if;
 return jsonb_build_object('id',v_outbox.id,'state',v_outbox.state,'automaticSendingAvailable',false);
end
$$;
revoke all on function public.enqueue_held_survey_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.enqueue_held_survey_invitation(uuid,uuid) to service_role;
