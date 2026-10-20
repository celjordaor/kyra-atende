create or replace function public.save_professional_availability(p_tenant uuid,p_actor uuid,p_professional uuid,p_mode text,p_hours jsonb,p_service_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; d integer; st time; en time;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=p_actor and tenant_id=p_tenant) or not exists(select 1 from public.professionals where id=p_professional and tenant_id=p_tenant) then raise exception 'invalid tenant context' using errcode='42501';end if;
 if p_mode not in ('inherit','custom') or jsonb_typeof(p_hours)!='array' or jsonb_array_length(p_hours)>42 then raise exception 'invalid settings' using errcode='22023';end if;
 if coalesce(array_length(p_service_ids,1),0)>200 or exists(select 1 from unnest(p_service_ids) x where not exists(select 1 from public.services s where s.id=x and s.tenant_id=p_tenant)) then raise exception 'invalid services' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('professional-hours:'||p_professional::text,0));
 create temporary table if not exists pg_temp.new_professional_hours(day smallint,starts_at time,ends_at time) on commit drop;
 truncate pg_temp.new_professional_hours;
 for item in select value from jsonb_array_elements(p_hours) loop
  if (item->>'weekday') !~ '^[0-6]$' or (item->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (item->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'invalid interval' using errcode='22023';end if;
  d:=(item->>'weekday')::integer;st:=(item->>'start')::time;en:=(item->>'end')::time;
  if st>=en then raise exception 'invalid time range' using errcode='22023';end if;
  insert into pg_temp.new_professional_hours values(d,st,en);
 end loop;
 if exists(select 1 from pg_temp.new_professional_hours a join pg_temp.new_professional_hours b on a.day=b.day and a.ctid<>b.ctid and a.starts_at<b.ends_at and b.starts_at<a.ends_at) then raise exception 'overlapping hours' using errcode='22023';end if;
 insert into public.professional_availability_settings(professional_id,tenant_id,mode) values(p_professional,p_tenant,p_mode) on conflict(professional_id) do update set mode=excluded.mode;
 delete from public.professional_working_hours where tenant_id=p_tenant and professional_id=p_professional;
 insert into public.professional_working_hours(professional_id,tenant_id,weekday,starts_at,ends_at) select p_professional,p_tenant,day,starts_at,ends_at from pg_temp.new_professional_hours;
 delete from public.professional_services where tenant_id=p_tenant and professional_id=p_professional;
 insert into public.professional_services(tenant_id,professional_id,service_id) select p_tenant,p_professional,distinct_ids.id from (select distinct unnest(p_service_ids) id) distinct_ids;
end $$;
revoke all on function public.save_professional_availability(uuid,uuid,uuid,text,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.save_professional_availability(uuid,uuid,uuid,text,jsonb,uuid[]) to service_role;