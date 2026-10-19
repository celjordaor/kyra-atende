-- AUD-01: applied remotely as aud01_revoke_client_schema_modification_privileges.
-- Table structure must only be managed by schema owners/migrations, never by Data API user roles.
DO $audit$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format(
      'REVOKE REFERENCES, TRIGGER ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      t.tablename
    );
  END LOOP;
END
$audit$;
