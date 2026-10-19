# AUD-01 — Inventário das migrations aplicadas (produção)

Fonte: `supabase_migrations.schema_migrations` do projeto Kyra Atende `zrszytzlovthyezozqhj`, consulta em 19/10/2026.

## Finalidade

Os 12 arquivos `.sql` desta pasta são **cópias históricas do conteúdo de `statements` registrado no Supabase**, exportadas por versão e nome remoto. Os cabeçalhos adicionados a cada arquivo apenas identificam a procedência.

**Não mover automaticamente esses arquivos para `supabase/migrations`, não renomear versões remotas, não executar `supabase db push` nem `migration repair` até concluir equivalência e ordenação.** O histórico remoto já tem scripts aplicados sob versões distintas das 6 migrations locais.

## Inventário verificado

| Versão aplicada | Migration remota |
|---|---|
| 20261019025856 | aud01_restrict_privileged_rpc_profile_updates_public_policies |
| 20261019030717 | aud01_restrict_tenant_billing_and_owner_updates |
| 20261019031431 | aud01_billing_events_append_only_backend |
| 20261019032003 | aud01_booking_overlap_and_whatsapp_message_dedup |
| 20261019032033 | aud01_atomic_idempotent_signup |
| 20261019032120 | aud01_asaas_verified_payment_reconciliation |
| 20261019033514 | aud01_revoke_truncate_profile_tenant_mutation_public_catalog |
| 20261019033935 | aud01_enforce_same_tenant_relational_integrity |
| 20261019034252 | aud01_restrict_financial_usage_whatsapp_direct_mutations |
| 20261019040412 | aud01_revoke_client_schema_modification_privileges |
| 20261019040630 | aud01_pin_function_search_paths |
| 20261019181854 | whatsapp_contact_privacy_queue |

## Próximas verificações

1. Comparar os efeitos concretos dos scripts locais `supabase/migrations/*.sql` com os scripts históricos arquivados, incluindo grants, policies, RPC, índices e constraints.
2. Formalizar um baseline migratório compatível com o estado remoto, sem executar os scripts antigos novamente.
3. Executar e documentar os checks `pnpm exec tsc --noEmit` e `pnpm exec next lint` e só então rever as flags de bypass no `next.config.mjs`.
4. Confirmar requisito de checks no branch protection; ter um workflow versionado não garante bloqueio de merge/publicação.

O arquivo contém evidências de estrutura, não dados de clientes. Nenhum DDL foi aplicado durante a exportação.
