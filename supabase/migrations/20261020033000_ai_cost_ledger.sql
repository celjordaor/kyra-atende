CREATE TABLE public.ai_cost_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 source text NOT NULL CHECK (source IN ('dashboard_chat','whatsapp')),
 model text NOT NULL,
 input_tokens integer NOT NULL CHECK(input_tokens>=0),
 output_tokens integer NOT NULL CHECK(output_tokens>=0),
 input_usd_per_million numeric(12,6) NOT NULL CHECK(input_usd_per_million>=0),
 output_usd_per_million numeric(12,6) NOT NULL CHECK(output_usd_per_million>=0),
 usd_to_brl numeric(12,6) NOT NULL CHECK(usd_to_brl>0),
 cost_brl numeric(16,8) GENERATED ALWAYS AS (
 ((input_tokens::numeric*input_usd_per_million + output_tokens::numeric*output_usd_per_million)/1000000)*usd_to_brl
 ) STORED,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_cost_ledger_tenant_month_idx ON public.ai_cost_ledger(tenant_id,created_at DESC);
ALTER TABLE public.ai_cost_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_cost_ledger FROM PUBLIC, anon,authenticated;
GRANT SELECT,INSERT ON public.ai_cost_ledger TO service_role;
