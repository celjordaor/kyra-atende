create table if not exists public.agenda_batch_notification_results (
 operation_id uuid not null references public.agenda_batch_operations(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id),
 booking_id uuid not null references public.bookings(id),
 channel text not null default 'email' check (channel = 'email'),
 status text not null check(status in ('accepted','failed','unknown','no_email','not_configured')),
 provider_message_id text,
 recorded_at timestamptz not null default now(),
 primary key(operation_id,booking_id,channel)
);
alter table public.agenda_batch_notification_results enable row level security;
revoke all on public.agenda_batch_notification_results from public,anon,authenticated;
grant select,insert,update on public.agenda_batch_notification_results to service_role;
create index if not exists agenda_batch_notification_results_tenant_idx on public.agenda_batch_notification_results(tenant_id,recorded_at desc);
