-- Mirror of Supabase migration aud01_transactional_email_template_audit
CREATE OR REPLACE FUNCTION public.audit_delete_email_template(p_actor uuid, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_old public.email_templates%rowtype;
begin
 if auth.role() <> 'service_role' then raise exception 'Unauthorized' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=p_actor and role='superadmin') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_name !~ '^[a-z0-9][a-z0-9_-]{0,99}$' then raise exception 'Invalid template' using errcode='22023'; end if;
 delete from public.email_templates where name=p_name returning * into v_old;
 if found then
   insert into public.admin_audit_events(actor_id,action,resource_type,resource_id,changes)
   values(p_actor,'email_template.deleted','email_template',p_name,jsonb_build_object('is_active_before',v_old.is_active));
 end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.audit_save_email_template(p_actor uuid, p_name text, p_subject text, p_html text, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_old public.email_templates%rowtype; v_new public.email_templates%rowtype; v_action text;
begin
 if auth.role() <> 'service_role' then raise exception 'Unauthorized' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=p_actor and role='superadmin') then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_name !~ '^[a-z0-9][a-z0-9_-]{0,99}$' or p_subject is null or length(trim(p_subject))=0 or length(p_subject)>250 or p_html is null or length(trim(p_html))=0 or length(p_html)>100000 then raise exception 'Invalid template' using errcode='22023'; end if;
 select * into v_old from public.email_templates where name=p_name for update;
 if found then
   update public.email_templates set subject=p_subject,body_html=p_html,is_active=coalesce(p_is_active,is_active),updated_at=now()
   where name=p_name returning * into v_new;
   v_action='email_template.updated';
 else
   insert into public.email_templates(name,subject,body_html,is_active)
   values(p_name,p_subject,p_html,coalesce(p_is_active,true))
   on conflict(name) do update set subject=excluded.subject,body_html=excluded.body_html,
     is_active=case when p_is_active is null then public.email_templates.is_active else p_is_active end,updated_at=now()
   returning * into v_new;
   v_action='email_template.saved';
 end if;
 insert into public.admin_audit_events(actor_id,action,resource_type,resource_id,changes)
 values(p_actor,v_action,'email_template',p_name,jsonb_build_object('is_active_before',v_old.is_active,'is_active_after',v_new.is_active,'subject_changed',v_old.subject is distinct from v_new.subject,'html_changed',v_old.body_html is distinct from v_new.body_html));
end $function$
;

REVOKE ALL ON FUNCTION public.audit_save_email_template(uuid,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.audit_save_email_template(uuid,text,text,text,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.audit_delete_email_template(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.audit_delete_email_template(uuid,text) TO service_role;
