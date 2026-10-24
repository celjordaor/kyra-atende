alter table public.agenda_batch_notification_results drop constraint if exists agenda_batch_notification_results_status_check;
alter table public.agenda_batch_notification_results add constraint agenda_batch_notification_results_status_check check(status in ('accepted','failed','unknown','no_email','not_configured','delivered','bounced','complained'));
create unique index if not exists agenda_notification_provider_message_uidx on public.agenda_batch_notification_results(provider_message_id) where provider_message_id is not null;
create or replace function public.reconcile_agenda_email(p_message text,p_status text)
returns integer language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 if p_message is null or length(p_message)>256 or p_status not in ('delivered','bounced','complained') then raise exception 'invalid event' using errcode='22023';end if;
 update public.agenda_batch_notification_results set status=p_status,recorded_at=now()
 where provider_message_id=p_message and
 (status not in ('bounced','complained') or p_status in ('bounced','complained'));
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function public.reconcile_agenda_email(text,text) from public,anon,authenticated;
grant execute on function public.reconcile_agenda_email(text,text) to service_role;
