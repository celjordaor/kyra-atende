# AUD-01 — Evidências de escrita e componentes (19/10/2026)

## Ambientes confirmados
- Supabase Kyra Atende: `zrszytzlovthyezozqhj`, `ACTIVE_HEALTHY`
- GitHub: `celjordaor/kyra-atende`, branch `main`
- Vercel: `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`

## Correção aplicada ao Supabase
Migration remota: `aud01_restrict_financial_usage_whatsapp_direct_mutations`.
- `subscriptions`, `usage_counters`, `whatsapp_messages`: authenticated com SELECT=true, INSERT/UPDATE/DELETE=false.
- `whatsapp_messages` agora usa política exclusiva de SELECT `tenant_id = current_tenant_id()`.
- Espelho versionado: `supabase/migrations/20261019000800_aud01_lock_billing_usage_whatsapp_writes.sql`.
- Atenção: confirmar se alguma tela cria mensagens pelo client Supabase diretamente. O serviço em `lib/whatsapp.ts` usa admin client (service_role) para gravar mensagens.

## Testes SQL transacionais de autorização
Todos feitos com `SET LOCAL ROLE authenticated`, claim tenant simulada em `request.jwt.claims` e `ROLLBACK`.
- Tenant B tentando UPDATE em `clients` do tenant A: **0 linhas**.
- Tenant B tentando UPDATE em `bookings` do tenant A: **0 linhas**.
- Tenant A fazendo UPDATE sem alteração de valor em 1 cliente seu: **1 linha**, transação revertida.
- Não há efeito permanente das operações de teste.
- Os testes demonstram enforcement RLS no banco sob claims simuladas, não autenticam pessoas reais nem verificam cookies/rotas HTTP.

## Revisão inicial de design system
- Barris `components/atoms/index.ts`, `molecules/index.ts`, `organisms/index.ts`, `templates/index.ts` existem e exportam componentes compartilhados.
- Páginas `app/(dashboard)/clientes/page.tsx` e `app/(dashboard)/servicos/page.tsx` delegam para respectivos componentes Client e exibem conteúdo obtido por `apiGet`.
- Isto comprova existência e uso de alguns componentes por estrutura, **não** comprova reutilização consistente em todas as telas.
- Próxima amostragem: `ClientesClient`, `ServicosClient`, formulários e modais por módulo.

## Itens abertos
1. Revisar todas as rotas server-side que usam `service_role` e verificar autenticação/autorização antes de qualquer alteração.
2. Teste HTTP com credenciais reais de tenants A/B e provas negativas de leitura/escrita.
3. Revisão visual e estática da reutilização de componentes em cada módulo.
4. Integração Evolution/Asaas: secrets ausentes em Vercel, sincronização dos provedores e testes funcionais ainda pendentes.
5. Eliminar a dispensa de validação TypeScript/ESLint no build e confirmar pipelines.

## Revisão adicional de UI/UX — amostragem de código

Verificados diretamente os imports de:
- `app/(dashboard)/clientes/ClientesClient.tsx`: DataTable, Modal, Button, Avatar, FormField e SearchBar compartilhados.
- `app/(dashboard)/servicos/ServicosClient.tsx`: DataTable, Modal, Button, FormField e StatusBadge compartilhados.
- `app/(dashboard)/agendamentos/AgendamentosClient.tsx`: DataTable, Modal, SearchBar, Button, StatusBadge, FormField e Avatar compartilhados.
- `app/(dashboard)/agenda/AgendaClient.tsx`: Button, StatusBadge, Modal, BookingFormModal e CompleteModal compartilhados.
- `components/organisms/BookingFormModal.tsx`: organismo reutilizável, usa Modal, Button, FormField e Avatar.

**Achado:** a lista de estados brasileiros `ESTADOS` está duplicada pelo menos em `ClientesClient` e `AgendamentosClient`; não é uma vulnerabilidade, mas cria risco de divergência de UX e manutenção. Refatoração a acompanhar, sem alterar formulários de produção nesta rodada.

## Evolution — correção do fluxo de webhook e envio

Em `lib/whatsapp.ts` a configuração de novas instâncias passou a usar `webhookByEvents: false` e um objeto `webhook.headers['x-kyra-webhook-secret']`, derivado de `EVOLUTION_WEBHOOK_SECRET` no servidor. Falta validar o schema da versão Evolution instalada e reconfigurar as instâncias já criadas. Sem segredo de webhook (mínimo 32 caracteres), `connectInstance()` retorna `webhook_not_configured` em vez de gerar conexão que não receberá eventos.

`sendViaEvolution` agora lança exceção se `EVOLUTION_API_URL` ou `EVOLUTION_API_KEY` estiverem ausentes, em vez de descartar silenciosamente uma mensagem e aparentar sucesso.

**Risco ainda aberto:** a deduplicação grava a mensagem antes da resposta da IA; se o processamento falhar após a inserção, um reenvio pode ser tratado como duplicado. Uma fila com estados `pending/processing/done/failed` e reprocessamento controlado é necessária para entrega resiliente.

## Deploy
Commits recentes no `main` exigem verificação READY antes de considerá-los ativos. Não há homologação de webhook ponta-a-ponta, nem validação de build com TypeScript e ESLint sem dispensas.

## Autorização de sessão por perfil — 19/10/2026
- `lib/route-helpers.ts` agora verifica `profiles.tenant_id = user.app_metadata.tenant_id` para requisições normais autenticadas, usando a RLS do próprio perfil, além da validação do JWT por `auth.getUser()`.
- Auditoria dos perfis: 3 administradores com claims coerentes; superadmin da plataforma sem claim de tenant; uma conta Auth ainda não provisionada. O superadmin usa autorização própria nas rotas administrativas.
- Teste SQL transacional com JWT simulado para o próprio administrador: leitura do perfil retornou **1 linha**, sem alteração de dados.
- A validação da nova API em sessão real e o comportamento de usuários com claim antiga ainda exigem teste E2E.
