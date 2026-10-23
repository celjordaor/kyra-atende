-- E3 manual survey emails. Dispatch is opt-in per operator click, never cron.
create table public.survey_email_dispatches (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 invitation_id uuid not null unique references public.survey_invitations(id),
 state text not null default 'attempting' check (state in ('attempting','accepted','failed','unknown')),
 provider_id text,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index survey_email_dispatches_tenant_idx on public.survey_email_dispatches(tenant_id,created_at desc);
alter table public.survey_email_dispatches enable row level security;
revoke all on public.survey_email_dispatches from public,anon,authenticated;
grant select,insert,update on public.survey_email_dispatches to service_role;
