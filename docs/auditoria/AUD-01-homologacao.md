# AUD-01 — Pré-requisitos para homologar a branch de segurança

**Alvo exclusivo:** Supabase `zrszytzlovthyezozqhj`, Vercel `kyra-atende`, GitHub `celjordaor/kyra-atende`.

## Segredos necessários antes do deploy
- `ASAAS_WEBHOOK_AUTH_TOKEN` (mínimo 32 caracteres): mesmo authToken configurado no webhook do Asaas; recebido no header `asaas-access-token`. Não utilizar `ASAAS_API_KEY`.
- `EVOLUTION_WEBHOOK_SECRET` (mínimo 32 caracteres): configurar a Evolution para enviar o header `x-kyra-webhook-secret` com o mesmo valor. Conferir versão/forma de configurar headers por instância antes de habilitar.
- Não adicionar valores desses segredos ao GitHub; configurar nos ambientes corretos da Vercel.

## Pendências que bloqueiam publicação
1. Fazer TypeScript, lint e build sem depender de `ignoreBuildErrors`.
2. Garantir autenticação e idempotência efetivas nos webhooks. Asaas entrega duplicatas e pode entregar eventos fora de ordem: ainda falta ledger de eventos + validação da identidade do pagamento, não apenas `externalReference`.
3. Evolution: conferir que instâncias existentes enviam o header; configurar instâncias antigas, não apenas novas. Falta controle idempotente de `data.key.id` e fila durável; o handler agora aguarda execução.
4. Cadastro: o endpoint `setup-tenant` passou a exigir e-mail confirmado; verificar o fluxo real de signup, evitar travar cadastro. Provisionamento ainda é não transacional.
5. Agendamento: conferir conflitos concorrentes em transação/constraint, aplicação de timezone e seleção sem profissional. Validar telefones e restringir tenant publicado via slug. Ainda não resolvidos.
6. Rodar testes tenant A/B para todas as rotas service_role e cenários anônimos, testes de carga de endpoints e regressão visual de `/agendar/[slug]`.
7. Verificar o comportamento de `/api/bookings/notify-created` em seus chamadores antes de homologar.
8. Conferir migrations remotas versus arquivo de espelhamento `20261018000100_aud01_privileged_boundary.sql`; não reaplicar automaticamente sem verificar histórico.

**Status:** alterações somente na branch `security/aud-01-hardening`. Não fazer merge/deploy automático.
