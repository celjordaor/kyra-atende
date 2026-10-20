create or replace function public.reschedule_booking_atomic(p_tenant uuid,p_actor uuid,p_booking uuid,p_client uuid,p_professional uuid,p_service uuid,p_start timestamptz,p_end timestamptz,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.bookings%rowtype;client public.clients%rowtype;v_timezone text;v_day date;v_hours bool;v_service_duration int;v_updated uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=p_actor and tenant_id=p_tenant) then raise exception 'invalid actor' using errcode='42501';end if;
 select * into old from public.bookings where id=p_booking and tenant_id=p_tenant for update;
 if not found then raise exception 'booking not found' using errcode='P0002';end if;
 if old.status not in ('pending','confirmed') then raise exception 'booking closed' using errcode='23514';end if;
 if p_professional is null or p_start is null or p_end is null or p_start<=now() or p_end<=p_start or p_end-p_start>interval '8 hours' or length(coalesce(p_notes,''))>2000 then raise exception 'invalid booking' using errcode='22023';end if;
 select * into client from public.clients where id=p_client and tenant_id=p_tenant;
 if not found then raise exception 'invalid client' using errcode='22023';end if;
 select duration_minutes into v_service_duration from public.services where id=p_service and tenant_id=p_tenant and is_active=true;
 if v_service_duration is null or p_end-p_start<>make_interval(mins=>v_service_duration) then raise exception 'invalid service duration' using errcode='22023';end if;
 if not exists(select 1 from public.professionals where id=p_professional and tenant_id=p_tenant and is_active=true) then raise exception 'invalid professional' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('booking-slot:'||p_tenant::text||':'||p_professional::text,0));
 select exists(select 1 from public.company_working_hours where tenant_id=p_tenant) into v_hours;
 if v_hours then
  select coalesce(s.timezone,'America/Sao_Paulo') into v_timezone from public.tenants t left join public.availability_settings s on s.tenant_id=t.id where t.id=p_tenant;
  v_day:=(p_start at time zone v_timezone)::date;
  if not exists(select 1 from public.get_available_slots_for_reschedule(p_tenant,p_service,v_day,p_professional,p_booking) z where z.starts_at=p_start and z.ends_at=p_end) then
   raise exception 'slot unavailable' using errcode='23P01';
  end if;
 end if;
 update public.bookings set client_id=p_client,professional_id=p_professional,service_id=p_service,start_at=p_start,end_at=p_end,
  client_name=client.name,client_phone=client.phone,client_email=client.email,notes=p_notes
 where id=p_booking and tenant_id=p_tenant and status in ('pending','confirmed') returning id into v_updated;
 if v_updated is null then raise exception 'booking not updated' using errcode='P0002';end if;
 return v_updated;
end $$;
revoke all on function public.reschedule_booking_atomic(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.reschedule_booking_atomic(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text) to service_role;