-- Migration: Adiciona status e source à tabela clients (fluxo de lead do agendamento público)
-- Execute no Supabase SQL Editor (kyra-atende > SQL Editor)
-- Data: 2026-09-12

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status  TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'lead', 'inactive')),
  ADD COLUMN IF NOT EXISTS source  TEXT DEFAULT NULL
    CHECK (source IN ('manual', 'booking', NULL));

COMMENT ON COLUMN clients.status IS
  'active = cliente da base | lead = veio do agendamento público, ainda não confirmado | inactive = desativado';

COMMENT ON COLUMN clients.source IS
  'manual = criado pelo gestor | booking = veio do fluxo público /agendar/[slug]';

-- Índice para busca rápida de lead por telefone (deduplicação no booking público)
CREATE INDEX IF NOT EXISTS clients_tenant_phone ON clients(tenant_id, phone)
  WHERE phone IS NOT NULL;
