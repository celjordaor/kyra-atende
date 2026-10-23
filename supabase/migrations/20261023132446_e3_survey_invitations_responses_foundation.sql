-- E3 P12.2: survey invitations and answers. Public access only through validated server routes.
create table public.survey_invitations (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 booking_id uuid not null,
 template_id uuid not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'pending' check(status in ('pending','answered','revoked')),
 expires_at timestamptz not null,
 answered_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key (tenant_id,template_id) references public.survey_templates(tenant_id,id),
 foreign key (booking_id) references public.bookings(id),
 unique(tenant_id,booking_id,template_id)
);
create index survey_invitations_tenant_booking_idx on public.survey_invitations(tenant_id,booking_id);
create table public.survey_responses (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 invitation_id uuid not null unique references public.survey_invitations(id),
 answers jsonb not null check (jsonb_typeof(answers)='object'),
 created_at timestamptz not null default now()
);
create index survey_responses_tenant_idx on public.survey_responses(tenant_id,created_at desc);
alter table public.survey_invitations enable row level security;
alter table public.survey_responses enable row level security;
revoke all on public.survey_invitations, public.survey_responses from public,anon,authenticated;
grant select,insert,update on public.survey_invitations,public.survey_responses to service_role;
