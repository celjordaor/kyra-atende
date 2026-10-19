-- Evidência AUD-01: SQL do histórico remoto do Supabase em produção.
-- Versão 20261019033935: aud01_enforce_same_tenant_relational_integrity
-- NÃO REAPLICAR AUTOMATICAMENTE; reconciliação pendente.

-- AUD-01: reference integrity between tenant-scoped entities
-- PostgreSQL 17 permits SET NULL of the nullable reference column only.
ALTER TABLE public.clients ADD CONSTRAINT clients_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.services ADD CONSTRAINT services_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.professionals ADD CONSTRAINT professionals_id_tenant_unique UNIQUE (id, tenant_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_tenant_unique UNIQUE (id, tenant_id);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_client_same_tenant
  FOREIGN KEY (client_id, tenant_id) REFERENCES public.clients (id, tenant_id)
  ON DELETE SET NULL (client_id);
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_same_tenant
  FOREIGN KEY (service_id, tenant_id) REFERENCES public.services (id, tenant_id)
  ON DELETE SET NULL (service_id);
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_professional_same_tenant
  FOREIGN KEY (professional_id, tenant_id) REFERENCES public.professionals (id, tenant_id)
  ON DELETE SET NULL (professional_id);

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscription_user_same_tenant
  FOREIGN KEY (user_id, tenant_id) REFERENCES public.profiles(id, tenant_id)
  ON DELETE CASCADE;
