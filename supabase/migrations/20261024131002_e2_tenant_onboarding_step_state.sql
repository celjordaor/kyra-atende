create table if not exists public.tenant_onboarding_steps (
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 step_key text not null check (step_key in ('empresa','horarios','servicos','profissionais','clientes','primeira-reserva','whatsapp','notificacoes')),
 state text not null check (state in ('skipped','reviewed')),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key (tenant_id, step_key)
);
alter table public.tenant_onboarding_steps enable row level security;
revoke all on public.tenant_onboarding_steps from public, anon, authenticated;
grant select, insert, update, delete on public.tenant_onboarding_steps to service_role;
create index if not exists tenant_onboarding_steps_updated_idx on public.tenant_onboarding_steps(tenant_id,updated_at desc);
