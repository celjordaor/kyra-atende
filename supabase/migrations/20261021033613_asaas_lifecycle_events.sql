-- Provider-verified negative payment events; never mutate subscriptions automatically.
create table if not exists public.asaas_lifecycle_events (
  event_id text primary key check (char_length(event_id) between 3 and 120),
  payment_id text not null references public.asaas_processed_payments(payment_id),
  tenant_id uuid not null references public.tenants(id),
  event_type text not null check (event_type in ('PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_REFUND_IN_PROGRESS','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL','PAYMENT_DELETED')),
  provider_status text not null,
  review_status text not null default 'pending_review' check (review_status in ('pending_review','reviewed')),
  created_at timestamptz not null default now()
);
create index if not exists asaas_lifecycle_events_tenant_created_idx on public.asaas_lifecycle_events(tenant_id,created_at desc);
alter table public.asaas_lifecycle_events enable row level security;
revoke all on public.asaas_lifecycle_events from public,anon,authenticated;
grant select,insert on public.asaas_lifecycle_events to service_role;
comment on table public.asaas_lifecycle_events is 'Verified Asaas lifecycle signals for manual review; never automatically revokes a subscription.';
