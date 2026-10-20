create or replace function public.save_company_working_hours(p_tenant uuid,p_actor uuid,p_hours jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; d integer; st time; en time; n integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=p_actor and tenant_id=p_tenant) then raise exception 'invalid tenant actor' using errcode='42501';end if;
 if jsonb_typeof(p_hours)!='array' or jsonb_array_length(p_hours)>42 then raise exception 'invalid hours' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('hours:'||p_tenant::text,0));
 create temporary table if not exists pg_temp.new_company_hours(day smallint,starts_at time,ends_at time) on commit drop;
 truncate table pg_temp.new_company_hours;
 for item in select value from jsonb_array_elements(p_hours) loop
  if jsonb_typeof(item)!='object' or (item->>'weekday') !~ '^[0-6]$' or (item->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (item->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'invalid interval' using errcode='22023';end if;
  d:=(item->>'weekday')::integer;st:=(item->>'start')::time;en:=(item->>'end')::time;
  if st>=en then raise exception 'invalid range' using errcode='22023';end if;
  insert into pg_temp.new_company_hours values(d,st,en);
 end loop;
 if exists(select 1 from pg_temp.new_company_hours a join pg_temp.new_company_hours b on a.day=b.day and a.ctid<>b.ctid and a.starts_at<b.ends_at and b.starts_at<a.ends_at) then raise exception 'overlapping hours' using errcode='22023';end if;
 delete from public.company_working_hours where tenant_id=p_tenant;
 insert into public.company_working_hours(tenant_id,weekday,starts_at,ends_at) select p_tenant,day,starts_at,ends_at from pg_temp.new_company_hours;
end $$;
revoke all on function public.save_company_working_hours(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_company_working_hours(uuid,uuid,jsonb) to service_role;