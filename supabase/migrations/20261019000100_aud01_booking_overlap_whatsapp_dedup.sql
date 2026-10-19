-- AUD-01 / fase integridade: aplicar somente após homologação.
-- Requer a extensão btree_gist disponível no PostgreSQL Supabase.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Impede reservas simultâneas ou sobrepostas para o mesmo profissional.
-- Mantém compatibilidade com agendamentos sem profissional (NULL)
-- e ignora reservas canceladas.
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_professional_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    professional_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (professional_id IS NOT NULL AND status <> 'cancelled');

-- Cada evento recebido com ID do WhatsApp é gravado uma única vez
-- por tenant, inclusive em requisições concorrentes.
CREATE UNIQUE INDEX whatsapp_inbound_external_event_unique
  ON public.whatsapp_messages (tenant_id, external_id)
  WHERE direction = 'inbound' AND external_id IS NOT NULL;
