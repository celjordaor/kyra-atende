-- E2: serialize deactivation/deletion with booking creation using the same tenant advisory lock.
-- Conservative policy: do not deactivate or delete when future pending/confirmed bookings exist.
-- This protects writes even when bypassing the Next.js API.
create or replace function public.prevent_resource_deactivation_with_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_id uuid;
  v_fk text;
  v_count bigint;
begin
  if tg_op = 'UPDATE' then
    if new.is_active is distinct from false or old.is_active is not distinct from false then
      return new;
    end if;
    v_tenant := old.tenant_id;
    v_id := old.id;
  else
    v_tenant := old.tenant_id;
    v_id := old.id;
  end if;

  -- The booking-creation RPC holds this same transaction lock before validating
  -- the professional/service. Therefore creation and deactivation serialize.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('availability-tenant:' || v_tenant::text, 0)
  );

  if tg_table_name = 'professionals' then
    select count(*) into v_count from public.bookings b
     where b.tenant_id = v_tenant and b.professional_id = v_id
       and b.status in ('pending','confirmed') and b.start_at >= now();
  elsif tg_table_name = 'services' then
    select count(*) into v_count from public.bookings b
     where b.tenant_id = v_tenant and b.service_id = v_id
       and b.status in ('pending','confirmed') and b.start_at >= now();
  else
    raise exception 'unsupported resource' using errcode='22023';
  end if;

  if v_count > 0 then
    raise exception 'resource_has_future_bookings'
      using errcode='P0001', detail='Pending/confirmed future bookings prevent deactivation or deletion.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists prevent_professional_deactivation_with_bookings on public.professionals;
create trigger prevent_professional_deactivation_with_bookings
before update of is_active or delete on public.professionals
for each row execute function public.prevent_resource_deactivation_with_bookings();

drop trigger if exists prevent_service_deactivation_with_bookings on public.services;
create trigger prevent_service_deactivation_with_bookings
before update of is_active or delete on public.services
for each row execute function public.prevent_resource_deactivation_with_bookings();

revoke all on function public.prevent_resource_deactivation_with_bookings() from public, anon, authenticated;
