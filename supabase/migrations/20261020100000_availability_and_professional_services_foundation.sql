-- Availability foundation. Backend-only until configuration and slot engine are activated.
create table if not exists public.availability_settings (
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 timezone text not null default 'America/Sao_Paulo',
 booking_notice_minutes integer not null default 0 check (booking_notice_minutes between 0 and 43200),
 booking_horizon_days integer not null default 90 check (booking_horizon_days between 1 and 730),
 updated_at timestamptz not null default now()
);
create table if not exists public.company_working_hours (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 weekday smallint not null check (weekday between 0 and 6),
 starts_at time not null,
 ends_at time not null,
 check (starts_at < ends_at),
 unique (tenant_id,weekday,starts_at,ends_at)
);
create index if not exists company_working_hours_lookup on public.company_working_hours(tenant_id,weekday);
create table if not exists public.professional_availability_settings (
 professional_id uuid primary key,
 tenant_id uuid not null,
 mode text not null default 'inherit' check (mode in ('inherit','custom')),
 foreign key (professional_id,tenant_id) references public.professionals(id,tenant_id) on delete cascade
);
create table if not exists public.professional_working_hours (
 id uuid primary key default gen_random_uuid(),
 professional_id uuid not null,
 tenant_id uuid not null,
 weekday smallint not null check (weekday between 0 and 6),
 starts_at time not null,
 ends_at time not null,
 check(starts_at<ends_at),
 foreign key(professional_id,tenant_id) references public.professionals(id,tenant_id) on delete cascade,
 unique(professional_id,weekday,starts_at,ends_at)
);
create index if not exists professional_hours_lookup on public.professional_working_hours(tenant_id,professional_id,weekday);
create table if not exists public.availability_blocks (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 professional_id uuid,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 reason text,
 category text not null default 'unavailable' check(category in ('holiday','unavailable','inactivity','absence')),
 check(starts_at<ends_at),
 foreign key(professional_id,tenant_id) references public.professionals(id,tenant_id) on delete cascade
);
create index if not exists availability_blocks_window on public.availability_blocks(tenant_id,starts_at,ends_at);
create table if not exists public.professional_services (
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 professional_id uuid not null,
 service_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (tenant_id,professional_id,service_id),
 foreign key (professional_id,tenant_id) references public.professionals(id,tenant_id) on delete cascade,
 foreign key (service_id,tenant_id) references public.services(id,tenant_id) on delete cascade
);
create index if not exists professional_services_by_service on public.professional_services(tenant_id,service_id);
-- Explicit rollout flag: old clients remain unrestricted until they configure associations.
create table if not exists public.service_assignment_settings (
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enforce_links boolean not null default false,
 updated_at timestamptz not null default now()
);
do $$
declare t text;
begin
 foreach t in array array['availability_settings','company_working_hours','professional_availability_settings','professional_working_hours','availability_blocks','professional_services','service_assignment_settings'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;