-- ============================================================
-- Kyra Atende — Migration: booking_complete_fields.sql
-- Adiciona colunas financeiras ao bookings para o fluxo de conclusão
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS price_charged  numeric(10,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount       numeric(10,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text           DEFAULT NULL;

COMMENT ON COLUMN bookings.price_charged  IS 'Valor efetivamente cobrado ao concluir o serviço';
COMMENT ON COLUMN bookings.discount       IS 'Desconto concedido na conclusão (pode ser 0)';
COMMENT ON COLUMN bookings.payment_method IS 'Forma de pagamento: pix, dinheiro, debito, credito, cortesia, etc.';
