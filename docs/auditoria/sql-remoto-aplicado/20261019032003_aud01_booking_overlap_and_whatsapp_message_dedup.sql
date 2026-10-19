-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019032003: aud01_booking_overlap_and_whatsapp_message_dedup
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_professional_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    professional_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (professional_id IS NOT NULL AND status <> 'cancelled');
CREATE UNIQUE INDEX whatsapp_inbound_external_event_unique
  ON public.whatsapp_messages (tenant_id, external_id)
  WHERE direction = 'inbound' AND external_id IS NOT NULL;
