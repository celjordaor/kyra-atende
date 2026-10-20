create or replace function public.save_availability_block(p_tenant uuid,p_actor uuid,p_id uuid,p_professional uuid,p_start timestamptz,p_end timestamptz,p_category text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=p_actor and tenant_id=p_tenant) then raise exception 'invalid actor' using errcode='42501';end if;
 if p_professional is not null and not exists(select 1 from public.professionals where id=p_professional and tenant_id=p_tenant) then raise exception 'invalid professional' using errcode='22023';end if;
 if p_start is null or p_end is null or p_start>=p_end or p_end-p_start>interval '366 days' or p_category not in ('holiday','unavailable','inactivity','absence') or length(coalesce(p_reason,''))>500 then raise exception 'invalid block' using errcode='22023';end if;
 if p_id is null then
  insert into public.availability_blocks(tenant_id,professional_id,starts_at,ends_at,category,reason)
  values(p_tenant,p_professional,p_start,p_end,p_category,nullif(trim(p_reason),''))
  returning id into v_id;
 else
  update public.availability_blocks set professional_id=p_professional,starts_at=p_start,ends_at=p_end,category=p_category,reason=nullif(trim(p_reason),'')
  where id=p_id and tenant_id=p_tenant returning id into v_id;
  if v_id is null then raise exception 'block not found' using errcode='P0002';end if;
 end if;
 return v_id;
end $$;
create or replace function public.delete_availability_block(p_tenant uuid,p_actor uuid,p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' or not exists(select 1 from public.profiles where id=p_actor and tenant_id=p_tenant) then raise exception 'unauthorized' using errcode='42501';end if;
 delete from public.availability_blocks where id=p_id and tenant_id=p_tenant;
 return found;
end $$;
revoke all on function public.save_availability_block(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.delete_availability_block(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_availability_block(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) to service_role;
grant execute on function public.delete_availability_block(uuid,uuid,uuid) to service_role;