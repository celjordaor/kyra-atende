-- Each dashboard AI chat request must claim one monthly interaction before provider call.
-- Requests are serialized per tenant, avoiding simultaneous over-limit calls.
create table if not exists public.ai_chat_quota_claims (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  month_start date not null,
  status text not null default 'reserved' check (status in ('reserved','settled','released')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists ai_chat_quota_monthly_idx on public.ai_chat_quota_claims(tenant_id,month_start,status);
alter table public.ai_chat_quota_claims enable row level security;
revoke all on public.ai_chat_quota_claims from public,anon,authenticated;
grant select,insert,update on public.ai_chat_quota_claims to service_role;

create or replace function public.reserve_ai_chat_quota(p_tenant uuid,p_id uuid,p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_month date; v_count bigint; v_plan text; v_actual_limit integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_tenant is null or p_id is null or p_limit < 0 then raise exception 'invalid claim' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tenant::text||':ai_chat_quota',0));
 select plan into v_plan from public.tenants where id=p_tenant;
 if not found then raise exception 'tenant missing' using errcode='23503'; end if;
 -- Only the server code's allowed plan limits are accepted, preventing a caller-supplied unlimited quota.
 v_actual_limit:=case v_plan when 'essencial' then 50 when 'cresce' then 200 else null end;
 if v_actual_limit is distinct from p_limit then raise exception 'invalid quota' using errcode='22023'; end if;
 v_month:=(date_trunc('month',now() at time zone 'UTC'))::date;
 if exists(select 1 from public.ai_chat_quota_claims where id=p_id) then return false; end if;
 select count(*) into v_count from public.ai_chat_quota_claims
  where tenant_id=p_tenant and month_start=v_month and status <> 'released';
 if v_count>=p_limit then return false; end if;
 insert into public.ai_chat_quota_claims(id,tenant_id,month_start) values(p_id,p_tenant,v_month);
 return true;
end $$;

create or replace function public.finish_ai_chat_quota(p_tenant uuid,p_id uuid,p_success boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_tenant is null or p_id is null or p_success is null then raise exception 'invalid completion' using errcode='22023'; end if;
 update public.ai_chat_quota_claims set status=case when p_success then 'settled' else 'released' end,finished_at=now()
 where tenant_id=p_tenant and id=p_id and status='reserved';
 return found;
end $$;
revoke all on function public.reserve_ai_chat_quota(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.finish_ai_chat_quota(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_ai_chat_quota(uuid,uuid,integer) to service_role;
grant execute on function public.finish_ai_chat_quota(uuid,uuid,boolean) to service_role;
