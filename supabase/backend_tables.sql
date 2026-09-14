-- ============================================================
-- Kyra Atende — Tabelas do Backend NestJS
-- Rodar no Supabase SQL Editor após schema.sql e push_subscriptions.sql
-- ============================================================

-- ── 1. Mensagens WhatsApp ────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_number text        NOT NULL,
  to_number   text        NOT NULL,
  body        text        NOT NULL,
  direction   text        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  external_id text,                         -- MessageSid do Twilio
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_whatsapp_messages" ON whatsapp_messages
  USING (tenant_id = (
    SELECT id FROM tenants WHERE owner_id = auth.uid() LIMIT 1
  ));

CREATE INDEX idx_whatsapp_messages_tenant_from
  ON whatsapp_messages(tenant_id, from_number, created_at DESC);

-- ── 2. Contadores de uso (WhatsApp, IA) ─────────────────────
CREATE TABLE IF NOT EXISTS usage_counters (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key        text        NOT NULL,
  value      integer     NOT NULL DEFAULT 0,
  reset_at   timestamptz,
  UNIQUE(tenant_id, key)
);

-- Sem RLS — gerenciado apenas pelo backend com service_role
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Função para incrementar contador de forma atômica (upsert)
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_tenant_id uuid,
  p_key       text,
  p_by        integer DEFAULT 1
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usage_counters (tenant_id, key, value)
  VALUES (p_tenant_id, p_key, p_by)
  ON CONFLICT (tenant_id, key)
  DO UPDATE SET value = usage_counters.value + p_by;
END;
$$;

-- ── 3. Eventos de billing ────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type   text        NOT NULL,        -- 'payment_failed', 'plan_changed', 'tenant_suspended'
  metadata     jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_billing_events" ON billing_events
  USING (tenant_id = (
    SELECT id FROM tenants WHERE owner_id = auth.uid() LIMIT 1
  ));

-- ── 4. Coluna whatsapp_number nos tenants (se ainda não existe) ──
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS whatsapp_number text;    -- ex: +14155238886 (número Twilio)

-- ── 5. Coluna trial_ends_at nos tenants (se ainda não existe) ──
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

COMMENT ON TABLE whatsapp_messages  IS 'Histórico de mensagens WhatsApp (inbound/outbound)';
COMMENT ON TABLE usage_counters     IS 'Contadores mensais de uso por tenant (WA, IA tokens)';
COMMENT ON TABLE billing_events     IS 'Registro de eventos de cobrança (pagamentos, mudanças de plano)';
