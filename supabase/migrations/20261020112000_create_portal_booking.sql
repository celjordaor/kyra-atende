create or replace function public.create_portal_booking(p_identity uuid,p_tenant uuid,p_client uuid,p_service uuid,p_professional uuid,p_start timestamptz,p_notes text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_client public.clients%rowtype;v_duration integer;v_end timestamptz;v_date date;v_tz text;v_id uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not authorized' using errcode='42501';end if;
 if not exists(select 1 from public.customer_memberships where identity_id=p_identity and tenant_id=p_tenant and client_id=p_client) then raise exception 'membership unavailable' using errcode='42501';end if;
 if p_professional is null then raise exception 'select professional' using errcode='22023';end if;
 if p_start is null or p_start<=now() or length(coalesce(p_notes,''))>2000 then raise exception 'invalid booking' using errcode='22023';end if;
 select * into v_client from public.clients where id=p_client and tenant_id=p_tenant;
 if not found then raise exception 'client not found' using errcode='22023';end if;
 select duration_minutes into v_duration from public.services where id=p_service and tenant_id=p_tenant and is_active;
 if v_duration is null or v_duration not between 1 and 480 then raise exception 'invalid service' using errcode='22023';end if;
 v_end:=p_start+make_interval(mins=>v_duration);
 select coalesce(s.timezone,'America/Sao_Paulo') into v_tz from public.tenants t left join public.availability_settings s on s.tenant_id=t.id where t.id=p_tenant;
 if v_tz is null then raise exception 'invalid tenant' using errcode='22023';end if;
 v_date:=(p_start at time zone v_tz)::date;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_professional::text,0));
 if not exists(select 1 from public.get_available_slots(p_tenant,p_service,v_date,p_professional) slot where slot.professional_id=p_professional and slot.starts_at=p_start and slot.ends_at=v_end) then raise exception 'slot unavailable' using errcode='23P01';end if;
 insert into public.bookings(tenant_id,client_id,professional_id,service_id,client_name,client_phone,client_email,start_at,end_at,notes,status)
 values(p_tenant,p_client,p_professional,p_service,v_client.name,v_client.phone,v_client.email,p_start,v_end,nullif(trim(p_notes),''),'pending') returning id into v_id;
 return v_id;
end $$;
revoke all on function public.create_portal_booking(uuid,uuid,uuid,uuid,uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_portal_booking(uuid,uuid,uuid,uuid,uuid,timestamptz,text) to service_role;