create or replace function public.create_public_booking_atomic(
 p_tenant uuid,p_service uuid,p_professional uuid,p_start timestamptz,p_end timestamptz,
 p_name text,p_phone text,p_email text,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_client uuid;v_id uuid;v_name text;v_phone text;v_email text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 v_name:=trim(coalesce(p_name,''));v_phone:=trim(coalesce(p_phone,''));v_email:=nullif(lower(trim(coalesce(p_email,''))),'');
 if length(v_name) not between 2 and 200 or length(v_phone) not between 4 and 40 or length(coalesce(v_email,''))>254 then raise exception 'invalid client data' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('availability-tenant:'||p_tenant::text,0));
 -- Preserve legacy phone matching, but never treat phone match as proof of identity.
 select id into v_client from public.clients where tenant_id=p_tenant and phone=v_phone order by created_at,id limit 1;
 if v_client is null then
  insert into public.clients(tenant_id,name,phone,email,status,source)
  values(p_tenant,v_name,v_phone,v_email,'lead','booking') returning id into v_client;
 end if;
 v_id:=public.create_booking_checked(p_tenant,v_client,p_service,p_professional,p_start,p_end,p_notes,'pending');
 return v_id;
end $$;
revoke all on function public.create_public_booking_atomic(uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_public_booking_atomic(uuid,uuid,uuid,timestamptz,timestamptz,text,text,text,text) to service_role;