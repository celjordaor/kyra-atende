-- Business decision: explicit duplicate-email feedback at tenant signup.
-- Access is restricted to service_role; HTTP endpoint applies rate limiting.
create or replace function public.business_signup_email_exists(p_email text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then
  raise exception 'not authorized' using errcode='42501';
 end if;
 if p_email is null or length(trim(p_email)) not between 3 and 254 then
  raise exception 'invalid email' using errcode='22023';
 end if;
 return exists (
  select 1 from auth.users
  where lower(trim(email))=lower(trim(p_email))
 );
end $$;
revoke all on function public.business_signup_email_exists(text) from public,anon,authenticated;
grant execute on function public.business_signup_email_exists(text) to service_role;
