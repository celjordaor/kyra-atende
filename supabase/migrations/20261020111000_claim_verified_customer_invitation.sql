create or replace function public.claim_customer_invitation(p_identity uuid,p_tenant uuid,p_token_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_email text;v_client uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Unauthorized' using errcode='42501';end if;
 select lower(trim(email)) into v_email from auth.users where id=p_identity and email_confirmed_at is not null;
 if v_email is null then raise exception 'E-mail não confirmado' using errcode='42501';end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Convite inválido' using errcode='22023';end if;
 select i.client_id into v_client from public.booking_invitations i
 join public.clients c on c.id=i.client_id and c.tenant_id=i.tenant_id
 where i.tenant_id=p_tenant and i.token_hash=p_token_hash
 and i.revoked_at is null and i.expires_at>now()
 and lower(trim(c.email))=v_email
 and i.consumed_at is not null and i.consumed_booking_id is not null
 and exists(select 1 from public.bookings b where b.id=i.consumed_booking_id and b.tenant_id=p_tenant and b.client_id=c.id)
 for update of i;
 if v_client is null then return false;end if;
 insert into public.customer_identities(id) values(p_identity) on conflict do nothing;
 insert into public.customer_memberships(identity_id,tenant_id,client_id)
 values(p_identity,p_tenant,v_client) on conflict do nothing;
 return true;
end $$;
revoke all on function public.claim_customer_invitation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_customer_invitation(uuid,uuid,text) to service_role;