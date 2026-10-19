# AUD-01 — Pré-requisitos para homologar a branch de segurança

**Alvo exclusivo:** Supabase `zrszytzlovthyezozqhj`, Vercel `kyra-atende`, GitHub `celjordaor/kyra-atende`.

## Segredos necessários antes do deploy
- `ASAAS_WEBHOOK_AUTH_TOKEN` (mínimo 32 caracteres): mesmo authToken configurado no webhook do Asaas; recebido no header `asaas-access-token`. Não utilizar `ASAAS_API_KEY`.
- `EVOLUTION_WEBHOOK_SECRET` (mínimo 32 caracteres): configurar a Evolution para enviar o header `x-kyra-webhook-secret` com o mesmo valor. Conferir versão/forma de configurar headers por instância antes de habilitar.
- Não adicionar valores desses segredos ao GitHub; configurar nos ambientes corretos da Vercel.

## Pendências que bloqueiam publicação
1. Fazer TypeScript, lint e build sem depender de `ignoreBuildErrors`.
2. **Asaas em fase de implementação:** webhook agora consulta `GET /payments/{id}` e confere status, referência e preço; migration `20261019000500` oferece idempotência por payment ID e operação transacional. É indispensável homologar com o Asaas Sandbox, conferir se `externalReference` é transmitida da payment link à cobrança e validar estado da assinatura. Eventos `PAYMENT_OVERDUE` ficam sem suspensão automática até implementar conciliação segura por fatura. Não publicar sem esses testes.
3. Evolution: conferir que instâncias existentes enviam o header; configurar instâncias antigas, não apenas novas. Falta controle idempotente de `data.key.id` e fila durável; o handler agora aguarda execução.
4. Cadastro: provisionamento via RPC transacional foi implementado na branch; migration `20261019000300` pendente de aplicar/testar. Verificar fluxo completo com confirmação de e-mail, retries e criação concorrente.
5. Agendamento: conferir conflitos concorrentes em transação/constraint, aplicação de timezone e seleção sem profissional. Validar telefones e restringir tenant publicado via slug. Ainda não resolvidos.
6. Rodar testes tenant A/B para todas as rotas service_role e cenários anônimos, testes de carga de endpoints e regressão visual de `/agendar/[slug]`.
7. Verificar o comportamento de `/api/bookings/notify-created` em seus chamadores antes de homologar.
8. Conferir migrations remotas versus arquivos de espelhamento `20261018000100` e `20261019000200`/`00400`; não reaplicar automaticamente sem verificar histórico. Aplicar novas migrations 00100 integridade, 00300 provisionamento e 00500 Asaas apenas após revisão/homologação.
9. No Asaas, testar `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, repetição do mesmo evento, eventos diferentes para o mesmo payment ID, pagamento de valor incorreto e referência inválida; comparar `GET /payments/{id}` no ambiente efetivamente configurado.
10. Revisar planos vigentes e renovação: pagamento só ativa via fatura confirmada; suspensões por atraso não ocorrem automaticamente neste patch. A regra de início/fim de período e comunicação ao cliente requer aprovação funcional.

**Status:** alterações somente na branch `security/aud-01-hardening`. Não fazer merge/deploy automático.

## Situação de produção — 19/10/2026
- Projeto confirmado: `zrszytzlovthyezozqhj`; Vercel: `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`.
- Migrations remotas aplicadas pelo Supabase (versões geradas pelo servidor, diferentes dos nomes locais):
  - `20261019025856`: `aud01_restrict_privileged_rpc_profile_updates_public_policies` (GitHub `20261018000100`).
  - `20261019030717`: `aud01_restrict_tenant_billing_and_owner_updates` (GitHub `20261019000200`).
  - `20261019031431`: `aud01_billing_events_append_only_backend` (GitHub `20261019000400`).
  - `aud01_booking_overlap_and_whatsapp_message_dedup` (GitHub `20261019000100`).
  - `aud01_atomic_idempotent_signup` (GitHub `20261019000300`).
  - `aud01_asaas_verified_payment_reconciliation` (GitHub `20261019000500`).
- Verificado: exclusion constraint de bookings, índice unique de mensagens, RPC de cadastro restrita ao service_role, RPC Asaas restrita ao service_role.
- Vercel: preview no commit `2c91881` READY. **Não foi promovido para produção.**
- Pré-flight Vercel: existem `ASAAS_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`; NÃO existem `ASAAS_WEBHOOK_AUTH_TOKEN` nem `EVOLUTION_WEBHOOK_SECRET`. Integrações externas ainda precisam ser sincronizadas; não fazer merge/produção antes disso.
- As novas migrations já existem no banco remoto. **Não reexecutar DDL automaticamente pelo nome de arquivo do GitHub.** Conciliar com o histórico remoto para evitar tentativas de criação duplicada.
- Pendente: testes E2E de cadastro, pagamento Asaas Sandbox, callback Evolution real e testes tenant A/B; TypeScript, lint e concorrência; validação funcional da página pública de agendamento.
