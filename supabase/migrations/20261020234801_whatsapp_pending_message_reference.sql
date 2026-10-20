-- Store only provider message metadata prior to explicit contact consent.
-- Message text remains outside Kyra's database until authorization.
alter table public.whatsapp_contact_permissions
  add column if not exists pending_message_id text,
  add column if not exists pending_remote_jid text;
comment on column public.whatsapp_contact_permissions.pending_message_id is
  'Provider identifier of first pending inbound; no message body stored.';
comment on column public.whatsapp_contact_permissions.pending_remote_jid is
  'Provider JID used for exact message lookup after owner consent.';
