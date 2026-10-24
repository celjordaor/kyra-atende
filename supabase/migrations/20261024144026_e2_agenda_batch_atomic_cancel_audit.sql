create table if not exists public.agenda_batch_operations (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 actor_id uuid not null,
 operation text not null check (operation in ('cancel')),
 booking_ids uuid[] not null,
 count_changed integer not null,
 created_at timestamptz not null default now()
);
alter table public.agenda_batch_operations enable row level security;
revoke all on public.agenda_batch_operations from public,anon,authenticated;
grant select,insert on public.agenda_batch_operations to service_role;
create or replace function public.cancel_agenda_bookings_batch(p_tenant uuid,p_actor uuid,p_ids uuid[])
returns table(operation_id uuid,booking_id uuid,client_email text,client_name text,start_at timestamptz)
language plpgsql security invoker set search_path = public as $$
declare v_count integer; v_op uuid;
begin
 if p_tenant is null or p_actor is null or p_ids is null or cardinality(p_ids)<1 or cardinality(p_ids)>100
    or cardinality(array(select distinct unnest(p_ids)))<>cardinality(p_ids) then
   raise exception 'invalid_selection' using errcode='22023';
 end if;
 perform 1 from public.bookings b where b.tenant_id=p_tenant and b.id=any(p_ids) order by b.id for update;
 select count(*) into v_count from public.bookings b
 where b.tenant_id=p_tenant and b.id=any(p_ids)
 and b.status in ('pending','confirmed') and b.start_at>clock_timestamp();
 if v_count<>cardinality(p_ids) then
   raise exception 'stale_selection' using errcode='P0001';
 end if;
 insert into public.agenda_batch_operations(tenant_id,actor_id,operation,booking_ids,count_changed)
 values(p_tenant,p_actor,'cancel',p_ids,v_count) returning id into v_op;
 return query
  with updated as (
   update public.bookings b set status='cancelled',updated_at=now()
   where b.tenant_id=p_tenant and b.id=any(p_ids)
   returning b.id,b.client_email,b.client_name,b.start_at
  )
  select v_op,u.id,u.client_email,u.client_name,u.start_at from updated u;
end $$;
revoke all on function public.cancel_agenda_bookings_batch(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.cancel_agenda_bookings_batch(uuid,uuid,uuid[]) to service_role;
