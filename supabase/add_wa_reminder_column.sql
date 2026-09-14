-- Migration: adicionar coluna de controle de lembrete WhatsApp nos agendamentos
-- Executar no Supabase SQL Editor

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_wa_sent boolean NOT NULL DEFAULT false;

-- Índice para o cron encontrar rapidamente agendamentos pendentes de lembrete
CREATE INDEX IF NOT EXISTS bookings_wa_reminder
  ON bookings(tenant_id, start_at, reminder_24h_wa_sent)
  WHERE status IN ('pending','confirmed') AND reminder_24h_wa_sent = false;
