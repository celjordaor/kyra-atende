-- ============================================================
-- Kyra Atende — Migration: fixes_session3.sql (v2 — idempotente)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ── 1. tenants: trial_ends → trial_ends_at ───────────────────────────────────
-- usa pg_attribute (mais confiável que information_schema em Supabase)
DO $$
DECLARE
  has_old  boolean;
  has_new  boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'tenants' AND c.relnamespace = 'public'::regnamespace
      AND a.attname = 'trial_ends' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO has_old;

  SELECT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'tenants' AND c.relnamespace = 'public'::regnamespace
      AND a.attname = 'trial_ends_at' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO has_new;

  IF has_old AND NOT has_new THEN
    ALTER TABLE tenants RENAME COLUMN trial_ends TO trial_ends_at;
  ELSIF has_old AND has_new THEN
    ALTER TABLE tenants DROP COLUMN trial_ends;
  END IF;
  -- has_new e NOT has_old → nada a fazer
END $$;

-- ── 2. tenants: adicionar owner_email (se não existir) ───────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email text;

-- ── 3. subscriptions: trial_ends → trial_ends_at ─────────────────────────────
DO $$
DECLARE
  has_old  boolean;
  has_new  boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'subscriptions' AND c.relnamespace = 'public'::regnamespace
      AND a.attname = 'trial_ends' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO has_old;

  SELECT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'subscriptions' AND c.relnamespace = 'public'::regnamespace
      AND a.attname = 'trial_ends_at' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO has_new;

  IF has_old AND NOT has_new THEN
    ALTER TABLE subscriptions RENAME COLUMN trial_ends TO trial_ends_at;
  ELSIF has_old AND has_new THEN
    ALTER TABLE subscriptions DROP COLUMN trial_ends;
  END IF;
END $$;

-- ── 4. subscriptions: adicionar colunas do fluxo Asaas ───────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS period                text,
  ADD COLUMN IF NOT EXISTS amount                numeric(10,2),
  ADD COLUMN IF NOT EXISTS asaas_payment_link_id text;

CREATE INDEX IF NOT EXISTS subscriptions_asaas_link
  ON subscriptions (asaas_payment_link_id)
  WHERE asaas_payment_link_id IS NOT NULL;

-- ── 5. subscriptions: ampliar CHECK de status ────────────────────────────────
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial','active','expired','suspended','pending','overdue','cancelled'));

-- ── 6. bookings: adicionar 'completed' ao CHECK de status ────────────────────
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','cancelled','completed'));

-- ── 7. billing_events: renomear metadata → meta (se ainda não renomeado) ─────
DO $$
DECLARE
  has_old boolean;
  has_new boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'billing_events' AND c.relnamespace = 'public'::regnamespace
      AND a.attname = 'metadata' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO has_old;

  SELECT EXISTS(
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'billing_events' AND c.relnamespace = 'public'::regnamespace
      AND a.attname = 'meta' AND a.attnum > 0 AND NOT a.attisdropped
  ) INTO has_new;

  IF has_old AND NOT has_new THEN
    ALTER TABLE billing_events RENAME COLUMN metadata TO meta;
  ELSIF has_old AND has_new THEN
    ALTER TABLE billing_events DROP COLUMN metadata;
  END IF;
END $$;

-- ── 8. tenants: política pública de leitura para /agendar/[slug] ─────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'tenants_public_r'
  ) THEN
    EXECUTE 'CREATE POLICY "tenants_public_r" ON tenants FOR SELECT USING (true)';
  END IF;
END $$;

-- ── 9. onboarding_emails_sent: criar tabela se não existir ───────────────────
CREATE TABLE IF NOT EXISTS onboarding_emails_sent (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key text        NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_key)
);

ALTER TABLE onboarding_emails_sent ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'onboarding_emails_sent' AND policyname = 'onboarding_emails_service_rw'
  ) THEN
    EXECUTE '
      CREATE POLICY "onboarding_emails_service_rw" ON onboarding_emails_sent
        USING     (auth.role() = ''service_role'')
        WITH CHECK (auth.role() = ''service_role'')
    ';
  END IF;
END $$;

-- ── 10. usage_counters: criar tabela se não existir ──────────────────────────
CREATE TABLE IF NOT EXISTS usage_counters (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key        text        NOT NULL,
  value      bigint      NOT NULL DEFAULT 0,
  reset_at   timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_counters' AND policyname = 'usage_counters_tenant_r'
  ) THEN
    EXECUTE '
      CREATE POLICY "usage_counters_tenant_r" ON usage_counters
        FOR SELECT USING (tenant_id = current_tenant_id())
    ';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_counters' AND policyname = 'usage_counters_service_rw'
  ) THEN
    EXECUTE '
      CREATE POLICY "usage_counters_service_rw" ON usage_counters
        USING     (auth.role() = ''service_role'')
        WITH CHECK (auth.role() = ''service_role'')
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS usage_counters_tenant_key
  ON usage_counters (tenant_id, key);

-- ── 11. Atualizar create_tenant_with_owner ────────────────────────────────────
CREATE OR REPLACE FUNCTION create_tenant_with_owner(
  p_user_id   uuid,
  p_email     text,
  p_name      text,
  p_company   text,
  p_slug      text
) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_trial_end timestamptz := now() + interval '14 days';
BEGIN
  INSERT INTO tenants (name, slug, owner_id, owner_email, plan, plan_status, trial_ends_at)
  VALUES (p_company, p_slug, p_user_id, p_email, 'cresce', 'trial', v_trial_end)
  RETURNING id INTO v_tenant_id;

  INSERT INTO profiles (id, tenant_id, name, email, role)
  VALUES (p_user_id, v_tenant_id, p_name, p_email, 'admin');

  INSERT INTO subscriptions (
    tenant_id, plan, status, trial_ends_at,
    current_period_start, current_period_end
  )
  VALUES (v_tenant_id, 'cresce', 'trial', v_trial_end, now(), v_trial_end);

  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('tenant_id', v_tenant_id)
  WHERE id = p_user_id;

  RETURN v_tenant_id;
END;
$$;
