create or replace function public.get_available_slots(p_tenant uuid,p_service uuid,p_date date,p_professional uuid default null)
returns table(professional_id uuid,starts_at timestamptz,ends_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_tz text;v_duration int;v_notice int;v_horizon int;v_enforce boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 select duration_minutes into v_duration from public.services where id=p_service and tenant_id=p_tenant and is_active=true;
 if v_duration is null or v_duration<=0 or v_duration>480 then raise exception 'invalid service' using errcode='22023';end if;
 select coalesce(s.timezone,'America/Sao_Paulo'),coalesce(s.booking_notice_minutes,0),coalesce(s.booking_horizon_days,90)
 into v_tz,v_notice,v_horizon from public.tenants t left join public.availability_settings s on s.tenant_id=t.id where t.id=p_tenant;
 if v_tz is null then raise exception 'invalid tenant' using errcode='22023';end if;
 if p_date< (now() at time zone v_tz)::date or p_date>(now() at time zone v_tz)::date+v_horizon then return;end if;
 select coalesce(enforce_links,false) into v_enforce from public.service_assignment_settings where tenant_id=p_tenant;
 v_enforce:=coalesce(v_enforce,false);
 return query
 with candidates as (
  select pr.id from public.professionals pr
  where pr.tenant_id=p_tenant and pr.is_active=true and (p_professional is null or pr.id=p_professional)
  and (not v_enforce or exists(select 1 from public.professional_services ps where ps.tenant_id=p_tenant and ps.professional_id=pr.id and ps.service_id=p_service))
 ),ranges as (
  select c.id as pid,greatest(ch.starts_at,coalesce(ph.starts_at,ch.starts_at)) as lo,
         least(ch.ends_at,coalesce(ph.ends_at,ch.ends_at)) as hi
  from candidates c
  join public.company_working_hours ch on ch.tenant_id=p_tenant and ch.weekday=extract(dow from p_date)::int
  left join public.professional_availability_settings cfg on cfg.professional_id=c.id and cfg.tenant_id=p_tenant
  left join public.professional_working_hours ph on ph.professional_id=c.id and ph.tenant_id=p_tenant
       and ph.weekday=ch.weekday and cfg.mode='custom'
  where coalesce(cfg.mode,'inherit')='inherit' or (cfg.mode='custom' and ph.id is not null)
 ), slots as (
  select r.pid, series.tm at time zone v_tz as slot_start,
   (series.tm at time zone v_tz)+make_interval(mins=>v_duration) as slot_end
  from ranges r cross join lateral generate_series(
   date_trunc('hour',p_date+r.lo)+make_interval(mins=15*ceil(extract(minute from r.lo)/15)::int),
   p_date+r.hi-make_interval(mins=>v_duration),
   interval '15 minutes') as series(tm)
  where r.lo<r.hi
 )
 select sl.pid,sl.slot_start,sl.slot_end from slots sl
 where sl.slot_start>=now()+make_interval(mins=>v_notice)
 and not exists(select 1 from public.availability_blocks b where b.tenant_id=p_tenant and (b.professional_id is null or b.professional_id=sl.pid) and b.starts_at<sl.slot_end and b.ends_at>sl.slot_start)
 and not exists(select 1 from public.bookings bk where bk.tenant_id=p_tenant and bk.professional_id=sl.pid and bk.status in ('pending','confirmed') and bk.start_at<sl.slot_end and bk.end_at>sl.slot_start)
 order by sl.slot_start,sl.pid limit 1000;
end $$;
revoke all on function public.get_available_slots(uuid,uuid,date,uuid) from public,anon,authenticated;
grant execute on function public.get_available_slots(uuid,uuid,date,uuid) to service_role;