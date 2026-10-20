create or replace function public.create_booking_checked(
 p_tenant uuid,p_client uuid,p_service uuid,p_professional uuid,p_start timestamptz,p_end timestamptz,p_notes text,p_status text default 'pending')
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.clients%rowtype; v_duration integer; v_tz text; v_day date; v_id uuid; v_configured boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('availability-tenant:'||p_tenant::text,0));
 if p_start is null or p_end is null or p_start<=now() or p_end<=p_start or length(coalesce(p_notes,''))>2000 or p_status not in ('pending','confirmed') then raise exception 'invalid booking' using errcode='22023';end if;
 select * into c from public.clients where tenant_id=p_tenant and id=p_client;
 if not found then raise exception 'client unavailable' using errcode='22023';end if;
 select duration_minutes into v_duration from public.services where tenant_id=p_tenant and id=p_service and is_active=true;
 if v_duration is null or v_duration not between 1 and 480 or p_end-p_start<>make_interval(mins=>v_duration) then raise exception 'invalid service' using errcode='22023';end if;
 select exists(select 1 from public.company_working_hours where tenant_id=p_tenant) into v_configured;
 if v_configured and p_professional is null then raise exception 'professional required' using errcode='22023';end if;
 if p_professional is not null then
  if not exists(select 1 from public.professionals where tenant_id=p_tenant and id=p_professional and is_active=true) then raise exception 'invalid professional' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||p_professional::text,0));
 end if;
 if v_configured then
  select coalesce(a.timezone,'America/Sao_Paulo') into v_tz from public.tenants t left join public.availability_settings a on a.tenant_id=t.id where t.id=p_tenant;
  v_day:=(p_start at time zone v_tz)::date;
  if not exists(select 1 from public.get_available_slots(p_tenant,p_service,v_day,p_professional) sl where sl.professional_id=p_professional and sl.starts_at=p_start and sl.ends_at=p_end) then raise exception 'slot unavailable' using errcode='23P01';end if;
 end if;
 insert into public.bookings(tenant_id,client_id,service_id,professional_id,client_name,client_phone,client_email,start_at,end_at,notes,status)
 values(p_tenant,p_client,p_service,p_professional,c.name,c.phone,c.email,p_start,p_end,nullif(trim(p_notes),''),p_status) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.create_booking_checked(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.create_booking_checked(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) to service_role;

create or replace function public.create_booking_from_invitation(p_tenant uuid,p_token_hash text,p_service uuid,p_professional uuid,p_start timestamptz,p_end timestamptz,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.booking_invitations%rowtype; result uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid invitation' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('availability-tenant:'||p_tenant::text,0));
 select * into inv from public.booking_invitations where tenant_id=p_tenant and token_hash=p_token_hash for update;
 if not found or inv.expires_at<=now() or inv.revoked_at is not null or inv.consumed_at is not null then raise exception 'invitation unavailable' using errcode='P0002';end if;
 result:=public.create_booking_checked(p_tenant,inv.client_id,p_service,p_professional,p_start,p_end,p_notes,'pending');
 update public.booking_invitations set consumed_at=now(),consumed_booking_id=result where id=inv.id;
 return result;
end $$;
revoke all on function public.create_booking_from_invitation(uuid,text,uuid,uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_booking_from_invitation(uuid,text,uuid,uuid,timestamptz,timestamptz,text) to service_role;