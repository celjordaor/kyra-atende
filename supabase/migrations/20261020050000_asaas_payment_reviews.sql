create table public.asaas_payment_reviews (
 payment_id text primary key references public.asaas_processed_payments(payment_id),
 tenant_id uuid not null references public.tenants(id),
 status text not null check (status in ('pending_review','reviewed','escalated')),
 reason text not null check (reason in ('refund','chargeback','cancelled','other')),
 note text not null check (char_length(note) between 5 and 1000),
 reviewed_by uuid not null,
 reviewed_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index asaas_payment_reviews_tenant_idx on public.asaas_payment_reviews(tenant_id,updated_at desc);
alter table public.asaas_payment_reviews enable row level security;
revoke all on public.asaas_payment_reviews from public,anon,authenticated;
grant select,insert,update on public.asaas_payment_reviews to service_role;