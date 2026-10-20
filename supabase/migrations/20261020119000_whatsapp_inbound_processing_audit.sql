create table if not exists public.whatsapp_inbound_processing (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 external_id text not null,
 message_id uuid references public.whatsapp_messages(id) on delete set null,
 status text not null default 'processing' check(status in ('processing','done','needs_review')),
 started_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 failure_stage text,
 unique(tenant_id,external_id)
);
create index if not exists whatsapp_inbound_processing_review on public.whatsapp_inbound_processing(status,updated_at) where status <> 'done';
alter table public.whatsapp_inbound_processing enable row level security;
revoke all on public.whatsapp_inbound_processing from public,anon,authenticated;
grant select,insert,update,delete on public.whatsapp_inbound_processing to service_role;
create or replace function public.claim_whatsapp_inbound(p_tenant uuid,p_external_id text,p_message uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected int;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if length(coalesce(p_external_id,'')) not between 1 and 255 then raise exception 'invalid id' using errcode='22023';end if;
 insert into public.whatsapp_inbound_processing(tenant_id,external_id,message_id,status)
 values(p_tenant,p_external_id,p_message,'processing') on conflict(tenant_id,external_id) do nothing;
 get diagnostics affected=row_count;
 return affected=1;
end $$;
revoke all on function public.claim_whatsapp_inbound(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_inbound(uuid,text,uuid) to service_role;
create or replace function public.complete_whatsapp_inbound(p_tenant uuid,p_external_id text,p_status text,p_stage text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected int;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501';end if;
 if p_status not in ('done','needs_review') or length(coalesce(p_stage,''))>80 then raise exception 'invalid state' using errcode='22023';end if;
 update public.whatsapp_inbound_processing set status=p_status,failure_stage=p_stage,updated_at=now()
 where tenant_id=p_tenant and external_id=p_external_id and status='processing';
 get diagnostics affected=row_count;
 return affected=1;
end $$;
revoke all on function public.complete_whatsapp_inbound(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_whatsapp_inbound(uuid,text,text,text) to service_role;