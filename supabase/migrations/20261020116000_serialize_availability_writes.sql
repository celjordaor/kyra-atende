-- Ensure administrative closures and transactional reservations use one tenant-wide mutex.
-- The lock is acquired before reading availability and held until commit.
do $$
declare fn text; body text; signature text;
begin
 foreach fn in array array['public.save_availability_block(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text)',
 'public.delete_availability_block(uuid,uuid,uuid)',
 'public.create_portal_booking(uuid,uuid,uuid,uuid,uuid,timestamptz,text)',
 'public.reschedule_booking_atomic(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text)'] loop
  body:=pg_get_functiondef(fn::regprocedure);
  if body is null then raise exception 'Missing RPC: %',fn;end if;
  if position('availability-tenant:' in body)=0 then
   body:=replace(body, E'begin\n', E'begin\n perform pg_advisory_xact_lock(hashtextextended(''availability-tenant:''||p_tenant::text,0));\n');
  end if;
  execute body;
 end loop;
end $$;