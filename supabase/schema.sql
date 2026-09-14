-- ============================================================
-- Kyra Atende — Schema SQL v1.0
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensões ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: tenant_id do JWT ────────────────────────────────
-- Evita repetir (auth.jwt() ->> 'tenant_id') em cada policy.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid
$$;

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  logo_url    text,
  plan        text        NOT NULL DEFAULT 'cresce',
  plan_status text        NOT NULL DEFAULT 'trial'
    CHECK (plan_status IN ('trial','active','expired','suspended')),
  trial_ends  timestamptz,
  owner_id    uuid        NOT NULL,   -- preenchido após criar o perfil
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Dono pode ver/editar seu tenant
CREATE POLICY "tenant_owner_rw" ON tenants
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins do tenant leem via claim tenant_id no JWT
CREATE POLICY "tenant_members_r" ON tenants
  FOR SELECT
  USING (id = current_tenant_id());

-- ============================================================
-- PROFILES (espelho de auth.users + dados de negócio)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'admin'
    CHECK (role IN ('user','admin','superadmin')),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_tenant_rw" ON profiles
  USING     (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Próprio usuário pode sempre ler seu perfil
CREATE POLICY "profiles_own_r" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- ============================================================
-- PROFESSIONALS
-- ============================================================
CREATE TABLE IF NOT EXISTS professionals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text,
  phone       text,
  avatar_url  text,
  bio         text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professionals_tenant_rw" ON professionals
  USING     (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Público pode ler profissionais ativos (para página de agendamento)
CREATE POLICY "professionals_public_r" ON professionals
  FOR SELECT
  USING (is_active = true);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  duration_minutes integer     NOT NULL DEFAULT 60,
  price            numeric(10,2) NOT NULL DEFAULT 0,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_tenant_rw" ON services
  USING     (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Público pode ler serviços ativos (agendamento público)
CREATE POLICY "services_public_r" ON services
  FOR SELECT
  USING (is_active = true);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_tenant_rw" ON clients
  USING     (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       uuid        REFERENCES clients(id) ON DELETE SET NULL,
  professional_id uuid        REFERENCES professionals(id) ON DELETE SET NULL,
  service_id      uuid        REFERENCES services(id) ON DELETE SET NULL,
  -- Snapshot em texto para caso FK seja deletada
  client_name     text        NOT NULL,
  client_phone    text,
  client_email    text,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_tenant_start ON bookings(tenant_id, start_at);
CREATE INDEX IF NOT EXISTS bookings_status       ON bookings(tenant_id, status);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_tenant_rw" ON bookings
  USING     (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Inserção pública para o fluxo /agendar/[slug] (sem autenticação)
CREATE POLICY "bookings_public_insert" ON bookings
  FOR INSERT
  WITH CHECK (true);   -- validar tenant_id via slug lookup no backend

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan                  text        NOT NULL DEFAULT 'cresce'
    CHECK (plan IN ('essencial','cresce','expande','enterprise')),
  status                text        NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','expired','suspended')),
  billing_cycle         text        NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','quarterly','semiannual','annual')),
  current_period_start  timestamptz NOT NULL DEFAULT now(),
  current_period_end    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  trial_ends            timestamptz,
  stripe_sub_id         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_r" ON subscriptions
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Apenas service_role (admin) pode escrever
CREATE POLICY "subscriptions_service_rw" ON subscriptions
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- BILLING EVENTS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,  -- 'plan_changed', 'payment_failed', etc.
  plan_from   text,
  plan_to     text,
  amount      numeric(10,2),
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_tenant_r" ON billing_events
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "billing_events_service_insert" ON billing_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     text        NOT NULL,
  p256dh       text        NOT NULL,
  auth         text        NOT NULL,
  device_label text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_own_subscriptions" ON push_subscriptions
  USING (user_id = auth.uid());

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  subject     text        NOT NULL,
  body_html   text        NOT NULL,
  variables   text[]      NOT NULL DEFAULT '{}',
  is_active   boolean     NOT NULL DEFAULT true,
  is_system   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Todos os autenticados leem templates ativos
CREATE POLICY "email_templates_r" ON email_templates
  FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- Apenas service_role cria/edita
CREATE POLICY "email_templates_service_rw" ON email_templates
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- FUNÇÃO: cria tenant + perfil + subscription em transação
-- Chamada pelo backend após supabase.auth.signUp()
-- ============================================================
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
  -- Cria tenant
  INSERT INTO tenants (name, slug, owner_id, plan, plan_status, trial_ends)
  VALUES (p_company, p_slug, p_user_id, 'cresce', 'trial', v_trial_end)
  RETURNING id INTO v_tenant_id;

  -- Cria perfil
  INSERT INTO profiles (id, tenant_id, name, email, role)
  VALUES (p_user_id, v_tenant_id, p_name, p_email, 'admin');

  -- Cria subscription trial
  INSERT INTO subscriptions (tenant_id, plan, status, trial_ends,
    current_period_start, current_period_end)
  VALUES (v_tenant_id, 'cresce', 'trial', v_trial_end, now(), v_trial_end);

  -- Injeta tenant_id no JWT via raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('tenant_id', v_tenant_id)
  WHERE id = p_user_id;

  RETURN v_tenant_id;
END;
$$;

-- ============================================================
-- TRIGGER: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
