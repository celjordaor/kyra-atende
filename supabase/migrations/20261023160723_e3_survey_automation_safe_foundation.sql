-- E3/P12.4: configuration, consent opt-out, and inert notification outbox.
-- No scheduler, provider integration, or automatic send is enabled by this migration.
create table public.survey_automation_settings (
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enabled boolean not null default false check (enabled = false),
 daily_limit integer not null default 0 check (daily_limit between 0 and 1000),
 send_channel text not null default 'disabled' check (send_channel = 'disabled'),
 wait_hours integer not null default 24 check (wait_hours between 1 and 720),
 updated_at timestamptz not null default now()
);
create table public.survey_contact_opt_outs (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 client_id uuid not null references public.clients(id) on delete cascade,
 purpose text not null check (purpose in ('booking_experience','service_satisfaction')),
 created_at timestamptz not null default now(),
 unique(tenant_id,client_id,purpose)
);
create table public.survey_outbox (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 invitation_id uuid not null unique references public.survey_invitations(id) on delete cascade,
 state text not null default 'held' check(state in ('held','cancelled')),
 created_at timestamptz not null default now(),
 unique(tenant_id,invitation_id)
);
create index survey_outbox_tenant_created on public.survey_outbox(tenant_id,created_at desc);
create index survey_opt_out_tenant_client on public.survey_contact_opt_outs(tenant_id,client_id);
alter table public.survey_automation_settings enable row level security;
alter table public.survey_contact_opt_outs enable row level security;
alter table public.survey_outbox enable row level security;
revoke all on public.survey_automation_settings,public.survey_contact_opt_outs,public.survey_outbox from public,anon,authenticated;
grant select,insert,update on public.survey_automation_settings,public.survey_contact_opt_outs,public.survey_outbox to service_role;
