-- Adicionar tabela push_subscriptions ao schema existente
-- Execute este script no Supabase SQL Editor se a tabela não existir ainda

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

-- Usuário só vê e gerencia suas próprias subscrições
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'own_subscriptions_select'
  ) THEN
    CREATE POLICY "own_subscriptions_select" ON push_subscriptions
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'own_subscriptions_insert'
  ) THEN
    CREATE POLICY "own_subscriptions_insert" ON push_subscriptions
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'own_subscriptions_delete'
  ) THEN
    CREATE POLICY "own_subscriptions_delete" ON push_subscriptions
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;
