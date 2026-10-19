-- Versioned AUD-01 migration (matches remote version 20261019235119)
CREATE TABLE IF NOT EXISTS public.admin_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,
 action text NOT NULL,
 resource_type text NOT NULL,
 resource_id text NOT NULL,
 changes jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_audit_events TO service_role;
CREATE OR REPLACE FUNCTION public.audit_update_tenant_status(p_actor uuid, p_tenant uuid, p_status text DEFAULT NULL::text, p_plan text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_set_status boolean DEFAULT false, p_set_plan boolean DEFAULT false, p_set_expires boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_before public.tenants%rowtype; v_after public.tenants%rowtype; v_changes jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Unauthorized' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=p_actor and role='superadmin') then
    raise exception 'Forbidden' using errcode='42501';
  end if;
  if not (p_set_status or p_set_plan or p_set_expires) then
    raise exception 'No changes' using errcode='22023';
  end if;
  if p_set_status and (p_status is null or p_status not in ('active','trial','suspended','expired')) then
    raise exception 'Invalid status' using errcode='22023';
  end if;
  if p_set_plan and (p_plan is null or p_plan not in ('essencial','cresce','expande','enterprise')) then
    raise exception 'Invalid plan' using errcode='22023';
  end if;
  select * into v_before from public.tenants where id=p_tenant for update;
  if not found then return null; end if;
  update public.tenants set
    plan_status=case when p_set_status then p_status else plan_status end,
    plan=case when p_set_plan then p_plan else plan end,
    trial_ends_at=case when p_set_expires then p_expires_at else trial_ends_at end
  where id=p_tenant returning * into v_after;
  v_changes=jsonb_build_object(
    'before',jsonb_build_object('plan',v_before.plan,'status',v_before.plan_status,'expires_at',v_before.trial_ends_at),
    'after',jsonb_build_object('plan',v_after.plan,'status',v_after.plan_status,'expires_at',v_after.trial_ends_at)
  );
  insert into public.admin_audit_events(actor_id,action,resource_type,resource_id,changes)
    values(p_actor,'tenant.status_update','tenant',p_tenant::text,v_changes);
  return jsonb_build_object('id',v_after.id,'plan',v_after.plan,'plan_status',v_after.plan_status,'trial_ends_at',v_after.trial_ends_at);
end $function$

REVOKE ALL ON FUNCTION public.audit_update_tenant_status(uuid,uuid,text,text,timestamptz,boolean,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_update_tenant_status(uuid,uuid,text,text,timestamptz,boolean,boolean,boolean) TO service_role;
