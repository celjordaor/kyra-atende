alter table public.agenda_batch_operations drop constraint if exists agenda_batch_operations_operation_check;
alter table public.agenda_batch_operations add constraint agenda_batch_operations_operation_check check(operation in ('cancel','transfer','block'));

create or replace function public.transfer_agenda_bookings_batch(p_tenant uuid,p_actor uuid,p_ids uuid[],p_kind text,p_target uuid)
returns table(operation_id uuid,booking_id uuid,client_email text,client_name text,start_at timestamptz)
language plpgsql security invoker set search_path=public as $$
declare b record; n integer; mins integer; pro uuid; svc uuid; ending timestamptz; op uuid;
begin
 if p_tenant is null or p_actor is null or p_target is null or p_kind not in ('professional','service')
 or p_ids is null or cardinality(p_ids)<1 or cardinality(p_ids)>20
 or cardinality(array(select distinct unnest(p_ids)))<>cardinality(p_ids) then
  raise exception 'invalid selection' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('availability-tenant:'||p_tenant::text,0));
 if p_kind='professional' and not exists(select 1 from public.professionals where tenant_id=p_tenant and id=p_target and is_active)
 then raise exception 'invalid professional' using errcode='22023';end if;
 if p_kind='service' then
 select duration_minutes into mins from public.services where tenant_id=p_tenant and id=p_target and is_active;
 if mins is null or mins<1 or mins>480 then raise exception 'invalid service' using errcode='22023';end if;end if;
 perform 1 from public.bookings where tenant_id=p_tenant and id=any(p_ids) order by id for update;
 select count(*) into n from public.bookings where tenant_id=p_tenant and id=any(p_ids) and status in ('pending','confirmed') and start_at>clock_timestamp();
 if n<>cardinality(p_ids) then raise exception 'stale selection' using errcode='P0001';end if;
 for b in select * from public.bookings where tenant_id=p_tenant and id=any(p_ids) order by id loop
 pro:=case when p_kind='professional' then p_target else b.professional_id end;
 svc:=case when p_kind='service' then p_target else b.service_id end;
 if pro is null or svc is null then raise exception 'invalid booking' using errcode='22023';end if;
 ending:=case when p_kind='service' then b.start_at+make_interval(mins=>mins) else b.end_at end;
 perform public.reschedule_booking_atomic(p_tenant,p_actor,b.id,b.client_id,pro,svc,b.start_at,ending,b.notes);
 end loop;
 insert into public.agenda_batch_operations(tenant_id,actor_id,operation,booking_ids,count_changed)
 values(p_tenant,p_actor,'transfer',p_ids,n) returning id into op;
 return query select op,x.id,x.client_email,x.client_name,x.start_at from public.bookings x where x.tenant_id=p_tenant and x.id=any(p_ids);
end $$;
revoke all on function public.transfer_agenda_bookings_batch(uuid,uuid,uuid[],text,uuid) from public,anon,authenticated;
grant execute on function public.transfer_agenda_bookings_batch(uuid,uuid,uuid[],text,uuid) to service_role;

create or replace function public.create_agenda_block_checked(p_tenant uuid,p_actor uuid,p_professional uuid,p_start timestamptz,p_end timestamptz,p_reason text)
returns table(operation_id uuid,block_id uuid)
language plpgsql security invoker set search_path=public as $$
declare bid uuid;op uuid;
begin
 if p_tenant is null or p_actor is null or p_start is null or p_end is null
 or p_start<=clock_timestamp() or p_end<=p_start or p_end-p_start>interval '31 days'
 or length(coalesce(p_reason,''))>500 then raise exception 'invalid period' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('availability-tenant:'||p_tenant::text,0));
 if exists(select 1 from public.bookings x where x.tenant_id=p_tenant and x.status in ('pending','confirmed')
 and x.start_at<p_end and x.end_at>p_start and (p_professional is null or x.professional_id=p_professional))
 then raise exception 'bookings affected' using errcode='P0001';end if;
 select public.save_availability_block(p_tenant,p_actor,null,p_professional,p_start,p_end,'unavailable',p_reason) into bid;
 insert into public.agenda_batch_operations(tenant_id,actor_id,operation,booking_ids,count_changed)
 values(p_tenant,p_actor,'block',array[]::uuid[],1) returning id into op;
 return query select op,bid;
end $$;
revoke all on function public.create_agenda_block_checked(uuid,uuid,uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.create_agenda_block_checked(uuid,uuid,uuid,timestamptz,timestamptz,text) to service_role;
