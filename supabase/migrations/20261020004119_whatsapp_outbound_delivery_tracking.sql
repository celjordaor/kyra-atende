-- Migration applied remotely on 2026-10-20; never reapply manually to production.
CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 to_number text not null,
 body_sha256 text not null,
 status text not null default 'sending' check(status in ('sending','accepted','recorded','rejected','unknown','reconcile')),
 provider_http_status integer,
 history_message_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS whatsapp_outbox_tenant_status_created_idx ON public.whatsapp_outbox(tenant_id,status,created_at desc);
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_outbox FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.whatsapp_outbox TO service_role;
