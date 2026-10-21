-- Index for bounded opportunistic cleanup without requiring pg_cron.
create index if not exists api_rate_limit_windows_expiry_idx on public.api_rate_limit_windows(window_start);
create or replace function public.claim_api_rate_limit(p_key_hash text,p_limit integer,p_window_seconds integer)
returns table(allowed boolean,retry_after integer)
language plpgsql security definer set search_path='' as $$
declare v_start timestamptz; v_count integer; v_epoch bigint;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not authorized' using errcode='42501'; end if;
 if p_key_hash !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 1000 or p_window_seconds not between 10 and 86400 then
   raise exception 'invalid rate limit request' using errcode='22023';
 end if;
 v_epoch := floor(extract(epoch from now())/p_window_seconds)::bigint*p_window_seconds;
 v_start := to_timestamp(v_epoch);
 insert into public.api_rate_limit_windows(key_hash,window_start,hits)
 values(p_key_hash,v_start,1)
 on conflict(key_hash,window_start) do update set hits=public.api_rate_limit_windows.hits+1
 returning hits into v_count;
 allowed := v_count<=p_limit;
 retry_after := case when allowed then 0 else greatest(1,ceil(extract(epoch from (v_start+make_interval(secs=>p_window_seconds)-now())))::integer) end;
 -- Best-effort, bounded cleanup on roughly 1% of requests. Older windows
 -- remain irrelevant to rate limits; cleanup failure must roll back only this call.
 if random()<0.01 then
   delete from public.api_rate_limit_windows where ctid in (
     select ctid from public.api_rate_limit_windows
     where window_start < now()-interval '48 hours'
     order by window_start asc limit 250
   );
 end if;
 return next;
end $$;
revoke all on function public.claim_api_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.claim_api_rate_limit(text,integer,integer) to service_role;
