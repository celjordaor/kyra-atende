-- AUD-01: same-tenant integrity, applied in production.
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
