CREATE TABLE public.ai_budget_plans (
 plan text PRIMARY KEY CHECK(plan IN ('essencial','cresce','expande','enterprise')),
 monthly_budget_cents integer NOT NULL CHECK(monthly_budget_cents >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_budget_plans(plan,monthly_budget_cents) VALUES
 ('essencial',500),('cresce',1500),('expande',4000),('enterprise',4000);
CREATE TABLE public.ai_budget_tenant_overrides (
 tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
 monthly_budget_cents integer NOT NULL CHECK(monthly_budget_cents >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budget_tenant_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_budget_plans,public.ai_budget_tenant_overrides FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_budget_plans,public.ai_budget_tenant_overrides TO service_role;
